import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "warning" | "bad";

const toneMap: Record<Tone, string> = {
  neutral: "from-primary/15 to-primary/5 text-primary",
  good: "from-emerald-500/15 to-emerald-500/5 text-emerald-400",
  warning: "from-amber-500/15 to-amber-500/5 text-amber-400",
  bad: "from-rose-500/15 to-rose-500/5 text-rose-400",
};

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  loading?: boolean;
}

export function KpiCard({ label, value, icon: Icon, tone = "neutral", hint, loading }: Props) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 hover:border-border/70 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/65">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 tracking-tight tabular-nums">
            {loading ? <span className="inline-block h-6 w-16 rounded bg-muted/40 animate-pulse" /> : value}
          </p>
          {hint && <p className="text-[11px] text-muted-foreground/60 mt-1">{hint}</p>}
        </div>
        <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
