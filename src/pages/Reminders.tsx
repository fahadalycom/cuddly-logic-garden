import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClipboard } from "@/hooks/useClipboard";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Clock, Check, X, RotateCcw } from "lucide-react";
import type { Reminder, Client } from "@/types/database";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<(Reminder & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { copy } = useClipboard();

  const fetch = async () => {
    const { data } = await supabase.from("reminders").select("*, clients(*)").eq("response", "pending").order("scheduled_date");
    setReminders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const markResponse = async (id: string, response: string) => {
    await supabase.from("reminders").update({ response: response as any, sent_at: new Date().toISOString(), sent_by: user!.id }).eq("id", id);
    toast.success(`Marked as ${response}`);
    fetch();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reminder Queue</h1>
      {reminders.length === 0 ? <EmptyState title="No pending reminders" /> : (
        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Client</TableHead><TableHead>#</TableHead><TableHead>Scheduled</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>{reminders.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.clients?.name}</TableCell>
                <TableCell>Reminder #{r.reminder_number}</TableCell>
                <TableCell>{r.scheduled_date}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => markResponse(r.id, "renewed")}><Check className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => markResponse(r.id, "refused")}><X className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => markResponse(r.id, "deferred")}><RotateCcw className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
