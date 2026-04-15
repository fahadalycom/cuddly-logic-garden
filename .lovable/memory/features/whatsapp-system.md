---
name: WhatsApp Business API Integration
description: Full WhatsApp system with multi-agent chat, AI auto-response, queue management, and Supabase Storage media with lazy loading
type: feature
---
## Architecture
- **Edge Functions**: whatsapp-webhook (receives Meta messages), whatsapp-send (sends via Meta API), whatsapp-ai-respond (Gemini AI), whatsapp-queue-manager, whatsapp-media (Supabase Storage upload/download proxy)
- **Media Storage**: Supabase Storage bucket `whatsapp-media`. Text in Supabase tables, media files in Storage.
- **Media URL format**: `wa_messages.media_url` stores storage object keys like `1234-abc.jpg`, NOT full URLs.
- **Lazy Loading**: Media renders as placeholder with "Click to load" button. On click, fetches via `whatsapp-media?key=...` proxy. In-memory blob cache (`Map<string, string>`) prevents re-fetches.
- **File Upload**: Paperclip button → hidden file input → base64 → whatsapp-media POST → storage key → whatsapp-send.
- **Voice Notes**: Always OGG/OPUS format via `src/lib/voice-note.ts`. No FFmpeg dependency.
- **Optimistic UI**: Messages appear instantly with `_sending` status, replaced by real data from API response. Deduplication via `messageIdsRef`.
- **Secrets**: META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_ID, META_WEBHOOK_VERIFY_TOKEN, LOVABLE_API_KEY
- **Webhook URL**: `https://kttjzcchajxxntxivldh.supabase.co/functions/v1/whatsapp-webhook`
- **Realtime**: wa_conversations, wa_messages, wa_queue tables added to supabase_realtime publication.
