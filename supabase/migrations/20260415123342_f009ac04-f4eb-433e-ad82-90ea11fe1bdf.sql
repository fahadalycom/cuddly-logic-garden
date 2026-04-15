INSERT INTO public.system_settings (key, value, category, description, is_secret)
VALUES
  ('wa_ai_enabled', 'false', 'whatsapp_ai', 'Enable/disable AI auto-response analysis', false),
  ('wa_ai_auto_send_high', 'false', 'whatsapp_ai', 'Auto-send AI replies when confidence is high', false),
  ('wa_ai_model', 'google/gemini-2.5-flash', 'whatsapp_ai', 'AI model used for auto-responses', false),
  ('wa_ai_system_prompt_extra', '', 'whatsapp_ai', 'Additional custom instructions for AI system prompt', false)
ON CONFLICT (key) DO NOTHING;