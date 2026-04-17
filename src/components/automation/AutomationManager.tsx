import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Sparkles, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  listAutomationSettings, setAutomationSetting, listAutomationLogs,
  type AutomationSetting, type AutomationLog,
} from "@/lib/automation";

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI Suggestions", tickets: "Tickets", orders: "Orders",
  conversations: "Conversations", renewals: "Renewals",
  research: "Research", vendors: "Vendors", general: "General",
};

export function AutomationManager() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<AutomationSetting[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([listAutomationSettings(), listAutomationLogs(50)]);
      setSettings(s); setLogs(l);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const toggle = async (s: AutomationSetting) => {
    if (!isAdmin) { toast.error("Admin only"); return; }
    setSaving(s.key);
    try {
      await setAutomationSetting(s.key, !s.enabled);
      setSettings((prev) => prev.map((x) => x.key === s.key ? { ...x, enabled: !s.enabled } : x));
      toast.success(`${s.enabled ? "Disabled" : "Enabled"} ${s.description ?? s.key}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSaving(null); }
  };

  const grouped = settings.reduce<Record<string, AutomationSetting[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Automation & AI
          </h2>
          <p className="text-sm text-muted-foreground">Control which automations run and review activity.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      <Tabs defaultValue="toggles">
        <TabsList>
          <TabsTrigger value="toggles">Toggles</TabsTrigger>
          <TabsTrigger value="logs">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="toggles" className="space-y-4 mt-4">
          {!isAdmin && (
            <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30 border border-border/40">
              View-only — only admins can change automation toggles.
            </div>
          )}
          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat} className="p-4 bg-card/40">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium text-sm">{CATEGORY_LABEL[cat] ?? cat}</h3>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.description ?? s.key}</div>
                      <code className="text-[10px] text-muted-foreground">{s.key}</code>
                    </div>
                    <Switch
                      checked={s.enabled}
                      disabled={!isAdmin || saving === s.key}
                      onCheckedChange={() => toggle(s)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="p-3 bg-card/40">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">Recent automation activity</h3>
              <Badge variant="outline" className="text-[10px]">{logs.length}</Badge>
            </div>
            <ScrollArea className="h-[420px] pr-2">
              <div className="space-y-2">
                {logs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
                )}
                {logs.map((l) => (
                  <div key={l.id} className="p-2 rounded border border-border/40 bg-background/40">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="text-[10px]">{l.action}</Badge>
                      <code className="text-[10px] text-muted-foreground truncate">{l.rule_key}</code>
                      <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{l.source}</Badge>
                    </div>
                    {l.entity_type && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {l.entity_type} · {String(l.entity_id ?? "").slice(0, 8)}
                      </div>
                    )}
                    {l.details && Object.keys(l.details).length > 0 && (
                      <pre className="text-[10px] text-muted-foreground mt-1 overflow-hidden truncate">
                        {JSON.stringify(l.details)}
                      </pre>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(l.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
