import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { formatWhatsAppProductInfo, formatCurrency } from "@/lib/template-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Plus, Copy, ShoppingCart, Search, Grid3X3, List, Package } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductVariant } from "@/types/database";

export default function ProductsPage() {
  const [products, setProducts] = useState<(Product & { variants: ProductVariant[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", base_price: 0, category: "", faq_content: "" });
  const { isAdmin } = useAuth();
  const { copy } = useClipboard();

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, product_variants(*)").eq("is_active", true).order("sort_order");
    setProducts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const copySelectedInfo = () => {
    const selectedProducts = products.filter((p) => selected.has(p.id));
    const msg = selectedProducts.map((p) => formatWhatsAppProductInfo(p, p.variants)).join("\n\n---\n\n");
    copy(msg, "Product info");
  };

  const handleAddProduct = async () => {
    const { error } = await supabase.from("products").insert({
      name: newProduct.name, description: newProduct.description, base_price: newProduct.base_price, category: newProduct.category, faq_content: newProduct.faq_content,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Product added!");
    setShowAdd(false);
    setNewProduct({ name: "", description: "", base_price: 0, category: "", faq_content: "" });
    fetchProducts();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Products
          </h1>
          <p className="page-subtitle">{products.length} active products in your catalog</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={copySelectedInfo} className="rounded-xl border-border/30 bg-card/40 backdrop-blur-xl hover:bg-card/60">
                <Copy className="h-4 w-4 mr-1.5" /> Copy ({selected.size})
              </Button>
              <Button size="sm" onClick={() => toast.info("Buy flow coming soon")} className="rounded-xl gradient-primary text-white border-0 shadow-lg shadow-primary/20">
                <ShoppingCart className="h-4 w-4 mr-1.5" /> Buy ({selected.size})
              </Button>
            </>
          )}
          {isAdmin && (
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl gradient-primary text-white border-0 shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong rounded-2xl border-border/30">
                <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label><Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label><Input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Base Price</Label><Input type="number" value={newProduct.base_price} onChange={(e) => setNewProduct({ ...newProduct, base_price: Number(e.target.value) })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label><Textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                  <Button onClick={handleAddProduct} className="w-full rounded-xl gradient-primary text-white border-0">Save Product</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="search-premium flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
          <Input className="pl-10 bg-card/40 border-border/20 rounded-xl h-11" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="rounded-xl border-border/20 bg-card/40 h-11 w-11">
          {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        <EmptyState title="No products found" description="Add your first product to get started." />
      ) : (
        <div className={`${viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"} stagger-children`}>
          {filtered.map((product) => (
            <div
              key={product.id}
              className={`premium-card cursor-pointer ${selected.has(product.id) ? "ring-1 ring-primary/50 border-primary/30" : ""}`}
              onClick={() => toggleSelect(product.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${selected.has(product.id) ? 'bg-primary border-primary' : 'border-border/40'}`}>
                    {selected.has(product.id) && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-foreground" onClick={(e) => { e.stopPropagation(); copy(formatWhatsAppProductInfo(product, product.variants), product.name); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              {product.category && <Badge variant="outline" className="mb-3 text-[10px] uppercase tracking-wider font-medium bg-secondary/30 border-border/20 text-muted-foreground rounded-lg">{product.category}</Badge>}
              {product.description && <p className="text-xs text-muted-foreground/60 mb-4 line-clamp-2 leading-relaxed">{product.description}</p>}
              <div className="flex items-end justify-between">
                <p className="text-xl font-bold text-foreground tracking-tight">{formatCurrency(Number(product.base_price))}</p>
                {product.variants?.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/40 font-medium">{product.variants.length} variant{product.variants.length > 1 ? 's' : ''}</span>
                )}
              </div>
              {product.variants?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/20 flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <Badge key={v.id} variant="outline" className="text-[10px] bg-primary/5 text-primary/70 border-primary/10 rounded-lg font-medium">
                      {v.name}: {formatCurrency(Number(v.price))}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
