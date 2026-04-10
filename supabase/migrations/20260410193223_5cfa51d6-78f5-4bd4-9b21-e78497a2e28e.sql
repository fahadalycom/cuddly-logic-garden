
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_rep', 'support_expert', 'client_relation_manager', 'accountant', 'accounts_creator');
CREATE TYPE public.order_status AS ENUM ('draft', 'pending_payment', 'paid_unverified', 'paid_verified', 'to_deliver', 'delivered', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.account_status AS ENUM ('available', 'assigned', 'exhausted', 'expired');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expiring', 'expired', 'renewed', 'terminated');
CREATE TYPE public.trust_tag AS ENUM ('not_trusted', 'trusted', 'super_client');
CREATE TYPE public.issue_status AS ENUM ('open', 'in_review', 'approved', 'resolved', 'rejected');
CREATE TYPE public.reminder_response AS ENUM ('pending', 'renewed', 'refused', 'deferred');
CREATE TYPE public.duration_type AS ENUM ('day', 'week', 'month', 'year');
CREATE TYPE public.feedback_type AS ENUM ('review', 'feedback', 'follow_up');
CREATE TYPE public.template_category AS ENUM ('pre_invoice', 'payment_confirmation', 'delivery', 'renewal_reminder', 'feedback_request', 'product_info', 'general');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- STAFF PROFILES
-- =============================================
CREATE TABLE public.staff_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- USER ROLES
-- =============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER: has_role
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- =============================================
-- TEAMS
-- =============================================
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp_numbers TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TEAM MEMBERS
-- =============================================
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, staff_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- WHATSAPP ASSIGNMENTS
-- =============================================
CREATE TABLE public.whatsapp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  faq_content TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PRODUCT VARIANTS
-- =============================================
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount_percent NUMERIC(5,2) DEFAULT 0,
  max_discount_fixed NUMERIC(10,2) DEFAULT 0,
  sharing_standard INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PRODUCT DURATIONS
-- =============================================
CREATE TABLE public.product_durations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  duration_type duration_type NOT NULL,
  duration_value INTEGER NOT NULL DEFAULT 1,
  price_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_durations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MESSAGE TEMPLATES
-- =============================================
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category template_category NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CLIENTS
-- =============================================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  whatsapp_number TEXT,
  assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  trust_tag trust_tag NOT NULL DEFAULT 'not_trusted',
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status order_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ORDER ITEMS
-- =============================================
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  duration_type duration_type,
  duration_value INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ORDER STATUS HISTORY
-- =============================================
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT,
  reference TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SOFTWARE ACCOUNTS (INVENTORY)
-- =============================================
CREATE TABLE public.software_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  username TEXT,
  password_encrypted TEXT,
  login_instructions TEXT,
  notes TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  used_seats INTEGER NOT NULL DEFAULT 0,
  status account_status NOT NULL DEFAULT 'available',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.software_accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_software_accounts_updated_at BEFORE UPDATE ON public.software_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ACCOUNT ASSIGNMENTS
-- =============================================
CREATE TABLE public.account_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.software_accounts(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  order_item_id UUID REFERENCES public.order_items(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
ALTER TABLE public.account_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLIENT NOTES
-- =============================================
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLIENT TRANSFERS
-- =============================================
CREATE TABLE public.client_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_team_id UUID REFERENCES public.teams(id),
  to_team_id UUID REFERENCES public.teams(id),
  transferred_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_transfers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SUPPORT ISSUES
-- =============================================
CREATE TABLE public.support_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  account_id UUID REFERENCES public.software_accounts(id),
  type TEXT NOT NULL DEFAULT 'issue',
  description TEXT NOT NULL,
  status issue_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_support_issues_updated_at BEFORE UPDATE ON public.support_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- REPLACEMENTS
-- =============================================
CREATE TABLE public.replacements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.support_issues(id) ON DELETE CASCADE,
  old_account_id UUID REFERENCES public.software_accounts(id),
  new_account_id UUID REFERENCES public.software_accounts(id),
  approved_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.replacements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- REMINDERS
-- =============================================
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  reminder_number INTEGER NOT NULL DEFAULT 1,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  response reminder_response NOT NULL DEFAULT 'pending',
  deferred_to DATE,
  sent_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TERMINATIONS
-- =============================================
CREATE TABLE public.terminations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  reason TEXT,
  password_changed BOOLEAN NOT NULL DEFAULT false,
  access_removed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.terminations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FEEDBACK
-- =============================================
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type feedback_type NOT NULL DEFAULT 'feedback',
  content TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  collected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PERMISSIONS TABLE
-- =============================================
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(role, module)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Staff profiles
CREATE POLICY "Staff can view all profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.staff_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can insert profiles" ON public.staff_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete profiles" ON public.staff_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Staff can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Teams
CREATE POLICY "Staff can view teams" ON public.teams FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update teams" ON public.teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete teams" ON public.teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Team members
CREATE POLICY "Staff can view team members" ON public.team_members FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert team members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update team members" ON public.team_members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete team members" ON public.team_members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- WhatsApp assignments
CREATE POLICY "Staff can view whatsapp assignments" ON public.whatsapp_assignments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert whatsapp assignments" ON public.whatsapp_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update whatsapp assignments" ON public.whatsapp_assignments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete whatsapp assignments" ON public.whatsapp_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE POLICY "Staff can view products" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Product variants
CREATE POLICY "Staff can view variants" ON public.product_variants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update variants" ON public.product_variants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete variants" ON public.product_variants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Product durations
CREATE POLICY "Staff can view durations" ON public.product_durations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert durations" ON public.product_durations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update durations" ON public.product_durations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete durations" ON public.product_durations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Message templates
CREATE POLICY "Staff can view templates" ON public.message_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert templates" ON public.message_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update templates" ON public.message_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete templates" ON public.message_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Clients
CREATE POLICY "Staff can view clients" ON public.clients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Orders
CREATE POLICY "Staff can view orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Order items
CREATE POLICY "Staff can view order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Order status history
CREATE POLICY "Staff can view order history" ON public.order_status_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert order history" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Payments
CREATE POLICY "Staff can view payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update payments" ON public.payments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Software accounts
CREATE POLICY "Staff can view accounts" ON public.software_accounts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert accounts" ON public.software_accounts FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update accounts" ON public.software_accounts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Account assignments
CREATE POLICY "Staff can view assignments" ON public.account_assignments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create assignments" ON public.account_assignments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update assignments" ON public.account_assignments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Client notes
CREATE POLICY "Staff can view client notes" ON public.client_notes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can add client notes" ON public.client_notes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Client transfers
CREATE POLICY "Staff can view transfers" ON public.client_transfers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create transfers" ON public.client_transfers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Support issues
CREATE POLICY "Staff can view issues" ON public.support_issues FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage issues" ON public.support_issues FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update issues" ON public.support_issues FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Replacements
CREATE POLICY "Staff can view replacements" ON public.replacements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage replacements" ON public.replacements FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update replacements" ON public.replacements FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Subscriptions
CREATE POLICY "Staff can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Reminders
CREATE POLICY "Staff can view reminders" ON public.reminders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update reminders" ON public.reminders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- Terminations
CREATE POLICY "Staff can view terminations" ON public.terminations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage terminations" ON public.terminations FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Feedback
CREATE POLICY "Staff can view feedback" ON public.feedback FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Audit logs
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- Permissions
CREATE POLICY "Staff can view permissions" ON public.permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert permissions" ON public.permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update permissions" ON public.permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete permissions" ON public.permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- AUTO-CREATE STAFF PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_subscriptions_client_id ON public.subscriptions(client_id);
CREATE INDEX idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_reminders_scheduled_date ON public.reminders(scheduled_date);
CREATE INDEX idx_software_accounts_product_id ON public.software_accounts(product_id);
CREATE INDEX idx_software_accounts_status ON public.software_accounts(status);
CREATE INDEX idx_account_assignments_account_id ON public.account_assignments(account_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_clients_trust_tag ON public.clients(trust_tag);
CREATE INDEX idx_clients_assigned_team ON public.clients(assigned_team_id);

-- =============================================
-- SEED DEFAULT PERMISSIONS
-- =============================================
INSERT INTO public.permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'dashboard', true, true, true, true),
('admin', 'products', true, true, true, true),
('admin', 'orders', true, true, true, true),
('admin', 'payments', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'clients', true, true, true, true),
('admin', 'renewals', true, true, true, true),
('admin', 'feedback', true, true, true, true),
('admin', 'analytics', true, true, true, true),
('admin', 'settings', true, true, true, true),
('sales_rep', 'dashboard', true, false, false, false),
('sales_rep', 'products', true, false, false, false),
('sales_rep', 'orders', true, true, true, false),
('sales_rep', 'payments', true, true, false, false),
('sales_rep', 'clients', true, true, true, false),
('support_expert', 'dashboard', true, false, false, false),
('support_expert', 'orders', true, false, true, false),
('support_expert', 'inventory', true, false, true, false),
('support_expert', 'clients', true, false, true, false),
('client_relation_manager', 'dashboard', true, false, false, false),
('client_relation_manager', 'clients', true, false, true, false),
('client_relation_manager', 'renewals', true, true, true, false),
('client_relation_manager', 'feedback', true, true, true, false),
('accountant', 'dashboard', true, false, false, false),
('accountant', 'payments', true, false, true, false),
('accountant', 'orders', true, false, false, false),
('accounts_creator', 'dashboard', true, false, false, false),
('accounts_creator', 'inventory', true, true, true, false),
('accounts_creator', 'products', true, false, false, false);
