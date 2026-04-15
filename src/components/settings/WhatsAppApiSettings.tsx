import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, ExternalLink, CheckCircle2, AlertCircle, Globe, Phone, Key, Webhook } from "lucide-react";

const WEBHOOK_URL = `https://kttjzcchajxxntxivldh.supabase.co/functions/v1/whatsapp-webhook`;

export function WhatsAppApiSettings() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const configItems = [
    {
      icon: Key,
      label: "Meta WhatsApp Token",
      description: "Access token from Meta Business Suite for WhatsApp Cloud API",
      secretName: "META_WHATSAPP_TOKEN",
      status: "configured",
    },
    {
      icon: Phone,
      label: "Phone Number ID",
      description: "WhatsApp Business phone number ID from Meta dashboard",
      secretName: "META_WHATSAPP_PHONE_ID",
      status: "configured",
    },
    {
      icon: Key,
      label: "Webhook Verify Token",
      description: "Custom verification token for webhook handshake",
      secretName: "META_WEBHOOK_VERIFY_TOKEN",
      status: "configured",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">WhatsApp API Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">Manage your Meta WhatsApp Business API connection settings</p>
      </div>

      {/* Webhook URL */}
      <div className="premium-card !p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Webhook URL</span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg">Active</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Configure this URL in your Meta App Dashboard → WhatsApp → Configuration</p>
        <div className="flex items-center gap-2">
          <Input value={WEBHOOK_URL} readOnly className="text-xs bg-secondary/30 border-border/30 rounded-xl font-mono" />
          <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={() => copyToClipboard(WEBHOOK_URL, "Webhook URL")}>
            {copied === "Webhook URL" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* API Keys Status */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">API Credentials</span>
        {configItems.map((item) => (
          <div key={item.secretName} className="premium-card !p-4">
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
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Help */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Need to update API credentials?</p>
            <p>Contact your admin to update the WhatsApp API secrets through the backend configuration panel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
