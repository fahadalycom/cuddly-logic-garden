-- 1. Assignment history log
CREATE TABLE IF NOT EXISTS public.wa_assignment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  assigned_to uuid,
  assigned_by uuid,
  assignment_type text NOT NULL DEFAULT 'auto', -- 'auto' | 'manual' | 'overflow' | 'sticky'
  placement text NOT NULL DEFAULT 'active', -- 'active' | 'agent_queue' | 'overflow'
  queue_type text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_assignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view assignment log"
  ON public.wa_assignment_log FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert assignment log"
  ON public.wa_assignment_log FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_wa_assignment_log_conv ON public.wa_assignment_log(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_assignment_log_agent ON public.wa_assignment_log(assigned_to, created_at DESC);

-- 2. Map queue types to roles
CREATE OR REPLACE FUNCTION public.role_for_queue(_queue text)
RETURNS app_role[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _queue
    WHEN 'sales'    THEN ARRAY['sales_rep','admin']::app_role[]
    WHEN 'support'  THEN ARRAY['support_expert','admin']::app_role[]
    WHEN 'payment'  THEN ARRAY['payment_verifier','accountant','admin']::app_role[]
    WHEN 'payments' THEN ARRAY['payment_verifier','accountant','admin']::app_role[]
    WHEN 'renewal'  THEN ARRAY['renewal_agent','admin']::app_role[]
    WHEN 'renewals' THEN ARRAY['renewal_agent','admin']::app_role[]
    ELSE ARRAY['admin','sales_rep','support_expert']::app_role[]
  END;
$$;

-- 3. Smart auto-assignment routing
CREATE OR REPLACE FUNCTION public.auto_assign_conversation(_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv record;
  eligible_roles app_role[];
  prev_agent uuid;
  picked_agent uuid;
  result jsonb;
  assignment_kind text := 'auto';
BEGIN
  SELECT * INTO conv FROM public.wa_conversations WHERE id = _conversation_id;
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conversation_not_found');
  END IF;

  -- Skip if already actively assigned
  IF conv.assigned_agent_id IS NOT NULL AND conv.status = 'active' THEN
    RETURN jsonb_build_object('ok', true, 'placement', 'already_assigned', 'agent_id', conv.assigned_agent_id);
  END IF;

  eligible_roles := public.role_for_queue(conv.queue::text);

  -- 7. Sticky: prefer last agent for this customer if eligible & has capacity
  SELECT assigned_agent_id INTO prev_agent
  FROM public.wa_conversations
  WHERE customer_phone = conv.customer_phone
    AND id <> conv.id
    AND assigned_agent_id IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1;

  IF prev_agent IS NOT NULL THEN
    SELECT cfg.agent_id INTO picked_agent
    FROM public.wa_agent_config cfg
    WHERE cfg.agent_id = prev_agent
      AND cfg.is_available = true
      AND (cfg.current_active_count + cfg.current_queue_count) < (cfg.max_active_chats + cfg.max_queue_limit)
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = cfg.agent_id AND ur.role = ANY(eligible_roles)
      )
      AND EXISTS (
        SELECT 1 FROM public.staff_profiles sp
        WHERE sp.user_id = cfg.agent_id
          AND sp.availability_status = 'active'
          AND sp.is_active = true
      );
    IF picked_agent IS NOT NULL THEN assignment_kind := 'sticky'; END IF;
  END IF;

  -- 4-5. Load-based pick from eligible role pool
  IF picked_agent IS NULL THEN
    SELECT cfg.agent_id INTO picked_agent
    FROM public.wa_agent_config cfg
    JOIN public.staff_profiles sp ON sp.user_id = cfg.agent_id
    WHERE cfg.is_available = true
      AND sp.availability_status = 'active'
      AND sp.is_active = true
      AND (cfg.current_active_count + cfg.current_queue_count) < (cfg.max_active_chats + cfg.max_queue_limit)
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = cfg.agent_id AND ur.role = ANY(eligible_roles)
      )
    ORDER BY (cfg.current_active_count + cfg.current_queue_count) ASC, random()
    LIMIT 1;
  END IF;

  -- 6. Overflow if no eligible agent
  IF picked_agent IS NULL THEN
    INSERT INTO public.wa_queue(conversation_id, queue_type, status, priority)
    VALUES (
      _conversation_id, 'overflow', 'waiting',
      CASE conv.priority WHEN 'urgent' THEN 9 WHEN 'high' THEN 7 WHEN 'medium' THEN 5 ELSE 3 END
    )
    ON CONFLICT DO NOTHING;
    UPDATE public.wa_conversations
      SET queue = 'overflow', assigned_agent_id = NULL, status = 'waiting', updated_at = now()
      WHERE id = _conversation_id;

    INSERT INTO public.wa_assignment_log(conversation_id, assigned_to, assignment_type, placement, queue_type, reason)
    VALUES (_conversation_id, NULL, 'overflow', 'overflow', conv.queue::text, 'no_eligible_agent');

    RETURN jsonb_build_object('ok', true, 'placement', 'overflow');
  END IF;

  -- Assign with capacity-aware placement
  result := public.assign_conversation_with_capacity(_conversation_id, picked_agent, false);

  INSERT INTO public.wa_assignment_log(
    conversation_id, assigned_to, assignment_type, placement, queue_type, reason
  ) VALUES (
    _conversation_id, picked_agent, assignment_kind,
    COALESCE(result->>'placement', 'unknown'), conv.queue::text,
    CASE WHEN assignment_kind = 'sticky' THEN 'previous_agent' ELSE 'lowest_load' END
  );

  RETURN result || jsonb_build_object('agent_id', picked_agent, 'assignment_type', assignment_kind);
END;
$$;

-- 4. Trigger: auto-assign on new conversation or when conv becomes unassigned
CREATE OR REPLACE FUNCTION public.trg_auto_assign_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_agent_id IS NULL THEN
      PERFORM public.auto_assign_conversation(NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Became unassigned (and not resolved/closed/archived)
    IF NEW.assigned_agent_id IS NULL
       AND OLD.assigned_agent_id IS NOT NULL
       AND NEW.status NOT IN ('resolved','archived') THEN
      PERFORM public.auto_assign_conversation(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_assign_conversation_trigger ON public.wa_conversations;
CREATE TRIGGER auto_assign_conversation_trigger
  AFTER INSERT OR UPDATE OF assigned_agent_id ON public.wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_assign_conversation();

-- 5. Manual reassignment helper (logs as 'manual')
CREATE OR REPLACE FUNCTION public.manual_assign_conversation(
  _conversation_id uuid, _agent_id uuid, _force boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  conv record;
BEGIN
  SELECT * INTO conv FROM public.wa_conversations WHERE id = _conversation_id;
  result := public.assign_conversation_with_capacity(_conversation_id, _agent_id, _force);

  INSERT INTO public.wa_assignment_log(
    conversation_id, assigned_to, assigned_by, assignment_type, placement, queue_type, reason
  ) VALUES (
    _conversation_id, _agent_id, auth.uid(), 'manual',
    COALESCE(result->>'placement', 'unknown'),
    COALESCE(conv.queue::text, 'general'),
    'manual_override'
  );

  RETURN result;
END;
$$;