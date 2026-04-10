import { EmptyState } from "@/components/shared/PageStates";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <EmptyState title="Analytics Dashboard" description="Revenue summaries, client insights, inventory utilization, and staff performance metrics will be displayed here." />
    </div>
  );
}
