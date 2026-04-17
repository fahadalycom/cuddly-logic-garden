import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus, AccountStatus, SubscriptionStatus, TrustTag, IssueStatus } from "@/types/database";

type AllStatuses = OrderStatus | PaymentStatus | AccountStatus | SubscriptionStatus | TrustTag | IssueStatus | string;

const statusMap: Record<string, { label: string; className: string }> = {
  // Success states
  delivered: { label: "Delivered", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  verified: { label: "Verified", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  renewed: { label: "Renewed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  resolved: { label: "Resolved", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  super_client: { label: "Super Client", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  trusted: { label: "Trusted", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  available: { label: "Available", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },

  // Info / progress states
  paid_verified: { label: "Verified", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  paid_unverified: { label: "Unverified", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  to_deliver: { label: "To Deliver", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  assigned: { label: "Assigned", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  in_review: { label: "In Review", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  partially_paid: { label: "Partial", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },

  // Warning states
  expiring: { label: "Expiring", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  pending_verification: { label: "Pending Verification", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  pending_payment: { label: "Pending Payment", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  unpaid: { label: "Unpaid", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  waiting: { label: "Waiting", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  draft: { label: "Draft", className: "bg-muted/50 text-muted-foreground border-border/30" },
  open: { label: "Open", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  not_started: { label: "Not Started", className: "bg-muted/50 text-muted-foreground border-border/30" },
  not_trusted: { label: "New", className: "bg-muted/50 text-muted-foreground border-border/30" },
  new: { label: "New", className: "bg-muted/50 text-muted-foreground border-border/30" },

  // Danger states
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  exhausted: { label: "Exhausted", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  expired: { label: "Expired", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  terminated: { label: "Terminated", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export const StatusBadge = forwardRef<
  HTMLDivElement,
  { status: AllStatuses; className?: string }
>(({ status, className }, ref) => {
  const config = statusMap[status as string] || {
    label: String(status).replace(/_/g, " "),
    className: "bg-muted/50 text-muted-foreground border-border/30",
  };

  return (
    <Badge
      ref={ref}
      variant="outline"
      className={cn(config.className, "text-[11px] font-medium border px-2.5 py-0.5 rounded-lg capitalize", className)}
    >
      {config.label}
    </Badge>
  );
});
StatusBadge.displayName = "StatusBadge";
