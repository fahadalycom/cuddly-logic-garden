import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MessageTemplate } from "@/types/database";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("message_templates").select("*").order("category").then(({ data }) => { setTemplates(data || []); setLoading(false); });
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" />Message Templates</h1>
        <p className="page-subtitle">{templates.length} templates configured</p>
      </div>
      {templates.length === 0 ? <EmptyState title="No templates" description="Add WhatsApp message templates for orders, reminders, and feedback." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Category</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{templates.map((t) => (
              <TableRow key={t.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{t.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] capitalize bg-secondary/30 text-muted-foreground border-border/20 rounded-lg font-medium">
                    {t.category.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {t.is_active ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"><Check className="h-3.5 w-3.5" />Active</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground/40"><X className="h-3.5 w-3.5" />Inactive</span>
                  )}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
