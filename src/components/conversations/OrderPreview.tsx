import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/template-engine";

export type OrderStatusVal =
  | "draft" | "pending_payment" | "confirmed" | "in_progress" | "completed" | "cancelled"
  | "paid_unverified" | "paid_verified" | "to_deliver" | "delivered";
export type PaymentStatusVal = "unpaid" | "pending_verification" | "paid" | "rejected";
export type FulfillmentStatusVal = "not_started" | "ready" | "in_progress" | "delivered" | "failed";

export interface OrderPreviewItem {
  name: string;
  meta?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderPreviewData {
  orderNumber: string;
  status: OrderStatusVal;
  paymentStatus: PaymentStatusVal;
  fulfillmentStatus: FulfillmentStatusVal;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  conversationLabel?: string | null;
  invoiceNumber?: string | null;
  items: OrderPreviewItem[];
  subtotal: number;
  discountLabel?: string | null;
  discountAmount: number;
  finalTotal: number;
  notes?: string | null;
  currency?: string;
  createdAt: string;
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted/40 text-muted-foreground border-border/40",
  pending_payment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};
const PAYMENT_STYLE: Record<PaymentStatusVal, string> = {
  unpaid: "bg-muted/40 text-muted-foreground border-border/40",
  pending_verification: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};
const FULFILL_STYLE: Record<FulfillmentStatusVal, string> = {
  not_started: "bg-muted/40 text-muted-foreground border-border/40",
  ready: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function OrderPreview({ data }: { data: OrderPreviewData }) {
  const cur = data.currency ?? "PKR";
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 overflow-hidden">
      <div className="p-3 border-b border-border/40 bg-background/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order</p>
            <p className="text-sm font-mono font-semibold">{data.orderNumber}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn("text-[10px] capitalize", ORDER_STATUS_STYLE[data.status] ?? ORDER_STATUS_STYLE.draft)}>
              {data.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="outline" className={cn("text-[9px] capitalize", PAYMENT_STYLE[data.paymentStatus])}>
            Payment: {data.paymentStatus.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] capitalize", FULFILL_STYLE[data.fulfillmentStatus])}>
            Fulfillment: {data.fulfillmentStatus.replace(/_/g, " ")}
          </Badge>
          {data.invoiceNumber && (
            <Badge variant="outline" className="text-[9px] font-mono">{data.invoiceNumber}</Badge>
          )}
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2 text-[11px] border-b border-border/40">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Customer</p>
          <p className="font-medium truncate">{data.customerName}</p>
          {data.customerPhone && <p className="text-muted-foreground truncate">{data.customerPhone}</p>}
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Created</p>
          <p className="font-medium">{new Date(data.createdAt).toLocaleDateString()}</p>
          {data.conversationLabel && <p className="text-muted-foreground truncate">{data.conversationLabel}</p>}
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        {data.items.map((it, i) => (
          <div key={i} className="flex items-start justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="font-medium truncate">
                {it.name}
                {it.quantity > 1 && <span className="text-muted-foreground"> ×{it.quantity}</span>}
              </p>
              {it.meta && <p className="text-[10px] text-muted-foreground">{it.meta}</p>}
            </div>
            <p className="font-mono whitespace-nowrap">{formatCurrency(it.lineTotal)}</p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border/40 space-y-1 bg-background/30">
        <Row label="Subtotal" value={`${formatCurrency(data.subtotal)} ${cur}`} />
        {data.discountAmount > 0 && (
          <Row
            label={`Discount${data.discountLabel ? ` (${data.discountLabel})` : ""}`}
            value={`-${formatCurrency(data.discountAmount)} ${cur}`}
            accent="text-emerald-400"
          />
        )}
        <div className="h-px bg-border/40 my-1" />
        <Row label="Total" value={`${formatCurrency(data.finalTotal)} ${cur}`} bold />
      </div>

      {data.notes && (
        <div className="p-3 border-t border-border/40 text-[11px] text-muted-foreground">
          <p className="text-[9px] uppercase tracking-wider mb-0.5">Internal Notes</p>
          <p className="text-foreground/90 whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between text-[11px]", accent)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono", bold && "font-semibold text-sm text-primary")}>{value}</span>
    </div>
  );
}
