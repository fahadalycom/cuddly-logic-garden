import {
  LayoutDashboard, Package, ShoppingCart, CreditCard, Database, Users, RefreshCw,
  MessageSquare, BarChart3, Settings, LogOut, ChevronDown, Truck, CheckCircle,
  Clock, Shield, FileText, UserCog, MessageCircle, Archive
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  module?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Products", url: "/products", icon: Package, module: "products" },
      { title: "New Order", url: "/orders/new", icon: ShoppingCart, module: "orders" },
      { title: "Orders", url: "/orders", icon: FileText, module: "orders" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Payment Verification", url: "/payments", icon: CreditCard, module: "payments" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "To Deliver", url: "/delivery", icon: Truck, module: "orders" },
      { title: "Completed", url: "/completed", icon: CheckCircle, module: "orders" },
      { title: "Inventory", url: "/inventory", icon: Database, module: "inventory" },
    ],
  },
  {
    label: "Clients",
    items: [
      { title: "All Clients", url: "/clients", icon: Users, module: "clients" },
    ],
  },
  {
    label: "Retention",
    items: [
      { title: "Renewals", url: "/renewals", icon: RefreshCw, module: "renewals" },
      { title: "Reminders", url: "/reminders", icon: Clock, module: "renewals" },
      { title: "Feedback", url: "/feedback", icon: MessageSquare, module: "feedback" },
      { title: "Old Clients", url: "/old-clients", icon: Archive, module: "feedback" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3, module: "analytics" },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Staff & Teams", url: "/settings/staff", icon: UserCog, module: "settings" },
      { title: "Roles", url: "/settings/roles", icon: Shield, module: "settings" },
      { title: "Templates", url: "/settings/templates", icon: MessageCircle, module: "settings" },
      { title: "Audit Logs", url: "/settings/audit", icon: FileText, module: "settings" },
      { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut, hasPermission } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground">AI Sub Manager</p>
              <p className="text-xs text-sidebar-foreground/60">Management System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">AI</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.module || hasPermission(item.module, "can_view")
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.url || location.pathname.startsWith(item.url + "/")}>
                        <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && profile && (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-medium text-sidebar-accent-foreground">
                {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
