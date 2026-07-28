/**
 * PUMP BAWGES — generator config
 *
 * Rarity weights live in the FILENAMES (`crown#5.png`). This file holds everything a
 * filename can't express: draw order, exclusion rules, forced counts, and metadata.
 */

module.exports = {
  // ─── Collection ────────────────────────────────────────────────────────────
  name: 'Pump Bawg',
  symbol: 'BAWG',
  description: 'A collection of 1,111 pump bawges.',
  supply: 1111,
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
  externalUrl: 'https://pumpbawges.xyz',

  // ─── Layer order: bottom → top. Folder names must match exactly. ───────────
  layerOrder: [
    { folder: '00-background', trait: 'Background'   },
    { folder: '01-backdrop',   trait: 'Backdrop'     },
    { folder: '02-fur',        trait: 'Fur'          },
    { folder: '03-marking',    trait: 'Marking'      },
    { folder: '04-outfit',     trait: 'Outfit'       },
    { folder: '05-mouth',      trait: 'Mouth'        },
    { folder: '06-eyes',       trait: 'Eyes'         },
    { folder: '07-headwear',   trait: 'Headwear'     },
    { folder: '08-eyewear',    trait: 'Eyewear'      },
    { folder: '09-held',       trait: 'Held Item'    },
    { folder: '10-overlay',    trait: 'Overlay'      },
  ],

  /**
   * Exclusions — combinations the generator will reject and reroll.
   * Keys are `<folder-suffix>:<file-basename>`, e.g. `fur:husky-pricked`.
   * `*` matches every option in that category (including none — use `!none` to spare it).
   */
  exclusions: [
    // Big brimmed hats crush upright ears.
    { when: ['fur:shiba-pricked', 'fur:husky-pricked', 'fur:corgi-pricked'],
      forbid: ['headwear:cowboy', 'headwear:bucket-hat', 'headwear:trapper'] },

    // Eyewear over shut eyes reads as a rendering bug, not a trait.
    { when: ['eyes:sleepy', 'eyes:closed-happy', 'eyes:dizzy'],
      forbid: ['eyewear:*'] },

    // Laser eyes ARE the eyes. Nothing covers them.
    { when: ['eyes:laser'], forbid: ['eyewear:*'] },

    // Laser glow only makes sense with laser eyes...
    { when: ['overlay:laser-glow'], forbid: ['eyes:!laser'] },

    // The cone owns the whole neck and head opening.
    { when: ['headwear:cone-of-shame'], forbid: ['outfit:*', 'eyewear:*', 'overlay:*'] },

    // Halo and crown both occupy the space above the head.
    { when: ['headwear:halo'], forbid: ['overlay:scanlines', 'overlay:pixel-mode'] },

    // Mohawk pokes through any hat — but it IS the headwear, so nothing to exclude.
    // (kept as a note so nobody "fixes" it later)

    // Dark dog on dark background = invisible at 64px avatar size.
    { when: ['background:void', 'background:midnight'],
      forbid: ['fur:black-lab', 'fur:cocoa-floppy'] },

    // Ghost fur is translucent; a busy background shows straight through and looks broken.
    { when: ['fur:ghost-white'],
      forbid: ['background:awning-stripes', 'background:sunburst', 'backdrop:*'] },

    // Bubblegum bubble and cigar both occupy the lower-left held-item space.
    { when: ['mouth:bubblegum', 'mouth:cigar'], forbid: ['held:bubble-wand'] },

    // Pixel mode is the GameBawg tier — it should look clean, no other overlay noise.
    { when: ['overlay:pixel-mode'], forbid: ['backdrop:rainbow', 'backdrop:city-skyline'] },
  ],

  /**
   * Forced counts — guarantees exact numbers for headline traits.
   * The generator seeds these first, then fills the rest with weighted random.
   * Sum must stay well under `supply`.
   */
  forced: [
    { trait: 'eyes:laser',        count: 3  },
    { trait: 'headwear:crown',    count: 11 },
    { trait: 'overlay:pixel-mode', count: 11 },
    { trait: 'fur:ghost-white',   count: 7  },
  ],

  // ─── Safety ────────────────────────────────────────────────────────────────
  maxRerolls: 50000,   // abort if exclusions are so tight we can't fill the supply
  shuffleOutput: true, // randomize which DNA maps to which token id
  seed: 'pump-bawges-v1', // deterministic — same seed always rebuilds the same collection
};
