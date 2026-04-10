import { EmptyState } from "@/components/shared/PageStates";
import { Shield } from "lucide-react";

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Roles & Permissions</h1>
        <p className="page-subtitle">Configure which roles can access which modules</p>
      </div>
      <EmptyState title="Role management" description="Configure which roles can access which modules." />
    </div>
  );
}
