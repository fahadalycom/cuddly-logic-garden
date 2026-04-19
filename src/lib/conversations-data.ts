// Adapters between real wa_conversations / wa_messages rows and the existing
// MockConversation / MockMessage UI shapes. Keeps the Conversations UI
// untouched while wiring it to the real WhatsApp transport backend.
import type {
  MockConversation, MockMessage, ConvChannel, ConvQueue, ConvStatus, ConvPriority,
} from "@/lib/conversations-mock";
import type { DeliveryStatus } from "@/lib/message-status";

export const REAL_ID_PREFIX = "wa:";

export const isRealConversationId = (id: string | null | undefined) =>
  !!id && id.startsWith(REAL_ID_PREFIX);

export const realToDbId = (id: string) =>
  id.startsWith(REAL_ID_PREFIX) ? id.slice(REAL_ID_PREFIX.length) : id;

export const dbToRealId = (id: string) => `${REAL_ID_PREFIX}${id}`;

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export interface WaConversationRow {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  channel: string | null;
  queue: string | null;
  status: string | null;
  priority: string | null;
  assigned_agent_id: string | null;
  previous_agent_id: string | null;
  reassignment_count: number | null;
  auto_summary: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  client_id: string | null;
  external_user_id?: string | null;
  external_conversation_id?: string | null;
  integration_id?: string | null;
}

export function mapWaConversation(row: WaConversationRow): MockConversation {
  const channel = ((row.channel as ConvChannel) ?? "whatsapp");
  const displayPhone = row.customer_phone?.includes(":")
    ? `${channel} user`
    : row.customer_phone;
  return {
    id: dbToRealId(row.id),
    customerName: row.customer_name || displayPhone || "Unknown",
    customerPhone: displayPhone,
    channel,
    queue: ((row.queue as ConvQueue) ?? "general"),
    status: ((row.status as ConvStatus) ?? "active"),
    priority: ((row.priority as ConvPriority) ?? "medium"),
    assignedAgent: row.assigned_agent_id,
    reassignmentCount: row.reassignment_count ?? 0,
    previousAgent: row.previous_agent_id ?? null,
    autoSummary: row.auto_summary ?? undefined,
    lastMessage: row.last_message_preview ?? "",
    lastTime: fmtAgo(row.last_message_at),
    unread: row.unread_count ?? 0,
    externalUserId: row.external_user_id ?? null,
    externalConversationId: row.external_conversation_id ?? null,
    integrationId: row.integration_id ?? null,
    context: {
      name: row.customer_name || displayPhone || "Unknown",
      phone: displayPhone,
      tags: [],
      status: "active",
      recentOrders: [],
      subscriptions: [],
      paymentStatus: "paid",
      openTickets: [],
    },
  };
}

export interface WaMessageRow {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string | null;
  media_type: string | null;
  delivery_status: string | null;
  direction: string | null;
  retry_count: number | null;
  error_message: string | null;
  created_at: string;
  idempotency_key: string | null;
}

export function mapWaMessage(row: WaMessageRow): MockMessage {
  const isAgent = row.sender_type === "agent" || row.sender_type === "ai";
  const isSystem = row.sender_type === "system";
  return {
    id: row.id,
    conversationId: dbToRealId(row.conversation_id),
    sender: isSystem ? "system" : isAgent ? "agent" : "customer",
    senderName: isSystem ? undefined : isAgent ? "You" : undefined,
    text: row.content ?? (row.media_type && row.media_type !== "text" ? `[${row.media_type}]` : ""),
    time: fmtTime(row.created_at),
    type: (row.media_type === "image" || row.media_type === "document"
      ? (row.media_type === "document" ? "file" : "image")
      : "text"),
    direction: (row.direction as "inbound" | "outbound") ?? (isAgent ? "outbound" : "inbound"),
    status: isAgent ? ((row.delivery_status as DeliveryStatus) ?? "delivered") : undefined,
    retryCount: row.retry_count ?? 0,
    errorMessage: row.error_message ?? undefined,
  };
}
