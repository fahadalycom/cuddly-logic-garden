import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/template-engine";
import type { usePosEngine } from "@/hooks/usePosEngine";

type Engine = ReturnType<typeof usePosEngine>;

export function PosCalculatorSheet({
  open,
  onOpenChange,
  engine,
  onPreInvoice,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  engine: Engine;
  onPreInvoice: () => void;
}) {
  const {
    products,
    bundles,
    selected,
    selectedBundles,
    lineItems,
    subtotal,
    discountAmount,
    finalTotal,
    discountMode,
    setDiscountMode,
    discountValue,
    setDiscountValue,
    setPlanFor,
    setQty,
    setPriceOverride,
    toggleProduct,
    toggleBundle,
    bundleQty,
    setBundleQty,
    bundlePriceOverride,
    setBundlePriceOverride,
  } = engine;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border/40 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Price Calculator
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {lineItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No items selected.</p>
            ) : (
              <div className="space-y-2.5">
                {Object.values(selected).map((sel) => {
                  const p = products.find((x) => x.id === sel.productId);
                  if (!p) return null;
                  const plan = p.plans?.find((pl) => pl.id === sel.planId);
                  const baseUnit = plan ? Number(plan.price) : Number(p.base_price);
                  const unit = sel.priceOverride != null ? Number(sel.priceOverride) : baseUnit;
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold flex-1 truncate">{p.name}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleProduct(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                      {p.plans?.length > 1 && (
                        <Select value={sel.planId ?? ""} onValueChange={(v) => setPlanFor(p.id, v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {p.plans.map((pl) => (
                              <SelectItem key={pl.id} value={pl.id} className="text-xs">
                                {pl.name} — {formatCurrency(Number(pl.price))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg border border-border/40 p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setQty(p.id, sel.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-7 text-center font-medium">{sel.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setQty(p.id, sel.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={sel.priceOverride ?? unit}
                          onChange={(e) =>
                            setPriceOverride(p.id, e.target.value ? Number(e.target.value) : null)
                          }
                          className="h-8 text-xs flex-1"
                        />
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          {formatCurrency(unit * sel.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {Array.from(selectedBundles).map((bid) => {
                  const b = bundles.find((x) => x.id === bid);
                  if (!b) return null;
                  const baseUnit =
                    b.bundle_price ??
                    b.bundle_items?.reduce(
                      (s, it) => s + (Number(it.product?.base_price) || 0) * (it.quantity || 1),
                      0,
                    ) ??
                    0;
                  const unit = bundlePriceOverride[bid] ?? Number(baseUnit);
                  const qty = bundleQty[bid] ?? 1;
                  return (
                    <div
                      key={bid}
                      className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold flex-1 truncate">{b.name} (Bundle)</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleBundle(bid)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg border border-border/40 p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setBundleQty((q) => ({ ...q, [bid]: Math.max(1, qty - 1) }))
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-7 text-center font-medium">{qty}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setBundleQty((q) => ({ ...q, [bid]: qty + 1 }))}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={unit}
                          onChange={(e) =>
                            setBundlePriceOverride((o) => ({
                              ...o,
                              [bid]: Number(e.target.value) || 0,
                            }))
                          }
                          className="h-8 text-xs flex-1"
                        />
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          {formatCurrency(unit * qty)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Discount */}
            <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Discount
              </Label>
              <div className="flex gap-2">
                <Select value={discountMode} onValueChange={(v: any) => setDiscountMode(v)}>
                  <SelectTrigger className="h-9 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
                {discountMode !== "none" && (
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    placeholder={discountMode === "percent" ? "%" : "amount"}
                    className="h-9 text-xs flex-1"
                  />
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-500">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="h-px bg-border/40 my-1.5" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t border-border/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2 shrink-0 bg-background/95 backdrop-blur">
          <Button variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            className="flex-[2] h-11 gap-1.5 font-semibold"
            onClick={onPreInvoice}
            disabled={lineItems.length === 0}
          >
            <FileText className="h-4 w-4" />
            Generate Pre-Invoice
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
