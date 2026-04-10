import { EmptyState } from "@/components/shared/PageStates";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Settings</h1>
        <p className="page-subtitle">Configure system preferences and business rules</p>
      </div>
      <EmptyState title="System Settings" description="Configure product durations, sharing standards, discount rules, and system preferences." />
    </div>
  );
}
