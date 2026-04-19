
The error `(#100) Tried accessing nonexisting field (whatsapp_business_account)` means our WhatsApp probe is asking Graph for a field that doesn't exist on `/v19.0/{phone_number_id}`. Looking at `channel-health-check/index.ts`, we request:

```
fields=verified_name,quality_rating,display_phone_number,messaging_limit_tier,whatsapp_business_account
```

The correct field is `whatsapp_business_account_id` (or just omit it — phone numbers in v19+ don't all expose it). Meta returns code #100 when even one requested field is invalid for that node, which our classifier then misreports as "Phone Number ID does not exist".

## Fix

**Edit `supabase/functions/channel-health-check/index.ts` — `probeWhatsApp`**

1. Change the phone-number probe field list to only universally-valid fields:
   `fields=verified_name,quality_rating,display_phone_number,code_verification_status,platform_type`
2. Discover the linked WABA via the dedicated endpoint instead of as a sub-field:
   `GET /v19.0/{phone_number_id}?fields=...` for profile, then `GET /v19.0/{phone_number_id}/whatsapp_business_profile` is optional; for WABA linkage use `GET /v19.0/{waba_id}` only when `whatsapp_business_account_id` is configured.
3. Drop the `linkedWaba` mismatch check (we no longer fetch it from the phone node). Keep the explicit WABA reachability check when `wabaId` is set.
4. Improve error #100 classifier: when message contains `nonexisting field`, set `field='access_token'` with hint "Graph API field unsupported — please retry; the system has been updated" so legacy cached errors stay readable.

## Files
- `supabase/functions/channel-health-check/index.ts` — fix WhatsApp probe field list + remove sub-field WABA dependency

## Verification
- Deploy `channel-health-check`
- Call Test Connection on WhatsApp via the UI; expect `ok: true` with `verified_name` and `quality_rating` surfaced.

No new tables, no schema change, no new files. One edge function edit.
