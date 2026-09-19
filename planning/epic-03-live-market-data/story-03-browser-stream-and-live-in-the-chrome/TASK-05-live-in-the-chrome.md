# Task 3.3.5 — `LIVE` in the chrome, on every route, and it is true

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.4

## Objective

**The task the user can see.** The market-feed region shows the venue **and**
the connection state, read from the running system, on all five routes.

## What the user can see when this lands

**`LIVE`, on every route, and it is true.** The first thing this epic puts on a
screen — and the first time the product says anything about the market **now**.

**What they still cannot do: see a single number change.** Prices are the last
stored close, exactly as yesterday. **The application announces it is live and
then demonstrates nothing**, which is honest and is the point of a slice. Story
3.4 fixes it.

## What is already decided and must not be re-taken

- **Beside provenance, never instead of it.** _Which venues are in these
  numbers_ and _is data arriving right now_ are two facts that fail
  independently — Task 1.12.4's two-indicators argument, applied a fourth time,
  and the reason `FeedIndicator` still ships with its consumers removed.
- **The geometry, and it is a trap already named in `STORY.md`:** `.clock` is
  `align-items: flex-end` as the end of the strip, **so a region appended after
  it takes that edge away.** This belongs **in the market-feed cell**.
- **The shape carries the state, not the colour.** `FeedIndicator` already
  answers this: only `stale` takes a colour, and `live` and `disconnected` are
  the same grey told apart by **silhouette**. **Green means price-positive in
  this product**, and a live indicator borrowing it would be the only other
  green on screen. **Colour is never the sole encoding of anything.**
- **Do not invent a pulse.** This epic owes _does it feel alive_ and **this is
  not the story that pays it** — but a static word reading `LIVE` on a screen
  where nothing moves is the **worst** available answer, worse than saying
  nothing. Keep it a statement of fact, keep it small, and leave aliveness to
  Story 3.4 rather than inventing a motion the vocabulary then has to live with.
- **The hook is called from `AppHeader`, not `App`** — measured, not argued.
  Lifting `useMarketClock` to `App` re-rendered the landing route **40 times in
  20 s against 0**, and the clock as placed produced **0 `longtask` entries over
  60 s**. A live hook faces the same choice at a higher rate.
- **A security gets no status word** (§11.2). Nothing in this task may put
  `STALE` beside a price.

## Work

- **Wire `FeedIndicator` to the hook**, in the market-feed cell, on all five
  routes from **one** hook call.
- **Render the words from 3.3.3's record**, never a string in a component. There
  is a `pnpm break` (`feed-words-in-a-renderer`) that proves a second spelling
  goes red — **run it**, because this is the task most likely to trip it.
- **`pnpm probe` the strip at 1440, 1024, 768 and 390 BEFORE the browser
  suite**, which this story's own criteria require. The masthead is **already
  known to clip at 390** and this task adds content to the same chrome. Thirty
  seconds against five minutes.
- **Measure the render count against the `useMarketClock` baseline** and record
  it. §28: no routine main-thread task over 50 ms.

### The open decision this task owns — **ask the user, do not choose quietly**

**Whether the region shows the last observation's instant ALWAYS, or only when
it is not now.**

`PRODUCT_SPEC.md` §36's own example — _"Live feed disconnected — displaying data
through 10:42:17"_ — is written for the **degraded** case. **A timestamp always
on screen is either reassuring or noise**, and no document has taken that
judgement. Story 3.1 settled the other open decision (§9.4: `LIVE` means the
feed is healthy) and did **not** settle this one.

**It is a product judgement rather than a measurement**, so it is the owner's.
Put it to them **out loud** rather than deciding it in this file.

## Done when

- The region shows venue **and** state on all five routes, read from the running
  system — **not hard-coded**, which is the defect it shipped with from Story
  1.5 to Story 2.6
- The words come from 3.3.3's record; `pnpm break feed-words-in-a-renderer`
  passes
- `pnpm probe` was run at four widths **before** the browser suite, and the 390
  result is looked at rather than assumed
- The render count is measured against the `useMarketClock` baseline
- **No datum on any screen changed** — asserted, not assumed
- The instant decision is **answered by the owner** and recorded with its
  reasoning
- `pnpm verify` passes
