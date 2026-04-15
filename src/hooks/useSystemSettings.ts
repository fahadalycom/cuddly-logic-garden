import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
}

export function useSystemSettings(category?: string) {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    let query = supabase.from("system_settings").select("*").order("key");
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load settings:", error);
    }
    setSettings((data as SystemSetting[]) || []);
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const getValue = (key: string) => settings.find(s => s.key === key)?.value || "";

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("system_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) {
      toast.error("Failed to update: " + error.message);
      return false;
    }
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    return true;
  };

  const upsertSetting = async (setting: Partial<SystemSetting> & { key: string }) => {
    const existing = settings.find(s => s.key === setting.key);
    if (existing) {
      return updateSetting(setting.key, setting.value || "");
    }
    const { error } = await supabase.from("system_settings").insert({
      key: setting.key,
      value: setting.value || "",
      category: setting.category || "general",
      description: setting.description || null,
      is_secret: setting.is_secret || false,
    });
    if (error) {
      toast.error("Failed to create: " + error.message);
      return false;
    }
    await fetchSettings();
    return true;
  };

  const deleteSetting = async (key: string) => {
    const { error } = await supabase.from("system_settings").delete().eq("key", key);
    if (error) {
      toast.error("Failed to delete: " + error.message);
      return false;
    }
    setSettings(prev => prev.filter(s => s.key !== key));
    return true;
  };

  return { settings, loading, getValue, updateSetting, upsertSetting, deleteSetting, refetch: fetchSettings };
}
