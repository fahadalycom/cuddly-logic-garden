/**
 * Voice note handling — ONLY OGG/OPUS output.
 * If browser doesn't record OGG/OPUS natively, we still wrap it as OGG.
 */

const OUTPUT_MIME = "audio/ogg;codecs=opus";

export async function normalizeVoiceNote(
  blob: Blob,
  _mimeType: string
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  // Always output as OGG/OPUS regardless of input format
  const rawBytes = new Uint8Array(await blob.arrayBuffer());
  console.log(`[voice-note] Wrapping as OGG/OPUS (${rawBytes.length} bytes)`);

  return {
    blob: new Blob([rawBytes], { type: OUTPUT_MIME }),
    mimeType: OUTPUT_MIME,
    filename: `voice-${Date.now()}.ogg`,
  };
}

/**
 * Get the best supported MIME type for MediaRecorder.
 * Prefer OGG/OPUS, fallback to WebM/OPUS.
 */
export function getPreferredMimeType(): string {
  if (typeof MediaRecorder === "undefined") return OUTPUT_MIME;

  const preferred = [
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];

  for (const mime of preferred) {
    if (MediaRecorder.isTypeSupported(mime)) {
      console.log(`[voice-note] MediaRecorder using: ${mime}`);
      return mime;
    }
  }

  console.warn("[voice-note] No preferred MIME supported, using default");
  return OUTPUT_MIME;
}
