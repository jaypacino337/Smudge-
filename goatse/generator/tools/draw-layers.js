#!/usr/bin/env node
/**
 * Draws all 134 real layer PNGs — no image model, no hand cleanup.
 *
 *   npm run art                 # draw everything in the shipped 'alpine' style
 *   npm run art -- riso         # ...or the off-register risograph style
 *
 * Why this beats prompting an image model for this job: every layer is placed by the same
 * arithmetic, so alignment is exact by construction. No anchor sheet, no drift, no
 * hand-nudging 20% of the output. Retune a colour or a horn curve and re-run — it's 25s.
 *
 * Geometry is driven by the anchors in art/prompts.json, so the docs and the art can't
 * disagree.
 */
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const D = require('./lib/draw');

const ROOT = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'art', 'prompts.json'), 'utf8'));
const S = spec.canvas;                        // 2048

/* ── geometry ────────────────────────────────────────────────────────────────
   A goat is not a dog: the skull is a wedge, widest at the cheekbone and tapering
   into a long muzzle, and the whole face reads through the horn silhouette above it.
   Every number below is derived from the anchors block in art/prompts.json.        */
const CX        = spec.anchors.bodyCenterX;   // 1024
const EYE_Y     = spec.anchors.eyeLineY;      // 880
const EYE_L     = 872, EYE_R = 1176;          // eye centres
const SKULL_TOP = spec.anchors.skullTopY;     // 620
const MUZZLE_Y  = spec.anchors.muzzleCenterY; // 1210
const CHIN_Y    = 1376;
const BEARD_TIP = spec.anchors.beardTipY;     // 1560
const SHOULDER  = spec.anchors.shoulderLineY; // 1560
const HORN_Y    = spec.anchors.hornBaseY;     // 660
const HORN_DX   = 84;                         // horn bases at x = 940 and 1108
const HELD      = { x: spec.anchors.heldItemX, y: spec.anchors.heldItemY }; // 470, 1620

/** Right half of the skull, top → chin. Mirrored for the left. */
const HEAD_R = [
  [CX +   6, 600], [CX + 212, 624], [CX + 332, 702], [CX + 382, 832],
  [CX + 378, 962], [CX + 330, 1082], [CX + 262, 1172], [CX + 218, 1260],
  [CX + 158, 1332], [CX + 72, 1370], [CX, CHIN_Y],
];
const headRing = rand => D.poly(rand, D.mirrorX(HEAD_R, CX), 4);

/** Neck and shoulders, drawn behind the head and running off the bottom edge. */
const NECK = [
  [CX + 152, 1230], [CX + 302, 1418], [CX + 432, 1596], [CX + 558, 1826], [CX + 648, 2080],
  [CX - 648, 2080], [CX - 558, 1826], [CX - 432, 1596], [CX - 302, 1418], [CX - 152, 1230],
];

/* ── palette ─────────────────────────────────────────────────────────────── */
const C = {
  ink: '#14120F',
  bone: '#EFE7D6', chalk: '#F6F3EC', white: '#FFFFFF',
  fawn: '#B98A52', cream: '#F0E6D2', choc: '#7E5A3C', russet: '#A8452C',
  agouti: '#8C7A63', bay: '#9C5A2E', mohair: '#EDE0C8', cash: '#B5B2A8',
  sandy: '#C8A06A', coal: '#2B2A33', silver: '#C6CBD1',
  horn: '#8E7C63', hornDark: '#5F5140', hoof: '#3A342C',
  gold: '#D9A441', goldHi: '#F3D27A', brass: '#C08B2E',
  orange: '#FF5A1F', ember: '#E8451A', pine: '#1F5C46', moss: '#6E8257',
  grass: '#4E8C3A', ice: '#BFD9E0', cobalt: '#2F4BB8', ox: '#6E1F24',
  red: '#D6402F', pink: '#E88FA6', magenta: '#E33B8C', violet: '#7B4BC4',
  steel: '#79838C', navy: '#28324A', tan: '#C9A227',
  muzzlePale: '#E8DCC6', nostril: '#3B3229',
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
const ctxOf = () => {
  const c = createCanvas(S, S);
  return [c, c.getContext('2d')];
};

/** Flat background fill plus a soft edge vignette so it isn't dead flat. */
function flat(ctx, color, vignette = 0.10) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  if (vignette > 0) {
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.22, S / 2, S / 2, S * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
}

/** True when (x, y) sits under the goat — backdrops use it to stay out of the way. */
const behindGoat = (x, y) => Math.hypot((x - CX) / 1.0, (y - 1080) / 1.15) < 640;

/** Text drawn as ink-outlined display type (jersey letters, flags, signs, brands). */
function label(ctx, text, x, y, size, fill, o = {}) {
  ctx.save();
  ctx.font = `900 ${size}px ${o.font || 'sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  if (o.stroke !== null) {
    ctx.strokeStyle = o.stroke || D.style().ink;
    ctx.lineWidth = o.w == null ? D.style().width * 0.9 : o.w;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * A cloven hoof and a stub of foreleg — every held item ships inside one of these.
 * The leg is a neutral mid-tan on purpose: the held layer has no idea which of the
 * fourteen coats is underneath it, so it has to sit believably against all of them.
 */
function hoofLeg(ctx, rand, x, y, s = 1, fill = '#C7A87A') {
  D.shape(ctx, D.poly(rand, [
    [x - 64 * s, y + 240 * s], [x - 76 * s, y + 60 * s], [x - 58 * s, y - 20 * s],
    [x + 58 * s, y - 20 * s], [x + 78 * s, y + 60 * s], [x + 66 * s, y + 240 * s],
  ], 5), { fill, cel: { cover: 0.44 } });
}

/** Two toes, drawn AFTER the object so the hoof closes around it. */
function hoofToes(ctx, rand, x, y, s = 1) {
  for (const t of [-1, 1]) {
    D.shape(ctx, D.poly(rand, [
      [x + t * 8 * s, y - 10 * s], [x + t * 104 * s, y - 40 * s], [x + t * 100 * s, y - 136 * s],
      [x + t * 34 * s, y - 178 * s], [x + t * 6 * s, y - 116 * s],
    ], 4), { fill: '#6E5C4A', cel: { cover: 0.4 } });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   00 — BACKGROUND
   ═══════════════════════════════════════════════════════════════════════════ */
const solidBg = (c, v) => (ctx) => flat(ctx, c, v == null ? 0.10 : v);

const BACKGROUND = {
  bone:    solidBg('#EFE7D6'), glacier: solidBg('#BFD9E0'), alpine: solidBg('#A7BFA4'),
  dusk:    solidBg('#C0A2AE'), moss:    solidBg('#6E8257'), ember:  solidBg('#FF5A1F'),
  slate:   solidBg('#79838C'), chalk:   solidBg('#F6F3EC', 0.07),
  cobalt:  solidBg('#2F4BB8'), oxblood: solidBg('#6E1F24'),
  void:    solidBg('#12110F', 0.34),
  'summit-gold': (ctx) => {
    flat(ctx, C.gold, 0);
    const g = ctx.createRadialGradient(S * 0.42, S * 0.34, S * 0.10, S * 0.5, S * 0.5, S * 0.80);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(1, 'rgba(90,52,10,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   01 — BACKDROP   (transparent, stays clear of the goat)
   ═══════════════════════════════════════════════════════════════════════════ */
const BACKDROP = {
  'ridge-line': (ctx, rand) => {
    // three receding ridges, palest at the back
    const bands = [
      { y: 1180, h: 460, fill: '#8FA3AE', w: 0 },
      { y: 1330, h: 520, fill: '#5E7280', w: 0 },
      { y: 1500, h: 560, fill: '#37454F', w: D.style().width },
    ];
    for (const b of bands) {
      const pts = [[-60, S + 60]];
      let x = -60, up = true;
      while (x < S + 60) {
        const step = 200 + rand() * 190;
        x += step;
        const peak = b.y - (up ? 120 + rand() * 210 : -60 - rand() * 90);
        pts.push([x, peak]);
        up = !up;
      }
      pts.push([S + 60, S + 60]);
      D.shape(ctx, pts, { fill: b.fill, stroke: b.w ? D.style().ink : null, w: b.w, cel: false });
      // snow caps on the front ridge only
      if (b.w) {
        for (let i = 1; i < pts.length - 1; i++) {
          const [px, py] = pts[i];
          if (py > b.y - 120) continue;
          D.shape(ctx, [[px, py - 8], [px + 92, py + 96], [px + 30, py + 74], [px - 26, py + 100], [px - 92, py + 92]],
            { fill: '#EFF4F6', stroke: null, cel: false });
        }
      }
    }
  },

  switchbacks: (ctx, rand) => {
    // one continuous trail that actually switches back, rather than a field of dashes
    const pts = [];
    let y = S - 90, leftward = false;
    while (y > 200) {
      pts.push([leftward ? S - 170 : 170, y]);
      pts.push([leftward ? 210 : S - 210, y - 170]);
      y -= 320;
      leftward = !leftward;
    }
    ctx.save();
    ctx.setLineDash([58, 40]);
    ctx.lineCap = 'butt';
    D.shape(ctx, D.poly(rand, pts, 10), { closed: false, stroke: 'rgba(20,18,15,0.45)', w: 16, fill: null });
    ctx.restore();
    for (const [x, py] of pts) {          // trail markers at each turn
      D.blob(ctx, rand, x, py, 24, 24, { fill: C.orange, w: 10 });
    }
  },

  'pine-stand': (ctx, rand) => {
    const tree = (x, y, h, fill) => {
      const w = h * 0.46;
      for (let i = 0; i < 3; i++) {
        const t = i / 3;
        const yy = y - h * t;
        const ww = w * (1 - t * 0.42);
        D.shape(ctx, D.poly(rand, [
          [x, yy - h * 0.42], [x + ww, yy], [x + ww * 0.4, yy], [x + ww * 0.4, yy + 26],
          [x - ww * 0.4, yy + 26], [x - ww * 0.4, yy], [x - ww, yy],
        ], 6), { fill, cel: false });
      }
      D.shape(ctx, [[x - 22, y + 10], [x + 22, y + 10], [x + 16, y + 96], [x - 16, y + 96]],
        { fill: '#4A3421', cel: false });
    };
    for (const [x, h, f] of [[110, 470, '#20452F'], [300, 380, '#2C5A3C'], [-40, 400, '#20452F'],
      [1948, 500, '#20452F'], [1760, 390, '#2C5A3C'], [2090, 420, '#20452F'],
      [520, 300, '#2C5A3C'], [1540, 320, '#2C5A3C']]) {
      tree(x, S - 40, h, f);
    }
  },

  'cable-car': (ctx, rand) => {
    D.stroke(ctx, rand, [-40, 300], [S + 40, 560], 30, { w: 12, stroke: 'rgba(20,18,15,0.75)' });
    const cx = 1560, cy = 500;
    D.stroke(ctx, rand, [cx, cy - 96], [cx, cy - 4], 0, { w: 14 });
    D.roundRect(ctx, cx - 108, cy, 216, 176, 26, { fill: '#D64B2A' });
    D.roundRect(ctx, cx - 74, cy + 34, 148, 84, 14, { fill: '#BFD9E0', w: 12 });
  },

  'storm-front': (ctx, rand) => {
    const puff = (x, y, r, fill) => { D.blob(ctx, rand, x, y, r, r * 0.72, { fill, n: 18, cel: false }); };
    ctx.fillStyle = '#5F6B78';
    ctx.fillRect(0, -60, S, 300);        // solid bank so the puffs read as one cloud
    for (const [x, y, r] of [[180, 250, 230], [470, 292, 205], [790, 252, 190],
      [1120, 296, 215], [1440, 250, 200], [1760, 296, 220], [2010, 248, 190]]) {
      puff(x, y, r, '#5F6B78');
    }
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const [x, y, r] of [[300, 150, 150], [900, 130, 130], [1560, 150, 145]]) {
      puff(x, y, r, '#98A4B0');
    }
    ctx.restore();
    for (const [x, y] of [[620, 460], [1520, 500]]) {
      D.shape(ctx, [[x, y], [x - 60, y + 150], [x - 6, y + 140], [x - 52, y + 300],
        [x + 78, y + 116], [x + 12, y + 126], [x + 64, y]],
        { fill: '#FFD34A', w: 14 });
    }
  },

  aurora: (ctx, rand) => {
    for (let i = 0; i < 7; i++) {
      const x = 120 + i * 280 + D.jit(rand, 60);
      const g = ctx.createLinearGradient(x, 0, x, 1100);
      const hue = i % 2 ? 'rgba(120,220,170,' : 'rgba(150,120,230,';
      g.addColorStop(0, hue + '0)');
      g.addColorStop(0.45, hue + '0.55)');
      g.addColorStop(1, hue + '0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(D.jit(rand, 0.09));
      ctx.fillRect(-70, -60, 140 + rand() * 90, 1150);
      ctx.restore();
    }
  },

  'altitude-grid': (ctx, rand) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,18,15,0.30)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      const y = 180 + i * 150;
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(S - 60, y);
      ctx.stroke();
      label(ctx, String(8848 - i * 720), 176, y - 34, 46, 'rgba(20,18,15,0.55)', { stroke: null });
    }
    ctx.restore();
  },

  sunburst: (ctx, rand) => {
    const rays = 22;
    ctx.fillStyle = 'rgba(255,200,90,0.55)';
    for (let i = 0; i < rays; i += 2) {
      const a0 = (i / rays) * Math.PI * 2, a1 = ((i + 1) / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(CX, 980);
      ctx.lineTo(CX + Math.cos(a0) * 1700, 980 + Math.sin(a0) * 1700);
      ctx.lineTo(CX + Math.cos(a1) * 1700, 980 + Math.sin(a1) * 1700);
      ctx.closePath();
      ctx.fill();
    }
  },

  crevasse: (ctx, rand) => {
    const top = 1420;
    D.shape(ctx, D.poly(rand, [
      [-60, S + 60], [-60, top + 120], [280, top + 40], [620, top + 150], [980, top + 20],
      [1400, top + 140], [1760, top + 30], [S + 60, top + 110], [S + 60, S + 60],
    ], 12), { fill: '#DCEAEE' });
    D.shape(ctx, D.poly(rand, [
      [420, S + 60], [560, top + 210], [760, top + 320], [700, S + 60],
    ], 10), { fill: '#4B7C93', w: 14 });
    D.shape(ctx, D.poly(rand, [
      [1380, S + 60], [1480, top + 250], [1700, top + 360], [1660, S + 60],
    ], 10), { fill: '#4B7C93', w: 14 });
  },

  'moon-arc': (ctx, rand) => {
    D.blob(ctx, rand, 400, 400, 240, 240, { fill: '#F4F0E2', n: 30, cel: { cover: 0.28 } });
    for (const [x, y, r] of [[330, 340, 46], [470, 470, 34], [408, 300, 26]]) {
      D.blob(ctx, rand, x, y, r, r * 0.92, { fill: '#DCD5C4', stroke: null, cel: false });
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(20,18,15,0.35)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(400, 400, 330, 330, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 26; i++) {
      const x = rand() * S, y = rand() * 1000;
      if (behindGoat(x, y)) continue;
      D.star(ctx, rand, x, y, 16 + rand() * 14, 6, 4, { fill: '#F4F0E2', stroke: null });
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   02 — COAT   (the goat itself: neck, ears, skull, muzzle, beard)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Ear carriage. `kind` changes the silhouette, which is why it lives with the coat. */
function ear(ctx, rand, side, kind, fill, inner, o = {}) {
  const s = side;
  let sp, width;
  if (kind === 'lop') {
    sp = D.spine(t => [
      CX + s * (300 + 250 * Math.sin(t * 1.5)),
      828 + 520 * t + 40 * Math.sin(t * 2.2),
    ], 16);
    width = t => 132 * Math.sin(Math.PI * (0.16 + t * 0.74)) + 26;
  } else if (kind === 'shag') {
    sp = D.spine(t => [CX + s * (306 + 232 * t), 836 + 268 * t * t + 46 * t], 14);
    width = t => 122 * Math.sin(Math.PI * (0.2 + t * 0.7)) + 30;
  } else {
    sp = D.spine(t => [CX + s * (300 + 352 * t), 806 - 214 * t - 34 * Math.sin(Math.PI * t)], 14);
    width = t => 116 * Math.sin(Math.PI * (0.14 + t * 0.78)) + 20;
  }
  D.shape(ctx, D.taper(rand, sp, width, { amp: o.amp || 0 }), { fill, cel: { cover: 0.5 } });
  if (inner) {
    const insp = sp.slice(1, sp.length - 2);
    D.shape(ctx, D.taper(rand, insp, t => width(t * 0.8 + 0.1) * 0.46), { fill: inner, stroke: null });
  }
}

/**
 * Chin beard — one cohesive wedge hanging BELOW the chin, not a cluster of squiggles
 * off the lip. Length and colour vary by breed; every goat has one.
 */
function beard(ctx, rand, fill, o = {}) {
  const len = o.len == null ? 230 : o.len;
  const w = o.w == null ? 122 : o.w;
  const top = CHIN_Y - 14;
  const sp = D.spine(t => [CX + Math.sin(t * 1.7) * 12, top + len * t], 12);
  D.shape(ctx, D.taper(rand, sp, t => w * (1 - t * 0.84) + 7, { amp: 5 }),
    { fill, cel: { cover: 0.52 } });
  // a couple of interior strokes so it reads as hair rather than a fin
  ctx.save();
  ctx.strokeStyle = D.rgba(C.ink, 0.32);
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * w * 0.34, top + 30);
    ctx.quadraticCurveTo(CX + s * w * 0.24, top + len * 0.55, CX + s * 10, top + len * 0.86);
    ctx.stroke();
  }
  ctx.restore();
}

/** Shaggy coats get a scalloped fleece ring behind the skull. */
function fleeceRing(ctx, rand, fill) {
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = CX + Math.cos(a) * 400;
    const y = 1000 + Math.sin(a) * 430;
    if (y < 700 && Math.abs(x - CX) < 180) continue;   // leave the crown clear for horns
    D.blob(ctx, rand, x, y, 96 + rand() * 34, 92 + rand() * 30, { fill, n: 12, w: D.style().width * 0.8 });
  }
}

/**
 * The goat. Everything downstream — markings, outfits, mouths, eyes — is positioned
 * against the geometry this function paints, so it is the only place head shape lives.
 */
function drawGoat(ctx, rand, o) {
  const {
    coat, muzzle = C.muzzlePale, earKind = 'upright', earIn = '#C99A93',
    beardCol = null, shaggy = false, alpha = 1, dorsal = null, faceStripe = null,
  } = o;
  const bc = beardCol || D.shade(coat, 0.22);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (shaggy) fleeceRing(ctx, rand, coat);

  // neck and shoulders, behind everything
  D.shape(ctx, D.poly(rand, NECK, 6), { fill: coat, cel: { cover: 0.46 } });

  // ears behind the skull
  ear(ctx, rand, -1, earKind, coat, earIn);
  ear(ctx, rand, +1, earKind, coat, earIn);

  // skull
  const head = headRing(rand);
  D.shape(ctx, head, { fill: coat, cel: { cover: 0.42 } });

  // pale muzzle plane — the wedge that makes it read as a goat and not a lamb
  D.clipTo(ctx, head, () => {
    D.shape(ctx, D.poly(rand, [
      [CX - 236, 1108], [CX - 214, 1252], [CX - 150, 1338], [CX, 1370],
      [CX + 150, 1338], [CX + 214, 1252], [CX + 236, 1108], [CX, 1062],
    ], 6), { fill: muzzle, stroke: null, cel: { cover: 0.3 } });

    if (faceStripe) {
      // outboard of the eyes (which span CX±252) — a stripe through the eye reads as a bug
      for (const s of [-1, 1]) {
        D.shape(ctx, D.taper(rand, D.spine(t => [CX + s * (272 + 24 * t - 60 * t * t), 726 + 520 * t], 12),
          t => 48 - t * 16), { fill: faceStripe, stroke: null, cel: false });
      }
    }
    if (dorsal) {
      D.shape(ctx, D.taper(rand, D.spine(t => [CX, 600 + 170 * t], 6), t => 44 - t * 24),
        { fill: dorsal, stroke: null, cel: false });
    }
  });

  // brow ridge — one line that does a lot of the "this is a goat" work
  D.stroke(ctx, rand, [CX - 300, 792], [CX - 96, 742], -18, { w: D.style().width * 0.55, stroke: D.rgba(C.ink, 0.42) });
  D.stroke(ctx, rand, [CX + 300, 792], [CX + 96, 742], 18, { w: D.style().width * 0.55, stroke: D.rgba(C.ink, 0.42) });

  // chest tuft — roughly one goat in seven wears no outfit, and a bare cone looks unfinished
  ctx.save();
  ctx.strokeStyle = D.rgba(C.ink, 0.13);
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (const i of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 120, 1740);
    ctx.quadraticCurveTo(CX + i * 150, 1880, CX + i * 116, 2010);
    ctx.stroke();
  }
  ctx.restore();

  beard(ctx, rand, bc, o.beardOpts);

  ctx.restore();
}

const COAT = {
  'alpine-upright':     (c, r) => drawGoat(c, r, { coat: C.fawn }),
  'saanen-upright':     (c, r) => drawGoat(c, r, { coat: C.cream, muzzle: '#FFF8EA', earIn: '#E3B3AC' }),
  'toggenburg-upright': (c, r) => drawGoat(c, r, { coat: C.choc, muzzle: '#E7D9BE', faceStripe: '#E7D9BE' }),
  'boer-lop':           (c, r) => drawGoat(c, r, { coat: C.russet, earKind: 'lop', muzzle: '#F2E7D4', beardCol: '#F2E7D4' }),
  'nubian-lop':         (c, r) => drawGoat(c, r, { coat: '#463A34', earKind: 'lop', muzzle: '#A87F55', earIn: '#8A5F58', beardCol: '#2B2420' }),
  'pygmy-upright':      (c, r) => drawGoat(c, r, { coat: C.agouti, muzzle: '#DCCDB4', beardOpts: { len: 150, w: 118, tufts: 3 } }),
  'oberhasli-upright':  (c, r) => drawGoat(c, r, { coat: C.bay, muzzle: '#4A3A30', faceStripe: '#3A2E26', beardCol: '#33291F' }),
  'angora-shag':        (c, r) => drawGoat(c, r, { coat: C.mohair, earKind: 'shag', shaggy: true, muzzle: '#F7EFDD', beardOpts: { len: 260, w: 120, tufts: 4 } }),
  'cashmere-shag':      (c, r) => drawGoat(c, r, { coat: C.cash, earKind: 'shag', shaggy: true, muzzle: '#D8D5CC', beardOpts: { len: 240, w: 112, tufts: 4 } }),
  'bezoar-wild':        (c, r) => drawGoat(c, r, { coat: C.sandy, dorsal: '#2E2721', muzzle: '#EAD9B8', beardCol: '#2E2721', beardOpts: { len: 250, w: 92, tufts: 3 } }),
  'black-alpine':       (c, r) => drawGoat(c, r, { coat: C.coal, muzzle: '#3E3D49', earIn: '#5A4A55', beardCol: '#1E1D26' }),
  'silver-ash':         (c, r) => drawGoat(c, r, { coat: C.silver, muzzle: '#E4E7EA', beardCol: '#A8AEB6' }),

  'ghost-white': (ctx, rand) => {
    drawGoat(ctx, rand, { coat: '#DCE9F2', muzzle: '#F0F7FC', earIn: '#BCD2E0', beardCol: '#C3D6E4', alpha: 0.62 });
    ctx.save();                       // cold rim light so it still reads at avatar size
    ctx.globalAlpha = 0.5;
    D.shape(ctx, headRing(rand), { fill: null, stroke: '#9FD8F0', w: D.style().width * 1.5 });
    ctx.restore();
  },

  gilded: (ctx, rand) => {
    drawGoat(ctx, rand, { coat: C.gold, muzzle: C.goldHi, earIn: '#B57E22', beardCol: C.brass });
    D.clipTo(ctx, headRing(rand), () => {   // metal highlight, raked across the brow
      ctx.save();
      ctx.globalAlpha = 0.34;
      D.shape(ctx, D.poly(rand, [[CX - 430, 664], [CX - 40, 604], [CX + 10, 700], [CX - 410, 772]], 8),
        { fill: '#FFF0BE', stroke: null, cel: false });
      ctx.restore();
    });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   03 — MARKING   (painted inside the skull silhouette)
   ═══════════════════════════════════════════════════════════════════════════ */
const onHead = (ctx, rand, fn) => D.clipTo(ctx, headRing(rand), () => fn());

const MARKING = {
  blaze: (ctx, rand) => onHead(ctx, rand, () => {
    D.shape(ctx, D.taper(rand, D.spine(t => [CX + Math.sin(t * 2) * 12, 610 + 690 * t], 12),
      t => 92 - t * 34, { amp: 5 }), { fill: '#F3E9D6', stroke: null, cel: false });
  }),

  star: (ctx, rand) => onHead(ctx, rand, () => {
    D.star(ctx, rand, CX, 716, 128, 54, 5, { fill: '#F6EFE0', stroke: null });
  }),

  'moon-patch': (ctx, rand) => onHead(ctx, rand, () => {
    D.blob(ctx, rand, CX - 236, 930, 168, 190, { fill: '#F1E7D2', stroke: null, cel: false });
    D.blob(ctx, rand, CX - 300, 892, 150, 172, { fill: 'rgba(0,0,0,0)', stroke: null, cel: false });
  }),

  freckles: (ctx, rand) => onHead(ctx, rand, () => {
    ctx.fillStyle = 'rgba(40,32,26,0.55)';
    for (let i = 0; i < 54; i++) {
      const x = CX + D.jit(rand, 220), y = 1080 + D.jit(rand, 190);
      ctx.beginPath();
      ctx.arc(x, y, 8 + rand() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }),

  dapple: (ctx, rand) => onHead(ctx, rand, () => {
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 22; i++) {
      D.blob(ctx, rand, CX + D.jit(rand, 340), 980 + D.jit(rand, 300), 46 + rand() * 40, 44 + rand() * 34,
        { fill: '#FFFFFF', stroke: null, cel: false, n: 12 });
    }
    ctx.globalAlpha = 1;
  }),

  socks: (ctx, rand) => {
    for (const s of [-1, 1]) {
      const sp = D.spine(t => [CX + s * (528 + 124 * t), 692 - 92 * t], 6);
      D.shape(ctx, D.taper(rand, sp, t => 78 * (1 - t * 0.8) + 10), { fill: '#F4ECDB', stroke: null, cel: false });
    }
  },

  'badger-face': (ctx, rand) => onHead(ctx, rand, () => {
    for (const s of [-1, 1]) {
      D.shape(ctx, D.taper(rand, D.spine(t => [CX + s * (170 + 76 * t - 46 * t * t), 640 + 640 * t], 12),
        t => 92 - t * 30), { fill: '#2A2420', stroke: null, cel: false });
    }
  }),

  'roan-frost': (ctx, rand) => {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    for (let i = 0; i < 900; i++) {
      const x = CX + D.jit(rand, 560), y = 1360 + D.jit(rand, 380);
      ctx.fillRect(x, y, 5, 12);
    }
    ctx.restore();
  },

  'brand-8848': (ctx, rand) => {
    ctx.save();
    ctx.globalAlpha = 0.85;
    label(ctx, '8848', CX + 400, 1770, 132, '#2A1A12', { rot: 0.16, stroke: 'rgba(60,30,14,0.5)', w: 16 });
    ctx.restore();
  },

  'gold-leaf': (ctx, rand) => onHead(ctx, rand, () => {
    for (const [x, y, r] of [[CX - 250, 800, 120], [CX + 268, 1010, 96], [CX - 60, 660, 84]]) {
      D.shape(ctx, D.ring(rand, x, y, r, r * 0.8, { amp: 0.3, n: 9 }),
        { fill: C.gold, stroke: null, cel: { cover: 0.35, color: C.goldHi } });
    }
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   04 — OUTFIT   (shoulders and chest, never above the jaw)
   ═══════════════════════════════════════════════════════════════════════════ */
function garment(ctx, rand, color, o = {}) {
  const y = o.top == null ? 1524 : o.top;
  const dip = o.dip == null ? 92 : o.dip;
  const pts = D.poly(rand, [
    [CX - 402, y], [CX - 212, y + dip * 0.7], [CX, y + dip], [CX + 212, y + dip * 0.7], [CX + 402, y],
    [CX + 566, y + 130], [CX + 726, y + 372], [CX + 792, S + 60],
    [CX - 792, S + 60], [CX - 726, y + 372], [CX - 566, y + 130],
  ], 6);
  D.shape(ctx, pts, { fill: color, cel: { cover: 0.42 }, ...o });
  return pts;
}

const OUTFIT = {
  flannel: (ctx, rand) => {
    const g = garment(ctx, rand, '#B3312B');
    D.clipTo(ctx, g, () => {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#2A1A18';
      for (let x = CX - 800; x < CX + 800; x += 118) ctx.fillRect(x, 1500, 46, 620);
      for (let y = 1500; y < S; y += 118) ctx.fillRect(CX - 800, y, 1600, 46);
      ctx.restore();
    });
    // open collar
    for (const s of [-1, 1]) {
      D.shape(ctx, D.poly(rand, [
        [CX + s * 400, 1524], [CX + s * 250, 1560], [CX + s * 150, 1800], [CX + s * 330, 1720],
      ], 6), { fill: '#8E2420' });
    }
  },

  puffer: (ctx, rand) => {
    const g = garment(ctx, rand, C.orange, { top: 1500 });
    D.clipTo(ctx, g, () => {
      for (let y = 1600; y < S; y += 132) {
        D.stroke(ctx, rand, [CX - 820, y], [CX + 820, y], 26, { w: 14, stroke: D.rgba(C.ink, 0.55) });
      }
    });
    D.shape(ctx, D.poly(rand, [
      [CX - 404, 1500], [CX - 214, 1568], [CX, 1596], [CX + 214, 1568], [CX + 404, 1500],
      [CX + 420, 1420], [CX, 1508], [CX - 420, 1420],
    ], 6), { fill: '#E8451A' });
  },

  hoodie: (ctx, rand) => {
    D.blob(ctx, rand, CX, 1660, 470, 260, { fill: '#7C8085', n: 18 });   // bunched hood
    const g = garment(ctx, rand, '#93979C');
    D.clipTo(ctx, g, () => {
      D.stroke(ctx, rand, [CX - 120, 1620], [CX - 90, 1900], 30, { w: 20, stroke: '#E8E4DC' });
      D.stroke(ctx, rand, [CX + 120, 1620], [CX + 96, 1900], -30, { w: 20, stroke: '#E8E4DC' });
    });
  },

  harness: (ctx, rand) => {
    for (const s of [-1, 1]) {
      D.shape(ctx, D.taper(rand, D.spine(t => [CX + s * (150 + 500 * t), 1560 + 420 * t], 8), () => 44),
        { fill: C.orange, cel: { cover: 0.4 } });
    }
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 620 + 1240 * t, 1900 + Math.sin(Math.PI * t) * 60], 10), () => 40),
      { fill: '#E8451A' });
    D.roundRect(ctx, CX - 62, 1806, 124, 124, 18, { fill: '#9AA3AC' });
    // carabiner
    ctx.save();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(CX + 300, 1920, 74, 0.5, 5.4); ctx.stroke();
    ctx.strokeStyle = '#C9CED4'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(CX + 300, 1920, 74, 0.5, 5.4); ctx.stroke();
    ctx.restore();
  },

  'hi-vis': (ctx, rand) => {
    const g = garment(ctx, rand, '#E7F03A');
    D.clipTo(ctx, g, () => {
      for (const y of [1760, 1900]) {
        ctx.fillStyle = '#C8CED4'; ctx.fillRect(CX - 820, y, 1640, 56);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(CX - 820, y + 12, 1640, 16);
      }
      ctx.fillStyle = D.rgba(C.ink, 0.8);
      ctx.fillRect(CX - 26, 1560, 52, 620);
    });
  },

  'fleece-vest': (ctx, rand) => {
    const g = garment(ctx, rand, C.navy);
    D.clipTo(ctx, g, () => D.hatch(ctx, CX - 820, 1500, 1640, 600,
      { gap: 20, angle: 1.2, color: 'rgba(255,255,255,0.10)', width: 8 }));
    ctx.fillStyle = '#B8BEC8';
    ctx.fillRect(CX - 16, 1560, 32, 560);
    D.roundRect(ctx, CX - 34, 1610, 68, 92, 14, { fill: '#D8DDE4', w: 12 });
  },

  varsity: (ctx, rand) => {
    garment(ctx, rand, '#EFE7D6');
    for (const s of [-1, 1]) {
      D.shape(ctx, D.poly(rand, [
        [CX + s * 420, 1560], [CX + s * 800, S + 60], [CX + s * 620, S + 60], [CX + s * 300, 1580],
      ], 6), { fill: C.pine });
    }
    for (let i = 0; i < 3; i++) {   // ribbed collar stripes
      ctx.fillStyle = i % 2 ? C.pine : '#EFE7D6';
      ctx.fillRect(CX - 410, 1512 + i * 26, 820, 26);
    }
    label(ctx, 'G', CX + 250, 1830, 210, C.pine, { w: 18 });
  },

  'wool-scarf': (ctx, rand) => {
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 460 + 920 * t, 1600 + Math.sin(Math.PI * t) * 120], 12),
      () => 96, { amp: 6 }), { fill: '#C4503F' });
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 480 + 960 * t, 1760 + Math.sin(Math.PI * t) * 90], 12),
      () => 90, { amp: 6 }), { fill: '#A93E30' });
    D.shape(ctx, D.taper(rand, D.spine(t => [CX + 300 + 90 * t, 1820 + 260 * t], 8), () => 84),
      { fill: '#C4503F' });
    ctx.fillStyle = '#8E3227';
    for (let i = 0; i < 5; i++) ctx.fillRect(CX + 320 + i * 34, 2060, 20, 70);
  },

  bandana: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [
      [CX - 380, 1546], [CX, 1620], [CX + 380, 1546], [CX + 260, 1760], [CX, 1980], [CX - 260, 1760],
    ], 6), { fill: '#C13A3A' });
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 26; i++) {
      D.star(ctx, rand, CX + D.jit(rand, 300), 1740 + D.jit(rand, 170), 26, 10, 4,
        { fill: '#F5E9DC', stroke: null });
    }
    ctx.restore();
    D.blob(ctx, rand, CX - 300, 1590, 78, 62, { fill: '#A62F2F' });
  },

  'bell-collar': (ctx, rand) => {
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 430 + 860 * t, 1580 + Math.sin(Math.PI * t) * 96], 12),
      () => 74), { fill: '#6B4327' });
    ctx.fillStyle = '#C9A227';
    for (let i = -3; i <= 3; i++) ctx.fillRect(CX + i * 110 - 16, 1618, 32, 46);
    D.shape(ctx, D.poly(rand, [
      [CX - 108, 1720], [CX + 108, 1720], [CX + 150, 1930], [CX - 150, 1930],
    ], 5), { fill: C.brass, cel: { cover: 0.45, color: '#8A5E17' } });
    D.roundRect(ctx, CX - 168, 1922, 336, 52, 22, { fill: '#A87824' });
    D.blob(ctx, rand, CX, 1996, 40, 40, { fill: '#7A5416' });
  },

  tuxedo: (ctx, rand) => {
    garment(ctx, rand, '#1B1A1F');
    D.shape(ctx, D.poly(rand, [
      [CX - 190, 1560], [CX, 1640], [CX + 190, 1560], [CX + 150, 1980], [CX - 150, 1980],
    ], 5), { fill: '#F4F1E8' });
    for (const s of [-1, 1]) {
      D.shape(ctx, D.poly(rand, [
        [CX + s * 400, 1540], [CX + s * 176, 1636], [CX + s * 250, 1960], [CX + s * 470, 1780],
      ], 6), { fill: '#2C2A31', cel: { cover: 0.3 } });
    }
    D.shape(ctx, D.poly(rand, [
      [CX - 130, 1660], [CX - 20, 1706], [CX + 130, 1660], [CX + 118, 1770], [CX + 20, 1728],
      [CX - 118, 1770],
    ], 5), { fill: '#161519' });
  },

  'tow-rope': (ctx, rand) => {
    for (let i = 0; i < 3; i++) {
      const off = i * 62;
      D.shape(ctx, D.taper(rand, D.spine(t => [CX - 620 + 1240 * t, 1620 + off + Math.sin(Math.PI * t) * 150], 14),
        () => 40), { fill: i % 2 ? '#E87A2A' : '#D6532A' });
    }
    ctx.save();                       // twist marks
    ctx.strokeStyle = D.rgba(C.ink, 0.45);
    ctx.lineWidth = 8;
    for (let x = CX - 600; x < CX + 600; x += 46) {
      ctx.beginPath(); ctx.moveTo(x, 1640); ctx.lineTo(x + 26, 1800); ctx.stroke();
    }
    ctx.restore();
  },

  'gold-chain': (ctx, rand) => {
    const link = (x, y, r) => {
      ctx.save();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 24;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.74, 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 15;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.74, 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      link(CX - 430 + 860 * t, 1596 + Math.sin(Math.PI * t) * 210, 48);
    }
    D.shape(ctx, D.poly(rand, [
      [CX - 96, 1830], [CX + 96, 1830], [CX + 118, 1990], [CX, 2050], [CX - 118, 1990],
    ], 5), { fill: C.gold, cel: { cover: 0.4, color: C.brass } });
    label(ctx, 'G', CX, 1920, 116, '#8A5E17', { stroke: null });
  },

  'summit-cape': (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [
      [CX - 380, 1560], [CX + 380, 1560], [CX + 900, S + 60], [CX - 940, S + 60],
    ], 10), { fill: '#8E1F26', cel: { cover: 0.46 } });
    D.clipTo(ctx, D.poly(rand, [[CX - 940, 1560], [CX + 900, 1560], [CX + 900, S + 60], [CX - 940, S + 60]], 4), () => {
      for (let i = 0; i < 5; i++) {
        D.stroke(ctx, rand, [CX - 300 + i * 170, 1620], [CX - 420 + i * 250, S + 40], 40,
          { w: 12, stroke: 'rgba(0,0,0,0.28)' });
      }
    });
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 400 + 800 * t, 1546 + Math.sin(Math.PI * t) * 40], 8), () => 34),
      { fill: '#5E1319' });
    D.blob(ctx, rand, CX, 1600, 88, 88, { fill: C.gold, cel: { cover: 0.4, color: C.brass } });
    D.star(ctx, rand, CX, 1600, 52, 22, 5, { fill: C.goldHi, stroke: null });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   05 — MOUTH   (muzzle furniture: nostrils, lips, whatever is in them)
   ═══════════════════════════════════════════════════════════════════════════ */
function nostrils(ctx, rand) {
  for (const s of [-1, 1]) {
    D.shape(ctx, D.taper(rand, D.spine(t => [
      CX + s * (74 + 26 * Math.sin(t * Math.PI)),
      1150 + 74 * t,
    ], 8), t => 20 * Math.sin(Math.PI * (0.2 + t * 0.7)) + 7),
      { fill: C.nostril, stroke: null });
  }
  D.stroke(ctx, rand, [CX, 1232], [CX, 1268], 0, { w: D.style().width * 0.6, stroke: D.rgba(C.ink, 0.6) });
}

/** The lower lip line every mouth variant shares. */
const lipY = 1276;

const MOUTH = {
  chewing: (ctx, rand) => {
    nostrils(ctx, rand);
    D.stroke(ctx, rand, [CX - 130, lipY + 14], [CX + 118, lipY - 22], 26, { w: D.style().width * 0.9 });
    D.stroke(ctx, rand, [CX + 118, lipY - 22], [CX + 154, lipY + 22], 10, { w: D.style().width * 0.7 });
  },

  'grass-blade': (ctx, rand) => {
    nostrils(ctx, rand);
    D.stroke(ctx, rand, [CX - 128, lipY], [CX + 128, lipY], 30, { w: D.style().width * 0.9 });
    D.shape(ctx, D.taper(rand, D.spine(t => [CX + 120 + 320 * t, lipY - 40 - 210 * t * t], 10),
      t => 26 * (1 - t * 0.9) + 4), { fill: C.grass, cel: { cover: 0.4 } });
    D.shape(ctx, D.taper(rand, D.spine(t => [CX + 100 + 210 * t, lipY - 10 - 90 * t * t], 8),
      t => 18 * (1 - t) + 4), { fill: '#6FAE4C', w: 12 });
  },

  smirk: (ctx, rand) => {
    nostrils(ctx, rand);
    D.stroke(ctx, rand, [CX - 140, lipY - 6], [CX + 150, lipY - 34], 40, { w: D.style().width });
    D.stroke(ctx, rand, [CX + 150, lipY - 34], [CX + 176, lipY + 6], 0, { w: D.style().width * 0.7 });
  },

  bleat: (ctx, rand) => {
    nostrils(ctx, rand);
    const m = D.ring(rand, CX + 6, lipY + 60, 138, 108, { n: 18 });
    D.shape(ctx, m, { fill: '#5A2726' });
    D.clipTo(ctx, m, () => {
      D.blob(ctx, rand, CX + 10, lipY + 130, 108, 74, { fill: C.pink, stroke: null });
      ctx.fillStyle = '#F6F1E4';
      ctx.fillRect(CX - 96, lipY - 22, 192, 44);
    });
  },

  grin: (ctx, rand) => {
    nostrils(ctx, rand);
    const m = D.poly(rand, [
      [CX - 190, lipY - 12], [CX, lipY + 26], [CX + 190, lipY - 12],
      [CX + 160, lipY + 74], [CX, lipY + 96], [CX - 160, lipY + 74],
    ], 5);
    D.shape(ctx, m, { fill: '#F6F1E4' });
    ctx.save();
    ctx.strokeStyle = D.rgba(C.ink, 0.6);
    ctx.lineWidth = 9;
    for (const x of [CX - 62, CX, CX + 62]) {
      ctx.beginPath(); ctx.moveTo(x, lipY + 4); ctx.lineTo(x, lipY + 88); ctx.stroke();
    }
    ctx.restore();
  },

  'tongue-out': (ctx, rand) => {
    nostrils(ctx, rand);
    D.stroke(ctx, rand, [CX - 140, lipY], [CX + 140, lipY], 26, { w: D.style().width * 0.9 });
    D.shape(ctx, D.poly(rand, [
      [CX + 30, lipY - 6], [CX + 168, lipY + 20], [CX + 186, lipY + 150], [CX + 84, lipY + 178],
      [CX + 20, lipY + 96],
    ], 6), { fill: C.pink, cel: { cover: 0.4 } });
    D.stroke(ctx, rand, [CX + 106, lipY + 40], [CX + 128, lipY + 150], 8,
      { w: 10, stroke: D.rgba(C.ink, 0.45) });
  },

  cud: (ctx, rand) => {
    nostrils(ctx, rand);
    D.blob(ctx, rand, CX + 190, 1230, 118, 100, { fill: null, stroke: D.rgba(C.ink, 0.45), w: 14 });
    D.stroke(ctx, rand, [CX - 130, lipY], [CX + 120, lipY - 8], 18, { w: D.style().width * 0.9 });
  },

  'tin-can': (ctx, rand) => {
    nostrils(ctx, rand);
    D.stroke(ctx, rand, [CX - 130, lipY], [CX + 90, lipY], 20, { w: D.style().width * 0.9 });
    ctx.save();
    ctx.translate(CX + 210, lipY + 60);
    ctx.rotate(0.42);
    D.roundRect(ctx, -96, -128, 192, 256, 18, { fill: '#B9BFC6', w: 16 });
    ctx.fillStyle = '#C4402F'; ctx.fillRect(-96, -50, 192, 96);
    D.shape(ctx, [[-96, -128], [-40, -104], [10, -136], [58, -100], [96, -128], [96, -70], [-96, -70]],
      { fill: '#8F969E', w: 12 });
    ctx.restore();
  },

  cigar: (ctx, rand) => {
    nostrils(ctx, rand);
    D.stroke(ctx, rand, [CX - 130, lipY], [CX + 110, lipY - 10], 20, { w: D.style().width * 0.9 });
    ctx.save();
    ctx.translate(CX + 130, lipY + 6);
    ctx.rotate(-0.34);
    D.roundRect(ctx, 0, -44, 330, 88, 20, { fill: '#6B4527' });
    ctx.fillStyle = '#C9A227'; ctx.fillRect(58, -44, 60, 88);
    D.blob(ctx, rand, 336, 0, 30, 30, { fill: '#FF6A1F', stroke: null });
    D.blob(ctx, rand, 340, 0, 16, 16, { fill: '#FFD24A', stroke: null });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 4; i++) {
      D.blob(ctx, rand, CX + 470 + i * 30, lipY - 90 - i * 96, 40 + i * 16, 34 + i * 14,
        { fill: '#D8D2C6', stroke: null, cel: false });
    }
    ctx.restore();
  },

  'gold-grill': (ctx, rand) => {
    nostrils(ctx, rand);
    const m = D.poly(rand, [
      [CX - 196, lipY - 14], [CX, lipY + 28], [CX + 196, lipY - 14],
      [CX + 164, lipY + 82], [CX, lipY + 106], [CX - 164, lipY + 82],
    ], 5);
    D.shape(ctx, m, { fill: '#3A211C' });
    D.clipTo(ctx, m, () => {
      for (let i = -3; i <= 3; i++) {
        D.roundRect(ctx, CX + i * 56 - 24, lipY + 4, 48, 92, 10,
          { fill: C.gold, stroke: D.rgba(C.ink, 0.7), w: 8 });
        ctx.fillStyle = C.goldHi;
        ctx.fillRect(CX + i * 56 - 16, lipY + 14, 14, 60);
      }
    });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   06 — EYES

   Goats have HORIZONTAL RECTANGULAR pupils. That bar is the single detail that
   makes the whole collection read as goat rather than generic-animal-PFP, so every
   variant that isn't explicitly closed or transformed keeps it.
   ═══════════════════════════════════════════════════════════════════════════ */
const eyePair = (ctx, rand, fn) => { fn(EYE_L, -1); fn(EYE_R, +1); };

/** The white of the eye. Returns the ring so pupils can be clipped inside it. */
function eyeBall(ctx, rand, x, o = {}) {
  const rx = o.rx == null ? 100 : o.rx;
  const ry = o.ry == null ? 68 : o.ry;
  const pts = D.ring(rand, x, EYE_Y, rx, ry, { n: 20 });
  D.shape(ctx, pts, { fill: o.white || '#F7F2E6', cel: { cover: 0.22 } });
  return pts;
}

/** Amber iris + the black bar pupil + a square catchlight. */
function barPupil(ctx, rand, x, o = {}) {
  const w = o.w == null ? 132 : o.w;
  const h = o.h == null ? 38 : o.h;
  D.blob(ctx, rand, x, EYE_Y, w * 0.62, h * 1.45, { fill: o.iris || '#C98A2E', stroke: null, cel: false, n: 16 });
  D.roundRect(ctx, x - w / 2, EYE_Y - h / 2, w, h, h * 0.38, { fill: o.pupil || C.ink, stroke: null });
  if (o.gleam !== false) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(x - w * 0.34, EYE_Y - h * 0.42, 22, 14);
  }
}

function brow(ctx, rand, x, s, tilt) {
  D.stroke(ctx, rand, [x - 96, EYE_Y - 128 + tilt * s * -1], [x + 96, EYE_Y - 128 + tilt * s], 14,
    { w: D.style().width * 1.1 });
}

const EYES = {
  slit: (ctx, rand) => eyePair(ctx, rand, x => {
    const b = eyeBall(ctx, rand, x);
    D.clipTo(ctx, b, () => barPupil(ctx, rand, x));
  }),

  'side-eye': (ctx, rand) => eyePair(ctx, rand, (x, s) => {
    const b = eyeBall(ctx, rand, x);
    D.clipTo(ctx, b, () => barPupil(ctx, rand, x + 42));
    brow(ctx, rand, x, s, 26);
  }),

  wide: (ctx, rand) => eyePair(ctx, rand, x => {
    const b = eyeBall(ctx, rand, x, { rx: 112, ry: 92 });
    D.clipTo(ctx, b, () => barPupil(ctx, rand, x, { w: 104, h: 32 }));
  }),

  sleepy: (ctx, rand) => eyePair(ctx, rand, x => {
    const b = eyeBall(ctx, rand, x);
    D.clipTo(ctx, b, () => {
      barPupil(ctx, rand, x);
      // neutral translucent lid — has to sit on any of the fourteen coats
      D.shape(ctx, [[x - 130, EYE_Y - 110], [x + 130, EYE_Y - 110], [x + 130, EYE_Y - 4], [x - 130, EYE_Y - 16]],
        { fill: 'rgba(52,44,36,0.90)', stroke: null, cel: false });
    });
    D.stroke(ctx, rand, [x - 108, EYE_Y - 14], [x + 108, EYE_Y - 4], -10, { w: D.style().width });
  }),

  focused: (ctx, rand) => eyePair(ctx, rand, (x, s) => {
    const b = eyeBall(ctx, rand, x, { ry: 56 });
    D.clipTo(ctx, b, () => barPupil(ctx, rand, x, { h: 34 }));
    brow(ctx, rand, x, s, 40);
  }),

  squint: (ctx, rand) => eyePair(ctx, rand, (x, s) => {
    const b = eyeBall(ctx, rand, x, { ry: 40 });
    D.clipTo(ctx, b, () => barPupil(ctx, rand, x, { h: 26, gleam: false }));
    brow(ctx, rand, x, s, 34);
  }),

  dizzy: (ctx, rand) => eyePair(ctx, rand, x => {
    eyeBall(ctx, rand, x, { rx: 104, ry: 88 });
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 5;
      const r = 8 + (i / 90) * 76;
      const px = x + Math.cos(a) * r, py = EYE_Y + Math.sin(a) * r * 0.8;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }),

  heart: (ctx, rand) => eyePair(ctx, rand, x => {
    const b = eyeBall(ctx, rand, x, { rx: 106, ry: 82 });
    D.clipTo(ctx, b, () => {
      D.heart(ctx, rand, x, EYE_Y - 4, 118, { fill: '#E8446E', w: 14 });
    });
  }),

  money: (ctx, rand) => eyePair(ctx, rand, x => {
    const b = eyeBall(ctx, rand, x, { rx: 106, ry: 82 });
    D.clipTo(ctx, b, () => label(ctx, '$', x, EYE_Y, 150, '#2E9E63', { w: 16 }));
  }),

  'closed-happy': (ctx, rand) => eyePair(ctx, rand, x => {
    D.stroke(ctx, rand, [x - 104, EYE_Y + 22], [x + 104, EYE_Y + 22], 62,
      { w: D.style().width * 1.5 });
  }),

  'void-black': (ctx, rand) => eyePair(ctx, rand, x => {
    const b = D.ring(rand, x, EYE_Y, 104, 74, { n: 20 });
    D.shape(ctx, b, { fill: '#0B0A0C', cel: false });
    ctx.fillStyle = 'rgba(240,240,255,0.9)';
    ctx.fillRect(x - 58, EYE_Y - 6, 116, 12);
  }),

  laser: (ctx, rand) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    eyePair(ctx, rand, x => {
      for (const [w, col, a] of [[112, '#FF1F3D', 0.55], [58, '#FF6A6A', 0.85], [22, '#FFFFFF', 1]]) {
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.fillRect(x < CX ? -200 : x, EYE_Y - w / 2, x < CX ? x + 200 : S + 200 - x, w);
      }
    });
    ctx.restore();
    eyePair(ctx, rand, x => {
      const b = eyeBall(ctx, rand, x, { white: '#FFE9E9' });
      D.clipTo(ctx, b, () => barPupil(ctx, rand, x, { iris: '#FF5A5A', pupil: '#8E0E1E' }));
    });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#FFFFFF';
    for (const x of [EYE_L, EYE_R]) ctx.fillRect(x - 58, EYE_Y - 8, 116, 16);
    ctx.restore();
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   07 — HORNS

   Every horn is one call to hornPair() with a different control-point spine. That's
   why fourteen wildly different silhouettes still look like they came off the same
   animal: identical taper law, identical ink weight, identical ridge treatment.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Sample a polyline through art-directed control points given as [dx, y]. */
function through(cps, s, n = 22) {
  const seg = cps.length - 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * seg;
    const k = Math.min(seg - 1, Math.floor(t));
    const u = t - k;
    const a = cps[k], b = cps[k + 1];
    out.push([CX + s * (a[0] + (b[0] - a[0]) * u), a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}

/** Growth rings across the horn — the detail that sells it as keratin, not a cone. */
function hornRings(ctx, sp, width, count, o = {}) {
  ctx.save();
  ctx.strokeStyle = o.color || D.rgba(C.ink, 0.5);
  ctx.lineWidth = o.w || 11;
  ctx.lineCap = 'round';
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const idx = Math.min(sp.length - 2, Math.max(1, Math.round(t * (sp.length - 1))));
    const a = sp[idx - 1], b = sp[idx + 1], p = sp[idx];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const w = width(t) * (o.reach == null ? 0.92 : o.reach);
    ctx.beginPath();
    ctx.moveTo(p[0] - nx * w, p[1] - ny * w);
    ctx.quadraticCurveTo(p[0] + (dx / len) * 16, p[1] + (dy / len) * 16, p[0] + nx * w, p[1] + ny * w);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw one horn on each side.
 *   cps    control points as [dx, y], dx measured out from the skull centre
 *   width  half-width law over t ∈ [0,1]
 */
function hornPair(ctx, rand, cps, width, o = {}) {
  const out = [];
  for (const s of [-1, +1]) {
    const sp = through(o.cps ? o.cps(s) : cps, s, o.n || 22);
    const pts = D.taper(rand, sp, width, { cap: o.cap || 'point', amp: o.amp || 0 });
    D.shape(ctx, pts, {
      fill: o.fill === undefined ? C.horn : o.fill,
      cel: o.cel === undefined ? { cover: 0.44 } : o.cel,
      w: o.w,
      stroke: o.stroke,
      alpha: o.alpha == null ? 1 : o.alpha,
    });
    if (o.rings) hornRings(ctx, sp, width, o.rings, o.ringOpts);
    out.push({ sp, pts, s });
  }
  return out;
}

const HORN_SPINES = {
  nubs:      [[96, 690], [124, 606], [140, 548]],
  sweep:     [[92, 686], [172, 548], [268, 440], [356, 380]],
  scimitar:  [[88, 686], [190, 510], [332, 384], [492, 336], [606, 380]],
  ibex:      [[84, 690], [150, 480], [238, 310], [344, 186], [456, 152]],
  boer:      [[88, 686], [204, 528], [340, 458], [456, 508], [504, 632], [468, 748]],
  markhor:   [[90, 686], [148, 524], [96, 394], [176, 262], [112, 138], [204, 40]],
  wide:      [[88, 690], [244, 656], [424, 620], [578, 550], [668, 438]],
};

const wCommon = t => 72 * (1 - t * 0.86) + 8;

const HORNS = {
  nubs:         (c, r) => hornPair(c, r, HORN_SPINES.nubs, t => 62 - t * 26, { cap: 'round', rings: 3 }),
  'alpine-sweep': (c, r) => hornPair(c, r, HORN_SPINES.sweep, t => 68 * (1 - t * 0.84) + 8, { rings: 7 }),
  scimitar:     (c, r) => hornPair(c, r, HORN_SPINES.scimitar, wCommon, { rings: 10 }),
  'ibex-ridged': (c, r) => hornPair(c, r, HORN_SPINES.ibex, t => 92 * (1 - t * 0.74) + 14,
    { rings: 13, ringOpts: { w: 20, reach: 1.0, color: D.rgba(C.ink, 0.62) } }),
  'boer-curl':  (c, r) => hornPair(c, r, HORN_SPINES.boer, t => 78 * (1 - t * 0.8) + 12, { rings: 11 }),
  'markhor-spiral': (c, r) => hornPair(c, r, HORN_SPINES.markhor, t => 64 * (1 - t * 0.72) + 12, { rings: 14 }),
  'wide-rack':  (c, r) => hornPair(c, r, HORN_SPINES.wide, t => 80 * (1 - t * 0.86) + 8, { rings: 9 }),

  corkscrew: (ctx, rand) => hornPair(ctx, rand, null, t => 58 * (1 - t * 0.7) + 12, {
    n: 30, rings: 12,
    cps: () => {
      const out = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        out.push([96 + 150 * t + Math.sin(t * 9) * 52, 686 - 570 * t]);
      }
      return out;
    },
  }),

  capped: (ctx, rand) => {
    const horns = hornPair(ctx, rand, HORN_SPINES.sweep, t => 68 * (1 - t * 0.84) + 8, { rings: 6, cap: 'round' });
    for (const h of horns) {
      const tip = h.sp[h.sp.length - 1];
      D.blob(ctx, rand, tip[0], tip[1], 52, 46, { fill: C.brass, cel: { cover: 0.4, color: '#8A5E17' } });
      ctx.fillStyle = D.rgba(C.ink, 0.6);
      for (let i = 0; i < 3; i++) ctx.fillRect(tip[0] - 30 + i * 26, tip[1] - 6, 10, 10);
    }
  },

  banded: (ctx, rand) => {
    const horns = hornPair(ctx, rand, HORN_SPINES.scimitar, wCommon, {});
    for (const h of horns) {
      D.clipTo(ctx, h.pts, () => {
        for (let i = 0; i < 12; i += 2) {
          const t = i / 12;
          const idx = Math.round(t * (h.sp.length - 1));
          const p = h.sp[idx];
          ctx.save();
          ctx.translate(p[0], p[1]);
          ctx.rotate(t * 1.6 * h.s);
          ctx.fillStyle = i % 4 === 0 ? C.orange : C.ink;
          ctx.fillRect(-120, -34, 240, 68);
          ctx.restore();
        }
      });
      D.shape(ctx, h.pts, { fill: null, w: D.style().width });
    }
  },

  chipped: (ctx, rand) => {
    // deliberately asymmetric: one horn intact, the other snapped off mid-length
    const SNAP = [[88, 686], [150, 570], [214, 476]];
    hornPair(ctx, rand, null, wCommon, {
      rings: 10, cps: s => (s > 0 ? HORN_SPINES.scimitar : SNAP),
    });
    const stub = through(SNAP, -1, 8);
    const tip = stub[stub.length - 1], prev = stub[stub.length - 3];
    const dx = tip[0] - prev[0], dy = tip[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const w = wCommon(1) + 26;
    // jagged break across the full width of the stub — pale keratin core
    D.shape(ctx, D.poly(rand, [
      [tip[0] - nx * w, tip[1] - ny * w],
      [tip[0] - nx * w * 0.4 + dx * 0.3, tip[1] - ny * w * 0.4 + dy * 0.3],
      [tip[0] + nx * w * 0.1 - dx * 0.2, tip[1] + ny * w * 0.1 - dy * 0.2],
      [tip[0] + nx * w * 0.6 + dx * 0.4, tip[1] + ny * w * 0.6 + dy * 0.4],
      [tip[0] + nx * w, tip[1] + ny * w],
    ], 5), { fill: '#EDE2CE', w: 14 });
  },

  neon: (ctx, rand) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, col, a] of [[2.2, '#E33B8C', 0.30], [1.4, '#FF6FC0', 0.55]]) {
      hornPair(ctx, rand, HORN_SPINES.scimitar, t => wCommon(t) * w,
        { fill: col, stroke: null, cel: false, alpha: a });
    }
    ctx.restore();
    hornPair(ctx, rand, HORN_SPINES.scimitar, wCommon,
      { fill: '#2A0E22', stroke: '#FF6FC0', w: 18, cel: false });
    // a thin filament down the middle, not a fat white core — this is a neon tube
    hornPair(ctx, rand, HORN_SPINES.scimitar, t => Math.max(5, wCommon(t) * 0.14),
      { fill: '#FFD9EF', stroke: null, cel: false, alpha: 0.9 });
  },

  'gold-tipped': (ctx, rand) => {
    const horns = hornPair(ctx, rand, HORN_SPINES.scimitar, wCommon, { fill: '#3A322A', rings: 10 });
    for (const h of horns) {
      D.clipTo(ctx, h.pts, () => {
        const cut = Math.round(h.sp.length * 0.6);
        const seg = h.sp.slice(cut);
        D.shape(ctx, D.taper(rand, seg, t => wCommon(0.6 + t * 0.4) * 1.25),
          { fill: C.gold, stroke: null, cel: { cover: 0.4, color: C.brass } });
        const drip = h.sp[cut];
        D.blob(ctx, rand, drip[0], drip[1] + 26, 30, 44, { fill: C.gold, stroke: null, cel: false });
      });
      D.shape(ctx, h.pts, { fill: null, w: D.style().width });
    }
  },

  crystal: (ctx, rand) => {
    const horns = hornPair(ctx, rand, HORN_SPINES.ibex, t => 88 * (1 - t * 0.74) + 14,
      { fill: '#8FC4DA', stroke: '#2E5F7A', w: 18, cel: { cover: 0.5, color: '#5E9BB8' } });
    for (const h of horns) {
      D.clipTo(ctx, h.pts, () => {
        // long angular facets down the length, not even stripes across it
        for (let i = 0; i < 5; i++) {
          const t = i / 5;
          const a = h.sp[Math.round(t * (h.sp.length - 1))];
          const b = h.sp[Math.round(Math.min(1, t + 0.34) * (h.sp.length - 1))];
          ctx.save();
          ctx.globalAlpha = i % 2 ? 0.42 : 0.30;
          D.shape(ctx, [[a[0] - 130, a[1]], [b[0] + 20, b[1] - 40], [b[0] + 130, b[1] + 60], [a[0] + 10, a[1] + 90]],
            { fill: i % 2 ? '#E4F6FC' : '#3E7E99', stroke: null, cel: false });
          ctx.restore();
        }
      });
      D.shape(ctx, h.pts, { fill: null, stroke: '#DDF3FB', w: 8 });
      const tip = h.sp[h.sp.length - 1];
      D.star(ctx, rand, tip[0], tip[1], 62, 12, 4, { fill: '#FFFFFF', stroke: null });
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   08 — HEADWEAR   (sits on the skull between the horns)
   ═══════════════════════════════════════════════════════════════════════════ */
const HEADWEAR = {
  beanie: (ctx, rand) => {
    const cap = D.poly(rand, [
      [CX - 344, 742], [CX - 320, 620], [CX - 190, 542], [CX, 520],
      [CX + 190, 542], [CX + 320, 620], [CX + 344, 742],
    ], 6);
    D.shape(ctx, cap, { fill: '#2E6B57' });
    D.clipTo(ctx, cap, () => D.hatch(ctx, CX - 360, 500, 720, 280,
      { gap: 34, angle: 0, color: D.rgba(C.ink, 0.28), width: 9 }));
    D.roundRect(ctx, CX - 356, 716, 712, 86, 30, { fill: '#3C8A70' });
    D.blob(ctx, rand, CX, 486, 66, 60, { fill: '#E8E1D0' });
  },

  headlamp: (ctx, rand) => {
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 360 + 720 * t, 720 - Math.sin(Math.PI * t) * 66], 12), () => 38),
      { fill: '#2A2E33' });
    D.roundRect(ctx, CX - 96, 604, 192, 128, 22, { fill: '#3A4046' });
    D.blob(ctx, rand, CX, 668, 62, 58, { fill: '#FFF3C4', cel: false });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    const g = ctx.createRadialGradient(CX, 668, 20, CX, 668, 420);
    g.addColorStop(0, 'rgba(255,240,180,0.9)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, 668, 420, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  'bandana-tie': (ctx, rand) => {
    const cap = D.poly(rand, [
      [CX - 340, 760], [CX - 316, 622], [CX, 560], [CX + 316, 622], [CX + 340, 760],
    ], 6);
    D.shape(ctx, cap, { fill: '#B3312B' });
    D.clipTo(ctx, cap, () => {
      ctx.save(); ctx.globalAlpha = 0.4;
      for (let i = 0; i < 20; i++) {
        D.blob(ctx, rand, CX + D.jit(rand, 300), 660 + D.jit(rand, 90), 22, 30,
          { fill: '#F0E2D0', stroke: null, cel: false });
      }
      ctx.restore();
    });
    D.blob(ctx, rand, CX + 356, 742, 74, 60, { fill: '#8E2420' });
    D.shape(ctx, D.poly(rand, [[CX + 400, 720], [CX + 540, 780], [CX + 512, 838], [CX + 392, 790]], 6),
      { fill: '#B3312B' });
  },

  'goggles-up': (ctx, rand) => {
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 380 + 760 * t, 786 - Math.sin(Math.PI * t) * 40], 12), () => 44),
      { fill: '#2A2E33' });
    D.roundRect(ctx, CX - 300, 606, 600, 200, 84, { fill: '#1E2228' });
    D.roundRect(ctx, CX - 262, 638, 524, 132, 62, { fill: '#7FD4E8', cel: { cover: 0.4, color: '#2E8FA8' } });
    ctx.save();
    ctx.globalAlpha = 0.55;
    D.shape(ctx, [[CX - 240, 760], [CX - 60, 640], [CX + 40, 640], [CX - 150, 764]],
      { fill: '#FFFFFF', stroke: null, cel: false });
    ctx.restore();
  },

  trapper: (ctx, rand) => {
    for (const s of [-1, 1]) {
      D.blob(ctx, rand, CX + s * 352, 830, 118, 190, { fill: '#D8C4A0', n: 18 });
    }
    const cap = D.poly(rand, [
      [CX - 356, 736], [CX - 330, 596], [CX, 520], [CX + 330, 596], [CX + 356, 736],
    ], 6);
    D.shape(ctx, cap, { fill: '#6B4B2E' });
    for (let i = -3; i <= 3; i++) {
      D.blob(ctx, rand, CX + i * 108, 736, 66, 52, { fill: '#E4D3B2', n: 12 });
    }
  },

  'hard-hat': (ctx, rand) => {
    const dome = D.poly(rand, [
      [CX - 330, 728], [CX - 300, 596], [CX, 528], [CX + 300, 596], [CX + 330, 728],
    ], 6);
    D.shape(ctx, dome, { fill: '#E8C020' });
    D.roundRect(ctx, CX - 386, 716, 772, 62, 28, { fill: '#D2A814' });
    ctx.fillStyle = D.rgba(C.ink, 0.35);
    ctx.fillRect(CX - 20, 540, 40, 180);
    for (const s of [-1, 1]) {   // horn cut-outs
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.ellipse(CX + s * 96, 690, 76, 62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    D.stroke(ctx, rand, [CX - 320, 770], [CX + 320, 770], -30, { w: 16, stroke: '#3A3A3A' });
  },

  cowboy: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [
      [CX - 620, 742], [CX - 300, 690], [CX + 300, 690], [CX + 620, 742],
      [CX + 470, 810], [CX, 836], [CX - 470, 810],
    ], 7), { fill: '#B98A52' });
    D.shape(ctx, D.poly(rand, [
      [CX - 250, 704], [CX - 210, 552], [CX - 90, 508], [CX + 90, 508], [CX + 210, 552], [CX + 250, 704],
    ], 6), { fill: '#C79961' });
    ctx.fillStyle = '#6B4B2E';
    ctx.fillRect(CX - 254, 654, 508, 56);
    D.shape(ctx, D.poly(rand, [[CX - 60, 630], [CX, 606], [CX + 60, 630], [CX, 700]], 4), { fill: C.brass, w: 12 });
  },

  laurel: (ctx, rand) => {
    for (const s of [-1, 1]) {
      const sp = D.spine(t => [CX + s * (360 - 120 * Math.sin(t * 2.2)), 800 - 300 * t], 12);
      D.shape(ctx, D.taper(rand, sp, () => 16), { fill: '#3F6B37' });
      for (let i = 1; i < 8; i++) {
        const p = sp[Math.round((i / 8) * (sp.length - 1))];
        D.blob(ctx, rand, p[0] + s * 46, p[1] - 10, 56, 30,
          { fill: i % 2 ? '#4E8C3A' : '#3F6B37', n: 10, w: 12 });
      }
    }
  },

  'party-cone': (ctx, rand) => {
    ctx.save();
    ctx.translate(CX + 40, 560);
    ctx.rotate(0.22);
    const cone = D.poly(rand, [[-170, 180], [0, -300], [170, 180]], 6);
    D.shape(ctx, cone, { fill: '#F2E7D4' });
    D.clipTo(ctx, cone, () => {
      for (let i = -4; i < 6; i++) {
        D.shape(ctx, [[-220 + i * 90, 200], [-160 + i * 90, 200], [-30 + i * 90, -320], [-90 + i * 90, -320]],
          { fill: i % 2 ? '#E33B8C' : '#2F4BB8', stroke: null, cel: false });
      }
    });
    D.blob(ctx, rand, 0, -300, 52, 52, { fill: '#FFD24A' });
    ctx.restore();
  },

  'chef-toque': (ctx, rand) => {
    for (let i = -2; i <= 2; i++) {
      D.blob(ctx, rand, CX + i * 118, 500, 118, 130, { fill: '#F6F3EC', n: 16 });
    }
    D.roundRect(ctx, CX - 268, 636, 536, 130, 24, { fill: '#EDE9E0' });
    ctx.strokeStyle = D.rgba(C.ink, 0.25);
    ctx.lineWidth = 8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(CX + i * 108, 644); ctx.lineTo(CX + i * 108, 758); ctx.stroke();
    }
  },

  crown: (ctx, rand) => {
    const band = D.poly(rand, [[CX - 250, 700], [CX + 250, 700], [CX + 250, 782], [CX - 250, 782]], 5);
    const spikes = D.poly(rand, [
      [CX - 250, 704], [CX - 250, 560], [CX - 150, 640], [CX - 60, 512],
      [CX + 60, 512], [CX + 150, 640], [CX + 250, 560], [CX + 250, 704],
    ], 6);
    D.shape(ctx, spikes, { fill: C.gold, cel: { cover: 0.42, color: C.brass } });
    D.shape(ctx, band, { fill: C.goldHi, cel: { cover: 0.4, color: C.gold } });
    for (const [x, col] of [[CX - 130, '#D6402F'], [CX, '#2F4BB8'], [CX + 130, '#D6402F']]) {
      D.blob(ctx, rand, x, 742, 34, 34, { fill: col, w: 12 });
    }
  },

  halo: (ctx, rand) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#FFE9A8';
    ctx.lineWidth = 64;
    ctx.beginPath(); ctx.ellipse(CX, 400, 300, 78, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 34;
    ctx.beginPath(); ctx.ellipse(CX, 400, 300, 78, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.goldHi;
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.ellipse(CX, 392, 300, 78, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   09 — EYEWEAR   (on the eye line, temples running back to the ears)
   ═══════════════════════════════════════════════════════════════════════════ */
function temples(ctx, rand, y = EYE_Y - 16) {
  for (const s of [-1, 1]) {
    D.stroke(ctx, rand, [CX + s * 250, y], [CX + s * 400, y - 22], 8, { w: 20 });
  }
}
function glint(ctx, rand, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  D.shape(ctx, [[x - 40, y + 34], [x + 12, y - 34], [x + 46, y - 34], [x - 6, y + 34]],
    { fill: '#FFFFFF', stroke: null, cel: false });
  ctx.restore();
}

const EYEWEAR = {
  'glacier-glasses': (ctx, rand) => {
    temples(ctx, rand);
    for (const s of [-1, 1]) {
      const x = s < 0 ? EYE_L : EYE_R;
      D.blob(ctx, rand, x, EYE_Y, 118, 108, { fill: '#2F5B44', cel: { cover: 0.4, color: '#1C3A2B' } });
      D.shape(ctx, D.poly(rand, [   // leather side shield
        [x + s * 110, EYE_Y - 92], [x + s * 200, EYE_Y - 62], [x + s * 200, EYE_Y + 66], [x + s * 110, EYE_Y + 96],
      ], 5), { fill: '#7A5A38' });
      glint(ctx, rand, x - 30, EYE_Y);
    }
    D.stroke(ctx, rand, [EYE_L + 100, EYE_Y - 20], [EYE_R - 100, EYE_Y - 20], -16, { w: 22 });
  },

  'shutter-shades': (ctx, rand) => {
    temples(ctx, rand);
    const body = D.poly(rand, [
      [CX - 300, EYE_Y - 92], [CX + 300, EYE_Y - 92], [CX + 300, EYE_Y + 84], [CX - 300, EYE_Y + 84],
    ], 5);
    D.shape(ctx, body, { fill: '#E33B8C' });
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 4; i++) ctx.fillRect(CX - 292, EYE_Y - 66 + i * 42, 584, 20);
    ctx.restore();
  },

  aviators: (ctx, rand) => {
    temples(ctx, rand);
    for (const s of [-1, 1]) {
      const x = s < 0 ? EYE_L : EYE_R;
      const lens = D.poly(rand, [
        [x - 122, EYE_Y - 74], [x + 122, EYE_Y - 74], [x + 104, EYE_Y + 48],
        [x + 10, EYE_Y + 110], [x - 104, EYE_Y + 48],
      ], 5);
      D.shape(ctx, lens, { fill: '#5A4A2E', cel: { cover: 0.5, color: '#2E2617' } });
      D.shape(ctx, lens, { fill: null, stroke: C.gold, w: 12 });
      glint(ctx, rand, x - 40, EYE_Y);
    }
    ctx.strokeStyle = C.gold; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(EYE_L + 120, EYE_Y - 60); ctx.lineTo(EYE_R - 120, EYE_Y - 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(EYE_L + 120, EYE_Y - 20); ctx.lineTo(EYE_R - 120, EYE_Y - 20); ctx.stroke();
  },

  'ski-goggles': (ctx, rand) => {
    D.shape(ctx, D.taper(rand, D.spine(t => [CX - 420 + 840 * t, EYE_Y - Math.sin(Math.PI * t) * 30], 12), () => 46),
      { fill: '#1E2228' });
    D.roundRect(ctx, CX - 316, EYE_Y - 116, 632, 232, 96, { fill: '#24282E' });
    D.roundRect(ctx, CX - 276, EYE_Y - 82, 552, 164, 74,
      { fill: '#C9A227', cel: { cover: 0.45, color: '#8A6C14' } });
    ctx.save();
    ctx.globalAlpha = 0.5;
    D.shape(ctx, [[CX - 250, EYE_Y + 70], [CX - 30, EYE_Y - 76], [CX + 80, EYE_Y - 76], [CX - 140, EYE_Y + 74]],
      { fill: '#FFFFFF', stroke: null, cel: false });
    ctx.restore();
  },

  'round-specs': (ctx, rand) => {
    temples(ctx, rand);
    for (const s of [-1, 1]) {
      const x = s < 0 ? EYE_L : EYE_R;
      D.blob(ctx, rand, x, EYE_Y, 110, 100, { fill: 'rgba(230,240,245,0.30)', stroke: '#3A3630', w: 16, cel: false });
      glint(ctx, rand, x - 34, EYE_Y);
    }
    D.stroke(ctx, rand, [EYE_L + 96, EYE_Y - 14], [EYE_R - 96, EYE_Y - 14], -14, { w: 14 });
  },

  visor: (ctx, rand) => {
    const body = D.poly(rand, [
      [CX - 330, EYE_Y - 70], [CX, EYE_Y - 96], [CX + 330, EYE_Y - 70],
      [CX + 316, EYE_Y + 66], [CX, EYE_Y + 92], [CX - 316, EYE_Y + 66],
    ], 5);
    D.shape(ctx, body, { fill: C.orange, cel: { cover: 0.45, color: '#A8320C' } });
    ctx.save();
    ctx.globalAlpha = 0.45;
    D.shape(ctx, [[CX - 280, EYE_Y + 50], [CX - 60, EYE_Y - 80], [CX + 30, EYE_Y - 80], [CX - 190, EYE_Y + 56]],
      { fill: '#FFFFFF', stroke: null, cel: false });
    ctx.restore();
  },

  monocle: (ctx, rand) => {
    D.blob(ctx, rand, EYE_R, EYE_Y, 128, 118, { fill: 'rgba(235,240,230,0.28)', stroke: C.gold, w: 20, cel: false });
    glint(ctx, rand, EYE_R - 40, EYE_Y);
    ctx.save();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(EYE_R + 120, EYE_Y + 60);
    ctx.quadraticCurveTo(EYE_R + 250, EYE_Y + 320, EYE_R + 120, EYE_Y + 480);
    ctx.stroke();
    ctx.restore();
  },

  'laser-visor': (ctx, rand) => {
    D.roundRect(ctx, CX - 356, EYE_Y - 62, 712, 124, 46, { fill: '#141318' });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(CX - 340, 0, CX + 340, 0);
    g.addColorStop(0, 'rgba(255,30,60,0)');
    g.addColorStop(0.5, 'rgba(255,60,80,1)');
    g.addColorStop(1, 'rgba(255,30,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(CX - 340, EYE_Y - 18, 680, 36);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(CX - 300, EYE_Y - 6, 600, 12);
    ctx.restore();
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   10 — HELD ITEM   (one hoof, lower left, never reaching the face)
   ═══════════════════════════════════════════════════════════════════════════ */
const HX = HELD.x, HY = HELD.y;

/** Wrap every item so it always ships with the hoof holding it. */
function withHoof(items) {
  const out = {};
  for (const [k, fn] of Object.entries(items)) {
    out[k] = (ctx, rand) => {
      ctx.save();
      ctx.translate(HX, HY);
      ctx.scale(1.3, 1.3);            // drawn at a comfortable working size, set in as one unit
      ctx.translate(-HX, -HY);
      hoofLeg(ctx, rand, HX, HY + 150, 1);
      fn(ctx, rand);
      hoofToes(ctx, rand, HX, HY + 150, 1);
      ctx.restore();
    };
  }
  return out;
}

const HELD_ITEM = withHoof({
  'tin-can': (ctx, rand) => {
    ctx.save();
    ctx.translate(HX, HY - 60);
    ctx.rotate(-0.2);
    D.roundRect(ctx, -120, -170, 240, 340, 22, { fill: '#B9BFC6', w: 18 });
    ctx.fillStyle = '#C4402F'; ctx.fillRect(-120, -70, 240, 150);
    ctx.fillStyle = '#EFE7D6'; ctx.fillRect(-120, -40, 190, 40);
    D.roundRect(ctx, -120, -186, 240, 44, 18, { fill: '#8F969E' });
    ctx.restore();
  },

  'ice-axe': (ctx, rand) => {
    ctx.save();
    ctx.translate(HX, HY - 40);
    ctx.rotate(-0.32);
    D.roundRect(ctx, -26, -300, 52, 620, 20, { fill: '#3A4046' });
    D.roundRect(ctx, -22, 100, 44, 200, 16, { fill: '#E8681F' });
    D.shape(ctx, D.poly(rand, [[-20, -300], [-230, -218], [-170, -272], [-14, -352]], 5), { fill: '#C9CED4' });
    D.shape(ctx, D.poly(rand, [[20, -300], [180, -262], [120, -206], [14, -252]], 5), { fill: '#C9CED4' });
    ctx.restore();
  },

  'rope-coil': (ctx, rand) => {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 46;
      ctx.beginPath(); ctx.ellipse(HX, HY - 70 + i * 44, 176 - i * 10, 74, 0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#E87A2A' : '#D6532A'; ctx.lineWidth = 32;
      ctx.beginPath(); ctx.ellipse(HX, HY - 70 + i * 44, 176 - i * 10, 74, 0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  },

  'summit-flag': (ctx, rand) => {
    D.roundRect(ctx, HX - 20, HY - 460, 40, 700, 16, { fill: '#6B4B2E' });
    D.shape(ctx, D.poly(rand, [
      [HX + 16, HY - 452], [HX + 330, HY - 330], [HX + 16, HY - 206],
    ], 8), { fill: C.orange, cel: { cover: 0.4, color: '#B8380E' } });
    label(ctx, 'G', HX + 130, HY - 330, 132, '#FFF1DC', { w: 14 });
  },

  cowbell: (ctx, rand) => {
    D.stroke(ctx, rand, [HX, HY - 340], [HX, HY - 200], 0, { w: 30, stroke: '#6B4327' });
    D.shape(ctx, D.poly(rand, [
      [HX - 96, HY - 210], [HX + 96, HY - 210], [HX + 150, HY + 40], [HX - 150, HY + 40],
    ], 5), { fill: C.brass, cel: { cover: 0.45, color: '#8A5E17' } });
    D.roundRect(ctx, HX - 168, HY + 30, 336, 52, 22, { fill: '#A87824' });
    D.blob(ctx, rand, HX, HY + 104, 40, 40, { fill: '#7A5416' });
    for (const [x, r] of [[HX - 250, 0.7], [HX + 250, -0.7]]) {
      D.stroke(ctx, rand, [x, HY - 160], [x + (x < HX ? -70 : 70), HY - 210], r * 40, { w: 14 });
    }
  },

  'hay-bale': (ctx, rand) => {
    const b = D.poly(rand, [[HX - 190, HY - 210], [HX + 190, HY - 240], [HX + 200, HY + 60], [HX - 180, HY + 90]], 6);
    D.shape(ctx, b, { fill: '#D9B65B', cel: { cover: 0.42 } });
    D.clipTo(ctx, b, () => D.hatch(ctx, HX - 220, HY - 260, 460, 380,
      { gap: 22, angle: 0.06, color: D.rgba(C.ink, 0.28), width: 6 }));
    ctx.fillStyle = '#8E7A2E';
    for (const x of [HX - 90, HX + 90]) ctx.fillRect(x - 14, HY - 232, 28, 300);
    for (let i = 0; i < 8; i++) {
      D.stroke(ctx, rand, [HX + D.jit(rand, 170), HY - 230], [HX + D.jit(rand, 200), HY - 300], 12,
        { w: 8, stroke: '#C9A227' });
    }
  },

  espresso: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [
      [HX - 120, HY - 180], [HX + 120, HY - 180], [HX + 92, HY - 10], [HX - 92, HY - 10],
    ], 5), { fill: '#F6F3EC' });
    ctx.save();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(HX + 150, HY - 100, 56, -1.2, 1.2); ctx.stroke();
    ctx.restore();
    D.blob(ctx, rand, HX, HY - 176, 118, 26, { fill: '#4A2A18', stroke: null, cel: false });
    D.roundRect(ctx, HX - 190, HY - 14, 380, 44, 20, { fill: '#E4E0D6' });
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 3; i++) {
      D.stroke(ctx, rand, [HX - 40 + i * 40, HY - 200], [HX - 20 + i * 40, HY - 330], 30 * (i % 2 ? 1 : -1),
        { w: 14, stroke: '#F6F3EC' });
    }
    ctx.restore();
  },

  'ski-poles': (ctx, rand) => {
    for (const [rot, col] of [[-0.28, '#C9CED4'], [0.24, '#9AA3AC']]) {
      ctx.save();
      ctx.translate(HX, HY - 60);
      ctx.rotate(rot);
      D.roundRect(ctx, -18, -380, 36, 660, 14, { fill: col });
      D.roundRect(ctx, -30, -390, 60, 110, 20, { fill: '#2A2E33' });
      ctx.save();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 18;
      ctx.beginPath(); ctx.ellipse(0, 210, 66, 26, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
  },

  trophy: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [
      [HX - 130, HY - 300], [HX + 130, HY - 300], [HX + 96, HY - 90], [HX - 96, HY - 90],
    ], 5), { fill: C.gold, cel: { cover: 0.42, color: C.brass } });
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 40;
      ctx.beginPath(); ctx.arc(HX + s * 130, HY - 220, 62, s < 0 ? 1.6 : -1.6, s < 0 ? 4.7 : 1.6); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.arc(HX + s * 130, HY - 220, 62, s < 0 ? 1.6 : -1.6, s < 0 ? 4.7 : 1.6); ctx.stroke();
      ctx.restore();
    }
    D.roundRect(ctx, HX - 40, HY - 96, 80, 70, 10, { fill: C.brass });
    D.roundRect(ctx, HX - 130, HY - 34, 260, 76, 16, { fill: '#6B4B2E' });
    D.star(ctx, rand, HX, HY - 200, 46, 20, 5, { fill: C.goldHi, stroke: null });
  },

  'gold-pick': (ctx, rand) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(HX, HY - 200, 20, HX, HY - 200, 460);
    g.addColorStop(0, 'rgba(255,220,120,0.6)');
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(HX, HY - 200, 460, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(HX, HY - 40);
    ctx.rotate(-0.3);
    D.roundRect(ctx, -26, -300, 52, 620, 20, { fill: C.brass });
    D.shape(ctx, D.poly(rand, [[-24, -290], [-250, -200], [-180, -278], [-14, -358], [180, -282], [250, -206], [24, -290]], 6),
      { fill: C.gold, cel: { cover: 0.4, color: C.brass } });
    D.blob(ctx, rand, 0, -320, 46, 46, { fill: '#8FD2E8', w: 12 });
    ctx.restore();
    for (const [x, y] of [[HX - 250, HY - 380], [HX + 230, HY - 300], [HX + 60, HY - 470]]) {
      D.star(ctx, rand, x, y, 54, 16, 4, { fill: '#FFF0BE', stroke: null });
    }
  },
});

/* ═══════════════════════════════════════════════════════════════════════════
   11 — OVERLAY   (full bleed, on top of everything, deliberately restrained)
   ═══════════════════════════════════════════════════════════════════════════ */
const OVERLAY = {
  snowfall: (ctx, rand) => {
    for (let i = 0; i < 150; i++) {
      const x = rand() * S, y = rand() * S;
      // keep the face legible: flakes thin out hard over the eye line
      const near = Math.hypot(x - CX, y - EYE_Y) < 420;
      if (near && rand() < 0.72) continue;
      const r = 4 + rand() * 11;
      ctx.globalAlpha = (near ? 0.22 : 0.34) + rand() * 0.34;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  alpenglow: (ctx) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, 'rgba(255,150,90,0.42)');
    g.addColorStop(0.5, 'rgba(255,110,140,0.16)');
    g.addColorStop(1, 'rgba(90,60,140,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },

  'altitude-haze': (ctx) => {
    const g = ctx.createLinearGradient(0, S * 0.55, 0, S);
    g.addColorStop(0, 'rgba(226,238,244,0)');
    g.addColorStop(1, 'rgba(226,238,244,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, S * 0.55, S, S * 0.45);
  },

  scanlines: (ctx) => {
    ctx.fillStyle = 'rgba(12,12,16,0.22)';
    for (let y = 0; y < S; y += 10) ctx.fillRect(0, y, S, 4);
  },

  sparkle: (ctx, rand) => {
    for (let i = 0; i < 40; i++) {
      const x = rand() * S, y = rand() * S;
      const r = 20 + rand() * 46;
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      D.star(ctx, rand, x, y, r, r * 0.2, 4, { fill: '#FFF8E0', stroke: null });
    }
    ctx.globalAlpha = 1;
  },

  'laser-glow': (ctx) => {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(CX, EYE_Y, 40, CX, EYE_Y, 1180);
    g.addColorStop(0, 'rgba(255,40,60,0.55)');
    g.addColorStop(0.4, 'rgba(255,40,60,0.18)');
    g.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';
  },

  'gold-shimmer': (ctx, rand) => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,214,120,0.10)';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 130; i++) {
      const x = rand() * S, y = rand() * S, r = 3 + rand() * 12;
      ctx.globalAlpha = 0.3 + rand() * 0.6;
      ctx.fillStyle = rand() < 0.5 ? '#FFE9A8' : '#FFC94A';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  },

  'pixel-mode': (ctx) => {
    const px = 64;
    ctx.strokeStyle = 'rgba(12,12,16,0.30)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= S; i += px) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 0; y < S; y += px) {
      for (let x = 0; x < S; x += px) if ((x / px + y / px) % 2 === 0) ctx.fillRect(x, y, px, px);
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Registry + main
   ═══════════════════════════════════════════════════════════════════════════ */
const REGISTRY = {
  '00-background': BACKGROUND,
  '01-backdrop': BACKDROP,
  '02-coat': COAT,
  '03-marking': MARKING,
  '04-outfit': OUTFIT,
  '05-mouth': MOUTH,
  '06-eyes': EYES,
  '07-horns': HORNS,
  '08-headwear': HEADWEAR,
  '09-eyewear': EYEWEAR,
  '10-held': HELD_ITEM,
  '11-overlay': OVERLAY,
};

function main() {
  const styleName = process.argv.slice(2).find(a => !a.startsWith('-')) || 'alpine';
  D.setStyle(styleName);
  console.log(`\n  drawing ${spec.totalLayers} layers — style: ${styleName}\n`);

  // Fail loudly on any layer in prompts.json we don't have a draw function for.
  const missing = [];
  for (const cat of spec.categories) {
    for (const l of cat.layers) {
      if (typeof (REGISTRY[cat.id] || {})[l.file] !== 'function') missing.push(`${cat.id}/${l.file}`);
    }
  }
  if (missing.length) {
    throw new Error(`no draw function for ${missing.length} layer(s):\n    ${missing.join('\n    ')}`);
  }

  let n = 0;
  for (const cat of spec.categories) {
    const dir = path.join(ROOT, 'layers', cat.id);
    fs.mkdirSync(dir, { recursive: true });
    // clear a previous run so renamed weights don't leave duplicates behind
    for (const f of fs.readdirSync(dir)) if (/\.png$/i.test(f)) fs.unlinkSync(path.join(dir, f));

    for (const layer of cat.layers) {
      const [canvas, ctx] = ctxOf();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // per-layer seed => deterministic, and editing one layer never reshuffles the others
      const rand = D.makeRng(`${styleName}|${cat.id}|${layer.file}`);
      REGISTRY[cat.id][layer.file](ctx, rand);
      fs.writeFileSync(path.join(dir, `${layer.file}#${layer.weight}.png`), canvas.toBuffer('image/png'));
      n++;
    }
    if (cat.allowNone) {
      fs.writeFileSync(path.join(dir, `none#${cat.noneWeight}.png`), createCanvas(S, S).toBuffer('image/png'));
      n++;
    }
    console.log(`  ${cat.id.padEnd(16)} ${cat.layers.length + (cat.allowNone ? 1 : 0)}`);
  }

  console.log(`\n  ${n} layers written to generator/layers/`);
  console.log(`  next:  npm run preview -- 36\n`);
}

try { main(); } catch (e) {
  console.error(`\n  ✗ ${e.message}\n`);
  process.exit(1);
}
