/* =============================================================================
   ZAZU — site behaviour

   Two things happen on this page: the element panel renders from
   assets/js/zazus.js (written by generator/tools/draw-zazu.js), and the fee
   dashboard renders from assets/js/fees.js. Neither hardcodes anything here.
   ============================================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── formatting ───────────────────────────────────────────────────────────── */
const fmt = {
  eth(n)   { return n >= 1 ? n.toFixed(3) : n.toFixed(5); },
  token(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  },
  pct(n) { return n.toFixed(2) + '%'; },
};

/* ── toast + copy ─────────────────────────────────────────────────────────── */
let toastTimer;
function toast(msg) {
  let el = $('.toast');
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
    // the clipboard API needs a secure context; fall back to a hidden textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(msg || 'copied'); }
    catch { toast('copy failed — select manually'); }
    ta.remove();
  }
}

/* ── hero ─────────────────────────────────────────────────────────────────── */
function renderHero() {
  const B = window.BRAND;

  const ca = $('#ca-value');
  if (ca) ca.textContent = B.contract || 'not deployed yet';
  const caCopy = $('#ca-copy');
  if (caCopy) {
    if (!B.contract) {
      caCopy.classList.add('pending');
    } else {
      caCopy.addEventListener('click', () => copy(B.contract, 'contract copied'));
    }
  }

  const strip = $('#hero-strip');
  if (strip && window.ZAZUS) {
    // the four originals first, then the house colours — the row reads as a story
    const picks = ['earth', 'water', 'deep', 'fire', 'neon', 'goldbar', 'nebula', 'frost'];
    strip.innerHTML = picks
      .map(id => window.ZAZUS.find(z => z.id === id))
      .filter(Boolean)
      .map(z => `<img src="assets/zazu/${z.file}" alt="Zazu — ${z.name}" loading="eager" width="448" height="448">`)
      .join('');
  }
}

function renderMarquee() {
  const host = $('#marquee');
  if (!host) return;
  const F = window.FEES;
  const n = (window.ZAZUS || []).length;
  const items = [
    `${n} ELEMENTS`,
    `<b>${F.pool.tradeFeePct}%</b> POOL FEE`,
    `<b>${F.pool.creatorSharePct}%</b> TO THE CREATOR`,
    `<b>${F.policy.buyback}%</b> BUYBACK`,
    `<b>${F.policy.burn}%</b> BURNED`,
    `CLAIM EVERY <b>${F.cadence.everyHours}H</b>`,
    'ONE CAT',
  ];
  const row = items.map(t => `<span>${t}</span>`).join('<span>·</span>');
  host.innerHTML = row + '<span>·</span>' + row + '<span>·</span>';
}

/* ── the element panel ────────────────────────────────────────────────────── */
function renderPanel() {
  const grid = $('#zgrid');
  const bar = $('#panel-bar');
  if (!grid || !window.ZAZUS) return;

  const all = window.ZAZUS;
  const tiers = ['origin', 'legendary', 'rare', 'common'];
  let active = 'all';

  bar.innerHTML =
    `<button class="chip on" data-tier="all">all · ${all.length}</button>` +
    tiers
      .map(t => {
        const n = all.filter(z => z.tier === t).length;
        return n ? `<button class="chip" data-tier="${t}">${t} · ${n}</button>` : '';
      })
      .join('') +
    `<span class="panel-count" id="panel-count"></span>`;

  function draw() {
    const shown = active === 'all' ? all : all.filter(z => z.tier === active);
    grid.innerHTML = shown
      .map(
        z => `
      <button class="zcard" data-n="${z.n}" aria-label="Zazu ${z.name}, open larger">
        <span class="tier t-${z.tier}">${z.tier}</span>
        <img src="assets/zazu/${z.file}" alt="Zazu rendered in the ${z.name} element" loading="lazy" width="448" height="448">
        <span class="meta"><span class="nm">${z.name}</span><span class="no">#${String(z.n).padStart(2, '0')}</span></span>
      </button>`,
      )
      .join('');
    $('#panel-count').textContent = `${shown.length} of ${all.length}`;
  }

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    $$('.chip', bar).forEach(c => c.classList.toggle('on', c === btn));
    active = btn.dataset.tier;
    draw();
  });

  /* lightbox */
  const box = $('#lightbox');
  const img = $('#lb-img');
  const meta = $('#lb-meta');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.zcard');
    if (!card) return;
    const z = all.find(v => v.n === +card.dataset.n);
    img.src = `assets/zazu/${z.file}`;
    img.alt = `Zazu rendered in the ${z.name} element`;
    meta.innerHTML = `<b>${z.name}</b> · #${String(z.n).padStart(2, '0')} · ${z.tier}`;
    box.classList.add('show');
  });

  const close = () => box.classList.remove('show');
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('.lb-close')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  draw();
}

/* ── fee dashboard ────────────────────────────────────────────────────────── */
function renderDashboard() {
  const F = window.FEES;
  if (!F || !$('#tiles')) return;

  const demo = F.source !== 'chain';
  const s = F.stats;

  /* badge + wiring note — the demo state is never silent */
  $('#dash-badge').innerHTML = demo
    ? '<span class="badge-demo">demo data — not on-chain</span>'
    : '<span class="badge-live">reading from chain</span>';

  $('#dash-updated').textContent = demo
    ? 'nothing claimed yet'
    : 'updated ' + new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  $('#wiring-note').innerHTML = demo
    ? `<strong>These totals are placeholders.</strong> <code class="inline">assets/js/fees.js</code>
       is set to <code class="inline">source: 'demo'</code>, so the dashboard shows zeros and this
       banner instead of inventing buyback figures. Fill in <code class="inline">rpc</code> and
       <code class="inline">contracts</code>, flip it to <code class="inline">'chain'</code>, and
       <code class="inline">loadOnChain()</code> pulls the real numbers — burned supply comes
       straight from <code class="inline">balanceOf(0x…dEaD)</code>.`
    : `<strong>Reading live from ${F.chain.name}.</strong> Burned supply is
       <code class="inline">balanceOf(${F.contracts.burnAddress.slice(0, 8)}…)</code> on the token
       contract. Anything on this page can be checked against the chain directly.`;

  /* tiles */
  const claimedPctOfTrade = (F.pool.tradeFeePct * F.pool.creatorSharePct) / 100;
  $('#tiles').innerHTML = [
    { k: 'Fees claimed', v: fmt.eth(s.feesClaimedEth), u: 'ETH', sub: `${F.pool.creatorSharePct}% creator share`, accent: false },
    { k: 'Bought back', v: fmt.eth(s.boughtBackEth), u: 'ETH', sub: `${F.policy.buyback}% of every claim`, accent: true },
    { k: 'Tokens burned', v: fmt.token(s.burnedTokens), u: '', sub: `sent to 0x…dEaD`, accent: false },
    { k: 'Supply burned', v: fmt.pct(s.totalSupply ? (s.burnedTokens / s.totalSupply) * 100 : 0), u: '', sub: `of ${fmt.token(s.totalSupply)} total`, accent: false },
    { k: 'Claimable now', v: fmt.eth(s.claimableEth), u: 'ETH', sub: `${claimedPctOfTrade.toFixed(2)}% of trade volume`, accent: false },
    { k: 'Claim epochs', v: String(s.epochs), u: '', sub: `every ${F.cadence.everyHours}h`, accent: false },
  ]
    .map(
      t => `
    <div class="tile${t.accent ? ' accent' : ''}">
      <div class="k">${t.k}</div>
      <div class="v">${t.v}${t.u ? `<small>${t.u}</small>` : ''}</div>
      <div class="sub">${t.sub}</div>
    </div>`,
    )
    .join('');

  /* split bar */
  const P = F.policy;
  const parts = [
    { k: 'buyback', label: 'Buyback', v: P.buyback, cls: 's-buyback' },
    { k: 'burn', label: 'Burn', v: P.burn, cls: 's-burn' },
    { k: 'lp', label: 'LP', v: P.lp, cls: 's-lp' },
    { k: 'ops', label: 'Ops', v: P.ops, cls: 's-ops' },
  ].filter(p => p.v > 0);

  $('#creator-pct').textContent = F.pool.creatorSharePct;
  $('#twap-slices').textContent = F.cadence.twapSlices;
  $('#split').innerHTML = parts
    .map(p => `<div class="${p.cls}" style="flex:${p.v} 1 0" title="${p.label} ${p.v}%">${p.v}%</div>`)
    .join('');

  const swatch = { 's-buyback': 'var(--neon)', 's-burn': 'var(--ink)', 's-lp': 'var(--neon-2)', 's-ops': 'var(--paper-3)' };
  $('#split-legend').innerHTML = parts
    .map(p => `<span><i style="background:${swatch[p.cls]}"></i>${p.label} — ${p.v}%</span>`)
    .join('');

  const total = parts.reduce((n, p) => n + p.v, 0);
  if (total !== 100) {
    $('#split-legend').innerHTML +=
      `<span style="color:#b45309">⚠ policy totals ${total}%, not 100% — check fees.js</span>`;
  }

  /* flow */
  $('#flow').innerHTML = [
    { n: 'step 01', h: 'Somebody trades', p: `Every buy and sell on the ${F.chain.name} pool pays a pool fee.`, pct: `${F.pool.tradeFeePct}% of the trade` },
    { n: 'step 02', h: 'The pool splits it', p: `pons keeps ${F.pool.protocolSharePct}%; the rest accrues to the creator wallet, claimable at any time.`, pct: `${F.pool.creatorSharePct}% to ZAZU` },
    { n: 'step 03', h: 'ZAZU claims', p: `One transaction from the creator wallet, every ${F.cadence.everyHours} hours. Fees arrive as ${F.chain.gasToken}.`, pct: `every ${F.cadence.everyHours}h` },
    { n: 'step 04', h: 'Buy back', p: `${F.policy.buyback}% of the claim buys $ZAZU on its own pool, sliced into ${F.cadence.twapSlices} TWAP orders.`, pct: `${F.policy.buyback}% buyback` },
    { n: 'step 05', h: 'Burn', p: `${F.policy.burn}% goes to 0x…dEaD and never comes back. ${F.policy.lp}% is paired into liquidity.`, pct: `${F.policy.burn}% burned`, terminal: true },
  ]
    .map(
      f => `
    <div class="flow-step${f.terminal ? ' terminal' : ''}">
      <div class="n">${f.n}</div>
      <h4>${f.h}</h4>
      <p>${f.p}</p>
      <span class="pct">${f.pct}</span>
    </div>`,
    )
    .join('');

  /* ledger */
  const body = $('#ledger-body');
  if (!F.ledger.length) {
    body.innerHTML =
      `<tr><td colspan="6" class="dim" style="text-align:center;padding:28px">
         No claims recorded yet. Each cycle appends a row here with its transaction hashes.
       </td></tr>`;
  } else {
    body.innerHTML = F.ledger
      .map(
        r => `
      <tr>
        <td class="num">#${r.epoch}</td>
        <td class="num">${fmt.eth(r.claimedEth)} ETH</td>
        <td class="num">${fmt.eth(r.boughtEth)} ETH</td>
        <td class="num">${fmt.token(r.burned)}</td>
        <td class="num">${fmt.eth(r.lpEth)} ETH</td>
        <td><span class="pill${r.status === 'queued' ? ' queued' : ''}">${r.status || 'settled'}</span></td>
      </tr>`,
      )
      .join('');
  }

  /* burn meter */
  const pct = s.totalSupply ? (s.burnedTokens / s.totalSupply) * 100 : 0;
  $('#burn-label').textContent = `${fmt.token(s.burnedTokens)} burned`;
  $('#burn-pct').textContent = `${fmt.pct(pct)} of supply`;
  // a hairline so an empty meter still reads as a meter rather than as broken
  setTimeout(() => { $('#burn-meter').style.width = Math.max(pct, 0.6) + '%'; }, 260);

  /* FAQ numbers stay in sync with the config */
  $('#faq-trade-fee').textContent = F.pool.tradeFeePct + '%';
  $('#faq-creator').textContent = F.pool.creatorSharePct + '%';
  $('#faq-protocol').textContent = F.pool.protocolSharePct + '%';

  startCountdown();
}

/* Next claim, derived from the cadence so it can't go stale. */
function startCountdown() {
  const host = $('#countdown');
  if (!host) return;
  const C = window.FEES.cadence;

  const next = () => {
    const now = new Date();
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), C.anchorUTCHour, 0, 0));
    const step = C.everyHours * 3600e3;
    while (t <= now) t.setTime(t.getTime() + step);
    return t;
  };

  const cell = (v, k) => `<div><div class="cv">${String(v).padStart(2, '0')}</div><div class="ck">${k}</div></div>`;

  const tick = () => {
    let ms = next() - Date.now();
    if (ms < 0) ms = 0;
    const h = Math.floor(ms / 3600e3);
    const m = Math.floor((ms % 3600e3) / 60e3);
    const sec = Math.floor((ms % 60e3) / 1000);
    host.innerHTML = cell(h, 'hrs') + cell(m, 'min') + cell(sec, 'sec');
  };

  tick();
  setInterval(tick, 1000);

  $('#cadence-note').textContent =
    `Runs daily at ${String(C.anchorUTCHour).padStart(2, '0')}:00 UTC, every ${C.everyHours} hours.`;
}

/* ── misc ─────────────────────────────────────────────────────────────────── */
function wireCopyables() {
  $$('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = $(btn.dataset.copyTarget);
      if (src) copy(src.textContent.trim(), 'copied');
    });
  });
}

function wireReveal() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  $$('.rv').forEach(el => io.observe(el));

  const tio = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); tio.unobserve(e.target); } }),
    { threshold: 0.4 },
  );
  // tiles are rendered after this runs, so observe them on the next frame
  requestAnimationFrame(() => $$('.tile').forEach(el => tio.observe(el)));
}

document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderMarquee();
  renderPanel();
  renderDashboard();
  wireCopyables();
  wireReveal();
});
