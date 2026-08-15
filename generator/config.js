/**
 * PUMP DAWGS — generator config
 *
 * Rarity weights live in the FILENAMES (`crown#5.png`). This file holds everything a
 * filename can't express: draw order, exclusion rules, forced counts, and metadata.
 */

module.exports = {
  // ─── Collection ────────────────────────────────────────────────────────────
  name: 'Pump Dawg',
  symbol: 'DAWGS',
  description: 'A collection of 1,111 pump dawgs.',
  supply: 1111,
  startIndex: 1,                       // first token is #1 (use 0 if you prefer 0-indexed)

  // ─── Output ────────────────────────────────────────────────────────────────
  master: 2048,                        // source layer resolution
  export: 1024,                        // final image size (downscaled from master)
  format: 'png',
  emitNoneTraits: false,               // keep false — see LAYER-SPEC.md §6

  /**
   * Indexed-palette PNG output. Cuts the collection from ~182 MB to ~63 MB with a mean
   * per-channel error of 0.02/255 — visually identical on flat cel art, and upload size is
   * what you pay for on Arweave. Needs `sharp`; without it the build warns and writes
   * full-size PNGs. Set to `false` to disable.
   *
   * 256 compresses smaller than 128: fewer colours forces dithering, and dithering is noise.
   */
  optimize: { colors: 256 },

  // ─── Royalties / creators ──────────────────────────────────────────────────
  sellerFeeBasisPoints: 500,           // 500 = 5%
  creators: [
    { address: 'REPLACE_WITH_YOUR_SOLANA_WALLET', share: 100 },
  ],
  externalUrl: 'https://pumpdawgs.xyz',

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

    // Pixel mode is the GameDawg tier — it should look clean, no other overlay noise.
    { when: ['overlay:pixel-mode'], forbid: ['backdrop:rainbow', 'backdrop:city-skyline'] },
  ],

  /**
   * Forced counts — exact numbers, seeded before the weighted random fill.
   *
   *   trait   pin one category
   *   traits  pin several at once — this is how you build a locked chase tier where
   *           every piece shares a look
   *   name    labels the tier and emits a `Tier` metadata attribute
   *   reserve traits belonging to this tier ALONE, blocked from ordinary dawgs
   *
   * Sum must stay well under `supply`.
   */
  forced: [
    // The chase. 10 Dawg Kings, one locked look, and the crown exists nowhere else.
    // If you attach a prize to pulling one, say so on the site and in the metadata —
    // an undisclosed payout tier is the kind of thing that gets a mint called rigged.
    {
      name: 'Dawg King',
      count: 10,
      traits: [
        'headwear:crown',
        'outfit:gold-chain',
        'eyes:glowing',
        'eyewear:none',          // nothing covers a King's eyes
        'background:sunburst',
        'fur:golden-floppy',
      ],
      reserve: ['headwear:crown'],
    },

    { trait: 'eyes:laser',         count: 3  },
    { trait: 'overlay:pixel-mode', count: 11 },
    { trait: 'fur:ghost-white',    count: 7  },
  ],

  // ─── Safety ────────────────────────────────────────────────────────────────
  maxRerolls: 50000,   // abort if exclusions are so tight we can't fill the supply
  shuffleOutput: true, // randomize which DNA maps to which token id
  seed: 'pump-dawgs-v1', // deterministic — same seed always rebuilds the same collection
};
