import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { SmartHighlightsCard } from "@/components/automation/SmartHighlightsCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, ShoppingCart, RefreshCw, LifeBuoy, Inbox, Users, AlertTriangle,
  CheckCircle2, Clock, MessageSquare, Plus, TrendingUp, Truck, ListChecks,
  CreditCard, UserPlus, Activity,
} from "lucide-react";
import { mockConversations, mockLeads, mockTickets, mockRenewals, mockTasks, mockTeam } from "@/lib/mock-data";
import { ChannelHealthHighlights } from "@/components/dashboard/ChannelHealthHighlights";
import type { AppRole } from "@/types/database";

// ---------- FOUNDER / ADMIN ----------
function FounderDashboard() {
  return (
    <>
      <ChannelHealthHighlights />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Sales Today" value="$1,840" icon={DollarSign} accent="emerald" trend={{ value: "12% vs yesterday", up: true }} />
        <StatCard title="Total Orders" value="324" icon={ShoppingCart} accent="primary" subtitle="Last 30 days" />
        <StatCard title="Active Subscriptions" value="1,287" icon={RefreshCw} accent="blue" />
        <StatCard title="Expiring Soon" value="42" icon={Clock} accent="amber" subtitle="Next 7 days" />
        <StatCard title="Open Tickets" value="18" icon={LifeBuoy} accent="rose" />
        <StatCard title="Queue Backlog" value="7" icon={Inbox} accent="purple" subtitle="Unassigned chats" />
        <StatCard title="Total Customers" value="2,431" icon={Users} accent="primary" />
        <StatCard title="Revenue (MTD)" value="$24,580" icon={TrendingUp} accent="emerald" trend={{ value: "18%", up: true }} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-2">
        <SmartHighlightsCard />
        <RecentActivity />
      </div>
    </>
  );
}

// ---------- SALES ----------
function SalesDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="New Leads" value={mockLeads.filter(l => l.status === "new").length} icon={UserPlus} accent="primary" />
        <StatCard title="Active Conversations" value={mockConversations.filter(c => c.status === "active").length} icon={MessageSquare} accent="blue" />
        <StatCard title="Follow-ups Due" value="6" icon={Clock} accent="amber" subtitle="Today" />
        <StatCard title="Pending Orders" value="9" icon={ShoppingCart} accent="purple" />
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Button asChild className="rounded-xl gradient-primary text-white shadow-lg">
          <Link to="/conversations"><MessageSquare className="h-4 w-4 mr-1.5" /> View Conversations</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl border-border/40">
          <Link to="/orders/new"><Plus className="h-4 w-4 mr-1.5" /> Create Order</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl border-border/40">
          <Link to="/leads"><UserPlus className="h-4 w-4 mr-1.5" /> Add Lead</Link>
        </Button>
      </div>
      <ListCard title="My Leads" linkTo="/leads">
        {mockLeads.slice(0, 5).map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/15 last:border-0">
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{l.name}</p>
              <p className="text-xs text-muted-foreground/70 truncate">{l.interest} • {l.source}</p>
            </div>
            <StatusBadge status={l.status as any} />
          </div>
        ))}
      </ListCard>
    </>
  );
}

// ---------- SUPPORT ----------
function SupportDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Open Tickets" value={mockTickets.filter(t => t.status === "open").length} icon={LifeBuoy} accent="rose" />
        <StatCard title="High Priority" value={mockTickets.filter(t => t.priority === "urgent" || t.priority === "high").length} icon={AlertTriangle} accent="amber" />
        <StatCard title="Unresolved Chats" value="4" icon={MessageSquare} accent="blue" />
        <StatCard title="Closed Today" value="11" icon={CheckCircle2} accent="emerald" />
      </div>
      <ListCard title="Active Tickets" linkTo="/support">
        {mockTickets.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/15 last:border-0">
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground/70">{t.customer}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PriorityBadge priority={t.priority as any} />
              <StatusBadge status={t.status as any} />
            </div>
          </div>
        ))}
      </ListCard>
    </>
  );
}

// ---------- PAYMENTS ----------
function PaymentsDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Proofs" value="14" icon={Clock} accent="amber" subtitle="Awaiting verification" />
        <StatCard title="Verified Today" value="38" icon={CheckCircle2} accent="emerald" />
        <StatCard title="Rejected Today" value="3" icon={AlertTriangle} accent="rose" />
        <StatCard title="Total Verified (MTD)" value="$24,580" icon={DollarSign} accent="primary" />
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center">
        <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground/70">Payment proof verification queue will load here.</p>
        <Button asChild className="mt-4 rounded-xl gradient-primary text-white">
          <Link to="/payments">Open Payments</Link>
        </Button>
      </div>
    </>
  );
}

// ---------- FULFILLMENT ----------
function FulfillmentDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Ready for Delivery" value="12" icon={Truck} accent="primary" />
        <StatCard title="Pending Fulfillment" value="5" icon={Clock} accent="amber" />
        <StatCard title="Completed Today" value="24" icon={CheckCircle2} accent="emerald" />
        <StatCard title="Avg. Time" value="2.4h" icon={Activity} accent="blue" />
      </div>
      <Button asChild className="rounded-xl gradient-primary text-white shadow-lg">
        <Link to="/fulfillment"><Truck className="h-4 w-4 mr-1.5" /> Open Fulfillment Queue</Link>
      </Button>
    </>
  );
}

// ---------- RENEWALS ----------
function RenewalsDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Expiring (3-5 days)" value={mockRenewals.length} icon={Clock} accent="amber" />
        <StatCard title="Renewal Pending" value="18" icon={RefreshCw} accent="blue" />
        <StatCard title="Renewed Today" value="9" icon={CheckCircle2} accent="emerald" />
        <StatCard title="Conversion Rate" value="68%" icon={TrendingUp} accent="primary" trend={{ value: "4%", up: true }} />
      </div>
      <ListCard title="Expiring Soon" linkTo="/renewals">
        {mockRenewals.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/15 last:border-0">
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{r.customer}</p>
              <p className="text-xs text-muted-foreground/70 truncate">{r.product} • Rs {r.amount}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-amber-400 font-medium">{r.expiresIn}</span>
              <StatusBadge status={r.status as any} />
            </div>
          </div>
        ))}
      </ListCard>
    </>
  );
}

// ---------- OPERATIONS ----------
function OperationsDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Queue Backlog" value="7" icon={Inbox} accent="amber" subtitle="Unassigned" />
        <StatCard title="Pending Tasks" value={mockTasks.filter(t => t.status === "pending").length} icon={ListChecks} accent="primary" />
        <StatCard title="Active Agents" value={mockTeam.filter(m => m.status === "active").length} icon={Users} accent="emerald" subtitle={`of ${mockTeam.length} total`} />
        <StatCard title="System Alerts" value="2" icon={AlertTriangle} accent="rose" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ListCard title="Agent Workload" linkTo="/team">
          {mockTeam.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/15 last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{m.name.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground/70 truncate">{m.role}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-foreground/85">{m.chats} chats</span>
            </div>
          ))}
        </ListCard>
        <ListCard title="Pending Tasks" linkTo="/tasks">
          {mockTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/15 last:border-0">
              <p className="font-medium text-foreground text-sm truncate min-w-0">{t.title}</p>
              <PriorityBadge priority={t.priority as any} />
            </div>
          ))}
        </ListCard>
      </div>
    </>
  );
}

// ---------- helpers ----------
function ListCard({ title, linkTo, children }: { title: string; linkTo?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-primary hover:text-primary/80 font-medium">View all →</Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function RecentActivity() {
  const items = [
    { icon: ShoppingCart, color: "text-primary", text: "Order #1024 marked paid", time: "2m ago" },
    { icon: CheckCircle2, color: "text-emerald-400", text: "Payment verified for #1023", time: "8m ago" },
    { icon: Truck, color: "text-blue-400", text: "Order #1019 delivered", time: "24m ago" },
    { icon: LifeBuoy, color: "text-rose-400", text: "New ticket from Maria Lopez", time: "1h ago" },
    { icon: RefreshCw, color: "text-amber-400", text: "Subscription renewed for Hina Raza", time: "2h ago" },
  ];
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/15 last:border-0">
            <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center flex-shrink-0">
              <it.icon className={`h-4 w-4 ${it.color}`} />
            </div>
            <p className="flex-1 text-sm text-foreground/85 truncate">{it.text}</p>
            <span className="text-xs text-muted-foreground/60 flex-shrink-0">{it.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- ROLE -> DASHBOARD MAPPING ----------
function pickDashboard(roles: AppRole[]): { title: string; description: string; node: React.ReactNode } {
  if (roles.includes("admin")) return { title: "Founder Dashboard", description: "High-level metrics across the entire business", node: <FounderDashboard /> };
  if (roles.includes("operations_manager" as AppRole)) return { title: "Operations Dashboard", description: "Queue health, workload and system alerts", node: <OperationsDashboard /> };
  if (roles.includes("sales_rep")) return { title: "Sales Dashboard", description: "Leads, conversations and pending orders", node: <SalesDashboard /> };
  if (roles.includes("support_expert") || roles.includes("qa_reviewer" as AppRole)) return { title: "Support Dashboard", description: "Open tickets and unresolved issues", node: <SupportDashboard /> };
  if (roles.includes("payment_verifier" as AppRole) || roles.includes("accountant")) return { title: "Payments Dashboard", description: "Payment proofs and verification queue", node: <PaymentsDashboard /> };
  if (roles.includes("fulfillment_agent" as AppRole) || roles.includes("accounts_creator")) return { title: "Fulfillment Dashboard", description: "Orders ready for delivery and provisioning", node: <FulfillmentDashboard /> };
  if (roles.includes("renewal_agent" as AppRole) || roles.includes("client_relation_manager")) return { title: "Renewals Dashboard", description: "Expiring subscriptions and renewal pipeline", node: <RenewalsDashboard /> };
  return { title: "Dashboard", description: "Welcome to the management suite", node: <FounderDashboard /> };
}

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const { title, description, node } = pickDashboard(roles);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={`${greeting}${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={description}
        icon={<LayoutDashboard className="h-5 w-5 text-white" />}
      />
      <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground/60 mb-4">{title}</p>
      {node}
    </div>
  );
}
