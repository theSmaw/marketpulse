# Task 5.2.1 — The Trailing Window

**Status:** Complete — 2026-10-13
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** nothing — this is the story's first task

## Objective

**This is the epic's one genuinely new structural component.**
`currentMarketState` is latest-only by a decision Story 3.5 took on purpose —
_"518 latest values, not 518 × 390 minute bars"_ — so **a 5-minute return needs
the bar from five minutes ago and nothing in this process holds it.**

Nothing downstream in this epic can be built until something does.

## What the user can see when this lands

**Nothing.** Task 5.2.3 pays it off with the first figure in
`Abnormal-move indicators`.

## Work

- **A sibling module beside `current-market-state.ts`**, not a method on it and
  not a replacement for it — the owner's Gate 1 decision, and
  `market-overview.ts`'s own precedent (ADR 0038 decision 1: _a sibling, never a
  method on it_). One `Map<Ticker, Bar[]>`, one writer, many readers.
  - **The cost of this choice, stated so it can be reversed:** two homes hold
    _the newest bar for this security_. **Reversal trigger, a condition:** the
    first time the window and `currentMarketState` are observed to disagree
    about a security's latest bar, or the first writer of either that is not
    `onObservations`.
- **Written from `index.ts`'s `onObservations`, synchronously, from
  `observed.applied`, BEFORE `gateway.publishObservations`.**
  - **`applied` rather than `tracked`, and AC 2 decides it rather than
    preference.** `applied` is the list `current-market-state.ts` has already
    dropped every superseded bar from. A window fed `tracked` would receive
    revisions for minutes already passed and would have to **re-implement** the
    never-walk-backwards rule — two policies over one stream, which is the
    defect Task 3.5.2 removed.
  - **Before the early return, and this is not stylistic.**
    `publishObservations` returns early when `clients.size === 0`. A window
    written after it would be **empty on every deployment with nobody
    watching**, and the figure's availability would depend on whether somebody
    else has a tab open.
  - **Synchronous, no `await`, no promise.** AC 7 is satisfied by the write
    having **no I/O at all** rather than by a `.catch()`. The callback belongs
    to the socket and an unhandled rejection there is a crashed process.
- **Eviction is by each bar's own `startsAt`, never by count.** A count of six
  on a security at `ERIE`'s measured **2.1%** minute coverage holds six bars
  spanning hours, and AC 3 then has to refuse from a window that **looks full**.
  Evict anything older than `newest − (5 min + ε)`.
  - **ε is chosen deliberately rather than rounded to zero.** A revision lands
    **29.1–30.1 s** after its bar, so a window trimmed to exactly five minutes
    can evict the earlier endpoint between a bar arriving and its revision
    arriving. **ε = 90 s**, which is depth 7 worst case.
- **It never imputes.** A gap is an **absence** in the window, never an
  interpolated bar — and the test asserts the absence, which is the half nothing
  in this repository currently does.
- **The memory measured, not argued.** AC 1 wants it against
  `currentMarketState`'s **0.2 MB**. The arithmetic to beat:
  `LIVE-DATA.md` §10.3 measured **420 B/bar at 518 × 1** (carrying per-entry
  `Map` overhead) and **288 B/bar at 518 × 390** (the marginal cost of a bar in
  an array), so 516 × 6 = 3,096 bars is **0.89–1.30 MB**, i.e. **4.5–6.5×**
  `currentMarketState` and **0.17–0.25%** of the 512 MB replica. **That is
  arithmetic from a measured per-bar figure and not a measurement** — re-take it
  with `process.memoryUsage().heapUsed` after **two forced collections** under
  `--expose-gc`, which is the instrument that produced 0.2 MB, or the comparison
  is void.
  - **Say which figure you are quoting.** A window holding the same
    `LiveObservation` references `currentMarketState` already holds costs array
    and Map overhead **only**, so a naive before/after delta is as likely to
    double-count 420 B/bar as to measure nothing. Quote **per-entry bytes and
    the depth scaling**, not one total.
- **The tape, stated.** Every bar in this window arrives from one stream whose
  feed is `iex`, so a return computed from it is `iex`-over-`iex` — no mixing,
  **by construction**. Invariant 6 then requires the surface that draws it to
  say so rather than inherit the stored bars' `All US exchanges`; that is Task
  5.2.3's and is written there.
- **A small sweep this story inherits, because 5.1.6's upward pass missed it.**
  `RelativePerformance.tsx:34` and `RelativePerformance.stories.tsx:42` still
  say the rail is **324 px**; it is **419 px of content in a 453 px column**,
  corrected in three documents on 2026-10-13 and in no code. The sweep that
  corrected it grepped `.md` only. Fix both comments here and record the lesson:
  **a figure corrected in the documents is not corrected in the tree.**

## Done when

1. A bounded per-security window exists, written synchronously from
   `onObservations` from `observed.applied` **before** `publishObservations`,
   with no `await` anywhere on that path.
2. Eviction is keyed on each bar's **own `startsAt`** with ε stated, and a test
   interleaves a revision with an advance — insert 14:03, then a revision for
   14:02, then 14:04 — so an eviction that drops _oldest inserted_ goes red.
3. **It never walks backwards and never imputes**, with the absence of a gapped
   minute asserted rather than its presence.
4. The memory is **measured** with two forced collections, quoted as per-entry
   bytes and depth scaling, and compared with `currentMarketState`'s 0.2 MB
   taken by the same instrument.
5. The two stale `324 px` comments are corrected.
6. `pnpm verify` green; `pnpm test` covers the window; no browser work.

---

## What was done — 2026-10-13

### The module

`apps/backend/src/trailing-window.ts` — `createTrailingWindow`, one
`Map<Ticker, LiveObservation[]>`, one writer, many readers, modelled on
`current-market-state.ts`'s idiom (an options object with defaults, an
interface with docblocks on the methods rather than on the implementation).
**A sibling, not a method and not a replacement**, with the cost and the
reversal trigger in the module docblock rather than only here.

`read(symbol)` returns an **ascending copy** of the held array — seven
references at the worst-case depth — because the writer `splice`s the live
array on every eviction and Task 5.2.2's pure function would otherwise be
reading a window that moved underneath it.

Two exported constants, so 5.2.2 reads the figure rather than respelling it:
`TRAILING_WINDOW_SPAN_MS = 5 * 60_000` and
`TRAILING_WINDOW_TOLERANCE_MS = 90_000`.

**No store read, no cache, no clock.** The eviction cutoff is taken from the
**newest bar held for that security**, not from the wall clock, so the window
is driven entirely by what arrived and a quiet security's window does not
empty itself between bars.

### Done when

**1. Written synchronously from `onObservations`, from `observed.applied`,
before `publishObservations`.** `apps/backend/src/index.ts`: the callback now
reads

```
const observed = currentMarketState.observe(observations);
/* … the three-part reasoning, in the file … */
trailingWindows.record(observed.applied);
gateway.publishObservations(observed.applied);
```

No `await`, no promise, no I/O on that path — AC 7 satisfied by there being
nothing to await rather than by a `.catch()`. The three load-bearing choices
are argued **in the comment**: `applied` so the never-walk-backwards rule is
inherited rather than re-implemented; **before** the publish because
`publishObservations` returns early at `clients.size === 0` and a window
written after it would be empty on every deployment with nobody watching;
synchronous because the callback belongs to the socket.

**2. Eviction keyed on each bar's own `startsAt`, ε stated, and the interleave
test goes red on a FIFO.** `trailing-window.test.ts` records **14:03, then
14:02, then 14:04 → 14:09**; the newest is 14:09, the cutoff is
14:09 − (5 min + 90 s) = **14:02:30**, so 14:02 is evicted and **14:03 is
kept** — by instant, not by arrival. Depth 7, which is ε's worst case.

**Break-verified rather than argued.** The module's `insert`/`evict` pair was
replaced with `held.push(observation)` + `while (held.length > 7) held.shift()`
— the obvious FIFO ring buffer, which is the defect the next implementer
writes — and the suite went red with assertion failures and other tests still
collecting:

```
 FAIL  src/trailing-window.test.ts > … > drops the OLDEST BAR rather than the oldest insertion when a revision interleaves
 Test Files  1 failed (1)
      Tests  6 failed | 6 passed (12)
```

The FIFO keeps 14:02 and evicts 14:03, which is exactly the reading AC 3 would
have had to refuse from a window that looks full. Tree restored and re-run:
`Tests  12 passed (12)`.

**ε has its own control.** A second window constructed with `toleranceMs: 0`
is driven over the same seven minutes; at 14:06 its cutoff is 14:01 and
**14:00 — the earlier endpoint of the last settled five minutes — is gone**,
while the shipped ε keeps it at depth 7. The defect ε exists for is asserted
rather than described.

**3. Never walks backwards, never imputes.** The supersede rule is **inherited
from `applied`**, said in a comment rather than re-implemented (two policies
over one stream is Task 3.5.2's defect). The window's own guarantee is that
its newest bar cannot regress, because the newest is the last element of an
instant-ordered array, and that is asserted. The impute test asserts an
**absence**: 14:02 and 14:05 arrive, and the window holds **two** bars with
`expect(instants).not.toContain("…14:03…")` and `…14:04…`.

**4. The memory, measured — and arm A reproduces §10.3 exactly, so the
comparison is not void.** `process.memoryUsage().heapUsed` after **two forced
collections** under `--expose-gc`, 516 securities, the `Bar` shape Story 3.2
normalises to, one `BarSource` per batch (the live mapper's own shape).
Throwaway instrument, run three times, **identical to the byte on arms B and
C across all three**, then deleted. Verbatim:

```
A currentMarketState 516x1 (retained)	207968 B	0.208 MB
B trailingWindow 516x1 (retained)	285344 B	0.285 MB
B trailingWindow 516x3 (retained)	573752 B	0.574 MB
B trailingWindow 516x6 (retained)	1018840 B	1.019 MB
B trailingWindow 516x7 (retained)	1164896 B	1.165 MB
C trailingWindow 516x1 (marginal, bars held elsewhere)	125256 B	0.125 MB
C trailingWindow 516x6 (marginal, bars held elsewhere)	120136 B	0.120 MB
C trailingWindow 516x7 (marginal, bars held elsewhere)	121440 B	0.121 MB
```

**The control first.** Arm A is §10.3's own subject re-taken on 516 rather
than 518: **0.208–0.211 MB, 403 B per entry** against §10.3's **0.2 MB,
420 B** — so this is the same instrument reading the same thing, and arms B
and C can be compared with it.

**Per-entry bytes and the depth scaling, which is what the task asked for
rather than one total.**

| Depth | Retained | Per security | Per bar | Marginal bar |
| ----- | -------- | ------------ | ------- | ------------ |
| 1     | 0.285 MB | 553 B        | 553 B   | —            |
| 3     | 0.574 MB | 1,112 B      | 371 B   | 280 B        |
| 6     | 1.019 MB | 1,975 B      | 329 B   | 283 B        |
| 7     | 1.165 MB | 2,258 B      | 322 B   | 283 B        |

The scaling is **linear in depth with a fixed per-security floor**: each extra
bar costs **283–284 B**, which is §10.3's own **288 B** marginal-bar figure to
within 2%, and the first bar costs 553 B because it carries the `Map` entry and
the array object with it.

**Which figure is production's, stated rather than left to the reader.** Arm B
is the **retained** cost — the window is the only holder. Arm C is the window's
**own overhead** with the observations held elsewhere: **0.120–0.125 MB, ~233 B
per security, flat in depth to within the noise**, because the Map entry and
the array object dominate and each further bar reference is 8 B. **In
production the truth is between them and close to B**: `currentMarketState`
holds the newest bar per security, so one of the seven is shared and the other
six are retained by the window alone — **≈1.02 MB at depth 7**
(1.165 − 0.147 for the shared newest). A naive before/after delta would have
double-counted that bar at 420 B; this is why the arms are separate.

**Against the thing AC 1 asks for:** **1.165 MB retained / ≈1.02 MB marginal at
depth 7, i.e. 5.6× / 4.9× `currentMarketState`'s 0.208 MB, and 0.23% / 0.20% of
the 512 MB replica.** The task's predicted arithmetic — 0.89–1.30 MB,
4.5–6.5×, 0.17–0.25% — **held**, which is worth recording because it was
arithmetic from a per-bar figure rather than a measurement. At depth 6 the
ordinary case is **1.019 MB**.

**5. The two stale `324 px` comments are corrected.**
`RelativePerformance.tsx:34` and `RelativePerformance.stories.tsx:42` now say
**419 px of content in a 453 px column at 1440**, each with a parenthesis
recording why the old figure was there. `grep -rn "324 px" apps/ packages/
e2e/` returns only those two lines' own account of the correction.
**The lesson, recorded:** a figure corrected in the documents is **not**
corrected in the tree, because a `.md`-scoped grep cannot see a comment. The
sweep for a corrected figure is over the **tree**, not over the documents that
carry it.

**6. The gates.** `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm test` and
`pnpm invariants` run and green — output in the hand-back. `pnpm verify` itself
was **not** run on instruction (the orchestrator scoped this task to those five
and excluded `e2e`, `probe`, `verify`, `test:database`), so done-when 6's
`pnpm verify` is **owed by the story close rather than met here**; every step of
it except `stories`, `env:check`, `links`, `coverage:check` and `test:process`
was run by name. No browser work, no frontend change but the two comments.

### What this did NOT do

No 5-minute return (5.2.2's, and deliberately a pure function over
`read(symbol)` and an `asOf`). No wire change, no frame type, no store read, no
cache. Nothing on any screen.

### One premise in the brief that was inexact

The brief and the task file both describe ε as guarding "the earlier endpoint
being evicted between a bar arriving and its revision arriving". The retention
boundary is **inclusive** (`startsAt >= newest − (span + ε)`), so a window
trimmed to exactly five minutes does **not** lose the endpoint of the five
minutes ending at its own newest bar — that case needs no ε at all. The case
that does is one minute later: a reader computing the last **settled** five
minutes asks `asOf` the newest-but-one bar, because a bar is not final for
~30 s, and a strict window has evicted that pair's earlier endpoint by then.
**ε = 90 s is unchanged and the conclusion stands**; the test is written
against the case that actually fires, with a `toleranceMs: 0` control, rather
than against the one in the prose, which would have passed either way.

## The orchestrator's half — 2026-10-13

**Reviewed, and the two corrections to this task file are the part worth
keeping.** Both are mine and both would have produced a test that proved
nothing:

- **ε's stated reason describes a case that cannot fire.** With an inclusive
  retention boundary the endpoint of the five minutes ending at the newest bar
  is never evicted, so the _bar-then-revision_ story needs no ε at all. The case
  that fires is one minute later — a reader computing the last **settled** five
  minutes asks `asOf` the newest-but-one bar, because a bar is not final for
  ~30 s. The test is written against the case that fires, with a
  `toleranceMs: 0` control beside it.
- **Done-when 2's named sequence alone cannot go red.** At 14:04 the cutoff is
  13:57:30 and nothing is evicted, so no eviction policy is exercised by
  14:03 → 14:02 → 14:04. The interleave is kept as the opening and the sequence
  advanced to 14:09 so the cutoff crosses 14:02 — which is what makes a FIFO
  implementation go red.

**The break was performed and read rather than trusted.** `insert`/`evict`
replaced with `held.push(...)` + `while (held.length > 7) held.shift()`:
`6 failed | 6 passed`, assertion failures **with other tests still collecting**,
which is the only red that proves a check works. Restored to `12 passed`.

**Two properties of the shipped window are constraints on Task 5.2.2 rather than
on this one**, and are written into that task's own file: `read()` hands back
the 90 s tolerance tail, so the caller bounds its own `asOf − span`; and
eviction is relative to **that security's own newest bar, never to now**, so a
full window is not evidence of a recent one — a security silent for 187 minutes
keeps seven bars from 187 minutes ago.

### Gates

- `pnpm verify` — **exit 0** at load 5.61, `58 invariants hold.`, **3,012 tests**
  (440 + 1,059 + 1,458 + 55). No `Unhandled Errors` block.
- The developer ran `pnpm format:check` plus targeted writes rather than
  `pnpm format`, because `notes.txt` is not in `.prettierignore` — a correct
  refusal, and the reason it is worth recording is that the forbidden operation
  was reachable through an ordinary gate.

### What this leaves standing

- **The memory figure is a local measurement of a synthetic 516-security
  population**, not a deployed one, and nothing re-takes it. `docs/GAPS.md` owes
  an entry at the close.
- **No gated machine will ever hold one entry in this window.** CI's feed is
  `provider=none`, so every gated run exercises the empty path for ever.
- **The two homes for _the newest bar_ now exist**, with the reversal trigger
  recorded in `STORY.md`'s Gate 1 section: the first time they are observed to
  disagree, or the first writer of either that is not `onObservations`.
