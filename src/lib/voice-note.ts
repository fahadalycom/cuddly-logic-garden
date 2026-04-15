import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const OUTPUT_MIME = "audio/ogg;codecs=opus";
const FFMPEG_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
        workerURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.worker.js`, "text/javascript"),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return ffmpegLoadPromise;
}

async function hasOggOpusSignature(blob: Blob) {
  const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const header = new TextDecoder().decode(bytes);
  return header.includes("OggS") && header.includes("OpusHead");
}

function getInputExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "bin";
}

export async function normalizeVoiceNote(blob: Blob, mimeType: string, durationSecs?: number) {
  if (await hasOggOpusSignature(blob)) {
    return {
      blob: new Blob([await blob.arrayBuffer()], { type: OUTPUT_MIME }),
      mimeType: OUTPUT_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  }

  if (!mimeType.startsWith("audio/")) {
    throw new Error("Invalid voice note format");
  }

  const ffmpeg = await getFFmpeg();
  const inputName = `input.${getInputExtension(mimeType)}`;
  const outputName = `output-${crypto.randomUUID()}.ogg`;

  await ffmpeg.writeFile(inputName, await fetchFile(blob));

  // Build args — cap duration to avoid FFmpeg misreading WebM length
  const args = ["-i", inputName, "-vn", "-map_metadata", "-1", "-ac", "1",
    "-c:a", "libopus", "-b:a", "32k", "-application", "voip"];
  if (durationSecs && durationSecs > 0) {
    // Add 1 second buffer to avoid cutting off
    args.push("-t", String(Math.ceil(durationSecs) + 1));
  }
  args.push(outputName);

  try {
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const outputBytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    const normalizedBlob = new Blob([outputBytes], { type: OUTPUT_MIME });

    if (!(await hasOggOpusSignature(normalizedBlob))) {
      throw new Error("Voice note conversion failed");
    }

    return {
      blob: normalizedBlob,
      mimeType: OUTPUT_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
}
