

## Plan: Wire real wa_messages into Conversations UI

The Conversations module is currently 100% mock — `setTimeout`-simulated send pipeline, no `wa_messages` reads, no realtime, no real retry. Backend (`wa_conversations`, `wa_messages` with `delivery_status`/`idempotency_key`/`retry_count`, `whatsapp-send`, `whatsapp-retry-message`, `whatsapp-webhook` status callbacks) is ready. This step wires them together without redesigning UI.

Only WhatsApp has a real backend table today. Facebook/Instagram/email/web entries in the mock list will keep working as mock until their tables exist — the UI gracefully handles both.

### 1. New data layer

**`src/lib/conversations-data.ts`** — adapters between `wa_conversations`/`wa_messages` rows and the existing `MockConversation`/`MockMessage` shapes. Keeps UI components untouched.
- `mapWaConversation(row) → MockConversation` (channel="whatsapp")
- `mapWaMessage(row) → MockMessage` (sender from `sender_type`, status from `delivery_status`, plus `retryCount`/`errorMessage`/`direction`)

**`src/hooks/useConversations.ts`** — fetches `wa_conversations` ordered by `last_message_at`, merges with the legacy mock entries for non-whatsapp channels (so demo UX is preserved). Subscribes to `wa_conversations` INSERT/UPDATE realtime → updates list (last message, unread, status).

**`src/hooks/useConversationMessages.ts`** — for a given conversation id:
- If id starts with `wa_` (real) → fetch `wa_messages where conversation_id=...` ordered by `created_at`, plus realtime channel listening for both INSERT (new inbound/outbound) and UPDATE (status transitions: queued → sending → sent_to_api → delivered → read, or → failed/retrying/permanently_failed).
- If id is a legacy mock id → return mock messages (read-only).
- Returns `{ messages, loading, sendMessage, retryMessage, isRealtime }`.

**`sendMessage(text)`** generates `idempotency_key = crypto.randomUUID()` client-side, optimistically inserts a local row with `delivery_status='queued'`, then calls `supabase.functions.invoke('whatsapp-send', { body: { conversation_id, content, idempotency_key } })`. Realtime UPDATE replaces optimistic row when server transitions arrive. Deduplicates by `idempotency_key`.

**`retryMessage(messageId)`** — already implemented in `useMessageRetry`; reuse it directly.

### 2. UI wiring (no redesign)

**`src/pages/Conversations.tsx`**
- Replace `import { mockConversationsList }` with `const { conversations, loading } = useConversations()`.
- Pass real list to `ConversationListPanel`. Keeps existing list UI/click/select behavior.

**`src/components/conversations/ConversationThreadPanel.tsx`**
- Remove the entire `setTimeout`-based simulated send pipeline (`handleSend`, `updateLocalStatus`, simulated `handleRetry`, `localMessages` state).
- Use `useConversationMessages(conversation.id)` → returns real messages + send + retry.
- `handleSend` becomes: `await sendMessage(text)` (wrapped in existing `useSubmitGuard`). Toasts on error; success is shown by the bubble status indicator.
- `handleRetry(m)` becomes: `await retryMessage(m.id)` from `useMessageRetry`, with `isRetrying(m.id)` controlling the spinner.
- `MessageBubble` and `MessageStatusIndicator` are already correctly wired — no changes.
- The `ConversationReliabilityStrip` already uses `messages` prop with `computeReliability` — automatically reflects real data once messages are real.

**`ConversationListPanel`** — works as-is; just receives real items now (no prop signature change).

### 3. Demo data fallback

For conversations whose `id` doesn't match a real `wa_conversations` row (the legacy mock entries used to demo the multi-channel inbox), `useConversationMessages` returns mock messages and disables `sendMessage` (or shows a toast: "Real send only available for connected channels"). This way the existing demo UX still showcases multiple channels visually but the WhatsApp ones are now fully live.

If the user prefers a clean cut (real-only, no mock entries in the list), `useConversations` can take a `{ realOnly: true }` flag — easy follow-up toggle. Default this round: hybrid (preserves the visual demo).

### 4. Realtime subscriptions

Single supabase channel `conversations:thread:{id}` per open thread:
- `postgres_changes` on `wa_messages` filtered by `conversation_id`, listening for `INSERT` (new messages) and `UPDATE` (status transitions).
- Cleaned up on conversation switch / unmount.

Inbox-level channel `conversations:list`:
- `postgres_changes` on `wa_conversations` for INSERT/UPDATE → re-sorts the list and updates unread badges.

(Both tables are already in `supabase_realtime` publication per project memory.)

### 5. Idempotency & resend safety

- `sendMessage` always generates a fresh `idempotency_key`; submit button disabled while `useSubmitGuard` is in-flight.
- Optimistic message keyed by `idempotency_key`. When the realtime INSERT for the real row arrives carrying the same `idempotency_key`, the optimistic version is replaced (not duplicated).
- Retry button disabled while `isRetrying(id)` true or status is `sending`/`retrying`.

### 6. Files

**Created**
- `src/lib/conversations-data.ts` — row → mock-shape adapters
- `src/hooks/useConversations.ts` — list + realtime
- `src/hooks/useConversationMessages.ts` — thread + send + realtime + retry

**Edited**
- `src/pages/Conversations.tsx` — use real hook for list
- `src/components/conversations/ConversationThreadPanel.tsx` — remove simulated pipeline, call real send/retry, drive bubbles from real `delivery_status`
- `src/lib/conversations-mock.ts` — keep as-is for non-WhatsApp demo entries; mark file with a comment that real data flows through `conversations-data.ts`

### 7. Out of scope (explicit)
- Sending media/attachments (text only this round; paperclip stays as UI placeholder).
- Inbound message creation for Messenger/Instagram (no webhook yet).
- Server-side auto-retry scheduler (manual retry button only).

