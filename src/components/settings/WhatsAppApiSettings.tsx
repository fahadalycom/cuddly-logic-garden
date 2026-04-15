import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, CheckCircle2, AlertCircle, Phone, Key, Webhook, Save, Eye, EyeOff, Pencil } from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";

const WEBHOOK_URL = `https://kttjzcchajxxntxivldh.supabase.co/functions/v1/whatsapp-webhook`;

export function WhatsAppApiSettings() {
  const { isAdmin } = useAuth();
  const { settings, loading, getValue, updateSetting } = useSystemSettings("whatsapp_api");
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (key: string) => {
    setEditing(key);
    setEditValue(getValue(key));
  };

  const saveEdit = async (key: string) => {
    setSaving(true);
    const ok = await updateSetting(key, editValue);
    setSaving(false);
    if (ok) {
      toast.success("Setting saved!");
      setEditing(null);
    }
  };

  const configItems = [
    {
      icon: Key,
      label: "Meta WhatsApp Token",
      description: "Access token from Meta Business Suite for WhatsApp Cloud API",
      key: "meta_whatsapp_token",
      isSecret: true,
    },
    {
      icon: Phone,
      label: "Phone Number ID",
      description: "WhatsApp Business phone number ID from Meta dashboard",
      key: "meta_whatsapp_phone_id",
      isSecret: false,
    },
    {
      icon: Key,
      label: "Webhook Verify Token",
      description: "Custom verification token for webhook handshake",
      key: "meta_webhook_verify_token",
      isSecret: true,
    },
  ];

  if (loading) return <LoadingState message="Loading API settings..." />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">WhatsApp API Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin ? "Manage your Meta WhatsApp Business API credentials directly" : "View your WhatsApp API connection status"}
        </p>
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

      {/* API Credentials */}
      <div className="space-y-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">API Credentials</span>
        {configItems.map((item) => {
          const value = getValue(item.key);
          const isEditing = editing === item.key;
          const isVisible = showSecret[item.key];
          const hasValue = !!value;

          return (
            <div key={item.key} className="premium-card !p-4 space-y-3">
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
                <Badge variant="outline" className={`text-[10px] rounded-lg ${hasValue ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                  {hasValue ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</> : <><AlertCircle className="h-3 w-3 mr-1" /> Not Set</>}
                </Badge>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type={item.isSecret && !isVisible ? "password" : "text"}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={`Enter ${item.label.toLowerCase()}`}
                        className="text-xs bg-secondary/30 border-border/30 rounded-xl font-mono flex-1"
                      />
                      {item.isSecret && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setShowSecret(p => ({ ...p, [item.key]: !p[item.key] }))}>
                          {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="sm" className="rounded-xl gradient-primary text-white border-0 shrink-0" onClick={() => saveEdit(item.key)} disabled={saving}>
                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-xl shrink-0" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-xs font-mono text-muted-foreground bg-secondary/20 px-3 py-2 rounded-xl truncate">
                        {hasValue ? (item.isSecret ? "••••••••••••" : value) : "Not configured"}
                      </div>
                      <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={() => startEdit(item.key)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isAdmin && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Admin access required</p>
              <p>Only admins can manage API credentials. Contact your admin to update settings.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
