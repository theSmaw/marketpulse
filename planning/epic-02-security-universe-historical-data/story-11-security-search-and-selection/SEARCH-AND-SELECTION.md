# Search and selection — where the control lives, how it matches, and what the address carries

**Subject document for** [Story 2.11 — Security Search & Selection](STORY.md)
**Created:** 2026-09-11 by [Task 2.11.1](TASK-01-settle-search-selection-and-the-url.md)
**Status: complete.** Finished 2026-09-11 by
[Task 2.11.10](TASK-10-deployed-verify-document-and-adr.md), which closed Story
2.11. The three open decisions are settled; §§1–5 are the decisions and are what
Tasks 2.11.2 to 2.11.9 implemented; §§6–7 are records rather than decisions; §9 is
what nothing checks. The decisions with reach beyond this story are also
[ADR 0024](../../../docs/adr/0024-search-selection-and-the-security-explorer-shell.md),
and this file is the detail behind it.

**Two numbering notes, because pointers into this file exist elsewhere.** The
keyboard flow was written as §6 by Task 2.11.9 beside an existing §6, and the
close renumbered it: **the keyboard flow is §7**, _what this file hands each
task_ is §8, and _what nothing checks_ is §9. Task files written before
2026-09-11's close point at the old numbers and are left standing as records;
`e2e/specs/search-keyboard.spec.ts` was corrected in the same change.

This file exists for the reason Tasks 2.9.1 and 2.10.1 exist: this story is
followed immediately by two chart stories and then by an epic that adds a symbol
switcher, a comparison picker and a window control. **Every one of those is a
control, and the first control in a product decides what the rest look like.** A
decision taken once here is a decision six later screens inherit rather than
re-take four different ways.

**Nothing in Task 2.11.1 was visible.** No field, no result, no pixel — the
payoff was Task 2.11.4, which put the first interactive control in this product
on screen, and the shell in 2.11.7. **All of it is visible now**, deployed: a
person can type `nv` and open NVDA.

---

## 0. What was measured, and where the numbers came from

Everything numeric below was taken on **2026-09-11** against the local pair
(`pnpm dev`, the backend serving the real database) rather than recalled. The two
deployed figures are cited from the documents that took them, because this task
has no deployed environment of its own.

| Measurement                                    | Reading                                                                                                   | How                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| The masthead's content width                   | **903px**, saturated — below that the nav scrolls                                                         | `getBoundingClientRect()` on `header > div:first-child` and its children    |
| Free space to the right of the nav             | **807px** at 1710 · **537** at 1440 · **377** at 1280 · **277** at 1180 · **121** at 1024 · **0** at ≤903 | the same, at nine simulated widths                                          |
| Where the status strip wraps                   | one row to 900, **two rows at 768**, **three at 390**                                                     | distinct `top` values across the strip's three regions                      |
| `GET /securities`, on the wire                 | **20,072 bytes**, `content-encoding: gzip`, `etag` present, `cache-control: private, no-cache`            | `curl -H 'Accept-Encoding: br, gzip'`                                       |
| The same body, uncompressed                    | **190,736 bytes** total; the `securities` array alone **88,679**                                          | `TextEncoder` in the page                                                   |
| Per security, uncompressed                     | **171.2 bytes**                                                                                           | derived from the two above                                                  |
| Matching 518 securities over symbol and name   | **0.295 ms** for `nv`, **0.085 ms** for `nvid`                                                            | 20 iterations in the page, `performance.now()`                              |
| The same matcher over a synthetic **5,000**    | **0.58 ms**                                                                                               | the universe repeated to 5,000 rows                                         |
| Distinct close sessions across all 518 rows    | **one** — every `lastCloses[].session` is `2026-09-04`                                                    | `new Set(...)` over the response                                            |
| Securities with no last close                  | **0** of 518                                                                                              | the same                                                                    |
| Distinct `status` values in the universe today | **`active` only**                                                                                         | the same                                                                    |
| The `kind` split                               | **503 `equity` · 11 `sector_etf` · 4 `index_etf`** — three values, not two                                | the same                                                                    |
| The deployed fetch, and its conditional floor  | **484 ms** against **376 ms**                                                                             | cited from [`STORY.md`](STORY.md)'s 2026-09-10 amendment, not re-taken here |

Two things that came out of the measurement rather than being looked for, and
both are findings other tasks read:

- **A naive substring-anywhere match over the company name is wrong**, and the
  proof is cheap: `nv` matches **seven** securities that way, and four of them
  are `FRT`, `INVH`, `IVZ` and `KVUE` — Federal Realty **Inv**estment Trust,
  **Inv**itation Homes, **Inv**esco and Ken**vu**e. `QQQ` is a fifth, through
  "**Inv**esco QQQ Trust". A person typing `nv` means NVIDIA. This does not
  decide the tiers — that is [Task 2.11.2](TASK-02-the-matcher.md)'s — but it is
  the case that task should write a test against first, and it is why §2 below
  says the matcher's rules are prefix-aware rather than `includes()`.
- **The "equity/ETF distinction" a result row owes is a derived grouping, not a
  field.** `kind` has **three** values — `equity`, `sector_etf`, `index_etf` —
  and the distinction a person needs (why SPY behaves differently from NVDA) maps
  two of them onto one word. Worth knowing before a row renders `kind` verbatim
  and produces `SECTOR ETF` beside `INDEX ETF` as though the difference were the
  point.
- **`nvid` matches exactly one security**, NVDA, through the company name
  `NVIDIA Corporation`. Acceptance criterion 1's third spelling therefore works
  through the name path and not the symbol path, which is worth knowing before
  somebody tries to satisfy it with symbol rules alone.

### 0.1 Re-taken at the close, 2026-09-11 — what moved and what did not

This repository's rule is **measure rather than cite**, and the sharpest reason
for it is that _a figure that has moved looks exactly like a figure that was
mis-recorded_. So the figures the rest of this file argues from were taken again
at the close, against the same running pair.

| Figure                          | At the close                                                  | Against                                   | Moved?                    |
| ------------------------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| `GET /securities` on the wire   | **20,072 bytes**, `gzip`, `etag` present, `private, no-cache` | 20,072 at 2.11.1                          | **No**                    |
| The same body uncompressed      | **190,736 bytes**; the `securities` array **88,679**          | the same                                  | **No**                    |
| Per security, uncompressed      | **171.2 bytes**                                               | the same                                  | **No**                    |
| Securities in the universe      | **518**, all `status: active`                                 | the same                                  | **No**                    |
| The `kind` split                | **503 `equity` · 11 `sector_etf` · 4 `index_etf`**            | the same                                  | **No**                    |
| Distinct `lastCloses[].session` | **one** — `2026-09-04`, and 518 of 518 carry a close          | the same                                  | **No**                    |
| The shipped frontend JS chunk   | **421.93 kB raw · 134.48 kB gzip**                            | **376.45 / 122.26** at Story 2.10's close | **+45.48 kB · +12.22 kB** |
| The stylesheet                  | **41.68 kB raw · 8.27 kB gzip**                               | not recorded before                       | first reading             |

**The payload did not move, and that is the finding rather than the absence of
one.** §2's whole argument is that client-side matching holds at ten times §6 of
`PRODUCT_SPEC.md`'s ceiling; it rests on a number that has already moved twice in
this epic's life, and it is stable across nine tasks of work on the screen that
consumes it. Method: `curl -H 'Accept-Encoding: br, gzip'` for the wire, and
`Buffer.byteLength` over the parsed body for the rest.

**The bundle grew by 12.22 kB gzipped, +10.0%**, and that is the whole of this
story on screen: a combobox with a result surface, an input primitive, a sixth
icon, the Security Explorer shell with eight regions, the identity block, the
band rail, the bulk collapse, and the announcement machinery behind two live
sentences. For scale, `FRONTEND-STATE.md` §1 measured Redux + React-Redux at
**+8.43 kB** and RTK Query at **+25.27 kB** — so this story cost about one and a
half Reduxes and bought a screen rather than a state library. Method:
`pnpm build`, then `gzip -c` over `apps/frontend/dist/assets/*.js`; the 122.26 kB
baseline is `FRONTEND-STATE.md`'s, taken the same way on 2026-09-10, which is
this story's own starting line rather than an older one.

**Two figures are reconciled rather than re-measured, and both say so here so
that nobody re-takes them looking for a third answer.**

- **The matcher.** §0's table above reads 0.295 ms for `nv` and 0.58 ms over a
  synthetic 5,000. Those are a **different implementation's** — a naive scan,
  measured in the page before Task 2.11.2 wrote the ranked rules — and they are
  kept as the historical record they are. The **shipped** rules measured
  **0.101 ms** for `nv`, **0.040 ms** for `nvid`, **0.072 ms** for `a` and
  **0.216 ms** over a synthetic 5,000. §2's slope argument is unaffected in
  direction and stronger in magnitude: the shipped matcher is between two and
  three times **faster** than the naive scan the decision was taken against, and
  is still two orders of magnitude inside a 16.7 ms frame. Re-measure only if the
  implementation stops being a linear scan.
- **Rendering 518 rows.** Taken by Task 2.11.8 against a **production** build in
  Chromium: `Collapse all` (530 rows → 12) costs **17, 19, 20, 44 ms**;
  `Expand all` (12 → 530) costs **69, 76, 76, 87 ms**. The dev build reads 17–27
  and 151–222 ms, which is why the production figures are the ones carried.
  Virtualisation was declined with that measurement behind it. **`Expand all`
  exceeds `PRODUCT_SPEC.md` §28's _no routine main-thread task >50 ms_**, which
  is a real exception and is recorded as one: §28 is not amended, and the
  argument — the work is neither new nor routine — now lives in
  [`EPICS.md`](../../EPICS.md)'s Epic 14 entry, which is the epic that owns
  performance, rather than only in the task file that found it.

---

## 1. Decision 1 — where search lives

**Decided: on the page. One field, on the Security Explorer screen, above the
tracked universe. The chrome is not touched by this story.**

### The measurement the decision was taken against, rather than a preference

[`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) §8.1 asked for the masthead to be read
rather than recalled, so it was. **The masthead holds three things and its
content is 903px wide**: 24px of padding, a 250px identity block (the crimson
pulse mark, the wordmark, and the `Market situational awareness` descriptor), a
40px gap, and 565px of navigation — four full-height tabs at 130, 177, 133 and
113px. `AppHeader.module.css` contains **no media query at all**; `.identity` is
`flex-shrink: 0` and `.nav` is `overflow-x: auto`, so the mechanism that absorbs
a narrow viewport is already spoken for: **the navigation scrolls horizontally.**

That is what gives way if a field goes in, and it gives way at a width people
use:

| Viewport | Free space right of the nav | A 240px field with a 40px gap     |
| -------- | --------------------------- | --------------------------------- |
| 1710     | 807px                       | fits, 527px spare                 |
| 1440     | 537px                       | fits, 257px spare                 |
| 1280     | 377px                       | fits, 97px spare                  |
| 1180     | 277px                       | fits with nothing spare           |
| 1024     | 121px                       | **the four tabs start to scroll** |
| ≤903     | 0px                         | impossible                        |

The status strip is a separate row and is unaffected — but it is not free
either: it is `flex-wrap: wrap`, right-aligned, and it already becomes **two rows
at 768 and three at 390**. A masthead field would not push it; it would simply
be the second thing on the screen competing for a horizontal budget that is
already spent twice.

### Why the page is the right home, which is a product argument and not a layout one

The brief asked what Epics 4, 6 and 11 need, because the answer changes where
search belongs. It does:

- **§8.1's Market Overview selects a security from the unusual-activity feed.**
- **§10's topology selects a security by clicking a node.**
- **§12's primary workflow starts from an anomaly, not from a search box.**

So search is **one of several ways in to a security, and not _the_ way in.** A
control that is one of several does not earn permanent residence in a 56px
masthead whose horizontal budget is already committed.

And the thing that makes the page-level field sufficient rather than merely
cheaper: **`/securities` and `/securities/:symbol` render the same screen
today.** A field on that screen is therefore already a persistent symbol
switcher for every screen in the product that is _about_ a symbol — which is the
capability the "persistent control" argument actually wants. It is not a
compromise that happens to fit; it covers the use case, at the cost of nothing
in the chrome.

### The alternatives, and why each was not taken

- **A persistent field in the masthead.** Rejected on the table above. It fits
  at 1280 and does not at 1024, and the failure mode is not a broken layout but a
  quiet one: the primary navigation becomes a horizontally scrolling strip, which
  is the sort of degradation nobody notices on the development machine. It also
  requires either dropping the descriptor line under the wordmark or shortening
  the four tab labels, and four browser specs assert on strings in this chrome.
- **A dedicated `/search` route.** Rejected because it is a worse version of what
  is being built: `/securities` already exists, already fetches the universe,
  already renders it, and is already the screen a person lands on to find a
  security. A second route would be a third address for the same job.
- **A command palette invoked from the chrome (`Cmd+K`), which is what the design
  deliverable proposes.** Not rejected on merit — deferred, with a trigger. It is
  a second interaction surface (a portal, a focus trap, a scroll lock, an Escape
  contract, and its own test surface) that this story's ten tasks did not budget,
  and it is strictly additive to the field: the palette's contents _are_ the field
  and the result surface built in 2.11.3 and 2.11.4. Building the field first and
  the palette when a screen needs it is the cheaper order, not a smaller ambition.

### Where on the page, precisely

In the Security Explorer screen's header region, **above** the `BarSeriesPanel`
and above the universe table, inside the page's own heading block rather than
inside either `Region`. Two reasons: it is a control _over_ both surfaces rather
than part of either, and a control inside the table's `Region` — which declares
`overflow: auto` — is how Task 1.13.4's `scrollable-region-focusable` defect
class gets reintroduced.

**[Task 2.11.7](TASK-07-the-security-explorer-shell.md) inherits one consequence
and it is not this task's to take**: the universe table is currently _underneath_
because it was the only way to find out what symbols exist, and that reason
expires with this story. Where the table goes in the shell's grid is 2.11.7's
decision; that the field sits above whatever it becomes is this one's.

**Answered 2026-09-11 by [Task 2.11.7](TASK-07-the-security-explorer-shell.md):
the table stays, on both addresses, last and full width.** The reason it was
there has expired and two others have taken its place, neither of which search
retires. Since [Task 2.11.5](TASK-05-client-side-navigation-and-the-table-as-a-way-in.md)
every symbol in it is a link, so on `/securities/:symbol` it is **the only way to
reach a second security without typing one**; and it owns the single control that
re-asks for the universe, which this file's own §5 copy points at by name — _"the
control that asks again is with the universe itself"_. Moving it to `/securities`
alone would leave that sentence grammatical and false on the other route, and
would make a failed universe a dead end there. The cost is a long page and it is
paid deliberately: the table is under all seven of §8.3's regions, so nothing a
reader came for is below it.

**Reversal trigger**: the first region that must sit _below_ the table, or a
second control on that screen that re-asks for the universe — either frees the
copy dependency this decision turns on.

### Reversal trigger

- **The first screen other than the Security Explorer that has to change which
  security is being looked at.** Epic 4's overview and Epic 6's topology both
  select a security by other means, so neither fires it on its own; the trigger is
  a screen where a person must _leave_ what they are working on to change its
  subject. At that point the field is promoted into a chrome-invoked palette, and
  2.11.3's component is what the palette contains rather than a second control.
- **The masthead losing its slack.** A fifth navigation item, a longer tab label,
  or anything else that pushes the masthead's content past ~1180px, at which point
  a masthead field is off the table permanently rather than deferred.

---

## 2. Decision 2 — client-side or server-side matching

**Decided: client-side, over the universe the screen has already fetched. No
request per keystroke, no debounce on matching, and no search parameter on
`GET /securities`.**

### Taken against the ceiling, which is what the story asked

Today's figure is not the argument. §6 of
[`PRODUCT_SPEC.md`](../../PRODUCT_SPEC.md) names **100–500 securities for V1**
and the universe crossed that at 518, so "it fits today" is a claim about a
number that has already moved once. What was measured instead is the **slope**:

| Universe size                       | Uncompressed body (at 171.2 B/security) | Compressed, at the observed ~9.5:1 | Matching one query    |
| ----------------------------------- | --------------------------------------- | ---------------------------------- | --------------------- |
| **518** (today)                     | 88,679 B measured                       | **20,072 B measured**              | **0.295 ms** measured |
| 1,000 (2× V1's ceiling)             | ~171 kB                                 | ~18 kB of securities               | <0.6 ms               |
| **5,000** (§27's synthetic ceiling) | ~856 kB                                 | ~90 kB                             | **0.58 ms** measured  |

So client-side matching holds at **ten times** §6's ceiling, and the cost that
grows is the payload rather than the match. The match itself is a linear scan
that stays two orders of magnitude inside a 16.7 ms frame — which is the figure
that matters, because it is what makes per-keystroke results honest rather than
aspirational.

Three properties make this close to free rather than merely affordable:

- **The request is already being made.** `useSecurities` runs on this screen
  today, for the table. Search adds no fetch, no second loading state, and no
  second failure state — a point [Task 2.11.4](TASK-04-search-on-screen.md)
  restates as "no new fetch".
- **The response already carries everything a result row needs.** Measured:
  `symbol`, `name`, `exchange`, `kind`, `sector`, `industry`, `status`, `cik`,
  plus a `lastCloses` entry per security with `session`, `close` and
  `previousClose`. Nothing in §3's result row requires a field that is not
  already in the browser.
- **It revalidates rather than re-transfers.** The response carries an `ETag` and
  `cache-control: private, no-cache`, and the deployed reading is **484 ms
  against a 376 ms conditional floor** — about 100 ms of it is moving 20 kB. The
  payload is not what this endpoint costs.

### What would move this decision

Named here so that a change is a re-wiring rather than a rediscovery:

- **A corpus we do not ship.** Company aliases, former names, `CUSIP`/`ISIN`
  identifiers. Note the design deliverable prints a CUSIP and an ISIN for NVDA;
  neither is in our data, which is one of the fabrications §5 records.
- **Fuzzy ranking that needs an index** — edit distance over 500+ names per
  keystroke, or a typo-tolerant scorer, rather than the prefix rules §2 hands to
  2.11.2. [Task 2.11.2](TASK-02-the-matcher.md) is told not to add a
  fuzzy-matching dependency on its own authority, and this is the sentence that
  says so: **if its test table makes a genuine case that prefix-and-substring
  rules are not enough, that is an amendment to this file.**
- **Search over anything beyond the tracked universe.** §37 puts this out of V1
  explicitly.
- **The screen that holds search ceasing to fetch the universe.** If 2.11.7's
  shell stops rendering the table on `/securities/:symbol`, the field's data
  source stops being incidental and becomes a fetch of its own — at which point
  the question is genuinely open again.

### What the server would be asked for if it moves

`GET /securities?q=<query>`, returning the **same `Security` shape already on
that route** in ranked order, with the same `status`-unfiltered rule and a
`total` beside the returned page so §3's "more matches than shown" line stays
truthful. On the client, the matcher's signature goes from
`(universe, query) => ranked` to `(query) => Promise<ranked>` and acquires the
request-identity cancellation `useBarSeries` already implements
([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§5) — one module and one hook, which is why the matcher is a pure function in a
file of its own rather than a `filter()` inside a component.

### Reversal trigger

- **The first query a person would type that the browser cannot answer from the
  tracked universe alone.** The likeliest is a former name or an alias — somebody
  typing `Facebook` and expecting `META`.
- **A measured match slower than one frame at the universe's then-current size.**
  Re-measure rather than assume: the numbers in §0 are a linear scan's, and a
  scorer with a nested loop over name tokens is a different curve.

---

## 3. Decision 3 — the URL shape

Half of this is inherited and not open, and is restated only so the next reader
does not go looking:
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§3 settles that **the path names the subject and the query names the view**, that
an absent parameter means the default, and that the application never writes a
parameter it did not need. `ROUTE_PATTERNS.security` is `/securities/:symbol` and
`securityPath()` is the only thing that builds a destination from it. **This
story adds no third spelling of that path.**

### What was genuinely open: does a search query belong in the address?

**Decided: no. The query never reaches the address, not even transiently.**

- **A half-typed query is not a shareable state.** The shareable thing is the
  security, and the path already names it. A link to `?q=nvi` is a link to
  somebody else's unfinished typing.
- **The back button must not walk keystrokes.** Pushing per keystroke puts one
  history entry per character between a person and the page they came from;
  replacing per keystroke instead means the address is a live mirror of an input
  that carries no state anyone can use. Both are worse than nothing.
- **§3's own rule forbids it.** A query parameter is for an _adjustment to how one
  subject is being looked at_. A search query is not a view of a security; it is
  the act of choosing one.

### What the address does, at each moment

| Moment                                     | The address                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Looking at the list, nothing typed         | `/securities`                                                                        |
| **While a query is being typed**           | **unchanged.** No push, no replace, no parameter. The query lives in component state |
| A result is opened                         | `securityPath(symbol)` — e.g. `/securities/NVDA` — pushed, so Back works             |
| Looking at one security, then typing again | `/securities/NVDA`, unchanged, until another result is opened                        |
| Back, from a security to the list          | `/securities`, with **an empty field**                                               |

That last row is a real cost and is accepted rather than overlooked: because the
query is component state, going Back does not restore it. It is the correct
trade — the query was never a shareable or restorable state, and the alternative
is the address bar churn above. **It is also a thing to say out loud in
[Task 2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)'s keyboard
walkthrough**, because "Back loses my search" is a finding if it surprises
somebody, and a decision if it was written down first.

#### Amended 2026-09-11 by Task 2.11.5 — **the last row of that table is wrong, and it is wrong in the product's favour**

The table was written against the product as it was: every route to a second
symbol was a document navigation, which reloads the bundle and therefore
re-mounts every component on the page. Under that assumption "Back loses my
search" follows from "the query is component state" and needs no measurement.

It no longer follows. `/securities` and `/securities/:symbol` are two `<Route>`s
rendering the **same** route module, so a client-side navigation between them
re-renders `SecurityExplorer` rather than re-mounting it, and the field's state
survives. Measured in Chromium on 2026-09-11 over `/securities` → type `nvid` →
Enter → `/securities/NVDA` → Back → click a table row: the field still reads
`nvid` at every step, `performance.getEntriesByType("navigation")` stays at
**one** entry, and a marker set on `window` survives the whole sequence.

**The decision is unchanged and the behaviour is kept.** Nothing above was
argued from the field emptying — the argument is entirely about what the
_address_ carries — and a query that survives Back is strictly friendlier than
one that does not. What changes is the sentence Task 2.11.9 has to say out loud,
which is now "Back **keeps** my search": a decision either way, but not the one
this file predicted. **Said out loud 2026-09-11, in §7.1's numbered flow, step
8** — walked, kept, and not a defect.

**And it is the answer to that task's own standing question.** TASK-05 warned
that the first client-side navigation would leave component state that had been
silently recreated on every page load alive for the first time, and said to go
looking for the second candidate rather than assume there is none. The
parsed-series cache was the first and wanted it. This field is the second, and
it is benign: the query is not keyed on the symbol and nothing keyed on the
symbol reads it.

### What this binds for Story 2.13

**The query string is empty, and Story 2.13's window control puts the first real
parameter in it.** That is a deliberate handover: `?sessions=5` or an absolute
range arrives into a query string with nothing else in it and no precedent to
argue with, and §3's "the URL carries what the user expressed" applies to it
without a second occupant to disambiguate against.

### Reversal trigger

- **The first time a _result set_ rather than a _security_ is the thing somebody
  would send.** Concretely: a filter on the list — by kind, by sector, by
  tracked status — that a person would want to share or bookmark. That is a view
  of the list, the list is the subject, and the query is then exactly the right
  home for it. **The design deliverable proposes such a filter** (`All (518)` /
  `Equities (502)` / `Index & ETFs (16)`), which is why this trigger is written
  as a condition rather than a hypothetical — see §5.
- **Matching moving server-side** (§2). A server query is a request, and a
  request the address cannot reproduce is a page that cannot be reloaded into the
  state it was in.

---

## 4. The live-region rate

[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§7 hands this story by name, and it hands it two separate questions.

### Is a third asynchronously-filled surface being added to this page?

**Yes, and it is decided here rather than discovered in a layout.** §7's second
reversal trigger — "the third asynchronous surface on one page" — **fires**, and
the answer is that the third region is permitted, for a reason specific to what
this surface is:

**The other two regions speak on arrival and on navigation. This one speaks only
after a person stops typing.** They therefore cannot queue against each other in
the moment that made §7's rule necessary: the universe's sentence and the panel's
sentence land together when the page loads, and the search region is
definitionally silent then, because nothing has been typed. The dangerous case §7
describes — two polite regions updated in the same moment, queued in an order
neither component controls — is not reachable from a state where the third one
only opens its mouth 400 ms after a keystroke that no page load produces.

Its sentences obey the same rule as the other two: **the region belongs to a
subject and every sentence names it.** The subject is the search, not a security.

### The rate, and the distinction that matters most

**Decided: the visible result list updates on every keystroke. The live region
speaks once, 400 ms after the last keystroke.**

The distinction to hold onto, because getting it backwards is the likely defect:

- **This is not a request debounce.** There is no request (§2). Matching is a
  0.295 ms synchronous scan, and debouncing _it_ would make the visible list lag
  behind a person's typing for no reason at all — the worst possible thing to
  spend a debounce on.
- **It is an announcement debounce.** The only thing that waits is the sentence.

**400 ms**, named so that it is one constant with one reader rather than a
magic number in a hook: long enough that a touch-typist's inter-key gap does not
trip it, short enough that it does not feel like a delay after the last
character. It is not derived from anything, and that is stated rather than
dressed up — it is a judgement, and the reversal trigger is a person reporting
that it speaks over them or arrives late.

### The mechanism a page that fills once cannot meet: the sentence must change

§7 measured that **a live region whose text does not change announces nothing**.
Search walks straight into it: type `nvi`, delete to `nv`, and a sentence saying
only how many matches there are is identical in both directions and therefore
inaudible in one of them.

**The repair is to put the query in the sentence.** The count can return to where
it was; the query cannot, because the query is what the person just changed.

> `Security search: 7 matches for "nv". NVDA first.`
> `Security search: no matches for "zzz".`
> `Security search: 1 match for "nvid". NVDA.`
> `Security search: 24 matches for "a", showing the first 10.`

Four properties, each earning its place: the **subject** is named first
(`Security search`), so the sentence survives being queued behind the panel's;
the **query is quoted**, which is what makes consecutive sentences differ; the
**count** is the answer; and the **top match is named**, because a listener who
is about to press Enter needs to know what Enter will open — which is acceptance
criterion 1, spoken.

**Amended 2026-09-11 by [Task 2.11.6](TASK-06-every-search-state-produced.md)
— there is a fifth sentence, and the reason for it is a defect this section
could not see.** The four above are written against a corpus that has arrived.
An empty universe matches nothing, so `Security search: no matches for "nv"` is
**reachable while the securities are still in flight** — a claim about the
market made from data nobody has seen, in the state the product spends its first
few hundred milliseconds in. `searchAnnouncement` therefore takes a
`SearchCorpus` (`ready` with a result, or `loading`) rather than a result, and
checks the corpus **before** the count:

> `Security search: still loading securities. "nv" is kept.`

It keeps all four properties: subject first, query quoted, and silent when
nothing has been typed. The states where the universe could not be **read** are
deliberately not in that union and say nothing at all — the field is not
typeable in any of them, and the universe's own region has already spoken.

`role="status"`, never `alert`, and the four mechanical clauses of §7 are
inherited whole rather than re-derived: a persistent region, rendered in every
state, never unmounted, **silent on arrival**. Arriving at the Security Explorer
with an empty field says nothing, because nothing has happened.

#### Amended 2026-09-11 by [Task 2.11.7](TASK-07-the-security-explorer-shell.md) — **the fourth surface exists, and the answer was to let it fill without speaking**

The Security Explorer's identity block fills from the universe fetch, so the
trigger below fired on the very next task. It is **permitted, and it renders no
`role="status"` and no `aria-live` at all.**

The argument that admitted the third region is explicitly **not** available to
it: search speaks only 400 ms after a keystroke, and the identity block fills at
exactly the moment the other two do. So the alternative — a fourth polite region
queued against the universe's and the panel's, in an order no component controls
— is the precise failure §7 exists to prevent. What makes silence correct rather
than lazy is that **the universe's own region has already spoken for this
fetch**: the identity block is a second _rendering_ of an event that already has
a sentence, not a second event.

The page therefore still holds exactly three live regions, and that count is
asserted in `SecurityExplorer.test.tsx` and in `SecurityIdentity.test.tsx` and
nowhere else.

#### Amended 2026-09-12 by [Task 2.12.6](../story-12-price-chart/TASK-06-reading-a-point-crosshair-hover-and-keyboard.md) — **there is a fourth region now, and the trigger below did _not_ fire**

The count above is false from today: the price chart's reading carries a
`role="status"` of its own, so a browser on `/securities/NVDA` with bars in the
store holds **four**. The sentence is kept rather than rewritten because the
reasoning that produced it is untouched — what changed is the page, not the
argument.

**The reversal trigger did not fire, and that is the part worth reading.** It
names "a fourth asynchronously-filled surface on this screen that must speak".
This surface is not asynchronously filled. It fills on a **key press** and on
nothing else — a pointer moving across the chart announces nothing at all — so
it cannot queue against the universe's region or the panel's, which is the exact
hazard §4 and `FRONTEND-STATE.md` §7 are defending. The two regions that fill
from a fetch are silent at the moment a key is pressed, and the reverse. The
identity block's answer (silence) was right for a surface filling in the same
instant as two others; it is not available here and is not needed.

So the rule §4 actually holds is not _three_. It is **no two regions may change
in the same moment**, and a fourth region that speaks on a different input
satisfies it. A fifth that spoke on a fetch would not.

**One thing the count claim gained is a level.** `SecurityExplorer.test.tsx`
still asserts three and still passes, because jsdom computes no layout: the
chart measures a zero-width plot, has no readings, and the reading layer renders
nothing at all. That test's comment was amended to say so. The fourth region is
visible only to a browser, which is the same seam every other fact about this
chart sits on.

#### Amended 2026-09-11 by [Task 2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md) — **the rate was listened to, and 400 ms inverts below its own threshold**

The reversal trigger below names this pass as the first real opportunity to find
out whether 400 ms speaks over somebody or arrives late. It does both, depending
on how fast they type — and the half that is wrong is wrong for exactly the
listener this section was written for. Typing `nvidia` in Chromium, counting the
distinct sentences the region held:

| Cadence                   | Typing took | Sentences spoken | After the repair |
| ------------------------- | ----------- | ---------------- | ---------------- |
| fast typist, 90 ms/key    | 589 ms      | **1**            | 1                |
| average, 160 ms/key       | 994 ms      | **1**            | 1                |
| hunt-and-peck, 500 ms/key | 3,052 ms    | **7**            | **3**            |

**A debounce answers _have they stopped?_ and cannot tell a pause from an
ending.** Above its own threshold it is exactly right; below it, every keystroke
looks like the last one, so a person typing one six-letter word heard the region
speak seven times, six of them while they were still typing. Two keys a second
is not an unusual rate for somebody navigating by ear.

**No value of the delay fixes this**, and that is why the repair is a second
number rather than a bigger first one: raising it to clear the slowest typist
would make the fastest wait for a sentence they have already read. So
`SEARCH_ANNOUNCEMENT_MIN_GAP_MS` — **1,500 ms** — caps how often the region may
speak **at all**, independent of what tripped it, and the wait is whichever of
the two is longer. What lands when the wait ends is the state **now** rather
than the state that was pending when the floor closed, so a floor delays an
announcement and never queues a stale one.

1,500 ms is a judgement in the same way 400 is, and it is paced by the thing
that actually matters: roughly how long a screen reader takes to read one of
these sentences at a default rate. Speaking again before the previous sentence
has finished is what turns an announcement into a backlog.

**Both numbers are unchanged in meaning and neither is a request debounce.** The
visible list still updates on every keystroke.

### Reversal trigger

- **A person reporting a backlog, or a typing cadence that still produces one.**
  This replaces the third trigger below rather than joining it: that one fired,
  and the instrument is now sharper than "speaks over them or arrives late",
  because the two cadences either side of the floor behave differently and can
  be reported apart.
- **A fourth asynchronously-filled surface on this screen that must speak**, or
  any surface that changes a region's text in the same moment as another. Epic 3's socket is the
  certain one and it lands one epic away; at that point regions need a rate
  rather than a per-surface judgement, and §7's own words are that "the
  announcement stops being of the _change_ and becomes of the _state_".
- **A person reporting that the 400 ms sentence interrupts their typing or lags
  behind it.** [Task 2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)'s
  screen-reader pass is the first opportunity for that, and it should be looked
  for rather than waited for.

---

## 5. What the design deliverable said, and where it disagrees with this file

The deliverable is
[`2.11-design.html`](2.11-design.html) — a five-tab Tailwind mock of the universe
with an active combobox, the Explorer shell, a zero-bars shell, a search-state
matrix, and its own decisions tab.

**Read this section's scope first, because it narrowed while the story ran.**
Since [ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)
the `Component library for MarketPulse` **design canvas is the source of truth**
for this product's design language, and two of the screens this story built came
from it rather than from the mock:

- **The Security Explorer shell** — the grid map, the identity block's four
  states, the placeholder treatment with its five sentences, and the three
  viewports — is **section 07 of the canvas**, added 2026-09-11 through
  `DesignSync`, which is ADR 0026's chain working as intended.
- **The universe navigation control** — the band rail and `Collapse all` — is
  **`Universe navigation.dc.html`**, a **second file** in the same project. It is
  a second file rather than a ninth section because `DesignSync`'s `get_file`
  caps a read at 256 KiB and the main canvas is already larger: it returns
  exactly 262,144 bytes, truncated mid-attribute, so a read-modify-write of that
  path can only publish a file with everything past the cap deleted. ADR 0026's
  "the canvas is one file" bullet carries that as a dated amendment.

So **the canvas is no longer one document**, and what follows adjudicates the
**mock**. The mock's Explorer tab is a superseded reference: where it and the
canvas disagree about the shell, the canvas won and the disagreement is not
re-argued here.

It is treated the way `VISUAL-LANGUAGE.md` treats its predecessor: **a reference
and not a specification.** That precedent is explicit — of `story-10-design.html`,
"three of its decisions were taken, one was narrowed and two were declined" — and
this section says which is which, because the disagreement is the interesting
content and resolving it silently is how a design decision becomes an accident.

### Positions taken from it

| Design's position                                                                                | Taken as                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bordered, not underlined**                                                                     | **Taken.** An underlined field on a page of hairline-bordered panels reads as a form field on a document; a bordered box reads as an instrument. It also has a resting silhouette, which an underline only acquires on focus                                                                     |
| **The input text is set in the monospace face**                                                  | **Taken.** `--font-data` is the face for "figures and identifiers: tickers", and what a person types here is predominantly a ticker. The cost is accepted: a typed company name is also in mono. It is the single detail that most makes the field read as a command line rather than a web form |
| **A clear (`×`) affordance and a visible `ESC` hint inside the field**                           | **Taken.** Both are how a control says what its escape hatch is without a tooltip, and the `ESC` chip is the micro-label idiom doing a job                                                                                                                                                       |
| **A cap on shown results, with the true total stated** — its `Displaying top 5 of 14 query hits` | **Taken as a rule**, not as the number. The cap's value is [Task 2.11.2](TASK-02-the-matcher.md)'s, and the requirement here is that the matcher returns **both** the shown matches and the true total, so §4's sentence and the surface's footer cannot lie                                     |
| **A count line under the field**, associated with it                                             | **Taken**, and it is the _visible_ half of §4 — it updates per keystroke while the spoken sentence waits                                                                                                                                                                                         |
| **An untracked security is shown in results and marked** — its `BBBY … [UNTRACKED]`              | **Taken**, and it was never open (§6). Worth recording that the design got this right unprompted                                                                                                                                                                                                 |
| **Selection updates the path and nothing else; back/forward stay deterministic**                 | **Taken** — the same answer as §3, reached independently                                                                                                                                                                                                                                         |
| **A sector jump rail over the grouped table**                                                    | **Taken in principle**, and it is [Task 2.11.8](TASK-08-the-universe-table-past-500.md)'s to design and build. This file records only that the trigger Story 2.4 wrote has fired and a control is the answer                                                                                     |

#### Amended 2026-09-11 by Task 2.11.8 — the rail was built, and its detail settled three things this table left open

The rail ships as a `<nav aria-labelledby>` above the table holding one link per
band with its count, plus a **collapse** the deliverable also drew and this file
did not adjudicate. Three details were decided in that task and belong beside
the row above rather than only in its own record:

- **The full sector name, not `TECH`.** The mock abbreviates all eleven.
  Declined: `SECTOR_LABELS` exists precisely so nobody derives a display string
  by transform — its own comment says `"Health Care"` and `"Healthcare"` are the
  same slug and different words — so an abbreviation is a **twelfth vocabulary
  for eleven things this product already names once**. Measured: twelve full
  labels fit one row at 1710px, wrap to two at 1024 and four at 640, all of them
  legible.
- **`Collapse all` is taken**, which the table above does not cover because this
  file recorded only the rail. It is the half of the control that actually makes
  518 rows navigable: measured, the page goes from **20,402px to 2,273px** and
  the focusable elements on it from **556 to 38**.
- **A sticky band header is declined, and not on taste.** Measured in the
  running page: a band given `position: sticky; top: 0` and scrolled 400px past
  reported a viewport top of **−400px**. It does not stick, because the `Panel`
  around the table declares `overflow: auto` and therefore _is_ the scrollport —
  and it never scrolls, since it grows with its content while the page scrolls.

### Positions narrowed

- **The result row's price — the one decision this task escalated to the user,
  and the answer was the design's.** The brief left it open; the user chose
  **price and change on every row**. So the row carries five facts, not four,
  and the honesty problem the brief named comes with it: a "last close" is the
  last session we hold a bar for, not today. **The qualifier is where this is
  narrowed.** Measured: all 518 `lastCloses` carry their own `session` and all
  518 read `2026-09-04` today — one distinct value — so:
  - the **result surface** carries the session once, in its footer, beside the
    cap (`Closes as of 4 Sep · showing 10 of 24`);
  - a row whose own `session` is **earlier than that** carries its own date,
    which costs nothing in the common case measured above and cannot be a lie in
    the uncommon one;
  - the number is a **close**, and the column says so. Nothing in a result row
    is labelled "price" while the live feed does not exist;
  - the change keeps `PriceChange`'s glyph and sign, because a percentage
    distinguished only by hue differs by 1.04:1 in greyscale.
- **The field's border weight.** The design draws the active field with a **2px
  near-black** border. Declined at that weight for a concrete reason rather than
  a stylistic one: the global focus ring is a 2px near-black outline at 2px
  offset, so a resting border of the same weight and colour leaves the field
  **with no visible focus state** — a `:focus-visible` outline landing 2px
  outside a line that already looks like one. The resting border is
  `--rule-hairline`, which is what the token layer already calls "the ordinary
  border: panels, controls, inputs, chips", and focus stays the token layer's job.
- **A sixth icon.** The design uses a magnifying glass, twice, and the set has
  been closed at five since the refresh. **Taken — the set becomes six** — because
  the affordance has to be recognisable at a glance on a dense screen, and the
  micro-label above the field reads as a section heading rather than as "you can
  type here". Two consequences recorded rather than left implicit: it is named
  **`magnifier`**, not `search`, because `Icon.tsx`'s own rule is that a symbol is
  named for **what it is** and not for what a consumer uses it for
  (`arrowRight`, not `explore`); and **the set is now six, so the next addition
  needs its own argument in its own task** rather than citing this one.
- **`Locked`, the seventh field state.** **Dropped until authentication exists.**
  §37 excludes authentication beyond demo needs, so `Locked` has no consumer, and
  a state drawn against no consumer is precisely the guess that deferred input
  fields in the first place. The design does not draw it either.
  [Task 2.11.3](TASK-03-the-field-the-product-never-had.md) therefore ships
  **six** states plus _searching_ and _results open_, and the trigger for the
  seventh is **the first field a person can see and may not edit**.

### Positions declined

- **The kind-filter chips** (`All (518)` / `Equities (502)` / `Index & ETFs (16)`).
  Declined for this story, for the reason §6 gives: they change what is on screen,
  and the summary line says which of two numbers it is reporting. A filter is a
  legitimate feature and it is the thing that fires §3's reversal trigger — so it
  arrives with a query parameter and an amended summary line, in a task that owns
  both, not as three chips over a table.
- **`IndexedDB`/offline fallback for the combobox** (the design's Case D). There
  is no offline store in this product, adding one is not in Story 2.11's scope,
  and the state the story actually owes is the honest one: the universe fetch
  failed and search is unavailable **while the rest of the screen keeps working**
  (§36). Declining this matters because the mock's copy — "Search operates
  seamlessly with zero latency degradation" — describes a capability we would be
  claiming rather than having.
- **Rounded corners.** `rounded` is on the field, the chips, the result surface
  and the nav links throughout the mock. Radius is zero in this language, and the
  brief names a rounded search field as the single most likely way this screen
  announces itself as a generic web app.
- **Tailwind's palette and Inter-for-everything.** The mock is built on
  `cdn.tailwindcss.com` with `#d00000`, `gray-*` and a two-face stack. The
  product has three self-hosted faces with distinct jobs and a token layer that
  throws at startup if a declared token is missing from the stylesheet. The mock's
  values are read as _intent_, and the tokens are what ship.
- **`SIP CONSOLIDATED (0.42ms lag)` in the masthead's feed region.** Declined,
  and it is the most important decline on this list, because it is not a style
  disagreement — **it is invariant 6 inverted.** The free plan's live stream is
  **IEX only**; stored historical bars are consolidated SIP. A live indicator
  reading `SIP CONSOLIDATED` claims coverage of every US exchange for a stream
  that has one venue in it, which is the exact misleading label
  [`PRODUCT_SPEC.md`](../../PRODUCT_SPEC.md) §7.1 exists to forbid. The shipped
  vocabulary is `packages/shared/src/market-provenance.ts` and this screen does
  not add a second one. The `0.42ms lag` figure is fabricated (see below).
- **Its navigation.** The mock renames `Security Explorer` to
  `Securities Directory` and adds a fifth item, `System Topology`. The four items
  are `PRODUCT_SPEC.md` §8's four primary experiences in its order, four browser
  specs assert on those strings, and a fifth item is what §1's second reversal
  trigger is about.

### Figures in the deliverable that are fabricated, and are not to be carried forward

Recorded explicitly because a plausible number copied out of a mock is worse than
an obviously missing one, and because this repository's rule is **measure rather
than cite**:

`Aggregate ADV: $174.20B`; `Total Market Cap: $48.60T`; `0.42ms` feed latency;
`100% TAPE SYNC`; NVDA's `CUSIP: 67066G104` and `ISIN: US67066G1040`; a `Beta:
1.68 vs SOX`; `502 Equities, 16 Thematic ETFs` (measured 2026-09-11, the real
split is **503 `equity`, 11 `sector_etf`, 4 `index_etf`** — three kinds, not two,
which also means the equity/ETF distinction a result row carries is a derived
grouping rather than a field); `NVDA.U
YieldMax NVDA Option Income Strategy ETF` and `CRWV CrowdWave Technologies`,
which are not securities we track; and the exchange column, which the mock fills
with `NASDAQ` for everything including NYSE listings while the response carries a
real `exchange` per security.

**It also names stories that do not exist.** Its placeholder cards are labelled
Stories 2.12 to **2.16**, and Epic 2 ends at 2.14. The five placeholder regions
in [Task 2.11.7](TASK-07-the-security-explorer-shell.md)'s shell are filled by
**later epics**, and Story 1.5's convention is that an empty region names the
epic that fills it — which is a promise the roadmap can keep, unlike a story
number invented to fill a card.

---

## 6. Two constraints that are not decisions, and one decision they force

Recorded here because they are what a later reader will otherwise re-argue, and
because the next four tasks read this file rather than the three documents these
come from.

### `status` is not filtered, and an untracked security is findable

[`UNIVERSE.md`](../story-03-security-domain-model-and-tracked-universe/UNIVERSE.md)
§12.2 names "the universe list and search" as a reader that must **not** filter on
`status`: "show it, with its status". The rule in that file's own sentence is
_filter on `status` when computing over the market we track **now**, and never
when showing or replaying something we **stored**._ Search shows what we stored.

**A search that drops an untracked security reintroduces exactly the failure the
schema avoids by having no `deleted_at`** — a row that silently vanishes, on a
screen whose job is to tell you what exists. `status` is therefore not an input
to the matcher at all ([Task 2.11.2](TASK-02-the-matcher.md) owns whether it
affects _rank_, which is a different question and is open).

**Answered 2026-09-11 by [Task 2.11.2](TASK-02-the-matcher.md): an untracked
security ranks _below_ a tracked one within the same tier, and is never
omitted.** Membership and rank stay separate questions and only the second one
moved. It changes nothing at all at the exact-symbol tier, where the match is
unique, and `security-match.test.ts` asserts both halves — an untracked security
is returned for its symbol and for its name, and it loses a tie it would win
alphabetically.

One thing to know before trying to see this state: **all 518 securities are
`active` today** (measured, §0). The untracked rendering cannot be produced from
the local database, and Task 2.4.6 produced it against the deployed one. Whoever
implements [Task 2.11.6](TASK-06-every-search-state-produced.md) should expect to
construct it rather than find it.

**Measured 2026-09-11 by Task 2.11.6, which constructed it.** The interaction
this section describes in the abstract has a number on it now, taken against the
recorded universe: for the query `a` — 99 matches, cap ten — an untracked `AAPL`
**falls from match 2 to match 50** and off the shown slice entirely, while the
total still counts it. That is the rule working, and on screen it is
indistinguishable from the row having been filtered out, which is the one thing
this section forbids. The two things that make the difference legible are the
footer's `showing 10 of 99` and the fact that a more precise query reaches the
row with its mark; both have tests. The fixture is
`apps/frontend/src/fixtures/securities.ts`, and its derivation was checked
against a body recorded off the real route with the store mutated — the two are
identical.

### The summary line must not become a lie

The line reads
`518 securities tracked · 11 sectors · 15 ETFs · all with history · 47.7M minute bars · through 2026-09-04`,
with a fourth figure appearing only when some security is no longer tracked. It
**says which of two numbers it is reporting**, which is the property that makes
it true rather than approximately true.

The constraint that follows: **any control that changes which rows are on screen
has to change that line in the same commit.** Search itself does not — the field
filters a _result surface_, and the table underneath is untouched, which is one
more reason the combobox is a surface over the page rather than a filter on the
table. The thing that would trip it is a filter on the table, which is what §5
declines and §3's reversal trigger names.

**Amended 2026-09-11 by Task 2.11.8, which built the control this predicted.**
`Collapse all` and the band rail change which rows are on screen, and the summary
line changed in the same commit: it gains `444 of 518 rows shown` when some band
is shut and says nothing extra when none is. Search still leaves it
byte-identical, which `SecurityExplorer.test.tsx` asserts, and the browser suite
asserts the collapsed clause against `0 of 518 rows shown`.

### One retry per failure per screen, and it belongs to the surface that owns the data

**Decided 2026-09-11 by [Task 2.11.6](TASK-06-every-search-state-produced.md), and
recorded here because it is a product-wide rule that was living in a component
header.**

Search and the tracked universe render from **the same fetch**. So a failed
universe puts two explanations on one screen, and the naive reading of
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§4 — a retryable failure offers a way to retry — produces **two `Try again`
buttons for one event**, which asks a person to choose between two spellings of
the same action.

**The control belongs to the surface that owns the data.** The tracked universe
owns the fetch, so the table offers the `Try again`; search states the fact and
defers the control, and points at nothing — a sentence saying "use the button
below" is a layout claim in a live region. §4's rule is honoured **in the words**,
in both directions: a retryable failure says waiting may help, a permanent one
says it will not, and that is the half of §4 that survives there being one
button. A browser test asserts `toHaveCount(1)` on the page's `Try again`
buttons.

**Reversal trigger: the first screen where the two surfaces read _different_
fetches.** At that point they are two failures rather than one, and each owes its
own control. Epic 3's live feed is the likely first. Task 2.11.7's shell did
**not** fire it — the table stays on both addresses (§1's amendment), so every
route that can hold this failure still has the control on it.

---

## 7. The keyboard flow, and what a listener hears — walked 2026-09-11 by Task 2.11.9

Everything in this section was **walked in Chromium against the running pair**,
not read off the DOM. Where a figure appears it was taken; where a judgement
appears it was taken by a person after the walk, and the alternative it beat is
stated beside it.

**The instrument, stated plainly, because it changes what the claims are worth.**
The keyboard half was walked with real key presses. The listening half was taken
from **Chromium's own accessibility tree** — the computed role, accessible name,
description and state of each element as focus reached it, plus every distinct
sentence each live region held and when — which is the data an assistive
technology is handed, and is **not the same thing as hearing it**. Two classes of
finding below are therefore held at the confidence they deserve rather than
asserted: how a given screen reader pronounces a name, and what its table
navigation does in a table with no data rows. Everything else — what is
reachable, in what order, what is announced and at what rate, and whether focus
can be seen — is a measurement.

### 7.1 The numbered flow

Focus after every transition is stated, because focus after a result is opened is
the step most often left to chance and landing at the top of a new document is
not the same as landing on it.

| #   | Key                      | What happens                                                                                                                                | Focus afterwards                                               |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `Tab` ×5 from the top    | past the four navigation links to the field. It is a control _over_ both surfaces, so it precedes both                                      | the field, `aria-expanded="false"`                             |
| 2   | type                     | the list opens on the **first** keystroke; the visible list updates on every one                                                            | **the field, throughout** — see 7.2                            |
| 3   | `ArrowDown` / `ArrowUp`  | moves the active row and wraps at both ends; `aria-activedescendant` names it                                                               | still the field                                                |
| 4   | `Enter`, list open       | opens the active result — `securityPath(symbol)`, pushed                                                                                    | **still the field**, holding the query. See 7.3                |
| 4a  | `Enter`, nothing matched | **nothing.** The address does not move                                                                                                      | the field                                                      |
| 4b  | `Enter`, many matched    | opens the **first**, which is the one the sentence named                                                                                    | the field                                                      |
| 5   | `Escape`, list open      | closes the list and **keeps** the query                                                                                                     | the field                                                      |
| 5a  | `Escape` again           | clears the query. Two behaviours, one key, in the order a person expects                                                                    | the field                                                      |
| 6   | `Tab`, list open         | the list closes — no trap                                                                                                                   | the field's own clear button, then onward through the page     |
| 7   | `Shift`+`Tab`            | back to the field, with the query intact and the list reopened                                                                              | the field                                                      |
| 8   | `Back`, from a security  | **the field keeps its query** — §3's amendment, and the friendlier of the two answers                                                       | wherever it was; nothing is stolen                             |
| 9   | `Tab` on, past the field | eight region panels, `Collapse all`, twelve rail links, then the table's first band — **23 stops**, and **24 since 2026-09-12** — see below | each in turn, and **none of them behind the chrome** — see 7.4 |

#### Amended 2026-09-12 by [Task 2.12.6](../story-12-price-chart/TASK-06-reading-a-point-crosshair-hover-and-keyboard.md) — **the walk is 24 stops, and the new one is second**

The price chart became readable, which made it focusable. Re-walked at three
viewports on 2026-09-12, from the field:

| Stop  | What                                                               |
| ----- | ------------------------------------------------------------------ |
| 1     | the **Price** region panel                                         |
| 2     | **the chart** — `NVDA price chart`, one stop and never one per bar |
| 3–9   | the seven remaining region panels                                  |
| 10    | `Collapse all`                                                     |
| 11–22 | the twelve rail links                                              |
| 23    | the table's first band                                             |

So **24 stops** to the first band rather than 23, and the new one is the second
thing a person meets after the field — which is the right place for it, because
it is inside the region it reads and a keyboard user reaches it before any of
the six regions that still hold nothing.

**It is one stop and it is worth saying why that is not free.** The default
window is 1,950 bars; the naive implementation of a readable chart makes each one
focusable, which would have made this walk 1,973 stops and the rail unreachable
in practice. `CHARTING.md` §1's element-count constraint and this row are the
same constraint seen from two ends.

Two notes on what this does **not** change. The chart renders **no** stop where
there are no bars to read — CI's store holds none, so the walk there is still 23.
And §7.4's occlusion table is not re-taken here: `e2e/specs/search-keyboard.spec.ts`
walks 26 presses, which still covers the whole run with room to spare, and it
passes at both viewports with the new stop in it — so the `scroll-padding-top`
repair covers it. The full three-viewport re-walk is
[Task 2.12.8](../story-12-price-chart/TASK-08-the-text-alternative-and-the-screen-reader-walk.md)'s,
which already names this stop as the thing it has to measure at the narrow end.

### 7.2 Focus never enters the list, and that is the pattern rather than an accident

This is an **active-descendant** combobox: focus stays in the input for the whole
interaction and the "active" row is a pointer (`aria-activedescendant`) rather
than a focused element. The consequence a walk makes obvious and a DOM does not:
**typing is never interrupted to look at a result.** A listener hears the row
without leaving the field they are typing in, and `Backspace` still edits the
query rather than doing something surprising.

The id it points at was checked to be **in the document** — a combobox pointing
at an id that is not announces a row that does not exist, and renders identically
to one that does.

### 7.3 Focus after a result is opened: it stays in the field

**Decided: focus stays where it was.** The route re-renders rather than
re-mounting (Task 2.11.5), so the field is literally the same element, still
holding the query.

The argument, and it is a product one: this control is a **symbol switcher** as
much as a search box (§1), and the two things a person does after opening a
security are _look at it_ and _open a different one_. Staying in the field costs
the first nothing — one `Tab` reaches the page in reading order — and gives the
second everything.

**The objection it had to answer was silence**, because a listener who has just
changed the whole subject of a page and heard nothing has been told the control
did not work. It does not apply, and that was measured rather than assumed:
opening `AMD` from `/securities` changed the **panel's** live region to
`AMD: holding 390 bars, through 2026-09-04 16:00:00 EDT, …` within 300 ms of the
keypress. The arrival announces itself, by the region that owns the subject that
changed, naming it — which is exactly `FRONTEND-STATE.md` §7's rule doing the job
it was written for. The identity block staying silent (§4's amendment) is what
keeps that one sentence from being two.

**The alternative was moving focus to the identity block**, and it was rejected
on what it costs: it would take the query away from a person mid-switch, it needs
a `tabIndex={-1}` on a heading that is otherwise not interactive, and it buys an
announcement the page already makes.

### 7.4 What the walk found, and what was fixed here

Five findings. The first is the largest and had stood since the chrome became
sticky.

**1. Tab focus landed underneath the sticky chrome — WCAG 2.2 2.4.11, and axe
read zero violations through all of it.** The browser's scroll-into-view for
sequential focus navigation knows nothing about a sticky header, so it parks the
newly-focused element behind it.

| Viewport | Chrome | Occluded stops in the first 30                                 |
| -------- | ------ | -------------------------------------------------------------- |
| 1440×900 | 132px  | 1 — the Tracked universe region                                |
| 768×800  | 180px  | 4 — Price, Abnormal-move, Tracked universe, **`Collapse all`** |
| 390×780  | 208px  | 2 — Price, Tracked universe                                    |

It **worsens as the viewport narrows**, because the status strip wraps to two
rows at 768 and three at 390 — so the one instrument that could have caught it, a
person tabbing through on a development machine, is the one looking at the
narrowest chrome. `Collapse all` at 768 is the sharpest case: the control Task
2.11.8 calls the real skip link, reached by keyboard, invisible.

The repair is one declaration — `scroll-padding-top` on the scroll container, fed
by the height `AppHeader` measures and publishes as `--sticky-chrome-height`. It
cannot be a token: `--app-header-height` is the masthead only and the chrome's
real height exists at three values decided by a media query. Held by
`e2e/specs/search-keyboard.spec.ts` at two viewports, and the red was verified by
restoring the break.

**One residue, recorded rather than fixed.** The Tracked universe region is a
tab stop on a panel 18,895px tall that **never scrolls** — `scrollHeight` and
`clientHeight` are equal, because it is sized by its content. Focusing it lands
somewhere that is not its heading both before and after the repair, and the next
`Tab` (`Collapse all`) corrects it. The real answer is a `Region` that can say it
does not scroll, which Task 1.13.4 deliberately declined to build — _"which of
the four scrolls is a function of the viewport"_ — and that argument still holds
for the other seven. **Reversal trigger: a second region on any route that is
taller than the viewport and demonstrably cannot scroll.**

**2. The unavailable field explained itself to nobody.** In the three states
where search cannot answer, the reason is wired to the control with
`aria-describedby` — which is read **when the control is reached** — and the
control was natively `disabled`, which is not focusable. Measured: the tab order
ran straight from the fourth navigation link to the first region. The sentence
was computed correctly, attached correctly, on screen, and structurally
unreachable by the one person it was written for.

**Decided: the field stays in the tab order.** It renders `aria-disabled` and
`readOnly` rather than `disabled`, in `TextField` and therefore for every control
after it. `readOnly` alone was rejected on meaning — that prop is a display
state, _a value nobody edits here_, and borrowing it would make what a listener
hears say nothing about why. Leaving it was rejected because the alternative
explanation on screen, the tracked universe's own failure block, is two stops
further on and describes a different surface.

Two consequences were followed rather than left: the state **stopped being
inactive**, so WCAG 1.4.11's and 1.4.3's exemptions no longer reach it. The
border rose from `--rule-soft` (**1.07:1** on the page) to `--rule-control`
(**4.22:1**) and the value's ink from `--ink-disabled` (2.62:1 on white) to
`--ink-secondary` (**6.49:1**). What still tells it apart from read-only is the
lighter value and the cursor, both of which survive greyscale.

**3. The bulk collapse removed 518 rows in silence.** Task 2.11.8's reason for
leaving the summary line out of the live region is that `aria-expanded` is spoken
at the moment the listener presses the control and about the thing they pressed.
That is a complete argument for a band's own disclosure and **it did not reach
this control, because this control had no `aria-expanded` to speak.** The label
flipping `Collapse all` → `Expand all` is not a substitute: a name is read on
arrival at a control, and one that changes under a listener already standing on
it is not reliably re-read by anything. (A comment in `UniverseTable.test.tsx`
claimed it was; it has been corrected with the measurement.)

Fixed with the same mechanism the twelve bands use rather than a fourth live
region, which also leaves §4's count of regions on this page where it is. It
carries no `aria-controls`: twelve targets, no element containing all of them.

**2.11.8's decision for a single band is confirmed rather than overturned.**
Collapsing one band still announces only `collapsed`, and the summary line's
`444 of 518 rows shown` is still not spoken. On the walk that reads correctly —
one action, one announcement, about the thing that was pressed.

**4. The tracked universe was a table with no name.** Chromium computed
`""`. Invisible to a reader (the `Region` around it is named) and the whole of
what a screen reader's table list has to go on — which on a page whose content
_is_ one table is the one navigation aid that could go straight to it. A
visually-hidden `<caption>` now carries the region's own words; a paraphrase
would have been a second name for one thing.

**5. The 400 ms announcement rate is wrong below its own threshold, and the fix
is a second number rather than a bigger first one.** See §4's amendment below.

### 7.5 What was listened to and left alone

- **The rail's arrival announces its subject.** A jump travels up to 16,069px and
  lands focus on the band's disclosure button, whose accessible name is
  `Energy Benchmark XLE 22 securities` — the band, its benchmark and its size. A
  listener knows where they are from the landing itself, so the arrival needs no
  sentence of its own. It also lands at exactly `top: 132`, the chrome's bottom
  edge, because Task 2.11.8 measured the chrome and subtracted it.
- **The landmark list reads as a contents page**, which is what a listener
  orienting on a strange screen uses: banner, main, `Primary` navigation, then
  the seven §8.3 regions in reading order, `Tracked universe`, and
  `Jump to a sector`. Two navigations, both named, which is why `landmark-unique`
  is quiet.
- **Eight region panels in the tab order, six of them holding nothing
  focusable.** Heard, and left. Tabbing onto a named landmark that holds only a
  heading and a sentence is how a keyboard user reaches content they would
  otherwise have to scroll to, and it is `Region`'s deliberate
  `scrollable-region-focusable` fix rather than an accident. What made it
  tolerable rather than merely defensible is finding 1: they are now all
  **visible** when reached, which they were not.
- **`Collapse all` sits nine stops after the field**, before the twelve links it
  belongs with, and Task 2.11.8 asked whether a keyboard user discovers it.
  Walked: it is the **first** thing in the rail's own header, reached immediately
  after the last region and immediately before the links — so anybody tabbing
  toward the table meets it before meeting a single row. Left as it is.

### 7.6 Two findings recorded and not acted on

Both are real, both were measured, and neither is repaired here because the
repair is worse than the finding.

**Accessible names are computed from _rendered_ text, so this language's
letterspaced micro-labels reach an assistive technology in capitals.** Chromium
returns `FIND A SECURITY` for the field, `COLLAPSE ALL` for the bulk toggle,
`JUMP TO A SECTOR` for the rail, and `Technology BENCHMARK XLK 74 securities` for
a band. `CLAUDE.md` already records the DOM-versus-rendered-text split for
_asserting_ on these words; that it reaches the **accessible name** is the same
fact one layer further on. It is left alone on the grounds that no meaning is
lost — the words are the words — and that the only repairs available are an
`aria-label`, which `UniverseTable`'s rail already argues against by name (_"a
second name nobody reviewing the screen can see is a name that drifts from the
visible one"_), or abandoning a typographic idiom the canvas owns.
**Reversal trigger: a name where the capitals change what is said rather than how
— an initialism a reader would spell, or a word a reader would stress.**

**This is also the first real engine to read Task 2.11.8's two repaired names,
and it disagrees with the jsdom measurement.** That task recorded the band as
`Technology Benchmark XLK 74 securities`; Chromium says
`Technology BENCHMARK XLK 74 securities`. The repair itself — the explicit spaces
that turned `TechnologyBenchmark XLK2securities` into words — is **confirmed
correct**; it is only the case that differs, for the reason above. The rail
link's `Technology 74 securities` is confirmed exactly as recorded, because
nothing in it is letterspaced.

**A table with twelve rowgroup headers and zero data rows keeps its seven column
headings.** With every band shut: 13 rows, 12 band headers, **0 `<td>`s**, and
the seven column headings still there. Whether that reads as a promise of content
that is not there depends on a real screen reader's table navigation, which the
accessibility tree cannot answer — so it is written down as an open observation
rather than settled by inference. The argument for keeping the headings is that
the bands are one keystroke from reopening and a table whose columns vanish and
return is worse than one that is briefly empty. **Reversal trigger: a person
reporting that the collapsed table reads as broken.** Note `aria-controls` on each
band names the `<tbody>` that contains its own trigger — a superset of the truth
rather than a wrong answer, and there is nowhere else to put the id, because a
table admits no element between a `<tbody>` and its rows.

---

## 8. What this file hands to each task that reads it

| Task                                                                  | What it takes from here                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2.11.2](TASK-02-the-matcher.md) — the matcher                        | Client-side (§2). Prefix-aware rather than `includes()`, and the `nv` → `FRT`/`INVH`/`IVZ`/`KVUE`/`QQQ` finding to write a test against (§0). Returns shown **and** total (§5). No fuzzy dependency without amending §2. `status` is not a filter (§6) — **and, decided there, not a tie-break winner either: untracked ranks below tracked within a tier**                                                                   |
| [2.11.3](TASK-03-the-field-the-product-never-had.md) — the field      | Bordered, mono input face, hairline resting border with focus left to the token layer, a clear affordance and an `ESC` hint, **six** states not seven — `Locked` is dropped (§5)                                                                                                                                                                                                                                              |
| [2.11.4](TASK-04-search-on-screen.md) — search on screen              | The field's home (§1). No new fetch (§2). No query in the address (§3). The 400 ms announcement debounce with the visible list updating per keystroke (§4). A row carrying a close **and** its change, with the session qualified on the surface (§5)                                                                                                                                                                         |
| [2.11.5](TASK-05-client-side-navigation-and-the-table-as-a-way-in.md) | Selection is `securityPath(symbol)`, pushed, and Back returns to the list (§3). **Done 2026-09-11, and it measured the "empty field" half of that line to be false — see §3's amendment: the field keeps its query**                                                                                                                                                                                                          |
| [2.11.6](TASK-06-every-search-state-produced.md) — every state        | Search unavailable is the universe fetch having failed, and the rest of the screen keeps working; there is no offline fallback (§5). The untracked state must be constructed (§6). **Done 2026-09-11**: the control takes `SecuritiesView` whole and is rendered in every state; it carries **no retry of its own** and no sentence pointing at the table, and §4 gained a fifth sentence                                     |
| [2.11.7](TASK-07-the-security-explorer-shell.md) — the shell          | The field sits above whatever the table becomes (§1). Five placeholders name **epics**, not invented story numbers (§5). **Done 2026-09-11**: the table stays on both routes, last and full width (§1's amendment); the identity block is the fourth asynchronous surface and is silent (§4's amendment)                                                                                                                      |
| [2.11.8](TASK-08-the-universe-table-past-500.md) — the table past 500 | A jump rail is taken in principle; a kind filter is not, because it moves the summary line and wants a query parameter (§§3, 5, 6)                                                                                                                                                                                                                                                                                            |
| [2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)           | "Back **keeps** my search" is a decision to state, not a defect to find (§3, as amended 2026-09-11). The 400 ms rate is the thing to listen for (§4). **Done 2026-09-11**: the numbered flow and the pass are §7; focus after opening stays in the field and the arrival is announced by the panel's region; five findings fixed, two recorded; §4's rate trigger fired and gained a floor                                    |
| [2.11.10](TASK-10-deployed-verify-document-and-adr.md) — the close    | This file, finished with what was found, plus ADR 0024 and the `CLAUDE.md` table entry. **Done 2026-09-11**: the figures are re-taken in §0.1 (the payload has not moved; the bundle is +12.22 kB gzipped), the keyboard flow is §7 after a renumber, the retry rule and the canvas as the shell's design source are written down, and the upward sweep is listed in [`TASK-10`](TASK-10-deployed-verify-document-and-adr.md) |

---

## 9. What nothing checks

In the spirit of `CLAUDE.md`'s own list, because a stated invariant that nothing
checks quietly stops being true:

- **That the address stays clean while a query is being typed** (§3). Nothing in
  `pnpm verify` reads the address bar during a keystroke. It is a browser
  assertion and it is **still owed** after Task 2.11.9: that task's journey
  asserts the address at the ends of the flow — unchanged before `Enter`, the
  security's path after it, and back to `/securities` on `Back` — which catches a
  query pushed as a _destination_ and would not catch one replaced per keystroke
  and tidied up afterwards. Re-measure by writing it: type into the field, and
  assert `page.url()` between keystrokes.
- **That the third live region stays silent on arrival** (§4). §7 already records
  that a new `role="status"` on any route goes red nowhere. This one is enforced
  by whatever test 2.11.4 writes and by nothing else.
- **That two surfaces describing one failure do not use the same words**
  (added 2026-09-11 by Task 2.11.6). Search and the tracked universe render from
  the same fetch and describe the same event, and nothing anywhere refuses a
  sentence that repeats the other's. It happened three times in one afternoon and
  every one was caught by a `getByText` resolving to two or three elements rather
  than by anybody reading the page — so it is checked only where a test happens
  to assert on one of the strings. Re-measure: give the search's hint the table's
  own `cause` sentence and watch which tests notice.
- **That the search control is on the page in every state** (added the same day).
  It was absent in three of them until this task, and `pnpm verify` stayed green
  throughout — a component nobody renders raises nothing. Two browser assertions
  and one route test stand there now, and nothing else does. Re-measure: wrap
  `<SecuritySearch>` in `view.state === "loaded" ?` again and confirm exactly
  three tests go red.
- **That the result surface's session qualifier agrees with the closes beside it**
  (§5). The qualifier is rendered from `lastCloses[].session` and today all 518
  agree, so a bug in which the footer states one session while a row's close came
  from another is **invisible while the data is uniform**. Re-measure the
  uniformity rather than trusting it: it was one distinct value on 2026-09-11, and
  a partially-backfilled security is the condition that ends that.
- **That a navigation between two securities stays client-side** (Task 2.11.5).
  Nothing in `pnpm verify` can see it: jsdom has no history and no bundle to
  reload, so a component test cannot tell a client-side navigation from a
  document one at all, and swapping the table's `Link` for a plain `<a href>`
  leaves every unit, component and integration test green. It is asserted in
  `e2e/specs/security-navigation.spec.ts` — which does gate a merge — and by
  nothing else. Re-measure: make that swap and confirm the browser suite goes
  red on the navigation count while `pnpm verify` stays green.
- **That a `Region` taller than the viewport lands focus anywhere useful**
  (added 2026-09-11 by Task 2.11.9). `scroll-padding-top` fixed every ordinary
  tab stop and cannot help this one: the browser does not scroll a target it
  already considers in view, and an 18,895px panel on a 900px viewport always
  is. The next `Tab` corrects it, so the spec asserts the property that matters
  — nothing **short** is obscured — and says so in its own predicate rather than
  quietly excluding a case. Re-measure: tab to the Tracked universe region and
  read `window.scrollY`.
- **That the letterspaced micro-labels reaching an assistive technology in
  capitals stays harmless** (§7.6). Nothing compares an accessible name against
  its own DOM text, and nothing could say which difference matters — an
  initialism a reader would spell is a defect and a shouted label is not.
  Re-measure with Chromium's accessibility tree, which is where it was found.
- **The masthead's remaining slack** (§1). 377px at 1280 is a measurement of the
  chrome as it is on 2026-09-11; nothing fails if a fifth nav item or a longer
  label eats it, and §1's second reversal trigger is written against exactly that.

Two added 2026-09-11 by Task 2.11.7, and the first is the larger:

- **That the Security Explorer's grid has the number of columns it claims.**
  Nothing below `pnpm e2e` can see a column: jsdom applies no stylesheet and
  computes no layout, so a grid whose spans invert passes every unit, component
  and integration test in this repository. It happened — a `span 3` item in a
  two-track grid **grows an implicit third column rather than being clamped**,
  the computed tracks came back `134px 134px 676px`, and the page was visibly
  broken at every width under 1184px with `pnpm verify` and all 54 browser tests
  green. It was found by opening the page. `e2e/specs/security-explorer-shell.spec.ts`
  stands there now, and its red was verified by restoring the break. Re-measure:
  delete the `.full` override inside the two-column media query and confirm test
  2 of that spec fails.
- **That the six placeholder labels still name a plan the roadmap holds.** An
  epic that ships without filling its region leaves a sentence that was true when
  it was written and is false afterwards, and nothing compares
  `SecurityExplorer.tsx`'s six `filledBy` strings against `planning/EPICS.md`.
  Re-measure: grep the route for `filledBy="Epic` and read the epic list beside
  it.

Three added 2026-09-11 by Task 2.11.8, all properties of the navigation control:

- **That a jump lands where a person can see it.** The same class as the grid's
  column count and for the same reason — jsdom computes no layout, so an element
  scrolled to underneath a 133px sticky masthead looks identical to one scrolled
  to correctly. It happened, it was caught by looking, and it is held by
  `e2e/specs/universe-navigation.spec.ts` and nothing else. Re-measure: delete the
  `stickyChromeHeight()` subtraction in `jumpToBand` and confirm test 2 of that
  spec fails.
- **That the rail's counts sum to every row in the table.** That property is what
  makes "no band the control cannot reach" true, and it is therefore the thing
  standing between a jump control and the `status` filter `UNIVERSE.md` §12.2
  forbids. Held by one browser test. Re-measure: drop a group from `BandRail`'s
  `groups.map` and confirm _an untracked security is still reachable through the
  rail_ fails.
- **That `initiallyCollapsed` stays unused by every route.** It is honest API and
  nothing would go red if a route started seeding it — a page that arrives with
  every band shut is the collapse-by-default Task 2.11.8 declined, reintroduced
  through a prop. Re-measure: `grep -rn "initiallyCollapsed" apps/frontend/src`
  finds it in the component and its stories and **nowhere under `src/routes/`**.

Two added 2026-09-11 by Task 2.11.9, and they are **two mechanisms rather than
one**:

- **That no tab stop lands behind the sticky chrome.** The bullet above is about
  the **rail's** jump, which is a `window.scrollTo`. The same class of defect on
  **Tab** — where no jump control is involved at all and the scrolling is the
  browser's own — was found, fixed with `scroll-padding-top`, and is held by
  `e2e/specs/search-keyboard.spec.ts` at **two** viewports, because the 1440 case
  stays green while 768 goes red. Re-measure: set `scroll-padding-top: 0` in
  `base.css` and confirm the 768 test fails on three stops.
- **That every control carrying an explanation is in the tab order.** Nothing
  compares a component's `aria-describedby` against whether the described element
  can be focused, and the failing combination — a correct, attached, visible
  sentence on an unreachable control — renders and lints perfectly. Re-measure:
  restore `disabled={disabled}` on `TextField`'s input and confirm exactly one
  browser test fails, at `the search field is not reachable by Tab`.

One added 2026-09-11 at the close, and it is a note about an instrument rather
than about the product. **Playwright's `toBeDisabled()` treats a native
`disabled` attribute and `aria-disabled="true"` as the same verdict**, so
`securities-route.spec.ts`'s "search says it cannot answer" was green in **both**
worlds — green when the control was unreachable with an unreadable explanation,
and green now that it is neither. It is the right assertion for what that test is
about and it is evidence of nothing else; a note beside it says so. Expect the
same of any assertion that names a **state** rather than a **mechanism**.
