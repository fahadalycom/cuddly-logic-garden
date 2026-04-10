import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClipboard } from "@/hooks/useClipboard";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Clock, Check, X, RotateCcw } from "lucide-react";
import type { Reminder, Client } from "@/types/database";
import { Badge } from "@/components/ui/badge";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<(Reminder & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2"><Clock className="h-6 w-6 text-primary" />Reminder Queue</h1>
          {reminders.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold gradient-primary text-white">{reminders.length}</span>
          )}
        </div>
        <p className="page-subtitle">Pending reminders to send to clients</p>
      </div>
      {reminders.length === 0 ? <EmptyState title="No pending reminders" description="All reminders have been processed." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Reminder</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Scheduled</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{reminders.map((r) => (
              <TableRow key={r.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{r.clients?.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary/70 border-primary/10 rounded-lg font-medium">
                    #{r.reminder_number}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.scheduled_date}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => markResponse(r.id, "renewed")} className="rounded-lg h-8 w-8 p-0 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" title="Renewed">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markResponse(r.id, "refused")} className="rounded-lg h-8 w-8 p-0 border-red-500/20 text-red-400 hover:bg-red-500/10" title="Refused">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markResponse(r.id, "deferred")} className="rounded-lg h-8 w-8 p-0 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" title="Deferred">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
