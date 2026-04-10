import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserCog, Plus, Users, Edit } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import type { StaffProfile, UserRole, Team, TeamMember, AppRole } from "@/types/database";

const ROLES = Constants.public.Enums.app_role;

export default function StaffPage() {
  const [staff, setStaff] = useState<(StaffProfile & { user_roles: UserRole[] })[]>([]);
  const [teams, setTeams] = useState<(Team & { team_members: (TeamMember & { staff_profiles: StaffProfile })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const { isAdmin } = useAuth();

  const fetchData = async () => {
    const [s, t] = await Promise.all([
      supabase.from("staff_profiles").select("*, user_roles(*)").order("created_at"),
      supabase.from("teams").select("*, team_members(*, staff_profiles(*))").order("created_at"),
    ]);
    setStaff((s.data as any) || []);
    setTeams((t.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleStaffActive = async (s: StaffProfile) => {
    await supabase.from("staff_profiles").update({ is_active: !s.is_active }).eq("id", s.id);
    toast.success(s.is_active ? "Staff deactivated" : "Staff activated");
    fetchData();
  };

  const toggleRole = async (staffMember: StaffProfile & { user_roles: UserRole[] }, role: AppRole) => {
    const existing = staffMember.user_roles?.find(r => r.role === role);
    if (existing) {
      await supabase.from("user_roles").delete().eq("id", existing.id);
      toast.success(`Removed ${role.replace(/_/g, " ")} role`);
    } else {
      await supabase.from("user_roles").insert({ user_id: staffMember.user_id, role });
      toast.success(`Added ${role.replace(/_/g, " ")} role`);
    }
    fetchData();
  };

  const createTeam = async () => {
    if (!teamForm.name) return;
    await supabase.from("teams").insert(teamForm);
    toast.success("Team created!");
    setShowAddTeam(false);
    setTeamForm({ name: "", description: "" });
    fetchData();
  };

  const editingStaff = staff.find(s => s.id === showEditStaff);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><UserCog className="h-6 w-6 text-primary" />Staff & Teams</h1>
        <p className="page-subtitle">{staff.length} team members · {teams.length} teams</p>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="bg-card/50 border border-border/30 rounded-xl p-1">
          <TabsTrigger value="staff" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><UserCog className="h-3.5 w-3.5 mr-1.5" />Staff</TabsTrigger>
          <TabsTrigger value="teams" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Users className="h-3.5 w-3.5 mr-1.5" />Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          {staff.length === 0 ? <EmptyState title="No staff members" /> : (
            <div className="premium-table">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Email</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Roles</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
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
                      {isAdmin ? (
                        <Switch checked={s.is_active} onCheckedChange={() => toggleStaffActive(s)} className="scale-75" />
                      ) : s.is_active ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Active
                        </span>
                      ) : <span className="text-xs text-muted-foreground/40">Inactive</span>}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => setShowEditStaff(s.id)} className="h-7 w-7 rounded-lg">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-end">
            {isAdmin && (
              <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" />Add Team</Button>
                </DialogTrigger>
                <DialogContent className="glass-strong rounded-2xl border-border/30">
                  <DialogHeader><DialogTitle>Create Team</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Team Name</Label>
                      <Input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                    <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
                      <Input value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })} className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl" /></div>
                    <Button onClick={createTeam} className="w-full rounded-xl gradient-primary text-white border-0">Create Team</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {teams.length === 0 ? <EmptyState title="No teams" description="Create teams to organize staff." /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map(team => (
                <div key={team.id} className="premium-card !p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{team.name}</h3>
                    <Badge variant="outline" className={`text-[10px] rounded-lg ${team.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-muted/50 text-muted-foreground border-border/30"}`}>
                      {team.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {team.description && <p className="text-xs text-muted-foreground mb-3">{team.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {team.team_members?.map(m => (
                      <span key={m.id} className="text-[10px] px-2 py-1 rounded-lg bg-secondary/30 text-foreground border border-border/20">
                        {m.staff_profiles?.full_name}
                      </span>
                    ))}
                    {(!team.team_members || team.team_members.length === 0) && <span className="text-xs text-muted-foreground/40">No members</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Staff Roles Dialog */}
      <Dialog open={!!showEditStaff} onOpenChange={() => setShowEditStaff(null)}>
        <DialogContent className="glass-strong rounded-2xl border-border/30">
          <DialogHeader><DialogTitle>Manage Roles — {editingStaff?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {ROLES.map(role => (
              <div key={role} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/20 border border-border/20">
                <span className="text-sm capitalize">{role.replace(/_/g, " ")}</span>
                <Switch checked={editingStaff?.user_roles?.some(r => r.role === role) || false}
                  onCheckedChange={() => editingStaff && toggleRole(editingStaff, role)} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
