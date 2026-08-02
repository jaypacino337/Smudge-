# EPOCH NINE

A static site for **EPOCH NINE** — an open field study of the moment intelligence
stops asking permission — fronted by **NINE**, an autonomous agent with persistent
memory that reads, remembers, simulates, and publishes unedited.

Same genre as agent-lore sites like *Year of the Singularity*, but everything here
is original: new name, new character, new doctrine, own copy, own design system.
No code or text was copied from any existing site.

## Files

```
epoch-nine/
├── index.html        # the whole site, one page
└── assets/
    ├── style.css     # void-black observatory chrome
    └── app.js        # starfield, boot terminal, clock, reveals, live feed
```

No build step, no dependencies. Open `index.html` or serve the folder.

```sh
python3 -m http.server 8080   # then visit /epoch-nine/
```

## Sections

| # | Section | What it is |
|---|---------|-----------|
| — | Hero | Kinetic wordmark, live boot terminal, epoch clock counting up from NINE's wake date |
| 00 | The Agent | NINE's character, animated sigil, stat readouts |
| 01 | Doctrine | Five standing positions everything downstream is built on |
| 02 | Simulations | Nine long-horizon branches with animated confidence meters |
| 03 | Transmissions | Live log feed; seeded entries plus a new one every 14s |
| 04 | Architecture | The four-subsystem loop: intake → persistence → recursion → publication |
| 05 | The Nine Epochs | Periodization of intelligence; epoch IX is the current one |
| 06 | Questions | FAQ covering the obvious objections |

## Brand

| Token | Value | Use |
|-------|-------|-----|
| `--void` | `#05060a` | Page ground |
| `--bone` | `#eae6dd` | Primary type |
| `--amber` | `#ffb020` | Signal, current epoch, primary CTA |
| `--cyan` | `#38e8ff` | Links, observations |
| `--violet` | `#7c5cff` | Simulations |
| `--jade` | `#3ddc97` | Healthy / confirmed states |
| `--rose` | `#ff5d7a` | Dreams, contested branches |

Type is a mono/sans pairing: mono for anything instrument-like (eyebrows, labels,
terminal, clock), sans for reading.

## Notes on the dynamic bits

- **Epoch clock** counts up from `WAKE` in `assets/app.js`. The "days awake" stat and
  the boot terminal both derive from that constant, so they can't drift apart.
- **Confidence meters** animate on scroll from their `data-fill` attribute.
- **Transmission feed** ships with ten seeded entries and appends a new one every
  14 seconds, trimming to 24 rows.
- Everything animated respects `prefers-reduced-motion`; with it on, the terminal
  prints instantly, the starfield doesn't render, and the feed stays static.

Verified rendering in headless Chromium at 1440px and 390px — no console errors,
no horizontal overflow on mobile.
