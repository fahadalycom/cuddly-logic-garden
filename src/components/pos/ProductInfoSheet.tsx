import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/template-engine";
import { PRODUCT_TYPE_COLOR, PRODUCT_TYPE_LABEL } from "@/types/products";
import { cn } from "@/lib/utils";
import type { ProductWithPlans } from "@/hooks/usePosEngine";

export function ProductInfoSheet({
  product,
  open,
  onOpenChange,
}: {
  product: ProductWithPlans | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border/40 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            {product?.name ?? "Product"}
            {product && (
              <Badge
                variant="outline"
                className={cn("text-[9px] h-4 px-1.5 ml-auto", PRODUCT_TYPE_COLOR[product.product_type])}
              >
                {PRODUCT_TYPE_LABEL[product.product_type]}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {product && (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded-xl border border-border/40"
                />
              )}

              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(Number(product.base_price))}
                </div>
                {product.short_description && (
                  <p className="text-sm text-muted-foreground mt-1">{product.short_description}</p>
                )}
              </div>

              {product.plans?.length > 0 && (
                <Section title="Plans">
                  <div className="space-y-1.5">
                    {product.plans.map((pl) => (
                      <div
                        key={pl.id}
                        className="flex justify-between items-center text-sm rounded-lg border border-border/40 px-3 py-2"
                      >
                        <span className="font-medium">{pl.name}</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(Number(pl.price))}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {product.features?.length > 0 && (
                <Section title="Features">
                  <ul className="space-y-1.5">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {product.description && (
                <Section title="Description">
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">{product.description}</p>
                </Section>
              )}

              {product.usage_instructions && (
                <Section title="How to use">
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">
                    {product.usage_instructions}
                  </p>
                </Section>
              )}

              {product.faq_content && (
                <Section title="FAQ">
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">{product.faq_content}</p>
                </Section>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}
