#!/usr/bin/env node
/**
 * Renders the hand-picked goats used on the website, plus the X banner and a PFP.
 *
 *   npm run showcase
 *
 * These are explicit trait combinations rather than random pulls, because the hero row
 * should show off range — different coats, ears, horns and eyes — instead of whatever the
 * RNG happened to produce. Output is small (440px) and committed, so the site has real
 * art without checking 2,222 full-size PNGs into git.
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config = require('../config');
const { violatesExclusions } = require('../build');

const ROOT = path.join(__dirname, '..');
const LAYERS = path.join(ROOT, 'layers');
const OUT = path.join(ROOT, '..', 'showcase');

const SIZE = 440;

/** The six on the homepage — chosen to show off range, not rarity. */
const PICKS = [
  { name: 'hero-1', background: 'bone',        coat: 'alpine-upright',  horns: 'scimitar',       outfit: 'flannel',     mouth: 'grass-blade', eyes: 'slit',     held: 'tin-can',   backdrop: 'ridge-line' },
  { name: 'hero-2', background: 'ember',       coat: 'boer-lop',        horns: 'boer-curl',      outfit: 'puffer',      mouth: 'smirk',       eyes: 'side-eye', headwear: 'beanie' },
  { name: 'hero-3', background: 'cobalt',      coat: 'black-alpine',    horns: 'gold-tipped',    outfit: 'tuxedo',      mouth: 'gold-grill',  eyes: 'laser',    headwear: 'crown', overlay: 'laser-glow' },
  { name: 'hero-4', background: 'glacier',     coat: 'saanen-upright',  horns: 'ibex-ridged',    outfit: 'harness',     mouth: 'chewing',     eyes: 'focused',  headwear: 'headlamp', held: 'ice-axe' },
  { name: 'hero-5', background: 'void',        coat: 'gilded',          horns: 'markhor-spiral', outfit: 'summit-cape', mouth: 'grin',        eyes: 'money',    held: 'trophy',    overlay: 'gold-shimmer' },
  { name: 'hero-6', background: 'alpine',      coat: 'angora-shag',     horns: 'corkscrew',      outfit: 'wool-scarf',  mouth: 'tongue-out',  eyes: 'heart',    held: 'espresso',  overlay: 'snowfall' },
];

const ORDER = config.layerOrder.map(l => ({ folder: l.folder, key: l.folder.replace(/^\d+-/, '') }));

/**
 * Hand-picked combinations are exactly where an illegal pairing sneaks onto the site —
 * the generator would never roll a black goat on a void background, but a human writing
 * the list by hand happily will. Check the picks against the real rules.
 */
function assertLegal(pick) {
  const full = {};
  for (const { key } of ORDER) full[key] = pick[key] || 'none';
  if (violatesExclusions(full)) {
    const offenders = config.exclusions
      .filter(r => r.when.some(t => { const [c, v] = [t.slice(0, t.indexOf(':')), t.slice(t.indexOf(':') + 1)]; return full[c] === v; }))
      .map(r => `${r.when.join(' / ')} → forbids ${r.forbid.join(', ')}`);
    throw new Error(
      `showcase pick "${pick.name}" breaks an exclusion rule in config.js:\n    ` +
      (offenders.join('\n    ') || '(see config.exclusions)')
    );
  }
}

/** Resolve `<name>#<weight>.png` from a bare trait value. */
function fileFor(folder, value) {
  const dir = path.join(LAYERS, folder);
  if (!fs.existsSync(dir)) {
    throw new Error(`layers/${folder} is missing — run \`npm run art\` first.`);
  }
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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  PICKS.forEach(assertLegal);

  for (const pick of PICKS) {
    const canvas = await compose(pick, SIZE);
    fs.writeFileSync(path.join(OUT, `${pick.name}.png`), canvas.toBuffer('image/png'));
    console.log(`  showcase/${pick.name}.png`);
  }

  // X / Twitter banner — 1500x500, a herd on a flat alpine band
  const bw = 1500, bh = 500;
  const banner = createCanvas(bw, bh);
  const bctx = banner.getContext('2d');
  bctx.fillStyle = '#EFE7D6';
  bctx.fillRect(0, 0, bw, bh);
  bctx.fillStyle = '#1F5C46';
  bctx.fillRect(0, bh - 90, bw, 90);
  const cell = 470;
  for (let i = 0; i < 5; i++) {
    const p = { ...PICKS[i + 1] };
    delete p.background;
    delete p.backdrop;
    delete p.overlay;
    const c = await compose(p, cell);
    bctx.drawImage(c, 250 + i * 250 - cell / 2, bh - cell + 60);
  }
  fs.writeFileSync(path.join(OUT, 'banner.png'), banner.toBuffer('image/png'));
  console.log(`  showcase/banner.png  (1500x500, X banner)`);

  // Square PFP for X / Discord
  const pfp = await compose(PICKS[2], 800);
  fs.writeFileSync(path.join(OUT, 'pfp.png'), pfp.toBuffer('image/png'));
  console.log(`  showcase/pfp.png     (800x800, profile picture)`);
}

main().catch(e => { console.error(`\n  ✗ ${e.message}\n`); process.exit(1); });
