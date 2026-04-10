import { EmptyState } from "@/components/shared/PageStates";
import { Archive } from "lucide-react";

export default function OldClientsPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Archive className="h-6 w-6 text-primary" />Old Clients Follow-up</h1>
        <p className="page-subtitle">Re-engagement campaigns for inactive clients</p>
      </div>
      <EmptyState title="Coming soon" description="This section will show clients inactive for 2-4 months for re-engagement campaigns." />
    </div>
  );
}
