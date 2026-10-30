# Epic 8 — Evidence & Investigation Workspace

**Status:** Not started
**Sequence:** 8 of 15 — follows Epic 7 (Deterministic Investigation Engine)
**Spec references:** PRODUCT_SPEC.md §5.2 (evidence before explanation), §5.3 (visible uncertainty), §8.2 (Investigation Workspace), §15 (findings), §16 (evidence), §36 (failure/partial states)

## Goal

Turn analytical results into an understandable investigation experience.

## Outcome

Users can inspect the evidence behind an investigation rather than receiving a collection of raw calculations.

## Scope

- Investigation workspace
- Evidence domain model
- Finding domain model
- Evidence cards
- Confidence/evidence-quality states
- Comparison charts
- Investigation timeline
- Investigation-step status
- Evidence provenance
- Evidence-to-chart linking
- Findings-to-evidence linking
- Failed/partial investigation states

## Exit criteria

A deterministic investigation results in an understandable collection of findings such as:

> The move is broader than NVDA but concentrated within semiconductors.

and the user can inspect the exact calculations supporting that statement.

**Milestone:** by the end of this epic MarketPulse should already be a credible non-AI product.

## Handed here by Story 3.9's close — 2026-09-24: a comparison chart shares a frame that now grows

**The security page's price and volume plots extend during a session** (Story
3.9), on a single `ChartAxis` frame that both read. A comparison series hung on
that same axis inherits two things:

- **The frame's last slot arrives on its own**, so a comparison drawn inside
  `ChartAxis`'s provider grows with it and one drawn outside does not. ADR
  0023's reversal trigger — _the first piece of state two features must agree
  about that neither owns_ — was evaluated by Task 3.9.5 and has **not** fired,
  and the sharpened condition names **a comparison chart** as one of the three
  things that would fire it.
- **A pinned reading is a reading of a bar, not of _now_.** Task 3.9.6 decided
  that a reading **holds its instant** when a newer bar arrives and **updates in
  place** when the bar it names is revised. Its recorded reversal trigger is
  yours by name: _the first surface that shows a reading the reader did not
  place_ — an agent's `pinEvidence`, or a replay cursor. A reading nobody
  pointed at has no instant to hold, and that is the case to decide rather than
  inherit.

## Handed here by Epic 4's close — 2026-10-12 (Task 4.9.4): the day you draw a region on a new route, an axe rule goes silent and nothing tells you

**Measured consequence of ADR 0039, which this epic inherits.** A `Region`'s
`<section>` is now `tabIndex={0}` **unconditionally** — because a tab stop must
not appear and disappear under a reader. The side effect is that axe's
`scrollable-region-focusable` **is silent while the scrolling box contains
something focusable**, so it can never again report a region on any route of
this product, including the ones you add. That rule caught a real WCAG 2.1.1
violation on `/` once; it will not catch the next one.

**What to do about it, and it is one line per route.**
`expectEveryRegionIsATabStop(page, { atLeast: n })` in `e2e/support/app.ts` is
the replacement, used today by `overview-region-order.spec.ts` (`atLeast: 7`)
and `securities-route.spec.ts` (`atLeast: 8`). **A new route that draws regions
and does not call it has no coverage of this at all**, and nothing in
`pnpm verify` or `pnpm e2e` will say so — the absence is the failure mode.
Add the call in the same change as the route.

**Two further facts about `Region` you inherit rather than re-derive.** It
remembers the element that last held focus inside it and focuses its own
`<section>` when that element is removed while `document.activeElement` is the
body, so a reader whose rows vanish lands on the region rather than on `<body>`;
it composes rather than replaces, so a better landing of your own still wins.
And a roving list inside a region clamps rather than wraps and is keyed on the
item's **identity**, never its index — a held index is a second, disagreeing copy
of where focus is (ADR 0039, Task 4.6.5).

## Handed here by Epic 5's decomposition — 2026-10-13: a confidence chip and an anomaly band are both four-member ordered vocabularies, and they must not share a component

**Written here rather than linked, because this epic is the first place the two
will be on one screen and Epic 5's files are not where this epic reads.**

Epic 5 ships an **anomaly band** — `normal / elevated / high / extreme`, four
members, ordered, rendered as a chip with **the band's name written inside an
amber fill**.

**The PREMISE is dated 2026-10-29 by Task 5.7.5 at Epic 5's close; all three
rules below are unchanged and correct.** The chip is real and is what you will
sit beside — but it exists on **one** surface, `/securities/:symbol`, and
`AnomalyBadge` is imported by exactly one shipped component. **On `/` the band
is a WORD in the region's heading spending none of the amber ramp**, since Task
5.6.7, and the measurement behind that move is directly useful to you:

- A per-row chip cost **76 px of a 308 px row — 25%** — squeezing company names
  to `Dominio…`, `The Kra…`, `3M Co…`.
- There was **1 distinct band in the top ten**, against 16 `extreme` securities
  in the whole universe, with all ten rows sharing one band in **35 of 77**
  measured instants. So a per-row chip **stops being a property of the selection
  and becomes a property of the day**.
- A chip taller than the row's line box **steps the whole lower page**, and only
  `pnpm probe` can see it: the first draft gave it 24 px of vertical space in an
  18 px line box and every row came out **33 px instead of 26**, with the list
  **329 instead of 269** — **green on all 3,652 unit tests.**

**Read that as a reason the rules below are right rather than as a reason to
relax them.** The two vocabularies are still four ordered members each, they
will still be on one screen here, and the reason a confidence level must never
be four amber fills is unaffected by how many surfaces draw the band today.

**And one thing is now measured that was not when this section was written**:
`market.css` resolves `--anomaly-high`, `--feed-stale`, `--service-degraded` and
`--provenance-synthetic` **all to one amber**, so the ramp is already carrying
four meanings before confidence arrives as a fifth. Epic 5 photographed the
collision and routed it rather than repairing it.

Invariant 5 ships a **confidence level** —
`CONFIRMED / SUPPORTED / POSSIBLE / UNKNOWN`, four members, ordered, and this
epic is where it first reaches a screen.

**They are orthogonal in meaning and identical in shape**, which is the
dangerous combination. A band says _how unusual the behaviour is_; a confidence
level says _how well evidenced an explanation of it is_. A security can be
`extreme` and `UNKNOWN` at once, and that pair is the single most important
thing this product can say — `PRODUCT_SPEC.md` §5.3's _"I don't currently have
enough evidence to explain this move"_ as a successful outcome.

**Three rules, each cheap now and expensive after the first confidence chip is
drawn:**

1. **They must not share a chip component.** One component rendering two
   four-member vocabularies is how the two come to look like one scale with
   eight steps.
2. **Confidence must never be four amber fills.** The amber ramp is **anomaly
   intensity** — its greyscale separations were measured at 1.12, 1.43 and 1.59,
   and the band's name is written inside the fill _because_ that is not enough
   to name a step. Confidence is about **evidence**, which this product renders
   in **weight and hierarchy**, never in a ramp outside the contrast floor.
3. **A band and a confidence chip must never sit in one row without their
   labels** — `ANOMALY` and `CONFIDENCE`. Two unlabelled four-step chips side by
   side read as one compound verdict.

**And one word to refuse.** Do not reuse `UNKNOWN` for _no anomaly score_. It
already has two homes — invariant 5's confidence level, and
`MarketOverviewEntry`'s `state: "unknown"` for nothing observed and nothing
stored. **Epic 5's no-score state is an absence rather than a value**, the way
`change.percent` is `null` and `directionOf` returns `undefined`, so
`ANOMALY_BANDS` stays four-member-exhaustive.

## Added to this epic's scope — 2026-10-30, by the owner at Epic 5's close: `Anomaly history` is yours, and it is already on a shipped screen

`Anomaly history` is one of `PRODUCT_SPEC.md` §8.3's seven regions on
`/securities/:symbol`. **Epic 5 deferred it at its Gate 1 and closed without
filling it**, and no epic owned it until today.

**Why it is yours**: reading a security's earlier unusual days against today is
**evidence** work, and this epic already owns the two surfaces it would sit
beside — the band-versus-confidence collision recorded earlier in this file is on
these same screens.

**Your trigger is the placeholder's own sentence.** Until 2026-10-29 the shipped
page read `Filled by Epic 5 — Anomaly Detection`, which is a product promising a
region from work about to be declared finished. It now reads:

> `Filled by the first story that needs a score for this security from more than
one past session`

**And the first wording of that condition stopped discriminating within five
days**, which is worth knowing before you write your own. It was _the first
surface that needs a score older than the process_ — and Task 5.6.7 satisfied it
**without filling anything**, because `/`'s `Unusual activity` reads
`session_composite_scores`, a **nightly** table, on roughly 80% of the week and
permanently on CI. Those are scores written before the process started, read by a
shipped surface. The re-wording is the repair: what this region needs is not **a**
stored score but **a series of them for one security**.

**Three things it inherits.**

- **The read is a range scan nothing asks for yet.**
  `0017_session_composite_scores` keys **one row per security per session**, and
  the index such a read would want is **deliberately absent**, with its condition
  stated in the migration.
- **Its shape is already drawn** — Story 5.1's canvas, `The rail that says how
unusual.dc.html` §07 — so whoever fills it inherits the rail's idiom rather
  than inventing a third one. Two things come with that: the **band word beside
  every entry** and the rail's own anchoring.
- **A refused security gets no row.** That is why `0014` and `0017` are each
  paired with a **pass** table: a history that joins only the row table will
  under-report and look correct, because the sessions a security was refused in
  are simply absent rather than marked.

**And the thing to decide first, before any of that**: what a history row _says_
when the policy that produced it has changed. A stored score is a **cache of a
policy**, not a record of an observation — Epic 5 proved that the expensive way,
with 485 persisted rows carrying a figure computed the wrong way after a factor's
definition turned out to be wrong. Nothing in `0017` records which policy
produced a row.
