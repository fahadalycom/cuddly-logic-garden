import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, MoreHorizontal, UserPlus, Tag, Flag, StickyNote, Ticket, User, Paperclip, Smile, Send, RefreshCw, AlertTriangle, Package, ArrowRightLeft, RotateCw, X, Loader2, FileText, Download,
} from "lucide-react";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { ProductSelectorPanel } from "./ProductSelectorPanel";
import { TicketDialog } from "@/components/support/TicketDialog";
import { HandoffDialog } from "./HandoffDialog";
import type { HandoffQueue } from "@/lib/handoff";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChannelIcon } from "./ChannelIcon";
import { ConvStatusBadge, QueueBadge } from "./ConvStatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import { ConversationReliabilityStrip } from "./ConversationReliabilityStrip";
import { isFailedStatus, isPendingStatus } from "@/lib/message-status";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useConversationMessages, type SendAttachment } from "@/hooks/useConversationMessages";
import { useMessageRetry } from "@/hooks/useMessageRetry";
import { isRealConversationId } from "@/lib/conversations-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  mockNotesByConv, type MockConversation, type MockMessage, type MockInternalNote,
} from "@/lib/conversations-mock";
import { cn } from "@/lib/utils";

interface Props {
  conversation: MockConversation | null;
  onBack?: () => void;
  onToggleContext?: () => void;
}

type Tab = "messages" | "notes";

const MAX_FILE_BYTES = 16 * 1024 * 1024; // 16 MB

// Per-channel attachment capabilities (Meta API limits):
//   WhatsApp  — images, videos, audio, documents
//   Messenger — images, documents
//   Instagram — images only
type ChannelCaps = { canAttach: boolean; accept: string; allowDocs: boolean; note?: string };
const CHANNEL_CAPS: Record<string, ChannelCaps> = {
  whatsapp:  { canAttach: true, accept: "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt", allowDocs: true },
  facebook:  { canAttach: true, accept: "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt", allowDocs: true },
  instagram: { canAttach: true, accept: "image/*", allowDocs: false, note: "Instagram DMs only support images." },
};
const DEFAULT_CAPS: ChannelCaps = { canAttach: false, accept: "", allowDocs: false, note: "Attachments not supported on this channel." };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ConversationThreadPanel({ conversation, onBack, onToggleContext }: Props) {
  const [tab, setTab] = useState<Tab>("messages");
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [productPanelOpen, setProductPanelOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffSuggestion, setHandoffSuggestion] = useState<{ queue: HandoffQueue; reason: string } | undefined>();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<SendAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const { submitting, run } = useSubmitGuard();
  const { messages: liveMessages, sendMessage, isRealtime } = useConversationMessages(conversation?.id ?? null);
  const { retry: retryRemote, isRetrying } = useMessageRetry();
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { latestFailedId, lastInboundAt } = useMemo(() => {
    let failed: string | null = null;
    let inbound: string | null = null;
    for (const m of liveMessages) {
      if (m.sender === "agent" && isFailedStatus(m.status)) failed = m.id;
      if (m.sender === "customer" || m.direction === "inbound") inbound = m.time;
    }
    return { latestFailedId: failed, lastInboundAt: inbound };
  }, [liveMessages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8 bg-background/20">
        <div>
          <div className="h-14 w-14 rounded-2xl bg-muted/30 mx-auto mb-3 flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Select a conversation from the inbox</p>
        </div>
      </div>
    );
  }

  const messages: MockMessage[] = liveMessages;
  const notes: MockInternalNote[] = mockNotesByConv[conversation.id] || [];
  const canSend = isRealConversationId(conversation.id);
  const busy = submitting || uploading;
  const caps = CHANNEL_CAPS[conversation.channel] ?? DEFAULT_CAPS;

  const handleJumpToFailed = () => {
    if (!latestFailedId) return;
    const el = messageRefs.current[latestFailedId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(latestFailedId);
      window.setTimeout(() => setHighlightedId(null), 1500);
    }
  };

  const handleSend = () => run(async () => {
    const text = draft.trim();
    if (!text && !pendingAttachment) return;
    const attachment = pendingAttachment;
    setDraft("");
    setPendingAttachment(null);
    const result = await sendMessage(text, attachment ?? undefined);
    if (!result.ok) {
      setDraft(text);
      if (attachment) setPendingAttachment(attachment);
    }
  });

  const handleRetry = async (m: MockMessage) => {
    if (isRetrying(m.id) || isPendingStatus(m.status)) return;
    await retryRemote(m.id);
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setDraft((d) => d + emoji); return; }
    const start = ta.selectionStart ?? draft.length;
    const end = ta.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File is too large (${formatBytes(file.size)}). Max 16 MB.`);
      return;
    }
    const isImage = file.type.startsWith("image/");
    const isAllowedDoc = /pdf|msword|officedocument|excel|spreadsheet|text\/plain/i.test(file.type);
    if (!isImage && (!isAllowedDoc || !caps.allowDocs)) {
      toast.error(caps.allowDocs
        ? "Unsupported file type. Use image, PDF, Office doc or .txt."
        : caps.note ?? "This channel only accepts images.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `outbound/${Date.now()}_${crypto.randomUUID()}${ext ? "." + ext : ""}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
      setPendingAttachment({
        storageKey: path,
        url: pub.publicUrl,
        mime: file.type,
        filename: file.name,
        mediaType: isImage ? "image" : "document",
      });
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background/20 min-w-0">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/40">
        <div className="p-3 flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <ChannelIcon channel={conversation.channel} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{conversation.customerName}</p>
              <span className="text-[11px] text-muted-foreground truncate">{conversation.customerPhone}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <QueueBadge queue={conversation.queue} />
              <ConvStatusBadge status={conversation.status} />
              <PriorityBadge priority={conversation.priority} />
              <span className="text-[10px] text-muted-foreground/70 ml-1">
                {conversation.assignedAgent ? `· ${conversation.assignedAgent}` : "· Unassigned"}
              </span>
            </div>
          </div>
          <ConversationReliabilityStrip channel={conversation.channel} messages={messages} lastSyncLabel="just now" className="hidden" />
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onToggleContext}>
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Coming soon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions bar */}
        <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <ActionBtn icon={Package} label="Products" onClick={() => setProductPanelOpen(true)} />
          <ActionBtn
            icon={ArrowRightLeft}
            label="Transfer"
            onClick={() => { setHandoffSuggestion(undefined); setHandoffOpen(true); }}
          />
          <ActionBtn icon={UserPlus} label="Assign" disabled />
          <ActionBtn icon={Tag} label="Status" disabled />
          <ActionBtn icon={Flag} label="Priority" disabled />
          <ActionBtn icon={StickyNote} label="Add Note" onClick={() => setTab("notes")} />
          <ActionBtn
            icon={Ticket}
            label="Create Ticket"
            onClick={() => {
              setTicketOpen(true);
              setHandoffSuggestion({ queue: "support", reason: "Ticket created — route to support team" });
            }}
          />
          <ActionBtn icon={User} label="View Customer" disabled />
        </div>

        {/* Tabs */}
        <div className="px-3 flex gap-1 border-t border-border/30">
          {(["messages", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 capitalize transition-colors",
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t} {t === "notes" && notes.length > 0 && <span className="ml-1 text-[10px] opacity-70">({notes.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Reassignment / handoff banner */}
      {((conversation.reassignmentCount ?? 0) > 0 || conversation.autoSummary) && (
        <div className={cn(
          "px-3 py-2 border-b text-[11px] flex items-start gap-2",
          conversation.assignmentType === "escalation"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-amber-500/20 bg-amber-500/10 text-amber-200",
        )}>
          {conversation.assignmentType === "escalation"
            ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            : <RefreshCw className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {conversation.assignmentType === "escalation"
                ? "Escalated"
                : `Reassigned ${conversation.reassignmentCount}× — handoff context`}
              {conversation.previousAgent && (
                <span className="opacity-70 font-normal"> · was {conversation.previousAgent}</span>
              )}
            </p>
            {conversation.autoSummary && (
              <p className="opacity-80 mt-0.5">{conversation.autoSummary}</p>
            )}
          </div>
        </div>
      )}

      {/* Reliability strip */}
      <ConversationReliabilityStrip
        channel={conversation.channel}
        messages={messages}
        lastInboundAt={lastInboundAt}
        isRealtime={isRealtime}
        latestFailedId={latestFailedId}
        onJumpToFailed={handleJumpToFailed}
      />

      {/* Body */}
      <ScrollArea className="flex-1">
        {tab === "messages" ? (
          <div className="p-3 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                ref={(el) => { messageRefs.current[m.id] = el; }}
                className={cn(
                  "rounded-2xl transition-shadow",
                  highlightedId === m.id && "ring-2 ring-destructive/60 ring-offset-2 ring-offset-background",
                )}
              >
                <MessageBubble
                  m={m}
                  onRetry={() => handleRetry(m)}
                  isRetrying={isRetrying(m.id)}
                />
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">No messages yet.</p>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-amber-300">{n.author}</span>
                  <span className="text-[10px] text-muted-foreground">{n.time}</span>
                </div>
                <p className="text-xs text-foreground/90">{n.content}</p>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">No internal notes yet.</p>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="border-t border-border/40 bg-card/40 p-2 space-y-2">
        {tab === "messages" ? (
          <>
            {pendingAttachment && (
              <div className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/40 bg-background/40 text-xs",
                busy && "opacity-60",
              )}>
                {pendingAttachment.mediaType === "image" ? (
                  <img src={pendingAttachment.url} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{pendingAttachment.filename}</p>
                  <p className="text-[10px] text-muted-foreground">{pendingAttachment.mime}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={busy}
                  onClick={() => setPendingAttachment(null)}
                  title="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={caps.accept}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setProductPanelOpen(true)} title="Insert products" disabled={busy}>
                <Package className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleFilePick}
                disabled={!canSend || busy || !caps.canAttach}
                title={
                  !canSend ? "Connect channel to attach files"
                  : !caps.canAttach ? (caps.note ?? "Attachments not supported on this channel")
                  : caps.allowDocs ? "Attach image or document"
                  : (caps.note ?? "Attach image")
                }
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={busy} title="Insert emoji">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="p-0 border-border/50 w-auto">
                  <EmojiPicker
                    theme={EmojiTheme.DARK}
                    width={320}
                    height={380}
                    onEmojiClick={(e) => { insertEmoji(e.emoji); setEmojiOpen(false); }}
                  />
                </PopoverContent>
              </Popover>
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy && canSend && (draft.trim() || pendingAttachment)) handleSend();
                  }
                }}
                placeholder={
                  canSend
                    ? `Reply on ${conversation.channel}...`
                    : `${conversation.channel} not connected — set up the integration to send`
                }
                className="min-h-[40px] max-h-[120px] text-sm resize-none bg-background/40 border-border/30 rounded-lg"
                rows={1}
                disabled={!canSend || busy}
                title={canSend ? undefined : `Connect ${conversation.channel} in Channel Integrations to enable sending`}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={(!draft.trim() && !pendingAttachment) || busy || !canSend}
                onClick={handleSend}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal note (only visible to team)..."
              className="min-h-[40px] max-h-[120px] text-sm resize-none bg-amber-500/5 border-amber-500/20 rounded-lg"
              rows={1}
            />
            <Button size="sm" className="h-9 shrink-0 bg-amber-500/80 hover:bg-amber-500 text-background" disabled={!note.trim()} onClick={() => setNote("")}>
              Save Note
            </Button>
          </div>
        )}
      </div>

      <ProductSelectorPanel
        open={productPanelOpen}
        onOpenChange={setProductPanelOpen}
        onInsert={(text) => setDraft((prev) => (prev ? `${prev}\n\n${text}` : text))}
        conversationId={conversation.id}
        customerName={conversation.customerName}
        customerPhone={conversation.customerPhone}
        customerEmail={conversation.context?.email ?? null}
      />

      <TicketDialog
        open={ticketOpen}
        onOpenChange={(o) => {
          setTicketOpen(o);
          if (!o && handoffSuggestion) {
            setTimeout(() => setHandoffOpen(true), 300);
          }
        }}
        prefill={{
          conversationId: conversation.id,
          clientId: null,
          customerName: conversation.customerName,
          customerPhone: conversation.customerPhone,
          summary: conversation.lastMessage?.slice(0, 120) ?? null,
        }}
      />

      <HandoffDialog
        open={handoffOpen}
        onOpenChange={(o) => { setHandoffOpen(o); if (!o) setHandoffSuggestion(undefined); }}
        conversationId={conversation.id}
        currentQueue={conversation.queue}
        customerName={conversation.customerName}
        suggestedQueue={handoffSuggestion?.queue}
        suggestedReason={handoffSuggestion?.reason}
      />
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled }: { icon: any; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Coming soon" : undefined}
      className="h-7 px-2 text-[11px] gap-1.5 shrink-0 text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function MessageBubble({ m, onRetry, isRetrying }: { m: MockMessage; onRetry?: () => void; isRetrying?: boolean }) {
  if (m.sender === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-[10px] text-muted-foreground bg-muted/30 rounded-full px-2.5 py-0.5">{m.text} · {m.time}</span>
      </div>
    );
  }
  const isAgent = m.sender === "agent";
  const failed = isAgent && isFailedStatus(m.status);
  const pending = isAgent && isPendingStatus(m.status);
  const hasImage = m.mediaUrl && m.mediaType === "image";
  const hasDoc = m.mediaUrl && m.mediaType === "document";

  return (
    <div className={cn("flex flex-col gap-1", isAgent ? "items-end" : "items-start")}>
      <div className={cn("flex w-full", isAgent ? "justify-end" : "justify-start")}>
        <div className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          isAgent
            ? failed
              ? "bg-destructive/10 border border-destructive/40 text-foreground rounded-br-md"
              : "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted/40 text-foreground rounded-bl-md border border-border/30",
          pending && "opacity-80",
        )}>
          {!isAgent && m.senderName && (
            <p className="text-[10px] font-medium opacity-70 mb-0.5">{m.senderName}</p>
          )}
          {hasImage && (
            <a href={m.mediaUrl!} target="_blank" rel="noreferrer" className="block mb-1.5">
              <img
                src={m.mediaUrl!}
                alt={m.mediaFilename ?? "attachment"}
                className="max-h-60 max-w-full rounded-lg object-cover"
                loading="lazy"
              />
            </a>
          )}
          {hasDoc && (
            <a
              href={m.mediaUrl!}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 mb-1.5 border text-xs",
                isAgent ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-background/40 border-border/40",
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{m.mediaFilename ?? "Document"}</span>
              <Download className="h-3.5 w-3.5 opacity-70" />
            </a>
          )}
          {m.text && (
            <p className="leading-snug whitespace-pre-wrap break-words">{m.text}</p>
          )}
          <div className={cn("flex items-center gap-1 mt-1 text-[10px]", isAgent && !failed ? "text-primary-foreground/70 justify-end" : "text-muted-foreground justify-end")}>
            <span>{m.time}</span>
            {isAgent && (
              <MessageStatusIndicator
                status={m.status ?? "delivered"}
                errorMessage={m.errorMessage}
                retryCount={m.retryCount}
              />
            )}
          </div>
        </div>
      </div>
      {failed && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-[10px] text-destructive max-w-[260px] truncate">
            {m.errorMessage || "Failed to deliver"}
          </span>
          {(m.retryCount ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground">· {m.retryCount}× retried</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={isRetrying || m.status === "permanently_failed"}
            onClick={onRetry}
          >
            <RotateCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
            {m.status === "permanently_failed" ? "Cannot retry" : "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}
