import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, AlertTriangle, Zap, MessageSquareQuote, FileText, Wand2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aiAssist, deriveConversationHints, type ConversationHints } from "@/lib/automation";
import { supabase } from "@/integrations/supabase/client";
import {
  mockMessagesByConv,
  type MockConversation,
} from "@/lib/conversations-mock";

type Template = { id: string; name: string; body: string; category: string };

interface Props {
  conversation: MockConversation | null;
  onUseDraft: (text: string) => void;
  enabled: {
    suggestions: boolean;
    handoff: boolean;
    summary: boolean;
    reply: boolean;
  };
}

const QUEUE_LABELS: Record<ConversationHints["queue"], string> = {
  sales: "Sales", support: "Support", payment: "Payments",
  renewal: "Renewals", general: "General",
};

const PRIORITY_TONE: Record<ConversationHints["priority"], string> = {
  low: "bg-muted/40 text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-orange-500/15 text-orange-300",
  urgent: "bg-rose-500/15 text-rose-300",
};

const NEXT_ACTION_LABELS: Record<ConversationHints["next_action"], string> = {
  send_product_info: "Send product info",
  create_order: "Create order",
  create_ticket: "Create support ticket",
  transfer_to_payments: "Transfer → Payments",
  transfer_to_support: "Transfer → Support",
  transfer_to_renewals: "Transfer → Renewals",
  follow_up_later: "Follow up later",
  request_payment_proof: "Request payment proof",
};

export function SmartAssistPanel({ conversation, onUseDraft, enabled }: Props) {
  const transcript = useMemo(() => {
    if (!conversation) return "";
    const msgs = mockMessagesByConv[conversation.id] ?? [];
    return msgs.slice(-8).map((m) => `${m.sender}: ${m.text}`).join("\n");
  }, [conversation]);

  const heuristic = useMemo<ConversationHints | null>(() => {
    if (!conversation) return null;
    return deriveConversationHints({
      transcript,
      reassignmentCount: 0,
      hasUnresolvedTicket: (conversation.context?.openTickets?.length ?? 0) > 0,
      expiringSubscription: false,
    });
  }, [conversation, transcript]);

  const [aiHints, setAiHints] = useState<ConversationHints | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);

  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [draft, setDraft] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSource, setDraftSource] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("message_templates").select("id,name,body,category").eq("is_active", true).limit(20)
      .then(({ data }) => setTemplates((data as Template[]) ?? []));
  }, []);

  // Reset on conversation switch
  useEffect(() => {
    setAiHints(null); setSummary(""); setDraft(""); setDraftSource(null);
  }, [conversation?.id]);

  const hints = aiHints ?? heuristic;

  if (!conversation) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Pick a conversation to get smart suggestions.
      </div>
    );
  }

  if (!enabled.suggestions) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Smart Assist is disabled. Enable it in Settings → Automation.
      </div>
    );
  }

  const runClassify = async () => {
    setClassifyLoading(true);
    const r = await aiAssist.classify({ transcript, customer_name: conversation.customerName });
    setClassifyLoading(false);
    if (r.ok) {
      setAiHints(r.data.result as ConversationHints);
      toast.success("AI classification applied");
    } else {
      toast.error(r.error);
    }
  };

  const runSummary = async () => {
    setSummaryLoading(true);
    const r = await aiAssist.summarize({ target: "conversation", context: transcript });
    setSummaryLoading(false);
    if (!r.ok) { toast.error(r.error); return; }
    setSummary(r.data.summary);
  };

  const runRewrite = async (tpl: Template) => {
    setDraftLoading(true); setDraftSource(tpl.name);
    const r = await aiAssist.rewriteTemplate({
      template: tpl.body, transcript, customer_name: conversation.customerName,
    });
    setDraftLoading(false);
    if (!r.ok) { toast.error(r.error); return; }
    setDraft(r.data.reply);
  };

  const runFreshReply = async () => {
    setDraftLoading(true); setDraftSource("AI draft");
    const r = await aiAssist.suggestReply({ transcript, customer_name: conversation.customerName });
    setDraftLoading(false);
    if (!r.ok) { toast.error(r.error); return; }
    setDraft(r.data.reply);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Smart Assist</h3>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {aiHints ? "AI" : "Heuristic"}
          </Badge>
        </div>

        {/* Hints */}
        {hints && (
          <Card className="p-3 space-y-2 bg-card/40">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{QUEUE_LABELS[hints.queue]}</Badge>
              <Badge className={cn("text-[10px] border-0", PRIORITY_TONE[hints.priority])}>
                {hints.priority.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Zap className="h-3 w-3 text-primary" />
              <span className="font-medium">Next:</span>
              <span className="text-muted-foreground">{NEXT_ACTION_LABELS[hints.next_action]}</span>
            </div>
            <p className="text-[11px] text-muted-foreground italic">{hints.reason}</p>
            {hints.risks.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-border/40">
                {hints.risks.map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-300">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {r}
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs w-full" onClick={runClassify} disabled={classifyLoading}>
              {classifyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
              Refine with AI
            </Button>
          </Card>
        )}

        {/* Summary */}
        {enabled.summary && (
          <Card className="p-3 space-y-2 bg-card/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" /> Conversation summary
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={runSummary} disabled={summaryLoading}>
                {summaryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
              </Button>
            </div>
            {summary ? (
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="text-xs min-h-[64px] resize-none bg-background/50"
              />
            ) : (
              <p className="text-[11px] text-muted-foreground">Click Generate to summarize this conversation for handoff.</p>
            )}
          </Card>
        )}

        <Separator />

        {/* Reply suggestions */}
        {enabled.reply && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <MessageSquareQuote className="h-3.5 w-3.5 text-primary" /> Suggested reply
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={runFreshReply} disabled={draftLoading}>
                {draftLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "AI draft"}
              </Button>
            </div>

            {templates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {templates.slice(0, 6).map((t) => (
                  <Button
                    key={t.id}
                    size="sm" variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => runRewrite(t)}
                    disabled={draftLoading}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            )}

            {draft && (
              <Card className="p-2 space-y-2 bg-background/50">
                {draftSource && (
                  <div className="text-[10px] text-muted-foreground">Source: {draftSource}</div>
                )}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="text-xs min-h-[80px] resize-none"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={() => { onUseDraft(draft); toast.success("Draft inserted"); }}>
                    <Check className="h-3 w-3 mr-1" /> Use draft
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => { setDraft(""); setDraftSource(null); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            )}
            <p className="text-[10px] text-muted-foreground italic">
              Drafts are never auto-sent. Review and edit before sending.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
