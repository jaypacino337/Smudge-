/* =============================================================================
   GOATSE — site behaviour

   Everything here is driven by two data sources and nothing else:
     window.BRAND    — assets/js/brand.js      (names, links, counts)
     window.PROMPTS  — assets/js/prompts-data.js, generated from art/prompts.json
   ============================================================================= */

/* --- Hero herd -----------------------------------------------------------
   Real generated art. These PNGs come from generator/tools/make-showcase.js —
   run `npm run showcase` in generator/ to regenerate them after changing a layer.
   ------------------------------------------------------------------------- */
const HERD = [
  { src: 'showcase/hero-1.png', alt: 'a fawn alpine goat in a flannel shirt with scimitar horns, chewing a blade of grass, holding a tin can' },
  { src: 'showcase/hero-2.png', alt: 'a russet boer goat with curled horns and lop ears, in a knit beanie and an orange puffer jacket' },
  { src: 'showcase/hero-3.png', alt: 'a black goat in a tuxedo and gold crown with gold-tipped horns, firing laser eyes' },
  { src: 'showcase/hero-4.png', alt: 'a white saanen goat with huge ridged ibex horns, wearing a headlamp and climbing harness, holding an ice axe' },
  { src: 'showcase/hero-5.png', alt: 'a solid gold goat with spiralling markhor horns, in a summit cape, with dollar-sign eyes, holding a trophy' },
  { src: 'showcase/hero-6.png', alt: 'a cream angora goat in a wool scarf with corkscrew horns and heart eyes, holding an espresso' },
];

function renderHerd() {
  const host = document.getElementById('herd');
  if (!host) return;
  host.innerHTML = HERD.map(d =>
    `<img src="${d.src}" alt="${d.alt}" loading="lazy" width="440" height="440">`).join('');
}

/* --- Copy to clipboard ---------------------------------------------------- */
let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

async function copy(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg || 'copied');
  } catch {
    // clipboard API needs a secure context; fall back to a hidden textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(msg || 'copied'); }
    catch { toast('copy failed — select manually'); }
    ta.remove();
  }
}

/* --- Altimeter -----------------------------------------------------------
   The page is an altitude chart. The rail runs summit-at-the-top to base-at-the-
   bottom, and the marker RISES as you scroll DOWN — you're climbing.

   Section elevations are authored in the HTML (`data-alt` in metres) because they
   are editorial, not derived. The rail interpolates between them, so the number on
   the marker and the number stamped on each section can never drift apart.
   ------------------------------------------------------------------------- */
const SUMMIT = 8848;

function altimeter() {
  const rail = document.querySelector('.rail');
  const bar = document.querySelector('.rail-bar');
  const sections = [...document.querySelectorAll('[data-alt]')]
    .map(el => ({ el, alt: parseInt(el.dataset.alt, 10) }))
    .filter(s => Number.isFinite(s.alt))
    .sort((a, b) => a.alt - b.alt);

  if (!sections.length) return;

  // stamp each section with its elevation, on the rule above it
  for (const s of sections) {
    if (s.el.querySelector('.alt-stamp')) continue;
    const stamp = document.createElement('div');
    stamp.className = 'alt-stamp';
    stamp.innerHTML = `<b>${s.alt.toLocaleString()} m</b> ${s.el.dataset.altName || ''}`;
    s.el.prepend(stamp);
  }

  if (!rail) { trackBar(); return; }

  const line = rail.querySelector('.rail-line');
  const mark = rail.querySelector('.rail-mark');
  if (!line || !mark) return;

  // ticks, positioned by elevation: summit at the top of the line, zero at the bottom
  const ticks = [8848, 7000, 5000, 3000, 1000, 0].map(alt => {
    const t = document.createElement('div');
    t.className = 'rail-tick';
    t.innerHTML = `<span>${alt.toLocaleString()}</span>`;
    rail.appendChild(t);
    return { el: t, alt };
  });
  function placeTicks() {
    const top = line.offsetTop, h = line.offsetHeight;
    for (const t of ticks) t.el.style.top = `${top + (1 - t.alt / SUMMIT) * h}px`;
  }

  function update() {
    const mid = window.scrollY + window.innerHeight / 2;

    // which two authored elevations bracket the viewport centre?
    let alt = sections[0].alt;
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].el.offsetTop;
      const next = sections[i + 1];
      if (mid < top) break;
      if (!next) { alt = sections[i].alt; break; }
      const nextTop = next.el.offsetTop;
      if (mid < nextTop) {
        const f = (mid - top) / Math.max(1, nextTop - top);
        alt = sections[i].alt + (next.alt - sections[i].alt) * f;
        break;
      }
      alt = next.alt;
    }
    alt = Math.max(0, Math.min(SUMMIT, Math.round(alt / 10) * 10));

    const lineTop = line.offsetTop;
    const lineH = line.offsetHeight;
    mark.style.top = `${lineTop + (1 - alt / SUMMIT) * lineH}px`;
    mark.dataset.alt = `${alt.toLocaleString()} m`;
    trackBar();
  }

  function trackBar() {
    if (!bar) return;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${Math.min(100, Math.max(0, (window.scrollY / Math.max(1, h)) * 100))}%`;
  }

  placeTicks();
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => { placeTicks(); update(); });
}

/* --- Layer stack table (index page) --------------------------------------- */
function renderZStack() {
  const host = document.getElementById('zstack');
  if (!host || !window.PROMPTS) return;

  const rows = window.PROMPTS.categories.map(c => {
    // strip the boilerplate prefix BEFORE taking the first sentence, or every
    // transparent category's note comes out as the empty string
    const note = (c.batchNote
      .replace(/^Transparent PNG,?\.?\s*/i, '')
      .split(/(?<=\.)\s/)[0] || '')
      .replace(/^./, m => m.toUpperCase());
    const n = c.layers.length + (c.allowNone ? 1 : 0);
    return `<div class="zrow">
      <span class="z">z${String(c.z).padStart(2, '0')}</span>
      <span class="name">${c.name}</span>
      <span class="note">${note}</span>
      <span class="count">${n}</span>
    </div>`;
  }).reverse();   // top of the stack first — that's the order you see it in

  host.innerHTML =
    `<div class="zrow zhead">
       <span class="z">z</span><span class="name">Category</span>
       <span class="note">What it owns</span><span class="count">Options</span>
     </div>` + rows.join('');
}

/* --- Rarity bands --------------------------------------------------------- */
const TIERS = [
  { key: 'common',    label: 'Foothills',  band: '0 – 2,000 m' },
  { key: 'uncommon',  label: 'Treeline',   band: '2,000 – 4,500 m' },
  { key: 'rare',      label: 'High Camp',  band: '4,500 – 7,000 m' },
  { key: 'legendary', label: 'Summit',     band: '7,000 – 8,848 m' },
];

function renderBands() {
  const host = document.getElementById('bands');
  if (!host || !window.PROMPTS) return;

  const all = window.PROMPTS.categories.flatMap(c => c.layers.map(l => ({ ...l, cat: c.name })));
  const totalWeight = all.reduce((s, l) => s + l.weight, 0);

  host.innerHTML = TIERS.map(t => {
    const hits = all.filter(l => l.tier === t.key);
    const share = hits.reduce((s, l) => s + l.weight, 0) / totalWeight * 100;
    const examples = hits
      .slice()
      .sort((a, b) => a.weight - b.weight)
      .slice(0, 3)
      .map(l => l.name)
      .join(' · ');
    return `<div class="band" data-tier="${t.key}">
      <span class="alt">${t.band}</span>
      <span>
        <span class="tier">${t.label}</span>
        <span class="ex"> — ${hits.length} layers · ${examples}</span>
      </span>
      <span class="pct">${share.toFixed(1)}%</span>
    </div>`;
  }).join('');
}

/* --- Live counts from the spec, so the copy can't go stale ---------------- */
function renderCounts() {
  if (!window.PROMPTS) return;
  const P = window.PROMPTS;
  const layers = P.totalLayers;
  const combos = P.categories.reduce((n, c) => n * BigInt(c.layers.length + (c.allowNone ? 1 : 0)), 1n);

  const set = (sel, val) => document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
  set('[data-count="layers"]', layers.toLocaleString());
  set('[data-count="categories"]', String(P.categories.length));
  set('[data-count="combos"]', formatBig(combos));
  set('[data-count="canvas"]', `${P.canvas}px`);
}

/** 6357399048000 → "6.36 trillion" */
function formatBig(n) {
  const units = [[1000000000000n, 'trillion'], [1000000000n, 'billion'], [1000000n, 'million']];
  for (const [div, name] of units) {
    if (n >= div) return `${(Number((n * 1000n) / div) / 1000).toFixed(2)} ${name}`;
  }
  return n.toLocaleString();
}

/* --- Copy buttons --------------------------------------------------------- */
function wireCopy() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const sel = btn.getAttribute('data-copy');
    const src = sel.startsWith('#') ? document.querySelector(sel) : null;
    copy(src ? src.innerText : sel, btn.getAttribute('data-copy-msg') || 'copied');
  });
}

/* =============================================================================
   PROMPT LAB  (lab.html)
   ============================================================================= */
function lab() {
  const host = document.getElementById('lab');
  if (!host || !window.PROMPTS) return;

  const search = document.getElementById('lab-search');
  const chips = [...document.querySelectorAll('.chip[data-tier]')];
  const state = { q: '', tiers: new Set() };

  function matches(layer, cat) {
    if (state.tiers.size && !state.tiers.has(layer.tier)) return false;
    if (!state.q) return true;
    const hay = `${layer.name} ${layer.file} ${cat.name} ${layer.prompt}`.toLowerCase();
    return state.q.split(/\s+/).every(t => hay.includes(t));
  }

  function render() {
    let shown = 0;
    const html = window.PROMPTS.categories.map(cat => {
      const hits = cat.layers.filter(l => matches(l, cat));
      if (!hits.length) return '';
      shown += hits.length;
      const rows = hits.map(l => `
        <div class="prow">
          <span>
            <div class="pname">${l.name}</div>
            <div class="pfile">${l.file}#${l.weight}.png</div>
          </span>
          <span class="ptext">${escapeHtml(l.prompt)}</span>
          <span class="pmeta">
            weight ${l.weight}<br>
            <span class="tier-${l.tier}">${l.tier}</span>
          </span>
          <span><button class="chip" data-copy="${escapeAttr(l.prompt)}" data-copy-msg="${l.name} copied">copy</button></span>
        </div>`).join('');
      return `<section class="cat-block">
        <h3>${cat.name} <span class="n">${cat.id} · z${cat.z} · ${hits.length}/${cat.layers.length}</span></h3>
        <p class="cat-note">${escapeHtml(cat.batchNote)}</p>
        <div style="margin:10px 0 4px">
          <button class="chip" data-copy="${escapeAttr(catText(cat, hits))}" data-copy-msg="${cat.name} batch copied">copy all ${hits.length}</button>
        </div>
        ${rows}
      </section>`;
    }).join('');

    host.innerHTML = html || `<p class="empty">no layers match "${escapeHtml(state.q)}"</p>`;
    const count = document.getElementById('lab-count');
    if (count) count.textContent = `${shown} / ${window.PROMPTS.totalLayers}`;
  }

  const catText = (cat, layers) =>
    `# ${cat.name} (${cat.id})\n# ${cat.batchNote}\n\n` +
    layers.map(l => `## ${l.name} -> ${l.file}#${l.weight}.png\n${l.prompt}`).join('\n\n');

  if (search) {
    search.addEventListener('input', () => {
      state.q = search.value.trim().toLowerCase();
      render();
    });
  }
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const t = chip.dataset.tier;
      if (state.tiers.has(t)) state.tiers.delete(t); else state.tiers.add(t);
      chip.setAttribute('aria-pressed', String(state.tiers.has(t)));
      render();
    });
  }

  const exportBtn = document.getElementById('lab-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const all = window.PROMPTS.categories
        .map(c => catText(c, c.layers))
        .join('\n\n---\n\n');
      copy(all, `all ${window.PROMPTS.totalLayers} prompts copied`);
    });
  }

  render();
}

const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escapeAttr = s => escapeHtml(s).replace(/"/g, '&quot;');

/* --- boot ----------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderHerd();
  renderZStack();
  renderBands();
  renderCounts();
  wireCopy();
  lab();
  altimeter();
});
