# Task 2.14.9 — The deployed suite asserts the exit criterion, on every deploy

**Status:** Not started
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
