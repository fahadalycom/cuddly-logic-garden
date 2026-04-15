import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Plus } from "lucide-react";

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
    if (error) {
      toast.error("Failed to create config");
    } else {
      toast.success("Agent config created");
      fetchConfigs();
    }
  };

  const updateConfig = async (id: string, field: string, value: any) => {
    const updateData: Record<string, any> = {};
    updateData[field] = value;
    const { error } = await supabase.from("wa_agent_config").update(updateData as any).eq("id", id);
    if (error) {
      toast.error("Failed to update");
    } else {
      setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Agent Workload Configuration
        </p>

        {staff.map((s) => {
          const config = getConfig(s.user_id);

          return (
            <Card key={s.id} className="border-border/50">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{s.full_name}</CardTitle>
                  {config ? (
                    <Badge variant={config.is_available ? "default" : "secondary"} className="text-[10px]">
                      {config.is_available ? "Available" : "Offline"}
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => createConfig(s.user_id)}>
                      <Plus className="h-3 w-3 mr-1" /> Setup
                    </Button>
                  )}
                </div>
              </CardHeader>

              {config && (
                <CardContent className="p-3 pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Available</Label>
                    <Switch
                      checked={config.is_available}
                      onCheckedChange={(v) => updateConfig(config.id, "is_available", v)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Max Active Chats</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={config.max_active_chats}
                      onChange={(e) => updateConfig(config.id, "max_active_chats", parseInt(e.target.value) || 3)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Max Unread Visible</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={config.max_unread_visible}
                      onChange={(e) => updateConfig(config.id, "max_unread_visible", parseInt(e.target.value) || 4)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Daily Message Limit</Label>
                    <Input
                      type="number"
                      min={10}
                      max={1000}
                      value={config.daily_message_limit}
                      onChange={(e) => updateConfig(config.id, "daily_message_limit", parseInt(e.target.value) || 100)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sent today: {config.messages_sent_today}</span>
                    <span>Limit: {config.daily_message_limit}</span>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {staff.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No staff members found</p>
        )}
      </div>
    </ScrollArea>
  );
}
