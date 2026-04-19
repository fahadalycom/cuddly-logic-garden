import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_META, type DeliveryStatus } from "@/lib/message-status";
import { cn } from "@/lib/utils";

interface Props {
  status: DeliveryStatus | string | null | undefined;
  errorMessage?: string | null;
  retryCount?: number | null;
  size?: "sm" | "md";
  className?: string;
}

export function MessageStatusIndicator({ status, errorMessage, retryCount, size = "sm", className }: Props) {
  const key = (status ?? "queued") as DeliveryStatus;
  const meta = STATUS_META[key] ?? STATUS_META.queued;
  const Icon = meta.icon;
  const dim = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center", className)}>
          <Icon className={cn(dim, meta.className, meta.spin && "animate-spin")} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        <div className="font-medium">{meta.label}</div>
        {retryCount && retryCount > 0 && (
          <div className="text-muted-foreground">Retried {retryCount}×</div>
        )}
        {errorMessage && (
          <div className="text-destructive max-w-[220px] mt-1">{errorMessage}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
