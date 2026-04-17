-- 1. Conversation tracking columns
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_agent_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS reassignment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_summary text,
  ADD COLUMN IF NOT EXISTS lock_until timestamptz,
  ADD COLUMN IF NOT EXISTS previous_agent_id uuid;

CREATE INDEX IF NOT EXISTS idx_wa_conv_assigned_at ON public.wa_conversations(assigned_at);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_reply ON public.wa_conversations(last_agent_reply_at);
CREATE INDEX IF NOT EXISTS idx_wa_conv_lock ON public.wa_conversations(lock_until);

-- 2. Seed SLA tuning settings (non-secret so staff can read)
INSERT INTO public.system_settings (key, value, category, description, is_secret)
VALUES
  ('sla_first_response_seconds', '120', 'routing', 'Seconds before unanswered conversation is reassigned', false),
  ('max_auto_reassignments', '3', 'routing', 'Maximum automatic reassignments before escalation', false),
  ('overflow_redistribute_threshold', '5', 'routing', 'Overflow size that triggers redistribution', false)
ON CONFLICT (key) DO NOTHING;

-- 3. Track agent replies automatically
CREATE OR REPLACE FUNCTION public.track_agent_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'agent' THEN
    UPDATE public.wa_conversations
      SET last_agent_reply_at = NEW.created_at,
          updated_at = now()
      WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_agent_reply ON public.wa_messages;
CREATE TRIGGER trg_track_agent_reply
AFTER INSERT ON public.wa_messages
FOR EACH ROW EXECUTE FUNCTION public.track_agent_reply();

-- 4. Set assigned_at automatically when agent changes
CREATE OR REPLACE FUNCTION public.track_assignment_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_agent_id IS NOT NULL THEN
    NEW.assigned_at := now();
  ELSIF TG_OP = 'UPDATE' AND NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
    NEW.previous_agent_id := OLD.assigned_agent_id;
    NEW.assigned_at := CASE WHEN NEW.assigned_agent_id IS NULL THEN NULL ELSE now() END;
    NEW.last_agent_reply_at := NULL;
    NEW.lock_until := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_assignment_ts ON public.wa_conversations;
CREATE TRIGGER trg_track_assignment_ts
BEFORE INSERT OR UPDATE ON public.wa_conversations
FOR EACH ROW EXECUTE FUNCTION public.track_assignment_timestamp();

-- Ensure capacity-sync trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_sync_agent_capacity ON public.wa_conversations;
CREATE TRIGGER trg_sync_agent_capacity
AFTER INSERT OR UPDATE ON public.wa_conversations
FOR EACH ROW EXECUTE FUNCTION public.sync_agent_capacity_counts();

-- Ensure auto-assign trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_auto_assign ON public.wa_conversations;
CREATE TRIGGER trg_auto_assign
AFTER INSERT OR UPDATE ON public.wa_conversations
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_assign_conversation();

-- 5. Release a conversation (used by reassignment + manual release)
CREATE OR REPLACE FUNCTION public.release_conversation(
  _conversation_id uuid,
  _reason text DEFAULT 'manual_release'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv record;
BEGIN
  SELECT * INTO conv FROM public.wa_conversations WHERE id = _conversation_id FOR UPDATE;
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  UPDATE public.wa_conversations
    SET assigned_agent_id = NULL,
        status = 'waiting',
        lock_until = NULL,
        updated_at = now()
    WHERE id = _conversation_id;

  DELETE FROM public.wa_queue
    WHERE conversation_id = _conversation_id AND status = 'waiting';

  INSERT INTO public.wa_assignment_log(
    conversation_id, assigned_to, assigned_by, assignment_type, placement, queue_type, reason
  ) VALUES (
    _conversation_id, NULL, auth.uid(), 'release', 'released', conv.queue::text, _reason
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6. Stale-conversation reassignment scanner
CREATE OR REPLACE FUNCTION public.reassign_stale_conversations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sla_seconds int;
  max_reassign int;
  conv record;
  reassigned int := 0;
  escalated int := 0;
  reason text;
  prev_agent uuid;
BEGIN
  SELECT COALESCE((SELECT value::int FROM public.system_settings WHERE key='sla_first_response_seconds'), 120)
    INTO sla_seconds;
  SELECT COALESCE((SELECT value::int FROM public.system_settings WHERE key='max_auto_reassignments'), 3)
    INTO max_reassign;

  FOR conv IN
    SELECT c.*
    FROM public.wa_conversations c
    LEFT JOIN public.staff_profiles sp ON sp.user_id = c.assigned_agent_id
    WHERE c.assigned_agent_id IS NOT NULL
      AND c.status IN ('active','waiting')
      AND (c.lock_until IS NULL OR c.lock_until < now())
      AND (
        -- SLA breach: no agent reply
        (c.last_agent_reply_at IS NULL
          AND c.assigned_at IS NOT NULL
          AND c.assigned_at < now() - make_interval(secs => sla_seconds))
        OR
        -- Agent went offline after assignment
        (sp.availability_status IN ('offline','inactive') OR sp.is_active = false)
      )
    LIMIT 50
  LOOP
    -- Lock this conversation briefly to prevent double-processing
    UPDATE public.wa_conversations
      SET lock_until = now() + interval '30 seconds'
      WHERE id = conv.id;

    prev_agent := conv.assigned_agent_id;
    reason := CASE
      WHEN conv.last_agent_reply_at IS NULL THEN 'sla_no_response'
      ELSE 'agent_offline'
    END;

    -- Escalation cap reached → push to overflow and stop reassigning
    IF conv.reassignment_count >= max_reassign THEN
      UPDATE public.wa_conversations
        SET assigned_agent_id = NULL,
            queue = 'overflow',
            status = 'waiting',
            lock_until = NULL,
            auto_summary = COALESCE(conv.auto_summary,
              'Escalated after ' || conv.reassignment_count || ' reassignments. Last preview: '
              || COALESCE(conv.last_message_preview, '—')),
            updated_at = now()
        WHERE id = conv.id;

      DELETE FROM public.wa_queue WHERE conversation_id = conv.id AND status='waiting';
      INSERT INTO public.wa_queue(conversation_id, queue_type, status, priority)
        VALUES (conv.id, 'overflow', 'waiting', 9);

      INSERT INTO public.wa_assignment_log(
        conversation_id, assigned_to, assignment_type, placement, queue_type, reason
      ) VALUES (conv.id, NULL, 'escalation', 'overflow', conv.queue::text, 'max_reassignments_reached');
      escalated := escalated + 1;
      CONTINUE;
    END IF;

    -- Release current agent
    UPDATE public.wa_conversations
      SET assigned_agent_id = NULL,
          status = 'waiting',
          reassignment_count = conv.reassignment_count + 1,
          previous_agent_id = prev_agent,
          auto_summary = COALESCE(conv.auto_summary,
            CASE
              WHEN reason = 'sla_no_response' THEN 'Customer waiting for first reply. Last message: ' || COALESCE(conv.last_message_preview, '—')
              ELSE 'Previous agent went offline. Last message: ' || COALESCE(conv.last_message_preview, '—')
            END),
          updated_at = now()
      WHERE id = conv.id;

    DELETE FROM public.wa_queue WHERE conversation_id = conv.id AND status='waiting';

    -- Try to route to next eligible agent (auto_assign trigger will fire too,
    -- but call directly so we capture the placement and log the failover reason)
    PERFORM public.auto_assign_conversation(conv.id);

    INSERT INTO public.wa_assignment_log(
      conversation_id, assigned_to, assignment_type, placement, queue_type, reason
    )
    SELECT conv.id, c.assigned_agent_id, 'failover',
           CASE WHEN c.assigned_agent_id IS NULL THEN 'overflow' ELSE 'reassigned' END,
           c.queue::text, reason
    FROM public.wa_conversations c WHERE c.id = conv.id;

    reassigned := reassigned + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'reassigned', reassigned, 'escalated', escalated);
END;
$$;

-- 7. Overflow redistribution
CREATE OR REPLACE FUNCTION public.redistribute_overflow()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold int;
  overflow_size int;
  item record;
  moved int := 0;
BEGIN
  SELECT COALESCE((SELECT value::int FROM public.system_settings WHERE key='overflow_redistribute_threshold'), 5)
    INTO threshold;

  SELECT count(*) INTO overflow_size
  FROM public.wa_queue WHERE queue_type='overflow' AND status='waiting';

  IF overflow_size < threshold THEN
    RETURN jsonb_build_object('ok', true, 'moved', 0, 'overflow_size', overflow_size);
  END IF;

  FOR item IN
    SELECT q.id AS queue_id, q.conversation_id
    FROM public.wa_queue q
    WHERE q.queue_type='overflow' AND q.status='waiting'
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT 25
  LOOP
    DELETE FROM public.wa_queue WHERE id = item.queue_id;
    PERFORM public.auto_assign_conversation(item.conversation_id);
    moved := moved + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'moved', moved, 'overflow_size', overflow_size);
END;
$$;