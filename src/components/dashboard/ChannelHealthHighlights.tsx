import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, RadioTower, Webhook } from "lucide-react";
import { useChannelHealth } from "@/hooks/useChannelHealth";
import { StatCard } from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function ChannelHealthHighlights() {
  const { data, isLoading } = useChannelHealth();
  if (isLoading || !data) return <Skeleton className="h-28 rounded-2xl mb-6" />;

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Connected Channels"
          value={`${data.connectedCount}/${data.integrations.length}`}
          icon={RadioTower}
          accent={data.connectedCount > 0 ? "emerald" : "amber"}
        />
        <StatCard
          title="Failed Sends Today"
          value={data.failedSendsToday}
          icon={AlertTriangle}
          accent={data.failedSendsToday > 0 ? "rose" : "emerald"}
        />
        <StatCard
          title="Webhook Failures"
          value={data.webhookFailuresToday}
          icon={Webhook}
          accent={data.webhookFailuresToday > 0 ? "amber" : "emerald"}
          subtitle="Last 24 hours"
        />
        <StatCard
          title="Need Attention"
          value={data.needsAttention.length}
          icon={AlertTriangle}
          accent={data.needsAttention.length > 0 ? "amber" : "emerald"}
        />
      </div>

      {data.needsAttention.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Channels needing attention
            </h3>
            <Link to="/channel-integrations" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              Open <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-1.5">
            {data.needsAttention.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="capitalize border-border/40">{i.channel_type}</Badge>
                <span className="text-muted-foreground truncate">
                  {i.last_error ?? `Status: ${i.status}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
