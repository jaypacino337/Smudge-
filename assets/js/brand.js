/**
 * SINGLE SOURCE OF TRUTH for every brand string on the site.
 *
 * Rename the collection here and every page updates. Nothing else hardcodes the name.
 *
 * LINKS: paste the real URLs below the moment the X account and Discord exist. Any link
 * left as '#' renders as a greyed-out "soon" button instead of a dead link — see main.js.
 */
window.BRAND = {
  name: 'PUMP DAWGS',
  short: 'DAWGS',
  singular: 'dawg',
  plural: 'dawgs',
  ticker: '$DAWGS',
  supply: 1111,
  chain: 'Solana',
  tagline: 'One thousand one hundred and eleven dawgs. One token. Same dog.',
  links: {
    twitter:   '#',   // https://x.com/pumpdawgs
    discord:   '#',   // https://discord.gg/xxxxxxx
    tensor:    '#',   // https://tensor.trade/trade/pumpdawgs
    magiceden: '#',
    pumpfun:   '#',
  },
  // Set to true once the mint is live to flip all the CTA states.
  minted: false,
};

document.addEventListener('DOMContentLoaded', () => {
  const B = window.BRAND;
  document.querySelectorAll('[data-brand]').forEach(el => {
    const key = el.getAttribute('data-brand');
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), B);
    if (val !== undefined && val !== null) el.textContent = val;
  });
  document.querySelectorAll('[data-brand-href]').forEach(el => {
    const key = el.getAttribute('data-brand-href');
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), B);
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
