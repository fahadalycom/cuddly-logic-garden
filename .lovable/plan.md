
## Plan: Unified Meta channels inside the existing Conversations module

This is a substantial step. I'll lay it out clearly so the work stays surgical and reuses what's already built (`wa_conversations`, `wa_messages`, `wa_inbound_events`, `channel_integrations`, the existing Conversations UI, the reliability strip, and the Channel Integrations admin page).

### 1. Database — generalise existing tables, no parallel ones

**Migration**

- `wa_conversations`: already has `channel` enum (whatsapp/instagram/facebook/email/web). Add:
  - `external_user_id text` — channel-native user id (wa phone, ig user id, fb psid)
  - `external_conversation_id text` — IG/FB thread id when available
  - `integration_id uuid references channel_integrations(id)` — which integration owns this conversation
  - index `(channel, external_user_id)` for dedupe lookups

- `wa_messages`: add
  - `external_message_id text` (already exists — confirm) plus a unique index on `(channel, external_message_id)` where not null, to prevent duplicate inbound inserts on webhook retries
  - `channel` column (default 'whatsapp') so the table is true multi-channel

- `wa_inbound_events`: add
  - `channel` (default 'whatsapp')
  - `integration_id uuid references channel_integrations(id)`
  - keep `raw_payload`, `processing_status`, `error_message`, `received_at`, `processed_at`, `external_message_id`, `event_type` (already there per prior steps)

- New table `channel_send_failures` (lightweight admin view source) — actually reuse `wa_send_jobs` + `wa_messages.delivery_status='failed'`. No new table needed.

- RLS: extend existing staff-only policies to cover the new columns; add a policy on `wa_inbound_events` so admins can read for the ops log view.

### 2. Edge functions

**New: `messenger-webhook`** (handles both Facebook Messenger and Instagram Messaging since Meta delivers them on the same Graph webhook shape with `object: 'page' | 'instagram'`)
- GET: verify_token handshake against the `channel_integrations.verify_token` for the matching channel
- POST: write raw payload into `wa_inbound_events` with `channel` set, then for each `messaging[]` entry:
  - resolve / create `wa_conversations` by `(channel, external_user_id)` — sticky to existing thread when it exists
  - insert inbound `wa_messages` row keyed by `external_message_id` (idempotent via unique index)
  - update conversation `last_message_*`, `unread_count`
  - mark event `processed_at` + `processing_status='success'`; on error store `error_message` and leave `processing_status='failed'`
- updates `channel_integrations.last_inbound_at` + `last_success_at` on success, `last_error*` on failure

**New: `messenger-send`** (FB + IG outbound)
- Mirrors `whatsapp-send` shape: takes `{ conversation_id, content, idempotency_key }`, dedupes by `idempotency_key`, transitions `delivery_status` queued → sending → sent_to_api / failed, stores `external_message_id`, `provider_response`, `error_code/message`, updates `channel_integrations.last_outbound_at` / `last_success_at` / `last_error*`
- Uses `channel_integrations.config` (page id / ig user id / page access token reference) and the existing token secret resolution pattern used by `whatsapp-send`

**Edited: `whatsapp-webhook`**
- Same idempotent insert via `(channel, external_message_id)` unique index
- Always write to `wa_inbound_events` (already does) and stamp `channel='whatsapp'` + `integration_id`

**Edited: `whatsapp-retry-message`**
- Add a thin dispatch: if `wa_messages.channel='whatsapp'` → existing path; if `'facebook' | 'instagram'` → call `messenger-send` internals. Keeps a single retry button in the UI.

(No changes to `config.toml` — these new functions follow the default `verify_jwt = false` Lovable behaviour, which is what webhooks need anyway. Send functions validate the caller's JWT in code.)

### 3. Frontend — feed all channels into the existing Conversations UI

**`src/hooks/useConversations.ts`**
- Drop the "merge with mock for non-whatsapp" hybrid. Now reads all rows from `wa_conversations` regardless of channel.
- Keep mock fallback only when DB is empty (first run / demo). Mock seeds will cover all 3 channels (see §6).

**`src/hooks/useConversationMessages.ts`**
- Generalise the send dispatcher: choose `whatsapp-send` vs `messenger-send` based on the conversation's `channel`. Same idempotency + optimistic flow. Same retry hook (`useMessageRetry`) — it already calls `whatsapp-retry-message` which now dispatches internally.
- Realtime subscription is unchanged (already listens to `wa_messages` filtered by `conversation_id`).

**`src/lib/conversations-data.ts`**
- Map the new fields (`channel`, `external_user_id`, `external_conversation_id`, `integration_id`) into the existing `MockConversation` shape so UI components stay untouched.
- `ChannelIcon` / channel labels already render correctly from `conversation.channel`.

**`ConversationContextPanel.tsx`** (small additions, no redesign)
- Show the channel-native identifier under the customer name (WhatsApp `+•••`, Messenger PSID, IG user id) and the integration name from `channel_integrations`.

**`ConversationReliabilityStrip.tsx`** — already shows channel + last sync + failed/retry. Now it's automatically multi-channel because `useConversationMessages` returns real data for all channels.

### 4. Channel Integrations page — health & alerts

**`src/pages/ChannelIntegrations.tsx`** + new `IntegrationHealthCard.tsx`
- Per-channel card already exists. Add at top a **Health overview strip**:
  - connected channels count
  - failed sends today (count from `wa_messages where delivery_status in ('failed','permanently_failed') and created_at >= today`)
  - webhook failures today (count from `wa_inbound_events where processing_status='failed' and received_at >= today`)
  - last webhook per channel (`max(received_at)` grouped by channel)
  - last successful send per channel (`channel_integrations.last_success_at`)
- Per-card: surface alert banner when `status='error'`, `last_error` present, or `last_success_at` older than 24h while `enabled=true`.
- New tab inside the page: **Operational Logs** (admin-friendly):
  - Recent webhook events (last 50 from `wa_inbound_events`, filterable by channel + processing_status)
  - Recent failed sends (last 50 from `wa_messages` where status failed, with retry_count + error_message + Retry button using `useMessageRetry`)
  - Retry history derived from `wa_send_jobs` rows tied to each message

### 5. Dashboard — health highlights

**`src/pages/Dashboard.tsx`**
- New `ChannelHealthHighlights` widget at the top of the dashboard:
  - Same 4 KPIs as the integrations strip (connected / failed sends / webhook failures / channels needing attention)
  - "Channels needing attention" list links straight to `/channel-integrations`
- Reuses existing `KpiCard` and design tokens — no new visuals.

### 6. Demo / seed data

A small seed insert (via `supabase--insert`, not a migration) that adds:
- 1 incoming Messenger conversation + message (channel=facebook, with external_user_id)
- 1 incoming Instagram conversation + message (channel=instagram, with external_user_id)
- 1 failed outgoing WhatsApp message (delivery_status=failed, error_message, retry_count=1) on an existing wa conversation
- 1 wa_inbound_events row with processing_status=failed + error_message (webhook processing error example)
- 1 wa_inbound_events row with processing_status=success per channel (last received timestamps populate)

This guarantees the unified inbox + health panels + ops log all show realistic content immediately.

### 7. Graceful failure behaviour (already in place — verify only)

- Optimistic message stays visible with `failed` state when send returns error ✅ already
- Retry button in the bubble + bulk retry from ops log ✅ extending existing hook
- Reliability strip shows failed count + jump-to-failed ✅ already
- Channel integration card shows `last_error` ✅ already, plus the new health strip

### 8. Files

**Migration**
- columns + indexes on `wa_conversations`, `wa_messages`, `wa_inbound_events`; RLS for ops log

**New edge functions**
- `supabase/functions/messenger-webhook/index.ts`
- `supabase/functions/messenger-send/index.ts`

**Edited edge functions**
- `supabase/functions/whatsapp-webhook/index.ts` — stamp channel + integration_id, idempotent insert
- `supabase/functions/whatsapp-retry-message/index.ts` — dispatch by channel

**New components**
- `src/components/admin/IntegrationHealthStrip.tsx`
- `src/components/admin/OperationalLogsPanel.tsx`
- `src/components/dashboard/ChannelHealthHighlights.tsx`
- `src/hooks/useChannelHealth.ts`

**Edited**
- `src/hooks/useConversations.ts` — all-channel read, drop mock merge
- `src/hooks/useConversationMessages.ts` — channel-aware send dispatcher
- `src/lib/conversations-data.ts` — map new fields
- `src/components/conversations/ConversationContextPanel.tsx` — show external id + integration name
- `src/pages/ChannelIntegrations.tsx` — health strip + ops logs tab
- `src/pages/Dashboard.tsx` — health highlights widget

**Seed (insert tool)**
- demo Messenger / Instagram conversations + failed wa message + sample inbound_events rows

### 9. Order of operations
1. Run migration (waits for user approval).
2. Deploy `messenger-webhook` + `messenger-send`, edit `whatsapp-webhook` and `whatsapp-retry-message`.
3. Add hooks + UI components.
4. Seed demo data.
5. Verify with logs.

### 10. Out of scope (explicit)
- Real FB/IG token onboarding flow inside the integrations page (still uses the existing config form — only message transport is wired now).
- Media attachments for FB/IG (text only this round).
- Server-side auto-retry scheduler (manual retry only — server scheduler is a separate plan).
- Per-user OAuth onboarding (workspace-level integration config remains the model).

Awaiting approval to execute.
