import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { AgentConfigPanel } from "@/components/whatsapp/AgentConfigPanel";
import { QueuePanel } from "@/components/whatsapp/QueuePanel";
import { LoadingState } from "@/components/shared/PageStates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageSquare, Clock, Users, Zap, TrendingUp } from "lucide-react";

export default function WhatsAppPage() {
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sideTab, setSideTab] = useState("chats");
  const [queue, setQueue] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  // Track IDs we already have to deduplicate realtime inserts
  const messageIdsRef = useRef<Set<string>>(new Set());

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("wa_conversations")
      .select("*, clients(name, phone, whatsapp_number)")
      .order("last_message_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    const msgs = data || [];
    // Build dedup set
    const ids = new Set(msgs.map((m: any) => m.id));
    messageIdsRef.current = ids;
    setMessages(msgs);
    await supabase.from("wa_messages").update({ is_read: true }).eq("conversation_id", conversationId).eq("is_read", false);
    await supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", conversationId);
  };

  const fetchQueue = async () => {
    const { data } = await supabase
      .from("wa_queue")
      .select("*, wa_conversations(customer_phone, customer_name, last_message_preview, created_at)")
      .eq("status", "waiting")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    setQueue(data || []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("message_templates").select("*").eq("is_active", true);
    setTemplates(data || []);
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from("staff_profiles").select("*").eq("is_active", true);
    setStaff(data || []);
  };

  const fetchAiSuggestions = async (conversationId: string) => {
    const { data } = await supabase
      .from("wa_auto_response_log")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("was_sent", false)
      .is("agent_approved", null)
      .order("created_at", { ascending: false })
      .limit(5);
    setAiSuggestions(data || []);
  };

  useEffect(() => {
    fetchConversations();
    fetchQueue();
    fetchTemplates();
    fetchStaff();

    const convChannel = supabase
      .channel("wa-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => fetchConversations())
      .subscribe();
    const queueChannel = supabase
      .channel("wa-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_queue" }, () => fetchQueue())
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!selectedConversation) return;
    fetchMessages(selectedConversation.id);
    fetchAiSuggestions(selectedConversation.id);

    const msgChannel = supabase
      .channel(`wa-messages-${selectedConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "wa_messages",
        filter: `conversation_id=eq.${selectedConversation.id}`,
      }, (payload) => {
        const newMsg = payload.new as any;
        // Deduplicate: skip if we already have this ID (from optimistic insert or prior fetch)
        if (messageIdsRef.current.has(newMsg.id)) {
          // Update the existing message in-place (replace optimistic with real data)
          setMessages((prev) => prev.map((m) => m.id === newMsg.id ? newMsg : m));
          return;
        }
        // Also check for temp IDs — replace optimistic messages by matching content+time
        setMessages((prev) => {
          // Remove any optimistic message that matches this real one
          const withoutOptimistic = prev.filter((m) => {
            if (!m._optimistic) return true;
            // Match by content similarity
            if (m.content === newMsg.content && m.media_type === newMsg.media_type) return false;
            return true;
          });
          messageIdsRef.current.add(newMsg.id);
          return [...withoutOptimistic, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [selectedConversation?.id]);

  const handleSendMessage = async (content: string, mediaUrl?: string, mediaType?: string, mediaMimeType?: string, mediaFilename?: string) => {
    if (!selectedConversation || !user) return;

    // Optimistic: add message immediately to UI
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMsg = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_type: "agent",
      sender_id: user.id,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType || "text",
      media_mime_type: mediaMimeType || null,
      media_filename: mediaFilename || null,
      is_read: true,
      is_ai_generated: false,
      created_at: new Date().toISOString(),
      whatsapp_message_id: null,
      _optimistic: true,
      _sending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          conversation_id: selectedConversation.id,
          content,
          media_url: mediaUrl,
          media_type: mediaType || "text",
          media_mime_type: mediaMimeType,
          media_filename: mediaFilename,
          sender_id: user.id,
        },
      });
      if (error) throw error;

      // Replace optimistic message with real one from response
      const realMsg = data?.message;
      if (realMsg) {
        messageIdsRef.current.add(realMsg.id);
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...realMsg, _sending: false } : m));
      } else {
        // Edge function succeeded but no message returned — mark as sent
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _sending: false } : m));
      }

      // Check if delivery failed (207 = saved but not delivered)
      if (data && data.success === false) {
        toast.warning("Message saved but delivery failed — check token");
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _failed: true, _sending: false } : m));
      }
    } catch (err) {
      // Mark as failed
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _failed: true, _sending: false } : m));
      toast.error("Message send failed");
      throw err;
    }
  };

  const handleResolve = async () => {
    if (!selectedConversation || !user) return;
    await supabase.functions.invoke("whatsapp-queue-manager", {
      body: { action: "resolve_conversation", conversation_id: selectedConversation.id, agent_id: user.id },
    });
    setSelectedConversation(null);
  };

  const handleAssign = async (conversationId: string, agentId: string) => {
    await supabase.functions.invoke("whatsapp-queue-manager", {
      body: { action: "assign_conversation", conversation_id: conversationId, agent_id: agentId },
    });
  };

  const handleApproveAi = async (logId: string, response: string) => {
    await supabase.from("wa_auto_response_log").update({ agent_approved: true, was_sent: true }).eq("id", logId);
    if (selectedConversation) await handleSendMessage(response);
    fetchAiSuggestions(selectedConversation?.id);
  };

  const handleRejectAi = async (logId: string) => {
    await supabase.from("wa_auto_response_log").update({ agent_approved: false }).eq("id", logId);
    fetchAiSuggestions(selectedConversation?.id);
  };

  const handleBack = () => setSelectedConversation(null);

  if (loading) return <LoadingState />;

  const activeCount = conversations.filter((c) => c.status === "active").length;
  const unreadCount = conversations.filter((c) => c.unread_count > 0).length;

  // Mobile: show chat if selected, else show list
  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            templates={templates}
            aiSuggestions={aiSuggestions}
            onSend={handleSendMessage}
            onResolve={handleResolve}
            onApproveAi={handleApproveAi}
            onRejectAi={handleRejectAi}
            isAdmin={isAdmin}
            staff={staff}
            onAssign={handleAssign}
            onBack={handleBack}
            isMobile
          />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
        {/* Mobile header */}
        <div className="px-4 py-3 border-b border-border bg-card/80">
          <h1 className="text-lg font-bold">WhatsApp</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium">{activeCount} active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">{queue.length} queued</span>
            </div>
          </div>
        </div>

        <Tabs value={sideTab} onValueChange={setSideTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-3 pt-2 pb-1">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="chats" className="text-xs gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-xs gap-1.5 relative">
                <Clock className="h-4 w-4" />
                Queue
                {queue.length > 0 && (
                  <span className="ml-0.5 bg-destructive text-destructive-foreground text-[9px] px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold">
                    {queue.length}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="agents" className="text-xs gap-1.5">
                  <Users className="h-4 w-4" />
                  Agents
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 overflow-hidden mt-0">
            <ConversationList conversations={conversations} selectedId={selectedConversation?.id} onSelect={setSelectedConversation} />
          </TabsContent>
          <TabsContent value="queue" className="flex-1 overflow-hidden mt-0">
            <QueuePanel queue={queue} staff={staff} isAdmin={isAdmin} onAssign={handleAssign} />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="agents" className="flex-1 overflow-hidden mt-0">
              <AgentConfigPanel staff={staff} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background overflow-hidden">
      <div className="w-80 lg:w-96 border-r border-border flex flex-col bg-card/50">
        <div className="px-4 py-2.5 border-b border-border bg-card/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium">{activeCount} active</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">{queue.length} queued</span>
            </div>
          </div>
        </div>

        <Tabs value={sideTab} onValueChange={setSideTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-3 pt-2 pb-1">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="chats" className="text-xs gap-1 data-[state=active]:shadow-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-xs gap-1 relative data-[state=active]:shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                Queue
                {queue.length > 0 && (
                  <span className="ml-0.5 bg-destructive text-destructive-foreground text-[9px] px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold">
                    {queue.length}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="agents" className="text-xs gap-1 data-[state=active]:shadow-sm">
                  <Users className="h-3.5 w-3.5" />
                  Agents
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 overflow-hidden mt-0">
            <ConversationList conversations={conversations} selectedId={selectedConversation?.id} onSelect={setSelectedConversation} />
          </TabsContent>
          <TabsContent value="queue" className="flex-1 overflow-hidden mt-0">
            <QueuePanel queue={queue} staff={staff} isAdmin={isAdmin} onAssign={handleAssign} />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="agents" className="flex-1 overflow-hidden mt-0">
              <AgentConfigPanel staff={staff} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="flex-1 flex flex-col relative">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            templates={templates}
            aiSuggestions={aiSuggestions}
            onSend={handleSendMessage}
            onResolve={handleResolve}
            onApproveAi={handleApproveAi}
            onRejectAi={handleRejectAi}
            isAdmin={isAdmin}
            staff={staff}
            onAssign={handleAssign}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-3xl bg-primary/5 animate-pulse" />
                <div className="absolute inset-3 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-primary/40" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground mt-1">Choose a chat from the left panel to start messaging</p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> AI-powered</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Multi-agent</span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Real-time</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
