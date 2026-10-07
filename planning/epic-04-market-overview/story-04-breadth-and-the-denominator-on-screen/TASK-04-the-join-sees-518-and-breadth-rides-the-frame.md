# Task 4.4.4 — The join sees 518, and breadth rides the frame

**Status:** **Complete — 2026-10-07. The frame carries breadth. The widening costs 0.12 ms → 3.50 ms a batch — and 98.8% of that is 518 `marketDateAt` calls inside `changeFromClose`, not the count, which is 0.041 ms. The 507 this story has been quoting belongs to the OTHER break; this one reports 518.**
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.1 (the positive filter) and 4.4.2 (one classifier)

## Objective

**Breadth is the first consumer of the join that needs the whole universe**, and
every guard around that join is shaped for a handful of named symbols.

## What the user can see when this lands

**Nothing.** The frame carries breadth and nothing renders it. Task 4.4.5 is the
payoff.

## Work

- **Widen the one call site to `trackedTickers()`** — all 518 — and split by
  **positive** membership on both sections. **Do not add a second call site and do
  not widen `one-producer-of-the-overview-aggregate`'s bound**: its break is the
  weak 1→2 signal and would pass silently under a wider one.
- **Count over the 503 equities**, not all 518 — the owner's Gate 1 decision. A
  count including SPY and the eleven SPDRs alongside their own constituents makes
  this region and `Market proxies` non-independent, and in a one-sided market the
  fifteen shift the figure by up to ~2.9 points.
- **`overview.breadth`, a NEW optional key carrying a two-member union** —
  `basis: "observed"` with the five-minute coverage, or `basis: "session"` with the
  session date. **Counts, never percentages**: three independently-rounded
  percentages sum to 99 or 101, which is AC 5 as a defect. Optional **on the read
  side too**, because a rollback pins a previous image and a new bundle can meet an
  old gateway.
- **ADR 0031's obligation at a second grain**: one `WireFields` map **per union
  member**, not one over the union — `keyof` a union is the intersection of its
  members' keys, so a single map would wave the discriminating fields through
  unexamined. Build the section outside the map and spread it in a branch, as
  `encodeOverview` already does. **Non-finite drops the whole `breadth` key**,
  never a field and never `0`: a `0` under `advancing` is a plausible, readable,
  wrong figure saying _nothing in the market went up_.
- **The window is measured on `bar.startsAt` against the join's own `asOf`** — not
  on `CurrentObservation.ageMs`, which is computed with **its own wall clock** and
  would put a second clock into a function whose purity is invariant 4 made
  structural, and would be wrong under replay. **`startsAt` is also what Task
  4.1.6 measured**: the curve's 1-minute row reads 0 in all 390 samples precisely
  because a bar arrives after the minute it describes has ended. Measuring on an
  arrival instant shifts every figure in that table by a minute.
- **N is the sum, by construction, not a second measurement.** One pass, a `switch`
  over the three directions **with no `default`**, so a fourth category fails to
  compile and `advancing + declining + unchanged === N` is true by shape rather
  than by test.
- **The same window filters the numerator and the denominator.** If the counts
  fold over the whole map while N is windowed, the stated denominator and the
  counted numerator disagree — invisibly, with every number well-formed — and the
  surplus lands in `unchanged`, **collapsing _unchanged_ into _not heard from_,
  which is the one failure this story exists to prevent.**
- **Measure the widening**: 518 joins per applied batch, ~16 a minute, inside the
  socket callback. Record the figure; it is the first universe-scale per-tick
  computation on that path.

## Done when

1. `overview.breadth` carries counts and a denominator in a labelled union, with
   one field map per member
2. `figures` still carries exactly four and `sectors` eleven — asserted on a
   pass-through frame
3. `advancing + declining + unchanged === measured` holds by construction, with a
   test that fails if the pass is replaced
4. The window is `startsAt` against `asOf`, and a test proves a stale observation
   is excluded from both the count and N
5. `one-producer-of-the-overview-aggregate` still reports one call site, its bound
   unchanged, and its break re-run

## Amended by Task 4.4.1 — 2026-10-07: the trap is closed, and the number it would have cost is measured

**You can widen the join safely now, and here is what it would have cost if you
had done it first.** The proxy split was a **negative** membership test
(`!isSectorSymbol.has(…)`); it is now positive (`isProxySymbol.has(…)`), with
`overviewSymbols` and `isProxySymbol` declared as an adjacent pair so the set a
section names sits beside the set the join is given.

**Measured by performing your defect by hand, in three states:**

| state                                       | `figures` on the wire |
| ------------------------------------------- | --------------------- |
| negation alone, today's fifteen-symbol join | 4                     |
| **negation + your widening to 518**         | **507**               |
| positive filter + your widening             | 4                     |

**507 figures on the wire** — the ~56 KB frame and the five folds over 507 entries
are now measured rather than predicted.

**And the guard that protects you is in two halves, deliberately.** The e2e
assertion (`overview-frame-sections.spec.ts`, pass-through, `figures` has exactly
four) is **blind today** — with only fifteen symbols joined, the negative and
positive filters return byte-identical arrays and it passes 2/2. It becomes the
tripwire **the moment you widen the join**. The half that is red today is the grep
invariant `each-overview-section-names-its-own-set`, over the _shape_ of the split.

**So when you widen `overviewSymbols` to `trackedTickers()`:**

1. **Every section's split must consult a positive set.** Breadth is the only
   consumer of the whole answer; anything that lands in a _section_ names its own
   membership.
2. **Run `pnpm break a-section-is-handed-the-join-whole` after widening.** Today it
   reports `Expected length: 4 / Received length: 15`; after your change it reports
   **518**.

   > **CORRECTED 2026-10-07 by Task 4.4.4 — this step named the wrong number, and
   > the two breaks report different ones.** `a-section-is-handed-the-join-whole`
   > substitutes `proxies: entries`, which hands over **everything**: after the
   > widening that is **518**, in a **60,636-byte** frame.
   > `the-proxy-section-is-taken-negatively` substitutes the negation, which
   > excludes the eleven sector ETFs: **507**, in a 59,383-byte frame. **Task
   > 4.4.1's prediction of 507 is confirmed exactly — it belongs to the other
   > entry.** Both are live in both halves after the widening.

3. **The subscription is already correct and sorted.** `symbolKey` spans
   `figures` **and** `sectors`, sorted — because `sectors` arrives rank-ordered and
   `use-live-feed` keys its resubscribe on `symbols.join(",")`. **Do not add 518
   symbols to it**: breadth ships counts, not figures, and the page must keep
   asking for fifteen.

## Amended by Task 4.4.3 — 2026-10-07: `breadth` is REQUIRED on the frame, and the owner took it for a reason that lands on the region

**Gate 1 left it open and the drawing closed it.** `overview.breadth` is a
**required** key, not an optional one — which is the opposite of `sectors` and
`sectorLadderStep`, so the wire is deliberately not internally uniform here and the
docblock must say why.

**The reason is a state that otherwise cannot be reached by any floor.** If
`breadth` were optional, a frame can arrive carrying figures and no breadth —
at which point `waiting` is **false**, so `useWaited`'s 2,000 ms silence floor
**never fires**, and the region sits reserved and **silent for ever**. That is
precisely the defect Task 4.3.8 produced against `Sector performance` and repaired.
**Required makes the state not exist** rather than needing a sentence nobody has
written.

**What is still optional, and must stay so:** the **whole `overview.breadth`
section is absent** on a frame from a **previous image** — the deploy rolls the
backend first but a rollback pins an old one, so a new bundle can meet a gateway
that never heard of breadth. **That is the no-section path and it already has its
floor**, because the browser treats it as the reserved state. So:

- **required on the producer** — every frame this backend builds carries breadth;
- **tolerated as absent on the read side** — a frame without it decodes, and the
  region draws reserved rather than zeros.

**Do not express "required" by sending zeros.** A `breadth` section carrying
`advancing: 0, declining: 0, unchanged: 0` is a **claim** — _nothing in the market
went up_ — and it is the `json-schema` trap arriving on a schemaless transport: a
plausible, readable, wrong figure. The honest encoding of _we counted and heard
nothing_ is `measured: 0` with the three counts also zero **and the basis saying
which question was asked**; the honest encoding of _this gateway does not send
breadth_ is the section's absence.

### And the clause placement is settled, which bears on what you encode

**The window travels on the frame** (`windowMinutes`), because the sentence is
drawn in the browser and the count is computed on the server — **two spellings of
5 is the shape this repository refuses**, and a rollback can put them two values
apart. The **region's footer** carries the definition of _heard from_;
`OverviewSourceNote` keeps `computedAt` and **gains no breadth clause**.

---

## What was done — 2026-10-07

### The wire, verbatim off this product's own gateway

`ws://127.0.0.1:3000/market-stream`, market shut, a 1,999-byte frame with four
figures and eleven sectors beside it:

```
"breadth":{"basis":"session","advancing":335,"declining":166,"unchanged":2,"measured":503,"session":"2026-09-11"}
```

and the observed member, from the instrument:

```
{"basis":"observed","advancing":120,"declining":383,"unchanged":0,"measured":503,"windowMinutes":5}
```

**Required on the producer, tolerated absent on the read side**, and the asymmetry
is expressed in the types rather than in a comment:
`WireMarketOverviewInputs.breadth` has **no `?`** — it failed the build at seven
call sites — while `WireMarketOverview.breadth?:` is optional, because
`OverviewMessage.overview` is **one type for both the gateway and the decoder** and
a separate decoded type does not exist.

**One field map per union member.** A single map over the union covers the counts
and `basis` and **waves `windowMinutes` and `session` through unexamined** — the two
discriminating fields. A test asserts the leak directly:
`{...OBSERVED, session: "2026-09-15"}` encodes with `"windowMinutes":5` and
`.not.toContain("2026-09-15")`.

**Non-finite drops the whole section**, in the serialiser, for all five numbers —
asserted as `not.toContain("breadth")` **and** `not.toContain("null")`.

### The clock, and the two tests that hold it

`measured` is the count passing **both** filters in **one pass**:
`startsAt >= asOf − 5 × 60_000`, and `directionOf(percent) !== undefined`. The three
accumulators and `measured` come out of that pass (`measured = advancing +
declining + unchanged`), **so there is no second measurement to disagree with the
first**. `CurrentObservation.ageMs` is read nowhere in the module.

- _"excludes a stale observation from the count AND from the denominator"_ — three
  live entries at 1, 90 and 6 minutes → `{advancing: 1, measured: 1}`. Had the
  counts folded over the whole set while `measured` was windowed, `measured` would
  be 3 **and the surplus would read as _unchanged_** — the one failure this story
  exists to prevent.
- _"measures the window on the bar's OWN instant, never on an age computed at the
  read"_ — built **through `buildMarketOverview`** from a `CurrentObservation` whose
  `ageMs` is `1_000` and whose `bar.startsAt` is 90 minutes old. A count on `ageMs`
  says one advancer; the result is `{advancing: 0, measured: 0}`.

**The no-`default` switch is a `bucketOf(direction): keyof Buckets`**, because every
case returns — so a fourth `PRICE_DIRECTIONS` member makes the end of the function
reachable and `tsc` refuses it (**TS2366**). A statement-form switch would have
fallen through silently; this was the only shape that fails to compile.

### The 507 this story has been quoting belongs to the other break

**Corrected in this file's own `## Work` section.** The two breaks report different
numbers and the task file attributed one to the other:

| break                                   | substitution       | after the widening | frame    |
| --------------------------------------- | ------------------ | ------------------ | -------- |
| `a-section-is-handed-the-join-whole`    | `proxies: entries` | **518**            | 60,636 B |
| `the-proxy-section-is-taken-negatively` | the negation       | **507**            | 59,383 B |

The negation excludes the eleven sector ETFs, which is where 518 − 11 comes from.
**Task 4.4.1's prediction of 507 is confirmed exactly** — it belongs to the other
entry. Both are live in both halves now that the join is widened, against 1,999 B
in the clean tree.

### The check, and its first draft was green on the defect

**The defect somebody else writes, written first**: the join now sees 518, so
`entries` is sitting there in the right shape and
`breadth: marketBreadth(entries, …)` **compiles, runs, and produces three plausible
counts over the wrong set.**

A naive first draft asserting the section was _derived from the join_:

```
$ node scripts/check-invariants.mjs
41 invariants hold.
```

**Green on the defect, because the defect satisfies the draft by being the
defect.** The clause that catches it is **the set, named positively, in two halves**
— the section must name the binding, and the binding must name `isEquitySymbol`:

```
✗ breadth-is-counted-over-the-equities-alone
  `breadth:` does not name /\bequities\b/u:
    breadth: marketBreadth(entries, { asOf, marketOpen }),
```

and for the second shape an author writes (`!isFundSymbol.has(…)`):

```
  `const equities =` does not name /\bisEquitySymbol\b/u:
```

**And the defect's size, measured rather than argued**, over an all-observed 518:

```
count over all 518 : advancing 120, declining 397, unchanged 1, measured 518
count over the 503 : advancing 120, declining 383, unchanged 0, measured 503
```

**No literal `503` anywhere** — `equityTickers()` derives it by `kind === "equity"`.

### The widening's cost — and 98.8% of it is not breadth

400 timed iterations after 300 warm-up, two reproducible runs, **all 518 observed**
(the worst case; production sees ~332 in a median minute):

|                                          | median       | p95   | max   |
| ---------------------------------------- | ------------ | ----- | ----- |
| **before** — the fifteen, no breadth     | **0.118 ms** | 0.150 | 0.187 |
| **after** — 518 + breadth, open          | **3.497 ms** | 3.768 | 4.552 |
| after, minus breadth — the join alone    | 3.423 ms     | 3.526 | 3.685 |
| **the breadth count alone**, 503 entries | **0.041 ms** | 0.044 | 0.183 |
| the equity filter alone, over 518        | 0.006 ms     | 0.007 | 0.011 |
| join over 518 with **nothing** observed  | 0.016 ms     | 0.016 | 0.087 |
| join over 518, observed, **no closes**   | 0.019 ms     | 0.022 | 0.071 |

**0.12 → 3.50 ms a batch, ≈ 56 ms of script a minute** at ~16 batches. The frame
grows by **6–8 bytes**, because breadth ships counts.

**Attribution matters more than the total, and the count is 1.2% of it.** Nothing
observed: 0.016 ms. Observed with no closes (so `changeFromClose` returns before its
session comparison): 0.019 ms. With closes: **3.42 ms** — which is **518
`marketDateAt` calls**, one `Intl` conversion per live entry at ~6.6 µs, inside
`changeFromClose`'s same-session branch. **Not breadth's, and not this task's to
fix** — but it is the whole cost of the widening and a named candidate for Epic 14
if that path ever runs at a higher cadence.

### Two owner decisions, taken 2026-10-07

**The shut-market count names ONE session, and stragglers are outside it.** The
latest session any equity has a close for, counting only the securities whose close
belongs to **that** session — so a name the nightly backfill missed is outside both
the count **and** `measured`, visible as a smaller denominator rather than
contributing a different day's move to a figure about neither. Measured locally:
`measured: 503` on `2026-09-11`, so the store agrees today and this only bites on a
partial backfill.

**With an empty store the section names the date asked about.** `measured: 0` is
what says we hold nothing; the date says which day was asked about — on a Saturday,
a Saturday. Rejected: a market-calendar walk (`market-calendar.ts` refuses dates
outside 2024–2028, so it introduces a throw where there is none) and omitting
`session` at zero (an optional field that is present-or-absent **by count** invites
a reader to treat absence as a different state). **This is CI's state on every run**,
so Task 4.4.5 meets it.

### One widening the task file did not anticipate

**The `live` entry now carries the close it was measured against.** Without it the
`session` basis is countable only over `stored` entries — and for most of the ~80%
of the week the market is shut, this process is **still holding the session's
observations**, so that count would be taken over whatever happened to go quiet:
well-formed, small, and silent about being wrong. The rejected alternative was a
sibling reading `closesAsOf` a second time.

**And `isMarketOpen` is now exported from `feed-diagnostic.ts`** — one home for the
fail-closed predicate, rather than a second `marketSessionStateAt` plus `try`/`catch`.

### Gates

```
$ pnpm verify    exit 0, no Unhandled Errors block
41 invariants hold.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
shared 408 (22 files) · backend 1008 (49) · frontend 1279 (82) · process 41
```

**`pnpm e2e` — 178 passed, 15 skipped, 6 FAILED, and all six are machine
contention with a documented mechanism rather than an inference.** `e2e/README.md`
already records this exact signature: _"At four workers on a loaded laptop, three
of the heaviest specs — the 518-row universe render and two whole-document axe runs
— time out at 30 s and pass in isolation in 8–16 s. That is contention rather than
flake… which ones fail changes between runs."_

- `check-quiet.mjs` printed **`load average 11.9 across 8 cores`** at the start, and
  `uptime` during the run read **20.93 / 24.01 / 14.87** with Chrome at 119% CPU.
- **All six pass in isolation**: 43 passed across four specs, the five timeouts at
  **11.1–14.8 s against a 30 s ceiling**; `security-price-chart.spec.ts:909` alone
  at 14.8 s.
- **The same axe test passed at three other viewports in the same run** (23.6 s,
  38.8 s, 27.9 s) and only the 640 px instance timed out.
- **And the backend mechanism is absent entirely**: locally `provider: "none"`, so
  there are **no applied batches**, so this task's 3.5 ms costs nothing on this
  machine.
- **All 18 overview browser tests were green in the full run.**

`pnpm test:database` not run — no migration, schema, query or repository touched.
`pnpm probe /` — no page error; `areaBreadth` `342×486` at 1440, still `reserved`.

### Two more corrections owed downstream

**`STORY.md`'s inherited geometry says `Market breadth` is 121 px at 390. It
measures 139.** Task 4.4.5 measures from 139.

**Four furnished-frame browser specs now send overview frames with no breadth** —
the legitimate "previous image" state. Task 4.4.5 adds it to them, or its region
draws reserved in those specs.

## For a stakeholder — a status report, 2026-10-07

**Nothing is on screen.** The server now counts how many of the 503 companies we
track are up, down and unchanged, and sends those counts with every update. The
next task draws them.

The interesting part is what the measurement found. Widening the calculation from
fifteen securities to all 518 costs **3.5 milliseconds** per update — and **the
counting is 1.2% of that**. Almost all of it is a date conversion the existing code
already did per security, now done 518 times instead of fifteen. That is not this
story's to fix, but it is now measured and named rather than suspected, and it is a
candidate for the performance epic if that path ever runs more often.

Two numbers this story has been quoting were wrong, and both are corrected. A test
that was supposed to prove a specific failure reports **518**, not the 507 we have
been citing — 507 belongs to a _different_ test, and the earlier prediction of it
was exactly right about the wrong thing. And the region's height on a phone is 139
pixels, not the 121 the story records.

**The browser suite had six failures and none of them is this change.** The
mechanism is documented in the repository already — a loaded machine times out the
heaviest tests at thirty seconds, and which ones fail changes run to run. All six
passed alone in eleven to fifteen seconds, the same accessibility test passed at
three other screen sizes in the same run, and the server code this task changed
**cannot run on this machine at all**, because no market data provider is
configured locally.
