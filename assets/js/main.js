/* =============================================================================
   PUMP DAWGS — site behaviour
   ============================================================================= */

/* --- Hero pack -----------------------------------------------------------
   Real generated art. These PNGs come from generator/tools/make-showcase.js —
   run `npm run showcase` in generator/ to regenerate them after changing a layer.
   ------------------------------------------------------------------------- */
const PACK = [
  { src: 'showcase/hero-1.png', alt: 'a tan dawg in a puffer jacket and backwards cap, holding a tennis ball' },
  { src: 'showcase/hero-2.png', alt: 'a shiba dawg in shades and a hoodie, holding a deli cup' },
  { src: 'showcase/hero-3.png', alt: 'a black lab dawg in a tuxedo and crown, with laser eyes' },
  { src: 'showcase/hero-4.png', alt: 'a husky dawg in a beanie and hockey jersey, holding a hot dog' },
  { src: 'showcase/hero-5.png', alt: 'a cream dawg in a bucket hat with heart eyes, blowing a bubble' },
  { src: 'showcase/hero-6.png', alt: 'a poodle dawg in a do-rag and gold chain, smoking a cigar' },
];

function renderPack() {
  const host = document.getElementById('pack');
  if (!host) return;
  host.innerHTML = PACK.map(d =>
    `<img src="${d.src}" alt="${d.alt}" loading="lazy" width="420" height="420">`).join('');
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

/* --- Layer stack table (index page) --------------------------------------- */
function renderZStack() {
  const host = document.getElementById('zstack');
  if (!host || !window.PROMPTS) return;
  // Top of the visual stack = last drawn, so display in reverse z-order.
  const rows = [...window.PROMPTS.categories].reverse().map(c => `
    <div class="zrow">
      <span class="z">z${String(c.z).padStart(2, '0')}</span>
      <span class="nm">${c.name}</span>
      <span class="ct">${c.layers.length}</span>
      <span class="nn">${c.allowNone ? '+ none' : 'required'}</span>
    </div>`).join('');
  host.innerHTML =
    `<div class="zstack-note">▲ drawn last — on top</div>${rows}<div class="zstack-note">▼ drawn first — behind</div>`;
}

/* --- Lab page ------------------------------------------------------------- */
function renderLab() {
  const host = document.getElementById('lab');
  if (!host || !window.PROMPTS) return;

  const spec = window.PROMPTS;
  const state = { cat: 'all', q: '' };

  // filter chips
  const chipHost = document.getElementById('chips');
  chipHost.innerHTML =
    `<button class="chip on" data-cat="all">all · ${spec.totalLayers}</button>` +
    spec.categories.map(c =>
      `<button class="chip" data-cat="${c.id}">${c.name} · ${c.layers.length}</button>`).join('');

  chipHost.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    chipHost.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === btn));
    state.cat = btn.dataset.cat;
    draw();
  });

  document.getElementById('search').addEventListener('input', e => {
    state.q = e.target.value.trim().toLowerCase();
    draw();
  });

  function matches(layer, cat) {
    if (state.cat !== 'all' && cat.id !== state.cat) return false;
    if (!state.q) return true;
    return (layer.name + ' ' + layer.file + ' ' + layer.prompt + ' ' + cat.name)
      .toLowerCase().includes(state.q);
  }

  function batchText(cat, layers) {
    return [
      `Generate ${layers.length} separate images for the "${cat.name}" trait layer of my NFT collection.`,
      `Apply the STYLE and OUTPUT RULES from my previous message to all of them.`,
      ``,
      cat.batchNote,
      ``,
      ...layers.map((l, i) => `${i + 1}. [${l.file}] ${l.prompt}`),
    ].join('\n');
  }

  function draw() {
    let shown = 0;
    const html = spec.categories.map(cat => {
      const layers = cat.layers.filter(l => matches(l, cat));
      if (!layers.length) return '';
      shown += layers.length;
      return `
      <section class="cat-block">
        <div class="cat-head">
          <h2>${cat.name}</h2>
          <span class="meta">${cat.id} · z${cat.z} · ${layers.length} of ${cat.layers.length}${cat.allowNone ? ' · + none' : ''}</span>
          <button class="btn btn-sm" data-batch="${cat.id}">copy whole batch</button>
        </div>
        <p class="cat-note">${cat.batchNote}</p>
        <div class="grid grid-2">
          ${layers.map(l => `
            <article class="layer-card">
              <div class="layer-top">
                <span class="nm">${l.name}</span>
                <span class="file">${l.file}.png</span>
                <span class="tier-badge t-${l.tier}">${l.tier}</span>
              </div>
              <div class="layer-prompt">${l.prompt.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
              <div class="layer-foot">
                <span class="w">weight ${l.weight} → saves as <code class="inline">${l.file}#${l.weight}.png</code></span>
                <button class="btn btn-sm" data-copy="${cat.id}/${l.file}">copy</button>
              </div>
            </article>`).join('')}
        </div>
      </section>`;
    }).join('');

    host.innerHTML = html || `<p class="lead">No layers match “${state.q}”.</p>`;
    document.getElementById('count').textContent = `${shown} layer${shown === 1 ? '' : 's'}`;
  }

  host.addEventListener('click', e => {
    const one = e.target.closest('[data-copy]');
    if (one) {
      const [catId, file] = one.dataset.copy.split('/');
      const cat = spec.categories.find(c => c.id === catId);
      const layer = cat.layers.find(l => l.file === file);
      copy(layer.prompt, `copied — ${layer.name}`);
      return;
    }
    const batch = e.target.closest('[data-batch]');
    if (batch) {
      const cat = spec.categories.find(c => c.id === batch.dataset.batch);
      const layers = cat.layers.filter(l => matches(l, cat));
      copy(batchText(cat, layers), `copied — ${layers.length} ${cat.name} prompts`);
    }
  });

  draw();
}

/* --- Global copy buttons -------------------------------------------------- */
function wireCopyables() {
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = document.querySelector(btn.dataset.copyTarget);
      if (src) copy(src.textContent.trim(), 'copied');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderPack();
  renderZStack();
  renderLab();
  wireCopyables();
});
