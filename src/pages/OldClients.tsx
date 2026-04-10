import { EmptyState } from "@/components/shared/PageStates";

export default function OldClientsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Old Clients Follow-up</h1>
      <EmptyState title="Coming soon" description="This section will show clients inactive for 2-4 months for re-engagement campaigns." />
    </div>
  );
}
