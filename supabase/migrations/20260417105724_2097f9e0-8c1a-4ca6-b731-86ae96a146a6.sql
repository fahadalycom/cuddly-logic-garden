-- New enums (avoid conflicts with existing ones)
CREATE TYPE public.vendor_source_type AS ENUM ('direct_company', 'reseller', 'marketplace');
CREATE TYPE public.deal_type AS ENUM ('coupon', 'bulk_discount', 'partnership', 'reseller', 'trial_offer');
CREATE TYPE public.outreach_method AS ENUM ('email', 'linkedin', 'whatsapp', 'phone', 'other');
CREATE TYPE public.outreach_status AS ENUM ('no_response', 'replied', 'follow_up', 'closed');

-- Extend deal_status enum with the new pipeline values (existing: active, negotiation, expired, rejected)
ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'in_negotiation';
ALTER TYPE public.deal_status ADD VALUE IF NOT EXISTS 'agreed';

-- Extend vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS source_type vendor_source_type NOT NULL DEFAULT 'direct_company';

-- Extend vendor_deals table
ALTER TABLE public.vendor_deals
  ADD COLUMN IF NOT EXISTS deal_type deal_type NOT NULL DEFAULT 'coupon',
  ADD COLUMN IF NOT EXISTS expected_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_selling_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_margin numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority priority_level NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS related_research_id uuid REFERENCES public.research_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_vendor_deals_vendor ON public.vendor_deals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_deals_status ON public.vendor_deals(status);
CREATE INDEX IF NOT EXISTS idx_vendor_deals_followup ON public.vendor_deals(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- RLS for vendors (in case missing)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Staff can view vendors" ON public.vendors FOR SELECT TO authenticated USING (is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Staff can create vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Staff can update vendors" ON public.vendors FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can delete vendors" ON public.vendors FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vendor_deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Staff can view vendor_deals" ON public.vendor_deals FOR SELECT TO authenticated USING (is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Staff can create vendor_deals" ON public.vendor_deals FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Staff can update vendor_deals" ON public.vendor_deals FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can delete vendor_deals" ON public.vendor_deals FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Outreach log
CREATE TABLE public.vendor_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.vendor_deals(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  contact_date timestamptz NOT NULL DEFAULT now(),
  method outreach_method NOT NULL DEFAULT 'email',
  message_summary text,
  response_summary text,
  next_follow_up_date date,
  status outreach_status NOT NULL DEFAULT 'no_response',
  logged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_outreach_deal ON public.vendor_outreach(deal_id);
CREATE INDEX idx_vendor_outreach_vendor ON public.vendor_outreach(vendor_id);

ALTER TABLE public.vendor_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view outreach" ON public.vendor_outreach FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can create outreach" ON public.vendor_outreach FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update outreach" ON public.vendor_outreach FOR UPDATE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Admin can delete outreach" ON public.vendor_outreach FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Sync deal follow-up date when outreach logged
CREATE OR REPLACE FUNCTION public.sync_deal_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.next_follow_up_date IS NOT NULL THEN
    UPDATE public.vendor_deals
      SET follow_up_date = NEW.next_follow_up_date,
          updated_at = now()
      WHERE id = NEW.deal_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_deal_followup AFTER INSERT ON public.vendor_outreach
FOR EACH ROW EXECUTE FUNCTION public.sync_deal_followup();