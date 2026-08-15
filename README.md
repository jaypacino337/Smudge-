# PUMP DAWGS 🐾

**1,111 dawgs on Solana, with a paired token.**

Heavy ink, cel shading, cosmic backgrounds — Quantum Cats' confidence, but dogs.

This repo is the whole project: **all 125 art layers**, a working generator that outputs
mint-ready images + Metaplex metadata, the site, four alternative art directions, and the
X/Discord launch kit. The collection builds end-to-end today.

> **Naming:** `PUMP DAWGS`, ticker `$DAWGS`. Set in exactly two places — `BRAND` in
> `assets/js/brand.js` (site) and `name`/`symbol` in `generator/config.js` (metadata).
> Nothing else hardcodes it.

---

## Build the collection

```bash
cd generator
npm install
npm run art             # draws all 125 layers (~20s)
npm run preview -- 36   # contact sheet -> output/_preview.png
npm run build -- 1111   # full collection + Metaplex metadata + rarity report
```

`generator/layers/` and `generator/output/` are gitignored on purpose — 132 layer PNGs at
2048px and 1,111 renders don't belong in git, and `npm run art` reproduces them byte-for-byte
from source. Committed sample renders live in [`showcase/`](showcase/).

Other commands:

| | |
|---|---|
| `npm run art -- crayon` | re-render every layer in the Concept 1 marker style |
| `npm run showcase` | regenerate the site images, X banner and PFP |
| `npm run make-none` | rewrite the transparent `none` layers |
| `npm run dry -- 200` | metadata + rarity only, no image compositing (fast) |

For the site:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

---

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site — thesis, four concepts, layer system, build steps, FAQ |
| `lab.html` | **Prompt Lab** — all 125 prompts, searchable, one-click copy, batch export |
| `art/CONCEPTS.md` | The shipped direction plus four alternatives, with the reasoning |
| `art/LAYER-SPEC.md` | How the layering actually works: anchors, z-order, rarity, exclusions, Metaplex |
| `art/prompts.json` | **Source of truth** — all 125 layer definitions, weights, and prompts |
| `art/prompts/` | Generated paste-ready batch files, one per category |
| `art/build-prompt-packs.js` | Regenerates `art/prompts/*.md` + `assets/js/prompts-data.js` from the JSON |
| `generator/tools/draw-layers.js` | **Draws all 125 layers** — the artwork, in code |
| `generator/tools/lib/draw.js` | Ink-and-cel drawing toolkit; `quantum` and `crayon` style presets |
| `generator/` | The generative engine — weighted rarity, exclusions, DNA dedupe, metadata |
| `showcase/` | Committed sample renders, X banner (1500x500), and PFP (800x800) |
| `docs/MINTING.md` | **What it costs to mint** — real numbers, and the cheap path |
| `docs/LAUNCH-KIT.md` | **X + Discord setup** — handles, bio copy, banner prompt, server structure, security checklist |

---

## The art direction

**Shipped: Quantum Dawgs.** Heavy black ink outlines drawn with a steady hand, two tones per
element with light fixed upper-left, saturated palette, cosmic backgrounds. Traits are all
Bodega — chopped cheese, deli cups, rope chains, puffers, lotto scratchers, do-rags.

Four alternatives are written up in [`art/CONCEPTS.md`](art/CONCEPTS.md) and all reuse the
same 125 layer definitions:

| | Concept | One-liner | Trade-off |
|---|---|---|---|
| 01 | **Crayon Dawgs** | The pumpkets house style, but dogs | Safer read for a pure degen audience |
| 02 | **Bodega Dawgs** | Corner-store street dogs | Its trait list is what shipped |
| 03 | **GameDawg** | 32x32 pixel dogs | Lives on as the 11-piece `pixel-mode` tier |
| 04 | **Puffy Dawgs** | Soft vinyl-toy sticker dogs | Merch language, not supply |

`npm run art -- crayon` re-renders the whole collection in Concept 1 in about 20 seconds.

### Why the art is drawn in code

**Alignment.** Every hat lands on the same skull because it's the same arithmetic — no anchor
sheet, no reference images, no drift, no hand-nudging 15-20% of the output, which is normally
the biggest time sink in a generative launch. The whole set also redraws in ~20 seconds, and
it's deterministic: same seed, byte-identical PNGs.

**The trade-off, honestly:** procedural art is geometry. It can't do texture, incidental
detail, or the imperfections a human illustrator brings, so next to hand-drawn work these
read as simpler. If the collection takes off, having an illustrator redraw the 125 layers
against the same anchors and filenames is a drop-in upgrade — the generator doesn't care
where the PNGs came from. The prompt packs in `art/prompts/` stay valid for exactly that.

---

## How the layering works

125 transparent PNGs, all `2048×2048`, all with the subject at identical pixel anchors. The
generator stacks them in a fixed z-order.

```
z10  Overlay        6   + none     ← drawn last, on top
z09  Held Item     12   + none
z08  Eyewear        9   + none
z07  Headwear      16   + none
z06  Eyes          12   required
z05  Mouth          9   required
z04  Outfit        18   + none
z03  Marking        9   + none
z02  Fur           12   required
z01  Backdrop       8   + none
z00  Background    14   required   ← drawn first, behind
```

`14 × 9 × 12 × 10 × 19 × 9 × 12 × 17 × 10 × 13 × 7` = **479,975,932,800** combinations for a
supply of 1,111.

**The one rule:** every layer sits on the same canvas with the subject on the same pixel
anchors. `draw-layers.js` gets that for free because it's all one coordinate system. If you
swap in prompted or hand-drawn layers instead, this is the part you have to enforce yourself.

### Rarity

Weight lives in the filename — `crown#5.png`. Retune by renaming, no code changes.

```
common 100 · uncommon 45 · rare 15 · epic 5 · legendary 1
```

Exact counts for headline traits are pinned in `config.forced` and verified in the build:
**3** laser eyes, **11** crowns, **7** ghosts, **11** pixel dawgs.

### Exclusions

Combinations that are physically broken get rejected and rerolled — cowboy hats on pricked
ears, sunglasses over closed eyes, a black dog on a black background. See
`generator/config.js`. Note that heavy exclusions suppress a trait's effective rarity well
below its weight; use `forced` when you need a specific count.

---

## Replacing the art with drawn or prompted layers

Nothing downstream is coupled to how the PNGs were made. To swap in your own:

1. Match the canvas and anchors in [`art/LAYER-SPEC.md`](art/LAYER-SPEC.md) — 2048x2048,
   transparent, subject on the same pixel anchors.
2. Save as `<name>#<weight>.png` into `generator/layers/<nn>-<category>/`, using the exact
   filenames the generator already uses.
3. `npm run preview -- 36` to check, then `npm run build -- 1111`.

If you want an image model to do it, the **Prompt Lab** (`lab.html`) has all 125 prompts with
one-click batch copy. Do `02-fur` first — you need the base body before anything else can
align to it — and attach an anchor sheet to every prompt, or you'll be hand-fixing alignment
on roughly a fifth of the output.

---

## Minting on Solana

`npm run build` emits Metaplex Token Metadata JSON alongside each image. Upload with
[Sugar](https://developers.metaplex.com/candy-machine/sugar):

```bash
bash <(curl -sSf https://sugar.metaplex.com/install.sh)
sugar launch
```

**Devnet first.** `solana config set --url devnet`, mint five to yourself, confirm they render
on a marketplace, *then* go to mainnet.

**Cost: under $15 all-in** if you launch through a Candy Machine, because the buyer pays
their own mint rent — your outlay is ~0.03 SOL of accounts plus ~$1.30 of Arweave storage.
Pre-minting all 1,111 yourself would be ~3.2 SOL (~$242) on Metaplex Core, or ~24 SOL
(~$1,834) on legacy Token Metadata. Full breakdown in [`docs/MINTING.md`](docs/MINTING.md).

Two things to decide before you upload, because neither is changeable after:

- **Your wallet.** `generator/config.js` → `creators` ships with a placeholder. The build
  prints a warning until you replace it.
- **Royalties.** `seller_fee_basis_points: 500` is 5%, but on Solana royalties are only
  enforced for **pNFTs** (programmable NFTs). On standard NFTs it's a suggestion marketplaces
  may ignore.

---

## X and Discord

See [`docs/LAUNCH-KIT.md`](docs/LAUNCH-KIT.md) — handles to grab, profile copy, the banner
prompt, the Discord channel/role structure, and the security checklist.

I can't create the accounts; X and Discord both require a human at signup, and automating it
would get them banned on day one. Everything else is written and ready — signup is about 20
minutes with that file open beside you.

Once they exist, paste the URLs into `assets/js/brand.js` → `links`. That's the only edit;
every link on the site reads from that object, and anything still set to `'#'` renders
greyed-out with a "soon" tag rather than shipping as a dead link.

**Two things to do before you invite anyone:** authenticator-app 2FA on X (these accounts get
SIM-swapped), and Discord's full moderation-2FA + permissions checklist. A compromised NFT
Discord posting a fake mint link drains your holders' wallets, not yours.

---

## The token

`$DAWGS` is a separate launch that shares the brand and the community. The NFT is the identity
and the scarce asset; the token is the low-barrier onramp for people who won't pay the floor.

Don't launch both at once — it splits attention and liquidity. And be careful what you promise:
"same dog, same Discord" is a brand relationship. Revenue share, buybacks, or committed utility
is a securities question, and you should get real advice before putting any of it on a website.

---

## Regenerating

`art/prompts.json` is the single source of truth for the layer set. After editing it:

```bash
node art/build-prompt-packs.js
```

That rewrites `art/prompts/*.md` and `assets/js/prompts-data.js` (which powers the Prompt Lab).
Never hand-edit the generated files.

---

Not financial advice. Do your own research. It's a dog.
