

# Fix WhatsApp Media System — Cloudflare R2 + Lazy Loading

## Problem
1. **R2 upload is broken** — the `downloadAndUploadMedia` function uses a fake AWS4 auth header (just the credential prefix, no actual signature). R2's S3-compatible API requires proper AWS Signature V4.
2. **No media upload from chat UI** — agents can't send files/images/voice from the interface.
3. **Media auto-loads** — all images/videos/audio load immediately via `<img src>`, `<video src>`, etc., wasting R2 bandwidth.
4. **No send-side R2 upload** — when agent sends media, there's no upload path to R2.

## Solution

### 1. New Edge Function: `whatsapp-media` (handles R2 operations)
- **Upload endpoint** (`POST`): Accepts base64 file data + mime type, uploads to R2 using proper AWS Signature V4 (using `aws4fetch` library from esm.sh), returns the R2 object key (NOT a full URL).
- **Download/proxy endpoint** (`GET ?key=...`): Fetches file from R2 using signed request, returns the binary data with correct content-type. This acts as a proxy so R2 credentials stay server-side.
- Store only the R2 object key in `wa_messages.media_url` (e.g. `whatsapp/1234-abc.jpg`), not the full URL.

### 2. Fix `whatsapp-webhook` — Incoming Media
- Replace broken `downloadAndUploadMedia` to call the new `whatsapp-media` edge function for upload, or inline proper AWS4 signing using `aws4fetch`.
- Decision: Inline `aws4fetch` in webhook for efficiency (avoid extra function call). Import `AwsClient` from `https://esm.sh/aws4fetch@1.0.20`.
- Store R2 key in `media_url` field instead of full URL.

### 3. Fix `whatsapp-send` — Outgoing Media
- When agent sends media, the media is first uploaded via `whatsapp-media` edge function from the frontend, which returns the R2 key.
- The R2 key is stored in DB. For sending to WhatsApp API, construct a public/signed URL or use the proxy endpoint.

### 4. ChatWindow — Lazy Loading UI
Replace direct `<img src>`, `<video src>`, `<audio src>` with placeholder components:

- **`MediaPlaceholder`** component: Shows file type icon + size + "Click to load" button.
- On click, fetches media via `whatsapp-media?key={media_url}` edge function proxy, caches blob URL in component state.
- Once loaded, renders the actual `<img>`, `<video>`, `<audio>` with the blob URL.
- Use `Map<string, string>` in a React ref as a simple in-memory cache — if user navigates back, already-loaded media shows instantly.

### 5. ChatWindow — File Upload UI
- Add file input (hidden) triggered by the paperclip button.
- On file select: read as base64, call `whatsapp-media` upload endpoint, get R2 key back.
- Call `onSend(caption, r2Key, mediaType)` to send via WhatsApp.

### 6. Database — No Schema Changes
`wa_messages.media_url` already exists as `text`. We just change what we store (R2 key instead of full URL).

## Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/whatsapp-media/index.ts` | **Create** — R2 upload + proxy download |
| `supabase/functions/whatsapp-webhook/index.ts` | **Edit** — Fix `downloadAndUploadMedia` with proper AWS4 signing |
| `supabase/functions/whatsapp-send/index.ts` | **Edit** — Support R2 proxy URL for media sends to Meta API |
| `src/components/whatsapp/ChatWindow.tsx` | **Edit** — Add lazy media loading + file upload |
| `src/pages/WhatsApp.tsx` | **Edit** — Pass media upload handler |

## Technical Details

**AWS4 Signing for R2** (using `aws4fetch`):
```typescript
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
const r2 = new AwsClient({
  accessKeyId: Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY"),
  secretAccessKey: Deno.env.get("CLOUDFLARE_R2_SECRET_KEY"),
});
// PUT/GET to R2 endpoint with proper signing
```

**Lazy loading flow**:
```text
Message loads → shows placeholder (icon + filename + "Load")
User clicks → fetch(/whatsapp-media?key=whatsapp/123.jpg)
Edge function → signs request → fetches from R2 → streams back
Frontend → creates blob URL → renders media → caches in memory
```

**Media cache**: Simple `useRef(new Map<string, string>())` per ChatWindow instance. Clears when conversation changes.

