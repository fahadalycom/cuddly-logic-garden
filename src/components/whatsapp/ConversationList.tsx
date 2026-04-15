import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Bot } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  conversations: any[];
  selectedId?: string;
  onSelect: (conv: any) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(
    (c) =>
      (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone || "").includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-1">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent/50 ${
                selectedId === conv.id ? "bg-accent" : ""
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {(conv.customer_name || conv.customer_phone || "?").charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">
                    {conv.customer_name || conv.customer_phone}
                  </span>
                  {conv.last_message_at && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate pr-2">
                    {conv.last_message_preview || "No messages yet"}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {conv.status === "waiting" && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-500">
                        Queue
                      </Badge>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
