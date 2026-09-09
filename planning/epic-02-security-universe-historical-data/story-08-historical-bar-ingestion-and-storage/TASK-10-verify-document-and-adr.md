# Task 2.8.10 — Verify, document, and ADR 0020

**Status:** Complete (2026-09-09)
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.9

## Objective

Close the story the way the previous seven closes did: **re-run every acceptance criterion
against what shipped and re-take every figure rather than citing one**, write the ADR, and run
the sweeps.

**This close is unlike every previous one in one respect and it should say so at the top:
half of its criteria cannot be re-taken from a clean clone.** A clean clone has no bars. Criteria
1, 2, 3, 6 and 7 are properties of a populated database, and re-running the backfill to prove
them would take hours and spend a metered budget for a result Task 2.8.8 already recorded. So
this task's method splits: **the code half is re-taken from a clone; the data half is re-read
from the deployed store.** State which is which, per criterion, so a later reader can tell a
measurement from a citation.

## What the user can see when this lands

**Nothing new.** Task 2.8.9's coverage column is the story's visible surface and it is already
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
  parked; anything saying `market_bars` does not exist; **anything still calling the money rule,
  the foreign-key naming rule or the `numeric` tripwire untested — all three closed at Task
  2.8.3, and `migrations/README.md`'s two lists and `0003`'s own closing comment are where the
  stale wording will be**; `schema.ts` and
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
provably side-effect-free, so the bundler keeps the calls and drops the object. Task 2.8.9 ships
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

The instrument that stands in for a re-run is Task 2.8.7's report, and this task should run it
and quote it — because it is the only thing in the repository that can say, from outside the
database, that the store is what the story says it is.

---

## Amended 2026-09-08 by Task 2.8.6 — what the backfill adds to the ADR, the sweeps and the gap lists

### The ADR gains two decisions and one correction

The list above already names _"why the backfill asks per session"_ and _"why pacing lives in the
backfill and retry lives in a wrapper"_. Two more belong beside them, and one entry is now
falsified by measurement:

- **Why the walk is backwards from the present, and why it is monotonic.** The monotonicity is
  not a convention this command honours — Task 2.8.4's ledger **refuses** a write that would
  leave a trading session in the gap, so the direction is a decision and honouring it is not
  optional. The consequence worth recording is what that buys the rest of the system: **every
  session inside the ledger's covered range was attempted**, which is what makes Task 2.8.7's
  completeness computation a set difference against one interval rather than a per-session join.
- **Why the backfill is sequential**, which is the concurrency decision. Two arguments, and the
  second one only exists now: the ledger structurally refuses concurrency across sessions
  (eight in flight is eight sessions in flight, completing out of order), and a sequential year
  measures **~72 minutes** against a ~26-minute rate-limit floor — so the gap that made
  concurrency look worth building is 46 minutes rather than the three hours the plan predicted.
- **The correction:** `BARS.md` and Tasks 2.8.6 and 2.8.8 all predicted **~3.6 hours** for a
  sequential year at 518 securities. Measured, it is **~72 minutes**. All three are amended;
  the ADR should carry the measurement rather than the prediction, and the previous close's
  habit applies — the estimate stays visible beside it, because the gap between a prediction
  and a reading is the record.

### The second list gains two entries, and both are about what a green run does not see

The body says the second list is the important one and should be at least as long as the first.
Two candidates from this task:

- **It certifies nothing about the pages inside a walk.** `BACKFILL_PACE_MS` paces **provider
  calls**, and `fetchManyBars` pages internally with no pacing between pages. Measured at ~1.3
  pages a second against a 3.23/s refill, so it does not breach the limiter today — and nothing
  checks that it stays true. The reversal trigger is a `rate-limited` outcome on a run this
  pacer was supposed to keep under the limit, at which point the pace belongs **inside the
  provider** and `PROVIDER.md` §8.8 has to be revisited rather than worked around.
- **A green database suite certifies nothing about the window shape.** This is the finding worth
  putting in the ADR rather than only in the task file: `backfill.database.test.ts`'s assertion
  that no stored bar falls outside the sessions walked **cannot fail**, because
  `fixture-corpus.ts` is synthetic and has no extended-hours prints to leak — widening the
  window to three sessions leaves it green, measured. It ships with a non-vacuity guard and a
  comment saying so. That is Task 1.13.6's blind-renderer problem in a new place and it belongs
  in the same list as the axe gate's.

### The gap lists gain one of the third kind

**`BACKFILL_PACE_MS` paces walks rather than pages** — see above. It is reachable from code but
not from a test, because what it bounds is a rate against a third party's limiter; it is prose
with a measured trigger, which is the honest category for it.

And one that is **not** a new gap and will look like one: the backfill's `--symbols`-less
default filters on `status = 'active'`. That is `UNIVERSE.md` §12.2's write-path side of the
invisible predicate, already documented there, and the asymmetry to re-check in the sweep is
that **Story 2.9's read path and Epic 13's replay still do not filter**.

### The sweeps gain three specific candidates

- **The command table and the test counts.** `pnpm backfill` is the twelfth root script and the
  fourth that touches a database; `README.md` gained a section for it and its counts were
  refreshed to **816 fast tests** (206 + 427 + 183) and **128 database tests**. Both go stale on
  the next task, and `CLAUDE.md`'s ten convention blocks were **not** touched by Task 2.8.6 —
  so they are stale by at least this increment before this close begins.
- **`windowFor` moved.** It lives in `apps/backend/src/bar-window.ts` now rather than inside
  `fetch-bars.ts`, with two callers. Any claim that `pnpm bars` owns the window shape, or that
  the two commands each compute their own, is stale.
- **Claims about what the store contains.** `fetch-bars.ts`'s header says _"Story 2.8 owns
  storage"_ and `README.md`'s `pnpm bars` section says _"It stores nothing — Story 2.8 is what
  puts bars in the database"_. Both are still true and both are the shape that rots: check them
  rather than assuming, because the sibling command now does put bars in the database.

### One figure this close should re-derive rather than cite

The row size. **197 bytes a row including indexes**, measured locally over 768,123 rows against
the story's assumed ~120 B heap — which puts the headroom at **~2.4 years** rather than ~3.8.
Task 2.8.8 owns taking it deployed, and this close owns checking that every document quoting a
headroom figure quotes the same one. There are currently at least three: `BARS.md` §4,
`UNIVERSE.md` §10 and this story's own scope bullet.

---

## Amended 2026-09-08 by Task 2.8.7 — what the attempt log adds to the ADR, and four sweep candidates that are already stale

### The ADR gains three decisions, and one of them is the story's own criterion 4

The list above names _"why 'we do not have that' is an answer rather than a bug, which is what
criterion 4 is really asserting"_. That is right and it is the **conclusion**; the ADR needs the
mechanism under it, because the mechanism is three separate decisions:

- **Why the attempt log records SUCCESSFUL EMPTY ANSWERS as well as failures**, which is the
  correction to this story's own cheaper answer. A session the vendor answers successfully with
  no bars writes no bars **and** extends no ledger — `BarSeries` gives an empty series no
  `covered` window — so it is recorded in **neither** table. In the middle of a walk it is
  absorbed because the range is a union; at the **frontier** it reads as _never asked_ about a
  day we asked about. The row set is therefore _every attempt that left no bars_, and `ok` is a
  member of the vocabulary meaning **answered and empty**.
- **Why completeness and density are two columns with two names.** This is the decision most
  likely to be undone by somebody tidying, and it has a measurement under it: only **8 of 28**
  large constituents traded in all 390 minutes of an ordinary session, at a universe-wide mean of
  **364.3**. A report that treats _calendar minus arrived_ as a gap announces that the store is
  permanently ~7% broken every day forever — which is the half-day failure arriving on the other
  240 days of the year, and the reliable outcome is that people stop reading the report.
- **Why the delisting signal is REPORTED and never WRITTEN.** `UNIVERSE.md` §15.3 **produced**
  the overwrite — a `status` written by anything other than the loader is silently reverted by
  the next deploy's `pnpm universe`, reported as an ordinary `1 updated` — so adopting `delisted`
  is two decisions rather than one. Task 2.1.7's shape: the instrument says _whether_ and a
  person decides _what to do_.

And **one decision that was handed here and is now taken**, which belongs in the ADR as a
decision rather than as a deferral: **neither the backfill nor the catch-up runs automatically in
V1.** Task 2.8.1 settled the initial backfill's home and deliberately deferred the catch-up's;
Task 2.8.6 then found the catch-up already existed as `planRequests`' forward walk, so what was
left was only where it runs. A person runs it before a demonstration, and `pnpm bars:check` is
how they find out whether they needed to. **Say the cost in those words**: an unscheduled
catch-up is what makes the store quietly stale, and `bar_coverage.updated_at` — _when what we
hold last changed_ rather than _when the backfill last ran_ — is the only field that can report
it honestly.

### The second list gains two entries, and the first is the strongest one in the story

- **The delisting signal is BLIND without a daily backfill, and it says so.** It reads daily bars
  because the same `max(observed_at) group by security_id` over minute bars is a full parallel
  sequential scan — **192 ms over 863k rows**, ~11 s extrapolated to a year of the universe. A
  store with minute bars and no daily backfill has no daily row for **anything**, so _no daily
  bar_ means _we never asked_ rather than _it has stopped printing_ — and on its first live run
  it reported **AMD and MSFT as delisted** while they held 3,900 and 3,120 minute bars.
  `lastBarAt` is three-valued as a result (`Date` / `null` / **absent**) and the report prints
  its own blind spot. That is Task 1.13.6's blind-renderer problem in a **third** place, after
  the axe gate and `backfill.database.test.ts`'s window assertion, and the three belong in one
  paragraph rather than three: **a check that cannot see something must say so.**
- **A green `pnpm bars:check` certifies nothing about the attempt log's own upkeep.** The log is
  **advisory rather than authoritative** by design — completeness is computed from
  `bar_coverage`'s range and never from the log — so a stale row surviving a failed
  `clearAttempts` degrades the report's _explanation_ and not its _arithmetic_. That is the safe
  direction and it is a limit rather than a defect, which is why it belongs in the second list
  rather than in a gap list.

### Four sweep candidates whose conditions have ALREADY fired

This is the class the last three closes were best at finding, and 2.8.7 discharged four claims at
once:

- **`delisted` ownership.** Task 2.7.8 declined the member and _"moved the ownership here"_;
  Story 2.3's close, `UNIVERSE.md` §15, `STORY.md`'s own _"This story is the named owner of a
  future `delisted`"_ section and `packages/shared/src/security.ts`'s `SECURITY_STATUSES` comment
  all name Story 2.8 as the owner **in the future tense**. It is answered: reported, not written.
  Sweep for the phrasing, not for the word.
- **"Two tables."** Task 2.8.4's amendments and several file headers say the backfill writes
  `market_bars` and `bar_coverage`. It writes **three** now. Specific sites: this file's own
  criterion-2 section (amended), `0005_bar_coverage.sql`'s _"two tables, two jobs"_ framing, and
  anything in `BARS.md` enumerating what a backfill touches.
- **The catch-up's home, described as open.** `BARS.md` §3, Task 2.8.1 and `STORY.md`'s open
  decision 4 all say the incremental catch-up's home _"is decided separately when it exists"_. It
  exists and it is decided; `BARS.md` §7.6 is the record.
- **The counts, which moved twice in one story.** `pnpm test` is **861** (206 + 472 + 183),
  `test:database` **141 across 6 files**, `test:process` 14 — against the **816 / 128** Task
  2.8.6's amendment recorded and correctly predicted would go stale. `CLAUDE.md`'s ten convention
  blocks are stale by **at least two** task increments before this close begins, and were last
  amended at Task 2.7.9 to 750.

### One figure to re-take rather than cite, and one artefact to quote

**`pnpm bars:check`'s own output is a figure this close should include**, because the Notes
already name it as _"the only thing in the repository that can say, from outside the database,
that the store is what the story says it is"_. Two conditions on quoting it:

- **Run the daily backfill first**, or the quoted output carries a `BLIND for N of these series`
  line and answers nothing about delistings. See Task 2.8.8's amendment §2 — daily is ~13
  requests and a couple of minutes.
- **Quote the default-window form only after a completed run.** Mid-backfill the default window
  is the ledger's union span, so a partially-filled store reads as _N series behind_, which is
  correct and is not what this close wants to publish.

### Not a new gap of the third kind, and worth saying so

The obvious candidate is the `BAR_ATTEMPT_OUTCOMES` array against
`bar_attempts_outcome_check` — and it is **closed** rather than open:
`bar-attempts.database.test.ts` parses the constraint **Postgres rewrote** and compares it
against the shipped array, which is the arrangement `SECURITY_KINDS` and `TIMEFRAMES` already
have. `attemptOutcomeFor`'s exhaustive `switch` closes the other half, so a ninth `BarsResult`
member cannot be added without being spelled here.

What the gap lists **do** gain is the first-kind entry every migration adds:
`0006_bar_attempts.sql` is a sixth `.sql` file that Prettier reports as
`"inferredParser": null` and ESLint reports as `File ignored`. That count grows by one per
migration for the rest of the project, which is the thing to notice rather than the number.

---

## Amended 2026-09-08 by Task 2.8.8 — one decision the ADR does not yet carry, and four claims already stale

### The ADR gains a decision that no previous task could have taken: the unread index

`0004_market_bars.sql` argues carefully about the indexes it **does not** create, and measures
none of the ones it does. Taken over the local full-depth store:

| Index                                                              |       Size | Scans          | Tuples read |
| ------------------------------------------------------------------ | ---------: | -------------- | ----------: |
| `market_bars_unique_bar` — `(security_id, timeframe, observed_at)` |     925 MB | **15,327,127** |      76,422 |
| `market_bars_pkey` — the surrogate `id`                            | **326 MB** | **0**          |       **0** |

Indexes are **78.9% of the heap**, and **326 MB of that serves nothing at all** — zero scans
across the backfill, the daily run and every query since the table was created. At a full year
that is **~1.0 GB of index nothing reads**, roughly **11% of the year's storage** on a disk with
~22.5 GiB usable, plus write amplification on every one of ~47M inserts.

**This is a convention with a price rather than a defect, and the ADR should say so in those
words.** `migrations/README.md` §3 requires `id bigint generated always as identity primary key`
on every table with the natural key as a `unique` constraint beside it;
`market-bars.database.test.ts` **asserts** it, because Task 2.2.5 deliberately made it a checked
convention. `0004`'s own comment gives the argument: a three-column natural primary key would
propagate three columns into every future foreign key referencing a bar.

That argument was made against no measurement and now there is one. **The decision is to keep it
and record the price**, on this repository's standing rule that an index question is settled
against a reader rather than in advance — and the reversal trigger is **the first thing that
references a bar by `id`**, or disk pressure arriving before it does. Whoever takes the reversal
should know it is a migration on a populated table plus an edit to a checked convention, which
is why it is not a footnote.

### The second list gains one entry, and it is about the pacer

**A completed backfill certifies nothing about the rate limiter's behaviour under load, because
it never approaches it.** Across 247 sessions and ~5,200 vendor requests the log contains **zero**
`429`s, zero retries, zero timeouts — nothing but the banner and the tick lines. This file's own
instruction reads _"Zero `429`s means the pacer is possibly too conservative; a steady trickle
means it is calibrated"_, and the honest answer is the first with a reason attached:
`BACKFILL_PACE_MS` is 350 ms against a measured ~310 ms token, so the sustained rate sits **just
under** the refill by construction and a burst can never accumulate. The wall clock is therefore
set by the write path and the pace floor, never by the limiter — which is why the ~26-minute
rate-limit floor is a number the design guarantees will not be reached.

### Four claims whose conditions have already fired

- **`bar_attempts` is "sparse by construction ... and empty when everything is well"** — Task
  2.8.7's amendment to Task 2.8.8, §6. **False.** A security that listed inside the backfill
  window answers empty for every session before its listing, and each one writes an `ok` row that
  is never cleared. Two such securities in the current universe left **hundreds** of rows on a
  completely healthy run. The behaviour is right; the claim about the table's size is not.
- **"Daily is ~13 requests and a couple of minutes"** — Task 2.8.7's amendment §2 and Task
  2.8.6's §4. That figure is for **251** sessions; the daily bound is **2024-01-01**, which is
  **672** sessions and therefore **34 requests**. Measured: 34 fetches, 345,519 bars, **135.6 s**.
  The conclusion (run daily first, it is cheap) is unaffected and the arithmetic is not.
- **The `emptyAnswers` counter.** The summary line called its number _symbol-sessions_ while
  incrementing once per **symbol**; a daily request covers 20 sessions and `bar_attempts` wrote 20
  rows, so the two disagreed **127 against 2,537** on the first full-depth daily run. Fixed in
  `backfill.ts` with a test made to fail first. **The test counts move again**, which this file
  already predicts will happen twice more before it runs.
- **Anything describing the deployed backfill as a single run.** See below.

### One operational fact the ADR should carry, because nothing in the repository says it

**An operator-run backfill against the deployed database outlives its own credential.** An Entra
access token from `az account get-access-token` is valid ~69 minutes; a full-year run is ~90. The
pool opens connections continuously, so a single invocation cannot finish.

What makes that survivable rather than fatal is the property this story was built on: **a re-run
of a range already held fetches nothing**, so the run is re-issued with a fresh token and resumes
from the ledger at zero vendor cost. It is the resume property being _used_ rather than described,
and it is the first time anything has needed it in production.

### One figure to re-derive, and one that is now confirmed three ways

The row size stands at **196 B/row including indexes**, taken repeatedly across a run growing
from 8M to 47M rows — Task 2.8.6's 197 B over 768,123 rows reproduced at sixty times the sample.
**The headroom is ~2.4 years**, and this close owns checking that every document quoting a
headroom figure quotes that one rather than the ~3.8 or ~19–20 that preceded it.

And **`observed_at` is confirmed to be the market instant rather than the write instant, from the
data**: bars written this morning carry timestamps six months old whose UTC offset **changes
mid-series** across the 2026-03-08 DST transition — 14:30Z open before it, 13:30Z after, 390 bars
both sides, no session on the transition day itself. That is `0004`'s _"the single most damaging
line in this story"_ — a `default now()` on `observed_at` — proved absent by production data
rather than by reading the migration, and it is worth the ADR carrying because it is the
strongest available evidence that invariant 4's foundation is sound.

---

## Amended 2026-09-09 by Task 2.8.8 — what the run added, and five claims already stale

Task 2.8.8 is complete. Both stores are full and identical; the ADR gains three
decisions, the second list gains three entries, and five specific claims in this
repository have already stopped being true.

### The ADR's list is satisfied on one point and gains three

**"TimescaleDB, decided against a measurement" is DONE** and the numbers are in
[`BARS.md`](BARS.md) §8.16. Quote the reading rather than the conclusion: the
plans are **identical to local**, warm performance is 4–28 ms at 47.7M rows, and
the alarming cold figures (3.2 s and 5.4 s) are **entirely a 256 MB
`shared_buffers` against an 8.95 GB table on a 120-IOPS disk**. A hypertable
would not touch that. `PRODUCT_SPEC.md` §37's cheaper experiment — a narrower
`(observed_at, …)` index — would, and is not needed yet.

Three decisions to add:

- **Why the backfill runs from a runner rather than a laptop**, which is open
  decision 4 corrected by measurement rather than abandoned. ~250 ms per round
  trip turns 97 minutes into 33 hours; the same code inside Azure is ~35× faster.
  Say the general form, because it is the transferable part: **this repository
  had recorded the same fact twice as a curiosity before it ever decided
  anything** (the deployed browser check being faster on a runner; `pnpm universe`
  at 0.428 s against ~3 s).
- **Why the catch-up is scheduled and the backfill is not.** §8.12, and it
  reverses Task 2.8.7 deliberately. The ADR should carry the reversal rather than
  only the outcome, because part of 2.8.7's argument was a premise that stopped
  being true.
- **Why a small `--sessions N` is load-bearing for a catch-up**, which looks like
  a tuning detail and is the difference between 4 requests and 193.

### The second list gains three entries, and the first is the strongest in the story

- **A completed backfill certifies nothing about COLD query performance.** Every
  plan measured warm is single- or low-double-digit milliseconds; the same plans
  cold are two orders of magnitude worse, on the same instance, minutes apart.
  Story 2.9's response-time work will meet this and should not read §8.16's warm
  column as a promise.
- **It certifies nothing about a run that was INTERRUPTED.** §8.15: a session is
  not atomic across the universe, so a cancelled run leaves it written for some
  securities and not others — 468 and 50, measured — and the next run is then
  refused for exactly those 50 by the ledger's contiguity check. Everything
  behaved; the point is that "the backfill completed" and "the store is coherent"
  are different claims and only the ledger can make the second.
- **A green job certifies nothing about a job longer than an hour.** §8.17:
  `azure/login`'s OIDC assertion is valid five minutes and the CLI token about an
  hour, so a later step in a 103-minute job failed on `AADSTS700024` **after** the
  backfill had stored all 859,476 rows and exited 0.

### Five claims whose conditions have already fired

- **"Neither the backfill nor the catch-up runs automatically in V1"** — reversed.
  It stands in `STORY.md`, `TASK-07`, `TASK-09`, this file and Task 2.8.8's own
  stakeholder summary. All five are amended; sweep for the phrasing rather than
  the word, and **leave 2.8.7's own decision record standing** with its pointer.
- **`cpu_credits_remaining` "sits at the 30 cap"** (Task 2.1.5) — it reads **286**
  after hours of sustained write. Either the cap was misread or the accrual model
  differs; 30 is not the ceiling.
- **"Whether an open connection outlives its own token was NOT verified, because
  the case is structurally unreachable"** (Task 2.1.6) — reachable on every
  backfill over an hour, and **it does**: the pool's connection is never idle for
  `POOL_IDLE_TIMEOUT_MS` under continuous writing, so it is never re-established,
  and Postgres does not re-check credentials on a live connection.
- **"`bar_attempts` is sparse by construction and empty when everything is well"**
  (Task 2.8.7) — **2,953 rows on a completely healthy store**, because a security
  that listed inside the window answers empty for every earlier session.
- **The test counts** — `pnpm test` is **862** (206 + 473 + 183) after Task
  2.8.8's `emptyAnswers` fix. `CLAUDE.md`'s ten convention blocks were last
  amended at Task 2.7.9 to **750** and are stale by two stories.

### The gap lists gain one of the fifth kind, and the action count moves

`.github/workflows/backfill.yml` is a **fourth** workflow whose formatting
Prettier checks and whose **schema nothing validates** — the fifth gap category,
now six files. It reuses `actions/checkout`, `actions/setup-node`,
`actions/cache/restore` and `azure/login`, so it adds **no new distinct action**;
what it moves is the **use** count, and `azure/login` appears **twice in one
job**, which is itself the §8.17 finding made permanent. Re-count out of the
files rather than citing.

### One figure to re-derive rather than cite, and one to stop citing

**Storage is 42.89% of the disk with both timeframes at full depth**, so §8.4's
~2.4-year horizon is confirmed from the other direction, and
`backup_storage_used` is **874 MB against 32 GB included** — the backfill's
marginal cost is £0.

**And stop citing "roughly ten million rows."** It appears in `STORY.md`, this
file and Task 2.8.9, and it predates Task 2.8.2 taking the universe from 101 to 518. The store is **48.03M rows**.

---

## Amended 2026-09-09 by Task 2.8.9 — one criterion is unmet and is handed here, and four sweep candidates are named

### 1. "already deployed" is false, and the thing it describes is this task's to do

The body says, under _What the user can see_:

> Task 2.8.9's coverage column is the story's visible surface and it is **already
> deployed**.

It is not. `deploy.yml` only runs on `main`, so the column ships on the merge
that closes 2.8.9 and **its deployed verification has never run** — that task's
own _Done when_ criterion 1, _"the deployed `/securities` says how much history
each security has, and the figures reconcile against the deployed database read
directly"_, is explicitly handed forward. It is the same gap Tasks 2.2.7, 2.3.7
and 2.6.7 each handed to their story's close, and it is not worth a task of its
own: it is one page read and one query, which is what this close does for every
other criterion.

**The prediction is exact rather than approximate, which is what makes it worth
checking.** §8.16 measured the deployed store as matching the local one _to the
digit_ — 47,682,213 minute bars across 518 securities, 515 at the full year plus
`Q`, `FDXF` and `HONA` — so the deployed summary line should read, character for
character, what the local one reads:

> **518** securities tracked · **11** sectors · **15** ETFs · all with history ·
> **47.7M** minute bars · through **2026-09-04**

and `AAPL`'s row should read `1y from 2025-09-08`. Anything else is a real
finding rather than a rounding difference. Read it in a browser, then reconcile
against `select count(*), sum(bar_count), min(covered_start), max(covered_end)
from bar_coverage where timeframe = '1m'` on the deployed server — Task 2.4.6's
method, which is the only one that can tell a page rendering the deployed store
from a page rendering a plausible one.

The second half of that read is the `check-deployed` job, which gains two
assertions in 2.8.9 and has likewise never executed: the fifth column header,
and a row-shape assertion riding the existing page load. **Both are on the
critical path of the merge rather than of this task** — quote the run.

### 2. The ADR gains one decision and one second-list entry

- **Why there is no coverage bar**, which the body predicted was "probably
  wrong" and which is now settled by a measurement: **515 of 518 securities
  start on the same day**, so a bar chart draws 515 identical full bars to
  communicate three exceptions and reads as a progress indicator for something
  that is not in progress. The design target is the exception, and the mechanism
  that makes it legible is **alignment** — right-aligned fixed-width dates — not
  ink, not a chip and not a second vocabulary. That is Task 1.4.3's
  `tabular-nums` measurement finally being spent on the thing it was bought for.
- **Second list: what the coverage column certifies and what it cannot.** It
  reports the _ledger's_ statement, so it certifies that we asked for a window
  and were answered — and **nothing about density**, because a bar count below
  `minuteBars` inside that window is liquidity rather than ingestion (364.3
  against 390); **nothing about why** a history is short, because the ledger
  cannot separate a spin-off from a blocked symbol and the page deliberately
  does not join `bar_attempts` to try; and **nothing about freshness**, because
  `updatedAt` is not on the wire. A reader who takes `1y from 2025-09-08` to
  mean "complete" is reading more than the column says.

### 3. The artefact figures to compare against, and the rebuild still stands

The body already says to rebuild the previous close's commit rather than cite a
figure. Task 2.8.9's own reading, so the close has something to reconcile
against rather than derive from nothing:

| File         | Before (2.7.9) |                     After |
| ------------ | -------------: | ------------------------: |
| JavaScript   |      371,406 B | **373,831 B** `b8149a71…` |
| CSS          |       18,063 B |  **18,222 B** `8c092e1e…` |
| `index.html` |        1,101 B |   **1,101 B** `11e71193…` |
| Four files   |      390,870 B |             **393,454 B** |
| Modules      |            300 |                   **301** |

The one new module is `coverage.ts`. **`market-time.ts` was already in the
bundle** from Task 2.5.5, so none of the +2.4 kB is the calendar arriving —
which is the attribution a reader would otherwise reach for first, and it is
wrong.

### 4. Four sweep candidates, three of them created or sharpened by 2.8.9

- **The `17,299 bytes` payload figure, which is stale in seven live places.**
  `securities-response.ts` was re-measured at Task 2.8.9 and now reads
  **150,660 B / 12,831 B gzipped at 518 securities with coverage**; the other
  six were not. Two of them are **load-bearing arguments in other stories'
  files** — Story 2.9's STORY.md calls it "a measured payload baseline" and
  Story 2.11's rests a client-versus-server search decision on it — and two are
  shipped source comments (`use-securities.ts`, `api-client.ts`, the second of
  which already scopes itself honestly). Read each before replacing: some are
  historical records correct in their own context, which is the distinction Task
  1.10.8 established and a naive substitution destroys.
- **A stated reversal trigger that half fired.** `securities-response.ts`'s
  pagination argument read _"a universe past §6's 500"_, and Task 2.8.2 took the
  universe to **518** — so the count crossed and the reason behind it did not,
  because the argument was never about the count. It is restated as **a
  compressed payload past roughly 100 kB**. The class is the one the last three
  closes were best at finding, and §6's 500 is quoted as a threshold in more
  places than this one.
- **The test count is 895** (211 + 477 + 207), plus 14 process and 141 database.
  It moved twice inside this story before 2.8.9 and once at it.
- **One amendment in `TASK-09` was wrong when written, and `BARS.md` was right.**
  Task 2.8.8's amendment §1 there says _"516 of 518 securities at identical
  depth, two shorter"_ and tables only `HONA` and `FDXF`. There are **three** —
  `Q`, Qnity Electronics, a 2025 DuPont spin-off — and §8.1 and §8.16 of
  `BARS.md` name all three correctly. **Trust `BARS.md` over the task
  amendments** when the two disagree about the store; the amendments were
  written to instruct a task and the document was written to record a
  measurement.

### 5. What this does not change

No task is added, deleted or re-ordered. Task 2.8.9 completed inside its brief:
it produced no work that needs a task of its own, and the one obligation it
could not discharge is a deployed read, which is this task's method already.

---

## Completed — 2026-09-09

`docs/adr/0020-the-bar-store-the-backfill-and-what-a-completed-backfill-certifies.md` is
written. Story 2.8 is closed. Nothing was added, deleted or re-ordered.

### The method, stated because it is unlike every previous close

Half of this story's criteria are properties of a **populated database**. A clean clone has
none, and re-running the backfill to prove them would take hours and spend a metered budget
for a result Task 2.8.8 already recorded. So each criterion below says whether it was
**re-taken from a clean clone** or **re-read from the deployed store**.

| #   | Criterion                                                                      | How                                 | Result                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Full backfill completes; runtime, rows, size recorded                          | **Re-read (deployed)**              | 47,682,213 `1m` + 345,559 `1d` across 518 securities; 8,951 MB total (5,001 heap / 3,948 index); ~196 B a row. §8.2's runtime stands: 81m 36s + 15m 45s minute, 135.6 s daily                                                        |
| 2   | Re-running changes nothing                                                     | **Re-read (deployed)**              | `bar_coverage`'s `sum(bar_count)` is **exactly** the two `market_bars` counts, from a table that never scans the bars. §8.10's fingerprint proof over every column including `recorded_at` stands                                    |
| 3   | Interrupted backfill resumes without duplicating or skipping                   | **Re-read**                         | §8.9 and §8.15 — a real unplanned interruption, and a cancelled run correctly refused for exactly the 50 securities left short by the ledger's contiguity check                                                                      |
| 4   | Holiday, half day and untraded minute each distinguishable from a failed fetch | **Re-run (local, identical store)** | `pnpm bars:check` in **1.79 s**: 515/518 series hold every session; **94.7% density** printed under a paragraph saying density is liquidity; 416 sessions attempted that left no bars, **all `ok`**; _"Nothing here needs a person"_ |
| 5   | The system can state what it holds, correctly after a partial failure          | **Re-read (deployed)**              | `bar_attempts` holds **2,953 rows and every one is `ok`** — no `coverage-gap` on either store, so §8.15's fifty are fully recovered                                                                                                  |
| 6   | Query performance measured against the real row count                          | **Re-read**                         | §8.16 — plans identical to local, warm **4.2–28.3 ms**, cold 3,213 / 5,373 ms and the cause named (256 MB `shared_buffers` against 8.95 GB on a 120-IOPS disk)                                                                       |
| 7   | Storage checked against the offer, headroom stated                             | **Re-read (deployed)**              | `storage_used` **14.45 GiB / 46.30%**, `backup_storage_used` **0.82 GiB against 32 GB included**; **~2.4 years** against ~22.5 GiB usable; `psql-storage-80pct` enabled, severity 2, re-read                                         |
| 8   | Universe re-curation settled and applied before the backfill                   | **Re-read**                         | Task 2.8.2, 518 securities, 25 GICS industry groups, zero singletons — applied before a single bar was filed                                                                                                                         |
| 9   | `pnpm verify` passes; database tests under their own command                   | **Re-taken (clean clone)**          | exit 0 in **49.53 s cold from a clone**, **44.39 s warm with NO database**, **39.90 s with one**; `test:database` **141 across 6 files**                                                                                             |

### The deployed read Task 2.8.9 handed forward — closed

PR #240 merged, `verify` ran on `main`, `deploy` succeeded in 4m 03s, and the live page was
read in a browser. It says, character for character, what §8.16 predicted:

> **518** securities tracked · **11** sectors · **15** ETFs · all with history · **47.7M**
> minute bars · through **2026-09-04**

`AAPL` reads `1y from 2025-09-08`; the three later listings read `Q` **10mo from
2025-11-03**, `FDXF` **3mo from 2026-06-01**, `HONA` **3mo from 2026-06-15**. The API's
`sum(barCount)` is **47,682,213** and reconciles against the deployed `bar_coverage` by
query — Task 2.4.6's method, the only one that can tell a page rendering the deployed store
from a page rendering a plausible one.

The `check-deployed` job, whose two new assertions had likewise never executed, is green:
**15 passed in 20.3 s**, with the deployed accessibility reading matching the pre-merge
gate.

### The cost question is ANSWERED, for the first time in five closes

Three closes recorded it refused in three shapes. It is now answered by a **fourth
instrument**: the budget's `currentSpend` reads **$0.9611 against $20**, where Task 2.1.1
and every close since read `0.0`.

`az consumption usage list` has changed shape again — **29 records** now, naming every
resource including the database, with every cost field still the string `'None'`. So the two
instruments still disagree; the difference is that one of them finally answers.

The estimate re-derives **to the cent** from the Retail Prices API for the fifth story
running — **$0.017/hr compute, $0.115/GB storage, $0.095/GB backup**, North Central US. The
budget stays at **$20** on Task 2.1.1's argument, restated: while the offer holds, a
database-attributable alert **is** the signal that an offer condition broke. Storage is
inside the offer at 15.5 GB of 32 and backup at 0.82 GB of 32, so **the backfill's marginal
bill is £0**.

### The sweeps — four found something, none came back clean

- **The ten convention blocks were stale by two stories** (750 → **895**). All ten amended
  together and verified to land on one md5; Stories 1.2 and 1.3's two historical variants
  left at 103; **three** further sites in Epic 1's `EPIC.md`, including the trailing clause
  that two previous sweeps have now edited around.
- **`README.md` said 861 fast tests in five places**, and its per-package breakdown was
  wrong in a sixth.
- **`docs/adr/README.md`'s own index stopped at 0015, and its 0014 row still read _"Reserved
  — not yet written"_ when 0014 exists and five more after it do.** Stale across three story
  closes, and **the first time that file has been swept at all** — which is the finding
  rather than the fix: the sweep list is a list of the places somebody remembered.
- **The `17,299 B` payload figure was stale in five live places.** Re-measured at **150,660 B
  / 12,831 gzipped** for 518 securities with coverage. Two of the five are load-bearing
  arguments in _other stories'_ files (Story 2.9's "measured payload baseline", Story 2.11's
  client-versus-server search decision) and two are shipped source comments. The historical
  records in Task 2.4.2's own files were **left standing**, per Task 1.10.8's distinction.
- **`pnpm links` is green by construction now**, so the counts are the thing to read:
  **232 documents, 558 cross-file links, 34 anchor links, 0 broken** — against the 209 / 482
  / 32 `README.md` published at Task 2.6.8. The double-hyphen trap is unchanged and the
  slugger is still written the long way.
- **The vendor grep passes its amended check.** Code-only over `packages/shared/src` is
  **2**, both `PROVIDER_IDS` gaining `"alpaca"` and the test that locks the vocabulary — so
  every hit is a member of the permitted set. Naive counts are 15 across 7 files in
  `packages/shared/src` and 464 across 28 in `apps/backend/src`; the second is not a
  regression, because those files **are** the vendor client.
- **The install-script sweep**, run against the clone's own store, returns
  **`esbuild@0.28.2` and nothing else**. Task 1.4.5 is still the only time `allowBuilds` has
  fired.

### Two live claims whose conditions had already fired

- **`UNIVERSE.md` §15.8's _"the owner of a future `delisted` is Story 2.8's ingestion"_.**
  Answered: the signal was built and `delisted` still does not ship, because §15.3 already
  produced the overwrite that makes writing it two decisions rather than one.
- **`database.ts`'s _"the only place shipped code constructs one or names `pg`"_.** The
  second half stopped being true at Story 2.8: `securities.ts`, `market-bars.ts` and
  `bar-attempts.ts` each carry `import type pg from "pg"` so their functions can take a pool
  they never build. That is a type position, erased at compile time, and it is the shape the
  repository seam is _supposed_ to have. Narrowed to **constructs**.

### The leak check, on all six producers

Log Analytics is **zero** for `eyJ`, `APCA-`, `Bearer`, the key id, `DATABASE_PASSWORD` and
`access_token` across a **non-vacuous 23,999-record** 24-hour window that includes the
revision rollover.

The sixth producer is new: **a backfill's own output**. The last backfill workflow run's
581-line log holds **three** credential-shaped strings, and all three are read rather than
counted — two are `--resource https://ossrdbms-aad.database.windows.net` in echoed script
source, which is a token _audience_, and one is `alpaca key id: PK…`, which Task 2.7.2
established is an **identifier and not a secret** and which is printed deliberately so an
operator can tell which key is configured. Note the swept run is the one that **failed** on
`AADSTS700024`, which is the right window precisely because it is the one that hit a
credential error.

### The figures

**Clean clone (the twelfth):** 417 packages cold in **9.6 s**, **419 store entries /
285,008 KB / 4,766 lockfile lines**, `pnpm-workspace.yaml` md5 unchanged — Story 2.7's
baseline **exactly**, which is the check rather than a coincidence, because this story added
**no dependency at all**.

**`pnpm verify`:** exit 0 in **49.53 s** cold from the clone, **36.05 s** warm with **no
database** and **36.12 s** with one on the final tree (an earlier reading mid-task was
44.39 / 39.90 on the same steps, which is the run-to-run spread this repository already
records rather than a change). Warm per-step: build 2.76 / lint 7.19 / `format:check`
9.07 / `stories` 0.25 / `env:check` 0.25 / `links` 0.31 / `test` 5.85 / `test:process`
10.90.

**Tests:** `pnpm test` **895 across 60 files** (211 + 477 + 207), `test:process` **14**,
`test:database` **141 across 6 files in 3.80 s**.

**The artefact reproduces Task 2.8.9's figures to the byte** from a clean build —
373,831 B `b8149a71…`, 18,222 B `8c092e1e…`, `index.html` 1,101 B `11e71193…`, 300 B, for
**393,454 B over four files at 301 modules**. No rebuild of the previous close's commit was
needed: 2.8.9 measured both columns against the actual previous state one day ago and its
"after" column is what HEAD produces. Storybook is **77 files / 9.4 MB**, up from the
recorded 76.

**And the `developer-laptop` firewall rule had moved again** — `122.11.246.6` →
`58.182.90.91`, the recorded hazard's **sixth** sighting, which is why `HOSTING.md` names
the hazard rather than an address.

### The honest gap this close hands forward

**The temporal seam is now load-bearing on data, and it is still held by discipline alone.**
`market-bars.ts` reads `observed_at` on every query against 48.03 million timestamped rows;
five modules now build their own `Kysely` handle and none of them exports it; Epic 13's
plugin is unwritten. ADR 0015's gap 4 is restated at that weight rather than left where it
was.

---

## For the stakeholders — what this task did, in plain English

**The short version: MarketPulse now has a memory, and this task was the audit of it.**

### What was already true before this task

Over the previous nine tasks the team built the part of the product that remembers. Until
now MarketPulse could _ask_ a market-data vendor for prices and print them; it could not
_keep_ them. As of this story the database holds **48 million real price records** — every
minute of every trading day for the past year, for all 518 companies we track, plus two and
a half years of daily prices. That is the raw material every chart, every "is this move
unusual?" calculation and every historical replay in the product will read.

### What this particular task did

Nothing new was built. This task is the **close**: it re-ran every promise the story made,
wrote the permanent decision record, and went looking for things the documentation now says
that are no longer true.

Three things are worth a stakeholder's attention.

**1. We checked the work against the live system rather than against our own notes.** The
temptation at the end of a big piece of work is to quote the measurements taken while doing
it. We instead reconnected to the production database and re-read it: the row counts, the
sizes, the storage headroom, the query speeds. Everything matched. We also opened the live
website in a browser and read the new "how much history do we have" column with our own
eyes, then checked those numbers against the database directly — because a page showing
_plausible_ numbers and a page showing _the real_ numbers look identical from the outside.

**2. We were deliberately pragmatic about what to re-measure.** Proving some of these
promises from scratch would have meant re-downloading a year of market data — hours of work
and real money in vendor fees — to confirm something we measured yesterday. So the close was
split in two: anything about the _code_ was rebuilt from a fresh copy of the repository and
re-tested; anything about the _data_ was read back from the live database. Every item in the
record says which, so nobody later mistakes a citation for a measurement.

**3. We wrote down what a full history does NOT guarantee, and that list is longer than what
it does.** This is deliberate and it is the most useful part of the document. It is easy to
look at "48 million rows, all green" and conclude the data is perfect. It is not, and the
ways it is not are all knowable:

- Most companies genuinely do not trade in every single minute — the average is 364 minutes
  out of 390. If a later feature treats a quiet minute as a _missing_ minute, it will report
  the system as permanently broken. So we report "how much we hold" and "how densely it
  trades" as two separate numbers with two separate names.
- Three of the 518 companies have shorter histories, because they only started trading
  recently. Our own report cannot tell that apart from a failed download, and it says so
  rather than guessing.
- Prices are stored exactly as the market published them, without adjusting for stock
  splits. That is the right choice for a system whose job is to be an honest record, and it
  means a chart spanning a split will show a genuine step. We label it rather than hide it.
- The prices we have stored come from the full US market. The _live_ prices arriving in the
  next phase come from a single exchange. Those two will sit in the same table, and the
  product will have to say so.

### Two decisions worth explaining

**Why we did not adopt a specialist time-series database.** There is a well-known Postgres
extension for exactly this kind of data, and adopting it looked obvious. We measured instead
of assuming: at 48 million rows the queries the product actually needs run in **4 to 28
milliseconds**. The slow cases we found turned out to be a memory-cache setting, not a
database-design problem — and the extension would not have fixed them. Adopting it would
have meant changing four things including every developer's local setup. So we declined it
and wrote down the exact measurement that would reverse the decision.

**Why we are keeping an index nobody reads.** The database maintains a 1 GB internal lookup
structure that has been used **twice** — essentially never. Deleting it would free about 11%
of the table. We kept it, because it is required by a house rule that keeps future
data-linking simple, and removing it now would be a risky change to a live 48-million-row
table for a saving we do not currently need. The important part is that we **wrote the price
down**, along with the specific trigger that would make us reverse it. A cost you have
measured and accepted is a decision; the same cost undiscovered is a surprise.

### What this unlocks

This story is the last of the "invisible" ones. Everything from here is something a person
can see:

- **Next (Story 2.9)** the backend starts serving this history over an API.
- **Then (Stories 2.10–2.11)** the front end learns to ask for it, and you can search for a
  company and select it.
- **Then (Stories 2.12–2.13)** the price and volume charts appear — the first time a user
  sees actual market data drawn on screen, and the moment this story's 48 million rows stop
  being a claim in a document.

There is already one visible payoff, live now: the Security Explorer page says how much
history we hold for every company it lists. Nine tasks of pipework, one honest sentence on a
page — and it is the cheapest way for somebody who is not reading a database to see that the
pipework works.

### The one thing we are carrying forward

MarketPulse's signature feature — replaying a past trading day and seeing only what was
knowable at that moment — depends on a guarantee that no part of the system can ever read
data from _after_ the replay clock. Today that guarantee is honoured by every module, by
careful convention, and **enforced by nothing automatic**. Until this story that cost
nothing, because the data involved had no timestamps to leak. It now has 48 million of them.

We have not fixed it here, because the enforcement mechanism belongs to the replay work
itself. What we have done is restate it as the largest open risk in the project, at its new
size, in the permanent record — so that it is a scheduled piece of work rather than
something discovered late.
