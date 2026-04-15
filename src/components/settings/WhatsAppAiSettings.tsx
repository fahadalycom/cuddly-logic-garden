import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bot, Brain, Zap, Shield, Clock } from "lucide-react";

export function WhatsAppAiSettings() {
  const [stats, setStats] = useState({ total: 0, sent: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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
    setLoading(false);
  };

  const features = [
    {
      icon: Brain,
      title: "AI Auto-Response",
      description: "Gemini AI analyzes incoming messages and suggests responses based on product knowledge",
      status: "active",
    },
    {
      icon: Shield,
      title: "Agent Approval Required",
      description: "AI suggestions require agent approval before sending — agents can approve, edit, or reject",
      status: "active",
    },
    {
      icon: Zap,
      title: "Intent Detection",
      description: "AI detects customer intent (pricing, support, info) and matches relevant products",
      status: "active",
    },
    {
      icon: Clock,
      title: "Context-Aware Replies",
      description: "AI uses product catalog, FAQ content, and conversation history for accurate responses",
      status: "active",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">AI Auto-Response Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">Configure AI-powered automatic responses for WhatsApp conversations</p>
      </div>

      {/* AI Stats */}
      <div className="premium-card !p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Response Statistics</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Suggestions", value: stats.total, color: "text-foreground" },
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

      {/* AI Model */}
      <div className="premium-card !p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary/70" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Model</p>
              <p className="text-[10px] text-muted-foreground">Powered by Lovable AI Gateway</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary/70 border-primary/10 rounded-lg">
            Gemini 2.5 Flash
          </Badge>
        </div>
      </div>

      {/* Feature List */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">AI Features</span>
        {features.map((f) => (
          <div key={f.title} className="premium-card !p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                  <f.icon className="h-4 w-4 text-primary/70" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs">{f.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg">
                Active
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
