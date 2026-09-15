# Story 2.14 — Market-Data Provenance, Partial States & Epic Close

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.13
**Epic scope covered:** Market-data provenance display; closes the epic

## Description

Make the product tell the truth about its own data, and then prove the epic end to end.

Invariant 6 is not a nice-to-have and it is not a caption: ~~Alpaca's free tier is **IEX, not
consolidated SIP**~~, and §7.1 says explicitly that MarketPulse must display the feed and must
not imply full US-market coverage. A product that shows a volume figure from one venue as
though it were the market's volume is making a false claim about a number, which is exactly
the thing this product exists not to do.

> **The premise this whole story is planned against was inverted on 2026-09-07, and Task
> 2.7.9 is recording it rather than rewriting this story's scope — that is this story's own
> to re-take, with the measurements in hand.** Two things falsified it and only one of them
> is a wording change.
>
> **Stored historical bars are SIP, the full consolidated tape.** Measured, not cited: the
> free plan is **asymmetric** (`ALPACA.md` §2) — historical bars default to SIP while the
> live stream is IEX only, with `wss://…/v2/sip` refused. So for everything this epic stores
> the honest label is the **opposite of a disclaimer**, and the deployed chrome has read
> `ALL US EXCHANGES` since Task 2.7.4.
>
> **And the harder one: a single series can name TWO feeds at once.** Epic 3's live stream
> is IEX where this epic's stored bars are SIP, so a series stitched from both has two
> sources disagreeing about feed — which `PROVIDER.md` §2.4 deliberately designed for by
> making a **feed** disagreement truthful and reportable while refusing only an
> **adjustment** disagreement.
>
> **So this story's job is not _"label the feed"_ but _"render a LIST of sources that may
> disagree about feed"_**, which is a materially larger surface than the scope below
> describes. Open decision 2 is the right owner and is now a decision about **two** claims
> rather than one. See `docs/adr/0019-*` §2 and §3 — §3 in particular, because it records a
> rule this story will otherwise have to rediscover: **a feed gets a sentence when its label
> cannot stand alone, and not otherwise.**

The story also closes the epic: the exit criterion re-run against the deployed environment,
and the decisions recorded as ADRs.

## What the user can see when this story lands

**Where every number came from, and an honest answer when part of it is missing** — which is
the story that turns a working chart into one an analyst can trust.

Concretely: ~~the feed labelled as **IEX rather than the consolidated tape**, so nobody reads
it as full US market coverage~~ **the feed labelled truthfully per source — which for stored
bars is the consolidated tape and for Epic 3's live stream is IEX, and a series carrying both
has to say so** (2026-09-07); whether a price is adjusted; when the data was retrieved; and
partial answers rendered as answers rather than errors — "we have data through 15:42" and
"we have nothing for this symbol" are both correct outcomes and neither is a failure screen.

It is also where **the curated file's age becomes visible** — the
`classification_retrieved_at` column Story 2.3 argued about exists for exactly this, and
this is the story that renders it.

This is the least glamorous story in the epic and the one that most changes whether the
product is credible. §35's list of things MarketPulse must not do — hide provenance,
manufacture missing observations — is enforced here or nowhere.

## Why it sits here in the sequence

Provenance display needs something to be displayed on, so it follows the charts. Everything
it renders was made available by Story 2.6's model, so this is presentation rather than
plumbing — which is why it is last and why it is small.

## Scope

- **The feed label.** ~~`Market feed: IEX` where a user reading a number can see it, worded so
  a reader who does not know what IEX is still learns that this is one venue rather than all
  of them~~ — **amended 2026-09-07: this is per SOURCE rather than per product, because a
  stitched series has more than one.** The wording rule is settled and inherited rather than
  re-taken (ADR 0019 §3): a feed gets a sentence when its label cannot stand alone, so `iex`
  gets one and `ALL US EXCHANGES` does not
- Coverage honesty in the places it is easy to imply otherwise: volume figures, a "market"
  breadth reading later, and any phrase containing the word "market"
- Data recency: what period is on screen, and through when the data runs — §36's
  "displaying data through 10:42:17" shape, which Epic 3 makes continuous and which is
  static but still true here
- The adjusted/unadjusted disclosure, since Story 2.6 made it explicit in the data
- The metadata provenance Story 2.3 opened: sector and industry did not come from the market
  data provider, and the UI should not imply that they did
- **Two things this story no longer starts from zero on, pulled forward on 2026-09-14
  (`VOLUME-AND-WINDOW.md` §79).** Neither is finished and the scope is unchanged; what
  moved is the surface they land on, so this story amends rather than invents.
  - **Where the empty explanation is drawn.** It moved off the panel and onto the plot,
    as `ChartVacancy`, with `pnpm invariants` holding that it has exactly one home. The
    _placement_ is settled; the **wording** is not, and this story still owns it.
  - **And the wording it owns is a pair.** `routes/market-data.ts` distinguishes _nothing
    held for this security and timeframe_ from _nothing held in this window_ in a debug
    log and in nothing else — both are the same 200 body, deliberately. `ChartVacancy`
    says the second, always, because it cannot see the difference. Telling them apart on
    screen means putting the distinction on the wire, which is this story's decision to
    take and not one that was taken for it.
- The complete pass over failure and partial states across the epic's surface (§36), checked
  as a set rather than per component: search unavailable, security found with no data, chart
  failed with the page intact, window failed with the previous window still readable,
  backend unreachable entirely — and no global error screen anywhere
- **Epic close**: the exit criterion executed in the deployed environment; the browser
  journey added to the deployed suite so it is asserted on every deploy rather than read
  once; the cost figure re-taken now that a database is running; and ADRs for the decisions
  this epic took — the database and its irreversible choices, the migration mechanism, the
  provider abstraction and provenance, the storage model, the frontend state decision, and
  the charting choice

## Out of scope, and who owns it

- Live feed status and the `LIVE` indicator — Epic 3, which fills the header's reserved
  market-clock region and finally gives `FeedIndicator` something true to say. Note it still
  reads `disconnected` throughout this epic, deliberately and correctly
- Confidence and evidence provenance for findings — Epic 8, a different kind of provenance
  about a different kind of claim
- Final polish and the accessibility review — Epic 15

## Open decisions — settle with the user

1. **How prominent the feed label is.** A persistent element in the chrome states it once
   for the whole product; per-chart labelling repeats it where the number is. The
   argument for the second is that a screenshot of a chart is a thing that travels
2. **The exact wording**, which is a product-voice decision and will be read by every
   visitor. It has to be accurate without being alarming — IEX is a real feed, not a
   degraded one.

   **Amended 2026-09-07: this is now a decision about TWO claims rather than one**, and the
   second is the harder one. The chrome's standing claim about what this deployment reads is
   already shipped and settled (`ALL US EXCHANGES`, ADR 0019 §3). What is open is what a
   **series** says when its sources disagree — stored SIP bars beside a live IEX tail — which
   is a sentence nobody has had to write yet and which must not collapse into naming whichever
   feed happens to be first in the list

3. **Whether "data through …" appears when the data is simply historical**, or only when it
   is unexpectedly behind

## Design surface

Small but high-visibility: a persistent piece of chrome that must not become noise, and a
consistent treatment for the epic's empty, partial and failed states. The failure states are
where this product either reads as trustworthy or reads as broken, and §36 makes them
product states rather than exceptions.

## The design bar

**PRODUCT_SPEC.md §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ apply to this story, and they
are acceptance criteria rather than polish.** Correct and accessible is the floor. Before
this story is called done, apply the four tests to a screenshot of what it built: would a
stranger believe this is a real funded product; does it look designed rather than
defaulted; is there a moment in it worth showing somebody; and does it feel alive. If the
answer to any of them is no, the story is not finished — and "we will polish it in Epic 15"
is not available, because Epic 15 is a release epic and polish deferred is polish never.

**Partial and failed states are part of the bar, not an exception to it.** §36 makes them
normal product states, and they are the states most likely to be left looking like a
developer's error message. A product is judged on how it looks when something has gone
wrong at least as much as on its happy path.

## Acceptance criteria

1. A user looking at any market number can see which feed it came from, without hovering
2. No screen states or implies full US-market coverage — checked by reading every string
   the epic added, not by intent

   > **Read this as _coverage claimed wrongly in either direction_, not as
   > written** (Task 2.14.5, `PROVENANCE.md` §11.1). Taken literally it inverts:
   > stored bars **are** the consolidated SIP tape, so `All US exchanges` is an
   > exact statement of what is in them, and deleting it would be a false
   > disclaimer rather than an honest hedge. The two failures are implying
   > coverage the plan does not have **and** disclaiming coverage it does — and
   > the second is the one a careful reviewer introduces by accident. The pass
   > was executed against both, and is recorded as a list in §11.3.

3. Every failure and partial state in the epic renders locally and deployed, and none of
   them produces a global error screen
4. **The epic's exit criterion is executed in the deployed environment**: search NVDA, open
   it, inspect recent historical price and volume, change the window
5. That journey is asserted by the deployed browser suite, and the local suite covers the
   failure states
6. The cost figure is re-taken with the database running, against the $20 budget and its
   alerts
7. The ADRs are written, and `CLAUDE.md` and `README.md` reflect what actually landed
8. `pnpm verify` passes, and both browser suites pass

## What this story hands forward

A closed epic, and the provenance pattern Epic 3 extends from "which feed" to "which feed,
and is it still connected".

---

## Amended 2026-09-10 by Task 2.10.9, after Story 2.10 closed — what already renders, and the one sentence nothing can produce

The subject document is
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
and the decisions are ADR 0023.

**Provenance already renders on the series, per series.** `BarSeriesPanel` reads
`series.provenance.sources`, takes the **distinct feeds**, and labels each one
from `MARKET_FEED_DESCRIPTIONS` — never from a table of its own. The rule that
record carries is applied rather than re-decided: **a sentence appears when the
label cannot stand alone**, so `IEX` gets one and `All US exchanges` does not.

**The partial states are done, and there are more of them than this story's title
assumes.** Six union members, of which three are answers; plus a **stale** mark
for a held answer with a request in flight, and an **untracked** badge for a
security we hold bars for and no longer follow. Every one is produced from a
named cause and reviewable in `BarSeriesPanel.stories.tsx`'s `AllPermutations`
grid. The copy matrix — visible text against announced sentence, for every state
— is in
[`TASK-08`](../story-10-frontend-market-data-layer/TASK-08-every-state-produced-not-described.md).
Read it before rewriting any of it.

**The one sentence nothing in this product can currently produce, and it is
yours.** `stitched.json` is a real recorded body whose provenance names **two
sources** — and both name the **same feed**, because both halves came from
Alpaca's historical API, which is SIP on this plan. So _"this chart is stitched
from two feeds"_ is not a sentence anything can produce today, and writing it now
would be inventing a body no server has ever sent. **The two-feed case arrives
with Epic 3's IEX socket**, and this story owns the wording for it. The panel
already renders distinct feeds, so it will show two labels without a change here
— what it will not have is the sentence explaining why there are two, or invariant
6's fence against implying that one venue is the whole tape.

**And one gap of the same class as `untracked`, recorded rather than closed.**
The panel has a `synthetic` branch — an amber square marker and _"Generated test
data. Not a market feed."_ — that **no recorded body exercises**: all seven valid
fixtures are `sip`. It is not fake-able honestly, because a synthetic feed
implies `provider: "fixture"` too, and a hand-edited body claiming
`alpaca`/`synthetic` is a pairing no server produces. Producing it for real means
a store backfilled through the fixture provider (`PROVIDER.md` §5.4). The visual
risk is low — the same treatment is reviewed in `FeedProvenance`'s stories — but
the branch in _this_ panel has never executed, and this is the story that owns
provenance.

---

## Amended 2026-09-12 by Task 2.12.9 — this epic owes one answer about §28, and it is not the chart's

Story 2.12's measurement task traced the price chart against
`PRODUCT_SPEC.md` §28's _no routine main-thread task over 50 ms_. **The chart
passes at every density this API can serve.** The page does not:

> On **every cold load** of `/securities` and `/securities/:symbol` there is one
> main-thread task of **50–66 ms**, and it is the **518-row tracked universe**.
> Proved from both ends: it is there on `/securities` where no chart exists, and
> gone with a 20-row universe while a **9,750-bar** chart is still drawn. A CPU
> profile puts 40 of those milliseconds in the engine's own style, layout and
> paint over a **10,331-node** document.

The measurement, the attribution and three candidate repairs are in
[`SEARCH-AND-SELECTION.md`](../story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)
§10; the argument for raising rather than absorbing it is in
[`CHARTING.md`](../story-12-price-chart/CHARTING.md) §16.1.

**What this story owes is an answer, not necessarily a repair.** Either take one
of the three repairs and re-measure, or accept the breach in writing with the
argument and the trigger — `CLAUDE.md`'s rule is that a stated invariant nothing
checks quietly stops being true, and §28 is currently a published target this
product misses on its two most-visited routes. Accepting it is defensible today
(one task, just over the line, on a load rather than during interaction) and gets
harder with every column Epic 5 adds to that table, which is why the recorded
trigger is **the first time a second surface renders per-row markup at universe
scale** rather than a date.

---

## Amended 2026-09-13 by Story 2.13's close — five carries, and one of this story's own scope bullets is stale

Story 2.13 closed with ten tasks, [ADR 0028](../../../docs/adr/0028-the-time-window-the-per-bar-mark-and-the-answer-that-stays-on-screen.md)
and [`VOLUME-AND-WINDOW.md`](../story-13-volume-chart-and-time-window/VOLUME-AND-WINDOW.md)
§67, which is the hand-on list this section is the other half of. **No task in
this story moves, none is added and none is removed** — but one scope bullet and
one acceptance criterion describe a world that no longer exists, and three things
now ship with this epic that this story has to _record_ rather than _own_.

### 1. The ADR bullet is stale, and reading it as written would produce six duplicates

The **Epic close** scope bullet says this story writes _"ADRs for the decisions
this epic took — the database and its irreversible choices, the migration
mechanism, the provider abstraction and provenance, the storage model, the
frontend state decision, and the charting choice"_, and acceptance criterion 7
says _"The ADRs are written"_.

**All six exist already**, written at each story's own close rather than
accumulated for this one:

| The bullet's subject                      | Already written     |
| ----------------------------------------- | ------------------- |
| the database and its irreversible choices | ADR 0014            |
| the migration mechanism                   | ADR 0015            |
| the provider abstraction and provenance   | ADR 0018            |
| the storage model                         | ADR 0020            |
| the frontend state decision               | ADR 0023            |
| the charting choice                       | ADR 0027 (and 0028) |

Plus 0016, 0017, 0019, 0021, 0024 and 0026, which the bullet does not name.

**What this story actually owes on that criterion is therefore smaller and
different**: an ADR for the decisions _this_ story takes — the feed wording for a
series whose sources disagree being the obvious candidate — plus the sweep that
criterion 7's second half already names, `CLAUDE.md` and `README.md` reflecting
what landed. Read the bullet as _"write the ADR this story's own decisions need,
and check the index is complete"_, not as a backlog. The epic wrote its record as
it went, which is the behaviour the convention wanted.

### 2. §28's breach has a second dating, and a third disposition

The 2026-09-12 amendment above stands and its numbers are unchanged. Task 2.13.9
re-measured it with **a second plot and a window control on the same page** and
it is unchanged: ten cold loads each, 5–7 tasks of 50–107 ms at 518 rows and
**none** at twenty rows while a 9,750-bar chart is still drawn. That run added an
instrument the first did not have — the largest gap between consecutive
`requestAnimationFrame` callbacks, which is continuous where `longtask` is not —
and it says something the original could not: **every 20-row page sits at 32–34
ms, which is two frames and is the floor, while every 518-row page sits at
67–84 ms.** So this is not a page marginally over a line.

The amendment above offers two dispositions — take a repair, or accept the breach
in writing. **There is a third and it should be considered explicitly: hand the
repair to Epic 14 by name.** Epic 14 is the performance epic; a virtualised or
paginated 518-row table is exactly its kind of work; and deferring _with a named
owner and the existing trigger_ is materially different from accepting a breach.
What is **not** available is leaving it unstated — §28 is a published target this
product misses on its two most-visited routes, and `CLAUDE.md`'s rule is that a
stated invariant nothing checks quietly stops being true.

**Settled 2026-09-15 by Task 2.14.8, and it is the third.** The figure was
re-measured a third time and is unchanged — 2–5 tasks of 50–76 ms at 518 rows
and none at twenty while both plots are still drawn. The tail that came out
_lower_ than 2.13.9's was separated from the product rather than credited to it:
commit `997170d`, the tree 2.13.9 measured, was rebuilt in a worktree and served
beside the shipped build on the same machine, and the two read the same. The
repair is handed to **Epic 14** by name — into that epic's own `EPIC.md` and into
`EPICS.md`, beside the `Expand all` exception that is the same component and
probably the same repair. `PRODUCT_SPEC.md` §28 carries a dated amendment naming
both exceptions **without amending the target**, and the trigger is kept _above_
the epic, so a second per-row surface on that page pulls the repair forward
rather than waiting for Epic 14's turn.

### 3. Test 4's deferral count is **four**, and this is the last place it can be recorded

_Does it feel alive_ has been answered "not yet, and not from here" by Task 2.4.4
when the motion section was written, by Story 2.12's close, by Task 2.13.2 against
the artboard, and by Story 2.13's close against the deployed page
(`VOLUME-AND-WINDOW.md` §63). **Four deferrals of one criterion is the shape of a
criterion that never gets met**, and the count is the only thing that makes it
visible as a debt rather than as a habit.

Each deferral was individually correct and for the same reason: the hard version
of the question is what happens when a **price** changes, and there are no live
prices. Epic 3 brings them, so **the trigger is the calendar rather than a
condition — which is precisely why it needs writing down: nothing fires.**

This story's own _The design bar_ section asks for the four tests again, which is
right. **What is added is the obligation to carry the count forward in writing**,
because this is the last story in the last epic before the one that owns the
answer. If this story's close defers it a fifth time, the count says so.

### 4. Two things ship open with owners that are **not** this story

Both are Story 2.13's, both are recorded with owners, and **neither is handed
here** — Task 2.13.8's amendment argued the general case and it applies to both:
deferring a question about a screen across a story boundary is the same mistake
as deferring polish across an epic one. What this story owes is the _epic close's_
honest statement that they are open, not the work.

- **The listening pass** (`VOLUME-AND-WINDOW.md` §65). Whether a polite live
  region changing every 477 ms **queues or replaces** is a property of a specific
  screen reader on a specific platform: not readable from the DOM, from a timing,
  or by an agent. The repair is designed and unshipped — split the sentence, do
  not raise the floor. **Owner: a person with a screen reader, before Epic 11
  hands this surface to a model.**
- **The weekday 1D photograph** (§64). 1D's emptiness is a fact about the free
  plan's fifteen-minute embargo and is only observable **during a session**; no
  address, fixture or pinned clock can produce it against the deployed store,
  unlike acceptance criterion 3's holiday week, which §42 could pin because the
  calendar is checked in and the embargo is not. **Owner: the next person to open
  `/securities/NVDA?sessions=1` on the deployed site during market hours.**

Record them in the close as open with their owners. "Nobody checked" and "it was
checked and it was fine" are different artefacts, and only one of them is worth
anything to Epic 11.

### 5. Acceptance criteria 4 and 5 are real work rather than a re-run

Criterion 4 already says the exit criterion is executed in the deployed
environment **including _change the window_**, and criterion 5 says that journey
is asserted by the deployed suite. Both are correct as written and **both are
newer than they look**:

- The exit criterion **was** executed deployed at Story 2.13's close — cold and
  from five deep links, at three viewports, against a store that is zero sessions
  behind (§61, §62). That is a one-off observation by a person.
- **`pnpm e2e:deployed` asserts none of it.** The deployed suite is three spec
  files and 16 tests about routing, the tracked universe and the two halves being
  wired together. Nothing in it drives the window control, the rail, either plot
  or the crosshair. **A green `e2e:deployed` today means exactly what it meant
  before Story 2.13**, and criterion 5 is the thing that changes that.

Two hazards that suite's own README already records and this work will meet:
**CI's store holds 518 securities and zero bars**, so every window is a correct
`empty` there and a `partial` locally; and a chart mark is **counted** rather
than asserted visible, because a horizontal gridline is zero pixels tall and
Playwright reports it `hidden`.

### 6. And one small carry: the must-not-ship fixture list grew by five

`CLAUDE.md`'s list of recorded bodies that must not reach the shipped bundle
gained `dense`, `uncovered`, `holiday-week` (**357 kB**, now the largest),
`daily` and `daily-year`, each with its own distinctive grep. All seven greps
were re-run at Story 2.13's close against a freshly built `dist/` and all seven
find nothing. **They have still never been run against the _deploy_ build**,
which is a different invocation on a different machine, and this story is the
one that touches the deploy.

### What does **not** change

No story is added, deleted or re-ordered. Story 2.13's own scope was delivered in
full and its three open decisions were settled by Task 2.13.1. This story's
dependency, position and the rest of its scope — the feed label per source, the
curated file's age, the coverage-honesty pass, the failure-state sweep, the cost
figure — are untouched by Story 2.13 and stand as written.

---

## The tasks — added 2026-09-14

Ten tasks, sequential, in the shape the last five stories used: **settle, draw,
build, sweep, close.** Three of them put something on screen, and they are
deliberately early — 2.14.3, 2.14.4 and 2.14.5 land one after another, so the
epic's last story is not four days of documents before anything changes.

**2.14.1 is the decision task and nothing may skip it.** This story's three open
decisions are live, its planning premise was inverted on 2026-09-07, and there
is a sixth decision — whether the two empty answers go on the **wire** — that
`routes/market-data.ts` currently takes by defaulting. Every wording decision
lands in a **module** (`MARKET_FEED_DESCRIPTIONS` and its neighbours), never in
a component, because the `satisfies` on that record is what makes a feed added
without words a compile error.

**2.14.2 draws the whole panel rather than the addition.** Provenance is text
added to the most crowded surface in the product — a coverage sentence, four
prices, two window labels, a count and two plots. Five correct additions made
one at a time produce a footnote pile, and that is a finding to have on a canvas
rather than in a component.

**2.14.3–2.14.6 are the four visible pieces**: where the numbers came from, where
the _classification_ came from and how old it is, through when the data runs, and
an empty chart that explains itself correctly rather than plausibly.

**2.14.7 checks the failure states as a set**, which nothing has ever done — each
was reviewed against its own story, and none against the others. That comparison
is the deliverable, and it is invisible one state at a time.

**2.14.8, 2.14.9 and 2.14.10 close the epic.** The §28 answer this epic owes and
which is the 518-row table's rather than the chart's; the deployed suite finally
asserting the exit criterion instead of a person having observed it once; and the
close itself — the cost figure with a database running, the ADR this story's own
decisions need (**not** the six that already exist), the document sweep, the four
design tests, and what ships open with a name against it.

| Task                                                                        | What it does                                                                             | Visible?                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| [2.14.1](TASK-01-settle-the-provenance-claims-and-the-two-empty-answers.md) | Six decisions: prominence, the two-feed wording, recency, adjustment, metadata, the wire | No                                  |
| [2.14.2](TASK-02-the-provenance-surface-on-the-canvas.md)                   | The whole panel with every addition at once, and the vacancy wording, on the canvas      | **In the workshop**                 |
| [2.14.3](TASK-03-where-these-numbers-came-from-on-screen.md)                | Feed, adjustment and retrieval on the series — a screenshot that carries its own source  | **Yes — the payoff**                |
| [2.14.4](TASK-04-the-curated-files-age-and-what-alpaca-did-not-tell-us.md)  | Sector and industry name their source and their age; Story 2.3's column finally renders  | **Yes**                             |
| [2.14.5](TASK-05-through-when-and-the-coverage-honesty-pass.md)             | Through when the data runs, and every string read for implied — or disclaimed — coverage | **Yes**                             |
| [2.14.6](TASK-06-two-empty-answers-told-apart.md)                           | _Nothing held_ against _nothing in this window_, derived on the client (2026-09-14)      | **Yes**                             |
| [2.14.7](TASK-07-every-failure-and-partial-state-as-a-set.md)               | Every failure and partial state produced, screenshotted and compared as a set            | **Yes — where it matters most**     |
| [2.14.8](TASK-08-the-answer-about-fifty-milliseconds.md)                    | §28's breach: repair it, accept it in writing, or hand it to Epic 14 by name             | Only if the disposition is a repair |
| [2.14.9](TASK-09-the-deployed-suite-asserts-the-exit-criterion.md)          | The exit criterion executed deployed, and asserted on every deploy thereafter            | No — but a broken deploy now fails  |
| [2.14.10](TASK-10-the-epic-close-cost-adr-documents-and-what-ships-open.md) | Cost, the ADR, the sweep, the four tests, and what ships open with an owner              | No — the epic closes                |

**The subject document is `PROVENANCE.md`** in this directory, created by 2.14.1
and finished by 2.14.10. It is not a section of `PROVIDER.md`: that document is
the provider seam and the outcome taxonomy, which is mechanism. This one is what
the product **claims about its own data on screen**, which Epic 3 extends, Epic 8
parallels with a different kind of provenance, and Epic 13 constrains with a
clock.

### Amended 2026-09-14, after Task 2.14.1 — no task moves, eight are edited

The decision task settled all six decisions
([`PROVENANCE.md`](PROVENANCE.md)) and **no task was added, deleted or
re-ordered**. Eight were edited in place, and four of those substantively:

- **2.14.3** builds a **new `SourceNote` component** at the foot of the Explorer
  rather than changing `BarSeriesPanel` — whose two-feed condition is confirmed
  and untouched (§1.3).
- **2.14.4** adds a clause to that note rather than to the identity block, and
  two of its bullets were settled the **other way**: a full date rather than a
  relative age, and **no** staleness mark (§5).
- **2.14.6** took **neither** of the two branches it was written as. The two
  empty answers are told apart, with two sentences, **derived on the client** from
  `GET /securities` — so there is no backend change in it at all (§6).
- **2.14.9** carried an assertion that is false: provenance is **not** present at
  zero bars, because a claim about data requires data (§0.1). That is the class of
  error a deployed spec finds six minutes at a time.

The lighter edits: 2.14.2 draws one prominence rather than weighing two; 2.14.5
narrows the recency sentence to `partial` and is told the document sweep is
already done; 2.14.7 gains two states; 2.14.8's dependency on 2.14.4 adding
table markup is withdrawn; 2.14.10's ADR candidate moved and its sweep became a
confirmation. **2.14.1 itself is complete.**

### Amended 2026-09-14, after Task 2.14.3 — again no task moves, six are edited

The first build task shipped and **no task was added, deleted or re-ordered**;
the dependency graph was right. Six were edited in place, and one correction
runs through three of them:

- **The note is not absent at zero bars, and three tasks said it was.** §0.1
  became **per clause** at 2.14.2 and 2.14.3 implemented it that way, so from
  2.14.4 a page with no bars draws a `SourceNote` **reduced to its
  classification line** rather than nothing. 2.14.6, 2.14.7 and 2.14.9 each
  carried the per-note version as a live claim — including the bullet in the
  amendment above, which is therefore **half wrong and is left standing as the
  record it is**. Each task now carries the correction, and 2.14.7 gains a state
  it would otherwise have missed entirely: the note in its **reduced** shape,
  which is what every page CI renders.
- **2.14.4** may not write a date formatter: `formatFullDate` and its month
  table shipped with 2.14.3 and the classification's date takes the identical
  path. Its component shape is also settled — a third clause, a third view, a
  third term in `hasClauses` — and it is the task that makes the note appear on a
  zero-bar page at all. One tension is handed to it deliberately rather than
  inherited: the note carries **no marker**, so a marker for the `null` state
  would be the surface's first.
- **2.14.5's corpus was missing this story's own strings**, which are the ones
  most exposed to the criterion the pass is for — `ADJUSTMENT_DESCRIPTIONS`, the
  note's labels, and `feedClause`, whose spoken wording 2.14.3 changed. And the
  risk moved: **`All US exchanges` now appears on the page** rather than only in
  the chrome, on any deployment with no provider configured.
- **2.14.8** is told that this story does add page markup — a two-term `dl` —
  so "something other than this story moved it" is too strong; the expectation is
  still _unchanged_, and the note is the cheapest control on the claim that the
  table is the cause.
- **2.14.10's ADR carries the amended forms** of §1.3 and §0.1 rather than the
  first ones, and gains the two-feed ledger to its list of what ships open with
  an owner: the sentence invariant 6 exists for is correct, drawn, tested — and
  producible by nothing until Epic 3's socket.

**2.14.3 itself is complete.**

### Amended 2026-09-14, after Task 2.14.4 — again no task moves, four are edited

The second build task shipped, and for the third time in this story **no task was
added, deleted or re-ordered**. The dependency graph has now been right at every
close, which is worth recording as a pass rather than noticed only when it fails.
Four tasks were edited in place:

- **2.14.5's conditional is resolved.** Its corpus bullet read _"Task 2.14.4's
  classification wording, if that task has landed first"_; it has, and the four
  strings are named. The reason they matter most to that pass is **where they
  appear** rather than how they are worded: the clause reads the universe answer
  rather than the bars, so it draws on every security page including one holding
  no bars — every page CI renders. And it is the epic's first string that is a
  **disclaimer**, which is the direction of criterion 2 the pass is most likely to
  get backwards.
- **2.14.7's enumeration gains two entries, and one of its live claims was
  wrong.** The note renders nothing on a page whose universe fetch has not
  resolved or has failed **and on one whose address names a symbol the universe
  does not hold** — three causes, not two, and the third is the only one a person
  reaches by typing. The new story-only entry is the classification clause **with
  no date**, which is the one state in the set where what is missing is a
  _qualification_ rather than an answer, and the one absence in it carrying no
  marker.
- **2.14.8 is told two things about its own control.** The note is a `dl` of
  **three** terms now, not two; and 2.14.4 added the security page's first
  per-render read of the whole 518-security array — one linear scan, not a scan
  per row, deliberately not a third `Map`. Nowhere near that task's class of cost,
  named because its entire argument is _the table is the cause_ and an unmentioned
  new read of the same array is what makes such an argument look convenient later.
- **2.14.10 gains one ADR candidate and one sweep candidate.** The candidate rule
  is the finding that travels furthest out of this task: _is this an instant
  somebody stamped, or a date somebody typed?_ Every other timestamp in this
  product is converted to market time, correctly; the curated file's `checkedOn`
  is a calendar date widened to UTC midnight, and converting it reads the screen a
  day early **with nothing on the page looking wrong**. Epic 3's clock, Epic 9's
  filing dates and Epic 13's replay clock all hang dates on surfaces. The sweep
  candidate is a single grep — _no renderer reads `FieldGroupProvenance.source`_ —
  which is a `pnpm invariants` entry rather than a `GAPS.md` one, by the list's
  own rule.

**One ordering question was asked and declined.** 2.14.8 depends only on 2.14.4
and is therefore unblocked, while 2.14.5 to 2.14.7 still run in sequence — so it
_could_ move earlier, and there is a thin argument for it: if its disposition were
a repair, 2.14.7 would review the repaired page rather than the current one. It
stays where it is, because the likely disposition is a hand-off to Epic 14 with no
visible change, and moving a task to serve an outcome it probably will not have is
how a sequence stops reflecting its own reasoning.

**2.14.4 itself is complete.**

**What none of the ten owns**: the live feed and the `LIVE` indicator (Epic 3);
confidence and evidence provenance for findings (Epic 8); the final
accessibility review (Epic 15). And two things ship open by name rather than
quietly — the listening pass, and the weekday `1D` photograph — both recorded in
2.14.10 with their owners, because _"nobody checked"_ and _"it was checked and it
was fine"_ are different artefacts.
