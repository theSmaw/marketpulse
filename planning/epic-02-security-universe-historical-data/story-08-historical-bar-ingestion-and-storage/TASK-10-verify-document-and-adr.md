# Task 2.8.10 — Verify, document, and ADR 0020

**Status:** Not started
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
