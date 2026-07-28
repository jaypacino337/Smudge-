# PUMP DAWGS — X + Discord Launch Kit

> **What I can and can't do:** I can't create the accounts — X and Discord both require a
> human at signup (phone/email verification, CAPTCHA, ToS acceptance). Automating that would
> violate both platforms' terms and get the accounts banned on day one, which is the worst
> possible outcome for a project whose entire value is its handle.
>
> So this is everything else: exact handles to grab, copy to paste, the full server
> structure, and the security setup. Signing up takes about 20 minutes with this open
> beside you. Once the URLs exist, paste them into `assets/js/brand.js` → `links` and the
> site wires itself up.

---

## Part 1 — X (Twitter)

### Handle

Grab in this order, first available wins:

| Priority | Handle | Note |
|---|---|---|
| 1 | `@pumpdawgs` | The one you actually want |
| 2 | `@pumpdawgsnft` | Fine, slightly weaker |
| 3 | `@justpumpdawgs` | Mirrors the pumpkets pattern |
| 4 | `@pumpdawgsol` | The `sol` suffix reads as native |

**Grab the others too, even the ones you won't use.** They're free, and a squatter on
`@pumpdawgs` when you're posting from `@pumpdawgsnft` is a permanent tax on every impression
you ever earn. Park them and point them at the real one.

Check availability at `x.com/<handle>` — a 404 means free.

### Profile

| Field | Value |
|---|---|
| **Display name** | `pump dawgs` — lowercase, matches the category's tone |
| **Bio** | `A collection of 1,111 pump dawgs.` |
| **Location** | `solana` |
| **Website** | your site URL |
| **Birth date** | Set it. Accounts without one get restricted reach. |

Deliberately flat bio. No "🚀 WAGMI 🔥 LFG", no roadmap in the bio, no "the next big thing on
SOL." Understatement is the tone — the joke is that it's just dogs. Anything that sounds
like it's trying to sell you something breaks it.

### Profile picture

One dawg from the collection, on a solid pastel background, cropped tight to the head. It has
to survive being rendered at 32px in a timeline — if you can't tell it's a dog at that size,
pick a different one. Use `03` from the site's hero pack (the crowned one) or generate a
dedicated founder dawg.

### Banner

**1500 × 500 px.** Five dawgs shoulder-to-shoulder against a flat sky-blue background, big
hand-drawn `PUMP DAWGS` wordmark across the top in a thick marker font.

Prompt for it:

```text
A wide banner illustration, 1500x500 pixels. Five cartoon dogs standing shoulder to
shoulder facing the viewer, chest-up, each with different fur colors and different
hats/outfits. Hand-drawn children's marker style: thick uneven black outlines, flat fill
colors, no gradients, no shading. Flat pastel sky-blue background with two simple white
clouds. The words "PUMP DAWGS" hand-lettered in large wobbly bubble letters across the top
in a warm coral red. Naive, charming, deliberately unpolished.
```

Keep the middle ~400px of the left side clear — that's where the PFP circle overlaps.

### Pinned post

```
1,111 pump dawgs.

that's it. that's the collection.
```

Attach a 2×2 grid of four dawgs. Do not put a mint date, a Discord link, or a roadmap in the
pinned post — pin the joke, put the logistics in a reply underneath. Thread replies to a
pinned post get read; a pinned post that reads like an announcement gets scrolled.

### First two weeks of posting

The only thing that matters pre-launch is that the timeline looks *alive* and the art looks
*consistent*. Cadence beats cleverness.

| Cadence | What |
|---|---|
| Daily | One dawg. Just the image, one line of text max. This is 80% of your posting. |
| 2× a week | A trait preview — "17 hats. here's 6 of them." |
| Weekly | Something with a person in it: a poll, "name this dawg", replies to holders |
| Once | The reveal of the four concept directions — let people vote on the look |
| Never | Countdown timers, "wen mint" bait, engagement-farming giveaways |

That last row matters. Follower-count farming brings in accounts that leave the second the
giveaway ends, and it teaches the algorithm your audience is bots.

### Safety

- **2FA on immediately**, authenticator app not SMS. Crypto X accounts get SIM-swapped, and a
  hijacked account posting a fake mint link is the single most common way these projects
  cause real damage to real people.
- Use an email that isn't your personal one and isn't published anywhere.
- If you add a second admin later, they get their own account with delegate access —
  never share the password.

---

## Part 2 — Discord

### Server

**Name:** `pump dawgs`
**Icon:** same PFP as X.
**Invite:** create a vanity link once you hit the boost level, or just use a permanent
invite — set it to **never expire, unlimited uses**, otherwise your website link dies in 7 days.

### Channels

Keep it small. An empty 30-channel server looks dead; a busy 8-channel server looks alive.
Add channels when a conversation actually needs its own room, not before.

```
📌 START HERE
   #welcome            read-only · rules + what this is
   #announcements      read-only · you post, nobody else
   #verify             holder verification bot lives here

🐾 GENERAL
   #general            the main room
   #dawg-pics          post your dawg
   #trait-talk         rarity arguments — this is where the community actually forms
   #gm                 low-effort daily activity, keeps the server from looking dead

💎 HOLDERS            (locked behind the verify bot)
   #holders-lounge
   #holders-alpha      early looks, decisions that holders get a say in

🔧 SUPPORT
   #help
   #suggestions
```

### Roles

| Role | How you get it | Colour |
|---|---|---|
| `founder` | you | lime |
| `mod` | hand-picked, later — don't rush this | orange |
| `holder` | automatic, via verification bot | gold |
| `dawg` | everyone on join | default |

### Verification bot

Use **Vulcan** or **Collab.Land** — both support Solana and both are the ones holders already
trust. Setup: invite the bot, connect the collection by its verified creator address or
candy machine ID, map "holds ≥1" to the `holder` role. It re-checks periodically, so the role
drops automatically when someone sells.

Wait until the collection is actually minted to configure this. A verify channel that doesn't
work yet is worse than no verify channel.

### Security — do this before you invite anyone

NFT Discords get compromised constantly, and the damage lands on your community, not on you.
The attack is always the same: someone gets an admin token or a webhook, posts a fake mint
link in `#announcements`, and holders drain their wallets. Assume it will be attempted.

- [ ] **2FA required for moderation actions** — Server Settings → Safety Setup. Non-negotiable.
- [ ] **Verification level: Medium or High** — forces a verified phone/email and an account age
- [ ] **Explicit media filter: on for all members**
- [ ] **`@everyone` cannot:** create invites, manage webhooks, mention @everyone, embed links
      until they've been in the server a while
- [ ] **Nobody has Administrator** except you. Mods get exactly the permissions they need.
- [ ] **Pin a permanent notice in `#welcome`:** *"We will never DM you first. We will never
      ask for your seed phrase. Every official link is in #announcements and on the website."*
- [ ] **Disable DMs from server members** in your own privacy settings, and tell holders to
      do the same — DM scams are how most people actually get hit.
- [ ] **AutoMod rules** for common scam phrases: `airdrop`, `claim now`, `free mint`,
      `verify your wallet` — flag, don't auto-ban, so you can see what's being attempted.

### Welcome message

```
welcome to pump dawgs 🐾

1,111 hand-drawn dawgs on solana, plus a token. that's the whole thing.

→ #announcements  — the only place official links are ever posted
→ #general        — say hi
→ #dawg-pics      — post your dawg
→ #verify         — holders get the gold role here

three rules:
1. don't be a dick
2. no shilling other projects
3. WE WILL NEVER DM YOU FIRST. anyone who DMs you claiming to be
   a mod is a scammer. we will never ask for your seed phrase.
   there is no surprise airdrop. report and block.
```

---

## Part 3 — Wiring it into the site

Once both exist:

```js
// assets/js/brand.js
links: {
  twitter: 'https://x.com/pumpdawgs',
  discord: 'https://discord.gg/YOURINVITE',
  ...
}
```

That's the only edit. Every link on the site — nav, community section, footer — reads from
that object, and any link still set to `'#'` renders greyed-out with a "soon" tag instead of
shipping as a dead link.

---

## Order of operations

1. Grab the X handles — do this **first**, it's the only irreversible one
2. Set up the X profile with the bio and PFP above
3. Generate the banner
4. Post the pinned post, then start the daily-dawg cadence
5. Create the Discord, run the full security checklist **before** the first invite
6. Publish the invite in the X bio and on the site
7. Add the verification bot only after the collection is minted
8. Launch `$DAWGS` separately, once there's an audience to launch it into
