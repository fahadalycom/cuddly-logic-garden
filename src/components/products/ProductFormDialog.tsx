import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { ProductFull, ProductType } from "@/types/products";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: ProductFull | null;
  onSaved: () => void;
}

const empty = {
  name: "",
  category: "",
  product_type: "private" as ProductType,
  base_price: 0,
  short_description: "",
  description: "",
  features: [] as string[],
  usage_instructions: "",
  support_notes: "",
  faq_content: "",
  is_active: true,
};

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: Props) {
  const [form, setForm] = useState(empty);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category ?? "",
        product_type: product.product_type,
        base_price: Number(product.base_price),
        short_description: product.short_description ?? "",
        description: product.description ?? "",
        features: product.features ?? [],
        usage_instructions: product.usage_instructions ?? "",
        support_notes: product.support_notes ?? "",
        faq_content: product.faq_content ?? "",
        is_active: product.is_active,
      });
    } else {
      setForm(empty);
    }
    setFeatureInput("");
  }, [product, open]);

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, features: [...f.features, v] }));
    setFeatureInput("");
  };

  const removeFeature = (i: number) => setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      category: form.category || null,
      product_type: form.product_type,
      base_price: form.base_price,
      short_description: form.short_description || null,
      description: form.description || null,
      features: form.features,
      usage_instructions: form.usage_instructions || null,
      support_notes: form.support_notes || null,
      faq_content: form.faq_content || null,
      is_active: form.is_active,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(product ? "Product updated" : "Product created");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="template">Chat Template</TabsTrigger>
            <TabsTrigger value="extra">Extras</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="AI Tools, Design..." className="mt-1.5" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v as ProductType })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="invite_based">Invite-based</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Base Price</Label>
                <Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} className="mt-1.5" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>{form.is_active ? "Active" : "Inactive"}</Label>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1.5" />
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 mt-4">
            <div>
              <Label>Short description (quick reply)</Label>
              <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="One-line summary for chat" className="mt-1.5" />
            </div>
            <div>
              <Label>Features</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                  placeholder="Add feature and press Enter"
                />
                <Button type="button" onClick={addFeature} variant="outline">Add</Button>
              </div>
              {form.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {f}
                      <button onClick={() => removeFeature(i)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Usage instructions</Label>
              <Textarea value={form.usage_instructions} onChange={(e) => setForm({ ...form, usage_instructions: e.target.value })} rows={3} className="mt-1.5" />
            </div>
            <div>
              <Label>Support notes (internal)</Label>
              <Textarea value={form.support_notes} onChange={(e) => setForm({ ...form, support_notes: e.target.value })} rows={2} className="mt-1.5" />
            </div>
          </TabsContent>

          <TabsContent value="extra" className="space-y-4 mt-4">
            <div>
              <Label>FAQ content</Label>
              <Textarea value={form.faq_content} onChange={(e) => setForm({ ...form, faq_content: e.target.value })} rows={6} className="mt-1.5" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
