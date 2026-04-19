
-- 1. Backfill whatsapp_number from phone where missing
UPDATE public.clients
SET whatsapp_number = phone
WHERE (whatsapp_number IS NULL OR whatsapp_number = '')
  AND phone IS NOT NULL AND phone <> '';

-- 2. Normalize whatsapp_number (trim)
UPDATE public.clients
SET whatsapp_number = NULLIF(trim(whatsapp_number), '');

-- 3. For clients with no whatsapp_number at all, synthesize a placeholder so we can enforce NOT NULL
UPDATE public.clients
SET whatsapp_number = 'unknown-' || id::text
WHERE whatsapp_number IS NULL OR whatsapp_number = '';

-- 4. Deduplicate: keep the oldest non-archived client per whatsapp_number, repoint FKs, archive others
DO $$
DECLARE
  dup RECORD;
  keeper UUID;
BEGIN
  FOR dup IN
    SELECT whatsapp_number
    FROM public.clients
    WHERE is_archived = false
    GROUP BY whatsapp_number
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper
    FROM public.clients
    WHERE whatsapp_number = dup.whatsapp_number AND is_archived = false
    ORDER BY created_at ASC
    LIMIT 1;

    -- Repoint references on common tables to keeper
    UPDATE public.orders          SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.subscriptions   SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.client_notes    SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.support_issues  SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.feedback        SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.reminders       SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.invoices        SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);
    UPDATE public.account_assignments SET client_id = keeper WHERE client_id IN (SELECT id FROM public.clients WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper);

    -- Archive the rest and uniquify their number to avoid unique-violation
    UPDATE public.clients
    SET is_archived = true,
        whatsapp_number = whatsapp_number || ':dup:' || id::text
    WHERE whatsapp_number = dup.whatsapp_number AND id <> keeper;
  END LOOP;
END $$;

-- 5. For archived rows still colliding, ensure uniqueness
UPDATE public.clients c1
SET whatsapp_number = whatsapp_number || ':arc:' || id::text
WHERE is_archived = true
  AND EXISTS (
    SELECT 1 FROM public.clients c2
    WHERE c2.whatsapp_number = c1.whatsapp_number AND c2.id <> c1.id
  );

-- 6. Drop email column from clients
ALTER TABLE public.clients DROP COLUMN IF EXISTS email;

-- 7. Enforce NOT NULL + UNIQUE on whatsapp_number
ALTER TABLE public.clients ALTER COLUMN whatsapp_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clients_whatsapp_number_key ON public.clients(whatsapp_number);

-- 8. Sequence for auto names
CREATE SEQUENCE IF NOT EXISTS public.clients_auto_name_seq START 1;

-- Seed sequence past existing "Client N" names
DO $$
DECLARE
  max_n INT;
BEGIN
  SELECT COALESCE(MAX((regexp_match(name, '^Client (\d+)$'))[1]::int), 0)
  INTO max_n
  FROM public.clients
  WHERE name ~ '^Client \d+$';
  PERFORM setval('public.clients_auto_name_seq', GREATEST(max_n, 1), max_n > 0);
END $$;

-- 9. Upsert helper
CREATE OR REPLACE FUNCTION public.upsert_client_by_whatsapp(_wa text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
  existing uuid;
  new_id uuid;
  next_n bigint;
BEGIN
  norm := NULLIF(regexp_replace(COALESCE(_wa, ''), '\s+', '', 'g'), '');
  IF norm IS NULL THEN
    RAISE EXCEPTION 'whatsapp_number is required';
  END IF;

  SELECT id INTO existing FROM public.clients WHERE whatsapp_number = norm LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  next_n := nextval('public.clients_auto_name_seq');
  INSERT INTO public.clients (name, whatsapp_number, phone)
  VALUES ('Client ' || next_n, norm, norm)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_client_by_whatsapp(text) TO authenticated, anon, service_role;
