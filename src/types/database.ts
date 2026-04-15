import type { Tables, Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;
export type OrderStatus = Enums<"order_status">;
export type PaymentStatus = Enums<"payment_status">;
export type AccountStatus = Enums<"account_status">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type TrustTag = Enums<"trust_tag">;
export type IssueStatus = Enums<"issue_status">;
export type ReminderResponse = Enums<"reminder_response">;
export type DurationType = Enums<"duration_type">;
export type FeedbackType = Enums<"feedback_type">;
export type TemplateCategory = Enums<"template_category">;

export type StaffProfile = Tables<"staff_profiles">;
export type UserRole = Tables<"user_roles">;
export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type WhatsAppAssignment = Tables<"whatsapp_assignments">;
export type Product = Tables<"products">;
export type ProductVariant = Tables<"product_variants">;
export type ProductDuration = Tables<"product_durations">;
export type MessageTemplate = Tables<"message_templates">;
export type Client = Tables<"clients">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderStatusHistory = Tables<"order_status_history">;
export type Payment = Tables<"payments">;
export type SoftwareAccount = Tables<"software_accounts">;
export type AccountAssignment = Tables<"account_assignments">;
export type ClientNote = Tables<"client_notes">;
export type ClientTransfer = Tables<"client_transfers">;
export type SupportIssue = Tables<"support_issues">;
export type Replacement = Tables<"replacements">;
export type Subscription = Tables<"subscriptions">;
export type Reminder = Tables<"reminders">;
export type Termination = Tables<"terminations">;
export type Feedback = Tables<"feedback">;
export type AuditLog = Tables<"audit_logs">;
export type Permission = Tables<"permissions">;

// WhatsApp types - manual definitions until types regenerate
export interface WaConversation {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  customer_whatsapp_id: string | null;
  client_id: string | null;
  assigned_agent_id: string | null;
  status: 'active' | 'waiting' | 'resolved' | 'archived';
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'system' | 'ai';
  sender_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  media_mime_type: string | null;
  media_filename: string | null;
  whatsapp_message_id: string | null;
  is_read: boolean;
  is_ai_generated: boolean;
  created_at: string;
}

export interface WaAgentConfig {
  id: string;
  agent_id: string;
  max_active_chats: number;
  max_unread_visible: number;
  daily_message_limit: number;
  messages_sent_today: number;
  last_reset_date: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaQueueItem {
  id: string;
  conversation_id: string;
  priority: number;
  reason: string | null;
  status: 'waiting' | 'assigned' | 'expired';
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
}

export interface WaAutoResponseLog {
  id: string;
  conversation_id: string;
  message_id: string | null;
  detected_intent: string | null;
  matched_product_id: string | null;
  confidence: 'high' | 'medium' | 'low';
  suggested_response: string | null;
  was_sent: boolean;
  agent_approved: boolean | null;
  created_at: string;
}
