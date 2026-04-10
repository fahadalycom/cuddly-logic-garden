import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClipboard } from "@/hooks/useClipboard";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/template-engine";
import { Archive, MessageCircle, ExternalLink } from "lucide-react";
import type { Client, Order } from "@/types/database";

interface OldClient extends Client {
  lastOrderDate: string;
  totalSpent: number;
  orderCount: number;
}

export default function OldClientsPage() {
  const [clients, setClients] = useState<OldClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { copy } = useClipboard();

  useEffect(() => {
    const fetch = async () => {
      const [clientsRes, ordersRes] = await Promise.all([
        supabase.from("clients").select("*").eq("is_archived", false),
        supabase.from("orders").select("id, client_id, total_amount, created_at, status").eq("status", "delivered"),
      ]);
      const allClients = clientsRes.data || [];
      const allOrders = ordersRes.data || [];
      const now = new Date();
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

      const oldClients: OldClient[] = [];
      for (const client of allClients) {
        const clientOrders = allOrders.filter(o => o.client_id === client.id);
        if (clientOrders.length === 0) continue;
        const lastOrder = clientOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const lastDate = new Date(lastOrder.created_at);
        if (lastDate < twoMonthsAgo) {
          oldClients.push({
            ...client,
            lastOrderDate: lastOrder.created_at,
            totalSpent: clientOrders.reduce((s, o) => s + Number(o.total_amount), 0),
            orderCount: clientOrders.length,
          });
        }
      }
      oldClients.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
      setClients(oldClients);
      setLoading(false);
    };
    fetch();
  }, []);

  const getInactiveMonths = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
  };

  const filtered = clients.filter(c => {
    if (filter === "all") return true;
    const months = getInactiveMonths(c.lastOrderDate);
    if (filter === "2") return months >= 2 && months < 3;
    if (filter === "3") return months >= 3 && months < 4;
    if (filter === "4") return months >= 4;
    return true;
  });

  const sendFollowUp = (client: OldClient) => {
    const months = getInactiveMonths(client.lastOrderDate);
    const msg = `Hi ${client.name}! 👋\n\nWe noticed it's been about ${months} months since your last order with us. We miss you!\n\nWe have some exciting new offers that might interest you. Would you like to hear about them?\n\nReply YES to learn more! 🎉`;
    copy(msg, "Follow-up message");
  };

  const openWhatsApp = (client: OldClient) => {
    const phone = (client.whatsapp_number || client.phone || "").replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Archive className="h-6 w-6 text-primary" />Old Clients Follow-up</h1>
        <p className="page-subtitle">{clients.length} clients inactive for 2+ months</p>
      </div>

      <div className="flex gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 bg-card/40 border-border/20 rounded-xl h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-strong rounded-xl border-border/30">
            <SelectItem value="all">All Inactive</SelectItem>
            <SelectItem value="2">2 months</SelectItem>
            <SelectItem value="3">3 months</SelectItem>
            <SelectItem value="4">4+ months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState title="No inactive clients" description="All clients have been active recently." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Phone</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Last Order</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Inactive</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total Spent</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Orders</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const months = getInactiveMonths(c.lastOrderDate);
                return (
                  <TableRow key={c.id} className="border-border/10 hover:bg-card/40 transition-colors">
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="mono text-xs text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.lastOrderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] rounded-lg font-medium ${months >= 4 ? "bg-red-500/10 text-red-400 border-red-500/20" : months >= 3 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                        {months}mo
                      </Badge>
                    </TableCell>
                    <TableCell className="mono text-sm">{formatCurrency(c.totalSpent)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.orderCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => sendFollowUp(c)} className="rounded-lg h-8 text-xs"><MessageCircle className="h-3.5 w-3.5 mr-1" />Copy</Button>
                        <Button size="sm" variant="ghost" onClick={() => openWhatsApp(c)} className="rounded-lg h-8 text-xs text-emerald-400 hover:text-emerald-300"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
