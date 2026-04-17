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
  assignmentType?: "auto" | "manual" | "sticky" | "overflow";
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
