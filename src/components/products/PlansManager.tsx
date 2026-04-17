import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "@/types/products";
import { formatCurrency } from "@/lib/template-engine";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productName: string;
}

const emptyPlan = { name: "", duration_days: 30, price: 0, max_users: 1, description: "", is_active: true };

export function PlansManager({ open, onOpenChange, productId, productName }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyPlan);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").eq("product_id", productId).order("sort_order");
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { if (open) { load(); setEditing(null); setForm(emptyPlan); } }, [open, productId]);

  const startEdit = (p: Plan) => {
    setEditing(p);
    setForm({ name: p.name, duration_days: p.duration_days, price: Number(p.price), max_users: p.max_users, description: p.description ?? "", is_active: p.is_active });
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Plan name required"); return; }
    const payload = { ...form, product_id: productId, description: form.description || null };
    const { error } = editing
      ? await supabase.from("plans").update(payload).eq("id", editing.id)
      : await supabase.from("plans").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Plan updated" : "Plan added");
    setEditing(null);
    setForm(emptyPlan);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan deleted");
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plans · {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans yet. Add one below.</p>
          ) : plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/30 bg-card/40 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.name}</span>
                  {!p.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  <Badge variant="secondary" className="text-[10px]">{p.duration_days}d</Badge>
                  {p.max_users > 1 && <Badge variant="secondary" className="text-[10px]">{p.max_users} users</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{formatCurrency(Number(p.price))}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 pt-4 mt-4 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{editing ? "Edit plan" : "Add plan"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly, Pro, Yearly..." className="mt-1.5" />
            </div>
            <div>
              <Label>Duration (days)</Label>
              <Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label>Max users</Label>
              <Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>{form.is_active ? "Active" : "Inactive"}</Label>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1.5" />
            </div>
          </div>
        </div>

        <DialogFooter>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setForm(emptyPlan); }}>Cancel edit</Button>}
          <Button onClick={save}><Plus className="h-4 w-4 mr-1.5" />{editing ? "Update plan" : "Add plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
