import { Handshake } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockVendors } from "@/lib/mock-data";

export default function VendorsPage() {
  const rows = mockVendors.map((v) => ({
    name: <span className="font-medium text-foreground">{v.name}</span>,
    category: v.category,
    deals: <span className="text-sm text-foreground/85">{v.deals}</span>,
    status: <StatusBadge status={v.status as any} />,
  }));

  return (
    <PlaceholderPage
      title="Vendors & Deals"
      description="Suppliers, partners and active deals/coupons"
      icon={Handshake}
      primaryAction="Add vendor"
      columns={[
        { key: "name", label: "Vendor" },
        { key: "category", label: "Category" },
        { key: "deals", label: "Active deals" },
        { key: "status", label: "Status" },
      ]}
      rows={rows}
    />
  );
}
