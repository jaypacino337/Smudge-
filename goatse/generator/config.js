/**
 * GOATSE — generator config
 *
 * Rarity weights live in the FILENAMES (`crown#22.png`). This file holds everything a
 * filename can't express: draw order, exclusion rules, forced counts, and metadata.
 */

module.exports = {
  // ─── Collection ────────────────────────────────────────────────────────────
  name: 'Goatse',
  symbol: 'GOATSE',
  description: 'A collection of 2,222 goats. Altitude is the only metric.',
  supply: 2222,
  startIndex: 1,                       // first token is #1 (use 0 if you prefer 0-indexed)

  // ─── Output ────────────────────────────────────────────────────────────────
  master: 2048,                        // source layer resolution
  export: 1024,                        // final image size (downscaled from master)
  format: 'png',
  emitNoneTraits: false,               // keep false — see LAYER-SPEC.md §6

  // ─── Royalties / creators ──────────────────────────────────────────────────
  sellerFeeBasisPoints: 500,           // 500 = 5%
  creators: [
    { address: 'REPLACE_WITH_YOUR_SOLANA_WALLET', share: 100 },
  ],
  externalUrl: 'https://goatse.wtf',

  // ─── Layer order: bottom → top. Folder names must match exactly. ───────────
  layerOrder: [
    { folder: '00-background', trait: 'Background' },
    { folder: '01-backdrop',   trait: 'Backdrop'   },
    { folder: '02-coat',       trait: 'Coat'       },
    { folder: '03-marking',    trait: 'Marking'    },
    { folder: '04-outfit',     trait: 'Outfit'     },
    { folder: '05-mouth',      trait: 'Mouth'      },
    { folder: '06-eyes',       trait: 'Eyes'       },
    { folder: '07-horns',      trait: 'Horns'      },
    { folder: '08-headwear',   trait: 'Headwear'   },
    { folder: '09-eyewear',    trait: 'Eyewear'    },
    { folder: '10-held',       trait: 'Held Item'  },
    { folder: '11-overlay',    trait: 'Overlay'    },
  ],

  /**
   * Exclusions — combinations the generator will reject and reroll.
   * Keys are `<folder-suffix>:<file-basename>`, e.g. `horns:markhor-spiral`.
   * `*` matches every option in that category (including none — use `!none` to spare it).
   */
  exclusions: [
    // Tall or wide horn sets and structured hats cannot occupy the same skull.
    { when: ['horns:ibex-ridged', 'horns:markhor-spiral', 'horns:wide-rack', 'horns:boer-curl'],
      forbid: ['headwear:cowboy', 'headwear:trapper', 'headwear:chef-toque', 'headwear:party-cone', 'headwear:hard-hat'] },

    // The beanie is knitted around the horns; a crystal or neon horn through wool reads wrong.
    { when: ['horns:crystal', 'horns:neon'], forbid: ['headwear:beanie', 'headwear:trapper'] },

    // Eyewear over shut or spiralling eyes reads as a rendering bug, not a trait.
    { when: ['eyes:closed-happy', 'eyes:dizzy', 'eyes:sleepy'], forbid: ['eyewear:*'] },

    // Laser eyes ARE the eyes. Nothing covers them.
    { when: ['eyes:laser'], forbid: ['eyewear:*'] },

    // ...and the laser glow only makes sense with the eyes that emit it.
    { when: ['overlay:laser-glow'], forbid: ['eyes:!laser'] },

    // The laser visor supplies its own beam; a second one underneath is noise.
    { when: ['eyewear:laser-visor'], forbid: ['overlay:laser-glow', 'headwear:goggles-up'] },

    // Goggles on the forehead and goggles on the eyes are the same pair of goggles.
    { when: ['headwear:goggles-up'], forbid: ['eyewear:ski-goggles'] },

    // The halo owns the airspace above the head; so does anything else up there.
    { when: ['headwear:halo'], forbid: ['overlay:pixel-mode', 'overlay:scanlines'] },

    // Dark goat on a dark ground = invisible at 64px avatar size.
    { when: ['background:void', 'background:oxblood'],
      forbid: ['coat:black-alpine', 'coat:nubian-lop'] },

    // The ghost coat is translucent — a busy backdrop shows straight through and looks broken.
    { when: ['coat:ghost-white'],
      forbid: ['backdrop:*', 'background:summit-gold', 'outfit:tuxedo', 'outfit:summit-cape'] },

    // Gold on gold on gold. Pick one.
    { when: ['coat:gilded'], forbid: ['background:summit-gold', 'horns:gold-tipped', 'held:gold-pick'] },

    // Both of these live in the mouth.
    { when: ['mouth:cigar', 'mouth:tin-can'], forbid: ['held:espresso'] },

    // A shaggy fleece silhouette swallows a thin chain and a fitted collar.
    { when: ['coat:angora-shag', 'coat:cashmere-shag'], forbid: ['outfit:gold-chain', 'outfit:bell-collar'] },

    // Pixel mode is the arcade tier — it should read clean, with no other overlay noise.
    { when: ['overlay:pixel-mode'], forbid: ['backdrop:aurora', 'backdrop:storm-front', 'backdrop:crevasse'] },
  ],

  /**
   * Forced counts — guarantees exact numbers for the headline traits.
   * The generator seeds these first, then fills the rest with weighted random.
   * Sum must stay well under `supply`.
   */
  forced: [
    { trait: 'eyes:laser',          count: 8  },
    { trait: 'horns:crystal',       count: 22 },
    { trait: 'headwear:crown',      count: 22 },
    { trait: 'coat:ghost-white',    count: 14 },
    { trait: 'coat:gilded',         count: 8  },
    { trait: 'overlay:pixel-mode',  count: 22 },
  ],

  // ─── Safety ────────────────────────────────────────────────────────────────
  maxRerolls: 50000,     // abort if exclusions are so tight we can't fill the supply
  shuffleOutput: true,   // randomize which DNA maps to which token id
  seed: 'goatse-v1',     // deterministic — same seed always rebuilds the same collection
};
