import { useEffect, useMemo, useState } from "react";
import { Search, Package, Layers, Sparkles, Trash2, Pencil, Send, Calculator, Minus, Plus, ArrowLeft, FileText, Copy, CheckCheck, CheckCircle2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PRODUCT_TYPE_COLOR, PRODUCT_TYPE_LABEL, type ProductFull, type Plan, type BundleWithItems } from "@/types/products";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/template-engine";
import { InvoicePreview, type InvoicePreviewData } from "./InvoicePreview";
import { OrderPreview, type OrderPreviewData, type OrderStatusVal, type PaymentStatusVal, type FulfillmentStatusVal } from "./OrderPreview";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (text: string) => void;
  conversationId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  clientId?: string | null;
}

type ProductWithPlans = ProductFull & { plans: Plan[] };

interface SelectedProduct {
  productId: string;
  planId: string | null;
  quantity: number;
  priceOverride?: number | null;
}

type Step = "select" | "pricing" | "preview" | "invoice" | "order";
type DiscountMode = "none" | "fixed" | "percent";

export function ProductSelectorPanel({
  open,
  onOpenChange,
  onInsert,
  conversationId = null,
  customerName = null,
  customerPhone = null,
  customerEmail = null,
  clientId = null,
}: Props) {
  const [products, setProducts] = useState<ProductWithPlans[]>([]);
  const [bundles, setBundles] = useState<BundleWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tab, setTab] = useState<"products" | "bundles">("products");
  const [selected, setSelected] = useState<Record<string, SelectedProduct>>({});
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [bundlePriceOverride, setBundlePriceOverride] = useState<Record<string, number>>({});
  const [bundleQty, setBundleQty] = useState<Record<string, number>>({});
  const [generated, setGenerated] = useState("");
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<Step>("select");

  // Discount
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Invoice
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<InvoicePreviewData | null>(null);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  // Order
  const [orderNotes, setOrderNotes] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [savedOrder, setSavedOrder] = useState<OrderPreviewData | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open]);

  async function loadData() {
    setLoading(true);
    const [prodRes, bundleRes] = await Promise.all([
      supabase.from("products").select("*, plans(*)").eq("is_active", true).order("sort_order"),
      supabase.from("product_bundles").select("*, bundle_items(*, product:products(id, name, base_price))").eq("is_active", true).order("sort_order"),
    ]);
    if (prodRes.data) setProducts(prodRes.data as any);
    if (bundleRes.data) setBundles(bundleRes.data as any);
    setLoading(false);
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, category]);

  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()));
  }, [bundles, search]);

  const totalSelected = Object.keys(selected).length + selectedBundles.size;

  function toggleProduct(p: ProductWithPlans) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { productId: p.id, planId: p.plans?.[0]?.id ?? null, quantity: 1 };
      return next;
    });
  }

  function setPlanFor(productId: string, planId: string) {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], planId, priceOverride: null } }));
  }

  function setQty(productId: string, q: number) {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], quantity: Math.max(1, q) } }));
  }

  function setPriceOverride(productId: string, v: number | null) {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], priceOverride: v } }));
  }

  function toggleBundle(id: string) {
    setSelectedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else { next.add(id); setBundleQty((q) => ({ ...q, [id]: q[id] ?? 1 })); }
      return next;
    });
  }

  function clearAll() {
    setSelected({});
    setSelectedBundles(new Set());
    setBundlePriceOverride({});
    setBundleQty({});
    setGenerated("");
    setEditing(false);
    setDiscountMode("none");
    setDiscountValue(0);
    setInvoiceNotes("");
    setSavedInvoice(null);
    setSavedInvoiceId(null);
    setOrderNotes("");
    setSavedOrder(null);
    setSavedOrderId(null);
    setStep("select");
  }

  // ===== Pricing computations =====
  type LineItem = { id: string; name: string; unitPrice: number; quantity: number; lineTotal: number; meta?: string };

  const lineItems: LineItem[] = useMemo(() => {
    const items: LineItem[] = [];
    Object.values(selected).forEach((sel) => {
      const p = products.find((x) => x.id === sel.productId);
      if (!p) return;
      const plan = p.plans?.find((pl) => pl.id === sel.planId);
      const baseUnit = plan ? Number(plan.price) : Number(p.base_price);
      const unit = sel.priceOverride != null ? Number(sel.priceOverride) : baseUnit;
      items.push({
        id: p.id,
        name: p.name,
        unitPrice: unit,
        quantity: sel.quantity,
        lineTotal: unit * sel.quantity,
        meta: plan?.name,
      });
    });
    selectedBundles.forEach((bid) => {
      const b = bundles.find((x) => x.id === bid);
      if (!b) return;
      const baseUnit = b.bundle_price ?? b.bundle_items?.reduce((s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1), 0) ?? 0;
      const unit = bundlePriceOverride[bid] != null ? bundlePriceOverride[bid] : Number(baseUnit);
      const qty = bundleQty[bid] ?? 1;
      items.push({
        id: b.id,
        name: b.name,
        unitPrice: unit,
        quantity: qty,
        lineTotal: unit * qty,
        meta: "Bundle",
      });
    });
    return items;
  }, [selected, selectedBundles, products, bundles, bundlePriceOverride, bundleQty]);

  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + i.lineTotal, 0), [lineItems]);
  const discountAmount = useMemo(() => {
    if (discountMode === "fixed") return Math.max(0, Math.min(subtotal, Number(discountValue) || 0));
    if (discountMode === "percent") return Math.max(0, Math.min(subtotal, (subtotal * (Number(discountValue) || 0)) / 100));
    return 0;
  }, [discountMode, discountValue, subtotal]);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // ===== Message generation =====
  function generateProductMessage() {
    const lines: string[] = ["Hi! Here are the details you requested:", ""];
    let idx = 1;
    Object.values(selected).forEach((sel) => {
      const p = products.find((x) => x.id === sel.productId);
      if (!p) return;
      const plan = p.plans?.find((pl) => pl.id === sel.planId);
      lines.push(`${idx}. *${p.name}*`);
      if (p.short_description) lines.push(p.short_description);
      (p.features || []).slice(0, 4).forEach((f) => lines.push(`• ${f}`));
      const price = plan ? plan.price : p.base_price;
      const planLabel = plan ? ` (${plan.name})` : "";
      lines.push(`Price: ${formatCurrency(Number(price))}${planLabel}`);
      lines.push("");
      idx++;
    });
    selectedBundles.forEach((bid) => {
      const b = bundles.find((x) => x.id === bid);
      if (!b) return;
      lines.push(`${idx}. *${b.name}* (Bundle)`);
      if (b.description) lines.push(b.description);
      b.bundle_items?.forEach((it) => {
        if (it.product) lines.push(`• ${it.product.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`);
      });
      const total = b.bundle_price ?? b.bundle_items?.reduce((s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1), 0) ?? 0;
      lines.push(`Bundle Price: ${formatCurrency(Number(total))}`);
      lines.push("");
      idx++;
    });
    lines.push("Let me know which one you'd like 👍");
    setGenerated(lines.join("\n").trim());
    setEditing(false);
    setStep("preview");
  }

  function generatePricingMessage() {
    const lines: string[] = ["Here is your total pricing:", ""];
    lineItems.forEach((it) => {
      const qtyLabel = it.quantity > 1 ? ` ×${it.quantity}` : "";
      lines.push(`• ${it.name}${qtyLabel}: ${formatCurrency(it.lineTotal)}`);
    });
    lines.push("");
    lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
    if (discountAmount > 0) {
      const dLabel = discountMode === "percent" ? ` (${discountValue}%)` : "";
      lines.push(`Discount${dLabel}: -${formatCurrency(discountAmount)}`);
    }
    lines.push(`*Final Price: ${formatCurrency(finalTotal)}*`);
    lines.push("");
    lines.push("Let me know if you'd like to proceed 👍");
    setGenerated(lines.join("\n").trim());
    setEditing(false);
    setStep("preview");
  }

  function handleSend() {
    if (!generated.trim()) return;
    onInsert(generated);
    clearAll();
    onOpenChange(false);
  }

  // ===== Invoice =====
  function buildInvoicePreviewData(invoiceNumber: string, status: InvoicePreviewData["status"]): InvoicePreviewData {
    return {
      invoiceNumber,
      status,
      issueDate: new Date().toISOString(),
      customerName: customerName || "Customer",
      customerPhone,
      customerEmail,
      items: lineItems.map((it) => ({
        name: it.name,
        meta: it.meta,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
      })),
      subtotal,
      discountLabel:
        discountAmount > 0
          ? discountMode === "percent"
            ? `${discountValue}%`
            : "fixed"
          : null,
      discountAmount,
      finalTotal,
      notes: invoiceNotes || null,
      currency: "PKR",
    };
  }

  function buildInvoiceMessage(data: InvoicePreviewData): string {
    const lines: string[] = [
      "Your invoice is ready 📄",
      "",
      `Invoice No: ${data.invoiceNumber}`,
      `Date: ${new Date(data.issueDate).toLocaleDateString()}`,
      "",
      "Items:",
    ];
    data.items.forEach((it) => {
      const qty = it.quantity > 1 ? ` ×${it.quantity}` : "";
      lines.push(`• ${it.name}${qty}: ${formatCurrency(it.lineTotal)}`);
    });
    lines.push("");
    lines.push(`Subtotal: ${formatCurrency(data.subtotal)}`);
    if (data.discountAmount > 0) {
      const dl = data.discountLabel ? ` (${data.discountLabel})` : "";
      lines.push(`Discount${dl}: -${formatCurrency(data.discountAmount)}`);
    }
    lines.push(`*Final Total: ${formatCurrency(data.finalTotal)} ${data.currency ?? "PKR"}*`);
    if (data.notes) {
      lines.push("");
      lines.push(`Notes: ${data.notes}`);
    }
    lines.push("");
    lines.push("Please review and confirm to proceed 👍");
    return lines.join("\n");
  }

  async function handleGenerateInvoice() {
    if (lineItems.length === 0) return;
    setStep("invoice");
    if (savedInvoice) return; // already generated
    await saveInvoice("draft");
  }

  async function saveInvoice(status: InvoicePreviewData["status"]) {
    setSavingInvoice(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast({ title: "Sign in required", description: "Please sign in to save invoices.", variant: "destructive" });
        return;
      }

      const insertPayload: any = {
        conversation_id: conversationId,
        client_id: clientId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        created_by: userId,
        status,
        subtotal,
        discount_type: discountMode,
        discount_value: discountValue,
        discount_amount: discountAmount,
        final_total: finalTotal,
        notes: invoiceNotes || null,
        currency: "PKR",
        sent_at: status === "sent" ? new Date().toISOString() : null,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      };

      let invoiceId = savedInvoiceId;
      let invoiceNumber: string;

      if (invoiceId) {
        const { data, error } = await (supabase as any)
          .from("invoices")
          .update(insertPayload)
          .eq("id", invoiceId)
          .select("id, invoice_number")
          .single();
        if (error) throw error;
        invoiceNumber = data.invoice_number;
      } else {
        const { data, error } = await (supabase as any)
          .from("invoices")
          .insert(insertPayload)
          .select("id, invoice_number")
          .single();
        if (error) throw error;
        invoiceId = data.id as string;
        invoiceNumber = data.invoice_number as string;

        // Insert items only on first save
        const itemPayloads: any[] = [];
        Object.values(selected).forEach((sel, idx) => {
          const p = products.find((x) => x.id === sel.productId);
          if (!p) return;
          const plan = p.plans?.find((pl) => pl.id === sel.planId);
          const baseUnit = plan ? Number(plan.price) : Number(p.base_price);
          const unit = sel.priceOverride != null ? Number(sel.priceOverride) : baseUnit;
          itemPayloads.push({
            invoice_id: invoiceId,
            product_id: p.id,
            plan_id: plan?.id ?? null,
            product_name: p.name,
            plan_name: plan?.name ?? null,
            quantity: sel.quantity,
            unit_price: unit,
            line_total: unit * sel.quantity,
            sort_order: idx,
          });
        });
        let bIdx = itemPayloads.length;
        selectedBundles.forEach((bid) => {
          const b = bundles.find((x) => x.id === bid);
          if (!b) return;
          const baseUnit = b.bundle_price ?? b.bundle_items?.reduce((s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1), 0) ?? 0;
          const unit = bundlePriceOverride[bid] != null ? bundlePriceOverride[bid] : Number(baseUnit);
          const qty = bundleQty[bid] ?? 1;
          itemPayloads.push({
            invoice_id: invoiceId,
            bundle_id: b.id,
            product_name: b.name,
            plan_name: "Bundle",
            quantity: qty,
            unit_price: unit,
            line_total: unit * qty,
            sort_order: bIdx++,
          });
        });
        if (itemPayloads.length > 0) {
          const { error: itemsError } = await (supabase as any).from("invoice_items").insert(itemPayloads);
          if (itemsError) throw itemsError;
        }
      }

      setSavedInvoiceId(invoiceId);
      const preview = buildInvoicePreviewData(invoiceNumber, status);
      setSavedInvoice(preview);
      toast({
        title: status === "draft" ? "Invoice saved as draft" : `Invoice marked as ${status}`,
        description: invoiceNumber,
      });
    } catch (err: any) {
      console.error("[invoice]", err);
      toast({ title: "Failed to save invoice", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSavingInvoice(false);
    }
  }

  function handleCopyInvoice() {
    if (!savedInvoice) return;
    const msg = buildInvoiceMessage(savedInvoice);
    navigator.clipboard.writeText(msg);
    toast({ title: "Invoice summary copied" });
  }

  function handleSendInvoiceToChat() {
    if (!savedInvoice) return;
    const msg = buildInvoiceMessage(savedInvoice);
    onInsert(msg);
    // Mark sent if currently draft
    if (savedInvoice.status === "draft") void saveInvoice("sent");
    onOpenChange(false);
    clearAll();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 text-base">
            {step !== "select" && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                if (step === "preview") setStep("pricing");
                else if (step === "invoice") setStep("pricing");
                else if (step === "pricing") setStep("select");
              }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "pricing" ? <Calculator className="h-4 w-4 text-primary" /> : step === "invoice" ? <FileText className="h-4 w-4 text-primary" /> : <Package className="h-4 w-4 text-primary" />}
            {step === "select" && "Product Selector"}
            {step === "pricing" && "Pricing Calculator"}
            {step === "preview" && "Message Preview"}
            {step === "invoice" && "Invoice"}
            {totalSelected > 0 && step === "select" && (
              <Badge variant="secondary" className="ml-auto h-5 text-[10px]">{totalSelected} selected</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* STEP: SELECT */}
        {step === "select" && (
          <>
            <div className="px-4 py-3 border-b border-border/40 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products or bundles..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              {tab === "products" && categories.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border transition-colors capitalize",
                        category === c
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 mt-2 h-8">
                <TabsTrigger value="products" className="text-xs gap-1.5">
                  <Package className="h-3 w-3" /> Products ({filteredProducts.length})
                </TabsTrigger>
                <TabsTrigger value="bundles" className="text-xs gap-1.5">
                  <Layers className="h-3 w-3" /> Bundles ({filteredBundles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full px-4">
                  {loading ? (
                    <p className="text-center text-xs text-muted-foreground py-8">Loading...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">No products found.</p>
                  ) : (
                    <div className="space-y-2 pb-4">
                      {filteredProducts.map((p) => {
                        const sel = selected[p.id];
                        const isSelected = !!sel;
                        const plan = sel?.planId ? p.plans?.find((pl) => pl.id === sel.planId) : null;
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "rounded-lg border p-3 transition-colors",
                              isSelected ? "border-primary/50 bg-primary/5" : "border-border/40 hover:border-border/70",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleProduct(p)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium truncate">{p.name}</p>
                                  <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 shrink-0", PRODUCT_TYPE_COLOR[p.product_type])}>
                                    {PRODUCT_TYPE_LABEL[p.product_type]}
                                  </Badge>
                                </div>
                                {p.short_description && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{p.short_description}</p>
                                )}
                                <div className="flex items-center justify-between mt-2 gap-2">
                                  <span className="text-xs font-semibold text-primary">
                                    {formatCurrency(plan ? Number(plan.price) : Number(p.base_price))}
                                  </span>
                                  {isSelected && p.plans && p.plans.length > 1 && (
                                    <Select value={sel.planId ?? ""} onValueChange={(v) => setPlanFor(p.id, v)}>
                                      <SelectTrigger className="h-7 text-[11px] w-auto min-w-[120px]">
                                        <SelectValue placeholder="Plan" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {p.plans.map((pl) => (
                                          <SelectItem key={pl.id} value={pl.id} className="text-xs">
                                            {pl.name} — {formatCurrency(Number(pl.price))}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="bundles" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full px-4">
                  {filteredBundles.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">No bundles available.</p>
                  ) : (
                    <div className="space-y-2 pb-4">
                      {filteredBundles.map((b) => {
                        const isSelected = selectedBundles.has(b.id);
                        const total = b.bundle_price ?? b.bundle_items?.reduce((s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1), 0) ?? 0;
                        return (
                          <div
                            key={b.id}
                            className={cn(
                              "rounded-lg border p-3 transition-colors",
                              isSelected ? "border-primary/50 bg-primary/5" : "border-border/40 hover:border-border/70",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleBundle(b.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{b.name}</p>
                                {b.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{b.description}</p>}
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {b.bundle_items?.slice(0, 4).map((it) => (
                                    <Badge key={it.id} variant="secondary" className="text-[9px] h-4 px-1.5">
                                      {it.product?.name}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs font-semibold text-primary mt-2">{formatCurrency(Number(total))}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* STEP: PRICING */}
        {step === "pricing" && (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Items</p>
                {lineItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No items selected.</p>
                ) : (
                  <div className="space-y-2">
                    {lineItems.map((it) => {
                      const isProduct = !!selected[it.id];
                      return (
                        <div key={it.id} className="rounded-lg border border-border/40 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{it.name}</p>
                              {it.meta && <p className="text-[10px] text-muted-foreground">{it.meta}</p>}
                            </div>
                            <p className="text-sm font-semibold text-primary whitespace-nowrap">{formatCurrency(it.lineTotal)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Unit price</Label>
                              <Input
                                type="number"
                                min={0}
                                value={it.unitPrice}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  if (isProduct) setPriceOverride(it.id, v);
                                  else setBundlePriceOverride((prev) => ({ ...prev, [it.id]: v }));
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    const q = Math.max(1, it.quantity - 1);
                                    if (isProduct) setQty(it.id, q);
                                    else setBundleQty((prev) => ({ ...prev, [it.id]: q }));
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  value={it.quantity}
                                  onChange={(e) => {
                                    const q = Math.max(1, Number(e.target.value) || 1);
                                    if (isProduct) setQty(it.id, q);
                                    else setBundleQty((prev) => ({ ...prev, [it.id]: q }));
                                  }}
                                  className="h-8 text-xs text-center"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    const q = it.quantity + 1;
                                    if (isProduct) setQty(it.id, q);
                                    else setBundleQty((prev) => ({ ...prev, [it.id]: q }));
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="rounded-lg border border-border/40 p-3 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Discount</p>
                <div className="flex gap-1.5">
                  {(["none", "fixed", "percent"] as DiscountMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setDiscountMode(m); if (m === "none") setDiscountValue(0); }}
                      className={cn(
                        "flex-1 text-[11px] py-1.5 rounded-md border transition-colors capitalize",
                        discountMode === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m === "none" ? "No discount" : m}
                    </button>
                  ))}
                </div>
                {discountMode !== "none" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={discountMode === "percent" ? 100 : subtotal}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      className="h-8 text-xs"
                      placeholder={discountMode === "percent" ? "10" : "500"}
                    />
                    <span className="text-xs text-muted-foreground w-10">{discountMode === "percent" ? "%" : "PKR"}</span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-500">
                    <span>Discount {discountMode === "percent" ? `(${discountValue}%)` : ""}</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-border/40 my-1" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Final Total</span>
                  <span className="text-primary">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* STEP: PREVIEW */}
        {step === "preview" && (
          <div className="flex-1 p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Message Preview</span>
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={() => setEditing((e) => !e)}>
                <Pencil className="h-3 w-3" /> {editing ? "Done" : "Edit"}
              </Button>
            </div>
            {editing ? (
              <Textarea
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                className="text-xs flex-1 resize-none bg-background/60"
              />
            ) : (
              <ScrollArea className="flex-1 rounded-md border border-border/40 bg-card/40 p-3">
                <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/90">{generated}</pre>
              </ScrollArea>
            )}
          </div>
        )}

        {/* STEP: INVOICE */}
        {step === "invoice" && (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {savingInvoice && !savedInvoice && (
                <p className="text-xs text-muted-foreground py-6 text-center">Generating invoice…</p>
              )}
              {savedInvoice && (
                <>
                  <InvoicePreview data={savedInvoice} />

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Internal notes (optional)</Label>
                    <Textarea
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      placeholder="Add a note for the customer…"
                      className="text-xs resize-none bg-background/60 min-h-[60px]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] gap-1.5"
                      onClick={() => saveInvoice("draft")}
                      disabled={savingInvoice}
                    >
                      Save Draft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] gap-1.5"
                      onClick={() => saveInvoice("sent")}
                      disabled={savingInvoice}
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark Sent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] gap-1.5"
                      onClick={() => saveInvoice("paid")}
                      disabled={savingInvoice}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px] gap-1.5"
                      onClick={handleCopyInvoice}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        <div className="border-t border-border/40 p-3 flex items-center gap-2 bg-background/60">
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={totalSelected === 0 && !generated && !savedInvoice} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
          <div className="flex-1" />

          {step === "select" && (
            <>
              <Button variant="outline" size="sm" onClick={generateProductMessage} disabled={totalSelected === 0} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Info
              </Button>
              <Button size="sm" onClick={() => setStep("pricing")} disabled={totalSelected === 0} className="gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Calculate Price
              </Button>
            </>
          )}

          {step === "pricing" && (
            <>
              <Button variant="outline" size="sm" onClick={generatePricingMessage} disabled={lineItems.length === 0} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Pricing Msg
              </Button>
              <Button size="sm" onClick={handleGenerateInvoice} disabled={lineItems.length === 0} className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Generate Invoice
              </Button>
            </>
          )}

          {step === "preview" && (
            <Button size="sm" onClick={handleSend} disabled={!generated.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send to Chat
            </Button>
          )}

          {step === "invoice" && (
            <Button size="sm" onClick={handleSendInvoiceToChat} disabled={!savedInvoice || savingInvoice} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send to Chat
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
