import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

/**
 * Like AppLayout but the main area has NO padding and NO max-width — the
 * routed page fills the entire viewport (minus the sidebar). Used for
 * operational workspaces such as /conversations and /whatsapp where the
 * page owns its own scroll regions.
 */
export function FullBleedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          {/* Slim header — only the sidebar trigger so we keep navigation */}
          <header className="h-12 flex items-center border-b border-border/30 bg-background/80 backdrop-blur px-3 gap-2 shrink-0">
            <SidebarTrigger className="text-muted-foreground/70 hover:text-foreground transition-colors" />
            <span className="text-xs font-medium text-muted-foreground">Conversations</span>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
