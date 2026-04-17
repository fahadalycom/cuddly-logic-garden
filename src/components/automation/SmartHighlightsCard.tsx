import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Sparkles, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import { loadSmartHighlights, type SmartHighlight } from "@/lib/automation";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const SEVERITY_TONE: Record<SmartHighlight["severity"], string> = {
  info: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export function SmartHighlightsCard() {
  const [items, setItems] = useState<SmartHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    try { setItems(await loadSmartHighlights()); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <Card className="p-4 bg-card/40 border-border/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Smart Highlights</h3>
          <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      {items.length === 0 && !loading ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          All clear — no risks or overdue items.
        </div>
      ) : (
        <ScrollArea className="h-[320px] pr-2">
          <div className="space-y-2">
            {items.map((h) => (
              <button
                key={h.id}
                onClick={() => h.href && navigate(h.href)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/40",
                  SEVERITY_TONE[h.severity],
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{h.title}</div>
                    <div className="text-[11px] opacity-80 truncate">{h.detail}</div>
                  </div>
                  {h.href && <ArrowRight className="h-3 w-3 mt-1 opacity-60" />}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
