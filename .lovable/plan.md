

Looking at the current Conversations module: it uses mock data (`conversations-mock.ts`) with simple `MockMessage` type (sender, text, time). The real WhatsApp module (`/whatsapp`) already has `wa_messages` with a `whatsapp_message_id` field, but no proper status tracking. The existing `ChannelIntegrations` admin page is wired up but Conversations doesn't yet talk to it.

I need to extend the data model + UI without rebuilding either. The approach:

1. **DB**: extend `wa_messages` with transport status fields, create `wa_inbound_events` for raw webhook logging, create `wa_send_jobs` for idempotent sending. Reuse `wa_conversations` (already has channel context via the integration we're building).
2. **Edge functions**: refactor `whatsapp-send` to write `queued` → `sending` → `sent_to_api`, log errors, support retry. Refactor `whatsapp-webhook` to log to `wa_inbound_events` first, then process status callbacks (`sent/delivered/read/failed`).
3. **Mock layer**: extend `MockMessage` with status, retry_count, error so the existing `Conversations` page can demo the states immediately.
4. **UI**: add `MessageStatusIndicator` (ticks/spinner/error icon), `RetryButton` on failed bubbles, conversation header reliability strip, all inside existing `ConversationThreadPanel` and the real `ChatWindow`.

Let me check questions worth asking — channel scope is clear (WhatsApp is real today; Messenger/IG are stub-ready since their webhooks aren't wired yet). Retry strategy + auto-retry behavior is the main open question.

## Plan: Transport-aware Conversations

Extend the existing Conversations module with real message transport state, retry, webhook event logging, and channel-aware reliability indicators. Reuse existing `wa_messages` and `wa_conversations` — do not introduce a parallel table.

### 1. Database (one migration)

**Extend `wa_messages`**:
- `direction` enum (`inbound` | `outbound`), default by `sender_type`
- `delivery_status` enum: `queued | sending | sent_to_api | delivered | read | failed | retrying | permanently_failed`
- `external_message_id` (rename concept from existing `whatsapp_message_id`, keep both for back-compat)
- `channel` text (default `whatsapp`)
- `retry_count` int default 0, `last_retry_at` timestamptz, `max_retries` int default 3
- `error_code` text, `error_message` text, `provider_response` jsonb
- `sent_at`, `delivered_at`, `read_at` timestamptz
- `idempotency_key` uuid unique (prevents duplicate inserts on retry)

Backfill existing rows: outbound = agent/ai/system, status `delivered` if has `whatsapp_message_id` else `sent_to_api`.

**New table `wa_inbound_events`** (raw webhook log, never deleted):
- `id`, `channel`, `event_type` (`message | status | error`), `raw_payload` jsonb, `external_message_id`, `conversation_id` (nullable), `received_at`, `processed_at`, `processing_status` (`pending | processed | failed | duplicate`), `error_message`. Unique index on `(channel, external_message_id, event_type)` to dedupe.

**New table `wa_send_jobs`** (resend-safe queue):
- `id`, `message_id` fk, `idempotency_key` unique, `status` (`pending | running | done | failed`), `attempt_count`, `next_attempt_at`, `last_error`, `created_at`. Used to coordinate retries and prevent double-sends.

RLS: staff read both, admin/system write `wa_inbound_events`, staff insert/update `wa_send_jobs`.

### 2. Edge functions

**`whatsapp-send` (refactor existing)**:
- Accept `idempotency_key` from client; if a `wa_messages` row already exists with that key, return it (no duplicate send).
- Insert message with status `queued` → update to `sending` → call Graph API → on success update to `sent_to_api` + store `external_message_id` + `provider_response`; on error update to `failed` + populate `error_code/error_message`.
- Increment `retry_count` when called via retry path.
- Existing daily limit logic preserved.

**`whatsapp-webhook` (refactor existing)**:
- First step: insert raw payload into `wa_inbound_events` with `processing_status='pending'`. Dedupe via unique index → if duplicate, mark and return 200.
- Then process: for `messages` events keep current behavior. For `statuses` events (currently ignored) update matching `wa_messages` row by `external_message_id`: set `delivered_status` to `delivered`/`read`/`failed`, populate `delivered_at`/`read_at`/`error_*`.
- Update event row to `processed` (or `failed` with reason).

**New `whatsapp-retry-message`**:
- Input `{ message_id }`. Validates row is `failed`/`permanently_failed`, capped by `max_retries`. Sets status `retrying`, calls send pipeline with same idempotency_key, updates `retry_count`, `last_retry_at`. If retries exhausted → `permanently_failed`.

### 3. Frontend — extend, do not redesign

**Mock data (`src/lib/conversations-mock.ts`)**: add `status`, `retryCount`, `errorMessage`, `direction` to `MockMessage`. Add 4-5 demo messages across existing conversations covering each state (sending, sent, delivered, read, failed, retrying, permanently_failed) so the UI is testable without live API.

**New shared component `src/components/conversations/MessageStatusIndicator.tsx`**:
- WhatsApp-style ticks: clock (queued/sending), single check (sent_to_api), double check (delivered), blue double check (read), red exclamation (failed/permanently_failed), spinner (retrying). Tooltip on hover with status + error.

**`ConversationThreadPanel.tsx` (existing, edit)**:
- `MessageBubble` shows `MessageStatusIndicator` for outbound messages.
- Failed bubbles get a destructive border + "Retry" button + retry count chip.
- Composer uses `useSubmitGuard` already in project; generates `idempotency_key` (`crypto.randomUUID()`) per send.
- Add a thin reliability strip in the header: channel icon, last delivery health (computed from recent messages), failed-count badge, last sync indicator.

**`src/components/whatsapp/ChatWindow.tsx` (real module, edit)**:
- Same `MessageStatusIndicator` integration on real messages.
- Retry button calls `supabase.functions.invoke('whatsapp-retry-message', { body: { message_id } })`.
- Realtime subscription already exists for `wa_messages` inserts — extend to listen to UPDATEs so status transitions appear live without refresh.

**New hook `src/hooks/useMessageRetry.ts`**: wraps retry invoke + optimistic UI update + toast.

**New helper `src/lib/message-status.ts`**: status → label/color/icon maps; conversation-level health rollup (counts of failed in last N messages).

### 4. Resend-safe architecture
- Client always generates `idempotency_key` before send; server uses it as unique constraint.
- `useSubmitGuard` blocks double-clicks.
- Retry button disabled while message status is `retrying` or `sending`.
- Webhook deduplicates via unique `(channel, external_message_id, event_type)`.

### 5. Files

**Created**
- `supabase/migrations/<ts>_message_transport_state.sql`
- `supabase/functions/whatsapp-retry-message/index.ts`
- `src/components/conversations/MessageStatusIndicator.tsx`
- `src/components/conversations/ConversationReliabilityStrip.tsx`
- `src/hooks/useMessageRetry.ts`
- `src/lib/message-status.ts`

**Edited**
- `supabase/functions/whatsapp-send/index.ts` — idempotency, status transitions
- `supabase/functions/whatsapp-webhook/index.ts` — raw event log, status callbacks
- `src/components/conversations/ConversationThreadPanel.tsx` — bubbles + retry + header strip
- `src/components/whatsapp/ChatWindow.tsx` — status indicators + retry + realtime UPDATE subscription
- `src/lib/conversations-mock.ts` — extended type + demo states
- `src/integrations/supabase/types.ts` — auto-regenerates after migration

### 6. Out of scope
- Messenger/Instagram inbound webhooks (their integrations exist as configs only — adding their webhook endpoints is the next step after credentials are entered).
- Auto-retry scheduler (cron). This round = manual retry button + idempotent send pipeline. Background retry can be layered on `wa_send_jobs` later.

