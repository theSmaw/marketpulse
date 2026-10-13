# Story 5.7 — The Rehearsal, the Sweep, & Epic 5's Close

**Status:** Not started
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.6
**Epic scope covered:** the close

## Description

**The close, and this epic inherits a shape that has now been run twice.**
Epic 3's close is the template and Epic 4's is the correction to it; both
records are worth reading before this story starts, and Epic 4's close is the
one that found the gate.

**One thing is different here and it is the exit criterion itself.** Epic 5's
criterion is a worked example — `NVDA — Anomaly 91`, `Volume 3.8× normal`,
`Underperforming semiconductor peers` — and **four of its five clauses cannot
be checked as written**, because of decisions this epic took deliberately:

- **`91` is a specific value of an unspecified formula**, so nothing can fail
  it — and under Story 5.1's decision 5 (absolute calibration) it is **not
  producible on demand**, because it requires a security to actually have an
  extreme move. Under the cross-sectional alternative it would be producible
  every day, which is precisely why that alternative was refused.
- **`NVDA`** makes the criterion a claim about the market on the day it runs.
- **`Volume 3.8× normal`** uses `normal`, which is a band name, where the
  volume section's own example says `typical`.
- **`Underperforming semiconductor peers`** asks for a comparison the taxonomy
  deliberately does not support: semiconductors is an **industry group of 20
  members with no benchmark ETF**, and `UNIVERSE.md` §5 says this epic must not
  assume one. Reachable as a peer median or a count; not as _relative move vs
  sector_. And `Underperforming` is a judgement word where §11's own composite
  example says `Move substantially exceeds related securities` — a measurement
  word, and the one to keep.

**So this story rewrites the exit criterion as a shape rather than a number**,
and verdicts the epic against the rewrite with the original left standing as
the record of what was asked for.

## What the user can see when this story lands

**Nothing new**, and an epic whose figures can be re-taken rather than cited.

## Acceptance criteria

1. **Every acceptance criterion in Stories 5.1–5.6 has a verdict with an
   instrument named**, split between **re-takes from a clean clone** (which must
   be a runnable command) and **dated readings** a later reader cannot
   reproduce. Epic 4's close found that only three of its eight stories had
   published a per-criterion verdict of their own; this epic's stories each owe
   one, so the close can quote rather than reconstruct.
2. **The exit criterion is rewritten as a shape**, with the original quoted and
   left standing, and the rewrite is verdicted. The shape, as a starting point:
   _for a security whose recent behaviour is genuinely unlike its own history,
   the product draws a 0–100 figure, a band, and an account naming every
   contributing factor with its figure, its population and its tape — and for a
   security it cannot score, it says which factor it lacked._
3. **A person has watched a score against a real session**, with a dated row
   per visible story in `LIVE-REHEARSAL.md` and `What was wrong` filled
   honestly. **Four things only a sitting can return**, and they are this
   epic's own: whether an absolutely-calibrated score is _ever_ high enough to
   be interesting on an ordinary day; whether a pooled percentile makes the
   **09:30 burst** the whole list, which is Story 5.1 decision 3's known cost
   and its reversal condition; whether a reader reads the amber ramp as a risk
   meter; and whether the explanation is **read** or skipped.
4. **The upward sweep**, run against the list **and** against a grep, with live
   claims amended by date and historical records left standing. Known
   candidates: `PRODUCT_SPEC.md` §11's four factors and its two worked examples,
   §9's `Unusual Activity` sketch, `PROVIDER.md` §3.4's "Epic 5 is the stronger
   reader" and §3.6's trigger, `market-bars.ts`'s `STORED_BAR_ADJUSTMENT`
   docblock, and `UNIVERSE.md` §5's drift table.
5. **The hand-off enumeration run and its count recorded — the seventh data
   point**, including if it is zero. The record reads **1, 6, 3, 6, 2, 8**, and
   Epic 4's run found that **six of its eight were recipients the prescribed
   grep could not find**, so the walk matters more than the grep. Known
   recipients: **Epic 7** (`Investigate` belongs on the security page beside
   the factors it automates, not on a list row where it would be a second
   answer to _what does Enter do_; and §17's tool names are this epic's factor
   functions), **Epic 8** (a band and a confidence chip must not share a
   component, and **confidence must never be four amber fills**), **Epic 6**
   (row 1's content floor, and the `reserved`-versus-rollback finding this
   epic's region leaves live for theirs), **Epic 13** (the baseline keyed by
   session, and the membership row), and **Epic 14**.
6. **`docs/GAPS.md` updated**, with anything mechanisable made mechanical and a
   `pnpm break` for every check added. The standing candidates this epic
   creates: the unmeasured two-tape row inflation, the pooled distribution's
   open-reads-unusual bias, and the relative-move weighting effect nothing has
   quantified.
7. **`pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links` green,
   with their numbers rather than an assertion**, taken **once on the final
   tree** — a number taken on an intermediate tree is not a reading of the thing
   being closed. Load read **before** each run, never during.
8. **Epic 5 closed**, its exit criterion verdicted, and everything shipping
   open carrying an **owner and a condition** rather than an epic number —
   including `Anomaly history`, deferred at Gate 1 with the condition _the first
   surface that needs a score older than the process_.

## Design work

The canvas artefacts this epic produced are verdicted as finished or not, and
`VISUAL-LANGUAGE.md` is reconciled with anything the canvas gained — the chain
is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components**, and it only
stays true if a close walks it. **Note two outstanding canvas items this epic
inherits rather than creates**: there is no anomaly page among the canvas's 27
files, and `The motion vocabulary.dc.html` has carried **two stale story
numbers since 2026-09-21**, recorded on a sibling page and still wrong, because
nothing in this repository can grep the canvas.

## Out of scope

Epic 6's topology, Epic 7's investigations, and `Anomaly history`.
