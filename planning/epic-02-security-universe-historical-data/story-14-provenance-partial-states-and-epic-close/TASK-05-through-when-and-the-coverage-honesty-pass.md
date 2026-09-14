# Task 2.14.5 — Through when, and the pass over every string that could imply the whole market

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.3

## Objective

Two halves of one claim.

**First**: say what period is on screen and **through when** the data runs, in
whatever form 2.14.1's decision 3 settled — §36's _"displaying data through
10:42:17"_ shape, static here and continuous in Epic 3.

**Second**: the coverage-honesty pass. Read **every user-facing string this epic
added** and check that none of them states or implies full US-market coverage
where the product does not have it, and — since 2026-09-07 — that none of them
_understates_ it either, because stored bars are the consolidated tape and a
disclaimer on them is also a false claim. This is acceptance criterion 2, and it
says explicitly: _checked by reading every string, not by intent._

## What the user can see when this lands

**How current the numbers are, without working it out from an axis.** The
Security Explorer already says which window it is showing; after this it says
what that window actually contains and where it stops — which is the difference
between a chart and a chart an analyst will quote.

## What is already decided and must not be re-taken

- **The coverage rule is settled and it is geometric**, not textual: a mark
  derived from the **window** runs the full frame, a mark derived from the
  **bars** stops at the coverage edge (ADR 0027, `CHARTING.md`). This task adds
  words about coverage; it does not re-decide what the picture does.
- **A named window ends at the last session whose bell has rung** (ADR 0028,
  amended 2026-09-14). Any sentence about "through when" must agree with that,
  or the page contradicts its own axis before the open.
- **The store's lag is answerable and already answered.**
  `GET /diagnostics/freshness` computes _how many trading sessions behind_ on
  request — it has no schedule to miss — and `check-deployed.mjs` already fails
  on it after a merge. If a sentence needs to know whether the store is behind,
  that is the thing that knows.
- **Two stores photograph differently and both are correct.** The deployed store
  answers the default window in full; a developer's answers it short; **CI's has
  zero bars**. A sentence about recency reads differently in all three, which is
  the constraint on how it is asserted (`pnpm store:bare` reproduces the third).

## Work

- **Implement decision 3's form**, wherever 2.14.2 placed it, and make it read as
  a statement of fact rather than a warning. Nothing has gone wrong: a historical
  chart that ends yesterday is a correct historical chart. §36's sentence has an
  alarm in it because something disconnected; this one must not borrow the alarm.
- **The sentence must survive the three stores.** Full, short and empty. The
  empty case belongs to `ChartVacancy` (2.14.6) and this sentence must not
  duplicate it — one absence explained twice in two voices is worse than either.
- **Then the pass, and do it as a pass rather than as a memory.** Enumerate the
  strings mechanically: every user-facing literal added by Stories 2.3 through
  2.13, plus `MARKET_FEED_DESCRIPTIONS`, `SECTOR_LABELS`, the vacancy copy, the
  rail, the failure sentences, the announcements (which are strings a user
  _hears_ and are the ones most likely to be skipped), the page titles and
  `README.md`'s description of what the product shows.
- **Judge each against two failure directions, not one**: implying coverage the
  plan does not have, and disclaiming coverage the plan does have. This story's
  own scope prose fails the second test in two places and is on the list for
  2.14.10's sweep.
- **Every phrase containing the word "market"** gets read individually. It is
  the word that does the implying, it is in the product's name, and it is in at
  least four component vocabularies.
- **Make what can be mechanical, mechanical.** If the pass produces a claim of
  the form _"no shipped string says X"_, that is a single grep and belongs in
  `pnpm invariants` with a `pnpm break` entry beside it — `CLAUDE.md`'s rule is
  that an entry that can be made mechanical should be, and this epic has already
  moved two batches out of prose that way. A check you add owes a break.
- **What cannot be mechanical goes in `docs/GAPS.md`** with a `Re-measure:` line
  that names a file that exists — one of the seven had already rotted by naming
  a file whose constants had moved, and it looked exactly like a pass.

## Done when

- Recency renders in the settled form and agrees with the axis and with ADR
  0028's bell rule.
- The string pass is **recorded as a list** in `PROVENANCE.md` — what was read,
  what was changed, what was left and why — not summarised as "checked".
- Any claim that could become a grep is a `pnpm invariants` step with a
  `pnpm break` entry, and `pnpm break <name>` was run and went red.
- `pnpm verify` passes; the page was looked at at 1440 and 390 before any suite.

## Notes

The most likely thing to go wrong here is tone. Every sentence this task writes
is about something being incomplete, and five of them together will make a
working product read as a broken one. That is a design finding, and it belongs
back on 2.14.2's canvas rather than in a CSS file.
