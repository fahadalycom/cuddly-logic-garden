import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Database } from "lucide-react";
import type { SoftwareAccount, Product } from "@/types/database";

export default function InventoryPage() {
  const [accounts, setAccounts] = useState<(SoftwareAccount & { products: Product })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product_id: "", username: "", password_encrypted: "", login_instructions: "", notes: "", capacity: 1 });
  const { user } = useAuth();

  const fetchData = async () => {
    const [a, p] = await Promise.all([
      supabase.from("software_accounts").select("*, products(*)").eq("is_archived", false).order("created_at", { ascending: false }),
      supabase.from("products").select("*").eq("is_active", true),
    ]);
    setAccounts((a.data as any) || []);
    setProducts(p.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addAccount = async () => {
    const { error } = await supabase.from("software_accounts").insert({ ...form, created_by: user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Account added!");
    setShowAdd(false);
    setForm({ product_id: "", username: "", password_encrypted: "", login_instructions: "", notes: "", capacity: 1 });
    fetchData();
  };

  const filtered = accounts.filter((a) => a.products?.name?.toLowerCase().includes(search.toLowerCase()) || a.username?.toLowerCase().includes(search.toLowerCase()));
  const daysOld = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2"><Database className="h-6 w-6 text-primary" />Accounts Inventory</h1>
          <p className="page-subtitle">{accounts.length} accounts in inventory</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gradient-primary text-white border-0 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-1.5" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong rounded-2xl border-border/30">
            <DialogHeader><DialogTitle>Add Software Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent className="glass-strong rounded-xl border-border/30">{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label><Input value={form.password_encrypted} onChange={(e) => setForm({ ...form, password_encrypted: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Instructions</Label><Textarea value={form.login_instructions} onChange={(e) => setForm({ ...form, login_instructions: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
              <Button onClick={addAccount} className="w-full rounded-xl gradient-primary text-white border-0">Save Account</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="search-premium relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
        <Input className="pl-10 bg-card/40 border-border/20 rounded-xl h-11" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? <EmptyState title="No accounts in inventory" /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Product</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Username</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Seats</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{filtered.map((a) => (
              <TableRow key={a.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{a.products?.name}</TableCell>
                <TableCell className="mono text-xs text-muted-foreground">{a.username}</TableCell>
                <TableCell>
                  <span className="mono text-sm">{a.used_seats}<span className="text-muted-foreground/40">/{a.capacity}</span></span>
                </TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>
                  {a.status === "available" && daysOld(a.created_at) > 7 ? (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> {daysOld(a.created_at)}d
                    </span>
                  ) : <span className="text-xs text-muted-foreground/50">{daysOld(a.created_at)}d</span>}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
