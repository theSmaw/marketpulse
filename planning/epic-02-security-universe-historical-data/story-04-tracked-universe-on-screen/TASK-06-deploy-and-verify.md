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

---

## Amended 2026-09-06, after Task 2.4.3

Two additions to the documentation sweep and one figure. Nothing changes this task's scope,
and the `first selectFrom` sweep's count is untouched — Task 2.4.3 shipped no backend source.

### The `CLAUDE.md` update is larger than "the routes paragraph"

Task 2.4.2's amendment above narrowed what was left to the routes paragraph and `README.md`.
Task 2.4.3 added frontend source, so there are now **four** things in that file describing a
tree that no longer exists:

- the **routes paragraph**, which still calls `/securities` a placeholder — already recorded
- the **tree block**, which needs `apps/frontend/src/use-securities.ts` and the
  `routes/SecurityExplorer.tsx` entry, in the shape the other frontend entries take
- the **frontend summary paragraph**, which says the application "has no state management"
  and describes `api-client.ts`'s single consumer — there are two hooks now, and the
  `fetch`-in-one-file claim is still true and worth re-verifying by grep rather than citing
- **`README.md`'s list of things a correct first run shows that read as faults**, which is
  where this task's real content is: that list is currently seven items long and one of them
  — the Security Explorer placeholder — has stopped being true, which is the first time
  anything has left that list rather than joined it

### The artefact moved, and this is the first time it has moved for shipped frontend source since Story 1.13

`CLAUDE.md` records the four-file bundle at **361,779 B** (348,250 B JavaScript, 12,128 B
CSS, 1,101 B `index.html`, 300 B config) as of Task 2.3.8, and notes that figure moved 115
bytes on a story that touched **no** `apps/frontend` file — `packages/shared` is inlined, and
`SECTOR_ETFS` is built by calling `toTicker()` eleven times, which a bundler cannot prove
side-effect-free. This task's re-take is the first in three stories where the number is
expected to move for the ordinary reason, so state both halves: what the page cost, and
whether anything crossed the `packages/shared` boundary that should not have.

One thing worth checking while re-taking it: `SECTOR_LABELS` and `isSecuritiesResponse` are
now genuinely reachable from the browser, where the sector vocabulary previously was not.
That is correct — the page renders sector names — but it makes `packages/shared`'s
tree-shaking behaviour a live concern rather than a curiosity, and it is the concrete case
the rule recorded in `CLAUDE.md` was written against.

---

## Amended 2026-09-06, after Task 2.4.4

Four things. The `first selectFrom` sweep is untouched — Task 2.4.4 shipped no backend
source — and this task's scope and position are unchanged.

### The `packages/shared` tree-shaking check is no longer a curiosity, and the answer flipped

The amendment above says `SECTOR_LABELS` and `isSecuritiesResponse` are "now genuinely
reachable from the browser" and calls that the concrete case the tree-shaking rule was
written against. Task 2.4.4 went considerably further, and the change is worth stating
precisely because it **reverses a measurement `CLAUDE.md` records**.

Task 2.3.8 found that `SECURITY_KINDS`, `SECTORS` and `SECURITY_STATUSES` were plain array
literals and were tree-shaken out **completely** — a grep of the bundle for `sector_etf`,
`untracked` or any sector name returned **zero** — with only `SECTOR_ETFS`' eleven
`toTicker()` calls surviving, at a cost of 115 bytes, because a call expression is not
provably side-effect-free.

**That is now false in the ordinary way**: the page iterates `SECTORS` to order its groups,
reads `SECTOR_ETFS` to name each benchmark and `SECTOR_LABELS` to write the heading, and
renders the `kind` and `status` vocabularies, so a grep for `sector_etf`, `technology`,
`XLK`, `Consumer Discretionary` and `untracked` now returns **one each**. Nothing crossed the
boundary that should not have — every one of those is a user-visible string this page
renders — but the rule's example has changed from "a vocabulary declared as a literal is free
to the browser" to a case where it is not free and is correctly paid for. Re-take that
paragraph rather than citing it, and note the reversal trigger it states (anything
**backend-only** reaching `packages/shared`) is still unfired.

### The artefact baseline to compare against is this story's, not Story 2.3's

The amendment above says to expect the four-file bundle to move from Task 2.3.8's
**361,779 B** and to state what the page cost. It has now moved twice — Task 2.4.3 and Task
2.4.4 — and the figure to re-take **from a clean build** is:

|                 | Task 2.3.8      | after Task 2.4.4            |
| --------------- | --------------- | --------------------------- |
| JavaScript      | 348,250 B       | **356,324 B** (`3c02056c…`) |
| CSS             | 12,128 B        | **17,905 B** (`66ad6676…`)  |
| `index.html`    | 1,101 B         | 1,101 B (`e4115c91…`)       |
| config          | 300 B           | 300 B                       |
| total / modules | 361,779 B / 279 | **375,630 B / 284**         |

The CSS moved proportionally further than the JavaScript, which is worth a sentence rather
than a shrug: `UniverseTable.module.css` is the first component stylesheet in this product
with any real size, and every table after it inherits that shape. Re-take both from a clean
build, and re-run the bundle-purity grep — `AllPermutations`, `UniverseTable`,
`stories.module` and the story fixtures all returned **zero** when Task 2.4.4 took it.

### The deployed verification has more to check than a count and eleven sectors

This file's third bullet reads the deployed page's numbers back against the database: the
count, the eleven sectors, and three spot-checked securities. Task 2.4.4 gave the page three
more things that are worth reading back deployed, because each is derived rather than
transported and each could be right locally and wrong live:

- **The summary line's three figures** — securities tracked, sectors and ETFs — are all
  derived from the array in the browser. The middle one is counted off the **rendered
  groups**, so it is a statement about what is on that screen rather than about `SECTORS`.
- **Each band's benchmark ETF**, which comes from `SECTOR_ETFS` in `packages/shared` rather
  than from the response. So the eleven `Benchmark XL*` labels are the first thing on a
  deployed page whose correctness depends on the **shared package having been rebuilt**,
  which is a class of staleness this project has met before.
- **The group ordering**, which follows `SECTORS` rather than the row order or the counts. A
  deployed page whose bands are alphabetical would mean the wrong build shipped.

The untracked verification in this file's own bullet gains something from Task 2.4.4 too: the
row now renders with a `No longer tracked` chip and receding ink **in its original sector
group**, so the deployed check is that it is marked and in place, not merely present. And the
summary line splits into `100 securities tracked · … · 1 no longer tracked` for that window,
which is the wording being right for a non-trivial reason exactly as this file predicts.

### The `CLAUDE.md` list is down to two items, and `VISUAL-LANGUAGE.md` joined it

The amendment above lists four things in `CLAUDE.md` describing a tree that no longer exists.
Task 2.4.4 closed two of them in the same commit as the change they describe, which is this
repository's convention:

- ~~the **tree block**~~ — `components/UniverseTable/` and the two `tokens.css` additions are
  in, and the three `pnpm test` counts are corrected to **344** (68 + 146 + 130)
- **the routes paragraph**, which still calls `/securities` a placeholder — **outstanding**
- **the frontend summary paragraph** — **outstanding**, and note the `fetch`-in-one-file
  claim in it was re-verified by grep and is still true
- **`README.md`'s list of things a correct first run shows that read as faults** —
  **outstanding**, and unchanged in shape: the Security Explorer placeholder item is the one
  that stopped being true, and Task 2.4.4 added nothing new to that list
- `apps/frontend/src/use-securities.ts` is **still missing** from the tree block, which Task
  2.4.3 owed and neither task added

**One item is new and it is a documentation obligation Task 2.4.4 created and discharged**,
recorded here so this task does not re-open it: `tokens.css`'s own header says "every value
here comes from `VISUAL-LANGUAGE.md` … **a divergence from it is a change to that document**
rather than a local adjustment here", and Task 2.4.4 added a second font family and the first
motion tokens. Both are changes to the design language rather than to a page, so
`VISUAL-LANGUAGE.md` gained a **Motion** section and a note under its typography decision, in
the same commit. Nothing is left for this task there — the entry exists so that a sweep does
not find the tokens and conclude the document was never updated.

---

## Amended 2026-09-06, after Task 2.4.5

Six things. **No task was added, deleted or re-ordered** — this is still the only one left
and it still owns the right work — and the `first selectFrom` sweep is untouched at
**twelve files**, because Task 2.4.5 shipped no backend source and did not edit any of them.
Two of the amendments below are corrections to what this file tells you to expect.

### The `specs-deployed/` bullet needs re-taking, and Task 2.4.5's decline does NOT bind it

That bullet says to "expect the answer to be **yes** for the first time in this project".
Task 2.4.5 wrote `Nothing was added to specs-deployed/, and that is a decision` — **read
that as scoped to Task 2.4.5 and not as this decision having been taken.** It was declining
to add one while wiring up the local suite; the deployed question is this task's and the
file that recorded it says so.

What genuinely changed is the **evidence**, and it points both ways.

**Weaker than this bullet assumes.** The failure it names — a wrong `VITE_API_BASE_URL`
gives a page that loads and shows nothing — is already caught deployed, at the cause, by
`specs-deployed/two-halves.spec.ts`, which asserts **which origin the page's own request
went to** and needs no response at all. A second deployed page asserting the same one value
adds a request to production and no signal. Weigh that honestly rather than adding a spec
because the bullet expected one.

**Stronger in a place this file did not name, and it is specific to this route.**
`/securities` is both an application route **and** an API path, which nothing else in this
product is. Task 1.12.7 measured that Azure Static Web Apps' `navigationFallback` is a
URL-pattern rule, so the deployed frontend answers `/health` with **200 `index.html` at both
`Accept` values**. It will answer `/securities` the same way. So a `VITE_API_BASE_URL`
pointing at the frontend's own origin produces, on this page, a **200 that is not this
service** — the `answered-badly` state — where the same misconfiguration produces
`unreachable` on the health indicator. That is a deployed-only rendering this product has
never seen, it is reachable without breaking anything, and it is a much better argument for
a deployed spec than the one the bullet makes.

Task 2.4.5 also learned two things that shape whatever is written: a `**` glob over
`/securities` matches the **page**, so use `support/deployed.ts`'s addresses rather than a
pattern; and `reportAxe` now settles animations, so a deployed axe reading of this page is
comparable to the pre-merge gate's rather than measuring the entrance fade.

### The artefact baseline moved again, and this is the figure to compare against

The table in the amendment above is Task 2.4.4's and is already stale. Task 2.4.5 shipped
the announcement, two visually-hidden spans and a `.visuallyHidden` rule:

|                 | Task 2.3.8      | after 2.4.4     | **after 2.4.5**             |
| --------------- | --------------- | --------------- | --------------------------- |
| JavaScript      | 348,250 B       | 356,324 B       | **357,210 B** (`b563a3d5…`) |
| CSS             | 12,128 B        | 17,905 B        | **18,058 B** (`ead7d5c1…`)  |
| `index.html`    | 1,101 B         | 1,101 B         | 1,101 B (`5bdab864…`)       |
| config          | 300 B           | 300 B           | 300 B                       |
| total / modules | 361,779 B / 279 | 375,630 B / 284 | **376,669 B / 284**         |

Module count unchanged at 284, which is the check that nothing new crossed the
`packages/shared` boundary. The instruction to re-take from a clean build and re-run the
bundle-purity grep stands unchanged.

### `pnpm test` is 347, not 344

Task 2.4.4's amendment records the three counts corrected to 344 (68 + 146 + 130). Task
2.4.5 added three frontend tests about the live region, so it is **347 (68 + 146 + 133)**,
and `CLAUDE.md`'s two live sites were updated in the same commit. `pnpm test:database` is
unchanged at 61. The **browser** suite is **21 tests across five spec files**, which is the
number `e2e/README.md` now carries.

### Two of this task's documentation items are already done, and one is new

The `CLAUDE.md` list in the amendment above is down to **three** items, all still
outstanding and none of them touched by Task 2.4.5:

- **the routes paragraph**, which still calls `/securities` a placeholder — outstanding
- **the frontend summary paragraph**, which says the application "has no state management"
  — outstanding, and the `fetch`-in-one-file claim in it is still true
- **`apps/frontend/src/use-securities.ts`** is still missing from the tree block —
  outstanding, owed since Task 2.4.3

**`README.md`'s list of things a correct first run shows that read as faults was amended by
Task 2.4.5 and is not this task's to re-open** — but only for the item Task 2.4.5 made
false, and the reason is worth reading because it is the nicer kind of documentation change:
that list's `pnpm ready` bullet **named its own expiry condition**, that condition arrived,
and the item has left the list. It is the second thing ever to do so. The list's other
outstanding item — the Security Explorer placeholder — is untouched and **is still this
task's**.

One paragraph near it was re-checked rather than assumed and **survived**: "the last two
steps have no symptom if you skip them" is still true of `pnpm ready`, `pnpm verify` and
`pnpm dev`, because the readiness check speaks the Postgres protocol without a driver and
so cannot see a schema or a row count. It gained an exception clause for `pnpm e2e`, which
now goes red against an empty database — bluntly, as red journeys naming a missing table
rather than as one refusal naming the cause. That gap is recorded rather than closed.

### The `e2e` job's shape and cost both changed, so do not cite Story 1.13's CI figures

If this task re-takes any CI figure, the baselines moved and the job gained steps.
`verify.yml`'s `e2e` job now runs a **Postgres service** plus `pnpm migrate` and
`pnpm universe` between `Build` and `Start the pair`, because Task 2.4.5 fired the trigger
`check-ready.mjs` had been carrying since Task 2.1.2. Measured on the runner: `pnpm migrate`
**723 ms**, `pnpm universe` **692 ms**, `pnpm e2e` **70.6 s** for 21 tests, and the whole job
**2 m 16 s** against Task 1.13.4's 99–103 s. The suite itself did not get slower — nearly all
of the extra ~35 s is the container booting.

Nothing about the **deployed** check changed: `pnpm e2e:deployed` gates on
`scripts/check-deployed.mjs` rather than `check-ready.mjs`, so it neither needs a database
nor gained one.

### One line for the hand-forward, because Story 2.10 inherits it

The hand-forwards this task writes should carry one sentence Task 2.4.5 produced and no
other story yet knows: **how a page announces that its content changed is decided**, in
`UniverseTable`'s `Announcement`, and it is a persistent `role="status"` present in every
state and never unmounted, announcing nothing on arrival. That is not this page's decision —
it is the pattern for every asynchronously-filled surface after it, which is Stories 2.11
to 2.14 and every epic from 3 onward. Story 2.10 is where it belongs, because that story
owns the frontend data layer's shape and this is a property of every consumer of it.
