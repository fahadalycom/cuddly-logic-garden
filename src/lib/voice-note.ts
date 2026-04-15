/**
 * Voice note normalization — lightweight, no WASM needed.
 * Checks if the blob is already OGG/OPUS; if not, sends it as-is
 * with the correct mime type (WhatsApp accepts OGG and the backend
 * uploads with the real mime type).
 */

const PREFERRED_MIME = "audio/ogg;codecs=opus";

async function hasOggOpusSignature(blob: Blob) {
  const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const header = new TextDecoder().decode(bytes);
  return header.includes("OggS") && header.includes("OpusHead");
}

function getExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

export async function normalizeVoiceNote(blob: Blob, mimeType: string, _durationSecs?: number) {
  if (blob.size === 0) {
    throw new Error("Empty voice note");
  }

  // If already OGG/OPUS, re-wrap with correct mime
  if (await hasOggOpusSignature(blob)) {
    return {
      blob: new Blob([await blob.arrayBuffer()], { type: PREFERRED_MIME }),
      mimeType: PREFERRED_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  }

  // Send as-is with the actual format — the backend will upload
  // with the real mime type to WhatsApp
  const ext = getExtension(mimeType);
  const cleanMime = mimeType.split(";")[0].trim(); // e.g. "audio/webm"

  return {
    blob: new Blob([await blob.arrayBuffer()], { type: cleanMime }),
    mimeType: cleanMime,
    filename: `voice-${Date.now()}.${ext}`,
  };
}
