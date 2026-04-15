import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, Check } from "lucide-react";

const THEMES = [
  {
    id: "default",
    name: "Default",
    description: "Clean dark theme with blue accents",
    outgoing: "bg-primary/20 text-foreground",
    incoming: "bg-card text-foreground",
    preview: "from-primary/20 to-primary/10",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Classic",
    description: "Classic green WhatsApp-style bubbles",
    outgoing: "bg-emerald-700/40 text-foreground",
    incoming: "bg-card text-foreground",
    preview: "from-emerald-700/30 to-emerald-600/10",
  },
  {
    id: "telegram",
    name: "Telegram Blue",
    description: "Telegram-inspired blue gradient bubbles",
    outgoing: "bg-blue-600/30 text-foreground",
    incoming: "bg-card text-foreground",
    preview: "from-blue-600/30 to-blue-500/10",
  },
  {
    id: "purple",
    name: "Purple Haze",
    description: "Soft purple tones for a creative feel",
    outgoing: "bg-purple-600/30 text-foreground",
    incoming: "bg-card text-foreground",
    preview: "from-purple-600/30 to-purple-500/10",
  },
  {
    id: "amber",
    name: "Warm Amber",
    description: "Warm amber tones matching the brand palette",
    outgoing: "bg-amber-600/30 text-foreground",
    incoming: "bg-card text-foreground",
    preview: "from-amber-600/30 to-amber-500/10",
  },
  {
    id: "rose",
    name: "Rose Pink",
    description: "Elegant rose-pink accented bubbles",
    outgoing: "bg-rose-600/30 text-foreground",
    incoming: "bg-card text-foreground",
    preview: "from-rose-600/30 to-rose-500/10",
  },
];

export function WhatsAppThemeSettings() {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    try { return localStorage.getItem("wa_chat_theme") || "default"; } catch { return "default"; }
  });

  const selectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    try { localStorage.setItem("wa_chat_theme", themeId); } catch {}
    toast.success("Chat theme updated!");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Chat Theme</h2>
        <p className="text-xs text-muted-foreground mt-1">Customize the look and feel of your WhatsApp chat interface</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEMES.map((theme) => {
          const isActive = selectedTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={`premium-card !p-4 text-left transition-all hover:scale-[1.02] ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              {/* Preview */}
              <div className="mb-3 space-y-1.5">
                <div className="flex justify-end">
                  <div className={`px-3 py-1.5 rounded-xl rounded-br-sm text-[10px] bg-gradient-to-r ${theme.preview}`}>
                    Hello! How can I help?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className={`px-3 py-1.5 rounded-xl rounded-bl-sm text-[10px] ${theme.incoming} border border-border/20`}>
                    I need information about pricing
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className={`px-3 py-1.5 rounded-xl rounded-br-sm text-[10px] bg-gradient-to-r ${theme.preview}`}>
                    Sure! Let me share our plans 📋
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{theme.name}</p>
                  <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                </div>
                {isActive && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-start gap-2">
          <Palette className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Theme preferences</p>
            <p>Theme selection is saved locally on your device. Each team member can choose their preferred theme.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
