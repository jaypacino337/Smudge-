# GOATSE — prompt packs

Generated from `art/prompts.json`. Do not edit these by hand — edit the JSON and re-run
`node art/build-prompt-packs.js`.

**134 layers** across 12 categories, 2048×2048 master.

| Category | Layers | None | z |
|---|---:|---|---:|
| [Background](00-background.md) | 12 | — | 0 |
| [Backdrop](01-backdrop.md) | 10 | 300 | 1 |
| [Coat](02-coat.md) | 14 | — | 2 |
| [Marking](03-marking.md) | 10 | 260 | 3 |
| [Outfit](04-outfit.md) | 14 | 140 | 4 |
| [Mouth](05-mouth.md) | 10 | — | 5 |
| [Eyes](06-eyes.md) | 12 | — | 6 |
| [Horns](07-horns.md) | 14 | 60 | 7 |
| [Headwear](08-headwear.md) | 12 | 300 | 8 |
| [Eyewear](09-eyewear.md) | 8 | 340 | 9 |
| [Held Item](10-held.md) | 10 | 300 | 10 |
| [Overlay](11-overlay.md) | 8 | 420 | 11 |
| **Total** | **134** | | |

## Anchors

Every layer is drawn against these, in master-canvas pixels:

| Anchor | Value |
|---|---:|
| `bodyCenterX` | 1024 |
| `skullTopY` | 620 |
| `eyeLineY` | 880 |
| `muzzleCenterY` | 1210 |
| `beardTipY` | 1560 |
| `shoulderLineY` | 1560 |
| `hornBaseY` | 660 |
| `heldItemX` | 470 |
| `heldItemY` | 1620 |
