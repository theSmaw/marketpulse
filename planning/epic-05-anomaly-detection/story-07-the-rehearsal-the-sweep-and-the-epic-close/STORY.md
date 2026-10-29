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

  **Refined 2026-10-21 by Story 5.6's Gate 1, and you are right about the verb
  rather than the sentence.** `exceeds` **is** the measurement word and **is**
  the keeper — that judgement stands and 5.6's AC 7 agrees with it. What 5.6's
  AC 7 forbids is the **adverb**: `substantially` is an intensity word standing
  where a figure belongs, and `related securities` is a population with no
  stated count, which §9 refuses. So when you rewrite the exit criterion as a
  shape, the shape for this line is **`exceeds` + a figure + a named
  reference** — the shipped clause is `behind by 2.20 pts against XLK` — and
  **not** the §11 sentence quoted verbatim. `PRODUCT_SPEC.md` §11 now carries a
  dated amendment saying the same thing, so the two documents agree.

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

## Handed here by Story 5.5's close and its next-day sweep — 2026-10-21: FIVE unwatched rows, and the one figure you cannot find without writing a query first

**This story owns the sitting, and this file had nothing in it about the sitting's
contents.** Found by grepping for this story's own number at Story 5.5's sweep —
the fourth consecutive hand-off this epic has had to write after the fact.

**What is owed a person, and `pnpm invariants` prints the last of them on every
run until somebody clears it.** `LIVE-REHEARSAL.md` carries rows **5.1, 5.2, 5.3,
5.4 and 5.5 all unwatched** — the whole of Epic 5's visible output — plus **Epic
4's waived 390 row**, whose `Owner:` is this epic. Five rows is not five sittings:
5.1, 5.2 and 5.4 are watchable in one session on one deployed page, and the two
that are not are below.

**Row 5.3 (the percentile) is checkable against nothing on screen.** Its inputs
are 60 sessions of a table no browser reads, so **the only external check that
will ever exist is a person with a public five-minute chart and a calculator**.
Budget for that rather than discovering it in the chair.

**Row 5.5 (the volume multiple) is the hard one, and its status CHANGED on
2026-10-21 — read this before planning around the word _unwatchable_.** The row
was written as the ledger's first **unwatchable** row, on the reasoning that the
figure needs `iex` depth that does not exist. The first deployed nightly pass
then reported:

```
volume buckets — 4 drawable of 39928 with samples, 39924 too few sessions,
  0 zero volume, 8 empty; 2164895 minute samples, target 5% relative SE
```

So **4 of 39,936 `(security, 5-minute bucket)` pairs draw the figure today —
0.010%**. It is **improbable, not impossible**, and that changes what this story
has to do:

- **The pass prints the COUNTS and not the PAIRS.** So a sitting cannot find a
  drawn figure by browsing — at 0.010% a reader would open thousands of pages.
  **The cheap fix is a one-line change to the pass's summary: print the drawable
  `(symbol, bucket)` pairs, not just how many there are.** It is this story's to
  take or to decline, and declining means the figure stays unwatched until depth
  broadens. Nothing else in the product can answer _which four_.
- **The bucket is a TIME OF DAY**, so even knowing the pair, the sitting has to
  happen in that five-minute window of the session. Two constraints multiply.
- **Expect the refusal to be the sitting's real subject**, and know **which**
  refusal: `no-same-tape-baseline` reaches **no reader of the deployed product**
  (every security has `iex` history since 2026-09-23) — it is the permanent state
  of **CI and every laptop**, which is why two documents wrongly called it the
  common case for a day. The deployed refusal is **`too-few-sessions`**, at
  **99.990%** of buckets: `Too little history — 80 IEX minutes at this time of
day`.

**Four questions only a person can answer, and three of them are about the
refusals rather than the figure** — so they are answerable at the next sitting
whatever the depth has done: whether `Too little history — 80 IEX minutes at this
time of day` reads as _careful_ or as _broken_; whether **`Measured on IEX ·
baseline on IEX` sitting directly beneath the return's `Measured on IEX · baseline
on All US exchanges`** reads as two honest claims or as one contradiction — which
Task 5.3.3 deliberately left to a person and a second band has now sharpened;
whether **six refusal sentences in one region** read as thoroughness or as noise;
and, if a drawable pair is found, whether `4.1× typical` reads as a **different
kind of number** from the tinted `+0.42%` twenty pixels above it, for which five
channels were designed and none has been seen.

**And the rule that produced all of the above, because this story is the epic's
sweep and will hit it again:** both wrong claims came from the local store and CI,
which hold **zero `iex` rows** and can reach **exactly one** of six refusals. **A
taxonomy cannot be ranked from a machine that can only produce one of its
members** — so when this story sweeps Epic 5's claims, check which **store** each
one was measured on before trusting it.

## Handed here by Story 5.6's close — 2026-10-29: the score exists, and what you must sweep, watch and decide

Story 5.6 shipped the composite. Five things this story owns that it does not yet
carry.

**1. `LIVE-REHEARSAL.md` row 5.6 is the sixth this epic owes, and it is the FIRST
that is fully watchable.** Rows 5.1–5.5 are unwatched and row 5.5 is
**unwatchable** for its figure — it waits on a date nobody controls. **Row 5.6 is
not.** A composite score draws on an ordinary laptop today, because the excess
factor needs only stored daily closes, and it draws on the deployment on both
bases. **So this is the row a sitting can actually clear**, and it should be
taken first rather than last.

What a person must judge, none of it answerable from a DOM: whether `61 / 100`
beside a ledger reads as **an instrument showing its working** or as a debug
panel; whether `TOP 10 · ALL EXTREME` on `/` reads as _today was wild_ or as
_something is broken_; and whether a region drawing **four refusal rows and no
score** — which is CI's permanent state and every cold laptop's — reads as a
product being careful or a product being empty.

**2. The band distribution is measured and may not survive contact with a
reader.** Per instant over 484 scored securities: `normal` 219.2, `elevated`
179.4, `high` 39.3, **`extreme` 7.74**. And on `/`'s top ten the band is
**identical on all ten rows in 35 of 77 instants**, with more than three sharing
in **77 of 77** — which is why the chip left the row and became a heading. **If a
sitting says `extreme` fires too often to mean anything, the floors are the
lever, and they carry a reversal trigger as a condition.**

**3. The exit criterion's rewrite inherits two corrections.** `Extreme short-term
move` uses a **band name** as a factor adjective, which AC 7 forbids —
`PRODUCT_SPEC.md` §11 and both copies of the criterion carry dated notes. And
your own keeper claim was refined on 2026-10-21: **`exceeds` is the measurement
word and is right**; what AC 7 forbids is the **adverb** `substantially` and the
uncounted population `related securities`.

**4. The volume factor ships as a STATED ABSENCE and that is not a defect to
close.** It is `no-distribution` **unconditionally** — `0015` stores a median and
a dispersion, **not a distribution**, so there are no breakpoints to rank a rate
against for any security. The arm's reversal trigger is a condition: _the first
nightly pass that stores a distribution of a factor's own quantity._ **When it
fires, the band floors' own trigger fires in the same commit**, because every
quantile behind them was measured on a two-factor, max-75 scale.

**5. What Story 5.6 leaves open for you to verdict.** The owner's sentence
`Measured, but no history to rank it against.` is **drawn nowhere** — the ledger
cell is ~34 characters and the sentence is 43, so the cell reads `no history to
rank it`. The honest home for the full sentence is the volume band beside a
**drawn** multiple, which needs `iex` depth no machine has. **Decide whether it
is owed or withdrawn.**
