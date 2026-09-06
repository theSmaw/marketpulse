# Task 2.5.5 — The clock seam, and the header's reserved region starts working

**Status:** Not started
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
- The session state renders in the product's vocabulary, is not red, and names a holiday when
  there is one
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
