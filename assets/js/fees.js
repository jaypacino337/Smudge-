/* =============================================================================
   ZAZU — fee mechanism config
   =============================================================================

   Everything the dashboard renders comes from this one object. Edit the numbers
   here; the page redraws itself.

   READ THIS BEFORE YOU SHIP
   -------------------------
   `source: 'demo'` means the totals below are made-up placeholders and the
   dashboard says so, loudly, on the page. Publishing invented buyback and burn
   figures as if they were real is the single fastest way to turn a token site
   into a fraud claim — so the demo banner is wired to this flag on purpose.
   Don't delete the banner; set `source: 'chain'` and fill in `rpc` + `contracts`
   so the numbers come from the chain instead. `loadOnChain()` at the bottom is
   the whole wiring job — three eth_calls and a log query.
   ========================================================================== */

window.FEES = {
  source: 'demo',                       // 'demo' | 'chain'

  chain: {
    name: 'Robinhood Chain',
    gasToken: 'ETH',
    explorer: '',                       // e.g. 'https://explorer.robinhood.<tld>'
  },

  // What pons charges and how it splits. Verify against the pons docs for the
  // factory your token was actually launched from — the legacy factory used 90/10.
  pool: {
    tradeFeePct: 1.0,                   // % of every trade taken by the pool
    creatorSharePct: 70,                // % of that fee routed to the creator
    protocolSharePct: 30,               // % kept by pons
  },

  // What ZAZU does with its 70%. These four must total 100.
  policy: {
    buyback: 60,                        // ETH spent buying ZAZU off the market
    burn:    25,                        // bought tokens sent to the burn address
    lp:      10,                        // paired back into liquidity
    ops:     5,                         // hosting, art, listings
  },

  // Claim + buyback cadence. The countdown is derived from this, so it never
  // goes stale the way a hardcoded date would.
  cadence: {
    everyHours: 24,
    anchorUTCHour: 16,                  // runs daily at 16:00 UTC
    twapSlices: 12,                     // buybacks are sliced, not market-bought
  },

  contracts: {
    token:         '',                  // $ZAZU
    creatorWallet: '',                  // the only wallet that can claim
    burnAddress:   '0x000000000000000000000000000000000000dEaD',
    feeLocker:     '',                  // pons locker holding the claimable fees
  },

  rpc: '',                              // JSON-RPC endpoint; required for source:'chain'

  // ---- placeholder totals (source:'demo') ---------------------------------
  stats: {
    totalSupply:    1000000000,
    feesClaimedEth: 0,
    boughtBackEth:  0,
    burnedTokens:   0,
    claimableEth:   0,
    epochs:         0,
  },

  // Most recent claim → buyback → burn cycles, newest first.
  ledger: [],
};

/* -----------------------------------------------------------------------------
   Wiring it to the chain.

   Fill in `rpc` + `contracts`, set source:'chain', and call this instead of
   reading `stats` directly. Everything below is plain fetch — no dependencies.
   -------------------------------------------------------------------------- */
window.FEES.loadOnChain = async function loadOnChain() {
  const F = window.FEES;
  if (!F.rpc) throw new Error('FEES.rpc is not set');

  let id = 0;
  const call = async (method, params) => {
    const res = await fetch(F.rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
  };

  const ethCall = (to, data) => call('eth_call', [{ to, data }, 'latest']);
  const toBig = hex => BigInt(hex || '0x0');
  const fromWei = (v, d = 18) => Number(v) / 10 ** d;

  // balanceOf(address) — tokens sitting at the burn address
  const balanceOf = holder =>
    ethCall(F.contracts.token, '0x70a08231' + holder.slice(2).toLowerCase().padStart(64, '0'));

  // totalSupply()
  const totalSupply = () => ethCall(F.contracts.token, '0x18160ddd');

  const [burned, supply] = await Promise.all([
    balanceOf(F.contracts.burnAddress),
    totalSupply(),
  ]);

  F.stats.burnedTokens = fromWei(toBig(burned));
  F.stats.totalSupply = fromWei(toBig(supply));

  // Claimable fees: the pons locker's own view function. Selector depends on the
  // factory version — read it off the verified contract and drop it in here.
  if (F.contracts.feeLocker && F.claimableSelector) {
    const claimable = await ethCall(F.contracts.feeLocker, F.claimableSelector);
    F.stats.claimableEth = fromWei(toBig(claimable));
  }

  return F.stats;
};
