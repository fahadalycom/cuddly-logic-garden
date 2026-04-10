import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bell, Check, X, RotateCcw, CalendarIcon, MessageCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reminder, Client } from "@/types/database";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<(Reminder & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deferReminderId, setDeferReminderId] = useState<string | null>(null);
  const [deferDate, setDeferDate] = useState<Date>();
  const { user } = useAuth();
  const { copy } = useClipboard();

  const fetchData = async () => {
    const { data } = await supabase.from("reminders").select("*, clients(*)").eq("response", "pending").order("scheduled_date");
    setReminders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const markResponse = async (id: string, response: string) => {
    await supabase.from("reminders").update({ response: response as any, sent_at: new Date().toISOString(), sent_by: user!.id }).eq("id", id);
    toast.success(`Marked as ${response}`);
    fetchData();
  };

  const deferReminder = async () => {
    if (!deferReminderId || !deferDate) return;
    await supabase.from("reminders").update({ response: "deferred" as any, deferred_to: format(deferDate, "yyyy-MM-dd"), sent_at: new Date().toISOString(), sent_by: user!.id }).eq("id", deferReminderId);
    const orig = reminders.find(r => r.id === deferReminderId);
    if (orig) {
      await supabase.from("reminders").insert({
        subscription_id: orig.subscription_id, client_id: orig.client_id,
        scheduled_date: format(deferDate, "yyyy-MM-dd"), reminder_number: orig.reminder_number + 1,
      });
    }
    toast.success("Deferred to " + format(deferDate, "PP"));
    setDeferReminderId(null);
    setDeferDate(undefined);
    fetchData();
  };

  const copyWhatsAppMsg = (r: Reminder & { clients: Client }) => {
    const msg = `Hi ${r.clients?.name}! 👋\n\nThis is a reminder about your subscription renewal (Reminder #${r.reminder_number}).\n\nPlease let us know if you'd like to renew! ✨`;
    copy(msg, "Reminder message");
  };

  const openWhatsApp = (r: Reminder & { clients: Client }) => {
    const phone = (r.clients?.whatsapp_number || r.clients?.phone || "").replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2"><Bell className="h-6 w-6 text-primary" />Reminders</h1>
          {reminders.length > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold gradient-primary text-white">{reminders.length}</span>}
        </div>
        <p className="page-subtitle">Pending renewal reminders</p>
      </div>

      {reminders.length === 0 ? <EmptyState title="No pending reminders" description="All reminders have been processed." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">#</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Scheduled</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{reminders.map(r => (
              <TableRow key={r.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{r.clients?.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5 text-primary/70 border-primary/10 rounded-lg">#{r.reminder_number}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.scheduled_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => copyWhatsAppMsg(r)} className="h-7 rounded-lg text-xs" title="Copy message"><MessageCircle className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openWhatsApp(r)} className="h-7 rounded-lg text-xs text-emerald-400" title="Open WhatsApp"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => markResponse(r.id, "renewed")} className="h-7 rounded-lg text-xs text-emerald-400" title="Renewed"><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => markResponse(r.id, "refused")} className="h-7 rounded-lg text-xs text-destructive/60" title="Refused"><X className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeferReminderId(r.id)} className="h-7 rounded-lg text-xs text-amber-400" title="Defer"><RotateCcw className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deferReminderId} onOpenChange={() => setDeferReminderId(null)}>
        <DialogContent className="glass-strong rounded-2xl border-border/30">
          <DialogHeader><DialogTitle>Defer Reminder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left rounded-xl bg-secondary/30 border-border/30", !deferDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />{deferDate ? format(deferDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={deferDate} onSelect={setDeferDate} initialFocus className={cn("p-3 pointer-events-auto")} disabled={(date) => date < new Date()} />
              </PopoverContent>
            </Popover>
            <Button onClick={deferReminder} disabled={!deferDate} className="w-full rounded-xl gradient-primary text-white border-0">Defer to Selected Date</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
