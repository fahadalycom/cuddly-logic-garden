import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { AgentConfigPanel } from "@/components/whatsapp/AgentConfigPanel";
import { QueuePanel } from "@/components/whatsapp/QueuePanel";
import { LoadingState } from "@/components/shared/PageStates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, Clock, Settings } from "lucide-react";

export default function WhatsAppPage() {
  const { user, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sideTab, setSideTab] = useState("chats");
  const [queue, setQueue] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const fetchConversations = async () => {
    let query = supabase
      .from("wa_conversations")
      .select("*, clients(name, phone, whatsapp_number)")
      .order("last_message_at", { ascending: false });

    // Non-admin agents only see their assigned chats
    if (!isAdmin && user) {
      query = query.eq("assigned_agent_id", user.id);
    }

    const { data } = await query;
    setConversations(data || []);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark as read
    await supabase
      .from("wa_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false);

    await supabase
      .from("wa_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
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
    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true);
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
    if (isAdmin) fetchStaff();

    // Realtime subscriptions
    const convChannel = supabase
      .channel("wa-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    const queueChannel = supabase
      .channel("wa-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_queue" }, () => {
        fetchQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(queueChannel);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    fetchMessages(selectedConversation.id);
    fetchAiSuggestions(selectedConversation.id);

    const msgChannel = supabase
      .channel(`wa-messages-${selectedConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wa_messages",
        filter: `conversation_id=eq.${selectedConversation.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [selectedConversation?.id]);

  const handleSendMessage = async (content: string, mediaUrl?: string, mediaType?: string) => {
    if (!selectedConversation || !user) return;

    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        conversation_id: selectedConversation.id,
        content,
        media_url: mediaUrl,
        media_type: mediaType || "text",
        sender_id: user.id,
      },
    });

    if (error) {
      console.error("Send error:", error);
    }
  };

  const handleResolve = async () => {
    if (!selectedConversation || !user) return;
    await supabase.functions.invoke("whatsapp-queue-manager", {
      body: {
        action: "resolve_conversation",
        conversation_id: selectedConversation.id,
        agent_id: user.id,
      },
    });
    setSelectedConversation(null);
  };

  const handleAssign = async (conversationId: string, agentId: string) => {
    await supabase.functions.invoke("whatsapp-queue-manager", {
      body: {
        action: "assign_conversation",
        conversation_id: conversationId,
        agent_id: agentId,
      },
    });
  };

  const handleApproveAi = async (logId: string, response: string) => {
    await supabase
      .from("wa_auto_response_log")
      .update({ agent_approved: true, was_sent: true })
      .eq("id", logId);
    
    if (selectedConversation) {
      await handleSendMessage(response);
    }
    fetchAiSuggestions(selectedConversation?.id);
  };

  const handleRejectAi = async (logId: string) => {
    await supabase
      .from("wa_auto_response_log")
      .update({ agent_approved: false })
      .eq("id", logId);
    fetchAiSuggestions(selectedConversation?.id);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Left Panel */}
      <div className="w-80 lg:w-96 border-r border-border flex flex-col bg-card">
        <Tabs value={sideTab} onValueChange={setSideTab} className="flex flex-col h-full">
          <div className="p-3 border-b border-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chats" className="text-xs gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-xs gap-1">
                <Clock className="h-3.5 w-3.5" />
                Queue
                {queue.length > 0 && (
                  <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 rounded-full">
                    {queue.length}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="agents" className="text-xs gap-1">
                  <Settings className="h-3.5 w-3.5" />
                  Agents
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="chats" className="flex-1 overflow-hidden mt-0">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id}
              onSelect={(conv) => setSelectedConversation(conv)}
            />
          </TabsContent>

          <TabsContent value="queue" className="flex-1 overflow-hidden mt-0">
            <QueuePanel
              queue={queue}
              staff={staff}
              isAdmin={isAdmin}
              onAssign={handleAssign}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="agents" className="flex-1 overflow-hidden mt-0">
              <AgentConfigPanel staff={staff} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col">
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <MessageSquare className="h-16 w-16 mx-auto opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose from the left panel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
