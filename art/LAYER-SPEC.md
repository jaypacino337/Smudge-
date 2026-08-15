# PUMP DAWGS — Layering & Generation Spec

Everything here is style-agnostic. Pick a concept from `CONCEPTS.md`, drop its style block
into `art/prompts/00-style.md`, and this same spec produces that collection.

> **Already done.** All 125 layers exist, drawn procedurally by
> `generator/tools/draw-layers.js` — run `npm run art`. Because that code works in one
> coordinate system, §1 below (the anchor sheet) is handled for free. Read §1 anyway if you
> plan to replace any layer with a prompted or hand-drawn one; it's the rule you'd then have
> to enforce by hand. §§2–8 apply either way.

---

## 1. The one rule that makes or breaks the whole thing

**Every layer is drawn on the same transparent canvas, at the same size, with the subject in
the same place.** That is it. That is 90% of generative NFT art.

If the hat layer is drawn on a 1024px canvas and the head layer on 2048px, or if one hat sits
40px left of another, the collection looks broken and you will be hand-fixing 1,111 images.

So: **generate an anchor sheet first, before any trait art.**

### Canvas + anchors

| Thing | Value |
|---|---|
| Master canvas | `2048 × 2048` PNG, RGBA, transparent |
| Mint/export size | `1024 × 1024` (downscale at build time) |
| Body center X | `1024` |
| Eye line Y | `880` |
| Muzzle center Y | `1120` |
| Head top Y | `560` |
| Shoulder line Y | `1500` |
| Safe margin | 96px on all sides — nothing bleeds to the edge except Background |

### Anchor sheet workflow

1. Generate **one** base body — the plain dog, no traits, front-facing 3/4 chest-up crop, on
   transparent. This is `layers/02-fur/fur-cream.png`.
2. Open it, and export a **guide PNG**: the base body at 30% opacity with horizontal rules
   drawn at the anchor Y values above. Save as `art/anchor-sheet.png`.
3. Every subsequent layer prompt gets the guide image attached as a reference with the
   instruction *"align to this exact head position and scale, output only the new element on
   transparent background."*
4. If your image model can't take a reference image, generate traits **on top of the base
   body** and mask the body out afterwards — slower, but alignment stays perfect. A 10-line
   `sharp` script does the masking; see `generator/tools/extract-layer.js`.

> Real talk: image models drift. Budget for hand-nudging maybe 15–20% of layers in any editor
> that can move a PNG. That's an hour of work, not a week, and it's unavoidable.

---

## 2. Z-order (bottom → top)

Draw order is non-negotiable — it's what makes glasses sit on top of eyes and hats sit on top
of ears.

| # | Folder | Layer | Count | Can be None? | Notes |
|---|---|---|---|---|---|
| 00 | `00-background` | Background | 14 | no | Full-bleed flat color/pattern |
| 01 | `01-backdrop` | Backdrop Prop | 8 | **yes** | Sits behind the dog — moon, sign, clouds |
| 02 | `02-fur` | Fur / Base Body | 12 | no | Includes ear shape (floppy vs pricked) |
| 03 | `03-marking` | Body Marking | 9 | **yes** | Spots, eyepatch, tuxedo chest |
| 04 | `04-outfit` | Outfit | 18 | **yes** | Drawn over chest/shoulders only |
| 05 | `05-mouth` | Mouth | 9 | no | Tongue, grin, teeth, cigar |
| 06 | `06-eyes` | Eyes | 12 | no | Must clear the eyewear layer above |
| 07 | `07-headwear` | Headwear | 16 | **yes** | Overlaps ears — see exclusions |
| 08 | `08-eyewear` | Eyewear | 9 | **yes** | Always over eyes, under headwear brim |
| 09 | `09-held` | Held Item | 12 | **yes** | Bottom-left paw position, fixed anchor |
| 10 | `10-overlay` | Overlay FX | 6 | **yes** | Scanlines, sparkle, laser eyes glow |

**125 individual layer assets. 11 categories.**

### Combination space

```
14 × 9 × 12 × 10 × 19 × 9 × 12 × 17 × 10 × 13 × 7  =  479,975,932,800
```

**~480 billion** possible combinations for a 1,111 supply. You have absurd headroom — which
matters, because rarity weighting and exclusion rules will cut the *usable* space by an order
of magnitude and you still won't come close to running out.

---

## 3. Rarity

Rarity is just an integer weight per file. Higher = more common. The generator picks within a
category using weighted random.

Weights live in `generator/config.js`. The convention used there:

| Tier | Weight | Roughly | Example |
|---|---|---|---|
| Common | `100` | ~30% of a category | plain cream fur |
| Uncommon | `45` | ~14% | puffer jacket |
| Rare | `15` | ~5% | gold rope chain |
| Epic | `5` | ~1.5% | crown |
| Legendary | `1` | ~0.3% (≈3 of 1,111) | laser eyes |

You can also encode weight **in the filename** — `crown#5.png` — which is the HashLips
convention. `generator/build.js` reads both; filename wins if present, so you can retune
rarity by renaming files without touching config.

**Do not hand-tune to exact counts.** Weighted random on 1,111 pulls gives you natural
variance, and that variance is what makes rarity feel real instead of manufactured. If you
truly need "exactly 3 crowns", use the `forced` block in config (see §5).

---

## 4. Exclusion rules (the part everyone forgets)

Some combinations are physically broken. The generator rejects and rerolls them.

```js
exclusions: [
  // Big hats crush pricked ears
  { when: ['fur:husky-pricked','fur:shiba-pricked'], forbid: ['headwear:bucket-hat','headwear:cowboy'] },

  // Sunglasses over closed/sleeping eyes reads as a bug, not a trait
  { when: ['eyes:sleepy','eyes:closed-happy'], forbid: ['eyewear:*'] },

  // Laser eyes ARE the eyes — nothing goes over them
  { when: ['eyes:laser'], forbid: ['eyewear:*'] },

  // Cone of shame occupies the whole neck; no outfit, no chain
  { when: ['headwear:cone-of-shame'], forbid: ['outfit:*','eyewear:*'] },

  // Two things in the same paw
  { when: ['held:tennis-ball'], forbid: ['held:*'] },

  // Dark bg + dark fur = invisible dog at avatar size
  { when: ['background:midnight','background:void'], forbid: ['fur:cocoa','fur:black-lab'] },
]
```

Wildcards: `fur:*` matches any non-None option in that category; `eyes:!laser` matches any
non-None option *except* laser. Rule of thumb: **write an exclusion the moment you look at a
preview and go "that looks wrong"** — don't try to predict them all up front. Run
`npm run preview -- 60` after every layer batch and you'll catch them fast.

> **Exclusions suppress effective rarity.** A heavily-excluded trait shows up far less often
> than its weight suggests, because most of the rolls that select it get thrown away.
> `cone-of-shame` has weight 12 but forbids all outfits, all eyewear and all overlays — in a
> real 1,111 build it lands around 3 pieces, not ~12. That's usually fine (it's a legendary
> either way), but if you need a specific count, use `forced` instead of guessing at weights.

---

## 5. Uniqueness (DNA)

Every generated combination is hashed into a **DNA string**:

```
00-background:sky|01-backdrop:none|02-fur:cream|03-marking:eyepatch|...
```

That string goes into a `Set`. Collision → discard and reroll. With 480B combinations and
1,111 pulls, collisions are essentially nonexistent, but the check costs nothing and protects
you if you ever slash the layer set.

`forced` pins exact counts. Four fields:

| | |
|---|---|
| `trait` | pin one category |
| `traits` | pin several at once — a **locked chase tier**, where every piece shares a look |
| `name` | labels the tier and emits a `Tier` attribute in the metadata |
| `reserve` | traits this tier owns exclusively, blocked from every ordinary piece |

```js
forced: [
  // The chase. 10 Dawg Kings, one locked look, crown exists nowhere else.
  {
    name: 'Dawg King',
    count: 10,
    traits: [
      'headwear:crown', 'outfit:gold-chain', 'eyes:glowing',
      'eyewear:none', 'background:sunburst', 'fur:golden-floppy',
    ],
    reserve: ['headwear:crown'],
  },

  { trait: 'eyes:laser',         count: 3  },
  { trait: 'overlay:pixel-mode', count: 11 },  // the GameDawg tier
  { trait: 'fur:ghost-white',    count: 7  },
]
```

Single-trait pins block that value from the random fill, so the count stays exact. A
multi-trait tier deliberately blocks **nothing** by default — its individual traits should
still show up on ordinary pieces, since it's the *combination* that's rare, and DNA
uniqueness already prevents duplicates. `reserve` is how you carve out the exceptions.

Kings still roll their own marking, mouth, held item, backdrop and overlay, so the ten are
visibly siblings without being ten copies of one image.

> **If a prize is attached to pulling a chase tier, disclose it before the mint** — on the
> site and in the metadata. An undisclosed payout tier is how a mint gets accused of being
> rigged for insiders, and that accusation sticks whether or not it's true.

---

## 6. Metadata — Solana / Metaplex

Solana NFTs use the **Metaplex Token Metadata** JSON standard. One `.json` per token, matching
the image filename. `build.js` emits these automatically.

```json
{
  "name": "Pump Dawg #1",
  "symbol": "DAWGS",
  "description": "A collection of 1,111 pump dawgs.",
  "image": "1.png",
  "attributes": [
    { "trait_type": "Background", "value": "Sky" },
    { "trait_type": "Fur",        "value": "Cream" },
    { "trait_type": "Outfit",     "value": "Puffer Jacket" },
    { "trait_type": "Headwear",   "value": "Backwards Cap" },
    { "trait_type": "Eyes",       "value": "Sleepy" },
    { "trait_type": "Mouth",      "value": "Tongue Out" }
  ],
  "properties": {
    "files": [{ "uri": "1.png", "type": "image/png" }],
    "category": "image",
    "creators": [{ "address": "<YOUR_WALLET>", "share": 100 }]
  },
  "seller_fee_basis_points": 500
}
```

Notes that actually matter:

- **Omit "None" traits entirely.** Do not emit `{"trait_type":"Eyewear","value":"None"}` —
  marketplaces (Tensor, Magic Eden) count that as a real trait and it pollutes rarity ranking.
  `build.js` drops them by default; flip `emitNoneTraits: true` in config if you disagree.
- `seller_fee_basis_points: 500` = 5% royalty. Solana royalties are enforced only if you mint
  as **pNFT** (programmable NFT) — otherwise they're a suggestion. Decide before you upload.
- Filenames are `0.png`/`0.json` or `1.png`/`1.json`. Sugar accepts both; be consistent.

### Upload path (Metaplex Sugar)

```bash
# 1. build the collection
cd generator && npm install && npm run build -- 1111

# 2. install sugar
bash <(curl -sSf https://sugar.metaplex.com/install.sh)

# 3. config + upload + deploy
sugar launch
```

`sugar launch` walks you through `config.json`, uploads assets (Bundlr/Irys → Arweave),
creates the candy machine, and sets the guards (price, start date, allowlist). Verify on
devnet first — `solana config set --url devnet` — and mint 5 to yourself before you touch
mainnet.

---

## 7. File naming — copy this exactly

```
generator/layers/
  00-background/   sky#100.png  mint#100.png  void#5.png ...
  01-backdrop/     none#300.png  bodega-awning#20.png ...
  02-fur/          cream#100.png  shiba-pricked#60.png ...
  03-marking/      none#200.png  eyepatch#25.png ...
  04-outfit/       none#150.png  puffer-jacket#45.png ...
  05-mouth/        smile#100.png  tongue-out#70.png ...
  06-eyes/         dots#100.png  laser#1.png ...
  07-headwear/     none#180.png  crown#5.png ...
  08-eyewear/      none#250.png  shades#30.png ...
  09-held/         none#200.png  tennis-ball#40.png ...
  10-overlay/      none#400.png  sparkle#8.png ...
```

- lowercase, hyphenated, `#weight` before `.png`
- the folder number **is** the z-order — the generator sorts by it, so never renumber casually
- `none.png` is a genuine 2048×2048 fully-transparent PNG, not a missing file.
  Generate them all in one shot: `npm run make-none`

---

## 8. The actual order of operations

1. Pick a concept → paste its style block into `art/prompts/00-style.md`
2. Generate the **base body** → build `art/anchor-sheet.png`
3. Run the prompt packs in `art/prompts/` (see `PROMPT-PACK.md`) — 125 layers, ~11 batches
4. Drop PNGs into `generator/layers/<nn>-<category>/` with `#weight` suffixes
5. `npm run make-none` to fill in the transparent None files
6. `npm run preview -- 60` → eyeball a contact sheet, write exclusion rules for anything ugly
7. Repeat 6 until clean
8. `npm run build -- 1111` → `output/images/` + `output/json/` + `output/_rarity.json`
9. `sugar launch` on **devnet**, mint a few, check they render on Tensor devnet
10. Mainnet
