import { useEffect, useState } from "react";
import { X, Phone, Package, RefreshCw, CreditCard, Ticket, StickyNote, FileText, ShoppingCart, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/template-engine";
import { cn } from "@/lib/utils";
import { TicketDialog } from "@/components/support/TicketDialog";
import {
  STATUS_STYLE as TICKET_STATUS_STYLE, PRIORITY_STYLE as TICKET_PRIORITY_STYLE,
  TICKET_STATUSES, labelFor,
  type TicketStatus, type TicketPriority,
} from "@/lib/support-tickets";
import { getHandoffHistory, QUEUE_LABEL, QUEUE_COLOR, type HandoffLogEntry } from "@/lib/handoff";
import { RelatedTasks } from "@/components/tasks/RelatedTasks";
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

interface LatestOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: "unpaid" | "pending_verification" | "paid" | "rejected";
  fulfillment_status: "not_started" | "ready" | "in_progress" | "delivered" | "failed";
  total_amount: number;
  created_at: string;
}

const INVOICE_STATUS_STYLE: Record<LatestInvoice["status"], string> = {
  draft: "bg-muted/40 text-muted-foreground border-border/40",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted/40 text-muted-foreground border-border/40",
  pending_payment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

interface OpenTicket {
  id: string;
  ticket_number: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  summary: string | null;
}

export function ConversationContextPanel({ conversation, onClose }: Props) {
  const [latestInvoice, setLatestInvoice] = useState<LatestInvoice | null>(null);
  const [latestOrder, setLatestOrder] = useState<LatestOrder | null>(null);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [handoffHistory, setHandoffHistory] = useState<HandoffLogEntry[]>([]);

  const loadAll = async (convId: string) => {
    const [invRes, ordRes, tixRes, hoRes] = await Promise.all([
      (supabase as any).from("invoices")
        .select("id, invoice_number, status, final_total, currency, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      (supabase as any).from("orders")
        .select("id, order_number, status, payment_status, fulfillment_status, total_amount, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      (supabase as any).from("support_issues")
        .select("id, ticket_number, status, priority, summary")
        .eq("conversation_id", convId)
        .neq("status", "closed")
        .order("created_at", { ascending: false }).limit(5),
      getHandoffHistory(convId, 5),
    ]);
    setLatestInvoice((invRes.data as LatestInvoice) ?? null);
    setLatestOrder((ordRes.data as LatestOrder) ?? null);
    setOpenTickets((tixRes.data as OpenTicket[]) ?? []);
    setHandoffHistory(hoRes ?? []);
  };

  useEffect(() => {
    if (!conversation?.id) {
      setLatestInvoice(null); setLatestOrder(null); setOpenTickets([]); setHandoffHistory([]);
      return;
    }
    loadAll(conversation.id);
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
              {(conversation as any).externalUserId && (
                <p className="text-[10px] text-muted-foreground/70 font-mono pl-5 truncate">
                  {conversation.channel}: {(conversation as any).externalUserId}
                </p>
              )}
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
          {/* Latest invoice */}
          <Section title="Latest Invoice" icon={FileText}>
            {!latestInvoice ? (
              <Empty text="No invoices yet" />
            ) : (
              <div className="rounded-md border border-border/30 bg-background/30 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono">{latestInvoice.invoice_number}</span>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", INVOICE_STATUS_STYLE[latestInvoice.status])}>
                    {latestInvoice.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(latestInvoice.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-semibold">
                    {formatCurrency(Number(latestInvoice.final_total))} {latestInvoice.currency}
                  </span>
                </div>
              </div>
            )}
          </Section>

          {/* Latest order */}
          <Section title="Latest Order" icon={ShoppingCart}>
            {!latestOrder ? (
              <Empty text="No orders yet" />
            ) : (
              <div className="rounded-md border border-border/30 bg-background/30 p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold">{latestOrder.order_number}</span>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", ORDER_STATUS_STYLE[latestOrder.status] ?? ORDER_STATUS_STYLE.draft)}>
                    {latestOrder.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[9px] capitalize border-border/40">
                    Pay: {latestOrder.payment_status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] capitalize border-border/40">
                    Fulfill: {latestOrder.fulfillment_status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(latestOrder.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-semibold">
                    {formatCurrency(Number(latestOrder.total_amount))} PKR
                  </span>
                </div>
              </div>
            )}
          </Section>

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

          {/* Open tickets (real) */}
          <Section title="Open Tickets" icon={Ticket} count={openTickets.length}>
            {openTickets.length === 0 ? (
              <Empty text="No open tickets" />
            ) : (
              <ul className="space-y-1.5">
                {openTickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-border/30 bg-background/30 p-2 cursor-pointer hover:bg-background/50 transition-colors"
                    onClick={() => setActiveTicketId(t.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">{t.ticket_number ?? t.id.slice(0, 8)}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className={cn("text-[9px] capitalize", TICKET_PRIORITY_STYLE[t.priority])}>{t.priority}</Badge>
                        <Badge variant="outline" className={cn("text-[9px] capitalize", TICKET_STATUS_STYLE[t.status])}>
                          {labelFor(TICKET_STATUSES, t.status)}
                        </Badge>
                      </div>
                    </div>
                    {t.summary && <p className="text-xs text-foreground mt-0.5 truncate">{t.summary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Handoff history */}
          <Section title="Transfer History" icon={ArrowRightLeft} count={handoffHistory.length}>
            {handoffHistory.length === 0 ? (
              <Empty text="No transfers yet" />
            ) : (
              <ul className="space-y-1.5">
                {handoffHistory.map((h) => (
                  <li key={h.id} className="rounded-md border border-border/30 bg-background/30 p-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className={cn("text-[9px] uppercase", QUEUE_COLOR[h.from_queue ?? "general"])}>
                        {QUEUE_LABEL[h.from_queue ?? "general"] ?? h.from_queue ?? "—"}
                      </Badge>
                      <ArrowRightLeft className="h-2.5 w-2.5 text-muted-foreground" />
                      <Badge variant="outline" className={cn("text-[9px] uppercase", QUEUE_COLOR[h.to_queue])}>
                        {QUEUE_LABEL[h.to_queue] ?? h.to_queue}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(h.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {h.note && <p className="text-xs text-foreground/90 mt-1">{h.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Related tasks */}
          {conversation?.id && (
            <RelatedTasks relatedType="conversation" relatedId={conversation.id} defaultDepartment="sales" compact />
          )}

          {/* Internal notes placeholder */}
          <Section title="Internal Notes" icon={StickyNote}>
            <p className="text-[11px] text-muted-foreground italic">Use the Notes tab in the conversation to add internal notes.</p>
          </Section>
        </div>
      </ScrollArea>

      <TicketDialog
        open={!!activeTicketId}
        onOpenChange={(o) => { if (!o) setActiveTicketId(null); }}
        ticketId={activeTicketId}
        onSaved={() => conversation?.id && loadAll(conversation.id)}
      />
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
