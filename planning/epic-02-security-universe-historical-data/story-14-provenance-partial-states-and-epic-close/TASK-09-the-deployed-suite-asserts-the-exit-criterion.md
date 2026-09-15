# Task 2.14.9 — The deployed suite asserts the exit criterion, on every deploy

**Status:** Complete — 2026-09-15
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.3, 2.14.5, 2.14.6, 2.14.7

> **Amended 2026-09-14 by Task 2.14.1.** One bullet below asserted that
> provenance is present _"all true at zero bars"_. It is not:
> [`PROVENANCE.md`](PROVENANCE.md) §0.1 makes `SourceNote` render **nothing** when
> a series has no bars, so on CI's store and on `store:bare` there is correctly no
> provenance on the page. Corrected in place, because this is exactly the class of
> assertion the suite's README says costs a six-minute round trip to discover.

> **Amended again 2026-09-14, by Task 2.14.3 — and the correction above was
> itself half wrong, which is the lesson rather than an embarrassment.** §0.1
> became **per clause** the same day (Task 2.14.2), and 2.14.3 built it that way.
> So at zero bars the note does not vanish: it **reduces to its classification
> clause**, because that clause's data is the universe answer rather than the
> bars. There _is_ provenance on a zero-bar page, it is exactly one line, and it
> is assertable in every store. The bullet below is corrected a second time.

> **Amended 2026-09-15 by Task 2.14.5, and this is the correction most likely to
> cost a round trip.** The sentence that task shipped —
> `Holding 1,560 bars, through … , of a window running to …` — renders **only**
> under a `partial` answer, and **the deployed store is the one store that
> structurally does not produce one.** It is backfilled nightly and answers a
> named window in full, so its answers are `loaded`; CI's store and `store:bare`
> hold zero bars, so theirs are `empty`. The coverage sentence is therefore
> **unassertable in both directions at once**: a deployed spec that asserted it
> would be red exactly when the store is **healthiest**, which is the worst
> possible signal to wire into a post-merge check.
>
> It belongs in the _not assertable_ list below, for a reason subtly different
> from the note's bar-derived clauses: those are absent when the runner **lacks**
> data, this one is absent when the runner **has all of it**.
>
> The hand-walk is the opposite case and is worth doing deliberately: read
> `GET /diagnostics/freshness` **first**, and if the deployed store is current,
> record that the coverage sentence was not seen deployed and why — rather than
> going looking for a state the environment cannot make.

> **Amended 2026-09-15 by Task 2.14.6, and this corrects a live claim in the
> assertability list below rather than adding to it.** That list says the
> **vacancy sentence** is _assertable in every store_. It no longer is, as
> written: there are now **two** vacancy sentences per plot, chosen by what the
> universe response says the store holds, and the two stores this suite can run
> against sit on **opposite** sides of that choice.
>
> - **CI and `store:bare` — 518 securities, zero bars — draw case one**, `No
history stored for NVDA yet.` and `No volume history stored for NVDA yet.`
>   Every security, every page. A deployed spec asserting the window sentence
>   would be red there and nowhere a developer would reproduce it.
> - **A healthy deployed store draws neither**: it is backfilled nightly and
>   answers a named window in full, so there is no vacancy on the page at all.
> - **What stays assertable is _a plot holding nothing says which nothing it
>   is_**, and the suite already has the shape for it: `AN_EMPTY_PLOT` in
>   `e2e/support/app.ts` is the union, written for precisely this reason and used
>   by the nine local specs that locate a settled answer. Reuse it rather than
>   spelling either sentence — which is this task's own _reuse the local suite's
>   page objects_ bullet arriving with a concrete case.
> - **And the hand-walk gains a line to record.** Read
>   `GET /diagnostics/freshness` first, as the coverage-sentence amendment above
>   already says; if the store is current, record that **no** vacancy was seen
>   deployed and why, rather than treating its absence as a missing state.

> **Amended 2026-09-15 by Task 2.14.7, and it adds one assertion in each
> direction rather than correcting anything below.** The four amendments above
> are all corrections; this one is not, which is worth saying because a reader
> skimming a stack of them will assume the fifth is a fifth thing that was
> wrong.
>
> - **A new _structural_ claim, and it is the strongest kind this suite takes.**
>   `PROVENANCE.md` §12 established that **every named region on the Security
>   Explorer says something when its subject is missing** — the finding that pass
>   exists for was a Volume region rendering nothing at all. That is structure,
>   not figures: it survives a zero-bar store, a backfilled one and a deployed
>   one identically, because it is a claim about **regions being non-empty**
>   rather than about what any of them says. `e2e/specs/backend-failure-states.spec.ts`
>   asserts it locally over all eight regions; the deployed journey should assert
>   it over the ones the exit criterion visits, and it costs one loop.
> - **And one more state a green deployed run should be _unable_ to see.** The
>   volume plot's deferral — `No volume to draw. The Price region says why.` —
>   renders only under `refused` or `failed`, which a healthy deployment does not
>   produce. It joins the coverage sentence in the _not assertable_ list for the
>   same reason and from the same end: **its absence deployed is the environment
>   being healthy, not a state gone missing.** Record that in the hand-walk
>   rather than going looking for it.
> - **Two accessible names changed**, and this matters only if the deployed spec
>   grows a retry assertion: the Security Explorer's two `Try again` controls are
>   now `Try again — the price series` and `Try again — the tracked universe`.
>   Nothing in `specs-deployed/` locates either today — checked, not assumed —
>   and the local suite's `/^Try again/` is the idiom to reuse if one is added,
>   because it counts controls rather than spellings.

> **Amended 2026-09-15 by Task 2.14.8, and it is one line of inoculation rather
> than a correction.** This task's first bullet is a **hand-walk of the deployed
> page at three viewports**, which is the one activity in this story most likely
> to notice §28's known breach and file it a fourth time. It is known, it is
> measured three times, and **it has an owner**: every cold load of `/securities`
> and `/securities/:symbol` spends one main-thread task of **50–76 ms**, it is
> the 518-row universe table rather than the chart, and Epic 14 owns the repair
> with the trigger kept above it
> ([`SEARCH-AND-SELECTION.md`](../story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)
> §10). **If the cold load feels slow during the walk, that is this and it needs
> nothing from this task — record that it was observed deployed, and move on.**
> What would be new, and is worth recording, is the breach behaving _differently_
> on the deployed host from the local build: none of the three measurements was
> taken over a network against the real store.
>
> **And do not add a timing assertion to `specs-deployed/` for it.** That is this
> task's own _scope the deployed suite hard_ note arriving with a concrete case:
> a duration asserted from one machine over one link, after a merge, against a
> shared environment is the definition of a check that teaches everyone to re-run
> it.

## Objective

Acceptance criteria 4 and 5. Execute the epic's exit criterion in the **deployed
environment** — search NVDA, open it, inspect recent historical price and
volume, change the window — and then make that journey an **assertion on every
deploy** rather than an observation somebody made once.

Both halves are newer than they look, and the second is real work:

- The exit criterion **was** executed deployed at Story 2.13's close, cold and
  from five deep links, at three viewports, against a store zero sessions
  behind. That is a one-off observation by a person.
- **`pnpm e2e:deployed` asserts none of it.** The deployed suite is three spec
  files and 16 tests about routing, the tracked universe and the two halves being
  wired together. Nothing in it drives the window control, the rail, either plot
  or the crosshair. **A green `e2e:deployed` today means exactly what it meant
  before Story 2.13.**

## What the user can see when this lands

**Nothing on screen — and something that matters more.** From here, a deploy
that breaks the product's central journey fails a check instead of being found
by a person opening the page. Say "nothing visible" plainly.

## What is already decided and must not be re-taken

- **A deployed check runs after a merge, so it gates nothing** — its output is a
  rollback decision. That is why the axe rule is asymmetric: a gate before the
  merge, a report after it. This suite is the second kind and is not a
  replacement for the local one.
- **The frontend's upload is not atomic.** For roughly two seconds around a
  deploy that changes the artefact a cold load can be broken, in two distinct
  ways, and the window **opens** at the second the deploy step reports success.
  Anything checking the deployed page **polls for coherence** rather than
  checking once — `e2e/support/deployed.ts` and `poll-timings.ts` already hold
  that idiom; use them rather than a fresh `waitForTimeout`.
- **A check that runs from one machine over one link cannot tell its own network
  from the environment.** Probe more than one host before calling something an
  outage.
- **Two hazards the suite's own README records.** CI's store holds 518
  securities and **zero bars**, so every window is a correct `empty` there and a
  `partial` locally — an assertion about a number is an assertion about data the
  runner may not have. And a chart mark is **counted** rather than asserted
  visible, because a horizontal gridline is zero pixels tall and Playwright
  reports it `hidden`.

## Work

- **Walk it deployed, by hand, first.** Cold, at 1440, 1024 and 390, including
  the window control and the crosshair, and including everything Tasks 2.14.3–7
  added — noting that the deployed store is backfilled nightly and answers the
  default window in full, so it is the **one** store where `SourceNote` and the
  vacancy sentence cannot both be seen — this is the first time provenance, recency and the vacancy wording have
  been seen against the real store rather than a fixture. Record what the store
  was at the time: `GET /diagnostics/freshness` answers _how many sessions
  behind_, and a journey verified against a store three sessions behind is a
  different observation from one against a store that is current.
- **Then write the spec**, in `specs-deployed/`, as **one journey** rather than
  six assertions about six components. The local suite owns component behaviour;
  what this one is for is _the chain is wired together in the deployed
  environment_, which is the thing three hosts, two artefacts and a database can
  each break independently.
- **Assert what is true in every store this can run against.** The distinction
  is between _structure_ and _figures_: that both plots share one axis and one
  width, that the window control drives both, that the address carries the
  window. A close price is not. Where a figure genuinely must be asserted, gate
  it on the store having data and say so in the spec's own text.
- **~~that provenance is present — all true at zero bars~~ — corrected twice,
  and this is the kind of thing a deployed spec otherwise discovers six minutes
  at a time.** [`PROVENANCE.md`](PROVENANCE.md) §0.1 — **a claim about data
  requires data** — is applied **per clause**, so a zero-bar store (CI's, and
  `store:bare`) draws a `SourceNote` **reduced to one line**: the classification
  clause, whose data is the universe answer and not the bars. The rule for this
  suite falls out of that cleanly, and it is the structure/figures distinction
  the bullet above already makes:

  - **Assertable in every store** — the masthead's `FeedProvenance`, a standing
    claim about the deployment present on every route whatever the store holds;
    the **classification clause**, because it reads a fetch that resolves
    independently of any bar; and ~~the **vacancy sentence** where there are
    none~~ — **corrected 2026-09-15 by Task 2.14.6: the vacancy is two sentences
    per plot and the store chooses between them.** What is assertable is the
    union, `AN_EMPTY_PLOT`; the individual sentence is an assertion about which
    store the runner is talking to, wearing a sentence that reads like
    structure — the same trap as `Unadjusted` one bullet down.
  - **Not assertable** — the note's **adjustment, retrieval and feed** clauses,
    every one of which is a claim about bars the runner may not have. An
    assertion that _the source note is present_ is fine; an assertion that it
    says `Unadjusted` is an assertion about data, wearing a sentence that reads
    like structure.
  - **Not assertable, from the other end — the coverage sentence** (2026-09-15).
    Every clause above is absent when the runner lacks data; this one is absent
    when the runner **has all of it**, because it renders only under a `partial`
    answer and a healthy deployed store answers a named window in full. It is the
    one state in this epic that a green deployed run should be **unable** to see,
    and asserting it would turn a well-backfilled store into a red check.

- **Reuse the local suite's page objects** where they exist (`support/app.ts`)
  rather than growing a second vocabulary for the same page. Two suites with two
  selectors for one control is the drift that makes a deployed failure
  unreadable.
- **Run it against the live environment**, `pnpm e2e:deployed`, needing both
  deployed addresses — and run it twice, because a suite that passes once
  against a deployment mid-upload has told you nothing about the second run.

## Done when

- The exit criterion is executed deployed, by a person, at three viewports, with
  the store's freshness recorded beside the result — **and the freshness is read
  before the walk, not after**, because it decides which of this epic's states
  the environment is capable of producing at all.
- `specs-deployed/` asserts that journey including the window change, and the
  spec says in its own text which of its assertions survive a zero-bar store —
  explicitly including **which clauses of `SourceNote` do and do not**: the
  classification line survives one, the adjustment and retrieval lines do not.
- `pnpm e2e:deployed` is green, twice, and `pnpm e2e` is still green.
- `pnpm verify` passes.

## Notes

Scope the deployed suite hard. Every test in it runs after every merge, over a
network, against a shared environment — and a flaky deployed test is worse than
no deployed test, because it teaches everyone to re-run it.

---

## What was done — 2026-09-15

### 0. The freshness reading, taken **before** the walk

`GET /diagnostics/freshness`, at `2026-09-15T02:55:30Z`:

```
lastCompletedSession 2026-09-14
1m  newestSession 2026-09-14  sessionsBehind 0  stalestSessionsBehind 0  securities 518
1d  newestSession 2026-09-14  sessionsBehind 0  stalestSessionsBehind 0  securities 518
```

**Zero sessions behind on both timeframes, and every one of the 518 securities
current.** That is the store at its healthiest, and reading it first is what
decided the rest of the task rather than merely annotating it: the amendments
above name three states this epic shipped that a current store **structurally
cannot produce**, and the walk therefore went looking for none of them.

Recorded in the shape those amendments ask for:

- **The coverage sentence was not seen deployed**, because the store answers
  every named window in full. The chart's own text alternative said so in words
  — _the line runs the full width of the window asked for_ — which is the
  positive form of the same fact and is what a walk should record instead.
- **Neither vacancy sentence was seen deployed**, for the same reason: there is
  no vacancy on the page at all.
- **The volume plot's deferral was not seen deployed**, because it renders only
  under `refused` or `failed` and nothing refused or failed.

None of those three is a missing state. All three are the environment being
well.

### 1. The hand-walk, at 1440, 1024 and 390

Cold loads of `https://red-smoke-029583a0f.5.azurestaticapps.net/securities/NVDA`
at each viewport, with the window control pressed and the crosshair driven at
each. **This is the first time the provenance surface, the recency line and the
vacancy wording have been looked at against the real store rather than against a
fixture.** What was on the page:

| Viewport | Price plot     | Volume plot    | Regions | `role="alert"` | Page errors |
| -------- | -------------- | -------------- | ------- | -------------- | ----------- |
| 1440     | `x 41 w 832.7` | `x 41 w 832.7` | 8 of 8  | 0              | 0           |
| 1024     | `x 41 w 400`   | `x 41 w 400`   | 8 of 8  | 0              | 0           |
| 390      | `x 41 w 262`   | `x 41 w 262`   | 8 of 8  | 0              | 0           |

**One axis, exactly, at all three widths** — the two plots share a left edge and
a width to the tenth of a pixel, which is the structural claim `CHARTING.md`
§17.5 names as the thing a second plot most often gets wrong.

**One crosshair, one reading, at all three widths.** A pointer at 60 % of the
plot produced `Sep 10 · 15:59 EDT` in the price strip and the identical instant
in the volume strip, with one crosshair line and one disc.

**The source note draws two clauses deployed**, and that is the first time it
has been seen against real ledger rows:

```
PRICES          Unadjusted · Retrieved 9 September 2026
                Prices as they printed. Not restated for stock splits.
CLASSIFICATION  Sector and industry are curated, not from the market feed.
                Last checked 8 September 2026
```

There is **no `Source` term**, which is correct and worth recording: the
deployed series is one stretch on one feed, and §1.3's rule is that the note
states what the chrome cannot. The masthead already says `ALL US EXCHANGES`.

**One thing the walk found that no fixture could have**, and it is the note
behaving exactly as designed: the retrieval date **changes with the window**.
`5D` reads `Retrieved 9 September 2026` and `1M` reads `Retrieved 8 September
2026`, because the 1M window reaches back into bars fetched a day earlier. A
single date hard-coded per security would have looked identical on every fixture
in the repository and wrong here.

**The window change**, deployed: pressing `1M` moved both plots together, put
`?sessions=21` in the address, re-labelled every figure `1M Open` / `1M High` /
`1M Low` / `1M Close`, and left the two plots on one axis at the same two
numbers as before.

### 2. Two instrument findings from the walk, neither of them a product defect

- **The Claude-in-Chrome tab cannot judge this page, and the failure looks like
  a defect.** `docs/GAPS.md` already records the mechanism and it fired again on
  the first attempt: the tab reports `document.visibilityState === "hidden"`, so
  the market clock froze at `22:55:48` and the backend indicator stayed on
  `checking` for ever. Both are the application's own visibility rule behaving
  correctly — it exists so a tab somebody forgot is not billed for — and neither
  is visible in Playwright, which reports `visible`. The walk was re-done with a
  Playwright script for exactly this reason, and the viewport is the second
  half: `resize_window` moved the OS window and left `innerWidth` at 1710, so
  the three-viewport half of this task is not reachable through that tool at
  all.
- **A pointer at a plot that has not been scrolled into view reads nothing.**
  At 390 the first pass reported no crosshair and no reading — this suite's own
  recorded trap rather than a narrow-viewport defect. With
  `scrollIntoViewIfNeeded` first, 390 reads exactly as 1440 does. The spec
  carries the call and the reason.

### 3. `PRODUCT_SPEC.md` §28, deployed — observed, owned, and **not** filed again

Task 2.14.8's inoculation applies and is recorded as used. Six cold loads over
the network at 1440, three of each route, reading `PerformanceObserver` on
`longtask`:

| Route              | Run 1 | Run 2 | Run 3 |
| ------------------ | ----- | ----- | ----- |
| `/securities`      | 54 ms | none  | none  |
| `/securities/NVDA` | none  | none  | 52 ms |

**The breach is present deployed and at the bottom of its measured band** (50–76
ms), which is the known finding and needs nothing from this task. What is new,
and is the thing 2.14.8 asked to be recorded if it appeared, is that deployed it
is **intermittent** where locally it is every cold load: two of six loads
crossed 50 ms and four produced no long task at all. The plausible reading is
that an internet round trip spreads the same work across more frames than a
local pair does — which is a reason the deployed figure is _softer_ than the
local one, not a reason to think the repair is less needed. It belongs to Epic
14 either way, and no timing assertion was added to `specs-deployed/`.

### 4. The spec

[`e2e/specs-deployed/security-explorer-journey.spec.ts`](../../../e2e/specs-deployed/security-explorer-journey.spec.ts)
— **two tests**, and the file's own header argues the count.

- **The exit criterion as one journey.** Search `nvid` on `/securities`, open
  the result, land on `/securities/NVDA`; every one of `PRODUCT_SPEC.md` §8.3's
  eight regions present **and non-empty**; both plots drawn on one axis at one
  width; one pointer producing one reading in both strips; press `1 month`; the
  address carries `?sessions=21`, the cell is checked, both plots are still one
  axis; the source note's classification clause; and no `role="alert"` anywhere.
- **A cold deep link to a window.** `/securities/NVDA?sessions=21` loaded cold
  is a different chain from the same address reached through the control — the
  host's fallback answers a two-segment path with a query, the bundle boots, and
  the window is read from the address before anything is fetched. It is also
  exactly how Epic 11's `setTimeWindow` will arrive at a window.

**What it asserts and what it refuses** is set out in the file's header as the
structure/figures rule, and the refusals are the half that was expensive to
learn: no figure, no coverage sentence, no vacancy sentence, no volume deferral,
no adjustment or retrieval or feed clause, and no duration. Every one of those
is either absent when the runner **lacks** data or absent when the runner **has
all of it**, and a post-merge check that goes red when the store is healthiest
is worse than no check.

The crosshair is the one gated assertion — `if (bars)` — because a plot with no
bars has nothing under a pointer. Everything else survives a zero-bar store, and
that is a checked claim rather than an argued one: `security-price-chart.spec.ts`
asserts both plots visible unconditionally and is green on CI, whose store is
518 securities and **zero bars**.

### 5. Three locator findings, all of them caught by running it

Worth keeping, because each looked right and each was wrong for a reason a
reader would repeat:

1. **`getByText("Volume", { exact: true })` matches the Volume region's own
   heading.** The region is named after the word its readout labels a figure
   with, so the obvious locator resolves to two nodes and fails strict mode
   against a page that is working.
2. **`EDT\b` matches nothing.** The strip concatenates its figures with no
   separator — `Sep 14 · 15:59 EDTO211.18…` — so there is no word boundary after
   the zone. It is `support/app.ts`' `Backend servicehealthy` trap on a second
   surface, and the fix is to drop the boundary rather than to widen the pattern.
3. **The chart's text alternative is a `<p>` that carries a market instant too**
   — it names the busiest minute — so "the paragraph with an instant in it" is
   two paragraphs. What separates them is that the alternative is _pointed at_
   by `aria-describedby` and therefore carries an `id`, and the readout is
   pointed at by nothing. A CSS-module hash would have told them apart today and
   is not a contract; being referenced is.

`innerText` is used deliberately for the readout, because it respects
`visibility: hidden` and the strip holds three rows in one grid cell — the live
one and two reservations. The consequence is stated beside it: `innerText`
returns **rendered** text, so the labels read `BAR` and `VOLUME` and are matched
case-insensitively.

### 6. What was run

- **`pnpm e2e:deployed` green twice** against the live pair — `18 passed` in
  **30.3 s** and **31.0 s**. Twice, because a suite that passes once against a
  deployment mid-upload has told you nothing about the second run.
- **`pnpm verify` green.**
- The local suite is untouched by this change: it adds one file to
  `specs-deployed/`, which `pnpm e2e` does not collect.

### 7. Documents amended

- **[`e2e/README.md`](../../../e2e/README.md)** — the file table; a new
  post-deploy section setting out what this journey asserts and the three states
  a healthy deployment cannot produce; and the live claim _the deployed suite is
  three files and 16 tests and none of them drives Story 2.13_, which this task
  made false. It is now four and 18, with the narrower sentence that replaces it.
- **[`docs/GAPS.md`](../../../docs/GAPS.md)** — the same claim, in the entry
  about the two stores photographing differently. The gap **narrows rather than
  closes**, and for a sharper reason than before: it is no longer that nothing
  looks at the deployed coverage treatment, it is that a healthy deployment
  cannot produce the state to be looked at.

---

## What the user can see when this lands

**Nothing on screen, and that is the honest answer.** No new label, no new
sentence, no new state, no faster page.

What changed is behind the product: from this deploy on, a release that breaks
the Security Explorer's central journey **fails a check** instead of waiting to
be found by a person opening the page.

**What a user still cannot do:** watch a price move. There is no live data yet;
Epic 3 is where that arrives.

---

## For a stakeholder — what this task actually did, in plain words

**The short version.** MarketPulse now checks itself, on the real website, every
single time we ship. Before today that check looked at the front door and the
lights; from today it walks the whole house.

**What was already true.** The product's main journey — find a company, open it,
look at how its price and trading volume moved, change the time range — has
worked for a while, and a person had confirmed it worked on the live site once,
by hand, at the end of the previous piece of work. That is a photograph. It says
the product was fine at one moment, on one afternoon.

**The gap that closed.** We already ran an automated check against the live site
after every release, but it only confirmed the boring foundations: that the
pages load, that the two halves of the system can talk to each other, and that
the list of companies we follow comes out of the database. It never once clicked
a time-range button, never pointed at a chart, never looked at whether the price
chart and the volume chart were lined up. So a release could have broken the
single most important screen in the product and the check would have gone green.
It would have been found by whoever happened to open the page next — which, on a
portfolio product, might be the person you were hoping to impress.

**What I built.** An automated walkthrough that does what a person does: it
searches for NVIDIA, opens it, checks that all eight areas of the screen are
present and have something to say, confirms the price chart and the volume chart
are drawn on exactly the same timeline, moves a pointer across them and checks
both charts answer about the _same minute_, switches the time range from five
days to one month, and confirms the web address updates so the view can be
shared or bookmarked. If any link in that chain breaks on the live site, the
release goes red and we know within a minute.

**The decision that took the most thought, and why.** The obvious instinct is to
make the check as strict as possible — assert the actual prices, assert the
sentence that tells you how much history we hold. I deliberately did not, and
the reason is counter-intuitive enough to be worth stating. Some of the messages
this product shows only appear when something is _less_ than perfect: "we only
hold part of this period", "there's no history stored for this company yet". Our
live database is topped up every night and is completely current, so it never
shows those messages. A check that demanded to see them would turn red precisely
when the system was at its healthiest — the single worst thing you can do to an
alarm, because the fastest way to make people ignore a warning light is to have
it come on when nothing is wrong. So the check asserts the things that are true
whatever state the data is in — the structure, the wiring, the layout, the web
address — and the file explains, in its own text, exactly which claims it is
declining to make and why.

For the same reason it measures no speeds. This check runs from one machine over
one internet connection; a slow result would as likely be someone's wifi as a
real problem, and a check that cries wolf teaches everybody to press "run it
again".

**What I confirmed by hand first, because a tool can't see everything.** Before
writing any of it I walked the live site myself at three screen sizes — a large
desktop, a small laptop and a phone — and confirmed the charts line up perfectly
at all three, that pointing at either chart gives you one consistent reading, and
that the small print explaining where the numbers came from is present and
correct against real data for the first time. One nice detail fell out of that:
the "retrieved on" date correctly changes depending on how far back you look,
because a longer view reaches into data we fetched on an earlier day. That is the
kind of honesty this product is being built around, and no amount of test data
would have proved it.

I also re-checked a known performance issue on the live site — one slow moment
when the page of 518 companies first loads. It is still there, it is already
owned by a later phase of work with a plan attached, and I recorded one new fact
about it: over the internet it happens on some page loads rather than all of
them. I did not add an alarm for it, for the cry-wolf reason above.

**Where this leaves the product.** This was the second-to-last piece of work in
the phase that gives MarketPulse its historical market data. The foundations —
518 companies, roughly 48 million minutes of price history, charts a person can
actually read and interrogate — are now not just built but _guarded_. The next
phase makes the prices move in real time, and it will inherit a safety net that
was not there before.
