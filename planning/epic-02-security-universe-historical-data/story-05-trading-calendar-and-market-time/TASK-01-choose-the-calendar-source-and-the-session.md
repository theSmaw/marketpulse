# Task 2.5.1 — Choose the calendar source, the session definition and the clock's shape, shipping nothing

**Status:** Not started
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Story 2.3

## Objective

Settle the story's three open decisions, plus the two the story does not name and that the
tasks after this one cannot proceed without, and write them down. **Ship no code**, exactly
as Tasks 2.1.1, 2.2.1 and 2.3.1 did.

## What the user can see when this lands

**Nothing, and no file outside `planning/` changes.** The tree finishes byte-identical and
`pnpm verify` is exit 0 — which is the check rather than a formality, because this task is
the one most likely to "just try something" and leave a stray dependency behind.

## Where the record goes

`CALENDAR.md`, beside this file. That is `HOSTING.md`'s, `DATA-LAYER.md`'s and
`UNIVERSE.md`'s arrangement: one document per story subject, in the story that owns it,
pointed at from `CLAUDE.md` rather than copied into it. Epic 13 will read this document
before it writes a replay clock, so write it for that reader.

## The decisions

### 1. Calendar source — and note the shape of the answer is nearly forced

The story offers three: a provider endpoint, a checked-in table, a computed rule set.

- **A provider endpoint is circular here.** Alpaca has a calendar endpoint, but reaching it
  needs the provider abstraction, which is **Story 2.6, and Story 2.6 depends on this
  story**. Adopting it would also break acceptance criterion 5 — fast unit tests, no
  database, no network.
- **A computed rule set fails on one holiday and that holiday is the argument.** Nine of the
  ten US market holidays are nth-weekday or fixed-date rules a hundred lines of code can
  produce. **Good Friday is Easter-derived**, moves on a lunar-solar cycle, and is not in any
  federal holiday list because it is not a federal holiday — it is a market one. A rule set
  that gets nine right and Good Friday wrong is worse than no rule set, because it looks
  correct for eleven months.
- **So the expected answer is a checked-in table**, and the work here is deciding its
  _shape_ rather than its existence: which years it covers, what a date outside that range
  does, and whether half days are rows in the same table or a second one.

Record the reversal: the day the provider's calendar is reachable, this table becomes the
thing you _check against_ it rather than the thing you replace. Name that as a Story 2.7
opportunity rather than an obligation.

### 2. Pre- and post-market — in or out for V1

The story states the cost of each and does not choose. Choose, and state the consequence in
the three places it lands rather than in the abstract:

- **Story 2.8's bars** — whether a missing 08:15 bar is a gap or correct
- **Epic 5's volume baseline** — "4.1× typical volume" is a different number if the
  denominator includes thin pre-market minutes
- **Epic 13's replay** — what the clock's start and end of day are

Note the datum that removes some of the guesswork: **Alpaca's free tier is IEX**
(PRODUCT_SPEC §7.1), and extended-hours IEX volume is thin enough that an anomaly baseline
built on it is measuring the venue rather than the market. Say whether that argument was
used, because Epic 5 will want to know.

### 3. Whether the clock is built now or its seam merely reserved

The story's own middle answer — _one module that answers "what time is it, in market terms",
with a single implementation today_ — is almost certainly right, and Task 2.5.5 assumes it.
What is left to decide here is narrower and sharper: **does that module take an injectable
clock now, or does it read `Date.now()` and get a parameter in Epic 13?**

Prefer the version where **every call site already passes an instant**, and only the very
top of the application reads the wall clock. That is the difference between Epic 13 changing
one module and Epic 13 changing every caller — and invariant 4 is explicit that the retrofit
is the failure mode.

### 4. The one the story does not name: where this code lives

`packages/shared`, `apps/backend`, or a fifth workspace package. It is not a free choice:
**Story 2.8's ingestion (backend) and Story 2.12's chart axis (frontend) both need it**, so
`packages/shared` is the only home that does not produce two copies. Two costs to state
rather than discover:

- `packages/shared` is **consumed as built output**, so a change here means rebuilding
  before either app typechecks against it
- it is **inlined into the frontend bundle**, and Task 2.3.8 measured that a vocabulary
  built by _calling_ a function is not tree-shaken while a plain literal is. A holiday table
  is a literal and should be free when unused; a table built by mapping over a rule is not.
  **Predict the bundle cost here and have Task 2.5.6 measure it.**

### 5. The other one the story does not name: what a market timestamp is on the wire

Story 2.9's contract and Story 2.8's rows both need this settled before they are written.
The candidates are a UTC ISO 8601 instant, an epoch millisecond, or an ET-local string.
`migrations/README.md` already fixes the _storage_ half (`timestamptz`, always) — this is
the JSON half. State it, and state that an ET-local string on the wire is the one that
cannot represent 2026-11-01 01:30 unambiguously.

## Work

- Answer all five above with the argument, not just the answer
- **Check whether a dependency is needed at all, by measurement rather than reflex.**
  `Intl.DateTimeFormat` with `timeZone: "America/New_York"` and `formatToParts` is present
  in Node 24 and in every browser the §3 baseline admits, and it is what a date library uses
  underneath. Check `Temporal` too — if it is available unflagged in Node 24 _and_ the
  browser baseline, say so; if it is not, say that rather than leaving it as a maybe. This
  repository has thrown away two schema libraries and a CORS hand-roll on measurements like
  this one, and the standing rule is that a library wins when its failure mode is _silent_
  and ours is _loud_. Timezone arithmetic done wrong is silent, so a library is not
  obviously the wrong call — take the measurement and decide
- If a library is proposed, cost it the way Task 2.2.1 costed Kysely: store entries, KB,
  lockfile lines, install scripts, from a **fresh install**, then revert
- **List the named dates the story's criterion 1 will be asserted against**, so Task 2.5.4
  implements against a list somebody chose rather than a list somebody remembered. It needs
  at minimum: a full holiday, a half day, Good Friday, a weekend, both DST transitions, and
  the day _after_ a DST transition
- Leave the tree byte-identical

## Done when

- `CALENDAR.md` exists and answers all five, each with the alternative and why it lost
- The dependency question is answered by a measurement, and if anything was installed the
  lockfile and `pnpm-workspace.yaml` are `diff`-clean afterwards
- The named-date list exists and Task 2.5.4 has nothing left to choose
- `pnpm verify` is exit 0 and `git status` is clean outside `planning/`

## Notes

The temptation is to skip this and start writing `isMarketOpen()`. The reason not to is that
four of the five decisions above are cheap now and expensive in Story 2.8 — and the fifth,
the clock's shape, is the one Epic 13 cannot repair from outside, which is the same position
Task 2.4.1's seam was in.
