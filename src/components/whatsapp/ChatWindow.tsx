import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Send, Paperclip, MoreVertical, CheckCircle, UserPlus, Bot,
  Image as ImageIcon, Video, FileText, Mic, Sparkles, X, Check, CheckCheck,
  Phone, ExternalLink, Smile, Reply, Copy, Clock, Search,
  ChevronDown, ArrowDown, Shield, Zap, MessageSquare, Download, Loader2, Eye, File
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

// In-memory blob cache to avoid re-fetching from R2
const mediaBlobCache = new Map<string, string>();

function getMediaTypeIcon(mediaType: string) {
  switch (mediaType) {
    case "image": return ImageIcon;
    case "video": return Video;
    case "audio": return Mic;
    case "document": return FileText;
    case "sticker": return ImageIcon;
    default: return File;
  }
}

function LazyMedia({ mediaKey, mediaType, mimeType, filename }: {
  mediaKey: string;
  mediaType: string;
  mimeType?: string;
  filename?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(mediaBlobCache.get(mediaKey) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMedia = useCallback(async () => {
    if (blobUrl || loading) return;
    setLoading(true);
    setError(false);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/whatsapp-media?key=${encodeURIComponent(mediaKey)}`;
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(url, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (!resp.ok) throw new Error("Failed to load");

      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      mediaBlobCache.set(mediaKey, objectUrl);
      setBlobUrl(objectUrl);
    } catch (e) {
      console.error("Media load error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [mediaKey, blobUrl, loading]);

  const TypeIcon = getMediaTypeIcon(mediaType);

  // If loaded, show the actual media
  if (blobUrl) {
    if (mediaType === "image" || mediaType === "sticker") {
      return (
        <div className="rounded-lg overflow-hidden mb-2 -mx-1 -mt-0.5 relative group/media">
          <img src={blobUrl} alt="" className="max-w-full object-cover" />
          <a
            href={blobUrl}
            download={filename || `media.${mimeType?.split("/")[1] || "jpg"}`}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity"
          >
            <Download className="h-3.5 w-3.5 text-white" />
          </a>
        </div>
      );
    }
    if (mediaType === "video") {
      return (
        <div className="rounded-lg overflow-hidden mb-2 -mx-1 -mt-0.5">
          <video src={blobUrl} controls className="max-w-full" />
        </div>
      );
    }
    if (mediaType === "audio") {
      return (
        <div className="py-1">
          <audio src={blobUrl} controls className="w-full h-8" />
        </div>
      );
    }
    // Document or other
    return (
      <a
        href={blobUrl}
        download={filename || "document"}
        className="flex items-center gap-3 p-2.5 bg-background/10 rounded-lg mb-2 hover:bg-background/20 transition-colors"
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{filename || "Document"}</p>
          <p className="text-[10px] opacity-60">{mimeType || "file"}</p>
        </div>
        <Download className="h-4 w-4 opacity-50" />
      </a>
    );
  }

  // Placeholder — click to load
  return (
    <button
      onClick={loadMedia}
      disabled={loading}
      className="flex items-center gap-3 p-3 rounded-lg mb-2 w-full text-left transition-all border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
    >
      <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
        {loading ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <TypeIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">
          {loading ? "Loading..." : filename || `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} file`}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {loading ? "Fetching from storage..." : "Click to load"}
        </p>
      </div>
      {!loading && (
        <Eye className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = "Today";
  else if (isYesterday(date)) label = "Yesterday";
  else label = format(date, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

function MessageBubble({ msg, isGrouped }: { msg: any; isGrouped: boolean }) {
  const isCustomer = msg.sender_type === "customer";
  const isAi = msg.sender_type === "ai";
  const isSystem = msg.sender_type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  const handleCopy = () => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content);
      toast.success("Copied to clipboard");
    }
  };

  const hasMedia = msg.media_url && msg.media_type !== "text";

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"} ${isGrouped ? "mt-0.5" : "mt-3"} group`}>
      <div className="relative max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-2.5 relative shadow-sm ${
            isCustomer
              ? "bg-card border border-border/60 rounded-tl-sm"
              : isAi
              ? "bg-gradient-to-br from-amber-500/15 to-amber-600/10 border border-amber-500/20 text-foreground rounded-tr-sm"
              : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm shadow-primary/20"
          }`}
        >
          {isAi && !isGrouped && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Bot className="h-2.5 w-2.5 text-amber-500" />
              </div>
              <span className="text-[10px] font-semibold text-amber-500">AI Assistant</span>
            </div>
          )}

          {/* Lazy-loaded media */}
          {hasMedia && (
            <LazyMedia
              mediaKey={msg.media_url}
              mediaType={msg.media_type}
              mimeType={msg.media_mime_type}
              filename={msg.media_filename}
            />
          )}

          {msg.content && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={`text-[10px] ${isCustomer ? "text-muted-foreground" : "opacity-60"}`}>
              {format(new Date(msg.created_at), "HH:mm")}
            </span>
            {!isCustomer && !isAi && (
              <CheckCheck className={`h-3 w-3 ${msg.is_read ? "text-blue-400" : "opacity-50"}`} />
            )}
          </div>
        </div>

        {/* Hover actions */}
        <div className={`absolute top-0 ${isCustomer ? "-right-8" : "-left-8"} hidden group-hover:flex flex-col gap-0.5`}>
          <button onClick={handleCopy} className="h-6 w-6 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors">
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatWindow({
  conversation, messages, templates, aiSuggestions,
  onSend, onResolve, onApproveAi, onRejectAi, isAdmin, staff, onAssign,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setSending(true);
    setInput("");
    await onSend(msg);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Determine media type
      let mediaType = "document";
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("video/")) mediaType = "video";
      else if (file.type.startsWith("audio/")) mediaType = "audio";

      // Upload to R2 via edge function
      const { data, error } = await supabase.functions.invoke("whatsapp-media", {
        body: { data: base64, mime_type: file.type, filename: file.name },
      });

      if (error) throw error;

      // Send the message with the R2 key
      const caption = input.trim() || undefined;
      await onSend(caption || "", data.key, mediaType);
      setInput("");
      toast.success("Media sent successfully");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTemplateSelect = (template: any) => {
    setInput(template.body);
    setShowTemplates(false);
    setTemplateSearch("");
    inputRef.current?.focus();
  };

  const openWhatsApp = () => {
    const phone = conversation.customer_phone?.replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.body.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Group messages by date
  const messagesWithDates: { type: "date" | "message"; date?: Date; msg?: any; isGrouped?: boolean }[] = [];
  let lastDate: string | null = null;
  let lastSender: string | null = null;

  messages.forEach((msg, i) => {
    const msgDate = new Date(msg.created_at);
    const dateKey = format(msgDate, "yyyy-MM-dd");

    if (dateKey !== lastDate) {
      messagesWithDates.push({ type: "date", date: msgDate });
      lastDate = dateKey;
      lastSender = null;
    }

    const isGrouped = lastSender === msg.sender_type &&
      i > 0 &&
      (msgDate.getTime() - new Date(messages[i - 1].created_at).getTime()) < 60000;

    messagesWithDates.push({ type: "message", msg, isGrouped });
    lastSender = msg.sender_type;
  });

  const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    active: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Zap },
    waiting: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
    resolved: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: CheckCircle },
    archived: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: Shield },
  };

  const status = statusConfig[conversation.status] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-primary-foreground">
                {(conversation.customer_name || conversation.customer_phone || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
              conversation.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40"
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{conversation.customer_name || conversation.customer_phone}</p>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border ${status.bg} ${status.color}`}>
                <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                {conversation.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {conversation.customer_phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={openWhatsApp}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in WhatsApp</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onResolve} className="text-emerald-500">
                <CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved
              </DropdownMenuItem>
              {isAdmin && staff.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Assign to Agent
                  </DropdownMenuLabel>
                  {staff.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => onAssign(conversation.id, s.user_id)}>
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-[10px] font-bold text-primary">
                        {s.full_name?.charAt(0)}
                      </div>
                      {s.full_name}
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
        <div className="px-5 py-3 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-b border-amber-500/15">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-amber-500" />
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">AI Suggestions</span>
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500">
              {aiSuggestions.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-card/60 border border-border/50">
                <p className="text-xs flex-1 text-foreground/80 leading-relaxed">{s.suggested_response}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge variant="outline" className={`text-[9px] px-1.5 ${
                    s.confidence === "high" ? "border-emerald-500/50 text-emerald-500" :
                    s.confidence === "medium" ? "border-amber-500/50 text-amber-500" :
                    "border-red-500/50 text-red-500"
                  }`}>
                    {s.confidence}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-emerald-500/10" onClick={() => onApproveAi(s.id, s.suggested_response)}>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send this response</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-destructive/10" onClick={() => onRejectAi(s.id)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dismiss</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-2 bg-gradient-to-b from-muted/10 to-muted/5"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.02) 0%, transparent 50%)"
        }}
      >
        {messagesWithDates.map((item, i) => {
          if (item.type === "date" && item.date) {
            return <DateSeparator key={`date-${i}`} date={item.date} />;
          }
          if (item.type === "message" && item.msg) {
            return <MessageBubble key={item.msg.id} msg={item.msg} isGrouped={!!item.isGrouped} />;
          }
          return null;
        })}

        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-2 py-20">
              <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
                <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/60">Send a message to start the conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <div className="absolute bottom-24 right-8">
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileSelect}
      />

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            <span className="text-xs text-primary font-medium">Uploading file...</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-lg" onClick={() => setShowTemplates(true)}>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Templates</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 rounded-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach file</TooltipContent>
          </Tooltip>

          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-[40px] max-h-[120px] resize-none pr-3 rounded-xl bg-muted/30 border-transparent focus:border-primary/30 focus:bg-background transition-colors text-sm"
            />
          </div>

          <Button
            size="icon"
            className={`h-9 w-9 flex-shrink-0 rounded-xl transition-all ${
              input.trim()
                ? "bg-primary hover:bg-primary/90 shadow-sm shadow-primary/30"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send className={`h-4 w-4 ${sending ? "animate-pulse" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Message Templates
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left p-3.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold group-hover:text-primary transition-colors">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body}</p>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No templates found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
