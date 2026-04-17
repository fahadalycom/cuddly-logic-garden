import { useMemo, useState } from "react";
import { Search, Filter, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChannelIcon } from "./ChannelIcon";
import { ConvStatusBadge, QueueBadge } from "./ConvStatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import type { MockConversation, ConvChannel, ConvQueue, ConvStatus } from "@/lib/conversations-mock";
import { cn } from "@/lib/utils";

type QuickFilter = "all" | "unread" | "mine" | "sales" | "support" | "payments" | "renewals" | "high";

interface Props {
  conversations: MockConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentAgent?: string;
}

export function ConversationListPanel({ conversations, selectedId, onSelect, currentAgent = "Sara Ahmed" }: Props) {
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [channel, setChannel] = useState<ConvChannel | "all">("all");
  const [status, setStatus] = useState<ConvStatus | "all">("all");
  const [queue, setQueue] = useState<ConvQueue | "all">("all");

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (search && !`${c.customerName} ${c.lastMessage} ${c.customerPhone}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (channel !== "all" && c.channel !== channel) return false;
      if (status !== "all" && c.status !== status) return false;
      if (queue !== "all" && c.queue !== queue) return false;
      if (quick === "unread" && c.unread === 0) return false;
      if (quick === "mine" && c.assignedAgent !== currentAgent) return false;
      if (quick === "high" && c.priority !== "high" && c.priority !== "urgent") return false;
      if (["sales", "support", "payments", "renewals"].includes(quick) && c.queue !== quick) return false;
      return true;
    });
  }, [conversations, search, quick, channel, status, queue, currentAgent]);

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "mine", label: "Mine" },
    { key: "high", label: "High" },
    { key: "sales", label: "Sales" },
    { key: "support", label: "Support" },
    { key: "payments", label: "Payments" },
    { key: "renewals", label: "Renewals" },
  ];

  return (
    <div className="flex flex-col h-full bg-card/30 border-r border-border/40">
      {/* Header */}
      <div className="p-3 border-b border-border/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Inbox</h2>
            <span className="text-xs text-muted-foreground">({filtered.length})</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, message..."
            className="pl-8 h-8 text-xs bg-background/40 border-border/30 rounded-lg"
          />
        </div>

        {/* Quick filters */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {quickFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setQuick(f.key)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors",
                quick === f.key
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-background/30 text-muted-foreground border-border/30 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Selects */}
        <div className="grid grid-cols-3 gap-1">
          <SmallSelect value={channel} onChange={(v) => setChannel(v as any)} options={[
            { v: "all", l: "Channel" }, { v: "whatsapp", l: "WhatsApp" }, { v: "facebook", l: "Facebook" },
            { v: "instagram", l: "Instagram" }, { v: "email", l: "Email" }, { v: "web", l: "Web" },
          ]} />
          <SmallSelect value={status} onChange={(v) => setStatus(v as any)} options={[
            { v: "all", l: "Status" }, { v: "new", l: "New" }, { v: "active", l: "Active" },
            { v: "waiting_customer", l: "Waiting Cust." }, { v: "waiting_internal", l: "Waiting Int." },
            { v: "resolved", l: "Resolved" }, { v: "closed", l: "Closed" },
          ]} />
          <SmallSelect value={queue} onChange={(v) => setQueue(v as any)} options={[
            { v: "all", l: "Queue" }, { v: "sales", l: "Sales" }, { v: "support", l: "Support" },
            { v: "payments", l: "Payments" }, { v: "renewals", l: "Renewals" }, { v: "general", l: "General" },
          ]} />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <ul className="divide-y divide-border/30">
          {filtered.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/30 transition-colors flex gap-2.5",
                    active && "bg-primary/10 border-l-2 border-l-primary",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center text-xs font-semibold text-foreground/80">
                      {c.customerName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <ChannelIcon channel={c.channel} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{c.customerName}</p>
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">{c.lastTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <QueueBadge queue={c.queue} />
                      <ConvStatusBadge status={c.status} />
                      {(c.priority === "high" || c.priority === "urgent") && <PriorityBadge priority={c.priority} />}
                      {c.unread > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {c.assignedAgent ? `Assigned: ${c.assignedAgent}` : "Unassigned"}
                      </p>
                      {c.assignmentType && c.assignedAgent && (
                        <span
                          className={cn(
                            "shrink-0 px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wide border",
                            c.assignmentType === "auto" && "bg-primary/10 text-primary border-primary/20",
                            c.assignmentType === "sticky" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                            c.assignmentType === "manual" && "bg-muted/40 text-muted-foreground border-border/40",
                            c.assignmentType === "overflow" && "bg-destructive/10 text-destructive border-destructive/20",
                            c.assignmentType === "failover" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                            c.assignmentType === "escalation" && "bg-destructive/15 text-destructive border-destructive/30",
                          )}
                          title={`${c.assignmentType} assignment`}
                        >
                          {c.assignmentType === "auto" ? "Auto"
                            : c.assignmentType === "sticky" ? "Sticky"
                            : c.assignmentType === "manual" ? "Manual"
                            : c.assignmentType === "failover" ? "Failover"
                            : c.assignmentType === "escalation" ? "Escalated"
                            : "Overflow"}
                        </span>
                      )}
                      {(c.reassignmentCount ?? 0) > 0 && (
                        <span
                          className="shrink-0 px-1.5 py-px rounded text-[9px] font-semibold border bg-amber-500/10 text-amber-500 border-amber-500/20"
                          title={`Reassigned ${c.reassignmentCount} time${c.reassignmentCount === 1 ? "" : "s"}`}
                        >
                          ↻ {c.reassignmentCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-8 text-center text-xs text-muted-foreground">No conversations match your filters.</li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}

function SmallSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-[11px] rounded-md bg-background/40 border border-border/30 text-foreground px-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}
