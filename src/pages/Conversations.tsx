import { useState } from "react";
import { ConversationListPanel } from "@/components/conversations/ConversationListPanel";
import { ConversationThreadPanel } from "@/components/conversations/ConversationThreadPanel";
import { ConversationContextPanel } from "@/components/conversations/ConversationContextPanel";
import { QueueOverviewPanel } from "@/components/conversations/QueueOverviewPanel";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/useConversations";
import { Inbox, Layers, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type View = "inbox" | "queues";

export default function ConversationsPage() {
  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const { conversations } = useConversations();
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  // On mobile: list visible until a chat is selected; then thread takes over.
  const showThreadMobile = !!selectedId && !contextOpen;
  const showContextMobile = !!selectedId && contextOpen;
  const showListMobile = !selectedId;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* View switcher */}
      <div className="border-b border-border/40 px-3 py-1.5 flex items-center gap-2 bg-card/30 shrink-0">
        <Button
          size="sm"
          variant={view === "inbox" ? "default" : "ghost"}
          className="h-7 rounded-full gap-1.5 text-xs"
          onClick={() => { setView("inbox"); setSelectedId(null); }}
        >
          <Inbox className="h-3.5 w-3.5" />
          Inbox
          <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{conversations.length}</Badge>
        </Button>
        <Button
          size="sm"
          variant={view === "queues" ? "default" : "ghost"}
          className="h-7 rounded-full gap-1.5 text-xs"
          onClick={() => setView("queues")}
        >
          <Layers className="h-3.5 w-3.5" />
          Queues
        </Button>
      </div>

      {view === "queues" ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <QueueOverviewPanel />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* List panel — visible on mobile only when no chat is selected */}
          <div className={cn(
            "w-full lg:w-[340px] xl:w-[380px] shrink-0 border-r border-border/40 flex-col min-h-0",
            showListMobile ? "flex" : "hidden lg:flex",
          )}>
            <ConversationListPanel
              conversations={conversations}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setContextOpen(false); }}
            />
          </div>

          {/* Thread panel — visible on mobile only when a chat is selected and context isn't open */}
          <div className={cn(
            "flex-1 min-w-0 min-h-0 flex-col",
            showThreadMobile ? "flex" : "hidden lg:flex",
          )}>
            {selected ? (
              <ConversationThreadPanel
                conversation={selected}
                onBack={() => setSelectedId(null)}
                onToggleContext={() => setContextOpen(true)}
              />
            ) : (
              <div className="hidden lg:flex flex-1 items-center justify-center text-center p-8 bg-background/40">
                <div>
                  <div className="h-16 w-16 rounded-2xl bg-muted/30 mx-auto mb-3 flex items-center justify-center">
                    <MessageSquare className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground/80">Select a conversation to start</p>
                  <p className="text-xs text-muted-foreground mt-1">Pick a chat from the inbox on the left.</p>
                </div>
              </div>
            )}
          </div>

          {/* Context panel — full-screen on mobile when toggled, side panel on desktop */}
          <div className={cn(
            "w-full lg:w-[320px] xl:w-[360px] shrink-0 flex-col min-h-0",
            showContextMobile ? "flex" : "hidden lg:flex",
          )}>
            <ConversationContextPanel
              conversation={selected}
              onClose={() => setContextOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
