-- 1. wa_conversations: external identity + integration link
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS external_user_id text,
  ADD COLUMN IF NOT EXISTS external_conversation_id text,
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES public.channel_integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_conversations_channel_external_user
  ON public.wa_conversations(channel, external_user_id)
  WHERE external_user_id IS NOT NULL;

-- 2. wa_messages: idempotent inbound dedupe
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_messages_channel_external_id
  ON public.wa_messages(channel, external_message_id)
  WHERE external_message_id IS NOT NULL;

-- 3. wa_inbound_events: integration link + helpful indexes
ALTER TABLE public.wa_inbound_events
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES public.channel_integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_inbound_events_channel_received
  ON public.wa_inbound_events(channel, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_inbound_events_processing_status
  ON public.wa_inbound_events(processing_status, received_at DESC);

-- 4. RLS for admin ops log access on wa_inbound_events
ALTER TABLE public.wa_inbound_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view inbound events" ON public.wa_inbound_events;
CREATE POLICY "Admins can view inbound events"
ON public.wa_inbound_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages inbound events" ON public.wa_inbound_events;
CREATE POLICY "Service role manages inbound events"
ON public.wa_inbound_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
