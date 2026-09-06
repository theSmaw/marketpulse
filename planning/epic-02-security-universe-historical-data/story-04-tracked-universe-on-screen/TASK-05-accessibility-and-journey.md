# Task 2.4.5 — Keyboard, screen reader, and the browser journey

**Status:** Complete (2026-09-06)
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.4

## Objective

Make the first data-bearing page in this product usable without a mouse and legible to a
screen reader, and put a browser journey behind it so it stays that way.

## What the user can see when this lands

**Nothing changes visually for a mouse user, and the page becomes usable for everyone else.**
Concretely: the table can be reached and scrolled by keyboard, the summary is announced
before the rows rather than after, and the three states are announced when they change
rather than silently replacing each other.

That last one is the part a sighted reviewer will not notice and a screen-reader user
cannot miss: a region that swaps "Loading" for 101 rows without announcing it is a page that
appears to do nothing.

## Work

- **Run the axe gate and expect it to find something.** The bar is Story 1.13's — zero
  violations, asserted in a real browser, with `incomplete` attached as an annotation that
  cannot fail anything. The gate has form on this exact class of page: it found
  `scrollable-region-focusable` on its very first run in CI, a **real WCAG 2.1.1 defect that
  had stood for five stories**, because a `Region` takes its own overflow and a scrolling
  container that cannot be reached by keyboard is unreachable content. A table of 101 rows
  inside a region is precisely that shape again
- **Check it at more than one viewport.** That defect reproduced only at a viewport 160px
  shorter than the development machine's, which is why it went unseen locally and appeared
  on the runner. 720, 560 and 480px is the set Story 1.13 used
- **Decide how a state change is announced**, and prefer the smallest correct thing. A live
  region is the obvious answer and it is easy to make worse than nothing — one that
  announces every render, or that reads the whole table, is noise a user cannot turn off
- **Write the browser journey into `e2e/specs/`**, and read `e2e/README.md` before writing
  it, because it holds the must-not-assert list. Two entries apply directly here: do not
  assert on colour, and do not use `innerText()`, which reports the CSS-transformed string
  where the DOM and every Playwright matcher see the real one
- **Assert on roles and accessible names rather than on classes or structure**, which is
  what makes the journey survive Task 2.4.4's presentation decisions being revisited
- **Do not intercept the route to fake the data.** Story 1.13 measured that `route.fulfill()`
  bypasses the browser's CORS check entirely, so a journey built on interception cannot see
  the one failure the deployed check exists for. The failure states are worth producing by
  intercepting; the healthy path must drive the real pair
- **Note what a green journey does not certify**, in the shape ADR 0013 uses — it does not
  certify that the data is correct, only that the page rendered what the API returned

## Done when

- Zero axe violations at three viewports, with the reading recorded
- The table is reachable and operable by keyboard, produced rather than assumed
- A state change is announced, and the announcement was listened to rather than inspected
- A browser journey covers the healthy path against the real pair and the failed path by
  interception, and each was seen to fail for its own reason
- `pnpm e2e` passes and the new journey's cost in wall time is recorded

## Notes

This is the first table in the product and the first page whose content arrives
asynchronously. Both patterns repeat — Stories 2.11, 2.12, 2.13 and every epic after — so
what is decided here about announcing a state change is decided for all of them.

---

## Amended 2026-09-06, after Task 2.4.3

Three things this file did not know. None changes its scope or position, and the first is a
half-decision this task has to **re-take rather than make**, which is worse than an open
question because it looks finished.

### An `aria-live` already ships, and it is probably the wrong one

This file says to "decide how a state change is announced, and prefer the smallest correct
thing", noting that a live region is easy to make worse than nothing. Task 2.4.3 shipped
`aria-live="polite"` on the **loading** paragraph, which is the reflex answer and is very
likely wrong in the specific way this file warns about: it announces _"Loading the tracked
universe"_ and then says nothing at all when 101 rows replace it, because the announcing
element is the thing that gets removed. So a screen-reader user is told the page has started
and never told it finished — which is the exact failure this file describes as "a page that
appears to do nothing", arriving through the mechanism that was supposed to prevent it.

**Treat it as a defect to reproduce, not as an implementation to keep.** It was written to
put _something_ honest in the markup rather than to settle the question, and the plausible
answers all move it: a live region wrapping the **content slot** so the announcement is
whatever replaces the loading line; a `role="status"` on the settled state; or nothing at
all, on the argument that a page whose main content changes is announced by the browser
already. Listen to each rather than inspecting it, which is what this file already asks.

### The table's markup is built and is the thing to verify

Task 2.4.3 shipped `<th scope="col">` column headings over `<th scope="row">` symbols, so a
screen reader announces the symbol with each cell — "NVDA, Sector, Technology" rather than a
bare "Technology". That is the arrangement this task should confirm rather than build, and
the two things worth checking are that it survives Task 2.4.4's restyling (the symbol cell
has its heading weight explicitly undone, which is a class a redesign could drop) and that
101 rows of it is not exhausting to move through.

**The axe gate has not been run against this page at all** — not locally, not in CI, at no
viewport. Every reading this repository holds is for the four Epic 1 routes, so there is no
baseline for `/securities` and nothing has yet had the chance to fail. That is the position
this file already assumes, and it is confirmed rather than changed.

### The failed path has two sentences, and a journey asserting one will pass while the other rots

Task 2.4.3 shipped **two** failure renderings — `unreachable` and `answered-badly` — plus a
`Reference: <uuid>` line on the second. A browser journey that produces one failure and
asserts on "the failed state" covers half of it, and the half it misses is the one carrying a
UUID into the accessibility tree.

Two consequences for the specs. The uncovered failure is cheap to add and should be, because
these are the states a real user is most likely to meet. And the reference line is a string
nothing should ever assert the **value** of — it is a fresh UUID per request — so assert the
label and the shape, which is also the rule that keeps the assertion honest if Task 2.4.4
changes how it is set.

---

## Amended 2026-09-06, after Task 2.4.4

Five things, and the first two change what this task is walking into rather than only its
detail. Nothing moved to or from another task and this task's position is unchanged.

### The table has a THIRD kind of header now, and it is what makes axe inconclusive

The amendment above describes a table of `<th scope="col">` headings over `<th scope="row">`
symbols. Task 2.4.4 grouped the table by sector, so there is now a **`<th scope="rowgroup"
colSpan={4}>` band per sector** — twelve of them, eleven sectors plus `Market proxies` — each
carrying the sector's name, its benchmark ETF and a count, with one `<tbody>` per group.

**That is exactly what makes the page axe-inconclusive, and it was measured rather than
guessed.** The local reading is **0 violations / 31 passes / 1 incomplete**, the incomplete
being `th-has-data-cells` on the table itself; removing the twelve band rows from the live
DOM and re-running that one rule gives **0 incomplete / 1 pass**, and putting them back
restores it. So this task inherits an attributable inconclusive rather than a mystery, on
the same footing as the `color-contrast` inconclusive the landing route has carried since
Story 1.5 — and `e2e/support/axe.ts` already attaches incompletes as annotations that cannot
fail a gate, so it does not block the gate this task installs.

**What is genuinely open is the thing the number cannot answer**: whether a screen reader
announces the band usefully, and whether 101 rows across twelve groups is navigable rather
than merely correct. That is this task's question and it is a better one than the incomplete.
Note `scope` is `rowgroup` and not `colgroup` deliberately — the band labels the rows beneath
it inside its own `<tbody>` — which puts its ARIA role at `rowheader`, not `columnheader`.

### The axe gate HAS now been run against this page, once, at one viewport

The amendment above says "**The axe gate has not been run against this page at all** — not
locally, not in CI, at no viewport." **That is no longer true and the correction matters**,
because it is the difference between establishing a baseline and comparing against one.

Task 2.4.4 ran axe-core 4.13.0 against the loaded page in a real browser and got the reading
above, with `color-contrast` passing on **21 nodes** — which is Task 1.13.6's blind-renderer
check satisfied here too, so the reading is not a renderer that skipped style computation.

What is still untrue and unchanged: it has **not** run at 720, 560 or 480px, it has **not**
run in CI, and it has **not** run against the three non-loaded states, any one of which could
carry something the loaded page does not. The multi-viewport instruction above is therefore
the live part of that bullet and should be read as the whole of it.

### `Region`'s `overflow: auto` does NOT scroll on this page, which changes the defect this task was told to expect

This file predicts `scrollable-region-focusable` because "a `Region` takes its own overflow
and a scrolling container that cannot be reached by keyboard is unreachable content", and
calls a table of 101 rows inside a region "precisely that shape again".

**Measured, it is not.** This page's region is never height-constrained — it grows to its
content and the **document** scrolls — so `region.scrollHeight === region.clientHeight` and
the region never scrolls at all. Task 2.4.4 found this the expensive way, by shipping sticky
column headings that turned out to be inert: an ancestor with a scrolling overflow becomes
the scrollport a sticky descendant is measured against, and this one has the property
without ever exercising it.

Two consequences for this task, and they point in opposite directions. The predicted defect
is unlikely to fire here for the predicted reason — but that is a claim to **verify at 480px**
rather than accept, because whether the region scrolls is a function of the viewport and that
is exactly how the original defect hid for five stories. And there is a new small question in
its place: every `Region` carries `tabIndex={0}`, so a keyboard user tabs into a box that has
nothing focusable in it and does not scroll, which is a stop on the tab order that buys
nothing on this page. Task 1.13.4 made it unconditional deliberately; whether that is right
here is worth listening to rather than reasoning about.

### Both failure sentences were rewritten, so a spec written against 2.4.3's strings is stale

The amendment above quotes 2.4.3's wording. Task 2.4.4 replaced both with a marker-plus-word
treatment borrowed from `BackendIndicator`, which is what makes the two read as the same
_kind_ of thing:

| `failure`        | Word                  | Marker        | Sentence a spec can anchor on             |
| ---------------- | --------------------- | ------------- | ----------------------------------------- |
| `unreachable`    | `no response`         | hollow circle | _The tracked universe is not available._  |
| `answered-badly` | `unexpected response` | amber square  | _The tracked universe could not be read._ |

The reference line is now `Reference <uuid>` — **no colon** — set in `--font-mono`. This
file's existing instruction stands unchanged and is now more useful: assert the label and the
shape, never the value, which is also what keeps the assertion honest across a rewording like
this one. The markers are `aria-hidden`, so the accessible name of each state is the word plus
the two sentences and nothing else.

Two more renderings exist that no spec has ever seen: the **empty** state, which now names
`pnpm universe` in a `<code>`, and the **loading** state, which is a sentence plus seven
`aria-hidden` skeleton bars.

### The `aria-live` defect still ships, and the skeleton makes it slightly worse

The amendment above is correct and unchanged: `aria-live="polite"` is still on the loading
paragraph, so a screen-reader user is told the page has started and never told it finished.
Task 2.4.4 deliberately did not touch it, because this task owns the decision and a second
half-answer would have been worse than the one already recorded.

One thing did change around it. The loading state now also renders seven **`aria-hidden`**
skeleton bars, so the accessible content of that state is exactly one sentence — which is the
right shape and is worth keeping through whatever this task decides. And the settled state now
has a **summary line** (`101 securities tracked · 11 sectors · 15 ETFs`) that arrives with the
table, which is a strictly better thing to announce than "the table loaded" if the answer
turns out to be a live region around the content slot.

**And there is a second accessibility preference to verify now**, which did not exist when
this file was written: `prefers-reduced-motion`. Task 2.4.4 answered it once at the token
layer by setting both motion durations to `0ms`, and proved the mechanism by forcing the
tokens and watching both consumers collapse to `0s`. What it did **not** do is exercise the
real preference — through the operating system or a browser emulation — which is a browser
task and therefore this one's.

---

## Completed 2026-09-06

**Status:** Complete.

What shipped: one real defect fixed in `UniverseTable`, one correction to the
axe **instrument** in `e2e/support/axe.ts`, a new endpoint matcher in
`e2e/support/pair.ts`, and `e2e/specs/securities-route.spec.ts` — **11 journeys,
every one of them seen to fail for its own reason**. `pnpm verify` is exit 0 in
**29.3 s**, `pnpm test` is **347** (68 + 146 + 133), and `pnpm e2e` is **21
passed in 1:02.3**.

### 1. The axe gate found something, and it was not what this file predicted

The prediction was `scrollable-region-focusable`. It did not fire, for the
reason Task 2.4.4 gave — and that claim was **verified rather than accepted**,
at all three viewports: `region.scrollHeight === region.clientHeight` (4473 = 4473) at 720, 560 **and 480**, with the _document_ scrolling instead. So the
defect that was invisible for five stories is genuinely absent here.

What the gate found instead was **203 `color-contrast` violations** on the
loaded page, and the cause is the instrument rather than the page:
`--ink-secondary` (`#5a5d5c`) blended toward white by Task 2.4.4's 240 ms
entrance animation, read back as **`#939594` at 3.01:1** against a 4.5
threshold. Waiting for the animation and running the identical check on the
identical page gives **0**, and the nodes axe could evaluate rise from **247 to
450** — the difference being the elements that were still translucent.

**So the reading was of a _frame_, not of a page**, and it would have been
non-deterministic in the worst direction: the same commit red on a loaded runner
and green on a fast laptop. `settleAnimations` now runs inside **both**
`expectNoAxeViolations` and `reportAxe`, because they inject the same axe into
two different browsers and a fix to one leaves the other measuring frames.

Two things about it that are not details. **Infinite animations are excluded
rather than waited for** — the loading skeleton's `breathe` never resolves its
`finished` promise, so waiting on everything would hang the gate on exactly the
state it most needs to judge. And it deliberately does **not** force
`prefers-reduced-motion`, which would make the gate green by removing the thing
it has to cope with.

It lives in `support/axe.ts` rather than in a spec because entrance motion is
now this product's house style rather than one component's decision, and a rule
each spec author has to remember is a rule that gets forgotten once and then
trusted.

### 2. The axe readings, at three viewports and four states

Taken with `settleAnimations` in place. Every one is **0 violations**.

| Page / state                           | Violations | Passes | Inconclusive        |
| -------------------------------------- | ---------- | ------ | ------------------- |
| `/securities` loaded, 1280×720         | 0          | 35     | `th-has-data-cells` |
| `/securities` loaded, 1280×560         | 0          | 35     | `th-has-data-cells` |
| `/securities` loaded, 1280×480         | 0          | 35     | `th-has-data-cells` |
| `/securities` nothing answered         | 0          | 31     | 0                   |
| `/securities` answered badly           | 0          | 31     | 0                   |
| `/securities` empty                    | 0          | 31     | 0                   |
| `/securities` loading                  | 0          | 27     | 0                   |
| landing route, healthy (control)       | 0          | 37     | `color-contrast`    |
| not-found route, unreachable (control) | 0          | 25     | 0                   |

The two controls are unmoved, which is the check that `settleAnimations` changed
nothing about pages with no entrance. The one inconclusive is the attributable
`th-has-data-cells` Task 2.4.4 measured and explained; it is annotated and
cannot fail a gate.

**35 passes and not Task 2.4.4's 31** — the announcement and the two
visually-hidden spans this task added are more nodes for axe to evaluate.

### 3. The `aria-live` half-decision was re-taken, and the answer is a persistent status region

**The defect reproduced exactly as this file predicted.** Measured across the
real transition with the response slowed: before, the DOM holds
`<p aria-live="polite">Loading the tracked universe…</p>`; after, there is **no
live region in the document at all**, because the announcing element is the one
being removed.

What replaces it is one `<p role="status">` rendered by `UniverseTable` in
**every** state, never unmounted, carrying one sentence written to be heard.
Measured after the change: the region is present in both states, its text
changes in place, and — the assertion that matters — it is **the same DOM node**
(`sameNode: true, stillConnected: true`). A live region has to exist _before_
the content it announces changes; that is the whole mechanism.

Four decisions inside it, each with its reason recorded beside the code.

- **Hidden rather than being each state's own lead line.** The nicer design was
  tried: hoist the first sentence of each state up so the announcement _is_ the
  visible line. It does not survive the failed state, where a marker and a
  status word come **before** the headline — so the element could not hold a
  constant position, and a live region that moves in the tree is one React
  unmounts and recreates, which is the defect being fixed.
- **`role="status"` and never `role="alert"`.** §36 makes an unreachable service
  a product state rather than a failure of the application, and assertive
  delivery says the opposite. And `role="alert"` is what `ErrorFallback`
  carries, which is the one thing `expectNothingFailedToRender` looks for on
  every route — an alert here would make a page reporting a backend it cannot
  reach indistinguishable from a page that failed to render.
- **The loading state announces nothing at all.** A live region only has to be
  _present_ before the change; content already there when it is created is not
  an announcement, because there was no change. A loading sentence there would
  never be heard as one and would only be a second copy of the visible line for
  anyone browsing. The asymmetry has a reason rather than being an oversight:
  `loading` is the state this page starts in and can never return to, because
  `useSecurities` fetches once.
- **The three settled sentences do repeat visible text, and that is accepted.**
  The alternative is deliberately different wording for one fact, which is two
  vocabularies for one state — exactly what the failure states' shared marker
  language exists to avoid.

**The loaded sentence is written for the ear rather than the eye**, and there is
a measurement behind that: the visible summary line's separators are CSS
`::before` content, so the element's own text runs together as
`101 securities tracked11 sectors15 ETFs`. That is `e2e/README.md`'s
`Backend servicehealthy` trap arriving somewhere it would have been **heard**.
The announcement is `The tracked universe loaded. 101 securities in 11 sectors.`
— a preposition where a scanned line wants a separator, and deliberately not the
third figure, which is a detail somebody reads rather than hears.

### 4. "Listened to rather than inspected" — how close this got, and the gap

**No screen reader was run, and saying so is the answer.** What was done instead
is a materially stronger instrument than reading the DOM: Chrome's own platform
accessibility tree, over CDP, which is what a screen reader consumes.

Both states report **exactly one** live region:

```
role=status  live=polite  atomic=true  relevant="additions text"
```

`atomic: true` is the property worth having — the whole sentence is read rather
than the words that changed — and _one_ region is the property that says nothing
is competing to announce. The remaining gap is real and narrow: whether the
resulting sentence is a _good_ one was judged by a person reading it, not heard.

### 5. The band's accessible name, confirmed and then improved

Task 2.4.4 left open whether a screen reader announces the sector band usefully.
Read off the accessibility tree, it does: the band is a **`rowheader`** (not a
`columnheader` — `scope="rowgroup"` is what it is) whose accessible name is
`Technology Benchmark XLK 13`, and each row's symbol is a `rowheader` so a cell
is announced as `AAPL, Technology Hardware, Storage & Peripherals` rather than a
bare industry.

One thing was worth changing: **the count arrived as a bare figure at the end of
a heard sentence.** On screen the column of right-aligned tabular figures says
what it counts by alignment; a listener gets `…XLK 13`. A visually-hidden
` securities` fixes it at the cost of one span — the third channel `PriceChange`
established, not a second copy of anything.

### 6. Keyboard: reachable, operable, and the `tabIndex` question answered

Produced rather than assumed, at 1280×480 where most of the table is off screen.
Tab from the top of the document gives `A A A A SECTION` — the four navigation
links, then the region — and from there **`End` scrolls to `scrollY: 4210` and
the last row (SPY) enters the viewport**. The focus ring is the global rule,
`2px solid rgb(28, 28, 28)` at `outline-offset: 2px`, with `:focus-visible`
matching.

**`Region`'s `tabIndex={0}` is kept**, and this file was right that it is worth
listening to rather than reasoning about. The tab stop buys nothing _as a
scroll container_ here, because the region never scrolls. What it does buy is
the thing the keyboard test asserts: it is how focus gets **into** the page's
content at all, which is what makes `End` and `Page Down` act on the document
rather than leaving a keyboard user tabbing straight from the navigation into
the browser chrome past a 101-row table. Making it conditional would also be the
guess Task 1.13.4 refused — which region scrolls is a function of the viewport
and of what Epics 4 to 7 put in them.

The spec asserts the tab order as an exact list, so a stop appearing or
disappearing is caught either way.

### 7. `prefers-reduced-motion`, exercised for real

Task 2.4.4 proved the _mechanism_ by overwriting the motion tokens by hand.
This exercises the **preference**, through `emulateMedia`, which is what that
task could not do:

| Preference      | `--motion-duration-settle` | entrance `animationDuration` |
| --------------- | -------------------------- | ---------------------------- |
| `reduce`        | `0ms`                      | `0s`                         |
| `no-preference` | `240ms`                    | `0.24s`                      |

Both halves are asserted, and the control is what makes the first half mean
anything: a token reading `0ms` in both worlds would satisfy the reduced case
while proving the preference is not being read at all. It is answered **once, at
the token layer**, which is the whole argument for those being tokens — a
per-component media query is a thing each author has to remember and whose
failure is silent.

### 8. Two findings the spec produced that are corrections to recorded claims

**`route.fulfill()` does not bypass the CORS check _entirely_.** `e2e/README.md`
said it did. Measured: the **body** is read with no CORS headers at all, and a
**header** still is not. A fulfilled response carrying `x-request-id` and no
`access-control-expose-headers` leaves script seeing `content-length` and
`content-type` and nothing else — so the page rendered its failure state
correctly and the correlation id it should have quoted simply was not there. It
was found by the reference assertion failing with "element not found". The rule
now recorded: **a fulfilled response has to declare anything the real server
declares in `exposedHeaders`.** Related and found at the same time: the id on
screen comes from the **header**, not the body, so a spec that sets only the
body asserts nothing.

**A `**` glob over `/securities` matches the page, not just the endpoint.**
`HEALTH_ROUTE_PATTERN` can afford to be a glob because this application has no
`/health` route. `/securities` **is** a route, so the first version of the probe
fulfilled the _document navigation_ with a JSON body — and then measured five
whole-document axe violations (`document-title`, `html-has-lang`,
`landmark-one-main`, `page-has-heading-one`, `region`) against a blank page it
believed was a rendered state. Green in the sense that it ran, and about nothing.
`SECURITIES_ROUTE_PATTERN` separates them **by port, derived** from the
backend's own built configuration — not by origin, because the browser dials
`localhost` where the harness holds `127.0.0.1`.

### 9. The journeys, and each one seen to fail

Eleven tests. The healthy path drives the **real pair with no interception at
all**, which is what makes it go red on a wrong `CORS_ORIGIN` the way
`backend-health.spec.ts` does; the failure states are produced by intercepting
the endpoint, because `route.fulfill()` cannot reproduce a cross-origin refusal.

| Deliberate break                                                      | What went red                            |
| --------------------------------------------------------------------- | ---------------------------------------- |
| a column renamed                                                      | the loaded journey's `columnheader` list |
| the band count loses its visually-hidden unit                         | the `rowheader` name assertion           |
| `role="status"` removed                                               | the announcement journey                 |
| the announcer rendered only while loading (**2.4.3's actual defect**) | `element(s) not found`                   |
| `Region` loses `tabIndex={0}`                                         | the tab-order list                       |
| `settleAnimations` removed from the gate                              | 203 contrast violations at 1280×720      |
| the two failures share one sentence again                             | the two failure journeys                 |
| the reference truncated to eight characters                           | the reference shape assertion            |
| `prefers-reduced-motion` no longer answered                           | the reduced-motion journey               |
| the empty state stops naming `pnpm universe`                          | the empty journey                        |

The reference line is asserted **by label and shape** —
`/^Reference [0-9a-f]{8}-…$/` — which survives a rewording like Task 2.4.4's
`Reference: <id>` → `Reference <id>`. It _additionally_ asserts the whole
supplied id, because this spec controls the value; that is `api-client.ts`'s
rule that a prefix of a UUID is a different string matching nothing in a log,
and the comment says not to copy it to a spec that does not control the id.

**One assertion is worth more than it looks**: with only `/securities`
intercepted, the chrome's own indicator still reads **`healthy`**. That is Story
1.12's two-indicators-not-one decision checked from the outside — the backend is
answering perfectly about itself while this region cannot be filled, and a
single widened indicator would have had to pick one of those two facts to report.

### 10. Cost, and what was declined

**The suite costs no wall time.** `pnpm e2e` is **21 passed in 1:02.3**, against
Task 1.13.2's recorded 62–64 s on ten tests: the eleven new journeys take 9.8 s
and fit entirely inside the minute `backend-recovery.spec.ts` spends waiting out
two real poll intervals. The corollary is the one to keep — the marginal cost of
a journey here is zero until the suite grows past that minute, and then it is
not.

`pnpm verify` is exit 0 in **29.3 s**. The frontend artefact moved, as it should
have: **357,210 B** of JavaScript (`b563a3d5…`), **18,058 B** of CSS
(`ead7d5c1…`), `index.html` 1,101 B (`5bdab864…`) and the 300 B host config —
**376,669 B over four files at 284 modules**.

**Nothing was added to `specs-deployed/`, and that is a decision.** The two
failures that check can see — a wrong `CORS_ORIGIN` and a wrong
`VITE_API_BASE_URL` — are already caught there through `/health`, and a second
page asserting the same two values would cost a rollback signal nothing and add
production traffic to a check whose bill is counted. The reversal trigger is a
failure mode specific to this endpoint, which today means Story 2.7 giving the
universe a second source that can disagree with the curated file.

### 11. The gate went red on the runner, and it fired a trigger written two stories ago

**This is the most transferable finding in the task and it was not in the
brief.** Everything above passed on a laptop. The `e2e` job then went red on the
runner with six journeys failing 10 s at a time on `element(s) not found`.

The cause was printed calmly three lines above, in the suite's own readiness
output:

```
○ database  127.0.0.1:5432  ECONNREFUSED — not running; `pnpm db` starts it
The pair is up. The database is not — start it with `pnpm db`.
Nothing needs it yet, so this is exit 0.
```

**The `e2e` job had no database**, so `/securities` answered with an empty
universe and the table never rendered. `Nothing needs it yet` had stopped being
true in the same commit that made it untrue.

Task 2.1.2 predicted this precisely, and got the location wrong in a way worth
recording. It left the third check reporting rather than gating and stated the
reversal as a **condition rather than a task number** — _the first check in
`pnpm verify` or `pnpm e2e` that fails without a database_ — naming **Story
2.2's migrations and Story 2.9's routes** as the realistic candidates. It is
neither. It is a **browser suite in Story 2.4**, because putting the universe on
screen is what made a page depend on the database, and nobody was looking there.

**It fired on the runner and not on a laptop, and that asymmetry is the lesson.**
Every developer has `pnpm db` running, so the condition is structurally
invisible locally. The reporting line was accurate on every machine that could
have read it and useless on the only machine where it mattered.

So the trigger was taken rather than worked around:

- **`scripts/check-ready.mjs`'s third check now gates.** `✗` rather than `○`,
  and the exit code includes it. Produced both ways: with a database it is three
  ticks at exit 0; without one it is a single `✗` naming `pnpm db`, `pnpm migrate`
  and `pnpm universe` at exit 1, and `pnpm e2e` refuses to start a browser at
  all. **One loud failure with a named cause instead of six quiet ones with
  none** — which is the whole argument, because a reporting line is only honest
  while nothing depends on it.
- **The `e2e` job gained a Postgres service**, a copy of the `database` job's
  block, plus `pnpm migrate` and `pnpm universe` **by name** between `Build` and
  `Start the pair`. Two steps and not one, for `deploy.yml`'s reason: a seed and
  a migration mean different things by idempotent, and a red result has to say
  which failed. The seed is the same two commands a developer's first run uses,
  deliberately — a CI-shaped universe would mean this suite asserting on rows CI
  inserted rather than on the ones the product ships.
- **`scripts/run-e2e.mjs`'s refusal message was corrected**, because it said
  "there is not [a running pair]" for a case where the pair is up and only the
  database is down.

**`pnpm verify` is untouched and must stay so.** It is not a caller of
`check-ready.mjs`, and Story 2.2's criterion 7 — the chain runs with no database
— was re-measured rather than assumed: **exit 0 in 31.2 s with the database
stopped**.

The whole CI sequence was rehearsed locally from a genuinely empty volume
(`pnpm db down -v`): 3 migrations applied, 101 securities inserted, a second
`pnpm universe` reporting `0 inserted, 0 updated, 101 unchanged`, and the suite
**21 passed**. Then it ran green on the runner, and the figures are worth
having:

| Step on `ubuntu-latest` | Cost                                         |
| ----------------------- | -------------------------------------------- |
| `pnpm migrate`          | **723 ms** — `Applied 3 migrations.`         |
| `pnpm universe`         | **692 ms** — `101 inserted`                  |
| `pnpm e2e`              | **70.6 s**, 21 tests                         |
| the whole `e2e` job     | **2 m 16 s**, against Task 1.13.4's 99–103 s |

**The suite itself did not get slower**: 70.6 s for 21 tests against Task
1.13.4's 69.2–72.6 s for ten, because the recovery journey still dominates on
two workers exactly as it does on four. The job's extra ~35 s is the service
container starting and the two seed steps, of which the seed is 1.4 s — so
nearly all of it is Postgres booting, which is the honest price of the gate.

`pnpm ready` on the runner now prints `✓ database  127.0.0.1:5432  PostgreSQL,
no TLS offered`, which is the new gate observed passing rather than assumed.

### What a green run here does not certify

- **Not that the data is correct.** Every assertion is about the page rendering
  what the API returned. That the API returns the right 101 securities is the
  database suite's and Story 2.3's loader's; nothing in a browser can tell a
  correct universe from a plausible one.
- **Not that a screen reader announces well.** It certifies the _mechanism_ — a
  live region, present in every state, the same node across the transition,
  polite and atomic in the platform tree. Whether the sentence is a good one was
  read by a person, not heard.
- **Not accessibility.** Three viewports across four states is a much wider
  claim than this repository has made before and is still not a review. Epic 15
  owns that, and `th-has-data-cells` is a rule automation declined to judge.
- **Not a browser it does not run.** Chromium only, as everywhere in this suite.
- **Not the states it cannot produce.** A wrong allowlist is caught here and
  never produced here.

---

## What this means, for somebody who does not read code

### The short version

The Security Explorer screen — the first page in MarketPulse that shows real
data — now works properly for people who cannot use a mouse, and for people who
use a screen reader. **Nothing about it looks different.** That is the point:
this was the half of the work that a sighted reviewer clicking around would
never have noticed was missing.

### What was actually broken, and why nobody would have spotted it

When you open that page, it fetches 101 securities from our service. For a
moment you see a "loading" message, and then the table appears.

For somebody using a screen reader, the page has to _say_ that. The previous
task had wired that up in the obvious way — it attached the announcement to the
"loading" message. The problem, which we reproduced rather than guessed at, is
that **the loading message is the thing that gets deleted when the data
arrives.** So the page announced "loading…" and then went completely silent. A
screen-reader user was told the page had started working and never told it had
finished. From their side, the page appeared to do nothing at all.

The fix is a small, permanent, invisible piece of the page that is always there
and whose sentence changes: "The tracked universe loaded. 101 securities in 11
sectors." It says the same thing whether the universe loaded, came back empty,
or could not be reached. We verified with the browser's own accessibility
machinery — the same machinery a screen reader reads from — that there is
exactly one such announcer, that it waits politely for a pause rather than
interrupting, and that it reads the whole sentence rather than just the words
that changed.

We were careful about one thing in particular: an announcement that fires too
often, or that reads out all 101 rows, is _worse_ than saying nothing, because
it is noise the user cannot switch off. So it says one short sentence, once,
per change — and deliberately says nothing at all when the page first opens,
because arriving at a page is not a change.

### The automated accessibility check caught a real problem — in itself

We run an industry-standard accessibility checker against the page in a real
browser, and it reported **203 colour-contrast failures**. That would normally
mean the text is too faint to read.

It was not. The checker was taking its reading _during_ the quarter-second fade
the table plays as it arrives — so it was measuring text that was still halfway
transparent. Once the animation finishes, the same check on the same page
reports **zero** problems.

This was worth catching for a reason beyond this one page. Left alone, it would
have been an intermittent failure: the same code passing on a fast machine and
failing on a slow one, with no obvious cause. And because every screen we build
from here on will have some entrance animation, it would have kept happening.
The fix is in the shared checking code rather than in this page, so every future
screen inherits it.

### What we now know works, because we made it fail on purpose

We wrote eleven automated browser journeys that drive the real page in a real
browser. Then we deliberately broke the page ten different ways — renamed a
column, deleted the announcer, removed the keyboard access, shortened the
reference code, disabled the "reduce motion" setting — and confirmed that each
break made the right test go red for the right reason. **A test that has never
been seen to fail has never actually been tested.**

Concretely, we can now prove:

- Somebody with no mouse can reach the table and scroll to the last of 101 rows
  using only the keyboard.
- The page is clean against the accessibility checker at three different window
  heights, in all four of the states it can be in — including the two states
  you can only see when something is broken. Previous checks in this project
  had only ever been taken at one window size, and that is exactly how an
  earlier real defect hid for months.
- Somebody who has asked their computer to reduce motion gets the table with no
  animation at all — tested through the actual operating-system setting rather
  than by forcing it in our own code.
- A screen reader hears each row's ticker before each of its cells, and hears
  each sector heading as "Technology, benchmark XLK, 13 securities" rather than
  as a stray number.
- When our service cannot be reached, the page says so calmly and correctly and
  the rest of the screen keeps working — and, importantly, the status light in
  the header still correctly reads "healthy", because the service _is_ healthy;
  it is only this one panel that could not be filled.

### Why this matters for the product

Two reasons, and the second is the one that compounds.

**It is the floor, not the polish.** The product specification is explicit that
the interface has to be exceptional rather than merely correct, and that
correct-and-accessible is the starting point. A screen that looks superb and
locks out keyboard users is not a screen we would show anybody.

**Every screen after this one inherits these decisions.** This is the first page
in MarketPulse whose content arrives over the network, and the first with a real
table. Both patterns repeat in every remaining part of the product — the live
market feed, the anomaly list, the investigation workspace, the replay view.
How a page announces that its content has changed was an open question until
today; it is now answered once, in shared code, with the reasoning written down
and a test holding it in place. The same is true of the animation problem in the
checker and of two traps we found and corrected in the testing harness itself.

### One thing broke in the shared build system, and it was worth breaking

Everything above passed on the development machine. The shared build server then
rejected the change, because **it had no database** — so the page it was testing
came back correctly empty, and six of the new checks failed with an unhelpful
"couldn't find the table".

The genuinely interesting part is that we had written this exact problem down
**two stories ago**, along with what would set it off: "the first automated
check that fails without a database". We guessed it would happen when we built
the database migrations, or later when we built the data endpoints. It happened
here instead — because putting the list of securities on a screen is what first
made a _page_ depend on the database, and nobody was watching that direction.

It could only ever have shown up on the build server, never on a developer's
machine, because every developer already has a database running. Our readiness
check had been printing a polite note about it for weeks — accurate on every
machine that could read it, and invisible on the one machine where it mattered.

So we did the thing the note said to do when this day came: that check now
**fails** rather than notes, and the build server was given a database of its
own, filled by exactly the same two commands a new developer runs on their first
day. The result is that this failure is now one clear message naming the cause,
instead of six confusing ones naming none.

The principle is worth keeping: **a warning is only useful while nothing depends
on it.** The moment something does, the same warning is worse than silence.

### Where we are

The tracked universe is on screen, designed, and now usable by everybody. What
this page still cannot do is show prices, volume or charts — there is no live
market data yet, which arrives in the next epic — and you cannot yet search it
or click through to a single security, which is a later story in this epic. The
page says so itself rather than leaving it a mystery.

One task remains in this story: closing it out and recording the decisions
formally.
