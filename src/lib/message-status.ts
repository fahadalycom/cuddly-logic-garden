// Message transport status helpers — shared across mock + real chat.
import {
  Clock, Check, CheckCheck, AlertCircle, Loader2, XOctagon, type LucideIcon,
} from "lucide-react";

export type DeliveryStatus =
  | "queued"
  | "sending"
  | "sent_to_api"
  | "delivered"
  | "read"
  | "failed"
  | "retrying"
  | "permanently_failed";

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** tailwind class for icon color */
  className: string;
  spin?: boolean;
  destructive?: boolean;
}

export const STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  queued:              { label: "Queued",        icon: Clock,      className: "text-muted-foreground/60" },
  sending:             { label: "Sending…",      icon: Loader2,    className: "text-muted-foreground/70", spin: true },
  sent_to_api:         { label: "Sent",          icon: Check,      className: "text-muted-foreground/80" },
  delivered:           { label: "Delivered",     icon: CheckCheck, className: "text-muted-foreground" },
  read:                { label: "Read",          icon: CheckCheck, className: "text-sky-400" },
  failed:              { label: "Failed",        icon: AlertCircle,className: "text-destructive", destructive: true },
  retrying:            { label: "Retrying…",     icon: Loader2,    className: "text-amber-400", spin: true },
  permanently_failed:  { label: "Not delivered", icon: XOctagon,   className: "text-destructive", destructive: true },
};

export function isFailedStatus(s: DeliveryStatus | string | null | undefined): boolean {
  return s === "failed" || s === "permanently_failed";
}

export function isPendingStatus(s: DeliveryStatus | string | null | undefined): boolean {
  return s === "queued" || s === "sending" || s === "retrying";
}

/** Roll up reliability for a list of recent outbound messages. */
export function computeReliability(messages: Array<{ direction?: string; status?: DeliveryStatus | string | null }>) {
  const outbound = messages.filter((m) => (m.direction ?? "outbound") === "outbound");
  const last = outbound.slice(-20);
  let failed = 0, pending = 0, delivered = 0;
  for (const m of last) {
    const s = m.status as DeliveryStatus | undefined;
    if (!s) continue;
    if (isFailedStatus(s)) failed++;
    else if (isPendingStatus(s)) pending++;
    else delivered++;
  }
  let health: "healthy" | "degraded" | "down" = "healthy";
  if (failed >= 3) health = "down";
  else if (failed >= 1 || pending >= 3) health = "degraded";
  return { failed, pending, delivered, total: last.length, health };
}
