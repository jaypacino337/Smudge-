# GOATSE — layer spec

How the 134 layers actually compose. `prompts.json` in this directory is the source of
truth; this file explains what the numbers in it mean.

---

## 1. Canvas and anchors

Master canvas is **2048 × 2048**, exported at 1024. Every layer draws against the same
anchors, declared once in `prompts.json` and read by the art engine at startup — so the docs
and the artwork cannot disagree.

| Anchor | Value | What sits there |
|---|---:|---|
| `bodyCenterX` | 1024 | vertical centre line of the whole goat |
| `skullTopY` | 620 | top of the cranium, before horns |
| `hornBaseY` | 660 | horns emerge at x = 940 and 1108 |
| `eyeLineY` | 880 | both eyes, centred at x = 872 and 1176 |
| `muzzleCenterY` | 1210 | nostrils and mouth |
| `beardTipY` | 1560 | bottom of the beard |
| `shoulderLineY` | 1560 | garment neckline |
| `heldItemX/Y` | 470, 1620 | the hoof holding the held item |

The skull outline is a wedge — widest at the cheekbone (y ≈ 832, half-width 382), tapering
to a chin at y = 1376. It is defined **once**, in `HEAD_R` in `draw-layers.js`, and every
category that needs to stay inside the head (markings, the muzzle plane) clips to it.

---

## 2. Z-order

Bottom to top. This is `layerOrder` in `generator/config.js`; the folder names must match
exactly.

| z | Folder | Trait | Notes |
|---:|---|---|---|
| 00 | `00-background` | Background | opaque, full bleed, the only layer with no transparency |
| 01 | `01-backdrop` | Backdrop | scenery behind the goat; must stay outside a 620px radius of (1024, 1000) |
| 02 | `02-coat` | Coat | the goat itself — neck, ears, skull, muzzle plane, beard |
| 03 | `03-marking` | Marking | painted inside the skull silhouette |
| 04 | `04-outfit` | Outfit | shoulders and chest, neckline at y = 1560, never above the jaw |
| 05 | `05-mouth` | Mouth | nostrils, lips, and whatever is in them |
| 06 | `06-eyes` | Eyes | both eyes on the eye line |
| 07 | `07-horns` | Horns | drawn **over** the ears — horns are in front of them on a real goat |
| 08 | `08-headwear` | Headwear | over the horns, which is why big-brim hats are excluded against big horns |
| 09 | `09-eyewear` | Eyewear | on the eye line, temples running back |
| 10 | `10-held` | Held Item | one hoof, lower left, nothing above y = 1250 |
| 11 | `11-overlay` | Overlay | full bleed, on top of everything, deliberately restrained |

**Horns before headwear** is the one ordering choice worth explaining. A beanie knitted
around the horns needs the horns underneath it, so the headwear can sit on top and read as
"worn". The cost is that a wide-brimmed hat over a tall horn set looks broken — which is
what the exclusion rules in §5 are for.

---

## 3. Rarity weights

Weights live in the **filename**: `crown#22.png` has weight 22. `build.js` parses them at
load, so there is no second table to fall out of sync with the art.

Weight is relative *within a category only*. A weight of 100 in Background and a weight of
100 in Horns are not comparable — each category normalises against its own total.

Tiers (`common` / `uncommon` / `rare` / `legendary`) are editorial labels in `prompts.json`.
They drive the site's rarity bands and the Prompt Lab filters. They do **not** feed the
generator — the weights do. If you re-tier a layer, re-weight it too or the two will say
different things.

---

## 4. The `none` trait

Eight categories can come up empty: backdrop, marking, outfit, horns, headwear, eyewear,
held item, overlay.

A None must be a **real fully-transparent PNG on disk**, at `none#<weight>.png`. The
generator picks from what it finds in the folder — a missing `none.png` silently means the
category is never empty, and every rarity figure for that category is then wrong.

`npm run art` writes them automatically. `npm run make-none` rewrites just the None files if
you re-tune a `noneWeight` without redrawing everything.

`emitNoneTraits: false` in config keeps None **out of the emitted metadata** — a token
without a hat has no Headwear attribute at all, rather than `Headwear: None`. This is the
convention marketplaces expect and it makes trait-filter counts read correctly.

---

## 5. Exclusions

`config.exclusions` is a list of `{ when: [...], forbid: [...] }`. If any `when` token
matches the rolled combination, every `forbid` token is checked; a hit rejects the whole
combination and the generator rerolls.

Token grammar:

| Token | Matches |
|---|---|
| `horns:scimitar` | exactly that value |
| `eyewear:*` | any non-none value in that category |
| `eyes:!laser` | any non-none value **except** laser |

The fourteen rules fall into four families:

- **Physical collision** — a cowboy hat cannot sit over ibex horns; goggles on the forehead
  and goggles on the eyes are the same pair of goggles.
- **Reads as a bug** — eyewear over closed or spiralling eyes looks like a rendering error,
  not a trait.
- **Invisible at avatar size** — a black goat on a void background, a translucent ghost coat
  over a busy backdrop.
- **Redundant** — gold coat + gold horns + gold background + gold pickaxe. Pick one.

Cost: every rule tightens the combination space. `maxRerolls` (50,000) is the abort valve —
if you add rules until the generator can't fill the supply, it stops with an error instead of
looping forever.

---

## 6. Forced counts

Weighted random drifts. A trait weighted for "about 8" will land anywhere from 3 to 15 over
2,222 rolls, which is not good enough for a headline number you have published.

`config.forced` seeds those combinations **first**, at exact counts, and then adds each
forced value to a `blocked` set so the subsequent weighted rolls can never produce it again.
That is what makes the count exact rather than a floor:

```js
forced: [
  { trait: 'eyes:laser',         count: 8  },
  { trait: 'horns:crystal',      count: 22 },
  { trait: 'headwear:crown',     count: 22 },
  { trait: 'coat:ghost-white',   count: 14 },
  { trait: 'coat:gilded',        count: 8  },
  { trait: 'overlay:pixel-mode', count: 22 },
]
```

Forced picks still go through the exclusion checker, so you cannot force a combination the
rules forbid.

---

## 7. Determinism

Three separate seeds, all stable:

- **Layer art** — `makeRng('<style>|<category>|<file>')`. Editing one layer's draw function
  never changes any other layer's PNG.
- **Collection DNA** — `config.seed` (`'goatse-v1'`). Same seed, same 2,222 combinations, in
  the same order.
- **Token shuffle** — derived from the same seed, so which DNA lands on which token id is
  also reproducible.

Change `config.seed` and you get a different collection. Change nothing and rebuild, and you
get the same bytes.

---

## 8. Metaplex output

`npm run build -- 2222` writes:

```
generator/output/
  images/1.png … 2222.png     final art at config.export (1024px)
  json/1.json  … 2222.json    Metaplex token metadata
  _rarity.json                per-trait counts and percentages
  _dna.txt                    one DNA string per token, in id order
  _preview.png                contact sheet (--preview runs only this)
```

Each token JSON carries `name`, `symbol`, `description`, `image`, `attributes`,
`seller_fee_basis_points`, and `properties.creators`. Set `creators[0].address` to a real
wallet before uploading — the build prints a warning while it is still the placeholder.
