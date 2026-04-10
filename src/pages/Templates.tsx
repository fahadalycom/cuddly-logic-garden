import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Plus, Check, X, Edit, Eye, Trash2 } from "lucide-react";
import { renderTemplate } from "@/lib/template-engine";
import { Constants } from "@/integrations/supabase/types";
import type { MessageTemplate } from "@/types/database";

const CATEGORIES = Constants.public.Enums.template_category;
const SAMPLE_VARS: Record<string, string> = { client_name: "Ahmed", product_name: "Netflix Premium", price: "$12.99", duration: "1 month", order_id: "abc12345", phone: "+201234567890" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "general" as any, body: "", variables: "" });
  const { isAdmin } = useAuth();

  const fetchData = async () => {
    const { data } = await supabase.from("message_templates").select("*").order("category");
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => setForm({ name: "", category: "general", body: "", variables: "" });

  const saveTemplate = async () => {
    const vars = form.variables.split(",").map(v => v.trim()).filter(Boolean);
    if (editId) {
      await supabase.from("message_templates").update({ name: form.name, category: form.category, body: form.body, variables: vars }).eq("id", editId);
      toast.success("Template updated!");
      setEditId(null);
    } else {
      await supabase.from("message_templates").insert({ name: form.name, category: form.category, body: form.body, variables: vars });
      toast.success("Template created!");
    }
    setShowAdd(false);
    resetForm();
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("message_templates").delete().eq("id", id);
    toast.success("Template deleted");
    fetchData();
  };

  const startEdit = (t: MessageTemplate) => {
    setForm({ name: t.name, category: t.category, body: t.body, variables: (t.variables || []).join(", ") });
    setEditId(t.id);
    setShowAdd(true);
  };

  const toggleActive = async (t: MessageTemplate) => {
    await supabase.from("message_templates").update({ is_active: !t.is_active }).eq("id", t.id);
    fetchData();
  };

  const previewTemplate = templates.find(t => t.id === previewId);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" />Message Templates</h1>
          <p className="page-subtitle">{templates.length} templates configured</p>
        </div>
        {isAdmin && (
          <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) { setEditId(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" />Add Template</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong rounded-2xl border-border/30 max-w-2xl">
              <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Template</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                    <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="glass-strong rounded-xl border-border/30">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Variables (comma-separated)</Label>
                    <Input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder="client_name, product_name, price" className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                  <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Body (use {"{{variable}}"} syntax)</Label>
                    <Textarea rows={6} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl mono text-xs" /></div>
                  <Button onClick={saveTemplate} disabled={!form.name || !form.body} className="w-full rounded-xl gradient-primary text-white border-0">
                    {editId ? "Update" : "Create"} Template
                  </Button>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live Preview</Label>
                  <div className="mt-1.5 p-4 rounded-xl bg-secondary/20 border border-border/20 min-h-[200px] whitespace-pre-wrap text-sm text-foreground">
                    {form.body ? renderTemplate(form.body, SAMPLE_VARS) : "Enter template body to see preview..."}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {templates.length === 0 ? <EmptyState title="No templates" description="Add WhatsApp message templates." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Category</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Variables</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Active</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{templates.map((t) => (
              <TableRow key={t.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{t.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] capitalize bg-secondary/30 text-muted-foreground border-border/20 rounded-lg font-medium">{t.category.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{(t.variables || []).join(", ") || "—"}</TableCell>
                <TableCell>
                  <button onClick={() => isAdmin && toggleActive(t)} className="cursor-pointer">
                    {t.is_active ? <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"><Check className="h-3.5 w-3.5" />Active</span>
                      : <span className="flex items-center gap-1.5 text-xs text-muted-foreground/40"><X className="h-3.5 w-3.5" />Inactive</span>}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewId(t.id)} className="h-7 w-7 rounded-lg"><Eye className="h-3.5 w-3.5" /></Button>
                    {isAdmin && <>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t)} className="h-7 w-7 rounded-lg"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)} className="h-7 w-7 rounded-lg text-destructive/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>}
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="glass-strong rounded-2xl border-border/30">
          <DialogHeader><DialogTitle>{previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="p-4 rounded-xl bg-secondary/20 border border-border/20 whitespace-pre-wrap text-sm">
            {previewTemplate ? renderTemplate(previewTemplate.body, SAMPLE_VARS) : ""}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
