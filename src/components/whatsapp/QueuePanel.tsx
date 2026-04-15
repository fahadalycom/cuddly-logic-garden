import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, Clock, AlertTriangle, Inbox, Timer, Zap } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

interface QueuePanelProps {
  queue: any[];
  staff: any[];
  isAdmin: boolean;
  onAssign: (conversationId: string, agentId: string) => Promise<void>;
}

export function QueuePanel({ queue, staff, isAdmin, onAssign }: QueuePanelProps) {
  const getPriorityConfig = (priority: number) => {
    if (priority >= 8) return { label: "Urgent", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", icon: AlertTriangle };
    if (priority >= 5) return { label: "High", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: Timer };
    return { label: "Normal", color: "text-muted-foreground", bg: "bg-muted/50 border-border", icon: Clock };
  };

  const getWaitTimeColor = (createdAt: string) => {
    const mins = differenceInMinutes(new Date(), new Date(createdAt));
    if (mins < 5) return "text-emerald-500";
    if (mins < 15) return "text-amber-500";
    return "text-red-500";
  };

  const handleAutoAssign = async () => {
    if (queue.length === 0 || staff.length === 0) return;
    // Round-robin: assign each queue item to next available staff
    for (let i = 0; i < queue.length; i++) {
      const staffMember = staff[i % staff.length];
      await onAssign(queue[i].conversation_id, staffMember.user_id);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Waiting Queue
          </span>
          <div className="flex items-center gap-1.5">
            {isAdmin && queue.length > 0 && staff.length > 0 && (
              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-lg gap-1" onClick={handleAutoAssign}>
                <Zap className="h-3 w-3" />
                Auto-assign
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] h-5">
              {queue.length} pending
            </Badge>
          </div>
        </div>

        {queue.map((item) => {
          const conv = item.wa_conversations;
          const priority = getPriorityConfig(item.priority);
          const PriorityIcon = priority.icon;
          const waitTime = formatDistanceToNow(new Date(item.created_at), { addSuffix: false });
          const waitColor = getWaitTimeColor(item.created_at);

          return (
            <div key={item.id} className={`p-3.5 rounded-xl border ${priority.bg} space-y-2.5 transition-all hover:shadow-sm`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {(conv?.customer_name || conv?.customer_phone || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{conv?.customer_name || conv?.customer_phone || "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground">{conv?.customer_phone}</p>
                  </div>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {staff.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => onAssign(item.conversation_id, s.user_id)}>
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-[10px] font-bold text-primary">
                            {s.full_name?.charAt(0)}
                          </div>
                          {s.full_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {conv?.last_message_preview || "No preview available"}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PriorityIcon className={`h-3 w-3 ${priority.color}`} />
                  <span className={`text-[10px] font-medium ${priority.color}`}>{priority.label}</span>
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-medium ${waitColor}`}>
                  <Clock className="h-3 w-3" />
                  {waitTime}
                </div>
              </div>

              {item.reason && (
                <Badge variant="outline" className="text-[9px] w-fit">{item.reason}</Badge>
              )}
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="text-center py-12">
            <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Queue is empty</p>
            <p className="text-xs text-muted-foreground/60 mt-1">All conversations are assigned</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
