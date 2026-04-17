import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { BundleWithItems } from "@/types/products";
import { formatCurrency } from "@/lib/template-engine";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bundle?: BundleWithItems | null;
  onSaved: () => void;
}

export function BundleFormDialog({ open, onOpenChange, bundle, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [products, setProducts] = useState<{ id: string; name: string; base_price: number; category: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("products").select("id, name, base_price, category").eq("is_active", true).order("name").then(({ data }) => {
      setProducts(data || []);
    });
    if (bundle) {
      setName(bundle.name);
      setDescription(bundle.description ?? "");
      setBundlePrice(bundle.bundle_price !== null ? Number(bundle.bundle_price) : "");
      setIsActive(bundle.is_active);
      setSelected(new Set(bundle.bundle_items.map((bi) => bi.product_id)));
    } else {
      setName(""); setDescription(""); setBundlePrice(""); setIsActive(true); setSelected(new Set());
    }
  }, [open, bundle]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalIfNoBundle = Array.from(selected).reduce((sum, id) => sum + (products.find((p) => p.id === id)?.base_price ?? 0), 0);

  const save = async () => {
    if (!name.trim()) { toast.error("Bundle name required"); return; }
    if (selected.size === 0) { toast.error("Pick at least one product"); return; }
    setSaving(true);
    const payload = {
      name,
      description: description || null,
      bundle_price: bundlePrice === "" ? null : Number(bundlePrice),
      is_active: isActive,
    };
    let bundleId = bundle?.id;
    if (bundle) {
      const { error } = await supabase.from("product_bundles").update(payload).eq("id", bundle.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await supabase.from("bundle_items").delete().eq("bundle_id", bundle.id);
    } else {
      const { data, error } = await supabase.from("product_bundles").insert(payload).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Failed"); setSaving(false); return; }
      bundleId = data.id;
    }
    if (bundleId && selected.size > 0) {
      const items = Array.from(selected).map((product_id) => ({ bundle_id: bundleId!, product_id, quantity: 1 }));
      const { error } = await supabase.from("bundle_items").insert(items);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success(bundle ? "Bundle updated" : "Bundle created");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bundle ? "Edit Bundle" : "New Bundle"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Bundle price (optional)</Label>
              <Input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Leave empty for sum of products" className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>{isActive ? "Active" : "Inactive"}</Label>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Included products ({selected.size})</Label>
              <span className="text-xs text-muted-foreground">Sum: {formatCurrency(totalIfNoBundle)}</span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-border/30 p-2">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-card/40 cursor-pointer">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.category ?? "Uncategorized"} · {formatCurrency(Number(p.base_price))}</div>
                  </div>
                </label>
              ))}
              {products.length === 0 && <p className="text-sm text-muted-foreground p-3">No active products available.</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save bundle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
