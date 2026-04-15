import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Bot, Pin, Archive, Filter, MessageSquare, Clock, CheckCheck, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  conversations: any[];
  selectedId?: string;
  onSelect: (conv: any) => void;
}

type FilterType = "all" | "unread" | "waiting" | "active" | "resolved";

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    let list = conversations;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.customer_name || "").toLowerCase().includes(q) ||
          (c.customer_phone || "").includes(q) ||
          (c.last_message_preview || "").toLowerCase().includes(q)
      );
    }

    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    else if (filter === "waiting") list = list.filter((c) => c.status === "waiting");
    else if (filter === "active") list = list.filter((c) => c.status === "active");
    else if (filter === "resolved") list = list.filter((c) => c.status === "resolved");

    return list;
  }, [conversations, search, filter]);

  const unreadTotal = conversations.filter((c) => c.unread_count > 0).length;
  const waitingTotal = conversations.filter((c) => c.status === "waiting").length;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unreadTotal },
    { key: "waiting", label: "Waiting", count: waitingTotal },
    { key: "active", label: "Active" },
    { key: "resolved", label: "Resolved" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500";
      case "waiting": return "bg-amber-500";
      case "resolved": return "bg-muted-foreground/40";
      default: return "bg-muted-foreground/20";
    }
  };

  const getInitials = (conv: any) => {
    const name = conv.customer_name || conv.customer_phone || "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (conv: any) => {
    const name = conv.customer_name || conv.customer_phone || "";
    const colors = [
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-emerald-600",
      "from-violet-500 to-violet-600",
      "from-amber-500 to-amber-600",
      "from-rose-500 to-rose-600",
      "from-cyan-500 to-cyan-600",
      "from-pink-500 to-pink-600",
      "from-indigo-500 to-indigo-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background transition-colors rounded-xl"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted active:bg-muted"
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold ${
                  filter === f.key ? "bg-primary-foreground/20" : "bg-primary/20 text-primary"
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {filtered.map((conv) => {
            const isSelected = selectedId === conv.id;
            const hasUnread = conv.unread_count > 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-150 mb-0.5 group relative active:scale-[0.98] ${
                  isSelected
                    ? "bg-primary/10 border border-primary/20 shadow-sm"
                    : hasUnread
                    ? "bg-accent/30 active:bg-accent/50 border border-transparent"
                    : "active:bg-accent/40 border border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getAvatarColor(conv)} flex items-center justify-center shadow-sm`}>
                    <span className="text-sm font-bold text-white">
                      {getInitials(conv)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${getStatusColor(conv.status)}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[15px] truncate ${hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                      {conv.customer_name || conv.customer_phone}
                    </span>
                    {conv.last_message_at && (
                      <span className={`text-[11px] flex-shrink-0 ${hasUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-0.5 gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                      <p className={`text-[13px] truncate pr-1 ${hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                        {conv.last_message_preview || "No messages yet"}
                      </p>
                      {conv.assigned_agent_name && (
                        <span className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                          👤 {conv.assigned_agent_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.status === "waiting" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-500 bg-amber-500/10">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          Queue
                        </Badge>
                      )}
                      {hasUnread && (
                        <span className="bg-primary text-primary-foreground text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-sm shadow-primary/30">
                          {conv.unread_count > 99 ? "99+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No conversations found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {search ? "Try a different search term" : "New conversations will appear here"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
