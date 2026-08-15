# GOATSE 🐐

**2,222 goats on Solana, with a paired token.**

Greatest of all time. The rest is elevation.

This directory is the whole project: **all 134 art layers drawn in code**, a working
generator that outputs mint-ready images + Metaplex metadata, the site, the prompt library,
and the launch kit. The collection builds end-to-end today.

> **Naming:** `GOATSE`, ticker `$GOATSE`. Set in exactly two places — `BRAND` in
> `assets/js/brand.js` (site) and `name`/`symbol` in `generator/config.js` (metadata).
> Nothing else hardcodes it.

---

## Build the collection

```bash
cd generator
npm install
npm run art              # draws all 134 layers (~25s)
npm run preview -- 36    # contact sheet -> output/_preview.png
npm run build -- 2222    # full collection + Metaplex metadata + rarity report
```

`generator/layers/` and `generator/output/` are gitignored on purpose — 142 layer PNGs at
2048px and 2,222 renders don't belong in git, and `npm run art` reproduces them
byte-for-byte from source. Committed sample renders live in [`showcase/`](showcase/).

Other commands:

| | |
|---|---|
| `npm run sheet -- 07-horns` | render every option in one category over the same base goat |
| `npm run sheet` | one QA sheet per category |
| `npm run art -- riso` | re-render every layer in the off-register risograph style |
| `npm run showcase` | regenerate the site images, X banner and PFP |
| `npm run dry -- 2222` | exclusions, forced counts and rarity only — no compositing (fast) |
| `npm run make-none` | rewrite the transparent `none` layers |

For the site:

```bash
python3 -m http.server 8000   # from goatse/, then open http://localhost:8000
```

---

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site — the play, the art direction, the layer system, rarity, build steps, FAQ |
| `lab.html` | **Prompt Lab** — all 134 prompts, searchable, filterable by tier, one-click copy |
| `art/prompts.json` | **Source of truth** — all 134 layer definitions, weights, tiers, anchors and prompts |
| `art/prompts/` | Generated paste-ready batch files, one per category |
| `art/build-prompt-packs.js` | Regenerates `art/prompts/*.md` + `assets/js/prompts-data.js` from the JSON |
| `art/CONCEPTS.md` | The shipped art direction plus the alternatives, with the reasoning |
| `art/LAYER-SPEC.md` | How the layering actually works: anchors, z-order, rarity, exclusions, Metaplex |
| `generator/tools/draw-layers.js` | **Draws all 134 layers** — the artwork, in code |
| `generator/tools/lib/draw.js` | Ink toolkit; `alpine` and `riso` style presets; the `taper` horn primitive |
| `generator/tools/make-sheet.js` | Per-category QA sheets |
| `generator/tools/make-showcase.js` | The committed site art, banner and PFP |
| `generator/config.js` | Draw order, exclusions, forced counts, royalties, metadata |
| `generator/build.js` | The compositor: DNA rolling, exclusion rerolls, images, JSON, rarity |
| `docs/LAUNCH-KIT.md` | X and Discord copy, banner specs, launch sequence |
| `showcase/` | Committed sample renders used by the site |

---

## How the art works

There is no image model in this pipeline. Every layer is a JavaScript function that draws
shapes into a 2048×2048 canvas against the anchors declared in `art/prompts.json`:

```
bodyCenterX 1024 · skullTopY 620 · eyeLineY 880 · muzzleCenterY 1210
hornBaseY 660 · beardTipY 1560 · shoulderLineY 1560 · heldItem (470, 1620)
```

Because every layer is placed by the same arithmetic, alignment is exact by construction —
no anchor sheet, no drift, no hand-nudging a fifth of the output. Retune a colour or a horn
curve and re-run: twenty-five seconds for all 134.

Everything is seeded per layer (`makeRng('alpine|07-horns|scimitar')`), so a rebuild is
byte-identical and editing one layer never reshuffles the others.

### The horn primitive

Fourteen horn silhouettes come from one function. `taper(spine, width)` walks a list of
centre points, offsets left and right by a half-width law, and returns a closed ring. Each
horn is that call with a different set of art-directed control points:

```js
const HORN_SPINES = {
  scimitar: [[88, 686], [190, 510], [332, 384], [492, 336], [606, 380]],
  ibex:     [[84, 690], [150, 480], [238, 310], [344, 186], [456, 152]],
  markhor:  [[90, 686], [148, 524], [96, 394], [176, 262], [112, 138], [204, 40]],
  // ...
};
```

Same taper law, same ink weight, same growth rings — so nubs and markhor spirals still read
as coming off the same animal. That's the reason the horn category can carry fourteen
options without the collection falling apart.

### Why a goat and not a re-skinned dog

Four features do the work, and the system protects all four:

1. **Horizontal bar pupils.** Every eye variant that isn't explicitly closed or transformed
   keeps the rectangular pupil.
2. **Horns as the crown category.** The horn silhouette is what you read at 64px, so it gets
   the most options and the tightest exclusion rules.
3. **A beard below the chin**, not off the lip — one cohesive wedge with hair strokes through
   it.
4. **Ear carriage baked into the coat.** Upright, lop and shag change the silhouette, not just
   the colour, so splitting them into a separate trait would let the two contradict each other.

---

## Rarity

Weights live in the filenames (`crown#22.png`), so the rarity on the site is the rarity the
generator actually rolls. Four tiers, presented on the site as altitude bands:

| Tier | Band | Share of layer weight |
|---|---|---:|
| Common | Foothills, 0 – 2,000 m | ~57.8% (53 layers) |
| Uncommon | Treeline, 2,000 – 4,500 m | ~28.1% (40 layers) |
| Rare | High Camp, 4,500 – 7,000 m | ~12.0% (29 layers) |
| Legendary | Summit, 7,000 – 8,848 m | ~2.1% (12 layers) |

Six headline traits are **guaranteed exact** — seeded first, then blocked from the weighted
roll so they can't drift upward: 8 laser eyes, 22 crystal horns, 22 crowns, 14 ghosts,
8 gilded, 22 pixel mode.

Eight of the twelve categories can come up empty. Each ships a real transparent `none` PNG —
a missing file would mean the category is never empty and the whole rarity table would be
quietly wrong.

---

## Forking it

1. Rename: `BRAND` in `assets/js/brand.js`, `name`/`symbol` in `generator/config.js`.
2. Set `creators[0].address` in `generator/config.js` to your wallet before uploading.
3. Edit `art/prompts.json` to add or remove layers, then
   `node art/build-prompt-packs.js` to regenerate the docs and site data.
4. Add a matching draw function in `generator/tools/draw-layers.js` — the build **fails
   loudly** listing any layer in the JSON that has no draw function, so the two can't drift.
