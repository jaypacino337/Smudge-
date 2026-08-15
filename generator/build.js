#!/usr/bin/env node
/**
 * PUMP DAWGS — generative build engine
 *
 *   npm run build -- 1111       full collection: images + metadata + rarity report
 *   npm run build -- 50 --dry   no image compositing, just DNA/metadata/rarity (fast)
 *   npm run preview -- 60       contact sheet at output/_preview.png
 *
 * Deterministic: same `seed` in config.js always produces the same collection.
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

const ROOT = __dirname;
const LAYERS = path.join(ROOT, 'layers');
const OUT = path.join(ROOT, 'output');

// ─── Seeded RNG (mulberry32) ─────────────────────────────────────────────────
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

// ─── Layer discovery ─────────────────────────────────────────────────────────
// Filenames are `<name>#<weight>.png`. Weight defaults to 100 if the suffix is absent.
function loadLayers() {
  const cats = [];
  for (const entry of config.layerOrder) {
    const dir = path.join(LAYERS, entry.folder);
    if (!fs.existsSync(dir)) {
      throw new Error(
        `Missing layer folder: layers/${entry.folder}\n` +
        `  Run \`npm run stub\` to generate placeholder art for the whole pipeline.`
      );
    }
    const files = fs.readdirSync(dir).filter(f => /\.png$/i.test(f));
    if (!files.length) throw new Error(`layers/${entry.folder} has no PNGs.`);

    const options = files.map(file => {
      const base = file.replace(/\.png$/i, '');
      const m = base.match(/^(.*?)#(\d+)$/);
      return {
        value: m ? m[1] : base,
        weight: m ? parseInt(m[2], 10) : 100,
        file: path.join(dir, file),
      };
    }).sort((a, b) => a.value.localeCompare(b.value));

    const key = entry.folder.replace(/^\d+-/, '');
    cats.push({ ...entry, key, options, total: options.reduce((s, o) => s + o.weight, 0) });
  }
  return cats;
}

// ─── Exclusion matching ──────────────────────────────────────────────────────
// Token grammar:  cat:value | cat:*  (any non-none) | cat:!value (any non-none except value)
function tokenMatches(token, pick) {
  const idx = token.indexOf(':');
  const cat = token.slice(0, idx);
  const want = token.slice(idx + 1);
  const got = pick[cat];
  if (got === undefined) return false;
  if (want === '*') return got !== 'none';
  if (want.startsWith('!')) return got !== 'none' && got !== want.slice(1);
  return got === want;
}

function violatesExclusions(pick) {
  for (const rule of config.exclusions) {
    if (!rule.when.some(t => tokenMatches(t, pick))) continue;
    for (const f of rule.forbid) {
      if (tokenMatches(f, pick)) return true;
    }
  }
  return false;
}

// ─── Weighted selection ──────────────────────────────────────────────────────
function pickWeighted(cat, rng) {
  let r = rng() * cat.total;
  for (const o of cat.options) {
    r -= o.weight;
    if (r <= 0) return o.value;
  }
  return cat.options[cat.options.length - 1].value;
}

function dnaOf(pick, cats) {
  return cats.map(c => `${c.key}:${pick[c.key]}`).join('|');
}

/**
 * Roll one valid combination.
 *   pins    — force specific categories to a value
 *   blocked — set of `cat:value` that random rolls may never produce, so that forced
 *             counts stay EXACT instead of drifting upward when the weighted roll
 *             happens to land on the same value again.
 */
function rollOne(cats, rng, seen, pins = {}, blocked = null, budget = 500) {
  for (let attempt = 0; attempt < budget; attempt++) {
    const pick = {};
    let rejected = false;
    for (const c of cats) {
      if (pins[c.key] !== undefined) { pick[c.key] = pins[c.key]; continue; }
      const v = pickWeighted(c, rng);
      if (blocked && blocked.has(`${c.key}:${v}`)) { rejected = true; break; }
      pick[c.key] = v;
    }
    if (rejected) continue;
    if (violatesExclusions(pick)) continue;
    const dna = dnaOf(pick, cats);
    if (seen.has(dna)) continue;
    seen.add(dna);
    return { pick, dna };
  }
  return null;
}

// ─── Generate the full set of combinations ───────────────────────────────────
function generateSet(cats, supply, rng) {
  const seen = new Set();
  const items = [];
  const blocked = new Set();
  let rerolls = 0;

  // 1. Forced traits first — these are guaranteed, so they get first claim on the space.
  //    Each forced value is then blocked from the random fill, keeping the count exact.
  //
  //    Counts are scaled to the build size. Without this, a 36-piece preview would seed
  //    32 forced pieces and show you a contact sheet that's almost all crowns — nothing
  //    like the real collection.
  const scale = supply / config.supply;
  for (const f of config.forced || []) {
    // `trait: 'eyes:laser'` pins one category. `traits: [...]` pins several at once,
    // which is how you build a locked chase tier (every Dawg King looks the same).
    const specs = f.traits || [f.trait];
    const pins = {};
    let skip = false;

    for (const spec of specs) {
      const [cat, value] = spec.split(':');
      const catDef = cats.find(c => c.key === cat);
      if (!catDef) throw new Error(`forced: unknown category "${cat}"`);
      if (!catDef.options.some(o => o.value === value)) {
        console.warn(`  ! forced trait ${spec} has no matching file — skipping`);
        skip = true;
        break;
      }
      pins[cat] = value;
    }
    if (skip) continue;

    const label = f.name || specs.join(' + ');
    const want = scale === 1 ? f.count : Math.round(f.count * scale);
    for (let i = 0; i < want; i++) {
      const r = rollOne(cats, rng, seen, pins, blocked);
      if (!r) throw new Error(
        `Could not satisfy forced tier "${label}" (#${i + 1}/${want}).\n` +
        `  Its exclusion rules are probably too tight — check config.exclusions.`
      );
      if (f.name) r.tier = f.name;   // surfaces as a metadata attribute
      items.push(r);
    }
    // Block only single-trait pins. A multi-trait tier blocks nothing by default, because
    // its individual traits should still appear on ordinary dawgs — it's the *combination*
    // that's rare, and DNA uniqueness already prevents accidental duplicates.
    //
    // `reserve` marks traits that belong to this tier ALONE, so e.g. a crown can never
    // show up on a non-King.
    if (specs.length === 1) blocked.add(specs[0]);
    for (const r of f.reserve || []) blocked.add(r);
  }

  // 2. Fill the remainder with weighted random, never re-drawing a forced value.
  while (items.length < supply) {
    const r = rollOne(cats, rng, seen, {}, blocked);
    if (!r) {
      rerolls++;
      if (rerolls > config.maxRerolls) throw new Error(
        `Gave up after ${config.maxRerolls} failed rolls at ${items.length}/${supply}.\n` +
        `  Either loosen config.exclusions or add more layer options.`
      );
      continue;
    }
    items.push(r);
  }

  if (config.shuffleOutput) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }
  return items;
}

// ─── Metadata ────────────────────────────────────────────────────────────────
function titleCase(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function buildMetadata(item, cats, id) {
  const attributes = [];
  for (const c of cats) {
    const v = item.pick[c.key];
    if (v === 'none' && !config.emitNoneTraits) continue;
    attributes.push({ trait_type: c.trait, value: titleCase(v) });
  }
  // Chase tiers get their own attribute so marketplaces can filter on it directly.
  if (item.tier) attributes.push({ trait_type: 'Tier', value: item.tier });
  return {
    name: `${config.name} #${id}`,
    symbol: config.symbol,
    description: config.description,
    image: `${id}.png`,
    external_url: config.externalUrl,
    attributes,
    properties: {
      files: [{ uri: `${id}.png`, type: 'image/png' }],
      category: 'image',
      creators: config.creators,
    },
    seller_fee_basis_points: config.sellerFeeBasisPoints,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function loadCanvas() {
  try {
    return require('@napi-rs/canvas');
  } catch {
    return null;
  }
}

async function renderItem(canvasLib, cats, item, size) {
  const { createCanvas, loadImage } = canvasLib;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  for (const c of cats) {
    const value = item.pick[c.key];
    if (value === 'none') continue;
    const opt = c.options.find(o => o.value === value);
    const img = await loadImage(opt.file);
    ctx.drawImage(img, 0, 0, size, size);
  }
  return canvas;
}

/**
 * PNG encoding. `config.optimize` converts to an indexed-palette PNG, which cuts the
 * collection from ~182 MB to ~63 MB with a mean per-channel error of 0.02/255 — visually
 * identical, because this art is flat cel colour rather than photographic. Upload size is
 * what you pay for on Arweave, so this is free money.
 *
 * Counter-intuitively 256 colours compresses SMALLER than 128: fewer colours forces the
 * quantiser to dither, and dithering is noise, and noise doesn't compress.
 */
function loadSharp() {
  try { return require('sharp'); } catch { return null; }
}

async function encodePng(canvas, sharpLib) {
  const raw = canvas.toBuffer('image/png');
  if (!sharpLib || !config.optimize) return raw;
  const colors = config.optimize.colors || 256;
  return sharpLib(raw).png({ palette: true, colors, effort: 7 }).toBuffer();
}

// ─── Rarity report ───────────────────────────────────────────────────────────
function rarityReport(items, cats) {
  const report = {};
  for (const c of cats) {
    const counts = {};
    for (const it of items) {
      const v = it.pick[c.key];
      counts[v] = (counts[v] || 0) + 1;
    }
    report[c.trait] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value: titleCase(value),
        count,
        pct: +((count / items.length) * 100).toFixed(2),
      }));
  }
  return report;
}

// ─── Contact sheet ───────────────────────────────────────────────────────────
async function contactSheet(canvasLib, cats, items, n) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cell = 256;
  const sheet = canvasLib.createCanvas(cols * cell, rows * cell);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#0a0a0b';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  for (let i = 0; i < n; i++) {
    const c = await renderItem(canvasLib, cats, items[i], cell);
    sctx.drawImage(c, (i % cols) * cell, Math.floor(i / cols) * cell);
  }
  return sheet;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const isPreview = argv.includes('--preview');
  const dry = argv.includes('--dry');
  const count = parseInt(argv.find(a => /^\d+$/.test(a)) || config.supply, 10);

  console.log(`\n  ${config.name.toUpperCase()}  —  building ${count}\n`);

  const cats = loadLayers();
  for (const c of cats) {
    console.log(`  ${c.folder.padEnd(16)} ${String(c.options.length).padStart(3)} options`);
  }

  const space = cats.reduce((p, c) => p * BigInt(c.options.length), 1n);
  console.log(`\n  combination space: ${space.toLocaleString('en-US')}`);
  if (space < BigInt(count)) {
    throw new Error(`Only ${space} combinations possible but ${count} requested.`);
  }

  const rng = makeRng(config.seed);
  console.log(`  rolling combinations (seed "${config.seed}")...`);
  const items = generateSet(cats, count, rng);
  console.log(`  ${items.length} unique combinations\n`);

  fs.mkdirSync(OUT, { recursive: true });
  const canvasLib = dry ? null : loadCanvas();

  if (isPreview) {
    if (!canvasLib) throw new Error('Preview needs @napi-rs/canvas — run `npm install`.');
    const n = Math.min(count, items.length);
    const sheet = await contactSheet(canvasLib, cats, items, n);
    const p = path.join(OUT, '_preview.png');
    fs.writeFileSync(p, sheet.toBuffer('image/png'));
    console.log(`  contact sheet → output/_preview.png  (${n} dawgs)`);
    console.log(`  eyeball it, then add exclusion rules to config.js for anything broken.\n`);
    return;
  }

  const imgDir = path.join(OUT, 'images');
  const jsonDir = path.join(OUT, 'json');
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(jsonDir, { recursive: true });

  if (!dry && !canvasLib) {
    console.warn('  ! @napi-rs/canvas not installed — falling back to --dry (metadata only).');
    console.warn('  ! run `npm install` to enable image compositing.\n');
  }

  const sharpLib = dry ? null : loadSharp();
  if (config.optimize && !dry) {
    console.log(sharpLib
      ? `  optimizing PNGs to a ${config.optimize.colors || 256}-colour palette`
      : '  ! sharp not installed — writing full-size PNGs (roughly 3x the upload)');
  }

  let bytes = 0;
  const t0 = Date.now();
  for (let i = 0; i < items.length; i++) {
    const id = i + config.startIndex;
    if (canvasLib) {
      const canvas = await renderItem(canvasLib, cats, items[i], config.export);
      const png = await encodePng(canvas, sharpLib);
      bytes += png.length;
      fs.writeFileSync(path.join(imgDir, `${id}.png`), png);
    }
    fs.writeFileSync(
      path.join(jsonDir, `${id}.json`),
      JSON.stringify(buildMetadata(items[i], cats, id), null, 2)
    );
    if ((i + 1) % 100 === 0 || i === items.length - 1) {
      process.stdout.write(`\r  ${i + 1}/${items.length}`);
    }
  }
  console.log(`   (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (bytes) {
    console.log(`\n  upload size: ${(bytes / 1e6).toFixed(0)} MB of images` +
      ` (avg ${(bytes / items.length / 1024).toFixed(0)} KB)`);
  }

  const report = rarityReport(items, cats);
  fs.writeFileSync(path.join(OUT, '_rarity.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, '_dna.txt'), items.map(i => i.dna).join('\n'));

  const tiers = {};
  for (const it of items) if (it.tier) tiers[it.tier] = (tiers[it.tier] || 0) + 1;
  if (Object.keys(tiers).length) {
    console.log(`\n  chase tiers:`);
    for (const [t, n] of Object.entries(tiers)) console.log(`    ${t.padEnd(11)} ${n}`);
  }

  console.log(`\n  rarity spread:`);
  for (const [trait, rows] of Object.entries(report)) {
    const top = rows.slice(0, 3).map(r => `${r.value} ${r.pct}%`).join(', ');
    const rarest = rows[rows.length - 1];
    console.log(`    ${trait.padEnd(11)} ${top}  …  rarest: ${rarest.value} (${rarest.count})`);
  }

  console.log(`\n  → output/images/  output/json/  output/_rarity.json\n`);
  if (config.creators[0].address.startsWith('REPLACE')) {
    console.log(`  ⚠  set your wallet in config.js -> creators before uploading.\n`);
  }
}

main().catch(err => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});
