import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AgentConfigPanel } from "@/components/whatsapp/AgentConfigPanel";
import { LoadingState } from "@/components/shared/PageStates";

export function WhatsAppAgentSettings() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("staff_profiles").select("*").eq("is_active", true);
      setStaff(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Agent Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">Manage agent availability, chat limits, and daily message quotas</p>
      </div>
      <div className="premium-card !p-0 overflow-hidden" style={{ maxHeight: "600px" }}>
        <AgentConfigPanel staff={staff} />
      </div>
    </div>
  );
}
