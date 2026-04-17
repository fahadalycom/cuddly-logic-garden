import { useState } from "react";
import { ConversationListPanel } from "@/components/conversations/ConversationListPanel";
import { ConversationThreadPanel } from "@/components/conversations/ConversationThreadPanel";
import { ConversationContextPanel } from "@/components/conversations/ConversationContextPanel";
import { QueueOverviewPanel } from "@/components/conversations/QueueOverviewPanel";
import { Button } from "@/components/ui/button";
import { mockConversationsList } from "@/lib/conversations-mock";
import { mockQueueItems } from "@/lib/queue-mock";
import { Inbox, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type View = "inbox" | "queues";

export default function ConversationsPage() {
  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(mockConversationsList[0]?.id ?? null);
  const [contextOpen, setContextOpen] = useState(false);
  const selected = mockConversationsList.find((c) => c.id === selectedId) ?? null;
  const showThreadOnMobile = !!selectedId;

  const overflowCount = mockQueueItems.filter((q) => q.queueType === "overflow").length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* View switcher */}
      <div className="border-b border-border/60 px-4 py-2 flex items-center gap-2 bg-background/60 backdrop-blur">
        <Button
          size="sm"
          variant={view === "inbox" ? "default" : "ghost"}
          className="h-8 rounded-full gap-1.5"
          onClick={() => setView("inbox")}
        >
          <Inbox className="h-3.5 w-3.5" />
          Inbox
        </Button>
        <Button
          size="sm"
          variant={view === "queues" ? "default" : "ghost"}
          className="h-8 rounded-full gap-1.5"
          onClick={() => setView("queues")}
        >
          <Layers className="h-3.5 w-3.5" />
          Queues
          <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{mockQueueItems.length}</Badge>
          {overflowCount > 0 && (
            <Badge className="h-4 text-[10px] px-1.5 bg-destructive text-destructive-foreground">{overflowCount} overflow</Badge>
          )}
        </Button>
      </div>

      {view === "queues" ? (
        <div className="flex-1 overflow-hidden">
          <QueueOverviewPanel />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className={cn(
            "w-full lg:w-[340px] xl:w-[360px] shrink-0",
            showThreadOnMobile && "hidden lg:flex lg:flex-col",
            "flex flex-col",
          )}>
            <ConversationListPanel
              conversations={mockConversationsList}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setContextOpen(false); }}
            />
          </div>

          <div className={cn(
            "flex-1 min-w-0",
            !showThreadOnMobile && "hidden lg:flex",
            contextOpen && "hidden lg:flex",
            "flex flex-col",
          )}>
            <ConversationThreadPanel
              conversation={selected}
              onBack={() => setSelectedId(null)}
              onToggleContext={() => setContextOpen(true)}
            />
          </div>

          <div className={cn(
            "w-full lg:w-[320px] xl:w-[340px] shrink-0",
            contextOpen ? "flex flex-col" : "hidden lg:flex lg:flex-col",
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
