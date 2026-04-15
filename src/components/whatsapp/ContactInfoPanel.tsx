import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  X, Phone, Mail, MapPin, ShoppingCart, CreditCard, Tag, StickyNote,
  Plus, Trash2, Send, User, Calendar, Package, Star, Clock
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ContactInfoPanelProps {
  conversation: any;
  onClose: () => void;
}

const TAG_COLORS = [
  { name: "blue", class: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  { name: "green", class: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { name: "red", class: "bg-red-500/15 text-red-500 border-red-500/30" },
  { name: "amber", class: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { name: "purple", class: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  { name: "pink", class: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
];

export function ContactInfoPanel({ conversation, onClose }: ContactInfoPanelProps) {
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [newNote, setNewNote] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    if (conversation.client_id) fetchClientData();
    fetchTags();
    fetchNotes();
  }, [conversation.id]);

  const fetchClientData = async () => {
    const [clientRes, ordersRes, subsRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", conversation.client_id).single(),
      supabase.from("orders").select("*, order_items(*, products(name))").eq("client_id", conversation.client_id).order("created_at", { ascending: false }).limit(5),
      supabase.from("subscriptions").select("*, products(name)").eq("client_id", conversation.client_id).order("end_date", { ascending: false }).limit(5),
    ]);
    setClient(clientRes.data);
    setOrders(ordersRes.data || []);
    setSubscriptions(subsRes.data || []);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from("wa_conversation_tags").select("*").eq("conversation_id", conversation.id);
    setTags(data || []);
  };

  const fetchNotes = async () => {
    const { data } = await supabase.from("wa_internal_notes").select("*").eq("conversation_id", conversation.id).order("created_at", { ascending: false });
    setNotes(data || []);
  };

  const addTag = async () => {
    if (!newTag.trim() || !user) return;
    const { error } = await supabase.from("wa_conversation_tags").insert({
      conversation_id: conversation.id,
      tag: newTag.trim(),
      color: selectedColor,
      created_by: user.id,
    });
    if (error) { toast.error("Tag already exists"); return; }
    setNewTag("");
    setShowTagInput(false);
    fetchTags();
  };

  const removeTag = async (id: string) => {
    await supabase.from("wa_conversation_tags").delete().eq("id", id);
    fetchTags();
  };

  const addNote = async () => {
    if (!newNote.trim() || !user) return;
    await supabase.from("wa_internal_notes").insert({
      conversation_id: conversation.id,
      author_id: user.id,
      content: newNote.trim(),
    });
    setNewNote("");
    fetchNotes();
  };

  const removeNote = async (id: string) => {
    await supabase.from("wa_internal_notes").delete().eq("id", id);
    fetchNotes();
  };

  const getTagColorClass = (color: string) => TAG_COLORS.find(c => c.name === color)?.class || TAG_COLORS[0].class;

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
      expiring: "bg-amber-500/15 text-amber-500 border-amber-500/30",
      expired: "bg-red-500/15 text-red-500 border-red-500/30",
      delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
      paid_verified: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    };
    return map[status] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="w-80 border-l border-border flex flex-col bg-card/50 animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contact Info</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Contact header */}
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/20">
              <span className="text-xl font-bold text-primary-foreground">
                {(conversation.customer_name || conversation.customer_phone || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <h4 className="font-semibold">{conversation.customer_name || "Unknown"}</h4>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> {conversation.customer_phone}
            </p>
            {client?.email && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" /> {client.email}
              </p>
            )}
            {client && (
              <Badge variant="outline" className={`mt-2 text-[10px] ${
                client.trust_tag === "super_client" ? "border-amber-500/50 text-amber-500" :
                client.trust_tag === "trusted" ? "border-emerald-500/50 text-emerald-500" :
                "border-muted-foreground/30 text-muted-foreground"
              }`}>
                <Star className="h-2.5 w-2.5 mr-0.5" />
                {client.trust_tag === "super_client" ? "VIP" : client.trust_tag === "trusted" ? "Trusted" : "New"}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </h5>
              <Button variant="ghost" size="icon" className="h-5 w-5 rounded" onClick={() => setShowTagInput(!showTagInput)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <Badge key={t.id} variant="outline" className={`text-[10px] px-2 py-0.5 ${getTagColorClass(t.color)} group cursor-default`}>
                  {t.tag}
                  <button onClick={() => removeTag(t.id)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && !showTagInput && <span className="text-[11px] text-muted-foreground/60">No tags</span>}
            </div>
            {showTagInput && (
              <div className="mt-2 space-y-1.5">
                <Input placeholder="Tag name" value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTag()} className="h-7 text-xs" />
                <div className="flex items-center gap-1">
                  {TAG_COLORS.map(c => (
                    <button key={c.name} onClick={() => setSelectedColor(c.name)}
                      className={`h-5 w-5 rounded-full border-2 ${c.class} ${selectedColor === c.name ? "ring-2 ring-offset-1 ring-primary" : ""}`} />
                  ))}
                  <Button size="sm" className="h-6 text-[10px] ml-auto" onClick={addTag} disabled={!newTag.trim()}>Add</Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Internal Notes */}
          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
              <StickyNote className="h-3 w-3" /> Internal Notes
            </h5>
            <div className="flex gap-1.5 mb-2">
              <Textarea placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)}
                className="min-h-[60px] text-xs resize-none" rows={2} />
              <Button size="icon" className="h-8 w-8 flex-shrink-0 rounded-lg" onClick={addNote} disabled={!newNote.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {notes.map(n => (
                <div key={n.id} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 group">
                  <p className="text-xs leading-relaxed">{n.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    <button onClick={() => removeNote(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {client && (
            <>
              <Separator />

              {/* Recent Orders */}
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                  <ShoppingCart className="h-3 w-3" /> Recent Orders ({orders.length})
                </h5>
                <div className="space-y-2">
                  {orders.map(o => (
                    <div key={o.id} className="p-2.5 rounded-lg border border-border/50 bg-background/50">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[9px] ${getStatusBadge(o.status)}`}>{o.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</span>
                      </div>
                      <div className="mt-1">
                        {o.order_items?.slice(0, 2).map((item: any) => (
                          <p key={item.id} className="text-[11px] text-foreground/80 truncate">
                            <Package className="h-3 w-3 inline mr-1 text-muted-foreground" />
                            {item.products?.name || "Product"}
                          </p>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs font-semibold">${o.total_amount}</span>
                        {o.remaining_due > 0 && <span className="text-[10px] text-amber-500">Due: ${o.remaining_due}</span>}
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <span className="text-[11px] text-muted-foreground/60">No orders</span>}
                </div>
              </div>

              <Separator />

              {/* Subscriptions */}
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Calendar className="h-3 w-3" /> Subscriptions ({subscriptions.length})
                </h5>
                <div className="space-y-2">
                  {subscriptions.map(s => (
                    <div key={s.id} className="p-2.5 rounded-lg border border-border/50 bg-background/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">{s.products?.name || "Subscription"}</span>
                        <Badge variant="outline" className={`text-[9px] ${getStatusBadge(s.status)}`}>{s.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(s.start_date), "MMM d")} – {format(new Date(s.end_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  ))}
                  {subscriptions.length === 0 && <span className="text-[11px] text-muted-foreground/60">No subscriptions</span>}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
