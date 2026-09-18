# Task 3.2.1 — `replay` enters the two unions, and the words that must exist beside it

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.1 (complete)

## Objective

Add `replay` to `PROVIDER_IDS` and `MARKET_FEEDS` in `packages/shared`, and
supply every piece of prose the `satisfies` guards then demand. **Nothing else.**
This is first because it is the step that makes every later task's provenance
stamping a compile error rather than a runtime surprise.

## What the user can see when this lands

**Nothing.** No route, no screen, no behaviour — two unions gain a member and the
chrome gains a word it cannot yet reach.

## What is already decided and must not be re-taken

- **ADR 0030 §3 already specifies `replay` as both a `ProviderId` and a
  `MarketFeed`.** Task 3.1.8 confirmed neither union holds it and named this
  story as the owner. This task is **implementing a specification, not taking a
  decision** — if the implementation seems to want a different shape, that is a
  finding for ADR 0030, not a choice to make here.
- **The word on screen is `REPLAYING`, never `LIVE`** — [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
  §2.6 owns the vocabulary and carries it as a fifth cell. `LIVE` reads as a
  claim about the market rather than about the connection, and a replay is not
  the market.
- **A feed added without words is already a compile error**, by the `satisfies`
  guard beside `MARKET_FEEDS`. That guard is the mechanism this task leans on;
  do not weaken it to make the addition quieter.
- **`MARKET_FEED_DESCRIPTIONS` must not imply coverage the feed does not have**
  — invariant 6, and `PRODUCT_SPEC.md` §7.1 is explicit that a reader must not be
  misled, which is a stronger thing than printing an acronym.

## Work

- **Add `replay` to both unions** and follow the compile errors. There should be
  several and each one is the guard doing its job; **write down how many fired
  and where**, because that count is the evidence the guard works and it is
  cheaper to record now than to re-derive.
- **Write the description and the sentence beside it.** A replay is our own
  stored consolidated-tape bars, re-stamped onto the wall clock. The honest
  sentence says so — it is **not** live, it is **not** IEX, and it is **not** the
  market now. Follow `market-provenance.ts`'s existing rule for when a label
  needs a sentence beside it rather than inventing a second rule.
- **Add the `REPLAYING` cell to the feed vocabulary** wherever `LIVE`'s four
  cells already live, per §2.6.
- **Check `pnpm invariants` still holds every spelling to one home.** The
  invariant that one fact has one home is what stops a drawn sentence and its
  spoken twin drifting apart, and a new member is exactly when that drifts.

## Done when

- `PROVIDER_IDS` and `MARKET_FEEDS` both hold `replay`, and `pnpm build` is green
- Every `satisfies` guard that fired is satisfied with **words a non-specialist
  can read**, not a placeholder
- The task file records **how many compile errors the addition produced and
  where**, as evidence the guard is load-bearing rather than decorative
- `REPLAYING` exists in the vocabulary; **nothing renders it yet**
- `pnpm verify` passes

## Notes

**This task is deliberately tiny and deliberately first.** Every later task in
this story stamps provenance, and doing the vocabulary last means every one of
them carries a `// TODO: replay` that the compiler cannot see. Doing it first
means the compiler names each site.
