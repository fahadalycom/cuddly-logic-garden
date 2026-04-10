import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus, AccountStatus, SubscriptionStatus, TrustTag, IssueStatus } from "@/types/database";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending_payment: { label: "Pending Payment", variant: "outline" },
  paid_unverified: { label: "Paid (Unverified)", variant: "default" },
  paid_verified: { label: "Verified", variant: "default" },
  to_deliver: { label: "To Deliver", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  pending: { label: "Pending", variant: "outline" },
  verified: { label: "Verified", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  available: { label: "Available", variant: "default" },
  assigned: { label: "Assigned", variant: "secondary" },
  exhausted: { label: "Exhausted", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
  active: { label: "Active", variant: "default" },
  expiring: { label: "Expiring", variant: "outline" },
  renewed: { label: "Renewed", variant: "default" },
  terminated: { label: "Terminated", variant: "destructive" },
  not_trusted: { label: "New Client", variant: "outline" },
  trusted: { label: "Trusted", variant: "default" },
  super_client: { label: "Super Client", variant: "default" },
  open: { label: "Open", variant: "outline" },
  in_review: { label: "In Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  resolved: { label: "Resolved", variant: "default" },
};

type AllStatuses = OrderStatus | PaymentStatus | AccountStatus | SubscriptionStatus | TrustTag | IssueStatus;

export function StatusBadge({ status, className }: { status: AllStatuses; className?: string }) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };
  
  const colorClass = 
    status === "delivered" || status === "verified" || status === "active" || status === "renewed" || status === "approved" || status === "resolved" || status === "super_client" || status === "trusted"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
      : status === "paid_verified" || status === "paid_unverified" || status === "to_deliver"
      ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
      : status === "expiring" || status === "pending" || status === "pending_payment" || status === "in_review" || status === "not_trusted" || status === "draft" || status === "open"
      ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
      : status === "cancelled" || status === "rejected" || status === "exhausted" || status === "expired" || status === "terminated"
      ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
      : "";

  return (
    <Badge variant="outline" className={`${colorClass} ${className || ""}`}>
      {config.label}
    </Badge>
  );
}
