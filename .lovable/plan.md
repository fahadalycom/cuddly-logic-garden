
## Channel Integrations Admin Page

Build a dedicated admin page at `/admin/channels` that controls Meta WhatsApp Cloud API, Facebook Messenger, and Instagram Messaging connections. Each channel is independent with its own credentials, health snapshot, and lifecycle controls. This is a control center only — chat rendering stays in the existing Conversations module.

### 1. Database (one new migration)

New table `channel_integrations` (one row per channel type):

```text
id              uuid pk
channel_type    enum: 'whatsapp' | 'messenger' | 'instagram'  (unique)
enabled         boolean        default false
status          enum: 'not_configured' | 'healthy' | 'warning' | 'error' | 'disabled'
config          jsonb          (non-secret IDs: app_id, page_id, phone_number_id, ig_business_id, business_account_id)
secrets_set     jsonb          (booleans: { app_secret: true, access_token: true, ... } — never store actual secrets here)
verify_token    text           (webhook verify token, treated as secret-ish but readable to admin)
webhook_url     text           generated, read-only
last_health_check_at  timestamptz
last_inbound_at       timestamptz
last_outbound_at      timestamptz
last_success_at       timestamptz
last_error            text
last_error_at         timestamptz
last_error_field      text     (which field/area likely caused error)
created_at, updated_at
```

- RLS: admins full CRUD; staff read-only.
- Actual secret values stay in `system_settings` (existing pattern, `is_secret = true`) keyed per channel: `meta_whatsapp_token`, `meta_messenger_page_token`, `meta_messenger_app_secret`, `meta_instagram_token`, etc. Seeds 3 rows on migration (one per channel, `not_configured`).
- Add to `automation_logs`-style trail: reuse `audit_logs` for save/test/enable/disable events.

### 2. Edge function: `channel-health-check`

Single function, takes `{ channel_type, action }` where action is `test_connection | refresh_health | clear_error`. Performs:
- WhatsApp: `GET graph.facebook.com/v19.0/{phone_id}?fields=verified_name,quality_rating` with bearer token.
- Messenger: `GET graph.facebook.com/v19.0/{page_id}?fields=name,id` with page token.
- Instagram: `GET graph.facebook.com/v19.0/{ig_business_id}?fields=username,name` with token.

Updates `channel_integrations` row with `status`, `last_health_check_at`, `last_success_at`, or `last_error` + `last_error_field`. Returns structured result for the UI.

### 3. Frontend

**Route**: `/admin/channels` mounted in `AppLayout` (admin-only via existing `RoleGate`).

**Sidebar**: new item under **Admin** group → "Channel Integrations" (icon: `Plug` or `Radio`).

**Page layout** (`src/pages/ChannelIntegrations.tsx`):
- `PageHeader` with title + subtitle.
- Top status strip: 3 mini cards showing each channel's current status badge + last health time.
- `Tabs` with 3 tabs: WhatsApp / Messenger / Instagram, each rendering one shared `<ChannelIntegrationCard channel="..." />`.

**Component** `src/components/admin/ChannelIntegrationCard.tsx` (reused for all 3 channels, schema-driven):
- Header: icon, channel name, big status badge (healthy=green, warning=amber, error=red, not_configured=muted), enable/disable `Switch`.
- Section A — **Configuration form** (zod + react-hook-form):
  - WhatsApp: `app_id`, `app_secret` (masked), `access_token` (masked), `verify_token`, `phone_number_id`, `whatsapp_business_account_id`.
  - Messenger: `app_id`, `app_secret` (masked), `page_access_token` (masked), `verify_token`, `page_id`.
  - Instagram: `app_id`, `app_secret` (masked), `access_token` (masked), `verify_token`, `instagram_business_account_id`, `connected_page_id`.
  - Masked fields use show/hide toggle and only display `••••••` after save (never re-rendered).
  - Webhook callback URL displayed read-only with copy button (per channel: `…/functions/v1/whatsapp-webhook`, `…/functions/v1/messenger-webhook` placeholder, `…/functions/v1/instagram-webhook` placeholder — endpoints can be wired later).
  - Buttons: **Save Configuration**, **Test Connection**, **Reconnect** (forces full re-test + clears cached status), **Clear Error**.
- Section B — **Health & telemetry** grid (read-only):
  - Connection status, Webhook status, Token status, Config completeness (computed from required fields), Last inbound, Last outbound, Last successful API call, Last successful webhook event, Last health check, Last error (with field hint).
- Section C — **Error alert** (only when `last_error`): destructive `Alert` with channel-specific message, the field hint (e.g. "access_token likely invalid"), and dismiss → calls `clear_error`.

**Schema/data layer** `src/lib/channel-integrations.ts`:
- Per-channel field schemas (zod) + required-field lists for completeness %.
- `loadIntegration(channel)`, `saveIntegration(channel, values)` (writes config to table + secrets to `system_settings`), `testConnection(channel)`, `setEnabled(channel, bool)`, `clearError(channel)`.

**Hook** `src/hooks/useChannelIntegration.ts`: wraps the lib + React Query for fetch/refresh, exposes `{ integration, loading, saving, testing, save, test, toggle, clearError, reconnect }`.

### 4. UX & safety
- All write actions guarded by existing `useSubmitGuard` to prevent double clicks.
- Toasts on save / test success / test failure.
- Status colors mirror existing `StatusBadge` palette already used app-wide.
- Empty / not_configured state shows a muted "Not configured yet" banner with CTA pointing at the form.
- Non-admin users hitting `/admin/channels` see read-only health view; form inputs disabled.

### 5. Files

**Created**
- `supabase/migrations/<ts>_channel_integrations.sql` — table, enums, RLS, seed rows.
- `supabase/functions/channel-health-check/index.ts` — test/health endpoint.
- `src/pages/ChannelIntegrations.tsx`
- `src/components/admin/ChannelIntegrationCard.tsx`
- `src/components/admin/ChannelStatusStrip.tsx`
- `src/lib/channel-integrations.ts`
- `src/hooks/useChannelIntegration.ts`

**Edited**
- `src/App.tsx` — add `/admin/channels` route under `AppLayout`.
- `src/components/layout/AppSidebar.tsx` — add nav item under Admin.
- `supabase/config.toml` — register the new edge function (default `verify_jwt = false` is fine; admin auth enforced via service-role check inside).

### 6. Out of scope (explicit)
- Actually subscribing/handling Messenger + Instagram webhook events — endpoints are stubs, the existing `whatsapp-webhook` keeps working unchanged.
- Routing inbound non-WhatsApp messages into Conversations — that is a follow-up step.
- OAuth flows with Meta's Login for Business — manual token entry only this round.
