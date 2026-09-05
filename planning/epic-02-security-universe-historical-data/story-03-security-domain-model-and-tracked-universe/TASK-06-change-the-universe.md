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
  therefore the one most likely to be wrong
- **Remove a symbol and run the loader, having decided first what removal means.** This is
  the real decision in the task and it is a decision about _data that does not exist yet_:
  Story 2.7 will store bars against these rows, and Epic 13 will replay a date on which a
  removed security was in the universe. `migrations/README.md` §5 already argues the shape
  — nothing is soft-deleted, there is no `deleted_at`, and what changes is a **status**
  that is displayed rather than filtered away — so the expected answer is a status
  transition rather than a `DELETE`, and this task's job is to make that concrete and to
  say what every later reader has to do about it. Note the second-order consequence
  honestly: a status that readers must filter on is an **invisible predicate**, and that
  document's own argument is that one is a design and two is a bug waiting for whoever
  forgets. Say which readers filter and which do not
- **Distinguish the two removals if Task 2.3.1's vocabulary did.** A security delisted by
  the market and a security we stopped tracking are different events, and the second one is
  reversible — a symbol removed and later re-added must not arrive as a second row, because
  `symbol` is unique and the natural key. Produce the re-add and check it lands on the
  original `id`
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
  whatever Story 2.6 finds Alpaca's request limits to be. **Do not load 500** — this story
  says demonstrated by argument, and a synthetic 500-row load would prove the loader scales
  and nothing else
- **Record all of it in `UNIVERSE.md`**, in the imperative, where the next person changing
  the list will look — which is that document and not this task file, the same treatment
  `e2e/README.md` and `migrations/README.md` got and for the same stated reason

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
