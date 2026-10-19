# Task 5.5.2 — IEX's share of volume, measured

**Status:** Complete — 2026-10-19 — the route carries **both** ratios with `bias = share × exposure` checked on the body, and it produced **the finding AC 7 was waiting for, which reopens part of Gate 1**: at the shipped 60-session lookback, on the tape with **100% depth**, a median volume's relative standard error is **4.75% (NVDA) to 16.2% (ERIE)**, and 5% would need **98 to 727 sessions**. So **a one-decimal multiple implies a precision the data does not support for most securities** — the floor is a function, not a constant, and the lever is **printed precision rather than lookback**. Also: one break **could not be made to fail at all**, which merged two overlapping gates into one; and `baseline-cost.ts` had claimed since 5.3.2 that its schema was asserted in a test **that did not exist**. `Done when` item 2 — the deployed run — is **owed by the merge**.
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.1

## Objective

**Every coverage figure in this repository is a minute-presence share. There is
no measurement anywhere of IEX's share of VOLUME**, and a security present in
65% of minutes may carry 2% of the shares. AC 1 gates the story on taking it.

Gate 1 established that AC 1 is **not** a gate on the whole story — AC 2's
same-tape rule removes the cross-tape bias AC 1 exists to bound — but the
measurement is still owed for two narrower things: a bound on the fallback, and
the product input on whether a live `iex/iex` figure is worth drawing at all.
**And Gate 1 widened it**: without per-bucket dispersion, AC 7's sample floor is
**chosen rather than derived**.

## What the user can see when this lands

**Nothing.** An operator surface and a dated observation.

## Work

- **Extend `GET /diagnostics/baseline-cost` rather than adding a route.** It
  already ships, already loops one security deliberately, already returns
  `sipRows`/`iexRows` via `store.tapeCounts`, and the owner already ruled
  (2026-10-14) that AC 1's _not in a route_ governs **computing for a reader**,
  not **measuring**. `CLAUDE.md`'s _run it, record, delete_ shape does **not**
  apply: that is for a throwaway harness, and this is a permanent operator
  surface whose existing justification covers the new question unchanged.
- **Report the ratio BOTH ways, because `STORY.md`'s single
  `sum(iex)/sum(sip)` conflates two different questions.** Over **all** `sip`
  minutes it is the **bias** of an `iex` numerator over a `sip` baseline —
  minutes IEX never printed stay in the denominator and contribute 0, which is
  honest because IEX's volume genuinely was nothing there. Restricted to
  **minutes present on both tapes** it is **IEX's share of volume**. The two
  differ by exactly the minute-presence shortfall, and the pair factors the bias
  into coverage × venue share.
- **An absent IEX bar is never a 0.0 sample in the per-minute distribution**
  (AC 4). It is excluded from that distribution and present in the all-minutes
  denominator.
- **Summed-then-divided for the headline, with the per-minute distribution
  beside it.** `Σiex/Σsip` is the volume-weighted mean of the per-minute ratios;
  the unweighted mean is a different number, because the intraday curve is
  U-shaped and thin midday minutes would get equal weight with the open. Carry
  **p10 / median / p90**, because the factor compares one 5-minute bucket rather
  than a session and the dispersion decides whether any single constant is
  defensible.
- **Carry per-bucket dispersion (CV)**, which is what AC 7's floor is derived
  from: relative SE ≈ `1.253·CV/√n`.
- **Reconciled is a per-tape count, not a ledger read** — `bar_coverage` is
  tape-blind (see 5.5.1). A session qualifies if it holds ≥1 `sip` row for that
  security **and** is on or after **2026-09-23**, the live writer's start date,
  because an earlier session cannot hold IEX.
- Every numeric declared `["number","null"]`. `fast-json-stringify` turns a
  `null` under `"number"` into **`0`** — here, _we could not measure_ into _IEX
  carries none of it_.
- **Keyed on `securities.id`, not reached through a join** — `windowQuery`'s
  measured finding: through a join the top node is a `Sort` **per security**,
  516 times. Sums come back as **strings** (`bigint`); parse beside the query.
- **Run it against the deployment and record the body VERBATIM** in this file.
  Then say plainly what it does and does not support: a 60-session window today
  exposes ~18 of ~62 sessions to two-tape writing, so any figure is a
  **partially-exposed** observation, and one session carries no variance.

## Done when

1. The route answers for a named security and in aggregate, with both ratios,
   the per-minute distribution and the per-bucket dispersion.
2. It has been **curled against the deployment** and at least one body is quoted
   verbatim here, with its date.
3. The figure's bound is stated: how many sessions were exposed, and that it is
   n=1 in sessions.
4. `pnpm verify` green; the query covered by `pnpm test:database` against a
   hand-built two-tape store, which **no existing database suite builds**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-19

### The shape, and the one decision this task took against the story

`GET /diagnostics/baseline-cost` gained two members, `volumeShare` and
`volumeDispersion`. No route was added; `apps/backend/src/volume-share.ts` is
the new module and it is **pure** — the sessions and the minutes are arguments,
so nothing in it reads a clock or a store.

**`STORY.md`'s single `sum(iex.volume) / sum(sip.volume)` is not shipped,
because it conflates two questions.** The body answers both and the
factorisation between them:

| field                   | meaning                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `biasOverAllSipMinutes` | `Σiex / Σsip` over **every** `sip` minute of an exposed session — the **BIAS** of an `iex` numerator over a `sip` baseline |
| `shareOnTwoTapeMinutes` | `Σiex / Σsip` over minutes present on **both** tapes — **IEX's SHARE of volume**                                           |
| `volumeExposure`        | `Σsip(both) / Σsip(all)` — the **volume-weighted** coverage shortfall between them                                         |

`bias = share × exposure` is an identity by construction, and
`volume-share.database.test.ts` checks it on the body rather than asserting it
in prose. `minutePresence` sits beside them so the figure AC 1 exists to
displace is visible against the one that replaces it.

Beside the ratios, **`perMinuteRatioP10 / Median / P90`** over two-tape minutes
only — because `Σiex/Σsip` is the _volume-weighted_ mean of the per-minute
ratios, the intraday curve is U-shaped, and the factor compares **one 5-minute
bucket** rather than a session. The percentiles come from `breakpointsOf`, the
inclusive interpolated definition every baseline in this product already uses,
rather than a second quantile.

And **`volumeDispersion`, one entry per tape, never by omission** — the
within-bucket coefficient of variation of minute volume, pooled by minute of
session across the window, which is what AC 7's floor is derived from:
`relative SE ≈ √(π/2)·CV/√n`, rearranged. `√(π/2)` is computed rather than
typed as `1.253`. **The only chosen input on the whole surface** is
`TARGET_RELATIVE_STANDARD_ERROR = 0.05`, stated as a product judgement with the
achieved `relativeStandardError` printed beside the floor it implies, so the
floor can be re-derived against a different target without re-running anything.

Three further decisions, each with its own argument in the module header:

- **Exposure is a per-tape count, never the ledger.** A session qualifies only
  if it holds ≥1 `sip` row for that security **and** is on or after
  `LIVE_WRITER_FIRST_SESSION = 2026-09-23`. `bar_coverage` is tape-blind — the
  defect Task 5.5.1 repaired — so it is not read here at all.
- **An absent `iex` bar is `0` in the bias and NOT A SAMPLE in the
  distribution** (AC 4). The two look contradictory and are not: an absent
  `iex` bar beside a present `sip` bar says _IEX printed nothing in this
  minute_, a venue claim that is true and is exactly what the bias measures,
  while the `sip` bar in the denominator is the one making a claim about the
  market. A `0.0` in the distribution would be the coverage shortfall smuggled
  into the one figure built to be free of it.
- **An `iex`-only minute is in neither ratio**, because it has no denominator —
  it is pre-market, after-hours, or a minute the consolidated tape has not
  reconciled.

The read is `readMinuteVolumes`, keyed on `securities.id` with **no join**
(`windowQuery`'s measured `Sort`), pairing the tapes **in SQL** with two
filtered sums under a `group by observed_at`, both tapes named positively. It is
the one read on this route that touches the heap, because `volume` is not in
`market_bars_unique_bar` — the same 538 blocks as the window read — and it is
issued **sequentially after** the `EXPLAIN (ANALYZE)`, for the reason the
existing two already are. `sum(volume)` arrives as a **string** (`bigint`) and
`parseVolume` beside the query answers `undefined` for `null`, which is the
distinction AC 4 turns on: `Number(null)` is **0**.

### The local run, verbatim — and the refusal it proves is NOT the one expected

`curl -s "http://localhost:3000/diagnostics/baseline-cost?symbol=NVDA"`,
2026-10-19, against the laptop store (48.4 M `sip` 1m rows, **zero `iex`**):

```json
{
  "symbol": "NVDA",
  "timeframe": "1m",
  "lookbackSessions": 60,
  "measured": true,
  "refusal": null,
  "asOfSession": "2026-09-11",
  "windowStart": "2026-06-17T13:30:00.000Z",
  "windowEnd": "2026-09-11T20:00:00.000Z",
  "planNodeType": "Index Scan",
  "scanNodeType": "Index Scan",
  "planRows": 105,
  "actualRows": 23400,
  "sharedHitBlocks": 649,
  "sharedReadBlocks": 0,
  "elapsedMs": 7.47,
  "sipRows": 23400,
  "iexRows": 0,
  "volumeShare": {
    "measured": false,
    "refusal": "no-exposed-session",
    "exposureFrom": "2026-09-23",
    "sessions": 60,
    "exposedSessions": 0,
    "sessionsHoldingIex": 0,
    "firstExposedSession": null,
    "lastExposedSession": null,
    "sipMinutes": 0,
    "twoTapeMinutes": 0,
    "minutePresence": null,
    "sipVolume": null,
    "sipVolumeOnTwoTapeMinutes": null,
    "iexVolume": null,
    "biasOverAllSipMinutes": null,
    "shareOnTwoTapeMinutes": null,
    "volumeExposure": null,
    "perMinuteRatioP10": null,
    "perMinuteRatioMedian": null,
    "perMinuteRatioP90": null
  },
  "volumeDispersion": [
    {
      "tape": "sip",
      "measured": true,
      "refusal": null,
      "bucketMinutes": 5,
      "minutes": 23400,
      "minutesOutsideSession": 0,
      "buckets": 78,
      "bucketsWithSpread": 78,
      "samplesMedian": 300,
      "cvP10": 0.498616,
      "cvMedian": 0.656822,
      "cvP90": 0.881339,
      "relativeStandardError": 0.0475277,
      "samplesForTargetError": 489,
      "sessionsForTargetError": 98
    },
    {
      "tape": "iex",
      "measured": false,
      "refusal": "no-sample",
      "bucketMinutes": 5,
      "minutes": 0,
      "minutesOutsideSession": 0,
      "buckets": 0,
      "bucketsWithSpread": 0,
      "samplesMedian": null,
      "cvP10": null,
      "cvMedian": null,
      "cvP90": null,
      "relativeStandardError": null,
      "samplesForTargetError": null,
      "sessionsForTargetError": null
    }
  ],
  "checkedAt": "2026-10-19T07:10:59.363Z"
}
```

**It refuses, and `0.0` is nowhere on the body — which was the thing to prove.**
But the refusal is `no-exposed-session` rather than the `no-two-tape-minute`
the brief predicted, and the reason is a stronger statement than the one
expected: **this store's tape frontier is 2026-09-11**, so its 60-session window
ends **twelve days before the live writer existed** and no session in it could
ever have held an `iex` row. The zero-`iex`-inside-an-exposed-window path is
therefore unreachable from this laptop by the route, and is proved at the two
levels that can reach it — `volume-share.test.ts` and
`volume-share.database.test.ts`. Both refusals are kept as separate words
because they are different facts, and only the second says anything about our
own listening.

### The finding, and it is the one AC 7 was waiting for

The `sip` dispersion **is** measurable locally, and it answers AC 7's floor for
the first time. Over the same 60-session window, per security:

| symbol | `sip` rows | n per bucket | CV p10 / p50 / p90    | achieved rel. SE | floor at 5%              |
| ------ | ---------- | ------------ | --------------------- | ---------------- | ------------------------ |
| `NVDA` | 23,400     | 300          | 0.499 / 0.657 / 0.881 | 4.75%            | 489 → **98** sessions    |
| `AAPL` | 23,400     | 300          | 0.626 / 0.898 / 1.434 | 6.50%            | 1,292 → **259** sessions |
| `SPY`  | 23,400     | 300          | 0.647 / 0.924 / 1.571 | 6.69%            | 1,551 → **311** sessions |
| `XLK`  | 23,400     | 300          | 0.778 / 1.132 / 2.059 | 8.19%            | 2,663 → **533** sessions |
| `CCI`  | 23,142     | 297          | 0.950 / 1.308 / 2.405 | 9.51%            | 3,634 → **727** sessions |
| `ERIE` | 8,641      | 99           | 0.925 / 1.284 / 1.777 | 16.22%           | 1,984 → **397** sessions |

**Not one of the six meets a 5% relative SE on its p90 bucket inside 60
sessions**, and only `NVDA`'s _median_ bucket does. The required depth runs
**98 to 727 sessions** — and that is the **consolidated** tape, whose depth is
100%; Gate 1 decision 1 makes the shipped baseline the **`iex`** one, measured
at 1.9–24.9% of `sip`, so its `n` per bucket is between a twentieth and a
quarter of the figures above and its floor is correspondingly further away.

Three things follow, and the third is the owner's rather than mine:

1. **AC 7's floor is now derived rather than chosen**, and what it derives is
   not a number but a _function_ — `(√(π/2)·CV / target)²`, with the CV
   measured per security per bucket. A single constant floor is not defensible
   across securities, because `CCI`'s p90 CV is 2.7× `NVDA`'s.
2. **The printed precision is the lever, not the lookback.** At a 10% target
   the floors fall by 4× (122–182 sessions for the five liquid names); at 15%
   they fall by 9×. So the question AC 7 really poses is _how precisely may
   this multiple be drawn_, and `TARGET_RELATIVE_STANDARD_ERROR` is where that
   is spelled.
3. **This is not a verdict on whether the figure can ship.** The CV of a
   bucket's raw minute volume bounds the median of that bucket; it does **not**
   say the _ratio_ `today / typical` is unusable, because a ratio over a
   heavy-tailed quantity is what the factor is for. What it does say is that
   `4.1×` to one decimal is an over-claim on this evidence for most
   securities. **Routed to the product owner below.**

### The bound on the figure AC 1 actually asked for, stated plainly

**IEX's share of volume is still not measured.** No machine outside Azure holds
an `iex` row, and the deployment does not carry this change until it merges — so
**the deployed `curl` is the next step rather than this one**, and quoting a
laptop as production would be exactly the error `CLAUDE.md` warns about. What
can be said today:

- the code path is exercised end to end against a **hand-built two-tape store**
  (`pnpm test:database`), which is the only level at which two rows for one
  minute exist;
- the **zero-`iex` refusal** is proved at two levels and reaches the wire with
  every ratio `null`;
- when the deployed run is taken, it will be a **partially-exposed** observation
  and must be recorded as one: the live writer started 2026-09-23, so a
  60-session window today exposes roughly 18 of ~62 sessions, the exposed span
  is reported on the body (`exposedSessions`, `firstExposedSession`,
  `lastExposedSession`), and `sessionsHoldingIex` beside it is **our own
  uptime** rather than IEX's reach. With one session exposed there is **no
  variance in sessions at all**; the per-minute distribution is what carries
  the spread.

### What was NOT done, and one thing in the brief that is false

- **`pnpm e2e` was not run** — no frontend file changed and nothing on any
  screen reads this endpoint. The brief asked for it to be skipped.
- **The deployed `curl` was not taken**, for the reason above. `Done when` item
  2 is **not met** and is owed by the merge.
- **The brief's "no existing database suite builds [a two-tape store]" is not
  quite right.** `return-baselines.database.test.ts` already inserts **one**
  `iex` bar, to catch a dropped `feed` predicate on a _close_. What no suite had
  ever built — and what this task adds — is a store where the same minutes hold
  **both tapes with different volumes**, which is the only shape in which the
  two ratios differ at all. The new file has its **own database**
  (`marketpulse_vitest_volume`, `session-return-percentiles`' precedent) because
  the existing fixture asserts `iex = 1` over its window and seeding volume into
  it would break that file's own claims.
- **The brief predicted the local refusal would be `no-two-tape-minute`**; it is
  `no-exposed-session`, for the reason given above.

### The breaks — four, hand-performed, with checksums

`pnpm break` refuses a dirty target and all four subjects were uncommitted, so
each was applied by exact single-occurrence substitution, the command run, and
the tree restored by overwrite with `shasum -a 256` matching either side. All
four are registered in `scripts/breaks.mjs` so the next reader gets them free,
and so `every-break-can-still-land` holds their anchors against drift.

**`the-volume-share-is-computed-unconditionally` — and this is the one with a
green-on-the-defect transcript against a real alternative instrument.** With the
refusal gate dead, `volume-share.database.test.ts` reported `Test Files 1
passed (1) / Tests 10 passed (10)` — the hand-built two-tape store this task
calls its highest-value instrument **cannot see a zero-tape defect**, because
its fixture has two tapes and never visits the refusal. The fast suite went red
on both refusals:

```
 FAIL  src/volume-share.test.ts > … > REFUSES rather than answering 0.0 when the window holds no `iex` row
AssertionError: expected true to be false
 FAIL  src/volume-share.test.ts > … > REFUSES a zero-volume denominator rather than dividing to Infinity (AC 5)
AssertionError: expected null to be 'no-sip-volume'
      Tests  2 failed | 13 passed (15)
```

**And the first draft of the code could not be broken at all, which changed the
code.** The refusals were written as two separate early returns —
`twoTapeMinutes === 0`, then `sipVolume === 0 || sipVolumeOnBoth === 0`. Because
the first condition **implies** the second, neutering either one left the other
refusing: the run went red at `expected 'no-sip-volume' to be
'no-two-tape-minute'`, which proves a **word** and not a **number**, while the
`0.0` the check exists to forbid never escaped. So `shareRefusalFor` is now one
gate, documented as such, and the defect a re-implementer actually writes —
`STORY.md`'s unconditional ratio — is one edit that reaches the wire.

**The found line is KEPT and its condition neutered**, which is the opposite of
Task 5.5.1's entry and for the mirror reason: there the check had two conjuncts
and deleting the good call would have tripped the first, so the defect had to be
_appended_. Here the subject is a **single behaviour** and a dead gate **is** the
defect, so the shortest edit that expresses it is the condition itself.

**`an-absent-iex-bar-becomes-a-zero-sample`** — `perMinuteRatios.push(0)` for an
absent bar. Red at `expected 0.05 to be close to 0.2` in the fast suite and at
`expected +0 to be close to 0.12` in the database suite. The counts and the bias
stay correct under it; only the distribution moves, which is why it needed its
own assertion.

**`the-exposure-cutoff-is-dropped`** — red on two fast assertions
(`expected 2 to be 1` on `exposedSessions`, and
`expected 'no-two-tape-minute' to be 'no-exposed-session'`) and three database
ones.

**`the-volume-share-is-declared-a-bare-number`** — `biasOverAllSipMinutes:
{ type: "number" }`. Red at `expected +0 to be null` through `app.inject()`,
while `volume-share.test.ts` reported `15 passed` under the same defect: the
producer is right and nothing it can observe is wrong. This is the
`fast-json-stringify` coercion `CLAUDE.md` names, and it is also why
`GET /diagnostics/baseline-cost` has a `describe` block of its own for the first
time — `baseline-cost.ts` has claimed since Task 5.3.2 that its schema is
asserted in that file, and until today only `server.test.ts`' route-table walk
looked at it, which reads the `500` and nothing else.

### What was run

| command                                                 | result                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm verify`                                           | green, `64 invariants hold.`, no `Unhandled Errors` block                                 |
| `pnpm test:database`                                    | `Test Files 10 passed (10)`, `Tests 318 passed (318)`                                     |
| `pnpm --filter @marketpulse/backend test volume-share`  | 15 unit tests, 10 database tests                                                          |
| `curl … /diagnostics/baseline-cost?symbol=NVDA` (local) | quoted verbatim above                                                                     |
| four hand-performed breaks                              | each red on an assertion with the rest still collecting; tree restored, checksums matched |
| `pnpm e2e`                                              | **not run** — no frontend change                                                          |
| `curl … ` against the deployment                        | **not run** — the change is unmerged                                                      |

**One `pnpm verify` of three went red, on a spec this change cannot reach, and
it was not attributed to the branch.** The second run failed
`market-gateway.process.test.ts > leaves a HEALTHY client on the same process
untouched` at `expected +0 to be 1` — a socket-timing assertion in the gateway,
which no file in this change imports or is imported by. Runs 1 and 3 of
`pnpm verify` reported `Test Files 2 passed (2)` / `Tests 60 passed (60)` for
`test:process`, and the spec alone went **5 / 5** afterwards. The red run was
the one launched as `pnpm verify && pnpm test:database` in a single background
command, with the load average reading `9.54 8.93 6.82` on the next sample —
which is `CLAUDE.md`'s own note that **the suite is its own plant**. Recorded
rather than repaired or ignored: n = 3 on `verify`, n = 5 on the spec, and no
code path in common.

## QUESTIONS FOR THE PRODUCT OWNER

1. **How precisely may the volume multiple be drawn?** `4.1×` to one decimal
   implies a ~2.5% resolution, and the measured dispersion says the
   consolidated tape needs **98–727 sessions** per security to support 5% —
   against a 60-session lookback, on the tape with 100% depth. The `iex`
   baseline the story has chosen is 1.9–24.9% of that. The lever is the printed
   precision, not the lookback: a 10% target divides every floor by four.
   Options are (a) print `4×` rather than `4.1×`, (b) refuse per security
   against the derived floor and accept that most securities draw nothing,
   (c) keep one decimal and widen `TARGET_RELATIVE_STANDARD_ERROR`, saying so
   on screen. This is Task 5.5.4's input and I have not chosen.
2. **Is a live `iex/iex` figure worth drawing at all**, given the above? Gate 1
   reserved this question for AC 1's measurement, and the measurement now says
   the `iex` tape's depth is the binding constraint rather than its bias.

## For a stakeholder — a status report, 2026-10-19

**Nothing changed on screen, and that is the whole task.** This was a
measurement the story opens with and nobody had ever taken.

The operator endpoint that already reports what the nightly baseline read costs
now also reports **how much of the market's volume our live feed can see** — two
different answers rather than one, because _how biased is a figure built this
way_ and _what share of the shares does this venue carry_ are different
questions and a single ratio silently mixes them.

Two things came out of it. The first is a **refusal we wanted**: on a machine
with no live feed, the endpoint says _we never heard this venue_ rather than
_this venue carries none of the volume_ — a distinction that is one character
apart in the code and a false claim about a stock exchange on the wire. It is
held by four deliberate sabotage tests, one of which found that the obvious
implementation could not be sabotaged at all and so the implementation changed.

The second is harder and goes to the owner. The endpoint now measures **how
noisy intraday volume actually is**, and the answer is that drawing _"volume
4.1× typical"_ to one decimal place needs between **98 and 727 trading sessions** of
history per security to be honest — roughly **five months to just under three years**
(**corrected 2026-10-19 by the orchestrator: this sentence read "two and twelve
years", which is the SAMPLES figures — 489 to 3,634 — divided by a year rather
than the SESSIONS figures. A 5-minute bucket sampled per minute yields five
samples a session, so the two differ by 5×. The table above was right
throughout; only this summary was wrong, which is the direction that reaches a
reader**) — on the better of our two data feeds. We
have three months. That does not mean the feature cannot ship; it means the
**precision** has to come down, or the figure has to be refused for most
securities, and that is a product call rather than an engineering one. It is
written up above with the numbers behind it.

**What is still owed:** the same endpoint has to be run against the deployed
system, which is the only place in the world that holds both data feeds for the
same minute. That happens when this change merges.
