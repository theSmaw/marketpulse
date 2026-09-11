# ADR 0024 — Search, selection, the Security Explorer shell, and what a green interactive suite certifies

**Status:** Accepted
**Date:** 2026-09-11
**Delivered by:** Epic 2, Story 2.11 (Tasks 2.11.1–2.11.10)

## Context

ADR 0021 put a bar series on the wire and ADR 0023 built the client layer that
fetches it. Both were about data. This story is the first one about a **person**:
it puts the first interactive control in MarketPulse on screen, gives selection
an address, and places the screen every later epic will fill.

Three things make it worth an ADR rather than a story record.

**The first control decides what the rest look like.** Epic 2 alone still owes a
time-window control; Epic 4 owes an overview that selects a security; Epic 6 owes
a topology that selects one by clicking a node; Epic 8 owes a comparison picker;
Epic 11 owes controls a model can drive. Every one of those is a control, and
the input idiom, the focus contract, the announcement rate and the disabled
semantics settled here are inherited rather than re-taken four different ways.

**The shell has the longest reach of anything in the story.** `PRODUCT_SPEC.md`
§8.3 lists seven contents for the security screen. They are now placed — once,
on a grid — and **four later epics each fill a region that already exists and
already names them**. That arrangement is the most consequential thing this story
did, and an ADR that did not mention it would leave it recorded only in a task
file.

**The interactive layer is where this repository's test levels stop being able
to see.** Several decisions below are held by one browser spec and by nothing
else, because jsdom computes no layout, has no history and reloads no bundle.
That is stated in _What a green run certifies_ rather than discovered.

The working record is
[`SEARCH-AND-SELECTION.md`](../../planning/epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md),
which carries every alternative, every measurement and every reversal trigger.
This document carries the decisions.

## Decisions

### 1. Matching is CLIENT-SIDE, over a payload the page already holds

No request per keystroke, no debounce on matching, no `?q=` on `GET /securities`.
The screen already fetches the tracked universe for its table, and the response
already carries every field a result row needs.

**Taken against the ceiling rather than against today's size**, because 518 is a
number that has already moved twice. Measured 2026-09-11 and re-taken at the
close: the response is **20,072 bytes gzipped** (190,736 uncompressed, 171.2
bytes per security), and the shipped matcher runs in **0.101 ms** for `nv` and
**0.216 ms over a synthetic 5,000** — ten times `PRODUCT_SPEC.md` §6's stated V1
ceiling, and two orders of magnitude inside a 16.7 ms frame. What grows with the
universe is the payload, not the match.

Three named triggers move it server-side, and the matcher is a **pure function in
a module of its own** precisely so that the move is a re-wiring: a corpus we do
not ship (aliases, former names, CUSIP/ISIN), fuzzy ranking that needs an index,
or the screen that holds search ceasing to fetch the universe.

**The rules are prefix-aware rather than `includes()`, and that was measured
rather than preferred.** A substring-anywhere match over the company name
returns **seven** securities for `nv`, four of which are Federal Realty
**Inv**estment Trust, **Inv**itation Homes, **Inv**esco and Ken**vu**e. A person
typing `nv` means NVIDIA.

**`status` is not an input to matching.** `UNIVERSE.md` §12.2's rule is that a
reader filters on `status` when computing over the market we track _now_ and
never when showing what we stored. A search that drops an untracked security
reintroduces exactly the failure a schema with no `deleted_at` avoids. Membership
and rank are separate questions and only the second one moved: an untracked
security ranks **below** a tracked one within the same tier and is never omitted.

### 2. The path names the selected security; a search query NEVER reaches the address

`securityPath(symbol)` is pushed when a result is opened, so Back works and a
link is shareable. The query lives in component state and reaches the address at
no point — not pushed, not replaced, not transiently.

A half-typed query is not a shareable state; the shareable thing is the security,
and the path already names it. Pushing per keystroke puts one history entry per
character between a person and where they came from; replacing per keystroke
makes the address a live mirror of something nobody can use. And ADR 0023's own
rule forbids it: a query parameter is an _adjustment to how one subject is being
looked at_, and choosing a subject is not a view of one.

**This is a deliberate handover.** The query string is empty, so Story 2.13's
window control puts the first real parameter into it with no precedent to argue
with.

**The trigger is the first time a _result set_ rather than a _security_ is the
thing somebody would send** — a filter on the list, by kind or by sector, which
is a view of the list and belongs in the query.

### 3. Selection navigates CLIENT-SIDE, and that gave module state a lifetime it never had

Search navigates with `useNavigate()` and every symbol in the tracked universe is
a React Router `Link`. Measured in Chromium: one `navigation` entry across a
whole search-open-Back-click sequence, and a marker set on `window` survives it.

**The consequence is larger than the feature.** Until this story every route to a
second symbol was a document navigation, which reloads the bundle and therefore
silently recreated every piece of module-level state. ADR 0023's parsed-series
cache is now genuinely long-lived for the first time — which is what its bounds
were written for — and any module-level state added after this one must be
audited for whether it should survive a symbol change. The search field's own
query is the second candidate and is benign: it is not keyed on the symbol, and
nothing keyed on the symbol reads it.

A pleasant second-order effect, measured rather than designed: because
`/securities` and `/securities/:symbol` render the **same** route module, a
navigation between them re-renders rather than re-mounts, so **the field keeps
its query across Back**. `SEARCH-AND-SELECTION.md` §3 predicted the opposite and
carries the correction; the decision it was arguing for is untouched, because the
argument was entirely about what the _address_ carries.

### 4. This product has an INPUT IDIOM, and a disabled control stays in the tab order

`TextField` is the primitive, and three of its decisions bind every control after
it.

- **Bordered, not underlined, and set in the data face.** An underlined field on
  a page of hairline-bordered panels reads as a form field on a document; a
  bordered box reads as an instrument, and it has a resting silhouette. What a
  person types here is predominantly a ticker, and `--font-data` is this
  language's face for tickers.
- **Focus stays the token layer's job.** The design drew a 2px near-black resting
  border; declined, because the global `:focus-visible` ring is a 2px near-black
  outline at 2px offset — a resting border of the same weight and colour leaves
  the field with **no visible focus state**. The resting border is
  `--rule-hairline`.
- **A disabled control renders `aria-disabled` + `readOnly`, never the native
  attribute.** A description hung off a control with `aria-describedby` is read
  **when the control is reached**, and a natively disabled control is not
  focusable. This shipped for two tasks: search's unavailable states carried a
  correct, attached, visible sentence that no key press could get to. `readOnly`
  alone was rejected on meaning — that prop says _a value nobody edits here_ and
  would tell a listener nothing about why.

  **The consequence travels with the decision**: the state stops being
  _inactive_, so WCAG 1.4.11's and 1.4.3's exemptions stop covering its border
  and its ink. Both were moved with the measurements beside them — the border
  from **1.07:1** to **4.22:1** and the value's ink from **2.62:1** to
  **6.49:1** — and what still tells the state apart from read-only is the lighter
  value and the cursor, both of which survive greyscale.

**The combobox is active-descendant**: focus stays in the input for the whole
interaction and the active row is a pointer rather than a focused element, so
typing is never interrupted to look at a result. Focus after a result is opened
**stays in the field**, because this control is a symbol switcher as much as a
search box; the objection it had to answer — that a listener who changed the
whole subject of a page hears nothing — was measured and does not apply, because
the panel's live region names the new subject within 300 ms.

### 5. The Security Explorer shell: §8.3's seven contents placed ONCE, on a grid of spans

The screen is built now, mostly empty, rather than grown a panel at a time. Eight
regions: the identity block, then §8.3's seven contents in reading order, with
the tracked universe last and full width on both addresses.

- **A grid of spans rather than named areas**, so a region's width is a property
  of the region and a later epic fills one without touching a template.
- **Every empty region names the epic that fills it**, in a sentence that says
  what it will hold and what it deliberately does not hold yet — Story 1.5's
  convention, applied to six regions. **Story numbers are not invented for
  this**: the design deliverable labelled placeholders Stories 2.12 to 2.16 and
  Epic 2 ends at 2.14. An epic is a promise the roadmap can keep.
- **The table stays on both routes.** The reason it was originally there — it was
  the only way to find out what symbols exist — expires with this story, and two
  others take its place: on `/securities/:symbol` it is the only way to reach a
  second security without typing one, and it owns the single control that re-asks
  for the universe.

**Four later epics inherit this arrangement**, which is why it is here and not
only in a task file. Stories 2.12 and 2.13 do not _add_ anything to this page;
they fill a region that already exists and already names them, and their story
files now say so.

**The design source is the canvas, not the mock.** Section 07 of the
`Component library for MarketPulse` canvas holds the grid map, the identity
block's four states and the placeholder treatment; the universe navigation
control is a **second file**, `Universe navigation.dc.html`, because
`DesignSync`'s `get_file` caps a read at 256 KiB and the main canvas is larger.
So ADR 0026's chain works as intended and its "the canvas is one file" bullet is
amended.

### 6. An announcement rate is TWO numbers, not one

The visible result list updates on **every keystroke** — matching is a 0.1 ms
synchronous scan and debouncing it would make the list lag a person's typing for
nothing. Only the **sentence** waits.

A debounce answers _have they stopped?_ and **cannot tell a pause from an
ending**. Measured by typing `nvidia` in Chromium: at 90 and 160 ms per key the
region spoke once; at 500 ms per key it spoke **seven** times, six of them while
the person was still typing — and two keys a second is not an unusual rate for
somebody navigating by ear. No value of the delay fixes this, because raising it
to clear the slowest typist makes the fastest wait for a sentence they have
already read.

**So a floor joins the debounce**: 400 ms after the last keystroke, and at most
once per 1,500 ms whatever tripped it, the wait being whichever is longer. What
lands when the wait ends is the state **now**, so a floor delays an announcement
and never queues a stale one. Seven sentences became three.

**Epic 3's socket is where a region first has to be paced by something other
than a person's typing, and it should inherit the pair rather than rediscover the
inversion.**

Two further rules this story settled about regions, both inherited from ADR 0023
§7 and both of which fired its triggers:

- **A third region is permitted when it cannot queue against the others.**
  Search speaks only after a keystroke, and no page load produces one.
- **The fourth surface fills without speaking.** The identity block fills at
  exactly the moment the other two do, so a fourth polite region is the precise
  failure §7 exists to prevent. Silence is correct rather than lazy because the
  universe's own region has already spoken for that fetch: the identity block is
  a second _rendering_ of an event that already has a sentence, not a second
  event.

### 7. One retry per failure per screen, and it belongs to the surface that owns the data

Search and the tracked universe render from the same fetch, so a failed universe
puts two explanations on one screen — and the naive reading of ADR 0023's
retryable rule produces two `Try again` buttons for one event.

The table owns the fetch, so the table offers the control; search states the fact
and defers it, and points at nothing, because a sentence saying "use the button
below" is a layout claim in a live region. ADR 0023 §4 is honoured **in the
words**, in both directions: a retryable failure says waiting may help, a
permanent one says it will not.

**Trigger: the first screen where the two surfaces read different fetches** — at
which point they are two failures and each owes its own control. Epic 3's live
feed is the likely first.

## What a green interactive suite certifies here, and what it does not

### What it certifies

- **That the matcher's rules are the rules.** `security-match.test.ts` asserts
  the tiers, the `nv` finding, the shown-and-total pair, and that an untracked
  security is returned for its symbol and its name while losing a tie it would
  win alphabetically.
- **That every state of the control is producible**, from recorded bodies
  collapsed through the real transition rather than typed by hand, and that the
  field is on the page in all of them.
- **That the announcement is the sentence this document describes**, including
  the corpus check that keeps `no matches` from being said about a universe
  nobody has seen yet.
- **That a navigation between two securities is one navigation** —
  `e2e/specs/security-navigation.spec.ts`, in a real browser, counting
  `performance.getEntriesByType("navigation")`.
- **That the tab order reaches what it must, in the order stated, with nothing
  behind the chrome** — at two viewports, because the wide one stays green while
  the narrow one goes red.

### What it does NOT certify

- **That the address stays clean between keystrokes.** The journey asserts the
  address at the ends of the flow, which catches a query pushed as a destination
  and would not catch one replaced per keystroke and tidied up afterwards.
- **That a navigation stayed client-side — below `pnpm e2e`.** jsdom has no
  history and no bundle to reload, so swapping the table's `Link` for a plain
  `<a href>` leaves **every** unit, component and integration test green while
  the product silently goes back to reloading itself on every symbol.
- **That the screen has the columns it claims.** jsdom applies no stylesheet and
  computes no layout. A `span 3` item in a two-track grid **grows an implicit
  third column rather than being clamped**: the computed tracks came back
  `134px 134px 676px`, the page was visibly broken at every width under 1184px,
  and `pnpm verify` plus all 54 browser tests were green. It was found by opening
  the page.
- **That a control's explanation is reachable.** Nothing compares an
  `aria-describedby` against whether the described element can be focused, and
  the failing combination renders and lints perfectly.
- **That what a listener hears is what Chromium computes.** The screen-reader
  pass was taken from the accessibility tree — the data an assistive technology
  is handed — and **not from a screen reader reading aloud**. Two observations
  are recorded unresolved for exactly that reason and Epic 15 owns them.
- **That a fourth live region has not appeared.** Two hand-written route
  assertions stand there and nothing else does.

## Consequences

- **Four epics inherit a grid with five named vacancies.** Filling one is
  replacing a region's contents, not adding a panel — and a chart dropped into a
  fresh panel beside the region that has been waiting for it is the concrete
  defect this records against.
- **Every control after `TextField` inherits its disabled semantics**, and with
  them the contrast obligations that follow from a state that is no longer
  inactive.
- **Epic 3 inherits two things by name**: the announcement pair, which its socket
  is the first consumer of that is not a person typing; and the retry trigger,
  because a live feed is the first screen whose two surfaces read different
  fetches.
- **Story 2.13 inherits an empty query string**, deliberately.
- **The React Compiler's rules fired for the first time**, on the combobox — the
  first component in this tree with real interactive state. Both catches were
  correct and both repairs were simpler than the code they replaced. ADR 0023's
  "still have not fired" was evidence that nothing had yet written the shape they
  dislike, and that is now confirmed rather than contradicted.
- **The icon set is six.** `magnifier` was added for `TextField` and named for
  what it is rather than for what a consumer uses it for. The seventh needs its
  own argument in its own task.
- **A measured exception to `PRODUCT_SPEC.md` §28 exists and is recorded as
  one.** `Expand all` on the tracked universe costs 69–87 ms in a production
  build, against a target of no routine main-thread task over 50 ms. The target
  is not amended; the work is neither new nor routine, virtualisation was
  declined with the measurement behind it, and Epic 14's entry in `EPICS.md`
  carries it so that nobody measures it again from scratch.

## Related

- [ADR 0023](0023-the-frontend-state-layer-the-cache-with-no-clock-and-what-a-green-frontend-suite-certifies.md)
  — the state layer this builds on: the URL as the home of selection, the cache
  whose lifetime decision 3 changed, and the live-region rule decision 6 extends
- [ADR 0021](0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)
  — the wire the universe and the bars arrive on
- [ADR 0022](0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md)
  — the language the field, the rail and the shell are drawn in
- [ADR 0026](0026-the-design-canvas-as-the-source-of-truth.md) — the canvas the
  shell and the navigation control came from, and the 256 KiB cap that made it
  two files
- [ADR 0013](0013-browser-testing-two-suites-and-what-a-green-run-certifies.md) —
  the suite that holds most of what this ADR's decisions are checked by
- [`SEARCH-AND-SELECTION.md`](../../planning/epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)
  — the working record, with the alternatives, the measurements and the reversal
  triggers
