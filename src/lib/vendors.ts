import { supabase } from "@/integrations/supabase/client";

export type VendorStatus = "active" | "inactive" | "blacklisted";
export type VendorSourceType = "direct_company" | "reseller" | "marketplace";
export type DealType = "coupon" | "bulk_discount" | "partnership" | "reseller" | "trial_offer";
export type DealStatus = "new" | "contacted" | "in_negotiation" | "agreed" | "rejected" | "expired" | "active" | "negotiation";
export type Priority = "low" | "medium" | "high" | "urgent";
export type OutreachMethod = "email" | "linkedin" | "whatsapp" | "phone" | "other";
export type OutreachStatus = "no_response" | "replied" | "follow_up" | "closed";

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  website: string | null;
  source_type: VendorSourceType;
  status: VendorStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorDeal {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  deal_type: DealType;
  discount_details: string | null;
  coupon_code: string | null;
  starts_at: string | null;
  expires_at: string | null;
  expected_cost: number | null;
  expected_selling_price: number | null;
  estimated_margin: number | null;
  status: DealStatus;
  priority: Priority;
  assigned_to: string | null;
  follow_up_date: string | null;
  related_research_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VendorOutreach {
  id: string;
  deal_id: string;
  vendor_id: string | null;
  contact_date: string;
  method: OutreachMethod;
  message_summary: string | null;
  response_summary: string | null;
  next_follow_up_date: string | null;
  status: OutreachStatus;
  logged_by: string | null;
  created_at: string;
}

export const VENDOR_STATUSES: { value: VendorStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blacklisted", label: "Blacklisted" },
];

export const VENDOR_SOURCES: { value: VendorSourceType; label: string }[] = [
  { value: "direct_company", label: "Direct Company" },
  { value: "reseller", label: "Reseller" },
  { value: "marketplace", label: "Marketplace" },
];

export const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: "coupon", label: "Coupon" },
  { value: "bulk_discount", label: "Bulk Discount" },
  { value: "partnership", label: "Partnership" },
  { value: "reseller", label: "Reseller" },
  { value: "trial_offer", label: "Trial Offer" },
];

export const DEAL_STATUSES: { value: DealStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_negotiation", label: "In Negotiation" },
  { value: "agreed", label: "Agreed" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const OUTREACH_METHODS: { value: OutreachMethod; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" },
];

export const OUTREACH_STATUSES: { value: OutreachStatus; label: string }[] = [
  { value: "no_response", label: "No Response" },
  { value: "replied", label: "Replied" },
  { value: "follow_up", label: "Follow Up" },
  { value: "closed", label: "Closed" },
];

export const VENDOR_STATUS_STYLE: Record<VendorStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-muted/50 text-muted-foreground border-border/30",
  blacklisted: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const DEAL_STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  in_negotiation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  negotiation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  agreed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  expired: "bg-muted/50 text-muted-foreground border-border/30",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-muted/50 text-muted-foreground border-border/30",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const OUTREACH_STATUS_STYLE: Record<OutreachStatus, string> = {
  no_response: "bg-muted/50 text-muted-foreground border-border/30",
  replied: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  follow_up: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  closed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function labelFor<T extends string>(opts: { value: T; label: string }[], v: T): string {
  return opts.find((o) => o.value === v)?.label ?? v;
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

export function isDueToday(date: string | null): boolean {
  if (!date) return false;
  return new Date(date).toDateString() === new Date().toDateString();
}

const sb = supabase as any;

// Vendors
export async function listVendors(): Promise<Vendor[]> {
  const { data, error } = await sb.from("vendors").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Vendor[];
}

export async function upsertVendor(payload: Partial<Vendor> & { name: string }): Promise<Vendor> {
  if (payload.id) {
    const { data, error } = await sb.from("vendors").update(payload).eq("id", payload.id).select("*").maybeSingle();
    if (error) throw error;
    return data as Vendor;
  }
  const { data, error } = await sb.from("vendors").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data as Vendor;
}

// Deals
export async function listDeals(): Promise<VendorDeal[]> {
  const { data, error } = await sb.from("vendor_deals").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VendorDeal[];
}

export async function upsertDeal(payload: Partial<VendorDeal> & { vendor_id: string; title: string; created_by: string }): Promise<VendorDeal> {
  // Auto-calc margin if not provided
  if (payload.expected_cost != null && payload.expected_selling_price != null && payload.estimated_margin == null) {
    payload.estimated_margin = Number(payload.expected_selling_price) - Number(payload.expected_cost);
  }
  if (payload.id) {
    const { data, error } = await sb.from("vendor_deals").update(payload).eq("id", payload.id).select("*").maybeSingle();
    if (error) throw error;
    return data as VendorDeal;
  }
  const { data, error } = await sb.from("vendor_deals").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data as VendorDeal;
}

// Outreach
export async function listOutreachForDeal(dealId: string): Promise<VendorOutreach[]> {
  const { data, error } = await sb.from("vendor_outreach").select("*").eq("deal_id", dealId).order("contact_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VendorOutreach[];
}

export async function createOutreach(payload: Partial<VendorOutreach> & { deal_id: string }): Promise<VendorOutreach> {
  const { data, error } = await sb.from("vendor_outreach").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data as VendorOutreach;
}

export async function listStaff(): Promise<{ user_id: string; full_name: string }[]> {
  const { data } = await sb.from("staff_profiles").select("user_id, full_name").eq("is_active", true).order("full_name");
  return (data ?? []) as { user_id: string; full_name: string }[];
}

export async function listResearchOptions(): Promise<{ id: string; tool_name: string }[]> {
  const { data } = await sb.from("research_records").select("id, tool_name").order("updated_at", { ascending: false }).limit(100);
  return (data ?? []) as { id: string; tool_name: string }[];
}
