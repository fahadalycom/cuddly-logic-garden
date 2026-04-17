// Handoff helpers — wrap the handoff_conversation RPC and log queries.
import { supabase } from "@/integrations/supabase/client";

export type HandoffQueue = "sales" | "support" | "payments" | "fulfillment" | "renewals";

export const QUEUE_LABEL: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  payments: "Payments",
  payment: "Payments",
  fulfillment: "Fulfillment",
  renewals: "Renewals",
  renewal: "Renewals",
  general: "General",
  overflow: "Overflow",
};

export const QUEUE_COLOR: Record<string, string> = {
  sales: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  support: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  payments: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  payment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  fulfillment: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  renewals: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  renewal: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  general: "bg-muted/30 text-muted-foreground border-border/30",
  overflow: "bg-destructive/10 text-destructive border-destructive/20",
};

export interface HandoffResult {
  ok: boolean;
  from_queue?: string;
  to_queue?: string;
  placement?: string;
  agent_id?: string | null;
  error?: string;
}

export interface HandoffLogEntry {
  id: string;
  conversation_id: string;
  from_queue: string | null;
  to_queue: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  transferred_by: string | null;
  note: string | null;
  reason: string | null;
  created_at: string;
}

export async function handoffConversation(
  conversationId: string,
  toQueue: HandoffQueue,
  note?: string,
  setStatus: "waiting_internal" | "active" = "waiting_internal",
): Promise<HandoffResult> {
  const { data, error } = await (supabase.rpc as any)("handoff_conversation", {
    _conversation_id: conversationId,
    _to_queue: toQueue,
    _note: note ?? null,
    _set_status: setStatus,
  });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false }) as HandoffResult;
}

export async function getHandoffHistory(
  conversationId: string,
  limit = 10,
): Promise<HandoffLogEntry[]> {
  const { data, error } = await (supabase as any)
    .from("wa_handoff_log")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as HandoffLogEntry[];
}

/** Suggest a department based on a trigger context. */
export function suggestQueue(trigger: "ticket" | "payment" | "fulfillment" | "renewal"): HandoffQueue {
  switch (trigger) {
    case "ticket": return "support";
    case "payment": return "payments";
    case "fulfillment": return "fulfillment";
    case "renewal": return "renewals";
  }
}
