import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, CheckCircle2, AlertCircle, Phone, Key, Webhook, ExternalLink, Lock } from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";

const WEBHOOK_URL = `https://kttjzcchajxxntxivldh.supabase.co/functions/v1/whatsapp-webhook`;

interface ResolvedConfig {
  token: string | null;
  tokenSource: string;
  phoneId: string | null;
  phoneIdSource: string;
  verifyToken: string | null;
  verifyTokenSource: string;
}

export function WhatsAppApiSettings() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<ResolvedConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadResolvedConfig();
  }, []);

  async function loadResolvedConfig() {
    setLoading(true);

    // Canonical source: channel_integrations row for whatsapp
    const { data: integ } = await supabase
      .from("channel_integrations")
      .select("config, verify_token")
      .eq("channel_type", "whatsapp")
      .maybeSingle();

    // Legacy fallbacks from system_settings
    const { data: settingsRows } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "meta_whatsapp_access_token",
        "meta_whatsapp_token",
        "meta_whatsapp_phone_id",
        "meta_webhook_verify_token",
      ]);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { if (r.value) settings[r.key] = r.value; });

    const tokenCanonical = settings["meta_whatsapp_access_token"];
    const tokenLegacy = settings["meta_whatsapp_token"];
    const token = tokenCanonical || tokenLegacy || null;
    const tokenSource = tokenCanonical
      ? "Channel Integrations"
      : tokenLegacy
        ? "Legacy (meta_whatsapp_token) — please re-save in Channel Integrations"
        : "Not configured";

    const cfgPhone = (integ?.config as any)?.phone_number_id as string | undefined;
    const phoneLegacy = settings["meta_whatsapp_phone_id"];
    const phoneId = cfgPhone || phoneLegacy || null;
    const phoneIdSource = cfgPhone
      ? "Channel Integrations"
      : phoneLegacy
        ? "Legacy (meta_whatsapp_phone_id) — please re-save in Channel Integrations"
        : "Not configured";

    const vCanonical = (integ?.verify_token as string | null) || null;
    const vLegacy = settings["meta_webhook_verify_token"];
    const verifyToken = vCanonical || vLegacy || null;
    const verifyTokenSource = vCanonical
      ? "Channel Integrations"
      : vLegacy
        ? "Legacy (meta_webhook_verify_token) — please re-save in Channel Integrations"
        : "Not configured";

    setCfg({ token, tokenSource, phoneId, phoneIdSource, verifyToken, verifyTokenSource });
    setLoading(false);
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading || !cfg) return <LoadingState message="Loading API settings..." />;

  const items = [
    {
      icon: Key,
      label: "Meta WhatsApp Access Token",
      description: "Long-lived token from Meta Business Suite",
      value: cfg.token,
      source: cfg.tokenSource,
      isSecret: true,
    },
    {
      icon: Phone,
      label: "Phone Number ID",
      description: "WhatsApp Business phone number ID",
      value: cfg.phoneId,
      source: cfg.phoneIdSource,
      isSecret: false,
    },
    {
      icon: Key,
      label: "Webhook Verify Token",
      description: "Custom token used during Meta webhook handshake",
      value: cfg.verifyToken,
      source: cfg.verifyTokenSource,
      isSecret: true,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">WhatsApp API Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Read-only view. Manage credentials in <span className="font-medium text-foreground">Channel Integrations → WhatsApp</span>.
        </p>
      </div>

      {/* Single-source-of-truth banner */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2">
        <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 text-xs">
          <p className="font-medium text-foreground">Single source of truth</p>
          <p className="text-muted-foreground">
            All sending, webhooks, and AI auto-replies read credentials from Channel Integrations. Update them in one place.
          </p>
        </div>
        {isAdmin && (
          <Button asChild size="sm" variant="outline" className="rounded-xl shrink-0">
            <Link to="/channel-integrations">Open <ExternalLink className="h-3 w-3 ml-1" /></Link>
          </Button>
        )}
      </div>

      {/* Webhook URL */}
      <div className="premium-card !p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Webhook URL</span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg">Active</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Configure this URL in Meta App Dashboard → WhatsApp → Configuration</p>
        <div className="flex items-center gap-2">
          <Input value={WEBHOOK_URL} readOnly className="text-xs bg-secondary/30 border-border/30 rounded-xl font-mono" />
          <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={() => copyToClipboard(WEBHOOK_URL, "Webhook URL")}>
            {copied === "Webhook URL" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Resolved credentials (read-only) */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Currently in use</span>
        {items.map((item) => {
          const hasValue = !!item.value;
          const isLegacy = item.source.includes("Legacy");
          return (
            <div key={item.label} className="premium-card !p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary/70" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] rounded-lg ${hasValue ? (isLegacy ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20") : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                  {hasValue
                    ? (isLegacy ? <><AlertCircle className="h-3 w-3 mr-1" /> Legacy</> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</>)
                    : <><AlertCircle className="h-3 w-3 mr-1" /> Not Set</>}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs font-mono text-muted-foreground bg-secondary/20 px-3 py-2 rounded-xl truncate">
                  {hasValue ? (item.isSecret ? "••••••••••••" : item.value) : "Not configured"}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground px-1">Source: <span className="font-medium text-foreground/80">{item.source}</span></p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
