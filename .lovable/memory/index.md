# Project Memory

## Core
AI Subscription Sharing Management System. Lovable Cloud (Supabase) backend. Role-based access with 6 roles. WhatsApp-driven sales workflow.
Primary #3B82F6 (blue), dark sidebar. Design tokens in index.css.
ProAppz-inspired warm amber/orange palette; dark theme text should stay high-contrast and readable.
Tables: staff_profiles, user_roles, teams, products, product_variants, clients, orders, payments, software_accounts, subscriptions, reminders, feedback, audit_logs, system_settings + more.
has_role() and is_staff() security definer functions for RLS.

## Memories
- [Database schema](mem://features/db-schema) — All tables, enums, RLS policies, indexes
- [Roles & permissions](mem://features/roles) — 6 roles with module-level permissions table
- [Order workflow](mem://features/order-flow) — draft→pending_payment→paid_unverified→paid_verified→to_deliver→delivered→cancelled
- [Brand palette](mem://design/brand-palette) — ProAppz-inspired amber/orange dark theme with high text contrast
- [WhatsApp system](mem://features/whatsapp-system) — Full WhatsApp Business API integration with multi-agent chat, AI auto-response, queue management
- [WhatsApp settings](mem://features/whatsapp-settings) — All WhatsApp features controllable from Settings page
- [System settings](mem://features/system-settings) — Admin-managed system_settings table for API credentials, AI config, feature toggles
