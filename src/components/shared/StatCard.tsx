import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  accent?: "primary" | "emerald" | "amber" | "blue" | "purple" | "rose";
  subtitle?: string;
}

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-400",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-400",
  blue: "from-blue-500/15 to-blue-500/5 text-blue-400",
  purple: "from-purple-500/15 to-purple-500/5 text-purple-400",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-400",
};

export function StatCard({ title, value, icon: Icon, trend, accent = "primary", subtitle }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 hover:border-border/70 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/65">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-foreground mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground/60 mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium mt-2", trend.up ? "text-emerald-400" : "text-rose-400")}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
