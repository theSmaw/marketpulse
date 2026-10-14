# Story 5.5 — The Volume Factor, & the Tape It Rests On

**Status:** Not started
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.3
**Epic scope covered:** intraday volume baseline, volume-ratio calculation

## Description

**This story opens with a measurement, because the factor cannot be built
honestly without it and nobody has taken it.**

Every coverage figure in this repository is a **minute-presence** share — 65.1%
median per-symbol minutes on IEX, 82.8% median on the stored endpoint, 99.7% on
the consolidated tape, `CCI` at 43.1%. **There is no measurement anywhere of
IEX's share of VOLUME.** A security present in 65% of minutes may carry 2% of
the shares.

**The consequence is not noise, it is a large unknown multiplicative bias.** An
IEX numerator over a SIP baseline is **systematically far below 1 regardless of
how unusual the volume is**, so `4.1× typical` could honestly read `0.3×
typical` on a genuinely heavy day. §11's `Volume 3.8× normal` is uncomputable
until the share is known.

**And the measurement is cheap and available today**, because ADR 0035 keeps
both tapes: settled live-written sessions hold a `sip` row and an `iex` row for
the same minute, so a per-minute `sum(iex.volume) / sum(sip.volume)` over a
reconciled session — per security and in aggregate — is a query against data
already stored.

**§11's wording hides four decisions in one word.** _"the historical median
volume for the same **approximate** time of day"_ does not say the numerator's
interval, the bucket width, the lookback, or whether today is excluded. The
intraday volume curve is U-shaped and steep at the open, so the bucket width is
a real choice: minute-of-session is noisiest and most faithful, a 5-minute
bucket matches the window, a 30-minute bucket smooths the open away.

## What the user can see when this story lands

**A volume figure in `Abnormal-move indicators`** — _"volume 4.1× typical for
this time of day"_ — with **its baseline defined and its tape named**, beside
the return and the percentile.

## Acceptance criteria

1. **IEX's share of consolidated volume is measured first**, per security and
   in aggregate, over at least one reconciled session, and recorded as a dated
   observation. No volume figure is drawn before it exists.
2. **The tape rule is same-tape or refusal.** The baseline is built from the
   **same `feed`** as the numerator, or the figure is refused. The fallback,
   if the same-tape baseline is unavailable for a security, is to **refuse
   during the live session and compute only on settled sessions** — a composite
   with three factors and a stated absence beats a fourth factor with an
   unmeasured bias.
3. **The word is `typical`, not `normal`.** §11 contradicts itself inside one
   section — `4.1× typical` in the volume example, `Volume 3.8× normal` in the
   composite example — and `normal` is **also a band name**. The exit
   criterion's `3.8× normal` is the collision, not the model.
4. **An absent bar is not zero volume.** On IEX an absent bar is **ordinary**
   rather than a claim that nothing traded. `describeSilence` already carries
   this lesson: `No shares changed hands anywhere in the window` was the only
   shipped sentence claiming something about **the market** and had to be
   narrowed to name the venue.
5. **A zero-volume baseline is a refusal, not an `Infinity`** — a non-finite
   figure leaves the set, which is `directionOf`'s precedent.
6. The baseline's **bucket width, lookback and exclusion of the scored
   window** are stated on screen in the figure's own terms, and the baseline is
   a **median** rather than a mean — the one robust choice §11 does make.
7. A bucket with fewer than a stated floor of sessions is **refused**.
8. The same purity, window-on-`startsAt`, and no-`?? 0` rules as every other
   factor.

## Design work

One more figure in a column whose idiom Story 5.1 set. The figure is a
**multiple** rather than a percentage, which is a different shape from
everything else on the page — and `VISUAL-LANGUAGE.md` §628 already reasoned
about exactly this multiple when it sized the volume plot, so read it before
choosing a treatment.

## Out of scope

The composite, the bands' boundaries, and anything on `/`.

## Handed here by Story 5.2's close — 2026-10-14: the window holds one tape, and the moment you read the store it holds two

**The in-memory trailing window cannot mix tapes, by construction.** Every bar in
it arrives from one `MarketDataStream` whose feed is `iex`, so anything computed
from it is `iex`-over-`iex` — which is why `Abnormal-move indicators` says
**`Measured on IEX`** and does not inherit the chart's `All US exchanges` a few
centimetres away (invariant 6).

**Your volume factor is the first thing in this epic that must read the store**,
and that is where the trap this epic opens with becomes real. `market_bars` holds
up to **two rows a minute** — `feed = 'iex'` and `feed = 'sip'` (ADR 0035) — and
the two reads behave differently: `readSeries` reduces a minute to one bar under
`SERVED_TAPE_RANK` preferring `sip`, while `readBars` **answers every row,
including two for one minute**, and its own docblock says it does not answer the
tape question for you.

So **a volume ratio with a live IEX numerator over a stored SIP baseline compares
two different tapes**, and since 2026-09-23 that can happen **entirely inside the
store**: the minutes in progress before the nightly backfill, and extended hours,
which the backfill never asks for and which are therefore the live tape's
permanently. IEX is one venue's prints and SIP is consolidated — on volume the
difference is not a rounding error, it is the whole quantity.

**Pick a tape explicitly, say which on screen, and do not let the two reads
choose for you.**

**One more thing you inherit**: the window is **six to seven minutes deep**, so
it is not your baseline. A median volume for the same time of day is a store read
of a different shape, and `one-home-for-the-observation-window` permits exactly
two minute-scaled cutoffs today — yours is a third quantity and owes its own
conjunct, constant and argument, the same as Story 5.3's lookback.
