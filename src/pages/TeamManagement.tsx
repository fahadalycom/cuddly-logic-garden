import { UsersRound } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { mockTeam } from "@/lib/mock-data";

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  on_break: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  offline: "bg-muted/40 text-muted-foreground border-border/30",
  inactive: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function TeamManagementPage() {
  const rows = mockTeam.map((m) => ({
    name: (
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white">
          {m.name.charAt(0)}
        </div>
        <span className="font-medium text-foreground">{m.name}</span>
      </div>
    ),
    role: m.role,
    department: <span className="text-xs px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground">{m.department}</span>,
    status: (
      <span className={`text-[11px] font-medium border px-2.5 py-0.5 rounded-lg ${statusColor[m.status]}`}>
        {m.status.replace("_", " ")}
      </span>
    ),
    chats: <span className="text-sm text-foreground/85">{m.chats}</span>,
  }));

  return (
    <PlaceholderPage
      title="Team Management"
      description="Manage staff, departments, availability and workload"
      icon={UsersRound}
      primaryAction="Invite member"
      columns={[
        { key: "name", label: "Member" },
        { key: "role", label: "Role" },
        { key: "department", label: "Department" },
        { key: "status", label: "Availability" },
        { key: "chats", label: "Active chats" },
      ]}
      rows={rows}
    />
  );
}
