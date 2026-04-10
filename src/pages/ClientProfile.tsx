import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { toast } from "sonner";
import type { Client, Order, Subscription, ClientNote } from "@/types/database";

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("orders").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").eq("client_id", id),
      supabase.from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]).then(([c, o, s, n]) => {
      setClient(c.data);
      setOrders(o.data || []);
      setSubscriptions(s.data || []);
      setNotes(n.data || []);
      setLoading(false);
    });
  }, [id]);

  const addNote = async () => {
    if (!newNote.trim() || !id) return;
    await supabase.from("client_notes").insert({ client_id: id, author_id: user!.id, content: newNote });
    toast.success("Note added");
    setNewNote("");
    const { data } = await supabase.from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false });
    setNotes(data || []);
  };

  if (loading) return <LoadingState />;
  if (!client) return <p>Client not found</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <StatusBadge status={client.trust_tag} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Phone</CardTitle></CardHeader><CardContent>{client.phone || "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Email</CardTitle></CardHeader><CardContent>{client.email || "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Since</CardTitle></CardHeader><CardContent>{new Date(client.created_at).toLocaleDateString()}</CardContent></Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList><TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger><TabsTrigger value="subscriptions">Subscriptions ({subscriptions.length})</TabsTrigger><TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger></TabsList>
        <TabsContent value="orders" className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id} className="p-4 flex items-center justify-between">
              <div><span className="font-mono text-xs">{o.id.slice(0, 8)}</span> · {formatCurrency(Number(o.total_amount))}</div>
              <StatusBadge status={o.status} />
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="subscriptions" className="space-y-2">
          {subscriptions.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between">
              <div>{s.start_date} → {s.end_date}</div>
              <StatusBadge status={s.status} />
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="notes" className="space-y-3">
          <div className="flex gap-2"><Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="flex-1" /><Button onClick={addNote}>Add</Button></div>
          {notes.map((n) => (
            <Card key={n.id} className="p-3"><p className="text-sm">{n.content}</p><p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
