import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/template-engine";
import type { ProductFull, Plan, BundleWithItems } from "@/types/products";
import type { InvoicePreviewData } from "@/components/conversations/InvoicePreview";
import type {
  OrderPreviewData,
  OrderStatusVal,
  PaymentStatusVal,
  FulfillmentStatusVal,
} from "@/components/conversations/OrderPreview";

export type ProductWithPlans = ProductFull & { plans: Plan[] };
export type DiscountMode = "none" | "fixed" | "percent";

export interface SelectedProduct {
  productId: string;
  planId: string | null;
  quantity: number;
  priceOverride?: number | null;
}

export interface PosLineItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  meta?: string;
}

export interface PosCustomer {
  clientId?: string | null;
  name?: string | null;
  phone?: string | null;
}

/**
 * Shared POS engine: state + math + persistence.
 * Used by the new POS page; safe to extend to ProductSelectorPanel later.
 */
export function usePosEngine() {
  const [products, setProducts] = useState<ProductWithPlans[]>([]);
  const [bundles, setBundles] = useState<BundleWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Record<string, SelectedProduct>>({});
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [bundleQty, setBundleQty] = useState<Record<string, number>>({});
  const [bundlePriceOverride, setBundlePriceOverride] = useState<Record<string, number>>({});

  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Persistence state
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [savedInvoice, setSavedInvoice] = useState<InvoicePreviewData | null>(null);
  const [savedOrder, setSavedOrder] = useState<OrderPreviewData | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);

  // ===== Load =====
  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [prodRes, bundleRes] = await Promise.all([
      supabase.from("products").select("*, plans(*)").eq("is_active", true).order("sort_order"),
      supabase
        .from("product_bundles")
        .select("*, bundle_items(*, product:products(id, name, base_price))")
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    if (prodRes.data) setProducts(prodRes.data as any);
    if (bundleRes.data) setBundles(bundleRes.data as any);
    setLoading(false);
  }

  // ===== Selection actions =====
  const toggleProduct = useCallback((p: ProductWithPlans) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { productId: p.id, planId: p.plans?.[0]?.id ?? null, quantity: 1 };
      return next;
    });
  }, []);

  const setPlanFor = useCallback((productId: string, planId: string) => {
    setSelected((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], planId, priceOverride: null },
    }));
  }, []);

  const setQty = useCallback((productId: string, q: number) => {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], quantity: Math.max(1, q) } }));
  }, []);

  const setPriceOverride = useCallback((productId: string, v: number | null) => {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], priceOverride: v } }));
  }, []);

  const toggleBundle = useCallback((id: string) => {
    setSelectedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setBundleQty((q) => ({ ...q, [id]: q[id] ?? 1 }));
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelected({});
    setSelectedBundles(new Set());
    setBundleQty({});
    setBundlePriceOverride({});
    setDiscountMode("none");
    setDiscountValue(0);
    setSavedInvoice(null);
    setSavedInvoiceId(null);
    setSavedOrder(null);
    setSavedOrderId(null);
  }, []);

  const totalSelected = Object.keys(selected).length + selectedBundles.size;

  // ===== Derived =====
  const lineItems: PosLineItem[] = useMemo(() => {
    const items: PosLineItem[] = [];
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
      const baseUnit =
        b.bundle_price ??
        b.bundle_items?.reduce(
          (s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1),
          0,
        ) ??
        0;
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
    if (discountMode === "percent")
      return Math.max(0, Math.min(subtotal, (subtotal * (Number(discountValue) || 0)) / 100));
    return 0;
  }, [discountMode, discountValue, subtotal]);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // ===== Message generators =====
  const generateProductMessage = useCallback(() => {
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
      const total =
        b.bundle_price ??
        b.bundle_items?.reduce(
          (s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1),
          0,
        ) ??
        0;
      lines.push(`Bundle Price: ${formatCurrency(Number(total))}`);
      lines.push("");
      idx++;
    });
    lines.push("Let me know which one you'd like 👍");
    return lines.join("\n").trim();
  }, [selected, selectedBundles, products, bundles]);

  const generatePricingMessage = useCallback(() => {
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
    return lines.join("\n").trim();
  }, [lineItems, subtotal, discountAmount, discountMode, discountValue, finalTotal]);

  // ===== Persistence =====
  function buildInvoicePreviewData(
    invoiceNumber: string,
    status: InvoicePreviewData["status"],
    customer: PosCustomer,
    notes?: string | null,
  ): InvoicePreviewData {
    return {
      invoiceNumber,
      status,
      issueDate: new Date().toISOString(),
      customerName: customer.name || "Customer",
      customerPhone: customer.phone ?? null,
      customerEmail: null,
      items: lineItems.map((it) => ({
        name: it.name,
        meta: it.meta,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
      })),
      subtotal,
      discountLabel:
        discountAmount > 0 ? (discountMode === "percent" ? `${discountValue}%` : "fixed") : null,
      discountAmount,
      finalTotal,
      notes: notes || null,
      currency: "PKR",
    };
  }

  async function saveInvoice(
    status: InvoicePreviewData["status"],
    opts: { customer?: PosCustomer; notes?: string | null; conversationId?: string | null } = {},
  ): Promise<InvoicePreviewData | null> {
    const customer = opts.customer ?? {};
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Sign in required to save invoice");

    const payload: any = {
      conversation_id: opts.conversationId ?? null,
      client_id: customer.clientId ?? null,
      customer_name: customer.name ?? null,
      customer_phone: customer.phone ?? null,
      created_by: userId,
      status,
      subtotal,
      discount_type: discountMode,
      discount_value: discountValue,
      discount_amount: discountAmount,
      final_total: finalTotal,
      notes: opts.notes || null,
      currency: "PKR",
      sent_at: status === "sent" ? new Date().toISOString() : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    };

    let invoiceId = savedInvoiceId;
    let invoiceNumber: string;

    if (invoiceId) {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .update(payload)
        .eq("id", invoiceId)
        .select("id, invoice_number")
        .single();
      if (error) throw error;
      invoiceNumber = data.invoice_number;
    } else {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .insert(payload)
        .select("id, invoice_number")
        .single();
      if (error) throw error;
      invoiceId = data.id as string;
      invoiceNumber = data.invoice_number as string;

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
        const baseUnit =
          b.bundle_price ??
          b.bundle_items?.reduce(
            (s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1),
            0,
          ) ??
          0;
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
    const preview = buildInvoicePreviewData(invoiceNumber, status, customer, opts.notes);
    setSavedInvoice(preview);
    return preview;
  }

  async function saveOrder(opts: {
    clientId: string;
    customer?: PosCustomer;
    status?: OrderStatusVal;
    paymentStatus?: PaymentStatusVal;
    fulfillmentStatus?: FulfillmentStatusVal;
    notes?: string | null;
    conversationId?: string | null;
  }): Promise<{ orderId: string; orderNumber: string } | null> {
    const status: OrderStatusVal = opts.status ?? "pending_payment";
    const paymentStatus: PaymentStatusVal = opts.paymentStatus ?? "unpaid";
    const fulfillmentStatus: FulfillmentStatusVal = opts.fulfillmentStatus ?? "not_started";

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Sign in required to create order");
    if (!opts.clientId) throw new Error("Client required");

    const payload: any = {
      client_id: opts.clientId,
      conversation_id: opts.conversationId ?? null,
      invoice_id: savedInvoiceId,
      created_by: userId,
      status,
      payment_status: paymentStatus,
      fulfillment_status: fulfillmentStatus,
      total_amount: finalTotal,
      discount_type: discountMode,
      discount_value: discountValue,
      discount_amount: discountAmount,
      paid_amount: paymentStatus === "paid" ? finalTotal : 0,
      remaining_due: paymentStatus === "paid" ? 0 : finalTotal,
      notes: opts.notes || null,
    };

    const { data, error } = await (supabase as any)
      .from("orders")
      .insert(payload)
      .select("id, order_number")
      .single();
    if (error) throw error;
    const orderId = data.id as string;
    const orderNumber = data.order_number as string;

    const itemPayloads: any[] = [];
    Object.values(selected).forEach((sel) => {
      const p = products.find((x) => x.id === sel.productId);
      if (!p) return;
      const plan = p.plans?.find((pl) => pl.id === sel.planId);
      const baseUnit = plan ? Number(plan.price) : Number(p.base_price);
      const unit = sel.priceOverride != null ? Number(sel.priceOverride) : baseUnit;
      itemPayloads.push({
        order_id: orderId,
        product_id: p.id,
        plan_id: plan?.id ?? null,
        product_name: p.name,
        plan_name: plan?.name ?? null,
        quantity: sel.quantity,
        unit_price: unit,
        line_total: unit * sel.quantity,
      });
    });
    selectedBundles.forEach((bid) => {
      const b = bundles.find((x) => x.id === bid);
      if (!b) return;
      const baseUnit =
        b.bundle_price ??
        b.bundle_items?.reduce(
          (s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1),
          0,
        ) ??
        0;
      const unit = bundlePriceOverride[bid] != null ? bundlePriceOverride[bid] : Number(baseUnit);
      const qty = bundleQty[bid] ?? 1;
      const anchor = b.bundle_items?.[0]?.product;
      if (!anchor) return;
      itemPayloads.push({
        order_id: orderId,
        product_id: anchor.id,
        plan_id: null,
        product_name: b.name,
        plan_name: "Bundle",
        quantity: qty,
        unit_price: unit,
        line_total: unit * qty,
      });
    });
    if (itemPayloads.length > 0) {
      const { error: itemsError } = await (supabase as any).from("order_items").insert(itemPayloads);
      if (itemsError) throw itemsError;
    }

    await (supabase as any).from("order_status_history").insert({
      order_id: orderId,
      from_status: null,
      to_status: status,
      changed_by: userId,
      notes: "Order created from POS",
    });

    return { orderId, orderNumber };
  }

  /** Re-hydrate selection from a saved invoice (and its items). */
  async function hydrateFromInvoice(invoiceId: string) {
    const { data: inv } = await (supabase as any)
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("id", invoiceId)
      .single();
    if (!inv) return null;

    // Wait until products+bundles loaded
    if (loading) await loadData();

    const newSelected: Record<string, SelectedProduct> = {};
    const newBundles = new Set<string>();
    const newBundleQty: Record<string, number> = {};
    const newBundleOverride: Record<string, number> = {};

    (inv.invoice_items || []).forEach((it: any) => {
      if (it.bundle_id) {
        newBundles.add(it.bundle_id);
        newBundleQty[it.bundle_id] = it.quantity || 1;
        newBundleOverride[it.bundle_id] = Number(it.unit_price);
      } else if (it.product_id) {
        newSelected[it.product_id] = {
          productId: it.product_id,
          planId: it.plan_id ?? null,
          quantity: it.quantity || 1,
          priceOverride: Number(it.unit_price),
        };
      }
    });

    setSelected(newSelected);
    setSelectedBundles(newBundles);
    setBundleQty(newBundleQty);
    setBundlePriceOverride(newBundleOverride);
    setDiscountMode((inv.discount_type as DiscountMode) || "none");
    setDiscountValue(Number(inv.discount_value) || 0);
    setSavedInvoiceId(inv.id);

    const preview: InvoicePreviewData = {
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      issueDate: inv.issue_date || inv.created_at,
      customerName: inv.customer_name || "Customer",
      customerPhone: inv.customer_phone,
      customerEmail: null,
      items: (inv.invoice_items || []).map((it: any) => ({
        name: it.product_name,
        meta: it.plan_name,
        quantity: it.quantity,
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      })),
      subtotal: Number(inv.subtotal),
      discountLabel:
        Number(inv.discount_amount) > 0
          ? inv.discount_type === "percent"
            ? `${inv.discount_value}%`
            : "fixed"
          : null,
      discountAmount: Number(inv.discount_amount),
      finalTotal: Number(inv.final_total),
      notes: inv.notes,
      currency: inv.currency || "PKR",
    };
    setSavedInvoice(preview);
    return preview;
  }

  return {
    // data
    products,
    bundles,
    loading,
    // selection
    selected,
    selectedBundles,
    bundleQty,
    bundlePriceOverride,
    setBundleQty,
    setBundlePriceOverride,
    toggleProduct,
    setPlanFor,
    setQty,
    setPriceOverride,
    toggleBundle,
    clearAll,
    totalSelected,
    // discount
    discountMode,
    setDiscountMode,
    discountValue,
    setDiscountValue,
    // derived
    lineItems,
    subtotal,
    discountAmount,
    finalTotal,
    // generators
    generateProductMessage,
    generatePricingMessage,
    // persistence
    savedInvoice,
    savedInvoiceId,
    savedOrder,
    savedOrderId,
    saveInvoice,
    saveOrder,
    hydrateFromInvoice,
    setSavedInvoice,
    setSavedOrder,
    setSavedOrderId,
    reload: loadData,
  };
}
