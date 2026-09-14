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
  the window control and the crosshair, and including everything Tasks 2.14.3–6
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
    independently of any bar; and the **vacancy sentence** where there are none.
  - **Not assertable** — the note's **adjustment, retrieval and feed** clauses,
    every one of which is a claim about bars the runner may not have. An
    assertion that _the source note is present_ is fine; an assertion that it
    says `Unadjusted` is an assertion about data, wearing a sentence that reads
    like structure.

- **Reuse the local suite's page objects** where they exist (`support/app.ts`)
  rather than growing a second vocabulary for the same page. Two suites with two
  selectors for one control is the drift that makes a deployed failure
  unreadable.
- **Run it against the live environment**, `pnpm e2e:deployed`, needing both
  deployed addresses — and run it twice, because a suite that passes once
  against a deployment mid-upload has told you nothing about the second run.

## Done when

- The exit criterion is executed deployed, by a person, at three viewports, with
  the store's freshness recorded beside the result.
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
