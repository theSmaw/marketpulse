# INVESTIGATIONS.md — the investigation engine: what exists, where the decisions live, and what nobody has seen yet

**Written:** 2026-11-17, by Story 7.1's own Phase 3 sweep, at that story's close
**Epic:** [Epic 7 — Deterministic Investigation Engine](EPIC.md) · **Spec:** [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) §12–§14, §17, §31–§33
**Status:** The maintained account of this product's investigation engine.
Where a task file disagrees with this document, **this document wins**;
where this document disagrees with an ADR about a decision, **the ADR
wins**.

**Written at this story's own close rather than at the epic's**, following
Story 6.1's own precedent for exactly this reason (`TOPOLOGY.md`'s own first
page): Epic 4 and Epic 5 each shipped without a subject document and wrote
one only when their own close found it missing, and Epic 6's decomposition
said not to repeat that a third time. Epic 7's own decomposition inherits
the same rule. **So this document is minimal rather than comprehensive** —
a gathering of what Story 7.1 decided and measured, and a place for every
later story in this epic to amend rather than scatter its own findings
across task files for a future close to rediscover.

---

## 0. What exists today, and the one sentence that bounds everything below

**One tool, one path, one surface.** A reader on `/securities/NVDA` can
press `Investigate`, watch a one-step checklist run against the real
security snapshot tool, and see it complete with a real measured duration
— the whole of `get_security_snapshot` → a scripted `AgentProvider` → six
SSE event types → a React hook → a component, proved end to end against
this product's own live-data store rather than a fixture. **Nothing else
in this epic's scope exists yet**: no second tool, no `Finding` or
`Evidence` rendered on screen (though both are real, typed domain members —
§3 below), no cancellation that does anything, no failure a tool can
produce, no landing-page region, and no persistence past a backend
restart. Every one of those is a later story's own, named below rather than
assumed.

**Amended 2026-11-18 (Task 7.2.1), on two sentences above rather than on
the paragraph's shape.** _No failure a tool can produce_ is now narrower
than it reads: a thrown tool still has no reader-facing sentence anywhere
(Story 7.5's), but the orchestrator now **always** reaches a terminal event
and a non-`running` status after one — `INVESTIGATION_FAILED`, carrying no
reason and drawn by nothing. And the SSE stream carries a **keepalive
comment** on an 80-second interval, which §9 records in full. Everything
else in this section is unchanged: still one tool, one path, one surface.

**Amended 2026-11-20 (Story 7.2 complete, Task 7.2.7): _one tool_ is now
SIX, and the first sentence of this document is the one that changed.** A
reader on `/securities/NVDA` presses `Investigate` and meets **all six rows
at once** — the snapshot plus `EPIC.md`'s five named steps, in its order:
`Measure move`, `Measure price anomaly`, `Measure volume anomaly`,
`Compare against sector benchmark`, `Calculate market breadth`, `Compare
against the broad market` — each ticking from queued to running to complete
with its own real tool, status and measured duration. §10 is this story's
own account. What is still true, verbatim: no `Finding` or `Evidence` on
screen (Story 7.3), no cancellation that does anything, no reader-facing
sentence for a failure (Story 7.5), no landing-page region (Story 7.6), no
persistence past a restart (Epic 12). And one sentence is now **weaker**
than it was: _proved end to end against this product's own live-data
store_ was true of one tool reading process memory; four of the six can
only draw a figure on a store with bars during a session, and one of them
can never draw one on any store that exists — `docs/GAPS.md` carries the
step-by-step table.

**Amended 2026-11-24 (Story 7.3 complete, Task 7.3.4): _no `Finding` or
`Evidence` rendered on screen_ is now false, and it is the sentence that
changed.** Every completed row now draws its own `Finding.claim` on a
second line, led by a `ConfidenceMark` reading the finding's own
confidence level — `SUPPORTED`/`POSSIBLE`/`UNKNOWN` today,
`CONFIRMED` reserved with no producer until Epic 9's filings. §12 is this
story's own account. What is still true, verbatim: no cancellation that
does anything (Story 7.5), no reader-facing sentence for a failure (Story
7.5), no landing-page region (Story 7.6), no persistence past a restart
(Epic 12). And `Evidence` itself — the record backing an evidenced
finding, with its source, timestamps and raw-data reference — is still
**not** rendered anywhere: a claim's confidence level is drawn, the
evidence that licenses it is not, which is Epic 8's evidence panel by
citation, unchanged from this document's own first sentence.

## 1. The domain model, and what is reachable from this story alone

`Investigation` and `Step` are **two separate status vocabularies**
(`PRODUCT_SPEC.md` §13/§14), never a shared union — `queued` exists only on
a `Step`, `awaiting user` only on an `Investigation`. This story produces
exactly:

```text
Investigation:  running → completed
                running → failed       (since 2026-11-18, Task 7.2.1)
Step:           queued → running → completed
```

`failed` and `cancelled` (both vocabularies) have no producer anywhere in
this epic yet — Story 7.5 is where a tool can fail and a run can be
cancelled for real. **Corrected 2026-11-18 (Task 7.2.1): an
`Investigation`'s own `failed` now has one producer** — the orchestrator's
thrown-tool net, which is why the diagram above gains
`running → failed`. A **`Step`**'s `failed` still has none: the step the
throw happened in is left `running`, deliberately, because naming it is
Story 7.5's along with the sentence beside it. `cancelled` has no producer
in either vocabulary. `awaiting user` has no producer in this epic **at
all** and may never gain one here: nothing in a deterministic pipeline asks
a reader a mid-run question, and that is Epic 10/11's territory. `Finding`
and `Evidence` are real, typed domain objects already (invariant 5:
confidence and provenance are part of the model, not prose) but this
story's one step produces neither — Story 7.3 is where a tool's result
becomes a rendered finding.

**The analytical-tool contract is one shared shape, checked by type rather
than by convention**: `AnalyticalTool<Input, Output>`, a closed
`ok`/`refused` outcome union, never a thrown error for an honest absence.
`get_security_snapshot` is the one tool built against it — see §2.

**Amended 2026-11-19 (Task 7.2.4): the outcome union is `ok`/`refused`/
`inapplicable`, and the sentence above is otherwise unchanged.** The
load-bearing half is _never a thrown error for an honest absence_, which is
still true — nothing was added that a tool can throw. What changed is the
arity: `inapplicable` is _the question does not arise_, a third claim this
product had already decided differs in shape (`packages/shared/src/
excess-move.ts` chose that word over four others in Story 5.6, because a
reader told _unavailable_ reasonably waits and no backfill will ever give a
broad-market fund a sector). Its field is **`because`, not `reason`**,
deliberately, so a handler that reads one off the other does not compile;
there is no second `applies: false` discriminant, because `kind` already
discriminates. The frontend's own duplicated wire shape has a closed `kind`
whitelist that silently drops an unhandled member — one invariant
(`the-tool-outcome-decoder-branches-on-every-kind`) and one `pnpm break`
hold that, since an outcome it cannot read is dropped on the floor with every
test green. No new ADR: ADR 0050 never stated this union's arity.
**Reversal trigger**: the first tool whose `inapplicable` arm needs to carry
a payload rather than a bare word from a closed vocabulary.

## 2. The one tool, and the refusal it draws from the universe rather than the store

`get_security_snapshot` wraps `current-market-state.ts`'s own `read(symbol)`
and computes nothing that function does not already carry: price, volume,
OHLC, and the same `source`/`ageMs` provenance a human reading
`/securities` would see. It reports **no `change` figure** — the original
story draft's own first contradiction, caught at Gate 1 (`STORY.md`'s own
settled-decisions list), because a change needs a second data source (the
stored prior close) and an ADR 0045 cross-tape ruling this story does not
need to take.

**Two refusals, and they are genuinely different questions.** `not-tracked`
is a universe-membership question, decided before `current-market-state.ts`
is consulted at all — `Investigate` is offered for an `untracked` security
(`PSKY`, `WBD`) exactly as for a merely-unobserved one, because refusing the
control for an untracked security would hide a real, correct product answer
behind a silence. `nothing-observed` is what the observation object itself
says about a security it does know, once asked.

**Invariant 1 is structural here, not a sentence.** `SecuritySnapshot`
carries a private, module-local brand symbol (`composite-score.ts`'s own
mint-site pattern) — the only way to produce one is through this tool's
own `run`, so a figure a caller could otherwise assemble from a literal is
not constructible at all. The event payload reaching the wire is
serialised from the tool's own return value by `toWireInvestigationEvent`
and nothing the orchestrator composes — `an-investigation-event-is-minted-
by-its-serialiser` (§6 below) is the mechanical half of that claim.

## 3. The orchestrator and the three decisions in ADR 0050

The provider is a scripted, deterministic implementation of
`runInvestigation`/`streamEvents(id, fromSeq)`/`cancel(id)` — one
long-lived instance addressed by investigation id, diverging from
`PRODUCT_SPEC.md` §32's own parameterless pseudocode, confirmed necessary
rather than assumed because Story 7.6's own list region already commits
this product to more than one concurrent investigation.
[ADR 0050](../../docs/adr/0050-the-agent-provider-is-keyed-by-investigation-id-the-sse-transport-decisions-and-the-domain-type-split.md)
carries this decision in full, plus the SSE transport decisions (`fetch` +
`ReadableStream`, never `EventSource`; monotonic `seq` with replay from
`fromSeq`; ~~no keepalive yet, because nothing in this story holds a stream
open long enough to need one~~ — **false since 2026-11-18: that decision's
own trigger fired at Story 7.2 and the keepalive shipped, §9**) and the
domain-type split (wire shapes in
`packages/shared`; the provider/tool contracts backend-only, never leaking
to the frontend's type graph — invariant 7).

**`cancel(id)` is a documented no-op** — it does not move an
investigation's status, because nothing in this story's own scripted
pipeline runs long enough to need cancelling mid-flight. Story 7.5 is
where it does something.

**The in-memory investigation map is bounded at 200 entries**, evicting
the oldest **settled** investigation first, never one still running —
the same bound every other in-memory structure in this product states.
**Corrected 2026-11-18 (Task 7.2.1): this said _completed_, and so did the
predicate.** The rule was always "never evict a running one"; spelling the
positive case was the same set only while `completed` was the only status a
run could reach, and a `failed` entry the cap could never reclaim is
exactly the stuck state the thrown-tool net exists to close, one layer
down.
Nothing is written to a database; a backend restart loses every
investigation. Epic 12 is the named owner of real persistence.

## 4. Two real defects `reply.hijack()` introduced, both found and fixed in this story

`GET /investigations/:id/events` is this product's first SSE route and the
first to call `reply.hijack()` at all, which takes a reply out of
Fastify's entire pipeline — nothing downstream of the handler runs for it,
including every `onRoute`-attached hook. Two things that pipeline would
otherwise have done for free had to be written back by hand:

- **The correlation-id header.** `server.ts`'s own `onRequest` hook sets it
  on the _managed_ reply, which a hijacked response never flushes.
- **CORS.** `@fastify/cors` attaches through the identical `onRoute`
  mechanism, and this was found by a real browser's `fetch()` to the
  events route failing outright (`TypeError: Failed to fetch`) while
  `curl` against the identical request returned a clean `200` — CORS is
  enforced by the browser alone, so nothing short of an actual browser
  could have caught this, and `app.inject()` could not have either
  (`CLAUDE.md`'s own "what a test must not assert" list already names a
  CORS rejection through `app.inject()` for exactly this reason).

Both are fixed by writing the missing headers directly onto `reply.raw`,
asserted in `routes/investigations.test.ts` rather than relied on through
either plugin. ADR 0050 §2 carries the fuller account and generalises the
lesson: any later route this product hijacks inherits the identical gap.

## 5. A keyboard-focus defect found by this story's own open PR, and the placement it reversed

Task 7.1.4's first-choice placement for the `Investigate` control was
measured and set aside for a narrower reason than the one that mattered:
adding the control to `Panel`'s own `meta` slot grows the region's header
47 → 53 px, against the body-row alternative's 595 → 635 px for the whole
panel — a 6 px cost chosen against as "awkward" versus a 40 px cost taken
instead. The 40 px version shipped, until PR #691's own CI — not a human,
not a design review — found that the grown panel (637 px measured) exceeds
the 605 px available between the sticky masthead and the sticky status bar
at 390×780, landing the region's own ADR-0039 tab stop with its top edge
behind the header on an ordinary keyboard walk
(`search-keyboard.spec.ts`'s "no tab stop lands under the chrome" check).
The same growth independently pushed `security-price-chart.spec.ts`'s
two-plot gap past its own existing ceiling.

**Re-sited into `meta` at this task's own close**, which fully repairs
both: 601 px at 390, inside budget, with room to spare. The lesson worth
keeping for any later task weighing two placements by a Gate-1 fallback
rule: **a header-height aesthetic question and a real keyboard-accessibility
budget are not the same cost, and the smaller number on the first axis can
still be the right answer once the second one is measured.**

## 6. The sweep's own mechanical additions

Three claims that were prose in this story's own `STORY.md` are now
`pnpm invariants` entries, each with a `pnpm break` proving it catches the
defect it names:

- **`one-home-for-the-investigation-stream`** — one frontend module opens
  the SSE connection and knows its path; the plant is a second reader
  inside the consuming hook.
- **`an-investigation-event-is-minted-by-its-serialiser`** — every frame
  this route writes onto the wire is `toWireInvestigationEvent`'s own
  return value; the plant is a second, hand-assembled debug frame beside
  the real one.
- **`a-tool-reads-no-clock`** — no tool implementation calls `Date.now()`
  or a zero-argument `new Date()`; the plant is an inline staleness figure
  inside the one tool that exists. This is invariant 4's own rule
  (temporal isolation in the data/tool layer, not the prompt), made
  structural a tool before Epic 13's replay ever needs it to be.

`pnpm invariants` now holds **89**.

## 7. The measured figures

**AC 8 — <500 ms visible feedback, measured two ways, for the first time.**
A paint-anchored browser instrument (`requestAnimationFrame`-polled, never
this repository's frame-cost method, which answers a different question)
drove 20 presses of `Investigate` against the real dev backend on
`/securities/NVDA`:

```text
press → first paint of the queued row:            p50 8.6 ms   p95 21.5 ms   max 26.3 ms
press → stream's first confirmed event rendered:   p50 52.8 ms  p95 57.5 ms   max 59.6 ms
```

Both sit roughly an order of magnitude under the target's 250 ms midpoint,
let alone its 500 ms ceiling. **It is a loopback figure** — server and
browser on one machine, no network, the same caveat `PRODUCT_SPEC.md` §28's
market-updates figure already carries — and it is real rather than
furnished: this story's real tool against the real `current-market-state.ts`,
not a fixture. No deployed or real-network re-take exists yet.
`PRODUCT_SPEC.md` §28 carries the dated amendment.

**AC 7 — the same two figures re-taken against the SIX-step pipeline, 2026-11-20
(Task 7.2.7).** Same method, 20 presses each after a reload, 1440×900:

```text
press → all six rows painted:                     p50 13.5 ms  p95 15.7 ms  max 15.9 ms  min 11.1 ms
press → five rows rendered complete:              p50 32.0 ms  p95 39.4 ms  max 42.1 ms  min 25.1 ms
each step's own wire durationMs:                  0–1 ms
```

**Three things in that are more interesting than the quantiles.** The first
paint is now a **six-row** paint rather than a one-row paint, which is the whole
of 8.6 → 13.5 ms. The five completions land in **one `requestAnimationFrame`
tick** — the per-k quantiles for 1, 2, 3, 4 and 5 completed rows are
**identical**, so this is the whole run arriving inside a single frame rather
than five separable arrivals, and a six-step pipeline is therefore not five
times a one-step one in any observable way. And the figure is **five steps, not
six**: the machine had no database reachable, so `calculate_rolling_correlation`
threw and the run ended `failed` — this is a floor (_how fast can five
in-memory tools answer_), the step that reads `market_bars` is absent from it,
and `docs/GAPS.md` carries that as a named §28 breach candidate with its own
owner. Still loopback, still one laptop.

## 8. What no gated machine and no person has ever seen

**CI's store is 516 securities and zero bars**, so `get_security_snapshot`
answers `nothing-observed` for every tracked security on every gated run,
permanently — the `ok` outcome, a completed step with a real duration, has
never been drawn by CI. The e2e suite's own `security-investigate.spec.ts`
runs against a developer's real, populated store for exactly this reason,
the same split `CLAUDE.md` already states for every chart on the security
page.

**Widened 2026-11-20 (Task 7.2.7): it is now four steps that can never draw
a figure on a gated machine, one that can never draw one anywhere, and one
`ok` whose every count is zero.** CI's store makes the price, peer and
correlation steps refuse permanently (a process-memory trailing window with no
socket, and two reads over a store with no bars); `calculate_volume_ratio`
refuses on **every** machine that exists, by design; and
`get_market_breadth` answers **`ok`** — a real aggregate, with every count
zero and no `observedAt`, because a browser attaching makes the gateway
compute a pass over a market nothing has been heard from. It is the only `ok`
any gated machine has ever produced in this pipeline. `docs/GAPS.md` carries
the step-by-step table and the re-measure.

**No person has watched this feature work against a real, deployed
backend.** Every figure in §7 and every manual verification this story
records was taken on one developer's own machine. `LIVE-REHEARSAL.md`
does not yet carry a row for this epic — Story 7.7 (the rehearsal, the
sweep and the epic close) is the named owner of opening that ledger, the
same way Epic 3's own `LIVE-REHEARSAL.md` was opened at that epic's first
story and carried forward.

## 9. What is open, with a named owner rather than a story number

- ~~**The keepalive.** No SSE keepalive has been written. The first
  investigation run held open across more than one step is the condition
  under which it becomes owed — ADR 0050's own reversal trigger,
  `HOSTING.md`'s dated amendment.~~ — **closed 2026-11-18 by Story 7.2
  (Task 7.2.1), and its condition fired one story after it was written
  rather than at the Story 7.5 the two documents beside it guessed.**
  `scripted-agent-provider.ts` mints every `QueuedStep` before its loop
  starts, so "a run held open across more than one step" is true on the
  very first press of a five-tool pipeline, on every machine, however fast
  the tools are. What ships is an SSE comment line written on an interval
  and cleared in the same `finally` that ends the stream, at
  `SSE_KEEPALIVE_INTERVAL_MS = 240_000 / 3` (**80 s**, **3× inside** the
  ingress ceiling), spelled as the division and **injectable** so a test
  uses a 5 ms period rather than waiting 80 seconds. `app.inject()`'s own
  whole-sequence assertion is unaffected, because the response still ends
  on a terminal event. **What replaces this entry rather than closing with
  it**: the 240 s ceiling is Microsoft's documentation, not a measurement
  of this deployment, and **no stream of ours has been held open for four
  minutes against the real ingress** — so the keepalive is written against
  a figure nobody here has produced. Owner: the same deployed sitting the
  two entries below are owed to.
- **A thrown tool has a terminal event, and nothing more than that.**
  Task 7.2.1 added `INVESTIGATION_FAILED` to `TERMINAL_EVENT_TYPES` and a
  `catch` around the orchestrator's loop, so a throw can no longer leave an
  investigation `running` for ever — which, through `POST
/investigations`' second-press idempotency, permanently disabled
  `Investigate` for that symbol until a backend restart. The event carries
  **no step id, no reason and no thrown message**, and no surface draws
  anything for it: the frontend's decoder answers `unsupported` for the
  type, by construction and by its own existing design. Owner: **Story
  7.5**, which owns the reader-facing sentence and already has
  `FailedStep.reason` typed and waiting for it.
- **A real-network, non-loopback re-take of §7's two figures.** Owner: the
  first story in this epic that reaches a deployed backend, or Story 7.7's
  own sweep if none does first.
- **A person watching this feature against the deployed product.** Owner:
  Story 7.7, the same way every earlier epic's rehearsal opened at that
  epic's close rather than at its first story — here it is named at the
  first story specifically so the ledger exists before six more tools are
  built against the same pipe.
- **The checklist does not fit the region it lives in, at 390 or 768.**
  Added 2026-11-20 by Task 7.2.7, measured rather than argued: the
  `Abnormal-move indicators` panel is **603 px before any press** against a
  **613 px** scroll-padding box at 390×780, so the first row of anything
  overflows it, and with six rows it is **781 px** and its own ADR-0039 tab
  stop lands **88 px behind the masthead**. No row treatment reaches it
  (three progressively tighter ones were measured; the clearance stayed
  negative in all of them), and `search-keyboard.spec.ts`' own predicate
  cannot see it, because it excludes an element at least as tall as the
  viewport — deliberately, and the panel crossed 780 px when the fifth tool
  landed. `docs/GAPS.md` carries the figures, the three candidate answers
  and why none of them is this task's to take. Owner: **the first story
  that adds anything else to this region** — Story 7.3 by intent, with the
  Product Owner owning which answer.
- **What the correlation step costs with rows in it.** Added 2026-11-20 by
  Task 7.2.7. It is the one tool in the pipeline that reads a database, two
  per-security window reads per press, and it has never been timed on any
  machine: §7's own re-take was taken against a backend with no database
  reachable, where that step threw. `docs/GAPS.md` carries it as a named
  §28 breach candidate on the deployed tier, with the condition that
  closes it. Owner: **the first task that presses `Investigate` against a
  store with bars.**

## 10. Story 7.2 — the five-step pipeline, and the three things in it that were not tools

**The story's own subject is `EPIC.md`'s exit criterion verbatim**: the five
analytical tools, wired into the one orchestrator Story 7.1 proved. Each
tool is documented in its own task file (7.2.2–7.2.6) and each wraps
arithmetic this product already had, rather than new arithmetic — except
the correlation step, which is this story's one new computation
(on-demand, `SPY`, derived from `context.asOf` rather than from a
ledger's covered end, so it stays isolated under Epic 13's eventual
replay). `STORY.md`'s "Resolved at Gate 1" section is the decision record
for all of it, including **AC 3's reuse decision at the code level** —
which functions of Story 6.5's nightly correlation pipeline this tool
reuses unchanged, and which two are actively wrong for one pair. That
decision is recorded there and deliberately not restated here.

Three things this story produced are not a tool and outlive it.

**The shared aggregate has one writer and one holder.** The breadth tool
reads the overview aggregate rather than recomputing one, which is ADR
0038's own named trigger — _the first consumer of the aggregate that is
not a browser_ — firing exactly as `EPIC.md` anticipated. The single
producer's latest pass is retained in a small holder beside
`currentMarketState` in `index.ts`, **not** inside `market-gateway.ts`,
whose own rule is that it decides when a browser is told something and
never what is true; the gateway's `lastBroadcastPass` became a read of
that one holder rather than a second memo of the same fact, and the holder
records **every** pass the producer computes rather than only broadcast
ones. Where nothing has been computed — CI with no browser attached, a
cold deploy's first ~46 s — the step completes with its own distinct
refusal (`no-aggregate-yet`) rather than a recomputed join, which is
exactly the call shape Epic 13's replay has to refuse. Two guards hold it:
`one-writer-of-the-latest-overview-pass` and the pre-existing
`one-producer-of-the-overview-aggregate`. ADR 0038 carries the dated
amendment; Task 7.2.5 carries the detail, including that the check's first
draft was red on the desired state and the repair was to name the
holder's method for the check rather than teach the check an exemption.

**The checklist paints every row on press, and one number crosses the wire
by hand to make that possible.** `optimisticChecklist` seeds
`INVESTIGATION_STEP_COUNT` rows in the same commit as the press — Story
7.2's own Gate 1 decision, and `PRODUCT_SPEC.md` §14's own example shape,
which draws the whole checklist at once with some rows complete and some
pending. **A count and not the sentences**: each step's description has one
home, the tool that declares it, and arrives on that step's own
`STEP_STARTED`; what a client cannot learn from the wire in time to paint
the first frame is how many rows there will be. So one number is
duplicated, and `the-checklist-seeds-one-row-per-tool` fails the build when
it disagrees with the number of `toRunnableTool(` calls in
`investigationTools` — with the break `a-seventh-tool-the-checklist-never-paints`
behind it, which plants the defect the NEXT story writes rather than this
one's. A seeded row holds reserved room rather than a guessed sentence,
which is the same treatment the single placeholder row has had since Task
7.1.4.

**Two consequences of six rows that one row hid.** The live region was
keyed on `steps[0]`, which was the only row there was; with six it would
have reported the step that finished FIRST as the run's own outcome, so it
now reads the step the run is actually at — whichever is `running` while it
runs, and the **last completed** step once the investigation is terminal
(the last completed rather than the last row, because a run that ends
early leaves seeded rows holding room and keying on those would answer
with silence where something did happen). And the 160 ms breathing latch
asks whether ANY row is running rather than the first. Both are
`use-investigation.ts`, both have a test, and the second is why an
ordinary six-step run still never breathes: the whole pipeline completes
inside one frame on a loopback machine.

**And a row now publishes its own status as `data-step`.** A checklist row
carries no role and no accessible name — it is three `<p>`s in a flex line
— so with six of them a browser spec had nothing to count and nothing to
scope a per-step assertion to. `security-investigate.spec.ts` asserts the
six rows painted on press (the first-paint claim, which no unit level can
see), each step's duration **inside its own row**, and the rendered order
against the pipeline's; the attribute is read by no stylesheet, because the
glyph is the visible encoding and a second home for that would be two
things to keep in step.

## 11. Story 7.3, Task 7.3.1 — findings reach the wire, and what the claim is NOT

**Every tool in Story 7.2 already produced a value; this is what turns a value
into the object `PRODUCT_SPEC.md` §15/§16 names.** Each completed step now
mints exactly one `Finding` — a `type`, a one-line `claim`, a `confidence`
level and either the `Evidence` that licenses it or the refusal word it
answered with — which travels on a new `FINDING_CREATED` event and lands as a
second line of plain, unstyled text inside the checklist row that produced it.
Nothing is styled and no confidence mark is drawn; that is Task 7.3.2's.

### 11.1 Two arms that differ in SHAPE, and what the brand does not prove

`packages/shared/src/finding.ts` is a new module (not `investigation.ts`,
which already holds three vocabularies, both lifecycles, the event union and
the whole wire projection at ~850 lines). `Finding` is a two-arm union
mirroring `AnomalyScore`/`UnscoredAnomaly` exactly:

- **`EvidencedFinding`** carries `evidence: readonly [Evidence, ...Evidence[]]`,
  so an evidence-less evidenced finding is **untypeable** — AC 2 as a compile
  error rather than a test.
- **`UnevidencedFinding`** has **no `evidence` member at all**, never
  `evidence: []`, and its `confidence` is the **literal** `"UNKNOWN"` rather
  than `Confidence` — so AC 3's _a refused outcome always produces `UNKNOWN`_
  is a type-level statement rather than a convention.

A real `Symbol` brand, not exported, with **exactly two mint sites** held by
`two-mint-sites-for-a-finding` and the break `a-third-mint-site-for-a-finding`.
**No finding carries a `security` field on either arm** — the subject is named
by the route, the identity block and `subjectSymbols`, and Gate 1 settled that
claims omit the investigated ticker — which strengthens AC 8 past its own
wording: a four-arm union discriminated on `type` is not needed, because no
finding anywhere has one to omit. `Evidence.security?` is the single
per-security home, absent for breadth.

**The one place the `composite-score.ts` analogy breaks, stated plainly in the
module's own header**: there is **no `readFinding`** and there must not be
one. The brand dies at `JSON.parse` and is never restored, because the browser
declares its own wire shape and reads three fields off it (`stepId`, `claim`,
`confidence`) rather than reconstituting a domain object. So **AC 2's
guarantee is a backend guarantee**. What keeps it honest across the wire is
not a type but the frame: the evidence travels **inline** on the same event.

### 11.2 Confidence is a stated function of counted evidence, and `POSSIBLE` has only TWO real producers

`refused` → `UNKNOWN`, always. `inapplicable` → **no finding at all** (AC 3's
one exception, and the reason the tool contract's `mintFinding` may answer
`undefined`): _the question does not arise_ is a different, permanent fact
from _not enough evidence_. ~~so the row draws the inapplicability sentence
Story 7.2 already ships~~ — **false, corrected 2026-11-24 by Task 7.3.5.**
Story 7.2 never shipped any such sentence — its own Task 7.2.4 explicitly
deferred it, in as many words, to "the first surface that draws a step's
own outcome." This sentence was WRONG for the whole of Task 7.3.1–7.3.4's
own record, undetected by any of their own unit tests (each asserted
`claim === undefined` for `inapplicable`, consistent with "nothing shown"
and never checking for a sentence), and found only by Phase 3's own
integrated check against `STORY.md`'s AC 3. §12.5 carries the real fix.
`ok` below the tool's own **shipped** sufficiency
floor → `POSSIBLE`; above it → `SUPPORTED`. `CONFIRMED` has no producer
anywhere in this epic and is reserved for Epic 9's filings, documented exactly
as `INVESTIGATION_STATUSES`' `awaiting_user` already is.

**`POSSIBLE` is reachable in only two of six tools, and no second floor was
invented to fill the other four.** `get_market_breadth` at `measured === 0`
(CI's permanent state, so the only arm a gated machine will ever draw there)
and `calculate_rolling_correlation` at `significant === false`. The other four
have floors already enforced **upstream as refusals** — `comparableBaseline`'s
derived `n ≥ 2500`, `comparableExcessBaseline`'s, `CORRELATION_MINIMUM_OVERLAP`
— so their `ok` is above the floor by construction, and a `POSSIBLE` there
would need a threshold nobody derived sitting beside a refusal threshold
somebody did. `get_security_snapshot` has no floor at all and is deliberately
**not keyed on `ageMs`**: staleness has one home, the status bar's connection
word, and a confidence level falling at some age would be a second, quieter
one.

### 11.3 The claim's voice, and the formatters that had to move

One clause, past tense, no terminal stop, the figure **and its denominator**,
no verdict adjective, no investigated ticker — and bounded by `CLAIM_CEILING`,
72 characters, enforced in each tool's own unit tests rather than thrown at
the mint (the mint is reached from inside the orchestrator's `try`, where a
`RangeError` would kill a whole run because a refusal sentence was one
character too long). The six shipped claims, as their own suites assert them:

```text
Traded at 184.52 on 12,480 shares in the latest bar
+0.50% over 5 min — 50th of 2,500
Volume rate — no stored distribution to rank against
+0.50 pts against XLK over 5 min — 50th of 2,500
2 up, 2 down, 1 flat of 5 measured in the last 5 min
Positive co-movement with SPY — 48 anchors, 60 sessions
```

**Every figure goes through a shipped formatter, and getting that true meant
moving five functions into `packages/shared`** — Story 7.3's Gate 1 blocker
B1. `percentileOrdinal`/`ordinalSuffix` into `percentile-ranking.ts` (already
the declared home of the ordinal's own comparator), and `formatPrice`,
`formatChangePercent` and `formatSignedCount` into a new
`packages/shared/src/price-format.ts`, with
`apps/frontend/src/market/price-format.ts` and `return-percentile.ts` left as
re-exports so **no frontend call site moved**. Two new ones were added beside
them: `formatSignedPoints` (a difference between two percentages is not a
percentage) and `formatCount`.

**The test that decided each move is per-string: does the backend print it
VERBATIM.** Three did. What failed it stayed where it was and got its own
short grammar in `finding-claim.ts` instead — the breadth region's own footer
is a multi-clause sentence over a counted population and a claim is one line
under 72 characters, so relocating that file would have moved a sentence
neither surface could use. The sharpest case is `no-distribution`: the
composite ledger draws `no history to rank it` in a ~34-character cell and
`tool-volume-ratio.ts`'s header says in terms that the honest sentence has one
home and it is not in the backend. **That still stands** — the claim's
`no stored distribution to rank against` is a different grammar for the same
fact, and the extra word is the point, because the absence is about this
product's stored aggregates rather than this security's coverage.

**Two sibling claims had to be repointed in the same change rather than
silently left standing**, which is this repository's own rule about a
falsified document. `one-home-for-the-ordinal-suffix` named the frontend file
as the home and its own docblock said _a backend that formats an ordinal is a
different defect with a different owner_ — that sentence went false the day
this shipped, and is struck with its reason rather than deleted. And
`tool-return-percentile.ts`'s and `tool-compare-securities.ts`' _nothing is
derived and nothing is formatted — all the browser's_ is narrowed to name the
**wire projection** it is still true of.

**One claim deliberately does NOT draw the figure its tool is named for.**
`calculate_volume_ratio`'s unreachable `ok` arm states the ordinal rather than
the `×` multiple, because the multiple glyph has one home
(`one-home-for-the-multiple-glyph`, five channels decided together) and moving
`formatMultiple` into `packages/shared` for an arm **no store can reach**
would be infrastructure built before the iteration that needs it. The
condition for moving it is stated beside the arm.

### 11.4 The tool contract gained a THUNK, which is a real structural change

`RunnableTool.run` now answers `ToolRun` — the wire outcome plus
`mintFinding: (stamp: FindingStamp) => Finding | undefined` — and
`toRunnableTool` takes a fourth argument. Unlike Story 7.2's additions, which
only ever widened an existing union, this is a contract change, and the thunk
rather than a `finding` field is forced by two facts at once:
`Evidence.retrievedAt` **does not exist** when `run` returns (the orchestrator
stamps it from its own injected clock at the moment it emits, which is after
`completedAt` is known), and a claim must be derived from the tool's **typed
`Output`** before `analytical-tool.ts`'s deliberate erasure to `JsonValue`.
`a-tool-takes-no-channel-to-another-step` is unaffected (it captures `run`'s
parameter list, untouched) and so is `a-tool-reads-no-clock` (a `toFinding`
takes `retrievedAt` off the stamp and constructs no `Date` of its own).

### 11.5 The wire, and the ordering decision §33 could not keep

`FINDING_CREATED` is appended **after** that step's `TOOL_CALL_COMPLETED` and
**before** its `STEP_COMPLETED`, so a reader's row learns what was measured in
the same frame it learns the step finished. It carries **no top-level
`stepId`** unlike every sibling event: `Finding.stepId` is the one home for
that fact and a second copy on the envelope would be a second answer to one
question. `EVIDENCE_ADDED` is **not** given a payload — §33's literal order
cannot coexist with AC 2, and `PRODUCT_SPEC.md` §33 carries the dated
amendment rather than a rewrite.

### 11.6 A real, pre-existing defect found by shaping a check (B2)

**`INVESTIGATION_FAILED` has had a backend serialiser case since Task 7.2.1
(2026-11-18) and no frontend decoder case at all.** So a thrown tool decoded
as `unsupported`, `use-investigation.ts` dropped it without a word, the stream
then ended with no terminal event the reducer had seen, and
`withConnectionLost` drew the **dropped-connection** sentence over a run that
had actually failed — five days, with every test green, because no fixture
furnishes an event type the decoder does not know and `tsc -b` cannot see
across a deliberately duplicated wire shape.

It was found by shaping AC 13's new invariant, which **was red on `main`
before a line of this story existed** — verified by removing the new case and
re-running: `1 serialised event type(s) have no case in
readInvestigationEvent: INVESTIGATION_FAILED`. The repair is a decoder case
and a reducer arm marking the run `terminal`, with **no new reader-facing
sentence**: that degradation UI is Story 7.5's stated scope, and that story's
own `STORY.md` carries it as a constraint it inherits.

### 11.7 The two new checks, and the naive draft that passed wrongly

`pnpm invariants` now holds **95**.

- **`two-mint-sites-for-a-finding`**, with
  `pnpm break a-third-mint-site-for-a-finding`. The naive draft — count
  declarations of the two mints, assert one of each in the home — was run
  against the real plant (a seventh tool casting a record into `Finding`) and
  reported `NAIVE DRAFT GREEN — both mints are declared once, in
packages/shared/src/finding.ts.` at exit 0, with the third mint site on
  disk. The shipped check keys on the **assertion** instead and went red on
  the same plant naming the file and the line.
- **`every-serialised-event-type-has-a-decoder-case`**, with
  `pnpm break an-event-type-the-decoder-never-learnt`. A **sibling** of
  `the-tool-outcome-decoder-branches-on-every-kind` rather than a widening:
  an unhandled outcome _kind_ makes a whole event `unreadable`, while an
  unhandled event _type_ is `unsupported` — the arm written for a frame from
  a type this bundle predates, so **the drop looks correct**. Anchored on the
  serialiser's own switch and never on `INVESTIGATION_EVENT_TYPES`, which
  legitimately holds payload-free names a decoder correctly has no case for.

### 11.8 What is owed, and what no machine has seen

**AC 6's ceiling is NOT the probe measurement that criterion asks for.** 72 is
the longest claim the six shipped producers can mint, asserted in each tool's
own suite; the figure AC 6 wants comes from `pnpm probe` against a **zero-bar
store** at all four widths, and the surface that can be probed is Task 7.3.2's
real two-line grid rather than this task's deliberately unstyled `<p>`. The
reversal condition is stated at the constant. `docs/GAPS.md` carries it.

**No database was reachable on the machine this task was built on**, so
`pnpm test:database` and the browser suite were not run — which also means the
`calculate_rolling_correlation` claim, the only one of the six whose tool reads
`market_bars`, has never been produced by anything but its own furnished unit
suite. And on CI's zero-bar store **five of the six rows draw a refusal
claim**, which makes the refusal grammar the shipped product for every gated
run and the measured claims the thing only a real deployment will show.

## 12. Story 7.3, Tasks 7.3.2–7.3.4 — the confidence mark, the second press, and the close

### 12.1 The confidence mark: no filled chip, zero colour, nothing shared with `AnomalyBadge`

`ConfidenceMark` (Task 7.3.2) draws a confidence level as `microLabel` text
beside a 12px leading rule whose **stroke style** carries the level —
solid 2px `CONFIRMED`, solid 1px `SUPPORTED`, dashed `POSSIBLE`, dotted
`UNKNOWN` — reusing this product's own existing "dashed means we don't
know" vocabulary (the chart's coverage edge, this checklist's own queued
glyph) rather than inventing a fifth meaning for a shape. **No background,
no border box, no `min-width`, and zero colour tokens spent**: designer and
ux-architect converged independently on this shape at Story 7.3's Gate 1,
because `AnomalyBadge` sits roughly 12px below this checklist on the same
screen (`SecurityExplorer.tsx` renders `InvestigationChecklist` then
`AbnormalMove` as direct siblings) and a second filled chip in the same
screen's second colour-spending position would read as a second risk
meter. Two `pnpm invariants` entries hold the separation mechanically —
`confidence-and-band-never-share-a-component` (no import or `composes:`
crossing between the two in either direction) and
`the-confidence-mark-spends-no-fill-and-no-colour` (no `background`, no
`min-width`, no read of the anomaly ramp) — each with a `pnpm break`.

The accessible string is the **long form**, `Confidence: SUPPORTED`, via a
visually-hidden prefix and the one visible word: the two marks sit close
enough on screen that a bare level name is ambiguous between _how unusual_
(the band) and _how well evidenced_ (the confidence level), which is
exactly the collision invariant 5 and `ANOMALY.md` both warn against under
a different name.

### 12.2 Second-press persistence: a `stale` flag, mirroring `bar-series-view.ts`'s own idiom

Before Task 7.3.3, pressing `Investigate` a second time reset every row to
`optimisticChecklist`'s blank placeholder — correct for a first press, and
exactly the case ADR 0028 forbids by name the moment a row carries a real
finding rather than a never-yet-answered one. `resetForNewRun` now carries
a `claim`/`confidence` forward, marked `stale: true`, through the row's own
queued and running states — `STEP_STARTED`'s reducer case changed from
rebuilding the row from scratch to spreading the existing one, which is
the one change that lets the stale claim survive a run's own first event
— until that row's own `FINDING_CREATED` or `STEP_COMPLETED` replaces it.
`ConfidenceMark`'s own `stale` prop and the claim paragraph's `.claimStale`
class dim the ink to `--ink-disabled` through one CSS declaration on each
(the rule's border is `currentColor` and neither sibling sets its own
colour, so one override dims the whole mark via inheritance).

**A real edge case found and fixed in the same change**: a row carrying a
stale claim forward whose outcome THIS run is `inapplicable` — no
`FINDING_CREATED` ever arrives for it — would otherwise keep showing the
PREVIOUS run's claim as current. `STEP_COMPLETED` now checks whether
`stale` is still `true` at completion (which it only is if
`FINDING_CREATED` never fired this run, since that event always precedes
`STEP_COMPLETED` and clears the flag itself) and drops the claim in that
one case, caught by a dedicated unit test before it could reach a browser.

### 12.3 The live region: a confidence-count summary, not a transcript

`liveRegionText`'s terminal branch spoke only the LAST-completed step's
own sentence — one of six findings in a run that typically completes in
single-digit milliseconds a step. It now speaks a count by confidence
level, in `CONFIDENCE_LEVELS` order (`CONFIRMED` silently absent, no
producer in this epic): `4 findings supported, 2 unknown`, or
`Investigation complete — no findings produced` where every step was
`inapplicable`. The pre-terminal running-step announcement is unchanged.

### 12.4 The checklist is a `<ul>`/`<li>`

The checklist's markup moved from a `<div>` of `<div>`s to a `<ul>` of
`<li>`s — no visual change (`.checklist` resets the list's own default
marker, margin and padding) — so a browse-mode screen reader can reach
each step's description, claim and confidence together as one of six
reachable items rather than as an undifferentiated run of paragraphs.

### 12.5 A real gap found by Phase 3's own integrated check, and fixed the same day: `inapplicable` drew nothing

**Task 7.3.5, 2026-11-24.** Gate 1's own settled decision for AC 3 was "the
row draws the inapplicability's own sentence with no confidence mark at
all" — and the shipped product, for the whole of Tasks 7.3.1 through 7.3.4,
drew a bare completed tick with **nothing** beside it. §11.2's own account
had asserted this sentence "Story 7.2 already ships," which was simply
false: Story 7.2's own Task 7.2.4 explicitly deferred it by name to "the
first surface that draws a step's own outcome," and nothing in any of this
story's own four tasks' unit tests caught the gap, because every one of
them asserted `claim === undefined` for the `inapplicable` case — true
either way, whether the row shows nothing or shows a sentence with no
confidence mark (confidence stays absent in both).

**Found only by Phase 3's own integrated verification** — re-reading
`STORY.md`'s thirteen acceptance criteria against the merged codebase, one
by one, rather than trusting each task's own closing record. The fix: a
new `TOOL_INAPPLICABILITY_CLAIMS` in `packages/shared/src/finding-claim.ts`
(a total record over `ToolInapplicability`, mirroring `TOOL_REFUSAL_CLAIMS`'
own shape exactly) and `inapplicableClaim`, wired into
`investigation-checklist-state.ts`'s `TOOL_CALL_COMPLETED` case — the one
reducer arm that had been a no-op for every outcome kind since Task 7.3.1's
own "corrected" comment there. `compare_securities` on `XLK` now draws
`Sector comparison — it is the sector benchmark itself`, with zero
`ConfidenceMark`.

**A second real bug, found by this task's own test rather than a person
looking at a screen**: the first draft set the new claim but did not
explicitly clear `confidence`, so a second-press row carrying a stale, real
confidence level forward (§12.2's own `stale` mechanism) kept that
confidence sitting beside the new inapplicability sentence — fixed by an
explicit `confidence: undefined` rather than relying on the object spread.

### 12.6 What is owed, and what no screen reader has heard

**AC 5b — the confidence mark and the band chip, together, in greyscale —
could not be taken as the criterion asks.** Two compounding reasons: no
database was reachable on the machine this task was built on, so
`AnomalyBadge` never drew a real band at all (CI's and this developer's own
zero-bar store renders only the honest `0 of 3 factors` absence, which
draws no chip); and no screen in this product yet puts the two in **one
row** together — today they are vertically stacked siblings
(`InvestigationChecklist` then `AbnormalMove`), and the literal one-row
arrangement AC 5b's own wording describes is Epic 8's evidence panel,
unbuilt. What was checked instead, from the two components' own
stylesheets rather than a photograph: every `AnomalyBadge` state draws a
fixed-`min-width` rectangular box (filled for `elevated`/`high`/`extreme`,
bordered for `normal`), and `ConfidenceMark` draws neither a box nor a
border nor a `min-width` at all — a shape difference enforced by
`the-confidence-mark-spends-no-fill-and-no-colour`, independent of hue,
but **reasoned from the stylesheets rather than confirmed by a human
looking at a rendered screen**, which is what AC 5b actually asks for.
`docs/GAPS.md` carries the owed re-measure, owned by Epic 8.

**Neither of Task 7.3.3's two repairs — the confidence-count summary, the
`<ul>`/`<li>` restructuring — nor the stale-claim dimming has been heard
or navigated by a real screen reader.** This product has never taken a
real browse-mode pass against any region; `docs/GAPS.md`'s standing
screen-reader item gains its twelfth entry here.

**What Story 7.3 leaves reachable, stated plainly**: a real `Finding` per
step, drawn as a one-line claim with its confidence level, on every
completed row, surviving a second press rather than being blanked by one.
**What it does not reach**: `Evidence` itself (the record licensing an
evidenced finding) is not rendered anywhere, rejecting a finding and
asking a follow-up both need a model this epic does not run, and nothing
here has been confirmed against a real screen reader or a real deployment.

## 13. Story 7.4, Task 7.4.3 — what ends a highlight, and the one place the ACs disagree with themselves

Task 7.4.2 made invariant 2's one command **arrive**. This task is what makes
it **end**, which is AC 8 — and it is the first thing in this epic whose whole
subject is a lifetime rather than a figure.

### 13.1 The holder learned an id, and the id is load-bearing rather than tidy

`WorkspaceHighlightCommand` gained `investigationId` and moved into its own
module (`apps/frontend/src/investigations/workspace-highlight.ts`) beside the
two functions that decide what `App`'s holder becomes. The id is a plain
`string`, not `InvestigationId` — this directory's standing rule for a fact
that arrived over a wire, and `CLAUDE.md`'s own note that that brand is
deliberately forgeable, so importing it would buy a claim this layer cannot
make.

**The reachable case it exists for**, which position alone cannot answer: a run
on `NVDA` places a command; the reader navigates to another security, which
unmounts the hook and deliberately leaves the command standing (Story 7.4's AC
7 — navigating is how a reader reaches the screen that draws it); the reader
starts a second run whose stream dies before placing anything. That second
run's withdrawal must leave `NVDA`'s highlight exactly where it is.
`applyWorkspaceHighlight` is three lines and `workspace-highlight.test.ts`
proves both directions.

**Supersession needs no id comparison at all** and does not have one: a
`commanded` arm replaces the holder wholesale, because order is the producer's
(`useInvestigation`'s `runIdRef` guard drops a superseded run's events before
they reach the value) and because a merge is the one state AC 8 forbids — the
note names one subject and counts one set, so a union of two investigations'
peers would be a picture nothing on screen could explain.

### 13.2 The hook answers a two-arm STATE, not a command

`useInvestigation().highlight` is now `{ kind: "commanded", command }` or
`{ kind: "withdrawn", investigationId }`, reported upward through the same
single callback `SecurityExplorer` already had. Two fields would have been two
things a route must remember to report, and the one that gets forgotten is
always the clearing — which is this task's entire subject.

`undefined` still means _this hook has nothing to say_ and must never be read
as _clear what you are holding_: the route's reporting effect keeps its guard,
and its deliberate absence of a cleanup is unchanged.

### 13.3 A reader's gesture, and the half of it that is about the HOLDER

`Escape` and a click on empty canvas — Story 6.4's own gestures, verbatim.
`TOPOLOGY.md` §11.1 carries the renderer and component mechanics (the widened
_not ours to swallow_ guard, why the renderer reports rather than clears, why
a click on a node does not clear, and the one clearing path both callers go
through).

What belongs here is the reason the report travels all the way to `App`: the
region clears its own ink and words immediately, so the gesture works with
nobody listening — but `MarketOverview`'s effect re-applies the holder's value
whenever it changes, so a holder still holding a dismissed command puts the
highlight **back** on that route's next re-render. That is this repository's
own named trap (_a claim about a mechanism reads identically whether the
mechanism is there or not_), and the only instrument that can see it is a real
browser leaving `/` and coming back, which
`overview-investigation-highlight.spec.ts` now does.

**A reload clears it with nothing written for the purpose** — ordinary React
state in a module nothing persists — which is Story 7.4's out-of-scope line
(_persisting a highlight past the investigation's own session_) holding
structurally rather than by a rule anybody keeps.

### 13.4 A dead channel withdraws it; a finished run does not — and that is where AC 8 contradicts itself

`highlightOutlivesChannelEnd(lastEventType)` is the whole decision, in one
expression, reading `isTerminalEventType` rather than any list of names (so
Story 7.5's cancellation is covered with no change). The stream's **last
word** tells the two endings apart, because a terminal event is always last —
the SSE route ends the response after it:

- **The run finished** → the highlight survives. A finished run is the most
  settled state its claim can have, and ADR 0029's false-impression rule is
  not engaged by backing that is known and complete.
- **Unaccounted for** — the stream threw, or ended with no terminal event →
  withdrawn, at the stream's own end, with no timer and no threshold: the same
  instant the checklist starts saying _investigation state unknown_, which is
  the earliest moment this browser knows anything.

**`STORY.md`'s AC 8 asks for the opposite of the first of those, and its own
Gate 1 record asks for exactly what shipped.** The measurement decides which
is reachable: at Story 7.2's p50 of 32.0 ms, with the command emitted after
step 4 of 6, clearing on a terminal event makes the highlight unobservable
everywhere and turns this story's own merged headline journey red.
`docs/GAPS.md` carries it with the figures and an owner — the Product Owner, at
Story 7.4's close, as a one-line decision.

### 13.5 The two new mechanical guards, and what no person has seen

`pnpm invariants` holds **102**. `the-topology-walk-reads-no-highlight` keeps
the keyboard walk blind to the drawn set (`TOPOLOGY.md` §11.1 for why it is a
sibling of the band check rather than a widening of it), and
`a-highlight-command-is-minted-only-where-the-wire-is-decoded` is the frontend
sibling of Task 7.4.1's backend mint check: `WorkspaceHighlightCommand` has no
brand (correctly — ADR 0051 Decision 1), so a surface can hand-build a peer
set nobody measured and nothing permitted, and the drawn result is
indistinguishable from the honest one. Both have a `pnpm break`, and both
plants were confirmed to **compile and pass every test** before the check was
written — `tsc -b` clean and all 24 `walk.test.ts` assertions green on the
sorted-by-highlight plant, `pnpm typecheck` clean on the hand-minted command.

**What no person has seen**: nobody has watched a highlight clear on a
deployed backend, or at 390 on a real phone. `LIVE-REHEARSAL.md` still carries
no row for this epic, owed by Story 7.7.

## 14. Story 7.4, Phase 3 — four defects a person found by looking, three fixed and one recorded

**Written 2026-11-27**, after all four tasks had merged. Every one of these was
found by reading the real route or pressing a real control, and **nothing
mechanical could see any of them**: three were about words in one sentence and
the fourth is about a silence.

**Fix 1 — two de-emphases shared one verb phrase, and the pair read as a
contradiction.** At `/?sector=energy` with `NVDA` highlighted, the accessible
sentence said _…their benchmark ETFs and the broad market remain, **drawn
quieter**._ (Story 6.8's landmark treatment, true) and then _…so **nothing is
drawn quieter**._ (Story 7.4's complement de-emphasis, also true) — two claims
about disjoint populations, one verb phrase, and a flat self-contradiction to
the one reader who cannot check it against the picture. The highlight's
de-emphasis is now **_set back_** everywhere and the filter's stays _drawn
quieter_; `topology/filter.ts` and `topology/highlight.ts` each carry the rule
beside the string, and `filter.test.ts` asserts the **distinctness** rather than
two expected sentences, because a table of strings stays green the day somebody
re-words one back into the other.

**Fix 2 — the pronoun arrived before its antecedent.** The filter's own third
clause (Task 7.4.4) is _about_ the highlight — _None of the **highlighted**
securities are inside this filter_ — and `trailingClausesOf` composed it
**before** the clause that says anything is highlighted. The spoken order is now
structure → highlight → narrowing → measured edges, unconditionally (a
composition whose order depends on which clauses are present is four orderings
to keep straight), and the drawn `.notes` stack was swapped in the same change
so the two agree: the highlight note is the first row of that column and the
filter note the second. Asserted as two **indices into one real string** at the
component level and in `overview-investigation-highlight.spec.ts`, never as an
expected sentence.

**Fix 3 — a landmark-only highlight explained nothing.** Investigating `SPY`
highlights its eleven sector ETFs, every one a landmark and excluded from this
encoding by Story 6.3's own exclusion set, so `drawsAnything` is `false` and the
canvas is **byte-identical** to the unhighlighted picture — with no filter to
blame for it. A reader was told something was highlighted, saw nothing change,
and was told nothing about why; the same state **with** a filter in force got a
full explanation from `hiddenPeerWords`. Task 7.4.4's `quietened: boolean` is now
a three-value `TopologyHighlightInk` — `set-back`, `hidden-by-filter` (silent,
because `topologyFilterWords` is the single author of that explanation and
carries the figures) and `nothing-to-set-back`, which says _Nothing is set back;
none of these is an equity this graph draws._ One total record over the union, so
a fourth outcome is a compile error rather than a state that silently says
nothing. A fifth Storybook story (`HighlightedLandmarksOnly`) draws it, and it
passes `filter` deliberately — `NO_ACCOUNT`'s own `set-back` is right for a
component with no criterion and wrong for exactly this command, which is the
recorded limit Task 7.4.4 left and the reason the story needs the prop.

**Fix 4 — a zero-peers subject gets no sentence anywhere, and this one is
RECORDED rather than fixed.** `QQQ`, `DIA` and `IWM` are tracked and carry no
membership edge of any kind, so the tool answers an empty list and no command is
emitted — correct, and silent on both surfaces, because `subjectUntracked` is
`false` for all three and Task 7.4.4's sentence is keyed on the other state.
There is **no signal in the decoded stream** to condition a sentence on: an
untracked subject, a zero-peers subject and a producer that threw are one
observable (silence), and _no command yet_ is a fourth. The one browser-side
alternative — recompute the answer from the universe the security page already
holds — is a second home for the tool's own answer and would be wrong about the
**measured** half, which lives in a nightly table that page never fetches. The
clean repair is a wire arm stating the reason, which is new wire shape with a
decoder and a permission question behind it. `docs/GAPS.md` carries it with
**Story 7.5** as owner, which already owns the same taxonomy question for a
failed run.

**What no person has checked about the three fixes**: they were verified by unit
and component tests over the real recorded universe and by the browser spec's own
two new assertions, not by a sitting on a deployed backend — `LIVE-REHEARSAL.md`
still carries no row for this epic, owed by Story 7.7.
