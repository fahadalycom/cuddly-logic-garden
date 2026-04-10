

# Complete Build-Out Plan — All Remaining Features

## Current State Assessment

**Fully functional pages:** Dashboard, Products (with add/copy), Orders (with status transitions), NewOrder (buy flow), Payments (verify/reject), Delivery (mark delivered), Completed, Clients (list + profile with notes), Inventory (add accounts), Renewals (list), Reminders (mark response), Feedback (add/list), Staff (read-only list), Templates (read-only list), Audit Logs (read-only list)

**Stub/Empty pages (need full build):**
- **Settings** — just an EmptyState placeholder
- **Roles & Permissions** — just an EmptyState placeholder  
- **Old Clients** — just an EmptyState placeholder

**Pages needing major feature additions:**

| Page | What's Missing |
|------|---------------|
| **Dashboard** | No charts/graphs, no quick action buttons, no recent activity feed |
| **Analytics** | Only stat cards, no charts (revenue trend, order pipeline, subscription timeline) |
| **Products** | No variant/duration management, no FAQ view, no edit/delete |
| **Delivery** | No account assignment from inventory (just marks delivered) |
| **Renewals** | No termination workflow, no auto-reminder creation |
| **Reminders** | No defer option, no WhatsApp message copy |
| **Staff** | No add/edit/deactivate staff, no team management |
| **Templates** | No add/edit/delete templates, no variable preview |
| **Audit Logs** | No actor name resolution, no date filters |
| **Inventory** | No edit/archive accounts, no utilization visualization |
| **Clients** | No transfer between teams, no support issues |
| **Client Profile** | No subscriptions detail, no support issues tab, no feedback tab |
| **Feedback** | No star rating display improvements |
| **Orders** | No order detail view, no order items display |

---

## Implementation Plan (8 Steps)

### Step 1: Settings Page — Full Build
- Product duration config management (add/edit/delete durations per product)
- Sharing standards config
- Discount rules overview
- System preferences (app name, default currency)

### Step 2: Roles & Permissions — Full Build
- Matrix grid: roles (columns) × modules (rows) with toggle switches for can_view/can_create/can_edit/can_delete
- Save changes to `permissions` table
- Visual permission matrix with color coding

### Step 3: Old Clients — Full Build  
- Fetch clients whose last order/subscription ended 2-4 months ago
- Show last active date, total spent, last product
- "Send Follow-up" button with WhatsApp template copy
- Filter by inactive duration (2mo, 3mo, 4mo+)

### Step 4: Dashboard & Analytics Enhancement
- **Dashboard**: Add recharts — revenue trend line chart (last 30 days), order status donut chart, recent activity feed (last 10 order status changes), quick action buttons
- **Analytics**: Revenue line chart, orders by status bar chart, subscription status pie chart, top products table, monthly comparison

### Step 5: Delivery + Account Assignment
- When marking an order as delivered, show account selection dialog
- List available accounts for the ordered product from `software_accounts`
- Auto-create `account_assignments` record
- Update `used_seats` on the assigned account
- Copy delivery credentials message to clipboard

### Step 6: Staff & Templates — Full CRUD
- **Staff**: Add new staff member (creates auth user via edge function), edit profile, toggle active/inactive, assign roles, team management (create teams, add members)
- **Templates**: Add/edit/delete message templates with variable tag insertion, live preview with sample data

### Step 7: Enhanced Pages
- **Products**: Edit product dialog, manage variants (add/edit/delete), manage durations, FAQ viewer/editor
- **Inventory**: Edit account dialog, archive accounts, utilization progress bars per product
- **Orders**: Order detail modal showing order items, status history timeline, payment history
- **Renewals**: Termination workflow dialog (checklist: password changed, access removed, notes), auto-create reminders for expiring subs
- **Reminders**: Defer option with date picker, WhatsApp message copy using templates
- **Audit Logs**: Resolve actor names from staff_profiles, date range filter
- **Client Profile**: Add support issues tab, feedback tab, transfer team dialog

### Step 8: Additional Useful Features
- **Command Palette (⌘K)**: Global search across clients, orders, products — navigate anywhere fast
- **Notifications indicator**: Show real count of pending actions (unverified payments + to-deliver + expiring subs)
- **Export to CSV**: On Orders, Clients, Payments tables — download button
- **Bulk actions**: On Orders page — select multiple and bulk update status
- **WhatsApp deep links**: "Open in WhatsApp" buttons that open `wa.me/{phone}` with pre-filled message

---

## Technical Notes
- Charts use `recharts` (already in dependencies)
- All new CRUD operations respect existing RLS policies
- No database schema changes needed — all tables already exist
- Staff creation will need an edge function to call `auth.admin.createUser()`
- Command palette uses `cmdk` (already installed via shadcn command component)

Shall I proceed with implementing all of this?

