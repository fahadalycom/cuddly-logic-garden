
-- Conversation status enum
CREATE TYPE public.wa_conversation_status AS ENUM ('active', 'waiting', 'resolved', 'archived');

-- Message sender type
CREATE TYPE public.wa_sender_type AS ENUM ('customer', 'agent', 'system', 'ai');

-- Media type
CREATE TYPE public.wa_media_type AS ENUM ('text', 'image', 'video', 'audio', 'document', 'sticker');

-- AI confidence level
CREATE TYPE public.wa_ai_confidence AS ENUM ('high', 'medium', 'low');

-- Queue status
CREATE TYPE public.wa_queue_status AS ENUM ('waiting', 'assigned', 'expired');

-- ============ CONVERSATIONS ============
CREATE TABLE public.wa_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_whatsapp_id TEXT,
  client_id UUID REFERENCES public.clients(id),
  assigned_agent_id UUID,
  status wa_conversation_status NOT NULL DEFAULT 'active',
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_conversations_agent ON public.wa_conversations(assigned_agent_id);
CREATE INDEX idx_wa_conversations_status ON public.wa_conversations(status);
CREATE INDEX idx_wa_conversations_phone ON public.wa_conversations(customer_phone);

ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view conversations" ON public.wa_conversations
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert conversations" ON public.wa_conversations
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update conversations" ON public.wa_conversations
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

-- ============ MESSAGES ============
CREATE TABLE public.wa_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  sender_type wa_sender_type NOT NULL DEFAULT 'customer',
  sender_id UUID,
  content TEXT,
  media_url TEXT,
  media_type wa_media_type NOT NULL DEFAULT 'text',
  media_mime_type TEXT,
  media_filename TEXT,
  whatsapp_message_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_conversation ON public.wa_messages(conversation_id, created_at);
CREATE INDEX idx_wa_messages_whatsapp_id ON public.wa_messages(whatsapp_message_id);

ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view messages" ON public.wa_messages
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert messages" ON public.wa_messages
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update messages" ON public.wa_messages
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

-- ============ AGENT CONFIG ============
CREATE TABLE public.wa_agent_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL UNIQUE,
  max_active_chats INTEGER NOT NULL DEFAULT 3,
  max_unread_visible INTEGER NOT NULL DEFAULT 4,
  daily_message_limit INTEGER NOT NULL DEFAULT 100,
  messages_sent_today INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view agent config" ON public.wa_agent_config
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Admin can insert agent config" ON public.wa_agent_config
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update agent config" ON public.wa_agent_config
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ QUEUE ============
CREATE TABLE public.wa_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  status wa_queue_status NOT NULL DEFAULT 'waiting',
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_queue_status ON public.wa_queue(status, priority DESC, created_at);

ALTER TABLE public.wa_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view queue" ON public.wa_queue
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert queue" ON public.wa_queue
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update queue" ON public.wa_queue
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

-- ============ AI AUTO RESPONSE LOG ============
CREATE TABLE public.wa_auto_response_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.wa_messages(id),
  detected_intent TEXT,
  matched_product_id UUID REFERENCES public.products(id),
  confidence wa_ai_confidence NOT NULL DEFAULT 'low',
  suggested_response TEXT,
  was_sent BOOLEAN NOT NULL DEFAULT false,
  agent_approved BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_auto_response_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view auto response logs" ON public.wa_auto_response_log
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert auto response logs" ON public.wa_auto_response_log
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update auto response logs" ON public.wa_auto_response_log
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_queue;

-- ============ TRIGGERS ============
CREATE TRIGGER update_wa_conversations_updated_at
  BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_agent_config_updated_at
  BEFORE UPDATE ON public.wa_agent_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
