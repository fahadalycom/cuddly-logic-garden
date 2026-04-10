import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { formatCurrency } from "@/lib/template-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/shared/PageStates";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
      `📋 *Pre-Invoice*`,
      ``,
      `👤 Client: ${clientName}`,
      `📱 Phone: ${clientPhone}`,
      ``,
      `🛒 *Order Details:*`,
      `• Product: ${product?.name}`,
      variant ? `• Plan: ${variant.name}` : null,
      duration ? `• Duration: ${duration.duration_value} ${duration.duration_type}(s)` : null,
      `• Price: ${formatCurrency(unitPrice * multiplier)}`,
      effectiveDiscount > 0 ? `• Discount: -${formatCurrency(effectiveDiscount)}` : null,
      ``,
      `💰 *Total Due: ${formatCurrency(lineTotal)}*`,
      ``,
      `Please confirm to proceed with payment.`,
    ].filter(Boolean).join("\n");
    copy(lines, "Pre-invoice");
  };

  const createOrder = async () => {
    if (!product || !clientName || !clientPhone) {
      toast.error("Please fill all required fields");
      return;
    }

    let { data: client } = await supabase.from("clients").select("id").eq("phone", clientPhone).single();
    if (!client) {
      const { data: newClient, error } = await supabase.from("clients").insert({ name: clientName, phone: clientPhone, whatsapp_number: clientPhone }).select("id").single();
      if (error) { toast.error(error.message); return; }
      client = newClient;
    }

    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      client_id: client!.id,
      created_by: user!.id,
      status: "pending_payment",
      total_amount: lineTotal,
      discount_amount: effectiveDiscount,
      remaining_due: lineTotal,
      notes,
    }).select("id").single();

    if (orderErr) { toast.error(orderErr.message); return; }

    await supabase.from("order_items").insert({
      order_id: order!.id,
      product_id: product.id,
      variant_id: variant?.id || null,
      duration_type: duration?.duration_type || null,
      duration_value: duration?.duration_value || 1,
      unit_price: unitPrice,
      discount: effectiveDiscount,
      line_total: lineTotal,
    });

    await supabase.from("order_status_history").insert({
      order_id: order!.id,
      to_status: "pending_payment",
      changed_by: user!.id,
    });

    toast.success("Order created!");
    generatePreInvoice();
    navigate("/orders");
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Order</h1>

      <Card>
        <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Client Name *</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
          <div><Label>Phone / WhatsApp *</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Product Selection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Product *</Label>
            <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setSelectedVariant(""); setSelectedDuration(""); }}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.base_price))}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {product?.product_variants && product.product_variants.length > 0 && (
            <div>
              <Label>Plan / Variant</Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {product.product_variants.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — {formatCurrency(Number(v.price))}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {product?.product_durations && product.product_durations.length > 0 && (
            <div>
              <Label>Duration</Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent>
                  {product.product_durations.map((d) => <SelectItem key={d.id} value={d.id}>{d.duration_value} {d.duration_type}(s) — ×{Number(d.price_multiplier)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Discount {maxDiscount > 0 && `(max: ${formatCurrency(maxDiscount)})`}</Label>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(unitPrice * multiplier)}</span></div>
          {effectiveDiscount > 0 && <div className="flex justify-between text-destructive"><span>Discount:</span><span>-{formatCurrency(effectiveDiscount)}</span></div>}
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total Due:</span><span>{formatCurrency(lineTotal)}</span></div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={generatePreInvoice} variant="outline" disabled={!product}>Copy Pre-Invoice</Button>
        <Button onClick={createOrder} disabled={!product || !clientName || !clientPhone}>Create Order</Button>
      </div>
    </div>
  );
}
