export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_assignments: {
        Row: {
          account_id: string
          assigned_at: string
          assigned_by: string
          client_id: string
          id: string
          order_item_id: string | null
          revoked_at: string | null
        }
        Insert: {
          account_id: string
          assigned_at?: string
          assigned_by: string
          client_id: string
          id?: string
          order_item_id?: string | null
          revoked_at?: string | null
        }
        Update: {
          account_id?: string
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          id?: string
          order_item_id?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "software_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignments_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          author_id: string
          client_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          client_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          client_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_transfers: {
        Row: {
          client_id: string
          created_at: string
          from_team_id: string | null
          id: string
          reason: string | null
          to_team_id: string | null
          transferred_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          from_team_id?: string | null
          id?: string
          reason?: string | null
          to_team_id?: string | null
          transferred_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          from_team_id?: string | null
          id?: string
          reason?: string | null
          to_team_id?: string | null
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_transfers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_transfers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_transfers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_team_id: string | null
          created_at: string
          email: string | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          tags: string[]
          trust_tag: Database["public"]["Enums"]["trust_tag"]
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          assigned_team_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[]
          trust_tag?: Database["public"]["Enums"]["trust_tag"]
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          assigned_team_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[]
          trust_tag?: Database["public"]["Enums"]["trust_tag"]
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          client_id: string
          collected_by: string | null
          content: string | null
          created_at: string
          id: string
          rating: number | null
          type: Database["public"]["Enums"]["feedback_type"]
        }
        Insert: {
          client_id: string
          collected_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          type?: Database["public"]["Enums"]["feedback_type"]
        }
        Update: {
          client_id?: string
          collected_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          type?: Database["public"]["Enums"]["feedback_type"]
        }
        Relationships: [
          {
            foreignKeyName: "feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          converted_client_id: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          interest: string | null
          name: string
          notes: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          interest?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          interest?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body: string
          category: Database["public"]["Enums"]["template_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          discount: number
          duration_type: Database["public"]["Enums"]["duration_type"] | null
          duration_value: number | null
          id: string
          line_total: number
          order_id: string
          product_id: string
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          duration_type?: Database["public"]["Enums"]["duration_type"] | null
          duration_value?: number | null
          id?: string
          line_total?: number
          order_id: string
          product_id: string
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          duration_type?: Database["public"]["Enums"]["duration_type"] | null
          duration_value?: number | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          discount_amount: number
          id: string
          is_archived: boolean
          notes: string | null
          paid_amount: number
          remaining_due: number
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          discount_amount?: number
          id?: string
          is_archived?: boolean
          notes?: string | null
          paid_amount?: number
          remaining_due?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          discount_amount?: number
          id?: string
          is_archived?: boolean
          notes?: string | null
          paid_amount?: number
          remaining_due?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          order_id: string
          proof_url: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          order_id: string
          proof_url?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          order_id?: string
          proof_url?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          max_users: number
          name: string
          price: number
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          max_users?: number
          name: string
          price?: number
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          max_users?: number
          name?: string
          price?: number
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_durations: {
        Row: {
          created_at: string
          duration_type: Database["public"]["Enums"]["duration_type"]
          duration_value: number
          id: string
          is_active: boolean
          price_multiplier: number
          product_id: string
        }
        Insert: {
          created_at?: string
          duration_type: Database["public"]["Enums"]["duration_type"]
          duration_value?: number
          id?: string
          is_active?: boolean
          price_multiplier?: number
          product_id: string
        }
        Update: {
          created_at?: string
          duration_type?: Database["public"]["Enums"]["duration_type"]
          duration_value?: number
          id?: string
          is_active?: boolean
          price_multiplier?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_durations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_discount_fixed: number | null
          max_discount_percent: number | null
          name: string
          price: number
          product_id: string
          sharing_standard: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_discount_fixed?: number | null
          max_discount_percent?: number | null
          name: string
          price?: number
          product_id: string
          sharing_standard?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_discount_fixed?: number | null
          max_discount_percent?: number | null
          name?: string
          price?: number
          product_id?: string
          sharing_standard?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category: string | null
          created_at: string
          description: string | null
          faq_content: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          category?: string | null
          created_at?: string
          description?: string | null
          faq_content?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string
          description?: string | null
          faq_content?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          client_id: string
          created_at: string
          deferred_to: string | null
          id: string
          notes: string | null
          reminder_number: number
          response: Database["public"]["Enums"]["reminder_response"]
          scheduled_date: string
          sent_at: string | null
          sent_by: string | null
          subscription_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deferred_to?: string | null
          id?: string
          notes?: string | null
          reminder_number?: number
          response?: Database["public"]["Enums"]["reminder_response"]
          scheduled_date: string
          sent_at?: string | null
          sent_by?: string | null
          subscription_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deferred_to?: string | null
          id?: string
          notes?: string | null
          reminder_number?: number
          response?: Database["public"]["Enums"]["reminder_response"]
          scheduled_date?: string
          sent_at?: string | null
          sent_by?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      replacements: {
        Row: {
          approved_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          issue_id: string
          new_account_id: string | null
          notes: string | null
          old_account_id: string | null
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          issue_id: string
          new_account_id?: string | null
          notes?: string | null
          old_account_id?: string | null
        }
        Update: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          issue_id?: string
          new_account_id?: string | null
          notes?: string | null
          old_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replacements_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "support_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replacements_new_account_id_fkey"
            columns: ["new_account_id"]
            isOneToOne: false
            referencedRelation: "software_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replacements_old_account_id_fkey"
            columns: ["old_account_id"]
            isOneToOne: false
            referencedRelation: "software_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      software_accounts: {
        Row: {
          capacity: number
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          login_instructions: string | null
          notes: string | null
          password_encrypted: string | null
          product_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          used_seats: number
          username: string | null
          variant_id: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean
          login_instructions?: string | null
          notes?: string | null
          password_encrypted?: string | null
          product_id: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          used_seats?: number
          username?: string | null
          variant_id?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          login_instructions?: string | null
          notes?: string | null
          password_encrypted?: string | null
          product_id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          used_seats?: number
          username?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "software_accounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "software_accounts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          availability_status: Database["public"]["Enums"]["staff_availability"]
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          max_active_chats: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["staff_availability"]
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          max_active_chats?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["staff_availability"]
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          max_active_chats?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          client_id: string
          created_at: string
          end_date: string
          id: string
          order_item_id: string | null
          product_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date: string
          id?: string
          order_item_id?: string | null
          product_id: string
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string
          id?: string
          order_item_id?: string | null
          product_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_issues: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          client_id: string
          conversation_id: string | null
          created_at: string
          description: string
          id: string
          order_item_id: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          resolution_notes: string | null
          status: Database["public"]["Enums"]["issue_status"]
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          client_id: string
          conversation_id?: string | null
          created_at?: string
          description: string
          id?: string
          order_item_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          client_id?: string
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          order_item_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_issues_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "software_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_issues_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_issues_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_secret: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          related_id: string | null
          related_type: Database["public"]["Enums"]["task_related_type"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          related_id?: string | null
          related_type?: Database["public"]["Enums"]["task_related_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          related_id?: string | null
          related_type?: Database["public"]["Enums"]["task_related_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          staff_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          whatsapp_numbers: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          whatsapp_numbers?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          whatsapp_numbers?: string[] | null
        }
        Relationships: []
      }
      terminations: {
        Row: {
          access_removed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          notes: string | null
          password_changed: boolean
          reason: string | null
          subscription_id: string
        }
        Insert: {
          access_removed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          password_changed?: boolean
          reason?: string | null
          subscription_id: string
        }
        Update: {
          access_removed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          password_changed?: boolean
          reason?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_requests: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          demand_count: number
          description: string | null
          id: string
          notes: string | null
          requested_by_client_id: string | null
          requested_by_user_id: string | null
          status: Database["public"]["Enums"]["tool_request_status"]
          tool_name: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          demand_count?: number
          description?: string | null
          id?: string
          notes?: string | null
          requested_by_client_id?: string | null
          requested_by_user_id?: string | null
          status?: Database["public"]["Enums"]["tool_request_status"]
          tool_name: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          demand_count?: number
          description?: string | null
          id?: string
          notes?: string | null
          requested_by_client_id?: string | null
          requested_by_user_id?: string | null
          status?: Database["public"]["Enums"]["tool_request_status"]
          tool_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_requests_requested_by_client_id_fkey"
            columns: ["requested_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_deals: {
        Row: {
          coupon_code: string | null
          created_at: string
          created_by: string
          description: string | null
          discount_details: string | null
          expires_at: string | null
          id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discount_details?: string | null
          expires_at?: string | null
          id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discount_details?: string | null
          expires_at?: string | null
          id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_deals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_url: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
        }
        Relationships: []
      }
      wa_agent_config: {
        Row: {
          agent_id: string
          created_at: string
          current_active_count: number
          current_queue_count: number
          daily_message_limit: number
          id: string
          is_available: boolean
          last_reset_date: string
          max_active_chats: number
          max_queue_limit: number
          max_unread_visible: number
          messages_sent_today: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          current_active_count?: number
          current_queue_count?: number
          daily_message_limit?: number
          id?: string
          is_available?: boolean
          last_reset_date?: string
          max_active_chats?: number
          max_queue_limit?: number
          max_unread_visible?: number
          messages_sent_today?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          current_active_count?: number
          current_queue_count?: number
          daily_message_limit?: number
          id?: string
          is_available?: boolean
          last_reset_date?: string
          max_active_chats?: number
          max_queue_limit?: number
          max_unread_visible?: number
          messages_sent_today?: number
          updated_at?: string
        }
        Relationships: []
      }
      wa_assignment_log: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          assignment_type: string
          conversation_id: string
          created_at: string
          id: string
          placement: string
          queue_type: string | null
          reason: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_type?: string
          conversation_id: string
          created_at?: string
          id?: string
          placement?: string
          queue_type?: string | null
          reason?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_type?: string
          conversation_id?: string
          created_at?: string
          id?: string
          placement?: string
          queue_type?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      wa_auto_response_log: {
        Row: {
          agent_approved: boolean | null
          confidence: Database["public"]["Enums"]["wa_ai_confidence"]
          conversation_id: string
          created_at: string
          detected_intent: string | null
          id: string
          matched_product_id: string | null
          message_id: string | null
          suggested_response: string | null
          was_sent: boolean
        }
        Insert: {
          agent_approved?: boolean | null
          confidence?: Database["public"]["Enums"]["wa_ai_confidence"]
          conversation_id: string
          created_at?: string
          detected_intent?: string | null
          id?: string
          matched_product_id?: string | null
          message_id?: string | null
          suggested_response?: string | null
          was_sent?: boolean
        }
        Update: {
          agent_approved?: boolean | null
          confidence?: Database["public"]["Enums"]["wa_ai_confidence"]
          conversation_id?: string
          created_at?: string
          detected_intent?: string | null
          id?: string
          matched_product_id?: string | null
          message_id?: string | null
          suggested_response?: string | null
          was_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "wa_auto_response_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_auto_response_log_matched_product_id_fkey"
            columns: ["matched_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_auto_response_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "wa_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversation_tags: {
        Row: {
          color: string
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          tag: string
        }
        Insert: {
          color?: string
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          tag: string
        }
        Update: {
          color?: string
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversation_tags_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversations: {
        Row: {
          assigned_agent_id: string | null
          assigned_at: string | null
          auto_summary: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          client_id: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string
          customer_whatsapp_id: string | null
          id: string
          last_agent_reply_at: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lock_until: string | null
          previous_agent_id: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          queue: Database["public"]["Enums"]["conversation_queue"]
          reassignment_count: number
          status: Database["public"]["Enums"]["wa_conversation_status"]
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          assigned_at?: string | null
          auto_summary?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          client_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          customer_whatsapp_id?: string | null
          id?: string
          last_agent_reply_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lock_until?: string | null
          previous_agent_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          queue?: Database["public"]["Enums"]["conversation_queue"]
          reassignment_count?: number
          status?: Database["public"]["Enums"]["wa_conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          assigned_at?: string | null
          auto_summary?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          client_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          customer_whatsapp_id?: string | null
          id?: string
          last_agent_reply_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lock_until?: string | null
          previous_agent_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          queue?: Database["public"]["Enums"]["conversation_queue"]
          reassignment_count?: number
          status?: Database["public"]["Enums"]["wa_conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_internal_notes: {
        Row: {
          author_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          is_ai_generated: boolean
          is_read: boolean
          media_filename: string | null
          media_mime_type: string | null
          media_type: Database["public"]["Enums"]["wa_media_type"]
          media_url: string | null
          reactions: Json | null
          reply_to_message_id: string | null
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["wa_sender_type"]
          whatsapp_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_read?: boolean
          media_filename?: string | null
          media_mime_type?: string | null
          media_type?: Database["public"]["Enums"]["wa_media_type"]
          media_url?: string | null
          reactions?: Json | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["wa_sender_type"]
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_read?: boolean
          media_filename?: string | null
          media_mime_type?: string | null
          media_type?: Database["public"]["Enums"]["wa_media_type"]
          media_url?: string | null
          reactions?: Json | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["wa_sender_type"]
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "wa_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_queue: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          conversation_id: string
          created_at: string
          id: string
          priority: number
          queue_type: Database["public"]["Enums"]["wa_queue_type"]
          reason: string | null
          status: Database["public"]["Enums"]["wa_queue_status"]
          target_agent_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          priority?: number
          queue_type?: Database["public"]["Enums"]["wa_queue_type"]
          reason?: string | null
          status?: Database["public"]["Enums"]["wa_queue_status"]
          target_agent_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          priority?: number
          queue_type?: Database["public"]["Enums"]["wa_queue_type"]
          reason?: string | null
          status?: Database["public"]["Enums"]["wa_queue_status"]
          target_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_assignments: {
        Row: {
          assigned_at: string
          assigned_staff_id: string | null
          created_at: string
          id: string
          team_id: string | null
          whatsapp_number: string
        }
        Insert: {
          assigned_at?: string
          assigned_staff_id?: string | null
          created_at?: string
          id?: string
          team_id?: string | null
          whatsapp_number: string
        }
        Update: {
          assigned_at?: string
          assigned_staff_id?: string | null
          created_at?: string
          id?: string
          team_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_assignments_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_conversation_with_capacity: {
        Args: { _agent_id: string; _conversation_id: string; _force?: boolean }
        Returns: Json
      }
      auto_assign_conversation: {
        Args: { _conversation_id: string }
        Returns: Json
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      manual_assign_conversation: {
        Args: { _agent_id: string; _conversation_id: string; _force?: boolean }
        Returns: Json
      }
      promote_next_from_queue: { Args: { _agent_id: string }; Returns: string }
      reassign_stale_conversations: { Args: never; Returns: Json }
      redistribute_overflow: { Args: never; Returns: Json }
      release_conversation: {
        Args: { _conversation_id: string; _reason?: string }
        Returns: Json
      }
      role_for_queue: {
        Args: { _queue: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
    }
    Enums: {
      account_status: "available" | "assigned" | "exhausted" | "expired"
      app_role:
        | "admin"
        | "sales_rep"
        | "support_expert"
        | "client_relation_manager"
        | "accountant"
        | "accounts_creator"
        | "operations_manager"
        | "payment_verifier"
        | "fulfillment_agent"
        | "renewal_agent"
        | "account_provisioning_manager"
        | "research_analyst"
        | "vendor_coordinator"
        | "qa_reviewer"
      client_status: "active" | "inactive" | "blocked"
      conversation_channel:
        | "whatsapp"
        | "facebook"
        | "instagram"
        | "email"
        | "web"
        | "other"
      conversation_queue:
        | "sales"
        | "support"
        | "payment"
        | "renewal"
        | "general"
        | "overflow"
      deal_status: "active" | "negotiation" | "expired" | "rejected"
      duration_type: "day" | "week" | "month" | "year"
      feedback_type: "review" | "feedback" | "follow_up"
      issue_status: "open" | "in_review" | "approved" | "resolved" | "rejected"
      lead_source:
        | "whatsapp"
        | "facebook"
        | "instagram"
        | "website"
        | "referral"
        | "other"
      lead_status: "new" | "interested" | "follow_up" | "converted" | "dead"
      order_status:
        | "draft"
        | "pending_payment"
        | "paid_unverified"
        | "paid_verified"
        | "to_deliver"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "verified" | "rejected"
      priority_level: "low" | "medium" | "high" | "urgent"
      reminder_response: "pending" | "renewed" | "refused" | "deferred"
      staff_availability: "active" | "on_break" | "offline" | "inactive"
      subscription_status:
        | "active"
        | "expiring"
        | "expired"
        | "renewed"
        | "terminated"
      task_related_type:
        | "order"
        | "conversation"
        | "ticket"
        | "lead"
        | "subscription"
        | "general"
      task_status: "pending" | "in_progress" | "done" | "cancelled"
      template_category:
        | "pre_invoice"
        | "payment_confirmation"
        | "delivery"
        | "renewal_reminder"
        | "feedback_request"
        | "product_info"
        | "general"
      tool_request_status:
        | "new"
        | "researching"
        | "approved"
        | "rejected"
        | "sourced"
      trust_tag: "not_trusted" | "trusted" | "super_client"
      vendor_status: "active" | "inactive" | "blacklisted"
      wa_ai_confidence: "high" | "medium" | "low"
      wa_conversation_status: "active" | "waiting" | "resolved" | "archived"
      wa_media_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "sticker"
      wa_queue_status: "waiting" | "assigned" | "expired" | "active"
      wa_queue_type:
        | "sales"
        | "support"
        | "payments"
        | "renewals"
        | "overflow"
        | "agent"
      wa_sender_type: "customer" | "agent" | "system" | "ai"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["available", "assigned", "exhausted", "expired"],
      app_role: [
        "admin",
        "sales_rep",
        "support_expert",
        "client_relation_manager",
        "accountant",
        "accounts_creator",
        "operations_manager",
        "payment_verifier",
        "fulfillment_agent",
        "renewal_agent",
        "account_provisioning_manager",
        "research_analyst",
        "vendor_coordinator",
        "qa_reviewer",
      ],
      client_status: ["active", "inactive", "blocked"],
      conversation_channel: [
        "whatsapp",
        "facebook",
        "instagram",
        "email",
        "web",
        "other",
      ],
      conversation_queue: [
        "sales",
        "support",
        "payment",
        "renewal",
        "general",
        "overflow",
      ],
      deal_status: ["active", "negotiation", "expired", "rejected"],
      duration_type: ["day", "week", "month", "year"],
      feedback_type: ["review", "feedback", "follow_up"],
      issue_status: ["open", "in_review", "approved", "resolved", "rejected"],
      lead_source: [
        "whatsapp",
        "facebook",
        "instagram",
        "website",
        "referral",
        "other",
      ],
      lead_status: ["new", "interested", "follow_up", "converted", "dead"],
      order_status: [
        "draft",
        "pending_payment",
        "paid_unverified",
        "paid_verified",
        "to_deliver",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "verified", "rejected"],
      priority_level: ["low", "medium", "high", "urgent"],
      reminder_response: ["pending", "renewed", "refused", "deferred"],
      staff_availability: ["active", "on_break", "offline", "inactive"],
      subscription_status: [
        "active",
        "expiring",
        "expired",
        "renewed",
        "terminated",
      ],
      task_related_type: [
        "order",
        "conversation",
        "ticket",
        "lead",
        "subscription",
        "general",
      ],
      task_status: ["pending", "in_progress", "done", "cancelled"],
      template_category: [
        "pre_invoice",
        "payment_confirmation",
        "delivery",
        "renewal_reminder",
        "feedback_request",
        "product_info",
        "general",
      ],
      tool_request_status: [
        "new",
        "researching",
        "approved",
        "rejected",
        "sourced",
      ],
      trust_tag: ["not_trusted", "trusted", "super_client"],
      vendor_status: ["active", "inactive", "blacklisted"],
      wa_ai_confidence: ["high", "medium", "low"],
      wa_conversation_status: ["active", "waiting", "resolved", "archived"],
      wa_media_type: ["text", "image", "video", "audio", "document", "sticker"],
      wa_queue_status: ["waiting", "assigned", "expired", "active"],
      wa_queue_type: [
        "sales",
        "support",
        "payments",
        "renewals",
        "overflow",
        "agent",
      ],
      wa_sender_type: ["customer", "agent", "system", "ai"],
    },
  },
} as const
