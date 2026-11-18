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

## 1. The domain model, and what is reachable from this story alone

`Investigation` and `Step` are **two separate status vocabularies**
(`PRODUCT_SPEC.md` §13/§14), never a shared union — `queued` exists only on
a `Step`, `awaiting user` only on an `Investigation`. This story produces
exactly:

```text
Investigation:  running → completed
Step:           queued → running → completed
```

`failed` and `cancelled` (both vocabularies) have no producer anywhere in
this epic yet — Story 7.5 is where a tool can fail and a run can be
cancelled for real. `awaiting user` has no producer in this epic **at
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
`fromSeq`; no keepalive yet, because nothing in this story holds a stream
open long enough to need one) and the domain-type split (wire shapes in
`packages/shared`; the provider/tool contracts backend-only, never leaking
to the frontend's type graph — invariant 7).

**`cancel(id)` is a documented no-op** — it does not move an
investigation's status, because nothing in this story's own scripted
pipeline runs long enough to need cancelling mid-flight. Story 7.5 is
where it does something.

**The in-memory investigation map is bounded at 200 entries**, evicting
the oldest **completed** investigation first, never one still running —
the same bound every other in-memory structure in this product states.
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

## 8. What no gated machine and no person has ever seen

**CI's store is 516 securities and zero bars**, so `get_security_snapshot`
answers `nothing-observed` for every tracked security on every gated run,
permanently — the `ok` outcome, a completed step with a real duration, has
never been drawn by CI. The e2e suite's own `security-investigate.spec.ts`
runs against a developer's real, populated store for exactly this reason,
the same split `CLAUDE.md` already states for every chart on the security
page.

**No person has watched this feature work against a real, deployed
backend.** Every figure in §7 and every manual verification this story
records was taken on one developer's own machine. `LIVE-REHEARSAL.md`
does not yet carry a row for this epic — Story 7.7 (the rehearsal, the
sweep and the epic close) is the named owner of opening that ledger, the
same way Epic 3's own `LIVE-REHEARSAL.md` was opened at that epic's first
story and carried forward.

## 9. What is open, with a named owner rather than a story number

- **The keepalive.** No SSE keepalive has been written. The first
  investigation run held open across more than one step is the condition
  under which it becomes owed — ADR 0050's own reversal trigger,
  `HOSTING.md`'s dated amendment.
- **A real-network, non-loopback re-take of §7's two figures.** Owner: the
  first story in this epic that reaches a deployed backend, or Story 7.7's
  own sweep if none does first.
- **A person watching this feature against the deployed product.** Owner:
  Story 7.7, the same way every earlier epic's rehearsal opened at that
  epic's close rather than at its first story — here it is named at the
  first story specifically so the ledger exists before six more tools are
  built against the same pipe.
