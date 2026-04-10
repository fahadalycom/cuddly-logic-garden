import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
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
import { Plus, Search, AlertTriangle } from "lucide-react";
import type { SoftwareAccount, Product } from "@/types/database";

export default function InventoryPage() {
  const [accounts, setAccounts] = useState<(SoftwareAccount & { products: Product })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product_id: "", username: "", password_encrypted: "", login_instructions: "", notes: "", capacity: 1 });
  const { user } = useAuth();

  const fetch = async () => {
    const [a, p] = await Promise.all([
      supabase.from("software_accounts").select("*, products(*)").eq("is_archived", false).order("created_at", { ascending: false }),
      supabase.from("products").select("*").eq("is_active", true),
    ]);
    setAccounts((a.data as any) || []);
    setProducts(p.data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const addAccount = async () => {
    const { error } = await supabase.from("software_accounts").insert({ ...form, created_by: user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Account added!");
    setShowAdd(false);
    setForm({ product_id: "", username: "", password_encrypted: "", login_instructions: "", notes: "", capacity: 1 });
    fetch();
  };

  const filtered = accounts.filter((a) => a.products?.name?.toLowerCase().includes(search.toLowerCase()) || a.username?.toLowerCase().includes(search.toLowerCase()));
  const daysOld = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Accounts Inventory</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Software Account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div><Label>Password</Label><Input value={form.password_encrypted} onChange={(e) => setForm({ ...form, password_encrypted: e.target.value })} /></div>
              <div><Label>Capacity (seats)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              <div><Label>Login Instructions</Label><Textarea value={form.login_instructions} onChange={(e) => setForm({ ...form, login_instructions: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={addAccount} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? <EmptyState title="No accounts in inventory" /> : (
        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead><TableHead>Username</TableHead><TableHead>Seats</TableHead><TableHead>Status</TableHead><TableHead>Age</TableHead>
            </TableRow></TableHeader>
            <TableBody>{filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.products?.name}</TableCell>
                <TableCell className="font-mono text-xs">{a.username}</TableCell>
                <TableCell>{a.used_seats}/{a.capacity}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>
                  {a.status === "available" && daysOld(a.created_at) > 7 ? (
                    <span className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> {daysOld(a.created_at)}d unsold</span>
                  ) : <span className="text-xs">{daysOld(a.created_at)}d</span>}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
