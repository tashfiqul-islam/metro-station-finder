/**
 * Reads the pixel size an image file declares in its own header (METRO-107). Only the formats the brand
 * assets use: PNG, ICO and WebP (lossy, lossless and extended). No decoding and no dependency; a header that
 * is truncated or not one of these formats gives null, so a caller fails closed.
 */
export interface ImageSize {
  readonly format: "png" | "ico" | "webp";
  /** One size per image in the file (an ICO holds several; the others hold one). */
  readonly sizes: readonly { readonly width: number; readonly height: number }[];
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCodePoint(...bytes.subarray(start, start + length));

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function png(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((byte, index) => bytes[index] === byte))
    return null;
  if (ascii(bytes, 12, 4) !== "IHDR") return null;
  const data = view(bytes);
  return { format: "png", sizes: [{ width: data.getUint32(16), height: data.getUint32(20) }] };
}

function ico(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 6) return null;
  const data = view(bytes);
  const count = data.getUint16(4, true);
  if (data.getUint16(0, true) !== 0 || data.getUint16(2, true) !== 1 || count === 0) return null;
  if (bytes.length < 6 + 16 * count) return null;
  const sizes: { width: number; height: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + 16 * index;
    // A stored 0 means 256.
    sizes.push({ width: data.getUint8(entry) || 256, height: data.getUint8(entry + 1) || 256 });
  }
  return { format: "ico", sizes };
}

function webp(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 25 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    return null;
  }
  const data = view(bytes);
  const chunk = ascii(bytes, 12, 4);
  // VP8 and VP8X read up to byte 29; VP8L up to byte 24.
  if (chunk !== "VP8L" && bytes.length < 30) return null;
  if (chunk === "VP8 ") {
    // Frame header: 3 tag bytes, the start code 9d 01 2a, then two 14-bit sizes.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return {
      format: "webp",
      sizes: [
        { width: data.getUint16(26, true) & 0x3fff, height: data.getUint16(28, true) & 0x3fff },
      ],
    };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits = data.getUint32(21, true);
    return {
      format: "webp",
      sizes: [{ width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }],
    };
  }
  if (chunk === "VP8X") {
    const size = (offset: number): number =>
      data.getUint8(offset) +
      (data.getUint8(offset + 1) << 8) +
      (data.getUint8(offset + 2) << 16) +
      1;
    return { format: "webp", sizes: [{ width: size(24), height: size(27) }] };
  }
  return null;
}

/** The declared size of a PNG, ICO or WebP file, or null when the header is not one of those. */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  return png(bytes) ?? ico(bytes) ?? webp(bytes);
}
