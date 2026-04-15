---
name: WhatsApp Business API Integration
description: Full WhatsApp system with multi-agent chat, AI auto-response, queue management, and Cloudflare R2 media with lazy loading
type: feature
---
## Architecture
- **Edge Functions**: whatsapp-webhook (receives Meta messages), whatsapp-send (sends via Meta API), whatsapp-ai-respond (Gemini AI), whatsapp-queue-manager, whatsapp-media (R2 upload/download proxy)
- **Media Storage**: Cloudflare R2 via aws4fetch (proper AWS Signature V4). Text in Supabase, media in R2.
- **Media URL format**: `wa_messages.media_url` stores R2 object keys like `whatsapp/1234-abc.jpg`, NOT full URLs.
- **Lazy Loading**: Media renders as placeholder with "Click to load" button. On click, fetches via `whatsapp-media?key=...` proxy. In-memory blob cache (`Map<string, string>`) prevents re-fetches.
- **File Upload**: Paperclip button → hidden file input → base64 → whatsapp-media POST → R2 key → whatsapp-send.
- **Secrets**: META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_ID, META_WEBHOOK_VERIFY_TOKEN, CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, CLOUDFLARE_R2_BUCKET, LOVABLE_API_KEY
- **Webhook URL**: `https://kttjzcchajxxntxivldh.supabase.co/functions/v1/whatsapp-webhook`
- **Realtime**: wa_conversations, wa_messages, wa_queue tables added to supabase_realtime publication.
