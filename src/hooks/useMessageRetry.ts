import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Wraps the whatsapp-retry-message edge function with in-flight tracking + toasts. */
export function useMessageRetry() {
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const retry = useCallback(async (messageId: string) => {
    if (retryingIds.has(messageId)) return;
    setRetryingIds((prev) => new Set(prev).add(messageId));
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-retry-message", {
        body: { message_id: messageId },
      });
      if (error) throw error;
      if (data && (data as any).success === false) {
        toast.error((data as any).error || "Retry failed");
      } else {
        toast.success("Message retry started");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not retry message");
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, [retryingIds]);

  return { retry, isRetrying: (id: string) => retryingIds.has(id) };
}
