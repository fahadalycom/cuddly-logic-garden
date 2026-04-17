import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { upsertVendor, VENDOR_STATUSES, VENDOR_SOURCES, type Vendor } from "@/lib/vendors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor?: Vendor | null;
  onSaved?: () => void;
}

export function VendorDialog({ open, onOpenChange, vendor, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", contact_name: "", contact_email: "", contact_phone: "",
    website: "", source_type: "direct_company", status: "active", notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: vendor?.name ?? "",
        category: vendor?.category ?? "",
        contact_name: vendor?.contact_name ?? "",
        contact_email: vendor?.contact_email ?? "",
        contact_phone: vendor?.contact_phone ?? "",
        website: vendor?.website ?? "",
        source_type: vendor?.source_type ?? "direct_company",
        status: vendor?.status ?? "active",
        notes: vendor?.notes ?? "",
      });
    }
  }, [open, vendor]);

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      await upsertVendor({
        id: vendor?.id,
        name: form.name.trim(),
        category: form.category.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        website: form.website.trim() || null,
        source_type: form.source_type as any,
        status: form.status as any,
        notes: form.notes.trim() || null,
        ...(vendor?.id ? {} : { created_by: user?.id }),
      });
      toast.success(vendor ? "Vendor updated" : "Vendor created");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save vendor");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "New Vendor"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-2">
            <Label>Vendor name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Tools" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="AI, Design, Streaming…" />
          </div>
          <div className="space-y-2">
            <Label>Source type</Label>
            <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VENDOR_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contact person</Label>
            <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VENDOR_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Contact phone</Label>
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : vendor ? "Save changes" : "Create vendor"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
