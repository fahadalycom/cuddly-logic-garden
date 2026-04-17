import { KeyRound } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockProvisioning } from "@/lib/mock-data";

export default function ProvisioningPage() {
  const rows = mockProvisioning.map((p) => ({
    product: <span className="font-medium text-foreground">{p.product}</span>,
    email: <code className="text-xs px-2 py-0.5 rounded bg-muted/40 text-muted-foreground">{p.email}</code>,
    seats: <span className="text-foreground/85">{p.used} / {p.capacity}</span>,
    status: <StatusBadge status={p.status as any} />,
    expiry: <span className="text-xs text-muted-foreground/70">in {p.expiry}</span>,
  }));

  return (
    <PlaceholderPage
      title="Account Provisioning"
      description="Manage shared/private accounts, capacity, and allocations"
      icon={KeyRound}
      primaryAction="Add account"
      columns={[
        { key: "product", label: "Product" },
        { key: "email", label: "Email" },
        { key: "seats", label: "Seats" },
        { key: "status", label: "Status" },
        { key: "expiry", label: "Expiry" },
      ]}
      rows={rows}
    />
  );
}
