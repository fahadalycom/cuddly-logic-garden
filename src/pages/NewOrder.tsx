import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { formatCurrency } from "@/lib/template-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/shared/PageStates";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, User, Package, Receipt, Copy, ArrowRight, Loader2 } from "lucide-react";
import type { Product, ProductVariant, ProductDuration } from "@/types/database";

export default function NewOrderPage() {
  const [products, setProducts] = useState<(Product & { product_variants: ProductVariant[]; product_durations: ProductDuration[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const { user } = useAuth();
  const { copy } = useClipboard();
  const navigate = useNavigate();
  const { submitting, run } = useSubmitGuard();

  useEffect(() => {
    supabase.from("products").select("*, product_variants(*), product_durations(*)").eq("is_active", true).then(({ data }) => {
      setProducts((data as any) || []);
      setLoading(false);
    });
  }, []);

  const product = products.find((p) => p.id === selectedProduct);
  const variant = product?.product_variants?.find((v) => v.id === selectedVariant);
  const duration = product?.product_durations?.find((d) => d.id === selectedDuration);

  const unitPrice = variant ? Number(variant.price) : product ? Number(product.base_price) : 0;
  const multiplier = duration ? Number(duration.price_multiplier) : 1;
  const maxDiscountPercent = variant ? Number(variant.max_discount_percent) : 0;
  const maxDiscountFixed = variant ? Number(variant.max_discount_fixed) : 0;
  const maxDiscount = Math.max(unitPrice * maxDiscountPercent / 100, maxDiscountFixed);
  const effectiveDiscount = Math.min(discount, maxDiscount || discount);
  const lineTotal = (unitPrice * multiplier) - effectiveDiscount;

  const generatePreInvoice = () => {
    const lines = [
      `📋 *Pre-Invoice*`, ``, `👤 Client: ${clientName}`, `📱 Phone: ${clientPhone}`, ``, `🛒 *Order Details:*`,
      `• Product: ${product?.name}`,
      variant ? `• Plan: ${variant.name}` : null,
      duration ? `• Duration: ${duration.duration_value} ${duration.duration_type}(s)` : null,
      `• Price: ${formatCurrency(unitPrice * multiplier)}`,
      effectiveDiscount > 0 ? `• Discount: -${formatCurrency(effectiveDiscount)}` : null,
      ``, `💰 *Total Due: ${formatCurrency(lineTotal)}*`, ``, `Please confirm to proceed with payment.`,
    ].filter(Boolean).join("\n");
    copy(lines, "Pre-invoice");
  };

  const createOrder = () => run(async () => {
    if (!product || !clientName.trim() || !clientPhone.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (lineTotal < 0) {
      toast.error("Discount cannot exceed price");
      return;
    }
    // Use maybeSingle to avoid throwing when phone doesn't exist yet
    const { data: existing, error: lookupErr } = await supabase
      .from("clients").select("id").eq("phone", clientPhone.trim()).maybeSingle();
    if (lookupErr) { toast.error(lookupErr.message); return; }

    let clientId = existing?.id;
    if (!clientId) {
      const { data: newClient, error } = await supabase.from("clients").insert({
        name: clientName.trim(), phone: clientPhone.trim(), whatsapp_number: clientPhone.trim(),
      }).select("id").single();
      if (error) { toast.error(error.message); return; }
      clientId = newClient.id;
    }

    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      client_id: clientId,
      created_by: user!.id,
      status: "pending_payment",
      total_amount: lineTotal,
      discount_amount: effectiveDiscount,
      remaining_due: lineTotal,
      notes: notes.trim() || null,
    }).select("id").single();
    if (orderErr) { toast.error(orderErr.message); return; }

    const { error: itemErr } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      variant_id: variant?.id || null,
      duration_type: duration?.duration_type || null,
      duration_value: duration?.duration_value || 1,
      unit_price: unitPrice,
      discount: effectiveDiscount,
      line_total: lineTotal,
    });
    if (itemErr) {
      toast.error(`Order created but item failed: ${itemErr.message}`);
      return;
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id, to_status: "pending_payment", changed_by: user!.id,
    });
    toast.success("Order created!");
    generatePreInvoice();
    navigate("/orders");
  });

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" />New Order</h1>
        <p className="page-subtitle">Create a new order and generate pre-invoice</p>
      </div>

      {/* Client Info */}
      <div className="premium-card !p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Client Information</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Client Name *</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone / WhatsApp *</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="premium-card !p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Product Selection</h3>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Product *</Label>
          <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setSelectedVariant(""); setSelectedDuration(""); }}>
            <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent className="glass-strong rounded-xl border-border/30">
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.base_price))}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {product?.product_variants && product.product_variants.length > 0 && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plan / Variant</Label>
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent className="glass-strong rounded-xl border-border/30">
                {product.product_variants.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — {formatCurrency(Number(v.price))}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {product?.product_durations && product.product_durations.length > 0 && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duration</Label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent className="glass-strong rounded-xl border-border/30">
                {product.product_durations.map((d) => <SelectItem key={d.id} value={d.id}>{d.duration_value} {d.duration_type}(s) — ×{Number(d.price_multiplier)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discount {maxDiscount > 0 && `(max: ${formatCurrency(maxDiscount)})`}</Label>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
        </div>
      </div>

      {/* Summary */}
      <div className="premium-card !p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Order Summary</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="mono font-medium text-foreground">{formatCurrency(unitPrice * multiplier)}</span></div>
          {effectiveDiscount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="mono font-medium text-red-400">-{formatCurrency(effectiveDiscount)}</span></div>}
          <div className="flex justify-between font-bold text-lg border-t border-border/20 pt-3 mt-3">
            <span>Total Due</span>
            <span className="mono text-gradient">{formatCurrency(lineTotal)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={generatePreInvoice} variant="outline" disabled={!product} className="flex-1 rounded-xl border-border/20 bg-card/40 hover:bg-card/60 h-11">
          <Copy className="h-4 w-4 mr-2" /> Copy Pre-Invoice
        </Button>
        <Button
          onClick={createOrder}
          disabled={!product || !clientName.trim() || !clientPhone.trim() || submitting}
          className="flex-1 rounded-xl gradient-primary text-white border-0 h-11 shadow-lg shadow-primary/20"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
          ) : (
            <>Create Order <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
