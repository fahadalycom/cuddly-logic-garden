
## Plan: Make Conversations production-functional

Surgical completion of the existing system — no rebuild, no new architecture, no demo seed.

### 1. Composer: real attachments + emoji + send states

**Edit `src/components/conversations/ConversationThreadPanel.tsx`**
- Wire **Paperclip** to a hidden `<input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt">` with a 16 MB size cap and MIME validation. On select → upload via supabase.storage to `whatsapp-media` bucket → call `sendMessage` with media metadata. Show inline preview chip (filename + size + ✕) before send; show toast on type/size rejection.
- Wire **Smile** to a Popover containing `emoji-picker-react` (lightweight, ~150kb). Inserts emoji at the textarea caret position (track caret with a ref).
- Composer states: `submitting` already exists → show spinner inside Send button, dim the chip row, keep textarea disabled while a send/upload is in flight.
- Enter to send (Shift+Enter newline). Auto-grow textarea (already mostly there).
- Remove the "Demo channel — connect…" placeholder text when conversation has a real id; for non-real ids keep composer disabled with a clear inline hint and tooltip.
- Disable the unimplemented header buttons that currently do nothing (`Assign`, `Status`, `Priority`, `View Customer`, `MoreHorizontal`) by adding `disabled` + `title="Coming soon"` so production users can't click fake actions. Keep the working ones (`Products`, `Transfer`, `Add Note`, `Create Ticket`).

### 2. Generalise `sendMessage` to carry attachments

**Edit `src/hooks/useConversationMessages.ts`**
- Extend `sendMessage(text, attachment?)` where attachment = `{ url, mime, filename, mediaType: 'image'|'document' }`.
- Optimistic bubble shows attachment row immediately.
- Posts the same shape to whatsapp-send (already accepts `media_url`/`media_type`/`media_mime_type`/`media_filename`). For messenger-send, pass attachment fields through.

### 3. Messenger/Instagram attachment send

**Edit `supabase/functions/messenger-send/index.ts`**
- Accept `media_url` (storage key in `whatsapp-media` bucket), `media_mime_type`, `media_filename`, `media_type`.
- When media present, generate a public storage URL (bucket is public) and POST Graph payload `message: { attachment: { type: 'image'|'file', payload: { url, is_reusable: true } } }`. Fallback to text-only when not present (current behaviour).
- Persist `media_url`, `media_type`, `media_mime_type`, `media_filename` on the `wa_messages` row.

### 4. Render attachments in bubbles

**Edit the `MessageBubble` in `ConversationThreadPanel.tsx` + `mapWaMessage` in `src/lib/conversations-data.ts`**
- Map `media_url`/`media_type`/`media_mime_type`/`media_filename` onto `MockMessage` (extend the type minimally).
- Bubble: render `<img>` for images (click to open in new tab), and a download chip for documents (icon + filename + size). Captions remain in `text`.

### 5. Remove mock leakage in `useConversationMessages`

- When `conversationId` exists but is not real, return empty messages + a flag `canSend=false` instead of falling back to `mockMessagesByConv`. Keep mock list-level fallback (`useConversations`) as the only legacy surface.
- Drop the `mockMessagesByConv` import here.

### 6. Channel Integrations: readiness state + clearer guidance

**Edit `src/components/admin/ChannelIntegrationCard.tsx`**
- Compute a `readiness` enum from existing data:
  - `not_configured` (completeness < 100)
  - `partially_configured` (completeness 100, no `verify_token` or no successful health check)
  - `ready_for_webhook` (config + verify token saved, no `last_inbound_at`)
  - `ready_for_live` (`last_success_at` within 24h **and** `last_inbound_at` set, but `enabled=false`)
  - `live` (`enabled=true` + healthy)
- Render a chip + a one-line "Next step" hint per readiness state ("Add the page access token", "Paste webhook URL into Meta and verify", "Enable channel to go live", etc.).
- Keep existing fields, telemetry, copy buttons, test/reconnect/clear-error — they already work.
- Show **verify_token** as its own copyable read-only field next to the webhook URL (currently it's editable only).
- Add per-field "missing" badge next to required fields not set (uses `secrets_set` for secrets, `config[key]` for plain).

### 7. Surface webhook + integration errors in inbox

**Edit `src/components/conversations/ConversationReliabilityStrip.tsx`**
- Read `channel_integrations` for the conversation's channel via a tiny new hook `useIntegrationStatus(channel)` (single `select` cached by react-query). When `last_error` is present **or** `enabled=false`, show a small inline alert chip ("Channel error — view integration") that links to `/channel-integrations`.

### 8. Failed-send error visibility (verify)

Already wired (failed bubble + retry button + retry hook + ops log). No changes — just confirm the new attachment failures hit the same path: messenger-send / whatsapp-send already store `error_message` on failure, and the retry handler re-invokes the same function via `whatsapp-retry-message`. Extend the retry function to also pass through media fields when retrying — small edit:

**Edit `supabase/functions/whatsapp-retry-message/index.ts`**
- When invoking the underlying send function, include `media_url/media_type/media_mime_type/media_filename` from the original `wa_messages` row so retried attachment sends actually re-send the file.

### 9. Files

**Edited only — no new files except one tiny hook**
- `src/components/conversations/ConversationThreadPanel.tsx` — paperclip + emoji + caret insertion + attachment chip + disable fake buttons + send-state polish
- `src/hooks/useConversationMessages.ts` — attachment-aware send + drop mock fallback
- `src/lib/conversations-data.ts` — map media fields onto MockMessage
- `src/lib/conversations-mock.ts` — extend `MockMessage` with optional media fields (type only)
- `src/components/admin/ChannelIntegrationCard.tsx` — readiness chip + next-step hint + per-field missing badges + verify_token copy field
- `src/components/conversations/ConversationReliabilityStrip.tsx` — channel error chip
- `src/hooks/useIntegrationStatus.ts` — **new**, ~25 lines, single react-query select

**Edge functions**
- `supabase/functions/messenger-send/index.ts` — image + document attachments via Graph
- `supabase/functions/whatsapp-retry-message/index.ts` — pass media fields on retry

**Dependencies**
- Add `emoji-picker-react` (~150kb, no peer deps).

**No DB migration. No new tables. No demo seed. No new pages.**

### 10. Out of scope
- Audio/voice notes for FB/IG (Meta Graph API has limited attachment types for these; WhatsApp already supports audio).
- Multi-attachment in a single message (one file per send this round).
- Inline image preview lightbox (open in new tab is enough now).
- Read-receipt webhook for FB/IG (separate plan).
