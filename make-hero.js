// Genera docs/hero.gif: tira animada (gato vivo por estado) para el hero del README/Marketplace.
// Render por código (mismo sprite del demo, frame-driven) + GIF con gifenc (JS puro).
// Requiere: npm install gifenc --no-save
const fs = require('fs');
const path = require('path');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const hexToRgb = (hex) => { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); if (hex.length > 6) hex = hex.slice(0, 6); const n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hslToRgb = (h, s, l) => { h /= 360; const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; };

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
const drawGrid = (P, grid, col, EYE) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const t = grid[y][x]; if (t === 'E') P(x, y, 1, 1, EYE); else if (col[t]) P(x, y, 1, 1, col[t]); } };

function drawCat(put, hue, state, fr) {
  const col = { O: hslToRgb(hue, .45, .17), B: hslToRgb(hue, .40, .62), L: hslToRgb(hue, .30, .92), P: hexToRgb('#e891a8') };
  const PATCH = hslToRgb((hue + 150) % 360, .52, .58), EYE = hslToRgb(hue, .45, .14);
  const f = fr % 4;
  if (state === 'idle') {
    const dy = (f < 2) ? 0 : 1; const P = (x, y, w, h, c) => put(x, y + dy, w, h, c);
    [[14, 7], [14, 6], [15, 6], [15, 5]].forEach(([x, y]) => P(x, y, 1, 1, col.B));
    drawGrid(P, CAT_LYING, col, EYE);
    [[9, 8], [10, 8]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
    const G = hexToRgb('#9aa0a6'); P(11, 2, 3, 1, G); P(13, 3, 1, 1, G); P(11, 4, 3, 1, G);
    return;
  }
  const P = put, tailPhase = (f < 2) ? 0 : 1;
  if (tailPhase === 1) { [[12, 11], [13, 11], [14, 10], [14, 9]].forEach(([x, y]) => P(x, y, 1, 1, col.B)); [[15, 9], [15, 10], [14, 8]].forEach(([x, y]) => P(x, y, 1, 1, col.O)); }
  else { [[12, 11], [13, 10], [13, 9], [13, 8]].forEach(([x, y]) => P(x, y, 1, 1, col.B)); [[14, 8], [14, 9], [14, 10], [13, 7]].forEach(([x, y]) => P(x, y, 1, 1, col.O)); }
  drawGrid(P, CAT, col, EYE);
  [[4, 3], [5, 3], [10, 9], [10, 10]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
  P(5, 5, 1, 2, EYE); P(10, 5, 1, 2, EYE);
  if (state === 'working') {
    const F = hexToRgb('#23262e');
    [[4, 4], [5, 4], [6, 4], [4, 5], [6, 5], [4, 6], [5, 6], [6, 6], [9, 4], [10, 4], [11, 4], [9, 5], [11, 5], [9, 6], [10, 6], [11, 6]].forEach(([x, y]) => P(x, y, 1, 1, F));
    P(7, 4, 2, 1, F); const RF = hexToRgb('#bfe9ff'); P(5, 5, 1, 1, RF); P(10, 5, 1, 1, RF);
    const SCR = hexToRgb('#2f3744'), TOP = hexToRgb('#6f86b3'), BASE = hexToRgb('#c7ccd6'), OL = hexToRgb('#15181e');
    P(2, 8, 12, 5, SCR); P(2, 8, 12, 1, TOP); P(2, 8, 1, 5, OL); P(13, 8, 1, 5, OL);
    P(4 + (f % 4), 10, 1, 1, TOP); P(7, 10, 2, 1, hexToRgb('#9aa3b5')); P(1, 13, 14, 1, BASE); P(1, 14, 14, 1, OL);
  } else if (state === 'waiting_input') {
    const Y = hexToRgb('#7c5cff'), YO = hexToRgb('#352663'), YL = hexToRgb('#bcaeff');
    const hop = (f % 2) ? -1 : 0, bx = 11, by = 12 + hop, o = f % 2;
    P(bx, by, 4, 4, Y); [[bx, by], [bx + 3, by], [bx, by + 3], [bx + 3, by + 3]].forEach(([x, y]) => P(x, y, 1, 1, YO));
    P(bx + 1 + o, by, 1, 1, YL); P(bx + (o ? 0 : 2), by + 1, 1, 1, YL); P(bx + 1, by + 2, 1, 1, YL); P(bx + 2, by + 3, 1, 1, YL);
    P(bx - 1, by + 2, 1, 1, Y); P(bx - 2, by + 3, 1, 1, Y);
  } else {
    const c = hexToRgb('#a371f7'); P(12, 1, 2, 1, c); P(14, 2, 1, 1, c); P(13, 3, 1, 1, c); P(13, 5, 1, 1, c);
  }
}

// ---------- lienzo ----------
const TW = 120, TH = 112, GAP = 14, PAD = 8, N = 4;
const W = PAD * 2 + N * TW + (N - 1) * GAP, H = PAD * 2 + TH;
const BG = hexToRgb('#1e1e1e'), CARD_BG = hexToRgb('#1e1e21');
const CELL = 6, COFF = (TW - 16 * CELL) / 2;
const STATES = [
  { state: 'working',            hue: 210, color: '#3fb950' },
  { state: 'waiting_input',      hue: 30,  color: '#e3a008' },
  { state: 'waiting_permission', hue: 280, color: '#a371f7' },
  { state: 'idle',               hue: 150, color: '#8a8f98' },
];

function renderFrame(fr) {
  const buf = new Uint8Array(W * H * 4);
  const setPx = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; };
  const rect = (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c); };
  const rounded = (x, y, w, h, rad, c) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const cx = Math.min(Math.max(xx, rad), w - 1 - rad), cy = Math.min(Math.max(yy, rad), h - 1 - rad); if ((xx - cx) ** 2 + (yy - cy) ** 2 <= rad * rad) setPx(x + xx, y + yy, c); } };
  rect(0, 0, W, H, BG);
  STATES.forEach((s, i) => {
    const tx = PAD + i * (TW + GAP), ty = PAD;
    rounded(tx, ty, TW, TH, 14, hexToRgb(s.color));
    rounded(tx + 2, ty + 2, TW - 4, TH - 4, 12, CARD_BG);
    const ox = tx + COFF, oy = ty + 8;
    const put = (gx, gy, gw, gh, c) => rect(ox + gx * CELL, oy + gy * CELL, gw * CELL, gh * CELL, c);
    drawCat(put, s.hue, s.state, fr);
  });
  return buf;
}

// ---------- GIF ----------
const FRAMES = 8, DELAY = 150;
const enc = GIFEncoder();
const palette = quantize(renderFrame(0), 256);
for (let fr = 0; fr < FRAMES; fr++) {
  const index = applyPalette(renderFrame(fr), palette);
  enc.writeFrame(index, W, H, { palette, delay: DELAY, repeat: 0 });
}
enc.finish();
fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
const out = path.join(__dirname, 'docs', 'hero.gif');
fs.writeFileSync(out, Buffer.from(enc.bytes()));
console.log('escrito', out, enc.bytes().length, 'bytes', `(${W}x${H}, ${FRAMES}f)`);
