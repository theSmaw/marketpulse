# 0041 — A ranked surface re-orders under live data, and what an order owes the reader holding it

**Status:** Accepted
**Date:** 2026-10-12
**Story:** [4.9 The Rehearsal, the Sweep & the Epic Close](../../planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md), Task 4.9.10

## Context

This product holds **two opposite rules about rows moving under a live feed**,
both deliberate, both asserted, and until now nothing reconciled them.

Task 3.6.3 decided that `/securities`' universe table **never re-orders**, in
these words: _"a row that moves while it is being read is a row that cannot be
read. On 518 rows that is not a nuisance — it is the loss of the one thing a
dense list is for, because a reader holds their place by where it sits on the
screen."_ Nothing in `groupUniverse` reads a price; the behaviour was already
right and the work was recording that it was **chosen**.

Three stories later the landing route ships three regions whose **entire
content is an order computed from a live value** — eleven ranked sectors, two
ranked lists of five movers — and they re-order as figures arrive.
`CLAUDE.md` asserts both rules, in two places, and a reader who finds them
both reasonably concludes one of them is a mistake.

**Neither is.** Task 3.6.3's own close had already named the boundary and
nobody wrote it down as a decision: _"anything ranked by a live value is Epic
4's … A ranked view is a different surface with a different promise, not this
table sorted differently."_ That sentence is this ADR's whole subject, and the
reconciliation is the main thing it does. The treatment itself was taken
across five tasks — 4.3.3, 4.3.5, 4.3.6, 4.5.7 and 4.6.5 — with measurements,
and none of those is re-litigated here.

## Decision 1 — the two surfaces make different promises, so they behave differently

**A table whose order is a declared constant must not move. A region whose
content IS an order must.** The distinction is not implementation and not
scale; it is what the surface is for.

|                                    | `/securities` universe table                                                            | `/`'s ranked regions                    |
| ---------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| What the order means               | the universe, in a declared order (`SECTORS`, then the sector's ETF, then its equities) | **the answer** — _where should I look_  |
| What a price does to it            | nothing; no ordering key reads one                                                      | it **is** the ordering key              |
| What a reader holds their place by | position on screen                                                                      | the row's identity and its printed rank |
| A row that moved                   | a defect                                                                                | the finding                             |

A ranked list that refused to re-order would be **stating yesterday's answer
with today's figures in it** — the one failure mode worse than movement,
because it is invisible. And the universe table sorted by a live value would
lose the property a dense 518-row list exists for.

So both rules stand, unchanged, and **the universe table's own reversal trigger
is unchanged with them**: _the first sort control on this table whose key is a
live value._

## Decision 2 — the movement is the only signal that a position changed

**No fourth mark.** A figure changing fires the shipped arrival disc on the
shipped rule — _it fires when a bar arrives, not when the price changes_ — and
a position changing is carried by **the travel**, with the printed ordinal as
the persistent record.

Three properties travel with it and each is a decision rather than a detail:

- **A row can mark without moving, and move without marking.** The second is
  the correctness argument: a row's neighbour received a bar and overtook it
  while **this row received nothing**, so marking it would claim data that did
  not arrive.
- **Two events, separated in time rather than in ink** —
  `--motion-duration-settle` twice, as the delay and as the duration, so the
  list is still for 240 ms and then travels for 240 ms. One settle for the
  whole list, no stagger. `the-settle-is-one-token-twice` holds the two
  spellings together and `pnpm break the-settle-becomes-a-delay-plus-a-duration`
  proves it, which is what makes `prefers-reduced-motion` collapse both halves
  at once rather than leaving a row displaced under a transform.
- **Transform only, and DOM order equals visual order.**

## Decision 3 — the order is held still for as long as a reader is holding it

`ORDER HELD`: while a pointer is over the region or focus is inside it, the
order a reader is reading does not change. It is `stateMark`'s third
consumer — _a state PERSISTS_ — and the first use of that limb for something a
reader caused rather than something the system is doing.

The hold is **scoped to the region, not to one list**, which is the shape the
measurement forced: the two movers lists share a frame and a reader whose
pointer is in `GAINERS` is reading a page whose `LOSERS` would otherwise
re-order beside it. `pnpm break the-hold-is-scoped-to-one-list` is the proof,
beside `a-new-member-is-swept-to-the-bottom`, `the-held-badge-grows-the-head`
and `the-quiet-group-forgets-a-held-row`.

## Alternatives considered

- **Never re-order.** The universe table's rule applied here. Rejected in
  decision 1: a ranked list that does not re-rank states a stale answer in
  current figures, and nothing on screen says so.
- **Re-order only on an explicit reader action** — a `3 new movers · refresh`
  affordance. Rejected because it makes the reader responsible for the
  freshness of a region whose only content is a freshness-sensitive answer,
  and because the screen already carries an age for exactly this question
  (Task 4.7.4). It also produces the state this epic spent a task removing: a
  region drawing confident figures that are known to be superseded.
- **A fourth mark saying _this row moved_.** Rejected in Task 4.3.3: a mark
  saying a row moved is information a reader can only use by **remembering
  where it was**, which is the thing they cannot do. The travel carries both
  positions and the printed ordinal is the record.
- **A per-row stagger.** Rejected **on a measurement** rather than on taste:
  the eleven sector ETFs are the most liquid funds in the market and their
  bars arrive in one wave, bounded above by `LIVE-DATA.md` §7.4's **243 ms p50
  intra-minute spread (n = 445 minutes, 511 ms p95, 770 ms max)**. So the
  stagger the data was supposed to give free **does not exist** — all eleven
  are effectively simultaneous — and a stagger drawn deliberately is a
  decoration timed to nothing.
- **Animating `top`, `order` or `grid-row`.** Rejected twice over, and the
  second reason is the one nothing would have caught. It is per-frame layout on
  the page `PRODUCT_SPEC.md` §28 can least afford — the cold-load breach on the
  neighbouring route is 10,318 nodes of table markup. And **re-ordering in CSS
  while the DOM stays put hands a screen reader a different ranking from the
  one drawn**, which is invisible to axe, to jsdom and to a screenshot: three
  of this repository's four gates would pass a region whose spoken order is
  wrong.
- **A hold scoped per list rather than per region.** Genuinely arguable and
  the narrower behaviour. Rejected in Task 4.5.7 on the two-list case above,
  and the break `the-hold-is-scoped-to-one-list` exists because the per-list
  version is what a re-implementer writes.

## Consequences

- **The held-row pad exists because of this decision.** A one-sided market
  gives `GAINERS` five rows and `LOSERS` two, and 5 → 2 shrinks the movers
  region by **81 px** — which steps the whole lower page at the two widths
  where the grid rows are untied. So the short list is padded with held rows
  and the region is **one height in every state at every width**, measured
  across twenty-two of them: 466 px at Story 4.5, and **491 px since Task
  4.7.4's age clause**, which reserves a third line because it wraps at 390.
- **Rows are keyed by `symbol`, never by index.** Otherwise React rewrites
  nodes rather than moving them, and destroys hover, focus and any in-flight
  decay — the mechanism the whole treatment is drawn on.
- **Roving stops are keyed on `symbol` too, and arrows clamp rather than
  wrap.** A ranking is not a ring, and a held index is a second, disagreeing
  copy of where focus is. Four roving groups, one rule.
- **[ADR 0039](0039-a-region-is-a-tab-stop-unconditionally.md)'s focus backstop
  depends on this decision.** Twenty ranked ticker stops exist because an
  aggregate selected those securities, so every one of them can be unselected
  by a frame; `Region` catching its own dropped focus is the backstop for
  exactly that, and it is only possible because the section is a tab stop in
  every state. `overview-degraded-stops.spec.ts` produces those removals
  through the shipped socket.
- **It is inherited unexamined by the next ranked region.** Epic 5's `Unusual
activity` and any Epic 7 investigation list will be ranked by a live value on
  this same screen, and will get the travel, the hold, the symbol keys and the
  clamping by using `RankedList` — without anybody re-taking the argument.
  That is the intent; the risk is that a region whose rows a reader is expected
  to **compare over time** rather than **look at now** would want a different
  answer, and nothing will stop it inheriting this one.
- **What a green run does not certify.** **No gated machine has ever seen a
  row move**: CI's store has zero bars, so the frame carries `eligible: 0` and
  two empty lists for ever, and every assertion about the treatment is made
  against a furnished frame. Whether eleven discs and a whole-list re-order
  inside one 240 ms wave reads as _facts arriving_ or as _the page reloading_
  is a person's judgement, and the one open item is a routed defect: `ORDER
HELD` stays on while a **re-taken** pin moves every row, so one `ArrowDown`
  can re-order all five and take the reader one row up the screen.

## Reversal trigger, as a condition

**The first sitting in which a person reports a ranked region as flashing or
refreshing rather than as facts arriving.** The lever is named so that the
repair is not improvised: **the disc goes, not the motion** — a ranked list's
aliveness is its order, where the proxy strip needed the disc because four
barely-changing figures need a _look_.

**Narrower, and likelier to fire first: the first ranked region whose order a
reader can set or undo themselves** — a column header, a _sort by volume_
control, a pinned row. At that point the order becomes **reader-owned state**,
`ORDER HELD` stops being a hold and becomes a **control** (a reader who set an
order does not want it borrowed back when their pointer leaves), and the
universe table's own trigger — _the first sort control whose key is a live
value_ — fires at the same instant, because the two surfaces' promises have
converged and decision 1's table is no longer true.
