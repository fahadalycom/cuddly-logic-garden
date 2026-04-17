-- 1. Automation settings (admin toggles)
CREATE TABLE public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view automation settings" ON public.automation_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert automation settings" ON public.automation_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can update automation settings" ON public.automation_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can delete automation settings" ON public.automation_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_automation_settings_updated
  BEFORE UPDATE ON public.automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default toggles
INSERT INTO public.automation_settings(key, enabled, description, category) VALUES
  ('auto_create_support_task_on_ticket', true, 'Create a support task when a new ticket is opened', 'tickets'),
  ('auto_create_payment_task_on_pending_order', true, 'Create payment verification task on unpaid orders', 'orders'),
  ('auto_create_fulfillment_task_on_paid_order', true, 'Create fulfillment task when order becomes paid', 'orders'),
  ('auto_create_handoff_task', true, 'Create follow-up task after conversation handoff', 'conversations'),
  ('auto_create_renewal_task_on_expiring_sub', true, 'Create renewal task when subscription nears expiry', 'renewals'),
  ('auto_suggest_research_on_high_demand', true, 'Suggest starting research when tool demand >= 3', 'research'),
  ('auto_create_vendor_followup_task', true, 'Create vendor follow-up task when deal follow-up is overdue', 'vendors'),
  ('enable_conversation_suggestions', true, 'Show smart assist suggestions in conversations', 'ai'),
  ('enable_handoff_suggestions', true, 'Show suggested department handoffs', 'ai'),
  ('enable_summary_generation', true, 'Allow AI summary generation for conversations/tickets', 'ai'),
  ('enable_reply_suggestions', true, 'Show suggested reply drafts in conversations', 'ai');

-- 2. Automation logs
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  result text NOT NULL DEFAULT 'success',
  details jsonb DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'system',
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view automation logs" ON public.automation_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert automation logs" ON public.automation_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admin can delete automation logs" ON public.automation_logs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_automation_logs_created ON public.automation_logs(created_at DESC);
CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_key, created_at DESC);

-- 3. Helper: check if automation is enabled
CREATE OR REPLACE FUNCTION public.automation_enabled(_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT enabled FROM public.automation_settings WHERE key = _key), true);
$$;

-- 4. Helper: write automation log (SECURITY DEFINER so triggers can write)
CREATE OR REPLACE FUNCTION public.log_automation(
  _rule_key text, _action text, _entity_type text, _entity_id uuid,
  _result text DEFAULT 'success', _details jsonb DEFAULT '{}'::jsonb, _source text DEFAULT 'trigger'
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.automation_logs(rule_key, action, entity_type, entity_id, result, details, source, actor_id)
  VALUES (_rule_key, _action, _entity_type, _entity_id, _result, _details, _source, auth.uid());
$$;

-- 5. Wrap existing triggers with toggle checks: rebuild create_task_auto-using triggers
--    Patch trg_ticket_create_task to honor toggle + log
CREATE OR REPLACE FUNCTION public.trg_ticket_create_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prio text; new_task uuid;
BEGIN
  prio := COALESCE(NEW.priority::text, 'medium');
  IF TG_OP = 'INSERT' THEN
    IF public.automation_enabled('auto_create_support_task_on_ticket') THEN
      new_task := public.create_task_auto(
        'Handle ticket ' || COALESCE(NEW.ticket_number, ''),
        COALESCE(NEW.summary, NEW.description),
        'ticket', NEW.id, 'support', prio, 24, 'resolve_complaint', NEW.created_by);
      PERFORM public.log_automation('auto_create_support_task_on_ticket','task_created','ticket',NEW.id,
        'success', jsonb_build_object('task_id', new_task));
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'waiting_internal' AND OLD.status <> 'waiting_internal' THEN
    new_task := public.create_task_auto(
      'Internal follow-up for ticket ' || COALESCE(NEW.ticket_number, ''),
      'Ticket waiting on internal action', 'ticket', NEW.id, 'support', prio, 8,
      'check_account_issue', NEW.assigned_to);
    PERFORM public.log_automation('ticket_waiting_internal','task_created','ticket',NEW.id,
      'success', jsonb_build_object('task_id', new_task));
  END IF;
  RETURN NEW;
END $$;

--    Patch trg_order_create_task
CREATE OR REPLACE FUNCTION public.trg_order_create_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_task uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IN ('unpaid','pending_verification')
       AND public.automation_enabled('auto_create_payment_task_on_pending_order') THEN
      new_task := public.create_task_auto(
        'Follow up payment for ' || COALESCE(NEW.order_number, 'order'),
        'Order created — pending payment confirmation',
        'order', NEW.id, 'payments', 'high', 24, 'verify_payment', NEW.created_by);
      PERFORM public.log_automation('auto_create_payment_task_on_pending_order','task_created','order',NEW.id,
        'success', jsonb_build_object('task_id', new_task));
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid'
       AND public.automation_enabled('auto_create_fulfillment_task_on_paid_order') THEN
      new_task := public.create_task_auto(
        'Deliver order ' || COALESCE(NEW.order_number, ''),
        'Payment received — start fulfillment', 'order', NEW.id, 'fulfillment', 'high', 12,
        'deliver_subscription', NEW.created_by);
      PERFORM public.log_automation('auto_create_fulfillment_task_on_paid_order','task_created','order',NEW.id,
        'success', jsonb_build_object('task_id', new_task));
    END IF;
    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' AND NEW.fulfillment_status = 'not_started' THEN
      new_task := public.create_task_auto(
        'Provision accounts for ' || COALESCE(NEW.order_number, ''),
        'Order confirmed — release/provision required', 'order', NEW.id, 'fulfillment', 'medium', 24,
        'deliver_subscription', NEW.created_by);
      PERFORM public.log_automation('order_confirmed_provision','task_created','order',NEW.id,
        'success', jsonb_build_object('task_id', new_task));
    END IF;
  END IF;
  RETURN NEW;
END $$;

--    Patch trg_handoff_create_task
CREATE OR REPLACE FUNCTION public.trg_handoff_create_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dept text; title text; prio text := 'medium'; new_task uuid;
BEGIN
  IF NOT public.automation_enabled('auto_create_handoff_task') THEN RETURN NEW; END IF;
  dept := CASE NEW.to_queue
    WHEN 'support'  THEN 'support' WHEN 'payment'  THEN 'payments' WHEN 'payments' THEN 'payments'
    WHEN 'renewal'  THEN 'renewals' WHEN 'renewals' THEN 'renewals' WHEN 'sales' THEN 'sales'
    ELSE 'operations' END;
  title := CASE dept
    WHEN 'support'     THEN 'Follow up: support handoff'
    WHEN 'payments'    THEN 'Verify payment from chat handoff'
    WHEN 'fulfillment' THEN 'Deliver subscription (chat handoff)'
    WHEN 'renewals'    THEN 'Renewal follow-up from chat'
    WHEN 'sales'       THEN 'Sales follow-up'
    ELSE 'Conversation follow-up' END;
  new_task := public.create_task_auto(title, COALESCE(NEW.note, 'Conversation transferred to ' || dept),
    'conversation', NEW.conversation_id, dept, prio, 12, 'handoff_followup', NEW.transferred_by);
  PERFORM public.log_automation('auto_create_handoff_task','task_created','conversation',NEW.conversation_id,
    'success', jsonb_build_object('task_id', new_task, 'to_queue', NEW.to_queue));
  RETURN NEW;
END $$;

--    Patch trg_payment_create_task
CREATE OR REPLACE FUNCTION public.trg_payment_create_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_task uuid;
BEGIN
  IF NEW.status = 'pending' AND public.automation_enabled('auto_create_payment_task_on_pending_order') THEN
    new_task := public.create_task_auto('Verify payment proof','New payment record awaiting verification',
      'payment', NEW.id, 'payments', 'high', 6, 'verify_payment', NULL);
    PERFORM public.log_automation('payment_pending_verify','task_created','payment',NEW.id,
      'success', jsonb_build_object('task_id', new_task));
  END IF;
  RETURN NEW;
END $$;

-- 6. NEW TRIGGER: vendor deal follow-up overdue scan (callable function for cron/manual)
CREATE OR REPLACE FUNCTION public.scan_overdue_vendor_followups()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record; created int := 0; new_task uuid;
BEGIN
  IF NOT public.automation_enabled('auto_create_vendor_followup_task') THEN
    RETURN jsonb_build_object('ok', true, 'created', 0, 'skipped', 'disabled');
  END IF;
  FOR d IN
    SELECT vd.id, vd.title, vd.vendor_id, vd.assigned_to, vd.priority, vd.follow_up_date, v.name as vendor_name
    FROM public.vendor_deals vd
    LEFT JOIN public.vendors v ON v.id = vd.vendor_id
    WHERE vd.status IN ('new','contacted','in_negotiation')
      AND vd.follow_up_date IS NOT NULL
      AND vd.follow_up_date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.related_type = 'general'::task_related_type
          AND t.related_id = vd.id
          AND t.template_key = 'vendor_followup'
          AND t.status IN ('pending','in_progress','waiting','overdue')
      )
    LIMIT 50
  LOOP
    new_task := public.create_task_auto(
      'Follow up vendor deal: ' || d.title,
      'Overdue follow-up with ' || COALESCE(d.vendor_name, 'vendor'),
      'general', d.id, 'sales', COALESCE(d.priority::text,'medium'), 8,
      'vendor_followup', NULL);
    PERFORM public.log_automation('auto_create_vendor_followup_task','task_created','vendor_deal',d.id,
      'success', jsonb_build_object('task_id', new_task));
    created := created + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'created', created);
END $$;

-- 7. NEW TRIGGER: expiring subscription scan (renewals)
CREATE OR REPLACE FUNCTION public.scan_expiring_subscriptions(_days_ahead int DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; created int := 0; new_task uuid; client_name text;
BEGIN
  IF NOT public.automation_enabled('auto_create_renewal_task_on_expiring_sub') THEN
    RETURN jsonb_build_object('ok', true, 'created', 0, 'skipped', 'disabled');
  END IF;
  FOR s IN
    SELECT sub.id, sub.client_id, sub.end_date, sub.product_id, c.name as client_name, p.name as product_name
    FROM public.subscriptions sub
    JOIN public.clients c ON c.id = sub.client_id
    LEFT JOIN public.products p ON p.id = sub.product_id
    WHERE sub.status = 'active'
      AND sub.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + _days_ahead)
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.related_type = 'general'::task_related_type
          AND t.related_id = sub.id
          AND t.template_key = 'renewal_followup'
          AND t.status IN ('pending','in_progress','waiting','overdue')
      )
    LIMIT 100
  LOOP
    new_task := public.create_task_auto(
      'Renewal follow-up: ' || COALESCE(s.product_name,'subscription') || ' for ' || s.client_name,
      'Subscription expiring on ' || s.end_date::text, 'general', s.id, 'renewals', 'high', 24,
      'renewal_followup', NULL);
    PERFORM public.log_automation('auto_create_renewal_task_on_expiring_sub','task_created','subscription',s.id,
      'success', jsonb_build_object('task_id', new_task, 'end_date', s.end_date));
    created := created + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'created', created);
END $$;

-- 8. NEW TRIGGER: high-demand research suggestion (on tool_request update/insert)
CREATE OR REPLACE FUNCTION public.trg_suggest_research_on_demand()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing uuid;
BEGIN
  IF NOT public.automation_enabled('auto_suggest_research_on_high_demand') THEN RETURN NEW; END IF;
  IF NEW.demand_count >= 3 AND NEW.status = 'new' THEN
    SELECT id INTO existing FROM public.research_records WHERE related_request_id = NEW.id LIMIT 1;
    IF existing IS NULL THEN
      PERFORM public.log_automation('auto_suggest_research_on_high_demand','suggestion','tool_request',NEW.id,
        'success', jsonb_build_object('tool_name', NEW.tool_name, 'demand_count', NEW.demand_count,
          'message','High demand detected — suggest starting research'));
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tool_request_demand ON public.tool_requests;
CREATE TRIGGER trg_tool_request_demand
  AFTER INSERT OR UPDATE OF demand_count ON public.tool_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_suggest_research_on_demand();