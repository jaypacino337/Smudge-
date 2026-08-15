#!/usr/bin/env node
/**
 * Renders the hand-picked dawgs used on the website, plus the X banner.
 *
 *   npm run showcase
 *
 * These are explicit trait combinations rather than random pulls, because the hero row
 * should show off range — different fur, ears, hats, and eyes — instead of whatever the
 * RNG happened to produce. Output is small (420px) and committed, so the site has real
 * art without checking in 1,111 full-size PNGs.
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config = require('../config');

const ROOT = path.join(__dirname, '..');
const LAYERS = path.join(ROOT, 'layers');
const OUT = path.join(ROOT, '..', 'showcase');

const SIZE = 420;

/** The six on the homepage — chosen to show off range, not rarity. */
const PICKS = [
  { name: 'hero-1', background: 'sky',       fur: 'tan-floppy',    outfit: 'puffer-jacket', mouth: 'tongue-out',  eyes: 'dots',         headwear: 'backwards-cap', held: 'tennis-ball' },
  { name: 'hero-2', background: 'bubblegum', fur: 'shiba-pricked', outfit: 'hoodie',        mouth: 'smirk',       eyes: 'shades-ready', headwear: 'none',          eyewear: 'shades',   held: 'deli-cup' },
  { name: 'hero-3', background: 'void',      fur: 'black-lab',     outfit: 'tuxedo',        mouth: 'big-grin',    eyes: 'laser',        headwear: 'crown',         overlay: 'laser-glow' },
  { name: 'hero-4', background: 'mint',      fur: 'husky-pricked', outfit: 'hockey-jersey', mouth: 'bark',        eyes: 'wide-shock',   headwear: 'beanie',        held: 'hot-dog' },
  { name: 'hero-5', background: 'tangerine', fur: 'cream-floppy',  outfit: 'hawaiian',      mouth: 'bubblegum',   eyes: 'heart-eyes',   headwear: 'bucket-hat',    held: 'lollipop' },
  { name: 'hero-6', background: 'midnight',  fur: 'poodle-curly',  outfit: 'gold-chain',    mouth: 'cigar',       eyes: 'side-eye',     headwear: 'do-rag',        held: 'boombox', overlay: 'sparkle' },

  // The chase tier — must match config.forced -> 'Dawg King'.traits exactly.
  { name: 'dawg-king', background: 'sunburst', fur: 'golden-floppy', outfit: 'gold-chain',
    mouth: 'big-grin', eyes: 'glowing', headwear: 'crown', overlay: 'sparkle' },
];

const ORDER = config.layerOrder.map(l => ({ folder: l.folder, key: l.folder.replace(/^\d+-/, '') }));

/** Resolve `<name>#<weight>.png` from a bare trait value. */
function fileFor(folder, value) {
  const dir = path.join(LAYERS, folder);
  const hit = fs.readdirSync(dir).find(f => f.replace(/#\d+\.png$/i, '') === value);
  if (!hit) throw new Error(`layers/${folder}: no file for "${value}"`);
  return path.join(dir, hit);
}

async function compose(pick, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  for (const { folder, key } of ORDER) {
    const value = pick[key];
    if (!value || value === 'none') continue;
    ctx.drawImage(await loadImage(fileFor(folder, value)), 0, 0, size, size);
  }
  return canvas;
}

// 'shades-ready' is shorthand for "plain eyes, because shades go over them"
const RESOLVED = PICKS.map(p => ({ ...p, eyes: p.eyes === 'shades-ready' ? 'dots' : p.eyes }));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const pick of RESOLVED) {
    const canvas = await compose(pick, SIZE);
    fs.writeFileSync(path.join(OUT, `${pick.name}.png`), canvas.toBuffer('image/png'));
    console.log(`  showcase/${pick.name}.png`);
  }

  // X / Twitter banner — 1500x500, five dawgs on a flat band
  const bw = 1500, bh = 500;
  const banner = createCanvas(bw, bh);
  const bctx = banner.getContext('2d');
  bctx.fillStyle = '#A8D8F0';
  bctx.fillRect(0, 0, bw, bh);
  const cell = 470;
  for (let i = 0; i < 5; i++) {
    const p = { ...RESOLVED[i + 1] };
    delete p.background;
    delete p.overlay;
    const c = await compose(p, cell);
    bctx.drawImage(c, 250 + i * 250 - cell / 2, bh - cell + 70);
  }
  fs.writeFileSync(path.join(OUT, 'banner.png'), banner.toBuffer('image/png'));
  console.log(`  showcase/banner.png  (1500x500, X banner)`);

  // Square PFP for X / Discord — one dawg, tight crop
  const pfp = await compose({ ...RESOLVED[2] }, 800);
  fs.writeFileSync(path.join(OUT, 'pfp.png'), pfp.toBuffer('image/png'));
  console.log(`  showcase/pfp.png     (800x800, profile picture)`);
}

main().catch(e => { console.error(`\n  ✗ ${e.message}\n`); process.exit(1); });
