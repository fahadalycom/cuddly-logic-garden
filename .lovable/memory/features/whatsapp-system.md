---
name: WhatsApp Business API Integration
description: Full WhatsApp system with multi-agent chat, AI auto-response, queue management, Supabase Storage media, notifications, reply/reactions, tags, notes, search
type: feature
---
## Architecture
- **Edge Functions**: whatsapp-webhook (receives Meta messages), whatsapp-send (sends via Meta API), whatsapp-ai-respond (Gemini AI), whatsapp-queue-manager, whatsapp-media (Supabase Storage upload/download proxy)
- **Media Storage**: Supabase Storage bucket `whatsapp-media`. Text in Supabase tables, media files in Storage.
- **Media URL format**: `wa_messages.media_url` stores storage object keys like `1234-abc.jpg`, NOT full URLs.
- **Lazy Loading**: Media renders as placeholder with "Click to load" button. On click, fetches via `whatsapp-media?key=...` proxy. In-memory blob cache (`Map<string, string>`) prevents re-fetches.
- **File Upload**: Paperclip button → hidden file input → base64 → whatsapp-media POST → storage key → whatsapp-send.
- **Voice Notes**: Always OGG/OPUS format via `src/lib/voice-note.ts`. WebM→OGG remuxing in browser. No FFmpeg dependency.
- **Optimistic UI**: Messages appear instantly with `_sending` status, replaced by real data from API response. Deduplication via `messageIdsRef`.
- **Secrets**: META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_ID, META_WEBHOOK_VERIFY_TOKEN, LOVABLE_API_KEY
- **Webhook URL**: `https://kttjzcchajxxntxivldh.supabase.co/functions/v1/whatsapp-webhook`
- **Realtime**: wa_conversations, wa_messages, wa_queue, wa_conversation_tags, wa_internal_notes tables added to supabase_realtime publication.

## New Features (v2)
- **Reply/Quote**: `reply_to_message_id` column on wa_messages. UI shows quoted message above reply.
- **Emoji Reactions**: `reactions` jsonb column on wa_messages. Quick picker with 6 emojis on hover.
- **Conversation Tags**: `wa_conversation_tags` table with color-coded labels (blue/green/red/amber/purple/pink).
- **Internal Notes**: `wa_internal_notes` table for agent-only private notes on conversations.
- **Browser Notifications**: `useNotifications` hook with push notifications + sound alerts. Configurable via bell icon dropdown.
- **Message Search**: Global search across all conversations via `MessageSearch` component.
- **Quick Replies**: Type `/` in input to trigger template autocomplete menu.
- **Contact Info Panel**: Right sidebar showing client details, orders, subscriptions, tags, and notes.
- **Message Animations**: fade-in + slide-in-from-bottom on new messages.
