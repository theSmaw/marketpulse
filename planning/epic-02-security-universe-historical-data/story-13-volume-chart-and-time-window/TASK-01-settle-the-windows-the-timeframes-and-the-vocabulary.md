# Task 2.13.1 — Settle which windows exist, what a window costs, and the vocabulary it is spelled in

**Status:** Not started. Subject document: `VOLUME-AND-WINDOW.md` (this task creates it).
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** Story 2.12 (complete)

## Objective

Take this story's three open decisions — **which windows**, **whether the
timeframe is user-visible**, and **whether an intraday window shows a partial
current session** — plus three more this story cannot avoid and no later task
should be left to take by accident, and write them into
**`VOLUME-AND-WINDOW.md`** in this directory before anything is drawn.

Tasks 2.9.1, 2.10.1, 2.11.1 and 2.12.1 are the precedent, and the argument is
different here from any of them. Those decisions were about **mechanism**. This
one is about **what the product offers**, and it reaches in three directions at
once: backwards into what Story 2.8 actually stored, sideways into what Story
2.9's cap will refuse, and forwards into Epic 8's comparison windows and Epic
11's `setTimeWindow` command, which pushes a window this task names.

A window list chosen by taste is a window list that one of those three
directions then refuses, and the refusal arrives as a 400 on a screen rather
than as a sentence in a document.

## What the user can see when this lands

**Nothing.** No control, no volume, no new window. The payoffs are Task 2.13.4
(volume on screen) and Task 2.13.6 (the control). Say "nothing visible" plainly
when reporting it and name those two tasks.

## What is already decided and must not be re-taken

Read these first. Four of them would otherwise be settled here differently, and
each is recorded with its argument somewhere else.

- **The window lives in the URL and the address is never rewritten into a
  different form** —
  [`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
  §3. `?sessions=5` means _the last five sessions_ when somebody opens the link
  tomorrow; resolving it to an absolute range behind their back changes what
  their link says. The **strings** are this task's; the rule is not.
- **The window is never resolved from the browser's clock.** `sessions=N` goes on
  the wire and the server resolves it, because a browser in Singapore at 09:00
  local is on the previous market date in New York. `bar-series-query.ts`'s
  header carries the argument and the union's shape is what enforces it.
- **A window change is the same event as a symbol change** to the fetch layer: it
  changes `barSeriesQuery(request)`, which is the cache key and the request.
  `useBarSeries` already supersedes, resets and never paints the previous
  window's series under the new window's label. **No new cancellation code.**
- **The cap is 10,000 bars and it is refused rather than reduced**, with a 400
  that names the number, and the refusal already has a rendering that carries the
  server's sentence verbatim and offers no retry.

## Work

Settle each of the following, with the alternatives that were weighed and a
**reversal trigger that is a condition rather than a story number**.

- **Open decision 1 — which windows.** This is an arithmetic problem with a
  product answer, and the arithmetic is already on the shelf. Do it in the
  document rather than in your head:
  - **What is actually stored** (`BARS.md` §2 and §8.16): `1m` for **one year**,
    251 sessions, 47.7M rows; `1d` for **672 sessions** bounded at 2024-01-01 by
    the calendar, which is option A taken deliberately and grows with the
    calendar. There is no third timeframe and `PROVIDER.md` §9.4 forbids deriving
    one from the other.
  - **What the cap permits**: 390 bars a session at `1m`, so the cap is **25
    sessions** of minute bars. One month of `1m` is ~21 sessions and **8,190
    bars — inside it**; two months is ~16,380 and **refused**. At `1d` nothing in
    the store can reach the cap.
  - **What each window costs on the wire**, from `MARKET-DATA-API.md` §12.8's
    deployed readings: five sessions of `1m` is **29,072 B / ~399 ms**, a month
    of `1m` is **154,480 B / ~1,210 ms**. §28's 500 ms is satisfied by the frame
    painting immediately, which `CHARTING.md` §4 already established — but a
    window whose answer takes 1.2 s is a window whose _transition_ is a design
    problem, which is Task 2.13.2's.
  - **What each window costs to draw**, from this story's own 2.12.9 amendment:
    `timeAxis` twice per render is **0.4 ms** at five sessions, **1.9 ms** at the
    `1m` cap, **17.5 ms** at a year of `1d` and **46.1 ms** at the whole stored
    depth — against a 50 ms budget, before a pixel. Task 2.13.3 takes the repair;
    this task decides **whether a window that needs it is offered at all**.

  The defensible set the story names is 1 day, 5 days, 1 month, 3 months, 1 year.
  Check each against the four rows above and say what happens to the two that are
  interesting: **1 day**, which on a store caught up nightly is reliably `empty`
  (this is why `DEFAULT_SESSIONS` is 5 — the argument is in
  `SecurityExplorer.tsx`'s call site), and **1 year**, which is 253 sessions of
  `1d` and the condition `CHARTING.md` §16.5 names. If a "max" window is offered,
  say what it is max **of**, because 672 sessions of `1d` and 251 of `1m` are
  different maxima and neither is "everything".

- **Open decision 2 — whether the timeframe is user-visible.** Deriving it from
  the window is simpler and is what most products do; exposing it is more honest
  and is closer to an analyst's tool. Two things make this less of a coin-flip
  than it looks in the story: the timeframe is **already on screen** — the
  panel's stated facts and `chart-alternative.ts` both name it — and
  `chart-alternative.ts` carries **two `1d` branches that have never executed**
  (`CHARTING.md` §17.5 item 5), so the day a window maps to `1d` the product
  starts reading sentences nobody has heard. Decide, and if the mapping is
  derived, say where the derivation lives as **one function** rather than as a
  `?:` at a call site.

- **Open decision 3 — whether an intraday window shows a partial current
  session.** Today the question is nearly moot and that is worth saying plainly:
  the store is backfilled nightly, the plan refuses the most recent ~15 minutes,
  and there is no live tail until Epic 3. So decide it as the thing it actually
  is — **what the `1 day` window means on a store that does not hold today** —
  and note §36's "displaying data through 10:42:17" is Epic 3's sentence and
  Story 2.14's rendering, not this task's to invent.

- **Decision 4, which the story does not list — the vocabulary, in three
  places.** A window is named on a control, in an address and in a sentence read
  aloud, and the three must agree. Settle: the **query-parameter spelling** (the
  first occupant of this product's query string, deliberately left empty by
  `SEARCH-AND-SELECTION.md` §3), the **label** on each control, and the **words**
  the text alternative uses. `FRONTEND-STATE.md` §3's rule that an absent
  parameter means the default and the application never writes a parameter it did
  not need is inherited, and it decides what the default window's address looks
  like.

- **Decision 5 — what a volume figure is allowed to say.** Volume abbreviates —
  millions and billions — and Story 1.4's tabular alignment must survive the
  abbreviation. That is a formatting rule and Task 2.13.3 implements it, but the
  **honesty** rule is this document's: an abbreviation is a rounding, so say
  where the exact figure still exists, and note that a volume from one venue
  presented as the market's volume is the specific false claim Story 2.14 exists
  to prevent. This is also where to record that **the seam is 2.14's** — the
  stitch is already on the wire.

- **Decision 6 — what happens to the window that cannot be asked for.** Two real
  states this control can reach and neither is a user error: a window that runs
  **off the calendar's 2024–2028 range**, which `lastMarketSessions` refuses
  rather than shortening (ADR 0017 decision 9), and a window **over the cap**,
  which the server refuses with a 400. Say which of these the control can reach
  at all — a control offering only windows inside the calendar cannot reach the
  first, which is a better answer than rendering it — and where each belongs in
  §36's state list.

## Done when

- `VOLUME-AND-WINDOW.md` exists and settles six decisions, each with alternatives
  and a reversal trigger that is a condition
- The window list is justified against **four** costs — what is stored, what the
  cap permits, the bytes and latency, and the calendar walk — with the figures
  re-taken or cited to the document that holds them
- The timeframe mapping is decided and has one home named
- The query-parameter spelling, the control labels and the spoken words are
  written down together, once
- Both refusal states are placed in the state list rather than left to a task
- Nothing is added to `apps/frontend/src` that ships
- `pnpm verify` passes — `pnpm links` in particular, for a documentation task

## Notes

The likeliest scope leak is **designing the control while deciding what it
offers**. What the windows are is this task; what the control looks like and what
happens between one window and the next is Task 2.13.2, on the canvas.

The second likeliest is taking the `timeAxis` repair here because the figures
are in front of you. It is `packages/shared`'s, it pays three callers including
the server, and it is Task 2.13.3's — with the explicit warning from this story's
own amendment that a `useMemo` in `PriceChart` fixes one caller of three and
leaves the server paying in full.
