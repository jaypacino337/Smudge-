#!/usr/bin/env node
/**
 * Per-category QA sheet — every option in one category, over the same base goat.
 *
 *   npm run sheet -- 07-horns
 *   npm run sheet -- 05-mouth 02-coat
 *   npm run sheet                    # every category, one sheet each
 *
 * The whole-collection preview tells you the collection works. This tells you which
 * single layer is wrong, which is the question you actually have when something looks
 * broken. Output lands in output/sheets/.
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config = require('../config');

const ROOT = path.join(__dirname, '..');
const LAYERS = path.join(ROOT, 'layers');
const OUT = path.join(ROOT, 'output', 'sheets');

const CELL = 300;
const PAD = 12;
const LABEL = 30;

/** A plain goat to sit every option on top of, so you judge the option and nothing else. */
const BASE = {
  '00-background': 'bone',
  '02-coat': 'alpine-upright',
  '05-mouth': 'chewing',
  '06-eyes': 'slit',
};

function optionsIn(folder) {
  return fs.readdirSync(path.join(LAYERS, folder))
    .filter(f => /\.png$/i.test(f))
    .map(f => ({ value: f.replace(/#\d+\.png$/i, ''), file: path.join(LAYERS, folder, f) }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

async function sheet(folder) {
  const opts = optionsIn(folder);
  const cols = Math.min(6, opts.length);
  const rows = Math.ceil(opts.length / cols);
  const w = cols * (CELL + PAD) + PAD;
  const h = rows * (CELL + PAD + LABEL) + PAD;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#20222A';
  ctx.fillRect(0, 0, w, h);

  // everything below the category under test, then everything above it
  const order = config.layerOrder.map(l => l.folder);
  const idx = order.indexOf(folder);
  if (idx < 0) throw new Error(`unknown category "${folder}" — expected one of\n    ${order.join('\n    ')}`);

  for (let i = 0; i < opts.length; i++) {
    const cx = PAD + (i % cols) * (CELL + PAD);
    const cy = PAD + Math.floor(i / cols) * (CELL + PAD + LABEL);

    for (const f of order) {
      const pick = f === folder ? opts[i].value : BASE[f];
      if (!pick || pick === 'none') continue;
      const hit = optionsIn(f).find(o => o.value === pick);
      if (!hit) continue;
      ctx.drawImage(await loadImage(hit.file), cx, cy, CELL, CELL);
    }

    ctx.fillStyle = '#E8E4DA';
    ctx.font = '600 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts[i].value, cx + CELL / 2, cy + CELL + 22);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `${folder}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`  output/sheets/${folder}.png   ${opts.length} options`);
}

async function main() {
  const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const folders = want.length ? want : config.layerOrder.map(l => l.folder);
  console.log('');
  for (const f of folders) await sheet(f);
  console.log('');
}

main().catch(e => { console.error(`\n  ✗ ${e.message}\n`); process.exit(1); });
