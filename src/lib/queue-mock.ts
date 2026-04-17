// Queue management & agent capacity mock data.
// Replace with real Supabase queries (wa_agent_config, wa_queue, wa_conversations) later.

import type { ConvQueue, ConvPriority, ConvChannel } from "./conversations-mock";

export type AgentStatus = "available" | "busy" | "at_capacity" | "offline";

export interface AgentCapacity {
  id: string;
  name: string;
  avatarColor: string; // tailwind class
  department: ConvQueue;
  status: AgentStatus;
  maxActive: number;
  maxQueue: number;
  active: number;
  queued: number;
}

export interface QueueItem {
  id: string;
  conversationId: string;
  customerName: string;
  channel: ConvChannel;
  queueType: ConvQueue | "overflow";
  priority: ConvPriority;
  waitedMinutes: number;
  preview: string;
  targetAgentId?: string | null;
}

export const mockAgents: AgentCapacity[] = [
  { id: "a1", name: "Sara Ahmed", avatarColor: "bg-amber-500/20 text-amber-500", department: "sales", status: "busy", maxActive: 5, maxQueue: 10, active: 4, queued: 6 },
  { id: "a2", name: "Hassan Ali", avatarColor: "bg-blue-500/20 text-blue-500", department: "support", status: "at_capacity", maxActive: 4, maxQueue: 10, active: 4, queued: 10 },
  { id: "a3", name: "Bilal Khan", avatarColor: "bg-emerald-500/20 text-emerald-500", department: "sales", status: "available", maxActive: 5, maxQueue: 10, active: 2, queued: 1 },
  { id: "a4", name: "Ali Raza", avatarColor: "bg-violet-500/20 text-violet-500", department: "payments", status: "available", maxActive: 4, maxQueue: 10, active: 1, queued: 0 },
  { id: "a5", name: "Mehak J.", avatarColor: "bg-pink-500/20 text-pink-500", department: "renewals", status: "offline", maxActive: 4, maxQueue: 10, active: 0, queued: 0 },
];

export const mockQueueItems: QueueItem[] = [
  { id: "q1", conversationId: "conv_3", customerName: "John Doe", channel: "facebook", queueType: "renewals", priority: "medium", waitedMinutes: 28, preview: "Send me renewal invoice please" },
  { id: "q2", conversationId: "conv_7", customerName: "Daniyal R.", channel: "facebook", queueType: "overflow", priority: "low", waitedMinutes: 145, preview: "Hi, do you offer Netflix?" },
  { id: "q3", conversationId: "qov_1", customerName: "Rabia Y.", channel: "whatsapp", queueType: "overflow", priority: "high", waitedMinutes: 12, preview: "Need urgent help with Spotify family" },
  { id: "q4", conversationId: "qov_2", customerName: "Imran S.", channel: "whatsapp", queueType: "overflow", priority: "urgent", waitedMinutes: 4, preview: "Payment failed twice, please verify" },
  { id: "q5", conversationId: "qov_3", customerName: "Komal A.", channel: "instagram", queueType: "support", priority: "medium", waitedMinutes: 18, preview: "Canva login issue" },
  { id: "q6", conversationId: "qov_4", customerName: "Fahad N.", channel: "whatsapp", queueType: "sales", priority: "low", waitedMinutes: 33, preview: "Pricing for ChatGPT yearly?" },
];

export function statusMeta(s: AgentStatus) {
  switch (s) {
    case "available": return { label: "Available", dot: "bg-emerald-500", text: "text-emerald-500" };
    case "busy": return { label: "Busy", dot: "bg-amber-500", text: "text-amber-500" };
    case "at_capacity": return { label: "At capacity", dot: "bg-destructive", text: "text-destructive" };
    case "offline": return { label: "Offline", dot: "bg-muted-foreground/40", text: "text-muted-foreground" };
  }
}

export function loadLevel(active: number, max: number): "ok" | "warn" | "full" {
  const pct = max === 0 ? 0 : active / max;
  if (pct >= 1) return "full";
  if (pct >= 0.75) return "warn";
  return "ok";
}

export function loadColor(level: "ok" | "warn" | "full") {
  if (level === "full") return "text-destructive";
  if (level === "warn") return "text-amber-500";
  return "text-emerald-500";
}

export function loadBg(level: "ok" | "warn" | "full") {
  if (level === "full") return "bg-destructive";
  if (level === "warn") return "bg-amber-500";
  return "bg-emerald-500";
}
