/**
 * Generate static cartographic topo SVG paths.
 * Run: node scripts/generate-topo.mjs
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIZE = 1000;
const GRID = 150;
const CELL = SIZE / GRID;
const LEVELS = 16;
const STROKE = 'rgba(240,237,230,0.13)';
const STROKE_WIDTH = 1;

const PEAKS = [
  [250, 280, 1.0, 118],
  [180, 380, 0.8, 100],
  [340, 420, 0.68, 92],
  [720, 220, 0.72, 110],
  [850, 380, 0.58, 96],
  [620, 620, 0.62, 102],
  [420, 720, 0.48, 94],
];

const LINE_TABLE = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  null,
  [[0, 3]],
  [[2, 3]],
  [[2, 3]],
  [[0, 2]],
  null,
  [[1, 2]],
  [[3, 1]],
  [[1, 2]],
  [[3, 0]],
  [],
];

function wrapDelta(d) {
  if (d > SIZE / 2) d -= SIZE;
  if (d < -SIZE / 2) d += SIZE;
  return d;
}

function height(x, y) {
  let h = 0;
  for (const [px, py, amp, spread] of PEAKS) {
    const dx = wrapDelta(x - px);
    const dy = wrapDelta(y - py);
    h += amp * Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread));
  }
  h += 0.025 * Math.sin((2 * Math.PI * x) / SIZE) * Math.sin((2 * Math.PI * y) / SIZE);
  return h;
}

function buildGrid() {
  const grid = [];
  for (let j = 0; j <= GRID; j++) {
    grid[j] = [];
    for (let i = 0; i <= GRID; i++) {
      grid[j][i] = height(i * CELL, j * CELL);
    }
  }
  return grid;
}

function lerp(a, b, va, vb, threshold) {
  const t = (threshold - va) / (vb - va + 1e-12);
  return a + t * (b - a);
}

function cellLines(idx, v0, v1, v2, v3, threshold) {
  if (idx === 5) {
    const center = (v0 + v1 + v2 + v3) * 0.25;
    return center >= threshold ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
  }
  if (idx === 10) {
    const center = (v0 + v1 + v2 + v3) * 0.25;
    return center >= threshold ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]];
  }
  return LINE_TABLE[idx] || [];
}

function edgePoint(i, j, edge, v0, v1, v2, v3, threshold) {
  const x = i * CELL;
  const y = j * CELL;
  if (edge === 0) return [lerp(x, x + CELL, v0, v1, threshold), y];
  if (edge === 1) return [x + CELL, lerp(y, y + CELL, v1, v2, threshold)];
  if (edge === 2) return [lerp(x + CELL, x, v2, v3, threshold), y + CELL];
  return [x, lerp(y + CELL, y, v3, v0, threshold)];
}

function segmentsAtLevel(grid, threshold) {
  const segments = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const v0 = grid[j][i];
      const v1 = grid[j][i + 1];
      const v2 = grid[j + 1][i + 1];
      const v3 = grid[j + 1][i];
      let idx = 0;
      if (v0 >= threshold) idx |= 1;
      if (v1 >= threshold) idx |= 2;
      if (v2 >= threshold) idx |= 4;
      if (v3 >= threshold) idx |= 8;

      for (const [e1, e2] of cellLines(idx, v0, v1, v2, v3, threshold)) {
        const p1 = edgePoint(i, j, e1, v0, v1, v2, v3, threshold);
        const p2 = edgePoint(i, j, e2, v0, v1, v2, v3, threshold);
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        if (dx * dx + dy * dy < 1e-6) continue;
        segments.push([p1, p2]);
      }
    }
  }
  return segments;
}

function segmentsToD(segments) {
  return segments
    .map(([[x1, y1], [x2, y2]]) => `M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}`)
    .join('');
}

const grid = buildGrid();
let min = Infinity;
let max = -Infinity;
for (const row of grid) {
  for (const v of row) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
}

const step = (max - min) / (LEVELS + 2);
const pathEls = [];

for (let n = 1; n <= LEVELS; n++) {
  const threshold = min + step * n;
  const segments = segmentsAtLevel(grid, threshold);
  if (!segments.length) continue;
  pathEls.push(`          <path d="${segmentsToD(segments)}"/>`);
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<g fill="none" stroke="${STROKE}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">
${pathEls.map((p) => p.trim()).join('\n')}
</g>
</svg>`;

const outPath = join(__dirname, '..', 'assets', 'topo-bg.svg');
writeFileSync(outPath, svg, 'utf8');
console.log(`Wrote ${LEVELS} contour levels to ${outPath}`);
