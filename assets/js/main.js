/* =============================================================================
   PUMP DAWGS — site behaviour

   Includes a parametric SVG dawg so the site has real art from day one. Once the
   generated PNGs exist, swap `renderPack()` to point at output/images/ instead.
   ============================================================================= */

/* --- Parametric dawg ------------------------------------------------------ */
const HATS = {
  none: '',
  cap: `<path d="M42 68 Q100 14 158 68 L156 76 Q100 62 44 76 Z" fill="HAT" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>
        <path d="M40 74 Q18 78 14 90 Q34 92 48 80 Z" fill="HAT" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>`,
  beanie: `<path d="M40 74 Q100 12 160 74 Z" fill="HAT" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>
           <rect x="36" y="68" width="128" height="18" rx="9" fill="HAT" stroke="#1a1a1a" stroke-width="5"/>
           <circle cx="100" cy="26" r="12" fill="HAT" stroke="#1a1a1a" stroke-width="5"/>`,
  crown: `<path d="M50 72 L58 30 L79 54 L100 22 L121 54 L142 30 L150 72 Z" fill="#ffd24a" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>
          <circle cx="100" cy="58" r="5" fill="#ff6b35" stroke="#1a1a1a" stroke-width="3"/>`,
  bandana: `<path d="M38 70 Q100 34 162 70 L158 82 Q100 66 42 82 Z" fill="HAT" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>`,
};

const EYES = {
  dots: `<circle cx="78" cy="90" r="10" fill="#1a1a1a"/><circle cx="122" cy="90" r="10" fill="#1a1a1a"/>
         <circle cx="81" cy="86" r="3.4" fill="#fff"/><circle cx="125" cy="86" r="3.4" fill="#fff"/>`,
  sleepy: `<path d="M68 90 Q78 82 88 90" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>
           <path d="M112 90 Q122 82 132 90" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/>`,
  shades: `<rect x="60" y="80" width="34" height="22" rx="7" fill="#1a1a1a"/>
           <rect x="106" y="80" width="34" height="22" rx="7" fill="#1a1a1a"/>
           <path d="M94 88 L106 88" stroke="#1a1a1a" stroke-width="6"/>
           <path d="M66 85 L74 96" stroke="#fff" stroke-width="3" opacity=".7"/>
           <path d="M112 85 L120 96" stroke="#fff" stroke-width="3" opacity=".7"/>`,
  wide: `<circle cx="78" cy="90" r="13" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>
         <circle cx="122" cy="90" r="13" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>
         <circle cx="78" cy="90" r="5" fill="#1a1a1a"/><circle cx="122" cy="90" r="5" fill="#1a1a1a"/>`,
};

const MOUTHS = {
  smile: `<path d="M88 122 Q100 132 112 122" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>`,
  tongue: `<path d="M88 122 Q100 132 112 122" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>
           <path d="M96 128 Q95 148 106 145 Q112 140 108 127 Z" fill="#ff8fb1" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round"/>`,
  grin: `<path d="M82 120 Q100 142 118 120 Z" fill="#1a1a1a"/>
         <path d="M86 122 L114 122 L114 128 L86 128 Z" fill="#fff"/>`,
};

/**
 * Build one dawg as an inline SVG string.
 * Every element here maps 1:1 to a layer category in art/prompts.json — this is the
 * same z-order the generator uses, just drawn in vectors instead of composited PNGs.
 */
function dawgSVG(o = {}) {
  const fur = o.fur || '#e8b96a';
  const shirt = o.shirt || '#5ac8fa';
  const hat = HATS[o.hat || 'none'].replace(/HAT/g, o.hatColor || '#ff6b35');
  const eyes = EYES[o.eyes || 'dots'];
  const mouth = MOUTHS[o.mouth || 'smile'];
  const ears = o.ears === 'pricked'
    ? `<path d="M52 78 L44 30 L82 60 Z" fill="${fur}" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>
       <path d="M148 78 L156 30 L118 60 Z" fill="${fur}" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>`
    : `<ellipse cx="46" cy="108" rx="16" ry="36" fill="${fur}" stroke="#1a1a1a" stroke-width="5" transform="rotate(-10 46 108)"/>
       <ellipse cx="154" cy="108" rx="16" ry="36" fill="${fur}" stroke="#1a1a1a" stroke-width="5" transform="rotate(10 154 108)"/>`;

  return `<svg viewBox="0 0 200 215" role="img" aria-label="a pump dawg">
    ${o.bg ? `<rect width="200" height="215" rx="14" fill="${o.bg}"/>` : ''}
    <!-- 04 outfit — starts above the head's lower edge (y=148) so the neck actually connects -->
    <path d="M30 215 Q30 143 100 143 Q170 143 170 215 Z" fill="${shirt}" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="round"/>
    <!-- 02 fur: ears then head -->
    ${ears}
    <ellipse cx="100" cy="97" rx="56" ry="51" fill="${fur}" stroke="#1a1a1a" stroke-width="5"/>
    <!-- 05 mouth: muzzle + nose + mouth -->
    <ellipse cx="100" cy="120" rx="29" ry="21" fill="${o.muzzle || '#f5efe3'}" stroke="#1a1a1a" stroke-width="4"/>
    <ellipse cx="100" cy="110" rx="10" ry="7.5" fill="#1a1a1a"/>
    ${mouth}
    <!-- 06 eyes / 08 eyewear -->
    ${eyes}
    <!-- 07 headwear -->
    ${hat}
  </svg>`;
}

/* --- Hero pack ------------------------------------------------------------ */
const PACK = [
  { fur: '#e8b96a', shirt: '#c8ff3d', hat: 'cap',     hatColor: '#ff6b35', eyes: 'dots',   mouth: 'smile'  },
  { fur: '#f5efe3', shirt: '#ff6b35', hat: 'beanie',  hatColor: '#5ac8fa', eyes: 'sleepy', mouth: 'tongue', ears: 'pricked' },
  { fur: '#efc373', shirt: '#1a1a1a', hat: 'crown',                        eyes: 'shades', mouth: 'grin'   },
  { fur: '#b8b5ae', shirt: '#ff8fb1', hat: 'bandana', hatColor: '#d6402f', eyes: 'wide',   mouth: 'smile'  },
  { fur: '#8c5a3c', shirt: '#ffd24a', hat: 'cap',     hatColor: '#c8ff3d', eyes: 'dots',   mouth: 'tongue', ears: 'pricked' },
];

function renderPack() {
  const host = document.getElementById('pack');
  if (host) host.innerHTML = PACK.map(b => dawgSVG(b)).join('');
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
