/**
 * SINGLE SOURCE OF TRUTH for every brand string on the site.
 *
 * Rename the collection here and every page updates. Nothing else hardcodes the name.
 * Spelling note: taken literally from "b-a-w-g-e-s". If you meant BAWGS, change it here.
 */
window.BRAND = {
  name: 'PUMP BAWGES',
  short: 'BAWGES',
  singular: 'bawg',
  plural: 'bawges',
  ticker: '$BAWG',
  supply: 1111,
  chain: 'Solana',
  tagline: 'One thousand one hundred and eleven bawges. One token. Same dog.',
  links: {
    twitter: '#',
    discord: '#',
    tensor: '#',
    magiceden: '#',
    pumpfun: '#',
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
    if (val) el.setAttribute('href', val);
  });
});
