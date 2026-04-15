INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can upload whatsapp media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media' AND (SELECT public.is_staff(auth.uid())));

CREATE POLICY "Staff can read whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media' AND (SELECT public.is_staff(auth.uid())));

CREATE POLICY "Public can read whatsapp media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'whatsapp-media');