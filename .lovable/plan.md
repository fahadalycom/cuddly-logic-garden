

# AI Subscription Sharing Management System — Implementation Plan

## Overview

A role-based management system for an AI subscription sharing business. Covers the full operational lifecycle: product catalog, sales/ordering, payment verification, account inventory, delivery, client management, renewals/reminders, feedback, and analytics. Built on Lovable Cloud (Supabase) with real auth and RLS from the start.

## Phased Build Order

Due to the scope, this will be built in sequential phases within a single implementation pass. Each phase builds on the previous.

---

### Phase 1: Foundation (Auth, Roles, Layout, Navigation)

**Database tables:**
- `user_roles` (enum: admin, sales_rep, support_expert, client_relation_manager, accountant, accounts_creator)
- `staff_profiles` (name, email, phone, avatar, is_active)
- `teams` (name, description, whatsapp_numbers[])
- `team_members` (team_id, staff_id, role)
- `whatsapp_assignments` (whatsapp_number, team_id, assigned_staff_id, assigned_at) — tracks current operator per number
- `permissions` (role, module, can_view, can_create, can_edit, can_delete)
- `audit_logs` (actor_id, action, entity_type, entity_id, details, created_at)

**UI:**
- Login page (email/password)
- Sidebar layout with role-based navigation (using SidebarProvider)
- Admin can manage staff, teams, roles, permissions
- WhatsApp number assignment UI

---

### Phase 2: Product Catalog & Configuration

**Database tables:**
- `products` (name, description, image_url, base_price, is_active, faq_content, category)
- `product_variants` (product_id, name — e.g. Shared/Semi-Private/Enterprise, price, max_discount_percent, max_discount_fixed, sharing_standard — max users allowed)
- `product_durations` (product_id, duration_type: day/week/month/year, duration_value, price_multiplier)
- `message_templates` (name, category, body, variables[], is_active)

**UI:**
- Product listing with grid/list view, quick-copy product details (WhatsApp-formatted)
- Multi-select products with bulk Copy Info / Buy actions
- Product detail/FAQ page
- Admin: manage products, variants, durations, sharing standards, discount limits
- Admin: manage message templates

---

### Phase 3: Orders & Buy Flow

**Database tables:**
- `clients` (name, phone, email, whatsapp_number, assigned_team_id, trust_tag: not_trusted/trusted/super_client, notes, created_at)
- `orders` (client_id, created_by, status enum: draft/pending_payment/paid_unverified/paid_verified/to_deliver/delivered/cancelled, total_amount, discount_amount, paid_amount, remaining_due, notes)
- `order_items` (order_id, product_id, variant_id, duration_type, duration_value, unit_price, discount, line_total)
- `order_status_history` (order_id, from_status, to_status, changed_by, notes, created_at)
- `payments` (order_id, amount, method, reference, verified_by, verified_at, status: pending/verified/rejected, notes)

**UI:**
- Buy flow: select products → configure variant/duration → enter client phone → generate pre-invoice (WhatsApp-formatted text, auto-copy)
- Cart/order summary with discount application (respecting max discount rules)
- Order processing tabs: Pending Payment → Paid (Unverified) → Verified → To Deliver → Delivered
- Payment verification screen for Accountant role
- Payment confirmation message (template-based, copy to clipboard)
- Partial payment support with remaining balance tracking

---

### Phase 4: Accounts Inventory & Delivery

**Database tables:**
- `software_accounts` (product_id, variant_id, username, password_encrypted, login_instructions, notes, capacity, used_seats, status: available/assigned/exhausted/expired, created_by, created_at)
- `account_assignments` (account_id, client_id, order_item_id, assigned_by, assigned_at, revoked_at)

**UI:**
- Accounts Creator: add/manage software account inventory
- Capacity/utilization tracking (e.g. 12/20 seats used)
- Unsold inventory alerts (account sitting X days without assignment)
- Delivery screen: Support Expert sees order → assigns account from inventory → marks delivered
- Account credentials viewable during delivery (with copy actions)

---

### Phase 5: Client Management & Profiles

**Database tables:**
- `client_notes` (client_id, author_id, content, created_at)
- `client_transfers` (client_id, from_team_id, to_team_id, transferred_by, reason, created_at)
- `support_issues` (client_id, order_item_id, account_id, type: issue/replacement, description, status: open/in_review/approved/resolved/rejected, assigned_to, resolution_notes)
- `replacements` (issue_id, old_account_id, new_account_id, approved_by, completed_at, notes)

**UI:**
- Client profile page with tabs: Overview, Purchases, Subscriptions, Payments, Issues, Notes, Reminders, Feedback
- Client list with search/filter by tag, team, status
- Transfer client between teams (with history)
- Support issue & replacement workflow
- Trust tag management (auto-suggest based on tenure)

---

### Phase 6: Renewals, Reminders & Feedback

**Database tables:**
- `subscriptions` (client_id, order_item_id, product_id, variant_id, start_date, end_date, status: active/expiring/expired/renewed/terminated)
- `reminders` (subscription_id, client_id, reminder_number: 1/2/3, scheduled_date, sent_at, response: pending/renewed/refused/deferred, deferred_to, sent_by)
- `terminations` (subscription_id, reason, password_changed, access_removed, notes, completed_by, completed_at)
- `feedback` (client_id, type: review/feedback/follow_up, content, rating, collected_by, created_at)

**UI:**
- Renewal dashboard: expiring soon (3 days), reminders sent count, status
- One-click WhatsApp reminder with template message
- Reminder logic: skip if renewed, remove if refused, defer if requested
- Termination checklist (password change, access removal, closure notes)
- Feedback collection section
- Old clients follow-up list (inactive 2-4 months)

---

### Phase 7: Analytics & Dashboard

**UI:**
- Admin dashboard: revenue summary, order pipeline counts, active subscriptions, expiring soon
- Client analytics: inactive clients, win-back candidates, trust distribution
- Inventory analytics: utilization rates, unsold alerts, capacity overview
- Staff performance: orders handled, deliveries completed
- Quick filters and date ranges

---

### Phase 8: Settings & Polish

**UI:**
- Settings page: roles/permissions management, message templates, product duration configs, discount rules, sharing standards
- Audit log viewer (filterable by user, action, entity)
- Loading/empty/error states across all screens
- Mobile-responsive layout optimization
- README documentation

---

## Technical Architecture

**Stack:** React 18 + TypeScript + Tailwind + shadcn/ui + Supabase (Lovable Cloud)

**Auth:** Supabase Auth with email/password. Roles stored in `user_roles` table with `has_role()` security definer function. RLS on all tables.

**Navigation structure:**
```text
├── Dashboard
├── Products
│   ├── Catalog
│   └── FAQ
├── Orders
│   ├── New Order
│   ├── Pending Payment
│   ├── Payment Verification
│   ├── To Deliver
│   └── Completed
├── Inventory
│   ├── Accounts
│   └── Utilization
├── Clients
│   ├── All Clients
│   └── Client Profile
├── Renewals
│   ├── Expiring Soon
│   ├── Reminder Queue
│   └── Terminations
├── Feedback
│   ├── Collect
│   └── Old Clients
├── Analytics
└── Settings
    ├── Staff & Teams
    ├── Roles & Permissions
    ├── WhatsApp Numbers
    ├── Message Templates
    └── Audit Logs
```

**Key patterns:**
- All WhatsApp actions = copy formatted text to clipboard (no API integration needed)
- Discount enforcement: client-side validation + RLS/DB check
- Audit logging via DB triggers on key tables
- Soft delete/archive pattern on clients, orders, accounts
- Status history tables for orders and subscriptions

**File organization:**
```text
src/
├── components/
│   ├── layout/ (AppSidebar, Header, ProtectedRoute)
│   ├── products/ (ProductCard, ProductGrid, BuyFlow, etc.)
│   ├── orders/ (OrderPipeline, PaymentVerification, etc.)
│   ├── clients/ (ClientProfile, ClientList, etc.)
│   ├── inventory/ (AccountForm, UtilizationCard, etc.)
│   ├── renewals/ (ReminderQueue, TerminationChecklist, etc.)
│   ├── analytics/ (DashboardCards, Charts, etc.)
│   └── shared/ (StatusBadge, CopyButton, WhatsAppMessage, etc.)
├── hooks/ (useAuth, usePermissions, useClipboard, etc.)
├── lib/ (supabase client, formatters, template engine)
├── pages/ (one per route)
└── types/ (database types, enums)
```

## Improved Design Decisions

1. **Statuses renamed** for clarity: "Paid Awaiting Verification" → `paid_unverified`, "To Deliver" → `to_deliver`
2. **Subscriptions as first-class entity** — derived from order items with explicit start/end dates, not just order status
3. **Trust tags auto-suggested** based on client tenure but manually overridable
4. **Discount rules at variant level** — more granular control than product level
5. **Account capacity tracking** built into inventory, not separate
6. **Reminder deference** — "remind me later" creates a new scheduled date, not just a note
7. **Termination checklist** — structured steps instead of freeform notes
8. **Template variables** — `{{client_name}}`, `{{product_name}}`, `{{amount}}`, etc. auto-replaced before copy

