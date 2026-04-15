import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, MessageSquare, Users, Zap } from "lucide-react";

interface AgentConfigPanelProps {
  staff: any[];
}

export function AgentConfigPanel({ staff }: AgentConfigPanelProps) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    const { data } = await supabase.from("wa_agent_config").select("*");
    setConfigs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const getConfig = (userId: string) => configs.find((c) => c.agent_id === userId);

  const createConfig = async (userId: string) => {
    const { error } = await supabase.from("wa_agent_config").insert({ agent_id: userId });
    if (error) toast.error("Failed to create config");
    else {
      toast.success("Agent config created");
      fetchConfigs();
    }
  };

  const updateConfig = async (id: string, field: string, value: any) => {
    const updateData: Record<string, any> = {};
    updateData[field] = value;
    const { error } = await supabase.from("wa_agent_config").update(updateData as any).eq("id", id);
    if (error) toast.error("Failed to update");
    else setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const availableCount = configs.filter((c) => c.is_available).length;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Summary */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-4">
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-foreground">{staff.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-emerald-500">{availableCount}</p>
              <p className="text-[10px] text-muted-foreground">Online</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-muted-foreground">{configs.length - availableCount}</p>
              <p className="text-[10px] text-muted-foreground">Offline</p>
            </div>
          </div>
        </div>

        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Agent Configuration
        </span>

        {staff.map((s) => {
          const config = getConfig(s.user_id);
          const usagePercent = config ? Math.round((config.messages_sent_today / config.daily_message_limit) * 100) : 0;

          return (
            <div key={s.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">{s.full_name?.charAt(0)}</span>
                    </div>
                    {config && (
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                        config.is_available ? "bg-emerald-500" : "bg-muted-foreground/40"
                      }`} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.email}</p>
                  </div>
                </div>
                {config ? (
                  <Switch
                    checked={config.is_available}
                    onCheckedChange={(v) => updateConfig(config.id, "is_available", v)}
                  />
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => createConfig(s.user_id)}>
                    <Plus className="h-3 w-3 mr-1" /> Setup
                  </Button>
                )}
              </div>

              {config && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Max Chats
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={config.max_active_chats}
                        onChange={(e) => updateConfig(config.id, "max_active_chats", parseInt(e.target.value) || 3)}
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Max Unread
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={config.max_unread_visible}
                        onChange={(e) => updateConfig(config.id, "max_unread_visible", parseInt(e.target.value) || 4)}
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Daily Messages
                      </Label>
                      <span className="text-[10px] font-medium">
                        {config.messages_sent_today} / {config.daily_message_limit}
                      </span>
                    </div>
                    <Progress value={usagePercent} className="h-1.5" />
                    <Input
                      type="number"
                      min={10}
                      max={1000}
                      value={config.daily_message_limit}
                      onChange={(e) => updateConfig(config.id, "daily_message_limit", parseInt(e.target.value) || 100)}
                      className="h-8 text-sm rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {staff.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No staff members found</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
