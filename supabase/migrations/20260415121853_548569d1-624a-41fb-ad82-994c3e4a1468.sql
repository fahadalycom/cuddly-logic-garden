
-- System settings table for admin-managed configuration
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_secret boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "Admin can view settings" ON public.system_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert settings" ON public.system_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update settings" ON public.system_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete settings" ON public.system_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Staff (non-admin) can view non-secret settings only
CREATE POLICY "Staff can view non-secret settings" ON public.system_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND is_secret = false);

-- Seed default settings
INSERT INTO public.system_settings (key, value, category, description, is_secret) VALUES
  ('meta_whatsapp_token', '', 'whatsapp_api', 'Meta WhatsApp Cloud API access token', true),
  ('meta_whatsapp_phone_id', '', 'whatsapp_api', 'WhatsApp Business phone number ID', false),
  ('meta_webhook_verify_token', '', 'whatsapp_api', 'Webhook verification token', true),
  ('wa_ai_enabled', 'true', 'whatsapp_ai', 'Enable AI auto-responses', false),
  ('wa_ai_model', 'google/gemini-3-flash-preview', 'whatsapp_ai', 'AI model for auto-responses', false),
  ('wa_ai_auto_send_high', 'true', 'whatsapp_ai', 'Auto-send high-confidence AI responses', false),
  ('wa_ai_system_prompt_extra', '', 'whatsapp_ai', 'Additional system prompt instructions for AI', false),
  ('wa_default_greeting', 'Hello! How can we help you today?', 'whatsapp_general', 'Default greeting for new conversations', false),
  ('wa_business_hours_start', '09:00', 'whatsapp_general', 'Business hours start time', false),
  ('wa_business_hours_end', '18:00', 'whatsapp_general', 'Business hours end time', false),
  ('wa_out_of_hours_message', 'We are currently outside business hours. We will respond as soon as possible.', 'whatsapp_general', 'Auto-reply outside business hours', false);
