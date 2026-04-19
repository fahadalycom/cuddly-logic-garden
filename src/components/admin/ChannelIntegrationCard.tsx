import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CopyButton } from "@/components/shared/CopyButton";
import { useChannelIntegration } from "@/hooks/useChannelIntegration";
import { useAuth } from "@/hooks/useAuth";
import {
  CHANNEL_META,
  buildSchema,
  computeCompleteness,
  webhookUrlFor,
  type ChannelType,
  type ChannelStatus,
} from "@/lib/channel-integrations";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  Save,
  PlugZap,
  RefreshCw,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Facebook,
  Instagram,
  ArrowRight,
  Radio,
} from "lucide-react";

type Readiness = "not_configured" | "partially_configured" | "ready_for_webhook" | "ready_for_live" | "live";

const READINESS_META: Record<Readiness, { label: string; cls: string; hint: string }> = {
  not_configured: {
    label: "Not configured",
    cls: "bg-muted text-muted-foreground border-border",
    hint: "Fill in the required credentials below, then save.",
  },
  partially_configured: {
    label: "Partially configured",
    cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    hint: "Save the verify token and run Test Connection to validate credentials.",
  },
  ready_for_webhook: {
    label: "Ready for webhook",
    cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    hint: "Paste the webhook URL + verify token into Meta App Dashboard and trigger a verification ping.",
  },
  ready_for_live: {
    label: "Ready to go live",
    cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    hint: "Webhook is receiving messages — flip the Enabled switch to start serving customers.",
  },
  live: {
    label: "Live",
    cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    hint: "Channel is active and healthy. No action needed.",
  },
};

const ICONS: Record<ChannelType, any> = {
  whatsapp: MessageCircle,
  messenger: Facebook,
  instagram: Instagram,
};

const STATUS_STYLES: Record<ChannelStatus, string> = {
  healthy: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  disabled: "bg-muted text-muted-foreground border-border",
  not_configured: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<ChannelStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  error: "Error",
  disabled: "Disabled",
  not_configured: "Not configured",
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

interface Props {
  channel: ChannelType;
}

export function ChannelIntegrationCard({ channel }: Props) {
  const { isAdmin } = useAuth();
  const { integration, loading, saving, testing, toggling, lastTestResult, save, test, toggle, clearError, reconnect } =
    useChannelIntegration(channel);
  const meta = CHANNEL_META[channel];
  const Icon = ICONS[channel];
  const status: ChannelStatus = integration?.status ?? "not_configured";
  const schema = useMemo(() => buildSchema(channel), [channel]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: meta.fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {} as Record<string, string>),
  });

  // Hydrate non-secret fields when integration loads
  useEffect(() => {
    if (!integration) return;
    const values: Record<string, string> = {};
    for (const f of meta.fields) {
      if (f.secret) values[f.key] = "";
      else if (f.key === "verify_token") values[f.key] = integration.verify_token ?? "";
      else values[f.key] = integration.config?.[f.key] ?? "";
    }
    form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id]);

  const [shown, setShown] = useState<Record<string, boolean>>({});
  const completeness = computeCompleteness(channel, integration ?? null);
  const webhookUrl = integration?.webhook_url || webhookUrlFor(channel);

  const onSubmit = form.handleSubmit(async (values) => {
    await save(values as Record<string, string>);
  });

  const disabled = !isAdmin;

  // Compute readiness state from existing telemetry
  const readiness: Readiness = (() => {
    if (!integration || completeness < 100) return "not_configured";
    if (!integration.verify_token || !integration.last_health_check_at) return "partially_configured";
    if (!integration.last_inbound_at) return "ready_for_webhook";
    if (!integration.enabled) return "ready_for_live";
    return "live";
  })();
  const readinessMeta = READINESS_META[readiness];

  const isFieldMissing = (key: string, secret: boolean | undefined) => {
    if (secret) return !integration?.secrets_set?.[key];
    if (key === "verify_token") return !integration?.verify_token;
    return !integration?.config?.[key];
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">{meta.label}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                  STATUS_STYLES[status],
                )}
              >
                {STATUS_LABELS[status]}
              </span>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border font-medium inline-flex items-center gap-1",
                  readinessMeta.cls,
                )}
                title={readinessMeta.hint}
              >
                {readiness === "live" && <Radio className="h-2.5 w-2.5" />}
                {readinessMeta.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Config {completeness}% complete
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enable-${channel}`} className="text-xs text-muted-foreground">
            {integration?.enabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id={`enable-${channel}`}
            checked={!!integration?.enabled}
            disabled={disabled || toggling || loading}
            onCheckedChange={(v) => toggle(v)}
          />
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Next step guidance based on readiness */}
        {readiness !== "live" && !integration?.last_error && (
          <Alert>
            <ArrowRight className="h-4 w-4" />
            <AlertTitle>Next step</AlertTitle>
            <AlertDescription className="text-sm">{readinessMeta.hint}</AlertDescription>
          </Alert>
        )}

        {/* Error alert */}
        {integration?.last_error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Last error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">{integration.last_error}</p>
              {integration.last_error_field && (
                <p className="text-xs opacity-80">
                  Likely field: <code className="font-mono">{integration.last_error_field}</code>
                </p>
              )}
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => clearError()} className="mt-1">
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Clear error
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Not configured banner */}
        {status === "not_configured" && !integration?.last_error && (
          <Alert>
            <PlugZap className="h-4 w-4" />
            <AlertTitle>Not configured yet</AlertTitle>
            <AlertDescription className="text-sm">
              Fill in the credentials below and click <strong>Save Configuration</strong>, then{" "}
              <strong>Test Connection</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* Webhook URL + verify token (read-only copy) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Webhook callback URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <CopyButton text={webhookUrl} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Paste into Meta Dashboard → Webhooks for {meta.label}.
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Verify token</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={integration?.verify_token ?? ""}
                readOnly
                placeholder="— not set —"
                className="font-mono text-xs"
              />
              {integration?.verify_token && <CopyButton text={integration.verify_token} />}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Paste this exact value into Meta's webhook verify token field.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meta.fields.map((f) => {
              const isShown = !!shown[f.key];
              const isMasked = f.secret;
              const missing = f.required && isFieldMissing(f.key, f.secret);
              const placeholder = isMasked && integration?.secrets_set?.[f.key]
                ? "•••••••• (saved — leave blank to keep)"
                : f.placeholder ?? "";
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`${channel}-${f.key}`} className="text-xs flex items-center gap-1.5">
                    <span>
                      {f.label}
                      {f.required && <span className="text-destructive ml-0.5">*</span>}
                    </span>
                    {missing && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        Missing
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${channel}-${f.key}`}
                      type={isMasked && !isShown ? "password" : "text"}
                      placeholder={placeholder}
                      autoComplete="off"
                      disabled={disabled || saving}
                      {...form.register(f.key)}
                      className={isMasked ? "pr-10 font-mono text-xs" : ""}
                    />
                    {isMasked && (
                      <button
                        type="button"
                        onClick={() => setShown((s) => ({ ...s, [f.key]: !s[f.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {isShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {f.helper && <p className="text-[11px] text-muted-foreground">{f.helper}</p>}
                  {form.formState.errors[f.key] && (
                    <p className="text-[11px] text-destructive">
                      {String(form.formState.errors[f.key]?.message)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button type="submit" disabled={disabled || saving} size="sm">
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving…" : "Save Configuration"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || testing}
              onClick={() => test()}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {testing ? "Testing…" : "Test Connection"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || testing}
              onClick={() => reconnect()}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reconnect
            </Button>
          </div>
        </form>

        {/* Telemetry */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Health & Telemetry
            </h4>
            <span className="text-[11px] text-muted-foreground">{completeness}% configured</span>
          </div>
          <Progress value={completeness} className="h-1.5 mb-3" />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <Telemetry label="Connection status" value={STATUS_LABELS[status]} />
            <Telemetry
              label="Token status"
              value={
                meta.fields.some((f) => f.secret && integration?.secrets_set?.[f.key])
                  ? "Saved"
                  : "Missing"
              }
            />
            <Telemetry label="Webhook URL" value={webhookUrl ? "Set" : "Missing"} />
            <Telemetry label="Verify token" value={integration?.verify_token ? "Set" : "Missing"} />
            <Telemetry label="Last health check" value={fmt(integration?.last_health_check_at)} />
            <Telemetry label="Last successful API call" value={fmt(integration?.last_success_at)} />
            <Telemetry label="Last inbound" value={fmt(integration?.last_inbound_at)} />
            <Telemetry label="Last outbound" value={fmt(integration?.last_outbound_at)} />
            <Telemetry label="Last error" value={integration?.last_error ?? "—"} />
            <Telemetry label="Last error at" value={fmt(integration?.last_error_at)} />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border/40 last:border-b-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}
