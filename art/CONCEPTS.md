# PUMP DAWGS — Four Concept Directions

> **Naming note:** the brand string lives in exactly one place — `assets/js/brand.js` →
> `BRAND.name`. Currently `PUMP DAWGS` / ticker `$DAWGS`. Change it there and every page,
> every doc header, and the generator metadata follows. Spelling was taken literally from
> "b-a-w-g-e-s"; if you meant `DAWGS`, it's a one-line edit.

**The lineage:** pumpkets = 1,111 hand-drawn cats on Solana with a paired pump.fun token.
The art is deliberately *bad on purpose* — thick wobbly marker lines, flat pastel fills,
zero shading. That "a kid drew this in 40 seconds" quality is the entire moat. It reads
instantly on a 64px timeline avatar, it's impossible to take seriously, and it's cheap to
produce 1,111 of.

**Our job:** do the dog version without looking like a trace-over. Below are four directions,
ranked by how defensible they are. Each one includes the exact **style block** you paste at
the top of every ChatGPT / image-model prompt so all 110 layers come out looking like
siblings.

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

## Recommendation

**Ship Concept 1 as the base collection, steal Concept 2's trait list.**

That combination is the actual play. Concept 1's render style is proven, fast, and reads at
avatar size. Concept 2's *content* — the chopped cheese, the chains, the puffers — is where
the personality and the screenshot-ability live, and none of it requires changing the line
style. You get in-family art with out-of-family traits.

Hold Concept 3 (GameDawg) as a **1/1 / special-edition tier** — 11 pixel dawgs inside the
1,111 as the top rarity band. It's cheap to make and it's a real "holy shit" pull.

Concept 4 is the merch language, not the mint. Use it for the plushie render and the hero
image on the site, not for 1,111 supply.

Everything downstream in this repo (`LAYER-SPEC.md`, `prompts.json`, `generator/`) is
written **style-agnostic** — you swap one style block in `art/prompts/00-style.md` and the
same 110 layer definitions produce whichever concept you picked.
