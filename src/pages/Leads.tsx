import { UserPlus } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockLeads } from "@/lib/mock-data";

export default function LeadsPage() {
  const rows = mockLeads.map((l) => ({
    name: <span className="font-medium text-foreground">{l.name}</span>,
    source: <span className="text-xs px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground">{l.source}</span>,
    interest: l.interest,
    status: <StatusBadge status={l.status as any} />,
    assigned: l.assigned,
  }));

  return (
    <PlaceholderPage
      title="Leads"
      description="Track prospects from first contact to conversion"
      icon={UserPlus}
      primaryAction="Add lead"
      columns={[
        { key: "name", label: "Name" },
        { key: "source", label: "Source" },
        { key: "interest", label: "Interest" },
        { key: "status", label: "Status" },
        { key: "assigned", label: "Assigned to" },
      ]}
      rows={rows}
    />
  );
}
