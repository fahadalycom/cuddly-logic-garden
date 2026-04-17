import { LifeBuoy } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { mockTickets } from "@/lib/mock-data";

export default function SupportPage() {
  const rows = mockTickets.map((t) => ({
    subject: <span className="font-medium text-foreground">{t.subject}</span>,
    customer: t.customer,
    priority: <PriorityBadge priority={t.priority as any} />,
    status: <StatusBadge status={t.status as any} />,
    assigned: t.assigned,
  }));

  return (
    <PlaceholderPage
      title="Support Tickets"
      description="Customer issues, complaints and resolutions"
      icon={LifeBuoy}
      primaryAction="New ticket"
      columns={[
        { key: "subject", label: "Subject" },
        { key: "customer", label: "Customer" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
        { key: "assigned", label: "Assigned" },
      ]}
      rows={rows}
    />
  );
}
