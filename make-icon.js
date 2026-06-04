// Genera media/icon-128.png (ícono del Marketplace) sin dependencias nativas:
// dibuja el gato pixel-art sobre un fondo redondeado y codifica el PNG a mano (zlib + CRC32).
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const W = 128, H = 128;
const buf = Buffer.alloc(W * H * 4); // RGBA, transparente

const setPx = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
};
const rect = (x, y, w, h, c) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c[0], c[1], c[2]);
};

// ---- fondo: cuadrado redondeado con gradiente índigo ----
const RAD = 22, TOP = [91, 84, 232], BOT = [124, 108, 240];
const inRounded = (x, y) => {
  const cx = Math.min(Math.max(x, RAD), W - 1 - RAD);
  const cy = Math.min(Math.max(y, RAD), H - 1 - RAD);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= RAD * RAD;
};
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  const r = Math.round(TOP[0] + (BOT[0] - TOP[0]) * t);
  const g = Math.round(TOP[1] + (BOT[1] - TOP[1]) * t);
  const b = Math.round(TOP[2] + (BOT[2] - TOP[2]) * t);
  for (let x = 0; x < W; x++) if (inRounded(x, y)) setPx(x, y, r, g, b, 255);
}

// ---- gato (sprite 16x16 del demo) ----
const CAT = [
  "................", ".....O....O.....", "....OPO..OPO....", "...OBBBBBBBBO...",
  "...OBBBBBBBBO...", "...OBBBBBBBBO...", "...OBBBPPBBBO...", "...OBBBBBBBBO...",
  "....OBBBBBBO....", "....OBLLLLBO....", "....OBLLLLBO....", "....OBLLLLBO....",
  "....OBBBBBBO....", "....OOBBBBOO....", ".....OO..OO.....", "................",
];
const PAL = {
  O: [33, 34, 41],    // outline
  B: [205, 210, 219], // body (gris)
  L: [245, 247, 250], // belly (blanco)
  P: [232, 145, 168], // orejas/nariz (rosado)
};
const EYE = [28, 29, 36];
const PATCH = [232, 146, 60]; // manchas naranjas

const CELL = 7, OFF = (W - 16 * CELL) / 2; // 112px de gato, 8px de margen
const P = (gx, gy, gw, gh, c) => rect(OFF + gx * CELL, OFF + gy * CELL, gw * CELL, gh * CELL, c);

// cola (detrás)
[[12, 11], [13, 10], [13, 9], [13, 8]].forEach(([x, y]) => P(x, y, 1, 1, PAL.B));
[[14, 8], [14, 9], [14, 10], [13, 7]].forEach(([x, y]) => P(x, y, 1, 1, PAL.O));
// cuerpo
for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = PAL[CAT[y][x]]; if (c) P(x, y, 1, 1, c); }
// manchas + ojos
[[4, 3], [5, 3], [10, 9], [10, 10]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
P(5, 5, 1, 2, EYE); P(10, 5, 1, 2, EYE);

// ---- encode PNG ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) { raw[y * (1 + W * 4)] = 0; buf.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4); }
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, 'media', 'icon-128.png');
fs.writeFileSync(out, png);
console.log('escrito', out, png.length, 'bytes');
