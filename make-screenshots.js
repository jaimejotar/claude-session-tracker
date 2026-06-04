// Genera docs/states.png: una tira con las 4 tarjetas (un gato por estado) para el README/Marketplace.
// Render por código (mismo sprite del demo) + encoder PNG a mano. Sin dependencias nativas.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// ---------- helpers de color ----------
const hexToRgb = (hex) => { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); if (hex.length > 6) hex = hex.slice(0, 6); const n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hslToRgb = (h, s, l) => { h /= 360; const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; };

// ---------- sprites ----------
const CAT = [
  "................", ".....O....O.....", "....OPO..OPO....", "...OBBBBBBBBO...",
  "...OBBBBBBBBO...", "...OBBBBBBBBO...", "...OBBBPPBBBO...", "...OBBBBBBBBO...",
  "....OBBBBBBO....", "....OBLLLLBO....", "....OBLLLLBO....", "....OBLLLLBO....",
  "....OBBBBBBO....", "....OOBBBBOO....", ".....OO..OO.....", "................",
];
const CAT_LYING = [
  "................", "................", "................", "................",
  "................", "...O.....O......", "..OPO...OPO.....", ".OBBBBBBBBBBO...",
  "OBBBBBBBBBBBBBO.", "OBEBBEBBBBBBBBO.", "OBBPBBBBBBBBBBO.", "OBLLLBBBBBBBBBO.",
  "OBBBBBBBBBBBBBO.", ".OOOOOOOOOOOOO..", "................", "................",
];
const drawGrid = (P, grid, col, EYE) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const t = grid[y][x]; if (t === 'E') P(x, y, 1, 1, EYE); else if (col[t]) P(x, y, 1, 1, col[t]); }
};
function drawCat(P, hue, state) {
  const col = { O: hslToRgb(hue, 0.45, 0.17), B: hslToRgb(hue, 0.40, 0.62), L: hslToRgb(hue, 0.30, 0.92), P: hexToRgb('#e891a8') };
  const PATCH = hslToRgb((hue + 150) % 360, 0.52, 0.58), EYE = hslToRgb(hue, 0.45, 0.14);
  if (state === 'idle') {
    [[14, 7], [14, 6], [15, 6], [15, 5]].forEach(([x, y]) => P(x, y, 1, 1, col.B));
    drawGrid(P, CAT_LYING, col, EYE);
    [[9, 8], [10, 8]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
    const G = hexToRgb('#9aa0a6'); P(11, 2, 3, 1, G); P(13, 3, 1, 1, G); P(11, 4, 3, 1, G); // z
    return;
  }
  [[12, 11], [13, 10], [13, 9], [13, 8]].forEach(([x, y]) => P(x, y, 1, 1, col.B));
  [[14, 8], [14, 9], [14, 10], [13, 7]].forEach(([x, y]) => P(x, y, 1, 1, col.O));
  drawGrid(P, CAT, col, EYE);
  [[4, 3], [5, 3], [10, 9], [10, 10]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
  P(5, 5, 1, 2, EYE); P(10, 5, 1, 2, EYE);
  if (state === 'working') {
    const F = hexToRgb('#23262e');
    [[4, 4], [5, 4], [6, 4], [4, 5], [6, 5], [4, 6], [5, 6], [6, 6], [9, 4], [10, 4], [11, 4], [9, 5], [11, 5], [9, 6], [10, 6], [11, 6]].forEach(([x, y]) => P(x, y, 1, 1, F));
    P(7, 4, 2, 1, F); const RF = hexToRgb('#bfe9ff'); P(5, 5, 1, 1, RF); P(10, 5, 1, 1, RF);
    const SCR = hexToRgb('#2f3744'), TOP = hexToRgb('#6f86b3'), BASE = hexToRgb('#c7ccd6'), OL = hexToRgb('#15181e');
    P(2, 8, 12, 5, SCR); P(2, 8, 12, 1, TOP); P(2, 8, 1, 5, OL); P(13, 8, 1, 5, OL);
    P(4, 10, 1, 1, TOP); P(7, 10, 2, 1, hexToRgb('#9aa3b5')); P(1, 13, 14, 1, BASE); P(1, 14, 14, 1, OL);
  } else if (state === 'waiting_input') {
    const Y = hexToRgb('#7c5cff'), YO = hexToRgb('#352663'), YL = hexToRgb('#bcaeff'); const bx = 11, by = 12;
    P(bx, by, 4, 4, Y); [[bx, by], [bx + 3, by], [bx, by + 3], [bx + 3, by + 3]].forEach(([x, y]) => P(x, y, 1, 1, YO));
    P(bx + 1, by, 1, 1, YL); P(bx + 2, by + 1, 1, 1, YL); P(bx + 1, by + 2, 1, 1, YL); P(bx + 2, by + 3, 1, 1, YL);
    P(bx - 1, by + 2, 1, 1, Y); P(bx - 2, by + 3, 1, 1, Y);
  } else {
    const c = hexToRgb('#a371f7'); P(12, 1, 2, 1, c); P(14, 2, 1, 1, c); P(13, 3, 1, 1, c); P(13, 5, 1, 1, c);
  }
}

// ---------- lienzo / tira ----------
const TW = 120, TH = 112, GAP = 14, PAD = 8, N = 4;
const W = PAD * 2 + N * TW + (N - 1) * GAP, H = PAD * 2 + TH;
const buf = Buffer.alloc(W * H * 4);
const setPx = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; };
const rect = (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c); };
const roundedRect = (x, y, w, h, rad, c) => {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const cx = Math.min(Math.max(xx, rad), w - 1 - rad), cy = Math.min(Math.max(yy, rad), h - 1 - rad);
    if ((xx - cx) ** 2 + (yy - cy) ** 2 <= rad * rad) setPx(x + xx, y + yy, c);
  }
};

const STATES = [
  { state: 'working',            hue: 210, color: '#3fb950' },
  { state: 'waiting_input',      hue: 30,  color: '#e3a008' },
  { state: 'waiting_permission', hue: 280, color: '#a371f7' },
  { state: 'idle',               hue: 150, color: '#8a8f98' },
];
const CARD_BG = hexToRgb('#1e1e21');
const CELL = 6, COFF = (TW - 16 * CELL) / 2; // 96px de gato, centrado

STATES.forEach((s, i) => {
  const tx = PAD + i * (TW + GAP), ty = PAD;
  roundedRect(tx, ty, TW, TH, 14, hexToRgb(s.color)); // borde del color del estado
  roundedRect(tx + 2, ty + 2, TW - 4, TH - 4, 12, CARD_BG); // relleno tarjeta
  const ox = tx + COFF, oy = ty + 8;
  const P = (gx, gy, gw, gh, c) => rect(ox + gx * CELL, oy + gy * CELL, gw * CELL, gh * CELL, c);
  drawCat(P, s.hue, s.state);
});

// ---------- encode PNG ----------
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const tb = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0); return Buffer.concat([len, tb, data, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) { raw[y * (1 + W * 4)] = 0; buf.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4); }
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
const out = path.join(__dirname, 'docs', 'states.png');
fs.writeFileSync(out, png);
console.log('escrito', out, png.length, 'bytes', `(${W}x${H})`);
