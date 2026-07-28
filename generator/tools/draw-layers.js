#!/usr/bin/env node
/**
 * Draws all 125 real layer PNGs — no image model, no hand cleanup.
 *
 *   npm run art                 # draw everything in the 'quantum' style
 *   npm run art -- crayon       # ...or the kid-marker style
 *
 * Why this beats prompting an image model for this job: every layer is placed by the same
 * arithmetic, so alignment is exact by construction. No anchor sheet, no drift, no
 * hand-nudging 20% of the output. Retune a colour or a shape and re-run — it's 20 seconds.
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
const S = spec.canvas;                 // 2048

/* ── geometry ────────────────────────────────────────────────────────────── */
const CX = spec.anchors.bodyCenterX;   // 1024
const EYE_Y = spec.anchors.eyeLineY;   // 880
const EYE_L = 880, EYE_R = 1170;       // eye centres
const HEAD = { x: CX, y: 960, rx: 440, ry: 400 };   // top lands on headTopY = 560
const MUZZLE = { x: CX, y: 1150, rx: 250, ry: 175 };
const NOSE = { x: CX, y: 1075, rx: 88, ry: 66 };
const BODY_TOP = 1420;
const HELD = { x: spec.anchors.heldItemX, y: spec.anchors.heldItemY };  // 470, 1560

/* ── palette ─────────────────────────────────────────────────────────────── */
const C = {
  cream: '#F5EFE3', tan: '#E8B96A', cocoa: '#8C5A3C', ash: '#B8B5AE',
  golden: '#EFC373', black: '#2F2F3A', shiba: '#E88B3D', husky: '#8E99A4',
  corgi: '#E8A05C', pitty: '#9AA5AD', poodle: '#F0C9A0', white: '#FFFFFF',
  ink: '#101018', red: '#E04A34', orange: '#FF8A3D', gold: '#FFC93D',
  lime: '#B8E635', green: '#2E9E63', teal: '#3FC7C0', sky: '#5AB6F0',
  blue: '#3E6BD6', purple: '#8B5CF6', pink: '#FF8FB1', magenta: '#FF3D8B',
  grey: '#8B8FA3', dark: '#2A2E42', silver: '#C9CEDC',
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
const ctxOf = () => {
  const c = createCanvas(S, S);
  return [c, c.getContext('2d')];
};

/** Flat background fill plus a soft edge vignette so it isn't dead flat. */
function flat(ctx, color, vignette = 0.1) {
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

/** Scatter little stars across the frame, avoiding the centre where the dog sits. */
function starfield(ctx, rand, n, color, maxR = 9) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = rand() * S, y = rand() * S;
    if (Math.hypot(x - CX, y - 1000) < 620) continue;
    const r = 2 + rand() * maxR;
    if (rand() < 0.25) D.star(ctx, rand, x, y, r * 2.4, r * 0.9, 4, { fill: color, stroke: null });
    else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  }
}

/** Text drawn as ink-outlined display type (varsity letters, jersey numbers, signs). */
function label(ctx, text, x, y, size, fill, o = {}) {
  ctx.save();
  ctx.font = `900 ${size}px ${o.font || 'sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = o.stroke || D.style().ink;
  ctx.lineWidth = o.w == null ? D.style().width * 0.9 : o.w;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
   00 — BACKGROUND
   ═══════════════════════════════════════════════════════════════════════════ */
const solidBg = c => (ctx) => flat(ctx, c);

const BACKGROUND = {
  sky: solidBg('#A8D8F0'), mint: solidBg('#A8E6C4'), peach: solidBg('#FFC9A3'),
  lilac: solidBg('#C9B6E8'), butter: solidBg('#F7E08A'), bubblegum: solidBg('#FFA8C5'),
  sage: solidBg('#9DB89A'), slate: solidBg('#7E8A96'), tangerine: solidBg('#FF8A3D'),
  seafoam: solidBg('#7FD4C1'),

  'awning-stripes': (ctx, rand) => {
    flat(ctx, '#F5EFE3', 0.12);
    ctx.fillStyle = '#D6402F';
    for (let x = 0; x < S + 180; x += 340) {
      ctx.beginPath();
      ctx.moveTo(x + D.jit(rand, 8), -20);
      ctx.lineTo(x + 170 + D.jit(rand, 8), -20);
      ctx.lineTo(x + 170 + D.jit(rand, 10), S + 20);
      ctx.lineTo(x + D.jit(rand, 10), S + 20);
      ctx.closePath();
      ctx.fill();
    }
  },

  sunburst: (ctx, rand) => {
    flat(ctx, '#FFD24A', 0);
    ctx.fillStyle = '#FFB03A';
    const rays = 24;
    for (let i = 0; i < rays; i += 2) {
      const a0 = (i / rays) * Math.PI * 2, a1 = ((i + 1) / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(CX, 1000);
      ctx.lineTo(CX + Math.cos(a0) * 2600, 1000 + Math.sin(a0) * 2600);
      ctx.lineTo(CX + Math.cos(a1) * 2600, 1000 + Math.sin(a1) * 2600);
      ctx.closePath();
      ctx.fill();
    }
    flat(ctx, 'rgba(0,0,0,0)', 0.14);
  },

  midnight: (ctx, rand) => {
    flat(ctx, '#16213E', 0.22);
    starfield(ctx, rand, 90, '#F5EFE3');
  },

  void: (ctx, rand) => {
    flat(ctx, '#0A0A0B', 0);
    // faint nebula wash so the darkest background still has depth
    const g = ctx.createRadialGradient(CX, 820, 60, CX, 820, 1200);
    g.addColorStop(0, 'rgba(139,92,246,0.20)');
    g.addColorStop(0.55, 'rgba(62,107,214,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    starfield(ctx, rand, 130, '#E8E4FF');
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   01 — BACKDROP PROP   (behind the dog: keep out of the centre column)
   ═══════════════════════════════════════════════════════════════════════════ */
const BACKDROP = {
  clouds: (ctx, rand) => {
    const puff = (x, y, s) => {
      const pts = [
        ...D.ring(rand, x - s * 0.7, y, s * 0.62, s * 0.55, { n: 12 }),
        ...D.ring(rand, x + s * 0.7, y, s * 0.62, s * 0.55, { n: 12 }),
      ];
      D.blob(ctx, rand, x - s * 0.62, y + s * 0.1, s * 0.62, s * 0.52, { fill: C.white });
      D.blob(ctx, rand, x + s * 0.62, y + s * 0.1, s * 0.58, s * 0.48, { fill: C.white });
      D.blob(ctx, rand, x, y - s * 0.16, s * 0.78, s * 0.66, { fill: C.white });
      return pts;
    };
    puff(320, 380, 250); puff(1760, 300, 210); puff(230, 830, 180);
  },

  moon: (ctx, rand) => {
    const outer = D.ring(rand, 1650, 380, 230, 230, { n: 20 });
    D.shape(ctx, outer, { fill: '#FDF3C9' });
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    D.closedPath(ctx, D.ring(rand, 1540, 330, 200, 200, { n: 20 }));
    ctx.fill();
    ctx.restore();
    D.shape(ctx, outer, { fill: null });
    for (const [x, y, r] of [[1330, 200, 34], [1880, 620, 26], [1450, 700, 22]]) {
      D.star(ctx, rand, x, y, r * 2.3, r * 0.85, 4, { fill: '#FDF3C9' });
    }
  },

  'bodega-awning': (ctx, rand) => {
    const w = 210, y0 = -20, y1 = 400;
    for (let i = 0, x = -60; x < S + 60; x += w, i++) {
      D.shape(ctx, D.poly(rand, [[x, y0], [x + w, y0], [x + w, y1], [x, y1]]), {
        fill: i % 2 ? '#F5EFE3' : '#D6402F', w: 0,
      });
    }
    // scalloped bottom edge
    for (let x = -60; x < S + 60; x += w) {
      D.blob(ctx, rand, x + w / 2, y1, w / 2, 90, { fill: null, n: 14 });
    }
    D.stroke(ctx, rand, [-40, y1], [S + 40, y1], 0, { w: D.style().width });
  },

  'chain-link': (ctx, rand) => {
    ctx.save();
    ctx.globalAlpha = 0.85;
    const step = 150;
    for (let y = -step; y < 1150; y += step) {
      for (let x = -step; x < S + step; x += step) {
        D.stroke(ctx, rand, [x, y], [x + step, y + step], 0, { stroke: C.silver, w: 11 });
        D.stroke(ctx, rand, [x + step, y], [x, y + step], 0, { stroke: C.silver, w: 11 });
      }
    }
    ctx.restore();
  },

  'fire-hydrant': (ctx, rand) => {
    const x = 1790, y = 1620;
    D.shape(ctx, D.poly(rand, [[x - 150, y + 430], [x + 190, y + 430], [x + 190, y - 220], [x - 150, y - 220]]), { fill: C.red });
    D.blob(ctx, rand, x + 20, y - 250, 190, 130, { fill: C.red });
    D.blob(ctx, rand, x + 20, y - 360, 90, 90, { fill: C.red });
    D.blob(ctx, rand, x - 150, y - 60, 80, 80, { fill: D.shade(C.red, 0.2) });
    D.stroke(ctx, rand, [x - 150, y + 60], [x + 190, y + 60], 0, { w: 14 });
  },

  doghouse: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[-60, 1180], [430, 900], [430, 1900], [-60, 1900]]), { fill: '#A9713F' });
    D.shape(ctx, D.poly(rand, [[-90, 1210], [450, 860], [560, 980], [-90, 1360]]), { fill: C.red });
    D.blob(ctx, rand, 250, 1520, 130, 190, { fill: '#3A2416' });
  },

  'city-skyline': (ctx, rand) => {
    let x = -40;
    const seedRow = [];
    while (x < S + 120) {
      const w = 210 + rand() * 190, h = 240 + rand() * 230;
      seedRow.push([x, w, h]);
      x += w + 16;
    }
    for (const [bx, bw, bh] of seedRow) {
      D.shape(ctx, D.poly(rand, [[bx, 1620], [bx, 1620 - bh], [bx + bw, 1620 - bh], [bx + bw, 1620]]), { fill: C.dark, w: 12 });
      ctx.fillStyle = C.gold;
      for (let wy = 1620 - bh + 52; wy < 1560; wy += 74) {
        for (let wx = bx + 30; wx < bx + bw - 34; wx += 62) {
          if (rand() < 0.45) ctx.fillRect(wx, wy, 26, 34);
        }
      }
    }
  },

  rainbow: (ctx, rand) => {
    const bands = ['#E04A34', '#FF8A3D', '#FFC93D', '#4FBF6A', '#3E6BD6', '#8B5CF6'];
    bands.forEach((col, i) => {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 92;
      ctx.beginPath();
      ctx.arc(CX, 1180, 1180 - i * 92, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
      ctx.restore();
    });
    ctx.save();
    ctx.strokeStyle = D.style().ink;
    ctx.lineWidth = 14;
    [0, bands.length].forEach(i => {
      ctx.beginPath();
      ctx.arc(CX, 1180, 1180 - i * 92 + (i ? 46 : -46), Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
    });
    ctx.restore();
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   02 — FUR  (the base body: ears, torso, head, muzzle patch — blank face)
   ═══════════════════════════════════════════════════════════════════════════ */
function torsoRing(rand) {
  return D.poly(rand, [
    [270, 2140], [300, 1720], [430, 1500], [700, BODY_TOP],
    [CX, 1395], [1348, BODY_TOP], [1618, 1500], [1748, 1720], [1778, 2140],
  ], 6);
}

function drawDog(ctx, rand, o) {
  const { fur, ears = 'floppy', muzzle = null, chest = null, split = null, curly = false, alpha = 1 } = o;
  const cel = { cover: 0.34 };

  // ears behind the head
  if (ears === 'floppy') {
    D.blob(ctx, rand, 620, 1050, 148, 330, { fill: D.shade(fur, 0.07), rot: -0.22, alpha, cel });
    D.blob(ctx, rand, 1428, 1050, 148, 330, { fill: D.shade(fur, 0.07), rot: 0.22, alpha, cel });
  } else if (ears === 'pricked') {
    D.shape(ctx, D.poly(rand, [[700, 760], [580, 330], [930, 620]]), { fill: fur, alpha, cel });
    D.shape(ctx, D.poly(rand, [[1348, 760], [1468, 330], [1118, 620]]), { fill: fur, alpha, cel });
  } else if (ears === 'big') {
    D.blob(ctx, rand, 640, 640, 190, 265, { fill: fur, rot: -0.3, alpha, cel });
    D.blob(ctx, rand, 1408, 640, 190, 265, { fill: fur, rot: 0.3, alpha, cel });
  } else if (ears === 'cropped') {
    D.shape(ctx, D.poly(rand, [[730, 720], [700, 490], [900, 640]]), { fill: fur, alpha, cel });
    D.shape(ctx, D.poly(rand, [[1318, 720], [1348, 490], [1148, 640]]), { fill: fur, alpha, cel });
  }

  // torso
  D.shape(ctx, torsoRing(rand), { fill: fur, alpha, cel: { cover: 0.42 } });

  // head
  const head = D.ring(rand, HEAD.x, HEAD.y, HEAD.rx, HEAD.ry, { n: 26, squash: 0.05 });
  D.shape(ctx, head, { fill: fur, alpha, cel });

  if (curly) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      D.blob(ctx, rand, HEAD.x + Math.cos(a) * 380, 700 + Math.sin(a) * 190, 120, 110, { fill: fur, alpha, cel });
    }
    D.shape(ctx, head, { fill: null, alpha });
  }

  // husky-style face split
  if (split) {
    D.clipTo(ctx, head, () => {
      D.blob(ctx, rand, CX, 1080, 300, 420, { fill: split, w: 0, alpha, cel: false });
    });
    D.shape(ctx, head, { fill: null, alpha });
  }

  // chest patch
  if (chest) D.blob(ctx, rand, CX, 1720, 260, 300, { fill: chest, alpha, cel: { cover: 0.3 } });

  // muzzle patch (nose + mouth live in the 05-mouth layer)
  if (muzzle) D.blob(ctx, rand, MUZZLE.x, MUZZLE.y, MUZZLE.rx, MUZZLE.ry, { fill: muzzle, alpha, cel: { cover: 0.28 } });
}

const FUR = {
  'cream-floppy':  (c, r) => drawDog(c, r, { fur: C.cream,  muzzle: D.tint(C.cream, 0.5) }),
  'tan-floppy':    (c, r) => drawDog(c, r, { fur: C.tan,    muzzle: C.cream }),
  'cocoa-floppy':  (c, r) => drawDog(c, r, { fur: C.cocoa,  muzzle: '#C9945F' }),
  'ash-floppy':    (c, r) => drawDog(c, r, { fur: C.ash,    muzzle: '#DEDBD4' }),
  'golden-floppy': (c, r) => drawDog(c, r, { fur: C.golden, muzzle: C.cream }),
  'black-lab':     (c, r) => drawDog(c, r, { fur: C.black,  muzzle: '#4A4A5A' }),
  'shiba-pricked': (c, r) => drawDog(c, r, { fur: C.shiba,  ears: 'pricked', muzzle: C.cream, chest: C.cream }),
  'husky-pricked': (c, r) => drawDog(c, r, { fur: C.husky,  ears: 'pricked', muzzle: C.white, split: C.white }),
  'corgi-pricked': (c, r) => drawDog(c, r, { fur: C.corgi,  ears: 'big',     muzzle: C.white, chest: C.white }),
  'pitty-cropped': (c, r) => drawDog(c, r, { fur: C.pitty,  ears: 'cropped', muzzle: '#D3D8DE' }),
  'poodle-curly':  (c, r) => drawDog(c, r, { fur: C.poodle, muzzle: C.cream, curly: true }),
  'ghost-white':   (c, r) => drawDog(c, r, { fur: C.white,  muzzle: '#EFEFFA', alpha: 0.78 }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   03 — MARKING
   ═══════════════════════════════════════════════════════════════════════════ */
const headRing = rand => D.ring(rand, HEAD.x, HEAD.y, HEAD.rx, HEAD.ry, { n: 26, squash: 0.05 });

const MARKING = {
  eyepatch: (ctx, rand) => D.clipTo(ctx, headRing(rand), () =>
    D.blob(ctx, rand, EYE_L - 20, EYE_Y - 10, 215, 195, { fill: '#5A3A24', w: 12, n: 15 })),

  'tuxedo-chest': (ctx, rand) =>
    D.blob(ctx, rand, CX, 1760, 235, 300, { fill: C.white, cel: { cover: 0.3 } }),

  spots: (ctx, rand) => D.clipTo(ctx, headRing(rand), () => {
    for (const [x, y, r] of [[760, 700, 78], [1290, 690, 62], [700, 1120, 54],
                             [1330, 1150, 68], [1050, 640, 46], [860, 1250, 42], [1200, 1290, 50]]) {
      D.blob(ctx, rand, x, y, r, r * 0.88, { fill: '#2B2B33', w: 0, n: 12 });
    }
  }),

  blaze: (ctx, rand) => D.clipTo(ctx, headRing(rand), () =>
    D.shape(ctx, D.poly(rand, [[978, 560], [1070, 560], [1110, 1010], [938, 1010]]), { fill: C.cream, w: 12 })),

  brindle: (ctx, rand) => D.clipTo(ctx, headRing(rand), () => {
    for (let i = 0; i < 7; i++) {
      const x = 660 + i * 122;
      D.stroke(ctx, rand, [x, 640 + (i % 2) * 60], [x + 26, 1010 + (i % 2) * 60], 22,
        { stroke: '#5A3A24', w: 34 });
    }
  }),

  'sock-paws': (ctx, rand) => {
    D.blob(ctx, rand, 470, 1930, 165, 150, { fill: C.white, cel: { cover: 0.3 } });
    D.blob(ctx, rand, 1578, 1930, 165, 150, { fill: C.white, cel: { cover: 0.3 } });
  },

  freckles: (ctx, rand) => {
    for (let i = 0; i < 3; i++) {
      const y = 1130 + i * 52;
      D.blob(ctx, rand, 872 - i * 12, y, 17, 17, { fill: '#4A3226', w: 0 });
      D.blob(ctx, rand, 1176 + i * 12, y, 17, 17, { fill: '#4A3226', w: 0 });
    }
  },

  'mask-face': (ctx, rand) => D.clipTo(ctx, headRing(rand), () =>
    D.blob(ctx, rand, CX, 880, 380, 175, { fill: '#3A2A22', w: 12, n: 16 })),

  'star-patch': (ctx, rand) =>
    D.star(ctx, rand, CX, 690, 140, 60, 5, { fill: C.gold }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   04 — OUTFIT
   ═══════════════════════════════════════════════════════════════════════════ */
/** Torso garment with a collar opening punched out so the neck reads through. */
function garment(ctx, rand, color, o = {}) {
  const ring = torsoRing(rand);
  D.shape(ctx, ring, { fill: color, cel: { cover: 0.42 } });

  if (o.collar !== false) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    D.closedPath(ctx, D.ring(rand, CX, 1400, 265, 150, { n: 18 }));
    ctx.fill();
    ctx.restore();
    D.shape(ctx, D.ring(rand, CX, 1400, 265, 150, { n: 18 }), { fill: null, w: D.style().width });
  }
  return ring;
}

const OUTFIT = {
  'tee-plain':  (c, r) => garment(c, r, C.sky),
  'tee-logo':   (c, r) => { garment(c, r, C.dark); paw(c, r, CX, 1780, 120, C.white); },
  hoodie: (ctx, rand) => {
    D.blob(ctx, rand, CX, 1490, 430, 210, { fill: D.shade(C.grey, 0.12) });   // hood behind neck
    garment(ctx, rand, C.grey);
    D.stroke(ctx, rand, [930, 1500], [910, 1810], 18, { w: 22 });
    D.stroke(ctx, rand, [1118, 1500], [1138, 1810], -18, { w: 22 });
  },
  'puffer-jacket': (ctx, rand) => {
    garment(ctx, rand, C.orange);
    D.clipTo(ctx, torsoRing(rand), () => {
      for (let y = 1560; y < 2100; y += 130) {
        D.stroke(ctx, rand, [250, y], [1800, y], 14, { w: 16 });
      }
    });
    D.stroke(ctx, rand, [CX, 1520], [CX, 2100], 0, { w: 18 });
  },
  overalls: (ctx, rand) => {
    garment(ctx, rand, '#4A72B8');
    for (const x of [820, 1228]) {
      D.shape(ctx, D.poly(rand, [[x - 60, 1420], [x + 60, 1420], [x + 60, 1660], [x - 60, 1660]]), { fill: '#4A72B8' });
      D.roundRect(ctx, x - 46, 1600, 92, 78, 16, { fill: C.gold, w: 12 });
    }
  },
  hawaiian: (ctx, rand) => {
    garment(ctx, rand, C.purple);
    D.clipTo(ctx, torsoRing(rand), () => {
      for (let i = 0; i < 14; i++) {
        const x = 320 + rand() * 1400, y = 1500 + rand() * 520;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          D.blob(ctx, rand, x + Math.cos(a) * 40, y + Math.sin(a) * 40, 26, 26, { fill: C.white, w: 0, cel: false });
        }
      }
    });
  },
  varsity: (ctx, rand) => {
    garment(ctx, rand, C.cream);
    D.clipTo(ctx, torsoRing(rand), () => {
      D.shape(ctx, D.poly(rand, [[240, 1980], [1810, 1980], [1810, 2060], [240, 2060]]), { fill: '#25355E', w: 0 });
    });
    label(ctx, 'B', CX, 1790, 300, '#25355E');
  },
  tracksuit: (ctx, rand) => {
    garment(ctx, rand, '#25355E');
    D.clipTo(ctx, torsoRing(rand), () => {
      for (let i = 0; i < 3; i++) {
        D.stroke(ctx, rand, [430 + i * 62, 1470], [330 + i * 62, 2100], 0, { stroke: C.white, w: 26 });
        D.stroke(ctx, rand, [1618 - i * 62, 1470], [1718 - i * 62, 2100], 0, { stroke: C.white, w: 26 });
      }
    });
    D.stroke(ctx, rand, [CX, 1520], [CX, 2100], 0, { w: 16 });
  },
  'hi-vis': (ctx, rand) => {
    garment(ctx, rand, '#FF7A1A');
    D.clipTo(ctx, torsoRing(rand), () => {
      for (const y of [1700, 1850]) {
        D.shape(ctx, D.poly(rand, [[240, y], [1810, y], [1810, y + 74], [240, y + 74]]), { fill: C.silver, w: 10 });
      }
    });
  },
  'chef-apron': (ctx, rand) => {
    garment(ctx, rand, '#4E5566');
    D.shape(ctx, D.poly(rand, [[CX - 330, 1560], [CX + 330, 1560], [CX + 380, 2100], [CX - 380, 2100]]),
      { fill: '#F7F5EF' });
    D.stroke(ctx, rand, [CX - 250, 1560], [CX - 150, 1400], 0, { w: 22 });
    D.stroke(ctx, rand, [CX + 250, 1560], [CX + 150, 1400], 0, { w: 22 });
    D.roundRect(ctx, CX - 140, 1760, 280, 190, 18, { fill: null, w: 16 });
    D.blob(ctx, rand, CX + 210, 1690, 34, 34, { fill: '#C9562F', w: 10 });
  },
  'hockey-jersey': (ctx, rand) => {
    garment(ctx, rand, '#D9382E');
    D.clipTo(ctx, torsoRing(rand), () => {
      for (const y of [1620, 1760]) {
        D.shape(ctx, D.poly(rand, [[240, y], [1810, y], [1810, y + 60], [240, y + 60]]), { fill: C.white, w: 0 });
      }
    });
    label(ctx, '11', CX, 1930, 220, C.white);
  },
  'lifeguard-tank': (ctx, rand) => {
    garment(ctx, rand, '#E23B33');
    D.shape(ctx, D.poly(rand, [[CX - 40, 1660], [CX + 40, 1660], [CX + 40, 1760], [CX + 140, 1760],
                               [CX + 140, 1840], [CX + 40, 1840], [CX + 40, 1940], [CX - 40, 1940],
                               [CX - 40, 1840], [CX - 140, 1840], [CX - 140, 1760], [CX - 40, 1760]]),
      { fill: C.white, w: 12 });
  },
  poncho: (ctx, rand) => {
    garment(ctx, rand, '#B5533A', { collar: true });
    D.clipTo(ctx, torsoRing(rand), () => {
      for (let y = 1560; y < 2100; y += 110) {
        D.shape(ctx, D.poly(rand, [[240, y], [1810, y], [1810, y + 46], [240, y + 46]]), { fill: C.cream, w: 0 });
      }
    });
  },
  'bandana-collar': (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[770, 1400], [1278, 1400], [CX, 1760]]), { fill: '#D9382E' });
    ctx.save();
    D.clipTo(ctx, D.poly(rand, [[770, 1400], [1278, 1400], [CX, 1760]]), () => {
      for (let i = 0; i < 9; i++) {
        D.blob(ctx, rand, 800 + rand() * 450, 1430 + rand() * 230, 22, 30, { fill: C.white, w: 0, cel: false });
      }
    });
    ctx.restore();
    D.blob(ctx, rand, 1300, 1420, 62, 52, { fill: '#D9382E' });
  },
  'spiked-collar': (ctx, rand) => {
    const band = D.poly(rand, [[720, 1370], [1328, 1370], [1328, 1470], [720, 1470]]);
    D.shape(ctx, band, { fill: '#2B2B33' });
    for (let i = 0; i < 7; i++) {
      const x = 780 + i * 92;
      D.shape(ctx, D.poly(rand, [[x - 34, 1370], [x + 34, 1370], [x, 1290]]), { fill: C.silver, w: 12 });
    }
    D.blob(ctx, rand, CX, 1520, 58, 58, { fill: C.gold });
  },
  'gold-chain': (ctx, rand) => {
    const pts = D.arc(rand, [800, 1430], [1248, 1430], 230, { n: 16, amp: 4 });
    for (const [x, y] of pts) D.blob(ctx, rand, x, y, 46, 40, { fill: C.gold, w: 12, cel: { cover: 0.35 } });
  },
  'pearl-necklace': (ctx, rand) => {
    const pts = D.arc(rand, [830, 1420], [1218, 1420], 180, { n: 13, amp: 3 });
    for (const [x, y] of pts) D.blob(ctx, rand, x, y, 40, 40, { fill: '#F7F3EA', w: 11 });
  },
  tuxedo: (ctx, rand) => {
    garment(ctx, rand, '#1C1C26');
    D.shape(ctx, D.poly(rand, [[880, 1440], [1168, 1440], [1118, 2100], [930, 2100]]), { fill: C.white });
    D.shape(ctx, D.poly(rand, [[930, 1420], [1118, 1420], [1060, 1560], [988, 1560]]), { fill: '#1C1C26', w: 12 });
    D.blob(ctx, rand, 940, 1430, 74, 50, { fill: '#B5232B', w: 12, rot: -0.3 });
    D.blob(ctx, rand, 1108, 1430, 74, 50, { fill: '#B5232B', w: 12, rot: 0.3 });
    D.blob(ctx, rand, 1240, 1700, 70, 48, { fill: '#B5232B', w: 12 });
  },
};

function paw(ctx, rand, x, y, s, fill) {
  D.blob(ctx, rand, x, y + s * 0.35, s * 0.9, s * 0.72, { fill, w: 0, cel: false });
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI * 0.86 + (i / 3) * Math.PI * 0.72;
    D.blob(ctx, rand, x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.95, s * 0.28, s * 0.34, { fill, w: 0, cel: false });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   05 — MOUTH  (nose + mouth together, so they always match)
   ═══════════════════════════════════════════════════════════════════════════ */
function nose(ctx, rand) {
  D.blob(ctx, rand, NOSE.x, NOSE.y, NOSE.rx, NOSE.ry, { fill: D.style().ink, w: 0, squash: -0.12 });
  D.blob(ctx, rand, NOSE.x - 26, NOSE.y - 22, 20, 13, { fill: 'rgba(255,255,255,0.55)', w: 0, cel: false, rot: -0.4 });
}

const MOUTH = {
  smile: (ctx, rand) => {
    nose(ctx, rand);
    D.stroke(ctx, rand, [CX, 1140], [CX, 1180], 0, { w: 16 });
    D.stroke(ctx, rand, [900, 1180], [CX, 1195], -46, { w: 17 });
    D.stroke(ctx, rand, [CX, 1195], [1148, 1180], -46, { w: 17 });
  },
  'tongue-out': (ctx, rand) => {
    D.blob(ctx, rand, 1068, 1290, 92, 128, { fill: '#F27C9B', rot: 0.16, cel: { cover: 0.3 } });
    D.stroke(ctx, rand, [1068, 1220], [1068, 1350], 0, { w: 12 });
    nose(ctx, rand);
    D.stroke(ctx, rand, [900, 1180], [1148, 1180], -52, { w: 17 });
  },
  'big-grin': (ctx, rand) => {
    const m = D.ring(rand, CX, 1220, 190, 110, { n: 18 });
    D.shape(ctx, m, { fill: '#3A1F28' });
    D.clipTo(ctx, m, () => {
      D.shape(ctx, D.poly(rand, [[820, 1110], [1230, 1110], [1230, 1200], [820, 1200]]), { fill: C.white, w: 0 });
      for (let x = 880; x < 1200; x += 74) D.stroke(ctx, rand, [x, 1110], [x, 1200], 0, { w: 9 });
    });
    nose(ctx, rand);
  },
  smirk: (ctx, rand) => {
    nose(ctx, rand);
    D.stroke(ctx, rand, [CX, 1140], [CX, 1180], 0, { w: 16 });
    D.stroke(ctx, rand, [930, 1200], [1180, 1160], -40, { w: 17 });
  },
  bark: (ctx, rand) => {
    const m = D.ring(rand, CX, 1250, 165, 155, { n: 18 });
    D.shape(ctx, m, { fill: '#3A1F28' });
    D.clipTo(ctx, m, () => {
      D.blob(ctx, rand, CX, 1370, 130, 90, { fill: '#F27C9B', w: 0, cel: false });
      D.shape(ctx, D.poly(rand, [[930, 1105], [990, 1105], [960, 1180]]), { fill: C.white, w: 0 });
      D.shape(ctx, D.poly(rand, [[1058, 1105], [1118, 1105], [1088, 1180]]), { fill: C.white, w: 0 });
    });
    nose(ctx, rand);
  },
  drool: (ctx, rand) => {
    nose(ctx, rand);
    D.stroke(ctx, rand, [910, 1180], [1140, 1180], -44, { w: 17 });
    D.blob(ctx, rand, 1130, 1290, 34, 76, { fill: '#9FD8F0', w: 12, cel: { cover: 0.3 } });
  },
  'chewing-bone': (ctx, rand) => {
    nose(ctx, rand);
    D.stroke(ctx, rand, [910, 1185], [1140, 1185], -30, { w: 17 });
    boneShape(ctx, rand, CX, 1250, 260, 74, C.cream, 0.08);
  },
  bubblegum: (ctx, rand) => {
    nose(ctx, rand);
    D.stroke(ctx, rand, [930, 1180], [1120, 1180], -30, { w: 17 });
    D.blob(ctx, rand, 1290, 1300, 195, 185, { fill: '#FF9EC4', cel: { cover: 0.32 } });
    D.blob(ctx, rand, 1225, 1235, 42, 30, { fill: 'rgba(255,255,255,0.6)', w: 0, cel: false, rot: -0.5 });
  },
  cigar: (ctx, rand) => {
    nose(ctx, rand);
    D.stroke(ctx, rand, [920, 1180], [1130, 1180], -30, { w: 17 });
    D.shape(ctx, D.poly(rand, [[1090, 1210], [1420, 1150], [1432, 1216], [1102, 1276]]), { fill: '#7A4A28' });
    D.blob(ctx, rand, 1428, 1183, 34, 34, { fill: '#FF6A3D', w: 10 });
    for (let i = 0; i < 3; i++) {
      D.stroke(ctx, rand, [1470 + i * 30, 1120 - i * 70], [1520 + i * 30, 1030 - i * 70], 34,
        { stroke: 'rgba(200,200,215,0.85)', w: 13 });
    }
  },
};

function boneShape(ctx, rand, x, y, w, h, fill, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  D.shape(ctx, D.poly(rand, [[-w / 2, -h / 3], [w / 2, -h / 3], [w / 2, h / 3], [-w / 2, h / 3]]), { fill });
  for (const sx of [-1, 1]) {
    D.blob(ctx, rand, sx * w / 2, -h * 0.42, h * 0.45, h * 0.45, { fill });
    D.blob(ctx, rand, sx * w / 2, h * 0.42, h * 0.45, h * 0.45, { fill });
  }
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
   06 — EYES  (both eyes in one layer, always)
   ═══════════════════════════════════════════════════════════════════════════ */
const eyePair = (ctx, rand, fn) => { fn(EYE_L, -1); fn(EYE_R, 1); };

const EYES = {
  dots: (ctx, rand) => eyePair(ctx, rand, (x) => {
    D.blob(ctx, rand, x, EYE_Y, 74, 82, { fill: C.white, w: 14 });
    D.blob(ctx, rand, x, EYE_Y + 6, 44, 50, { fill: D.style().ink, w: 0, cel: false });
    D.blob(ctx, rand, x + 16, EYE_Y - 18, 17, 17, { fill: C.white, w: 0, cel: false });
  }),
  sleepy: (ctx, rand) => eyePair(ctx, rand, (x) => {
    D.blob(ctx, rand, x, EYE_Y, 74, 82, { fill: C.white, w: 14 });
    D.blob(ctx, rand, x, EYE_Y + 22, 40, 36, { fill: D.style().ink, w: 0, cel: false });
    D.shape(ctx, D.poly(rand, [[x - 86, EYE_Y - 92], [x + 86, EYE_Y - 92], [x + 82, EYE_Y + 6], [x - 82, EYE_Y + 6]]),
      { fill: 'rgba(20,20,28,0.92)', w: 0, cel: false });
    D.stroke(ctx, rand, [x - 82, EYE_Y + 4], [x + 82, EYE_Y + 4], 0, { w: 15 });
  }),
  'side-eye': (ctx, rand) => eyePair(ctx, rand, (x) => {
    D.blob(ctx, rand, x, EYE_Y, 80, 78, { fill: C.white, w: 14 });
    D.blob(ctx, rand, x - 32, EYE_Y + 4, 38, 46, { fill: D.style().ink, w: 0, cel: false });
    D.blob(ctx, rand, x - 20, EYE_Y - 16, 13, 13, { fill: C.white, w: 0, cel: false });
  }),
  'wide-shock': (ctx, rand) => eyePair(ctx, rand, (x) => {
    D.blob(ctx, rand, x, EYE_Y, 100, 100, { fill: C.white, w: 15 });
    D.blob(ctx, rand, x, EYE_Y, 34, 34, { fill: D.style().ink, w: 0, cel: false });
    D.blob(ctx, rand, x + 13, EYE_Y - 13, 11, 11, { fill: C.white, w: 0, cel: false });
  }),
  'closed-happy': (ctx, rand) => eyePair(ctx, rand, (x) =>
    D.stroke(ctx, rand, [x - 82, EYE_Y + 22], [x + 82, EYE_Y + 22], 62, { w: 22 })),
  angry: (ctx, rand) => eyePair(ctx, rand, (x, side) => {
    D.blob(ctx, rand, x, EYE_Y + 10, 74, 70, { fill: C.white, w: 14 });
    D.blob(ctx, rand, x + side * 14, EYE_Y + 14, 40, 44, { fill: D.style().ink, w: 0, cel: false });
    D.shape(ctx, D.poly(rand, [[x - side * 90, EYE_Y - 92], [x + side * 78, EYE_Y - 46],
                               [x + side * 78, EYE_Y - 8], [x - side * 90, EYE_Y - 44]]),
      { fill: D.style().ink, w: 0, cel: false });
  }),
  wink: (ctx, rand) => {
    D.blob(ctx, rand, EYE_L, EYE_Y, 74, 82, { fill: C.white, w: 14 });
    D.blob(ctx, rand, EYE_L, EYE_Y + 6, 44, 50, { fill: D.style().ink, w: 0, cel: false });
    D.blob(ctx, rand, EYE_L + 16, EYE_Y - 18, 17, 17, { fill: C.white, w: 0, cel: false });
    D.stroke(ctx, rand, [EYE_R - 82, EYE_Y + 22], [EYE_R + 82, EYE_Y + 22], 62, { w: 22 });
  },
  teary: (ctx, rand) => eyePair(ctx, rand, (x) => {
    D.blob(ctx, rand, x, EYE_Y, 92, 96, { fill: C.white, w: 14 });
    D.blob(ctx, rand, x, EYE_Y + 8, 58, 62, { fill: D.style().ink, w: 0, cel: false });
    D.blob(ctx, rand, x + 22, EYE_Y - 24, 20, 20, { fill: C.white, w: 0, cel: false });
    D.blob(ctx, rand, x - 22, EYE_Y + 14, 11, 11, { fill: C.white, w: 0, cel: false });
    D.blob(ctx, rand, x - 60, EYE_Y + 118, 26, 38, { fill: '#9FD8F0', w: 11 });
  }),
  dizzy: (ctx, rand) => eyePair(ctx, rand, (x) => {
    ctx.save();
    ctx.strokeStyle = D.style().ink;
    ctx.lineWidth = 17;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 5; t += 0.14) {
      const r = 8 + t * 9;
      const px = x + Math.cos(t) * r, py = EYE_Y + Math.sin(t) * r;
      t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }),
  'heart-eyes': (ctx, rand) => eyePair(ctx, rand, (x) => {
    D.heart(ctx, rand, x, EYE_Y, 190, { fill: '#F0384F' });
    D.blob(ctx, rand, x - 22, EYE_Y - 22, 15, 12, { fill: 'rgba(255,255,255,0.75)', w: 0, cel: false, rot: -0.5 });
  }),
  glowing: (ctx, rand) => eyePair(ctx, rand, (x) => {
    const g = ctx.createRadialGradient(x, EYE_Y, 8, x, EYE_Y, 210);
    g.addColorStop(0, 'rgba(180,245,255,0.85)');
    g.addColorStop(1, 'rgba(180,245,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 220, EYE_Y - 220, 440, 440);
    D.blob(ctx, rand, x, EYE_Y, 76, 88, { fill: '#EAFEFF', w: 0, cel: false });
  }),
  laser: (ctx, rand) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, col] of [[110, 'rgba(255,40,40,0.30)'], [54, 'rgba(255,90,60,0.75)'], [18, 'rgba(255,255,255,0.95)']]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(EYE_L, EYE_Y); ctx.lineTo(-40, EYE_Y - 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(EYE_R, EYE_Y); ctx.lineTo(S + 40, EYE_Y - 70); ctx.stroke();
    }
    ctx.restore();
    eyePair(ctx, rand, (x) => {
      const g = ctx.createRadialGradient(x, EYE_Y, 6, x, EYE_Y, 150);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.4, 'rgba(255,70,50,0.8)');
      g.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 160, EYE_Y - 160, 320, 320);
      D.blob(ctx, rand, x, EYE_Y, 46, 52, { fill: '#FFF4F0', w: 0, cel: false });
    });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   07 — HEADWEAR
   ═══════════════════════════════════════════════════════════════════════════ */
/** Dome that follows the top of the skull. */
function crownDome(rand, lift = 0, spread = 1) {
  return D.poly(rand, [
    [CX - 400 * spread, 780 - lift], [CX - 370 * spread, 620 - lift],
    [CX - 210 * spread, 500 - lift], [CX, 462 - lift],
    [CX + 210 * spread, 500 - lift], [CX + 370 * spread, 620 - lift],
    [CX + 400 * spread, 780 - lift],
  ], 5);
}

const HEADWEAR = {
  'backwards-cap': (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[CX + 330, 700], [CX + 620, 690], [CX + 640, 790], [CX + 330, 800]]), { fill: '#D93B2E' });
    D.shape(ctx, crownDome(rand), { fill: '#D93B2E' });
    D.stroke(ctx, rand, [CX - 400, 770], [CX + 400, 770], 30, { w: 16 });
    D.blob(ctx, rand, CX, 470, 34, 34, { fill: '#D93B2E', w: 12 });
  },
  snapback: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[CX - 470, 730], [CX + 470, 730], [CX + 500, 830], [CX - 500, 830]]), { fill: '#25355E' });
    D.shape(ctx, crownDome(rand), { fill: '#25355E' });
    D.blob(ctx, rand, CX, 620, 62, 62, { fill: C.gold, w: 12 });
  },
  beanie: (ctx, rand) => {
    D.shape(ctx, crownDome(rand, 40), { fill: '#E2A72E' });
    D.shape(ctx, D.poly(rand, [[CX - 410, 720], [CX + 410, 720], [CX + 415, 830], [CX - 415, 830]]), { fill: D.tint('#E2A72E', 0.2) });
    D.blob(ctx, rand, CX, 400, 76, 76, { fill: '#E2A72E' });
    D.clipTo(ctx, crownDome(rand, 40), () => {
      for (let x = CX - 340; x <= CX + 340; x += 110) D.stroke(ctx, rand, [x, 460], [x, 730], 0, { w: 12 });
    });
  },
  'do-rag': (ctx, rand) => {
    D.shape(ctx, crownDome(rand, 10), { fill: '#1E1E28' });
    D.shape(ctx, D.poly(rand, [[CX + 340, 740], [CX + 620, 830], [CX + 600, 930], [CX + 330, 820]]), { fill: '#1E1E28' });
    D.stroke(ctx, rand, [CX - 400, 770], [CX + 400, 770], 26, { w: 16 });
  },
  'bucket-hat': (ctx, rand) => {
    D.shape(ctx, crownDome(rand, 0, 0.88), { fill: '#9DBE7A' });
    D.shape(ctx, D.poly(rand, [[CX - 560, 740], [CX + 560, 740], [CX + 470, 880], [CX - 470, 880]]), { fill: D.shade('#9DBE7A', 0.1) });
  },
  headphones: (ctx, rand) => {
    D.stroke(ctx, rand, [CX - 430, 900], [CX + 430, 900], 430, { w: 60, stroke: '#26262F' });
    D.stroke(ctx, rand, [CX - 430, 900], [CX + 430, 900], 430, { w: 26, stroke: '#4A4A5A' });
    for (const x of [CX - 445, CX + 445]) {
      D.blob(ctx, rand, x, 900, 105, 130, { fill: '#26262F' });
      D.blob(ctx, rand, x, 900, 58, 76, { fill: '#6E6E82', w: 10 });
    }
  },
  visor: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[CX - 430, 720], [CX + 430, 720], [CX + 440, 810], [CX - 440, 810]]), { fill: C.white });
    D.shape(ctx, D.poly(rand, [[CX - 500, 790], [CX + 500, 790], [CX + 430, 900], [CX - 430, 900]]), { fill: '#2E9E63' });
  },
  trapper: (ctx, rand) => {
    D.blob(ctx, rand, CX - 425, 1010, 140, 245, { fill: '#8A5A34', rot: -0.12 });
    D.blob(ctx, rand, CX + 425, 1010, 140, 245, { fill: '#8A5A34', rot: 0.12 });
    D.shape(ctx, crownDome(rand, 30), { fill: '#8A5A34' });
    // one continuous scalloped fur band, not a row of separate blobs
    const band = [];
    for (let x = CX - 430; x <= CX + 430; x += 86) band.push([x, 700 + Math.sin(x / 90) * 14]);
    band.push([CX + 430, 830]);
    for (let x = CX + 430; x >= CX - 430; x -= 86) band.push([x, 830 + Math.sin(x / 90) * 14]);
    band.push([CX - 430, 700]);
    D.shape(ctx, band, { fill: C.cream, cel: { cover: 0.3 } });
  },
  'hard-hat': (ctx, rand) => {
    D.shape(ctx, crownDome(rand, 20, 0.92), { fill: '#F2C21A' });
    D.shape(ctx, D.poly(rand, [[CX - 470, 760], [CX + 470, 760], [CX + 430, 850], [CX - 430, 850]]), { fill: '#F2C21A' });
    D.stroke(ctx, rand, [CX, 470], [CX, 760], 0, { w: 16 });
  },
  cowboy: (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[CX - 700, 780], [CX - 480, 700], [CX + 480, 700], [CX + 700, 780],
                               [CX + 470, 880], [CX - 470, 880]]), { fill: '#C69B63' });
    D.shape(ctx, D.poly(rand, [[CX - 300, 740], [CX - 240, 480], [CX, 430], [CX + 240, 480], [CX + 300, 740]]), { fill: '#C69B63' });
    D.shape(ctx, D.poly(rand, [[CX - 300, 700], [CX + 300, 700], [CX + 305, 770], [CX - 305, 770]]), { fill: '#6B4A2A' });
  },
  'chef-hat': (ctx, rand) => {
    D.blob(ctx, rand, CX - 190, 400, 175, 155, { fill: C.white });
    D.blob(ctx, rand, CX + 190, 400, 175, 155, { fill: C.white });
    D.blob(ctx, rand, CX, 320, 210, 190, { fill: C.white });
    D.shape(ctx, D.poly(rand, [[CX - 300, 480], [CX + 300, 480], [CX + 300, 700], [CX - 300, 700]]), { fill: C.white });
    D.stroke(ctx, rand, [CX - 300, 620], [CX + 300, 620], 0, { w: 14 });
  },
  'party-hat': (ctx, rand) => {
    ctx.save();
    ctx.translate(CX, 640);
    ctx.rotate(-0.16);
    const cone = D.poly(rand, [[-210, 0], [210, 0], [0, -420]]);
    D.shape(ctx, cone, { fill: '#FF7FB0' });
    D.clipTo(ctx, cone, () => {
      for (let i = -4; i < 5; i++) {
        D.shape(ctx, D.poly(rand, [[i * 110, 20], [i * 110 + 55, 20], [55, -440], [0, -440]]), { fill: C.white, w: 0 });
      }
    });
    D.shape(ctx, cone, { fill: null });
    D.blob(ctx, rand, 0, -430, 58, 58, { fill: C.gold });
    ctx.restore();
  },
  mohawk: (ctx, rand) => {
    for (let i = 0; i < 6; i++) {
      const x = CX - 250 + i * 100;
      const h = 300 - Math.abs(i - 2.5) * 46;
      D.shape(ctx, D.poly(rand, [[x - 58, 640], [x + 58, 640], [x, 640 - h]]), { fill: '#FF2E88' });
    }
  },
  'cone-of-shame': (ctx, rand) => {
    const cone = D.poly(rand, [[CX - 300, 1420], [CX + 300, 1420], [CX + 760, 560], [CX - 760, 560]]);
    D.shape(ctx, cone, { fill: 'rgba(238,244,252,0.52)', w: 18, cel: false });
    for (let i = -3; i <= 3; i++) {
      D.stroke(ctx, rand, [CX + i * 90, 1400], [CX + i * 235, 580], 0, { stroke: 'rgba(20,20,30,0.28)', w: 10 });
    }
    D.stroke(ctx, rand, [CX - 745, 600], [CX + 745, 600], -60, { w: 18 });
  },
  halo: (ctx, rand) => {
    const g = ctx.createRadialGradient(CX, 400, 40, CX, 400, 380);
    g.addColorStop(0, 'rgba(255,225,120,0.55)');
    g.addColorStop(1, 'rgba(255,225,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(CX - 400, 100, 800, 600);
    const outer = D.ring(rand, CX, 400, 250, 78, { n: 22 });
    D.shape(ctx, outer, { fill: '#FFD84A' });
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    D.closedPath(ctx, D.ring(rand, CX, 400, 175, 38, { n: 22 }));
    ctx.fill();
    ctx.restore();
    D.shape(ctx, outer, { fill: null });
    D.shape(ctx, D.ring(rand, CX, 400, 175, 38, { n: 22 }), { fill: null, w: 14 });
  },
  crown: (ctx, rand) => {
    const pts = D.poly(rand, [[CX - 300, 700], [CX - 270, 420], [CX - 150, 560], [CX, 380],
                              [CX + 150, 560], [CX + 270, 420], [CX + 300, 700]], 5);
    D.shape(ctx, pts, { fill: '#FFC93D' });
    D.stroke(ctx, rand, [CX - 296, 640], [CX + 296, 640], 0, { w: 14 });
    D.blob(ctx, rand, CX, 672, 40, 40, { fill: '#E0424E', w: 11 });
    D.blob(ctx, rand, CX - 160, 678, 32, 32, { fill: '#4FA8E8', w: 11 });
    D.blob(ctx, rand, CX + 160, 678, 32, 32, { fill: '#4FA8E8', w: 11 });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   08 — EYEWEAR
   ═══════════════════════════════════════════════════════════════════════════ */
function temples(ctx, rand, y = EYE_Y - 10) {
  D.stroke(ctx, rand, [740, y], [566, y + 34], 0, { w: 20 });
  D.stroke(ctx, rand, [1308, y], [1482, y + 34], 0, { w: 20 });
}
function glint(ctx, rand, x, y) {
  D.stroke(ctx, rand, [x - 34, y + 30], [x + 4, y - 26], 0, { stroke: 'rgba(255,255,255,0.62)', w: 15 });
}

const EYEWEAR = {
  shades: (ctx, rand) => {
    temples(ctx, rand);
    for (const x of [EYE_L, EYE_R]) {
      D.roundRect(ctx, x - 122, EYE_Y - 78, 244, 156, 44, { fill: '#191922' });
      glint(ctx, rand, x, EYE_Y);
    }
    D.stroke(ctx, rand, [EYE_L + 122, EYE_Y - 20], [EYE_R - 122, EYE_Y - 20], 0, { w: 22 });
  },
  'round-glasses': (ctx, rand) => {
    temples(ctx, rand);
    for (const x of [EYE_L, EYE_R]) {
      D.blob(ctx, rand, x, EYE_Y, 112, 112, { fill: 'rgba(200,230,255,0.28)', w: 18, cel: false });
      glint(ctx, rand, x, EYE_Y);
    }
    D.stroke(ctx, rand, [EYE_L + 108, EYE_Y - 14], [EYE_R - 108, EYE_Y - 14], 0, { w: 18 });
  },
  'nerd-glasses': (ctx, rand) => {
    temples(ctx, rand);
    for (const x of [EYE_L, EYE_R]) {
      D.roundRect(ctx, x - 118, EYE_Y - 96, 236, 192, 26, { fill: 'rgba(200,230,255,0.26)', w: 26 });
      glint(ctx, rand, x, EYE_Y);
    }
    D.stroke(ctx, rand, [EYE_L + 118, EYE_Y - 24], [EYE_R - 118, EYE_Y - 24], 0, { w: 24 });
  },
  'visor-shades': (ctx, rand) => {
    temples(ctx, rand, EYE_Y - 26);
    D.shape(ctx, D.poly(rand, [[700, EYE_Y - 80], [1348, EYE_Y - 80], [1320, EYE_Y + 72], [728, EYE_Y + 72]]),
      { fill: '#FF7A2E' });
    glint(ctx, rand, 900, EYE_Y);
  },
  'ski-goggles': (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[600, EYE_Y - 40], [560, EYE_Y + 60], [1488, EYE_Y + 60], [1448, EYE_Y - 40]]),
      { fill: '#2B2B36' });
    D.roundRect(ctx, 690, EYE_Y - 130, 668, 250, 110, { fill: '#2B2B36', w: 22 });
    D.roundRect(ctx, 740, EYE_Y - 92, 568, 176, 84, { fill: '#8B5CF6', w: 16 });
    glint(ctx, rand, 880, EYE_Y);
  },
  'three-d': (ctx, rand) => {
    temples(ctx, rand);
    D.roundRect(ctx, 690, EYE_Y - 92, 668, 184, 22, { fill: C.white, w: 20 });
    D.roundRect(ctx, EYE_L - 108, EYE_Y - 62, 216, 124, 14, { fill: 'rgba(226,53,53,0.72)', w: 14 });
    D.roundRect(ctx, EYE_R - 108, EYE_Y - 62, 216, 124, 14, { fill: 'rgba(53,196,226,0.72)', w: 14 });
  },
  'heart-shades': (ctx, rand) => {
    temples(ctx, rand);
    for (const x of [EYE_L, EYE_R]) D.heart(ctx, rand, x, EYE_Y, 250, { fill: 'rgba(255,120,170,0.82)', w: 18 });
    D.stroke(ctx, rand, [EYE_L + 100, EYE_Y - 30], [EYE_R - 100, EYE_Y - 30], 0, { w: 16, stroke: C.gold });
  },
  'eyepatch-pirate': (ctx, rand) => {
    D.stroke(ctx, rand, [700, EYE_Y - 130], [1420, EYE_Y + 130], 0, { w: 22 });
    D.roundRect(ctx, EYE_L - 118, EYE_Y - 96, 236, 192, 34, { fill: '#17171F' });
  },
  monocle: (ctx, rand) => {
    D.blob(ctx, rand, EYE_R, EYE_Y, 128, 128, { fill: 'rgba(210,235,255,0.28)', w: 20, cel: false, stroke: C.gold });
    glint(ctx, rand, EYE_R, EYE_Y);
    D.stroke(ctx, rand, [EYE_R + 118, EYE_Y + 60], [EYE_R + 220, EYE_Y + 330], 60, { stroke: C.gold, w: 14 });
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   09 — HELD ITEM  (all anchored to the same paw position)
   ═══════════════════════════════════════════════════════════════════════════ */
const HX = HELD.x, HY = HELD.y;

/**
 * A cream paw at the held-item anchor, drawn under every held item so the object reads as
 * *held* rather than pasted onto the chest. Cream works against every fur colour and sits
 * in the same design language as the `sock-paws` marking.
 */
function heldPaw(ctx, rand) {
  const px = HX + 40, py = HY + 300;
  for (let i = 0; i < 3; i++) {
    D.blob(ctx, rand, px - 112 + i * 112, py - 138, 64, 60, { fill: C.cream, cel: { cover: 0.3 } });
  }
  D.blob(ctx, rand, px, py, 188, 168, { fill: C.cream, cel: { cover: 0.34 } });
}

/** Wrap every held-item drawer so the paw is always drawn first. */
function withPaw(items) {
  const out = {};
  for (const [k, fn] of Object.entries(items)) {
    out[k] = (ctx, rand) => { heldPaw(ctx, rand); fn(ctx, rand); };
  }
  return out;
}

const HELD_ITEM = withPaw({
  'tennis-ball': (ctx, rand) => {
    D.blob(ctx, rand, HX, HY, 180, 180, { fill: '#D6E84A' });
    D.stroke(ctx, rand, [HX - 150, HY - 90], [HX - 150, HY + 90], -80, { stroke: C.white, w: 16 });
    D.stroke(ctx, rand, [HX + 150, HY - 90], [HX + 150, HY + 90], 80, { stroke: C.white, w: 16 });
  },
  bone: (ctx, rand) => boneShape(ctx, rand, HX, HY, 340, 120, C.cream, -0.22),
  'hot-dog': (ctx, rand) => {
    ctx.save(); ctx.translate(HX, HY); ctx.rotate(-0.2);
    D.roundRect(ctx, -190, -60, 380, 120, 60, { fill: '#E8B96A' });
    D.roundRect(ctx, -200, -30, 400, 62, 31, { fill: '#C4562F' });
    ctx.save(); ctx.beginPath();
    D.closedPath(ctx, D.poly(rand, [[-200, -30], [200, -30], [200, 32], [-200, 32]]));
    ctx.clip();
    ctx.strokeStyle = '#F2C21A'; ctx.lineWidth = 20; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) ctx.lineTo(-180 + i * 45, (i % 2 ? -14 : 16));
    ctx.stroke(); ctx.restore();
    ctx.restore();
  },
  'chopped-cheese': (ctx, rand) => {
    D.roundRect(ctx, HX - 200, HY - 100, 400, 200, 50, { fill: '#E0B268' });
    D.shape(ctx, D.poly(rand, [[HX - 190, HY - 10], [HX + 190, HY - 30], [HX + 190, HY + 40], [HX - 190, HY + 55]]),
      { fill: '#D9782E', w: 12 });
    D.shape(ctx, D.poly(rand, [[HX + 40, HY - 130], [HX + 250, HY - 90], [HX + 240, HY + 130], [HX + 40, HY + 120]]),
      { fill: '#F2F0E8' });
  },
  'deli-cup': (ctx, rand) => {
    D.shape(ctx, D.poly(rand, [[HX - 140, HY - 150], [HX + 140, HY - 150], [HX + 105, HY + 190], [HX - 105, HY + 190]]),
      { fill: '#2C58A8' });
    D.clipTo(ctx, D.poly(rand, [[HX - 140, HY - 150], [HX + 140, HY - 150], [HX + 105, HY + 190], [HX - 105, HY + 190]]), () => {
      D.shape(ctx, D.poly(rand, [[HX - 150, HY - 60], [HX + 150, HY - 60], [HX + 150, HY + 30], [HX - 150, HY + 30]]),
        { fill: C.white, w: 0 });
    });
    D.roundRect(ctx, HX - 158, HY - 196, 316, 62, 22, { fill: C.white });
    D.stroke(ctx, rand, [HX + 20, HY - 240], [HX + 60, HY - 340], 40, { stroke: 'rgba(230,230,240,0.8)', w: 14 });
  },
  lollipop: (ctx, rand) => {
    D.stroke(ctx, rand, [HX, HY + 60], [HX, HY + 300], 0, { stroke: C.white, w: 26 });
    D.blob(ctx, rand, HX, HY - 40, 165, 165, { fill: '#FF7FB0' });
    ctx.save();
    D.clipTo(ctx, D.ring(rand, HX, HY - 40, 165, 165, { n: 20 }), () => {
      ctx.strokeStyle = C.white; ctx.lineWidth = 30; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 4; t += 0.12) {
        const r = t * 13;
        const px = HX + Math.cos(t) * r, py = HY - 40 + Math.sin(t) * r;
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.restore();
  },
  phone: (ctx, rand) => {
    D.roundRect(ctx, HX - 140, HY - 250, 280, 500, 40, { fill: '#1E1E28' });
    D.roundRect(ctx, HX - 104, HY - 206, 208, 412, 20, { fill: '#0E2A1E', w: 10 });
    ctx.save();
    ctx.strokeStyle = '#4FE08A'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(HX - 78, HY + 150);
    [[-30, 60], [10, 90], [50, -10], [80, -110]].forEach(([dx, dy]) => ctx.lineTo(HX + dx, HY + dy));
    ctx.stroke();
    ctx.restore();
  },
  leash: (ctx, rand) => {
    // strap first, then the handle loop on top, so the loop reads as the near edge
    D.stroke(ctx, rand, [HX - 20, HY - 20], [HX - 330, S + 80], 250, { stroke: D.style().ink, w: 56 });
    D.stroke(ctx, rand, [HX - 20, HY - 20], [HX - 330, S + 80], 250, { stroke: '#E2503F', w: 36 });
    D.roundRect(ctx, HX + 76, HY - 40, 56, 130, 22, { fill: C.silver, w: 13 });
    const loop = D.ring(rand, HX + 44, HY - 168, 92, 118, { n: 20 });
    D.shape(ctx, loop, { fill: '#E2503F', w: 0, cel: false });
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    D.closedPath(ctx, D.ring(rand, HX + 44, HY - 168, 46, 70, { n: 20 }));
    ctx.fill();
    ctx.restore();
    D.shape(ctx, loop, { fill: null });
    D.shape(ctx, D.ring(rand, HX + 44, HY - 168, 46, 70, { n: 20 }), { fill: null, w: 14 });
  },
  lotto: (ctx, rand) => {
    ctx.save(); ctx.translate(HX, HY); ctx.rotate(-0.18);
    D.roundRect(ctx, -230, -160, 460, 320, 24, { fill: '#F2C21A' });
    D.roundRect(ctx, -190, -110, 380, 100, 14, { fill: '#E0424E', w: 12 });
    for (let i = 0; i < 3; i++) D.roundRect(ctx, -190 + i * 130, 20, 110, 110, 14, { fill: C.silver, w: 12 });
    label(ctx, '$', 0, -60, 90, C.white, { w: 12 });
    ctx.restore();
  },
  skateboard: (ctx, rand) => {
    ctx.save(); ctx.translate(HX, HY); ctx.rotate(0.12);
    D.roundRect(ctx, -110, -300, 220, 600, 100, { fill: '#7A3FD6' });
    D.shape(ctx, D.poly(rand, [[-60, 130], [-10, -30], [30, 70], [70, -110], [40, 160]]), { fill: '#FF7A2E', w: 12 });
    for (const y of [-215, 215]) D.blob(ctx, rand, -95, y, 46, 46, { fill: C.gold, w: 12 });
    ctx.restore();
  },
  boombox: (ctx, rand) => {
    D.roundRect(ctx, HX - 250, HY - 130, 500, 300, 30, { fill: '#4A4A5A' });
    for (const x of [HX - 140, HX + 140]) {
      D.blob(ctx, rand, x, HY + 20, 88, 88, { fill: '#22222C', w: 14 });
      D.blob(ctx, rand, x, HY + 20, 34, 34, { fill: '#6E6E82', w: 10 });
    }
    D.roundRect(ctx, HX - 60, HY - 60, 120, 90, 12, { fill: '#C9CEDC', w: 12 });
    D.stroke(ctx, rand, [HX - 170, HY - 140], [HX + 170, HY - 140], 90, { w: 20 });
    for (let i = 0; i < 3; i++) {
      const nx = HX + 210 + i * 90, ny = HY - 220 - i * 90;
      D.blob(ctx, rand, nx, ny, 34, 28, { fill: D.style().ink, w: 0, cel: false });
      D.stroke(ctx, rand, [nx + 30, ny], [nx + 30, ny - 110], 0, { w: 14 });
    }
  },
  'bubble-wand': (ctx, rand) => {
    D.stroke(ctx, rand, [HX + 60, HY + 260], [HX + 20, HY + 40], 0, { w: 24, stroke: '#4FA8E8' });
    D.blob(ctx, rand, HX + 10, HY - 20, 80, 90, { fill: null, w: 20, stroke: '#4FA8E8' });
    for (const [dx, dy, r] of [[-150, -180, 74], [-40, -300, 52], [-230, -60, 44], [-300, -230, 62], [-120, -430, 36]]) {
      D.blob(ctx, rand, HX + dx, HY + dy, r, r, { fill: 'rgba(180,225,255,0.34)', w: 10, cel: false });
      D.blob(ctx, rand, HX + dx - r * 0.32, HY + dy - r * 0.34, r * 0.2, r * 0.15, { fill: 'rgba(255,255,255,0.8)', w: 0, cel: false });
    }
  },
});

/* ═══════════════════════════════════════════════════════════════════════════
   10 — OVERLAY  (full-bleed, must never hide the face)
   ═══════════════════════════════════════════════════════════════════════════ */
const OVERLAY = {
  sparkle: (ctx, rand) => {
    for (let i = 0; i < 16; i++) {
      const x = rand() * S, y = rand() * S;
      if (Math.hypot(x - CX, y - 950) < 480) continue;
      const r = 28 + rand() * 62;
      D.star(ctx, rand, x, y, r, r * 0.3, 4, { fill: i % 3 ? C.white : '#FFF0A8', w: 8 });
    }
  },
  rain: (ctx, rand) => {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#BFE4FA';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (let i = 0; i < 130; i++) {
      const x = rand() * (S + 500) - 250, y = rand() * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 70, y + 190);
      ctx.stroke();
    }
    ctx.restore();
  },
  confetti: (ctx, rand) => {
    const cols = ['#FF7FB0', '#F2C21A', '#4FC7E8', '#B8E635', '#8B5CF6'];
    for (let i = 0; i < 46; i++) {
      ctx.save();
      ctx.translate(rand() * S, rand() * S);
      ctx.rotate(rand() * Math.PI);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-26, -11, 52, 22);
      ctx.strokeStyle = D.style().ink;
      ctx.lineWidth = 5;
      ctx.strokeRect(-26, -11, 52, 22);
      ctx.restore();
    }
  },
  scanlines: (ctx) => {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#0A0A12';
    for (let y = 0; y < S; y += 12) ctx.fillRect(0, y, S, 4);
    ctx.restore();
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
  'laser-glow': (ctx, rand) => {
    const g = ctx.createRadialGradient(CX, EYE_Y, 40, CX, EYE_Y, 900);
    g.addColorStop(0, 'rgba(255,60,40,0.36)');
    g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,140,90,0.75)';
    for (let i = 0; i < 26; i++) {
      const x = CX + D.jit(rand, 820), y = 300 + rand() * 1500;
      ctx.beginPath();
      ctx.arc(x, y, 4 + rand() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  'pixel-mode': (ctx, rand) => {
    const ramp = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'];
    const cell = S / 32;
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let gy = 0; gy < 32; gy++) {
      for (let gx = 0; gx < 32; gx++) {
        ctx.fillStyle = ramp[Math.floor(rand() * ramp.length)];
        ctx.fillRect(gx * cell, gy * cell, cell, cell);
      }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#0F380F';
    for (let y = 0; y < S; y += 12) ctx.fillRect(0, y, S, 4);
    ctx.restore();
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Registry + main
   ═══════════════════════════════════════════════════════════════════════════ */
const REGISTRY = {
  '00-background': BACKGROUND,
  '01-backdrop': BACKDROP,
  '02-fur': FUR,
  '03-marking': MARKING,
  '04-outfit': OUTFIT,
  '05-mouth': MOUTH,
  '06-eyes': EYES,
  '07-headwear': HEADWEAR,
  '08-eyewear': EYEWEAR,
  '09-held': HELD_ITEM,
  '10-overlay': OVERLAY,
};

function main() {
  const styleName = process.argv.slice(2).find(a => !a.startsWith('-')) || 'quantum';
  D.setStyle(styleName);
  console.log(`\n  drawing 125 layers — style: ${styleName}\n`);

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
    // clear stubs from a previous run so renamed weights don't leave duplicates behind
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
