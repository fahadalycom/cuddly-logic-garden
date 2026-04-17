import { type AgentCapacity, statusMeta, loadLevel, loadColor, loadBg } from "@/lib/queue-mock";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Users, Inbox } from "lucide-react";

interface Props {
  agent: AgentCapacity;
  compact?: boolean;
  onClick?: () => void;
}

export function AgentLoadCard({ agent, compact, onClick }: Props) {
  const sm = statusMeta(agent.status);
  const activeLvl = loadLevel(agent.active, agent.maxActive);
  const queueLvl = loadLevel(agent.queued, agent.maxQueue);
  const activePct = (agent.active / agent.maxActive) * 100;
  const queuePct = (agent.queued / agent.maxQueue) * 100;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 transition",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold", agent.avatarColor)}>
          {agent.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{agent.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", sm.dot)} />
            <span className={cn("text-[10px] font-medium", sm.text)}>{sm.label}</span>
            <span className="text-[10px] text-muted-foreground">· {agent.department}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Active</span>
              <span className={cn("text-[10px] font-semibold", loadColor(activeLvl))}>{agent.active}/{agent.maxActive}</span>
            </div>
            <Progress value={activePct} className={cn("h-1.5", `[&>div]:${loadBg(activeLvl)}`)} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Inbox className="h-3 w-3" /> Queue</span>
              <span className={cn("text-[10px] font-semibold", loadColor(queueLvl))}>{agent.queued}/{agent.maxQueue}</span>
            </div>
            <Progress value={queuePct} className={cn("h-1.5", `[&>div]:${loadBg(queueLvl)}`)} />
          </div>
        </div>
      )}
    </button>
  );
}
