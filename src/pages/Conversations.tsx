import { MessageSquare } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockConversations } from "@/lib/mock-data";

export default function ConversationsPage() {
  const rows = mockConversations.map((c) => ({
    customer: <span className="font-medium text-foreground">{c.customer}</span>,
    channel: <span className="text-xs px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground">{c.channel}</span>,
    queue: c.queue,
    status: <StatusBadge status={c.status as any} />,
    agent: c.agent,
    lastMessage: <span className="text-muted-foreground/80 truncate max-w-[240px] inline-block">{c.lastMessage}</span>,
    time: <span className="text-xs text-muted-foreground/60">{c.time}</span>,
  }));

  return (
    <PlaceholderPage
      title="Conversations"
      description="Unified inbox across WhatsApp, Instagram, Facebook and other channels"
      icon={MessageSquare}
      primaryAction="New conversation"
      columns={[
        { key: "customer", label: "Customer" },
        { key: "channel", label: "Channel" },
        { key: "queue", label: "Queue" },
        { key: "status", label: "Status" },
        { key: "agent", label: "Agent" },
        { key: "lastMessage", label: "Last message" },
        { key: "time", label: "Time" },
      ]}
      rows={rows}
    />
  );
}
