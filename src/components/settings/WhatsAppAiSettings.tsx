import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bot, Brain, Zap, Shield, Clock, Save } from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";

const AI_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanced)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Best)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Strong)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (Fast)" },
];

export function WhatsAppAiSettings() {
  const { isAdmin } = useAuth();
  const { loading, getValue, updateSetting } = useSystemSettings("whatsapp_ai");
  const [stats, setStats] = useState({ total: 0, sent: 0, approved: 0, rejected: 0 });
  const [promptExtra, setPromptExtra] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!loading) setPromptExtra(getValue("wa_ai_system_prompt_extra"));
  }, [loading]);

  const fetchStats = async () => {
    const { data } = await supabase.from("wa_auto_response_log").select("was_sent, agent_approved");
    if (data) {
      setStats({
        total: data.length,
        sent: data.filter(d => d.was_sent).length,
        approved: data.filter(d => d.agent_approved === true).length,
        rejected: data.filter(d => d.agent_approved === false).length,
      });
    }
  };

  const handleToggle = async (key: string, current: string) => {
    const newVal = current === "true" ? "false" : "true";
    await updateSetting(key, newVal);
    toast.success("Setting updated!");
  };

  const savePrompt = async () => {
    setSaving(true);
    await updateSetting("wa_ai_system_prompt_extra", promptExtra);
    setSaving(false);
    toast.success("AI prompt saved!");
  };

  if (loading) return <LoadingState message="Loading AI settings..." />;

  const aiEnabled = getValue("wa_ai_enabled");
  const aiModel = getValue("wa_ai_model");
  const autoSendHigh = getValue("wa_ai_auto_send_high");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">AI Auto-Response Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin ? "Configure and control AI-powered automatic responses" : "View AI auto-response settings"}
        </p>
      </div>

      {/* AI Stats */}
      <div className="premium-card !p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Response Statistics</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Auto-Sent", value: stats.sent, color: "text-emerald-500" },
            { label: "Approved", value: stats.approved, color: "text-primary" },
            { label: "Rejected", value: stats.rejected, color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-lg bg-secondary/20">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      {isAdmin && (
        <div className="space-y-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">AI Controls</span>

          {/* AI Enabled Toggle */}
          <div className="premium-card !p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Auto-Response</p>
                  <p className="text-[10px] text-muted-foreground">Enable/disable AI analysis of incoming messages</p>
                </div>
              </div>
              <Switch checked={aiEnabled === "true"} onCheckedChange={() => handleToggle("wa_ai_enabled", aiEnabled)} />
            </div>
          </div>

          {/* Auto-send high confidence */}
          <div className="premium-card !p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary/70" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Auto-Send High Confidence</p>
                  <p className="text-[10px] text-muted-foreground">Automatically send AI replies when confidence is high</p>
                </div>
              </div>
              <Switch checked={autoSendHigh === "true"} onCheckedChange={() => handleToggle("wa_ai_auto_send_high", autoSendHigh)} />
            </div>
          </div>

          {/* Model Selection */}
          <div className="premium-card !p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary/70" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Model</p>
                <p className="text-[10px] text-muted-foreground">Select the AI model for auto-responses</p>
              </div>
            </div>
            <Select value={aiModel} onValueChange={async (v) => { await updateSetting("wa_ai_model", v); toast.success("Model updated!"); }}>
              <SelectTrigger className="bg-secondary/30 border-border/30 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong rounded-xl border-border/30">
                {AI_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt */}
          <div className="premium-card !p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary/70" />
              </div>
              <div>
                <p className="text-sm font-semibold">Custom AI Instructions</p>
                <p className="text-[10px] text-muted-foreground">Additional instructions appended to the AI system prompt</p>
              </div>
            </div>
            <Textarea
              value={promptExtra}
              onChange={(e) => setPromptExtra(e.target.value)}
              placeholder="e.g., Always respond in Arabic. Mention our 24/7 support..."
              className="bg-secondary/30 border-border/30 rounded-xl text-xs min-h-[80px]"
            />
            <Button size="sm" className="rounded-xl gradient-primary text-white border-0" onClick={savePrompt} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save Instructions
            </Button>
          </div>
        </div>
      )}

      {/* Read-only feature list for non-admins */}
      {!isAdmin && (
        <div className="space-y-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">AI Features</span>
          {[
            { icon: Brain, title: "AI Model", desc: aiModel || "Not set" },
            { icon: Zap, title: "Auto-Response", desc: aiEnabled === "true" ? "Enabled" : "Disabled" },
            { icon: Shield, title: "Auto-Send High Confidence", desc: autoSendHigh === "true" ? "Enabled" : "Disabled" },
          ].map(f => (
            <div key={f.title} className="premium-card !p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-primary/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] rounded-lg ${f.desc.includes("Enabled") || f.desc.includes("gemini") || f.desc.includes("gpt") ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                  {f.desc.includes("Enabled") || f.desc.includes("gemini") || f.desc.includes("gpt") ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
