import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Headphones, ShoppingCart, CreditCard, Truck, RotateCw, Loader2, Lightbulb } from "lucide-react";
import { handoffConversation, QUEUE_LABEL, QUEUE_COLOR, type HandoffQueue } from "@/lib/handoff";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentQueue: string;
  customerName?: string;
  suggestedQueue?: HandoffQueue;
  suggestedReason?: string;
  onSuccess?: (toQueue: HandoffQueue) => void;
}

const QUEUE_OPTIONS: { value: HandoffQueue; icon: any; description: string }[] = [
  { value: "sales", icon: ShoppingCart, description: "New inquiries, upsells, product questions" },
  { value: "support", icon: Headphones, description: "Login, access, technical issues, complaints" },
  { value: "payments", icon: CreditCard, description: "Payment proof, verification, refunds" },
  { value: "fulfillment", icon: Truck, description: "Provisioning, delivery, account setup" },
  { value: "renewals", icon: RotateCw, description: "Subscription renewals, expiring plans" },
];

export function HandoffDialog({
  open, onOpenChange, conversationId, currentQueue, customerName,
  suggestedQueue, suggestedReason, onSuccess,
}: Props) {
  const [toQueue, setToQueue] = useState<HandoffQueue>(suggestedQueue ?? "support");
  const [note, setNote] = useState("");
  const [setStatus, setSetStatus] = useState<"waiting_internal" | "active">("waiting_internal");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setToQueue(suggestedQueue ?? (currentQueue === "sales" ? "support" : "sales"));
      setNote("");
      setSetStatus("waiting_internal");
    }
  }, [open, suggestedQueue, currentQueue]);

  // Filter out current queue from options
  const options = QUEUE_OPTIONS.filter((o) => o.value !== currentQueue);

  const handleTransfer = async () => {
    if (!note.trim()) {
      toast.error("Please add a short handoff note for context");
      return;
    }
    setLoading(true);
    const res = await handoffConversation(conversationId, toQueue, note.trim(), setStatus);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error || "Handoff failed");
      return;
    }
    toast.success(
      `Transferred to ${QUEUE_LABEL[toQueue]}${res.placement === "overflow" ? " (overflow — no agent available)" : ""}`,
    );
    onSuccess?.(toQueue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Transfer Conversation
            <Badge variant="outline" className={cn("text-[10px] uppercase", QUEUE_COLOR[currentQueue])}>
              {QUEUE_LABEL[currentQueue] ?? currentQueue}
            </Badge>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className={cn("text-[10px] uppercase", QUEUE_COLOR[toQueue])}>
              {QUEUE_LABEL[toQueue]}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {customerName ? `${customerName} · ` : ""}
            Auto-assignment will route to next available agent in the new department. Full context (messages, order, ticket, invoice) is preserved.
          </DialogDescription>
        </DialogHeader>

        {suggestedQueue && suggestedReason && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-start gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200">
              <span className="font-medium">Suggested: {QUEUE_LABEL[suggestedQueue]}</span> — {suggestedReason}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Department</Label>
          <RadioGroup value={toQueue} onValueChange={(v) => setToQueue(v as HandoffQueue)} className="grid grid-cols-1 gap-1.5">
            {options.map(({ value, icon: Icon, description }) => (
              <label
                key={value}
                htmlFor={`q-${value}`}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors",
                  toQueue === value ? "border-primary bg-primary/5" : "border-border/40 hover:bg-muted/30",
                )}
              >
                <RadioGroupItem value={value} id={`q-${value}`} className="mt-0.5" />
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{QUEUE_LABEL[value]}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="handoff-note" className="text-xs">
            Handoff note <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="handoff-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Customer sent payment proof, please verify · Login not working, needs replacement · Ready for delivery"
            className="min-h-[70px] text-xs"
          />
          <p className="text-[10px] text-muted-foreground">Visible to the next agent and saved in activity log.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Status after transfer</Label>
          <RadioGroup value={setStatus} onValueChange={(v) => setSetStatus(v as any)} className="flex gap-2">
            <label className={cn(
              "flex-1 rounded-lg border p-2 cursor-pointer text-center text-xs",
              setStatus === "waiting_internal" ? "border-primary bg-primary/5" : "border-border/40",
            )}>
              <RadioGroupItem value="waiting_internal" className="sr-only" />
              Waiting (internal handoff)
            </label>
            <label className={cn(
              "flex-1 rounded-lg border p-2 cursor-pointer text-center text-xs",
              setStatus === "active" ? "border-primary bg-primary/5" : "border-border/40",
            )}>
              <RadioGroupItem value="active" className="sr-only" />
              Active (urgent)
            </label>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleTransfer} disabled={loading || !note.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />}
            Transfer to {QUEUE_LABEL[toQueue]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
