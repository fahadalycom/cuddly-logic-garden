import type { Tables, Enums } from "@/integrations/supabase/types";

export type ProductType = Enums<"product_type">;
export type Plan = Tables<"plans">;
export type ProductBundle = Tables<"product_bundles">;
export type BundleItem = Tables<"bundle_items">;

// Extended product type including new template + type fields
export interface ProductFull {
  id: string;
  name: string;
  category: string | null;
  product_type: ProductType;
  base_price: number;
  description: string | null;
  short_description: string | null;
  features: string[];
  usage_instructions: string | null;
  support_notes: string | null;
  faq_content: string | null;
  is_active: boolean;
  sort_order: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithPlans extends ProductFull {
  plans: Plan[];
}

export interface BundleWithItems extends ProductBundle {
  bundle_items: (BundleItem & { product: { id: string; name: string; base_price: number } | null })[];
}

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  shared: "Shared",
  private: "Private",
  invite_based: "Invite-based",
  custom: "Custom",
};

export const PRODUCT_TYPE_COLOR: Record<ProductType, string> = {
  shared: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  private: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  invite_based: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  custom: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};
