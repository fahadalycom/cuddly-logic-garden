
The user keeps re-sending the same hardening request. Most of priorities 1, 2, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 19 are already implemented from prior turns (unified inbox, channel-aware send, retry, idempotency, mock leak removal in messages, readiness chips, ops logs, structured test errors). Re-running those is forbidden.

Let me identify only what's genuinely still missing or incomplete based on prior recon + the new asks:

**Truly remaining gaps:**

1. **Strict honest validation per channel** (priority 3, 4) — `channel-health-check` does probe Meta, but doesn't:
   - For WhatsApp: validate WABA ID + token↔WABA relationship + token expiry detection
   - For Messenger: validate `pages_messaging` permission + page↔token linkage
   - For Instagram: validate IG business account ↔ page linkage + messaging capability
   - Classify expired/invalid tokens distinctly (Meta error subcodes 463/467/190) with explicit "expired" status persisted on `channel_integrations.status`

2. **Inbound media for FB/IG** (priority 12 reverse) — `messenger-webhook` drops `attachments[]`. Customer-sent images/files appear as empty bubbles.

3. **FB/IG delivery + read receipts** (priority 8) — `message_deliveries` / `message_reads` events not handled; outbound messages stuck at `sent_to_api`.

4. **Error classification on send** (priority 8) — `whatsapp-send` / `messenger-send` mark all failures as `failed`. No distinction between retryable (rate-limit/network) vs permanent (expired token, wrong recipient). Retry hook lets users retry permanent errors pointlessly.

5. **Channel capability guards in composer** (priority 13) — Paperclip + emoji are always enabled regardless of channel. IG DMs reject many doc types.

6. **Conversation matching by channel + external_conversation_id** (priority 14) — `messenger-webhook` only matches by `external_user_id`, which is fine for FB/IG but the rule should be enforced consistently and documented.

7. **Per-channel mini status row** (priority 16) — `IntegrationHealthStrip` shows aggregate counts but no per-channel row with status pill.

8. **Token-expired alert surfacing** (priority 16) — When `channel_integrations.status='expired'`, no banner on Conversations page or dashboard.

## Targeted plan (only the gaps)

### A. Honest health check + token expiry classification
Edit `supabase/functions/channel-health-check/index.ts`:
- WhatsApp probe: hit `/v19.0/{phone_number_id}?fields=id,verified_name,quality_rating,whatsapp_business_account_id` then `/v19.0/{waba_id}?fields=id,name` with same token. Compare returned `whatsapp_business_account_id` against stored `whatsapp_business_account_id`. Confirm `messaging_product:"whatsapp"` capability via `/v19.0/{phone_number_id}/whatsapp_business_profile`.
- Messenger probe: `/v19.0/{page_id}?fields=id,name,access_token` with page token, then `/v19.0/me/permissions` to confirm `pages_messaging`.
- Instagram probe: `/v19.0/{ig_business_account_id}?fields=id,username` then `/v19.0/{page_id}?fields=instagram_business_account` to verify linkage.
- Classify Meta error subcodes: 463/467 (session expired), 190 (invalid OAuth), 200 (permissions), 100 (param). Map to readable headlines + set `channel_integrations.status='expired'` for token issues (vs `error` for others).
- Persist `last_validation_at` separately from `last_health_check_at`.

### B. Send-side error classification + retry gating
Edit `supabase/functions/whatsapp-send/index.ts` + `messenger-send/index.ts`:
- After Graph error, parse `code`/`error_subcode`, set `wa_messages.delivery_status = 'permanently_failed'` for 190/463/467/200/10 (auth/permission), `'failed'` for 4/17/32/613 (rate limit) or 5xx (network).
- Store `error_code` (new optional column? — check schema first; if not present, prefix `error_message` with `[CODE:190]`).

Edit `src/components/conversations/ConversationThreadPanel.tsx` (`MessageBubble`):
- Show retry button only when `status === 'failed'`. For `permanently_failed`, show "Cannot retry — fix integration" with link to `/channel-integrations`.

### C. Inbound attachments for FB/IG
Edit `supabase/functions/messenger-webhook/index.ts`:
- When `messaging.message.attachments[0]` exists: take first attachment, fetch URL with page token, upload to `whatsapp-media` bucket as `inbound/<conv>/<uuid>.<ext>`, persist `media_url`/`media_type`/`media_mime_type`/`media_filename` on the `wa_messages` row.

### D. FB/IG delivery + read receipts
Edit `supabase/functions/messenger-webhook/index.ts`:
- Handle `messaging.delivery.mids[]` → `update wa_messages set delivery_status='delivered', delivered_at=now() where external_message_id in (...)`.
- Handle `messaging.read.watermark` → mark all messages with `created_at <= watermark` as `read`.

### E. Channel capability guards (composer)
Edit `src/components/conversations/ConversationThreadPanel.tsx`:
- Add `CHANNEL_CAPS` map: WA = images+docs+audio, Messenger = images+docs, Instagram = images only.
- Filter `accept` attribute on file input by current `conversation.channel`.
- Disable paperclip with tooltip "Attachments not supported on this channel" if no caps.
- For non-WA channels, narrow MIME validation accordingly with clear toast.

### F. Token-expired banner
Edit `src/components/conversations/ConversationReliabilityStrip.tsx` (already reads `useIntegrationStatus`):
- When `status === 'expired'`, render an amber banner "Access token expired — replies will fail. Update token in Channel Integrations" with link.

Edit `src/components/admin/IntegrationHealthStrip.tsx`:
- Add a per-channel row (WA / FB / IG) with status pill (healthy / expired / error / disabled / not configured / webhook pending), last inbound timestamp, last error short text. Reuse `useChannelHealth` data + extend with `lastOutboundByChannel` (one extra query on `wa_messages` grouped by channel).

### G. Conversation matching documentation comment
Edit `supabase/functions/messenger-webhook/index.ts`:
- Add a code comment + assertion that lookup is `channel + external_user_id`. Already correct — comment only, no logic change.

## Files touched (all edits, no new files)
- `supabase/functions/channel-health-check/index.ts` — strict per-channel validation + expiry classification
- `supabase/functions/whatsapp-send/index.ts` — error code classification → `permanently_failed`
- `supabase/functions/messenger-send/index.ts` — same classification + persist permanent vs transient
- `supabase/functions/messenger-webhook/index.ts` — inbound attachments + delivery/read receipts + comment
- `src/components/conversations/ConversationThreadPanel.tsx` — channel capability map, paperclip gating, retry gating on `permanently_failed`
- `src/components/conversations/ConversationReliabilityStrip.tsx` — token-expired banner
- `src/components/admin/IntegrationHealthStrip.tsx` — per-channel status row
- `src/hooks/useChannelHealth.ts` — add `lastOutboundByChannel` aggregate

## Out of scope (explicit, per user)
- New tables, new pages, new inbox systems
- Auto-retry scheduler (manual retry only)
- Multi-attachment per message / voice notes for FB/IG
- Cosmetic polish, demo seed
- Token auto-refresh (Meta long-lived page tokens require manual rotation; we surface expiry, admin re-pastes)

## Acceptance after this lands
1–17 of the user's list all satisfied:
- Test Connection now actually validates token↔WABA / token↔page / page↔IG linkage and detects expired tokens with structured cause
- Inbound FB/IG media renders in bubbles
- Outbound FB/IG messages transition through delivered/read
- Permanent-failure messages no longer offer pointless retry; admin sees integration link
- Composer hides paperclip on channels without media support
- Per-channel status row visible with token-expired banner inside the inbox
