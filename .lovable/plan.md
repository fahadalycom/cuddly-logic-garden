## Plan: Convert "New Order" → Mobile-First POS (reusing existing logic)

### Reuse strategy

The existing `ProductSelectorPanel` already implements: product/bundle loading, multi-select, plan picking, discount math (`fixed` / `percent`), pre-invoice text generation (`generatePricingMessage`), product description generation (`generateProductMessage`), invoice persistence (`saveInvoice`), and order persistence (`saveOrder`). I will **extract its core logic into a shared hook** and **render a new mobile POS shell** that uses it. No duplication.

### Refactor (one shared core)

- **Create `src/hooks/usePosEngine.ts**` — extracted from `ProductSelectorPanel`:
  - state: `selected`, `selectedBundles`, `discountMode`, `discountValue`, `bundleQty`, `bundlePriceOverride`
  - actions: `toggleProduct`, `setPlanFor`, `setQty`, `setPriceOverride`, `toggleBundle`, `clearAll`
  - derived: `lineItems`, `subtotal`, `discountAmount`, `finalTotal`
  - generators: `generateProductMessage()`, `generatePricingMessage()`
  - persisters: `saveInvoice(status)`, `saveOrder(status, paymentStatus, fulfillmentStatus, clientId)`
- **Refactor `ProductSelectorPanel**` to consume this hook (zero behavior change for Conversations).

### New POS UI (`src/pages/NewOrder.tsx` becomes the POS)

Replace the current form with a full-bleed mobile POS:

```text
┌─────────────────────────────┐
│  🔍 Search products…   [📋] │  ← header + recent invoices button
├─────────────────────────────┤
│ [img] [img] [img]           │
│ name  name  name            │  ← 3-col grid
│ Info  Info  Info            │
│ [img] [img] [img]           │
│  …scroll…                   │
├─────────────────────────────┤
│ 3 selected   [Copy] [💰 Calc]│  ← sticky bottom, shows when ≥1
└─────────────────────────────┘
```

**Components/files:**

1. `src/pages/NewOrder.tsx` — POS shell:
  - Sticky search input (real-time filter, matches name first)
  - 3-col product grid (`grid-cols-3`, scrollable, tap to toggle, ring highlight when selected)
  - Each card: image (or initial fallback), name, small "Info" button
  - Sticky bottom action bar (appears when `totalSelected > 0`): "Copy" + "Price Calculator" + selection count
2. `src/components/pos/ProductInfoSheet.tsx` — modal/sheet showing product `description`, `features`, `usage_instructions`, `faq_content` (existing fields). Stays inside POS.
3. `src/components/pos/PosCalculatorSheet.tsx` — full-screen `Sheet` reusing `usePosEngine`:
  - Cart list of selected items with plan select, qty +/-, price override
  - Discount mode (none/fixed/percent) + value
  - Live totals
  - Buttons: Back to POS, Generate Pre-Invoice
4. `src/components/pos/PreInvoiceSheet.tsx` — shows `<InvoicePreview />` with:
  - "Copy Invoice" (uses `generatePricingMessage`)
  - "Back to POS"
  - "Place Order" → opens phone-only sheet
5. `src/components/pos/PlaceOrderSheet.tsx` — single input: WhatsApp number → calls `upsert_client_by_whatsapp` RPC → calls `saveOrder(...)` from hook → toast + clear.
6. `src/components/pos/RecentInvoicesSheet.tsx` — lists last 20 invoices for current user; tap to re-open `<PreInvoiceSheet>` with that invoice (re-hydrates selection from `invoice_items` so user can edit/place order).

### Copy behaviors

- **Copy products** (top-bar bottom action): builds WhatsApp text from `generateProductMessage()` (descriptions of all selected products, no pricing) → `navigator.clipboard.writeText` → toast "Copied". POS stays open.
- **Copy invoice** (inside PreInvoice): uses `generatePricingMessage()`.

### Order flow (no name/email)

- Place Order asks only for WhatsApp number.
- Calls existing `supabase.rpc("upsert_client_by_whatsapp", { _wa })` (already created last migration) → returns `client_id`.
- Calls `saveOrder(status: "pending_payment", paymentStatus: "unpaid", fulfillmentStatus: "not_started", clientId)` from the hook → reuses existing `orders` + `order_items` + `order_status_history` writes.

### Recent invoices access

- `RecentInvoicesSheet` queries `invoices` (status in draft/sent) joined with `invoice_items`. On tap, hydrate `usePosEngine` selection from items and open `PreInvoiceSheet` directly. Can re-copy or place order.

### Search

- Pure client-side `useMemo` filter on already-loaded products: matches startsWith first, then includes (name + category).

### What is NOT changed

- Conversations `ProductSelectorPanel` keeps working (now backed by the same hook).
- `InvoicePreview`, `OrderPreview`, `formatCurrency`, `upsert_client_by_whatsapp` RPC, `orders`/`invoices` tables — untouched.
- No new database tables.
- Route stays `/orders/new`.

### Files

- new: `src/hooks/usePosEngine.ts`
- new: `src/components/pos/ProductInfoSheet.tsx`
- new: `src/components/pos/PosCalculatorSheet.tsx`
- new: `src/components/pos/PreInvoiceSheet.tsx`
- new: `src/components/pos/PlaceOrderSheet.tsx`
- new: `src/components/pos/RecentInvoicesSheet.tsx`
- rewrite: `src/pages/NewOrder.tsx`
- refactor (no behavior change): `src/components/conversations/ProductSelectorPanel.tsx` to consume `usePosEngine`

### Verification after implementation

1. Open `/orders/new` on mobile viewport → 3-col grid, search filters live.
2. Tap multiple products → bottom bar appears with count, Copy, Calculator.
3. Tap Info → product details sheet opens, close returns to POS.
4. Tap Copy → WhatsApp-formatted descriptions copied, toast shown, POS still open.
5. Tap Calculator → cart with plan/qty/discount, totals update.
6. Generate Pre-Invoice → invoice preview, Copy works, Back returns to calculator.
7. Place Order → WhatsApp number only → client auto-created/found → order created → toast.
8. Recent Invoices button → list → tap → reopens pre-invoice with same items.
9. Conversations product selector still behaves identically.

Ensure state persistence across all POS views, proper invoice rehydration (products, variants, quantities, pricing), consistent WhatsApp message formatting, prevention of duplicate order submissions, and handling of edge cases such as empty selections and search performance.