import { imageSize } from "./image-size.ts";

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);
const zeros = (count: number): number[] => Array.from({ length: count }, () => 0);
const iconEntry = (size: number): number[] => [
  size,
  size,
  0,
  0,
  1,
  0,
  32,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
];
const ascii = (value: string): number[] => Array.from(value, (char) => char.codePointAt(0) ?? 0);
const u32be = (value: number): number[] => [
  value >>> 24,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];

function png(width: number, height: number): Uint8Array {
  return bytes(
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...u32be(13),
    ...ascii("IHDR"),
    ...u32be(width),
    ...u32be(height),
    8,
    6,
    0,
    0,
    0,
  );
}

function riff(chunk: string, body: number[]): Uint8Array {
  return bytes(
    ...ascii("RIFF"),
    0,
    0,
    0,
    0,
    ...ascii("WEBP"),
    ...ascii(chunk),
    0,
    0,
    0,
    0,
    ...body,
  );
}

describe("imageSize", () => {
  test("reads a PNG header", () => {
    expect(imageSize(png(192, 100))).toEqual({
      format: "png",
      sizes: [{ width: 192, height: 100 }],
    });
  });

  test("rejects a PNG signature without an IHDR chunk and a short file", () => {
    const broken = png(1, 1);
    broken.set(ascii("XXXX"), 12);
    expect(imageSize(broken)).toBeNull();
    expect(imageSize(png(1, 1).subarray(0, 20))).toBeNull();
    expect(imageSize(bytes())).toBeNull();
  });

  test("reads every ICO entry and maps 0 to 256", () => {
    const header = [0, 0, 1, 0, 2, 0];
    expect(imageSize(bytes(...header, ...iconEntry(16), ...iconEntry(0)))).toEqual({
      format: "ico",
      sizes: [
        { width: 16, height: 16 },
        { width: 256, height: 256 },
      ],
    });
  });

  test("rejects an ICO that is short, has no images or is not type 1", () => {
    expect(imageSize(bytes(0, 0, 1))).toBeNull();
    expect(imageSize(bytes(0, 0, 1, 0, 0, 0))).toBeNull();
    expect(imageSize(bytes(0, 0, 2, 0, 1, 0, ...zeros(16)))).toBeNull();
    expect(imageSize(bytes(0, 0, 1, 0, 3, 0, 16, 16))).toBeNull();
  });

  test("reads lossy, lossless and extended WebP sizes", () => {
    const lossy = riff("VP8 ", [
      0,
      0,
      0,
      0x9d,
      0x01,
      0x2a,
      780 & 255,
      780 >> 8,
      1688 & 255,
      1688 >> 8,
      0,
      0,
    ]);
    expect(imageSize(lossy)).toEqual({ format: "webp", sizes: [{ width: 780, height: 1688 }] });

    const bits = (320 - 1) | ((200 - 1) << 14);
    const lossless = riff("VP8L", [
      0x2f,
      bits & 255,
      (bits >>> 8) & 255,
      (bits >>> 16) & 255,
      bits >>> 24,
      0,
      0,
      0,
      0,
    ]);
    expect(imageSize(lossless)).toEqual({ format: "webp", sizes: [{ width: 320, height: 200 }] });

    const width = 1280 - 1;
    const height = 800 - 1;
    const extended = riff("VP8X", [
      0,
      0,
      0,
      0,
      width & 255,
      width >> 8,
      0,
      height & 255,
      height >> 8,
      0,
      0,
      0,
    ]);
    expect(imageSize(extended)).toEqual({ format: "webp", sizes: [{ width: 1280, height: 800 }] });
  });

  test("rejects WebP with a wrong start code, signature, chunk or length", () => {
    expect(imageSize(riff("VP8 ", [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(imageSize(riff("VP8L", [0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(imageSize(riff("ABCD", zeros(12)))).toBeNull();
    expect(imageSize(riff("VP8 ", []))).toBeNull();
    const notWebp = riff("VP8 ", zeros(12));
    notWebp.set(ascii("AVIF"), 8);
    expect(imageSize(notWebp)).toBeNull();
  });
});
