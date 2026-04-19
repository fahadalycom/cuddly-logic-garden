

This work is already done across prior approved plans:

- DB transport state (`wa_messages.delivery_status`, `idempotency_key`, `retry_count`, `last_retry_at`, `error_code/message`, `provider_response`, `sent_at/delivered_at/read_at`, `external_message_id`, `direction`) — migrated.
- `wa_inbound_events` raw webhook log + `wa_send_jobs` — migrated.
- `whatsapp-send` (idempotent, status transitions), `whatsapp-webhook` (raw log + status callbacks), `whatsapp-retry-message` — deployed.
- `MessageStatusIndicator`, `ConversationReliabilityStrip`, `useMessageRetry`, `message-status.ts` — created and wired into `ConversationThreadPanel`.
- `useConversations` + `useConversationMessages` adapters with realtime + optimistic idempotent send — wired into `Conversations.tsx`.
- Demo/mock states preserved for non-WhatsApp channels.

Re-running the same plan would be a no-op. The remaining gap from the original brief is: the reliability strip is currently mounted in the thread but does not yet surface **last-sync status** or a quick **jump-to-latest-failed** affordance, and Messenger/Instagram bubbles in mock conversations do not visually expose the new states (since mock data was only enriched for WhatsApp demos).

## Plan: polish pass on transport-aware Conversations

Small, surgical additions only — no rebuild.

### 1. Reliability strip enrichments
**Edit `src/components/conversations/ConversationReliabilityStrip.tsx`**
- Accept `latestFailedId?: string` and `onJumpToFailed?: () => void` props.
- When `r.failed > 0`, make the "N failed" pill a button that calls `onJumpToFailed`.
- Show a "Last sync" relative time derived from the most recent inbound message timestamp (passed in via new `lastInboundAt?: string` prop).

**Edit `src/components/conversations/ConversationThreadPanel.tsx`**
- Compute `latestFailedId` and `lastInboundAt` from `messages`.
- Pass them into the strip.
- `onJumpToFailed` scrolls the failed bubble into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) and adds a 1.5s ring highlight.

### 2. Demo states for non-WhatsApp channels
**Edit `src/lib/conversations-mock.ts`**
- Add 1–2 messages per non-whatsapp mock conversation covering: `failed` (with `errorMessage`), `retrying`, `delivered`, `read`. Reuses the existing extended `MockMessage` type — no schema change.
- This lets the bubbles + strip + retry UI be visually testable across Messenger/Instagram/Email/Web entries even before their backends exist.
- Retry button on these mock failed messages calls a no-op handler that toasts "Retry available once channel is connected" (already the behavior in `useConversationMessages` for non-real ids; the bubble's retry just needs to surface that path — already wired).

### 3. Channel label + sync indicator clarity
**Edit `ConversationReliabilityStrip.tsx`** (small)
- Show channel label as a colored chip matching brand palette (warm amber for connected, muted for mock) so agents instantly see which conversations are live-transport vs demo.
- Pass `isRealtime: boolean` from `useConversationMessages` through `ConversationThreadPanel` to the strip.

### 4. Files

**Edited (small)**
- `src/components/conversations/ConversationReliabilityStrip.tsx` — new props, jump-to-failed button, last-sync, realtime chip.
- `src/components/conversations/ConversationThreadPanel.tsx` — pass new props, scroll-to + highlight handler.
- `src/lib/conversations-mock.ts` — add demo failed/retrying/delivered/read messages on non-whatsapp threads.

**Not touched**
- DB schema, edge functions, hooks, `MessageStatusIndicator`, `useMessageRetry`, `message-status.ts`, `Conversations.tsx`, `ConversationListPanel.tsx`.

### 5. Out of scope
- Messenger/IG real transport (no webhook yet — separate step).
- Server-side auto-retry scheduler (still manual).
- Media send (paperclip remains placeholder).

