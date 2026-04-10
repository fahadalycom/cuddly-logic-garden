import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, MessageCircle, XCircle, ExternalLink, Bell } from "lucide-react";
import type { Subscription, Client } from "@/types/database";

export default function RenewalsPage() {
  const [subs, setSubs] = useState<(Subscription & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTerminate, setShowTerminate] = useState<string | null>(null);
  const [termForm, setTermForm] = useState({ reason: "", notes: "", password_changed: false, access_removed: false });
  const { user } = useAuth();
  const { copy } = useClipboard();

  const fetchData = async () => {
    const { data } = await supabase.from("subscriptions").select("*, clients(*)").in("status", ["active", "expiring"]).order("end_date");
    setSubs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const daysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / (86400000));

  const createReminder = async (sub: Subscription & { clients: Client }) => {
    await supabase.from("reminders").insert({
      subscription_id: sub.id, client_id: sub.client_id,
      scheduled_date: new Date().toISOString().slice(0, 10), reminder_number: 1,
    });
    toast.success("Reminder created!");
  };

  const terminateSub = async () => {
    if (!showTerminate || !user) return;
    await supabase.from("terminations").insert({
      subscription_id: showTerminate, reason: termForm.reason, notes: termForm.notes,
      password_changed: termForm.password_changed, access_removed: termForm.access_removed,
      completed_by: user.id, completed_at: new Date().toISOString(),
    });
    await supabase.from("subscriptions").update({ status: "terminated" }).eq("id", showTerminate);
    toast.success("Subscription terminated");
    setShowTerminate(null);
    setTermForm({ reason: "", notes: "", password_changed: false, access_removed: false });
    fetchData();
  };

  const sendReminder = (sub: Subscription & { clients: Client }) => {
    const days = daysLeft(sub.end_date);
    const msg = `Hi ${sub.clients?.name}! 👋\n\nYour subscription expires in ${days} days (${new Date(sub.end_date).toLocaleDateString()}).\n\nWould you like to renew? Reply YES to continue! ✨`;
    copy(msg, "Renewal reminder");
  };

  const openWhatsApp = (sub: Subscription & { clients: Client }) => {
    const phone = (sub.clients?.whatsapp_number || sub.clients?.phone || "").replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  const expiring = subs.filter(s => daysLeft(s.end_date) <= 7).length;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2"><RefreshCw className="h-6 w-6 text-primary" />Renewals</h1>
          {expiring > 0 && <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">{expiring} expiring</Badge>}
        </div>
        <p className="page-subtitle">{subs.length} active/expiring subscriptions</p>
      </div>

      {subs.length === 0 ? <EmptyState title="No active subscriptions" /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">End Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Days Left</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{subs.map(s => {
              const days = daysLeft(s.end_date);
              return (
                <TableRow key={s.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell className="font-medium text-sm">{s.clients?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(s.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold ${days <= 3 ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-emerald-400"}`}>{days}d</span>
                  </TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => sendReminder(s)} className="h-7 rounded-lg text-xs"><MessageCircle className="h-3.5 w-3.5 mr-1" />Remind</Button>
                      <Button size="sm" variant="ghost" onClick={() => createReminder(s)} className="h-7 rounded-lg text-xs"><Bell className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openWhatsApp(s)} className="h-7 rounded-lg text-xs text-emerald-400"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowTerminate(s.id)} className="h-7 rounded-lg text-xs text-destructive/60 hover:text-destructive"><XCircle className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!showTerminate} onOpenChange={() => setShowTerminate(null)}>
        <DialogContent className="glass-strong rounded-2xl border-border/30">
          <DialogHeader><DialogTitle>Terminate Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Reason</Label>
              <Input value={termForm.reason} onChange={e => setTermForm({ ...termForm, reason: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea value={termForm.notes} onChange={e => setTermForm({ ...termForm, notes: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
            <div className="space-y-3 p-3 rounded-xl bg-secondary/20 border border-border/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={termForm.password_changed} onCheckedChange={(v) => setTermForm({ ...termForm, password_changed: !!v })} />Password Changed
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={termForm.access_removed} onCheckedChange={(v) => setTermForm({ ...termForm, access_removed: !!v })} />Access Removed
              </label>
            </div>
            <Button onClick={terminateSub} className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0">Terminate Subscription</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
