import { useEffect, useMemo, useState } from "react";
import { Search, X, Package, Layers, Sparkles, Trash2, Pencil, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PRODUCT_TYPE_COLOR, PRODUCT_TYPE_LABEL, type ProductFull, type Plan, type BundleWithItems } from "@/types/products";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/template-engine";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (text: string) => void;
}

type ProductWithPlans = ProductFull & { plans: Plan[] };

interface SelectedProduct {
  productId: string;
  planId: string | null;
}

export function ProductSelectorPanel({ open, onOpenChange, onInsert }: Props) {
  const [products, setProducts] = useState<ProductWithPlans[]>([]);
  const [bundles, setBundles] = useState<BundleWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tab, setTab] = useState<"products" | "bundles">("products");
  const [selected, setSelected] = useState<Record<string, SelectedProduct>>({});
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState("");
  const [editing, setEditing] = useState(false);

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
      else next[p.id] = { productId: p.id, planId: p.plans?.[0]?.id ?? null };
      return next;
    });
  }

  function setPlanFor(productId: string, planId: string) {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], planId } }));
  }

  function toggleBundle(id: string) {
    setSelectedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearAll() {
    setSelected({});
    setSelectedBundles(new Set());
    setGenerated("");
    setEditing(false);
  }

  function generateMessage() {
    const lines: string[] = ["Hi! Here are the details you requested:", ""];
    let idx = 1;

    Object.values(selected).forEach((sel) => {
      const p = products.find((x) => x.id === sel.productId);
      if (!p) return;
      const plan = p.plans?.find((pl) => pl.id === sel.planId);
      lines.push(`${idx}. *${p.name}*`);
      if (p.short_description) lines.push(p.short_description);
      const features = (p.features || []).slice(0, 4);
      features.forEach((f) => lines.push(`• ${f}`));
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
  }

  function handleSend() {
    if (!generated.trim()) return;
    onInsert(generated);
    clearAll();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Product Selector
            {totalSelected > 0 && (
              <Badge variant="secondary" className="ml-auto h-5 text-[10px]">{totalSelected} selected</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Filters */}
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

        {/* Generated message preview */}
        {generated && (
          <div className="border-t border-border/40 p-3 bg-card/40 max-h-[40%] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={() => setEditing((e) => !e)}>
                <Pencil className="h-3 w-3" /> {editing ? "Done" : "Edit"}
              </Button>
            </div>
            {editing ? (
              <Textarea
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                className="text-xs min-h-[120px] max-h-[200px] resize-none bg-background/60"
              />
            ) : (
              <ScrollArea className="flex-1 max-h-[180px]">
                <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/90">{generated}</pre>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-border/40 p-3 flex items-center gap-2 bg-background/60">
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={totalSelected === 0 && !generated} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
          <div className="flex-1" />
          {!generated ? (
            <Button size="sm" onClick={generateMessage} disabled={totalSelected === 0} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Generate Message
            </Button>
          ) : (
            <Button size="sm" onClick={handleSend} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send to Chat
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
