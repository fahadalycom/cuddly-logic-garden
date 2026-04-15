---
name: System Settings Admin Panel
description: Admin-managed system_settings table for API credentials, AI config, feature toggles — editable from Settings page
type: feature
---
## system_settings table
- Key-value config store: key (unique), value, category, description, is_secret
- Categories: whatsapp_api, whatsapp_ai, whatsapp_general, general, integrations
- Admin-only full CRUD; staff can view non-secret settings only
- Edge functions read from system_settings first, fallback to env vars

## Settings Page Integration
- "All Settings" tab (admin-only) via SystemSettingsManager component
- WhatsAppApiSettings: admin can edit/save API credentials inline
- WhatsAppAiSettings: admin can toggle AI on/off, select model, set auto-send, add custom prompt
- useSystemSettings hook for CRUD operations on settings

## Edge Function Updates
- whatsapp-send, whatsapp-webhook, whatsapp-ai-respond all use getSettingValue() helper
- Reads from DB first, falls back to Deno.env if DB value empty
