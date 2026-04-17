
-- 1. Issue type enum
DO $$ BEGIN
  CREATE TYPE public.issue_type AS ENUM (
    'login_issue','access_issue','wrong_plan','payment_issue','renewal_issue',
    'account_problem','product_not_working','replacement_request','refund_request',
    'general_support','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend issue_status enum (add new values if missing)
DO $$ BEGIN
  ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'waiting_customer';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'waiting_internal';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'closed';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'reopened';
EXCEPTION WHEN others THEN NULL; END $$;

-- 3. Extend support_issues table
ALTER TABLE public.support_issues
  ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS issue_type_v2 public.issue_type NOT NULL DEFAULT 'general_support',
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 4. Ticket number sequence + trigger
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_number ON public.support_issues;
CREATE TRIGGER trg_set_ticket_number
BEFORE INSERT ON public.support_issues
FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

-- Backfill ticket numbers for existing rows
UPDATE public.support_issues
SET ticket_number = 'TKT-' || LPAD(nextval('public.ticket_number_seq')::text, 4, '0')
WHERE ticket_number IS NULL;

-- 5. Ticket activity timeline table
CREATE TABLE IF NOT EXISTS public.ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_issues(id) ON DELETE CASCADE,
  actor_id UUID,
  event_type TEXT NOT NULL, -- created, assigned, status_changed, priority_changed, order_linked, order_unlinked, note_added, resolved, reopened, closed
  from_value TEXT,
  to_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket ON public.ticket_activity(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_issues_status ON public.support_issues(status);
CREATE INDEX IF NOT EXISTS idx_support_issues_conversation ON public.support_issues(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_issues_order ON public.support_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_support_issues_assigned ON public.support_issues(assigned_to);

ALTER TABLE public.ticket_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ticket activity"
  ON public.ticket_activity FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert ticket activity"
  ON public.ticket_activity FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admin can delete ticket activity"
  ON public.ticket_activity FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Allow admin delete on support_issues
DROP POLICY IF EXISTS "Admin can delete issues" ON public.support_issues;
CREATE POLICY "Admin can delete issues"
  ON public.support_issues FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. updated_at trigger on support_issues
DROP TRIGGER IF EXISTS trg_support_issues_updated_at ON public.support_issues;
CREATE TRIGGER trg_support_issues_updated_at
BEFORE UPDATE ON public.support_issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
