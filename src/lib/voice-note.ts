import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const OUTPUT_MIME = "audio/ogg;codecs=opus";
// Use the single-threaded (umd) build — does NOT require SharedArrayBuffer
const FFMPEG_CORE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";
const FFMPEG_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      // Single-threaded load — no workerURL, so no SharedArrayBuffer needed
      await ffmpeg.load({
        coreURL: await toBlobURL(FFMPEG_CORE_URL, "text/javascript"),
        wasmURL: await toBlobURL(FFMPEG_WASM_URL, "application/wasm"),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return ffmpegLoadPromise;
}

function hasOggOpusSignature(buf: Uint8Array): boolean {
  if (buf.length < 36) return false;
  // OggS magic at byte 0
  const hasOgg =
    buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53;
  if (!hasOgg) return false;
  // Search for "OpusHead" in the first 64 bytes
  const searchEnd = Math.min(buf.length, 64);
  const needle = [0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]; // "OpusHead"
  for (let i = 0; i <= searchEnd - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (buf[i + j] !== needle[j]) { found = false; break; }
    }
    if (found) return true;
  }
  return false;
}

function getInputExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm"; // safe default for browser audio
}

export async function normalizeVoiceNote(
  blob: Blob,
  mimeType: string
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const rawBytes = new Uint8Array(await blob.arrayBuffer());

  // Already valid OGG/OPUS — just re-wrap with correct MIME
  if (hasOggOpusSignature(rawBytes)) {
    return {
      blob: new Blob([rawBytes], { type: OUTPUT_MIME }),
      mimeType: OUTPUT_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  }

  if (!mimeType.startsWith("audio/")) {
    throw new Error("Invalid voice note format");
  }

  console.log(`[voice-note] Converting ${mimeType} (${rawBytes.length} bytes) → OGG/OPUS`);

  const ffmpeg = await getFFmpeg();
  const inputName = `input.${getInputExtension(mimeType)}`;
  const outputName = `output.ogg`;

  await ffmpeg.writeFile(inputName, await fetchFile(blob));

  try {
    const exitCode = await ffmpeg.exec([
      "-i", inputName,
      "-vn",                   // no video
      "-map_metadata", "-1",   // strip metadata
      "-ac", "1",              // mono
      "-ar", "48000",          // 48kHz — required for OPUS
      "-c:a", "libopus",
      "-b:a", "32k",
      "-application", "voip",
      "-frame_duration", "20", // 20ms frames — WhatsApp standard
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg conversion failed with exit code ${exitCode}`);
    }

    const data = await ffmpeg.readFile(outputName);
    const outputBytes =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : new Uint8Array(data as ArrayBuffer);

    if (!hasOggOpusSignature(outputBytes)) {
      throw new Error("Conversion output is not valid OGG/OPUS");
    }

    console.log(`[voice-note] Conversion successful: ${outputBytes.length} bytes`);

    return {
      blob: new Blob([outputBytes], { type: OUTPUT_MIME }),
      mimeType: OUTPUT_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
  }
}
