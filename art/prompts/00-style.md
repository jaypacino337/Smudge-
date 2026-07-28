# 00 — STYLE BLOCK  ⚠️ EDIT THIS FILE FIRST

This is the single source of truth for how PUMP DAWGS looks. It gets prepended to **every**
prompt in every batch. Swap the block below for a different concept from `../CONCEPTS.md` and
the entire collection changes style without touching a single layer definition.

Currently set to: **Concept 1 — CRAYON DAWGS** (with Concept 2's trait content).

---

## ACTIVE STYLE BLOCK

```
STYLE — apply to every image, no exceptions:
Hand-drawn children's marker illustration. Thick uneven black outline, 12-16px at 2048px
resolution, lines wobble and occasionally fail to close. Flat fill colors only — absolutely
no gradients, no shading, no ambient occlusion, no texture, no rim light. The only highlight
allowed anywhere is a single small white dot in each eye. Slightly crooked, naive proportions.
It should look like it was drawn in under a minute by someone who was not trying very hard.

OUTPUT RULES — apply to every image, no exceptions:
- 2048 x 2048 pixels, square, PNG with a real alpha channel.
- Transparent background (the ONLY exception is the 00-background category).
- Draw ONLY the element described. No dog body, no head, no face, no extra props,
  no shadow on the ground, no border, no frame, no watermark, no text.
- The element must sit at the exact pixel anchors given in the prompt.
- Do not crop or scale the element to fill the canvas. Empty space is correct and expected.
```

---

## Alternate style blocks

Uncomment one and replace the block above.

<details><summary>Concept 2 — BODEGA DAWGS</summary>

```
STYLE: Crude hand-drawn marker illustration, NYC bodega street aesthetic. Thick black
outline, flat fills, no shading. Objects look like cheap printed stickers with a 6px white
die-cut border. Deliberately unpolished, streetwear-adjacent, slightly grimy palette.
```
</details>

<details><summary>Concept 3 — GAMEDAWGS</summary>

```
STYLE: 32x32 pixel art sprite upscaled 64x with nearest-neighbor. No anti-aliasing, no blur,
no soft edges anywhere. Exactly 4 colors per element from the supplied ramp plus transparent.
Hard 1px black outline. All pixels snapped to the 32x32 grid.
```
Note: when using this style, ignore the fine pixel anchors in the layer prompts and snap
every anchor to the nearest 64px block instead.
</details>

<details><summary>Concept 4 — PUFFY DAWGS</summary>

```
STYLE: Soft 3D vinyl toy render, puffy rounded forms, matte surface with one soft specular
highlight from the upper left at a fixed 45 degrees. Thick white sticker die-cut outline
(20px at 2048px) and a hard offset drop shadow 24px down-right at 30% opacity. No texture
detail, no rim light. Blind-box collectible aesthetic.
```
</details>

---

## The reference-image rule

After you generate `02-fur/cream-floppy.png`, build `../anchor-sheet.png` from it (see
`../LAYER-SPEC.md` §1) and **attach that image to every single subsequent prompt** with:

> "Match this reference image's head position, head size, and framing exactly. Output only the
> new element on a transparent background — do not redraw the dog."

Skipping this is the #1 reason generative collections come out misaligned. It costs you one
extra attachment per message and saves you days.
