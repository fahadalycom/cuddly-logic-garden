
-- 1. Extend conversation_queue enum with overflow
ALTER TYPE public.conversation_queue ADD VALUE IF NOT EXISTS 'overflow';

-- 2. Extend wa_queue_status with 'active'
ALTER TYPE public.wa_queue_status ADD VALUE IF NOT EXISTS 'active';

-- 3. Create queue_type enum for per-agent vs department queues
DO $$ BEGIN
  CREATE TYPE public.wa_queue_type AS ENUM ('sales','support','payments','renewals','overflow','agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Add capacity columns to wa_agent_config
ALTER TABLE public.wa_agent_config
  ADD COLUMN IF NOT EXISTS max_queue_limit integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS current_active_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_queue_count integer NOT NULL DEFAULT 0;

-- 5. Add queue_type and target_agent_id to wa_queue
ALTER TABLE public.wa_queue
  ADD COLUMN IF NOT EXISTS queue_type public.wa_queue_type NOT NULL DEFAULT 'overflow',
  ADD COLUMN IF NOT EXISTS target_agent_id uuid;

-- Indexes for queue performance
CREATE INDEX IF NOT EXISTS idx_wa_queue_type_status ON public.wa_queue(queue_type, status);
CREATE INDEX IF NOT EXISTS idx_wa_queue_target_agent ON public.wa_queue(target_agent_id) WHERE target_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_agent_config_agent ON public.wa_agent_config(agent_id);

-- 6. Trigger function: recompute agent counts on conversation changes
CREATE OR REPLACE FUNCTION public.sync_agent_capacity_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_agents uuid[] := ARRAY[]::uuid[];
  a uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
      IF OLD.assigned_agent_id IS NOT NULL THEN affected_agents := array_append(affected_agents, OLD.assigned_agent_id); END IF;
      IF NEW.assigned_agent_id IS NOT NULL THEN affected_agents := array_append(affected_agents, NEW.assigned_agent_id); END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_agent_id IS NOT NULL THEN
      affected_agents := array_append(affected_agents, NEW.assigned_agent_id);
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.assigned_agent_id IS NOT NULL THEN
    affected_agents := array_append(affected_agents, NEW.assigned_agent_id);
  END IF;

  FOREACH a IN ARRAY affected_agents LOOP
    UPDATE public.wa_agent_config
    SET current_active_count = (
          SELECT count(*) FROM public.wa_conversations
          WHERE assigned_agent_id = a AND status = 'active'
        ),
        current_queue_count = (
          SELECT count(*) FROM public.wa_queue
          WHERE target_agent_id = a AND status = 'waiting'
        ),
        updated_at = now()
    WHERE agent_id = a;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agent_capacity ON public.wa_conversations;
CREATE TRIGGER trg_sync_agent_capacity
AFTER INSERT OR UPDATE ON public.wa_conversations
FOR EACH ROW EXECUTE FUNCTION public.sync_agent_capacity_counts();

-- 7. Server-side capacity-aware assignment helper
CREATE OR REPLACE FUNCTION public.assign_conversation_with_capacity(
  _conversation_id uuid,
  _agent_id uuid,
  _force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg record;
  conv record;
  result jsonb;
BEGIN
  SELECT * INTO cfg FROM public.wa_agent_config WHERE agent_id = _agent_id;
  SELECT * INTO conv FROM public.wa_conversations WHERE id = _conversation_id;

  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conversation_not_found');
  END IF;

  IF cfg.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'agent_config_missing');
  END IF;

  -- Active capacity check
  IF cfg.current_active_count < cfg.max_active_chats THEN
    UPDATE public.wa_conversations
      SET assigned_agent_id = _agent_id, status = 'active', updated_at = now()
      WHERE id = _conversation_id;
    DELETE FROM public.wa_queue WHERE conversation_id = _conversation_id AND status = 'waiting';
    RETURN jsonb_build_object('ok', true, 'placement', 'active');
  END IF;

  -- Agent queue capacity
  IF cfg.current_queue_count < cfg.max_queue_limit OR _force THEN
    UPDATE public.wa_conversations
      SET assigned_agent_id = _agent_id, updated_at = now()
      WHERE id = _conversation_id;
    INSERT INTO public.wa_queue(conversation_id, target_agent_id, queue_type, status, priority)
      VALUES (_conversation_id, _agent_id, 'agent', 'waiting',
              CASE conv.priority WHEN 'urgent' THEN 9 WHEN 'high' THEN 7 WHEN 'medium' THEN 5 ELSE 3 END)
      ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'placement', 'agent_queue');
  END IF;

  -- Overflow
  INSERT INTO public.wa_queue(conversation_id, queue_type, status, priority)
    VALUES (_conversation_id, 'overflow', 'waiting',
            CASE conv.priority WHEN 'urgent' THEN 9 WHEN 'high' THEN 7 WHEN 'medium' THEN 5 ELSE 3 END)
    ON CONFLICT DO NOTHING;
  UPDATE public.wa_conversations SET queue = 'overflow', updated_at = now() WHERE id = _conversation_id;
  RETURN jsonb_build_object('ok', false, 'placement', 'overflow', 'error', 'agent_at_capacity');
END;
$$;

-- 8. Promote next queued conversation when active slot frees up
CREATE OR REPLACE FUNCTION public.promote_next_from_queue(_agent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_conv uuid;
BEGIN
  SELECT conversation_id INTO next_conv
  FROM public.wa_queue
  WHERE target_agent_id = _agent_id AND status = 'waiting'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1;

  IF next_conv IS NOT NULL THEN
    UPDATE public.wa_conversations SET status = 'active', updated_at = now() WHERE id = next_conv;
    UPDATE public.wa_queue SET status = 'assigned', assigned_to = _agent_id, assigned_at = now()
      WHERE conversation_id = next_conv AND status = 'waiting';
  END IF;

  RETURN next_conv;
END;
$$;
