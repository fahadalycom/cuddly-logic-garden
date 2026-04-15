

# Fix WhatsApp System — Complete Diagnosis & Plan

## Root Causes Found

### 1. Expired WhatsApp Token (Primary blocker)
Edge function logs show:
```text
WhatsApp API error: {"error":{"message":"Error validating access token: Session has expired on Wednesday, 15-Apr-26 04:00:00 PDT."}}
```
This is why **nothing** delivers — not text, not voice, not media. Messages get saved to the database (207 response) but never reach the recipient.

### 2. No Optimistic UI Updates (Messages "disappear")
When you send a message, the UI does NOT immediately show it. It relies 100% on the Supabase realtime subscription to detect the new database row. If realtime has any delay or hiccup, the message appears to vanish. The input clears but no bubble shows.

### 3. Voice Note Conversion Fragility
FFmpeg WASM loads ~5MB of assets from CDN, requires `SharedArrayBuffer` (blocked by many CORS policies), and can silently hang. When it fails, the voice note never sends.

## Implementation Plan

### Step 1: Update the expired WhatsApp token
- Use the `add_secret` tool to request a fresh `META_WHATSAPP_TOKEN` from you
- This alone will restore all send/receive functionality

### Step 2: Add optimistic message rendering
- When `handleSend` is called, immediately add the message to the local `messages` state with a temporary ID and `sending` status
- Show a spinner/clock icon on the bubble while sending
- When the edge function responds, update the message with real data from the response
- If it fails, mark the bubble as "failed" with a retry option
- This prevents the "disappearing message" problem entirely

### Step 3: Simplify voice note handling
- Skip FFmpeg conversion entirely when the browser already records in a WhatsApp-compatible format (`audio/ogg;codecs=opus`)
- Only attempt conversion for browsers that don't support OGG natively (Safari → WebM)
- For the fallback, send WebM directly — WhatsApp Cloud API accepts `audio/webm` too (it converts server-side)
- Remove the fragile FFmpeg WASM dependency

### Step 4: Harden realtime subscriptions
- Add error handling to the realtime channel subscriptions
- Deduplicate messages (realtime INSERT may arrive after the optimistic message is already shown)
- Auto-reconnect on subscription drops

## Files to Update
- `src/pages/WhatsApp.tsx` — optimistic updates in `handleSendMessage`, dedupe in realtime handler
- `src/components/whatsapp/ChatWindow.tsx` — show sending/failed states on bubbles, simplify voice recording
- `src/lib/voice-note.ts` — simplify to skip conversion when possible, fall back to raw format
- `supabase/functions/whatsapp-send/index.ts` — minor: accept `audio/webm` cleanly
- Secret update: `META_WHATSAPP_TOKEN`

## Expected Result
- Messages appear instantly in UI when sent (optimistic)
- Messages deliver to WhatsApp recipients (fresh token)
- Voice notes record and send reliably without FFmpeg hangs
- Failed sends show clearly with retry option
- Realtime sync stays stable

