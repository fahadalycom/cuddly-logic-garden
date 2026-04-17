import { useEffect, useState } from "react";
import { X, Phone, Mail, Package, RefreshCw, CreditCard, Ticket, StickyNote, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/template-engine";
import { cn } from "@/lib/utils";
import type { MockConversation } from "@/lib/conversations-mock";

interface Props {
  conversation: MockConversation | null;
  onClose?: () => void;
}

interface LatestInvoice {
  id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  final_total: number;
  currency: string;
  created_at: string;
}

const INVOICE_STATUS_STYLE: Record<LatestInvoice["status"], string> = {
  draft: "bg-muted/40 text-muted-foreground border-border/40",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function ConversationContextPanel({ conversation, onClose }: Props) {
  const [latestInvoice, setLatestInvoice] = useState<LatestInvoice | null>(null);

  useEffect(() => {
    if (!conversation?.id) { setLatestInvoice(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("invoices")
        .select("id, invoice_number, status, final_total, currency, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setLatestInvoice((data as LatestInvoice) ?? null);
    })();
    return () => { cancelled = true; };
  }, [conversation?.id]);

  if (!conversation) return null;
  const ctx = conversation.context;

  return (
    <aside className="h-full bg-card/30 border-l border-border/40 flex flex-col">
      <div className="p-3 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Customer Context</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Customer */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center text-sm font-semibold">
                {ctx.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{ctx.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{ctx.status}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <Row icon={Phone} text={ctx.phone} />
              {ctx.email && <Row icon={Mail} text={ctx.email} />}
            </div>
            {ctx.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {ctx.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] border-border/40 bg-background/40">{t}</Badge>
                ))}
              </div>
            )}
          </section>

          {/* Recent orders */}
          <Section title="Recent Orders" icon={Package} count={ctx.recentOrders.length}>
            {ctx.recentOrders.length === 0 ? (
              <Empty text="No orders yet" />
            ) : (
              <ul className="space-y-1.5">
                {ctx.recentOrders.map((o) => (
                  <li key={o.id} className="rounded-md border border-border/30 bg-background/30 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground">{o.id}</span>
                      <span className="text-[11px] text-muted-foreground">{o.date}</span>
                    </div>
                    <p className="text-xs text-foreground mt-0.5 truncate">{o.product}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground capitalize">{o.status.replace(/_/g, " ")}</span>
                      <span className="text-xs font-semibold">PKR {o.amount.toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Subscriptions */}
          <Section title="Active Subscriptions" icon={RefreshCw} count={ctx.subscriptions.length}>
            {ctx.subscriptions.length === 0 ? (
              <Empty text="No active subscriptions" />
            ) : (
              <ul className="space-y-1.5">
                {ctx.subscriptions.map((s) => (
                  <li key={s.id} className="rounded-md border border-border/30 bg-background/30 p-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{s.product}</p>
                      <p className="text-[10px] text-muted-foreground">Expires {s.expires}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Payment status */}
          <Section title="Payment" icon={CreditCard}>
            <div className="rounded-md border border-border/30 bg-background/30 p-2 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={`text-[10px] capitalize ${
                  ctx.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : ctx.paymentStatus === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {ctx.paymentStatus}
              </Badge>
            </div>
          </Section>

          {/* Open tickets */}
          <Section title="Open Tickets" icon={Ticket} count={ctx.openTickets.length}>
            {ctx.openTickets.length === 0 ? (
              <Empty text="No open tickets" />
            ) : (
              <ul className="space-y-1.5">
                {ctx.openTickets.map((t) => (
                  <li key={t.id} className="rounded-md border border-border/30 bg-background/30 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground">{t.id}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                    </div>
                    <p className="text-xs text-foreground mt-0.5">{t.subject}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Internal notes placeholder */}
          <Section title="Internal Notes" icon={StickyNote}>
            <p className="text-[11px] text-muted-foreground italic">Use the Notes tab in the conversation to add internal notes.</p>
          </Section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Row({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-foreground/90">{text}</span>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: any; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {typeof count === "number" && (
          <span className="text-[10px] text-muted-foreground/70">({count})</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[11px] text-muted-foreground italic px-1">{text}</p>;
}
