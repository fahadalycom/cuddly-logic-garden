import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, Calendar, FileText, RefreshCw, StickyNote, Send } from "lucide-react";
import type { Client, Order, Subscription, ClientNote } from "@/types/database";

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  if (!client) return <div className="text-center py-20 text-muted-foreground">Client not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back & Header */}
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground/50 hover:text-foreground mb-3 -ml-2 rounded-lg" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Clients
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-xl font-bold text-white shadow-lg glow-primary">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
              <StatusBadge status={client.trust_tag} />
            </div>
            <p className="text-sm text-muted-foreground/60 mt-0.5">Client since {new Date(client.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Phone, label: "Phone", value: client.phone || "—" },
          { icon: Mail, label: "Email", value: client.email || "—" },
          { icon: Calendar, label: "Since", value: new Date(client.created_at).toLocaleDateString() },
        ].map((item) => (
          <div key={item.label} className="premium-card !p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">{item.label}</p>
              <p className="text-sm font-medium text-foreground mono">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="bg-card/40 border border-border/20 rounded-xl p-1 h-auto">
          <TabsTrigger value="orders" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <FileText className="h-3.5 w-3.5 mr-1.5" />Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Subs ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <StickyNote className="h-3.5 w-3.5 mr-1.5" />Notes ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-2 stagger-children">
          {orders.length === 0 ? <p className="text-sm text-muted-foreground/50 text-center py-8">No orders yet</p> : orders.map((o) => (
            <div key={o.id} className="premium-card !p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                <span className="text-sm font-medium">{formatCurrency(Number(o.total_amount))}</span>
              </div>
              <StatusBadge status={o.status} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-2 stagger-children">
          {subscriptions.length === 0 ? <p className="text-sm text-muted-foreground/50 text-center py-8">No subscriptions</p> : subscriptions.map((s) => (
            <div key={s.id} className="premium-card !p-4 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">{s.start_date}</span>
                <span className="mx-2 text-muted-foreground/30">→</span>
                <span className="text-muted-foreground">{s.end_date}</span>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="flex gap-3">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="flex-1 bg-secondary/30 border-border/30 rounded-xl min-h-[80px]" />
            <Button onClick={addNote} className="rounded-xl gradient-primary text-white border-0 self-end h-10 px-4">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 stagger-children">
            {notes.map((n) => (
              <div key={n.id} className="premium-card !p-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{n.content}</p>
                <p className="text-[10px] text-muted-foreground/40 mt-2 mono">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
