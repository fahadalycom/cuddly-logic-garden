import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/useClipboard";

export function CopyButton({ text, label, size = "icon" }: { text: string; label?: string; size?: "icon" | "sm" | "default" }) {
  const { copy } = useClipboard();
  return (
    <Button variant="ghost" size={size} onClick={() => copy(text, label)} title="Copy to clipboard">
      <Copy className="h-4 w-4" />
      {size !== "icon" && <span className="ml-1">Copy</span>}
    </Button>
  );
}
