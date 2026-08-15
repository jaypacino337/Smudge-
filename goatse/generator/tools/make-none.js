#!/usr/bin/env node
/**
 * Creates the fully-transparent `none#<weight>.png` file in every category that allows one.
 *
 *   npm run make-none
 *
 * A "None" trait must be a REAL transparent PNG, not a missing file — the generator picks
 * from what's on disk, so a missing none.png means that category is never empty and your
 * rarity is silently wrong.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'art', 'prompts.json'), 'utf8'));

let canvasLib;
try {
  canvasLib = require('@napi-rs/canvas');
} catch {
  console.error('\n  ✗ needs @napi-rs/canvas — run `npm install` in generator/ first.\n');
  process.exit(1);
}

const blank = canvasLib.createCanvas(spec.canvas, spec.canvas).toBuffer('image/png');
let n = 0;

for (const cat of spec.categories) {
  if (!cat.allowNone) continue;
  const dir = path.join(ROOT, 'layers', cat.id);
  fs.mkdirSync(dir, { recursive: true });

  // Remove any stale none#*.png so re-tuning the weight doesn't leave two of them.
  for (const f of fs.readdirSync(dir)) {
    if (/^none#\d+\.png$/i.test(f)) fs.unlinkSync(path.join(dir, f));
  }

  fs.writeFileSync(path.join(dir, `none#${cat.noneWeight}.png`), blank);
  console.log(`  ${cat.id}/none#${cat.noneWeight}.png`);
  n++;
}
console.log(`\n  ${n} transparent None layers written.\n`);
