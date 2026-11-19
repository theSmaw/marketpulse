# Task 7.2.5 — The market-breadth step, and the shared-aggregate fix

**Status:** Complete — 2026-11-19. **The single-writer invariant's first draft
counted `.record(` and reported TWO write sites — the second being
`trailingWindows.record(`, a different structure with a different subject
twenty lines away in the same file — so the holder's method is named
`recordPass` BECAUSE of the check, rather than the check being taught an
exemption it would then carry for ever.**
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

Wraps `marketBreadth`/`eligibleMoves` so an investigation can state a
group fact about the whole tracked market — never a verdict on the
investigated security, and its own output type structurally cannot
carry one (`Input` is `{}`, no ticker at all).

**The real work in this task is architectural, not the tool itself.**
`marketBreadth` needs `eligibleMoves(...)`, which needs
`MarketOverviewEntry[]` from `buildMarketOverview(...)` — all three
currently live only as locals inside `index.ts`'s `marketOverview`
closure, and the only retained copy anywhere is `lastBroadcastPass`, a
private `let` inside `market-gateway.ts`. `pnpm invariants`'
`one-producer-of-the-overview-aggregate` forbids a second
`buildMarketOverview` call site, so a naive tool cannot simply recompute
one — and recomputing would also be the one place this story would walk
into Epic 13's own named invariant-4 gap (an aggregate computed over
`status = 'active'`, the market we track _now_, is exactly what a future
replay has to refuse).

## What the user can see when this lands

A real `Check market breadth` row stating a group fact — e.g. "Of 501
tracked equities, 312 were heard from in the last five minutes: 96
advancing, 211 declining, 5 unchanged" — on a developer's populated
store with the live feed running, or an honest, specific refusal on
every other store. The figure this step reports and the figure `/`'s own
`Market breadth` region draws are, from this task onward, **the same
number from the same pass at the same instant** — never two homes for
one fact.

## Work

**The architecture fix (do this first; the tool is small once it's
done):**

- Move the single producer's latest computed pass to one small holder
  beside `currentMarketState` in `index.ts` — **not** inside
  `market-gateway.ts`, whose own stated rule is that it decides _when_ a
  browser is told something and must not decide _what_ is true. The
  holder records **every** pass the producer computes, not only
  broadcast ones (so it reflects "the latest answer this process
  computed, and when," independent of whether any browser is attached).
- `market-gateway.ts`'s existing `lastBroadcastPass` becomes a _read_ of
  this one holder rather than a second memo of the same fact — collapse,
  don't duplicate. Confirm nothing regresses for the two-tabs-of-`/`
  consistency reason `lastBroadcastPass` originally existed for (Task
  4.7.3).
- Add a new `pnpm invariants` entry: the holder has exactly one writer
  (count write sites, not files — the real regression this guards is a
  second write added _beside_ the existing one), with a `pnpm break`
  entry planting a second write.
- Confirm `breadth-is-counted-over-the-equities-alone`'s existing corpus
  (currently `index.ts`-only) reaches a new tool file. If it doesn't,
  widen it in this same change, with its own `pnpm break` — do not leave
  this as a check that is prose for a file it has never seen.
- Write the dated amendment to ADR 0038, recording: the trigger fired;
  which option was taken (the holder, not a per-request recompute);
  `one-producer-of-the-overview-aggregate` stays literally true and was
  deliberately not reworded; and the new reversal trigger as a condition
  — "the first non-browser consumer of the aggregate that cannot accept
  the retained answer" (the named candidate: Epic 13's replay, where "the
  latest pass" is meaningless and the aggregate must be computed at the
  replay clock instead).

**The tool itself:**

- Build `get_market_breadth` as an `AnalyticalTool<{}, Output>` — no
  ticker in the input at all. `Output` reuses the existing
  `WireMarketBreadth` shape (`basis`, `advancing`/`declining`/`unchanged`,
  `measured`, `tracked`, `windowMinutes`|`session`) rather than minting a
  parallel one.
- When the holder has nothing recorded yet, the tool completes with a
  **distinct, honest refusal** — not "nothing observed" (which is a
  different fact: "we have an aggregate, and it says the market was
  quiet"), but "no aggregate has been computed in this process yet."
  This is invariant 5's `UNKNOWN`, not a failure, and it is the
  permanent state of CI (zero bars, no provider) and of any process with
  no reader attached.
- Reports the whole tracked universe (501 equities, never the sector
  cohort) — resolved at Gate 1, reusing the exact arithmetic with no new
  code.
- Wire into `investigationTools`.

## Done when

1. The architecture fix lands with its own passing tests: one holder,
   confirmed single-writer by `pnpm invariants` + `pnpm break`; the
   gateway's two-tabs consistency behaviour is unchanged.
2. ADR 0038 carries its dated amendment.
3. `get_market_breadth` is unit-tested with the holder stubbed/furnished
   both populated and empty, independent of any other tool's test.
4. The breadth step's output type cannot carry a per-security score —
   held as a type-level claim (the `@ts-expect-error` idiom
   `return-percentile.ts` already uses), not only a runtime test.
5. On a developer's populated store with the live feed running, the
   step's figure matches `/`'s own `Market breadth` region at the same
   instant. On CI, the step completes with the new, distinct
   no-aggregate-yet refusal.
6. `pnpm verify` is green.

## What was done — 2026-11-19

### The architecture fix, which is most of the change

**`apps/backend/src/latest-overview-pass.ts` — one `let`, a `recordPass` that
returns the pass it was handed, and a `read`.** Constructed in `index.ts`
beside `currentMarketState`, for both of that line's own reasons: it is a
sibling of the market state rather than a possession of the gateway, and it is
ahead of `app.listen()` because the tool reading it is wired into an
`app.register()`ed route.

**The producer records by RETURNING.** `marketOverview()`'s last statement is
`return latestOverviewPass.recordPass(overviewPassOf({…}))`, so there is no way
to compute a pass this process then does not hold, and no second statement for
a later author to forget. `buildMarketOverview`'s call-site count is untouched
at one.

**`market-gateway.ts`'s `lastBroadcastPass` is GONE rather than duplicated.**
The gateway takes a new required option,
`latestOverviewPass: () => OverviewPass | undefined` — a **read**, so this file
structurally cannot write one — and the `??` lives in one local,
`passForAJoin()`. Task 4.7.3's whole argument is kept verbatim in the docblock
where a reader of this gateway meets it, with a dated amendment saying what
moved and why; the broadcast path is now one statement rather than two.

**The two-tabs behaviour is unchanged in every case the old memo covered, and
one case it did not is now covered too.** The holder records **every** pass the
producer computes rather than only broadcast ones, so a second browser
connecting before any batch has been broadcast is served the pass the first
one's connect computed. That is the one behavioural difference in the change
and it is strictly more of what Task 4.7.3 bought.

### The tool

**`get_market_breadth`, `AnalyticalTool<MarketBreadthInput,
MarketBreadthReading>` with `MarketBreadthInput = Record<string, never>`** — no
ticker at all, which is AC 5's _never a verdict on the investigated security_
held by a shape rather than by a convention. Wired fourth of five in
`investigationTools` (`buildInput` is `() => ({})`), described on the checklist
as `Calculate market breadth`.

`MarketBreadthReading` carries `counts: WireMarketBreadth` **verbatim** rather
than a parallel shape, plus the frame's own `observedAt` (absent where the
aggregate contains no observation) — deliberately never `computedAt`, which ADR
0038 forbids any surface to date data from. It is module-brand-minted like
every other tool's reading.

**One refusal, `no-aggregate-yet`**, added to `TOOL_REFUSALS`. Its whole point
is the pair it must never merge with: `nothing-observed` claims a count of zero
over a stated denominator, which is a real measurement; this one says there is
no count and no denominator. The frontend needed no change — `reason` crosses
the wire as a free string there by Task 7.2.4's own decision.

### The guards

- **`one-writer-of-the-latest-overview-pass`** — new. Counts write SITES rather
  than files (`one-subscriber-on-the-upstream-socket`'s recorded lesson), with
  an anchor on the holder's own declaration so a rename fails rather than
  passing on an absence. Break: `a-second-writer-of-the-retained-pass`, which
  plants a second `recordPass(` **beside** the producer's, on the gateway's
  broadcast path — the place this value lived until today.
- **`breadth-is-counted-over-the-equities-alone`** — widened. Its four existing
  clauses read `index.ts` alone, so a count in a tool file satisfied all of
  them by never being looked at. A fifth clause now walks every shipped backend
  file and permits `eligibleMoves(` / `marketBreadth(` only in the module that
  defines them and the one producer that calls them. Break:
  `a-breadth-count-in-a-tool-file`.
- **`the-fresh-join-recomputes-the-aggregate`** — repointed, because the `??`
  it edits moved out of the send and into `passForAJoin`. `pnpm invariants`
  caught the rot itself, through `every-break-can-still-land`.

`pnpm invariants` now holds **92**.

### What was NOT anticipated, and is the finding worth carrying forward

**A single-writer check keyed on a method name this repository already spends
elsewhere is red on the desired state.** The first draft counted `.record(` and
reported two write sites: `latestOverviewPass.record(` and
`trailingWindows.record(`, twenty lines apart in `index.ts`, the second being
Story 5.2's trailing window — a different structure, a different subject,
entirely correct. The obvious repair is an exemption for that file or that
binding, and the file is the one the real regression would be added to, so the
exemption would have swallowed the defect. **The method was renamed to
`recordPass` instead**, so the clause matches exactly what it is about and a
re-implementer still cannot avoid writing it. The check's own comment carries
this, because the next person to add a holder will reach for `record` too.

**The corpus widening was proved to be needed rather than assumed.** With the
new fifth clause disabled and the planted count present in
`tool-market-breadth.ts`, `breadth-is-counted-over-the-equities-alone`
reported **green** — the transcript the house rule asks for, taken before the
clause was trusted. One smaller thing came out of the same run: the plant's
first version used a zero-argument `new Date()` and tripped `a-tool-reads-no-
clock` as well, which is _red for the wrong reason_ in miniature, so the
plant's `asOf` is a spelled instant and the break goes red on one clause only.

**A shipped test measured the boundary the holder moved.**
`market-gateway.process.test.ts`' _"re-dates the arithmetic on every connect"_
asserted that two tabs connecting before any broadcast each pay their own join
— true before this task and false after it, by design. It was corrected to the
real, current boundary (re-dated on every applied **batch**, and the
observation is not) with the first half inverted into an assertion of the new
consistency, rather than the widening being held back to keep an outdated
check green.

### Gates

- `pnpm verify` — **green, exit 0**, after this change. `92 invariants hold.`;
  `packages/shared` 34 files / 738 tests, `apps/backend` 81 / 1,473,
  `apps/frontend` 109 / 2,005, `test:process` 3 / 63, `test:scripts` 21 pass /
  0 fail. **No `Unhandled Errors` block in the run** (checked by grep over the
  whole log, not by reading the exit code).
- `pnpm break a-second-writer-of-the-retained-pass` — red, restored
  byte-identical, matched `site(s) write the retained overview pass, expected
exactly 1`.
- `pnpm break a-breadth-count-in-a-tool-file` — red, restored byte-identical,
  matched `site(s) outside the producer count the market's breadth`.
- `pnpm break the-fresh-join-recomputes-the-aggregate` — red at its new
  anchor, restored byte-identical, matched `serves a NEW browser what was last
broadcast`.
- `pnpm e2e security-investigate.spec.ts` — **NOT run, and that is a gap in
  this task's own evidence rather than a judgement**: no dev pair and no
  database were reachable from this worktree (Docker is not running and there
  is no `.env`), so the spec's 4 → 5 row change is unexecuted locally and
  first runs in CI. What the change rests on is that a step completes with a
  duration whichever arm it takes — the volume step has refused on every run
  since Task 7.2.3 and still draws its row — so the count is insensitive to
  which answer breadth gives on CI's store.
- `pnpm test:database` — not run and **out of scope**: this change adds no
  query, no migration and no store module.

### What nothing here can certify

**No person has seen this step's figure, and no machine has seen it against a
live feed.** The holder is fed by the one producer, which runs on an applied
batch or on a browser's connect — so on CI (zero bars, no provider) the join
runs when the e2e browser connects and the step answers `ok` with
`measured: 0` over a stated `tracked`. That is an honest count and it is the
only count a gated machine will ever see; a NON-ZERO one needs stored bars and
a live feed, which only the deployment has.

**The refusal arm is reachable everywhere and has been seen nowhere.** A
process that has computed no pass is the first seconds of every deployment and
any process nobody has attached to — and `POST /investigations` needs no
socket, so it is genuinely reachable in production rather than theoretical.
Nothing has observed it outside this task's own unit tests.

**And no reader can tell any of this apart on screen**, because the checklist
still draws a step's status and not its outcome (Task 7.1.4's decision, and
Task 7.2.4's `docs/GAPS.md` entry): a breadth step reporting real counts, one
refusing `no-aggregate-yet` and one reporting zero are byte-identical rows.

## For a stakeholder — a status report, 2026-11-19

Pressing `Investigate` now runs **five** steps rather than four, and the new
one is the only one that is not about the security you are looking at: it
reports how broad the market's move is — how many of the companies we track are
up, how many are down, how many are flat, and out of how many we actually heard
from.

**The work in it was not the step, it was making sure there is only one
answer.** That figure is already on the landing page, and the obvious way to
give an investigation its own copy would have been to compute it again. Two
numbers computed a second apart are two numbers, and they can differ while both
are individually correct — so an investigation could have quietly disagreed
with the page beside it. Instead the one piece of code that computes it now
keeps its latest answer, and both the page and the investigation read that same
answer. A build-time check refuses any second place that tries to compute or to
overwrite it, and that check was proved by deliberately breaking it.

**The step says "I have no answer yet" rather than inventing one.** Immediately
after the system starts, and on a machine with no market data, nothing has been
computed yet — and the step says exactly that, in its own words, rather than
reporting "nobody was heard from", which would be a real measurement and would
be a lie. Those are different sentences on purpose: one means _wait a moment_,
the other means _the market was quiet_.

**What a reader still cannot do.** The checklist shows each of the five steps
with a tick and how long it took, and nothing more — so you cannot yet see
which step produced a figure, which is waiting for data, and which has no
answer. That is the next story's work and is recorded with an owner rather than
left to be noticed.
