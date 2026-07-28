#!/usr/bin/env node
/**
 * Generates placeholder PNGs for all 125 layers straight from art/prompts.json.
 *
 *   npm run stub
 *
 * Why: you can run the ENTIRE pipeline — rarity, exclusions, metadata, contact sheet,
 * even a devnet candy machine — before a single piece of real art exists. Then you drop
 * the real PNGs in on top of the stubs, same filenames, and nothing else changes.
 *
 * Stubs are deliberately ugly: flat color blocks with the trait name printed on them.
 * You will never mistake one for finished art.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPEC = path.join(ROOT, '..', 'art', 'prompts.json');
const LAYERS = path.join(ROOT, 'layers');

let canvasLib;
try {
  canvasLib = require('@napi-rs/canvas');
} catch {
  console.error('\n  ✗ needs @napi-rs/canvas — run `npm install` in generator/ first.\n');
  process.exit(1);
}
const { createCanvas } = canvasLib;

const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
const S = spec.canvas;
const A = spec.anchors;

// Deterministic hue per layer name so stubs are visually distinguishable.
function hueOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

// Rough on-canvas box per category, so the contact sheet reads like a real dog-ish stack.
const BOXES = {
  '00-background': null,                                  // full bleed
  '01-backdrop':  { x: 140,  y: 200,  w: 1768, h: 700 },
  '02-fur':       { x: 420,  y: A.headTopY, w: 1208, h: 1180 },
  '03-marking':   { x: 700,  y: 760,  w: 660,  h: 420 },
  '04-outfit':    { x: 460,  y: 1330, w: 1128, h: 620 },
  '05-mouth':     { x: A.bodyCenterX - 260, y: A.muzzleCenterY - 210, w: 520, h: 420 },
  '06-eyes':      { x: A.bodyCenterX - 310, y: A.eyeLineY - 150, w: 620, h: 300 },
  '07-headwear':  { x: 560,  y: 400,  w: 928,  h: 320 },
  '08-eyewear':   { x: 700,  y: 790,  w: 650,  h: 190 },
  '09-held':      { x: A.heldItemX - 310, y: A.heldItemY - 310, w: 620, h: 620 },
  '10-overlay':   null,                                   // full bleed
};

function drawStub(cat, layer) {
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  const hue = hueOf(cat.id + layer.file);
  const box = BOXES[cat.id];

  if (cat.id === '00-background') {
    ctx.fillStyle = `hsl(${hue} 45% 72%)`;
    ctx.fillRect(0, 0, S, S);
  } else if (cat.id === '10-overlay') {
    ctx.fillStyle = `hsla(${hue} 80% 60% / 0.14)`;
    ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = `hsla(${hue} 70% 58% / 0.92)`;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 14;
    const r = 48;
    const { x, y, w, h } = box;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Label
  const cx = box ? box.x + box.w / 2 : S / 2;
  const cy = box ? box.y + box.h / 2 : 160;
  ctx.fillStyle = '#111';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(layer.name, cx, cy);
  ctx.font = '40px sans-serif';
  ctx.fillStyle = '#111a';
  ctx.fillText(cat.name, cx, cy + 70);

  return canvas.toBuffer('image/png');
}

function transparent() {
  return createCanvas(S, S).toBuffer('image/png');
}

let n = 0;
for (const cat of spec.categories) {
  const dir = path.join(LAYERS, cat.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const layer of cat.layers) {
    fs.writeFileSync(path.join(dir, `${layer.file}#${layer.weight}.png`), drawStub(cat, layer));
    n++;
  }
  if (cat.allowNone) {
    fs.writeFileSync(path.join(dir, `none#${cat.noneWeight}.png`), transparent());
    n++;
  }
  console.log(`  ${cat.id.padEnd(16)} ${cat.layers.length + (cat.allowNone ? 1 : 0)} stubs`);
}
console.log(`\n  ${n} placeholder layers written to generator/layers/`);
console.log(`  now run:  npm run preview -- 36\n`);
