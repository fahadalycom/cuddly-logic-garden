import { Badge } from "@/components/ui/badge";

type Priority = "low" | "medium" | "high" | "urgent";

const map: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted/50 text-muted-foreground border-border/30" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  high: { label: "High", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  urgent: { label: "Urgent", className: "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = map[priority] || map.medium;
  return (
    <Badge variant="outline" className={`${c.className} text-[11px] font-medium border px-2.5 py-0.5 rounded-lg`}>
      {c.label}
    </Badge>
  );
}
