/**
 * SINGLE SOURCE OF TRUTH for every brand string on the site.
 *
 * Rename the collection here and every page updates. Nothing else hardcodes the name.
 *
 * LINKS: paste the real URLs below the moment the X account and Discord exist. Any link
 * left as '#' renders as a greyed-out "soon" button instead of a dead link — see main.js.
 */
window.BRAND = {
  name: 'GOATSE',
  short: 'GOATSE',
  singular: 'goat',
  plural: 'goats',
  ticker: '$GOATSE',
  supply: 2222,
  layers: 134,
  chain: 'Solana',
  summit: '8,848',
  tagline: 'Two thousand two hundred and twenty-two goats. One token. Altitude is the only metric.',
  links: {
    twitter:   '#',   // https://x.com/goatsecoin
    discord:   '#',   // https://discord.gg/xxxxxxx
    tensor:    '#',
    magiceden: '#',
    pumpfun:   '#',
  },
  // Set to true once the mint is live to flip all the CTA states.
  minted: false,
};

document.addEventListener('DOMContentLoaded', () => {
  const B = window.BRAND;
  const read = key => key.split('.').reduce((o, k) => (o == null ? o : o[k]), B);

  document.querySelectorAll('[data-brand]').forEach(el => {
    const val = read(el.getAttribute('data-brand'));
    if (val === undefined || val === null) return;
    // group thousands so 2222 reads as 2,222 everywhere it appears
    el.textContent = typeof val === 'number' ? val.toLocaleString('en-US') : val;
  });

  document.querySelectorAll('[data-brand-href]').forEach(el => {
    const val = read(el.getAttribute('data-brand-href'));
    if (val && val !== '#') {
      el.setAttribute('href', val);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    } else {
      // No URL yet — don't ship a dead link. Show it as pending instead.
      el.classList.add('pending');
      el.removeAttribute('href');
      el.setAttribute('aria-disabled', 'true');
      if (!el.querySelector('.soon')) {
        el.insertAdjacentHTML('beforeend', ' <span class="soon">soon</span>');
      }
    }
  });
});
