# Task 2.6.8 — Verify, document, and ADR 0018

**Status:** Not started
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Tasks 2.6.1–2.6.7

## Objective

Re-run all six acceptance criteria against what shipped, re-take every figure rather than
citing one, and record the decisions as `docs/adr/0018-*`.

## What the user can see when this lands

**Nothing new.** Task 2.6.7 was the visible one. What lands here is the record Story 2.7 and
Epic 3 read before they touch this seam.

## Work

### Re-run all six criteria, and note which two are not re-runnable by reading

1. **No vendor reference, checked by grep. Amended 2026-09-07 by Task 2.6.2: the grep must
   be over CODE, and run naively over text it reports ~~SEVEN~~ **EIGHT** false positives in
   `packages/shared/src` alone.** Measured at Task 2.6.2: six occurrences of a vendor name and
   one of a vendor timeframe spelling (`1Min`/`1Day`, in `bar.ts`'s own argument for _not_
   using them). **Re-measured at Task 2.6.3 and it is eight** — `market-provenance.ts`'s
   module comment quotes §7.1's own wording, that the free tier is IEX and not consolidated
   SIP, which is the invariant this whole module exists to serve. That is the seventh vendor
   name and the eighth occurrence, it is correct, and it must not be deleted. **Re-measure
   rather than citing this number, which has now moved once and will move again** every time
   a module explains why it did not copy the vendor. Zero of them are code — they are comments and
   one line of prose in a test, every one explaining _why_ a decision was taken, which is the
   opposite of a leak. Deleting them to make a grep clean would destroy the record. Strip
   comments before matching; `PROVIDER.md` §9.5 carries the exact command and it returns
   nothing today.

   So the criterion is **no vendor name in a type, an identifier or a shipped value**, and
   the count to report is the code-only one. Report the command and both counts, not a claim
   — and note the same treatment is needed for `apps/backend/src`, where the provider files
   will legitimately carry _more_ vendor prose than `packages/shared` does, since that is
   where the vendor's shape is discussed.

   **Amended 2026-09-07 by Task 2.6.6, which shipped those provider files and found the
   prediction in that last sentence wrong in the reassuring direction.** They carry
   **zero** vendor mentions, naive or code-only: `fixture-corpus.ts`, `fixture-provider.ts`
   and `market-data.ts` say _"the vendor"_ throughout, because a fixture provider genuinely
   has no vendor to discuss. Measured on the shipping tree, `apps/backend/src` holds **five**
   naive occurrences across **three** files — `config.ts`, `securities.ts` and `universe.ts`
   — every one of them pre-existing prose about credentials or re-derivable data, and none of
   them in a type, an identifier or a shipped value. Re-measure rather than citing that;
   Story 2.7 is what will move it, and it is the one place where the count moving is
   correct.

2. **A fixture provider implements it fully and is what tests use.** "Fully" means no method
   throwing "not implemented"; "is what tests use" means grep for anything else.
   **Amended 2026-09-07 by Task 2.6.4: that grep has one known hit and it is not drift.**
   `apps/backend/src/market-data-provider.test.ts` holds a three-line `stub()` returning a
   `BarsResult` it was handed, and it exists to prove the interface is _implementable_ and
   that a call resolves rather than rejects — the one runtime property a task that ships no
   implementation has. It reads no corpus, produces no bar and answers no question about
   market data. A second _provider_ is what this criterion is about; a local test double for
   the interface's own tests is not one, and striking it to make the grep clean would delete
   the only executable evidence that `MarketDataProvider` can be satisfied at all.

   **Amended 2026-09-07 by Task 2.6.6: this criterion is now genuinely checkable rather than
   pending, and there are exactly TWO known non-drift hits, not one.** The implementation is
   `createFixtureProvider()` in `apps/backend/src/fixture-provider.ts` and nothing throws.
   Beside 2.6.4's `stub()`, the second hit is `createMarketDataProvider` in
   `apps/backend/src/market-data.ts` — which is a **factory** selecting between absence and
   the fixture provider rather than a second implementation, and its whole point is that it
   returns `undefined` for `none`. Anything else answering `fetchBars` is drift. Note the
   second half of the criterion — _"is what tests use"_ — is checkable in a way it was not
   before: `pnpm test` has 585 tests and none of them reaches a network, which Task 2.6.6
   established by measurement (see criterion 6).

   **Amended 2026-09-07 by Task 2.6.7: still exactly two non-drift hits, and the count
   moved.** `pnpm test` is **619**, not 585 — re-run it rather than citing either number.
   That task added `createMarketDataRoutes`, which takes a resolved `MarketData` and is a
   _route_ rather than an implementation, and it did not add a third thing answering
   `fetchBars`. What it DID change about this criterion is that
   `MarketDataProvider` gained a `readonly feed: MarketFeed`, so "implements it fully" now
   has one more field in it — and that half is enforced by the compiler rather than by this
   grep, which is criterion 5's amendment below.

3. **Every response carries provenance and no code path produces a bar without it.**
   Re-**make** the compile failure rather than citing Task 2.6.3 — and note it is **two**
   compile failures rather than one, with two different error codes, because the mechanism has
   two halves:
   - making `provenance` optional on `BarSeriesInput` fails `tsc -b` with **`TS2578: Unused
'@ts-expect-error' directive`** in `bar-series.test.ts`, which is the required field
   - a hand-written `BarSeries` object literal fails with **`TS2741: Property '[brand]' is
missing`**, which is the brand — and the brand is the half that matters, because a
     required field alone leaves every _coherence_ check skippable by a literal

   Then re-take the stitched case, which also has two halves and they differ: **feed
   disagreement is truthful** (both sources survive in the list) and **adjustment disagreement
   is refused** by `mergeSeriesProvenance`, which is the only way to obtain a multi-source
   record at all. A count of one compile failure or one stitch outcome means somebody re-ran
   half of it.

4. **Each error cause producible and distinguishable.** Re-run them; report the count against
   `PROVIDER.md`'s list, because a member that was struck during implementation and left in
   the document is the drift this task exists to catch. **The number is SEVEN, not the
   story's prose five** — Task 2.6.1 struck `bad-range` for `range-not-available` and added
   `timeout` and `aborted` (`PROVIDER.md` §8.1, §8.3, §8.4). A count of five here means
   somebody built from `STORY.md`'s scope list rather than from the settled table.
   **Amended 2026-09-07 by Task 2.6.5: seven causes plus `ok` is EIGHT outcomes, and the two
   counts are both right — say which one you are reporting.** That task shipped §8.1
   unchanged, so a drift here would be a member added or struck during Task 2.6.6, not
   during 2.6.5. Two things are worth re-running rather than re-counting, because both are
   mechanisms rather than claims: a **ninth member** added to `BarsResult` fails in **three**
   places — the tests' `Record<BarsResult["outcome"], BarsResult>` (`Property 'ninth' is
missing`), the exhaustive `switch` in `market-data-provider.test.ts`, and
   `isRetryableOutcome`'s own `switch` — so a cause cannot be added without being
   **constructed**, **handled** and **classified**; and each member's retryability is
   asserted against `isRetryableOutcome()` rather than described, which is §8.1's third
   column as code.

   **Amended 2026-09-07 by Task 2.6.6: it is now FOUR places, not three.**
   `fixture-provider.test.ts` holds `HOW_EACH_OUTCOME_IS_PRODUCED`, a
   `Record<BarsResult["outcome"], () => Promise<BarsResult>>`, so a ninth member must also be
   **producible against the fixture provider** — which is the obligation that stops a cause
   being added that nothing in the world can trigger, and is §8.7's table as a compile error.
   The counts to re-run against are **eight outcomes, all eight produced**, with the
   mechanism being the corpus or the caller's own signal and **no `simulateError` on the
   shipped interface**. One row of §8.7 was refined rather than implemented verbatim and is
   worth checking rather than assuming: `range-not-available` is produced by a window with
   **no** overlap at all, where a **partially** overlapping one is answered partially with
   `coverage.covered` clipped.

5. **Adjustment explicit at the call site.** The check is that omitting it does not compile,
   which Task 2.6.4 locks in with a `@ts-expect-error` in
   `apps/backend/src/market-data-provider.test.ts`. **Amended 2026-09-07: that directive was
   made to fail in BOTH directions, and re-running only one of them re-runs half the check.**
   Removing the directive reports `TS2741: Property 'adjustment' is missing in type ... but
required in type 'BarsRequest'`, which is the field being required; making the field
   optional reports `TS2578: Unused '@ts-expect-error' directive`, which is the _lock_ — and
   the second is the half that matters, because the first would still pass on the day
   somebody adds a default. Two more directives sit beside it and are worth re-running in the
   same pass, since both are properties this story's types rest on: a `{ start, end }`
   literal in place of a `TimeRange` is `TS2741: Property '[brand]' is missing`, and
   `timeframe: "5m"` is `TS2322`. Beside it, the vocabulary layer's own
   half is already asserted at run time: `market-provenance.test.ts` sweeps that module's
   export names for `/default/i` and expects none, so a `DEFAULT_ADJUSTMENT` added later is a
   red test rather than a silent regression.

   **Amended 2026-09-07 by Task 2.6.7, which added a FOURTH compile lock of the same family
   and it is the one Story 2.7 walks into.** `MarketDataProvider.feed` is required with no
   default, so a provider that does not declare which venues are in its numbers **cannot
   ship**: removing it from `fixture-provider.ts` is `TS2741: Property 'feed' is missing`,
   measured. Re-run it in the same pass as the three above, because it is the mechanism
   behind §7.1 on screen — the chrome renders whatever the configured provider declares, and
   nothing else in the chain would catch a provider that quietly declared the wrong one.
   Note the lock is one-directional in a way `adjustment`'s is not: there is no
   `@ts-expect-error` pinning it, so the day somebody gives `feed` a default this check goes
   green. That is a stated gap rather than an oversight — a default feed is a claim about the
   market rather than a convenience, and the honest place to catch it is review.

6. **`pnpm verify` passes with no network access.** Take it with the network genuinely
   disabled, and take it twice — once from the working tree and once from a **clean clone**,
   which is the eleventh such run and the only place some guards fire at all. Task 1.13.5
   found a whole class of failure that way.

   **Amended 2026-09-07 by Task 2.6.6, which did half of this and is explicit about which
   half — and note the count has since moved to 619, so re-run rather than cite.** What it
   checked is `pnpm test`: all **585** tests pass with `fetch`,
   `net.connect`, `net.createConnection`, `tls.connect`, `http.request`, `https.request` and
   `dns.lookup` replaced by functions that throw. **What that does NOT cover is the rest of
   the chain** — the blocker lives inside Vitest's workers, so `pnpm build`, `lint`,
   `format:check`, `stories`, `env:check` and, most sharply, **`test:process`, which spawns a
   real `dist/index.js` as a child the blocker never reaches** — are all still unproven. So
   criterion 6's full form is genuinely this task's, and the honest way to take it is at the
   machine rather than in-process: run the whole of `pnpm verify` with the network off.

   Two pieces of method worth inheriting rather than rediscovering. **Vitest 4 has no
   `--setupFiles` CLI flag** (`CACError: Unknown option`), so an in-process blocker goes in
   through a temporary per-package config that `mergeConfig`s the real one — and
   `apps/frontend` must keep `src/test-setup.ts` in that list or RTL's cleanup silently
   stops. And **a blocker needs a control**: a throwaway test calling `fetch` run both ways,
   because a suite that passes under a blocker that does not block is the exact shape of Task
   2.5.3's _"a break that does not go red is evidence the break did not land"_.

### Re-take every figure, and reproduce them rather than citing them

- `pnpm verify` exit code and per-step split, warm and cold, **with and without a database**
- `pnpm test`, `pnpm test:process`, `pnpm test:database`, `pnpm e2e` counts
- **the frontend artefact**, all four files with sizes and hashes. Task 2.6.1 predicted this
  story's `packages/shared` bundle cost; **measure it against the prediction and say whether
  the prediction was right.** Task 2.3.8's finding is the thing to look for: a vocabulary
  declared as a literal is tree-shaken completely, one built by calling a function is not.
  **The prediction is in two halves and only the second is a forecast** (`PROVIDER.md` §11):
  Tasks 2.6.2–2.6.6 must move the artefact by **zero bytes**, which is a **check** — any
  movement there means something was declared through a constructor call and should be found
  and fixed rather than reported — and Task 2.6.7's movement is the feature, for which no
  tighter prediction than "a few hundred bytes of strings plus a component" was offered and
  a miss is not a defect. **Amended 2026-09-07: half 1 is now confirmed for ALL FIVE of Tasks
  2.6.2–2.6.6 by measurement** — the artefact reproduces 369,437 B `4f17aff3…`, 17,317 B
  `eb223e53…`, `index.html` 1,101 B `898733b0…`, 300 B, **388,155 B over four files** after
  each of them — so what is left to measure here is **half 2 only**, which is Task 2.6.7's
  movement and is the feature. Task 2.6.6 is the least interesting of the five and worth
  saying so: everything it shipped is in `apps/backend`, which the browser bundle cannot
  reach at all. **Amended 2026-09-07: half 2 is now measured and REPRODUCING it is what is
  left.** `HEAD` is **371,463 B `c8f1c3ad…`** of JavaScript, **18,063 B `ed3d1744…`** of CSS,
  `index.html` **1,101 B `7b0075a8…`** and 300 B, for **390,927 B over four files at 300
  modules**. Both halves of the movement are explained rather than noted: **+2,026 B** of
  JavaScript is the component, the hook, `getMarketData`, the predicate — and
  **`MARKET_FEED_DESCRIPTIONS` reaching the browser for the first time**, which Task 2.6.3
  measured at **zero** because nothing read it, confirmed by grep; **+746 B** of CSS is
  `FeedProvenance.module.css` entering the artefact. The check worth re-running rather than
  the number: `FeedIndicator` did **not** leave the bundle, correctly, because the landing
  route's render check still uses it — a bundle that lost `disconnected` would mean the
  render check had been broken by this story
- the install cost, if anything was added — store entries, KB, lockfile lines, and the
  install-script sweep, which should still return `esbuild@0.28.2` and nothing else.
  **Amended 2026-09-07: Tasks 2.6.2 to 2.6.6 added no dependency at all**, ~~so unless Task
  2.6.7 adds one the expected result~~ **and neither did 2.6.7, so the expected result** of
  this whole line is "unchanged" for the **whole story** — which is a check rather than a
  formality, since a lockfile that moved with nobody adding a package is worth finding
- Storybook's file count, which has been carried as "unchanged" across closes that never
  re-took it and was wrong twice
- **the axe baseline, which this story moved a component into and is therefore not a
  formality** (added 2026-09-07 by Task 2.6.7). The landing route reads **0 violations / 37
  passes / 1 inconclusive (`color-contrast`)** at 1280×720, ×560 and ×480 — Task 1.5.4's
  figure — and 2.6.7 took it **nine** ways, at each viewport in each of the three feed states,
  because the state that matters is one a browser cannot be put into without intercepting the
  route. Reproduce it the same way rather than at the default viewport in whatever state the
  developer's `.env` happens to produce: **the violation that task found was in exactly one
  of those nine cells**

**Reproduce `HEAD`'s figures, not the last task's.** Task 2.5.6 found that the instruction
"reproduce Task 2.5.5's figures" was the wrong instruction, because two follow-up commits had
moved the artefact and a close that cited the task file would have reported a regression that
did not happen.

### The sweeps, each of which has caught something every time it has been run

- **The duplicated-sentence sweep.** Twelve convention blocks, ten byte-identical, plus two
  historical variants. `pnpm test`'s count is stated in ten of them and in `EPIC.md` and
  `README.md` and `CLAUDE.md`. It was stale by **two whole story closes** at Task 2.3.8. Grep
  it; do not read the list of places somebody remembered. **Amended 2026-09-07: it is stale
  by two story closes again going into this task.** The ten identical blocks still read
  `287 across 25 … as of Task 2.3.8`, which Story 2.5's close did not touch and Story 2.6's
  tasks have not either; the tree runs **585** across 45 files. `README.md`'s six sites were
  amended by Task 2.6.6 — they read `507`, stale by two tasks — so that one is done and
  should not be re-amended; the twelve blocks are not.
  **Amended 2026-09-07: the tree runs 619 across 49 files**, and `README.md` is stale again
  by one task — so it IS to be re-amended after all, which is this sweep's own lesson
  arriving inside its own note: a "done" recorded against a moving number has a shelf life.
  Re-count; do not cite either figure
- **The live-versus-historical distinction.** A count inside a completed task's write-up is a
  correct record of what was true then; the same count in `README.md` is a live claim. Amend
  the second, leave the first — the distinction a naive grep-and-replace destroys
- **Claims that have stopped being true.** Specifically likely this story: `AppHeader`'s own
  comment says the market feed "is still hard-coded and still correctly reads
  `DISCONNECTED`", `README.md` lists it among the things that read as faults, `feed-status.ts`
  describes a vocabulary that now has a neighbour, and `CLAUDE.md` says the frontend "does not
  call the backend" in a paragraph that has been amended four times. Grep for the claim, not
  for the file. **Amended 2026-09-07 by Task 2.6.6, which added three claims to watch.**
  `config.ts`'s header says it is _"the one place this application reads the environment"_ —
  still true — but it is now also the first file in `apps/backend` to **import from
  `packages/shared`**, which its comments do not mention and which is load-bearing for
  `scripts/local-database.mjs`, since that script reads the built `dist/config.js`.
  `apps/backend/.env.example`'s variable count moved 12 → 13. And
  `market-data-provider.ts`'s comment saying _"Nothing implements it yet: Task 2.6.6 supplies
  the fixture provider and Story 2.7 the first real client"_ is now false in its first clause
  and should get the same dated treatment an ADR would — **still open, and deliberately left
  for this sweep rather than fixed in passing by Task 2.6.7, because pre-emptively closing
  half a sweep's targets is how a sweep comes back clean while being unrun.**

  **Amended 2026-09-07 by Task 2.6.7 — two of the four named above are CLOSED, one is still
  open and one is new, so read this list as a starting point rather than as the answer.**
  Closed: `AppHeader`'s comment, which now describes provenance and says where
  `FeedIndicator` went; and `README.md`'s fault list, where the `DISCONNECTED` item is struck
  through and the list is **one shorter** — only the second item ever to leave it.
  **Newly open: `packages/shared/src/feed-status.ts`.** Every sentence in it is still true
  and its _context_ is not: `FeedStatus` is no longer rendered in the chrome at all, having
  been replaced there by provenance, and its only consumers now are the landing route's
  render check and the workshop. A reader arriving at that file today would reasonably
  conclude the header shows one of those three words. It wants a dated note saying where the
  vocabulary went, and that Epic 3 brings a connection state back **beside** provenance
  rather than instead of it. Do not strike the type — it is Epic 3's and it is unchanged.
  **And one figure this story published is already known wrong**: Task 2.6.7 recorded
  `pnpm e2e` as "28 across six spec files" and it is **seven**. Corrected in that task's file
  and in `CLAUDE.md`, and worth re-counting here rather than trusting the correction, since
  the original was itself a count taken from memory of the directory rather than from `ls` —
  which is Task 1.13.6's "five spec files" error in a new place

- **ADR present-tense descriptions.** Task 2.5.6 established the rule: an ADR's decision is
  never rewritten and never renumbered, but a present-tense description of the tree that has
  become false gets a **dated amendment beside it**, because a reader cannot tell a stale
  description from a current one
- **The link sweep.** Task 2.5.6 found four genuinely broken cross-file links, the first time
  in six readings, all four from the story renumber — and it fired the stated reversal trigger
  for a link checker in `pnpm verify`, recorded as **owed rather than taken**. Re-read that
  decision here rather than deferring it a second time. The double-hyphen trap will report
  correct anchors as broken for the seventh time; do not "fix" those

### Read the deployed page, which Task 2.6.7 could not

**Added 2026-09-07. This is the one piece of unfinished WORK this task inherits rather than a
figure to re-take**, and it is Tasks 2.2.7 and 2.3.7's shape for the third time: the body of
a change ran, and the change itself has not, because `deploy.yml` only runs on `main`. Task
2.3.8's precedent is exactly this and it is the one to follow — that task read the first real
execution of the `Load the tracked universe` step and reported it (`0 inserted, 0 updated,
101 unchanged`, 2 s, exit 0).

So: **open the deployed page in a browser and read the `Market feed` region.** What it should
say is determined by `MARKET_DATA_PROVIDER` on the Container App, which exists in **no file in
this repository** — it is in the sixth gap category, platform-only configuration — so read it
back off the app rather than predicting it. If it has never been set, the default is `none`
and the region reads `NOT CONFIGURED` / _"No market-data provider is configured."_

Three things to take while there, none of which needs more than the page already loaded:

- **The `/market-data` response from the deployed backend.** Before the merge it was **404**
  carrying the `ApiError` contract (measured, and recorded in Task 2.6.7's file); afterwards
  it is a 200 with a `feed`. That before-and-after is the proof the step is wired, and it is a
  weaker demonstration than the local one, which is fine and should be said rather than
  dressed up.
- **The `check-deployed` job's new assertion.** `two-halves.spec.ts` gained _"the deployed
  chrome makes a real claim about the market feed"_, riding on a page load it already
  performed, so it costs the deployed backend nothing. Its **first real execution** is that
  same merge — read it, the way this task reads the migration and universe steps.
- **Whether the rollout window behaved as predicted.** Task 2.6.7 argued that a new frontend
  asking an old backend degrades to `unknown` rather than breaking, and asserted it against
  the measured 404 in a unit test. The deploy is the only place the real thing happens, and
  it lasts about ninety seconds. Catching it is opportunistic rather than required — **say
  which** rather than implying it was watched.

### ADR 0018

`docs/adr/0018-*`. It is the eighteenth ADR and `0018` — note the file number is not
necessarily the ordinal, since `0014` was reserved and written after `0015`; `ls docs/adr/`
is the count, and this sentence has been wrong three times.

Write it in the shape ADRs 0010 to 0017 use, and make it answer the questions a later reader
actually arrives with:

- why the interface exists **before** any vendor code, which is invariant 7 rather than a
  preference
- why the domain types are in `packages/shared` and the provider interface is not
- what provenance is attached to and why that granularity survives a stitched series
- why adjustment is explicit with no default, and the split-cliff argument
- why a provider call cannot throw, and where the line between a result and a defect is
- why there is no retry and no cache inside a provider — **and, amended 2026-09-07 by Task
  2.6.5, where retry DOES live**, which is the half a later reader actually arrives with.
  A wrapper implementing the same interface, with both rejections recorded (inside a provider
  makes the caller's deadline a lie; at the call site conflates per-request retry with
  cross-request pacing, which is how a backfill re-fetches ninety-nine symbols that answered
  perfectly because one was rate-limited) and the three constraints that bound it, with no
  numbers — those are Story 2.7's. Note it was **decided and not built**, deliberately
- **the two rules the taxonomy rests on**, both from Task 2.6.5 and both cheaper to state
  than to re-derive: _a cause is a union member when it is a fact about the world and a thrown
  defect when it is a fact about our code_, and _a member carries only what the caller does
  not already hold_ — the second of which is why no member echoes the request back, and why
  `timeout` carries a number while `unknown-symbol` carries nothing
- **why the feed is a field on the PROVIDER** (added 2026-09-07 by Task 2.6.7), which is the
  decision a Story 2.7 reader arrives with and the one most likely to look arbitrary. The
  argument is that it **removes a copy rather than adding one** — the fixture provider already
  wrote its feed as a literal inside its own `BarSource` — and that §4.2's
  provider-and-feed-vary-independently rule is an argument against _inferring_ a feed from a
  provider id, not against a provider _declaring_ one, because the thing holding the
  credential is the thing that knows its plan. Record both rejections (a second environment
  variable; rendering only the provider until a series exists) and the line that keeps §4.2
  true: the provider's `feed` is the **standing claim about what the deployment is configured
  to read**, and `SeriesProvenance` is the authority for a **particular** series
- **why invariant 6 is met by a SENTENCE and not an acronym**, which is the product half of
  this story and belongs in the record rather than only in a component. §7.1 does not ask for
  `Market feed: IEX`; it says we must not imply IEX represents every US exchange, and three
  letters tell a non-specialist nothing. Record that the words live in
  `MARKET_FEED_DESCRIPTIONS` with a `satisfies` guard, that a renderer imports them, and that
  `synthetic`'s sentence is `PROVIDER.md` §5.4's safety mechanism arriving on screen —
  a fixture-backed screenshot that advertises itself without anybody remembering a banner
- **why `GET /market-data` exists rather than a field on something**, and specifically why
  `/securities` is **structurally** unable to serve it: the chrome renders on all five routes
  and `useSecurities` fetches only on one. Note it is a first cut of Story 2.9's contract,
  pre-empted in that story's file, and that the body is one field because nothing reads a
  second
- **and the section every ADR here carries: what a green fixture-backed test certifies and
  what it cannot.** Be specific. It certifies that our code agrees with a corpus we wrote; it
  certifies nothing about the vendor until Story 2.7 re-records that corpus, and saying so is
  the honest form of criterion 2. **Amended 2026-09-07: there is now a second thing in this
  story that certifies less than it looks like it does, and it is on screen.** The chrome's
  feed claim is true about _our configuration_ and says nothing about whether the configured
  provider is reachable, entitled, or returning anything — a deployment reading `IEX` with a
  revoked key still says `IEX`, correctly, because that is what it is configured to read.
  Story 2.12 renders a failed fetch beside the thing that failed to load; this region never
  does, deliberately, and an ADR that does not say so invites the first person debugging an
  outage to trust it

### Update the pointers rather than copying the content

`CLAUDE.md` gets a paragraph and a pointer to `PROVIDER.md`; `README.md`'s ADR list gets
0018 and its "most recent" claim checked, which has been stale twice. The rule that produced
the twelve-block problem is the one to honour: **point at the document, do not duplicate it.**

## Done when

- All six criteria re-run against the shipped tree, each with the command and the result
- `pnpm verify` exit 0 **with the network disabled**, from the working tree and from a clean
  clone
- **The deployed page read in a browser and the `Market feed` region reported**, with
  `MARKET_DATA_PROVIDER` read back off the Container App rather than predicted — the gap Task
  2.6.7 handed forward, and the `check-deployed` job's new assertion read on its first real
  execution
- Every figure re-taken; the bundle prediction from Task 2.6.1 confirmed or corrected
- All five sweeps run, with what each found written down — including "nothing", which is
  itself a result and has only happened once
- `docs/adr/0018-*` exists and carries the what-it-does-not-certify section
- `PROVIDER.md`'s decision list matches what shipped, with any decision that changed during
  implementation amended rather than silently left
- The link-checker decision is re-read and either taken or re-declined with a dated reason

## Notes

**Amended 2026-09-07 by Task 2.6.7: nothing in this story was added, deleted or re-ordered,
and this task's shape did not change — but it inherits one piece of unfinished work rather
than only figures.** That is the deployed read above. Everything else 2.6.7 changed here is
an amendment to a figure or a sweep target, which is what these lists are for.

Worth knowing before running the sweeps: **2.6.7 closed two of the four claims this task had
queued and opened one new one**, and it corrected a figure of its own the same day it
published it (`pnpm e2e` across six spec files, which is seven). That is the third time in
this story a recorded count has moved between a task shipping and the close reading it —
2.6.2's vendor grep, 2.6.5's, and now this — so treat every number in this file as a
starting point for a command rather than as a result.

The single most valuable output of this task is the honest form of criterion 2. Every test in
this story passes against fixtures we wrote, which means a green suite here certifies
internal consistency and not correctness against a market-data vendor. Story 2.7 is where
that becomes a real claim, and it will only do so if this task hands it the obligation
explicitly rather than as an assumption.
