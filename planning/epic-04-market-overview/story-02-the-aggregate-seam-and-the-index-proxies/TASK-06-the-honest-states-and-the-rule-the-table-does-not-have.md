# Task 4.2.6 — The honest states, and the rule the table does not have

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.5

## Objective

**The states nobody will ever see in production are the ones this task is
about, and that is exactly why it is a task.** `SPY`, `QQQ`, `DIA` and `IWM` are
the four most heavily traded names in the universe; their IEX coverage is near
total. So a proxy with no observation will be exercised by CI, by
`pnpm store:bare`, and by the sixty seconds after a restart — and essentially
never by a real user. That is `docs/GAPS.md`'s trap in its most expensive form:
**a placeholder indistinguishable from a real answer, hiding whatever is built
on it until the day it stops being empty.**

**And one state is not rare at all — it is most of the week.** The universe
table's staleness rule is **relative**: `LastCell` renders an instant only when
a row is _behind the page's newest observation_. That is correct for 518 rows,
because it dates exactly the set whose number is not current. It **fails
closed** when the whole map is uniformly old, which is every Saturday, every
evening and every morning before the bell — `currentMarketState` is not cleared
on a session boundary, deliberately, so it still holds Friday's 15:59 bars,
nothing is "behind" anything, and **no date renders at all.** Four large figures
sit at the top of the landing page, spoken as `Live price`, under a region whose
whole subject is what is happening right now. The status bar does not rescue
it: a quiet socket at 02:00 is correctly `LIVE`, by decision.

**The owner chose an absolute rule, in this story.**

## What the user can see when this lands

**A strip that is honest for the ~80% of the week the market is shut** — four
figures with the session they belong to, stated once beneath them. And an
honest answer where a proxy has been quiet, where it has never been heard from,
and where the store holds nothing at all.

**What they still cannot do:** everything 4.3–4.6 owns.

## Work

- **The absolute rule.** Keyed on ADR 0028's existing instrument — _the last
  session whose bell has rung_ (`marketSessionStateAt`) — not on comparison with
  siblings. A figure belonging to a session that has closed is dated, whether or
  not its neighbours are equally old. This is a rule the universe table does not
  have and is not being given; the difference is the strip's prominence, and it
  should be recorded as the reason rather than left as an inconsistency.
- **Stated once for the strip, per proxy only on disagreement** — the
  shared-claim idiom, already shipped twice.
- **The per-proxy states, each with the product's existing words and no new
  synonym.** A proxy with a live figure the feed has moved past renders **an age
  and never a verdict** — no threshold, because §11.2 measured an ordinary
  maximum gap of **187 minutes** and a p50 of one minute, and a surface that
  reports silence as a fault will cry wolf on thin names all day. A proxy with
  no observation renders its last stored close **with the session it belongs
  to**. A proxy with neither renders the vacancy state.
- **The third state the story's own criterion 3 does not name.** It gives two —
  live observation, or last stored close. **On CI there is neither**, and that
  is permanent there: 518 securities, zero bars, no provider. Enumerate three,
  not two.
- **The percentage is omitted, never zero.** `changeFromClose` returns a null
  percent when there is no previous close, and the shipped behaviour is an
  absence. Four blanks in the most prominent position on the screen is the
  correct answer and must not be repaired into a `0.00%`.
- **Nothing jumps.** Five reservations, and the argument that this strip has no
  control to displace must be **rejected** on the recorded ground — nothing in
  this product may move while a number is being read. Reserve: the change slot
  (`No previous session` is a completely different width from `▲ +0.84%` —
  `.close`'s `8ch` is the idiom, and **the width is measured, not argued**); the
  figure's own width; the qualifier line; the mark's slot in every state, not
  just the one where it fires; and the strip's total height across R1→R2→the
  vacancy state, because `.regions` starts immediately after it in a flex column
  and **the first arrival of the day would otherwise move the entire
  seven-region grid down by one line**.
- **The reserved-room idiom is already shipped and should be copied rather than
  re-derived**: `sessionReserved` renders ` ` with `aria-hidden` so arriving
  costs no height, and `FiguresReservation` uses `visibility: hidden` plus
  `aria-hidden` rather than em-dashes — because a fully-formed record about
  nothing is a false impression (ADR 0029), and because a hidden `dt` reading
  `SPY` is still matched by `getByText` and wedges a locator.

## Done when

1. On a store whose newest bars are from a closed session, every figure carries
   the session it belongs to — asserted, and reachable without waiting for a
   weekend
2. Three per-proxy absence states are enumerated, each **produced** rather than
   imagined, and each rendered in words that already exist in the product
3. No state renders an empty cell, and no state renders a percentage of zero
   where the truth is "no basis"
4. The strip's height is identical across every state at each of the four
   widths, measured with `pnpm probe` and the figures recorded
5. A second definition of any of the words used here fails `pnpm invariants`
