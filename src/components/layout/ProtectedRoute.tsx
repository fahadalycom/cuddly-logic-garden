import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { LoadingState } from "@/components/shared/PageStates";

export function ProtectedRoute({ children, requiredModule }: { children: React.ReactNode; requiredModule?: string }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <LoadingState message="Checking access..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredModule && !hasPermission(requiredModule, "can_view")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">You don't have access to this section.</p>
      </div>
    );
  }

  return <>{children}</>;
}
