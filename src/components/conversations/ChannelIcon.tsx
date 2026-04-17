import { MessageCircle, Facebook, Instagram, Mail, Globe } from "lucide-react";
import type { ConvChannel } from "@/lib/conversations-mock";
import { cn } from "@/lib/utils";

const map = {
  whatsapp: { Icon: MessageCircle, className: "text-emerald-400 bg-emerald-500/10", label: "WhatsApp" },
  facebook: { Icon: Facebook, className: "text-blue-400 bg-blue-500/10", label: "Facebook" },
  instagram: { Icon: Instagram, className: "text-pink-400 bg-pink-500/10", label: "Instagram" },
  email: { Icon: Mail, className: "text-amber-400 bg-amber-500/10", label: "Email" },
  web: { Icon: Globe, className: "text-purple-400 bg-purple-500/10", label: "Web" },
} as const;

export function ChannelIcon({ channel, size = "sm" }: { channel: ConvChannel; size?: "sm" | "md" }) {
  const cfg = map[channel] || map.web;
  const dim = size === "md" ? "h-7 w-7" : "h-5 w-5";
  const icon = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <span
      title={cfg.label}
      className={cn("inline-flex items-center justify-center rounded-md", dim, cfg.className)}
    >
      <cfg.Icon className={icon} />
    </span>
  );
}
