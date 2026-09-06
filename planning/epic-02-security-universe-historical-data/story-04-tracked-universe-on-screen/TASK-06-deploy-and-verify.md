# Task 2.4.6 — Deploy it, verify it in a browser, and hand forward what was pre-empted

**Status:** Not started
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Tasks 2.4.1 to 2.4.5

## Objective

Get the page in front of a person on the deployed environment, verify it there rather than
locally, and write down precisely what this story took from Stories 2.9, 2.10 and 2.11 so
none of them re-decides it or assumes it is still theirs.

## What the user can see when this lands

**The finished thing, live, at the deployed URL** — and this is the task after which a
stakeholder can be sent a link rather than a screenshot.

It is also the task that produces the artefact worth putting in front of them: a short
written summary of what the page shows, what it deliberately does not, and which story
brings each missing piece. "No prices until Story 2.8, no search until 2.11, no chart until
2.12" is a better answer to "when do we see more?" than a roadmap, because it is attached
to something they are looking at.

## Work

- **Verify against the deployed pair, not only locally.** Story 1.12's criterion was "not
  only locally" and it earned that wording: Story 1.12.7 found `unreadable-body` reachable
  deployed and unreachable locally because the two hosts disagree about the one request an
  API client actually sends. This is the first deployed page that makes a data request, so
  it is the first one where that class of difference can bite
- **Follow one request from the browser to the log.** The `x-request-id` the browser reads
  should be the `reqId` in the backend's Log Analytics record for that request — the
  arrangement Story 1.11 built and that has been re-taken every story since, here for the
  first time on a request that returns data rather than health
- **Read the deployed page's numbers back against the database.** The count on screen, the
  eleven sectors, and a spot check of three securities against what `pnpm universe` loaded.
  Identical is the check rather than a coincidence
- **Decide whether anything goes into `e2e/specs-deployed/`**, and expect the answer to be
  **yes** for the first time in this project. That suite exists to catch what only a browser
  against the live environment can see, and its two existing journeys are about the two
  halves talking. A page that renders data from an API is a third thing that can be broken
  deployed and correct locally — a wrong `VITE_API_BASE_URL` gives a page that loads and
  shows nothing, which is exactly the failure that suite was built for. Note the cost stated
  in Task 1.13.5: a green run costs the deployed backend a handful of requests, and the
  suite gates nothing because it runs after a merge
- **Write down what this story pre-empted, in the three stories it took from**, and amend
  each of their files rather than only recording it here. `STORY.md`'s table is the source:
  2.9 keeps the series contract and loses the universe endpoints and the temporal seam; 2.10
  keeps the store decision and the `market` module and loses the first fetch and the state
  types; 2.11 keeps search, the combobox, the per-security route and the Explorer shell and
  loses the list. **A story whose scope moved and whose file did not say so is how work gets
  done twice**, and this repository has the convention of amending the file rather than
  remembering
- **Record the temporal seam decision where Epic 13 will find it.** Task 2.4.1 establishes
  the arrangement; this is where it is stated as a property of the tree rather than of a
  task — including the honest half, which is that `securities` is not a temporal table, so
  the seam is established and **not yet exercised by anything**
- **Update `CLAUDE.md` and `README.md`**: the routes paragraph, which currently describes
  `/securities` as a placeholder, and the list of things a correct first run shows that read
  as faults
- **Sweep the "Story 2.9 writes the first `selectFrom`" claim, which Task 2.4.1 made false.**
  It is in **twelve files** — `CLAUDE.md`, `docs/adr/0015-*`, `DATA-LAYER.md`, three Story
  2.2 files, Story 2.9's own `STORY.md`, and the source comments in `schema.ts`,
  `migrate.ts` and `database.ts` — of which two are this story's own and correct. Apply the
  distinction Task 1.10.8 established and Tasks 1.12.8, 1.13.6 and 2.3.8 each re-applied: a
  **live** claim about where the seam is gets corrected, and a **historical record** of what
  a task believed when it was written is left standing, because rewriting it destroys the
  record. A naive grep-and-replace across twelve files is exactly the failure that
  distinction exists to prevent — read each one
- **Verify the untracked rendering deployed, not only locally**, which is acceptance
  criterion 6's "produced rather than reasoned about" arriving at the one environment that
  matters. It is a deploy rather than a database edit: remove a symbol from
  `apps/backend/src/universe.ts`, let the pipeline's `Load the tracked universe` step mark
  the row, read the page, and put it back — two merges. Note the row **stays** `untracked`
  in the deployed table until the second one lands, which is the mechanism working rather
  than a mess to clean up, and that the deployed count and the tracked count are genuinely
  different numbers for that window — which is the only chance this story gets to see the
  summary line's wording be right for a non-trivial reason
- **Re-take the artefact figures**, because this story ships real frontend source for the
  first time since Story 1.13 and the four-file bundle will move

## Done when

- The page is live and verified in a browser against the deployed pair
- One correlation id followed from the browser to a deployed log record
- The deployed page's count and sectors match the database
- An untracked security has been seen rendered as untracked **on the deployed page**, and
  the summary line read correctly while the two counts differed
- The stale `first selectFrom` claim is corrected where it is live and left standing where
  it is a historical record, with the count of each recorded
- Stories 2.9, 2.10 and 2.11 each carry an amendment saying what moved
- `CLAUDE.md` and `README.md` describe the route as it now is
- All six acceptance criteria re-run, with the figures re-taken rather than cited

## Notes

There is deliberately **no ADR** for this story. It takes no architectural decision of its
own — the read path, the contract idiom and the state-as-types pattern are all applications
of decisions ADRs 0002, 0007, 0012 and 0015 already record — and the two genuinely new
decisions it makes, the temporal seam's shape and the store deferral, belong to Story 2.9's
and Story 2.10's ADRs respectively. Recording that refusal here is the point: an ADR per
story is a convention nobody chose, and this repository's rule is one ADR per decision worth
arguing about.

---

## Amended 2026-09-06, after Task 2.4.2

Three small corrections. None changes this task's scope, and the sweep's count was checked
rather than assumed — it is still **twelve files** carrying the `first selectFrom` claim
plus this file itself, of which Story 2.4's own two are correct.

**Part of the `CLAUDE.md` update is already done.** Task 2.4.2 added tree entries for
`apps/backend/src/routes/securities.ts` and `packages/shared/src/securities-response.ts`,
and corrected the stale reversal-trigger comments in `database.ts` and `index.ts` in the
same commit as the change they describe. What is left here is the **routes paragraph**,
which still calls `/securities` a placeholder, and `README.md`'s list of things a correct
first run shows that read as faults.

**`database.ts`'s reversal trigger now names a condition rather than a story**, because
Task 2.4.2 could not fire it: the repository needs the pool, the pool needs `app.log`, and
`pino` is not importable from `apps/backend`, so `ServerOptions.securities` cannot be
constructed before the call it would be an argument to. What that means for this task is
that the hand-forward to Story 2.9 should say the trigger is **still unfired and why**,
rather than recording it as spent — and that `server.test.ts`'s route-table walk now covers
every route the application serves, including the diagnostics one, which closes a cost Task
2.1.7 stated and is worth naming in the hand-forward as something Story 2.9 inherits rather
than has to build.

**Do not try to produce the missing-`provenance` case deployed.** The envelope omits
provenance when the rows disagree, and in production that condition arrives only with Story
2.7 filling profile fields from Alpaca. It was produced locally against a real database at
Task 2.4.2 and needs no second demonstration; deliberately putting the deployed table into
a disagreeing state would mean writing rows the loader would then have to unwrite. The
untracked-row verification above is different and does belong here, because it is produced
through the pipeline's own `Load the tracked universe` step.
