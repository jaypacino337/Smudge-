# PUMP DAWGS — Concept Directions

> **Naming note:** the brand string lives in exactly one place — `assets/js/brand.js` →
> `BRAND.name`. Currently `PUMP DAWGS` / ticker `$DAWGS`. Change it there and every page,
> every doc header, and the generator metadata follows.

> ## ✅ SHIPPED: Concept 0 — QUANTUM DAWGS
>
> **This is what's actually drawn.** All 125 layers exist as real PNGs in
> `generator/layers/`, drawn procedurally by `generator/tools/draw-layers.js`. Run
> `npm run art` to regenerate them, `npm run art -- crayon` for the Concept 1 look.
> Concepts 1–4 below are kept as alternative directions.

**The lineage:** pumpkets = 1,111 hand-drawn cats on Solana with a paired pump.fun token —
crude marker art, flat pastel fills. Quantum Cats = 3,333 Bitcoin Ordinals with the opposite
approach: confident heavy ink linework, cel shading, saturated colour, cosmic backgrounds.
It looks *illustrated* rather than *scribbled*.

**Our job:** do the dog version. Below are the directions considered; the one we shipped is
Concept 0.

---

## Concept 0 — QUANTUM DAWGS  *(shipped)*

**One-liner:** Quantum Cats' ink-and-cel confidence, but dogs.

**Vibe:** Heavy black ink outlines (20px at 2048), drawn with a steady hand — no wobble.
Two tones per element: a flat base colour plus one cel shadow, light fixed at the upper
left. Saturated palette. Big expressive eyes with a hard white catchlight. Cosmic
backgrounds — nebula, starfields, sunbursts — alongside flat brights.

**Palette:** the fur set stays warm and natural (`#F5EFE3` → `#2F2F3A`), everything else goes
loud: `#E04A34`, `#FFC93D`, `#B8E635`, `#3FC7C0`, `#8B5CF6`, `#FF3D8B`.

**Why it works:** it reads as *made*, not as a shitpost. That's a different bet than
pumpkets — you're competing on craft instead of on being disposable. It also survives a
64px avatar crop better than crayon art does, because the shapes are cleaner.

**Risk:** the "ugly on purpose" meta rewards low-effort art, and this is visibly high-effort.
If the audience you want is pure degen, Concept 1 is the safer read.

**How it's produced:** procedurally, not by an image model. Every layer is drawn by the same
arithmetic, so alignment is exact by construction — no anchor sheet, no drift, no hand
cleanup. See §"Why procedural" at the bottom.

---

## Concept 1 — CRAYON DAWGS  *(the safe money)*

**One-liner:** The pumpkets house style, but dogs, and dumber.

**Vibe:** Fat black marker outlines that don't quite close. Fills that go outside the lines.
Flat pastel backgrounds with no gradient. Every dog has the same 3/4 chest-up crop, arms
occasionally visible holding something stupid. Mouths are a single wobbly curve. Eyes are
two black dots with a white highlight that is off-center on purpose.

**Palette:** cream `#F5EFE3`, tan `#E8B96A`, cocoa `#8C5A3C`, ash `#B8B5AE`, ink `#1A1A1A`.
Backgrounds pull from a fixed 12-swatch pastel set (sky, mint, peach, lilac, butter…).

**Why it works:** It's the proven format. The meta rewards *recognizably in-family* over
*original*. Cheapest to produce, fastest to 1,111, reads perfectly at avatar size.

**Risk:** Closest to accusations of being a straight clone. Mitigate with dog-native traits
cats can't have — floppy vs pricked ears as a *base-body* trait, tongue-out states, cones of
shame, tennis balls, leashes held by nobody.

**Style block:**
```
Hand-drawn children's marker illustration. Thick uneven black outline (12-16px at 2048px),
lines wobble and occasionally fail to close. Flat fill colors, absolutely no gradients, no
shading, no texture, no highlights except one small white dot in each eye. Slightly crooked
proportions. Naive, charming, drawn in under a minute. Transparent background. Centered
subject, 3/4 chest-up crop.
```

---

## Concept 2 — BODEGA DAWGS  *(the most personality)*

**One-liner:** Corner-store street dogs. Every dawg looks like it has a guy.

**Vibe:** Same crude hand-drawn line as Concept 1, but the *content* is all NYC bodega —
chopped cheese, deli cups, lotto scratchers, gold rope chains, do-rags, puffer jackets,
folding chairs. Backgrounds are cheap flat gradients of storefront awning stripes and
security-shutter corrugation. Sticker-slap energy: some traits are rendered as literal
stickers with a white die-cut border.

**Palette:** grittier — awning red `#D6402F`, shutter grey `#7A7F84`, lotto yellow `#F5C518`,
bodega green `#1F7A4C`, ink `#141414`.

**Why it works:** Trait *narrative* is the thing people screenshot. "The dawg with the
chopped cheese and the broken chain" is a sellable identity in a way "blue background, red
hat" is not. Gives the Discord something to riff on daily.

**Risk:** Regional. A lot of the humor doesn't land outside US-east crypto Twitter. Also
more drawing per trait, so slower to 110 layers.

**Style block:**
```
Crude hand-drawn marker illustration, NYC bodega street aesthetic. Thick black outline,
flat fills, no shading. Objects look like cheap printed stickers with a 6px white die-cut
border. Deliberately unpolished, streetwear-adjacent, slightly grimy color palette.
Transparent background. Centered subject, 3/4 chest-up crop.
```

---

## Concept 3 — GAMEDAWGS  *(the cheapest to scale)*

**One-liner:** 32×32 pixel dogs on a candy-colored DMG palette.

**Vibe:** Hard pixel grid, 4 shades per element, no anti-aliasing anywhere. Upscaled to
2048px with nearest-neighbor so every pixel is a crisp 64px block. Optional CRT scanline +
subtle chromatic fringe as a *foreground* layer so it's a rarity trait, not a global filter.

**Palette:** four ramps of 4, swapped per-trait — DMG green, gameboy-pocket grey, hot candy
(pink/magenta), and a rare "virtual boy" red/black.

**Why it works:** Pixel art is *mechanically* perfect for layering — everything snaps to a
grid, alignment errors are impossible, and a model that can't draw a consistent marker line
can absolutely place 32×32 blocks. You could realistically hand-fix any bad layer in
Aseprite in two minutes. Also the most visually distinct from pumpkets.

**Risk:** Pixel PFPs are a crowded, slightly tired category. You win on execution and the
token narrative, not on novelty.

**Style block:**
```
32x32 pixel art sprite, upscaled 64x with nearest-neighbor, no anti-aliasing, no blur.
Exactly 4 colors per element from the supplied ramp plus transparent. Hard 1px black-ish
outline. Pixels perfectly aligned to the 32x32 grid. Retro handheld console aesthetic.
Transparent background. Subject centered in frame.
```

---

## Concept 4 — PUFFY DAWGS  *(the premium swing)*

**One-liner:** Soft vinyl-toy dogs rendered as puffed-up glossy stickers.

**Vibe:** Rounded claymation/blind-box forms, matte body with one soft specular highlight,
thick white sticker outline and a hard drop shadow so every layer looks physically stacked
on the one below it. Backgrounds are single-color with a subtle grain.

**Palette:** toy-store — bubblegum `#FF8FB1`, sherbet `#FFB86B`, mint `#7BE0C0`,
periwinkle `#9BA7FF`, always on a cream `#FAF5EC` base.

**Why it works:** Looks *expensive*. Stands out hardest in a feed of flat marker PFPs. Best
long-term merch/plush path — these designs translate directly to physical product.

**Risk:** By far the hardest to keep consistent across 110 layers, because lighting direction
and highlight softness drift between generations. Needs a locked seed/reference image and
probably manual cleanup. Also fights the "ugly on purpose" meta the category currently rewards.

**Style block:**
```
Soft 3D vinyl toy render, puffy rounded forms, matte surface with a single soft specular
highlight from the upper left at a fixed 45 degrees. Thick white sticker die-cut outline
(20px at 2048px) and a hard offset drop shadow 24px down-right at 30% opacity. No texture
detail, no rim light. Blind-box collectible aesthetic. Transparent background. Centered
subject, 3/4 chest-up crop.
```

---

## What shipped, and why

**Concept 0 (Quantum Dawgs) render style + Concept 2's trait content.**

The traits are all Bodega: chopped cheese, deli cups, rope chains, puffers, lotto
scratchers, do-rags. That's where the personality and the screenshot-ability live. The
*rendering* is Quantum — heavy ink, cel shading, cosmic backgrounds — so it looks made
rather than scribbled.

GameDawg survives as an 11-piece tier inside the 1,111, wired up as the `pixel-mode`
overlay in `generator/config.js` → `forced`. Puffy is the merch language, not the mint.

`npm run art -- crayon` re-renders the whole collection in the Concept 1 marker style if you
change your mind. Nothing else has to change — same 125 layer definitions, same generator.

---

## Why procedural instead of an image model

Every layer is drawn in code (`generator/tools/draw-layers.js`), not prompted. That was a
deliberate trade:

**What you give up.** Procedural art can't do texture, incidental detail, or the small
imperfections a human illustrator brings. These dawgs are geometry — clean shapes, clean
curves. Next to hand-drawn Quantum Cats, they read as simpler. A real illustrator would beat
this, and if the collection takes off, hiring one to redraw the 125 layers against the same
anchors is a drop-in upgrade — the generator doesn't care where the PNGs came from.

**What you get.**
- **Alignment is exact by construction.** Every hat lands on the same skull because it's the
  same arithmetic. No anchor sheet, no reference images, no drift, no hand-nudging 20% of
  the output — which is normally the single biggest time sink in a generative launch.
- **The whole set redraws in ~20 seconds.** Change a palette, a shape, the line weight, or
  the entire style, and re-run. Iterating on 125 prompted images would take days per pass.
- **Deterministic.** Same seed, byte-identical PNGs, forever. You can always reproduce the
  collection from source.
- **The style is a parameter.** `quantum` and `crayon` are two presets in
  `generator/tools/lib/draw.js`. Adding a third is a config block, not a re-draw.

The prompt packs in `art/prompts/` are still there and still valid — if you'd rather have an
image model draw the layers, the specs, anchors and filenames are unchanged. Drop the PNGs
into `generator/layers/` with the same names and everything downstream works identically.
