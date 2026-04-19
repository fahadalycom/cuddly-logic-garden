import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Webhook, AlertTriangle, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessageRetry } from "@/hooks/useMessageRetry";
import { cn } from "@/lib/utils";

interface InboundEvent {
  id: string;
  channel: string;
  event_type: string | null;
  external_message_id: string | null;
  processing_status: string | null;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}
interface FailedMessage {
  id: string;
  conversation_id: string;
  channel: string | null;
  content: string | null;
  delivery_status: string | null;
  error_message: string | null;
  retry_count: number | null;
  created_at: string;
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(status: string | null) {
  const s = status || "pending";
  const tone = s === "processed" || s === "success"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : s === "failed"
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : "bg-muted/30 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={cn("text-[10px] capitalize", tone)}>{s}</Badge>;
}

function channelBadge(channel: string | null) {
  return (
    <Badge variant="outline" className="text-[10px] capitalize border-border/40 bg-background/40">
      {channel ?? "unknown"}
    </Badge>
  );
}

function InboundEventsList() {
  const { data, isLoading, refetch } = useQuery<InboundEvent[]>({
    queryKey: ["ops_inbound_events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_inbound_events")
        .select("id,channel,event_type,external_message_id,processing_status,error_message,received_at,processed_at")
        .order("received_at", { ascending: false })
        .limit(50);
      return (data ?? []) as InboundEvent[];
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          Recent webhook events
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="h-[420px]">
        {!data?.length ? (
          <p className="text-xs text-muted-foreground italic p-4">No events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {data.map((e) => (
              <li key={e.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {channelBadge(e.channel)}
                  <span className="text-muted-foreground capitalize">{e.event_type ?? "event"}</span>
                  {statusBadge(e.processing_status)}
                  <span className="text-muted-foreground/70 ml-auto">{fmt(e.received_at)}</span>
                </div>
                {e.external_message_id && (
                  <p className="font-mono text-[10px] text-muted-foreground/80 truncate mt-1">{e.external_message_id}</p>
                )}
                {e.error_message && (
                  <p className="text-rose-400 text-[11px] mt-1">{e.error_message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}

function FailedSendsList() {
  const { retry, retrying } = useMessageRetry();
  const { data, isLoading, refetch } = useQuery<FailedMessage[]>({
    queryKey: ["ops_failed_sends"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_messages")
        .select("id,conversation_id,channel,content,delivery_status,error_message,retry_count,created_at")
        .in("delivery_status", ["failed", "permanently_failed"])
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as FailedMessage[];
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Recent failed sends
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="h-[420px]">
        {!data?.length ? (
          <p className="text-xs text-muted-foreground italic p-4">No failed sends. 🎉</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {data.map((m) => (
              <li key={m.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {channelBadge(m.channel)}
                  {statusBadge(m.delivery_status)}
                  <span className="text-muted-foreground/70">retries: {m.retry_count ?? 0}</span>
                  <span className="text-muted-foreground/70 ml-auto">{fmt(m.created_at)}</span>
                </div>
                {m.content && <p className="text-foreground/85 mt-1 line-clamp-2">{m.content}</p>}
                {m.error_message && (
                  <p className="text-rose-400 text-[11px] mt-1">{m.error_message}</p>
                )}
                <div className="mt-1.5">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-[11px]"
                    disabled={retrying === m.id || m.delivery_status === "permanently_failed"}
                    onClick={async () => { await retry(m.id); refetch(); }}
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1", retrying === m.id && "animate-spin")} />
                    Retry
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}

function RetryHistoryList() {
  const { data, isLoading } = useQuery({
    queryKey: ["ops_retry_history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_send_jobs")
        .select("id,message_id,status,attempt_count,last_error,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Array<{
        id: string; message_id: string; status: string; attempt_count: number; last_error: string | null; updated_at: string;
      }>;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 text-sm font-semibold">
        <History className="h-4 w-4 text-muted-foreground" />
        Retry history
      </div>
      <ScrollArea className="h-[420px]">
        {!data?.length ? (
          <p className="text-xs text-muted-foreground italic p-4">No retry attempts recorded.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {data.map((j) => (
              <li key={j.id} className="px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {statusBadge(j.status)}
                  <span className="text-muted-foreground">attempts: {j.attempt_count}</span>
                  <span className="text-muted-foreground/70 ml-auto">{fmt(j.updated_at)}</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground/80 truncate mt-1">{j.message_id}</p>
                {j.last_error && <p className="text-rose-400 text-[11px] mt-1">{j.last_error}</p>}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}

export function OperationalLogsPanel() {
  return (
    <Tabs defaultValue="webhooks" className="space-y-3">
      <TabsList>
        <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> Webhook events</TabsTrigger>
        <TabsTrigger value="failed" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Failed sends</TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" /> Retry history</TabsTrigger>
      </TabsList>
      <TabsContent value="webhooks"><InboundEventsList /></TabsContent>
      <TabsContent value="failed"><FailedSendsList /></TabsContent>
      <TabsContent value="history"><RetryHistoryList /></TabsContent>
    </Tabs>
  );
}
