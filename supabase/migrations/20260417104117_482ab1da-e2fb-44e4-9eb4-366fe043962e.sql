-- ============ ENUMS ============

-- Add new related_type values
ALTER TYPE public.task_related_type ADD VALUE IF NOT EXISTS 'payment';
ALTER TYPE public.task_related_type ADD VALUE IF NOT EXISTS 'renewal';
ALTER TYPE public.task_related_type ADD VALUE IF NOT EXISTS 'account';

-- Add new task_status values
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'waiting';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'overdue';

-- Department enum for tasks
DO $$ BEGIN
  CREATE TYPE public.task_department AS ENUM (
    'sales','support','payments','fulfillment','renewals','operations','general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TASKS TABLE EXTENSIONS ============

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS department public.task_department NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS template_key text;

CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_related ON public.tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- ============ TASK ACTIVITY ============

CREATE TABLE IF NOT EXISTS public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  from_value text,
  to_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id, created_at DESC);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view task activity" ON public.task_activity;
CREATE POLICY "Staff can view task activity" ON public.task_activity
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert task activity" ON public.task_activity;
CREATE POLICY "Staff can insert task activity" ON public.task_activity
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete task activity" ON public.task_activity;
CREATE POLICY "Admin can delete task activity" ON public.task_activity
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ ACTIVITY LOGGING TRIGGER ============

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity(task_id, actor_id, event_type, to_value, note)
    VALUES (NEW.id, NEW.created_by, 'created', NEW.status::text, NEW.title);
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, to_value)
      VALUES (NEW.id, NEW.created_by, 'assigned', NEW.assigned_to::text);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
      IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        NEW.completed_at := now();
        INSERT INTO public.task_activity(task_id, actor_id, event_type)
        VALUES (NEW.id, auth.uid(), 'completed');
      END IF;
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority::text, NEW.priority::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.task_activity(task_id, actor_id, event_type, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'reassigned',
              COALESCE(OLD.assigned_to::text,'unassigned'),
              COALESCE(NEW.assigned_to::text,'unassigned'));
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_task_activity ON public.tasks;
CREATE TRIGGER trg_log_task_activity
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

-- updated_at trigger for tasks
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPER: PICK AGENT BY DEPARTMENT ============

CREATE OR REPLACE FUNCTION public.pick_agent_for_department(_dept text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  roles app_role[];
  picked uuid;
BEGIN
  roles := CASE _dept
    WHEN 'sales'       THEN ARRAY['sales_rep','admin']::app_role[]
    WHEN 'support'     THEN ARRAY['support_expert','admin']::app_role[]
    WHEN 'payments'    THEN ARRAY['payment_verifier','accountant','admin']::app_role[]
    WHEN 'fulfillment' THEN ARRAY['fulfillment_agent','accounts_creator','admin']::app_role[]
    WHEN 'renewals'    THEN ARRAY['renewal_agent','client_relation_manager','admin']::app_role[]
    WHEN 'operations'  THEN ARRAY['operations_manager','admin']::app_role[]
    ELSE ARRAY['admin']::app_role[]
  END;

  SELECT sp.user_id INTO picked
  FROM public.staff_profiles sp
  WHERE sp.is_active = true
    AND EXISTS (SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = sp.user_id AND ur.role = ANY(roles))
  ORDER BY sp.availability_status = 'active' DESC, random()
  LIMIT 1;

  RETURN picked;
END $$;

-- ============ HELPER: CREATE TASK ============

CREATE OR REPLACE FUNCTION public.create_task_auto(
  _title text,
  _description text,
  _related_type text,
  _related_id uuid,
  _department text,
  _priority text DEFAULT 'medium',
  _due_in_hours int DEFAULT 24,
  _template_key text DEFAULT NULL,
  _created_by uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
  agent uuid;
  creator uuid;
BEGIN
  creator := COALESCE(_created_by, auth.uid());
  -- Fallback creator: any admin, then any staff
  IF creator IS NULL THEN
    SELECT user_id INTO creator FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;
  IF creator IS NULL THEN
    SELECT user_id INTO creator FROM public.staff_profiles WHERE is_active = true LIMIT 1;
  END IF;
  IF creator IS NULL THEN
    RETURN NULL; -- no staff exists yet, skip silently
  END IF;

  agent := public.pick_agent_for_department(_department);

  INSERT INTO public.tasks(
    title, description, related_type, related_id, department,
    priority, status, assigned_to, created_by, due_date, template_key
  ) VALUES (
    _title, _description,
    _related_type::task_related_type, _related_id,
    _department::task_department,
    _priority::priority_level, 'pending'::task_status,
    agent, creator,
    now() + make_interval(hours => _due_in_hours),
    _template_key
  ) RETURNING id INTO new_id;

  RETURN new_id;
END $$;

-- ============ AUTOMATION TRIGGERS ============

-- Handoff → task per target department
CREATE OR REPLACE FUNCTION public.trg_handoff_create_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dept text;
  title text;
  prio text := 'medium';
BEGIN
  dept := CASE NEW.to_queue
    WHEN 'support'  THEN 'support'
    WHEN 'payment'  THEN 'payments'
    WHEN 'payments' THEN 'payments'
    WHEN 'renewal'  THEN 'renewals'
    WHEN 'renewals' THEN 'renewals'
    WHEN 'sales'    THEN 'sales'
    ELSE 'operations'
  END;

  title := CASE dept
    WHEN 'support'     THEN 'Follow up: support handoff'
    WHEN 'payments'    THEN 'Verify payment from chat handoff'
    WHEN 'fulfillment' THEN 'Deliver subscription (chat handoff)'
    WHEN 'renewals'    THEN 'Renewal follow-up from chat'
    WHEN 'sales'       THEN 'Sales follow-up'
    ELSE 'Conversation follow-up'
  END;

  PERFORM public.create_task_auto(
    title,
    COALESCE(NEW.note, 'Conversation transferred to ' || dept),
    'conversation', NEW.conversation_id, dept, prio, 12,
    'handoff_followup', NEW.transferred_by
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_handoff_task ON public.wa_handoff_log;
CREATE TRIGGER trg_handoff_task
  AFTER INSERT ON public.wa_handoff_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_handoff_create_task();

-- Ticket created → support handling task; waiting_internal → internal follow-up
CREATE OR REPLACE FUNCTION public.trg_ticket_create_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prio text;
BEGIN
  prio := COALESCE(NEW.priority::text, 'medium');
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_task_auto(
      'Handle ticket ' || COALESCE(NEW.ticket_number, ''),
      COALESCE(NEW.summary, NEW.description),
      'ticket', NEW.id, 'support', prio, 24,
      'resolve_complaint', NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'waiting_internal' AND OLD.status <> 'waiting_internal' THEN
    PERFORM public.create_task_auto(
      'Internal follow-up for ticket ' || COALESCE(NEW.ticket_number, ''),
      'Ticket waiting on internal action',
      'ticket', NEW.id, 'support', prio, 8,
      'check_account_issue', NEW.assigned_to
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ticket_task ON public.support_issues;
CREATE TRIGGER trg_ticket_task
  AFTER INSERT OR UPDATE ON public.support_issues
  FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_create_task();

-- Order created with unpaid → payment follow-up; paid → fulfillment task
CREATE OR REPLACE FUNCTION public.trg_order_create_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IN ('unpaid','pending_verification') THEN
      PERFORM public.create_task_auto(
        'Follow up payment for ' || COALESCE(NEW.order_number, 'order'),
        'Order created — pending payment confirmation',
        'order', NEW.id, 'payments', 'high', 24,
        'verify_payment', NEW.created_by
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
      PERFORM public.create_task_auto(
        'Deliver order ' || COALESCE(NEW.order_number, ''),
        'Payment received — start fulfillment',
        'order', NEW.id, 'fulfillment', 'high', 12,
        'deliver_subscription', NEW.created_by
      );
    END IF;
    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' AND NEW.fulfillment_status = 'not_started' THEN
      PERFORM public.create_task_auto(
        'Provision accounts for ' || COALESCE(NEW.order_number, ''),
        'Order confirmed — release/provision required',
        'order', NEW.id, 'fulfillment', 'medium', 24,
        'deliver_subscription', NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_task ON public.orders;
CREATE TRIGGER trg_order_task
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_create_task();

-- Payment created (pending) → verification task
CREATE OR REPLACE FUNCTION public.trg_payment_create_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.create_task_auto(
      'Verify payment proof',
      'New payment record awaiting verification',
      'payment', NEW.id, 'payments', 'high', 6,
      'verify_payment', NULL
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payment_task ON public.payments;
CREATE TRIGGER trg_payment_task
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_payment_create_task();

-- ============ OVERDUE MARKER ============

CREATE OR REPLACE FUNCTION public.mark_overdue_tasks()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.tasks
    SET status = 'overdue'
    WHERE status IN ('pending','in_progress','waiting')
      AND due_date IS NOT NULL
      AND due_date < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;