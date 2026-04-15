import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, X, MessageSquare, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface MessageSearchProps {
  onSelectConversation: (conversationId: string) => void;
  onClose: () => void;
}

export function MessageSearch({ onSelectConversation, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }

    setSearching(true);
    const { data } = await supabase
      .from("wa_messages")
      .select("id, content, created_at, sender_type, conversation_id, wa_conversations(customer_name, customer_phone)")
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    setResults(data || []);
    setSearching(false);
  }, []);

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col animate-in fade-in duration-200">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          autoFocus
          placeholder="Search messages across all conversations..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg flex-shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {results.map(r => {
            const conv = r.wa_conversations;
            return (
              <button
                key={r.id}
                onClick={() => { onSelectConversation(r.conversation_id); onClose(); }}
                className="w-full text-left p-3 rounded-xl hover:bg-accent/50 transition-colors group flex items-start gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{conv?.customer_name || conv?.customer_phone || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{highlightMatch(r.content || "", query)}</p>
                  <span className="text-[10px] text-muted-foreground/60 capitalize">{r.sender_type}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </button>
            );
          })}
          {query.length >= 2 && results.length === 0 && !searching && (
            <div className="text-center py-12">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No messages found</p>
            </div>
          )}
          {query.length < 2 && (
            <div className="text-center py-12">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground/60">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark> : part
  );
}
