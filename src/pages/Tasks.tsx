import { ListChecks } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { mockTasks } from "@/lib/mock-data";

export default function TasksPage() {
  const rows = mockTasks.map((t) => ({
    title: <span className="font-medium text-foreground">{t.title}</span>,
    related: <span className="text-xs px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground">{t.related}</span>,
    priority: <PriorityBadge priority={t.priority as any} />,
    status: <StatusBadge status={t.status as any} />,
    due: <span className="text-xs text-muted-foreground/70">{t.due}</span>,
  }));
  return (
    <PlaceholderPage
      title="Tasks"
      description="Workflow tasks across orders, conversations, leads and tickets"
      icon={ListChecks}
      primaryAction="Add task"
      columns={[
        { key: "title", label: "Task" },
        { key: "related", label: "Related" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
        { key: "due", label: "Due" },
      ]}
      rows={rows}
    />
  );
}
