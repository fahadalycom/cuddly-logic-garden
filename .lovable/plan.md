
Goal: harden the existing unified messaging system end-to-end without rebuilding it.

What I found from the current code:
- The core architecture is already correct: one inbox, channel-aware send functions, retries, webhooks, status model, health UI.
- The main production breakage is in the last-mile wiring, not the architecture.
- Biggest concrete bug: outbound WhatsApp attachments are inconsistent. The UI stores a public URL, but `whatsapp-send` expects a storage object key and tries to download it from storage. That makes WhatsApp file/image sending fail.
- The composer still allows sends when a channel is expired/disabled/error, so users hit avoidable runtime failures.
- `whatsapp-retry-message` still allows retrying `permanently_failed` messages at backend level.
- AI auto-replies bypass the unified outbound pipeline and write incomplete message rows, which can create inconsistent status/history behavior.
- The live inbox still falls back to mock conversations/queue counts when DB data is empty, which can hide real webhook/send problems instead of exposing them.

Plan

1. Normalize the outbound media contract
- Make attachments use one consistent payload shape across UI + edge functions.
- Store the storage key for WhatsApp sends, and keep a separate preview URL for UI display.
- Update Messenger/Instagram send path to convert storage keys to usable public/proxy URLs when needed.
- Result: image/document sending works reliably on real channels.

2. Block bad sends before they happen
- Tie the composer to actual integration health, not just “real conversation id”.
- If token is expired, channel is disabled, or integration is broken, disable send and show the exact reason with a link to Channel Integrations.
- Keep the existing error banner, but make it authoritative for send gating.

3. Harden outbound send functions
- Add strict preflight validation in `whatsapp-send` and `messenger-send` for missing recipient ids, missing config, unsupported attachment/channel combinations, and malformed media payloads.
- Keep storing exact `error_code`, `error_message`, and `provider_response`.
- Return clearer structured failures so the UI shows the real cause.

4. Fix retry behavior permanently
- Prevent backend retries for `permanently_failed` messages.
- Allow retry only for truly retryable states.
- Keep manual retry, but stop pointless replays for expired-token / permission / config failures.

5. Route AI replies through the same message pipeline
- Stop direct Graph sending from `whatsapp-ai-respond`.
- Reuse the existing send path or at minimum write the same fields (`direction`, `channel`, `delivery_status`, `sent_at`, provider ids/errors).
- Result: AI messages obey the same transport, status, logging, and retry rules.

6. Remove remaining production mock leaks
- Remove fallback to `mockConversationsList` in the live inbox flow.
- Remove mock queue counts from the Conversations page, or clearly isolate them away from the live messaging workflow.
- Show a real empty state when there are no conversations instead of demo data.

7. Improve operator/debug visibility inside the inbox
- Expand message loading so the thread can use richer failure metadata where available.
- Improve failed message bubbles and ops logs so admins can see exact channel failure reasons without checking code.
- Keep current integration health cards, but make live message failures and integration failures feel connected.

Files to update
- `src/components/conversations/ConversationThreadPanel.tsx`
- `src/hooks/useConversationMessages.ts`
- `src/hooks/useConversations.ts`
- `src/pages/Conversations.tsx`
- `src/components/conversations/ConversationReliabilityStrip.tsx`
- `src/components/admin/OperationalLogsPanel.tsx`
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/functions/messenger-send/index.ts`
- `supabase/functions/whatsapp-retry-message/index.ts`
- `supabase/functions/whatsapp-ai-respond/index.ts`

Acceptance after implementation
- Real text sends work from the unified inbox.
- Real image/document sends work, especially on WhatsApp.
- Expired/disabled integrations block sending clearly before failure.
- Permanent failures are visible but not retryable.
- AI replies no longer bypass the transport system.
- No mock conversations or fake queue counts leak into the live messaging workflow.
- Admins can see exactly why sends fail from the UI itself.
