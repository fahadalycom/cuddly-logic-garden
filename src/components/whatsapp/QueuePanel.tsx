import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, Clock, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QueuePanelProps {
  queue: any[];
  staff: any[];
  isAdmin: boolean;
  onAssign: (conversationId: string, agentId: string) => Promise<void>;
}

export function QueuePanel({ queue, staff, isAdmin, onAssign }: QueuePanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Waiting Queue ({queue.length})
        </p>

        {queue.map((item) => {
          const conv = item.wa_conversations;
          return (
            <div key={item.id} className="p-3 rounded-lg border border-border/50 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{conv?.customer_name || conv?.customer_phone || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{conv?.customer_phone}</p>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {staff.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => onAssign(item.conversation_id, s.user_id)}>
                          <UserPlus className="h-3.5 w-3.5 mr-2" /> {s.full_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {conv?.last_message_preview || "No preview"}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </div>
                {item.reason && (
                  <Badge variant="outline" className="text-[9px]">{item.reason}</Badge>
                )}
              </div>
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No conversations in queue</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
