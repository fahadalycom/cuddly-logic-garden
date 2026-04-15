import { useState } from "react";
import { useSystemSettings, type SystemSetting } from "@/hooks/useSystemSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save, Eye, EyeOff, Pencil, Database, Search } from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";

const CATEGORIES = [
  { value: "whatsapp_api", label: "WhatsApp API" },
  { value: "whatsapp_ai", label: "WhatsApp AI" },
  { value: "whatsapp_general", label: "WhatsApp General" },
  { value: "general", label: "General" },
  { value: "integrations", label: "Integrations" },
];

export function SystemSettingsManager() {
  const { settings, loading, updateSetting, upsertSetting, deleteSetting } = useSystemSettings();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: "", value: "", category: "general", description: "", is_secret: false });

  const filtered = settings.filter(s =>
    s.key.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(s => s.category === cat.value),
  })).filter(g => g.items.length > 0);

  const startEdit = (s: SystemSetting) => {
    setEditingId(s.id);
    setEditValue(s.value || "");
  };

  const saveEdit = async (key: string) => {
    const ok = await updateSetting(key, editValue);
    if (ok) { toast.success("Saved!"); setEditingId(null); }
  };

  const handleAdd = async () => {
    if (!newSetting.key.trim()) { toast.error("Key is required"); return; }
    const ok = await upsertSetting(newSetting);
    if (ok) {
      toast.success("Setting added!");
      setShowAdd(false);
      setNewSetting({ key: "", value: "", category: "general", description: "", is_secret: false });
    }
  };

  const handleDelete = async (key: string) => {
    const ok = await deleteSetting(key);
    if (ok) toast.success("Setting deleted!");
  };

  if (loading) return <LoadingState message="Loading system settings..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">System Settings</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage all API credentials, feature toggles, and system configuration</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gradient-primary text-white border-0">
              <Plus className="h-4 w-4 mr-1.5" /> Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong rounded-2xl border-border/30">
            <DialogHeader><DialogTitle>Add New Setting</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Key</Label>
                <Input value={newSetting.key} onChange={e => setNewSetting({ ...newSetting, key: e.target.value })} placeholder="e.g., my_api_key" className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl font-mono" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Value</Label>
                <Input value={newSetting.value} onChange={e => setNewSetting({ ...newSetting, value: e.target.value })} placeholder="Enter value" className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={newSetting.category} onValueChange={v => setNewSetting({ ...newSetting, category: v })}>
                  <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong rounded-xl border-border/30">
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input value={newSetting.description} onChange={e => setNewSetting({ ...newSetting, description: e.target.value })} placeholder="What this setting does" className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={newSetting.is_secret} onCheckedChange={v => setNewSetting({ ...newSetting, is_secret: v })} />
                <Label className="text-xs">Secret (hidden from non-admin staff)</Label>
              </div>
              <Button onClick={handleAdd} className="w-full rounded-xl gradient-primary text-white border-0">Save Setting</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search settings..." className="pl-10 bg-secondary/30 border-border/30 rounded-xl" />
      </div>

      {/* Grouped Settings */}
      {grouped.map(group => (
        <div key={group.value} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Database className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
            <Badge variant="outline" className="text-[9px] rounded-md">{group.items.length}</Badge>
          </div>
          {group.items.map(s => {
            const isEditing = editingId === s.id;
            const isVisible = showSecrets[s.key];

            return (
              <div key={s.id} className="premium-card !p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono font-semibold text-foreground truncate">{s.key}</p>
                      {s.is_secret && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-500 border-amber-500/20 rounded-md shrink-0">Secret</Badge>}
                    </div>
                    {s.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(s)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive/50 hover:text-destructive" onClick={() => handleDelete(s.key)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type={s.is_secret && !isVisible ? "password" : "text"}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="text-xs bg-secondary/30 border-border/30 rounded-lg font-mono flex-1"
                    />
                    {s.is_secret && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => setShowSecrets(p => ({ ...p, [s.key]: !p[s.key] }))}>
                        {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button size="sm" className="h-7 rounded-lg text-[10px] gradient-primary text-white border-0 shrink-0" onClick={() => saveEdit(s.key)}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[10px] shrink-0" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-muted-foreground bg-secondary/20 px-2 py-1.5 rounded-lg truncate">
                    {s.value ? (s.is_secret ? "••••••••••••" : s.value) : <span className="italic">Empty</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No settings found</p>
        </div>
      )}
    </div>
  );
}
