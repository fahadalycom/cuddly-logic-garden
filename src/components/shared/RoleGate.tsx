import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/types/database";

interface RoleGateProps {
  /** Show only when the user has at least one of these roles. */
  roles?: AppRole[];
  /** Or, show only when the user has this module permission. */
  module?: string;
  action?: "can_view" | "can_create" | "can_edit" | "can_delete";
  /** Render this when the user lacks access. Defaults to nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declaratively hide UI from users who don't have the required role or
 * module permission. Admins always see the children.
 *
 *   <RoleGate roles={["admin", "operations_manager"]}>
 *     <DangerousButton />
 *   </RoleGate>
 *
 *   <RoleGate module="payments" action="can_edit">
 *     <VerifyButton />
 *   </RoleGate>
 */
export function RoleGate({ roles, module, action = "can_view", fallback = null, children }: RoleGateProps) {
  const { isAdmin, hasRole, hasPermission } = useAuth();

  if (isAdmin) return <>{children}</>;

  const roleOk = !roles || roles.some((r) => hasRole(r));
  const moduleOk = !module || hasPermission(module, action);

  if (roleOk && moduleOk) return <>{children}</>;
  return <>{fallback}</>;
}
