import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StaffProfile, UserRole } from "@/types/database";

export default function StaffPage() {
  const [staff, setStaff] = useState<(StaffProfile & { user_roles: UserRole[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("staff_profiles").select("*, user_roles(*)").order("created_at").then(({ data }) => {
      setStaff((data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><UserCog className="h-6 w-6 text-primary" />Staff & Teams</h1>
        <p className="page-subtitle">{staff.length} team members</p>
      </div>
      {staff.length === 0 ? <EmptyState title="No staff members" /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Email</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Roles</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{staff.map((s) => (
              <TableRow key={s.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-white">
                      {s.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{s.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.user_roles?.map((r) => (
                      <Badge key={r.id} variant="outline" className="text-[10px] bg-primary/5 text-primary/70 border-primary/10 rounded-lg font-medium capitalize">
                        {r.role.replace(/_/g, " ")}
                      </Badge>
                    )) || <span className="text-xs text-muted-foreground/40">No roles</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {s.is_active ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Active
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">Inactive</span>
                  )}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
