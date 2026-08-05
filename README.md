# ZAZU 🐈

**One cat. Every element. Every fee bought back and burned.**

$ZAZU is a [pons](https://docs.ponsfamily.com/) launch on **Robinhood Chain**. This repo is the
whole front end: the element panel (54 renders of the same cat), the fee-mechanism dashboard, and
the generator that draws all of it in code.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

---

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site — hero, the panel, the fee dashboard, the burn, the FAQ |
| `assets/js/fees.js` | **The fee mechanism config.** Splits, cadence, contracts, and the on-chain loader |
| `assets/js/brand.js` | Every brand string and link, in one object |
| `assets/js/zazus.js` | Generated manifest of the panel — written by the art script |
| `assets/zazu/` | The 54 element renders |
| `assets/favicon-32.png`, `favicon-180.png`, `zazu-logo.png` | Favicon and logo, generated from the same portrait |
| `generator/tools/draw-zazu.js` | **Draws Zazu and every element treatment** |

---

## The art

One portrait, drawn on a 1000×1000 virtual canvas at fixed anchors, rendered across 54 elements.
Each element is a themed background plus a colour grade — which is exactly what the reference
images did, except the grade is hue-preserving, so the markings, the eyes and the shading survive
instead of washing out. Every output is square. Nothing stretches.

```bash
cd generator
npm install
node tools/draw-zazu.js              # all 54 → ../assets/zazu/
node tools/draw-zazu.js 30           # fewer
node tools/draw-zazu.js --size 512   # bigger renders
```

Everything is seeded, so the same run produces byte-identical PNGs.

**Adding an element** is one entry in the `ELEMENTS` array at the top of `draw-zazu.js` — a
background scene, a grade colour, a mix strength, and how the eyes read. You get a new render, a
new card on the site, and a new manifest entry on the next run.

### Using the real photo

Drop the Zazu photo at **`assets/zazu-source.png`** (square, head centred) and re-run the script.
It uses the photo as the base instead of the drawn portrait — same backgrounds, same grades, same
filenames, same favicon. That's the whole swap; nothing else changes.

Until that file exists the portrait is drawn procedurally, which reads as a clean stylised cat
rather than as the actual photo of Zazu.

---

## The fee mechanism

pons locks the launch liquidity but lets the **creator wallet claim the trading fees** the pool
earns. That claim is the engine:

```
trade → 1% pool fee → 70% creator / 30% pons → claim → buy back → burn
```

The dashboard renders entirely from `assets/js/fees.js`:

| Field | What it drives |
|---|---|
| `pool.tradeFeePct` | The pool's fee on every trade |
| `pool.creatorSharePct` / `protocolSharePct` | The pons split — **70/30 on the current factory, 90/10 on the legacy one.** Check which factory your token came from before quoting it |
| `policy.{buyback,burn,lp,ops}` | How the creator share is spent. Must total 100 — the page flags it if it doesn't |
| `cadence` | Drives the live countdown, so it can't go stale |
| `contracts`, `rpc` | Where the real numbers come from |

### The demo flag — read this before shipping

`fees.js` ships with `source: 'demo'`. In that state every total is zero and the dashboard shows a
**"demo data — not on-chain"** badge. That is deliberate: publishing invented buyback and burn
figures as though they were real is the fastest way to turn a token site into a fraud claim.

To make the numbers real:

```js
// assets/js/fees.js
source: 'chain',
rpc:    'https://<robinhood-chain-rpc>',
contracts: {
  token:         '0x…',
  creatorWallet: '0x…',
  burnAddress:   '0x…dEaD',
  feeLocker:     '0x…',
}
```

`loadOnChain()` at the bottom of that file is the whole wiring job — plain `fetch`, no
dependencies. Burned supply comes from `balanceOf(0x…dEaD)` on the token, which anyone can verify
without trusting this site. The one selector you'll need to read off the verified pons locker is
the claimable-fee view; drop it in as `FEES.claimableSelector`.

### The part that isn't code

A buyback-and-burn is a **policy**, not a property of the token. It holds because the creator
wallet keeps running it. If that wallet is a single key on a laptop, that's the real risk — not the
contract. Put it behind a multisig, publish the cadence, let the ledger be the proof. Anything
stronger than "fees fund buybacks" — promised revenue share, guaranteed returns — is a securities
question, so get real advice before writing it on a website.

---

## Legacy

`art/`, `showcase/`, `docs/LAUNCH-KIT.md`, and the rest of `generator/` are from the earlier PUMP
DAWGS build. Nothing on the site references them any more; they're kept so the history isn't lost,
and can be deleted whenever you want. The prompt-lab PFP generator and the X handle card were
removed outright.
