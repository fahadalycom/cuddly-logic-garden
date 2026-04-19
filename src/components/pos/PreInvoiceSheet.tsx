import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, FileText, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { InvoicePreview } from "@/components/conversations/InvoicePreview";
import { PlaceOrderSheet } from "./PlaceOrderSheet";
import type { usePosEngine } from "@/hooks/usePosEngine";

type Engine = ReturnType<typeof usePosEngine>;

export function PreInvoiceSheet({
  open,
  onOpenChange,
  engine,
  onPlaced,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  engine: Engine;
  onPlaced: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);

  // When sheet opens, ensure invoice is saved
  async function ensureInvoice() {
    if (engine.savedInvoice || saving) return;
    setSaving(true);
    try {
      await engine.saveInvoice("draft", {});
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(o: boolean) {
    onOpenChange(o);
    if (o) void ensureInvoice();
  }

  function handleCopy() {
    const msg = engine.generatePricingMessage();
    navigator.clipboard.writeText(msg);
    toast.success("Invoice copied to clipboard");
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-4 py-3 border-b border-border/40 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Pre-Invoice
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {saving && !engine.savedInvoice ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </div>
              ) : engine.savedInvoice ? (
                <InvoicePreview data={engine.savedInvoice} />
              ) : (
                <p className="text-center text-sm text-muted-foreground py-12">No invoice yet.</p>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border/40 p-3 grid grid-cols-3 gap-2 shrink-0 bg-background/95 backdrop-blur">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Back
            </Button>
            <Button variant="outline" onClick={handleCopy} disabled={!engine.savedInvoice} className="gap-1 text-xs">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              onClick={() => setPlaceOpen(true)}
              disabled={!engine.savedInvoice}
              className="gap-1 text-xs"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Place Order
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <PlaceOrderSheet
        open={placeOpen}
        onOpenChange={setPlaceOpen}
        engine={engine}
        onPlaced={() => {
          setPlaceOpen(false);
          onOpenChange(false);
          onPlaced();
        }}
      />
    </>
  );
}
