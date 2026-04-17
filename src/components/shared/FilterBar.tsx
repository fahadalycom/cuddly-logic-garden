import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}

export function FilterBar({ search, onSearch, placeholder = "Search...", children }: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-5 p-3 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm">
      {onSearch && (
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            value={search || ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="pl-9 bg-background/40 border-border/30 rounded-xl h-10"
          />
        </div>
      )}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
