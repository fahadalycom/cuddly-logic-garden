import {
  LayoutDashboard, Package, ShoppingCart, CreditCard, Database, Users, RefreshCw,
  MessageSquare, BarChart3, Settings, LogOut, Truck, CheckCircle,
  Clock, Shield, FileText, UserCog, MessageCircle, Archive, Zap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface NavItem { title: string; url: string; icon: any; module?: string; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  ]},
  { label: "Sales", items: [
    { title: "Products", url: "/products", icon: Package, module: "products" },
    { title: "New Order", url: "/orders/new", icon: ShoppingCart, module: "orders" },
    { title: "Orders", url: "/orders", icon: FileText, module: "orders" },
  ]},
  { label: "Finance", items: [
    { title: "Payments", url: "/payments", icon: CreditCard, module: "payments" },
  ]},
  { label: "Operations", items: [
    { title: "To Deliver", url: "/delivery", icon: Truck, module: "orders" },
    { title: "Completed", url: "/completed", icon: CheckCircle, module: "orders" },
    { title: "Inventory", url: "/inventory", icon: Database, module: "inventory" },
  ]},
  { label: "Clients", items: [
    { title: "All Clients", url: "/clients", icon: Users, module: "clients" },
  ]},
  { label: "Retention", items: [
    { title: "Renewals", url: "/renewals", icon: RefreshCw, module: "renewals" },
    { title: "Reminders", url: "/reminders", icon: Clock, module: "renewals" },
    { title: "Feedback", url: "/feedback", icon: MessageSquare, module: "feedback" },
    { title: "Old Clients", url: "/old-clients", icon: Archive, module: "feedback" },
  ]},
  { label: "Insights", items: [
    { title: "Analytics", url: "/analytics", icon: BarChart3, module: "analytics" },
  ]},
  { label: "Admin", items: [
    { title: "Staff & Teams", url: "/settings/staff", icon: UserCog, module: "settings" },
    { title: "Roles", url: "/settings/roles", icon: Shield, module: "settings" },
    { title: "Templates", url: "/settings/templates", icon: MessageCircle, module: "settings" },
    { title: "Audit Logs", url: "/settings/audit", icon: FileText, module: "settings" },
    { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut, hasPermission } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-5 border-b border-sidebar-border/30">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center glow-primary shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-sidebar-accent-foreground tracking-tight leading-none">AI Sub Manager</p>
              <p className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-[0.2em] mt-1">Management Suite</p>
            </div>
          </div>
        ) : (
          <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center mx-auto glow-primary shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 space-y-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.module || hasPermission(item.module, "can_view")
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="mb-2">
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] font-semibold text-sidebar-foreground/40 px-3 mb-1.5">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <NavLink
                            to={item.url}
                            className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40 transition-all duration-200"
                            activeClassName="bg-sidebar-accent/60 text-sidebar-accent-foreground font-medium shadow-sm"
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-primary" />
                            )}
                            <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'}`} />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/20">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-sidebar-accent/20 border border-sidebar-border/20">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">
                {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-sidebar-accent-foreground truncate leading-none">{profile.full_name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate mt-1">{profile.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-[13px]">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
