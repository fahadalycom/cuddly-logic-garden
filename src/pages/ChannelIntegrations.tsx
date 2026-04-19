import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelStatusStrip } from "@/components/admin/ChannelStatusStrip";
import { ChannelIntegrationCard } from "@/components/admin/ChannelIntegrationCard";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, MessageCircle, Facebook, Instagram } from "lucide-react";

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

      <ChannelStatusStrip />

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
    </div>
  );
}
