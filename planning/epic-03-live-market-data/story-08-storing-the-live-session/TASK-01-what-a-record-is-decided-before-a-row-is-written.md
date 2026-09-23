# Task 3.8.1 — What a record is, decided before a row is written

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.7 (closed)

## Objective

Settle **both** of this story's open decisions, and settle the first one the way
Story 3.7 settled its own: **by measuring the shapes rather than arguing them.**

Open decision 1 is the three shapes for what happens tonight when the backfill
arrives with a SIP bar for a minute an IEX bar already occupies. Open decision 2
is whether a live-written session is served to everyone or only re-read by the
writer. Neither is a database detail: the first decides whether this product can
ever answer `PRODUCT_SPEC.md` §23's _what was knowable at 11:07_ **with the data
that was knowable at 11:07**, and the second decides how much this product
trusts a single venue's bars as history it serves to a reader.

## What the user can see when this lands

**Nothing.** A decision, its figures, and a subject document with them in it.

## Why this is a measurement and not a discussion

Story 3.7's first task took the same shape and it worked: the candidate the
argument favoured and the candidate the figures favoured turned out to be the
same one, and the figures are what stopped it being re-litigated three tasks
later. Here the arithmetic is small and nobody has taken it:

- **What shape 2 costs in rows.** Both bars kept means the unique key gains the
  tape. Measure it rather than assume it: §7.8 measured **0.36% of bars
  superseded** and §14.1 **0.064% revised**, but the overlap that matters is
  **how many of a session's 390 minutes are covered by both tapes** — IEX's
  median minute coverage is **82.8%** against SIP's 99.7% (`LIVE-DATA.md`), so
  the duplicate set is roughly 82.8% of the session per tracked security, not a
  fraction of a percent. At 518 securities that is **~167,000 extra rows a
  day**, which is the number the decision turns on and which nothing has
  written down.
- **What that costs in bytes and in headroom**, against `BARS.md` §8.3's
  measured **199 B/row** (amended by Story 3.7's close) and §8.4's ~2.4-year
  plan. State the answer as a fraction of the plan, not as a raw figure.
- **What shape 1 destroys**, priced the same way: the IEX bar is the only record
  of what was observable live, and overwriting it leaves **no trace that the
  observation was ever made**. Epic 13's replay is built on the premise that it
  can be reconstructed, and `planning/epic-13-market-replay/EPIC.md` now carries
  a section saying so in as many words.
- **What shape 3 forecloses.** Memory-only makes Story 3.9's chart impossible to
  draw from anywhere — `LIVE-DATA.md` §10.3 declined to hold today's bars in
  memory (55.6 MB, 10.9% of the replica) **precisely because this story would
  hold them durably**, so shape 3 is not a cheaper version of this story, it is
  a re-taking of §10.3.

## The second decision, which is smaller and has a trap in it

**Served to everyone, or re-read only by the writer.** The trap is that
`GET /market-data/bars` has no notion of a caller, so "only the writer" is not a
serving rule — it would have to be a **storage** rule (a column, or a separate
table), which is shape 2's uniqueness question wearing a different hat.

What makes it a real question rather than a formality: a single venue's minute
bars are **honest but thin** (82.8% median coverage), and a user reading today's
chart from IEX-only bars sees a sparser session than the same chart tomorrow.
`PRODUCT_SPEC.md` §7.1's rule is that a reader must not be misled about
coverage — which the source note already enforces per stretch, and which is the
argument for serving it **with its label** rather than withholding it.

## Work

- **Take the row-count and byte figures above** against the local store and the
  real universe, in a rolled-back transaction or by arithmetic over
  `LIVE-DATA.md`'s measured coverage — whichever is cheaper. One table.
- **Settle decision 1 with the user**, with the recommendation stated and the
  alternatives priced. The repository's own position is recorded and should be
  quoted rather than re-derived: _historical market-data persistence is a record
  of what was observed, not a cache._
- **Settle decision 2 with the user**, and say which of the two it collapses
  into if the answer is "only the writer".
- **Open `LIVE-SESSION.md`** as this story's subject document — the file
  `CLAUDE.md`'s _Where the record lives_ will point at when the story closes —
  with §0 (if you read one section), the figures, and both decisions.
- **An ADR if decision 1 chooses shape 2**, because it changes what
  `0004_market_bars.sql`'s `market_bars_unique_bar` means and that migration
  recorded its uniqueness deliberately. An ADR is the amendment; the migration
  is immutable.
- Write the answer into Story 3.9's and Epic 13's files **the same day**, in
  words they can act on — both are named above and both already carry a section
  from Story 3.7's close.

## Done when

1. Both open decisions are settled with the user, with figures beside them
2. `LIVE-SESSION.md` exists and carries the decision, the alternatives and what
   each costs
3. If shape 2 is chosen, an ADR records it against `0004`'s decision
4. `pnpm links` resolves every reference added
