-- 1. Product type enum
CREATE TYPE public.product_type AS ENUM ('shared', 'private', 'invite_based', 'custom');

-- 2. Add product_type + template columns to products
ALTER TABLE public.products
  ADD COLUMN product_type public.product_type NOT NULL DEFAULT 'private',
  ADD COLUMN short_description text,
  ADD COLUMN features text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN usage_instructions text,
  ADD COLUMN support_notes text;

-- 3. Bundles
CREATE TABLE public.product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  bundle_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, product_id, plan_id)
);

CREATE INDEX idx_bundle_items_bundle ON public.bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_product ON public.bundle_items(product_id);
CREATE INDEX idx_products_type ON public.products(product_type);
CREATE INDEX idx_plans_product ON public.plans(product_id);

-- 4. RLS
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view bundles" ON public.product_bundles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert bundles" ON public.product_bundles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update bundles" ON public.product_bundles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete bundles" ON public.product_bundles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view bundle items" ON public.bundle_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin can insert bundle items" ON public.bundle_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update bundle items" ON public.bundle_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete bundle items" ON public.bundle_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. updated_at trigger for bundles
CREATE TRIGGER update_product_bundles_updated_at
  BEFORE UPDATE ON public.product_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
