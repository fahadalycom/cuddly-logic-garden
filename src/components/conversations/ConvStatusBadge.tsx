import { Badge } from "@/components/ui/badge";
import type { ConvStatus, ConvQueue } from "@/lib/conversations-mock";

const statusMap: Record<ConvStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  waiting_customer: { label: "Waiting Customer", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  waiting_internal: { label: "Waiting Internal", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  resolved: { label: "Resolved", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed: { label: "Closed", className: "bg-muted/50 text-muted-foreground border-border/30" },
};

const queueMap: Record<ConvQueue, string> = {
  sales: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  support: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  payments: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  renewals: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  general: "bg-muted/50 text-muted-foreground border-border/30",
};

export function ConvStatusBadge({ status }: { status: ConvStatus }) {
  const c = statusMap[status];
  return (
    <Badge variant="outline" className={`${c.className} text-[10px] font-medium border px-2 py-0.5 rounded-md`}>
      {c.label}
    </Badge>
  );
}

export function QueueBadge({ queue }: { queue: ConvQueue }) {
  return (
    <Badge variant="outline" className={`${queueMap[queue]} text-[10px] font-medium border px-2 py-0.5 rounded-md capitalize`}>
      {queue}
    </Badge>
  );
}
