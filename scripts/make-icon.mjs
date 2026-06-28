// Renders build/icon.png (512x512) — a flat cat-face app mark matching the
// sticker palette. Pure Node (zlib) so no image dependencies are needed.
// 2x supersampling gives cheap antialiasing. Run: node scripts/make-icon.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 512;
const SS = 2; // supersample factor
const W = SIZE * SS;

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
const TEAL = hex("#2a9d95");
const CREAM = hex("#fff7ec");
const BROWN = hex("#704c35");
const DARK = hex("#563927");
const PINK = hex("#e8949c");
const ORANGE = hex("#f0a65f");

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function dist(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy);
}
// Signed helper: returns 1 inside a circle of radius r, with a soft brown ring.
function circleLayer(px, py, cx, cy, r, fill, ring = 8) {
  const d = dist(px, py, cx, cy);
  if (d <= r - ring) return fill;
  if (d <= r) return BROWN;
  return null;
}

// Coordinates in 0..512 space (scaled by SS when sampling).
function sample(x, y) {
  // rounded-square background
  const rr = 96;
  const inside =
    x > rr && x < 512 - rr
      ? y >= 0 && y <= 512
      : y > rr && y < 512 - rr
        ? x >= 0 && x <= 512
        : dist(x, y, Math.min(Math.max(x, rr), 512 - rr), Math.min(Math.max(y, rr), 512 - rr)) <= rr;
  if (!inside) return null; // transparent corners

  let color = TEAL;

  // ears (triangles) behind head
  const earL = pointInTri(x, y, 150, 210, 190, 70, 250, 200);
  const earR = pointInTri(x, y, 362, 210, 322, 70, 262, 200);
  if (earL || earR) color = CREAM;
  const earInL = pointInTri(x, y, 178, 180, 196, 108, 232, 186);
  const earInR = pointInTri(x, y, 334, 180, 316, 108, 280, 186);
  if (earInL || earInR) color = ORANGE;

  // head
  const head = circleLayer(x, y, 256, 300, 150, CREAM, 9);
  if (head) color = head;

  // eyes
  if (dist(x, y, 212, 300) <= 15) color = DARK;
  if (dist(x, y, 300, 300) <= 15) color = DARK;
  // blush
  if (dist(x, y, 196, 336) <= 16) color = mix(color, PINK, 0.5);
  if (dist(x, y, 316, 336) <= 16) color = mix(color, PINK, 0.5);
  // nose
  if (pointInTri(x, y, 256, 330, 246, 320, 266, 320)) color = PINK;

  return color;
}

function pointInTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

// Render with supersampling into an RGBA buffer.
const raw = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        if (c) {
          r += c[0];
          g += c[1];
          b += c[2];
          a += 255;
        }
      }
    }
    const n = SS * SS;
    const idx = (y * SIZE + x) * 4;
    raw[idx] = Math.round(r / n);
    raw[idx + 1] = Math.round(g / n);
    raw[idx + 2] = Math.round(b / n);
    raw[idx + 3] = Math.round(a / n);
  }
}

// Encode PNG (truecolor + alpha).
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const stride = SIZE * 4;
const withFilters = Buffer.alloc((stride + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  withFilters[y * (stride + 1)] = 0; // no filter
  raw.copy(withFilters, y * (stride + 1) + 1, y * stride, y * stride + stride);
}
const idat = deflateSync(withFilters);
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "build");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon.png"), png);
console.log(`wrote build/icon.png (${SIZE}x${SIZE}, ${png.length} bytes)`);
