# Task 2.8.9 — What we hold, on screen

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.8

## Objective

Make this story visible. `/securities` renders 518 rows of curated metadata today (101 until Task 2.8.2 re-curated the universe to the S&P 500); after Task
2.8.8 the database holds roughly ten million bars behind those rows and **nothing on any screen
says so**.

This task puts the store's own statement on the page: for each security, **how much history we
hold and how far back it goes** — read from Task 2.8.4's ledger rather than computed by scanning
bars.

**The scoping call is taken here rather than left to Story 2.14**, and the reason is delivery
rather than architecture: this story is nine tasks with one visible change in it, and deferring
the only demonstration of ten million rows to two stories later is how a run of invisible work
ends with nothing to show. Story 2.14 still owns the epic's provenance and partial-state pass;
this is one column and one sentence.

## What the user can see when this lands

**The first time this product says anything about market data it holds.**

`/securities` gains a coverage column. A row that reads

> `NVDA · NVIDIA Corporation · Semiconductors` — **1y minute · from 3 Sep 2025**

is the first sentence in this application that is about the market rather than about our own
configuration. The summary line above the table gains the aggregate: **how many securities have
history, how many bars in total, and through when.**

This is the demonstration for the whole story, and it is worth showing to a stakeholder in
exactly those terms: _the list you saw two weeks ago is the same list, and now each row knows
what we know about it._

## The contract

`GET /securities` already returns an envelope with per-field-group provenance
(`securities-response.ts`), and the extension is a **coverage record per security** — optional,
because a security with no bars has none and **`undefined` is the honest answer rather than a
zero**.

Four rules from Story 2.4's own decisions carry over unchanged and one is new:

- **The `satisfies` guard is applied at every level**, and it **does not reach into a nested
  object** — Task 2.4.2 found that the hard way and applies it three times. A coverage record is
  a fourth nesting and needs its own.
- **A `["string", "null"]` schema type where a value is genuinely nullable.** Task 2.4.2
  measured that a plain `"string"` turns a genuine `null` into the **empty string** on the wire,
  which is a silent lie rather than a formatting problem.
- **`status` is NOT filtered on this path.** An `untracked` security keeps its history and the
  page shows it — `UNIVERSE.md` §12.2 puts this reader on the do-not-filter side, and a row that
  reads `NO LONGER TRACKED` beside `1y minute · from 3 Sep 2025` is exactly right: we stopped
  tracking it, and what we stored is still what happened.
- **A predicate ships with its first reader**, so `isSecuritiesResponse`'s coverage half is
  written here rather than speculatively.
- **New: the coverage figures come from the ledger, never from the bars.** A page that
  `count(*)`s ten million rows to render a list is the thing the ledger exists to prevent, and
  it would be measured in Story 2.9's response-time work as a mystery.

## What to render, and what not to

**Two facts and no more: the depth of history and where it starts.** Everything else the ledger
holds — the exact bar count, the resume point, the last attempt — is diagnostic and belongs
nowhere near a list of securities.

- **The depth is a duration, not a bar count.** `1y minute` reads; `98,120 bars` does not, and it
  invites arithmetic nobody wants to do in their head. The aggregate line can carry the total,
  because a total is a scale claim rather than a per-row fact.
- **The start is a date, formatted by hand.** Task 2.4.4's rule: `toLocaleTimeString` and its
  relatives change width when a locale changes what they include, which is exactly what
  `tabular-nums` cannot fix. A market date is a `YYYY-MM-DD` on the wire and a fixed-width
  rendering on screen.
- **Nothing is red and nothing is green.** §36 and the design language both: a security with no
  history is not a failure, it is a security we have not backfilled. It gets the same treatment
  `checking` gets in the chrome — a neutral placeholder and a word — rather than an alarm.

**And say what is missing rather than implying completeness.** If Task 2.8.7's report knows a
security has failed sessions, the honest rendering is not a percentage in a table — it is the
absence of the confident sentence. Reserve the diagnostic detail for the report and let the page
say the true simple thing.

## The design, which is an acceptance criterion rather than polish

The standing bar applies: **it must look designed rather than defaulted, and it must never read
as a generic admin panel.** Two specific opportunities here, because a coverage figure is the
first thing on this page with a **magnitude**:

- **A coverage bar is the obvious idea and is probably wrong.** Every row would have a
  near-identical full bar, because the backfill fills every tracked security to the same depth —
  so it encodes nothing, occupies a column, and reads as a progress indicator for something that
  is not in progress. The variation worth showing is the **exceptions**: the security that
  starts later because it listed in 2024, the one with no history at all.
- **What the design should make legible is the outlier**, which means the default row should be
  quiet and the unusual row should not. That is the same argument Task 2.6.7 settled about
  weight and hierarchy rather than ink: standing out is a job for typography, and the one thing
  it is never a job for is a colour below the contrast floor — `--palette-amber` measured
  **1.73:1** at 12px on the page ground, worse than the `--ink-disabled` that caught Task 1.12.4.

Existing components come first: `Marker` owns the silhouettes, `type.module.css` owns
`.microLabel`, and a fourth component holding the marker language by imitation is a cost this
repository has already stated twice.

## Accessibility, which this page has a specific history with

- **The table's one live region already exists** and is a `role="status"` that is **never
  unmounted** — Task 2.4.5 built it after finding that putting `aria-live` on the loading
  paragraph meant the page announced that it had started and never that it had finished. A
  coverage column changes what that sentence should say, and the rule is that it stays one
  sentence written to be **heard**.
- **`Region` takes `tabIndex={0}` on every region** because a scrolling box that cannot be
  reached by keyboard is unreachable content — the `scrollable-region-focusable` defect the CI
  gate found on its first run, which had stood for five stories and which reproduces at a
  viewport 160px shorter. A new column makes the table wider; check it at 1280, 560 and 480.
- **The axe gate is a gate here**, and its baseline for this page is `0 violations / 35 passes /
1 inconclusive (th-has-data-cells)` — the inconclusive being axe declining to judge a
  `scope="rowgroup"` band, not a finding. **Re-take it rather than citing it**, and remember
  `support/axe.ts` waits for finite animations first, because the gate once reported 203
  contrast violations on a correct page by measuring a frame of a 240ms entrance.

## Work

- The coverage record in `packages/shared/src/securities-response.ts`, its schema entry, its
  `satisfies` guard and its half of the predicate
- The repository read: one query against the ledger, joined to the universe, **never a scan of
  `market_bars`**
- The column, the summary aggregate, and the no-history rendering
- Storybook: the states that cannot be reached in a browser without breaking something — a
  security with no history, one with a later start, an untracked security with history — as
  **chosen rows rather than a cartesian product**, which is `AppHeader`'s convention since Task
  1.12.5
- Component tests, and a browser journey in `e2e/specs/` asserting the coverage line renders for
  a known security. **Assert on a role and an accessible name rather than on a bar count**, for
  the reason no test anywhere asserts a real bar count against `minuteBars`
- A deployed assertion **only if it clears `specs-deployed`'s bar** — something no other
  instrument can see. The candidate is that the deployed page's coverage figures come from the
  deployed database rather than from a local one, which is a real claim; a second assertion that
  a number is a number is not
- The axe reading at three viewports, in every state

## Done when

- The deployed `/securities` says how much history each security has, and the figures reconcile
  against the deployed database read directly — Task 2.4.6's method
- A security with no history renders honestly rather than as a zero
- An untracked security shows its stored history, which is the invisible predicate not being
  applied on a read path
- The axe reading is unchanged from Task 2.4.5's baseline at three viewports
- `pnpm verify` is exit 0, `pnpm e2e` passes, and the artefact's move is explained rather than
  noted

## Notes

The temptation is to make this page a data-quality dashboard, because after Task 2.8.7 there is
a lot to report. Resist it: this is the **Security Explorer**'s list, its reader is somebody
choosing a security to look at, and what they need to know is whether there is anything to look
at. The failed sessions, the thin minutes and the outcome histogram are an operator's concern and
they have a command.

The one sentence to get right is the one about a security we hold nothing for, because it is the
sentence a first-time viewer is most likely to see if anything went wrong — and §36's rule is
that it degrades locally and says what it knows, rather than reading as a fault.

---

## Amended 2026-09-08 by Task 2.8.4 — the read this task needs already exists, and one field does not

**`listCoverage()` on `MarketBarsRepository` is the query this task's Work list describes** —
one statement against `bar_coverage` joined to `securities`, ordered by symbol then timeframe,
returning a few hundred rows regardless of how many bars exist. It never touches `market_bars`,
which is the property this page's figures depend on. What is still owed here is the wire
contract, the shape on the page and the render; the repository read is not new work.

Each `BarCoverage` carries `symbol`, `timeframe`, `covered` (a `TimeRange`), `barCount` and
`updatedAt` — so **the depth of history and where it starts** are `covered.end − covered.start`
and `covered.start`, both available without a second query.

**One correction to the body:** it lists _"the exact bar count, the resume point, the last
attempt"_ as diagnostic fields to keep off the page. There is no last-attempt field — Task 2.8.4
refused one outright, because it would be a date that always says today and therefore
permanently silent about staleness, which is the trap `UNIVERSE.md` §11 records. The resume point
is not a field either: it is `covered.end` or `covered.start` depending on the walk's direction,
read off the range rather than stored beside it. So the diagnostic fields to keep off the page
are the **bar count** and `updatedAt`, and the instruction is otherwise unchanged.

**And one property worth using rather than re-deriving:** `updatedAt` moves only when the ledger's
statement actually changed, so it is honestly "when what we hold last changed" rather than "when
the backfill last ran". If this page ever wants to say something about freshness, that is the
field — and it is the reason it is safe to say it.

---

## Amended 2026-09-08 by Task 2.8.6 — two rows per security, and one honest rendering that is now producible

The backfill shipped, so the ledger this task reads has real content and three things about its
shape are now facts rather than expectations.

### 1. `listCoverage()` returns one row per `(security, timeframe)`, so this page has to choose

Measured after a run: **519 ledger rows for 518 securities** — one `1m` row each plus one `1d`
row for the symbol a daily backfill was run against. Once Task 2.8.8 fills both timeframes it is
**1,036 rows for 518 securities**.

The body's worked example reads `1y minute · from 3 Sep 2025`, which implicitly picks the minute
row. **That is the right choice and it should be stated as one**: the minute series is what every
chart in Epics 4, 5 and 12 reads, the daily series is a different depth (2024-01-01) and putting
both on one line makes a row that nobody can scan. The daily depth belongs on the per-security
route Story 2.11 owns, beside the chart that uses it.

So: pick `1m`, say so in the code, and render **nothing rather than a zero** for a security whose
minute row is absent — which is the rule the body already states for a security with no history
at all, applied one level down.

### 2. "How far back" is `covered.start`, and the backwards walk is what makes it meaningful

Task 2.8.6 walks **backwards from the most recent session**, so a partially-filled security has a
covered range whose `end` is recent and whose `start` is however far the run got. That is exactly
the shape this column wants: `covered.start` is _"from"_ and it moves earlier as the store
deepens, while `covered.end` stays pinned to the frontier.

The consequence worth designing for: **during a backfill, and after an interrupted one,
securities legitimately have different depths.** That is not a fault state and must not render as
one — it is the store being partially filled, which §36's rule says degrades locally and says
what it knows.

### 3. The outlier this page should make legible now has a name and a cause

The body predicts that a coverage bar is probably wrong because _"the backfill fills every
tracked security to the same depth"_, and that the variation worth showing is the exception. Two
exceptions are now producible rather than hypothetical, and they are different from the ones the
body guessed at:

- **A security blocked by `CoverageGapError`.** The backfill drops it from the rest of the run
  and it stops extending, so it sits at a shallower depth than the other 517 **permanently**,
  until somebody acts. This is the row the design should make findable.
- **A security with a genuinely shorter history**, because it listed inside the window. The body
  already names this one and it is the benign case.

They render identically from the ledger alone — both are just a later `covered.start` — which is
the argument for the page saying the **true simple thing** (how much we hold) and leaving _why_
to Task 2.8.7's report. Do not try to distinguish them here; the body's instruction to reserve
diagnostic detail for the report is right, and this is the specific case that will tempt somebody
to break it.

**One figure not to render, measured.** The mean is **364.3 bars per security-session** rather
than 390, so a percentage against `minuteBars` reads ~93% for a completely healthy store. That is
a liquidity fact, it is not completeness, and it must not appear on this page as either.

---

## Amended 2026-09-08 by Task 2.8.7 — one instruction whose reason evaporated, and it should still be followed

The attempt log and `pnpm bars:check` shipped. One thing in this file is now **false as written**,
and the instruction it supports is nonetheless still right — which is exactly the shape that gets
overturned by the next reader unless the surviving argument is written down.

### The two outliers are now distinguishable, and the page still must not distinguish them

Task 2.8.6's amendment §3 names two securities that sit at a shallower depth than the rest:

- one **blocked by `CoverageGapError`**, which stopped extending and is permanently behind;
- one with a **genuinely shorter history**, because it listed inside the window.

It then says: _"They render identically from the ledger alone — both are just a later
`covered.start` — which is the argument for the page saying the true simple thing."_

**The first half of that sentence is no longer true.** A blocked symbol now leaves a
`coverage-gap` row in `bar_attempts`, carrying the sessions the refusal named, so the two cases
are separable with a second read. The conclusion survives and its argument changes from _you
cannot_ to **you could and should not**:

- The reader of `/securities` is somebody choosing a security to look at, and what they need to
  know is whether there is anything to look at. _Why_ the depth is shallow is an operator's
  question with an operator's command.
- Rendering the reason means rendering `coverage-gap` — engineering vocabulary about our own
  ingestion — on the page a first-time viewer meets. That is the caption problem Task 2.7.4
  produced and corrected: the sentence is the requirement, and there is no honest short sentence
  for this one.
- And the two look the same **to a user** whatever the database knows, because in both cases the
  true statement is _"we hold history from this date"_.

So: the body's instruction stands unchanged. **Do not join `bar_attempts` on this path.** The
page reads the ledger and nothing else, which is also what keeps it one query.

### What the report already does instead, so this page does not have to

The body says _"say what is missing rather than implying completeness"_ and _"reserve the
diagnostic detail for the report"_. That report exists and is `pnpm bars:check`, so the sentence
is now a pointer rather than a promise: a security behind the rest is reported there by name,
with its recorded reason beside it, and the page carries the simple true thing.

### One number this page must not compute, restated with its measured value

The mean is **364.3 bars per security-session** against a nominal 390, so a percentage against
`minuteBars` reads ~93% for a **completely healthy** store. `bar-completeness.ts` calls that
figure **density** and never _completeness_, deliberately, and keeps it in a separate column from
the session count. If this page ever grows a second figure, take the vocabulary from that module
rather than inventing one — two names for one number in two places is how somebody comes to
re-fetch 240 sessions that were already complete.

### A small thing that is now available and is probably still not worth rendering

`bar_coverage.updatedAt` means _when what we hold last changed_ rather than _when the backfill
last ran_ — Task 2.8.4 refused a last-attempt column precisely so that it could. Task 2.8.7 then
took the decision that **neither the backfill nor a catch-up runs automatically in V1**, which
makes staleness a real state rather than a hypothetical one, and this field the only honest way
to report it.

That is a reason to know the field exists, not a reason to put a date on every row. If freshness
ever belongs on this page it belongs in the **summary line** — one statement about the store —
rather than as a per-row column nobody scans.

---

## Amended 2026-09-08 by Task 2.8.8 — the outliers have names and a count, and one of the two does not exist

The full-depth local backfill ran. The two exceptional rows this file has been designing around
since Task 2.8.6's amendment §3 are no longer hypothetical, and **they did not come out one
each**.

### 1. The benign outlier is real, is named, and there are exactly two of them

| Symbol | Company                             | Sector      | Why it is short   |
| ------ | ----------------------------------- | ----------- | ----------------- |
| `HONA` | Honeywell Aerospace Inc.            | industrials | Spun out mid-2026 |
| `FDXF` | FedEx Freight Holding Company, Inc. | industrials | Spun out mid-2026 |

Both are 2026 spin-offs, and their existence is **guaranteed rather than unlucky**: Task 2.8.2
curated the universe from the S&P 500 as it stands **today**, so a one-year backfill necessarily
walks off the end of any constituent that listed inside the window. Any future re-curation does
the same thing again.

So the Storybook state this file asks for — _"a security with a later start"_ — has a real
referent to build against rather than an invented fixture, and the aggregate line has a real
number: **516 of 518 securities at identical depth, two shorter.**

### 2. That is the measured argument against the coverage bar, and it is stronger than the guess

The body says a coverage bar _"is probably wrong"_ because every row would be near-identical.
Measured: **99.6% of rows are identical** and the entire information content of the column is two
rows. A bar chart renders 516 full bars to communicate two exceptions.

**The design target is therefore explicitly the exception**, and the quiet default is not a
stylistic preference — it is what 516 identical values require. Weight and hierarchy, per Task
2.6.7, and not a colour below the contrast floor.

### 3. The OTHER outlier has no instance, and it must not be designed for

Task 2.8.6's amendment §3 names a security **blocked by `CoverageGapError`** as _"the row the
design should make findable"_.

**Across 247 sessions and ~47M rows, zero symbols were blocked.** The state is reachable and it
did not occur on a healthy full-depth run against the real vendor.

This repository's own rule applies — `UNIVERSE.md` declined `delisted` because the mechanism
would have had **no instance** — so: do not build a distinct treatment for the blocked row.
Render depth honestly and let the two cases look identical, which is what Task 2.8.7's amendment
already concluded for a different reason (_you could and should not_). This adds the third
reason and it is the cheapest one: **there is nothing to look at.**

The reversal trigger is a blocked symbol actually occurring — at which point `pnpm bars:check`
reports it by name with its recorded reason, which is where an operator's question belongs.

### 4. One rendering consequence of the empty-answer path, which is not obvious from the ledger

`HONA` and `FDXF` do not merely start later — the vendor **answers successfully with no bars**
for every session before their listing, and an empty answer extends no ledger. So their
`covered.start` is their listing date and there is nothing in `bar_coverage` distinguishing
_"we asked and there was nothing"_ from _"we never asked"_.

That is correct and it is exactly why the page reads the ledger only. The distinction lives in
`bar_attempts` as `ok` rows — **185 and counting for `HONA` alone** — and Task 2.8.7's amendment
already forbids joining that table on this path. This is the concrete case that will tempt
somebody to.

---

## Amended 2026-09-09 by Task 2.8.8 — the staleness premise changed, and the conclusion holds anyway

Task 2.8.7's amendment above reasons from a premise that is no longer true:

> Task 2.8.7 then took the decision that **neither the backfill nor a catch-up
> runs automatically in V1**, which makes staleness a real state rather than a
> hypothetical one, and this field the only honest way to report it.

**There is a nightly catch-up now** ([`BARS.md`](BARS.md) §8.12), so the store
is not routinely stale.

**The conclusion is unchanged and its argument is actually stronger.** A
schedule fails in a way a manual process does not: **silently.** GitHub disables
a `schedule:` on a repository with no pushes for 60 days, with no red run and no
email — so "somebody forgot" is replaced by "nobody was told", and
`bar_coverage.updated_at` goes from being the only honest way to report
staleness to being the only way to **detect** it.

**For this task that changes nothing about what to render**, and the body's
instruction stands: freshness, if it ever appears, belongs in the summary line
as one statement about the store rather than as a per-row column nobody scans.
What it changes is how likely that line is to be worth building — a store that
tops itself up nightly and might silently stop is a better candidate for one
than a store somebody remembers to fill.

---

## Completed 2026-09-09

**Status:** Complete.

`/securities` now says how much market history MarketPulse holds for each
security, read from Task 2.8.4's ledger and never from `market_bars`.

### What shipped

| Layer                                                    | What changed                                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/shared/src/securities-response.ts`             | `SecurityCoverage`, the `coverage` key on the envelope, and its half of `isSecuritiesResponse`      |
| `apps/backend/src/routes/securities.ts`                  | A fourth `satisfies` guard, a third concurrent read, `toWireCoverage`, and the `1m` filter          |
| `apps/backend/src/index.ts`                              | The route now takes two repositories                                                                |
| `apps/frontend/src/use-securities.ts`                    | `loaded` carries the coverage indexed by symbol                                                     |
| `apps/frontend/src/components/UniverseTable/coverage.ts` | New. The formatters, pure and tested with no DOM                                                    |
| `apps/frontend/src/components/UniverseTable/*`           | The `Minute-bar history` column, the summary clauses, the announcement, the styles, a seventh story |
| `e2e/specs/securities-route.spec.ts`                     | A fifth column header, a coverage journey, a widened announcement assertion                         |
| `e2e/specs-deployed/tracked-universe.spec.ts`            | A fifth column header and one row-shape assertion, riding the existing page load                    |

No dependency, no lockfile change, no migration, no new script and no new
`verify` step.

### The decisions, and what each rests on

**`coverage` is required on the wire where `provenance` is optional.**
`provenance`'s absence _means_ something — the rows no longer share one source,
so the claim is not made. There is no equivalent here: the ledger either has
rows or it does not, and an empty array says _we hold nothing yet_, which is
exactly what a migrated database with no backfill should say. An optional field
would give that state two spellings. The version-skew risk that usually argues
for optionality was checked rather than assumed: `deploy.yml` deploys the
**backend first** and waits for the revision before building the frontend, so a
frontend strict about this field never meets a backend without it.

**Minute bars only, and the timeframe is on the wire anyway.** The ledger holds
1,036 rows for 518 securities. The minute series is what every chart in Epics 4,
5 and 12 reads; the daily series is a different and deeper window and putting
both on one row makes a row nobody can scan. `timeframe` is still sent — a
field whose value is always the same is worth sending when the alternative is a
client assuming it — and the daily depth belongs beside the chart that uses it,
which is Story 2.11's.

**Two facts per row and no more: a duration and a start date.** `1y from
2025-09-08`. The depth is a duration because `97,530 bars` invites arithmetic
nobody wants to do to answer the question they actually have, which is _is there
enough of this to look at?_ The date is `YYYY-MM-DD`, which the body asked for
as "a fixed-width rendering" — fixed width, zero-padded, unambiguous across
locales, and its string order is its chronological order, which
`summariseCoverage` then relies on.

**The exception is made legible by alignment and by nothing else.** Measured
against the local store: **515 of 518 securities start on the same day**, so the
entire information content of the column is the three that do not. A coverage
bar would draw 515 identical full bars to communicate three exceptions and read
as a progress indicator for something not in progress. Right-aligned tabular
dates do it for free — and the screenshot of the industrials block shows
`3mo from 2026-06-01` and `3mo from 2026-06-15` standing out of ~28 identical
rows with no ink, no chip and no second vocabulary. Anything louder would also
have to be wrong, because the two causes of a short history are indistinguishable
from the ledger.

**Nothing joins `bar_attempts`, and the body's instruction is followed for the
reason Task 2.8.7's amendment gives rather than the reason Task 2.8.6's did.**
The two causes _are_ separable now; the page must not separate them, because the
engineering word for one of them is `coverage-gap` and there is no honest short
sentence for that on a page a first-time viewer meets. `pnpm bars:check` is
where an operator's question belongs.

**The summary line's history clause is words when every row is covered and a
figure when it is not.** The first draft rendered `518 securities tracked · …
· 518 with history`, and two identical figures a centimetre apart read as a
mistake rather than as the good news they are. What a reader wants from a
complete store is _no gaps_, so it says `all with history`; the figure returns
the moment it says something the count beside it does not. That is the same
asymmetry the `no longer tracked` clause already had.

**The announcement carries the coverage as a third sentence and deliberately
not the total.** A listener can act on _is there anything to look at_;
`47.7M` spoken is worse than not said. So the count of securities with history
is heard and the scale figure is seen.

### Three recorded claims corrected by measuring

**There are THREE short-history securities, not two.** Task 2.8.8's amendment §1
names `HONA` and `FDXF` and says "516 of 518 securities at identical depth, two
shorter". The local full-depth store reads **515 at identical depth and three
shorter**: the third is **`Q` — Qnity Electronics, Inc.**, a 2025 spin-off from
DuPont, starting `2025-11-03`. That strengthens rather than weakens the
amendment's own argument: spin-offs inside the backfill window are guaranteed by
curating the universe from the index as it stands today, and there are more of
them than anybody counted.

**A deliberate break that did not go red, and the test it produced.** The
half-open-end assertion was written first against a _minute_ window and claimed
in its own comment to be "made to fail by reading `end` directly". It was not:
`20:00Z` is 16:00 in New York, so both readings give the same day and the
assertion passed either way. The case where the millisecond matters is a
**daily** window, whose ledger row really does end at `2026-09-08T04:00:00Z` —
midnight ET, a day we hold nothing of. That second case is now the test, and the
break goes red. Task 2.5.3's rule arriving from the useful side.

**The wire-size argument in `securities-response.ts` was re-measured, and its
stated reversal trigger had half fired.** It read "a universe past §6's 500",
and Task 2.8.2 took the universe to 518 — so the count crossed and the reason
behind it did not, because the argument was never about the count. Restated as
**a compressed payload past roughly 100 kB**. The figures: 518 securities with
coverage are **150,660 B, gzipped 12,831 B**, against a 373 kB bundle the
browser downloads first. The compression ratio _improved_ from 6.7:1 to 11.7:1,
because 515 records carry the same two instants.

### The figures

- **The endpoint reconciles exactly against the database read directly**: 518
  coverage records, `47,682,213` bars, one distinct timeframe (`1m`), and the
  same three outlier start dates.
- **axe: 0 violations / 35 passes / 1 incomplete (`th-has-data-cells`)** at
  1280×720, ×560 and ×480 — Task 2.4.5's baseline reproduced exactly at all
  three, so a fifth column introduced nothing. The workshop's own panel reads
  0 / 12 / 1 on the new story.
- **`pnpm verify` exit 0.** `pnpm test` is **895** (211 + 477 + **207**),
  `test:process` 14, `test:database` 141.
- **`pnpm e2e` is 29 across seven spec files and the wall time did not move**
  (1.0 m, still dominated by the recovery journey) — the fourth confirmation of
  that shape.
- **The artefact moved and both halves are accounted for**: JavaScript
  371,406 → **373,831 B** (`b8149a71…`), CSS 18,063 → **18,222 B**
  (`8c092e1e…`), `index.html` 1,101 B (`11e71193…`), 300 B, for **393,454 B over
  four files at 301 modules** — the one new module is `coverage.ts`, and
  `market-time.ts` was already in the bundle from Task 2.5.5, so none of the
  +2.4 kB is the calendar arriving.

### The honest gap

**Nothing is deployed**, for the reason Tasks 2.2.7, 2.3.7 and 2.6.7 record:
`deploy.yml` only runs on `main`. The deployed assertion is written and has not
executed; on the first merge it will read the deployed ledger, which Task 2.8.8
filled. The two things that would show up there and not here are a deployed
store shallower than the local one, and a `check-deployed` job whose
`Minute-bar history` header assertion fails because the two deployed halves
disagree — which is the one thing that assertion is for.

---

## For the stakeholders — what this actually does

**In one sentence: the list of 518 companies MarketPulse follows now tells you,
for each one, how much market history we actually hold — and it is the first
thing this product has ever said on screen about the market rather than about
itself.**

### What changed for somebody looking at the screen

Two weeks ago the Security Explorer showed the same list of companies it shows
today: ticker, name, industry, sector. Correct, and completely silent about
whether we had any actual market data behind any of it. Meanwhile the last eight
tasks of this story built a store now holding **forty-seven million** minute-by-
minute price bars — and nothing anywhere on any screen said so.

Now every row ends with a short phrase like **`1y from 2025-09-08`**: a year of
minute-by-minute history, starting on that date. Above the table, a line that
reads

> **518** securities tracked · **11** sectors · **15** ETFs · all with history ·
> **47.7M** minute bars · through **2026-09-04**

That line is the demonstration for the whole of the last two weeks' work. You
can now send somebody a link instead of a status report.

### The decisions worth knowing about

**We show a duration, not a number of bars.** `1y` tells you something. `97,530
bars` makes you do arithmetic in your head to find out whether that is a lot.
The big total belongs in one place — the summary line, where it is a statement
about the size of the whole store — and nowhere else.

**We deliberately did not build a progress bar,** which was the obvious idea.
515 of the 518 companies have exactly the same amount of history, so a bar chart
would draw 515 identical full bars to tell you about the three that are
different. Worse, it would look like something was still loading when nothing
is. Instead the dates are lined up in a fixed-width column, and the three
exceptions leap out of the page precisely _because_ everything around them is
identical. It costs nothing and it works better.

**The three exceptions are real and they are not faults.** Honeywell Aerospace,
FedEx Freight and Qnity Electronics are all recent spin-offs — they only started
trading part-way through the year we backfilled, so a shorter history is the
_correct_ answer. The screen says `3mo from 2026-06-15` and stops there. It does
not explain, apologise, or colour the row red, because there is nothing wrong.

**A company we hold nothing for says "no history yet", not "0".** A zero looks
like a broken number. "No history yet" is a true statement about a job nobody
has run. This matters most for the very first thing a new person sees: on a
freshly set-up machine, before anyone has downloaded any market data, the whole
column reads honestly instead of looking like the product is broken.

**We resisted turning this into a data-quality dashboard.** After the last two
tasks there is a _lot_ we could report here — failed download attempts, thin
trading days, retry histories. All of that now lives in a separate command an
engineer runs. The person looking at this screen is choosing a company to
investigate, and the only thing they need to know is whether there is anything
to look at. Adding the rest would have buried the signal in engineering
vocabulary on the first page a new viewer meets.

**We also made sure it costs nothing to display.** Counting forty-seven million
rows to draw a list would have been slow in a way that gets blamed on something
else six months later. The page reads a small summary table the ingestion
process keeps up to date — a few hundred rows, however many billions of bars sit
behind them.

### Where this leaves the product

Epic 2's job is to get real market data into MarketPulse and prove it is there.
That is now visible rather than merely true. The next stories put this data to
work: **Story 2.9** opens the endpoint that serves actual price series,
**Story 2.11** makes the list searchable and clickable, and **Story 2.12** draws
the first price chart. Every one of those reads the same store this screen is
now reporting on — so if the chart in a fortnight's time looks wrong, this page
is where you check whether the data was ever there.

The screen is still honest about what it does not yet do. It says, in the region
heading, that prices, volume and charts arrive with the live market feed in Epic 3. That sentence has been there since the page was built, and it is still true.
