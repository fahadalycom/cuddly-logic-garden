import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MessageTemplate } from "@/types/database";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("message_templates").select("*").order("category").then(({ data }) => { setTemplates(data || []); setLoading(false); });
  }, []);

  if (loading) return <LoadingState />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Message Templates</h1>
      {templates.length === 0 ? <EmptyState title="No templates" description="Add WhatsApp message templates for orders, reminders, and feedback." /> : (
        <Card><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>{templates.map((t) => (<TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell className="capitalize">{t.category.replace(/_/g, " ")}</TableCell><TableCell>{t.is_active ? "Yes" : "No"}</TableCell></TableRow>))}</TableBody>
        </Table></Card>
      )}
    </div>
  );
}
