# Task 2.3.6 — Change the universe: add one, remove one, and say what expansion costs

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Task 2.3.5 (a loader to run twice)

## Objective

Demonstrate the two changes this list will actually undergo — a symbol added and a symbol
removed — decide what a removal does to data already stored against it, and establish that
500 needs no redesign.

Acceptance criterion 5, and §6's expansion clause. This is the story's counterpart to Task
2.2.6: the loader has been seen to work, and this is where it is made to do the thing
nobody tested.

## Work

- **Add a symbol and run the loader**, on a database that already holds the universe.
  Record what changed: one new row, every other row untouched, `updated_at` unmoved on
  rows that did not change — that last one is the property with no trigger behind it and
  therefore the one most likely to be wrong.
  **Amended after 2.3.4: which sector you pick is constrained, and picking the wrong one
  demonstrates a change that breaks the selection rule in the same breath.** The shipped
  distribution sits **on both bounds at once** — technology is at the ceiling of 12, and
  utilities, real estate and materials are each at the floor of 6 (`UNIVERSE.md` §9). So
  **add to a sector below 12 and remove from a sector above 6**, and say which you chose and
  why. Health care, financials and consumer discretionary sit at 9 and have slack in both
  directions, which makes one of them the obvious subject for all three operations
  **Amended after 2.3.5, and this is the sharpest thing handed to this task: that
  observation is only true if you do not move `UNIVERSE_PROVENANCE.checkedOn` in the same
  run, and moving it may well be the honest thing to do.** 2.3.5 put the classification's
  as-of date in the file rather than stamping `now()`, and the loader's upsert compares
  every written column — including `classification_retrieved_at` — to decide whether a row
  changed. So moving that date by one day and re-running reports **`0 inserted, 101
updated, 0 unchanged`** and moves **every** row's `updated_at`. Measured, not predicted.
  Two consequences. **Decide explicitly whether adding a symbol counts as re-checking the
  list against a source** — there is a real argument each way, and the answer decides
  whether this task's own commit moves the date — and **if it does move, take the
  add-a-symbol observation in a separate run from the date move**, or the correct result
  reads as a bug and somebody "fixes" the `is distinct from` clause that makes `updated_at`
  mean anything
- **Remove a symbol and run the loader, having decided first what removal means.** This is
  the real decision in the task and it is a decision about _data that does not exist yet_:
  Story 2.8 will store bars against these rows, and Epic 13 will replay a date on which a
  removed security was in the universe. `migrations/README.md` §5 already argues the shape
  — nothing is soft-deleted, there is no `deleted_at`, and what changes is a **status**
  that is displayed rather than filtered away — so the expected answer is a status
  transition rather than a `DELETE`, and this task's job is to make that concrete and to
  say what every later reader has to do about it. Note the second-order consequence
  honestly: a status that readers must filter on is an **invisible predicate**, and that
  document's own argument is that one is a design and two is a bug waiting for whoever
  forgets. Say which readers filter and which do not
- **Note what 2.3.5 already built, because this task's job is the decision rather than the
  detection.** **Added after 2.3.5.** The loader already finds a symbol that is in the
  database and not in the file: it counts them, names them, and **leaves them untouched**,
  at exit 0. So there is nothing to build to notice a removal — what this task adds is what
  happens next. Note the shape that creates: `load-universe.database.test.ts` carries a test
  named _"is reported, left untouched, and does not fail the load"_ which **asserts today's
  non-answer as correct behaviour**, so implementing a removal means **editing that test**
  rather than adding one beside it. That is deliberate and it is the seam working: the
  assertion is what stops the answer being changed by accident, and changing it on purpose
  is a visible edit in a diff
- **Note that the vocabulary is now enforced, so a removal cannot be improvised.**
  `securities_status_check` in `0003` permits `active` and `untracked` and nothing else, so
  a loader that invented `removed` or `inactive` is refused by the database rather than
  quietly storing a fourth word. `delisted` is specifically refused, which is Task 2.3.1's
  deferral to Story 2.7 made into a fact rather than a comment — and it means this task
  cannot reach for that member even if the removal being demonstrated feels like a
  delisting. A `DELETE` is not refused by anything, which is why the decision below is
  still a decision
- **Distinguish the two removals if Task 2.3.1's vocabulary did.** A security delisted by
  the market and a security we stopped tracking are different events, and the second one is
  reversible — a symbol removed and later re-added must not arrive as a second row, because
  `symbol` is unique and the natural key. Produce the re-add and check it lands on the
  original `id`.
  **Amended after 2.3.5: under the expected answer this check is nearly vacuous, and saying
  so is better than presenting a trivial pass as evidence.** If removal is a status
  transition the row never leaves the table, so the re-add is an upsert onto a row that was
  always there and the `id` is unchanged for an uninteresting reason. It is only a real test
  of the surrogate key against the alternative — a `DELETE` — where the re-add gets a **new**
  `id` and orphans anything referencing the old one. So either produce both and record the
  contrast, which is what makes the decision evidenced rather than asserted, or state that
  the check is trivial under the chosen answer and do not count it as a demonstration
- **Produce the ticker-change case, or state precisely why it is deferred.** FB became META,
  and it is the case the surrogate key exists for — Task 2.2.4's comment names it by name.
  A rename is not an add plus a remove, because the bars belong to the same company; but
  nothing here can join them today, since the loader keys on `symbol`. Decide whether this
  story handles it or names it as a known gap with an owner, and prefer the honest gap to a
  mechanism built against no instance
- **Make the argument for 500 without redesign, as an absence rather than a claim.** Walk
  the places a hard-coded 100 could hide — the loader, the schema, the validation, any
  default limit — and show there is none. Then say what expansion would actually cost in
  the parts of the system that do not exist yet, so a later story inherits the number
  rather than rediscovering it: bars per security per day times 500 against Story 2.1's
  measured **~22.5 GiB usable** and its ~1.18 GB/year estimate, and 500 symbols against
  whatever Story 2.7 finds Alpaca's request limits to be. **Do not load 500** — this story
  says demonstrated by argument, and a synthetic 500-row load would prove the loader scales
  and nothing else
- **Update what the change falsifies inside `apps/backend/src/universe.ts` itself, because
  that file describes its own shape and nothing checks that the description is true.**
  **Added after 2.3.4.** Each sector block carries a comment stating its count and its
  relation to §7's bounds — `// 12 — at §7's ceiling, and the ceiling is why…`, `// 6 — at
§7's floor, and that is a decision rather than a shortfall…` — and the technology block's
  comment states that eight of its twelve are semiconductors, which is the argument for the
  whole file's shape. A symbol added or removed without editing the comment beside it leaves
  the file making a false claim about itself, in the most-read place, and **there is no
  instrument anywhere that would catch it**: it compiles, lints, formats and loads. This is
  the same class as `migrations/README.md`'s "never edit an applied migration" — a rule only
  a person can hold — and this task is the first thing that will break it
- **Record all of it in `UNIVERSE.md`**, in the imperative, where the next person changing
  the list will look — which is that document and not this task file, the same treatment
  `e2e/README.md` and `migrations/README.md` got and for the same stated reason. Two
  sections there now need editing rather than only appending: **§9's distribution table**,
  which is the count this task moves, and **§8's expansion table**, whose "The universe
  file — no, Task 2.3.4" row became "yes" and whose walk is this task's to re-take rather
  than cite

## Done when

- A symbol added, a symbol removed and a symbol re-added are each demonstrated against a
  real database, with what happened to the row recorded in each case
- The removal's effect on stored data is decided, written down, and stated as an obligation
  on every later reader — with the readers named
- The ticker-change case is either handled or recorded as a gap with an owner
- Nothing in the codebase constrains the list to ~100, shown by walking the candidates
- `UNIVERSE.md` carries the change procedure

## Notes

The temptation is to build a diffing report, a dry-run mode and a removal-confirmation
prompt. None of those is asked for and each is a second mechanism to keep correct against
a list that changes a handful of times a year. What is asked for is that the two changes
have been done once, on purpose, with the results written down.

---

## Amended after Task 2.3.4 (2026-09-05)

Three edits above, no work added or removed. The list 2.3.4 produced constrains this task
in one way nobody anticipated and creates one obligation nothing can enforce:

- **The distribution sits on both bounds at once.** Technology is at the ceiling of 12 and
  three sectors are at the floor of 6, so an add and a remove are not free choices — pick
  from the sectors at 9.
- **`universe.ts` describes its own shape in comments** that this task is the first thing to
  falsify, and no instrument would notice.
- **`UNIVERSE.md` §8 and §9 both need editing rather than appending.**

---

## Amended after Task 2.3.5 (2026-09-05)

Three edits, no work added or removed. The loader that shipped constrains this task in one
way nobody anticipated, and makes one of its stated checks weaker than it reads:

- **Moving `UNIVERSE_PROVENANCE.checkedOn` reports every row as updated** — `0 inserted,
101 updated, 0 unchanged`, measured — because the loader compares
  `classification_retrieved_at` like any other column. So the add-a-symbol observation and
  an honest date move cannot share a run, and **whether adding a symbol counts as
  re-checking the list is a decision this task has to take** rather than a detail.
- **The removal seam is already detected and already tested as a non-answer**, so this task
  edits `load-universe.database.test.ts` rather than adding to it. What is missing is the
  decision, not the mechanism.
- **The re-add check is trivial under the expected answer** and is only evidence against
  the `DELETE` alternative.
