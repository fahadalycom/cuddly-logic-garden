import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/shared/PageStates";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Save } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import type { Permission, AppRole } from "@/types/database";

const MODULES = ["dashboard", "products", "orders", "payments", "delivery", "inventory", "clients", "renewals", "reminders", "feedback", "analytics", "staff", "templates", "audit_logs", "settings"];
const ACTIONS = ["can_view", "can_create", "can_edit", "can_delete"] as const;
const ROLES = Constants.public.Enums.app_role;

export default function RolesPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<string, Partial<Permission>>>({});
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    supabase.from("permissions").select("*").then(({ data }) => {
      setPermissions(data || []);
      setLoading(false);
    });
  }, []);

  const getPermission = (role: AppRole, module: string) => {
    return permissions.find(p => p.role === role && p.module === module);
  };

  const getKey = (role: AppRole, module: string) => `${role}:${module}`;

  const getValue = (role: AppRole, module: string, action: typeof ACTIONS[number]): boolean => {
    const key = getKey(role, module);
    if (changes[key] && action in changes[key]) return changes[key][action] as boolean;
    const p = getPermission(role, module);
    return p ? (p as any)[action] : false;
  };

  const toggle = (role: AppRole, module: string, action: typeof ACTIONS[number]) => {
    if (!isAdmin) return;
    const key = getKey(role, module);
    const current = getValue(role, module, action);
    setChanges(prev => ({ ...prev, [key]: { ...prev[key], role, module, [action]: !current } }));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const [key, change] of Object.entries(changes)) {
      const [role, module] = key.split(":");
      const existing = getPermission(role as AppRole, module);
      if (existing) {
        await supabase.from("permissions").update(change).eq("id", existing.id);
      } else {
        await supabase.from("permissions").insert({ role: role as AppRole, module, can_view: false, can_create: false, can_edit: false, can_delete: false, ...change });
      }
    }
    const { data } = await supabase.from("permissions").select("*");
    setPermissions(data || []);
    setChanges({});
    setSaving(false);
    toast.success("Permissions saved!");
  };

  if (loading) return <LoadingState />;

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Roles & Permissions</h1>
          <p className="page-subtitle">Configure which roles can access which modules</p>
        </div>
        {isAdmin && hasChanges && (
          <Button onClick={saveAll} disabled={saving} className="rounded-xl gradient-primary text-white border-0">
            <Save className="h-4 w-4 mr-1.5" />{saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <div className="premium-table overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50 sticky left-0 bg-card/60 backdrop-blur-xl z-10">Module</th>
              {ROLES.map(role => (
                <th key={role} colSpan={4} className="text-center p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50 border-l border-border/20">
                  {role.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border/20">
              <th className="sticky left-0 bg-card/60 backdrop-blur-xl z-10"></th>
              {ROLES.map(role => (
                ACTIONS.map(action => (
                  <th key={`${role}-${action}`} className="text-center p-2 text-[9px] uppercase tracking-wider text-muted-foreground/40 font-medium border-l border-border/10 first:border-l-border/20">
                    {action.replace("can_", "").charAt(0).toUpperCase()}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(module => (
              <tr key={module} className="border-b border-border/10 hover:bg-card/40 transition-colors">
                <td className="p-3 font-medium capitalize sticky left-0 bg-card/40 backdrop-blur-xl z-10 text-foreground">
                  {module.replace(/_/g, " ")}
                </td>
                {ROLES.map(role => (
                  ACTIONS.map(action => {
                    const val = getValue(role, module, action);
                    const key = getKey(role, module);
                    const isChanged = changes[key] && action in changes[key];
                    return (
                      <td key={`${role}-${module}-${action}`} className={`text-center p-2 border-l border-border/10 ${isChanged ? "bg-primary/5" : ""}`}>
                        <Switch
                          checked={val}
                          onCheckedChange={() => toggle(role, module, action)}
                          disabled={!isAdmin}
                          className="scale-75"
                        />
                      </td>
                    );
                  })
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-wrap">
        {ACTIONS.map(a => (
          <span key={a} className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{a.replace("can_", "").charAt(0).toUpperCase()}</span> = {a.replace("can_", "").charAt(0).toUpperCase() + a.replace("can_", "").slice(1)}</span>
        ))}
      </div>
    </div>
  );
}
