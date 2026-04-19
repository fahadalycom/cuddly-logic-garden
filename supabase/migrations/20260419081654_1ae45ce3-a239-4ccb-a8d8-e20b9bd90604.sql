-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.message_direction AS ENUM ('inbound','outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_delivery_status AS ENUM (
    'queued','sending','sent_to_api','delivered','read','failed','retrying','permanently_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbound_event_type AS ENUM ('message','status','error','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbound_event_processing_status AS ENUM ('pending','processed','failed','duplicate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.send_job_status AS ENUM ('pending','running','done','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend wa_messages
ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS direction public.message_direction,
  ADD COLUMN IF NOT EXISTS delivery_status public.message_delivery_status,
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_retries int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS provider_response jsonb,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

-- Backfill direction from sender_type
UPDATE public.wa_messages
  SET direction = CASE WHEN sender_type = 'customer' THEN 'inbound'::public.message_direction
                       ELSE 'outbound'::public.message_direction END
  WHERE direction IS NULL;

-- Backfill external_message_id from whatsapp_message_id if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='wa_messages' AND column_name='whatsapp_message_id'
  ) THEN
    EXECUTE 'UPDATE public.wa_messages SET external_message_id = whatsapp_message_id WHERE external_message_id IS NULL AND whatsapp_message_id IS NOT NULL';
  END IF;
END $$;

-- Backfill delivery_status
UPDATE public.wa_messages
  SET delivery_status = CASE
    WHEN direction = 'inbound' THEN 'delivered'::public.message_delivery_status
    WHEN external_message_id IS NOT NULL THEN 'delivered'::public.message_delivery_status
    ELSE 'sent_to_api'::public.message_delivery_status
  END
  WHERE delivery_status IS NULL;

-- Defaults & constraints going forward
ALTER TABLE public.wa_messages
  ALTER COLUMN direction SET DEFAULT 'outbound',
  ALTER COLUMN direction SET NOT NULL,
  ALTER COLUMN delivery_status SET DEFAULT 'queued',
  ALTER COLUMN delivery_status SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_idempotency_key_uidx
  ON public.wa_messages (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS wa_messages_external_id_idx
  ON public.wa_messages (external_message_id) WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wa_messages_delivery_status_idx
  ON public.wa_messages (delivery_status);

-- 3. wa_inbound_events
CREATE TABLE IF NOT EXISTS public.wa_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'whatsapp',
  event_type public.inbound_event_type NOT NULL DEFAULT 'unknown',
  raw_payload jsonb NOT NULL,
  external_message_id text,
  conversation_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_status public.inbound_event_processing_status NOT NULL DEFAULT 'pending',
  error_message text
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_inbound_events_dedupe_uidx
  ON public.wa_inbound_events (channel, external_message_id, event_type)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wa_inbound_events_received_idx
  ON public.wa_inbound_events (received_at DESC);

ALTER TABLE public.wa_inbound_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_inbound_events" ON public.wa_inbound_events;
CREATE POLICY "staff_read_inbound_events" ON public.wa_inbound_events
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admin_write_inbound_events" ON public.wa_inbound_events;
CREATE POLICY "admin_write_inbound_events" ON public.wa_inbound_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. wa_send_jobs
CREATE TABLE IF NOT EXISTS public.wa_send_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.wa_messages(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  status public.send_job_status NOT NULL DEFAULT 'pending',
  attempt_count int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_send_jobs_idem_uidx
  ON public.wa_send_jobs (idempotency_key);

CREATE INDEX IF NOT EXISTS wa_send_jobs_status_idx
  ON public.wa_send_jobs (status, next_attempt_at);

ALTER TABLE public.wa_send_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_send_jobs" ON public.wa_send_jobs;
CREATE POLICY "staff_read_send_jobs" ON public.wa_send_jobs
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_write_send_jobs" ON public.wa_send_jobs;
CREATE POLICY "staff_write_send_jobs" ON public.wa_send_jobs
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS wa_send_jobs_updated_at ON public.wa_send_jobs;
CREATE TRIGGER wa_send_jobs_updated_at
  BEFORE UPDATE ON public.wa_send_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Realtime
ALTER TABLE public.wa_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='wa_messages';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages';
  END IF;
END $$;