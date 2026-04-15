import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Clock, Tag, Percent, MessageSquare, Bot, Users, Bell, Palette, Globe, Database } from "lucide-react";
import { WhatsAppApiSettings } from "@/components/settings/WhatsAppApiSettings";
import { WhatsAppAiSettings } from "@/components/settings/WhatsAppAiSettings";
import { WhatsAppAgentSettings } from "@/components/settings/WhatsAppAgentSettings";
import { WhatsAppNotificationSettings } from "@/components/settings/WhatsAppNotificationSettings";
import { WhatsAppThemeSettings } from "@/components/settings/WhatsAppThemeSettings";
import { SystemSettingsManager } from "@/components/settings/SystemSettingsManager";
import type { Product, ProductDuration, ProductVariant } from "@/types/database";

export default function SettingsPage() {
  const [products, setProducts] = useState<(Product & { product_durations: ProductDuration[]; product_variants: ProductVariant[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDuration, setShowAddDuration] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [durationForm, setDurationForm] = useState({ duration_type: "month" as any, duration_value: 1, price_multiplier: 1 });
  const { isAdmin } = useAuth();

  const fetchData = async () => {
    const { data } = await supabase.from("products").select("*, product_durations(*), product_variants(*)").eq("is_active", true).order("sort_order");
    setProducts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addDuration = async () => {
    if (!selectedProduct) return;
    const { error } = await supabase.from("product_durations").insert({ product_id: selectedProduct, ...durationForm });
    if (error) { toast.error(error.message); return; }
    toast.success("Duration added!");
    setShowAddDuration(false);
    fetchData();
  };

  const toggleDuration = async (id: string, is_active: boolean) => {
    await supabase.from("product_durations").update({ is_active: !is_active }).eq("id", id);
    fetchData();
  };

  const deleteDuration = async (id: string) => {
    await supabase.from("product_durations").delete().eq("id", id);
    toast.success("Duration removed");
    fetchData();
  };

  const updateVariant = async (id: string, field: "sharing_standard" | "max_discount_percent" | "max_discount_fixed", value: number) => {
    await supabase.from("product_variants").update({ [field]: value } as any).eq("id", id);
    toast.success("Updated");
    fetchData();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Settings</h1>
        <p className="page-subtitle">Configure products, WhatsApp, AI, agents, notifications, and themes</p>
      </div>

      <Tabs defaultValue="durations" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="bg-card/50 border border-border/30 rounded-xl p-1 inline-flex w-auto">
            {/* Product Settings */}
            <TabsTrigger value="durations" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs"><Clock className="h-3.5 w-3.5 mr-1.5" />Durations</TabsTrigger>
            <TabsTrigger value="sharing" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs"><Tag className="h-3.5 w-3.5 mr-1.5" />Sharing</TabsTrigger>
            <TabsTrigger value="discounts" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs"><Percent className="h-3.5 w-3.5 mr-1.5" />Discounts</TabsTrigger>
            {/* Separator */}
            <div className="w-px h-5 bg-border/50 mx-1 self-center" />
            {/* WhatsApp Settings */}
            <TabsTrigger value="wa-api" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-xs"><Globe className="h-3.5 w-3.5 mr-1.5" />WA API</TabsTrigger>
            <TabsTrigger value="wa-ai" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-xs"><Bot className="h-3.5 w-3.5 mr-1.5" />AI</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="wa-agents" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-xs"><Users className="h-3.5 w-3.5 mr-1.5" />Agents</TabsTrigger>
            )}
            <TabsTrigger value="wa-notifications" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-xs"><Bell className="h-3.5 w-3.5 mr-1.5" />Alerts</TabsTrigger>
            <TabsTrigger value="wa-theme" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-xs"><Palette className="h-3.5 w-3.5 mr-1.5" />Theme</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Product Duration Plans */}
        <TabsContent value="durations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Product Duration Plans</h2>
            {isAdmin && (
              <Dialog open={showAddDuration} onOpenChange={setShowAddDuration}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" />Add Duration</Button>
                </DialogTrigger>
                <DialogContent className="glass-strong rounded-2xl border-border/30">
                  <DialogHeader><DialogTitle>Add Duration Plan</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Product</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent className="glass-strong rounded-xl border-border/30">{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Duration</Label>
                        <Input type="number" min={1} value={durationForm.duration_value} onChange={e => setDurationForm({ ...durationForm, duration_value: Number(e.target.value) })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
                      </div>
                      <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                        <Select value={durationForm.duration_type} onValueChange={(v: any) => setDurationForm({ ...durationForm, duration_type: v })}>
                          <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass-strong rounded-xl border-border/30">
                            <SelectItem value="day">Day</SelectItem><SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem><SelectItem value="year">Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Price Multiplier</Label>
                      <Input type="number" step={0.01} min={0.1} value={durationForm.price_multiplier} onChange={e => setDurationForm({ ...durationForm, price_multiplier: Number(e.target.value) })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" />
                    </div>
                    <Button onClick={addDuration} className="w-full rounded-xl gradient-primary text-white border-0">Save Duration</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {products.map(product => (
            <div key={product.id} className="premium-card !p-5">
              <h3 className="font-semibold text-sm mb-3">{product.name}</h3>
              {product.product_durations?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No durations configured</p>
              ) : (
                <div className="space-y-2">
                  {product.product_durations?.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/20 border border-border/20">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary/70 border-primary/10 rounded-lg font-medium">
                          {d.duration_value} {d.duration_type}(s)
                        </Badge>
                        <span className="text-xs text-muted-foreground">×{Number(d.price_multiplier)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={d.is_active} onCheckedChange={() => toggleDuration(d.id, d.is_active)} disabled={!isAdmin} />
                        {isAdmin && <Button size="sm" variant="ghost" onClick={() => deleteDuration(d.id)} className="h-7 w-7 text-destructive/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Sharing */}
        <TabsContent value="sharing" className="space-y-4">
          <h2 className="text-lg font-semibold">Sharing Standards per Variant</h2>
          <div className="premium-table">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20 hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Product</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Variant</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Price</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Sharing Std.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.flatMap(p => (p.product_variants || []).map(v => (
                  <TableRow key={v.id} className="border-border/10 hover:bg-card/40 transition-colors">
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{v.name}</TableCell>
                    <TableCell className="mono text-sm">${Number(v.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Input type="number" min={1} className="w-20 h-8 bg-secondary/30 border-border/30 rounded-lg text-sm" defaultValue={v.sharing_standard || 1}
                          onBlur={e => updateVariant(v.id, "sharing_standard", Number(e.target.value))} />
                      ) : <span className="text-sm">{v.sharing_standard || 1}</span>}
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Discounts */}
        <TabsContent value="discounts" className="space-y-4">
          <h2 className="text-lg font-semibold">Discount Rules per Variant</h2>
          <div className="premium-table">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20 hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Product</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Variant</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Max Discount %</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Max Discount $</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.flatMap(p => (p.product_variants || []).map(v => (
                  <TableRow key={v.id} className="border-border/10 hover:bg-card/40 transition-colors">
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{v.name}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Input type="number" min={0} max={100} step={0.1} className="w-20 h-8 bg-secondary/30 border-border/30 rounded-lg text-sm"
                          defaultValue={Number(v.max_discount_percent) || 0}
                          onBlur={e => updateVariant(v.id, "max_discount_percent", Number(e.target.value))} />
                      ) : <span className="text-sm">{Number(v.max_discount_percent) || 0}%</span>}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Input type="number" min={0} step={0.01} className="w-20 h-8 bg-secondary/30 border-border/30 rounded-lg text-sm"
                          defaultValue={Number(v.max_discount_fixed) || 0}
                          onBlur={e => updateVariant(v.id, "max_discount_fixed", Number(e.target.value))} />
                      ) : <span className="mono text-sm">${Number(v.max_discount_fixed) || 0}</span>}
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* WhatsApp Settings Tabs */}
        <TabsContent value="wa-api"><WhatsAppApiSettings /></TabsContent>
        <TabsContent value="wa-ai"><WhatsAppAiSettings /></TabsContent>
        {isAdmin && <TabsContent value="wa-agents"><WhatsAppAgentSettings /></TabsContent>}
        <TabsContent value="wa-notifications"><WhatsAppNotificationSettings /></TabsContent>
        <TabsContent value="wa-theme"><WhatsAppThemeSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
