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
  Phone, ExternalLink, Copy, Clock, Search,
  ArrowDown, Shield, Zap, MessageSquare, Download, Loader2, Eye, File,
  ArrowLeft, Camera, StopCircle, Trash2, Reply, Smile, Info, CornerDownRight
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

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
        <div className="rounded-lg overflow-hidden mb-1.5 -mx-1 -mt-0.5 relative group/media">
          <img src={blobUrl} alt="" className="max-w-full object-cover" style={{ maxHeight: isMobile ? 200 : 280 }} />
          <a href={blobUrl} download={filename || `media.${mimeType?.split("/")[1] || "jpg"}`}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/media:opacity-100 active:opacity-100 transition-opacity">
            <Download className="h-4 w-4 text-white" />
          </a>
        </div>
      );
    }
    if (mediaType === "video") {
      return <div className="rounded-lg overflow-hidden mb-1.5 -mx-1 -mt-0.5"><video src={blobUrl} controls className="max-w-full" style={{ maxHeight: isMobile ? 200 : 280 }} /></div>;
    }
    if (mediaType === "audio") return null;
    return (
      <a href={blobUrl} download={filename || "document"} className="flex items-center gap-3 p-2.5 bg-background/10 rounded-lg mb-1.5 hover:bg-background/20 active:bg-background/30 transition-colors">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{filename || "Document"}</p><p className="text-[10px] opacity-60">{mimeType || "file"}</p></div>
        <Download className="h-4 w-4 opacity-50" />
      </a>
    );
  }

  return (
    <button onClick={loadMedia} disabled={loading}
      className="flex items-center gap-3 p-3 rounded-lg mb-1.5 w-full text-left transition-all border border-dashed border-border/60 hover:border-primary/40 active:border-primary/60 hover:bg-primary/5 disabled:opacity-60">
      <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
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
  else label = format(date, "EEEE, MMMM d, yyyy");
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
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

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  const handleCopy = () => {
    if (msg.content) { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }
    setShowMobileActions(false);
  };

  const hasMedia = msg.media_url && msg.media_type !== "text";
  const isVoiceNote = msg.media_type === "audio";
  const maxW = isMobile ? "max-w-[82vw]" : "max-w-[70%]";

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

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"} ${isGrouped ? "mt-0.5" : isMobile ? "mt-2" : "mt-3"} group animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ${isSending ? "opacity-70" : ""}`}>
      <div className={`relative ${maxW}`}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>

        {repliedMsg && (
          <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 ${isCustomer ? "border-l-primary bg-muted/30" : "border-l-primary-foreground/30 bg-primary/20"} cursor-pointer`}>
            <p className="text-[10px] font-medium text-muted-foreground">{repliedMsg.sender_type === "customer" ? "Customer" : "You"}</p>
            <p className="text-[11px] line-clamp-1 opacity-80">{repliedMsg.content || `[${repliedMsg.media_type}]`}</p>
          </div>
        )}

        <div className={`${isMobile ? "rounded-[18px] px-3 py-2" : "rounded-2xl px-3.5 py-2"} relative shadow-sm ${
          isFailed
            ? "bg-destructive/10 border border-destructive/30 text-foreground rounded-tr-sm"
            : isCustomer
            ? "bg-card border border-border/60 rounded-tl-sm"
            : isAi
            ? "bg-gradient-to-br from-amber-500/15 to-amber-600/10 border border-amber-500/20 text-foreground rounded-tr-sm"
            : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm shadow-primary/20"
        }`}>
          {isAi && !isGrouped && (
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center"><Bot className="h-2.5 w-2.5 text-amber-500" /></div>
              <span className="text-[10px] font-semibold text-amber-500">AI</span>
            </div>
          )}
          {isVoiceNote && msg.media_url ? (
            <VoiceNotePlayer mediaKey={msg.media_url} mimeType={msg.media_mime_type} isOutgoing={!isCustomer && !isAi} isMobile={isMobile} />
          ) : hasMedia ? (
            <LazyMedia mediaKey={msg.media_url} mediaType={msg.media_type} mimeType={msg.media_mime_type} filename={msg.media_filename} isMobile={isMobile} />
          ) : null}
          {msg.content && !isVoiceNote && <p className={`${isMobile ? "text-[14px]" : "text-[13px]"} leading-relaxed whitespace-pre-wrap break-words`}>{msg.content}</p>}
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {isFailed && <span className="text-[10px] text-destructive font-medium mr-1">Failed</span>}
            <span className={`text-[10px] ${isCustomer ? "text-muted-foreground" : "opacity-60"}`}>{format(new Date(msg.created_at), "HH:mm")}</span>
            {!isCustomer && !isAi && (
              isSending
                ? <Clock className="h-3 w-3 opacity-50 animate-pulse" />
                : isFailed
                ? <X className="h-3 w-3 text-destructive" />
                : <CheckCheck className={`h-3 w-3 ${msg.is_read ? "text-blue-400" : "opacity-50"}`} />
            )}
          </div>
        </div>

        {reactions.length > 0 && (
          <div className={`flex gap-0.5 mt-0.5 ${isCustomer ? "justify-start" : "justify-end"}`}>
            {reactions.map((r, i) => (
              <span key={i} className="text-xs bg-muted/60 border border-border/50 rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-muted transition-colors">
                {r.emoji} {r.count > 1 && <span className="text-[9px] text-muted-foreground">{r.count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Desktop hover actions */}
        {!isMobile && !isSending && (
          <div className={`absolute top-0 ${isCustomer ? "-right-20" : "-left-20"} hidden group-hover:flex gap-0.5 items-center`}>
            <button onClick={() => onReply(msg)} className="h-6 w-6 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted" title="Reply">
              <Reply className="h-3 w-3 text-muted-foreground" />
            </button>
            <button onClick={() => setShowReactions(!showReactions)} className="h-6 w-6 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted" title="React">
              <Smile className="h-3 w-3 text-muted-foreground" />
            </button>
            <button onClick={handleCopy} className="h-6 w-6 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted" title="Copy">
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Mobile long-press action sheet */}
        {isMobile && showMobileActions && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMobileActions(false)} />
            <div className={`absolute z-50 ${isCustomer ? "left-0" : "right-0"} -top-14 animate-in fade-in scale-in-95 duration-150`}>
              <div className="flex gap-1 bg-card border border-border rounded-2xl px-2 py-1.5 shadow-xl">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowMobileActions(false); }}
                    className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-lg active:scale-110 transition-transform">
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 mt-1 bg-card border border-border rounded-xl px-1 py-1 shadow-xl">
                <button onClick={() => { onReply(msg); setShowMobileActions(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg active:bg-muted transition-colors flex-1">
                  <Reply className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-medium">Reply</span>
                </button>
                <button onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg active:bg-muted transition-colors flex-1">
                  <Copy className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-medium">Copy</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Desktop reactions picker */}
        {!isMobile && showReactions && (
          <div className={`absolute ${isCustomer ? "left-0" : "right-0"} -top-10 flex gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-10 animate-in fade-in scale-in-95 duration-150`}>
            {QUICK_REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowReactions(false); }}
                className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-base transition-transform hover:scale-125">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
    try {
      await onSend(msg, undefined, undefined, undefined, undefined, replyId);
    } catch {
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && replyTo) { setReplyTo(null); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    // Slash command detection
    if (val === "/") setShowSlashMenu(true);
    else if (!val.startsWith("/")) setShowSlashMenu(false);
  };

  const handleReply = (msg: any) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleReact = async (msgId: string, emoji: string) => {
    // Update reactions in DB
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
    } finally {
      setUploading(false);
    }
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
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
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
    } catch (err) {
      toast.error("Microphone access denied");
    }
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

  // Slash-filtered templates
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

  const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    active: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Zap },
    waiting: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
    resolved: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: CheckCircle },
    archived: { color: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: Shield },
  };
  const status = statusConfig[conversation.status] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className={`flex-shrink-0 ${isMobile ? "px-2 py-2" : "px-5 py-3"} border-b border-border flex items-center justify-between bg-card/95 backdrop-blur-md`} style={isMobile ? { paddingTop: 'max(0.5rem, env(safe-area-inset-top))' } : undefined}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-full -ml-0.5 active:scale-95 transition-transform" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative flex-shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={onOpenContactInfo}>
            <div className={`${isMobile ? "h-10 w-10" : "h-10 w-10"} rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm`}>
              <span className="text-sm font-bold text-primary-foreground">
                {(conversation.customer_name || conversation.customer_phone || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${conversation.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
          </div>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpenContactInfo}>
            <p className={`${isMobile ? "text-[15px]" : "text-sm"} font-semibold truncate leading-tight`}>{conversation.customer_name || conversation.customer_phone}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isMobile ? (
                <>
                  {conversation.status === "active" && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  <span className="text-[11px] text-muted-foreground">
                    {conversation.status === "active" ? "Online" : conversation.customer_phone}
                  </span>
                </>
              ) : (
                <>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border ${status.bg} ${status.color}`}>
                    <StatusIcon className="h-2.5 w-2.5 mr-0.5" />{conversation.status}
                  </Badge>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Phone className="h-3 w-3" />{conversation.customer_phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0 flex-shrink-0">
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full active:scale-95 transition-transform" onClick={openWhatsApp}>
              <Phone className="h-4.5 w-4.5" />
            </Button>
          )}
          {!isMobile && onOpenContactInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onOpenContactInfo}><Info className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Contact info</TooltipContent>
            </Tooltip>
          )}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={openWhatsApp}><ExternalLink className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Open in WhatsApp</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={`${isMobile ? "h-9 w-9 rounded-full" : "h-8 w-8 rounded-lg"} active:scale-95 transition-transform`}><MoreVertical className="h-4.5 w-4.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isMobile && <DropdownMenuItem onClick={openWhatsApp}><ExternalLink className="h-4 w-4 mr-2" /> Open in WhatsApp</DropdownMenuItem>}
              {isMobile && onOpenContactInfo && <DropdownMenuItem onClick={onOpenContactInfo}><Info className="h-4 w-4 mr-2" /> Contact Info</DropdownMenuItem>}
              <DropdownMenuItem onClick={onResolve} className="text-emerald-500"><CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved</DropdownMenuItem>
              {isAdmin && staff.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Assign to Agent</DropdownMenuLabel>
                  {staff.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => onAssign(conversation.id, s.user_id)}>
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-[10px] font-bold text-primary">{s.full_name?.charAt(0)}</div>
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
        <div className={`flex-shrink-0 ${isMobile ? "px-3 py-2" : "px-5 py-3"} bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-b border-amber-500/15`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-5 w-5 rounded-full bg-amber-500/15 flex items-center justify-center"><Sparkles className="h-3 w-3 text-amber-500" /></div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">AI</span>
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500">{aiSuggestions.length}</Badge>
          </div>
          <div className="space-y-1.5">
            {aiSuggestions.slice(0, isMobile ? 1 : 5).map((s) => (
              <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-card/60 border border-border/50">
                <p className="text-xs flex-1 text-foreground/80 leading-relaxed line-clamp-2">{s.suggested_response}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className={`text-[9px] px-1.5 ${s.confidence === "high" ? "border-emerald-500/50 text-emerald-500" : s.confidence === "medium" ? "border-amber-500/50 text-amber-500" : "border-red-500/50 text-red-500"}`}>{s.confidence}</Badge>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-emerald-500/10 active:scale-95" onClick={() => onApproveAi(s.id, s.suggested_response)}>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-destructive/10 active:scale-95" onClick={() => onRejectAi(s.id)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll}
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${isMobile ? "px-2.5" : "px-5"} py-2 bg-gradient-to-b from-muted/10 to-muted/5`}
        style={{ backgroundImage: "radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.02) 0%, transparent 50%)" }}>
        {messagesWithDates.map((item, i) => {
          if (item.type === "date" && item.date) return <DateSeparator key={`date-${i}`} date={item.date} />;
          if (item.type === "message" && item.msg) return (
            <MessageBubble key={item.msg.id} msg={item.msg} isGrouped={!!item.isGrouped} isMobile={isMobile}
              allMessages={messages} onReply={handleReply} onReact={handleReact} />
          );
          return null;
        })}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-2 py-20">
              <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto"><MessageSquare className="h-7 w-7 text-muted-foreground/30" /></div>
              <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/60">Send a message to start the conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <div className={`absolute z-10 ${isMobile ? "bottom-[72px] right-3" : "bottom-24 right-8"}`}>
          <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full shadow-lg" onClick={scrollToBottom}><ArrowDown className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept={fileAccept} onChange={handleFileSelect} />

      {/* Reply preview */}
      {replyTo && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150">
          <div className="h-full w-1 rounded-full bg-primary flex-shrink-0" />
          <CornerDownRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-primary">{replyTo.sender_type === "customer" ? "Customer" : "You"}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content || `[${replyTo.media_type}]`}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full flex-shrink-0" onClick={() => setReplyTo(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Slash command menu */}
      {showSlashMenu && slashFiltered.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-card max-h-48 overflow-y-auto animate-in slide-in-from-bottom-2 duration-150">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quick Replies</p>
          {slashFiltered.slice(0, 6).map(t => (
            <button key={t.id} onClick={() => handleTemplateSelect(t)}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-accent/50 transition-colors flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium">{t.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{t.body}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className={`flex-shrink-0 ${isMobile ? "px-2 py-2" : "px-4 py-3"} border-t border-border bg-card/95 backdrop-blur-md`} style={isMobile ? { paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' } : undefined}>
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            <span className="text-xs text-primary font-medium">Uploading...</span>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-destructive active:bg-destructive/10 active:scale-95 transition-transform" onClick={cancelRecording}>
              <Trash2 className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-full bg-muted/30">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
                <span className="text-sm font-semibold tabular-nums text-destructive min-w-[40px]">{formatRecordingTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-[2px] flex-1 h-[24px]">
                {Array.from({ length: isMobile ? 20 : 36 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-full bg-destructive/60"
                    style={{ height: `${20 + Math.random() * 80}%`, minWidth: 2, animation: `pulse ${0.3 + Math.random() * 0.7}s ease-in-out infinite alternate`, animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <Button size="icon" className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 transition-transform active:scale-90" onClick={stopRecording}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-1">
            <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={`${isMobile ? "h-11 w-11" : "h-9 w-9"} flex-shrink-0 rounded-full active:scale-95 transition-transform`} disabled={uploading}>
                  <Paperclip className={`${isMobile ? "h-5.5 w-5.5" : "h-5 w-5"} text-muted-foreground`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={`${isMobile ? "w-52" : "w-48"}`} side="top">
                <DropdownMenuItem onClick={() => openFilePicker("image/*")} className={isMobile ? "py-3" : ""}><ImageIcon className="h-4 w-4 mr-2 text-blue-500" /> Photo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openFilePicker("video/*")} className={isMobile ? "py-3" : ""}><Video className="h-4 w-4 mr-2 text-purple-500" /> Video</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openFilePicker("audio/*")} className={isMobile ? "py-3" : ""}><Mic className="h-4 w-4 mr-2 text-orange-500" /> Audio File</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openFilePicker(".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv")} className={isMobile ? "py-3" : ""}><FileText className="h-4 w-4 mr-2 text-emerald-500" /> Document</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={isMobile ? "py-3" : ""} onClick={() => {
                  setShowAttachMenu(false);
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = "image/*"; input.capture = "environment";
                  input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) uploadAndSend(file, file.name, file.type); };
                  input.click();
                }}><Camera className="h-4 w-4 mr-2 text-pink-500" /> Camera</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isMobile && (
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 rounded-full" onClick={() => setShowTemplates(true)}>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}

            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                placeholder={isMobile ? "Message..." : "Type a message... (/ for quick replies)"}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                className={`${isMobile ? "min-h-[44px] text-[15px] py-2.5 px-4" : "min-h-[40px] text-sm"} max-h-[120px] resize-none rounded-full bg-muted/30 border-transparent focus:border-primary/30 focus:bg-background transition-colors`}
              />
            </div>

            {input.trim() ? (
              <Button size="icon"
                className={`${isMobile ? "h-11 w-11" : "h-9 w-9"} flex-shrink-0 rounded-full bg-primary hover:bg-primary/90 shadow-sm shadow-primary/30 active:scale-90 transition-transform`}
                onClick={handleSend} disabled={sending}>
                <Send className={`h-5 w-5 ${sending ? "animate-pulse" : ""}`} />
              </Button>
            ) : (
              <Button size="icon" variant="ghost"
                className={`${isMobile ? "h-11 w-11" : "h-9 w-9"} flex-shrink-0 rounded-full text-primary hover:bg-primary/10 active:scale-90 transition-transform`}
                onClick={startRecording}>
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className={isMobile ? "max-w-[95vw] rounded-2xl" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Templates</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredTemplates.map((t) => (
                <button key={t.id} onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left p-3 rounded-xl border border-border/50 hover:border-primary/30 active:bg-primary/10 hover:bg-primary/5 transition-all group">
                  <div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold group-hover:text-primary">{t.name}</span><Badge variant="outline" className="text-[10px]">{t.category}</Badge></div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8"><FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">No templates found</p></div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
