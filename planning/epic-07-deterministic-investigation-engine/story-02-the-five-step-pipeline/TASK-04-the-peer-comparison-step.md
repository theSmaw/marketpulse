# Task 7.2.4 — The peer-comparison step

**Status:** Complete — 2026-11-19. **Extracting the shared producer moved the
`one-instant-for-a-subject-and-its-benchmark` check off `index.ts` entirely and
left Task 7.2.2's own `readPriceAnomaly` arm of it with no live call site** —
two break entries repointed, the arm kept and dated with the shape that would
fire it again.
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

Wraps `excessMoveFactor` (`apps/backend/src/excess-move-factor.ts`),
using `excessMoveReference` (`packages/shared/src/excess-move.ts`) only
to pick the security's own sector benchmark ETF — `excessMoveReference`
alone is not "the comparison," it only resolves which fund. Described on
screen as **"Compare against sector benchmark"** (resolved at Gate 1),
because the shipped arithmetic is a comparison against the
capitalisation-weighted sector SPDR, and "compare peers" promises an
unweighted peer median this product does not compute.

## What the user can see when this lands

For an equity with a sector, a real `Compare against sector benchmark`
row completing with the security's move, the benchmark's move and the
excess, or an honest refusal. For a sector ETF or a market proxy (which
has no sector of its own, or _is_ the benchmark), the row completes as
`inapplicable` — a different, honest answer from a refusal, because no
future backfill will ever produce a figure for "compare XLK's sector
move against its own sector."

## Work

**The `ToolOutcome` contract decision, resolved 2026-11-19 before this task's
implementation** (technical-architect consult): `ToolOutcome<T>`
(`packages/shared/src/investigation.ts`) gains a real third member —
additive, not breaking, for every existing tool:

```ts
export const TOOL_INAPPLICABILITIES = [
  "no-sector", // an index_etf has no sector to compare against
  "is-benchmark", // a sector_etf IS the fund its sector is measured against
  "is-the-market-proxy", // SPY correlated with SPY (Task 7.2.6)
] as const;
export type ToolInapplicability = (typeof TOOL_INAPPLICABILITIES)[number];

export type ToolOutcome<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "refused"; readonly reason: ToolRefusal }
  | { readonly kind: "inapplicable"; readonly because: ToolInapplicability };
```

The field is **`because`, not `reason`**, deliberately — mirroring
`excess-move.ts`'s own `because: ExcessMoveInapplicability` and making the
distinction type-level rather than a naming convention: a handler reading
`.reason` off a collapsed outcome would not compile. **No `applies: false`
flag** — `ToolOutcome` already discriminates on `kind`, so a second
discriminant would be a second home for one fact; mirror `excess-move.ts`'s
vocabulary and word, not its record shape (that shape is right for a
reference record with no other discriminant, which is not this). Add two
free type-level assertions beside it, the same idiom
`PercentileRefusalIsAToolRefusal` already uses: `ExcessMoveInapplicability
extends ToolInapplicability ? true : never` (a fourth inapplicability word
in `excess-move.ts` is a compile error here rather than a word a tool
cannot name), and a disjointness check between `ToolRefusal` and
`ToolInapplicability` (the two vocabularies can never share a word).
`WireToolOutcome` gains the mirror arm.

**One real, easy-to-miss consumer gap this decision surfaces**: the
frontend's `investigation-event.ts` duplicates `WireToolOutcome` by
deliberate decision (a fact about JSON, not an imported domain type) and
`readToolOutcome` is a closed whitelist — an unhandled `kind` makes the
_whole event_ `unreadable`, which `use-investigation.ts` then silently
ignores. **Add the `inapplicable` branch to `readToolOutcome` in the same
change**, or the first `inapplicable` outcome this product ever produces
is dropped on the floor with every test green. Add a `pnpm invariants`
entry asserting `readToolOutcome` branches on every member of the shared
`kind` set, with a `pnpm break` planting a fourth `kind` the frontend
decoder doesn't handle (the defect the next author would actually write).

Live claims needing a dated amendment in the same change (not a rewrite):
`investigation.ts`'s own "`ToolOutcome<T>` is a closed, two-member union"
docblock (the _no-thrown-path_ half stays true; only the count changes),
and `INVESTIGATIONS.md`'s "`ok`/`refused` outcome union" sentence (the
subject document — amend it here, don't leave it to Story 7.2.7's sweep).
No new ADR and no amendment to ADR 0050 (which never stated `ToolOutcome`'s
arity) — this is Gate 1's already-decided vocabulary reaching the type.
Reversal trigger, as a condition: the first tool whose `inapplicable` arm
needs to carry a payload rather than a bare word from a closed vocabulary,
at which point this stops being a vocabulary extension and wants its own
ADR.

- Build `compare_securities` as an `AnalyticalTool<Input, Output>`.
  `Input` is `{ symbol }` only — never the benchmark; `excessMoveReference`
  decides it, so accepting it as an argument would be a second home for
  that choice.
- `Output`'s `ok` arm carries the scored comparison (subject move,
  reference move, excess, percentile); the refused arm carries
  `ToolRefusal` + bound; the inapplicable arm uses the new top-level
  `ToolOutcome` member above (`no-sector` for an index proxy, `is-benchmark`
  for a sector ETF) — never a second, tool-local `applies`/`because` pair.
- Reads both the subject's and the reference's `trailingWindows` and
  `fiveMinuteReturn` at the one `context.asOf`, then
  `excessBaselines.baselineAsOf(...).get(symbol)` → `excessMoveFactor`.
- `reference-split-discontinuity` (the benchmark's own split) stays a
  separate sentence from `split-discontinuity` (the subject's) — do not
  merge them, they refuse different securities and are repaired
  differently.
- `not-tracked` reuses the shared, once-decided mechanism from Task 7.2.2.
- Wire into `investigationTools`.

## Done when

1. `compare_securities` is unit-tested against the real
   `excessMoveFactor`/`excessMoveReference`, independent of any other
   tool's test.
2. **Reworded 2026-11-19 (technical-architect consult) — the checklist
   itself deliberately discards `TOOL_CALL_COMPLETED`'s outcome today
   (`investigation-checklist-state.ts`, by Task 7.1.4's own decision;
   drawing a step's own outcome word is Story 7.3's), so "visibly
   distinct on screen" cannot be met by this task and the original
   wording asked for something out of scope.** Instead: a sector ETF or
   market proxy investigation emits a `TOOL_CALL_COMPLETED` event whose
   `outcome.kind` is `"inapplicable"` with the correct `because` — proven
   by an SSE-wire-level test (`routes/investigations.test.ts` or
   equivalent), not a rendered row. Add a `docs/GAPS.md` entry: no reader
   has ever seen an inapplicable (or refused) step read as anything but a
   checkmark, owned by "the first surface that draws a step's own
   outcome."
3. The `ToolOutcome`/`inapplicable` contract decision is recorded above
   (not left implicit), the frontend's `readToolOutcome` whitelist is
   updated with a new `pnpm invariants` entry + `pnpm break` proving the
   gap, and the shape is confirmed reusable by Task 7.2.6's own
   `inapplicable` need.
4. `pnpm verify` is green; `pnpm store:bare` shows the correct honest
   refusal on a zero-bar store.

## What was done — 2026-11-19

**`compare_securities` is the fourth tool this product has, and the third of
Story 7.2's five steps.** `apps/backend/src/tool-compare-securities.ts`, wired
into `investigationTools` in the order `EPIC.md` names (price anomaly, volume
anomaly, peer comparison), described on the checklist as
`Compare against sector benchmark`. `Input` is `{ symbol }` alone;
`excessMoveReference` decides the fund, and a test asserts the description does
not contain the word `peers`.

**The `ToolOutcome` contract landed exactly as the Work section above
specifies**, and additively: `TOOL_INAPPLICABILITIES`
(`no-sector`/`is-benchmark`/`is-the-market-proxy`), `ToolInapplicability`, the
third `ToolOutcome` arm with `because`, the `WireToolOutcome` mirror, and
**four** free type-level assertions rather than the two asked for —
`ExcessMoveInapplicability extends ToolInapplicability`, the
`[Extract<ToolRefusal, ToolInapplicability>] extends [never]` disjointness
check, and, needed and not anticipated, `ExcessFactorRefusal extends
ToolRefusal` with the four words `TOOL_REFUSALS` was missing
(`reference-split-discontinuity`, `mixed-basis`, `no-subject-move`,
`no-reference-move`). `toRunnableTool` needed **no change at all** — its
`outcome.kind === "ok" ? … : outcome` already widens — and no existing tool,
route or test changed behaviour, which is what _additive_ was supposed to mean
and is now demonstrated rather than asserted.

**The shared producer was extracted rather than the assembly duplicated**, for
Task 7.2.2's reason and one stronger one. `apps/backend/src/peer-comparison.ts`
(`readPeerComparison`) holds what `symbolReturn` was doing inline since Task
5.6.4 — resolve the reference, read the subject's leg, read the BENCHMARK's leg
at the same instant, address the generation for that session, call
`excessMoveFactor` — and `index.ts` now reads it, so the investigation step and
the market-stream frame's own composite cannot disagree about which fund a
security is differenced against or about the instant the two legs were read at.
**The stronger reason is that `one-instant-for-a-subject-and-its-benchmark`
watches the interval expression every five-minute-return read in a CALLING file
shares**, so both reads sitting in one producer is the only shape that cannot
become two intervals — a copied assembly in the tool would have been a second
pair to keep honest for ever.

**A reading with no factor member at all** is how a symbol the curated universe
does not describe is answered: `PeerComparisonReading` is a union on
`described`, so a caller cannot read a factor it has no description for
(`ExcessComparison`'s own mechanism), rather than being handed a fabricated
refusal. The first draft of this producer DID fabricate one — a
`no-subject-move` with `sampleCount: 0` minted in the producer — which is
exactly the imputation this repository forbids elsewhere, and it was replaced
before anything was run against it.

**Four surfaces beyond the tool itself:** the frontend decoder's
`inapplicable` branch (reading `because`, with a test that a frame spelling
`reason` instead decodes as `unreadable`); a new invariant,
`the-tool-outcome-decoder-branches-on-every-kind`, plus its break; the
`docs/GAPS.md` entry Done-when 2 asks for; and dated amendments to the two live
claims the Work section names — `investigation.ts`'s own "closed, two-member
union" docblock and `INVESTIGATIONS.md` §1's "`ok`/`refused` outcome union"
sentence. Both were amended rather than rewritten: the _no-thrown-path_ half of
each is the load-bearing half and is still true.

### What was NOT anticipated, and is the finding worth carrying forward

**Extracting the producer moved that check off `index.ts` entirely, and left
Task 7.2.2's own widening of it with no live call site.**
`one-instant-for-a-subject-and-its-benchmark` only looks at files that call
`excessMoveFactor`; `index.ts` no longer does, and the three shipped callers are
now `peer-comparison.ts`, `market-unusual.ts` and `compute-baselines.ts`. So the
`PRODUCER_READ` arm that task added **one day earlier** — teaching the check to
read `readPriceAnomaly`'s own third positional `asOf` as an interval key — has
nothing to see any more. It is kept rather than deleted, with a dated note in
the break that proves it, because it is the shape `symbolReturn` would take
again the day a surface wants a security's percentile and its excess assembled
together; but **a reader of that arm would otherwise conclude it guards
something, and it currently guards a shape no file has.** That is this
repository's own _a claim about a mechanism reads identically whether the
mechanism is there or not_, arriving on a check rather than on a document.

Both break entries that pointed at `index.ts` were therefore repointed to
`peer-comparison.ts` — `every-break-can-still-land` caught both in the first
invariants run after the refactor, which is that check doing precisely its job.

### Gates

- `pnpm verify` — **green**, verbatim: `91 invariants hold.` (89 at Story 7.1's
  close; Task 7.2.1's `a-tool-takes-no-channel-to-another-step` is the 90th and
  this task's decoder check is the 91st — Tasks 7.2.2 and 7.2.3 added none,
  they widened existing ones),
  `packages/shared 738 passed`, `apps/backend 1461 passed`,
  `apps/frontend 2005 passed`, `test:scripts 21 pass 0 fail`,
  `test:process 63 passed`. No `Unhandled Errors` block in any run.
- `pnpm --filter @marketpulse/backend test tool-compare-securities` — 15
  passed. Against the real `excessMoveReference` over the real curated
  `UNIVERSE`, the real `excessMoveFactor`, `comparableExcessBaseline` and
  `returnPercentileOf`; no server, socket or database. Covers the scored arm
  (`+0.5` points ranked at the 50th against a derived uniform sample, with the
  benchmark named), both inapplicabilities, and six refusals including the
  `split-discontinuity` / `reference-split-discontinuity` pair asserted as two
  different words.
- `pnpm --filter @marketpulse/backend test routes/investigations.test` — 15
  passed, three of them new and all three Done-when 2: `XLK` →
  `{ kind: "inapplicable", because: "is-benchmark" }` and `SPY` →
  `because: "no-sector"` **read off the SSE frame**, with the same tool over
  the same empty store answering `{ kind: "refused", reason: "no-subject-move" }`
  for `NVDA` — one tool, one store, two different KINDS of answer, which is the
  whole point of the third arm.
- `pnpm --filter @marketpulse/frontend test investigation-event` — 13 passed,
  two new: the `inapplicable` decode, and the `reason`-instead-of-`because`
  frame decoding as `unreadable`.
- `pnpm break a-fourth-tool-outcome-kind-the-decoder-ignores` —
  `✓ broken → red → restored byte-identical. matched: the-tool-outcome-decoder-branches-on-every-kind`.
  **And the real defect was planted by hand as well**, which is the stronger
  proof the house rule asks for: with the shipped `inapplicable` branch removed
  from `readToolOutcome` and the shared arm left in place, the check reported
  ``1 `ToolOutcome` kind(s) have no branch in `readToolOutcome`: `inapplicable` ``
  — the actual state this task would have shipped, caught by name, with the file
  restored afterwards.
- `pnpm break a-second-instant-for-the-benchmark` and
  `pnpm break a-second-instant-for-the-subject` — both repointed to
  `peer-comparison.ts` and both
  `✓ broken → red → restored byte-identical. matched: one-instant-for-a-subject-and-its-benchmark`.
- `pnpm e2e security-investigate.spec.ts` — **NOT RUN, and the spec was edited
  blind**, exactly as in Tasks 7.2.2 and 7.2.3 and for the same reason: the
  Docker daemon is not running on this machine (`docker ps` fails on the socket
  outright), so there is no local database and no pair (`pnpm ready` reports
  nothing on `:5173`). The edit is the narrow kind — a count 3 → 4 and one
  added `toBeVisible` on the description string this change introduces. **CI is
  the first machine that will run it.**
- `pnpm store:bare` — **NOT RUN**, same cause: it builds a second database and
  there is no daemon to build it in. What it would have shown is covered
  mechanically instead, which is stronger than it sounds: the new SSE test's
  tool reads an **empty window and no generation**, which is exactly the shape
  `store:bare` produces, and it asserts `no-subject-move` there.
- `pnpm test:database` — not run and **out of scope**: this change adds no
  query, no migration and no store module. The generation read is a function
  passed in by `index.ts`, and the only new store type is a
  `StoredExcessBaseline` the existing cache already returns.

### What nothing here can certify

**No machine and no person has ever seen this step answer a figure.** The `ok`
arm needs a live feed on BOTH legs within the same five minutes AND a stored
excess-move generation, which only the deployment has — CI's store is 516
securities with zero bars and no provider, so every gated run answers
`no-subject-move` for an equity, for ever. The two `inapplicable` arms are the
exception and the reason Done-when 2 was reachable at all: they are decided from
the curated universe alone, so `XLK` and `SPY` answer identically on CI, on a
laptop and on the deployment — **the first outcome in this epic whose
interesting case a gated machine can actually produce for a reason other than
everything being absent.**

**And no reader has seen any of it**, because the checklist draws a step's
status and not its outcome (Task 7.1.4's decision): an `inapplicable` step, a
refused step and a step carrying a real figure are byte-identical rows today.
That is the `docs/GAPS.md` entry this task added, owned by _the first surface
that draws a step's own outcome_.

## For a stakeholder — a status report, 2026-11-19

Pressing `Investigate` now runs **four** steps rather than three, and the new
one is the third of the five this story exists to build: it asks whether this
security moved differently from its own sector.

**What it compares, and the words we chose for it.** The step is called
`Compare against sector benchmark` rather than the plan's original "compare
peers", because what it actually does is compare the security against the
exchange-traded fund for its sector — a fund weighted by company size — and
"peers" would promise an average of comparable companies that we do not
compute. Saying the narrower, true thing on screen costs nothing and stops the
figure being read as something it is not.

**The interesting part is a new kind of answer.** Until today a step could
report a figure or report that it had not enough evidence — _ask again after
tonight's data arrives_. But for the eleven sector funds themselves, and for
the four broad-market funds, this comparison **does not make sense at all**:
you cannot compare a sector fund against its own sector, because it _is_ the
sector. That is not a gap in our data and no amount of waiting will fill it, so
the step now says so in its own words rather than borrowing the word for _not
yet_. A reader told "unavailable" reasonably waits; a reader told "this does
not apply" does not.

**Two things worth knowing about how far it reaches.** The new answer travels
all the way to the browser and is checked at every layer in between —
including one place where it would have been silently thrown away, which was
found and fixed in the same change and now has a permanent guard behind it.
But **no screen draws a step's outcome yet**: all four steps currently show as
a tick with a duration, so a reader cannot yet see which step answered a
figure, which one is waiting for data, and which one will never apply. That is
recorded as an open item with a named owner rather than left for someone to
notice.
