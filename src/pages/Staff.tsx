import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Staff & Teams</h1>
      {staff.length === 0 ? <EmptyState title="No staff members" /> : (
        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>{staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-xs">{s.user_roles?.map((r) => r.role).join(", ") || "No roles"}</TableCell>
                <TableCell>{s.is_active ? <span className="text-emerald-600 text-xs font-medium">Active</span> : <span className="text-muted-foreground text-xs">Inactive</span>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
