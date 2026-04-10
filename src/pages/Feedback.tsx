import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Star } from "lucide-react";
import type { Feedback as FeedbackType, Client } from "@/types/database";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<(FeedbackType & { clients: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ client_id: "", type: "feedback" as any, content: "", rating: 5 });
  const { user } = useAuth();

  const fetch = async () => {
    const [f, c] = await Promise.all([
      supabase.from("feedback").select("*, clients(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").eq("is_archived", false),
    ]);
    setFeedback((f.data as any) || []);
    setClients(c.data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const addFeedback = async () => {
    await supabase.from("feedback").insert({ ...form, collected_by: user!.id });
    toast.success("Feedback recorded!");
    setShowAdd(false);
    fetch();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feedback & Reviews</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Feedback</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="review">Review</SelectItem><SelectItem value="feedback">Feedback</SelectItem><SelectItem value="follow_up">Follow-up</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Rating</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
              <div><Label>Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <Button onClick={addFeedback} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {feedback.length === 0 ? <EmptyState title="No feedback yet" /> : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Rating</TableHead><TableHead>Content</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>{feedback.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.clients?.name}</TableCell>
                <TableCell className="capitalize">{f.type}</TableCell>
                <TableCell>{f.rating ? <span className="flex items-center gap-0.5">{f.rating}<Star className="h-3 w-3 text-amber-500 fill-amber-500" /></span> : "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{f.content}</TableCell>
                <TableCell className="text-xs">{new Date(f.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
