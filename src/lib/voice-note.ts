/**
 * Simplified voice note handling.
 * - If browser records OGG/OPUS natively → use as-is (no conversion needed)
 * - Otherwise (Safari WebM etc.) → send raw format, WhatsApp API handles it server-side
 * - No FFmpeg dependency needed
 */

const OUTPUT_MIME = "audio/ogg;codecs=opus";

function hasOggOpusSignature(buf: Uint8Array): boolean {
  if (buf.length < 36) return false;
  const hasOgg = buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53;
  if (!hasOgg) return false;

  const searchEnd = Math.min(buf.length, 64);
  const needle = [0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64];
  for (let i = 0; i <= searchEnd - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (buf[i + j] !== needle[j]) { found = false; break; }
    }
    if (found) return true;
  }
  return false;
}

function getExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

export async function normalizeVoiceNote(
  blob: Blob,
  mimeType: string
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const rawBytes = new Uint8Array(await blob.arrayBuffer());

  // If it's already OGG/OPUS, use as-is
  if (hasOggOpusSignature(rawBytes)) {
    console.log(`[voice-note] Already OGG/OPUS (${rawBytes.length} bytes), using as-is`);
    return {
      blob: new Blob([rawBytes], { type: OUTPUT_MIME }),
      mimeType: OUTPUT_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  }

  // For any other format (WebM, MP4, etc.), send as-is
  // WhatsApp Cloud API accepts audio/webm and converts server-side
  const ext = getExtension(mimeType);
  const cleanMime = mimeType.split(";")[0].trim() || "audio/webm";
  console.log(`[voice-note] Using native format: ${cleanMime} (${rawBytes.length} bytes)`);

  return {
    blob: new Blob([rawBytes], { type: cleanMime }),
    mimeType: cleanMime,
    filename: `voice-${Date.now()}.${ext}`,
  };
}
