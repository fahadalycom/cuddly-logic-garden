import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { usePosEngine } from "@/hooks/usePosEngine";

type Engine = ReturnType<typeof usePosEngine>;

export function PlaceOrderSheet({
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
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePlace() {
    if (submitting) return;
    const wa = phone.trim();
    if (!wa) {
      toast.error("WhatsApp number required");
      return;
    }
    setSubmitting(true);
    try {
      const { data: clientId, error: rpcErr } = await supabase.rpc("upsert_client_by_whatsapp", {
        _wa: wa,
      });
      if (rpcErr || !clientId) throw rpcErr || new Error("Could not resolve client");

      const result = await engine.saveOrder({
        clientId: clientId as string,
        customer: { clientId: clientId as string, phone: wa },
        status: "pending_payment",
        paymentStatus: "unpaid",
        fulfillmentStatus: "not_started",
      });
      if (!result) throw new Error("Order not created");

      toast.success(`Order ${result.orderNumber} placed`);
      setPhone("");
      engine.clearAll();
      onPlaced();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto p-0 rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Place Order
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Client WhatsApp Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 923001234567"
              autoFocus
              className="mt-1.5"
              inputMode="tel"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              New numbers are auto-registered (Client 1, Client 2, …).
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handlePlace} disabled={submitting || !phone.trim()} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing…
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
