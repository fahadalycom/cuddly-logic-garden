import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mockMessagesByConv, type MockMessage } from "@/lib/conversations-mock";
import {
  isRealConversationId, realToDbId, mapWaMessage, type WaMessageRow,
} from "@/lib/conversations-data";

const SELECT = "id,conversation_id,sender_type,content,media_type,delivery_status,direction,retry_count,error_message,created_at,idempotency_key";

interface SendResult { ok: boolean; error?: string }

/**
 * Loads messages for a conversation. For real wa_conversations ids (prefixed
 * with "wa:") this fetches from wa_messages and subscribes to realtime
 * INSERT/UPDATE. For legacy mock ids it returns mock messages (read-only).
 */
export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const isReal = !!conversationId && isRealConversationId(conversationId);
  const dbId = isReal && conversationId ? realToDbId(conversationId) : null;
  const idemRef = useRef<Map<string, string>>(new Map()); // optimisticId -> idempotency_key

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    if (!isReal || !dbId) {
      setMessages(mockMessagesByConv[conversationId] || []);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("wa_messages")
        .select(SELECT)
        .eq("conversation_id", dbId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!active) return;
      if (!error && data) setMessages((data as unknown as WaMessageRow[]).map(mapWaMessage));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`conversations:thread:${dbId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "wa_messages", filter: `conversation_id=eq.${dbId}`,
      }, (payload) => {
        const row = payload.new as WaMessageRow;
        const mapped = mapWaMessage(row);
        setMessages((prev) => {
          // Replace optimistic version if idempotency_key matches
          if (row.idempotency_key) {
            const optimisticIdx = prev.findIndex((m) =>
              m.id.startsWith("optim_") && idemRef.current.get(m.id) === row.idempotency_key
            );
            if (optimisticIdx >= 0) {
              const next = [...prev];
              next[optimisticIdx] = mapped;
              return next;
            }
          }
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, mapped];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "wa_messages", filter: `conversation_id=eq.${dbId}`,
      }, (payload) => {
        const row = payload.new as WaMessageRow;
        const mapped = mapWaMessage(row);
        setMessages((prev) => prev.map((m) => (m.id === row.id ? mapped : m)));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, isReal, dbId]);

  const sendMessage = useCallback(async (text: string): Promise<SendResult> => {
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: "Empty" };
    if (!isReal || !dbId) {
      toast.info("Real send only available for connected channels");
      return { ok: false, error: "Channel not connected" };
    }

    const idemKey = crypto.randomUUID();
    const optimisticId = `optim_${idemKey}`;
    idemRef.current.set(optimisticId, idemKey);
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const optimistic: MockMessage = {
      id: optimisticId,
      conversationId: conversationId!,
      sender: "agent",
      senderName: "You",
      text: trimmed,
      time,
      direction: "outbound",
      status: "queued",
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // Look up channel to choose the correct send function
      const { data: convRow } = await supabase
        .from("wa_conversations")
        .select("channel")
        .eq("id", dbId)
        .maybeSingle();
      const ch = convRow?.channel ?? "whatsapp";
      const fn = (ch === "facebook" || ch === "instagram") ? "messenger-send" : "whatsapp-send";

      const { data, error } = await supabase.functions.invoke(fn, {
        body: {
          conversation_id: dbId,
          content: trimmed,
          idempotency_key: idemKey,
        },
      });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      return { ok: true };
    } catch (e: any) {
      // Mark optimistic message as failed
      setMessages((prev) => prev.map((m) =>
        m.id === optimisticId ? { ...m, status: "failed", errorMessage: e?.message || "Send failed" } : m
      ));
      toast.error(e?.message || "Could not send message");
      return { ok: false, error: e?.message };
    }
  }, [isReal, dbId, conversationId]);

  return { messages, loading, sendMessage, isRealtime: isReal };
}
