// Mock data for the unified Conversations inbox foundation.
// Replace with real Supabase queries in a later step.

export type ConvChannel = "whatsapp" | "facebook" | "instagram" | "email" | "web";
export type ConvStatus = "new" | "active" | "waiting_customer" | "waiting_internal" | "resolved" | "closed";
export type ConvQueue = "sales" | "support" | "payments" | "renewals" | "general";
export type ConvPriority = "low" | "medium" | "high" | "urgent";

export interface MockMessage {
  id: string;
  conversationId: string;
  sender: "customer" | "agent" | "system";
  senderName?: string;
  text: string;
  time: string; // display time
  type?: "text" | "image" | "file";
}

export interface MockInternalNote {
  id: string;
  conversationId: string;
  author: string;
  content: string;
  time: string;
}

export interface MockCustomerContext {
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  status: "active" | "inactive" | "blocked";
  recentOrders: { id: string; product: string; amount: number; status: string; date: string }[];
  subscriptions: { id: string; product: string; status: string; expires: string }[];
  paymentStatus: "paid" | "pending" | "overdue";
  openTickets: { id: string; subject: string; priority: ConvPriority }[];
}

export interface MockConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  channel: ConvChannel;
  queue: ConvQueue;
  status: ConvStatus;
  priority: ConvPriority;
  assignedAgent: string | null;
  assignmentType?: "auto" | "manual" | "sticky" | "overflow" | "failover" | "escalation";
  reassignmentCount?: number;
  previousAgent?: string | null;
  autoSummary?: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  context: MockCustomerContext;
}

export const mockConversationsList: MockConversation[] = [
  {
    id: "conv_1",
    customerName: "Ahmed Khan",
    customerPhone: "+92 300 1234567",
    channel: "whatsapp",
    queue: "sales",
    status: "active",
    priority: "high",
    assignedAgent: "Sara Ahmed",
    assignmentType: "auto",
    lastMessage: "Yes I'll pay tomorrow morning",
    lastTime: "2m",
    unread: 2,
    context: {
      name: "Ahmed Khan",
      phone: "+92 300 1234567",
      email: "ahmed@example.com",
      tags: ["VIP", "Repeat"],
      status: "active",
      recentOrders: [
        { id: "ORD-1024", product: "ChatGPT Plus (3m)", amount: 4500, status: "paid_verified", date: "2d ago" },
        { id: "ORD-0998", product: "Canva Pro (1y)", amount: 2400, status: "delivered", date: "1mo ago" },
      ],
      subscriptions: [
        { id: "sub_1", product: "ChatGPT Plus", status: "active", expires: "in 28 days" },
        { id: "sub_2", product: "Canva Pro", status: "active", expires: "in 11mo" },
      ],
      paymentStatus: "pending",
      openTickets: [],
    },
  },
  {
    id: "conv_2",
    customerName: "Maria Lopez",
    customerPhone: "+1 555 9032",
    channel: "instagram",
    queue: "support",
    status: "waiting_internal",
    priority: "urgent",
    assignedAgent: "Hassan Ali",
    assignmentType: "failover",
    reassignmentCount: 2,
    previousAgent: "Bilal Raza",
    autoSummary: "Customer reported login failure on Netflix Family. Previous agent went offline before replying.",
    lastMessage: "Account login is still failing",
    lastTime: "12m",
    unread: 4,
    context: {
      name: "Maria Lopez",
      phone: "+1 555 9032",
      tags: ["Risky"],
      status: "active",
      recentOrders: [{ id: "ORD-1011", product: "Netflix Family (1m)", amount: 800, status: "delivered", date: "5d ago" }],
      subscriptions: [{ id: "sub_3", product: "Netflix Family", status: "active", expires: "in 25 days" }],
      paymentStatus: "paid",
      openTickets: [{ id: "T-21", subject: "Account login failed", priority: "urgent" }],
    },
  },
  {
    id: "conv_3",
    customerName: "John Doe",
    customerPhone: "+44 7700 900111",
    channel: "facebook",
    queue: "renewals",
    status: "new",
    priority: "medium",
    assignedAgent: null,
    lastMessage: "Send me renewal invoice please",
    lastTime: "28m",
    unread: 1,
    context: {
      name: "John Doe",
      phone: "+44 7700 900111",
      email: "john@example.com",
      tags: ["Repeat"],
      status: "active",
      recentOrders: [{ id: "ORD-0876", product: "Spotify Family (1y)", amount: 3200, status: "delivered", date: "11mo ago" }],
      subscriptions: [{ id: "sub_4", product: "Spotify Family", status: "expiring", expires: "in 4 days" }],
      paymentStatus: "pending",
      openTickets: [],
    },
  },
  {
    id: "conv_4",
    customerName: "Hina Raza",
    customerPhone: "+92 333 9988776",
    channel: "whatsapp",
    queue: "payments",
    status: "resolved",
    priority: "low",
    assignedAgent: "Ali Raza",
    lastMessage: "Done, thanks!",
    lastTime: "1h",
    unread: 0,
    context: {
      name: "Hina Raza",
      phone: "+92 333 9988776",
      tags: [],
      status: "active",
      recentOrders: [{ id: "ORD-1020", product: "Canva Pro (3m)", amount: 1500, status: "paid_verified", date: "1h ago" }],
      subscriptions: [{ id: "sub_5", product: "Canva Pro", status: "active", expires: "in 89 days" }],
      paymentStatus: "paid",
      openTickets: [],
    },
  },
  {
    id: "conv_5",
    customerName: "Vikram S.",
    customerPhone: "+91 99876 12345",
    channel: "whatsapp",
    queue: "sales",
    status: "waiting_customer",
    priority: "medium",
    assignedAgent: "Bilal Khan",
    assignmentType: "auto",
    lastMessage: "Sent the ChatGPT Pro pricing",
    lastTime: "2h",
    unread: 0,
    context: {
      name: "Vikram S.",
      phone: "+91 99876 12345",
      tags: [],
      status: "active",
      recentOrders: [],
      subscriptions: [],
      paymentStatus: "pending",
      openTickets: [],
    },
  },
  {
    id: "conv_6",
    customerName: "Sana Iqbal",
    customerPhone: "+92 311 5544332",
    channel: "instagram",
    queue: "sales",
    status: "active",
    priority: "high",
    assignedAgent: "Sara Ahmed",
    assignmentType: "manual",
    lastMessage: "Can I get a discount on yearly plan?",
    lastTime: "3h",
    unread: 1,
    context: {
      name: "Sana Iqbal",
      phone: "+92 311 5544332",
      tags: ["Repeat"],
      status: "active",
      recentOrders: [{ id: "ORD-0991", product: "Canva Pro (1m)", amount: 600, status: "delivered", date: "2mo ago" }],
      subscriptions: [],
      paymentStatus: "paid",
      openTickets: [],
    },
  },
  {
    id: "conv_7",
    customerName: "Daniyal R.",
    customerPhone: "+92 345 1122334",
    channel: "facebook",
    queue: "general",
    status: "new",
    priority: "low",
    assignedAgent: null,
    lastMessage: "Hi, do you offer Netflix?",
    lastTime: "5h",
    unread: 1,
    context: {
      name: "Daniyal R.",
      phone: "+92 345 1122334",
      tags: [],
      status: "active",
      recentOrders: [],
      subscriptions: [],
      paymentStatus: "paid",
      openTickets: [],
    },
  },
  {
    id: "conv_8",
    customerName: "Mehwish K.",
    customerPhone: "+92 321 7766554",
    channel: "whatsapp",
    queue: "support",
    status: "closed",
    priority: "low",
    assignedAgent: "Hassan Ali",
    lastMessage: "Issue resolved, ticket closed.",
    lastTime: "1d",
    unread: 0,
    context: {
      name: "Mehwish K.",
      phone: "+92 321 7766554",
      tags: ["Repeat"],
      status: "active",
      recentOrders: [{ id: "ORD-0950", product: "Spotify (1m)", amount: 400, status: "delivered", date: "1mo ago" }],
      subscriptions: [{ id: "sub_8", product: "Spotify", status: "active", expires: "in 6 days" }],
      paymentStatus: "paid",
      openTickets: [],
    },
  },
  {
    id: "conv_9",
    customerName: "Fatima Noor",
    customerPhone: "+92 302 4455667",
    channel: "whatsapp",
    queue: "sales",
    status: "new",
    priority: "medium",
    assignedAgent: null,
    lastMessage: "What's the price for ChatGPT Plus 6 months?",
    lastTime: "8m",
    unread: 1,
    context: {
      name: "Fatima Noor", phone: "+92 302 4455667", tags: ["New"], status: "active",
      recentOrders: [], subscriptions: [], paymentStatus: "pending", openTickets: [],
    },
  },
  {
    id: "conv_10",
    customerName: "Omar Siddiqui",
    customerPhone: "+971 50 1122334",
    channel: "whatsapp",
    queue: "support",
    status: "active",
    priority: "urgent",
    assignedAgent: "Hassan Ali",
    assignmentType: "manual",
    lastMessage: "This is the third time my account got locked!",
    lastTime: "15m",
    unread: 3,
    context: {
      name: "Omar Siddiqui", phone: "+971 50 1122334", email: "omar@example.com",
      tags: ["VIP", "Complaint"], status: "active",
      recentOrders: [{ id: "ORD-1031", product: "Netflix Premium (3m)", amount: 3600, status: "delivered", date: "10d ago" }],
      subscriptions: [{ id: "sub_10", product: "Netflix Premium", status: "active", expires: "in 80 days" }],
      paymentStatus: "paid",
      openTickets: [{ id: "T-44", subject: "Recurring account lockout", priority: "urgent" }],
    },
  },
  {
    id: "conv_11",
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    channel: "instagram",
    queue: "payments",
    status: "waiting_internal",
    priority: "high",
    assignedAgent: "Ali Raza",
    assignmentType: "auto",
    lastMessage: "I sent the bank transfer 2 hours ago, please verify",
    lastTime: "22m",
    unread: 2,
    context: {
      name: "Priya Sharma", phone: "+91 98765 43210", tags: ["Repeat"], status: "active",
      recentOrders: [{ id: "ORD-1040", product: "Canva Pro Team (1y)", amount: 8400, status: "pending_payment", date: "today" }],
      subscriptions: [], paymentStatus: "pending", openTickets: [],
    },
  },
  {
    id: "conv_12",
    customerName: "Zaid Malik",
    customerPhone: "+92 308 9876543",
    channel: "whatsapp",
    queue: "renewals",
    status: "active",
    priority: "medium",
    assignedAgent: "Sara Ahmed",
    assignmentType: "sticky",
    lastMessage: "Yes please renew it for another year",
    lastTime: "35m",
    unread: 1,
    context: {
      name: "Zaid Malik", phone: "+92 308 9876543", email: "zaid@example.com",
      tags: ["Repeat", "Loyal"], status: "active",
      recentOrders: [{ id: "ORD-0876", product: "Spotify Family (1y)", amount: 3200, status: "delivered", date: "11mo ago" }],
      subscriptions: [{ id: "sub_12", product: "Spotify Family", status: "expiring", expires: "in 3 days" }],
      paymentStatus: "pending", openTickets: [],
    },
  },
  {
    id: "conv_13",
    customerName: "Ayesha Tariq",
    customerPhone: "+92 333 1234567",
    channel: "facebook",
    queue: "sales",
    status: "waiting_customer",
    priority: "low",
    assignedAgent: "Bilal Khan",
    assignmentType: "auto",
    lastMessage: "Sent you the bundle pricing — let me know!",
    lastTime: "45m",
    unread: 0,
    context: {
      name: "Ayesha Tariq", phone: "+92 333 1234567", tags: ["New"], status: "active",
      recentOrders: [], subscriptions: [], paymentStatus: "pending", openTickets: [],
    },
  },
  {
    id: "conv_14",
    customerName: "Rohan Patel",
    customerPhone: "+91 80 5544 3322",
    channel: "email",
    queue: "support",
    status: "active",
    priority: "high",
    assignedAgent: "Hassan Ali",
    assignmentType: "manual",
    lastMessage: "Canva isn't loading on my Mac at all",
    lastTime: "1h",
    unread: 1,
    context: {
      name: "Rohan Patel", phone: "+91 80 5544 3322", email: "rohan@example.com",
      tags: ["Repeat"], status: "active",
      recentOrders: [{ id: "ORD-1015", product: "Canva Pro (1y)", amount: 2400, status: "delivered", date: "2mo ago" }],
      subscriptions: [{ id: "sub_14", product: "Canva Pro", status: "active", expires: "in 10mo" }],
      paymentStatus: "paid", openTickets: [],
    },
  },
  {
    id: "conv_15",
    customerName: "Bilal Hussain",
    customerPhone: "+92 321 5556677",
    channel: "whatsapp",
    queue: "payments",
    status: "resolved",
    priority: "low",
    assignedAgent: "Ali Raza",
    lastMessage: "Payment confirmed and account activated. Enjoy!",
    lastTime: "2h",
    unread: 0,
    context: {
      name: "Bilal Hussain", phone: "+92 321 5556677", tags: [], status: "active",
      recentOrders: [{ id: "ORD-1042", product: "ChatGPT Plus (1m)", amount: 1500, status: "paid_verified", date: "2h ago" }],
      subscriptions: [{ id: "sub_15", product: "ChatGPT Plus", status: "active", expires: "in 30 days" }],
      paymentStatus: "paid", openTickets: [],
    },
  },
  {
    id: "conv_16",
    customerName: "Sadia Khan",
    customerPhone: "+92 345 7788990",
    channel: "instagram",
    queue: "general",
    status: "new",
    priority: "low",
    assignedAgent: null,
    lastMessage: "Do you accept JazzCash?",
    lastTime: "3h",
    unread: 1,
    context: {
      name: "Sadia Khan", phone: "+92 345 7788990", tags: [], status: "active",
      recentOrders: [], subscriptions: [], paymentStatus: "paid", openTickets: [],
    },
  },
  {
    id: "conv_17",
    customerName: "Imran Qureshi",
    customerPhone: "+92 300 9988776",
    channel: "whatsapp",
    queue: "support",
    status: "waiting_internal",
    priority: "urgent",
    assignedAgent: "Hassan Ali",
    assignmentType: "escalation",
    reassignmentCount: 1,
    previousAgent: "Bilal Raza",
    autoSummary: "Customer charged twice for same renewal — needs refund + apology.",
    lastMessage: "I want a refund AND an explanation",
    lastTime: "4h",
    unread: 5,
    context: {
      name: "Imran Qureshi", phone: "+92 300 9988776", email: "imran@example.com",
      tags: ["VIP", "Complaint", "Refund"], status: "active",
      recentOrders: [
        { id: "ORD-1050", product: "Netflix Family (1m)", amount: 800, status: "paid_verified", date: "5d ago" },
        { id: "ORD-1051", product: "Netflix Family (1m)", amount: 800, status: "paid_verified", date: "5d ago" },
      ],
      subscriptions: [{ id: "sub_17", product: "Netflix Family", status: "active", expires: "in 25 days" }],
      paymentStatus: "paid",
      openTickets: [{ id: "T-55", subject: "Duplicate charge refund", priority: "urgent" }],
    },
  },
  {
    id: "conv_18",
    customerName: "Nadia Iqbal",
    customerPhone: "+92 311 2223344",
    channel: "web",
    queue: "renewals",
    status: "closed",
    priority: "low",
    assignedAgent: "Sara Ahmed",
    lastMessage: "Renewed for 1 year. Thank you!",
    lastTime: "1d",
    unread: 0,
    context: {
      name: "Nadia Iqbal", phone: "+92 311 2223344", tags: ["Loyal"], status: "active",
      recentOrders: [{ id: "ORD-1055", product: "Canva Pro (1y)", amount: 2400, status: "paid_verified", date: "1d ago" }],
      subscriptions: [{ id: "sub_18", product: "Canva Pro", status: "active", expires: "in 364 days" }],
      paymentStatus: "paid", openTickets: [],
    },
  },
];

export const mockMessagesByConv: Record<string, MockMessage[]> = {
  conv_1: [
    { id: "m1", conversationId: "conv_1", sender: "customer", senderName: "Ahmed", text: "Hi, I want to renew my ChatGPT plan", time: "10:12" },
    { id: "m2", conversationId: "conv_1", sender: "agent", senderName: "Sara", text: "Sure! Your current plan expires in 2 days. Want 3 months again?", time: "10:14" },
    { id: "m3", conversationId: "conv_1", sender: "customer", senderName: "Ahmed", text: "Yes please send invoice", time: "10:15" },
    { id: "m4", conversationId: "conv_1", sender: "agent", senderName: "Sara", text: "Sent. Total: PKR 4,500. Bank or Easypaisa?", time: "10:16" },
    { id: "m5", conversationId: "conv_1", sender: "customer", senderName: "Ahmed", text: "Easypaisa. Yes I'll pay tomorrow morning", time: "10:18" },
  ],
  conv_2: [
    { id: "m1", conversationId: "conv_2", sender: "customer", senderName: "Maria", text: "Netflix login isn't working", time: "09:02" },
    { id: "m2", conversationId: "conv_2", sender: "agent", senderName: "Hassan", text: "Let me check the account, one moment", time: "09:05" },
    { id: "m3", conversationId: "conv_2", sender: "system", text: "Ticket T-21 created and linked", time: "09:06" },
    { id: "m4", conversationId: "conv_2", sender: "customer", senderName: "Maria", text: "Account login is still failing", time: "09:20" },
  ],
  conv_3: [
    { id: "m1", conversationId: "conv_3", sender: "customer", senderName: "John", text: "Send me renewal invoice please", time: "08:40" },
  ],
  conv_4: [
    { id: "m1", conversationId: "conv_4", sender: "customer", senderName: "Hina", text: "Payment proof attached", time: "07:30", type: "image" },
    { id: "m2", conversationId: "conv_4", sender: "agent", senderName: "Ali", text: "Verified, thank you!", time: "07:35" },
    { id: "m3", conversationId: "conv_4", sender: "customer", senderName: "Hina", text: "Done, thanks!", time: "07:36" },
  ],
  conv_5: [
    { id: "m1", conversationId: "conv_5", sender: "customer", senderName: "Vikram", text: "Need ChatGPT Pro plan info", time: "Yesterday" },
    { id: "m2", conversationId: "conv_5", sender: "agent", senderName: "Bilal", text: "Sent the ChatGPT Pro pricing", time: "Yesterday" },
  ],
  conv_6: [
    { id: "m1", conversationId: "conv_6", sender: "customer", senderName: "Sana", text: "Can I get a discount on yearly plan?", time: "06:10" },
  ],
  conv_7: [
    { id: "m1", conversationId: "conv_7", sender: "customer", senderName: "Daniyal", text: "Hi, do you offer Netflix?", time: "04:00" },
  ],
  conv_8: [
    { id: "m1", conversationId: "conv_8", sender: "agent", senderName: "Hassan", text: "Issue resolved, ticket closed.", time: "Yesterday" },
  ],
};

export const mockNotesByConv: Record<string, MockInternalNote[]> = {
  conv_1: [
    { id: "n1", conversationId: "conv_1", author: "Sara", content: "VIP customer — prioritize renewal.", time: "10:20" },
  ],
  conv_2: [
    { id: "n1", conversationId: "conv_2", author: "Hassan", content: "Possible shared-account collision. Check pool 02.", time: "09:10" },
  ],
};
