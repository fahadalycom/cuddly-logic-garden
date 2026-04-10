import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Star, MessageSquare } from "lucide-react";
import type { Feedback as FeedbackType, Client } from "@/types/database";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<(FeedbackType & { clients: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ client_id: "", type: "feedback" as any, content: "", rating: 5 });
  const { user } = useAuth();

  const fetchData = async () => {
    const [f, c] = await Promise.all([
      supabase.from("feedback").select("*, clients(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").eq("is_archived", false),
    ]);
    setFeedback((f.data as any) || []);
    setClients(c.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addFeedback = async () => {
    await supabase.from("feedback").insert({ ...form, collected_by: user!.id });
    toast.success("Feedback recorded!");
    setShowAdd(false);
    fetchData();
  };

  if (loading) return <LoadingState />;

  const avgRating = feedback.filter(f => f.rating).length > 0
    ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" />Feedback & Reviews</h1>
          <p className="page-subtitle">
            {feedback.length} entries collected
            {avgRating && <> · <Star className="h-3 w-3 inline text-amber-400 fill-amber-400" /> {avgRating} avg rating</>}
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gradient-primary text-white border-0 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-1.5" /> Add Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong rounded-2xl border-border/30">
            <DialogHeader><DialogTitle>Record Feedback</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent className="glass-strong rounded-xl border-border/30">{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong rounded-xl border-border/30">
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
              <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
              <Button onClick={addFeedback} className="w-full rounded-xl gradient-primary text-white border-0">Save Feedback</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {feedback.length === 0 ? <EmptyState title="No feedback yet" description="Collect feedback from your clients." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Rating</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Content</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{feedback.map((f) => (
              <TableRow key={f.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{f.clients?.name}</TableCell>
                <TableCell>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-lg bg-secondary/30 text-muted-foreground border border-border/20">{f.type.replace("_", " ")}</span>
                </TableCell>
                <TableCell>
                  {f.rating ? (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < f.rating! ? 'text-amber-400 fill-amber-400' : 'text-border/40'}`} />
                      ))}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground truncate">{f.content}</TableCell>
                <TableCell className="text-xs text-muted-foreground/60">{new Date(f.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
