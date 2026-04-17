import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ChannelIcon } from "./ChannelIcon";
import { QueueBadge } from "./ConvStatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { AgentLoadCard } from "./AgentLoadCard";
import { mockAgents, mockQueueItems, loadLevel, loadColor, type QueueItem } from "@/lib/queue-mock";
import { AlertTriangle, Clock, Layers, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUEUES: Array<{ key: "all" | "sales" | "support" | "payments" | "renewals" | "overflow"; label: string }> = [
  { key: "all", label: "All" },
  { key: "sales", label: "Sales" },
  { key: "support", label: "Support" },
  { key: "payments", label: "Payments" },
  { key: "renewals", label: "Renewals" },
  { key: "overflow", label: "Overflow" },
];

export function QueueOverviewPanel() {
  const [filter, setFilter] = useState<typeof QUEUES[number]["key"]>("all");
  const [items, setItems] = useState<QueueItem[]>(mockQueueItems);
  const [agents] = useState(mockAgents);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, sales: 0, support: 0, payments: 0, renewals: 0, overflow: 0 };
    items.forEach((i) => { c[i.queueType] = (c[i.queueType] ?? 0) + 1; });
    return c;
  }, [items]);

  const filtered = useMemo(() => filter === "all" ? items : items.filter((i) => i.queueType === filter), [items, filter]);

  const overflowCount = counts.overflow ?? 0;
  const totalLoad = agents.reduce((s, a) => s + a.active, 0);
  const totalCap = agents.reduce((s, a) => s + a.maxActive, 0);
  const fullAgents = agents.filter((a) => a.active >= a.maxActive).length;

  const assign = (item: QueueItem, agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)!;
    if (agent.active >= agent.maxActive && agent.queued >= agent.maxQueue) {
      toast.error(`${agent.name} is at full capacity`, { description: "Conversation kept in overflow queue." });
      return;
    }
    if (agent.active >= agent.maxActive) {
      toast.warning(`${agent.name} at active capacity`, { description: "Added to their personal queue." });
    } else {
      toast.success(`Assigned to ${agent.name}`);
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top KPI strip */}
      <div className="border-b border-border/60 px-4 py-3 grid grid-cols-3 gap-3">
        <KPI label="System Load" value={`${totalLoad}/${totalCap}`} accent={loadColor(loadLevel(totalLoad, totalCap))} icon={<Layers className="h-3.5 w-3.5" />} />
        <KPI label="Overflow Queue" value={String(overflowCount)} accent={overflowCount > 3 ? "text-destructive" : "text-muted-foreground"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <KPI label="Agents Full" value={`${fullAgents}/${agents.length}`} accent={fullAgents > 0 ? "text-amber-500" : "text-emerald-500"} icon={<Zap className="h-3.5 w-3.5" />} />
      </div>

      <Tabs defaultValue="queues" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
        </TabsList>

        {/* QUEUES TAB */}
        <TabsContent value="queues" className="flex-1 overflow-hidden m-0 mt-3">
          <div className="px-4 flex flex-wrap gap-1.5 mb-2">
            {QUEUES.map((q) => (
              <Button
                key={q.key}
                size="sm"
                variant={filter === q.key ? "default" : "outline"}
                className="h-7 text-xs rounded-full px-3 gap-1.5"
                onClick={() => setFilter(q.key)}
              >
                {q.label}
                <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                  {counts[q.key] ?? 0}
                </Badge>
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1 h-full">
            <div className="px-4 pb-4 space-y-2">
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <Layers className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No conversations in this queue</p>
                </div>
              )}

              {filtered.map((item) => (
                <div key={item.id} className={cn(
                  "rounded-xl border p-3 bg-card",
                  item.queueType === "overflow" && "border-destructive/30 bg-destructive/5",
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5"><ChannelIcon channel={item.channel} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{item.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.preview}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="text-[10px]">Assign to agent</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {agents.map((a) => {
                          const lvl = loadLevel(a.active, a.maxActive);
                          const disabled = a.status === "offline" || (a.active >= a.maxActive && a.queued >= a.maxQueue);
                          const dotCls =
                            a.status === "available" ? "bg-emerald-500" :
                            a.status === "busy" ? "bg-amber-500" :
                            a.status === "at_capacity" ? "bg-destructive" :
                            "bg-muted-foreground/40";
                          return (
                            <DropdownMenuItem key={a.id} disabled={disabled} onClick={() => assign(item, a.id)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full mr-2", dotCls)} />
                              <span className="flex-1">{a.name}</span>
                              <span className={cn("text-[10px] ml-2", loadColor(lvl))}>{a.active}/{a.maxActive}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5">
                    <QueueBadge queue={item.queueType === "overflow" ? "general" : item.queueType} />
                    <PriorityBadge priority={item.priority} />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" />
                      {item.waitedMinutes < 60 ? `${item.waitedMinutes}m` : `${Math.floor(item.waitedMinutes / 60)}h ${item.waitedMinutes % 60}m`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* AGENTS TAB */}
        <TabsContent value="agents" className="flex-1 overflow-hidden m-0 mt-3">
          <ScrollArea className="h-full">
            <div className="px-4 pb-4 space-y-2">
              {agents.map((a) => <AgentLoadCard key={a.id} agent={a} />)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={cn("text-base font-bold mt-0.5", accent)}>{value}</div>
    </div>
  );
}
