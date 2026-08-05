#!/usr/bin/env node
/**
 * ZAZU — the element panel.
 *
 * Draws one Zazu portrait and renders it across N element treatments: a themed
 * background plus a colour grade over the fur, which is exactly what the four
 * reference images do. Everything is square (1:1) and drawn to fixed anchors, so
 * nothing ever comes out stretched.
 *
 *   node tools/draw-zazu.js            # 54 variants -> ../assets/zazu/
 *   node tools/draw-zazu.js 30         # fewer
 *   node tools/draw-zazu.js --size 512 # bigger renders
 *
 * USING THE REAL PHOTO
 * --------------------
 * Drop the Zazu photo at  assets/zazu-source.png  (square, head centred) and this
 * script uses it as the base instead of the drawn portrait — same backgrounds,
 * same grades, same output filenames. Nothing else changes.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'zazu');
const SOURCE_PHOTO = path.join(ROOT, 'assets', 'zazu-source.png');

/* ── seeded RNG so every render is byte-identical ───────────────────────────── */
function makeRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── the elements ───────────────────────────────────────────────────────────
   Each entry: the scene behind Zazu, the grade laid over the fur, and how the
   eyes read. `tier` only drives the label colour on the site.
   ─────────────────────────────────────────────────────────────────────────── */
const ELEMENTS = [
  // the four originals, rebuilt clean
  { id: 'earth',     name: 'Earth',        scene: 'hills',     sky: ['#5fb3f0', '#bfe4fb'], ground: '#5fbb3a', grade: '#2fbf3a', mix: 0.62, eye: 'dark',   tier: 'origin' },
  { id: 'water',     name: 'Water',        scene: 'falls',     sky: ['#f4f7f9', '#cfd9df'], ground: '#dfe8ee', grade: '#e8f1f6', mix: 0.30, eye: 'dark',   tier: 'origin' },
  { id: 'deep',      name: 'Deep',         scene: 'bubbles',   sky: ['#0f4c81', '#1d7fb8'], ground: '#12406b', grade: '#1c6fae', mix: 0.58, eye: 'dark',   tier: 'origin' },
  { id: 'fire',      name: 'Fire',         scene: 'flames',    sky: ['#7a1205', '#e8541b'], ground: '#3d0a02', grade: '#e02e08', mix: 0.66, eye: 'glow',   tier: 'origin' },

  // the house colour
  { id: 'neon',      name: 'Neon',         scene: 'rays',      sky: ['#0d0d0d', '#1a1a1a'], ground: '#0a0a0a', grade: '#d6ff00', mix: 0.55, eye: 'glow',   tier: 'legendary' },
  { id: 'voltage',   name: 'Voltage',      scene: 'bolts',     sky: ['#141400', '#3a3a00'], ground: '#0e0e00', grade: '#eaff36', mix: 0.60, eye: 'glow',   tier: 'legendary' },
  { id: 'goldbar',   name: 'Gold Bar',     scene: 'rays',      sky: ['#5c3d05', '#c99a1e'], ground: '#3d2703', grade: '#f0b429', mix: 0.58, eye: 'glow',   tier: 'legendary' },
  { id: 'diamond',   name: 'Diamond',      scene: 'facets',    sky: ['#dff3ff', '#a8dcf5'], ground: '#c7e9fa', grade: '#9fe0ff', mix: 0.42, eye: 'dark',   tier: 'legendary' },

  // atmosphere
  { id: 'storm',     name: 'Storm',        scene: 'rain',      sky: ['#2b3440', '#57646f'], ground: '#222a33', grade: '#6d7d8c', mix: 0.50, eye: 'glow',   tier: 'rare' },
  { id: 'frost',     name: 'Frost',        scene: 'snow',      sky: ['#cfeaf5', '#8fc9e0'], ground: '#b7dced', grade: '#8fd4ea', mix: 0.48, eye: 'dark',   tier: 'rare' },
  { id: 'dusk',      name: 'Dusk',         scene: 'gradient',  sky: ['#f97a3d', '#5b2a72'], ground: '#3a1b4d', grade: '#f0763c', mix: 0.52, eye: 'dark',   tier: 'rare' },
  { id: 'dawn',      name: 'Dawn',         scene: 'gradient',  sky: ['#ffd9a0', '#ff8fa3'], ground: '#ffc48a', grade: '#ffb37a', mix: 0.44, eye: 'dark',   tier: 'common' },
  { id: 'fog',       name: 'Fog',          scene: 'clouds',    sky: ['#e6e9ea', '#b9c1c4'], ground: '#d2d8da', grade: '#c8d0d3', mix: 0.34, eye: 'dark',   tier: 'common' },
  { id: 'monsoon',   name: 'Monsoon',      scene: 'rain',      sky: ['#1f4b47', '#3f7d72'], ground: '#183b38', grade: '#3f9384', mix: 0.52, eye: 'dark',   tier: 'common' },
  { id: 'aurora',    name: 'Aurora',       scene: 'ribbons',   sky: ['#04121f', '#0b2f44'], ground: '#04121f', grade: '#3ef0b0', mix: 0.55, eye: 'glow',   tier: 'rare' },
  { id: 'eclipse',   name: 'Eclipse',      scene: 'ring',      sky: ['#050508', '#141420'], ground: '#050508', grade: '#8a7fd6', mix: 0.52, eye: 'glow',   tier: 'legendary' },

  // terrain
  { id: 'desert',    name: 'Desert',       scene: 'dunes',     sky: ['#f6c87a', '#ffe6b5'], ground: '#d99b4a', grade: '#e0a95c', mix: 0.50, eye: 'dark',   tier: 'common' },
  { id: 'canyon',    name: 'Canyon',       scene: 'dunes',     sky: ['#e08b5a', '#f5c39a'], ground: '#a8482a', grade: '#c9663c', mix: 0.54, eye: 'dark',   tier: 'common' },
  { id: 'moss',      name: 'Moss',         scene: 'hills',     sky: ['#8fc98a', '#d6ecd0'], ground: '#3f7a3a', grade: '#5e9b52', mix: 0.50, eye: 'dark',   tier: 'common' },
  { id: 'jungle',    name: 'Jungle',       scene: 'fronds',    sky: ['#0d3320', '#1c5c34'], ground: '#082418', grade: '#2f8f4e', mix: 0.58, eye: 'glow',   tier: 'rare' },
  { id: 'tundra',    name: 'Tundra',       scene: 'snow',      sky: ['#eef4f7', '#c4d4dd'], ground: '#dfe8ee', grade: '#cddbe4', mix: 0.32, eye: 'dark',   tier: 'common' },
  { id: 'volcano',   name: 'Volcano',      scene: 'flames',    sky: ['#2a0a0a', '#8c2408'], ground: '#160404', grade: '#ff5722', mix: 0.60, eye: 'glow',   tier: 'rare' },
  { id: 'obsidian',  name: 'Obsidian',     scene: 'facets',    sky: ['#0b0b10', '#22222e'], ground: '#08080c', grade: '#2e2e3d', mix: 0.55, eye: 'glow',   tier: 'rare' },
  { id: 'quartz',    name: 'Quartz',       scene: 'facets',    sky: ['#f3eefb', '#dcd0f0'], ground: '#e8def5', grade: '#cbb8e8', mix: 0.40, eye: 'dark',   tier: 'common' },

  // liquid
  { id: 'reef',      name: 'Reef',         scene: 'bubbles',   sky: ['#0b6b74', '#22b3ab'], ground: '#075158', grade: '#20a8a0', mix: 0.55, eye: 'dark',   tier: 'common' },
  { id: 'abyss',     name: 'Abyss',        scene: 'bubbles',   sky: ['#02060f', '#0a1d3a'], ground: '#01040a', grade: '#12325e', mix: 0.62, eye: 'glow',   tier: 'rare' },
  { id: 'lagoon',    name: 'Lagoon',       scene: 'ripples',   sky: ['#8ff0e0', '#2fc7c0'], ground: '#1ea79f', grade: '#4fd8cc', mix: 0.48, eye: 'dark',   tier: 'common' },
  { id: 'mercury',   name: 'Mercury',      scene: 'ripples',   sky: ['#d8dde2', '#9aa4ad'], ground: '#b6bec6', grade: '#aab3bb', mix: 0.42, eye: 'dark',   tier: 'common' },
  { id: 'ink',       name: 'Ink',          scene: 'ripples',   sky: ['#0a0a12', '#1d1d2c'], ground: '#06060c', grade: '#1a1a28', mix: 0.60, eye: 'glow',   tier: 'rare' },
  { id: 'honey',     name: 'Honey',        scene: 'gradient',  sky: ['#ffb703', '#ffe08a'], ground: '#e09400', grade: '#f5a800', mix: 0.52, eye: 'dark',   tier: 'common' },

  // space
  { id: 'nebula',    name: 'Nebula',       scene: 'stars',     sky: ['#1b0b33', '#5b1f7a'], ground: '#120722', grade: '#8f43c9', mix: 0.58, eye: 'glow',   tier: 'rare' },
  { id: 'cosmos',    name: 'Cosmos',       scene: 'stars',     sky: ['#050b1f', '#132a5c'], ground: '#03060f', grade: '#2a4d9e', mix: 0.56, eye: 'glow',   tier: 'common' },
  { id: 'solaris',   name: 'Solaris',      scene: 'rays',      sky: ['#ff8a00', '#ffd166'], ground: '#e06a00', grade: '#ff9e1f', mix: 0.56, eye: 'glow',   tier: 'rare' },
  { id: 'pulsar',    name: 'Pulsar',       scene: 'ring',      sky: ['#04121a', '#0c3550'], ground: '#020a10', grade: '#22d3ee', mix: 0.55, eye: 'glow',   tier: 'rare' },
  { id: 'comet',     name: 'Comet',        scene: 'streaks',   sky: ['#0a0f1c', '#1e2b4d'], ground: '#070b14', grade: '#7dd3fc', mix: 0.50, eye: 'glow',   tier: 'common' },
  { id: 'meteor',    name: 'Meteor',       scene: 'streaks',   sky: ['#1a0c05', '#5c2a10'], ground: '#0f0703', grade: '#f97316', mix: 0.56, eye: 'glow',   tier: 'common' },

  // synthetic
  { id: 'matrix',    name: 'Matrix',       scene: 'code',      sky: ['#020a04', '#062d13'], ground: '#010603', grade: '#1ee65a', mix: 0.60, eye: 'glow',   tier: 'rare' },
  { id: 'circuit',   name: 'Circuit',      scene: 'circuit',   sky: ['#04141a', '#0a3340'], ground: '#02090d', grade: '#00d9c0', mix: 0.55, eye: 'glow',   tier: 'rare' },
  { id: 'grid',      name: 'Grid',         scene: 'grid',      sky: ['#120a24', '#2d1552'], ground: '#0b0518', grade: '#c026d3', mix: 0.55, eye: 'glow',   tier: 'common' },
  { id: 'vapor',     name: 'Vapor',        scene: 'grid',      sky: ['#ff77c8', '#7de3ff'], ground: '#ff77c8', grade: '#ff8fd4', mix: 0.50, eye: 'glow',   tier: 'rare' },
  { id: 'terminal',  name: 'Terminal',     scene: 'code',      sky: ['#0a0a0a', '#151515'], ground: '#050505', grade: '#d6ff00', mix: 0.52, eye: 'glow',   tier: 'common' },
  { id: 'blueprint', name: 'Blueprint',    scene: 'grid',      sky: ['#0b2a5e', '#154a96'], ground: '#082049', grade: '#2d6fd4', mix: 0.54, eye: 'dark',   tier: 'common' },

  // soft
  { id: 'sakura',    name: 'Sakura',       scene: 'petals',    sky: ['#ffd7e6', '#fff1f6'], ground: '#ffc2d8', grade: '#ff9fc4', mix: 0.44, eye: 'dark',   tier: 'common' },
  { id: 'cotton',    name: 'Cotton',       scene: 'clouds',    sky: ['#bfe0ff', '#f2f9ff'], ground: '#d9edff', grade: '#a8d4f5', mix: 0.36, eye: 'dark',   tier: 'common' },
  { id: 'lilac',     name: 'Lilac',        scene: 'clouds',    sky: ['#d9c9f5', '#f3ecfd'], ground: '#c9b3ef', grade: '#b79ce8', mix: 0.42, eye: 'dark',   tier: 'common' },
  { id: 'peach',     name: 'Peach',        scene: 'gradient',  sky: ['#ffc2a0', '#ffe8d6'], ground: '#ffab80', grade: '#ffab85', mix: 0.44, eye: 'dark',   tier: 'common' },
  { id: 'mint',      name: 'Mint',         scene: 'gradient',  sky: ['#b8f0dc', '#eafaf4'], ground: '#8fe4c8', grade: '#7fdcbc', mix: 0.42, eye: 'dark',   tier: 'common' },
  { id: 'linen',     name: 'Linen',        scene: 'clouds',    sky: ['#f7f4ee', '#e6e0d4'], ground: '#efeae0', grade: '#e8e0d0', mix: 0.24, eye: 'dark',   tier: 'origin' },

  // loud
  { id: 'toxic',     name: 'Toxic',        scene: 'bubbles',   sky: ['#1a2b06', '#4d7a10'], ground: '#0e1a03', grade: '#a3e635', mix: 0.58, eye: 'glow',   tier: 'rare' },
  { id: 'bloodmoon', name: 'Blood Moon',   scene: 'ring',      sky: ['#1a0508', '#4d0f18'], ground: '#0d0204', grade: '#dc2626', mix: 0.60, eye: 'glow',   tier: 'legendary' },
  { id: 'plasma',    name: 'Plasma',       scene: 'ribbons',   sky: ['#2b0140', '#7a0f6b'], ground: '#1a0128', grade: '#e935c9', mix: 0.58, eye: 'glow',   tier: 'rare' },
  { id: 'sulfur',    name: 'Sulfur',       scene: 'flames',    sky: ['#3d3300', '#a89000'], ground: '#241e00', grade: '#e6c800', mix: 0.58, eye: 'glow',   tier: 'common' },
  { id: 'static',    name: 'Static',       scene: 'noise',     sky: ['#1c1c1c', '#3d3d3d'], ground: '#141414', grade: '#8a8a8a', mix: 0.44, eye: 'glow',   tier: 'common' },
  { id: 'midnight',  name: 'Midnight',     scene: 'stars',     sky: ['#04040a', '#0e0e1f'], ground: '#020205', grade: '#12122a', mix: 0.58, eye: 'glow',   tier: 'origin' },
];

/* ── the portrait ───────────────────────────────────────────────────────────
   Drawn on a 1000×1000 virtual canvas, square, with the head on fixed anchors:

     head centre   500, 430      eye line   398
     ear tips      ~150          nose tip   516
     chest top     640           whisker    root 470 / 530

   Every element renders the same geometry — only the colour grade and the
   background change — so the panel reads as one cat, not fifty.
   ─────────────────────────────────────────────────────────────────────────── */

const FUR = {
  base:   '#a29b92',   // silver tabby
  light:  '#cdc7be',
  dark:   '#605a53',
  stripe: '#413d39',
  white:  '#e6e2da',
  pink:   '#e39a9a',
  ear:    '#d9a9a4',
  eye:    '#c8b57f',
  pupil:  '#14120f',
};

function lerpHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/** Ear: a rounded triangle with a pink inner. */
function ear(ctx, x, tipX, tipY, baseY, innerScale, fur) {
  ctx.beginPath();
  ctx.moveTo(x - 96, baseY);
  ctx.quadraticCurveTo(tipX - 26, tipY + 40, tipX, tipY);
  ctx.quadraticCurveTo(tipX + 30, tipY + 46, x + 92, baseY - 8);
  ctx.quadraticCurveTo(x, baseY + 46, x - 96, baseY);
  ctx.closePath();
  ctx.fillStyle = fur.base;
  ctx.fill();

  // inner ear
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  const ix = x + (tipX - x) * 0.18;
  ctx.moveTo(ix - 50 * innerScale, baseY - 18);
  ctx.quadraticCurveTo(tipX - 18, tipY + 78, tipX - 4, tipY + 46);
  ctx.quadraticCurveTo(ix + 46 * innerScale, baseY - 40, ix - 50 * innerScale, baseY - 18);
  ctx.closePath();
  ctx.fillStyle = fur.ear;
  ctx.fill();
  ctx.restore();
}

/** One tapered stripe: thick at the root, pointed at the tip. */
function stripe(ctx, x1, y1, x2, y2, w, color, alpha = 0.85) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * w, y1 + ny * w);
  ctx.quadraticCurveTo(x1 + dx * 0.5 + nx * w * 0.7, y1 + dy * 0.5 + ny * w * 0.7, x2, y2);
  ctx.quadraticCurveTo(x1 + dx * 0.5 - nx * w * 0.7, y1 + dy * 0.5 - ny * w * 0.7, x1 - nx * w, y1 - ny * w);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Soft fur tufts around a silhouette so the edge isn't a hard vector curve. */
function tufts(ctx, rand, cx, cy, rx, ry, from, to, len, color) {
  ctx.save();
  ctx.fillStyle = color;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = from + (to - from) * (i / (n - 1));
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    const l = len * (0.5 + rand() * 0.9);
    const spread = 0.085;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - spread) * rx, cy + Math.sin(a - spread) * ry);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.lineTo(cx + Math.cos(a + spread) * rx, cy + Math.sin(a + spread) * ry);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The whole cat, on a transparent 1000×1000 canvas. */
function drawZazu(ctx, opts = {}) {
  const rand = makeRng('zazu-portrait-v1');
  const fur = FUR;
  const eyeStyle = opts.eye || 'dark';

  const HEAD = { x: 500, y: 430, rx: 232, ry: 214 };

  /* ---- chest / shoulders ---- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(236, 1000);
  ctx.quadraticCurveTo(258, 726, 382, 648);
  ctx.lineTo(618, 648);
  ctx.quadraticCurveTo(742, 726, 764, 1000);
  ctx.closePath();
  const chestG = ctx.createLinearGradient(0, 620, 0, 1000);
  chestG.addColorStop(0, fur.base);
  chestG.addColorStop(0.55, lerpHex(fur.base, fur.dark, 0.25));
  chestG.addColorStop(1, fur.dark);
  ctx.fillStyle = chestG;
  ctx.fill();
  ctx.restore();

  // white bib
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(500, 660);
  ctx.quadraticCurveTo(392, 760, 372, 1000);
  ctx.lineTo(628, 1000);
  ctx.quadraticCurveTo(608, 760, 500, 660);
  ctx.closePath();
  ctx.fillStyle = lerpHex(fur.white, fur.base, 0.34);
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.restore();

  // chest stripes
  for (let i = 0; i < 7; i++) {
    const y = 720 + i * 44;
    const w = 150 - Math.abs(i - 3) * 14;
    stripe(ctx, 500 - w, y, 500 - w * 0.15, y + 26, 13, fur.stripe, 0.30);
    stripe(ctx, 500 + w, y, 500 + w * 0.15, y + 26, 13, fur.stripe, 0.30);
  }

  /* ---- ears (behind the head) ---- */
  ear(ctx, 330, 258, 148, 372, 1, fur);
  ear(ctx, 670, 742, 148, 372, -1, fur);
  // ear tufts
  tufts(ctx, rand, 330, 300, 110, 90, Math.PI * 1.05, Math.PI * 1.55, 10, fur.light);
  tufts(ctx, rand, 670, 300, 110, 90, Math.PI * 1.45, Math.PI * 1.95, 10, fur.light);

  /* ---- head ---- */
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(HEAD.x, HEAD.y, HEAD.rx, HEAD.ry, 0, 0, Math.PI * 2);
  const headG = ctx.createRadialGradient(HEAD.x - 80, HEAD.y - 110, 30, HEAD.x, HEAD.y, HEAD.rx * 1.25);
  headG.addColorStop(0, fur.light);
  headG.addColorStop(0.55, fur.base);
  headG.addColorStop(1, lerpHex(fur.base, fur.dark, 0.55));
  ctx.fillStyle = headG;
  ctx.fill();
  ctx.restore();

  // cheek fur tufts
  tufts(ctx, rand, HEAD.x, HEAD.y, HEAD.rx - 6, HEAD.ry - 6, Math.PI * 0.08, Math.PI * 0.92, 11, lerpHex(fur.base, fur.light, 0.35));
  tufts(ctx, rand, HEAD.x, HEAD.y, HEAD.rx - 6, HEAD.ry - 6, Math.PI * 1.08, Math.PI * 1.92, 9, lerpHex(fur.base, fur.light, 0.2));

  // forehead M — the tabby signature
  stripe(ctx, 500, 246, 500, 320, 17, fur.stripe, 0.75);
  stripe(ctx, 440, 250, 452, 330, 15, fur.stripe, 0.72);
  stripe(ctx, 560, 250, 548, 330, 15, fur.stripe, 0.72);
  stripe(ctx, 386, 268, 408, 344, 14, fur.stripe, 0.62);
  stripe(ctx, 614, 268, 592, 344, 14, fur.stripe, 0.62);
  stripe(ctx, 340, 300, 372, 366, 12, fur.stripe, 0.5);
  stripe(ctx, 660, 300, 628, 366, 12, fur.stripe, 0.5);

  // cheek stripes
  for (let i = 0; i < 4; i++) {
    const y = 430 + i * 40;
    stripe(ctx, 300 - i * 6, y, 372 - i * 4, y + 16, 12, fur.stripe, 0.42 - i * 0.06);
    stripe(ctx, 700 + i * 6, y, 628 + i * 4, y + 16, 12, fur.stripe, 0.42 - i * 0.06);
  }

  // head edge — a soft dark rim so the silhouette survives a heavy colour grade
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(HEAD.x, HEAD.y, HEAD.rx - 3, HEAD.ry - 3, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(58,50,44,.28)';
  ctx.lineWidth = 16;
  ctx.filter = 'blur(9px)';
  ctx.stroke();
  ctx.restore();

  /* ---- eyes ---- */
  const EYE = { y: 396, dx: 108, r: 68 };
  for (const s of [-1, 1]) {
    const ex = 500 + s * EYE.dx;

    // socket shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(ex, EYE.y, EYE.r + 16, EYE.r + 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = fur.dark;
    ctx.filter = 'blur(10px)';
    ctx.fill();
    ctx.restore();

    // white ring around the eye — the tabby "spectacles"
    ctx.beginPath();
    ctx.ellipse(ex, EYE.y, EYE.r + 11, EYE.r + 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = lerpHex(fur.white, fur.base, 0.15);
    ctx.fill();

    // iris
    ctx.beginPath();
    ctx.ellipse(ex, EYE.y, EYE.r, EYE.r, 0, 0, Math.PI * 2);
    const irisG = ctx.createRadialGradient(ex - 14, EYE.y - 16, 6, ex, EYE.y, EYE.r);
    if (eyeStyle === 'glow') {
      irisG.addColorStop(0, '#fff3a8');
      irisG.addColorStop(0.55, '#ffd21f');
      irisG.addColorStop(1, '#e07a00');
    } else {
      irisG.addColorStop(0, lerpHex(fur.eye, '#ffffff', 0.35));
      irisG.addColorStop(0.6, fur.eye);
      irisG.addColorStop(1, '#6f5f34');
    }
    ctx.fillStyle = irisG;
    ctx.fill();

    // pupil — big and round, like the photo
    ctx.beginPath();
    ctx.ellipse(ex, EYE.y + 2, EYE.r * 0.66, EYE.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = fur.pupil;
    ctx.fill();

    // eyeliner — full rim, heavier across the top lid
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, EYE.y, EYE.r + 1, EYE.r + 1, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#2a2622';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(ex, EYE.y, EYE.r + 2, EYE.r + 2, 0, Math.PI * 1.04, Math.PI * 1.96);
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // catchlights
    ctx.beginPath();
    ctx.ellipse(ex - 20, EYE.y - 22, 15, 13, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ex + 19, EYE.y + 16, 7, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fill();
  }

  /* ---- muzzle ---- */
  ctx.save();
  ctx.globalAlpha = 0.96;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(500 + s * 52, 556, 66, 50, s * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = lerpHex(fur.white, fur.base, 0.1);
    ctx.fill();
  }
  ctx.restore();

  // bridge of the nose, lighter
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(500, 480, 46, 62, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur.light;
  ctx.filter = 'blur(12px)';
  ctx.fill();
  ctx.restore();

  // nose
  ctx.beginPath();
  ctx.moveTo(468, 496);
  ctx.quadraticCurveTo(500, 486, 532, 496);
  ctx.quadraticCurveTo(524, 528, 500, 540);
  ctx.quadraticCurveTo(476, 528, 468, 496);
  ctx.closePath();
  const noseG = ctx.createLinearGradient(0, 486, 0, 540);
  noseG.addColorStop(0, lerpHex(fur.pink, '#ffffff', 0.3));
  noseG.addColorStop(1, fur.pink);
  ctx.fillStyle = noseG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,52,48,.55)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // mouth
  ctx.save();
  ctx.strokeStyle = 'rgba(60,50,45,.5)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(500, 542);
  ctx.lineTo(500, 566);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(500, 566);
  ctx.quadraticCurveTo(474, 592, 448, 570);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(500, 566);
  ctx.quadraticCurveTo(526, 592, 552, 570);
  ctx.stroke();
  ctx.restore();

  // whisker dots
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = fur.dark;
  for (const s of [-1, 1]) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc(500 + s * (30 + c * 22), 534 + r * 18, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  /* ---- whiskers ----
     Drawn as short tapered arcs that fade out, so they read as whiskers rather
     than as stray lines running off the edge of the frame. */
  for (const s of [-1, 1]) {
    const rootX = 500 + s * 62;
    const set = [[-26, -74, 0.86], [-4, 22, 0.96], [18, 104, 1.0], [40, 176, 0.88]];
    for (const [dy, bow, scale] of set) {
      const endX = 500 + s * 322 * scale;
      const endY = 548 + dy + bow * 0.34;
      const g = ctx.createLinearGradient(rootX, 548, endX, endY);
      g.addColorStop(0, 'rgba(255,255,255,.85)');
      g.addColorStop(0.65, 'rgba(255,255,255,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.strokeStyle = g;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rootX, 548 + dy * 0.5);
      ctx.quadraticCurveTo(500 + s * 190 * scale, 548 + dy * 0.5 + bow * 0.2, endX, endY);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/* ── backgrounds ────────────────────────────────────────────────────────────── */
function paintScene(ctx, el, rand) {
  const g = ctx.createLinearGradient(0, 0, 0, 1000);
  g.addColorStop(0, el.sky[0]);
  g.addColorStop(1, el.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1000, 1000);

  const A = (a, fn) => { ctx.save(); ctx.globalAlpha = a; fn(); ctx.restore(); };

  switch (el.scene) {
    case 'hills':
      A(1, () => {
        ctx.beginPath();
        ctx.moveTo(-50, 1000);
        ctx.quadraticCurveTo(300, 520, 1050, 700);
        ctx.lineTo(1050, 1000);
        ctx.closePath();
        const hg = ctx.createLinearGradient(0, 560, 0, 1000);
        hg.addColorStop(0, el.ground);
        hg.addColorStop(1, lerpHex(el.ground, '#000000', 0.35));
        ctx.fillStyle = hg;
        ctx.fill();
      });
      A(0.75, () => {
        for (let i = 0; i < 6; i++) {
          const x = rand() * 1000, y = 120 + rand() * 260, r = 40 + rand() * 70;
          ctx.beginPath();
          ctx.ellipse(x, y, r * 1.9, r, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      });
      break;

    case 'falls':
      for (let i = 0; i < 26; i++) {
        const x = rand() * 1000, w = 8 + rand() * 46;
        A(0.06 + rand() * 0.18, () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, 0, w, 1000);
        });
      }
      A(0.5, () => {
        const mg = ctx.createRadialGradient(500, 780, 40, 500, 780, 620);
        mg.addColorStop(0, '#ffffff');
        mg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(0, 0, 1000, 1000);
      });
      break;

    case 'bubbles':
      for (let i = 0; i < 46; i++) {
        const x = rand() * 1000, y = rand() * 1000, r = 6 + rand() * 46;
        A(0.1 + rand() * 0.25, () => {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
      break;

    case 'flames':
      for (let i = 0; i < 30; i++) {
        const x = rand() * 1000, h = 200 + rand() * 620, w = 40 + rand() * 130;
        A(0.14 + rand() * 0.3, () => {
          ctx.beginPath();
          ctx.moveTo(x - w / 2, 1000);
          ctx.quadraticCurveTo(x - w * 0.2, 1000 - h * 0.6, x, 1000 - h);
          ctx.quadraticCurveTo(x + w * 0.3, 1000 - h * 0.55, x + w / 2, 1000);
          ctx.closePath();
          ctx.fillStyle = i % 3 ? '#ffb703' : '#ff5722';
          ctx.fill();
        });
      }
      A(0.35, () => {
        const fg = ctx.createRadialGradient(500, 900, 30, 500, 900, 700);
        fg.addColorStop(0, '#ffd166');
        fg.addColorStop(1, 'rgba(255,209,102,0)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, 1000, 1000);
      });
      break;

    case 'rays':
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + rand() * 0.1;
        A(0.05 + rand() * 0.12, () => {
          ctx.beginPath();
          ctx.moveTo(500, 500);
          ctx.arc(500, 500, 900, a, a + 0.08);
          ctx.closePath();
          ctx.fillStyle = el.grade;
          ctx.fill();
        });
      }
      A(0.28, () => {
        const rg = ctx.createRadialGradient(500, 460, 40, 500, 460, 560);
        rg.addColorStop(0, el.grade);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1000, 1000);
      });
      break;

    case 'bolts':
      for (let i = 0; i < 9; i++) {
        const x0 = rand() * 1000;
        A(0.25 + rand() * 0.4, () => {
          ctx.beginPath();
          ctx.moveTo(x0, -20);
          let x = x0, y = -20;
          while (y < 1020) { x += (rand() - 0.5) * 190; y += 90 + rand() * 90; ctx.lineTo(x, y); }
          ctx.strokeStyle = el.grade;
          ctx.lineWidth = 3 + rand() * 6;
          ctx.lineJoin = 'round';
          ctx.stroke();
        });
      }
      break;

    case 'facets':
      for (let i = 0; i < 26; i++) {
        const x = rand() * 1000, y = rand() * 1000, r = 90 + rand() * 220;
        A(0.06 + rand() * 0.16, () => {
          ctx.beginPath();
          for (let k = 0; k < 3; k++) {
            const a = rand() * Math.PI * 2;
            const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
            k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
      break;

    case 'rain':
      for (let i = 0; i < 130; i++) {
        const x = rand() * 1100 - 50, y = rand() * 1000, l = 30 + rand() * 60;
        A(0.1 + rand() * 0.28, () => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - l * 0.28, y + l);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.4;
          ctx.stroke();
        });
      }
      break;

    case 'snow':
      for (let i = 0; i < 120; i++) {
        const x = rand() * 1000, y = rand() * 1000, r = 2 + rand() * 9;
        A(0.25 + rand() * 0.5, () => {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
      break;

    case 'clouds':
      for (let i = 0; i < 16; i++) {
        const x = rand() * 1000, y = rand() * 1000, r = 60 + rand() * 150;
        A(0.14 + rand() * 0.26, () => {
          ctx.beginPath();
          ctx.ellipse(x, y, r * 1.7, r * 0.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
      break;

    case 'ribbons':
      for (let i = 0; i < 7; i++) {
        const y0 = 120 + rand() * 620;
        A(0.16 + rand() * 0.26, () => {
          ctx.beginPath();
          ctx.moveTo(-40, y0);
          ctx.bezierCurveTo(250, y0 - 200 * rand(), 700, y0 + 220 * rand(), 1040, y0 - 80);
          ctx.strokeStyle = i % 2 ? el.grade : '#ffffff';
          ctx.lineWidth = 30 + rand() * 90;
          ctx.lineCap = 'round';
          ctx.stroke();
        });
      }
      break;

    case 'ring':
      A(0.9, () => {
        ctx.beginPath();
        ctx.arc(500, 430, 340, 0, Math.PI * 2);
        ctx.strokeStyle = el.grade;
        ctx.lineWidth = 14;
        ctx.stroke();
      });
      A(0.3, () => {
        const rg = ctx.createRadialGradient(500, 430, 300, 500, 430, 560);
        rg.addColorStop(0, el.grade);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1000, 1000);
      });
      for (let i = 0; i < 60; i++) {
        const x = rand() * 1000, y = rand() * 1000;
        A(rand() * 0.7, () => {
          ctx.beginPath();
          ctx.arc(x, y, rand() * 2.4 + 0.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
      break;

    case 'dunes':
      for (let i = 0; i < 4; i++) {
        const y = 560 + i * 120;
        A(1, () => {
          ctx.beginPath();
          ctx.moveTo(-50, 1050);
          ctx.quadraticCurveTo(200 + rand() * 600, y - 130, 1050, y + 60);
          ctx.lineTo(1050, 1050);
          ctx.closePath();
          ctx.fillStyle = lerpHex(el.ground, '#000000', i * 0.12);
          ctx.fill();
        });
      }
      break;

    case 'fronds':
      for (let i = 0; i < 22; i++) {
        const x = rand() * 1000, y = rand() * 1000;
        A(0.2 + rand() * 0.35, () => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rand() * Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(0, 0, 30 + rand() * 60, 130 + rand() * 190, 0, 0, Math.PI * 2);
          ctx.fillStyle = lerpHex(el.grade, '#000000', 0.3);
          ctx.fill();
          ctx.restore();
        });
      }
      break;

    case 'stars':
      for (let i = 0; i < 190; i++) {
        const x = rand() * 1000, y = rand() * 1000;
        A(0.2 + rand() * 0.8, () => {
          ctx.beginPath();
          ctx.arc(x, y, rand() * 2.6 + 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
      A(0.3, () => {
        const ng = ctx.createRadialGradient(320, 300, 20, 320, 300, 520);
        ng.addColorStop(0, el.grade);
        ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng;
        ctx.fillRect(0, 0, 1000, 1000);
      });
      break;

    case 'streaks':
      for (let i = 0; i < 16; i++) {
        const x = rand() * 1200 - 100, y = rand() * 1000;
        A(0.2 + rand() * 0.45, () => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 240 + rand() * 300, y + 120 + rand() * 160);
          ctx.strokeStyle = el.grade;
          ctx.lineWidth = 2 + rand() * 6;
          ctx.lineCap = 'round';
          ctx.stroke();
        });
      }
      break;

    case 'code':
      ctx.font = '600 28px monospace';
      for (let col = 0; col < 34; col++) {
        const x = col * 30 + 6;
        const n = 6 + Math.floor(rand() * 26);
        const y0 = rand() * 1000;
        for (let i = 0; i < n; i++) {
          A(Math.max(0.06, 0.6 - i * 0.045), () => {
            ctx.fillStyle = el.grade;
            ctx.fillText(rand() > 0.5 ? '1' : '0', x, (y0 + i * 32) % 1020);
          });
        }
      }
      break;

    case 'circuit':
      ctx.lineCap = 'square';
      for (let i = 0; i < 42; i++) {
        let x = Math.round(rand() * 20) * 50, y = Math.round(rand() * 20) * 50;
        A(0.18 + rand() * 0.3, () => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 4; k++) {
            if (rand() > 0.5) x += (rand() > 0.5 ? 1 : -1) * 100;
            else y += (rand() > 0.5 ? 1 : -1) * 100;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = el.grade;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fillStyle = el.grade;
          ctx.fill();
        });
      }
      break;

    case 'grid':
      A(0.9, () => {
        const hg = ctx.createLinearGradient(0, 500, 0, 1000);
        hg.addColorStop(0, 'rgba(0,0,0,.45)');
        hg.addColorStop(1, 'rgba(0,0,0,.05)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, 500, 1000, 500);
      });
      A(0.5, () => {
        ctx.strokeStyle = el.grade;
        ctx.lineWidth = 3;
        for (let i = -10; i <= 30; i++) {
          ctx.beginPath();
          ctx.moveTo(500 + i * 60, 560);
          ctx.lineTo(500 + i * 460, 1010);
          ctx.stroke();
        }
        for (let i = 0; i < 14; i++) {
          const y = 560 + Math.pow(i / 13, 2.1) * 460;
          ctx.beginPath();
          ctx.moveTo(-20, y);
          ctx.lineTo(1020, y);
          ctx.stroke();
        }
      });
      break;

    case 'petals':
      for (let i = 0; i < 46; i++) {
        const x = rand() * 1000, y = rand() * 1000, r = 8 + rand() * 22;
        A(0.35 + rand() * 0.5, () => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rand() * Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
          ctx.fillStyle = i % 3 ? '#ff8fbc' : '#ffffff';
          ctx.fill();
          ctx.restore();
        });
      }
      break;

    case 'ripples':
      for (let i = 0; i < 20; i++) {
        const y = rand() * 1000;
        A(0.1 + rand() * 0.28, () => {
          ctx.beginPath();
          ctx.moveTo(-40, y);
          for (let x = -40; x <= 1040; x += 40) ctx.lineTo(x, y + Math.sin(x / 90 + i) * 18);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4 + rand() * 10;
          ctx.stroke();
        });
      }
      break;

    case 'noise':
      for (let i = 0; i < 2400; i++) {
        const x = rand() * 1000, y = rand() * 1000;
        A(rand() * 0.35, () => {
          ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
          ctx.fillRect(x, y, 4 + rand() * 10, 3);
        });
      }
      break;

    case 'gradient':
    default:
      A(0.35, () => {
        const rg = ctx.createRadialGradient(500, 420, 40, 500, 420, 640);
        rg.addColorStop(0, '#ffffff');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1000, 1000);
      });
      break;
  }
}

/* ── one variant ────────────────────────────────────────────────────────────── */
async function renderVariant(el, size, photo) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.scale(size / 1000, size / 1000);
  const rand = makeRng('scene-' + el.id);

  paintScene(ctx, el, rand);

  // the cat, on its own layer so the grade only touches the fur
  const catCanvas = createCanvas(1000, 1000);
  const cctx = catCanvas.getContext('2d');
  if (photo) {
    cctx.drawImage(photo, 0, 0, 1000, 1000);
  } else {
    drawZazu(cctx, { eye: el.eye });
  }

  /* Colour grade.
     'color' takes the hue and saturation of the grade but keeps the cat's own
     luminance — the markings, the eyes and the shading all survive. A flat
     source-atop wash would erase them, which is what makes the reference
     images look washed out. A light source-atop pass on top pushes the tint
     the rest of the way for the loud elements. */
  const gradeCanvas = createCanvas(1000, 1000);
  const gctx = gradeCanvas.getContext('2d');
  gctx.fillStyle = el.grade;
  gctx.fillRect(0, 0, 1000, 1000);
  gctx.globalCompositeOperation = 'destination-in';
  gctx.drawImage(catCanvas, 0, 0);

  cctx.save();
  cctx.globalCompositeOperation = 'color';
  cctx.globalAlpha = Math.min(1, el.mix + 0.34);
  cctx.drawImage(gradeCanvas, 0, 0);
  cctx.restore();

  cctx.save();
  cctx.globalCompositeOperation = 'source-atop';
  cctx.globalAlpha = el.mix * 0.3;
  cctx.fillStyle = el.grade;
  cctx.fillRect(0, 0, 1000, 1000);
  cctx.restore();

  // key light from the upper left, so the graded fur still has form
  cctx.save();
  cctx.globalCompositeOperation = 'source-atop';
  cctx.globalAlpha = 0.17;
  const lg = cctx.createRadialGradient(400, 300, 20, 500, 500, 660);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  cctx.fillStyle = lg;
  cctx.fillRect(0, 0, 1000, 1000);
  cctx.restore();

  /* Sit the cat in the scene's light level: a bright cat pasted on a night
     background is the tell that it was composited. Darkness is derived from the
     scene's own sky, so a new element needs no extra tuning. */
  const lum = (h => {
    const v = i => parseInt(h.slice(i, i + 2), 16) / 255;
    return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5);
  })(el.sky[1]);
  if (lum < 0.6) {
    cctx.save();
    cctx.globalCompositeOperation = 'source-atop';
    cctx.globalAlpha = (0.6 - lum) * 0.72;
    cctx.fillStyle = lerpHex('#000000', el.grade, 0.28);
    cctx.fillRect(0, 0, 1000, 1000);
    cctx.restore();
  }

  // contact shadow under the jaw and along the bottom
  cctx.save();
  cctx.globalCompositeOperation = 'source-atop';
  cctx.globalAlpha = 0.16;
  const sg = cctx.createLinearGradient(0, 700, 0, 1000);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(0,0,0,.8)');
  cctx.fillStyle = sg;
  cctx.fillRect(0, 0, 1000, 1000);
  cctx.restore();

  // glowing eyes punch back through the grade
  if (el.eye === 'glow' && !photo) {
    cctx.save();
    cctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const g = cctx.createRadialGradient(500 + s * 104, 398, 4, 500 + s * 104, 398, 78);
      g.addColorStop(0, 'rgba(255,225,120,.95)');
      g.addColorStop(0.45, 'rgba(255,180,20,.45)');
      g.addColorStop(1, 'rgba(255,150,0,0)');
      cctx.fillStyle = g;
      cctx.fillRect(0, 0, 1000, 1000);
    }
    cctx.restore();
  }

  ctx.drawImage(catCanvas, 0, 0, 1000, 1000);

  // vignette ties the subject to the scene
  ctx.save();
  const vg = ctx.createRadialGradient(500, 480, 320, 500, 500, 780);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 1000, 1000);
  ctx.restore();

  return canvas;
}

/* ── favicon / logo ─────────────────────────────────────────────────────────── */
async function renderMark(size, photo) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.scale(size / 1000, size / 1000);

  ctx.fillStyle = '#d6ff00';
  ctx.beginPath();
  ctx.arc(500, 500, 500, 0, Math.PI * 2);
  ctx.fill();

  // head-and-shoulders crop, scaled up so it reads at 32px
  const cat = createCanvas(1000, 1000);
  const cctx = cat.getContext('2d');
  if (photo) cctx.drawImage(photo, 0, 0, 1000, 1000);
  else drawZazu(cctx, { eye: 'dark' });

  ctx.save();
  ctx.beginPath();
  ctx.arc(500, 500, 500, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(500, 560);
  ctx.scale(1.42, 1.42);
  ctx.translate(-500, -430);
  ctx.drawImage(cat, 0, 0, 1000, 1000);
  ctx.restore();

  return canvas;
}

/* ── main ───────────────────────────────────────────────────────────────────── */
async function main() {
  const args = process.argv.slice(2);
  const sizeIdx = args.indexOf('--size');
  const size = sizeIdx >= 0 ? parseInt(args[sizeIdx + 1], 10) : 448;
  const countArg = args.find(a => /^\d+$/.test(a));
  const count = Math.min(countArg ? parseInt(countArg, 10) : ELEMENTS.length, ELEMENTS.length);

  let photo = null;
  if (fs.existsSync(SOURCE_PHOTO)) {
    photo = await loadImage(SOURCE_PHOTO);
    console.log(`using the real photo: assets/zazu-source.png (${photo.width}×${photo.height})`);
  } else {
    console.log('no assets/zazu-source.png — drawing the portrait in code');
  }

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));

  const manifest = [];
  for (let i = 0; i < count; i++) {
    const el = ELEMENTS[i];
    const canvas = await renderVariant(el, size, photo);
    const file = `${String(i + 1).padStart(2, '0')}-${el.id}.png`;
    fs.writeFileSync(path.join(OUT, file), await canvas.encode('png'));
    manifest.push({ n: i + 1, id: el.id, name: el.name, file, tier: el.tier });
    process.stdout.write(`\r  ${i + 1}/${count} ${el.name}${' '.repeat(20)}`);
  }
  process.stdout.write('\n');

  fs.writeFileSync(
    path.join(ROOT, 'assets', 'js', 'zazus.js'),
    '/* Generated by generator/tools/draw-zazu.js — do not edit by hand. */\n' +
    `window.ZAZUS = ${JSON.stringify(manifest, null, 0)};\n`,
  );

  for (const [name, px] of [['favicon-32.png', 32], ['favicon-180.png', 180], ['zazu-logo.png', 512]]) {
    const c = await renderMark(px, photo);
    fs.writeFileSync(path.join(ROOT, 'assets', name), await c.encode('png'));
  }

  const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(`${count} zazus at ${size}px → assets/zazu/  (${(bytes / 1e6).toFixed(2)} MB)`);
  console.log('favicon + logo → assets/favicon-32.png, favicon-180.png, zazu-logo.png');
}

main().catch(e => { console.error(e); process.exit(1); });
