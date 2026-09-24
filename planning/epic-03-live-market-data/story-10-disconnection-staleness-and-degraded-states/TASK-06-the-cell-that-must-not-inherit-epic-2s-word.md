# Task 3.10.6 — The cell that must not inherit Epic 2's word, in every connection state

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.2

## Objective

The market-feed cell answers **two** questions — _which venues are in these
numbers_ and _is data arriving_ — and on the deployed site it has been getting
the first one wrong on every route.

> `MARKET FEED ● ALL US EXCHANGES ● LIVE`

read beside numbers that were **entirely IEX**, seen on 2026-09-22.

## What the user can see when this lands

**The chrome stops claiming the whole market while showing one exchange**, in
every connection state — and a quiet socket at 02:00 reads as correct rather
than as broken.

## Why the two halves are one task

Because **the venue word has to be decided _with_ the connection word**, and
this story owns what the cell says in every connection state:

- while `LIVE`, the numbers arriving are the **socket's** tape;
- while `DISCONNECTED` or `STALE`, the newest numbers on screen are **still the
  socket's**;
- the charts beneath are the **historical** tape throughout.

So a cell that names a venue correctly for `LIVE` and keeps naming it through
`DISCONNECTED` may be right or wrong depending on which subject the word has.
Deciding one without the other is how it went wrong the first time.

## Where the words come from, and why nothing went red

The venue comes from `GET /market-data` (`{"feed":"sip"}` — the **historical**
provider's tape) and the connection word from the socket's `feed` frames
(`{"status":"live","feed":"iex"}`). Two sources, one cell.

**`market-feed-grid.test.ts` asserts that a connection word has _a_ feed word
beside it, not that it is the right one.** That is exactly why this shipped for
four days: Task 3.4.9 built a check that walks the **selections** and it is
correct about what it checks.

**When 3.10.1's decision 4 is answered, write it into that file as the rule that
a live connection word is never beside a feed word the live tape is not.** A
check whose failure mode is _it was never about that_ is the one that lets this
recur.

## What has narrowed since the decision was framed

Story 3.9 shipped the source note's two-feed sentence from a **recorded** body,
and `All US exchanges` now has **exactly one producer**, guarded by
`the-consolidated-word-has-one-producer` with a break behind it. So _defer to
the source note_ is a live option rather than a wish: `PROVENANCE.md` §1.3 —
the chrome says what it can and the source note says what the chrome cannot.

## Criterion 5, which lands here because it is the same cell

**A quiet socket outside market hours reads as correct rather than as broken.**
`FeedStatus` is about the **connection** and `MarketSessionStatus` is about the
**session**, and they are deliberately separate — _the market being open does
not mean data is flowing, and the market being shut is not a feed failure_.

A quiet socket at 02:00 is **correct**, and the 165 s threshold does not know
that. Assert it.

## Work

- The venue word, per 3.10.1's decision, in every connection state
- The rule written into `market-feed-grid.test.ts`, with a `pnpm break` entry
- A quiet socket outside market hours asserted as correct
- The cell looked at, at four viewports, in every state it can hold
- `pnpm invariants` extended if the decision creates a second producer risk

## Done when

1. No connection state puts a live word beside a tape the live feed is not
2. The check walks the **producers** rather than one rendering, break-verified
3. A shut market is not a feed failure, asserted

---

## Handed here by Task 3.10.2 — 2026-09-24: the cell changes silently, and nothing has ever argued that it should

**You own what this cell says in every connection state. Whether it SAYS it to
a listener is the same decision and has never been taken.**

The strip is a plain `<footer>`. `AppFooter`, `FeedIndicator` and
`FeedProvenance` carry **no `aria-live` and no `role`** between them, so the
word changing from `live` to `disconnected`, and the sentence that appears
beside it, are announced to **nobody**.

**The existing argument does not cover it.** `FeedProvenance`'s _Not a live
region_ comment is correct and is about the **venue**, whose value _"cannot
change at all without a deploy and a reload"_. The **connection** half changes
while a page is open — the opposite case, and the one this cell exists for.

**And Task 3.10.2 closed the escape route.** Criterion 3 is now held by an
assertion that `main`'s entire text is **byte-identical** either side of an
outage. That is right, and it means a listener who is not in the footer has
**nothing at all** to notice: the numbers they are reading silently become
stale.

`Live in the chrome.dc.html`'s _what this did not decide_ said the listening
list should be _"one entry longer"_ on **2026-09-19**. It reached
`docs/GAPS.md` on 2026-09-24, five days and four tasks later.

**What to decide, with the constraints that already bind it:**

- The page carries **four** polite regions already, and the rule that arrived
  with the second is that **a region belongs to a subject and its sentences
  name it** (`FRONTEND-STATE.md` §7). A fifth needs that argument made, not
  assumed.
- **`role="status"` would announce on mount**, which is the commonest
  transition in a footer and the reason the venue half refused one.
- The honest middle is probably that **only the degraded transitions** speak —
  a region that is silent on mount and on a return to `live`, and says
  something when the feed stops. That is a shape this product has not built
  before, so it is a decision rather than a default.
- Whatever is chosen, **what a real screen reader does with it is the standing
  unanswerable**, and the list it joins is at five entries with an owner who is
  a person rather than a task.
