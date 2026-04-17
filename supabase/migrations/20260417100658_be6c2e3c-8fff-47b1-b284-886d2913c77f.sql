-- Sequence + numbering for orders
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

-- Add new columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS conversation_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC NOT NULL DEFAULT 0;

-- Payment status enum
DO $$ BEGIN
  CREATE TYPE public.order_payment_status AS ENUM ('unpaid','pending_verification','paid','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fulfillment status enum
DO $$ BEGIN
  CREATE TYPE public.order_fulfillment_status AS ENUM ('not_started','ready','in_progress','delivered','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.order_payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS fulfillment_status public.order_fulfillment_status NOT NULL DEFAULT 'not_started';

-- Add missing values to existing order_status enum (idempotent)
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'confirmed';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'in_progress';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION WHEN others THEN NULL; END $$;

-- Order items: snapshot fields + plan link
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS plan_id UUID,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Auto-number trigger
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || LPAD(nextval('public.order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill order numbers for existing rows
UPDATE public.orders
SET order_number = 'ORD-' || LPAD(nextval('public.order_number_seq')::text, 4, '0')
WHERE order_number IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_conversation ON public.orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON public.orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);