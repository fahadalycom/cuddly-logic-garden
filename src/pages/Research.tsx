import { FlaskConical } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockToolRequests } from "@/lib/mock-data";

export default function ResearchPage() {
  const rows = mockToolRequests.map((t) => ({
    tool: <span className="font-medium text-foreground">{t.tool}</span>,
    category: t.category,
    demand: <span className="text-sm font-semibold text-primary">{t.demand} requests</span>,
    status: <StatusBadge status={t.status as any} />,
  }));

  return (
    <PlaceholderPage
      title="Research & Demand"
      description="Track customer demand for new tools and subscriptions"
      icon={FlaskConical}
      primaryAction="Log request"
      columns={[
        { key: "tool", label: "Tool" },
        { key: "category", label: "Category" },
        { key: "demand", label: "Demand" },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}
