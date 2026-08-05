/**
 * SINGLE SOURCE OF TRUTH for every brand string on the site.
 *
 * Rename the project here and every page updates. Nothing else hardcodes the name.
 *
 * LINKS: paste the real URLs the moment they exist. Any link left as '#' renders
 * as a greyed-out "soon" button instead of a dead link — see the bottom of this file.
 */
window.BRAND = {
  name:     'ZAZU',
  short:    'ZAZU',
  singular: 'zazu',
  plural:   'zazus',
  ticker:   '$ZAZU',
  chain:    'Robinhood Chain',
  launchpad: 'pons',
  supply:   '1,000,000,000',
  tagline:  'One cat. Every element. Every fee bought back and burned.',

  // Paste the real token address after launch. Until then the hero shows "not deployed yet".
  contract: '',

  links: {
    pons:      '#',   // https://pons.<...>/token/0x...
    dexscreen: '#',   // https://dexscreener.com/robinhood/0x...
    explorer:  '#',   // block explorer address page
    docs:      '#',
  },

  // Flip to true once the token is live to switch the CTA copy.
  live: false,
};

document.addEventListener('DOMContentLoaded', () => {
  const B = window.BRAND;
  const dig = key => key.split('.').reduce((o, k) => (o == null ? o : o[k]), B);

  document.querySelectorAll('[data-brand]').forEach(el => {
    const val = dig(el.getAttribute('data-brand'));
    if (val !== undefined && val !== null && val !== '') el.textContent = val;
  });

  document.querySelectorAll('[data-brand-href]').forEach(el => {
    const val = dig(el.getAttribute('data-brand-href'));
    if (val && val !== '#') {
      el.setAttribute('href', val);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    } else {
      // No URL yet — don't ship a dead link. Show it as pending instead.
      el.classList.add('pending');
      el.removeAttribute('href');
      el.setAttribute('aria-disabled', 'true');
      if (!el.querySelector('.soon')) el.insertAdjacentHTML('beforeend', ' <span class="soon">soon</span>');
    }
  });
});
