import { useNotifications } from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Volume2, VolumeX, Smartphone, Monitor, Shield } from "lucide-react";

export function WhatsAppNotificationSettings() {
  const { permission, soundEnabled, notifEnabled, toggleSound, toggleNotif, requestPermission } = useNotifications();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Notification Settings</h2>
        <p className="text-xs text-muted-foreground mt-1">Configure how you receive alerts for new WhatsApp messages</p>
      </div>

      {/* Browser Permission */}
      <div className="premium-card !p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary/70" />
            </div>
            <div>
              <p className="text-sm font-semibold">Browser Permission</p>
              <p className="text-[10px] text-muted-foreground">Required for push notifications</p>
            </div>
          </div>
          {permission === "granted" ? (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg">Granted</Badge>
          ) : permission === "denied" ? (
            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 rounded-lg">Blocked</Badge>
          ) : (
            <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={requestPermission}>Allow</Button>
          )}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="premium-card !p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
              {notifEnabled ? <Bell className="h-4 w-4 text-primary/70" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">Push Notifications</p>
              <p className="text-[10px] text-muted-foreground">Desktop notifications when a new message arrives</p>
            </div>
          </div>
          <Switch checked={notifEnabled} onCheckedChange={toggleNotif} />
        </div>
      </div>

      {/* Sound Alerts */}
      <div className="premium-card !p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center">
              {soundEnabled ? <Volume2 className="h-4 w-4 text-primary/70" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">Sound Alerts</p>
              <p className="text-[10px] text-muted-foreground">Play a notification sound for incoming messages</p>
            </div>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-start gap-2">
          <Monitor className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How notifications work</p>
            <p>Notifications are triggered when a new message arrives in a conversation you're not currently viewing. Both push and sound settings are saved per device.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
