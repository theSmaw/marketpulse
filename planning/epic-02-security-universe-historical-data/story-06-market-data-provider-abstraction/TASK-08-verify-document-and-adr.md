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
6. **`pnpm verify` passes with no network access.** Take it with the network genuinely
   disabled, and take it twice — once from the working tree and once from a **clean clone**,
   which is the eleventh such run and the only place some guards fire at all. Task 1.13.5
   found a whole class of failure that way.

   **Amended 2026-09-07 by Task 2.6.6, which did half of this and is explicit about which
   half.** What it checked is `pnpm test`: all **585** tests pass with `fetch`,
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
  reach at all
- the install cost, if anything was added — store entries, KB, lockfile lines, and the
  install-script sweep, which should still return `esbuild@0.28.2` and nothing else.
  **Amended 2026-09-07: Tasks 2.6.2 to 2.6.6 added no dependency at all**, so unless Task
  2.6.7 adds one the expected result of this whole line is "unchanged" — which is a check
  rather than a formality, since a lockfile that moved with nobody adding a package is worth
  finding
- Storybook's file count, which has been carried as "unchanged" across closes that never
  re-took it and was wrong twice

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
  should not be re-amended; the twelve blocks are not
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
  and should get the same dated treatment an ADR would
- **ADR present-tense descriptions.** Task 2.5.6 established the rule: an ADR's decision is
  never rewritten and never renumbered, but a present-tense description of the tree that has
  become false gets a **dated amendment beside it**, because a reader cannot tell a stale
  description from a current one
- **The link sweep.** Task 2.5.6 found four genuinely broken cross-file links, the first time
  in six readings, all four from the story renumber — and it fired the stated reversal trigger
  for a link checker in `pnpm verify`, recorded as **owed rather than taken**. Re-read that
  decision here rather than deferring it a second time. The double-hyphen trap will report
  correct anchors as broken for the seventh time; do not "fix" those

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
- **and the section every ADR here carries: what a green fixture-backed test certifies and
  what it cannot.** Be specific. It certifies that our code agrees with a corpus we wrote; it
  certifies nothing about the vendor until Story 2.7 re-records that corpus, and saying so is
  the honest form of criterion 2

### Update the pointers rather than copying the content

`CLAUDE.md` gets a paragraph and a pointer to `PROVIDER.md`; `README.md`'s ADR list gets
0018 and its "most recent" claim checked, which has been stale twice. The rule that produced
the twelve-block problem is the one to honour: **point at the document, do not duplicate it.**

## Done when

- All six criteria re-run against the shipped tree, each with the command and the result
- `pnpm verify` exit 0 **with the network disabled**, from the working tree and from a clean
  clone
- Every figure re-taken; the bundle prediction from Task 2.6.1 confirmed or corrected
- All five sweeps run, with what each found written down — including "nothing", which is
  itself a result and has only happened once
- `docs/adr/0018-*` exists and carries the what-it-does-not-certify section
- `PROVIDER.md`'s decision list matches what shipped, with any decision that changed during
  implementation amended rather than silently left
- The link-checker decision is re-read and either taken or re-declined with a dated reason

## Notes

The single most valuable output of this task is the honest form of criterion 2. Every test in
this story passes against fixtures we wrote, which means a green suite here certifies
internal consistency and not correctness against a market-data vendor. Story 2.7 is where
that becomes a real claim, and it will only do so if this task hands it the obligation
explicitly rather than as an assumption.
