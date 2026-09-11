# Search and selection — where the control lives, how it matches, and what the address carries

**Subject document for** [Story 2.11 — Security Search & Selection](STORY.md)
**Created:** 2026-09-11 by [Task 2.11.1](TASK-01-settle-search-selection-and-the-url.md)
**Status:** the three open decisions are settled. §§1–5 are decided and are what
Tasks 2.11.2 to 2.11.9 implement. Task 2.11.10 finishes this file with what was
found and adds it to `CLAUDE.md`'s _Where the record lives_ table.

This file exists for the reason Tasks 2.9.1 and 2.10.1 exist: this story is
followed immediately by two chart stories and then by an epic that adds a symbol
switcher, a comparison picker and a window control. **Every one of those is a
control, and the first control in a product decides what the rest look like.** A
decision taken once here is a decision six later screens inherit rather than
re-take four different ways.

**Nothing in this task is visible.** No field, no result, no pixel. The payoff is
Task 2.11.4, which puts the first interactive control in this product on screen,
and the shell in 2.11.7.

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

`role="status"`, never `alert`, and the four mechanical clauses of §7 are
inherited whole rather than re-derived: a persistent region, rendered in every
state, never unmounted, **silent on arrival**. Arriving at the Security Explorer
with an empty field says nothing, because nothing has happened.

### Reversal trigger

- **A fourth asynchronously-filled surface on this screen**, or any surface that
  changes a region's text in the same moment as another. Epic 3's socket is the
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

## 6. Two constraints that are not decisions

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

---

## 7. What this file hands to each task that reads it

| Task                                                                  | What it takes from here                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2.11.2](TASK-02-the-matcher.md) — the matcher                        | Client-side (§2). Prefix-aware rather than `includes()`, and the `nv` → `FRT`/`INVH`/`IVZ`/`KVUE`/`QQQ` finding to write a test against (§0). Returns shown **and** total (§5). No fuzzy dependency without amending §2. `status` is not a filter (§6) — **and, decided there, not a tie-break winner either: untracked ranks below tracked within a tier** |
| [2.11.3](TASK-03-the-field-the-product-never-had.md) — the field      | Bordered, mono input face, hairline resting border with focus left to the token layer, a clear affordance and an `ESC` hint, **six** states not seven — `Locked` is dropped (§5)                                                                                                                                                                            |
| [2.11.4](TASK-04-search-on-screen.md) — search on screen              | The field's home (§1). No new fetch (§2). No query in the address (§3). The 400 ms announcement debounce with the visible list updating per keystroke (§4). A row carrying a close **and** its change, with the session qualified on the surface (§5)                                                                                                       |
| [2.11.5](TASK-05-client-side-navigation-and-the-table-as-a-way-in.md) | Selection is `securityPath(symbol)`, pushed, and Back returns to an empty field (§3)                                                                                                                                                                                                                                                                        |
| [2.11.6](TASK-06-every-search-state-produced.md) — every state        | Search unavailable is the universe fetch having failed, and the rest of the screen keeps working; there is no offline fallback (§5). The untracked state must be constructed (§6)                                                                                                                                                                           |
| [2.11.7](TASK-07-the-security-explorer-shell.md) — the shell          | The field sits above whatever the table becomes (§1). Five placeholders name **epics**, not invented story numbers (§5)                                                                                                                                                                                                                                     |
| [2.11.8](TASK-08-the-universe-table-past-500.md) — the table past 500 | A jump rail is taken in principle; a kind filter is not, because it moves the summary line and wants a query parameter (§§3, 5, 6)                                                                                                                                                                                                                          |
| [2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)           | "Back loses my search" is a decision to state, not a defect to find (§3). The 400 ms rate is the thing to listen for (§4)                                                                                                                                                                                                                                   |
| [2.11.10](TASK-10-deployed-verify-document-and-adr.md) — the close    | This file, finished with what was found, plus ADR 0024 and the `CLAUDE.md` table entry                                                                                                                                                                                                                                                                      |

---

## 8. What nothing checks

In the spirit of `CLAUDE.md`'s own list, because a stated invariant that nothing
checks quietly stops being true:

- **That the address stays clean while a query is being typed** (§3). Nothing in
  `pnpm verify` reads the address bar during a keystroke. It is a browser
  assertion and belongs in [Task 2.11.9](TASK-09-keyboard-screen-reader-and-the-journey.md)'s
  journey: type into the field, and assert `page.url()` has not changed.
- **That the third live region stays silent on arrival** (§4). §7 already records
  that a new `role="status"` on any route goes red nowhere. This one is enforced
  by whatever test 2.11.4 writes and by nothing else.
- **That the result surface's session qualifier agrees with the closes beside it**
  (§5). The qualifier is rendered from `lastCloses[].session` and today all 518
  agree, so a bug in which the footer states one session while a row's close came
  from another is **invisible while the data is uniform**. Re-measure the
  uniformity rather than trusting it: it was one distinct value on 2026-09-11, and
  a partially-backfilled security is the condition that ends that.
- **The masthead's remaining slack** (§1). 377px at 1280 is a measurement of the
  chrome as it is on 2026-09-11; nothing fails if a fifth nav item or a longer
  label eats it, and §1's second reversal trigger is written against exactly that.
