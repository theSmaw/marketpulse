# Task 7.2.2 — The price-anomaly step

**Status:** Complete — 2026-11-19. The one key finding: **extracting the
shared producer moved a shipped invariant's own premise out from under it** —
`one-instant-for-a-subject-and-its-benchmark` counts `fiveMinuteReturn(`
reads in each file calling `excessMoveFactor`, and with the subject's read
now behind `readPriceAnomaly` it reported the **correct** `symbolReturn` as
reading only one of the two legs. Widened in the same change to see the
producer as a third read shape of the same producer, keyed on the `asOf`
**expression** rather than the argument text (so `{ asOf }` and `asOf` are
one interval and `{ asOf: new Date() }` is not), with a new break —
`a-second-instant-for-the-subject` — proving the normalisation did not also
flatten a second clock into it.
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

The first of four new analytical tools: wraps `returnPercentileOf` so
`Investigate` reports how unusual the security's current 5-minute move
is against its own 60-session history — the same arithmetic that already
powers `Abnormal-move indicators` on the security page, read through a
tool contract rather than re-derived.

## What the user can see when this lands

Pressing `Investigate` on a security with a stored baseline shows a real
`Measure price anomaly` row completing with a genuine percentile (e.g.
`99th percentile`), or an honest, specific refusal — never a blank, an
error, or the previous story's single-tool checklist.

## Work

- Build `calculate_return_percentile` as an `AnalyticalTool<Input,
Output>` (`apps/backend/src/tool-return-percentile.ts` or similar),
  following `tool-security-snapshot.ts`'s established shape: a
  module-local brand on the output, a factory taking its dependencies as
  arguments, `run` never throwing.
- **Extract the shared producer rather than duplicating it.** `index.ts`'s
  `symbolReturn` already assembles this exact read-and-rank path
  (`trailingWindows.read` → `fiveMinuteReturn` →
  `baselines.baselineAsOf(...).get(symbol)` → `comparableBaseline` →
  `returnPercentileOf`) for the market-stream wire. Pull that assembly
  into one function both the wire frame and this tool call, so a figure
  never has two homes.
- **The tool distinguishes "no move to rank" from "no baseline to rank
  against."** Reuse `five-minute-return.ts`'s own four refusal kinds for
  the numerator (no bar observed, no bar exactly five minutes back, zero
  basis, the span guard) rather than letting an absent move fall through
  to `comparableBaseline`'s own, unrelated vocabulary.
- Reuse the existing `PercentileRefusal` vocabulary for the baseline half
  unchanged — do not re-spell `too-few-samples` or any other existing
  word.
- `not-tracked` for `PSKY`/`WBD` is decided once, before any tool runs
  (shared with every other tool in this story — confirm the mechanism
  this task establishes is the one Task 7.2.3–7.2.6 all reuse rather than
  each re-deriving it).
- Wire the tool into `investigationTools` in `index.ts`.

## Done when

1. `calculate_return_percentile` is unit-tested against the real
   `returnPercentileOf`/`comparableBaseline`/`fiveMinuteReturn` functions,
   independent of any other tool's test.
2. The checklist shows a real `Measure price anomaly` row on a developer's
   populated store, matching `PRODUCT_SPEC.md` §14's example shape.
3. `symbolReturn` and this tool read the identical extracted producer —
   no duplicated arithmetic.
4. The numerator/denominator refusal distinction is tested: a silent
   security and an under-sampled security produce different sentences.
5. `pnpm verify` is green; `pnpm store:bare` shows the correct honest
   refusal on a zero-bar store.

---

## What was done — 2026-11-19

Three new `apps/backend/src` files, one widened shared vocabulary, one
repointed and one widened guard.

- **`price-anomaly.ts`** — the extracted producer, and the point of the
  task. `readPriceAnomaly(sources, symbol, asOf)` makes the four calls
  `symbolReturn` used to make inline (`windowOf` → `fiveMinuteReturn` →
  `baselineOf` → `comparableBaseline` → `returnPercentileOf`) and answers
  the three values, which are three different claims: is there a move,
  is there a baseline, and where did the magnitude sit. It **decides
  nothing** — every judgement stays in the module that owns it; what moved
  is the ORDER of the calls. Both reads arrive as functions and `asOf` as
  an argument, so it holds `five-minute-return.ts`'s own no-clock, no-handle,
  no-protocol property. `symbolReturn` now reads it and so does the tool, so
  the market-stream `return` frame and an investigation step cannot disagree
  about this security's percentile.
- **`tool-return-percentile.ts`** — `calculate_return_percentile`,
  `description: "Measure price anomaly"`, built on
  `tool-security-snapshot.ts`'s shape (module-private `Symbol` brand on the
  output, a factory taking its dependencies, `run` never throwing, never
  `async`). Three refusal questions in the order a reader needs them:
  membership, then **the numerator** in `five-minute-return.ts`'s own words
  (`nothing-observed` / `no-earlier-endpoint` / `no-basis`), then **the
  denominator** in `PERCENTILE_REFUSALS`' own words (`too-few-samples` /
  `split-discontinuity`). A malformed distribution — not 101 points, which
  `0013_return_baselines.sql` makes unrepresentable — takes
  `too-few-samples`, which is `market-composite.ts`'s treatment of the
  identical state, inherited rather than re-decided. `toWireReturnPercentile`
  names every field by hand, for `toWireSecuritySnapshot`'s reason.
- **`tool-universe.ts`** — `not-tracked` with one home, which is what Tasks
  7.2.3–7.2.6 reuse. `REFUSED_NOT_TRACKED` (one frozen `ToolOutcome<never>`,
  assignable to every tool's own `ToolOutcome<T>`) and
  `untrackedRefusal(symbol, universe)`, which answers the refusal or
  `undefined` rather than a boolean so a tool's guard cannot answer a
  membership question with a different word. `tool-security-snapshot.ts` was
  moved onto it in the same change — the check is unchanged, the word is now
  spelled once for the pipeline rather than once per tool.
- **`packages/shared/src/investigation.ts`** — `TOOL_NAMES` gains
  `calculate_return_percentile`; `TOOL_REFUSALS` gains the four words the two
  halves already own, and **no synonym for any of them**. Beside it,
  `PercentileRefusalIsAToolRefusal` — `PercentileRefusalIsASuperset`'s
  mechanism one layer out, so a third member of `PERCENTILE_REFUSALS` is a
  `tsc -b` error rather than a refusal a tool cannot name. `ReturnRefusal`
  lives in the backend, so its own assertion sits in the tool file.
- **`index.ts`** — the tool wired into `investigationTools` beside the
  snapshot tool, with its sources as lambdas (nothing is read until a tool
  runs, which is long after the module finishes evaluating, so the list can
  keep its place above `trailingWindows` and `baselines`). The
  single-subject extraction both `buildInput`s needed became one
  `theSubjectSymbol` helper rather than a second copy of the throw.

**The user-visible change: the checklist is two rows.** `Measure move` then
`Measure price anomaly`, each with its own real duration. On CI and on any
store with no live feed the second row completes by refusing
`nothing-observed` — the trailing window is process memory fed by a live
socket, so the **numerator** refuses before the baseline is consulted at
all, which is the honest zero-bar answer Done-when 5 asks for and is why no
`pnpm store:bare` run could have shown anything else.

### Gates

- `pnpm verify` — **green**: 90 invariants hold (two pre-existing, owned
  rehearsal waivers printed, both unrelated), 673 documents / 2,072
  cross-file links / 0 broken, 49 components / 49 stories,
  `packages/shared` **735** tests, `apps/backend` **1,438**,
  `apps/frontend` **2,003**, `scripts/*.test.mjs` 21, `test:process` **63**.
  No `Unhandled Errors` block in any suite.
- **One flake, named rather than smoothed over.** On one of three full runs,
  `market-gateway.process.test.ts`' _"leaves a HEALTHY client on the same
  process untouched"_ failed (`expected +0 to be 1`) and passed on the two
  others and on a scoped re-run. It is a socket-timing assertion in a file
  this task does not touch, and nothing in this change reaches the gateway's
  client bookkeeping.
- `pnpm break the-percentile-is-fabricated-rather-than-refused` and
  `pnpm break a-second-instant-for-the-benchmark` and
  `pnpm break a-second-instant-for-the-subject` — all three red for the
  right reason (see the registry entries, repointed/added here).
- `pnpm e2e security-investigate.spec.ts` — **NOT RUN, and the spec was
  edited blind.** Docker is not running on this machine, so there is no local
  database and no pair for the browser suite to drive (`pnpm ready` reports
  `database ECONNREFUSED`). The edit is reasoned rather than observed: that
  spec asserted `expect(region.getByText(/^\d+ ms$/)).toBeVisible()`, which
  is a strict-mode violation the moment a second step completes, so the first
  test became `toHaveCount(2)` (the count is the assertion rather than a
  `.first()`: a dropped step would otherwise pass unseen) plus a check for
  the new row's own description, and the two other tests in the file take
  `.first()`. **CI is the first machine that will run it**, and the second
  row's own outcome there is `nothing-observed` — the spec asserts status and
  duration, never a tool's value, so that is not a branch it has to take.
- `pnpm break the-percentile-is-fabricated-rather-than-refused` — **NOT RUN**,
  for the same reason: its `command` is `pnpm e2e`. Its `find` was repointed
  to the new `readPriceAnomaly` statement and
  `every-break-can-still-land` confirms it matches exactly once; that the
  substitution still expresses the defect is read rather than proved, which
  is precisely the half that check cannot see.

### What nothing here can certify

No machine on which this ran has ever produced a rank from this tool. A
percentile needs a live feed **and** a stored nightly generation; CI has
neither, and this developer's store has no `iex` trailing window. So the
`ok` arm is proved by its own unit tests against the real
`fiveMinuteReturn` / `comparableBaseline` / `returnPercentileOf` over a
furnished 2,500-sample distribution, and by nothing else — the deployment
is the only machine that can draw one.

## For a stakeholder — a status report, 2026-11-19

Pressing `Investigate` on a security now runs **two** steps rather than
one, and the new one is the first of the five this story exists to build:
it asks how unusual the security's last five-minute move is against its own
sixty sessions of history — the same arithmetic the security page's own
`Abnormal-move indicators` region draws, read through the investigation
engine instead of re-derived for it. That sharing is deliberate and now
structural: both read one function, so the two surfaces cannot drift into
quoting different percentiles for the same security.

Where the data is thin the step says **which** thing is missing rather than
a single generic "no answer": a security we have not heard from, a security
whose last five minutes have no matching pair of bars, and a security whose
history is too short to rank against are three different sentences, because
they call for three different repairs. On every machine inside this project
today it is the first of those — the live market feed is not running here —
and that is the honest answer rather than a gap.
