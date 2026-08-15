# GOATSE — art direction

The shipped direction, why it won, and the four alternatives it beat.

---

## Shipped: Alpine Ink

**Implemented.** `npm run art` (the default, style preset `alpine`).

Heavy confident black ink at 20px on a 2048px canvas, flat saturated colour, two-tone cel
shading with the light raked from the upper left. Near-zero line wobble (0.006) — across
2,222 renders, a shaky line reads as noise rather than as hand-drawn.

Palette is alpine rather than cosmic: bone, glacier blue, moss, oxblood, cobalt, and one
signal orange doing all the shouting. Backgrounds are flat with a soft vignette so they
never compete with the line work on top.

**Why it won.** It survives the 64-pixel test. Memecoin PFPs live as avatars, and heavy ink
plus flat colour is the only treatment on this list that still reads as a specific goat at
avatar size. It's also the direction where the horn silhouette — the thing that carries the
whole collection — stays legible against every background.

---

## Also implemented: Riso

**Implemented.** `npm run art -- riso`.

The risograph poster look. Thinner ink (13px), no cel shading, higher wobble, and the fill
deliberately printed 11px off-register from the line — like a two-colour screen that didn't
line up.

It's genuinely lovely at large sizes and genuinely mushy at 64px, which is why it's the
alternate and not the default. It ships because re-rendering all 134 layers in it takes one
flag, and it's the right choice for posters, the X banner, and merch.

---

## Considered and rejected

### 1. Woodcut / scientific plate

Engraved cross-hatching, no flat fill, sepia on cream — the goat as a plate from a Victorian
natural-history book. The hatching toolkit for this exists (`D.hatch`), and it's the most
*distinctive* direction on the list.

**Rejected because** hatching is the worst possible texture at avatar size — it aliases into
grey mud. It also fights the trait system: every garment and every horn would need its own
hatch density hand-tuned, and there are 134 of them.

### 2. Chunky 8-bit

32×32 pixel grid, hard palette, no anti-aliasing. Cheap to produce, reads perfectly at small
sizes, and the horn silhouettes would stay crisp.

**Rejected because** a 32px grid cannot hold fourteen distinguishable horn shapes — scimitar,
alpine sweep and boer curl collapse into the same six pixels. The whole point of the
collection is the horn category. It survives as the `pixel-mode` overlay instead, at 22
tokens.

### 3. Airbrushed 3D

Soft gradients, rim light, glossy horns. What most collections reach for.

**Rejected because** it is what most collections reach for. It also can't be drawn in code at
this quality without a renderer, which would mean giving up byte-identical rebuilds and the
twenty-five-second edit loop.

### 4. Flat vector / corporate memphis

No outlines, big flat shapes, geometric. Would composite beautifully and never have an
alignment bug.

**Rejected because** it has no ink weight, and without ink weight a goat and a deer and a
cow are the same silhouette with different horns glued on. The heavy outline is doing real
identification work here.

---

## The four features the direction has to protect

Whatever the style, these are non-negotiable — they're what makes it a goat rather than a
re-skinned dog:

1. **Horizontal rectangular pupils.** Goats' pupils are wide bars. Every eye variant that
   isn't explicitly closed, spiralled or transformed keeps it. This is the single highest-
   leverage detail in the collection.
2. **The horn silhouette.** Fourteen options, all from one taper primitive so they stay in
   the same family. This is what you read first at any size.
3. **A beard below the chin.** One cohesive wedge with two hair strokes through it. An early
   version hung three separate tufts off the lip and every goat read as a catfish.
4. **Ear carriage tied to the coat.** Upright, lop and shag change the silhouette, not the
   colour. Splitting ears into their own trait would let a Nubian roll upright ears, and the
   breed identity would collapse.

---

## Colour notes

- **One accent, not five.** Signal orange `#FF5A1F` is the only high-chroma colour in the
  chrome. Everything else earns its saturation from the artwork.
- **Backgrounds are chosen against two extremes**, not against the average goat: every one
  has to hold contrast against a bone-white Saanen *and* a near-black Alpine. The two that
  can't (void, oxblood) are handled by exclusion rules instead of by compromising the colour.
- **Shadows darken toward blue**, not toward grey. `shade()` pushes the blue channel up as it
  drops red and green — grey shadows read as dirt on a warm palette.
- **Gold is a material, not a colour.** The gilded coat, gold-tipped horns, crown and trophy
  all use the same three-value ramp (`gold` / `goldHi` / `brass`) so metal looks like metal
  across categories.
