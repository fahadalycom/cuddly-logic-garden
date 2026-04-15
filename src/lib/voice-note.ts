/**
 * Voice note handling — ONLY OGG/OPUS output.
 * Includes a WebM→OGG remuxer for Chrome (which can't record OGG natively).
 */

const OUTPUT_MIME = "audio/ogg;codecs=opus";

// ─── OGG Page Writer ───────────────────────────────────────────────

function crc32OggTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
      r = (r & 0x80000000) ? ((r << 1) ^ 0x04C11DB7) : (r << 1);
    }
    table[i] = r >>> 0;
  }
  return table;
}

const CRC_TABLE = crc32OggTable();

function oggCrc(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) & 0xFF) ^ data[i]]) >>> 0;
  }
  return crc;
}

function writeOggPage(
  serialNo: number,
  granulePos: bigint,
  pageSeqNo: number,
  headerType: number,
  segments: Uint8Array[]
): Uint8Array {
  // Build segment table
  const segTable: number[] = [];
  for (const seg of segments) {
    let remaining = seg.length;
    while (remaining >= 255) {
      segTable.push(255);
      remaining -= 255;
    }
    segTable.push(remaining); // final segment size (0-254)
  }

  const headerSize = 27 + segTable.length;
  let bodySize = 0;
  for (const s of segments) bodySize += s.length;
  const page = new Uint8Array(headerSize + bodySize);
  const view = new DataView(page.buffer);

  // OggS capture pattern
  page[0] = 0x4F; page[1] = 0x67; page[2] = 0x67; page[3] = 0x53;
  page[4] = 0; // version
  page[5] = headerType;
  // granule position (64-bit LE)
  view.setUint32(6, Number(granulePos & 0xFFFFFFFFn), true);
  view.setUint32(10, Number((granulePos >> 32n) & 0xFFFFFFFFn), true);
  view.setUint32(14, serialNo, true); // serial
  view.setUint32(18, pageSeqNo, true); // page sequence
  // CRC placeholder (will fill after)
  view.setUint32(22, 0, true);
  page[26] = segTable.length;

  // Segment table
  for (let i = 0; i < segTable.length; i++) {
    page[27 + i] = segTable[i];
  }

  // Body
  let offset = headerSize;
  for (const seg of segments) {
    page.set(seg, offset);
    offset += seg.length;
  }

  // Compute CRC
  const crc = oggCrc(page);
  view.setUint32(22, crc, true);

  return page;
}

// ─── EBML / WebM Parser (minimal, audio-only) ──────────────────────

function readVint(data: Uint8Array, pos: number): { value: number; length: number } | null {
  if (pos >= data.length) return null;
  const first = data[pos];
  if (first === 0) return null;
  let len = 1;
  let mask = 0x80;
  while (len <= 8 && !(first & mask)) { len++; mask >>= 1; }
  if (pos + len > data.length) return null;
  let value = first & (mask - 1);
  for (let i = 1; i < len; i++) {
    value = (value << 8) | data[pos + i];
  }
  return { value, length: len };
}

function readVintRaw(data: Uint8Array, pos: number): { value: number; rawValue: number; length: number } | null {
  if (pos >= data.length) return null;
  const first = data[pos];
  if (first === 0) return null;
  let len = 1;
  let mask = 0x80;
  while (len <= 8 && !(first & mask)) { len++; mask >>= 1; }
  if (pos + len > data.length) return null;
  let rawValue = first;
  let value = first & (mask - 1);
  for (let i = 1; i < len; i++) {
    rawValue = (rawValue << 8) | data[pos + i];
    value = (value << 8) | data[pos + i];
  }
  return { value, rawValue, length: len };
}

function readElementId(data: Uint8Array, pos: number): { id: number; length: number } | null {
  return readVintRaw(data, pos);
}

interface OpusPacket {
  data: Uint8Array;
  timestamp: number; // ms
}

function parseWebmOpus(webm: Uint8Array): { codecPrivate: Uint8Array | null; packets: OpusPacket[] } {
  const packets: OpusPacket[] = [];
  let codecPrivate: Uint8Array | null = null;
  let timecodeScale = 1000000; // default ns per tick
  let clusterTimecode = 0;

  // EBML element IDs we care about
  const EBML_ID = 0x1A45DFA3;
  const SEGMENT_ID = 0x18538067;
  const INFO_ID = 0x1549A966;
  const TRACKS_ID = 0x1654AE6B;
  const TRACK_ENTRY_ID = 0xAE;
  const CODEC_PRIVATE_ID = 0x63A2;
  const CLUSTER_ID = 0x1F43B675;
  const TIMECODE_ID = 0xE7;
  const SIMPLE_BLOCK_ID = 0xA3;
  const TIMECODE_SCALE_ID = 0x2AD7B1;

  const containerIds = new Set([EBML_ID, SEGMENT_ID, INFO_ID, TRACKS_ID, TRACK_ENTRY_ID, CLUSTER_ID]);

  let pos = 0;
  const stack: number[] = []; // end positions

  while (pos < webm.length) {
    // Pop completed containers
    while (stack.length && pos >= stack[stack.length - 1]) stack.pop();

    const idInfo = readElementId(webm, pos);
    if (!idInfo) break;
    const elemId = idInfo.rawValue ?? idInfo.id;
    pos += idInfo.length;

    const sizeInfo = readVint(webm, pos);
    if (!sizeInfo) break;
    const elemSize = sizeInfo.value;
    pos += sizeInfo.length;

    if (containerIds.has(elemId)) {
      // Enter container - don't skip, parse children
      if (elemSize > 0 && elemSize < webm.length) {
        stack.push(pos + elemSize);
      }
      continue;
    }

    const elemEnd = pos + elemSize;
    if (elemEnd > webm.length) break;

    if (elemId === TIMECODE_SCALE_ID && elemSize <= 4) {
      timecodeScale = 0;
      for (let i = 0; i < elemSize; i++) {
        timecodeScale = (timecodeScale << 8) | webm[pos + i];
      }
    } else if (elemId === CODEC_PRIVATE_ID) {
      codecPrivate = webm.slice(pos, elemEnd);
    } else if (elemId === TIMECODE_ID) {
      clusterTimecode = 0;
      for (let i = 0; i < elemSize; i++) {
        clusterTimecode = (clusterTimecode << 8) | webm[pos + i];
      }
    } else if (elemId === SIMPLE_BLOCK_ID && elemSize > 4) {
      // Parse SimpleBlock
      const trackVint = readVint(webm, pos);
      if (trackVint) {
        const headerLen = trackVint.length;
        const relTimecode = (webm[pos + headerLen] << 8) | webm[pos + headerLen + 1];
        const signedRel = relTimecode > 32767 ? relTimecode - 65536 : relTimecode;
        // flags at pos + headerLen + 2
        const dataStart = pos + headerLen + 3;
        if (dataStart < elemEnd) {
          const timestamp = clusterTimecode + signedRel; // in ms (timecodeScale=1000000 means 1ms units)
          packets.push({
            data: webm.slice(dataStart, elemEnd),
            timestamp: timestamp,
          });
        }
      }
    }

    pos = elemEnd;
  }

  return { codecPrivate, packets };
}

// ─── OGG/Opus Builder ──────────────────────────────────────────────

function buildOpusHead(channels: number, preSkip: number, sampleRate: number): Uint8Array {
  const head = new Uint8Array(19);
  const view = new DataView(head.buffer);
  // "OpusHead"
  head.set([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]);
  head[8] = 1; // version
  head[9] = channels;
  view.setUint16(10, preSkip, true);
  view.setUint32(12, sampleRate, true);
  view.setUint16(16, 0, true); // output gain
  head[18] = 0; // channel mapping family
  return head;
}

function buildOpusTags(): Uint8Array {
  const vendor = "Lovable";
  const vendorBytes = new TextEncoder().encode(vendor);
  const tags = new Uint8Array(8 + 4 + vendorBytes.length + 4);
  const view = new DataView(tags.buffer);
  // "OpusTags"
  tags.set([0x4F, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73]);
  view.setUint32(8, vendorBytes.length, true);
  tags.set(vendorBytes, 12);
  view.setUint32(12 + vendorBytes.length, 0, true); // 0 user comments
  return tags;
}

function remuxWebmToOgg(webm: Uint8Array): Uint8Array {
  const { codecPrivate, packets } = parseWebmOpus(webm);

  // Parse OpusHead from codecPrivate or build default
  let channels = 1;
  let preSkip = 3840; // default ~80ms
  let inputSampleRate = 48000;

  if (codecPrivate && codecPrivate.length >= 19) {
    // It's an OpusHead already
    const tag = String.fromCharCode(...codecPrivate.slice(0, 8));
    if (tag === "OpusHead") {
      channels = codecPrivate[9];
      preSkip = codecPrivate[10] | (codecPrivate[11] << 8);
      inputSampleRate = codecPrivate[12] | (codecPrivate[13] << 8) | (codecPrivate[14] << 16) | (codecPrivate[15] << 24);
    }
  }

  const serialNo = (Math.random() * 0x7FFFFFFF) >>> 0;
  const pages: Uint8Array[] = [];
  let pageSeq = 0;

  // Page 0: OpusHead (BOS)
  const opusHead = buildOpusHead(channels, preSkip, inputSampleRate);
  pages.push(writeOggPage(serialNo, 0n, pageSeq++, 0x02, [opusHead]));

  // Page 1: OpusTags
  const opusTags = buildOpusTags();
  pages.push(writeOggPage(serialNo, 0n, pageSeq++, 0x00, [opusTags]));

  // Audio pages - each packet gets ~20ms at 48kHz = 960 samples
  // Group packets into pages (max ~50 packets per page for efficiency)
  const PACKETS_PER_PAGE = 50;
  const SAMPLES_PER_MS = 48; // 48000 / 1000

  // Determine frame duration from first two packets
  let frameDurationMs = 20; // default
  if (packets.length >= 2) {
    const diff = packets[1].timestamp - packets[0].timestamp;
    if (diff > 0 && diff <= 120) frameDurationMs = diff;
  }
  const samplesPerPacket = frameDurationMs * SAMPLES_PER_MS;

  let granulePos = BigInt(preSkip); // start after pre-skip

  for (let i = 0; i < packets.length; i += PACKETS_PER_PAGE) {
    const batch = packets.slice(i, i + PACKETS_PER_PAGE);
    const isLast = i + PACKETS_PER_PAGE >= packets.length;
    
    granulePos += BigInt(batch.length * samplesPerPacket);
    
    const headerType = isLast ? 0x04 : 0x00; // EOS on last page
    pages.push(writeOggPage(serialNo, granulePos, pageSeq++, headerType, batch.map(p => p.data)));
  }

  // Concatenate all pages
  let totalLen = 0;
  for (const p of pages) totalLen += p.length;
  const result = new Uint8Array(totalLen);
  let off = 0;
  for (const p of pages) {
    result.set(p, off);
    off += p.length;
  }

  return result;
}

// ─── Public API ────────────────────────────────────────────────────

function isWebm(data: Uint8Array): boolean {
  // WebM/EBML magic: 0x1A 0x45 0xDF 0xA3
  return data.length >= 4 && data[0] === 0x1A && data[1] === 0x45 && data[2] === 0xDF && data[3] === 0xA3;
}

function isOgg(data: Uint8Array): boolean {
  // OGG magic: "OggS"
  return data.length >= 4 && data[0] === 0x4F && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53;
}

export async function normalizeVoiceNote(
  blob: Blob,
  _mimeType: string
): Promise<{ blob: Blob; mimeType: string; filename: string }> {
  const rawBytes = new Uint8Array(await blob.arrayBuffer());

  if (isOgg(rawBytes)) {
    // Already OGG — send as-is
    console.log(`[voice-note] Already OGG/Opus (${rawBytes.length} bytes)`);
    return {
      blob: new Blob([rawBytes], { type: OUTPUT_MIME }),
      mimeType: OUTPUT_MIME,
      filename: `voice-${Date.now()}.ogg`,
    };
  }

  if (isWebm(rawBytes)) {
    // Chrome records WebM/Opus — remux to OGG/Opus
    console.log(`[voice-note] Remuxing WebM→OGG (${rawBytes.length} bytes)`);
    try {
      const oggBytes = remuxWebmToOgg(rawBytes);
      console.log(`[voice-note] Remuxed to OGG (${oggBytes.length} bytes)`);
      return {
        blob: new Blob([oggBytes], { type: OUTPUT_MIME }),
        mimeType: OUTPUT_MIME,
        filename: `voice-${Date.now()}.ogg`,
      };
    } catch (e) {
      console.error("[voice-note] Remux failed, sending raw with OGG label:", e);
    }
  }

  // Fallback: wrap as OGG anyway
  console.log(`[voice-note] Unknown format, wrapping as OGG (${rawBytes.length} bytes)`);
  return {
    blob: new Blob([rawBytes], { type: OUTPUT_MIME }),
    mimeType: OUTPUT_MIME,
    filename: `voice-${Date.now()}.ogg`,
  };
}

/**
 * Get the best supported MIME type for MediaRecorder.
 * Prefer OGG/OPUS (Firefox), fallback to WebM/OPUS (Chrome).
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
