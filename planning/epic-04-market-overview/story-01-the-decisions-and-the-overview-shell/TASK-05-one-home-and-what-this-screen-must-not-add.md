# Task 4.1.5 — One home, and what this screen must not add

**Status:** **Complete — 2026-09-25. The clock now has a check, not only a convention.** The producer walk found the route's transitive import closure is **fifteen files** and not one of them renders a clock, a session word or a connection word. The guard added is **`one-caller-of-the-market-clock`** (29 invariants now hold), written in the shape of `one-caller-of-the-live-feed-hook` because they are the same rule about different subjects — and the two existing word checks were **reused rather than extended**, because they already cover this route.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.4

## Objective

**The overview is the screen most likely to grow a second clock**, and this
product has already produced that defect four times on one screen.

`PRODUCT_SPEC.md` §9's own sketch puts `LIVE` and `10:42:16 ET` in the
masthead — which **already exist**: the market clock shipped in Story 2.5 and
the feed cell in Story 2.6, with the connection word added by Epic 3. Epic 4's
`EPIC.md` says it in as many words: _"live market status indicators here means
the **connection** state Epic 3 adds beside them, not a second clock."_

**So this task's deliverable is a guard rather than a feature**, and the reason
it is a task is that the rule has been broken before by people who knew it:

- **`FeedStatus` is about the CONNECTION and `MarketSessionStatus` about the
  SESSION**, and collapsing them produced a cell that answered two questions
  and said which for neither, for four days.
- **The connection has ONE home** — the status bar — and every other surface
  stays quiet by decision (ADR 0029's fourth rule; three separate tasks took it
  with measurements).

## What the user can see when this lands

**Nothing new, and nothing duplicated.** The landing page carries the same
clock and the same feed cell as every other route, in the same place.

## Work

- The route confirmed to render **no** second clock, session word or connection
  word — by walking the producers rather than by looking at a screen, which is
  what `market-feed-grid.test.ts` established as the shape of this check
- **A mechanical guard**: the connection and session vocabularies must not
  appear in this route's own markup. `pnpm invariants` already holds
  `connection-words-in-a-renderer` and `feed-words-in-a-renderer` — extend or
  reuse rather than inventing a third
- The break run, and the entry added in the same change
- **The open question recorded rather than answered here**: whether an
  aggregate region needs its own freshness statement is Story 4.4's, and it is
  not the same thing as a connection word

## Done when

1. Nothing on `/` reports the connection or the session except the chrome
2. A check fails if that changes, and it has been proved red
3. The distinction between _the feed stopped_ and _the market is shut_ has
   exactly one home on this screen, and it is the one it has everywhere else

## Amended by Task 4.1.1 — 2026-09-25: this screen will carry TWO kinds of "how current is this", and they must not be confused

**The denominator decision is taken and it puts a freshness sentence on
screen**: _of the 518 we track, N were heard from in the last M minutes_
(Story 4.4).

**That is a second statement about currency on a screen whose chrome already
makes one**, and the two answer different questions:

| Says                              | About                                                                   | Home                             |
| --------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `LIVE` / `STALE` / `DISCONNECTED` | **the connection** — is data arriving at all                            | the status bar, and nowhere else |
| _N of 518 in the last M minutes_  | **the coverage of one figure** — how much of the market this number saw | beside the figure it qualifies   |

**They can legitimately disagree**, and that is the point rather than a defect:
a healthy `LIVE` feed with 340 of 518 names heard from in the last two minutes
is the ordinary state of IEX, and a reader must not read the denominator as a
feed fault.

### What this adds to this task

- **The guard is not "no currency statements outside the chrome"** — that would
  forbid the denominator. It is **no connection or session vocabulary** outside
  the chrome, which is what `connection-words-in-a-renderer` and
  `feed-words-in-a-renderer` already assert.
- **Check the denominator's wording against those two checks before Story 4.4
  writes it.** A sentence that reaches for `live`, `stale` or `disconnected` to
  describe coverage would trip a guard that exists for a different reason — and
  would deserve to.
- **Record the distinction where Story 4.4 will read it**, in its own words,
  rather than leaving it here.

## Amended by Task 4.1.4 — 2026-09-25: the route got small, and one new invariant looks like the opposite of this task's

**The check this task owes is now nearly trivial to perform**, and that is worth
saying rather than discovering. After Task 4.1.4 the route file is **135 lines
and imports two things**: `Region`, and its own stylesheet. It renders no
component that could carry a clock, a session word or a connection word, and
**walking the producers is reading one import list**.

**Do the walk anyway.** The point of the check is not its difficulty; it is that
the next author who adds a component here has a recorded reason not to reach for
`FeedIndicator`.

### And one thing that will look like a contradiction

Task 4.1.4 added **`the-workspace-package-reaches-the-bundle`**, which asserts
the live feed's sentence — _Trades reported by the IEX exchange only…_ — **is in
the frontend bundle.** Beside it sits `feed-words-in-a-renderer`, which asserts
feed words are **not** in a renderer.

**They are not in tension and a reader should not have to work that out.** One
is about the **package reaching the browser at all**; the other is about
**which module may spell the words**. The sentence belongs to shared, ships in
the bundle, and is rendered by the surface that owns provenance — all three at
once.

**Whatever guard this task adds must be written so the pair still reads as two
questions rather than one contradiction**, and if the cheapest way to do that is
a sentence in the invariant's own comment, write the sentence.

---

## What was done — 2026-09-25

### The walk, and it is the deliverable rather than a formality

**The route's transitive import closure is fifteen files.** Computed rather than
read: start at `MarketOverview.tsx`, follow every relative import to fixpoint.

```text
routes/MarketOverview.tsx        components/Panel/Panel.tsx
routes/MarketOverview.module.css components/Panel/Panel.module.css
components/Region/Region.tsx     components/ErrorBoundary/ErrorBoundary.tsx
components/Region/Region.module.css components/ErrorFallback/ErrorFallback.tsx
components/Button/Button.tsx     components/ErrorFallback/ErrorFallback.module.css
components/Button/Button.module.css components/Icon/Icon.tsx
cx.ts                            components/Icon/Icon.module.css
styles/a11y.module.css
```

**`FeedIndicator`, `MarketClock`, `BackendIndicator`, `AppHeader` and
`AppFooter` appear in none of them.** The landing route cannot report the
connection or the session, because it cannot reach anything that does.

> **That is a fact about today and it is why the walk is not the deliverable on
> its own.** The route imported five components a week ago and imports two now;
> the number that matters is what stops it importing a sixth.

### What was reused, and the check that was not needed

**`one-home-for-the-feed-words` already covers this route.** It scans
`apps/frontend/src` entire — routes included — for seven literals across the
feed and connection vocabularies, reading through `withoutComments` so a doc
comment cannot trip it. **A third check scoped to one route would have been a
second spelling of a rule that already holds everywhere**, which is the defect
this task exists to prevent, arriving through the task itself.

**One correction came out of reading it.** Task 4.1.4's new invariant names
`feed-words-in-a-renderer` as the thing keeping the feed sentence unique. That
is the **break**; the invariant is `one-home-for-the-feed-words`. Corrected in
place, because a comment naming the wrong guard is how somebody later goes
looking for a check that is not there.

### What was added: the clock has one caller, asserted

**`one-caller-of-the-market-clock`** — shipped frontend code calls
`useMarketClock` exactly once, and that once is `AppHeader`.

**§9's own sketch is why this screen needed it.** It draws
`LIVE   10:42:16 ET` across the top of the Market Overview, and a reader
building from the sketch reaches for a clock in the route. Both halves of that
line already exist and neither is the route's.

**Two reasons, and the second is measured rather than tidy:**

- **One home.** A page where two surfaces answer _what time is it in the
  market_ is a page where they can disagree, and this product has produced the
  two-surfaces defect **four times on one screen**.
- **Render cost.** `useMarketClock` ticks, so its caller re-renders every
  second. In `AppHeader` that is **0** whole-route re-renders in 20 s; lifted to
  `App` it was **40**. A second caller in a route puts that on the page that is
  about to hold four aggregates over 518 securities — Epic 14's trigger by
  condition.

**Written in the shape of `one-caller-of-the-live-feed-hook`, deliberately.**
They are the same rule about different subjects, and a reader meeting one should
recognise the other. Same call-site walk, same `withoutComments`, same
_a grep that matches nothing looks exactly like a grep that passes_ guard on the
zero case.

**`pnpm break a-second-clock-on-the-landing-page`** adds `useMarketClock()` to
the route — the exact thing §9's sketch invites — and goes red. Run and
restored byte-identical.

### The distinction handed to Story 4.4 in its own words

This screen will carry **two** statements about currency, and they answer
different questions:

| Says                              | About                          | Home              |
| --------------------------------- | ------------------------------ | ----------------- |
| `LIVE` / `STALE` / `DISCONNECTED` | the **connection**             | the status bar    |
| _N of 518 in the last M minutes_  | the **coverage of one figure** | beside the figure |

**A healthy `LIVE` feed with 341 of 518 heard from in five minutes is the
ordinary state of IEX.** So the denominator is not a fault report, must not
reach for `live`/`stale`/`disconnected` — which would trip
`one-home-for-the-feed-words`, and **would deserve to** — and qualifies a figure
rather than the screen. Written into Story 4.4's own file rather than left here.

### Gates

`pnpm verify` green with **29 invariants**. `pnpm links` green. The new break
run red and restored byte-identical.

## For a stakeholder — a status report, 2026-09-25

### What this was

**A rule turned into a mechanism**, on the screen most likely to break it.

Our specification's own sketch of the landing page draws a clock and a live
indicator across the top of it. Both of those already exist — they live in the
application's frame, visible on every screen — and drawing them again on this
one page is the kind of duplication that looks harmless until the two disagree.

**We have made that mistake four times already, on one screen**, which is why
this got a task of its own rather than a code review comment.

### What we found

**The landing page cannot currently break the rule.** We traced everything it is
able to reach — fifteen files — and not one of them is capable of showing a
clock or a connection status.

> **That is a fact about today, not a guarantee.** A week ago the same page
> reached five components; today it reaches two. The useful question is not
> _is it right now_ but _what stops the next person getting it wrong_.

### What we added

**A check that fails the build if a second clock appears anywhere in the
application.** There is now exactly one place in the product that reads the
market clock, and if a second appears the build says so by name.

We also deliberately broke it — added the second clock, confirmed the build went
red, and put it back — because a safeguard nobody has ever seen fail is a
safeguard nobody has tested. That is the third time this week that discipline
has paid: two of the last three tasks found documented safeguards that turned
out to be sentences rather than mechanisms.

> **There is a second reason beyond tidiness, and it is measured.** The clock
> ticks every second, so whatever holds it redraws every second. In its current
> home that costs nothing; moved one level up, it previously caused **forty**
> full-page redraws in twenty seconds. This landing page is about to carry four
> live summaries of five hundred companies, and it is the last page that can
> afford a needless redraw every second.

### One thing we deliberately did not do

The page will soon carry a second kind of "how current is this" — a line saying
how many of the market's companies a figure could actually see. **That is not
the same statement as "is the feed working", and we wrote down the difference
before building either**, so the two cannot be mistaken for each other by
whoever builds them.

### Where this leaves the work

**The landing page's structure is finished and guarded.** What remains in this
piece of work is a measurement, one question that needs a real phone, and the
close — and then the filling starts: four live index figures, eleven sectors,
market breadth and the day's biggest movers.
