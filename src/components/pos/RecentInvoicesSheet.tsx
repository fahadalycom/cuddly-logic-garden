import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/template-engine";
import { cn } from "@/lib/utils";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  final_total: number;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
}

export function RecentInvoicesSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (invoiceId: string) => void;
}) {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("invoices")
      .select("id, invoice_number, status, final_total, customer_name, customer_phone, created_at")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setRows((data as any) || []);
    setLoading(false);
  }

  const STATUS_COLOR: Record<string, string> = {
    draft: "bg-muted/40 text-muted-foreground",
    sent: "bg-blue-500/10 text-blue-400",
    paid: "bg-emerald-500/10 text-emerald-400",
    cancelled: "bg-rose-500/10 text-rose-400",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border/40 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Recent Invoices
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No invoices yet.</p>
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onPick(r.id)}
                  className="w-full text-left rounded-xl border border-border/40 hover:border-primary/40 bg-card/40 hover:bg-card/60 transition p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold truncate">{r.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.customer_name || r.customer_phone || "No customer"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(Number(r.final_total))}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] capitalize px-1.5 py-0 mt-0.5",
                          STATUS_COLOR[r.status] || STATUS_COLOR.draft,
                        )}
                      >
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
