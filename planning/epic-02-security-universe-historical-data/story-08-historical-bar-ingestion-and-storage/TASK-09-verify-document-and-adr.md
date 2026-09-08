# Task 2.8.9 — Verify, document, and ADR 0020

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.8

## Objective

Close the story the way the previous seven closes did: **re-run every acceptance criterion
against what shipped and re-take every figure rather than citing one**, write the ADR, and run
the sweeps.

**This close is unlike every previous one in one respect and it should say so at the top:
half of its criteria cannot be re-taken from a clean clone.** A clean clone has no bars. Criteria
1, 2, 3, 6 and 7 are properties of a populated database, and re-running the backfill to prove
them would take hours and spend a metered budget for a result Task 2.8.7 already recorded. So
this task's method splits: **the code half is re-taken from a clone; the data half is re-read
from the deployed store.** State which is which, per criterion, so a later reader can tell a
measurement from a citation.

## What the user can see when this lands

**Nothing new.** Task 2.8.8's coverage column is the story's visible surface and it is already
deployed.

What this task produces is the record: `docs/adr/0020-*`, an amended `BARS.md`, and the sweeps.

## The ADR

**Numbered 0020** — and `ls docs/adr/` is the count, because the file number is not the ordinal
and this file has been wrong about that three times.

Subject, in the shape the previous seven use: _how market history is stored, and what a full
backfill certifies_. The decisions it records:

- **Why the store is a record and not a cache**, which is open decision 1 and was settled by the
  user's own question — _"why do we have a database if we are pulling all our information from
  another remote source?"_ The reframing that did the work belongs in the ADR verbatim: **§30
  lists ten tables and only `market_bars` comes from Alpaca.** One more comes from the SEC; the
  other eight have no external source at all. So the database exists regardless, and the
  question was only ever whether that one table joins it.
- **Why bars are stored unadjusted**, and why the "adjusted on read" half of that decision was
  **not achievable as written** — adjustment needs corporate-action data nothing in the plan
  acquires, so the vendor performs it and an adjusted series is _requested_ rather than computed.
  `PROVIDER.md` §3.6 names the gap this leaves: a split inside the stored window charts with a
  real step in it, beside a label reading `raw`.
- **Why nothing is deleted**, and why disk pressure rather than age is the trigger.
- **Why "we do not have that" is an answer rather than a bug**, which is what criterion 4 is
  really asserting.
- **Why the backfill asks per session**, which is a 2.35× storage decision wearing the clothes of
  a request detail.
- **Why pacing lives in the backfill and retry lives in a wrapper**, with the 320-burst table
  under it — retry helps one caller and does not help a crowd.
- **Why the resume point is `covered.end`**, which is a vendor entitlement made structural.
- **TimescaleDB, decided against a measurement** rather than in advance.
- **What a completed backfill certifies and what it cannot**, in the two-list shape ADR 0010 and
  ADR 0013 use. The second list is the important one and should carry at least: it certifies
  nothing about a **correction**, because V1 overwrites a corrected bar and `recorded_at` moves,
  so **Epic 13 replays a bar as currently known rather than as known at the time**; it certifies
  nothing about **extended-hours completeness**, because the window is deliberately the regular
  session; it certifies nothing about a security's history **before its listing**; and it
  certifies nothing about the **feed**, because everything stored is SIP and Epic 3's live bars
  are IEX, so the two halves of `market_bars` will not be from the same tape.

**And the honest gap this story creates that no previous one has:** the temporal seam is now
load-bearing on data. `market-bars.ts` reads `observed_at` on every query and Epic 13's plugin —
the thing that makes invariant 4 structural rather than intentional — is **still unwritten**.
ADR 0015's gap 4 has been carried for three stories against a module nobody had written and then
against one whose table has no `observed_at`; it is now a gap against ten million rows of
timestamped data. Restate it at its new weight.

## The sweeps, which have found something every time

Run all of them, and read the counts rather than citing them.

- **The ten convention blocks and the test count.** Stale by two story closes twice and by
  **five task increments** once. Amend all ten together and verify they land on one md5; leave
  Stories 1.2 and 1.3's two historical variants at 103, and check Epic 1's `EPIC.md`, which
  carries a **fourth** copy inside a trailing clause that an earlier sweep edited around.
- **`README.md`**, which has been stale at six sites twice running, and whose script table has
  disagreed with its own prose ninety lines apart.
- **`pnpm links`**, which is a `verify` step now — so it is green by construction and the thing
  to check is the **counts**, plus the double-hyphen trap that has reproduced seven times and is
  why the slugger is written the long way.
- **The vendor grep**, whose **meaning** changed rather than its command: the code-only count
  over `packages/shared/src` is **2**, both `PROVIDER_IDS` gaining `"alpaca"` and the test that
  locks the vocabulary. The check is now _every hit is a member of `PROVIDER_IDS` or that test_,
  not _this must be zero_.
- **The install-script sweep**, run against the clone's own store. It has returned
  `esbuild@0.28.2` and nothing else since Task 1.4.5, and Task 2.2.1 measured why that is a
  property of what is installed rather than of the policy — `allowBuilds` names a **package**,
  not a version.
- **Live claims whose conditions have already fired**, which is the class the last two closes
  were best at finding. Specific candidates here: anything still saying the universe sizing is
  parked; anything saying `market_bars` does not exist; `schema.ts` and
  `migrations/README.md`'s statements about which conventions are untested, three of which this
  story made testable; `database.ts`'s narrowed _"the only place this application knows there is
  a database driver"_, which gains a fourth exception; and Task 2.1.7's note that the deployed
  backend holds **zero** connections at rest, which a backfill does not change but which anyone
  reading a `pg_stat_activity` snapshot during one will think it does.

## The figures to re-take

From a clean clone: install counts, store entries, lockfile lines, `pnpm verify` cold and warm
with its per-step split **with and without a database**, `pnpm test`, `test:process`,
`test:database`, `pnpm e2e`, `pnpm e2e:deployed`, Storybook's file count, and the frontend
artefact's four files with their hashes.

**The artefact is the one that needs a mechanism rather than a number.** It moved 115 bytes on a
story that shipped no `apps/frontend` file, because `packages/shared` is inlined and
`SECTOR_ETFS` is built by **calling** `toTicker()` eleven times — a call expression is not
provably side-effect-free, so the bundler keeps the calls and drops the object. Task 2.8.8 ships
real frontend source and Task 2.8.2 may have changed a shared vocabulary, so **rebuild the
previous close's commit** rather than comparing against a recorded figure: a figure that has
moved looks exactly like a figure that was mis-recorded, and only a rebuild tells them apart.

From the deployed store: row counts per timeframe, table and index sizes, the ledger's own
statement, the headroom against **22.5 GiB usable**, and the `psql-storage-80pct` alert re-read.

**And the leak check on all five producers**, which now has a sixth thing to look for: a
backfill's own output and its log records carry symbols and prices and must carry no credential.
Log Analytics zero for `eyJ`, `APCA-`, `Bearer`, the key id and the secret, over a
**non-vacuous** window — a sweep that finds nothing and cannot be shown capable of finding
something is indistinguishable from a broken sweep.

## The cost question, which is now answerable in a way it has not been

Three closes have recorded it as refused in three different shapes — `az consumption usage list`
returning `[]`, then two records with every cost field the string `'None'`, and the Cost
Management query API answering `429` four times over forty minutes. **This is the first story
whose work moves a bill in a way an estimate can be checked against**: ten million rows is real
storage on a metered disk, and the estimate is re-derivable from the Retail Prices API
regardless of whether the billing API answers.

So: re-derive the estimate to the cent as the last four closes have, add the database's storage
line at the **measured** size rather than the estimated one, and re-read the **$20 budget**,
which still sits just above the $19.04 active-rate total and would therefore not fire on the
change that matters most.

## Work

- `docs/adr/0020-*`
- Every acceptance criterion re-run, each labelled as re-taken-from-a-clone or
  re-read-from-deployed
- All six sweeps
- `BARS.md`, `UNIVERSE.md`, `DATA-LAYER.md`, `PROVIDER.md`, `migrations/README.md`, `README.md`
  and `CLAUDE.md` amended where a claim stopped being true — **dated amendments beside
  statements, never rewrites of decisions**, and never a strike-through where a scoping clause
  is the honest edit
- The clean-clone run, which is the twelfth
- `EPIC.md` updated: this story closed, and what Stories 2.9 to 2.14 inherit

## Done when

- Every criterion has a measurement or a stated reason it was read rather than re-taken
- Every sweep has been run and its finding recorded — including "clean", which has happened once
  in five and is worth saying
- The ADR's second list is at least as long as its first
- `pnpm verify` is exit 0 with a database and with none

## Notes

The specific risk in closing this story is that its most important properties are **invisible in
a clean clone**. Nine tasks of ingestion produce one column on one page, and everything else is
a claim about ten million rows sitting in a managed database in North Central US. A close that
re-runs `pnpm verify` and calls it done would be honestly reporting the wrong thing.

The instrument that stands in for a re-run is Task 2.8.6's report, and this task should run it
and quote it — because it is the only thing in the repository that can say, from outside the
database, that the store is what the story says it is.
