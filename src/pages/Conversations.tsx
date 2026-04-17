import { useState } from "react";
import { ConversationListPanel } from "@/components/conversations/ConversationListPanel";
import { ConversationThreadPanel } from "@/components/conversations/ConversationThreadPanel";
import { ConversationContextPanel } from "@/components/conversations/ConversationContextPanel";
import { mockConversationsList } from "@/lib/conversations-mock";
import { cn } from "@/lib/utils";

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(mockConversationsList[0]?.id ?? null);
  const [contextOpen, setContextOpen] = useState(false);
  const selected = mockConversationsList.find((c) => c.id === selectedId) ?? null;

  // Mobile view state: list -> thread (tap conv) -> context (tap user icon)
  const showThreadOnMobile = !!selectedId;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* Left: list */}
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

      {/* Center: thread */}
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

      {/* Right: context */}
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
  );
}
