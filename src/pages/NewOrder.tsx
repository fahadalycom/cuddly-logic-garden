import { useMemo, useState } from "react";
import { Search, Package, Info, Copy, Calculator, Receipt, X, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/shared/PageStates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePosEngine, type ProductWithPlans } from "@/hooks/usePosEngine";
import { ProductInfoSheet } from "@/components/pos/ProductInfoSheet";
import { PosCalculatorSheet } from "@/components/pos/PosCalculatorSheet";
import { PreInvoiceSheet } from "@/components/pos/PreInvoiceSheet";
import { RecentInvoicesSheet } from "@/components/pos/RecentInvoicesSheet";

export default function NewOrderPage() {
  const engine = usePosEngine();
  const [search, setSearch] = useState("");
  const [infoProduct, setInfoProduct] = useState<ProductWithPlans | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [preInvoiceOpen, setPreInvoiceOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return engine.products;
    const starts: ProductWithPlans[] = [];
    const includes: ProductWithPlans[] = [];
    for (const p of engine.products) {
      const name = p.name.toLowerCase();
      const cat = (p.category ?? "").toLowerCase();
      if (name.startsWith(q)) starts.push(p);
      else if (name.includes(q) || cat.includes(q)) includes.push(p);
    }
    return [...starts, ...includes];
  }, [engine.products, search]);

  function handleCopyProducts() {
    if (engine.totalSelected === 0) return;
    const msg = engine.generateProductMessage();
    navigator.clipboard.writeText(msg);
    toast.success(`${engine.totalSelected} product${engine.totalSelected > 1 ? "s" : ""} copied`);
  }

  async function handlePickRecent(invoiceId: string) {
    setRecentOpen(false);
    const preview = await engine.hydrateFromInvoice(invoiceId);
    if (preview) {
      setPreInvoiceOpen(true);
    } else {
      toast.error("Failed to load invoice");
    }
  }

  if (engine.loading) return <LoadingState />;

  return (
    <div className="fixed inset-0 sm:relative sm:inset-auto sm:h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Header: search + recent */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-9 h-10 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
            onClick={() => setRecentOpen(true)}
            title="Recent invoices"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Product grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 pb-32">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((p) => {
                const isSelected = !!engine.selected[p.id];
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative rounded-xl border bg-card/40 overflow-hidden transition-all flex flex-col",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                        : "border-border/40 active:scale-95",
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-10 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                        ✓
                      </div>
                    )}
                    <button
                      onClick={() => engine.toggleProduct(p)}
                      className="aspect-square w-full bg-gradient-to-br from-muted/40 to-muted/10 flex items-center justify-center overflow-hidden"
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-primary/60">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </button>
                    <div className="p-1.5 flex flex-col gap-1">
                      <button
                        onClick={() => engine.toggleProduct(p)}
                        className="text-[11px] font-medium leading-tight line-clamp-2 text-left min-h-[2.2em]"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoProduct(p);
                        }}
                        className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary border border-border/40 rounded-md py-1 transition"
                      >
                        <Info className="h-2.5 w-2.5" />
                        Info
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sticky bottom action bar */}
      {engine.totalSelected > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-border/50 bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0">
              {engine.totalSelected} selected
            </Badge>
            <Button
              variant="outline"
              onClick={handleCopyProducts}
              className="flex-1 h-10 rounded-xl gap-1.5"
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button onClick={() => setCalcOpen(true)} className="flex-1 h-10 rounded-xl gap-1.5">
              <Calculator className="h-4 w-4" /> Calc
            </Button>
          </div>
        </div>
      )}

      {/* Sheets */}
      <ProductInfoSheet
        product={infoProduct}
        open={!!infoProduct}
        onOpenChange={(o) => !o && setInfoProduct(null)}
      />
      <PosCalculatorSheet
        open={calcOpen}
        onOpenChange={setCalcOpen}
        engine={engine}
        onPreInvoice={() => {
          setCalcOpen(false);
          setPreInvoiceOpen(true);
        }}
      />
      <PreInvoiceSheet
        open={preInvoiceOpen}
        onOpenChange={setPreInvoiceOpen}
        engine={engine}
        onPlaced={() => {
          // After placing, fully reset
          engine.clearAll();
        }}
      />
      <RecentInvoicesSheet open={recentOpen} onOpenChange={setRecentOpen} onPick={handlePickRecent} />
    </div>
  );
}
