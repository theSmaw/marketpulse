# Task 2.11.6 — Every state produced, not described

**Status:** Complete — 2026-09-11
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.4

## Objective

Produce every state search can be in — from a named cause, in the workshop and
in a test — rather than reasoning about them. Task 2.10.8 is the precedent and
the reason it was a task rather than a step applies here too: the interesting
states are the ones the happy path cannot reach, and an unreachable state is one
nobody has looked at.

## What the user can see when this lands

**An honest sentence for every way this can go wrong**, and for the several ways
it can go right that look like going wrong. Typing `zzz` says so and is not an
error. A security that exists with no stored bars says that, and it is a correct
answer rather than a failure. An untracked security is found and marked rather
than missing. And when the backend is unreachable, the search says so **without
collapsing the page** — §36's rule, which this product has honoured on every
screen so far and must not break on its first control.

## Amended 2026-09-11 by Task 2.11.4 — three of these are settled or half-built

Read before starting, so none of it is designed twice:

- **The resting state is settled: the surface is absent.** This file left it open
  ("whether the result surface is absent or is showing something useful"). It is
  absent — `expanded` is false whenever the trimmed query is empty, so there is
  no surface and no listbox in the DOM at all. What remains here is whether that
  is the _right_ answer and whether anything should occupy the space.
- **The stale-close and missing-close rows already have a story and a test**
  (`MixedSessions` and `WithoutCloses`, plus two component tests). They were
  built because the control could not render without answering them. What is
  left is the rest of this list, not those two.
- **The control is rendered only when the universe has loaded.** That is not a
  designed state — it is the absence of one, and it is this task's to replace.
  Today the field simply is not on the page while the universe is loading,
  unreachable, or answered badly, which is the least honest of the available
  answers and the reason this task exists.

## Work

Every state below gets a **story** and, where it is behavioural, a **test**. The
fixture backend from Task 2.10.6 and the recorded response bodies in
`src/fixtures/` are how they are produced without a server; note that those
fixtures are imported by tests and stories only and **must not reach the shipped
bundle** — a fixture pulled into a component by a well-meant import ships a
recorded market body to every visitor.

- **No query.** The resting state. Whether the result surface is absent or is
  showing something useful was a design decision; implement it and say in the
  header which it was. **Narrowed 2026-09-11 by Task 2.11.2: the matcher returns
  nothing for an empty or whitespace-only query**, deliberately — the whole
  universe is already on screen underneath — so if this state shows something, it
  comes from somewhere other than the matcher and the header says where.
- **Query, no matches.** Not an error. `zzz` is a reasonable thing to type, and
  the copy must not read like a failure.
- **Query, one match.** The case where pressing Enter obviously works.
- **Query, many matches.**
- **More matches than shown.** The matcher returns the shown slice and the true
  total (2.11.2); this is where "N more matches" becomes a sentence a person
  reads, and it must say what to do about it. **Reachable from real data — added
  2026-09-11 by Task 2.11.2**: the cap is **ten** (`SECURITY_MATCH_LIMIT`) and
  typing `a` against the real universe matches **99**. So unlike the two close
  states below, this one needs no constructed fixture, and the story should use
  the real query rather than a made-up one.
- **An untracked security in the results.** Shown and marked, unmistakably, never
  hidden. This is the state that reintroduces a real schema-level failure if it
  is got wrong, so it is produced with a named fixture rather than trusted.

  **One interaction to produce deliberately — added 2026-09-11 by Task 2.11.2.**
  `status` is not a filter, but it **is** the first tie-break: an untracked
  security ranks below a tracked one in the same tier (`SEARCH-AND-SELECTION.md`
  §6's dated amendment). With more matches than the cap, that demotion can push
  an untracked security off the _shown_ slice while the `total` still counts it —
  which is correct behaviour and indistinguishable on screen from the thing this
  state exists to forbid. Produce it: a query with more than ten matches, one of
  them untracked, and check that what the surface says about the total is what
  makes the difference legible. It is unreachable from real data twice over —
  all 518 securities are `active` today.

- **A symbol with no stored bars.** It exists in the universe and has nothing
  behind it — a first-class answer. The market-data layer already has the
  vocabulary for this and **the words must not be reinvented**: read
  `bar-series-view.ts` and `BarSeriesPanel` and keep one set of terms, in which
  _partial_ is an answer rather than a failure.
- **A row whose close is older than the surface says, and a row with no close at
  all — added 2026-09-11 by Task 2.11.1.** The result row carries a close and a
  change (the user's decision, `SEARCH-AND-SELECTION.md` §5), the surface names
  the session once, and a row whose own `session` is earlier carries its own date.
  **Both of those are unreachable from real data today and that is exactly why
  they need producing here**: measured 2026-09-11, all 518 securities have a close
  and all 518 sessions read `2026-09-04`, so a bug in which the footer states one
  session while a row's close came from another is **invisible while the data is
  uniform**. A partially-backfilled security is the condition that ends the
  uniformity, and it is constructed from a fixture rather than waited for. Neither
  is an error state: an older close is a true fact about what we hold, and a
  missing one is the same first-class answer as a missing bar.
- **The universe is still loading.** The control exists before its corpus does.
  Say what it does — disabled with a reason, or accepting input and holding it —
  and make it a state rather than a flicker.
- **The universe could not be read.** Distinguish **retryable** from not, which
  is the decision `FRONTEND-STATE.md` settled: a retryable failure gets a retry
  and a sentence saying waiting may help; a permanent one gets neither, because a
  retry button on something that will fail again is a lie the user pays for
  twice. Branch on `code`, never on the status number, and never put the raw code
  on screen — `requestId` remains the only internal identifier this product
  shows.
- **The rest of the page survives all of it.** Search failing leaves the panel
  and the table exactly as they were. §36: degrade locally, never collapse to a
  global error screen.

  **Amended 2026-09-11 by Task 2.11.5 — that sentence now buys the user more
  than it did, and the copy should know it.** The table's rows are links, so it
  is a second way in rather than a list you can still read. "Search is
  unavailable" is therefore a degraded state with a **working alternative on the
  same screen**, which is a materially better thing to be able to say than "the
  rest of the page still renders". Whether the copy points at it is a judgement
  for this task — naming a fallback is kinder than implying a dead end, and
  over-explaining an error is its own failure — but the option did not exist when
  this file was written.

  Note the one case where it is **not** an alternative: the universe fetch is
  what feeds both, so the state where search is unavailable because the universe
  could not be read is the state where there is no table either. A sentence
  offering the table as a way out must not be rendered from that cause.

Two further pieces of work that are about states rather than a state:

- **The summary line must still be true** in every one of these. If filtering
  changes what is on screen, the line says so; whatever it does, it never reports
  a number that disagrees with what a person can count. There is a test for this
  and it is worth writing as an assertion about the sentence rather than about a
  number.

- **The announcement.** One sentence per settled subject, naming its subject,
  at the rate Task 2.11.1 settled. Add the test that a sentence read out of
  context is complete — that is what makes two queued regions survive being
  queued in either order.

## Done when

- Every state above has a story, and `pnpm stories` passes
- Each state is produced from a **named cause** — a fixture, a stubbed response,
  an empty universe — rather than by setting a prop by hand where the real cause
  is reachable
- The untracked case and the no-stored-bars case have tests naming them,
  including an untracked security demoted past the cap
- The capped state is produced from the real query that reaches it (`a`, 99
  matches) rather than from an invented one
- The stale-close and missing-close rows are produced from a fixture, since real
  data cannot reach either today
- A failing search leaves the panel and the table rendering
- The summary line has a test that would fail if filtering made it a lie
- The vocabulary matches `bar-series-view.ts` rather than adding a second set
- No fixture is imported by a shipped component — re-measure the way `CLAUDE.md`
  records it: build, then grep `dist/` for a fixture bar timestamp and find
  nothing
- The axe gate reads zero violations; `pnpm verify` passes

## Notes

The precedent worth copying exactly from Task 2.10.8 is _produced, not
described_. A story that sets `state: "unavailable"` by hand proves the component
can render a string; a story that drives the real code path with a stubbed
failure proves the state is reachable and that the copy is what a person actually
sees. Where the real cause genuinely cannot be reached in the workshop, say so in
the story's own comment rather than leaving the difference invisible.

---

## What was done — 2026-09-11

### The design came first, and it is on the canvas

`Component library for MarketPulse` — the source of truth since ADR 0026 — held
section **03.1 Security search**, drawn by Task 2.11.4, and it ended with a
sentence that made this task's scope explicit: _"Failure and empty states past
these are a separate piece of work; what is drawn here is what the control
cannot render without."_ So there was nothing to reconcile and something to add.

**Section 03.2 — `Security search — every state`** is new, ten artboards plus a
sentence-by-sentence table of what the live region says in each. Every figure in
it is taken from the recorded universe rather than invented, which is the same
rule the 03.1 section was drawn under. It was pushed twice, deliberately: once
before implementation, and once after, when three boards had to come back down
to what shipped — see _Where the canvas and the code disagreed_ below.

### The control now takes the page's state rather than a universe

The largest change is one prop. `SecuritySearch` took `universe` and
`lastCloses`, and `SecurityExplorer` rendered it **only when the fetch had
succeeded**:

```tsx
{view.state === "loaded" ? <SecuritySearch … /> : undefined}
```

That is not a designed state, it is the absence of one — and it is the thing
this task's own amendment named as its to replace. It now takes `SecuritiesView`
whole, for `UniverseTable`'s reason: the union exists so the impossible
combinations cannot be built, and handing a renderer the pieces gives back the
eight-way boolean space it removed. The route renders it unconditionally.

### Eight states, each from a named cause

| State                           | Produced by                                      | What it says                                            |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| No query                        | the resting state                                | nothing: no surface, no listbox, silent live region     |
| No matches                      | typing `zzz`                                     | a sentence and a hollow ring, never `0 matches`         |
| One match                       | typing `nvid`                                    | one row, and Enter opens it                             |
| More than the cap               | typing `a` against the **real 518** — 99 matches | `showing 10 of 99`                                      |
| An untracked security           | `full.json` with `AAPL` untracked                | shown, marked, and counted even when demoted off-screen |
| A security with no stored bars  | `full.json` with one coverage record removed     | `· no bars stored` on the row, before the click         |
| A row behind the surface's date | `full.json` with one close moved to `2026-08-28` | the row carries its own session                         |
| A row with no close             | `full.json` with one close removed               | `No close`                                              |
| The universe still loading      | a request that never settles                     | a dashed marker, `Still loading securities.`            |
| Nothing answered                | `fetch` rejecting                                | disabled, with a reason and no control of its own       |
| The store unreachable           | a **recorded 503** from `DATABASE_PORT=59999`    | the retryable wording                                   |
| Not this service                | the `unreadable-body` outcome                    | the permanent wording                                   |
| No securities at all            | `full.json` with its arrays emptied              | disabled, and explicitly not a failure                  |

Each is a story, each behavioural one is a test, and three of them are now
browser tests with an axe run on them.

### `fixtures/securities.ts`, and why it holds the real 518

`bar-series.ts` applied to the other request this application makes. The body is
the recorded one — 190,736 bytes, 518 securities, 518 coverage records, 518
closes, every one `active`, every close from `2026-09-04` — and its size is the
point rather than an accident. Two states cannot be produced from an invented
universe at all:

- **The cap.** Ten is the matcher's limit, and what the surface says when the
  answer is bigger than it is only interesting against a real answer. `a`
  matches **99**.
- **The demotion**, below, which needs a crowded tier to happen in.

Everything else is that body with one field changed, each derivation documented
beside itself, and every one narrowed through the **real**
`isSecuritiesResponse` as the module loads. Views are built by the **real**
`toSecuritiesView` — exported from `use-securities.ts` for this and for nothing
else — so a story's `failed` is the state the application reaches rather than
one somebody typed.

### The measurement this task exists for

`SEARCH-AND-SELECTION.md` §6 predicted this state and could not put a number on
it. Measured against the recorded universe:

> **Untracked, `AAPL` falls from match 2 of 99 to match 50 of 99** for the query
> `a`, and off the shown slice entirely. The total still counts it.

That is correct behaviour — `status` is the first tie-break and never a filter —
and **on screen it is indistinguishable from the row having been filtered out**,
which is the one thing `UNIVERSE.md` §12.2 forbids. What makes the difference
legible is the footer refusing to claim the list is the whole answer, and a more
precise query putting the row back with its mark. Both halves have a test.

### The untracked derivation was checked rather than trusted

The fixture untracks `AAPL` by mapping one field. To find out whether that is
what the server actually produces, `AAPL` was set to `untracked` in the local
store, `/securities` was recorded again, and the two bodies were compared:
**identical**. The store was restored in the same command — an untracked row is
invisible to every reader that filters on `status`, so leaving one behind is a
local store quietly missing a security.

### Three copy defects, all found by a test tripping over two copies of a string

None of these was reasoned about; each was a `getByText` resolving to more than
one element, on a page where two surfaces describe one fact.

1. **`Loading the tracked universe`** — the search hint and the table's loading
   state, word for word. The search's line is now about securities and about
   what happens to what you typed.
2. **`Nothing answered at the service’s address`** — the search hint and the
   table's `cause` paragraph, again word for word, in a browser assertion that
   found **three** matching nodes including the table's live region.
3. The general rule that came out of them, now recorded in the component:
   **two surfaces describing one failure on one screen must not open with the
   same clause**, or the page reads as one paragraph printed twice. Each of
   search's sentences now leads with what _search_ can do about it.

### Where the canvas and the code disagreed

The first push of section 03.2 drew boards 08, 09 and 10 with a marker, a
headline, a detail paragraph and a correlation-id reference — a state block like
the table's. Implementation rejected three quarters of that, and the canvas was
brought down to the code rather than the other way round:

- **`TextField` owns the line under a field** (`hint`), and it is associated
  with the input through `aria-describedby`. A hand-built sentence beside the
  field would be a second, unassociated description of a control that already
  has one, and `TextField` deliberately does not accept an `aria-describedby` to
  point at it.
- **The correlation id is printed once.** The table's failure block already
  shows it, beside the same failure, and `api-client.ts`'s rule is that an
  internal identifier appears only beside a failure the user is being told
  about — not twice on one screen.
- **There is no second retry.** Both surfaces read the same fetch. A browser
  test asserts `toHaveCount(1)` on the page's `Try again` buttons, which is the
  assertion that would catch somebody adding the obvious one.

This is ADR 0026's chain working in the direction it was written for: the canvas
led, the implementation found something the canvas could not know, and the
canvas was corrected the same day rather than left as a second description.

### What was not built, and why

- **A retry in the search control.** See above. `FRONTEND-STATE.md` §4's rule —
  retryable says waiting may help, permanent says it will not — is honoured in
  the **words**, in both directions, which is the half of that rule that
  survives there being one button on the page.
- **A sentence offering the table as a way in.** Task 2.11.5 made the table's
  rows links, and this task's own amendment asked whether the copy should point
  at them. It must not, from this cause: one fetch feeds both surfaces, so the
  state where search cannot answer is the state where there are no rows to
  click. There is a component test asserting the word "table" appears nowhere in
  the failed state.
- **A disabled field while the universe loads.** The field stays live and keeps
  what is typed. A control that removes itself while its data loads is what
  shipped before this task; one that goes grey under a cursor mid-word is the
  same mistake with better manners.

### The ARIA that had to move with the states

`aria-expanded` is now true **only when there is a listbox with options in the
document**. The two sentence states draw a surface and no listbox, so a
combobox claiming to be expanded over an element that is not there — a defect
axe catches and a screen reader reads out as a lie — cannot happen. What a
listener gets in those states is the live region, which says the same thing and
names its subject while doing it.

`searchAnnouncement` takes a `SearchCorpus` rather than a result, and the
corpus is checked **before** the count. That is the whole reason it changed
shape: an empty universe matches nothing, so `Security search: no matches for
"nv"` is reachable while the securities are still in flight — a claim about the
market made from data nobody has seen. It now says
`Security search: still loading securities. "nv" is kept.`

### Gates

- `pnpm verify` passes: 508 frontend tests (37 files), 650 backend, 237 shared.
- `pnpm e2e` passes: **54 browser tests**, up from 51. The three new ones run
  axe against three states the gate had never seen — search unavailable, the
  universe loading, and a query that matched nothing.
- **No fixture reaches the bundle.** Re-measured the way `CLAUDE.md` records it:
  `pnpm build`, then `grep -o "Agilent Technologies" dist/assets/*.js` and two
  more distinctive fixture strings — nothing found.

## For the stakeholder — what this actually bought, in plain terms

### The problem, without the jargon

Yesterday MarketPulse got a search box. You type a few letters, it shows you
matching companies, you click one. It worked — as long as everything else did.

The trouble with a search box is that almost everything interesting about it
happens when things are **not** normal, and none of those moments are ones you
can sit and wait for. What does it say when you type something that matches
nothing? What does it do in the second before the list of companies has finished
loading? What happens if the server is restarting, or has been replaced by
something that is not our server at all? What about a company we have stopped
following, or one we have no price history for yet?

Every one of those is a real thing that will happen to a real person. And every
one of them was, until today, **unwritten** — not broken exactly, but undecided,
which in practice means whatever the code happened to do.

The worst of them was the simplest. While the list of companies was loading, the
search box **was not on the screen at all**. It appeared once the data arrived.
If you landed on the page and started typing immediately, or if the server was
slow, or if it was down, you saw a product with no search in it — and there is no
way for you to tell that apart from a product that never had one.

### What we did

We designed and built an honest answer for every one of those moments, and then
we did something less obvious: we **manufactured** each of them so we could look
at it.

That second half is the real work. You cannot ask our database to be empty, or
ask a server to be replaced by the wrong server, just to see what the screen
says. So we took a genuine recording of the real data — all 518 companies, their
real names and their real closing prices — and made careful single-fact edits to
copies of it: one company with its price history removed, one with no closing
price, one whose price is a week older than everybody else's, one we no longer
follow. We also recorded what the server actually says when its database is
unreachable, by pointing it at a database that does not exist.

The result is that every state of the search box can now be pulled up on demand,
by anyone, on any machine, with no server running — and reviewed side by side.

### The sentences, which are the product here

- Type something that matches nothing and it says **"No security matches 'zzz'.
  Search covers the 518 securities MarketPulse holds, by symbol and by company
  name."** Not an error, no red, no apology — because typing something that
  turns out not to exist is a perfectly reasonable thing to do.
- Type while the data is still loading and it says **"Still loading securities.
  'nv' is kept and will match as soon as the tracked universe arrives."** The
  box stays usable and remembers what you typed. Critically, it never says "no
  matches" here — that would be a statement about the market made from data we
  have not received.
- If the server cannot be reached, the box stays on the page, says it cannot
  answer and why, and tells you whether waiting is likely to help. **The rest of
  the page carries on working** — the price panel above it is fed by a different
  request and is unaffected.
- A company we no longer follow is **found and clearly marked**, never quietly
  hidden. A company we hold no price history for says so **on the row, before
  you click it**, so an empty panel is something you were warned about rather
  than something that looks broken.

### The one that is worth explaining properly

There is a rule in this product that a company we have stopped following must
never silently disappear from search. There is also a rule that a company we
still follow should rank above one we do not, when everything else is equal.

Those two rules interact in a way nobody would have predicted from reading them.
We measured it: typing the single letter `a` matches 99 companies and we show
ten. If Apple were a company we had stopped following, it would drop from second
place to **fiftieth** — and vanish from the screen. It has not been hidden; it is
simply past the end of a list. But **on screen those two things look exactly the
same**, and one of them is the thing we forbid.

The answer is the small line under the results that reads **"showing 10 of 99"**.
It is the only thing on the screen that tells you the list is a slice rather than
the whole answer — and typing a bit more (`aapl`) brings the company straight
back, marked. We now have automated checks that would fail if either half of
that stopped being true.

### Three writing mistakes we only found because a machine complained

The search box and the table of companies underneath it are two different parts
of the screen describing the same events. Three times, we wrote a sentence for
the search box that was **word-for-word identical** to one the table was already
showing — and each time it was a test, not a person, that noticed, by finding two
copies of the same sentence where it expected one.

That is worth mentioning because it is a genuinely easy failure to ship. Nothing
is wrong; nothing crashes; the page simply reads as if someone printed the same
paragraph twice, and it makes the product feel careless. All three now say
different things, and each of the search box's sentences leads with what _search_
can do about the situation rather than restating the diagnosis.

### Where this leaves the product

The search box is finished as a piece of behaviour: it works, and it is honest
in every state it can be in. That matters more than it sounds, because this is
the **first interactive control in the product** and every control after it —
the time-window picker, the comparison chooser, the AI's symbol switcher — will
be built to match it. Getting the unglamorous states designed once, here, is
what stops the next six controls each inventing their own answer.

What you still cannot do is **see** a price move. Everything is numbers and
sentences; nothing in MarketPulse draws a chart yet. That is the next two pieces
of work — the price chart and the volume chart — and they land on the page this
search now gets you to.
