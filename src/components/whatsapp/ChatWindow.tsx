import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Send, Paperclip, MoreVertical, CheckCircle, UserPlus, Bot,
  Image as ImageIcon, Video, FileText, Mic, Sparkles, X, Check,
  Phone, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface ChatWindowProps {
  conversation: any;
  messages: any[];
  templates: any[];
  aiSuggestions: any[];
  onSend: (content: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  onResolve: () => Promise<void>;
  onApproveAi: (logId: string, response: string) => Promise<void>;
  onRejectAi: (logId: string) => Promise<void>;
  isAdmin: boolean;
  staff: any[];
  onAssign: (conversationId: string, agentId: string) => Promise<void>;
}

export function ChatWindow({
  conversation, messages, templates, aiSuggestions,
  onSend, onResolve, onApproveAi, onRejectAi, isAdmin, staff, onAssign,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await onSend(input.trim());
    setInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateSelect = (template: any) => {
    setInput(template.body);
    setShowTemplates(false);
  };

  const openWhatsApp = () => {
    const phone = conversation.customer_phone?.replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {(conversation.customer_name || conversation.customer_phone || "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold">{conversation.customer_name || conversation.customer_phone}</p>
            <p className="text-xs text-muted-foreground">{conversation.customer_phone}</p>
          </div>
          <Badge variant={conversation.status === "active" ? "default" : "secondary"} className="text-[10px]">
            {conversation.status}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openWhatsApp}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onResolve} className="text-emerald-500">
                <CheckCircle className="h-4 w-4 mr-2" /> Resolve
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">Assign to</DropdownMenuLabel>
                  {staff.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => onAssign(conversation.id, s.user_id)}>
                      <UserPlus className="h-4 w-4 mr-2" /> {s.full_name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Suggestions Bar */}
      {aiSuggestions.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">AI Suggestions</span>
          </div>
          {aiSuggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-2 mt-1">
              <p className="text-xs flex-1 text-foreground/80">{s.suggested_response}</p>
              <div className="flex gap-1 flex-shrink-0">
                <Badge variant="outline" className="text-[9px]">{s.confidence}</Badge>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onApproveAi(s.id, s.suggested_response)}>
                  <Check className="h-3 w-3 text-emerald-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onRejectAi(s.id)}>
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {messages.map((msg) => {
          const isCustomer = msg.sender_type === "customer";
          const isAi = msg.sender_type === "ai";
          return (
            <div key={msg.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isCustomer
                    ? "bg-card border border-border rounded-bl-sm"
                    : isAi
                    ? "bg-amber-500/20 text-foreground rounded-br-sm"
                    : "bg-primary text-primary-foreground rounded-br-sm"
                }`}
              >
                {isAi && (
                  <div className="flex items-center gap-1 mb-1">
                    <Bot className="h-3 w-3" />
                    <span className="text-[10px] font-medium opacity-70">AI Response</span>
                  </div>
                )}

                {/* Media */}
                {msg.media_url && msg.media_type === "image" && (
                  <img src={msg.media_url} alt="" className="rounded-lg max-w-full mb-1" />
                )}
                {msg.media_url && msg.media_type === "video" && (
                  <video src={msg.media_url} controls className="rounded-lg max-w-full mb-1" />
                )}
                {msg.media_url && msg.media_type === "audio" && (
                  <audio src={msg.media_url} controls className="w-full mb-1" />
                )}
                {msg.media_url && msg.media_type === "document" && (
                  <a
                    href={msg.media_url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 p-2 bg-background/20 rounded mb-1 text-xs"
                  >
                    <FileText className="h-4 w-4" />
                    {msg.media_filename || "Document"}
                  </a>
                )}

                {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}

                <p className={`text-[10px] mt-1 ${isCustomer ? "text-muted-foreground" : "opacity-70"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => setShowTemplates(true)}>
            <FileText className="h-4 w-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10 min-h-[40px]"
            />
          </div>

          <Button
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
                </button>
              ))}
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No templates available</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
