-- ============================================================
-- 1. EXTEND app_role ENUM with new roles
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'payment_verifier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fulfillment_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'renewal_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'account_provisioning_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'research_analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor_coordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'qa_reviewer';

-- ============================================================
-- 2. NEW ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.staff_availability AS ENUM ('active', 'on_break', 'offline', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_channel AS ENUM ('whatsapp', 'facebook', 'instagram', 'email', 'web', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_queue AS ENUM ('sales', 'support', 'payment', 'renewal', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new', 'interested', 'follow_up', 'converted', 'dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('whatsapp', 'facebook', 'instagram', 'website', 'referral', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_related_type AS ENUM ('order', 'conversation', 'ticket', 'lead', 'subscription', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tool_request_status AS ENUM ('new', 'researching', 'approved', 'rejected', 'sourced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vendor_status AS ENUM ('active', 'inactive', 'blacklisted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_status AS ENUM ('active', 'negotiation', 'expired', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. EXTEND staff_profiles
-- ============================================================
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS availability_status public.staff_availability NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS max_active_chats INTEGER NOT NULL DEFAULT 3;

-- ============================================================
-- 4. EXTEND clients (acts as customers)
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status public.client_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 5. EXTEND wa_conversations (multi-channel ready)
-- ============================================================
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS channel public.conversation_channel NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS queue public.conversation_queue NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority public.priority_level NOT NULL DEFAULT 'medium';

-- ============================================================
-- 6. EXTEND payments
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- ============================================================
-- 7. EXTEND support_issues
-- ============================================================
ALTER TABLE public.support_issues
  ADD COLUMN IF NOT EXISTS priority public.priority_level NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.wa_conversations(id) ON DELETE SET NULL;

-- ============================================================
-- 8. NEW TABLE: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source public.lead_source NOT NULL DEFAULT 'whatsapp',
  interest TEXT,
  notes TEXT,
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to UUID,
  converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view leads" ON public.leads FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update leads" ON public.leads FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Admin can delete leads" ON public.leads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- ============================================================
-- 9. NEW TABLE: plans (subscription plans per product)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  price NUMERIC NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view plans" ON public.plans FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Admin can insert plans" ON public.plans FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update plans" ON public.plans FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete plans" ON public.plans FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_plans_product_id ON public.plans(product_id);

-- ============================================================
-- 10. NEW TABLE: tasks (polymorphic workflow tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  related_type public.task_related_type NOT NULL DEFAULT 'general',
  related_id UUID,
  assigned_to UUID,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority public.priority_level NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tasks" ON public.tasks FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_related ON public.tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- ============================================================
-- 11. NEW TABLE: tool_requests (research demand)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tool_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  requested_by_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  requested_by_user_id UUID,
  demand_count INTEGER NOT NULL DEFAULT 1,
  status public.tool_request_status NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tool requests" ON public.tool_requests FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can create tool requests" ON public.tool_requests FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update tool requests" ON public.tool_requests FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Admin can delete tool requests" ON public.tool_requests FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tool_requests_updated_at BEFORE UPDATE ON public.tool_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tool_requests_status ON public.tool_requests(status);
CREATE INDEX IF NOT EXISTS idx_tool_requests_demand ON public.tool_requests(demand_count DESC);

-- ============================================================
-- 12. NEW TABLE: vendors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_url TEXT,
  category TEXT,
  notes TEXT,
  status public.vendor_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view vendors" ON public.vendors FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Admin can insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update vendors" ON public.vendors FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete vendors" ON public.vendors FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);

-- ============================================================
-- 13. NEW TABLE: vendor_deals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendor_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_details TEXT,
  coupon_code TEXT,
  starts_at DATE,
  expires_at DATE,
  status public.deal_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view deals" ON public.vendor_deals FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Admin can insert deals" ON public.vendor_deals FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update deals" ON public.vendor_deals FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete deals" ON public.vendor_deals FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_vendor_deals_updated_at BEFORE UPDATE ON public.vendor_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vendor_deals_vendor_id ON public.vendor_deals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_deals_status ON public.vendor_deals(status);

-- ============================================================
-- 14. PERFORMANCE INDEXES on existing tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wa_conversations_assigned_agent ON public.wa_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status ON public.wa_conversations(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_queue ON public.wa_conversations(queue);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id ON public.wa_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON public.subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_support_issues_status ON public.support_issues(status);
CREATE INDEX IF NOT EXISTS idx_support_issues_assigned_to ON public.support_issues(assigned_to);