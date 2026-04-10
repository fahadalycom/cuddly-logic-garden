import { EmptyState } from "@/components/shared/PageStates";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <EmptyState title="System Settings" description="Configure product durations, sharing standards, discount rules, and system preferences." />
    </div>
  );
}
