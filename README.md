# PUMP DAWGS 🐾

**1,111 hand-drawn dawgs on Solana, with a paired token.**

This repo is the whole project: the site, four art directions, a 125-layer generative art
system, the complete prompt library for mass-producing the art with ChatGPT, and a working
generator that outputs mint-ready images + Metaplex metadata.

> **Naming:** `PUMP DAWGS`, ticker `$DAWGS`. Set in exactly two places — `BRAND` in
> `assets/js/brand.js` (site) and `name`/`symbol` in `generator/config.js` (metadata).
> Nothing else hardcodes it.

---

## Try it in 60 seconds

The generator ships with a stub-art mode, so you can run the **entire pipeline** — rarity,
exclusion rules, metadata, contact sheet — before a single real drawing exists.

```bash
cd generator
npm install
npm run stub            # placeholder PNGs for all 125 layers
npm run preview -- 36   # contact sheet → output/_preview.png
npm run build -- 1111   # full collection + Metaplex metadata + rarity report
```

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
| `art/CONCEPTS.md` | The four art directions, with a recommendation and the reasoning |
| `art/LAYER-SPEC.md` | How the layering actually works: anchors, z-order, rarity, exclusions, Metaplex |
| `art/prompts.json` | **Source of truth** — all 125 layer definitions, weights, and prompts |
| `art/prompts/` | Generated paste-ready batch files, one per category |
| `art/build-prompt-packs.js` | Regenerates `art/prompts/*.md` + `assets/js/prompts-data.js` from the JSON |
| `generator/` | The generative engine — weighted rarity, exclusions, DNA dedupe, metadata |
| `docs/LAUNCH-KIT.md` | **X + Discord setup** — handles, bio copy, banner prompt, server structure, security checklist |

---

## The four concepts

Full write-ups in [`art/CONCEPTS.md`](art/CONCEPTS.md). Short version:

| | Concept | One-liner | Trade-off |
|---|---|---|---|
| 01 | **Crayon Dawgs** | The proven house style, but dogs | Fastest, safest — closest to "clone" |
| 02 | **Bodega Dawgs** | Corner-store street dogs with a whole personality | Best narrative, regional humor, slower |
| 03 | **GameDawg** | 32×32 pixel dogs | Perfect alignment by construction, crowded category |
| 04 | **Puffy Dawgs** | Soft vinyl-toy sticker dogs | Looks expensive, hardest to keep consistent |

**Recommendation: Concept 1's render style + Concept 2's trait content.** In-family art,
out-of-family personality. Hold GameDawg as an 11-piece tier inside the 1,111 (already wired
as the `pixel-mode` overlay). Use Puffy for merch renders, not for supply.

All four use the **same** 125 layer definitions — you swap one style block in
`art/prompts/00-style.md` and nothing else changes.

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

**The one rule:** generate the plain base body first, build `art/anchor-sheet.png` from it,
and attach that reference to every subsequent prompt. Skipping it is the #1 cause of
misaligned collections.

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

## Producing the art

1. Open [`art/prompts/00-style.md`](art/prompts/00-style.md), pick a concept, paste its
   **ACTIVE STYLE BLOCK** as the first message in a fresh ChatGPT conversation.
2. Open the **Prompt Lab** (`lab.html`) or the markdown packs in `art/prompts/`.
3. Hit **copy whole batch** on a category, paste it as the second message.
4. One category per conversation — the model holds style far better that way.
5. Save the outputs as `<name>#<weight>.png` into `generator/layers/<nn>-<category>/`.

Do `02-fur` **first** — you need the base body before anything else can align to it.

Realistic expectation: image models drift. Budget for hand-nudging 15–20% of layers. That's
an afternoon, not a week — and attaching the anchor sheet to every prompt is what keeps it
from being a week.

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
