import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  "😀": ["😀", "😂", "🥹", "😍", "🤩", "😘", "😎", "🤔", "😴", "🥺", "😭", "😡", "🤗", "😏", "🥳", "😤"],
  "👋": ["👍", "👎", "👋", "🤝", "🙏", "👏", "💪", "✌️", "🤞", "👌", "🫡", "🫶", "🤙", "👆", "🫰", "🤘"],
  "❤️": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💔", "💕", "💯", "✨", "🔥", "💖", "🩷", "💝", "🫀"],
  "🎉": ["🎉", "🎊", "🎁", "📱", "💻", "📎", "📌", "⏰", "💰", "📦", "🔑", "✅", "⭐", "🌟", "🏆", "🎯"],
};

const TAB_LABELS: Record<string, string> = {
  "😀": "Smileys",
  "👋": "Gestures", 
  "❤️": "Hearts",
  "🎉": "Objects",
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  isMobile?: boolean;
}

export function EmojiPicker({ onSelect, isMobile }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("😀");

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    if (isMobile) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`${isMobile ? "h-10 w-10" : "h-9 w-9"} flex-shrink-0 rounded-full flex items-center justify-center ${isMobile ? "active:bg-muted/50" : "hover:bg-muted"} transition-colors`}
        >
          <Smile className={`${isMobile ? "h-5 w-5" : "h-4 w-4"} text-muted-foreground`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align={isMobile ? "center" : "start"}
        className={`${isMobile ? "w-[88vw]" : "w-[340px]"} p-0 rounded-2xl border-border/50 shadow-2xl overflow-hidden`}
        sideOffset={8}
      >
        {/* Category tabs */}
        <div className="flex border-b border-border/50 bg-muted/30">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex-1 py-2.5 text-center transition-all ${
                activeTab === cat
                  ? "bg-primary/10 border-b-2 border-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <span className="text-lg">{cat}</span>
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <div className={`grid ${isMobile ? "grid-cols-8" : "grid-cols-8"} gap-0.5 p-2`}>
          {EMOJI_CATEGORIES[activeTab as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className={`${isMobile ? "h-11 w-full" : "h-10 w-full"} rounded-xl flex items-center justify-center text-xl ${isMobile ? "active:bg-muted active:scale-110" : "hover:bg-muted hover:scale-110"} transition-all`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
