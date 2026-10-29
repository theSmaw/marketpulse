# Epic 7 — Deterministic Investigation Engine

**Status:** Not started
**Sequence:** 7 of 15 — follows Epic 6 (Market Topology)
**Spec references:** PRODUCT_SPEC.md §13 (investigation model), §14 (investigation steps), §17 (agent toolset), §33 (agent event protocol), §41 Phase 2

## Goal

Create the investigation system before introducing an LLM.

## Outcome

Users can launch a structured investigation into an anomalous security and see deterministic analytical steps execute.

## Scope

- Investigation domain model
- Investigation lifecycle
- Investigation steps
- Analytical tool interfaces
- Security snapshot tool
- Return-percentile tool
- Volume-anomaly tool
- Peer-comparison tool
- Market-breadth tool
- Correlation tool
- Investigation orchestration
- Streaming investigation events
- Cancellation
- Partial failure handling

## Exit criteria

Selecting:

> Investigate NVDA

runs a structured workflow such as:

- measure price anomaly;
- measure volume anomaly;
- compare peers;
- compare market;
- calculate breadth;

and streams the results into the UI.

No LLM is involved yet.

## Handed here by Story 3.5's close — 2026-09-21: the object this epic reads instead of opening a socket

**Story 3.5 built `currentMarketState` for the three epics outside Epic 3 that
want the latest observation per security** — this one among them — **and none of
you wants to subscribe to a socket to get it.** Written into this file rather
than left in Epic 3's documents, because a constraint one story measures for
another lives where the owner does not read.

`apps/backend/src/current-market-state.ts` — one `Map<Ticker, LiveObservation>`
in the backend process, **0.2 MB** at universe scale. `snapshotOf(state)` gives
the whole thing; a read by symbol gives the bar, its `source`, and an `ageMs`
computed **at read time** rather than stored. Reading it costs nothing and opens
nothing.

**Five properties that will shape what you build on it:**

1. **It is LATEST-ONLY. There is no series in memory.** 518 latest values, not
   518 × 390 minute bars — decided in Story 3.5 as the cheap option because
   Story 3.8 makes the **store** hold today's session. Anything wanting a series
   assembles it from the store plus what has arrived since.
2. **It is `status`-filtered** to the 518 `active` securities
   (`UNIVERSE.md` §12.2 — a computation over _the market we track now_ filters;
   a read of something we **stored** does not). Story 3.8's read path is
   deliberately unfiltered, and that asymmetry must not be "fixed".
3. **An absent entry is normal, not an error.** Median minute coverage on the
   IEX feed is **65.1%**, and `ERIE` is **2.1%** — a security can be legitimately
   silent for a long stretch. A gap of **187 minutes** was measured. Treat
   "no current observation" as a first-class answer with its own words, never as
   a failure.
4. **It is in memory and dies with the process.** After a restart the true
   answer is an empty map, and an empty map is a **legitimate value rather than a
   degraded one** — which is exactly the trap `docs/GAPS.md` records: a
   placeholder indistinguishable from a real answer hides whatever was built on
   top of it until the day it stops being empty.
5. **It never walks backwards.** A revision for a minute already superseded is
   discarded by the live path entirely (**0.1062% of bars, 37.6% of them
   changing the close** — a whole session on 2026-09-24; the spike's 0.064% /
   35.3% is `LIVE-DATA.md` §14.1's first figure and its amendment carries
   both), so the live figure and the stored figure can legitimately disagree
   for a small fraction of bars.

**And the feed it comes from is IEX, not the consolidated tape the stored bars
carry** — invariant 6 in `CLAUDE.md`. A number from this object and a number
from the store do not have the same provenance, and the UI must not imply they
do.

**For this epic specifically:** an analytical tool reads this object directly —
no socket, no subscription, no `await` on a stream. But invariant 5 makes
provenance part of the domain model, so a `Finding` built on a live observation
carries a **different feed and a different age** from one built on stored bars,
and property 3 means `UNKNOWN` — "this security has not been observed recently
enough to say" — is a correct outcome a tool must be able to return.

## Handed to this epic by Epic 4's close — 2026-10-12 (Task 4.9.4): the landing page already draws your region, names you on screen, and constrains what you may put in it

**`/` has seven named regions and one of them is yours.** `Current
investigations` is drawn today in `Panel`'s `reserved` state with the words
`EPIC 7` and the sentence _"Investigations in flight — running, awaiting input
and completed. Epic 10 lets the agent start them."_ —
`apps/frontend/src/routes/MarketOverview.tsx`. A reader of the deployed product
can see your epic's name. You do not have to invent the region, its heading or
its position.

**Four things that constrain what you put there, each measured or mechanical.**

1. **Your region is a tab stop unconditionally** (ADR 0039), and it keeps its
   name, its order and its landmark across being filled — so nothing a screen
   reader or a deep link depends on moves when you replace the placeholder.
   At ≥861 the six regions' focus order deliberately runs column-major across
   the grid; read `MarketOverview.tsx`'s comment before changing DOM order.
2. **Your region sits on grid row 3**, which is `minmax(min-content, 1fr)` and
   therefore has a content floor. Rows 2 and 3 do; row 1 (the topology and
   unusual activity) does not. Measured at thirteen width/height pairs
   (Task 4.6.6): no row-3 region scrolls at any pair, including 1440×500.
3. **The screen must not grow a second clock or a second connection word.**
   `pnpm invariants` holds `one-caller-of-the-market-clock` and
   `one-home-for-the-feed-words`, and an investigations surface that states the
   feed's state will fail the build by name. The connection has one home, the
   status bar.
4. **A row with nothing behind it must not be a link at all.** `visibility:
hidden` and `aria-hidden` do nothing to an `href`; an investigation row with
   no destination renders as text, not as an anchor. Every destination on `/`
   is resolved at render from the row's own identity through
   `<Link to={…}>`, and `one-home-for-imperative-navigation` refuses a second
   file that moves the address in a handler, over every shipped source file in
   three trees.

**And `/`'s cost is measured, so your region arrives with a stated budget.**
Production build, 1440×900, 40 interleaved cold loads, every observer proved by
a plant on the page that produced the figure: `/` draws **447 DOM nodes and
zero `<tr>` at 518 securities**, 0 tasks over 50 ms on 10 of 10 loads, worst
rAF gap **24.7 ms p50 / 34.7 p95** against a 16.7 ms quantum — so it is **not**
in breach of `PRODUCT_SPEC.md` §28 and `/securities` is. The page also commits
**2 renders per applied batch** at **6.8–16.1 batches a minute**, so a region
holding live investigation state re-renders at that rate whether or not any
investigation changed.

### And the overview aggregate is reachable by a browser only, which is a trigger worded against this epic's tools

**ADR 0038's narrower reversal trigger is _the first consumer of the overview
aggregate that is not a browser_, and it names this epic's tools as the likely
first one** — because a tool cannot attach a WebSocket to call a function. The
aggregate (`buildMarketOverview`) is computed once in the backend, beside
`currentMarketState`, and delivered as a broadcast-identical `overview` frame on
the market-stream socket. There is no HTTP route for it.

**What that costs you, concretely.** `pnpm invariants` holds
`one-producer-of-the-overview-aggregate`: _"`buildMarketOverview` has at most
one call site in shipped backend code"_. An analytical tool that calls the join
a second time **fails the build by name**. So an investigation tool that wants
breadth, sector means or the movers' cut has two honest options, and the choice
is a design decision rather than a detail:

- **Re-wire the one call site** so the single producer's answer is readable by
  both the gateway and a tool, and keep the invariant true; or
- **take ADR 0038's trigger as fired** and move the aggregate behind a
  request/response shape, at which point `one-producer-of-the-overview-aggregate`
  stops being the right claim (it becomes one producer per request) and
  `computedAt` acquires a per-client meaning the screen's single `COMPUTED` line
  cannot state.

Decide which before writing the tool, and record it — the trigger exists so
this is a decision rather than a discovery.

## Handed here by Epic 5's decomposition — 2026-10-13: `Investigate` is yours, it has a place reserved for it, and §17's tool names are already Epic 5's factor functions

**Written here rather than linked, because a pointer is what a reader follows
when they already know to look.** These are decisions taken at Epic 5's Gate 1
that constrain this epic, and Epic 5's files are not where this epic reads.

**1. `Investigate` does not ship in Epic 5, in any form — not disabled, not a
tooltip, not a "coming soon" affordance — and it is reserved for you.**
`PRODUCT_SPEC.md` §12 compresses the journey into _the user sees `NVDA — anomaly
91` and selects **Investigate**_, but Investigation is this epic's object and
the agent is Epic 10's. Three reasons it was refused rather than stubbed, each
one this repository's own rule:

- **A natively `disabled` control is not focusable**, so anything
  `aria-describedby` hangs off it is unreachable. This product shipped that
  defect for two tasks — search's unavailable states carried a correct,
  attached, visible sentence that no key press could reach — which is why
  `TextField` renders `aria-disabled` + `readOnly` product-wide.
- It would be **the second sentence in the product pointing at another
  surface's control**, which is a retired-and-still-live reversal trigger.
- `PRODUCT_SPEC.md` §5.5 and invariant 3: **every analytical capability is
  reachable without the AI.** So Epic 5's correct deliverable is the _non-AI
  version of the investigation_ — §11's factors computed deterministically and
  laid out as figures a person reads — and this epic adds orchestration,
  streaming and cancellation **on top of a surface that already draws every
  number.**

**2. When it ships, it belongs on the security page's `Abnormal-move
indicators` region, beside the factors it automates — not on a row of `/`'s
`Unusual activity` list.** A row there has exactly **one** activatable thing,
its ticker (Story 4.6's settled rule), and the roving stops are keyed on symbol
with arrows that clamp rather than wrap. **A second activatable thing in one
roving stop is two answers to _what does Enter do_.**

**3. §17's tool names are Epic 5's factor functions, and you should expect to
find them already written.** `calculate_return_percentile`,
`calculate_volume_ratio`, `get_market_breadth` and `compare_securities` are the
quantities Epic 5 computes for its own surfaces — invariant 1 wants the tool to
exist before the model does, so Epic 5 names its functions for §17 deliberately.
What you add is the **orchestration**, not the arithmetic.

**4. Four things about the score you will be orchestrating, each decided with
its alternatives at Epic 5's Gate 1:**

- **It is absolutely calibrated** against each security's own history, not a
  cross-sectional rank against the day's universe. So **a quiet day produces no
  high scores**, and an investigation triggered by a score cannot be
  manufactured for a demo.
- **`AnomalyScore` cannot be constructed without its explanation**, and the
  explanation cannot hold a figure that was not produced by a named
  calculation — a type rather than a test. Your findings inherit a structure
  that already carries its provenance.
- **Breadth is a stated clause rather than a weighted factor**, because it is
  identical for every member of a group and so cannot order securities within
  one. If an investigation reasons about breadth it is reasoning about a
  _group_, and `PRODUCT_SPEC.md` §11 carries a dated amendment saying so.
- **An anomaly score's bands are `normal / elevated / high / extreme`** —
  `unusual` was renamed at Epic 5's Gate 1 because it collided with the region
  name `Unusual activity`.

**5. And one collision to avoid before you draw your first finding.** A
**confidence** level (`CONFIRMED / SUPPORTED / POSSIBLE / UNKNOWN`) and an
**anomaly band** are both four-member ordered vocabularies rendered as chips,
and from Epic 8 they will be on one screen. **They must not share a component,
and confidence must never be rendered as four amber fills** — the amber ramp is
anomaly intensity, and a band says _how unusual the behaviour is_ while
confidence says _how well evidenced an explanation is_. A band and a confidence
chip must never sit in one row without their labels.

## Handed here by Story 5.6's close — 2026-10-29: the score's explanation is complete only BESIDE its factors, and a seam is waiting for you with no consumer

**Story 5.6 shipped the composite anomaly score and its explanation**, and two
things about it are this epic's to inherit rather than rediscover.

**1. The ledger is a complete explanation ONLY where the factor bands are.** The
score draws as the first band of `Abnormal-move indicators`, and its explanation
is a **ledger** — the weight, the contribution, and a ≤24-character reason for an
absence — **not** a paragraph. That is deliberate: the factor figures, their
definitions, their counted samples and their tapes are already drawn ~100 px
below, and restating them would be **two homes for one fact**, which ADR 0029
forbids by name and `pnpm invariants` has failed a build over.

**So any surface that draws this score WITHOUT those bands owes its own
account.** An investigation panel showing `61 / 100` beside a ledger reading
`Price 40 → 38` gives a reader a contribution with no figure to check it against.
Either draw the factors too, or write the fuller explanation — but do not assume
the ledger travels.

**2. `Popover` is yours, deferred by name rather than orphaned by accident.**
Story 5.6 deleted `SecurityRow`, which was `Popover`'s only shipped consumer, so
**the component now has none.** It was kept rather than deleted because it is
probably the right primitive for **this epic's dense surfaces**, and its own
docblock argues the case: a popover rather than a tooltip, because its content is
in the accessibility tree and it opens on Enter or Space rather than on hover.

**Why the score did NOT use it, which is the part that matters to you.**
`PRODUCT_SPEC.md` §11 requires every score to **carry** its explanation, not to
be _askable_ for one — and AC 6's nine required elements **cannot be audited by
walking a DOM that does not contain them until a click**. So a popover is right
for a dense table row and wrong for a figure whose explanation is the point.
**That distinction is the test to apply when you reach for it.**
