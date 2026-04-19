import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelStatusStrip } from "@/components/admin/ChannelStatusStrip";
import { ChannelIntegrationCard } from "@/components/admin/ChannelIntegrationCard";
import { IntegrationHealthStrip } from "@/components/admin/IntegrationHealthStrip";
import { OperationalLogsPanel } from "@/components/admin/OperationalLogsPanel";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, MessageCircle, Facebook, Instagram, Activity, Settings as SettingsIcon } from "lucide-react";

export default function ChannelIntegrationsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channel Integrations"
        description="Configure and monitor Meta messaging channels — WhatsApp, Messenger, and Instagram."
      />

      {!isAdmin && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Read-only view</AlertTitle>
          <AlertDescription>
            You can review channel health below. Only admins can edit credentials or toggle channels.
          </AlertDescription>
        </Alert>
      )}

      <IntegrationHealthStrip />
      <ChannelStatusStrip />

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels" className="gap-1.5">
            <SettingsIcon className="h-4 w-4" /> Channels
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Activity className="h-4 w-4" /> Operational Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <Tabs defaultValue="whatsapp" className="space-y-4">
            <TabsList>
              <TabsTrigger value="whatsapp" className="gap-1.5">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </TabsTrigger>
              <TabsTrigger value="messenger" className="gap-1.5">
                <Facebook className="h-4 w-4" /> Messenger
              </TabsTrigger>
              <TabsTrigger value="instagram" className="gap-1.5">
                <Instagram className="h-4 w-4" /> Instagram
              </TabsTrigger>
            </TabsList>
            <TabsContent value="whatsapp">
              <ChannelIntegrationCard channel="whatsapp" />
            </TabsContent>
            <TabsContent value="messenger">
              <ChannelIntegrationCard channel="messenger" />
            </TabsContent>
            <TabsContent value="instagram">
              <ChannelIntegrationCard channel="instagram" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="logs">
          <OperationalLogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
