import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Premium Header */}
          <header className="h-16 flex items-center border-b border-border/30 bg-background/80 backdrop-blur-2xl px-6 gap-4 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground/60 hover:text-foreground transition-colors" />

            {/* Command bar hint */}
            <div className="flex-1 flex items-center justify-center">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-card/40 border border-border/20 text-muted-foreground/40 text-xs cursor-pointer hover:bg-card/60 hover:text-muted-foreground/60 transition-all duration-300 max-w-xs w-full">
                <Command className="h-3.5 w-3.5" />
                <span>Search anything...</span>
                <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-border/30 font-mono">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground/50 hover:text-foreground rounded-xl h-9 w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full gradient-primary animate-pulse shadow-lg shadow-primary/30" />
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-auto">
            <div className="max-w-7xl mx-auto animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
