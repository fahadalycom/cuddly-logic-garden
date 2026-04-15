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
  Phone, ExternalLink, Copy, Clock, Search, Bell, BellOff, Volume2,
  ArrowDown, Shield, Zap, MessageSquare, Download, Loader2, Eye, File,
  ArrowLeft, Camera, StopCircle, Trash2, Reply, Smile, Info, CornerDownRight,
  Forward, ChevronDown
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/switch";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceNotePlayer } from "./VoiceNotePlayer";
import { EmojiPicker } from "./EmojiPicker";

interface ChatWindowProps {
  conversation: any;
  messages: any[];
  templates: any[];
  aiSuggestions: any[];
  onSend: (content: string, mediaUrl?: string, mediaType?: string, mediaMimeType?: string, mediaFilename?: string, replyToId?: string) => Promise<void>;
  onResolve: () => Promise<void>;
  onApproveAi: (logId: string, response: string) => Promise<void>;
  onRejectAi: (logId: string) => Promise<void>;
  isAdmin: boolean;
  staff: any[];
  onAssign: (conversationId: string, agentId: string) => Promise<void>;
  onBack?: () => void;
  onOpenContactInfo?: () => void;
  isMobile?: boolean;
}

const mediaBlobCache = new Map<string, string>();
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏", "👏"];

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

function LazyMedia({ mediaKey, mediaType, mimeType, filename, isMobile }: {
  mediaKey: string; mediaType: string; mimeType?: string; filename?: string; isMobile?: boolean;
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

  if (blobUrl) {
    if (mediaType === "image" || mediaType === "sticker") {
      return (
        <div className="rounded-xl overflow-hidden mb-1.5 -mx-1 -mt-0.5 relative group/media">
          <img src={blobUrl} alt="" className="max-w-full object-cover" style={{ maxHeight: isMobile ? 220 : 280 }} />
          <a href={blobUrl} download={filename || `media.${mimeType?.split("/")[1] || "jpg"}`}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/media:opacity-100 active:opacity-100 transition-all">
            <Download className="h-4 w-4 text-white" />
          </a>
        </div>
      );
    }
    if (mediaType === "video") {
      return <div className="rounded-xl overflow-hidden mb-1.5 -mx-1 -mt-0.5"><video src={blobUrl} controls className="max-w-full" style={{ maxHeight: isMobile ? 220 : 280 }} /></div>;
    }
    if (mediaType === "audio") return null;
    return (
      <a href={blobUrl} download={filename || "document"} className="flex items-center gap-3 p-3 bg-background/10 rounded-xl mb-1.5 hover:bg-background/20 active:bg-background/30 transition-colors">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{filename || "Document"}</p><p className="text-[10px] opacity-60">{mimeType || "file"}</p></div>
        <Download className="h-4 w-4 opacity-50" />
      </a>
    );
  }

  return (
    <button onClick={loadMedia} disabled={loading}
      className="flex items-center gap-3 p-3 rounded-xl mb-1.5 w-full text-left transition-all border border-dashed border-border/60 hover:border-primary/40 active:border-primary/60 hover:bg-primary/5 disabled:opacity-60">
      <div className="h-11 w-11 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
        {loading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <TypeIcon className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{loading ? "Loading..." : filename || `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} file`}</p>
        <p className="text-[10px] text-muted-foreground">{loading ? "Fetching from storage..." : "Tap to load"}</p>
      </div>
      {!loading && <Eye className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = "Today";
  else if (isYesterday(date)) label = "Yesterday";
  else label = format(date, "EEEE, MMM d, yyyy");
  return (
    <div className="flex items-center justify-center py-3 my-1">
      <span className="wa-date-pill">{label}</span>
    </div>
  );
}

function MessageBubble({ msg, isGrouped, isMobile, allMessages, onReply, onReact }: {
  msg: any; isGrouped: boolean; isMobile?: boolean;
  allMessages: any[];
  onReply: (msg: any) => void;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const isCustomer = msg.sender_type === "customer";
  const isAi = msg.sender_type === "ai";
  const isSystem = msg.sender_type === "system";
  const isSending = msg._sending;
  const isFailed = msg._failed;
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{FE0F}\u{200D}]{1,6}$/u;
  const isEmojiOnly = msg.content && emojiRegex.test(msg.content.trim()) && !msg.media_url;

  if (isSystem) {
    return (
      <div className="flex justify-center py-2 my-1">
        <span className="wa-date-pill text-[10px]">{msg.content}</span>
      </div>
    );
  }

  const handleCopy = () => {
    if (msg.content) { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }
    setShowMobileActions(false);
  };

  const hasMedia = msg.media_url && msg.media_type !== "text";
  const isVoiceNote = msg.media_type === "audio";
  const maxW = isMobile ? "max-w-[80%]" : "max-w-[70%]";
  const repliedMsg = msg.reply_to_message_id ? allMessages.find(m => m.id === msg.reply_to_message_id) : null;

  const reactions: { emoji: string; count: number }[] = [];
  if (msg.reactions && Array.isArray(msg.reactions)) {
    const emojiCounts: Record<string, number> = {};
    msg.reactions.forEach((r: any) => { emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1; });
    Object.entries(emojiCounts).forEach(([emoji, count]) => reactions.push({ emoji, count }));
  }

  const handleTouchStart = () => {
    if (!isMobile || isSending) return;
    longPressRef.current = setTimeout(() => { setShowMobileActions(true); }, 400);
  };
  const handleTouchEnd = () => { if (longPressRef.current) clearTimeout(longPressRef.current); };

  const showTail = !isGrouped;

  // Bubble radius: rounded everywhere except tail corner
  const bubbleRadius = isMobile
    ? showTail
      ? isCustomer ? "rounded-[18px] rounded-tl-[4px]" : "rounded-[18px] rounded-tr-[4px]"
      : "rounded-[18px]"
    : showTail
      ? isCustomer ? "rounded-2xl rounded-tl-[4px]" : "rounded-2xl rounded-tr-[4px]"
      : "rounded-2xl";

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"} ${isGrouped ? "mt-[2px]" : isMobile ? "mt-2" : "mt-2.5"} group wa-msg-enter ${isSending ? "opacity-60" : ""}`}>
      <div className={`relative ${maxW}`}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>

        {/* Reply quote */}
        {repliedMsg && (
          <div className={`${isCustomer ? "mr-3" : "ml-3"} mb-0.5`}>
            <div className={`wa-reply-bar ${isCustomer ? "wa-reply-bar-incoming" : "wa-reply-bar-outgoing"}`}>
              <p className={`text-[10px] font-bold ${isCustomer ? "text-primary" : "text-white/80"}`}>
                {repliedMsg.sender_type === "customer" ? "Customer" : "You"}
              </p>
              <p className={`text-[11px] line-clamp-1 mt-0.5 ${isCustomer ? "text-muted-foreground" : "text-white/60"}`}>
                {repliedMsg.content || `[${repliedMsg.media_type}]`}
              </p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className={`relative ${isMobile ? "px-3 py-[7px]" : "px-3.5 py-2"} ${bubbleRadius} ${
          isEmojiOnly ? "wa-emoji-only" :
          isFailed
            ? "bg-destructive/10 border border-destructive/30 text-foreground"
            : isCustomer
            ? "wa-bubble-incoming"
            : isAi
            ? "wa-bubble-ai"
            : "wa-bubble-outgoing"
        } ${showTail && isCustomer && !isEmojiOnly ? "wa-bubble-tail-left" : ""} ${showTail && !isCustomer && !isAi && !isEmojiOnly ? "wa-bubble-tail-right" : ""} ${isMobile ? "wa-bubble-mobile" : ""}`}>
          
          {/* AI label */}
          {isAi && !isGrouped && (
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="h-2 w-2 text-white" />
              </div>
              <span className="text-[9px] font-bold text-amber-500 tracking-wider uppercase">AI</span>
            </div>
          )}

          {/* Media */}
          {isVoiceNote && msg.media_url ? (
            <VoiceNotePlayer mediaKey={msg.media_url} mimeType={msg.media_mime_type} isOutgoing={!isCustomer && !isAi} isMobile={isMobile} />
          ) : hasMedia ? (
            <LazyMedia mediaKey={msg.media_url} mediaType={msg.media_type} mimeType={msg.media_mime_type} filename={msg.media_filename} isMobile={isMobile} />
          ) : null}

          {/* Text content */}
          {msg.content && !isVoiceNote && (
            <p className={`${isMobile ? "text-[15px] leading-[1.4]" : "text-[13.5px] leading-[1.45]"} whitespace-pre-wrap break-words`}>
              {msg.content}
            </p>
          )}

          {/* Time + status — inline float right for natural WhatsApp look */}
          {!isEmojiOnly && (
            <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5 wa-msg-time select-none">
              {isFailed && <span className="text-[9px] text-destructive font-bold mr-1">!</span>}
              <span className={`text-[10px] ${isCustomer ? "text-muted-foreground/60" : "opacity-60"}`}>
                {format(new Date(msg.created_at), "HH:mm")}
              </span>
              {!isCustomer && !isAi && (
                isSending
                  ? <Clock className="h-3 w-3 opacity-40 animate-pulse" />
                  : isFailed
                  ? <X className="h-3 w-3 text-destructive" />
                  : <CheckCheck className={`h-3 w-3 ${msg.is_read ? "text-blue-400" : "opacity-40"}`} />
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex gap-1 -mt-2 relative z-[1] ${isCustomer ? "justify-start ml-2" : "justify-end mr-2"}`}>
            {reactions.map((r, i) => (
              <span key={i} className="wa-reaction-badge">
                {r.emoji} {r.count > 1 && <span className="text-[9px] text-muted-foreground ml-0.5">{r.count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Desktop hover actions */}
        {!isMobile && !isSending && (
          <div className={`absolute top-1 ${isCustomer ? "-right-[7rem]" : "-left-[7rem]"} hidden group-hover:flex gap-0.5 items-center wa-action-pill`}>
            <button onClick={() => onReply(msg)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors" title="Reply">
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => setShowReactions(!showReactions)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors" title="React">
              <Smile className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={handleCopy} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors" title="Copy">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => toast.info("Forward coming soon")} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors" title="Forward">
              <Forward className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Mobile long-press — bottom sheet overlay */}
        {isMobile && showMobileActions && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[3px]" onClick={() => setShowMobileActions(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[61] wa-bottom-sheet">
              <div className="bg-card rounded-t-[28px] shadow-2xl overflow-hidden"
                style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1.5">
                  <div className="w-9 h-[3px] rounded-full bg-muted-foreground/15" />
                </div>

                {/* Message preview */}
                <div className="px-5 pb-3">
                  <div className={`${isCustomer ? "wa-bubble-incoming" : "wa-bubble-outgoing"} rounded-2xl px-3 py-2 max-w-[85%] ${isCustomer ? "" : "ml-auto"}`}>
                    <p className="text-[13px] line-clamp-2 leading-snug">{msg.content || `[${msg.media_type}]`}</p>
                  </div>
                </div>

                {/* Quick reactions */}
                <div className="flex justify-center gap-2.5 px-5 pb-4">
                  {QUICK_REACTIONS.map((emoji, i) => (
                    <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowMobileActions(false); }}
                      className="h-[52px] w-[52px] rounded-2xl bg-muted/40 hover:bg-muted flex items-center justify-center text-[26px] active:scale-110 transition-all"
                      style={{ animationDelay: `${i * 40}ms` }}>
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-border/30 mx-5" />

                {/* Action items */}
                <div className="px-3 py-1.5">
                  {[
                    { action: () => { onReply(msg); setShowMobileActions(false); }, icon: Reply, color: "text-blue-500", bg: "bg-blue-500/10", label: "Reply", desc: "Reply to this message" },
                    { action: handleCopy, icon: Copy, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Copy", desc: "Copy message text" },
                    { action: () => { toast.info("Forward coming soon"); setShowMobileActions(false); }, icon: Forward, color: "text-purple-500", bg: "bg-purple-500/10", label: "Forward", desc: "Forward to another chat" },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action}
                      className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl active:bg-muted/40 transition-colors">
                      <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`h-[18px] w-[18px] ${item.color}`} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-[14px] font-medium">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground/70">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Desktop reactions picker */}
        {!isMobile && showReactions && (
          <div className={`absolute ${isCustomer ? "left-0" : "right-0"} -top-11 flex gap-0.5 bg-card/95 backdrop-blur-md border border-border/50 rounded-full px-2 py-1 shadow-xl z-10 animate-in fade-in scale-in-95 duration-150`}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowReactions(false); }}
                className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-base transition-transform hover:scale-125">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileNotifButton() {
  const { soundEnabled, notifEnabled, toggleSound, toggleNotif } = useNotifications();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="wa-header-btn">
          {notifEnabled || soundEnabled ? <Bell className="h-[18px] w-[18px]" /> : <BellOff className="h-[18px] w-[18px] text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span className="text-xs flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Push</span>
          <Switch checked={notifEnabled} onCheckedChange={toggleNotif} className="scale-75" />
        </div>
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span className="text-xs flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Sound</span>
          <Switch checked={soundEnabled} onCheckedChange={toggleSound} className="scale-75" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatWindow({
  conversation, messages, templates, aiSuggestions,
  onSend, onResolve, onApproveAi, onRejectAi, isAdmin, staff, onAssign,
  onBack, onOpenContactInfo, isMobile,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fileAccept, setFileAccept] = useState("*/*");

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    const replyId = replyTo?.id;
    setReplyTo(null);
    setSending(true);
    try { await onSend(msg, undefined, undefined, undefined, undefined, replyId); }
    catch {} finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && replyTo) { setReplyTo(null); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val === "/") setShowSlashMenu(true);
    else if (!val.startsWith("/")) setShowSlashMenu(false);
  };

  const handleReply = (msg: any) => { setReplyTo(msg); inputRef.current?.focus(); };

  const handleReact = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const currentReactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
    currentReactions.push({ emoji, user_id: "agent", created_at: new Date().toISOString() });
    await supabase.from("wa_messages").update({ reactions: currentReactions } as any).eq("id", msgId);
  };

  const uploadAndSend = async (file: File | Blob, filename: string, mimeType: string) => {
    setUploading(true);
    try {
      const arrayBuffer = await (file as Blob).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 8192;
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(offset, offset + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      let mediaType = "document";
      if (mimeType.startsWith("image/")) mediaType = "image";
      else if (mimeType.startsWith("video/")) mediaType = "video";
      else if (mimeType.startsWith("audio/")) mediaType = "audio";
      const { data, error } = await supabase.functions.invoke("whatsapp-media", {
        body: { data: base64, mime_type: mimeType, filename },
      });
      if (error) throw error;
      const caption = input.trim() || undefined;
      await onSend(caption || "", data.key, mediaType, mimeType, filename);
      setInput("");
      toast.success("Media sent");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to upload");
    } finally { setUploading(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndSend(file, file.name, file.type);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openFilePicker = (accept: string) => {
    setFileAccept(accept);
    setShowAttachMenu(false);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : undefined;
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      const actualMime = recorder.mimeType || preferredMime || "audio/webm";
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const recordedBlob = new Blob(audioChunksRef.current, { type: actualMime });
        if (recordedBlob.size === 0) { toast.error("Recording failed — no audio captured"); return; }
        try {
          const { normalizeVoiceNote } = await import("@/lib/voice-note");
          const normalized = await normalizeVoiceNote(recordedBlob, actualMime);
          await uploadAndSend(normalized.blob, normalized.filename, normalized.mimeType);
        } catch (err) {
          console.error("Voice note conversion error:", err);
          toast.error("Voice note convert nahi hui — please dubara try karein");
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => { mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop()); };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleTemplateSelect = (template: any) => {
    setInput(template.body);
    setShowTemplates(false);
    setShowSlashMenu(false);
    setTemplateSearch("");
    inputRef.current?.focus();
  };

  const openWhatsApp = () => {
    const phone = conversation.customer_phone?.replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  };

  const filteredTemplates = templates.filter(
    (t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.body.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const slashFiltered = templates.filter(t => {
    const q = input.slice(1).toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
  });

  const messagesWithDates: { type: "date" | "message"; date?: Date; msg?: any; isGrouped?: boolean }[] = [];
  let lastDate: string | null = null;
  let lastSender: string | null = null;
  messages.forEach((msg, i) => {
    const msgDate = new Date(msg.created_at);
    const dateKey = format(msgDate, "yyyy-MM-dd");
    if (dateKey !== lastDate) { messagesWithDates.push({ type: "date", date: msgDate }); lastDate = dateKey; lastSender = null; }
    const isGrouped = lastSender === msg.sender_type && i > 0 && (msgDate.getTime() - new Date(messages[i - 1].created_at).getTime()) < 60000;
    messagesWithDates.push({ type: "message", msg, isGrouped });
    lastSender = msg.sender_type;
  });

  const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    active: { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", label: "Active", icon: Zap },
    waiting: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", label: "Waiting", icon: Clock },
    resolved: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", label: "Resolved", icon: CheckCircle },
    archived: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", label: "Archived", icon: Shield },
  };
  const status = statusConfig[conversation.status] || statusConfig.active;
  const StatusIcon = status.icon;

  // ──────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex h-full max-h-full flex-col overflow-hidden overscroll-none bg-background">
        {/* ── HEADER ── */}
        <div className="flex-shrink-0 wa-mobile-header z-20"
          style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center gap-1.5 px-1.5 pb-2 pt-0.5">
            {onBack && (
              <button className="h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center active:bg-foreground/5 transition-colors -ml-0.5" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="relative flex-shrink-0" onClick={onOpenContactInfo}>
              <div className="wa-avatar-ring">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {(conversation.customer_name || conversation.customer_phone || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {conversation.status === "active" && (
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-card bg-emerald-500 wa-online-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1" onClick={onOpenContactInfo}>
              <p className="text-[14px] font-semibold truncate leading-tight">{conversation.customer_name || conversation.customer_phone}</p>
              <div className="flex items-center gap-1.5 mt-px">
                <StatusIcon className={`h-2.5 w-2.5 ${status.color}`} />
                <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                {conversation.status === "active" && (
                  <span className="text-[10px] text-emerald-500/70">· online</span>
                )}
              </div>
            </div>
            <div className="flex items-center flex-shrink-0 gap-0.5">
              <MobileNotifButton />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="wa-header-btn">
                    <MoreVertical className="h-[18px] w-[18px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                  {[
                    { action: onOpenContactInfo, icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: "Contact Info", desc: "View details & history" },
                    { action: onResolve, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Mark Resolved", desc: "Close conversation" },
                    { action: openWhatsApp, icon: ExternalLink, color: "text-primary", bg: "bg-primary/10", label: "Open in WhatsApp", desc: "Open native app" },
                  ].map((item, i) => (
                    <DropdownMenuItem key={i} onClick={item.action} className="py-2.5 gap-3 rounded-xl">
                      <div className={`h-8 w-8 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <div>
                        <p className={`text-[13px] font-medium ${i === 1 ? item.color : ""}`}>{item.label}</p>
                        <p className="text-[10px] text-muted-foreground/70">{item.desc}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {isAdmin && staff.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuLabel className="text-[9px] uppercase tracking-widest text-muted-foreground/60 px-3 py-1">Assign Agent</DropdownMenuLabel>
                      {staff.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => onAssign(conversation.id, s.user_id)} className="py-2 gap-3 rounded-xl">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{s.full_name?.charAt(0)}</div>
                          <span className="text-[13px]">{s.full_name}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div ref={scrollRef} onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-2.5 py-1.5 z-0 wa-chat-bg relative"
          style={{ WebkitOverflowScrolling: 'touch' }}>
          {messagesWithDates.map((item, i) => {
            if (item.type === "date" && item.date) return <DateSeparator key={`date-${i}`} date={item.date} />;
            if (item.type === "message" && item.msg) return (
              <MessageBubble key={item.msg.id} msg={item.msg} isGrouped={!!item.isGrouped} isMobile
                allMessages={messages} onReply={handleReply} onReact={handleReact} />
            );
            return null;
          })}
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 px-8">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/15 to-emerald-500/15 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/20">
                    <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">No messages yet</p>
                  <p className="text-[12px] text-muted-foreground/50 mt-1">Send a message to start the conversation</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SCROLL TO BOTTOM FAB ── */}
        {showScrollDown && (
          <div className="absolute z-20 bottom-[76px] right-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button className="h-9 w-9 rounded-full bg-card/95 backdrop-blur-md border border-border/30 shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              onClick={scrollToBottom}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" accept={fileAccept} onChange={handleFileSelect} />

        {/* ── REPLY PREVIEW ── */}
        {replyTo && (
          <div className="flex-shrink-0 px-3 py-2 border-t border-border/30 bg-card/90 backdrop-blur-md flex items-center gap-2 z-10 animate-in slide-in-from-bottom-2 duration-150">
            <div className="w-[3px] h-9 rounded-full bg-gradient-to-b from-primary to-primary/40 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary">{replyTo.sender_type === "customer" ? "Customer" : "You"}</p>
              <p className="text-[12px] text-muted-foreground truncate">{replyTo.content || `[${replyTo.media_type}]`}</p>
            </div>
            <button className="h-7 w-7 rounded-full flex items-center justify-center active:bg-muted flex-shrink-0" onClick={() => setReplyTo(null)}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* ── SLASH COMMAND MENU ── */}
        {showSlashMenu && slashFiltered.length > 0 && (
          <div className="flex-shrink-0 px-3 py-2 border-t border-border/30 bg-card/95 backdrop-blur-md max-h-40 overflow-y-auto z-10 animate-in slide-in-from-bottom-2 duration-150">
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 px-1">Quick Replies</p>
            {slashFiltered.slice(0, 4).map(t => (
              <button key={t.id} onClick={() => handleTemplateSelect(t)}
                className="w-full text-left px-2.5 py-2.5 rounded-xl active:bg-accent/40 transition-colors flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground/60 line-clamp-1">{t.body}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── INPUT BAR ── */}
        <div className="flex-shrink-0 wa-input-bar z-20"
          style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
          {uploading && (
            <div className="flex items-center gap-2 mb-1.5 mx-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/20">
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
              <span className="text-[11px] text-primary font-medium">Uploading media...</span>
            </div>
          )}
          {isRecording ? (
            <div className="flex items-center gap-1.5 px-2">
              <button className="h-10 w-10 rounded-full flex items-center justify-center text-destructive active:bg-destructive/10 active:scale-90 transition-all" onClick={cancelRecording}>
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-[22px] bg-muted/30 border border-border/20">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
                  <span className="text-[13px] font-bold tabular-nums text-destructive min-w-[40px]">{formatRecordingTime(recordingTime)}</span>
                </div>
                <div className="flex items-center gap-[2px] flex-1 h-[22px]">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-full bg-destructive/40"
                      style={{ height: `${20 + Math.random() * 80}%`, minWidth: 2, animation: `pulse ${0.3 + Math.random() * 0.7}s ease-in-out infinite alternate`, animationDelay: `${i * 0.05}s` }} />
                  ))}
                </div>
              </div>
              <button className="h-10 w-10 rounded-full wa-send-btn flex items-center justify-center active:scale-90 transition-transform" onClick={stopRecording}>
                <Send className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-1 px-1.5">
              {/* Action buttons */}
              <div className="flex items-center flex-shrink-0 pb-0.5">
                <EmojiPicker onSelect={(emoji) => setInput(prev => prev + emoji)} isMobile />
                <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center active:bg-muted/40 transition-colors" disabled={uploading}>
                      <Paperclip className="h-[18px] w-[18px] text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 rounded-2xl p-1.5" side="top">
                    {[
                      { accept: "image/*", icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-500/10", label: "Photo" },
                      { accept: "video/*", icon: Video, color: "text-purple-500", bg: "bg-purple-500/10", label: "Video" },
                      { accept: "audio/*", icon: Mic, color: "text-orange-500", bg: "bg-orange-500/10", label: "Audio" },
                      { accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Document" },
                    ].map((item, i) => (
                      <DropdownMenuItem key={i} onClick={() => openFilePicker(item.accept)} className="py-2.5 gap-2.5 rounded-xl">
                        <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                          <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <span className="text-[13px] font-medium">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem className="py-2.5 gap-2.5 rounded-xl" onClick={() => {
                      setShowAttachMenu(false);
                      const inp = document.createElement("input");
                      inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
                      inp.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) uploadAndSend(file, file.name, file.type); };
                      inp.click();
                    }}>
                      <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center"><Camera className="h-4 w-4 text-pink-500" /></div>
                      <span className="text-[13px] font-medium">Camera</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Text input */}
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  placeholder="Message..."
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="wa-input-floating min-h-[40px] max-h-[100px] text-[15px] py-2 px-3.5 resize-none rounded-[22px]"
                />
                {input.length > 500 && (
                  <span className={`absolute bottom-1 right-3 text-[8px] tabular-nums font-medium ${input.length > 900 ? "text-destructive" : "text-muted-foreground/50"}`}>
                    {input.length}/1000
                  </span>
                )}
              </div>

              {/* Send / Mic */}
              <div className="pb-0.5">
                {input.trim() ? (
                  <button
                    className="h-10 w-10 flex-shrink-0 rounded-full wa-send-btn flex items-center justify-center active:scale-90 transition-transform"
                    onClick={handleSend} disabled={sending}>
                    <Send className={`h-[18px] w-[18px] text-primary-foreground ${sending ? "animate-pulse" : ""}`} />
                  </button>
                ) : (
                  <button
                    className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center text-primary active:bg-primary/10 active:scale-90 transition-all"
                    onClick={startRecording}>
                    <Mic className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Templates Bottom Sheet */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-[92vw] rounded-[24px] border-border/20 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-[15px]">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></div>
                Templates
              </DialogTitle>
            </DialogHeader>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input placeholder="Search..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="pl-9 h-10 text-[13px] rounded-xl bg-muted/30 border-0" />
            </div>
            <ScrollArea className="max-h-[45vh]">
              <div className="space-y-1.5">
                {filteredTemplates.map((t) => (
                  <button key={t.id} onClick={() => handleTemplateSelect(t)}
                    className="w-full text-left p-3 rounded-xl border border-border/30 active:bg-primary/5 active:border-primary/20 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold">{t.name}</span>
                      <Badge variant="outline" className="text-[8px] rounded-md px-1.5 h-4 border-border/40">{t.category}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">{t.body}</p>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/15 mb-2" />
                    <p className="text-[12px] text-muted-foreground/50">No templates found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border/50 flex items-center justify-between bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0 cursor-pointer" onClick={onOpenContactInfo}>
            <div className="wa-avatar-ring">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-white">
                  {(conversation.customer_name || conversation.customer_phone || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            {conversation.status === "active" && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500 wa-online-pulse" />
            )}
          </div>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpenContactInfo}>
            <p className="text-sm font-bold truncate leading-tight">{conversation.customer_name || conversation.customer_phone}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border font-semibold ${status.bg} ${status.color}`}>
                <StatusIcon className="h-2.5 w-2.5 mr-0.5" />{status.label}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Phone className="h-3 w-3" />{conversation.customer_phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onOpenContactInfo && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onOpenContactInfo}><Info className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Contact info</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={openWhatsApp}><ExternalLink className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Open in WhatsApp</TooltipContent></Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={onResolve} className="text-emerald-500 py-2.5 gap-2"><CheckCircle className="h-4 w-4" /> Mark Resolved</DropdownMenuItem>
              {isAdmin && staff.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Assign to Agent</DropdownMenuLabel>
                  {staff.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => onAssign(conversation.id, s.user_id)} className="py-2 gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{s.full_name?.charAt(0)}</div>
                      {s.full_name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="flex-shrink-0 px-5 py-3 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 border-b border-amber-500/10">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">AI Suggestions</span>
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 rounded-lg">{aiSuggestions.length}</Badge>
          </div>
          <div className="space-y-2">
            {aiSuggestions.slice(0, 5).map((s) => (
              <div key={s.id} className="p-3.5 rounded-xl bg-card/80 border border-border/40 shadow-sm hover:border-amber-500/30 hover:shadow-md transition-all group">
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3 mb-2.5">{s.suggested_response}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[9px] px-2 rounded-lg ${s.confidence === "high" ? "border-emerald-500/50 text-emerald-500" : s.confidence === "medium" ? "border-amber-500/50 text-amber-500" : "border-red-500/50 text-red-500"}`}>
                    {s.confidence} confidence
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-xs hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" onClick={() => onApproveAi(s.id, s.suggested_response)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Send
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-xs hover:bg-destructive/10 text-destructive font-semibold" onClick={() => onRejectAi(s.id)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-5 py-3 wa-chat-bg relative">
        {messagesWithDates.map((item, i) => {
          if (item.type === "date" && item.date) return <DateSeparator key={`date-${i}`} date={item.date} />;
          if (item.type === "message" && item.msg) return (
            <MessageBubble key={item.msg.id} msg={item.msg} isGrouped={!!item.isGrouped} isMobile={false}
              allMessages={messages} onReply={handleReply} onReact={handleReact} />
          );
          return null;
        })}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-4 py-20">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/15 to-emerald-500/15 animate-pulse" />
                <div className="absolute inset-3 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/20">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/50">Send a message to start the conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <div className="absolute z-10 bottom-24 right-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-md border border-border/50 shadow-xl flex items-center justify-center hover:shadow-2xl transition-all"
            onClick={scrollToBottom}>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept={fileAccept} onChange={handleFileSelect} />

      {/* Reply preview */}
      {replyTo && (
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-border/50 bg-card/80 backdrop-blur-md flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-150">
          <div className="h-full w-1 rounded-full bg-gradient-to-b from-primary to-primary/50 flex-shrink-0" />
          <CornerDownRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary">{replyTo.sender_type === "customer" ? "Customer" : "You"}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content || `[${replyTo.media_type}]`}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full flex-shrink-0" onClick={() => setReplyTo(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Slash command menu */}
      {showSlashMenu && slashFiltered.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-border/50 bg-card/95 backdrop-blur-md max-h-48 overflow-y-auto animate-in slide-in-from-bottom-2 duration-150">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Quick Replies</p>
          {slashFiltered.slice(0, 6).map(t => (
            <button key={t.id} onClick={() => handleTemplateSelect(t)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-accent/50 transition-colors flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium">{t.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{t.body}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border/50 bg-card/80 backdrop-blur-xl">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            <span className="text-xs text-primary font-medium">Uploading media...</span>
          </div>
        )}
        {isRecording ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-destructive" onClick={cancelRecording}><Trash2 className="h-5 w-5" /></Button>
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
                <span className="text-sm font-bold tabular-nums text-destructive min-w-[44px]">{formatRecordingTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-[2px] flex-1 h-[28px]">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-full bg-destructive/50"
                    style={{ height: `${20 + Math.random() * 80}%`, minWidth: 2, animation: `pulse ${0.3 + Math.random() * 0.7}s ease-in-out infinite alternate`, animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <Button size="icon" className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-lg" onClick={stopRecording}><Send className="h-5 w-5" /></Button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <EmojiPicker onSelect={(emoji) => setInput(prev => prev + emoji)} />
            <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-xl" disabled={uploading}><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-xl" side="top">
                <DropdownMenuItem onClick={() => openFilePicker("image/*")} className="py-2.5 gap-2"><div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><ImageIcon className="h-3.5 w-3.5 text-blue-500" /></div> Photo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openFilePicker("video/*")} className="py-2.5 gap-2"><div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center"><Video className="h-3.5 w-3.5 text-purple-500" /></div> Video</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openFilePicker("audio/*")} className="py-2.5 gap-2"><div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center"><Mic className="h-3.5 w-3.5 text-orange-500" /></div> Audio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openFilePicker(".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv")} className="py-2.5 gap-2"><div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-emerald-500" /></div> Document</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setShowAttachMenu(false);
                  const inp = document.createElement("input");
                  inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
                  inp.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) uploadAndSend(file, file.name, file.type); };
                  inp.click();
                }} className="py-2.5 gap-2"><div className="h-7 w-7 rounded-lg bg-pink-500/10 flex items-center justify-center"><Camera className="h-3.5 w-3.5 text-pink-500" /></div> Camera</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-xl" onClick={() => setShowTemplates(true)}><FileText className="h-4 w-4 text-muted-foreground" /></Button>
            </TooltipTrigger><TooltipContent>Templates <kbd className="ml-1 text-[9px] bg-muted px-1 rounded">/</kbd></TooltipContent></Tooltip>
            <div className="flex-1 relative">
              <Textarea ref={inputRef} placeholder="Type a message... (/ for quick replies)" value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} rows={1}
                className="wa-chat-input min-h-[42px] max-h-[120px] text-sm resize-none rounded-2xl" />
              {input.length > 500 && (
                <span className={`absolute bottom-1.5 right-3 text-[9px] tabular-nums font-medium ${input.length > 900 ? "text-destructive" : "text-muted-foreground/60"}`}>
                  {input.length}/1000
                </span>
              )}
            </div>
            {input.trim() ? (
              <Tooltip><TooltipTrigger asChild>
                <button className="h-10 w-10 flex-shrink-0 rounded-full wa-send-btn flex items-center justify-center hover:shadow-lg transition-all" onClick={handleSend} disabled={sending}>
                  <Send className={`h-5 w-5 text-primary-foreground ${sending ? "animate-pulse" : ""}`} />
                </button>
              </TooltipTrigger><TooltipContent>Send <kbd className="ml-1 text-[9px] bg-muted px-1 rounded">Enter</kbd></TooltipContent></Tooltip>
            ) : (
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-10 w-10 flex-shrink-0 rounded-full text-primary hover:bg-primary/10" onClick={startRecording}>
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger><TooltipContent>Voice note</TooltipContent></Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
              Templates
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="pl-10 h-10 text-sm rounded-xl" />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredTemplates.map((t) => (
                <button key={t.id} onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left p-3.5 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                  <div className="flex items-center justify-between mb-1.5"><span className="text-sm font-semibold group-hover:text-primary transition-colors">{t.name}</span><Badge variant="outline" className="text-[9px] rounded-lg">{t.category}</Badge></div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body}</p>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-10">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
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
