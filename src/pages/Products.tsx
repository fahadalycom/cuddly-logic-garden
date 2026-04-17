import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { formatCurrency, formatWhatsAppProductInfo } from "@/lib/template-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Plus, Copy, Search, Grid3X3, List, Package, Pencil, Layers, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { PlansManager } from "@/components/products/PlansManager";
import { BundleFormDialog } from "@/components/products/BundleFormDialog";
import { PRODUCT_TYPE_COLOR, PRODUCT_TYPE_LABEL, type ProductFull, type ProductType, type BundleWithItems, type Plan } from "@/types/products";

type ProductWithPlans = ProductFull & { plans: Plan[] };

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const { copy } = useClipboard();

  const [products, setProducts] = useState<ProductWithPlans[]>([]);
  const [bundles, setBundles] = useState<BundleWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<ProductType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFull | null>(null);
  const [plansFor, setPlansFor] = useState<{ id: string; name: string } | null>(null);

  const [showBundleForm, setShowBundleForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<BundleWithItems | null>(null);

  const fetchAll = async () => {
    const [prodRes, bundleRes] = await Promise.all([
      supabase.from("products").select("*, plans(*)").order("sort_order").order("name"),
      supabase.from("product_bundles").select("*, bundle_items(*, product:products(id, name, base_price))").order("sort_order"),
    ]);
    setProducts((prodRes.data as any) ?? []);
    setBundles((bundleRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  const filtered = products.filter((p) => {
    if (filterStatus === "active" && !p.is_active) return false;
    if (filterStatus === "inactive" && p.is_active) return false;
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterType !== "all" && p.product_type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.category ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDeleteBundle = async (id: string) => {
    if (!confirm("Delete this bundle?")) return;
    const { error } = await supabase.from("product_bundles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Bundle deleted");
    fetchAll();
  };

  const handleToggleActive = async (p: ProductFull) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.is_active ? "Hidden from sales" : "Activated");
    fetchAll();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Product Management
          </h1>
          <p className="page-subtitle">{products.length} products · {bundles.length} bundles</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-1.5" />Products</TabsTrigger>
          <TabsTrigger value="bundles"><Layers className="h-4 w-4 mr-1.5" />Bundles</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input className="pl-10 h-10" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-[140px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="invite_based">Invite-based</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[120px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="h-10 w-10">
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            {isAdmin && (
              <Button onClick={() => { setEditingProduct(null); setShowProductForm(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />New product
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No products match" description="Try adjusting filters or add a new product." />
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div key={p.id} className="premium-card flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                        <Badge variant="outline" className={`text-[10px] ${PRODUCT_TYPE_COLOR[p.product_type]}`}>{PRODUCT_TYPE_LABEL[p.product_type]}</Badge>
                        {!p.is_active && <Badge variant="outline" className="text-[10px] bg-muted">Inactive</Badge>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copy(formatWhatsAppProductInfo(p, p.plans), p.name)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {p.short_description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.short_description}</p>}
                  <div className="flex items-end justify-between mt-auto">
                    <p className="text-lg font-bold">{formatCurrency(Number(p.base_price))}</p>
                    <span className="text-[10px] text-muted-foreground">{p.plans?.length ?? 0} plan{(p.plans?.length ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/20">
                      <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={() => { setEditingProduct(p); setShowProductForm(true); }}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={() => setPlansFor({ id: p.id, name: p.name })}>
                        <Settings2 className="h-3 w-3 mr-1" />Plans
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => handleToggleActive(p)}>
                        {p.is_active ? "Hide" : "Show"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-card/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Base price</th>
                    <th className="text-center p-3">Plans</th>
                    <th className="text-center p-3">Status</th>
                    {isAdmin && <th className="text-right p-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-border/20 hover:bg-card/30">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-muted-foreground">{p.category ?? "—"}</td>
                      <td className="p-3"><Badge variant="outline" className={`text-[10px] ${PRODUCT_TYPE_COLOR[p.product_type]}`}>{PRODUCT_TYPE_LABEL[p.product_type]}</Badge></td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(Number(p.base_price))}</td>
                      <td className="p-3 text-center text-muted-foreground">{p.plans?.length ?? 0}</td>
                      <td className="p-3 text-center">
                        <Badge variant={p.is_active ? "default" : "outline"} className="text-[10px]">{p.is_active ? "Active" : "Inactive"}</Badge>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingProduct(p); setShowProductForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPlansFor({ id: p.id, name: p.name })}><Settings2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* BUNDLES TAB */}
        <TabsContent value="bundles" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{bundles.length} bundle{bundles.length === 1 ? "" : "s"}</p>
            {isAdmin && (
              <Button onClick={() => { setEditingBundle(null); setShowBundleForm(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />New bundle
              </Button>
            )}
          </div>

          {bundles.length === 0 ? (
            <EmptyState title="No bundles yet" description="Group multiple products into a bundle deal." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bundles.map((b) => {
                const sum = b.bundle_items.reduce((s, bi) => s + Number(bi.product?.base_price ?? 0), 0);
                const finalPrice = b.bundle_price !== null ? Number(b.bundle_price) : sum;
                const savings = b.bundle_price !== null ? sum - Number(b.bundle_price) : 0;
                return (
                  <div key={b.id} className="premium-card flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" />{b.name}</h3>
                        {!b.is_active && <Badge variant="outline" className="text-[10px] mt-1">Inactive</Badge>}
                      </div>
                    </div>
                    {b.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{b.description}</p>}
                    <div className="space-y-1 mb-3">
                      {b.bundle_items.map((bi) => (
                        <div key={bi.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground/80">• {bi.product?.name ?? "—"}</span>
                          <span className="text-muted-foreground">{formatCurrency(Number(bi.product?.base_price ?? 0))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-3 border-t border-border/20 flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold">{formatCurrency(finalPrice)}</p>
                        {savings > 0 && <p className="text-[10px] text-primary">Save {formatCurrency(savings)}</p>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingBundle(b); setShowBundleForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteBundle(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProductFormDialog open={showProductForm} onOpenChange={setShowProductForm} product={editingProduct} onSaved={fetchAll} />
      {plansFor && (
        <PlansManager open={!!plansFor} onOpenChange={(v) => !v && setPlansFor(null)} productId={plansFor.id} productName={plansFor.name} />
      )}
      <BundleFormDialog open={showBundleForm} onOpenChange={setShowBundleForm} bundle={editingBundle} onSaved={fetchAll} />
    </div>
  );
}
