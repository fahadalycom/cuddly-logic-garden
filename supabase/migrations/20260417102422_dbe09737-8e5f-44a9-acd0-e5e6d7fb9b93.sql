-- Handoff system: log table + RPC for transferring conversations between departments

CREATE TABLE IF NOT EXISTS public.wa_handoff_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  from_queue TEXT,
  to_queue TEXT NOT NULL,
  from_agent_id UUID,
  to_agent_id UUID,
  transferred_by UUID,
  note TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_handoff_log_conv ON public.wa_handoff_log(conversation_id, created_at DESC);

ALTER TABLE public.wa_handoff_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view handoff log"
  ON public.wa_handoff_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert handoff log"
  ON public.wa_handoff_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can delete handoff log"
  ON public.wa_handoff_log FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RPC: handoff_conversation
CREATE OR REPLACE FUNCTION public.handoff_conversation(
  _conversation_id UUID,
  _to_queue TEXT,
  _note TEXT DEFAULT NULL,
  _set_status TEXT DEFAULT 'waiting_internal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv record;
  prev_agent UUID;
  prev_queue TEXT;
  assign_result jsonb;
BEGIN
  SELECT * INTO conv FROM public.wa_conversations WHERE id = _conversation_id FOR UPDATE;
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conversation_not_found');
  END IF;

  prev_agent := conv.assigned_agent_id;
  prev_queue := conv.queue::text;

  -- Update queue + clear assignment + set status
  UPDATE public.wa_conversations
    SET queue = _to_queue::wa_queue_type,
        assigned_agent_id = NULL,
        previous_agent_id = prev_agent,
        status = COALESCE(_set_status, 'waiting_internal')::wa_conversation_status,
        lock_until = NULL,
        updated_at = now()
    WHERE id = _conversation_id;

  DELETE FROM public.wa_queue WHERE conversation_id = _conversation_id AND status = 'waiting';

  -- Trigger auto-assignment for new queue
  assign_result := public.auto_assign_conversation(_conversation_id);

  -- Log handoff
  INSERT INTO public.wa_handoff_log(
    conversation_id, from_queue, to_queue, from_agent_id, to_agent_id,
    transferred_by, note, reason
  ) VALUES (
    _conversation_id, prev_queue, _to_queue, prev_agent,
    NULLIF(assign_result->>'agent_id','')::uuid,
    auth.uid(), _note, 'manual_handoff'
  );

  -- Also log into assignment log
  INSERT INTO public.wa_assignment_log(
    conversation_id, assigned_to, assigned_by, assignment_type, placement, queue_type, reason
  ) VALUES (
    _conversation_id, NULLIF(assign_result->>'agent_id','')::uuid, auth.uid(),
    'handoff', COALESCE(assign_result->>'placement','unknown'), _to_queue,
    COALESCE(_note, 'department_handoff')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'from_queue', prev_queue,
    'to_queue', _to_queue,
    'placement', assign_result->>'placement',
    'agent_id', assign_result->>'agent_id'
  );
END;
$$;