
Permanent fix plan for the WhatsApp send failure:

## Diagnosis
The error is real: Meta is rejecting the WhatsApp access token because it expired on 15-Apr-26.

But the deeper app issue is why this keeps happening even after configuration updates:
- `channel-health-check` already reads the newer WhatsApp token key: `meta_whatsapp_access_token`
- `whatsapp-send`, `whatsapp-webhook`, and `whatsapp-ai-respond` still read older legacy keys like:
  - `meta_whatsapp_token`
  - `meta_whatsapp_phone_id`
- the Channel Integrations page saves WhatsApp config in a different place:
  - token → `meta_whatsapp_access_token`
  - phone number id → `channel_integrations.config.phone_number_id`
  - verify token → `channel_integrations.verify_token`

So the system currently has multiple sources of truth. Result:
- Test Connection can pass against one token
- actual message sending can still use an old expired token
- webhook verification can use a different verify token again

That is the real root cause to resolve permanently.

## What I will change
### 1) Unify WhatsApp credential resolution
Use one canonical WhatsApp config source across all live paths:
- access token: `meta_whatsapp_access_token`
- phone number id: `channel_integrations.config.phone_number_id`
- verify token: `channel_integrations.verify_token`

Update these functions to use the same resolver:
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-ai-respond/index.ts`

### 2) Keep safe fallback only for migration
Add fallback to old legacy keys only if canonical values are missing, so existing setups do not break during rollout:
- `meta_whatsapp_token`
- `meta_whatsapp_phone_id`
- `meta_webhook_verify_token`

This avoids downtime while eliminating the stale-token trap.

### 3) Fix admin config duplication
Update the WhatsApp settings/admin flow so it no longer behaves like a separate conflicting config source:
- make `src/components/settings/WhatsAppApiSettings.tsx` use the same canonical values as Channel Integrations
- or explicitly turn it into a read-only mirror of the Channel Integrations WhatsApp configuration

This prevents future “I updated the token but send still fails” situations.

### 4) Improve expired-token handling everywhere
When Meta returns token/session expiry:
- keep message state as permanent failure
- show exact reason clearly in Conversations
- keep the token-expired banner in channel status
- ensure Channel Integrations shows the real error and the affected field

### 5) Verify webhook consistency
Make WhatsApp webhook verification read the same verify token source used by the admin UI, so inbound setup cannot silently drift.

## Files to update
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-ai-respond/index.ts`
- `src/components/settings/WhatsAppApiSettings.tsx`
- possibly a small shared helper pattern inside the affected edge functions
- keep `supabase/functions/channel-health-check/index.ts` aligned with the same canonical keys if needed

## Important reality
The current token is already expired, so one admin action is still required once:
- replace the expired WhatsApp token with a fresh valid one

The permanent code fix is:
- the app will then use that new token everywhere consistently
- no hidden old token will continue breaking sends
- future expiry will surface clearly instead of failing through mixed config sources

## Expected result after implementation
- one WhatsApp token source for send, test, webhook, and AI auto-send
- one phone number id source
- one verify token source
- no stale legacy token causing hidden send failures
- expired token errors shown clearly and consistently
- replacing the token once will actually fix sending system-wide
