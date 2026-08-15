# PUMP DAWGS — What it costs to mint

> Prices checked **August 2026**: SOL ≈ **$75**, Arweave ≈ **$20/GB**. Both move a lot.
> Re-check before you spend anything — the SOL figures below are the stable part, the
> dollar conversions are not.

---

## The short answer

**Under $15.** That's the whole creator-side cost for launching 1,111 dawgs, and most of
it is Arweave storage.

The trick is that you don't pay to mint. A **Candy Machine** makes the *buyer* pay the
account rent at the moment they mint. You pay to upload the art and to create two accounts.

---

## Where the money actually goes

### 1. Storage — pay once, permanent

The collection after optimization is **~64 MB** (63 MB images + 1.1 MB metadata).

| | Size | Arweave @ ~$20/GB |
|---|---|---|
| Optimized (current) | 64 MB | **~$1.30** |
| Unoptimized | 182 MB | ~$3.65 |

`config.optimize` converts every image to a 256-colour indexed PNG. Mean per-channel error
is **0.02/255** — visually identical, because this art is flat cel colour, not photographic.
It's on by default.

> Odd but true: 256 colours compresses *smaller* than 128. Fewer colours forces the
> quantiser to dither, dithering is noise, and noise doesn't compress.

### 2. Mint rent — who pays depends on how you launch

This is the number that varies by 200×, so it's the only decision that really matters.

| Standard | Per NFT | × 1,111 | ≈ USD |
|---|---|---|---|
| **Compressed (cNFT / Bubblegum)** | shared Merkle tree | ~0.1–0.3 SOL total | **~$8–23** |
| **Metaplex Core** ✅ | 0.0029 SOL | ~3.2 SOL | ~$242 |
| Legacy Token Metadata | 0.022 SOL | ~24.4 SOL | ~$1,834 |
| pNFT (enforced royalties) | higher still | — | most expensive |

**But with a Candy Machine, none of that is yours.** Each buyer pays their own mint's rent
as part of their transaction. Your outlay is:

- Collection NFT: ~0.01 SOL
- Candy Machine account: ~0.01–0.02 SOL (scales a little with supply)
- **≈ 0.03 SOL ≈ $2**

### 3. Everything else

| | Cost |
|---|---|
| Devnet — the entire dry run | **free** |
| Domain (`pumpdawgs.xyz`) | ~$10–15/yr |
| Hosting (GitHub Pages / Vercel) | free |
| X + Discord | free |

---

## The cheap version, concretely

1. **Optimize the images** — done, on by default. 182 MB → 64 MB.
2. **Use Metaplex Core**, not legacy Token Metadata. Same marketplaces, 87% less rent.
   Only matters if you pre-mint, but set it anyway.
3. **Launch through a Candy Machine** so buyers pay their own mint. This is the single
   biggest lever — it takes your cost from ~$242 to ~$2.
4. **Rehearse the whole thing on devnet.** Free, and it's the only way to find out your
   metadata is wrong before it's permanent.

**Total: roughly $3 in SOL + ~$1.30 storage, plus a domain if you want one.**

### Should you use compressed NFTs to go cheaper still?

No. cNFTs are the cheapest option on paper, but they're built for 100k+ airdrop-scale
mints. For a 1,111 PFP collection they buy you nothing — with a Candy Machine you're
already at ~$2 — and they cost you marketplace behaviour and holder familiarity. Core is
the right call at this size.

---

## What you actually have to decide

Two things, neither reversible after upload:

- **Your wallet.** `generator/config.js` → `creators` still says
  `REPLACE_WITH_YOUR_SOLANA_WALLET`. Every one of the 1,111 metadata files carries it, so
  royalties would point at nothing. The build prints a warning until you fix it.
- **Royalties.** `seller_fee_basis_points: 500` is 5%, but on Solana that's only *enforced*
  for pNFTs. On Core and legacy NFTs it's a suggestion marketplaces may ignore. Enforcement
  costs more per mint and some traders avoid enforced-royalty collections — worth deciding
  deliberately rather than by default.

---

## Does supply change the cost?

Barely, on the Candy Machine path — buyers pay per mint, so 500 dawgs and 5,000 dawgs cost
you about the same. Storage scales linearly but it's ~$1 either way.

Supply is a *market* decision, not a cost one. 1,111 is the category convention and it's
one line: `generator/config.js` → `supply`. Change it and re-run `npm run build`.

---

## Run order

```bash
cd generator
npm install
npm run art                     # 125 layers
npm run build -- 1111           # images + metadata, optimized

solana config set --url devnet  # FREE rehearsal
sugar launch                    # walks you through config, upload, candy machine
# mint a few to yourself, check they render on a marketplace

solana config set --url mainnet-beta
sugar launch                    # for real
```

---

**Sources:** [Metaplex Core](https://www.metaplex.com/docs/smart-contracts/core) ·
[Metaplex Core launch announcement](https://www.metaplex.com/blog/articles/metaplex-foundation-launches-metaplex-core-next-generation-of-solana-nft-standard) ·
[Compressed NFTs guide](https://www.quicknode.com/guides/solana-development/nfts/mint-compressed-nft) ·
[Arweave storage pricing](https://ardrive.io) ·
[SOL price](https://coinmarketcap.com/currencies/solana/)
