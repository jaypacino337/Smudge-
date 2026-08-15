/**
 * Ink drawing toolkit — GOATSE edition.
 *
 * Two style presets, selected per-run (see STYLES below):
 *
 *   'alpine'  — the shipped look. Heavy confident black ink, two-tone cel shading with the
 *               light from the upper left, saturated flat colour. Clean lines, near-zero
 *               wobble, so 2,222 renders don't read as noisy.
 *   'riso'    — the risograph poster look. Thinner ink, no cel shading, and the fill
 *               deliberately printed a few px off-register from the line, like a two-colour
 *               screen that didn't line up.
 *
 * Everything is seeded, so the same seed always produces byte-identical PNGs.
 *
 * Beyond the shared shape primitives this adds `taper()` — a spine-plus-width ribbon
 * builder. Every horn in the collection is one call to it with a different spine, which is
 * why fourteen horn variants stay in the same visual family.
 */

/* ── style presets ───────────────────────────────────────────────────────── */
const STYLES = {
  alpine: {
    ink: '#14120F',
    width: 20,        // outline width at 2048px
    wobble: 0.006,    // radial jitter as a fraction of radius — near zero = confident line
    jitter: 3,        // absolute point jitter in px
    overfill: 0,      // fill offset in px
    cel: true,        // two-tone cel shading
    celAmount: 0.18,  // how much darker the shadow tone is
    celAngle: -0.5,   // shadow direction (radians); light comes from the upper left
    celCover: 0.40,   // fraction of the shape in shadow
  },
  riso: {
    ink: '#1B1A17',
    width: 13,
    wobble: 0.022,
    jitter: 7,
    overfill: 11,
    cel: false,
    celAmount: 0,
    celAngle: 0,
    celCover: 0,
  },
};

let S = STYLES.alpine;
function setStyle(name) {
  if (!STYLES[name]) throw new Error(`unknown style "${name}" — use ${Object.keys(STYLES).join(' | ')}`);
  S = STYLES[name];
  return S;
}
const style = () => S;

/* ── seeded RNG (mulberry32, same generator as build.js) ─────────────────── */
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
const jit = (rand, n) => (rand() * 2 - 1) * n;

/* ── colour ──────────────────────────────────────────────────────────────── */
/** Returns null for anything that isn't a hex literal — see shade() for why that matters. */
function hex2rgb(h) {
  if (typeof h !== 'string' || !/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h.trim())) return null;
  h = h.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
const rgb2hex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');

/** Darken toward a cool blue rather than toward grey — reads as shadow, not dirt. */
function shade(hex, amt = S.celAmount) {
  const c = hex2rgb(hex);
  if (!c) return hex;
  const [r, g, b] = c;
  return rgb2hex([r * (1 - amt) - 6 * amt * 4, g * (1 - amt) - 2 * amt * 4, b * (1 - amt) + 10 * amt * 4]);
}
function tint(hex, amt = 0.25) {
  const c = hex2rgb(hex);
  if (!c) return hex;
  const [r, g, b] = c;
  return rgb2hex([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
}
function mix(a, b, t) {
  const c1 = hex2rgb(a), c2 = hex2rgb(b);
  if (!c1 || !c2) return a;
  return rgb2hex([c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]);
}
/** 'rgba(r,g,b,a)' from a hex — for glows and washes. */
function rgba(hex, a) {
  const c = hex2rgb(hex);
  if (!c) return hex;
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/* ── point generators ────────────────────────────────────────────────────── */

/** Wobbly ellipse as a point ring. */
function ring(rand, cx, cy, rx, ry, o = {}) {
  const { amp = S.wobble, n = 22, rot = 0, squash = 0 } = o;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = 1 + jit(rand, amp);
    let x = Math.cos(a) * rx * j;
    let y = Math.sin(a) * ry * j;
    if (squash) y += Math.cos(a * 2) * ry * squash;
    if (rot) {
      const c = Math.cos(rot), s = Math.sin(rot);
      [x, y] = [x * c - y * s, x * s + y * c];
    }
    pts.push([cx + x, cy + y]);
  }
  return pts;
}

/** Wobbly polygon from explicit corners. */
function poly(rand, corners, amp = S.jitter) {
  return corners.map(([x, y]) => [x + jit(rand, amp), y + jit(rand, amp)]);
}

/** Mirror a right-hand point list about `cx` and append it reversed — symmetric shapes. */
function mirrorX(pts, cx) {
  return pts.concat(pts.slice().reverse().map(([x, y]) => [cx * 2 - x, y]));
}

/** Sampled quadratic from a→b, bowed sideways by `bow` px. */
function arc(rand, [x1, y1], [x2, y2], bow = 0, o = {}) {
  const { n = 10, amp = S.jitter } = o;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([
      u * u * x1 + 2 * u * t * cx + t * t * x2 + jit(rand, amp),
      u * u * y1 + 2 * u * t * cy + t * t * y2 + jit(rand, amp),
    ]);
  }
  return pts;
}

/**
 * Spine → closed ribbon outline.
 *
 * `spine` is a list of centre points; `width(t)` returns the half-width at t∈[0,1].
 * Walks up the left side and back down the right, so the result is a closed ring you can
 * hand straight to shape(). This is the horn primitive: change the spine, keep the family.
 */
function taper(rand, spine, width, o = {}) {
  const { amp = 0, cap = 'point' } = o;
  const n = spine.length;
  const norm = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    norm.push([-dy / len, dx / len]);
  }
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let w = width(t);
    if (cap === 'point' && i === n - 1) w = Math.min(w, 2);
    const [nx, ny] = norm[i];
    const j = amp ? jit(rand, amp) : 0;
    left.push([spine[i][0] + nx * (w + j), spine[i][1] + ny * (w + j)]);
    right.push([spine[i][0] - nx * (w + j), spine[i][1] - ny * (w + j)]);
  }
  return left.concat(right.reverse());
}

/** Sample a spine along a curve function f(t) → [x, y]. */
function spine(f, n = 18) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(f(i / (n - 1)));
  return pts;
}

/* ── path building ───────────────────────────────────────────────────────── */
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

function closedPath(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const cur = pts[i], m = mid(cur, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
  }
  ctx.closePath();
}

function openPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1]);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

/* ── cel shading ─────────────────────────────────────────────────────────── */
/**
 * Paint the shadow tone inside `pts`: clip to the shape, then flood a half-plane
 * rotated to celAngle covering the lower-right celCover fraction of the bounding box.
 */
function celShade(ctx, pts, fill, o = {}) {
  if (!S.cel || !fill) return;
  // no shadow tone can be derived from a non-hex fill (rgba/gradient) — skip rather
  // than hand canvas an invalid colour, which it ignores while keeping the old one
  if (!o.color && !hex2rgb(fill)) return;
  const cover = o.cover == null ? S.celCover : o.cover;
  if (cover <= 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const r = Math.hypot(maxX - minX, maxY - minY);

  ctx.save();
  closedPath(ctx, pts);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(o.angle == null ? S.celAngle : o.angle);
  ctx.fillStyle = o.color || shade(fill, o.amount);
  // half-plane: everything below y = r*(0.5 - cover)
  ctx.fillRect(-r, r * (0.5 - cover) - r * 0.5, r * 2, r * 2);
  ctx.restore();
}

/* ── the main draw call ──────────────────────────────────────────────────── */
/**
 *   fill    flat base colour, or null for outline only
 *   stroke  outline colour (defaults to the style ink), or null for fill only
 *   w       outline width
 *   cel     override cel shading: false to disable, or {cover, angle, amount, color}
 *   closed  closed shape vs open stroke
 */
function shape(ctx, pts, o = {}) {
  const {
    fill = null, stroke: strokeCol = S.ink, w = S.width,
    closed = true, alpha = 1, cel = true, off = null,
  } = o;
  const build = () => (closed ? closedPath(ctx, pts) : openPath(ctx, pts));
  const offset = off || [0, 0];

  if (fill) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (offset[0] || offset[1]) ctx.translate(offset[0], offset[1]);
    build();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    if (closed && cel !== false) {
      ctx.save();
      ctx.globalAlpha = alpha;
      celShade(ctx, pts, fill, cel === true ? {} : cel);
      ctx.restore();
    }
  }
  if (strokeCol && w > 0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    build();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

/** Wobbly filled blob. Returns the point ring so callers can reuse it for clipping. */
function blob(ctx, rand, cx, cy, rx, ry, o = {}) {
  const pts = ring(rand, cx, cy, rx, ry, o);
  const off = S.overfill ? [jit(rand, S.overfill), jit(rand, S.overfill)] : [0, 0];
  shape(ctx, pts, { off, ...o });
  return pts;
}

/** Wobbly open stroke from a→b, bowed sideways. */
function stroke(ctx, rand, a, b, bow, o = {}) {
  shape(ctx, arc(rand, a, b, bow, o), { closed: false, fill: null, ...o });
}

/** Flat n-point star. */
function star(ctx, rand, cx, cy, rOuter, rInner, points, o = {}) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 ? rInner : rOuter) * (1 + jit(rand, S.wobble * 2));
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke !== null) {
    ctx.strokeStyle = o.stroke || S.ink;
    ctx.lineWidth = o.w == null ? S.width : o.w;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  return pts;
}

/** Heart shape — eyes, pendants, logo tees. */
function heart(ctx, rand, cx, cy, size, o = {}) {
  const s = size / 100;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 38 * s);
  ctx.bezierCurveTo(cx - 62 * s, cy - 8 * s, cx - 42 * s, cy - 58 * s, cx, cy - 24 * s);
  ctx.bezierCurveTo(cx + 42 * s, cy - 58 * s, cx + 62 * s, cy - 8 * s, cx, cy + 38 * s);
  ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke !== null) {
    ctx.strokeStyle = o.stroke || S.ink;
    ctx.lineWidth = o.w == null ? S.width : o.w;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Rounded rectangle (garments, screens, signs, and the goat's bar pupil). */
function roundRect(ctx, x, y, w, h, r, o = {}) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke !== null) {
    ctx.strokeStyle = o.stroke || S.ink;
    ctx.lineWidth = o.w == null ? S.width : o.w;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Parallel hatch lines inside the current clip — the riso/engraving texture. */
function hatch(ctx, x, y, w, h, o = {}) {
  const { gap = 26, angle = -0.6, color = S.ink, width = 5, alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  const r = Math.hypot(w, h);
  for (let i = -r; i < r; i += gap) {
    ctx.beginPath();
    ctx.moveTo(-r, i);
    ctx.lineTo(r, i);
    ctx.stroke();
  }
  ctx.restore();
}

/** Clip everything drawn inside fn() to a point ring. */
function clipTo(ctx, pts, fn) {
  ctx.save();
  closedPath(ctx, pts);
  ctx.clip();
  fn();
  ctx.restore();
}

module.exports = {
  STYLES, setStyle, style, makeRng, jit,
  shade, tint, mix, rgba, hex2rgb, rgb2hex,
  ring, poly, arc, spine, taper, mirrorX, closedPath, openPath,
  shape, blob, stroke, star, heart, roundRect, hatch, clipTo, celShade,
};
