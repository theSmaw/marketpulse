# Task 7.3.1 — Findings reach the wire, and the checklist shows a plain claim

**Status:** Complete — 2026-11-23. Every completed step now mints exactly one
`Finding` and draws its claim; the two things found that the plan did not
predict are that **`POSSIBLE` is correctly unreachable in four of the six
tools** and that **the pre-existing `INVESTIGATION_FAILED` decoder gap made
the new parity invariant red on `main` before a line of this story existed**,
which is how the check earned itself.
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** nothing (lands on top of Story 7.2's shipped six-step pipeline)

## Objective

Every other task in this story styles, places or announces a claim that
has to exist first. This task mints it: the `Finding`/`Evidence` domain
types, the six tools' claim-and-confidence logic, the wire event, and the
plainest possible rendering — so the real value is on screen before any
layout or accessibility work begins.

## What the user can see when this lands

Each completed checklist row grows a second line of plain, unstyled text
stating what was actually measured (e.g. `−4.2% over 5 min — 94th of
4,620`) or why it wasn't (`Volume rate — no history to rank it`). No
confidence mark yet — that is Task 7.3.2's. An `inapplicable` step (SPY
correlating with itself, a sector ETF comparing against its own sector)
shows its own sentence with nothing styled at all.

## Work

**Amended 2026-11-23, after this task's own technical shaping found two
blockers (see `STORY.md`'s "Two blockers" section for the full argument)
and six corrections to the plan below. Both blockers are resolved;
nothing here is open.**

### 1. `packages/shared/src/finding.ts` (new module) + `finding.test.ts`

`FINDING_TYPES`/`FindingType` — six values, one per step, naming **the
question asked** rather than the tool: `PRICE_OBSERVATION` (the
snapshot — settled over `LATEST_PRICE`: the other five name a quantity
with no freshness adjective, and freshness has one home, the status
bar), `PRICE_MOVE`, `VOLUME_RATE`, `RELATIVE_MOVE` (§15's own value,
verbatim), `MARKET_BREADTH`, `RETURN_CORRELATION` (this product's
shipped word for that arithmetic — never a new spelling). A
`FINDING_TYPE_FOR_TOOL` map `satisfies Record<ToolName, FindingType>`,
so a seventh tool is a compile error until it declares its own claim
kind.

`CONFIDENCE_LEVELS`/`Confidence` — all four; `CONFIRMED` documented as
having no producer in this epic (reserved for Epic 9's filings),
exactly as `INVESTIGATION_STATUSES`' `awaiting_user` already is.

`EVIDENCE_KINDS` — only `market_observation` and `calculated_metric`;
the other six §16 names stay undeclared, each with its own condition in
the docblock (declaring one now would be ADR 0029's fully-formed record
about nothing).

The two-arm `Finding` union: `EvidencedFinding` (a non-empty-tuple
`evidence: readonly [Evidence, ...Evidence[]]` — an evidence-less
evidenced finding is untypeable) and `UnevidencedFinding` (a `because:
ToolRefusal` field, **no `evidence` member at all** — never
`evidence: []`, which is a constant and a branch away from the defect
this type exists to forbid; `confidence` is the literal `"UNKNOWN"`
rather than `Confidence`, a type-level statement of AC 3's rule). No
`security` field on either arm — the subject is already named by the
investigation's `subjectSymbols`, the route and the identity block, and
Gate 1 settled that claims omit the investigated ticker; `Evidence.
security?` is the one per-item home, absent for breadth. This
**strengthens** AC 8 beyond its own literal wording (a four-arm union
discriminated on `type` is not needed — simply no finding anywhere
carries one).

The real-`Symbol` brand (never `declare const brand` — a branded object
has to be _constructed_, and the mint is an ordinary checked
construction rather than an `as unknown as` that checks nothing beside
it), and exactly two exported mint functions, `createEvidencedFinding`
and `createUnevidencedFinding`. Mirror `composite-score.ts`'s
`AnomalyScore`/`UnscoredAnomaly` shape directly.

`Evidence`'s fields: `kind`, `source` (the feed/producer — invariant
6's field), `observedAt?` (absent, never `undefined`, where there is no
observation — `exactOptionalPropertyTypes` makes those different
types), `retrievedAt: Date` (stamped, never supplied by the mint's
caller — see `FindingStamp` below), `method?`, `security?` (absent for
breadth), `rawData: string` (a **reference** to the read, e.g.
`"current-market-state:NVDA"`, never a copy of the figure).

`FindingStamp` carries `findingId: FindingId`, `stepId: StepId` and
`retrievedAt: Date` — **no `evidenceId` generator** (correction: nothing
in this story addresses an evidence item by id, since `EVIDENCE_ADDED`
is not emitted; a field with no reader is ADR 0029's own subject, and
Epic 8 adds one beside the pinning that needs it). Supplied by the
orchestrator at the moment it emits `FINDING_CREATED`, never read inside
a tool or inside `packages/shared` — the four clock-reading lint rules
scoped there are unchanged, because an instant here can only arrive as
an argument.

`toWireFinding`, a **hand-written, field-by-field mapper returning
`Readonly<Record<string, JsonValue>>`** — never a named `WireFinding`
interface (an interface has no index signature, so it fails
`WireFields`'s own type constraint) and never `WireFields<Finding>`
(which maps over `keyof` a union — the members' _intersection_ — so
`evidence`/`because` would pass through unexamined, and the brand's
symbol key would typecheck into the map while `Object.keys` never reads
it, silently never encoding the finding at all).

`finding.test.ts`: `@ts-expect-error` proofs that an empty-tuple
evidenced finding and an unbranded finding do not typecheck, **plus a
named test proving what the brand does NOT prove** — that a claim
matches its evidence — so the type guarantee is never over-trusted
(`composite-score.test.ts`'s own precedent, copy its wording). A test
that `FINDING_TYPE_FOR_TOOL` covers `TOOL_NAMES` exactly, both
directions. **The module's own docblock must say the brand dies at
`JSON.parse` and is never restored** — unlike `AnomalyScore`, there is
no `readFinding`, because the browser declares its own wire shape and
never reconstitutes a domain `Finding`; AC 2's guarantee is a **backend**
guarantee, and this is the one place the `composite-score.ts` analogy
breaks. Say so plainly.

A `CLAIM_CEILING` constant lives here too (see §4 below) — **enforced in
each tool's own unit tests, never as a throw at the mint**: the mint is
reached from inside the orchestrator's `try`, and a thrown `RangeError`
there would kill a whole run because a refusal sentence was one
character too long.

### 2. The claim formatters: move individual functions into `packages/shared`, never whole files (B1's resolution)

`percentileOrdinal` and `ordinalSuffix` move into
`packages/shared/src/percentile-ranking.ts` (already the declared home
of the ordinal's own comparator). The population/count formatters this
claim needs move into a small new shared module beside `finding.ts` —
**only the strings the backend will print verbatim**; a formatter that
produces a _different grammar_ for the same fact (the breadth region's
own longer footer sentence, versus this claim's one-line,
character-ceilinged form) stays where it is, and the claim gets its own
short grammar built from the same counted figures rather than reusing
that sentence. `apps/frontend/src/market/index.ts` re-exports whatever
moves, so no external call site changes; internal frontend importers
that currently reach these functions by path should import
`@marketpulse/shared` directly rather than a re-export of a re-export.

**Two invariants/docblocks must be re-pointed and dated-amended in the
same change, not silently moved**: `one-home-for-the-ordinal-suffix`
(`scripts/check-invariants.mjs`) currently names the frontend file as
the home and its own docblock explicitly says a backend formatter is "a
different defect with a different owner" — that sentence goes false the
day this ships. `tool-return-percentile.ts`'s own docblock ("nothing is
derived and nothing is formatted... all the browser's") is still true of
`toWireReturnPercentile`, the wire projection, and false of the file once
it mints a claim — narrow the claim to name which function it's about.
Any break entries naming these files by path (`scripts/breaks.mjs`) need
the same update, and each must be re-run after, per this repo's own rule
that a break proves nothing until it's confirmed red again.

The claim vocabulary inherits `measured-set.ts`'s existing reservation
that counted-population text carries no intensity adjective (`high` is
a reserved anomaly-band word) — stated once here rather than discovered
when a band chip and a claim sit on one screen in Epic 8.

### 3. The tool contract: a thunk, not a flat pair

`RunnableTool.run` returns `Promise<ToolRun>`:

```ts
export interface ToolRun {
  readonly outcome: ToolOutcome<Readonly<Record<string, JsonValue>>>;
  readonly mintFinding: (stamp: FindingStamp) => Finding | undefined;
}
```

**`mintFinding` is a closure holding the tool's own typed `Output`, not
a plain `finding` field** — `retrievedAt` does not exist yet when `run`
returns (it is the instant the orchestrator later stamps, at emission),
so the Finding cannot be minted until the orchestrator calls this thunk
after `completedAt` is known. This also keeps the claim derived from the
typed `Output` rather than from the already-wire-erased `JsonValue`.
`toRunnableTool` gains a fourth argument:

```ts
toFinding: (outcome: ToolOutcome<Output>, stamp: FindingStamp) =>
  Finding | undefined;
```

`a-tool-takes-no-channel-to-another-step` is unaffected (it captures
only `run`'s parameter list, which is untouched) and `a-tool-reads-no-
clock` is unaffected (a `toFinding` co-located in a tool file must not
construct a `Date`; it takes `retrievedAt` off the stamp).

### 4. The six `toFinding` functions, one per tool, co-located beside each `toWire…`

Confidence is a **stated function of the reading's own counted
evidence**: `refused` → `UNKNOWN` always; `inapplicable` → **no
Finding** (`undefined`) — AC 3's exception, because "the question does
not arise" must not collapse onto "not enough evidence"; `ok` below the
tool's own shipped sufficiency floor → `POSSIBLE`; `ok` above it →
`SUPPORTED`. **`POSSIBLE` has a real producer in only two of six tools**
(`get_market_breadth`'s `measured === 0`, and
`calculate_rolling_correlation`'s `significant === false`) — the other
four tools' floors are already enforced upstream as refusals
(`too-few-samples` etc.), so their `ok` is above the floor by
construction. Do not invent a second floor to fill an arm that is
correctly unreachable; say so in each one's own docblock.
`get_security_snapshot` has no floor at all — its `ok` is always
`SUPPORTED`, and deliberately not keyed on `ageMs` (staleness has one
home, `feed-liveness.ts`).

Every claim is derived from the tool's own typed `Output`, **never**
from the wired JSON and never from the tool's name or description — a
claim templated from a name is exactly the defect Done-when 2's
pairwise-distinctness test exists to catch. Every figure uses a shipped
formatter so a claim and the factor ledger ~100px above it on the same
page cannot spell one figure two ways; each claim states its own `n`/
span, because the ledger reads the live frame while these tools read at
`context.asOf`, and two correct figures can legitimately differ twelve
inches apart on the same page.

A refusal's or inapplicability's claim and `Evidence` must never
fabricate an `observedAt`, a figure, or a `rawData` reference for
something that was not actually read (AC 9) — the refusal's own word is
the whole claim.

### 5. The orchestrator (`scripted-agent-provider.ts`)

After `TOOL_CALL_COMPLETED` is appended and `completedAt`/`durationMs`
are known, call `run.mintFinding({ findingId, stepId, retrievedAt:
completedAt })` (the provider's own already-injected clock — the one
line in this product that legitimately reads the real one). If the
result is not `undefined`, append `FINDING_CREATED` carrying the finding
with its evidence inline — **before** `STEP_COMPLETED`. No event at all
for the `inapplicable` (no-finding) case; the row renders the
inapplicability sentence Story 7.2 already ships, untouched, with no
confidence mark.

### 6. Wire shape

A new `InvestigationEvent` member:

```ts
| (InvestigationEventBase & {
    readonly type: "FINDING_CREATED";
    readonly finding: Finding;
  })
```

**No top-level `stepId`** — unlike every sibling event, because
`Finding.stepId` is already the one home for _which step produced this_,
and a second copy on the envelope would be a second answer to the same
question. A new `toWireInvestigationEvent` case using `toWireFinding`.
`EVIDENCE_ADDED` is **not** added to the typed union this story (Gate
1's resolution) — it stays a name-only member of
`INVESTIGATION_EVENT_TYPES`, reserved for the story where evidence can
be pinned with no attached finding.

**Three now-stale docblocks in `investigation.ts` need a dated
amendment, not a silent edit**: `INVESTIGATION_EVENT_TYPES`'s own
("Story 7.1 ships six..."), `InvestigationEvent`'s ("the six events
Story 7.1 ships"), and `Investigation`'s ("`findings`/`evidence` arrive
at Story 7.3" — findings travel on the _event stream_; `Investigation.
findings` itself still waits for Epic 12's persistence, and leaving this
claim unamended would assert a field that does not exist).

### 7. Frontend

`WireInvestigationEvent` gains the matching member, declaring **only
the fields the browser reads** (`stepId`, `claim`, `confidence?`) —
`INVESTIGATION_STARTED`'s own shipped precedent of partial decoding.
`readInvestigationEvent`'s decoder gains the case; a confidence level
the bundle doesn't recognise is **dropped, never guessed**, and never a
reason to drop the claim with it (the same honest-absence shape an
`inapplicable` step already renders). `ChecklistStepView` gains `claim:
string | undefined` and `confidence: Confidence | undefined`, both
absent for a queued row and for an `inapplicable` step.
`applyInvestigationEvent`'s new `FINDING_CREATED` case sets them,
keyed on `event.finding.stepId`. Correct the now-wrong
`TOOL_CALL_COMPLETED` no-op comment (its outcome's reader has arrived,
and it is the backend's `toFinding` — this checklist still reads
`FINDING_CREATED`, for a different, narrower reason than the old
comment gives).

**Fix the pre-existing `INVESTIGATION_FAILED` decoder gap in this same
change (B2 — see `STORY.md`)**: add the missing decoder case and a
reducer arm marking the run `terminal: true`, with **no new
reader-facing sentence** (that stays Story 7.5's). Written into Story
7.5's own `STORY.md` as the constraint it inherits.

### 8. Two new invariants, each with a `pnpm break`

**`two-mint-sites-for-a-finding`** — mirrors `two-mint-sites-for-an-
anomaly-score` structurally: exactly `createEvidencedFinding` and
`createUnevidencedFinding` in `packages/shared/src/finding.ts` may
assert into one of `Finding`'s branded types; any other `as`/`satisfies`
into `EvidencedFinding`/`UnevidencedFinding`/`Finding` elsewhere in
shipped code fails the build. Per this repo's own break-writing
discipline, write the plant as the defect the **next** author writes (a
tool casting a record into a `Finding` rather than calling the mint),
confirm the check passes **wrongly** first, then fix, then confirm red.

**`every-serialised-event-type-has-a-decoder-case`** — a sibling of
`the-tool-outcome-decoder-branches-on-every-kind`, not a widening of it
(that check is blind to a new _event type_, which fails one layer
further out and in a different direction: an unhandled outcome kind
makes a whole event `unreadable`, an unhandled event type is silently
`unsupported` and dropped). Anchored on the backend serialiser's own
switch, never on `INVESTIGATION_EVENT_TYPES` (which legitimately holds
payload-free names a decoder correctly has no case for — a check over
that list would be red on a correct tree forever). **This check is red
on `main` before this task starts, because of `INVESTIGATION_FAILED`
(B2)** — fixing B2 in §7 is what lets it ship green.

### 9. The plainest possible rendering

`InvestigationChecklist.tsx` renders `step.claim` as a second `<p>`
with no new styling, no confidence mark — this is deliberately
throwaway visually; Task 7.3.2 replaces it with the real two-line grid
and the `ConfidenceMark`. Assert AC 7 structurally even at this stage:
the claim adds zero focusable elements and zero click handlers to a row.

### 10. Documents this task owes (do not leave implicit)

`PRODUCT_SPEC.md` §33's dated amendment for the `EVIDENCE_ADDED`
deviation; `INVESTIGATIONS.md`'s account of the Finding/Evidence model,
the confidence rule, the vocabulary and the wire event; the stale
`investigation.ts` docblocks (§6 above); `CLAUDE.md`'s TypeScript
section gaining the brand/non-empty-tuple/two-mint-sites convention
(~6 lines, pointing at `composite-score.ts`'s fuller argument); Story
7.5's `STORY.md` (B2's inherited constraint, already written).

## Done when

1. `packages/shared/src/finding.ts` exists with both tests the
   `AnomalyScore` precedent itself has: `@ts-expect-error` proofs that an
   evidence-less evidenced-finding and an unbranded finding do not
   typecheck, and a named test proving what the brand does **not**
   prove (that a claim matches its evidence) — don't let the type
   guarantee be over-trusted.
2. Every tool's `toFinding` is unit-tested across every `ToolOutcome` arm
   it can reach, with an assertion that the claims/confidences produced
   are pairwise distinct (AC 10) — this is the test that would catch a
   claim templated from the tool's name rather than its outcome.
3. A refusal's or inapplicability's `Evidence`/sentence is asserted to
   carry no fabricated `observedAt`, no invented figure, and (for
   `UnevidencedFinding`) no `evidence` member at all (AC 9).
4. Investigating `SPY` shows the correlation step's row with its
   inapplicability sentence and no confidence mark; investigating `XLK`
   shows the same for peer comparison. Investigating `NVDA` shows six
   rows each with a plain claim line (or the volume tool's permanent
   refusal, confidence `UNKNOWN`).
5. `pnpm break two-mint-sites-for-a-finding` and the new event-type/
   decoder-parity break both go red for the right clause and restore
   byte-identical.
6. `pnpm verify` is green.

## What was done

**The plan above was followed; three things in it changed on contact with the
code and each is recorded where it belongs rather than only here.**
`INVESTIGATIONS.md` §11 is the maintained account of this task and **wins**
over this file.

**1. `packages/shared/src/finding.ts` (new, + `finding.test.ts`).** Six
`FINDING_TYPES` with `PRICE_OBSERVATION` settled as §4 said; a
`FINDING_TYPE_FOR_TOOL` map `satisfies Record<ToolName, FindingType>` — and it
is **read** rather than merely asserted, because each tool's `toFinding` takes
its type from it (`FINDING_TYPE_FOR_TOOL.get_security_snapshot`) rather than
spelling a literal, which was the one way to keep the map from being a field
with no reader. All four `CONFIDENCE_LEVELS`; two `EVIDENCE_KINDS` with the
other six §16 names' conditions in the docblock; the two-arm union, the real
`Symbol` brand, the two mints, `toWireFinding` as a hand-written field-by-field
mapper, and `CLAIM_CEILING`.

**2. The formatters moved, and more of them than §2 named.** `percentileOrdinal`
and `ordinalSuffix` into `packages/shared/src/percentile-ranking.ts`, as
planned. What §2 did not anticipate is that the claims also print a **price**, a
**percentage** and a **difference in points**, so `formatPrice`,
`formatChangePercent` and `formatSignedCount` moved into a new
`packages/shared/src/price-format.ts` by the same per-string test, with
`formatSignedPoints` and `formatCount` added beside them. The frontend's
`market/price-format.ts` and `market/return-percentile.ts` are left as
**re-exports**, so no frontend call site moved and `market/index.ts`'s barrel is
unchanged. `one-home-for-the-ordinal-suffix` is repointed and its own false
sentence struck with its reason; both tools' `nothing is derived and nothing is
formatted` docblocks are narrowed to name the wire projection.

**3. The tool contract.** `ToolRun` with `mintFinding` as a thunk, exactly as
§3 specified; `toRunnableTool` gained a fourth argument; six call sites in
`index.ts` and six in the tests.

**4. Six `toFinding` functions**, each beside its own `toWire…`, each with a
`describe` block in that tool's existing suite asserting the claim verbatim,
the confidence, the evidence's shape, and **pairwise distinctness across every
arm that tool can reach** with the ceiling checked on each.

**5. The orchestrator** emits `FINDING_CREATED` after `TOOL_CALL_COMPLETED` and
before `STEP_COMPLETED`, stamping `retrievedAt` from `completedAt` rather than
taking a second clock reading — so the field is bounded by the step's own
published `durationMs` and the two cannot disagree. `undefined` emits nothing.

**6. The frontend** gained the `FINDING_CREATED` wire member (three fields
only), its decoder case (an unrecognised confidence level is dropped and the
claim kept), the `INVESTIGATION_FAILED` decoder case and reducer arm,
`claim`/`confidence` on `ChecklistStepView`, and a deliberately unstyled second
`<p>`. The now-wrong `TOOL_CALL_COMPLETED` no-op comment is corrected.

**7. Two new invariants with two breaks**, `pnpm invariants` 93 → **95**.

### What deviated from the plan, and why

- **`POSSIBLE` has two producers, not four**, and §4 predicted this correctly;
  what the code added is that the other four tools' `POSSIBLE` arms are
  **unreachable by construction** rather than merely unused, because each
  floor is already enforced upstream as a refusal. Each one says so in its own
  docblock, as §4 asked.
- **`calculate_volume_ratio`'s unreachable `ok` claim does not draw the `×`
  multiple.** It cannot: `one-home-for-the-multiple-glyph` permits exactly one
  home for that glyph and it is a frontend module. Caught by running
  `pnpm invariants` rather than by reading — the first draft spelled
  `4.10× the typical minute` and the check went red naming both files. The
  claim draws the ordinal instead, with the condition for moving
  `formatMultiple` stated beside the arm. Scaffolding a shared formatter for an
  arm no store can reach would have been building ahead of the step.
- **`VolumeRatioReading` gained `aboveSample`**, because `percentileOrdinal`
  takes the rank **and** the ceiling flag and supplying a `false` would have
  been a figure nobody read. A fill rather than a design, in the spirit that
  interface already declares for itself.
- **The claim for `no-distribution` is NOT the ledger's `no history to rank
it`**, which §2's own example implied. `tool-volume-ratio.ts`'s header says in
  terms that that sentence has one home and it is not in the backend, and B1's
  own per-string test is what settles it: a different grammar for the same fact
  keeps its own home. The claim says `no stored distribution to rank against`,
  and the extra word is the point.
- **`finding.test.ts`' empty-tuple proof is declared and never called.** The
  precedent in `composite-score.test.ts` calls its subject because that subject
  reads a field; this one walks a tuple, so calling it exercises what an
  impossible value does at run time rather than the guarantee. The assertion is
  the `@ts-expect-error`.

## Gates

**`pnpm verify` — green.** `95 invariants hold.`;
`packages/shared 37 files / 775 tests`, `apps/backend 82 / 1,491`,
`apps/frontend 109 / 2,008`, `test:scripts 21`, `test:process 3 / 63`. **No
`Unhandled Errors` block in any run** — read rather than inferred from the exit
code, per this repository's own rule.

**Both breaks go red for the right clause**, and the mint-site one was proved
against a **naive draft first**, per the break-writing discipline:

```text
$ node /tmp/.../naive-mint.mjs          # count the two mint DECLARATIONS
NAIVE DRAFT GREEN — both mints are declared once, in packages/shared/src/finding.ts.
naive exit=0                             # …with the third mint site on disk

$ node scripts/check-invariants.mjs      # the SHIPPED check, same plant
  ✗ two-mint-sites-for-a-finding
    1 shipped line(s) assert their way into a branded finding type outside
    packages/shared/src/finding.ts:
      apps/backend/src/tool-security-snapshot.ts: }) as unknown as Finding;
1 of 95 invariants failed.
```

The parity check was proved on the defect it was **written against** rather
than on a synthetic one — the decoder case was removed and the run re-taken:

```text
  ✗ every-serialised-event-type-has-a-decoder-case
    1 serialised event type(s) have no case in `readInvestigationEvent`:
    `INVESTIGATION_FAILED`
1 of 95 invariants failed.
```

Both reds are an **assertion failure with the other 94 still collecting**,
which is the only red that proves a check works; both trees were restored and
`95 invariants hold.` re-confirmed after each.

**What was NOT run, and why.** `pnpm test:database` and `pnpm e2e` — **no
Docker on this machine**, so no local PostgreSQL exists and the pair
`pnpm e2e` needs cannot serve `GET /securities`. The data-layer surface this
task touched is zero (no migration, no query, no schema change); the browser
surface is one unstyled `<p>`, which Task 7.3.2 replaces. The consequence worth
naming is narrower and is in `docs/GAPS.md`:
`calculate_rolling_correlation`'s claim — the only one of the six whose tool
reads `market_bars` — exists only against furnished `ReadonlyMap`s.

**`pnpm probe` was not run either, and AC 6's ceiling is therefore owed.**
`CLAIM_CEILING = 72` is a measurement of the **producers** (the longest claim
the six can mint, asserted in their own suites) and **not** the probe figure
against a zero-bar store at four widths that AC 6 asks for. `docs/GAPS.md`
carries it with Task 7.3.2 as owner and a stated reversal condition.

## For a stakeholder

**Press `Investigate` on a security and every finished row now tells you what
it found.** Six rows, six sentences — `+0.50% over 5 min — 50th of 2,500`,
`2 up, 2 down, 1 flat of 5 measured in the last 5 min`,
`Volume rate — no stored distribution to rank against` — each in plain,
deliberately unstyled text under the step it came from. Where a step could not
answer, the row says **why** rather than going quiet; where the question did
not arise at all (`SPY` correlated with itself, `XLK` compared against its own
sector), the row says that instead and claims nothing.

**It still looks unfinished, and that is on purpose.** There is no confidence
mark, no two-line layout and no styling: the next task draws all of it. What
this one buys is that the real sentences are on screen to be designed around
rather than furnished.

**One real bug was fixed on the way, and nobody had noticed it.** A run whose
tool crashed had been telling readers the **connection dropped** since
2026-11-18, because the failure event never reached the browser at all. It
does now. What a reader is _told_ about a failed run is still Story 7.5's to
write — this is the plumbing, not the sentence.
