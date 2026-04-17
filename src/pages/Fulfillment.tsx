import { Truck } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function FulfillmentPage() {
  const rows = [
    { order: <span className="font-medium text-foreground">#1024</span>, customer: "Ahmed Khan", product: "ChatGPT Pro × 1", status: <StatusBadge status={"to_deliver" as any} />, age: "2h" },
    { order: <span className="font-medium text-foreground">#1025</span>, customer: "Maria Lopez", product: "Netflix Family × 1", status: <StatusBadge status={"to_deliver" as any} />, age: "5h" },
    { order: <span className="font-medium text-foreground">#1026</span>, customer: "John Doe", product: "Canva Pro × 1", status: <StatusBadge status={"delivered" as any} />, age: "1d" },
  ];
  return (
    <PlaceholderPage
      title="Fulfillment"
      description="Orders ready to deliver and provisioning queue"
      icon={Truck}
      primaryAction="Mark delivered"
      columns={[
        { key: "order", label: "Order" },
        { key: "customer", label: "Customer" },
        { key: "product", label: "Product" },
        { key: "status", label: "Status" },
        { key: "age", label: "Age" },
      ]}
      rows={rows}
    />
  );
}
