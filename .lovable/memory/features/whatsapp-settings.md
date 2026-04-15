---
name: WhatsApp Settings Integration
description: All WhatsApp features controllable from Settings page - API config, AI settings, agent management, notifications, chat themes
type: feature
---
## Settings Page WhatsApp Tabs
Settings page (`/settings`) now includes WhatsApp configuration tabs alongside product settings:

1. **WA API** (`WhatsAppApiSettings`) — Shows webhook URL, Meta API credential status (token, phone ID, verify token)
2. **AI** (`WhatsAppAiSettings`) — AI auto-response stats, model info (Gemini 2.5 Flash), feature list
3. **Agents** (`WhatsAppAgentSettings`, admin-only) — Wraps `AgentConfigPanel` for availability, chat limits, daily quotas
4. **Alerts** (`WhatsAppNotificationSettings`) — Browser permission, push notifications, sound alerts toggles
5. **Theme** (`WhatsAppThemeSettings`) — 6 chat themes (default, WhatsApp, Telegram, Purple, Amber, Rose) stored in localStorage as `wa_chat_theme`

## Component files
- `src/components/settings/WhatsAppApiSettings.tsx`
- `src/components/settings/WhatsAppAiSettings.tsx`
- `src/components/settings/WhatsAppAgentSettings.tsx`
- `src/components/settings/WhatsAppNotificationSettings.tsx`
- `src/components/settings/WhatsAppThemeSettings.tsx`
