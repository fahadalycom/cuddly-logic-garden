
# Fix voice note delivery + WhatsApp-style player

## What I found
- The transport path is mostly working: recent backend logs show media upload + message send succeeding.
- The likely failure is **audio compatibility**, not basic sending:
  - the recorder prefers `audio/ogg;codecs=opus`, but if the browser cannot produce that natively it falls back to another format
  - the current code then **uploads those raw bytes while labeling them as OGG/OPUS**
  - that means WhatsApp can receive a file that claims to be `.ogg` even when the actual bytes are WebM/another codec, which is the classic reason voice notes appear locally but do not arrive/play correctly on the recipient side
- The current player also needs UX fixes:
  - no speed toggle
  - download action is not clearly separate from play
  - metadata for outgoing voice notes is not being preserved strongly enough

## Implementation plan
1. **Fix the recording pipeline**
   - Replace the “rename mime type and send” approach with a **real voice-note normalization flow**
   - Record audio, then ensure the final file is truly:
     - container: `.ogg`
     - codec: `opus`
   - Use:
     - native OGG/OPUS when the browser supports it
     - a browser-side WASM/polyfill encoder fallback when it does not
   - Before upload, validate the produced blob and stop with a toast error if conversion/validation fails

2. **Keep the existing storage architecture, but store proper metadata**
   - Continue saving non-text media in Cloudflare R2
   - Save the R2 key in `wa_messages.media_url`
   - Also pass/store:
     - `media_mime_type`
     - `media_filename`
   - This will let the UI distinguish true voice notes from generic audio files and keep downloads accurate

3. **Send voice notes through WhatsApp correctly**
   - Keep the direct media upload flow in `whatsapp-send`
   - Upload the validated OGG/OPUS file from R2 to WhatsApp Media API
   - Send it as `type: "audio"` using the uploaded media ID
   - Remove any fake mime assumptions and derive the outgoing upload from the actual stored file metadata

4. **Make failures explicit**
   - If recording conversion fails, show a clear error and do not send
   - If the uploaded R2 file is not valid OGG/OPUS, stop before WhatsApp send
   - Return clearer backend errors so the frontend can show “voice note failed” instead of silently appearing successful

5. **Upgrade the voice-note UI to feel like WhatsApp**
   - Update `VoiceNotePlayer` so:
     - play/pause is only for playback
     - waveform/progress stays in the center
     - **download becomes a separate button** on the message
     - speed toggle cycles like WhatsApp: `1x → 1.5x → 2x`
   - Keep lazy loading + cache behavior:
     - audio loads only on play/load/download
     - cached blob is reused for playback and download
   - Preserve progress display during playback

6. **Tighten the send contract between frontend and backend**
   - Extend the send flow so the frontend passes media metadata with voice notes
   - Update message insertion so outgoing audio messages store filename/mime consistently
   - This avoids mismatches between what the UI shows and what WhatsApp actually receives

## Files to update
- `src/components/whatsapp/ChatWindow.tsx`
- `src/components/whatsapp/VoiceNotePlayer.tsx`
- `src/pages/WhatsApp.tsx`
- `supabase/functions/whatsapp-send/index.ts`
- possibly `package.json` for an OGG/OPUS encoder/polyfill dependency

## Technical details
- Root fix: **do not fake `audio/ogg;codecs=opus` on non-OGG recordings**
- Final outbound voice-note file must be a real **OGG container with OPUS codec**
- No database migration is strictly required because `wa_messages` already has:
  - `media_filename`
  - `media_mime_type`
- I’ll reuse the current lazy-loading/media-cache pattern so storage reads stay optimized

## Expected result
After implementation:
- recorded voice notes will be converted/validated before send
- recipients will receive them properly in WhatsApp
- playback in the app will feel more like WhatsApp
- speed control will work
- download will be a separate action instead of sharing the play control
