import { FileText, Phone, Mail, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/template-engine";
import { cn } from "@/lib/utils";

export interface InvoiceLineItem {
  name: string;
  meta?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoicePreviewData {
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  issueDate: string; // ISO or display
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: InvoiceLineItem[];
  subtotal: number;
  discountLabel?: string | null;
  discountAmount: number;
  finalTotal: number;
  notes?: string | null;
  currency?: string;
}

const STATUS_STYLES: Record<InvoicePreviewData["status"], string> = {
  draft: "bg-muted/40 text-muted-foreground border-border/40",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const currency = data.currency ?? "PKR";
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 bg-background/40 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
            <FileText className="h-3 w-3" />
            Invoice
          </div>
          <p className="text-base font-semibold font-mono mt-0.5">{data.invoiceNumber}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] capitalize px-2 py-0.5", STATUS_STYLES[data.status])}>
          {data.status}
        </Badge>
      </div>

      {/* Customer + Date */}
      <div className="px-4 py-3 border-b border-border/40 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Bill To</p>
          <p className="text-sm font-semibold truncate">{data.customerName}</p>
          {data.customerPhone && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <Phone className="h-3 w-3 shrink-0" /> {data.customerPhone}
            </p>
          )}
          {data.customerEmail && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <Mail className="h-3 w-3 shrink-0" /> {data.customerEmail}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Issued</p>
          <p className="text-sm flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(data.issueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium pb-2 border-b border-border/30">
          <div className="col-span-7">Item</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-3 text-right">Total</div>
        </div>
        {data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3 text-center">No items.</p>
        ) : (
          <ul className="divide-y divide-border/30">
            {data.items.map((it, i) => (
              <li key={i} className="grid grid-cols-12 gap-2 py-2 text-xs items-center">
                <div className="col-span-7 min-w-0">
                  <p className="font-medium truncate">{it.name}</p>
                  {it.meta && <p className="text-[10px] text-muted-foreground truncate">{it.meta}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(it.unitPrice)} {currency} each
                  </p>
                </div>
                <div className="col-span-2 text-right text-muted-foreground">×{it.quantity}</div>
                <div className="col-span-3 text-right font-semibold">{formatCurrency(it.lineTotal)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="px-4 py-3 border-t border-border/40 bg-background/30 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(data.subtotal)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div className="flex justify-between text-xs text-emerald-500">
            <span>Discount {data.discountLabel ? `(${data.discountLabel})` : ""}</span>
            <span>-{formatCurrency(data.discountAmount)}</span>
          </div>
        )}
        <div className="h-px bg-border/40 my-1.5" />
        <div className="flex justify-between text-sm font-semibold">
          <span>Final Total</span>
          <span className="text-primary">
            {formatCurrency(data.finalTotal)} {currency}
          </span>
        </div>
      </div>

      {data.notes && (
        <div className="px-4 py-3 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Notes</p>
          <p className="text-xs text-foreground/80 whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
