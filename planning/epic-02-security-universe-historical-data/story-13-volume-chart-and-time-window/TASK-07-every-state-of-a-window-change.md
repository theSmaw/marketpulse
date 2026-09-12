# Task 2.13.7 — Every state of a window change, produced rather than described

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.6

## Objective

Render every state a window change can reach, each one produced from a **recorded
response body** collapsed through the real transition rather than from a state
somebody typed — the shape Tasks 2.10.8 and 2.12.7 established.

The story's acceptance criterion 4 is the whole of this task, and its second clause
is the load-bearing one: **a failed window change leaves the previous data visible
and labelled rather than blanking the page.**

## What the user can see when this lands

**An honest sentence for every way a window can answer, and a chart that never
flickers empty on its way to a new one.** Changing the window keeps the old series
on screen, marked stale, until the new one arrives; a window with no data says so; a
partly covered one shows how much it holds; a refused one carries the server's own
sentence and offers no retry where waiting cannot help; and a failed change leaves
the previous window's charts on screen, labelled, with one `Try again`.

## Work

- **The states, and most of them already have renderings.** `loading`, `loaded`,
  `partial`, `empty`, `refused`, `failed`, plus stale-while-loading — `CHARTING.md`
  §14 decided all six with **one rule**: a mark derived from the window runs the
  full frame; a mark derived from the bars stops at the coverage edge. `empty` is
  that treatment at coverage **zero** rather than a seventh state; `refused` and
  `failed` draw **no frame at all**, deliberately, because neither carries a window
  a frame could be built from. What is new here is that there are now **two plots**
  and a **control** in each of those states, and the control is the thing most
  likely to be left in a state that contradicts the chart.

- **Stale-while-loading is inherited whole and is this task's centre**
  (`FRONTEND-STATE.md` §2's amendment): a held answer for the same request paints in
  the first commit, marked with a rail above the body — a dashed marker, a sentence,
  a travelling dashed hairline — and **no number is touched**; the settle wash plays
  only if a figure actually moved. A **stale** chart is identical to a fresh one,
  one mark for one answer, on the panel's rail. Your control is the **second** thing
  to produce this transition and the first to produce it deliberately, so it is the
  natural place to check the mark under a **rapid** sequence of changes, which
  nothing has done.

- **Superseded, in a real browser, finally.** Change the window while a request is in
  flight. `useBarSeries` asserts this by request identity in jsdom because there has
  never been a client-side route from one request to another; this control is that
  route. Record what the screen actually does, and note Story 2.11's amendment holds
  the other half of the same gap.

- **Two refusals that are not user errors.** A window **over the cap** — a 400 that
  names the number, rendered verbatim, with no retry because waiting never helps —
  and a window **off the calendar's range**, which `lastMarketSessions` refuses
  rather than shortening (ADR 0017 decision 9). Whether the second is reachable was
  decided in 2.13.6; if it is, it is rendered here, beside "empty" and "partly
  covered" rather than in a crash. **Write no copy around a bar count**: every
  number on this surface comes from the response, and a sentence built around a
  figure is wrong for every window but one.

- **The reading, across a change.** The crosshair is anchored to a bar that may not
  exist in the new window. Decide whether it clears or re-anchors, and make the
  keyboard case explicit — focus must not be lost, and `Escape`'s contract is that
  it clears the reading and **keeps** focus.

- **Record the bodies you need, and say their names.** The fixture set is fourteen
  bodies today and every one of them is `1m`. At minimum this task needs a `1d`
  body — §17.5 item 5 — and whatever the window transition needs that no existing
  body provides. Each new body under `apps/frontend/src/fixtures/` **must not reach
  the shipped bundle**, and the re-measure is per fixture by a string only it
  contains: `dense.json` is 221,603 B, `uncovered.json` is 146,807 B, and the
  universe body is 190,736 B. Add the new one's grep to `CLAUDE.md`'s list in the
  same change.

- **Two surfaces must not describe one failure in the same words.** Search and the
  universe table already share a fetch and it happened **three times in one
  afternoon**, caught every time by a locator resolving to two nodes rather than by
  anybody reading the page. A window control, a price chart and a volume chart now
  share one fetch — three surfaces, one event.

- **A control is present in every state, or it is absent from a state nobody
  noticed.** The search field was missing from three of its states for two tasks
  with `pnpm verify` green throughout, because a component nobody renders raises
  nothing. The window control must be on screen in `loading`, `failed` and
  `refused` too — a reader whose window was refused needs the control that picks a
  different one.

## Done when

- Every state renders for **both** plots and for the control, from a recorded body
  collapsed through the real transition
- A failed window change leaves the previous window's charts on screen, labelled
  stale or failed per the inherited rail, with exactly one `Try again`
- A rapid sequence of window changes is exercised and what the stale mark does is
  recorded
- A superseded answer is observed in a real browser and written down
- Both refusals render, carrying the server's sentence, with retry offered only where
  it can help
- The reading's behaviour across a change is decided and tested
- New fixtures exist, are named in `CLAUDE.md`'s bundle-leak list with their own
  grep, and `dist/` is verified to contain none of them
- No two surfaces describing the same failure use the same sentence
- Stories per state for the pair and the control; `pnpm stories` passes
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is **provenance**. A stitched series naming two feeds is Story 2.14's
subject and a materially larger surface than a label; what this task owes it is that
the states do not make 2.14's sentence impossible to place.

The trap is believing a break went red. A state rendered from a body that cannot
reach it proves nothing: `loaded` is the one state where the window-derived and
bar-derived x-domains agree, which is why anything built against it alone proves
nothing at all.

---

## Amended 2026-09-12 by Task 2.13.1 — two judgements this task owns, and a correction

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) placed both refusals and left this
task two things to decide that its Work section does not currently name.

**Correction: reachability was decided in 2.13.1, not in 2.13.6.** The bullet
above says _"whether the second is reachable was decided in 2.13.6"_. §6 decided
it: **neither refusal is reachable through the control.** The calendar refusal is
reachable by a hand-typed address and by Epic 11's `setTimeWindow`; the cap is
reachable only through the **absolute** window form. Both are still rendered
here — a state the control cannot cause is still a state the product can be in —
and both carry the server's sentence with **no retry**, because a refusal is a
fact about the request rather than about the moment.

**§1.3's trigger is this task's to fire or not, and it needs a person.** 1D is
offered knowing it is reliably `empty` on a nightly-backfilled store. The written
reversal trigger is: **if the `empty` rendering at 1D reads as a broken product
rather than as an honest one when somebody looks at the screen, 1D is withdrawn
until Epic 3's live feed lands.** That judgement was deliberately deferred to
this task because this is the first task that can see it. Look at it, and write
down the answer either way — `CHARTING.md` §12.6 is the standing reminder that
four automated simulations passed against a chart a person spotted was wrong.

**§6.3's labelling tension is named and not resolved, on purpose.** `refused` and
`failed` draw **no frame at all**, deliberately, because neither carries a window
a frame could be built from. Acceptance criterion 4 asks that a failed window
change leave the previous data visible and labelled. Those are compatible — a
refusal is an answer about the **new** window, and the previous window's series
is still a true picture of the **previous** window — but only if the label above
it says **which window is on screen**. That is this task's to design, and it was
written down so it is inherited rather than discovered halfway through.

**The `1d` body moved to 2.13.6**, which is the task that first makes a `1d`
window reachable and therefore first executes `chart-alternative.ts`'s unverified
English. Whatever bodies the transitions themselves need are still this task's.

Add to **Done when**:

- The label above a `refused` or `failed` chart names **which window** is on
  screen, and a test proves a reader cannot mistake the old window for the new one
- §1.3's trigger is answered in writing, from a screenshot, either way
