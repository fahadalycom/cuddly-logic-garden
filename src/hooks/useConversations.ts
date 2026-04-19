import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockConversationsList, type MockConversation } from "@/lib/conversations-mock";
import { mapWaConversation, type WaConversationRow, dbToRealId } from "@/lib/conversations-data";

const SELECT = "id,customer_phone,customer_name,channel,queue,status,priority,assigned_agent_id,previous_agent_id,reassignment_count,auto_summary,last_message_preview,last_message_at,unread_count,client_id";

/**
 * Fetches real wa_conversations and merges them with the legacy mock
 * conversations (used to demo non-WhatsApp channels). Subscribes to realtime
 * INSERT/UPDATE on wa_conversations so the inbox stays live.
 */
export function useConversations() {
  const [realRows, setRealRows] = useState<WaConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("wa_conversations")
        .select(SELECT)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (!active) return;
      if (!error && data) setRealRows(data as unknown as WaConversationRow[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("conversations:list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wa_conversations" }, (payload) => {
        const row = payload.new as WaConversationRow;
        setRealRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wa_conversations" }, (payload) => {
        const row = payload.new as WaConversationRow;
        setRealRows((prev) => {
          const next = prev.map((r) => (r.id === row.id ? row : r));
          if (!prev.some((r) => r.id === row.id)) next.unshift(row);
          return next;
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const conversations = useMemo<MockConversation[]>(() => {
    const real = realRows.map(mapWaConversation);
    const realIds = new Set(realRows.map((r) => dbToRealId(r.id)));
    // Keep mock entries (non-WhatsApp demo) but avoid clashes with real ids.
    const mocks = mockConversationsList.filter((m) => !realIds.has(m.id));
    // Sort: real first (by last_message_at already sorted), then mocks.
    return [...real, ...mocks];
  }, [realRows]);

  return { conversations, loading };
}
