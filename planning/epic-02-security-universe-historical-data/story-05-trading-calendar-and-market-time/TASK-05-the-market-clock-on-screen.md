# Task 2.5.5 — The clock seam, and the header's reserved region starts working

**Status:** Complete (2026-09-06)
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Task 2.5.4

## Objective

Build the one place that answers "what time is it, in market terms" — the seam Epic 13
substitutes a replay clock into — and spend it immediately on the visible thing this epic
has been reserving since Story 1.5: **the `--:--:-- ET` region in the chrome becomes a real
market clock, on every route, with the session state beside it.**

## What the user can see when this lands

**A working clock in the header, on all five routes, telling market time in ET regardless of
where the viewer is** — and, next to it, whether the market is open, closed, in a half day,
or closed for a named holiday.

This is the story's only visible task and it is the cheapest visible win in the epic: the
space is already reserved, the layout already accounts for it, and everything behind it was
built by Tasks 2.5.2 to 2.5.4. It is also the first thing on this product's screen that is
**alive** in PRODUCT_SPEC §5.6's sense — a market application whose every number is static
reads as dead, and up to now every one of them has been.

## The scope decision this task resolves

`STORY.md`'s "Out of scope" list says the header's clock region _stays reserved and Epic 3
fills it_, while its own "What the user can see" section calls the clock an **open decision**
and the cheapest visible win available. Those contradict each other, and this task is the
resolution: **the clock ships here.** The argument is that a clock is a fact about the
_calendar_, not about the data feed — it needs a timezone and a session definition, both of
which exist after Task 2.5.4, and none of Epic 3's live feed. Waiting would be deferring a
finished thing.

What stays Epic 3's is unchanged and must not be quietly absorbed: the **feed** indicator
beside it, the `LIVE` state in §9's sketch, and anything that claims data is arriving.
`STORY.md` is amended accordingly rather than left contradicting itself.

## Work

- **Build the seam first and keep it one module.** One function answering the current market
  instant, one place reading `Date.now()`, everything else in the story a pure function of an
  argument. Write the Epic 13 note beside it: a replay clock replaces _this_ and nothing
  else. That is invariant 4's retrofit warning honoured at the one moment it is cheap
- **The frontend needs a hook and the hook is not `useBackendHealth` again.** It is a timer,
  not a network loop: no request, no failure states, no `AbortController`. What it does share
  is the two decisions that hook already took and that must not be re-taken differently — a
  **hidden tab does not tick**, and a returning tab updates immediately rather than showing a
  stale time for up to a second
- **Answer the re-render cost before shipping it, because the arithmetic changed.** Task
  1.12.5 accepted a whole-tree re-render on every health poll with the measurement beside it:
  2 renders a minute, zero long tasks, zero header DOM mutations. **A 1 Hz clock is sixty
  times that rate and it mutates the DOM every single tick**, which is exactly the reversal
  trigger that decision recorded ("a second consumer or Epic 3's rate"). So the trigger has
  fired: keep the state **local to the clock component** rather than lifting it to `App`, and
  say so, rather than repeating the accepted-whole-tree-re-render argument at a rate it was
  not measured at. Then measure it — `longtask` entries and header mutations, the same
  instruments Tasks 1.12.6 and 1.12.8 used
- **Tick on the second boundary, not every 1000 ms.** A naive interval drifts and visibly
  skips a second every minute or so. Schedule to the next second boundary, which is also what
  makes a returning hidden tab correct for free
- **Two constraints Task 2.5.2 created that this task meets first, not last
  (added 2026-09-06).** `eslint.config.mjs` now carries two `no-restricted-syntax`
  rules whose single exception is `packages/shared/src/market-time.ts`: one forbids
  constructing an `Intl.DateTimeFormat` anywhere else in the workspace, one forbids
  spelling `America/New_York` anywhere else. Both were made to fail before being
  believed. So the clock component **cannot** reach for `Intl` to render its zone
  label and must not try — `marketOffsetAt(instant)` returns
  `{ minutes, abbreviation, iso }` and the `abbreviation` is where a zone label
  comes from. `pnpm verify` fails if this is got wrong, which is the intended
  outcome and is better than discovering it in review.
- **`ET` and `EDT`/`EST` are different claims, and this task has to pick — a
  decision no file in this story has taken yet (added 2026-09-06).**
  `PRODUCT_SPEC.md` §9's sketch reads `10:42:16 ET`, and the reserved placeholder
  in the chrome is `--:--:-- ET`, so `ET` is what the product has always promised.
  But `marketOffsetAt` reports what is actually in effect — `EDT` in summer, `EST`
  in winter — and `ET` is the generic name for the pair. Both are defensible and
  they are not the same statement: `ET` is a fixed-width literal that never lies
  and never tells you which side of the transition you are on, while `EDT`/`EST`
  is strictly more informative and **changes meaning twice a year**, which is the
  kind of change a reader notices and cannot explain. Whichever is chosen, record
  it, and note the third option that looks clever and is not: showing the offset
  (`-04:00`) is precise, unreadable at a glance, and not what any trader calls it
- **The clock is the ONE caller that cannot avoid going out of the calendar's range, and
  this task has to decide what it does then (added 2026-09-06, from Task 2.5.3).** Every
  other consumer of the calendar is handed a date by a user or a query and can refuse it.
  This one reads `Date.now()`, so its input is always today, and **on 2029-01-01 the calendar
  will throw `MarketCalendarRangeError` at it** — which, in a React component, means the
  nearest `ErrorBoundary` catches it and the entire chrome is replaced by a fallback. The
  header disappears on New Year's Day, on every route, for a reason nobody debugging it at
  the time will guess.
  That is not an argument against the refusal — Task 2.5.3 chose it deliberately and there is
  no flag to turn it off, for `instantFromMarketTime`'s reason. It is an argument that **the
  clock must catch it and degrade rather than propagate**, and the shape that costs nothing
  is already available: the **time** is a pure timezone conversion that works forever, and
  only the **session state** needs the calendar. So a clock past the range shows the time and
  says it does not know whether the market is open, which is honest, is §36's
  degrade-locally rule applied, and is strictly better than either a blank header or a
  confident guess. Decide it, write it beside the `catch`, and **test it by moving the
  clock's instant past 2028-12-31** rather than by waiting.
  **Two things Task 2.5.4 makes precise (added 2026-09-06).** The throw comes from exactly
  **one** call — `marketSessionStateAt(instant)` — so the `catch` wraps one line rather than
  the render, and it must catch **`MarketCalendarRangeError` by type and rethrow anything
  else**: a bare `catch` there would also swallow a `MarketTimeError` and any genuine bug in
  the session functions, turning "the header degraded honestly" into "the header hides
  faults". And **the test needs no fake timers and no clock mocking at all**, because
  everything below the seam is a pure function of the instant it is given: call
  `marketSessionStateAt(new Date("2029-01-02T15:00:00Z"))` and assert it throws, then assert
  the component's own degraded rendering. That is the seam paying for itself the first time
  it is used.
  Note what this also does: it turns `MARKET_CALENDAR_PROVENANCE.nextEditDue` from a note in
  a file into a date with a visible consequence, which is worth saying in the write-up
- **A closure has a NAME now, and it is not always a holiday (added 2026-09-06).** Task
  2.5.3's rows carry one, so _closed for Thanksgiving_ is ~~`marketCalendarExceptionOn(date)`~~
  **already on the state `marketSessionStateAt` returns — see the bullet below; do NOT call
  the calendar a second time, because that is a second call site that can throw the range
  error (corrected 2026-09-06 by Task 2.5.4)** and needs no second table of names. But the copy around it has to survive the row that
  reads **`National Day of Mourning (President Carter)`** — a real row, in range, at
  `2025-01-09`. A label template of "Closed for the holiday: X" is wrong for it, and so is
  anything that assumes the name is short or annual. **"Closed — X" is the shape that works
  for both**, and this is a case where the calendar being read off the published record
  rather than derived from rules changes what the interface can say
- **What Task 2.5.4 actually shipped, so this task builds on it rather than beside it
  (added 2026-09-06).** `packages/shared/src/market-session.ts` exports
  `marketSessionStateAt(instant)`, `marketSessionOn(date)`, `previousMarketSession`,
  `nextMarketSession`, `marketSessionsBetween`, `lastMarketSessions`,
  `MARKET_SESSION_OPEN`/`MARKET_SESSION_CLOSE` and `MARKET_SESSION_STATUSES`. **This task
  needs exactly one of them: `marketSessionStateAt(instant)`.** It returns a discriminated
  union of **five** members, and the copy bullets in this file describe **four** renderings,
  so the mapping is a decision this task owes rather than a transcription:
  - `open` — the market is trading.
  - `before_open` and `after_close` are **two different states that both mean "closed", and
    the difference is worth rendering.** Before the bell, "opens at 09:30" is the useful
    sentence; after it, the useful one names the close that already happened. Collapsing them
    is defensible and must be a **decision** rather than an oversight, because a union member
    silently rendered identically to another is the boolean this story rejected, rebuilt.
  - `holiday` — carries `name` **on the state itself**, so nothing here reads the calendar.
  - `weekend` — carries nothing, because there is nothing to say.

  All three weekday members carry `session`, which is where "closing early at 13:00" comes
  from: **that is not a state member, it is `session.isEarlyClose` plus `session.close`.** So
  the half-day sentence is available in `before_open` and in `open` (future tense, "closes
  early at 13:00 today") and in `after_close` (past tense), which is a third reason those two
  are not interchangeable. `MARKET_SESSION_STATUSES` exists so the component can switch
  exhaustively rather than defaulting.

- **The seam's home is this task's decision and Task 2.5.4 pre-empted it in a comment
  (added 2026-09-06).** `market-session.ts`'s module comment asserts that the one module
  reading the wall clock is "Task 2.5.5's, in `apps/frontend`". `CALENDAR.md` §3.3 is looser
  and names **two** things replay replaces — a shared/backend function answering _what
  instant is it now_, and this task's frontend hook. Nothing in `apps/backend` needs "now"
  yet, so shipping only the frontend half is defensible; what is **not** acceptable is
  shipping it elsewhere and leaving that comment claiming otherwise. **Decide, and if it does
  not land in `apps/frontend`, amend `market-session.ts`'s comment in the same change.** The
  `Date.now()` lint rule `CALENDAR.md` §3.4 defers to this task is the same decision: it
  needs to name the module that exists.

- **Apply the formatting decisions that already exist rather than inventing new ones.**
  `tabular-nums` is inherited from `body` and must not be re-declared; the hand-rolled
  formatter idiom over `toLocaleTimeString` is Task 1.12.4's and its reason (a
  locale-dependent string changes width, which tabular figures cannot fix) applies here with
  more force, because this one changes every second. The `AppHeader` comment already predicts
  the one-off width shift when `--:--:--` becomes real digits — pay it and confirm it is
  the small shift it predicted rather than a layout jump
- **Say what state the market is in, and say it in the product's own vocabulary rather than
  a boolean.** Open, closed, and — the ones the calendar bought and a boolean throws away —
  _closed for Thanksgiving_, _closing early at 13:00_. §36's rule applies directly: a closed
  market is a **product state and not a failure**, so nothing here is `--status-error` red,
  and the marker language is the one `FeedIndicator` and `BackendIndicator` already share by
  imitation. Note the cost that convention already carries: a third component copying that
  language means a change to it is now three edits
- **This is a UI task and the bar is the standing one.** `VISUAL-LANGUAGE.md`'s _The bar_
  outranks the rest of that document: it must not read as a default admin panel, and
  correct-and-accessible is the floor. Two specific opportunities, both cheap because the
  token layer already exists: this is the first natural home for the **motion tokens** Task
  2.4.4 added — a state _change_ (open → closed) is a transition, where a digit changing is
  not — and `prefers-reduced-motion` is already answered once in `tokens.css`, so honouring
  it costs nothing here
- **Do not make it a live region.** A `role="status"` that announces the time every second is
  unusable with a screen reader. The **session state** changing is worth announcing; the
  seconds are not. Give the time an accessible name that says it is market time in ET, and
  check it in the a11y panel and in the browser suite's axe gate the way Task 2.4.5 did
- **Add a browser journey**, in `e2e/`: the clock renders on a route, it is not the
  placeholder, and it **advances** — which is the assertion that fails if the timer was never
  wired, and the one a unit test with fake timers cannot make. Note `e2e/README.md`'s rules
  before writing it, in particular that a spec must not assert a _value_ that changes on its
  own — assert that it changed, and that it matches the shape
- **Decide, and record, whether the clock is trusted from the browser or from the server.**
  A viewer's machine clock can be wrong by minutes, and a market clock that disagrees with
  the market is worse than no clock. The cheap honest answer for this story is that it is the
  **viewer's clock rendered in market time**, which is a timezone claim rather than a
  synchronisation claim — say that, and name server-supplied time as Epic 3's when there is
  a feed to take it from

## Done when

- One module reads the wall clock; every other function in this story takes an instant
- The header's clock shows ET on all five routes, advances on the second, and does not tick
  in a hidden tab
- The session state renders in the product's vocabulary, is not red, and names a closure when
  there is one — including one whose name is not a holiday
- A clock past the calendar's covered range shows the time and declines to claim a session
  state, rather than throwing into the header's error boundary; asserted by moving the
  instant rather than by waiting for 2029
- Seconds are not announced to a screen reader; the axe gate is unchanged and green
- A browser journey asserts the clock advances
- The re-render cost is measured rather than inherited, and the local-state decision is
  recorded beside the reversal trigger it fires
- `pnpm verify` passes with no database running

## Notes

The failure to avoid is a clock that implies more than it knows. It says what time it is in
the market and whether the market is open. It does **not** say data is arriving, and nothing
about it should read as `LIVE` — that word belongs to Epic 3 and putting it here would be the
first thing in this product that overstates its own evidence.

---

## What was built, in plain language — a status report for stakeholders

### The short version

**MarketPulse now has a working clock in its header, on every page, and beside it a
plain-English statement of whether the US stock market is open.** It is the first thing on
this product's screen that moves on its own.

That sounds small. It is the visible tip of five tasks of invisible work, and it is the
first time any of that work has been pointed at a user.

### What you will actually see

Open the application and look at the top-right of the header. Where there used to be
`--:--:-- ET` — a deliberate placeholder that never pretended to be a time — there is now a
live clock ticking once a second, and under it a short status:

```
MARKET CLOCK
15:42:07 ET
● OPEN
  Closes at 16:00
```

Come back at the weekend and it reads `CLOSED / Weekend`. On Thanksgiving it reads
`CLOSED / Thanksgiving Day`. On the half day after Thanksgiving it reads
`OPEN / Closes early at 13:00` in the morning and `CLOSED / Closed early at 13:00` in the
afternoon.

### Why this matters more than a clock usually would

Three reasons, in order of how much they matter to the product.

**1. It is the first sign of life.** The product specification is unusually blunt about
this: a market application whose every number sits still "is technically correct and feels
dead". Until today every figure on every screen of MarketPulse was static — a table of
securities that loads once, a status indicator that changes twice a minute at most. A
stakeholder shown the product could be told it was live and had no way to see it. Now there
is something on screen that is visibly, continuously true.

**2. It is the right time, wherever you are.** The clock does not show your computer's
time. It shows New York's, converted properly, including the twice-a-year daylight-saving
change. That is the point of the four tasks that came before this one, and this is the first
place anybody can see whether they worked. Someone demonstrating this product from London or
Singapore sees the same time an analyst in New York sees, which is the only useful thing for
a market clock to show.

**3. It tells you something a clock alone cannot.** "Is the market open?" sounds like a
yes/no question and is not. There are four different reasons the market might be shut — it
is early morning, it is late evening, it is a public holiday, or it is the weekend — and a
trader cares about the difference. Before the bell you want to know when it opens; after the
close you want to know that it _has_ closed rather than that it never opened. And "the
market closes early today at 1pm" is a fact that a simple open/closed switch throws away
entirely, and one that matters: half-days are real, and data pipelines that do not know about
them quietly report a third of a day's trading as missing.

### The decisions worth explaining

**We say `ET`, not `EDT` or `EST`.** New York's time zone has two names — one for summer,
one for winter — and the software knows which is in effect. We deliberately do not show it.
`ET` is what the product's own design has promised since day one, it is what a trader
actually says out loud ("the market opens 9:30 ET"), it is always true, and it never changes
width in a strip where things sitting still matters. Showing `EDT` in July and `EST` in
December would be strictly more information that nobody asked for, changing twice a year in a
way a reader notices and cannot explain. The precise name is still available to the parts of
the system where an exact offset is the point — a chart's axis, a log entry.

**The clock is your computer's clock, shown in market time — and we are explicit that this
is a _time-zone_ claim and not a _synchronisation_ one.** If a viewer's laptop is three
minutes fast, this clock is three minutes fast. Nothing in the product today has a better
source of truth: the server reports how long it has been running, not what time it is, and
inventing a time authority for a header would be over-engineering. When Epic 3 brings the
live market feed, that feed carries exchange timestamps and the clock can take its time from
there — and because of how this was built, that is a change to one small file and to nothing
else.

**We built it so it does not slow the application down, and we measured that rather than
assuming it.** A clock that updates once a second is sixty times more frequent than anything
else in this product, and the naive way to build it would cause the entire page — including
a table of a hundred securities — to be recalculated every single second. We deliberately
confined it to the header. Then we measured both ways: with our arrangement the page content
was recalculated **zero** times across twenty seconds of ticking; with the naive arrangement
it was recalculated **forty** times. Over a full minute of ticking, the browser recorded no
slow frames at all, and the only thing that changed on screen was the clock's own digits.
That headroom matters because Epic 3 will bring live prices updating far faster than once a
second, and this is the shape that work inherits.

**It stops ticking when you are not looking at it.** A tab left open in the background does
no work, and catches up the instant you return to it. That is the same courtesy the backend
status indicator already extends, and it exists because a browser tab somebody forgot about
should not be burning battery to redraw a clock nobody is reading.

**A closed market is not an error.** Nothing about this indicator is red, and that is a
deliberate rule the product follows everywhere: the market being shut is what the market does
for two-thirds of every week. The status is shown by the _shape_ of a small marker — solid
when open, hollow when closed — rather than by colour, so it remains readable to someone who
cannot distinguish the colours we would otherwise have used.

**It does not say `LIVE`.** The original design sketch for this header has the word `LIVE`
next to the clock. We deliberately did not add it. `LIVE` is a claim that market _data is
arriving_, and no market data arrives in this product yet — that is Epic 3. Putting the word
there because the sketch shows it would be the first place this product overstated what it
actually knows, and the whole architecture is built around not doing that. The indicator two
cells to the left still correctly reads `DISCONNECTED`.

### The one that will save somebody a very confusing day

Our trading calendar is a hand-checked table of every US market holiday and early close from
2024 through 2028 — because that is exactly as far as the New York Stock Exchange publishes.
Ask it about a date it does not cover and it **refuses to answer**, deliberately, rather than
guessing that there were no holidays that year.

That refusal is correct everywhere else in the system, because everywhere else is handed a
date by a query and can decline it. **The clock is the one place that cannot**, because it
reads today's date, and on 1 January 2029 today's date will be outside the table.

Left alone, that would have taken the _entire header_ off every page of the application, on
New Year's Day, for a reason nobody debugging it at the time would have guessed.

So the clock catches that specific case and degrades honestly: it keeps showing the time —
which is a time-zone conversion that works for ever and needs no calendar — and says
`UNKNOWN / Trading calendar ends 2028-12-31` instead of guessing whether the market is open.
Rather than wait three years to find out whether that works, we tested it by asking the clock
what time it is in 2029. It does the right thing. And it catches _only_ that specific
problem — any other fault still surfaces loudly, because a component that hides faults is
worse than one that shows them.

That message also turns a note in a file into something with a visible consequence: the
calendar carries a reminder that it needs extending in 2028, and this is the one place in
the running product that will ever tell anybody the reminder was missed.

### How we know it works

- **17 automated tests** on the clock's engine, and **11** on what it renders — including
  the two states that cannot be produced in a browser at all: a public holiday, and a date
  past 2028.
- **2 browser tests** driving a real Chrome against the real application. One of them makes
  the assertion no cheaper test can: **the clock advances**. A clock that renders correctly
  once and then freezes looks perfect to every other kind of test. We deliberately broke the
  timer to confirm that test goes red — it does, in under six seconds, while everything else
  stays green.
- **Every check was made to fail before it was believed.** Six deliberate breaks, each
  reverted. One of them taught us something: our first attempt to test "a hidden tab does not
  tick" passed even with the safeguard removed, because a different safeguard was covering
  for it. We wrote the missing test rather than accepting a green result we could not
  explain.
- **The accessibility audit is unchanged**: zero violations across every page, at three
  screen sizes, exactly as before this task. The clock announces itself to a screen reader
  as "Market time, US Eastern" rather than as two bare letters, and it deliberately does
  _not_ read the seconds aloud, which would make the page unusable.
- **The full quality gate passes** with 466 automated tests across the project, plus 23
  browser journeys and 61 database tests.
- **The component workshop earned its keep.** Reviewing all six states side by side showed a
  layout fault — on a long closure name, the small status dot drifted away from the word it
  belongs to — that the running application could not have shown us on an ordinary day,
  because it only appears on one specific historical date. Fixed before anyone saw it.

### What this cost, honestly

The application's download grew by about 11.7 kB — roughly 3%. Around 3.9 kB of that is the
trading calendar itself: sixty hand-verified rows of real holidays and early closes, now
travelling to the browser for the first time because this is the first screen that needs
them. That was a known and accepted price, and an earlier decision in this story — keeping
those dates as plain text rather than wrapping each one — is what stops it being larger.

### What this unlocks

The clock is the visible payoff, but the durable thing this task built is a **single place
in the entire system that asks what time it is**. Everything else — every session
calculation, every holiday lookup, every "last five trading days" — is handed a moment in
time rather than looking one up.

That is the foundation of MarketPulse's signature feature. Market Replay lets a user wind the
clock back to 11:07 on a past trading day and see only what was knowable at that moment.
Making that work means substituting a different answer to "what time is it" — and because of
how this was built, that is a change to **one file**, not to every screen in the product. We
also added an automatic check that enforces it: the shared code that all this rests on is now
forbidden from reading the clock at all, and the build fails if anyone tries.

The next task closes the story with its architecture record. After that, Epic 2 continues
towards historical price data — and the chart it eventually draws will have a correct time
axis, with no weekend gaps and no holidays plotted as trading days, because of the work in
this story.
