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

2. **A fixture provider implements it fully and is what tests use.** "Fully" means no method
   throwing "not implemented"; "is what tests use" means grep for anything else.
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
  a miss is not a defect
- the install cost, if anything was added — store entries, KB, lockfile lines, and the
  install-script sweep, which should still return `esbuild@0.28.2` and nothing else
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
  it; do not read the list of places somebody remembered
- **The live-versus-historical distinction.** A count inside a completed task's write-up is a
  correct record of what was true then; the same count in `README.md` is a live claim. Amend
  the second, leave the first — the distinction a naive grep-and-replace destroys
- **Claims that have stopped being true.** Specifically likely this story: `AppHeader`'s own
  comment says the market feed "is still hard-coded and still correctly reads
  `DISCONNECTED`", `README.md` lists it among the things that read as faults, `feed-status.ts`
  describes a vocabulary that now has a neighbour, and `CLAUDE.md` says the frontend "does not
  call the backend" in a paragraph that has been amended four times. Grep for the claim, not
  for the file
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
- why there is no retry and no cache inside a provider
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
