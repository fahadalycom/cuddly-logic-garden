// Smart routing helpers — wrap the Supabase RPCs added by the
// auto-assignment migration so the UI can trigger or override routing.
import { supabase } from "@/integrations/supabase/client";

export interface RoutingResult {
  ok: boolean;
  placement?: "active" | "agent_queue" | "overflow" | "already_assigned";
  agent_id?: string;
  assignment_type?: "auto" | "manual" | "sticky" | "overflow";
  error?: string;
}

/** Trigger smart auto-assignment for a conversation (role + load + sticky aware). */
export async function autoAssignConversation(conversationId: string): Promise<RoutingResult> {
  const { data, error } = await (supabase.rpc as any)("auto_assign_conversation", {
    _conversation_id: conversationId,
  });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false }) as RoutingResult;
}

/** Manual override (admin/ops). Bypasses load checks when force = true. */
export async function manualAssignConversation(
  conversationId: string,
  agentId: string,
  force = true,
): Promise<RoutingResult> {
  const { data, error } = await (supabase.rpc as any)("manual_assign_conversation", {
    _conversation_id: conversationId,
    _agent_id: agentId,
    _force: force,
  });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false }) as RoutingResult;
}

/** Fetch recent assignment history for a conversation (newest first). */
export async function getAssignmentHistory(conversationId: string, limit = 10) {
  const { data, error } = await (supabase as any)
    .from("wa_assignment_log")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}
