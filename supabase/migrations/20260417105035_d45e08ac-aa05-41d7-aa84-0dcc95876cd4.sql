
-- Extend tool_request_status with launched & revisit_later
DO $$ BEGIN
  ALTER TYPE public.tool_request_status ADD VALUE IF NOT EXISTS 'launched';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.tool_request_status ADD VALUE IF NOT EXISTS 'revisit_later';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New enums
DO $$ BEGIN
  CREATE TYPE public.request_source AS ENUM ('whatsapp','facebook','instagram','internal','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.requester_type AS ENUM ('customer','team_member','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.research_status AS ENUM ('not_started','in_progress','completed','on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.research_recommendation AS ENUM ('approve','reject','test_first','revisit_later','undecided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend tool_requests
ALTER TABLE public.tool_requests
  ADD COLUMN IF NOT EXISTS priority public.priority_level NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source public.request_source NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS requester_type public.requester_type NOT NULL DEFAULT 'team_member',
  ADD COLUMN IF NOT EXISTS requested_by_name text,
  ADD COLUMN IF NOT EXISTS last_requested_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tool_requests_status ON public.tool_requests(status);
CREATE INDEX IF NOT EXISTS idx_tool_requests_priority ON public.tool_requests(priority);
CREATE INDEX IF NOT EXISTS idx_tool_requests_source ON public.tool_requests(source);

-- research_records
CREATE TABLE IF NOT EXISTS public.research_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL,
  category text,
  related_request_id uuid REFERENCES public.tool_requests(id) ON DELETE SET NULL,
  assigned_to uuid,
  status public.research_status NOT NULL DEFAULT 'not_started',
  feasibility_score int CHECK (feasibility_score BETWEEN 0 AND 10),
  demand_score int CHECK (demand_score BETWEEN 0 AND 10),
  support_complexity_score int CHECK (support_complexity_score BETWEEN 0 AND 10),
  risk_score int CHECK (risk_score BETWEEN 0 AND 10),
  notes text,
  recommendation public.research_recommendation NOT NULL DEFAULT 'undecided',
  decided_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_status ON public.research_records(status);
CREATE INDEX IF NOT EXISTS idx_research_recommendation ON public.research_records(recommendation);
CREATE INDEX IF NOT EXISTS idx_research_request ON public.research_records(related_request_id);

ALTER TABLE public.research_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view research" ON public.research_records FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create research" ON public.research_records FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update research" ON public.research_records FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can delete research" ON public.research_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_research_updated_at BEFORE UPDATE ON public.research_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto stamp decided_at when recommendation changes from undecided
CREATE OR REPLACE FUNCTION public.stamp_research_decision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.recommendation IS DISTINCT FROM OLD.recommendation
     AND NEW.recommendation <> 'undecided' THEN
    NEW.decided_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_research_decision BEFORE UPDATE ON public.research_records
  FOR EACH ROW EXECUTE FUNCTION public.stamp_research_decision();
