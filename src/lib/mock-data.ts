// Demo/mock data used to populate placeholder pages and role dashboards
// before the corresponding backend modules are wired up.

export const mockConversations = [
  { id: "c1", customer: "Ahmed Khan", channel: "WhatsApp", queue: "Sales", status: "active", agent: "Sara", lastMessage: "Yes I'll pay tomorrow", time: "2m" },
  { id: "c2", customer: "Maria Lopez", channel: "Instagram", queue: "Support", status: "waiting", agent: "—", lastMessage: "Account not working", time: "12m" },
  { id: "c3", customer: "John Doe", channel: "Facebook", queue: "Renewal", status: "active", agent: "Ali", lastMessage: "Send me renewal invoice", time: "28m" },
  { id: "c4", customer: "Hina Raza", channel: "WhatsApp", queue: "Payment", status: "resolved", agent: "Sara", lastMessage: "Done, thanks!", time: "1h" },
  { id: "c5", customer: "Vikram S.", channel: "WhatsApp", queue: "Sales", status: "active", agent: "Bilal", lastMessage: "Need ChatGPT plan info", time: "2h" },
];

export const mockLeads = [
  { id: "l1", name: "Faisal Ahmed", source: "WhatsApp", interest: "ChatGPT Pro", status: "interested", assigned: "Sara" },
  { id: "l2", name: "Sana Iqbal", source: "Instagram", interest: "Canva Pro", status: "follow_up", assigned: "Ali" },
  { id: "l3", name: "Daniyal R.", source: "Facebook", interest: "Netflix Family", status: "new", assigned: "—" },
  { id: "l4", name: "Mehwish K.", source: "Website", interest: "Spotify", status: "converted", assigned: "Bilal" },
];

export const mockCustomers = [
  { id: "cu1", name: "Ahmed Khan", phone: "+92 300 1234567", tags: ["VIP", "Repeat"], orders: 12, status: "active" },
  { id: "cu2", name: "Maria Lopez", phone: "+1 555 9032", tags: ["Risky"], orders: 2, status: "active" },
  { id: "cu3", name: "John Doe", phone: "+44 7700 900111", tags: ["Repeat"], orders: 5, status: "active" },
  { id: "cu4", name: "Vikram S.", phone: "+91 99876 12345", tags: [], orders: 1, status: "inactive" },
];

export const mockTickets = [
  { id: "t1", subject: "Account login failed", customer: "Maria Lopez", priority: "urgent", status: "open", assigned: "Hassan" },
  { id: "t2", subject: "Wrong plan delivered", customer: "Ahmed Khan", priority: "high", status: "in_progress", assigned: "Sara" },
  { id: "t3", subject: "Slow streaming", customer: "John Doe", priority: "medium", status: "open", assigned: "—" },
  { id: "t4", subject: "Refund request", customer: "Vikram S.", priority: "low", status: "resolved", assigned: "Bilal" },
];

export const mockTasks = [
  { id: "tk1", title: "Verify payment proof for Order #1024", related: "Order", priority: "high", status: "pending", due: "Today" },
  { id: "tk2", title: "Follow up with Sana Iqbal", related: "Lead", priority: "medium", status: "pending", due: "Tomorrow" },
  { id: "tk3", title: "Provision new Spotify accounts", related: "Provisioning", priority: "high", status: "in_progress", due: "Today" },
  { id: "tk4", title: "Resolve ticket #T2", related: "Ticket", priority: "urgent", status: "in_progress", due: "Today" },
];

export const mockToolRequests = [
  { id: "tr1", tool: "Midjourney Pro", demand: 14, status: "researching", category: "AI" },
  { id: "tr2", tool: "Adobe Creative Cloud", demand: 8, status: "new", category: "Design" },
  { id: "tr3", tool: "Notion AI", demand: 22, status: "approved", category: "Productivity" },
];

export const mockVendors = [
  { id: "v1", name: "GlobalSubs LLC", category: "Streaming", status: "active", deals: 4 },
  { id: "v2", name: "AI Tools Hub", category: "AI", status: "active", deals: 7 },
  { id: "v3", name: "DesignDeals", category: "Design", status: "negotiation", deals: 1 },
];

export const mockProvisioning = [
  { id: "p1", product: "ChatGPT Plus", email: "pool01@mail.com", capacity: 4, used: 3, status: "active", expiry: "12 days" },
  { id: "p2", product: "Netflix Family", email: "pool02@mail.com", capacity: 5, used: 5, status: "exhausted", expiry: "21 days" },
  { id: "p3", product: "Canva Pro", email: "pool03@mail.com", capacity: 5, used: 2, status: "active", expiry: "45 days" },
];

export const mockRenewals = [
  { id: "r1", customer: "Ahmed Khan", product: "ChatGPT Pro", expiresIn: "2 days", status: "pending", amount: 1500 },
  { id: "r2", customer: "John Doe", product: "Netflix Family", expiresIn: "4 days", status: "pending", amount: 800 },
  { id: "r3", customer: "Hina Raza", product: "Canva Pro", expiresIn: "5 days", status: "pending", amount: 600 },
];

export const mockTeam = [
  { id: "u1", name: "Sara Ahmed", role: "Sales Agent", department: "Sales", status: "active", chats: 3 },
  { id: "u2", name: "Hassan Ali", role: "Support Agent", department: "Support", status: "active", chats: 5 },
  { id: "u3", name: "Bilal Khan", role: "Renewal Agent", department: "Renewals", status: "on_break", chats: 0 },
  { id: "u4", name: "Ali Raza", role: "Payment Verifier", department: "Payments", status: "active", chats: 2 },
  { id: "u5", name: "Zara Iqbal", role: "Fulfillment Agent", department: "Fulfillment", status: "offline", chats: 0 },
];
