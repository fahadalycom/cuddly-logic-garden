import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😂", "🥹", "😍", "🤩", "😘", "😎", "🤔", "😴", "🥺", "😭", "😡"],
  "Gestures": ["👍", "👎", "👋", "🤝", "🙏", "👏", "💪", "✌️", "🤞", "👌", "🫡", "🫶"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💔", "💕", "💯", "✨", "🔥"],
  "Objects": ["🎉", "🎊", "🎁", "📱", "💻", "📎", "📌", "⏰", "💰", "📦", "🔑", "✅"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  isMobile?: boolean;
}

export function EmojiPicker({ onSelect, isMobile }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Smileys");

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    if (isMobile) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`${isMobile ? "h-11 w-11" : "h-9 w-9"} flex-shrink-0 rounded-full flex items-center justify-center ${isMobile ? "active:bg-muted" : "hover:bg-muted"} transition-colors`}
        >
          <Smile className={`${isMobile ? "h-[22px] w-[22px]" : "h-4 w-4"} text-muted-foreground`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align={isMobile ? "center" : "start"}
        className={`${isMobile ? "w-[85vw]" : "w-80"} p-2`}
        sideOffset={8}
      >
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 border-b border-border pb-2">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                activeTab === cat
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <div className="grid grid-cols-6 gap-0.5">
          {EMOJI_CATEGORIES[activeTab as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className={`${isMobile ? "h-10 w-10" : "h-9 w-9"} rounded-lg flex items-center justify-center text-xl ${isMobile ? "active:bg-muted active:scale-110" : "hover:bg-muted hover:scale-110"} transition-all`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
