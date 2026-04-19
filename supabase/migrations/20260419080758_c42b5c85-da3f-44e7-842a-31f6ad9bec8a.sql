-- Enums
CREATE TYPE public.channel_type AS ENUM ('whatsapp', 'messenger', 'instagram');
CREATE TYPE public.channel_status AS ENUM ('not_configured', 'healthy', 'warning', 'error', 'disabled');

-- Table
CREATE TABLE public.channel_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type public.channel_type NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  status public.channel_status NOT NULL DEFAULT 'not_configured',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets_set jsonb NOT NULL DEFAULT '{}'::jsonb,
  verify_token text,
  webhook_url text,
  last_health_check_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  last_error_field text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view channel integrations"
  ON public.channel_integrations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view channel integrations"
  ON public.channel_integrations FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Admin can insert channel integrations"
  ON public.channel_integrations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update channel integrations"
  ON public.channel_integrations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete channel integrations"
  ON public.channel_integrations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER trg_channel_integrations_updated_at
  BEFORE UPDATE ON public.channel_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one row per channel
INSERT INTO public.channel_integrations (channel_type, status) VALUES
  ('whatsapp', 'not_configured'),
  ('messenger', 'not_configured'),
  ('instagram', 'not_configured');