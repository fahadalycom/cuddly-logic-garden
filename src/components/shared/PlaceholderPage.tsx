import { LucideIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Column { key: string; label: string; }
interface Row { [k: string]: any; }

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  columns: Column[];
  rows: Row[];
  emptyHint?: string;
  primaryAction?: string;
}

export function PlaceholderPage({ title, description, icon: Icon, columns, rows, primaryAction = "Add new" }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        icon={<Icon className="h-5 w-5 text-white" />}
        actions={
          <Button className="rounded-xl gradient-primary text-white shadow-lg">
            <Plus className="h-4 w-4 mr-1.5" /> {primaryAction}
          </Button>
        }
      />
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                {columns.map((c) => (
                  <th key={c.key} className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/15 transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3.5 text-foreground/85">
                      {r[c.key] ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 text-center mt-4">
        Showing demo data — full CRUD coming in next module step
      </p>
    </div>
  );
}
