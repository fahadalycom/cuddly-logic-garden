
-- Add reply_to_message_id to wa_messages for quote/reply feature
ALTER TABLE public.wa_messages ADD COLUMN reply_to_message_id uuid REFERENCES public.wa_messages(id) ON DELETE SET NULL;

-- Add reactions column to wa_messages (jsonb array of {emoji, user_id, created_at})
ALTER TABLE public.wa_messages ADD COLUMN reactions jsonb DEFAULT '[]'::jsonb;

-- Create conversation tags table
CREATE TABLE public.wa_conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  tag text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag)
);

ALTER TABLE public.wa_conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tags" ON public.wa_conversation_tags FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert tags" ON public.wa_conversation_tags FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete tags" ON public.wa_conversation_tags FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Create internal notes table (visible only to agents, not sent to customer)
CREATE TABLE public.wa_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view notes" ON public.wa_internal_notes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert notes" ON public.wa_internal_notes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete notes" ON public.wa_internal_notes FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversation_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_internal_notes;
