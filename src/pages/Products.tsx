import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { formatWhatsAppProductInfo, formatCurrency } from "@/lib/template-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Plus, Copy, ShoppingCart, Search, Grid3X3, List, Eye } from "lucide-react";
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
  const { isAdmin, hasPermission } = useAuth();
  const { copy } = useClipboard();

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, product_variants(*)").eq("is_active", true).order("sort_order");
    setProducts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copySelectedInfo = () => {
    const selectedProducts = products.filter((p) => selected.has(p.id));
    const msg = selectedProducts.map((p) => formatWhatsAppProductInfo(p, p.variants)).join("\n\n---\n\n");
    copy(msg, "Product info");
  };

  const handleAddProduct = async () => {
    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      description: newProduct.description,
      base_price: newProduct.base_price,
      category: newProduct.category,
      faq_content: newProduct.faq_content,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Product added!");
    setShowAdd(false);
    setNewProduct({ name: "", description: "", base_price: 0, category: "", faq_content: "" });
    fetchProducts();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={copySelectedInfo}>
                <Copy className="h-4 w-4 mr-1" /> Copy Info ({selected.size})
              </Button>
              <Button size="sm" onClick={() => toast.info("Buy flow coming soon")}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Buy ({selected.size})
              </Button>
            </>
          )}
          {isAdmin && (
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} /></div>
                  <div><Label>Base Price</Label><Input type="number" value={newProduct.base_price} onChange={(e) => setNewProduct({ ...newProduct, base_price: Number(e.target.value) })} /></div>
                  <div><Label>Description</Label><Textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} /></div>
                  <div><Label>FAQ Content</Label><Textarea value={newProduct.faq_content} onChange={(e) => setNewProduct({ ...newProduct, faq_content: e.target.value })} /></div>
                  <Button onClick={handleAddProduct} className="w-full">Save Product</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
          {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No products found" description="Add your first product to get started." />
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {filtered.map((product) => (
            <Card key={product.id} className={`cursor-pointer transition-all ${selected.has(product.id) ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2" onClick={() => toggleSelect(product.id)}>
                    <input type="checkbox" checked={selected.has(product.id)} readOnly className="rounded" />
                    <CardTitle className="text-base">{product.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copy(formatWhatsAppProductInfo(product, product.variants), product.name)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {product.category && <Badge variant="secondary" className="mt-1">{product.category}</Badge>}
              </CardHeader>
              <CardContent>
                {product.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>}
                <p className="text-lg font-semibold">{formatCurrency(Number(product.base_price))}</p>
                {product.variants?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {product.variants.map((v) => (
                      <Badge key={v.id} variant="outline" className="text-xs">
                        {v.name}: {formatCurrency(Number(v.price))}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
