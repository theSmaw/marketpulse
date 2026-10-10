# Task 4.8.12 — `COMPUTED` is when the reader arrived, not when the data was true

**Status:** Complete — 2026-10-10
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.11

## Objective

**Added 2026-10-09 at the owner's decision. This is invariant 6, not a
performance repair.**

> **6. Market-data provenance is displayed, never implied.**

The landing page's source note draws `COMPUTED hh:mm` at **minute**
precision. The aggregate producer is **unmemoised** and the gateway reaches it
on **connect and on every subscribe** — so a cold load is answered with an
aggregate computed **now** over observations that may be hours old, and the
sentence a reader reads as _when this data was true_ is in fact **the minute
they opened the tab.**

**ADR 0038 anticipated the instant moving with no market data behind it** and
concluded only that it must never reach `feed-liveness.ts`. **Nobody wrote
down that it reaches a drawn sentence.**

## What the user can see when this lands

**On a dead feed, a landing page that says how old its figures are instead of
what time it is.** This is the first thing in Story 4.8 a reader can see at
all.

## Work

### The decision the owner took

**Derive the drawn instant from the observations the aggregate actually
contains** — a _data as of_ instant — rather than from when the join ran. The
three rejected alternatives are recorded with it: keeping `computedAt` and
removing the time from the sentence (defensible, and it deletes a fact the
reader wants); memoising the producer per batch (fixes the per-tab advance and
still implies currency between batches); and deferring to Story 4.7
(the story that photographs this screen with the feed stopped, which is exactly
the state the sentence is wrong in).

### What the instant must be derived from, and the trap in it

The aggregate's own entries carry the bar instants it was built from. **An
aggregate over zero observations has no such instant** — which is CI's
permanent state (518 securities, **zero bars**, every entry `unknown`, the
aggregate 928 bytes) and also a deployment with no provider configured. So the
clause renders **only when its own data is present**, which is ADR 0029's
defer rule: _a fully-formed provenance record about zero bars is a false
impression rather than a courtesy._ **Say nothing rather than say now.**

And the grain matters: the oldest observation, the newest, or both is a product
question with a one-line answer — **the newest, because the claim is _nothing
newer than this has reached us_**, and a span invites a reader to believe the
set is uniform when it is not. If the implementation finds a reason that is
wrong, raise it rather than deciding it.

### The boundaries

- **`computedAt` itself stays on the wire.** It is a real fact about the frame
  and ADR 0033's constraints bind it; what changes is **what the sentence
  draws**. It must still never reach `feed-liveness.ts` or either adapter —
  `pnpm invariants` holds that today and the check must stay green for the
  reason it was written, not by accident.
- **One fact, one home.** The drawn sentence and its spoken twin are one string
  with two renderings (ADR 0029), and a second copy fails the build.
- **The connection's word stays in the status bar.** This region says nothing
  about the connection, by a decision taken three times with measurements
  behind it; an age is not a verdict.

### What it owes

A **state grid**, because this is a provenance surface and the repo's rule is
that a claim about data requires data: the populated state, the
**zero-observation** state, a store with no bars, an aggregate whose newest
observation is hours old, and a deployment with no provider. **Produce them
through the shipped path** rather than furnishing a string, and compare by
**string rather than by eye** — `docs/GAPS.md` entry 13's own condition is
_the next story that publishes a state grid_, so this task either discharges
that for this surface or re-owns it with its reason.

## Done when

1. The drawn instant is derived from the observations the aggregate contains,
   and the clause **renders nothing** when there are none
2. A dead feed's landing page states an age that does not advance when a
   second tab opens — asserted, not reasoned
3. `computedAt` is still out of `feed-liveness.ts` and both adapters, and the
   invariant that holds it is still green **for its own reason**
4. The states are produced through the shipped path and compared by string,
   with the grid recorded
5. ADR 0038 and ADR 0029 carry dated amendments where this changes what they
   describe
6. `pnpm verify` and `pnpm e2e` green

## Handed here by Task 4.8.8 — 2026-10-09: the count your objective rests on is now mechanical, and so is the reason the per-tab advance exists

**Your objective says _the gateway reaches it on connect and on every
subscribe_. That is a count of three paths, it has been verified off the wire
(Task 4.8.3: a cold `/` receives three `overview` frames and pays three joins),
and since 2026-10-09 it is held by a check rather than by a sentence.**
`pnpm invariants`' **`the-aggregate-has-three-producer-paths`** refuses a
fourth path to `overviewMessage()` in `market-gateway.ts` — break
**`a-fourth-path-to-the-aggregate`**, which was produced against the shipped
tree first and reported `50 invariants hold.` before the check existed.

**Why that matters to you specifically.** Your defect is _`COMPUTED hh:mm` is
the minute the reader opened the tab_, and the mechanism is two of those three
paths running a fresh unmemoised join per connect and per subscribe. **The
count is therefore the defect's cause, and it is now something a future reader
can neither lose nor quietly change**: a fourth path would be a fourth minute a
tab could be told, and the check makes that a decision rather than a discovery.

**And one thing to be careful of in the rejected alternatives.** _Memoising the
producer per batch_ — the alternative the task records and declines — would
leave both `the-aggregate-has-three-producer-paths` and
`one-producer-of-the-overview-aggregate` **green**, because neither counts how
many times the join actually runs; they count paths and call sites. The decision
you took (derive the drawn instant from the observations the aggregate contains)
is the one that puts the fact where a check can reach it. **Nothing mechanical
currently holds _how many joins a connect pays_** — if the close wants that
guarded, it is a `docs/GAPS.md` entry rather than a grep, because the answer is
a runtime count off the wire.

## Handed here by Task 4.8.11 — 2026-10-10: the per-batch path is now guarded, your defect is in the path that is NOT, and the guard is explicitly not a memo

**Three things, and the first is the one that could be misread as your task
being half-done.**

**1. `publishObservations` now returns early on `clients.size === 0`, and that
does NOT touch your defect.** The per-batch path runs the join — and therefore
advances `computedAt` — only when a browser is attached. Your subject is the
**snapshot path**: `sendSnapshot()` on connect and on every readable
`subscribe`, which is **deliberately unchanged**, because those joins have a
reader by construction and memoising them is a different decision with more
surface (recorded as such in ADR 0038's 2026-10-10 amendment and in the code
comment). So your Done-when 2 — _an age that does not advance when a second tab
opens_ — is entirely in the path this task left alone. **Three joins per cold
load of `/` still run, still unmemoised, still stamping `computedAt` with the
minute the tab opened.**

**2. The guard is not a cache, and the one rejected alternative you already
recorded is still rejected.** Your objective lists _memoising the producer per
batch_ among the three rejected options. Nothing here memoises anything: the
aggregate is still computed from current state every time it is sent, and the
guard only decides **whether to send at all**. If you find yourself writing
"the producer is now memoised", that is wrong.

**3. It SHARPENS your premise rather than weakening it, and here is the case to
put in your state grid.** On an idle deployment the aggregate is now **not
recomputed between batches at all** while nobody is attached — so the first
frame a browser receives after an idle stretch carries `computedAt` = the
instant that browser connected, over observations that may be **hours** old,
with no intervening recomputation to make the gap look smaller. The state your
grid most needs is therefore _the first tab opened on a long-idle deployment
whose store holds old observations_, and it is now reachable without waiting for
a feed to die mid-session: start the pair with no provider against a store that
holds bars, open `/`, and read the sentence.

**And one figure you should not carry forward.** The cost of the per-batch join
was re-measured on 2026-10-10 at **1.521 ms** p50 with zero clients (n = 298,
tight, calibrator reference 1.217 ms), not Task 4.8.3's 3.708 ms — 4.8.7's
`marketDateAt` repair landed between the two. If your task prices anything per
join, re-measure rather than subtract; 4.8.3's **3.72 ms** and the **11.2 ms**
per cold load of `/` derived from it are both pre-4.8.7 figures.

---

# What was done — 2026-10-10

## The sentence, before and after, on the same page and the same store

Produced by loading the running pair's `/` in Chromium and reading the note's
`innerText`. The store is a developer's: 518 securities, bars, **no provider
configured**, newest close the **2026-09-11** session. The page was opened at
**09:42 on 2026-10-10 local**, which is `21:42 Oct 9 EDT`.

**Before** — the shipped tree with this task's one edit reverted:

```
CLOSING PRICES  All US exchanges
COMPUTED        Oct 9 · 21:42 EDT
```

**After:**

```
CLOSING PRICES  All US exchanges
```

The instant in the first block is not a fact about any figure on the screen. It
is the minute the page was opened, printed under a term a reader takes as a
statement about the four closes above it, which are **four weeks old**. That is
the whole of the defect and it is why the repair's visible half, on every store
with no live feed, is a line **going away**.

## What it draws, in each state, verbatim

| Producer state                                          | Drawn                                                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A session running, the chrome naming IEX                | `CLOSING PRICES All US exchanges Every change above is measured from one of these. OBSERVED THROUGH Sep 25 · 14:01 EDT` |
| The same screen hours later, nothing heard from since   | `CLOSING PRICES All US exchanges Every change above is measured from one of these. OBSERVED THROUGH Sep 25 · 14:01 EDT` |
| A store with bars, no provider configured               | `CLOSING PRICES All US exchanges`                                                                                       |
| CI's store: 518 securities and zero bars                | _(nothing drawn)_                                                                                                       |
| A rollback: a gateway that sends no observation instant | `CLOSING PRICES All US exchanges Every change above is measured from one of these.`                                     |

Rows 1 and 2 are **the same string**, and that is the repair: the two frames
differ only in `computedAt` — `18:02:03Z` against `21:44:11Z` — which is what a
second cold load of `/` genuinely produces, because the gateway runs the join
on every connect.

## How the grid was produced, and why it is a test rather than a table

`e2e/specs/overview-source-note.spec.ts`. Each row is **produced** through the
shipped socket path — the shipped encoder, the gateway's own connect sequence
(a structurally empty snapshot, then the unscoped aggregate), the shipped
decoder, the shipped renderer — and read back as the string a reader is given.
The spec `console.log`s the grid, so the table above is the run's own output
rather than a transcription. Compared **by string**, never by eye.

The rows are enumerated from the **producers**: what a deployment can be in.
That is `docs/GAPS.md` entry 13's re-measure in its second direction, and it is
what put the last row in — a new bundle meeting a gateway from a pinned
previous image sends no `observedAt` at all, which is a reachable pair nothing
had named.

Verbatim:

```
Running 2 tests using 1 worker

  ✓  1 [chromium] › e2e/specs/overview-source-note.spec.ts:211:1 › the drawn instant is the data's, and it does not advance with a tab (2.2s)
a session running, the chrome naming IEX
    CLOSING PRICES All US exchanges Every change above is measured from one of these. OBSERVED THROUGH Sep 25 · 14:01 EDT
the same screen hours later, nothing heard from since
    CLOSING PRICES All US exchanges Every change above is measured from one of these. OBSERVED THROUGH Sep 25 · 14:01 EDT
a store with bars, no provider configured
    CLOSING PRICES All US exchanges
CI's store: 518 securities and zero bars
    (nothing drawn)
a rollback: a gateway that sends no observation instant
    CLOSING PRICES All US exchanges Every change above is measured from one of these.
  ✓  2 [chromium] › e2e/specs/overview-source-note.spec.ts:247:1 › the states, produced and compared as strings (7.5s)

  2 passed (10.5s)
```

## The mechanism

**The instant is derived on the server, over the join's whole answer, and
travels as a new frame field.**

- `newestObservedAt(entries)` in `apps/backend/src/market-overview.ts` — a pure
  fold over the join's 518 entries, taking the **newest** `bar.startsAt`,
  skipping a non-finite instant (`Math.max` with one `NaN` is `NaN`, and
  `new Date(NaN).toISOString()` **throws**, inside the socket's own callback),
  and answering `undefined` for a set with no observation.
- `WireMarketOverviewInputs.entries` is a **new required input**, so a producer
  cannot build a frame without handing over the set the instant is about —
  `breadth`'s and `movers`' mechanism. The one call site in `index.ts` passes
  the array it slices the three sections out of.
- `WireMarketOverview.observedAt?: string` — spread in a branch by the encoder
  (`toWire` walks the map's keys, so a key in `overviewFields` is a key on the
  wire whatever it holds), read back as a string or as the same absence.
- The note's clause is `observedThroughClause`, which returns `null` when the
  field is absent. **No second guard over `figures`** — see below.

### Why the whole join and not the frame's own figures

A fold in the browser over `overview.figures` was the obvious cheaper option
and it is wrong in two directions at once. The sections on the frame are
**selections** — four proxies, eleven benchmarks, the top five either way —
while `Market breadth`'s counts and the movers' denominator are computed over
503 equities whose own instants never travel. So a browser-side fold is older
than the truth, and it is **absent altogether** on a frame whose four proxies
are yesterday's closes while five hundred equities are live, which is the
ordinary state of IEX. That is the mirror image of `closesClause`'s own
recorded defect: _a note that checked only the first would go silent during a
session_.

It is also why there is **no second guard over `figures`** in the clause. The
absence of `observedAt` is the defer, decided at the producer, which is the one
place that can see the whole set.

### The grain

**The newest**, as the brief decided, and the implementation found no reason it
is wrong. The claim one instant can make about a set is _nothing newer than
this has reached us_. The per-figure exception already exists and is already
drawn: every tile carries its own instant, and `MarketProxyStrip`'s shared line
notes any cell behind it (`from 12:07`). An outer claim with inner exceptions
is this product's shipped idiom — the universe table's heading and its rows —
and the outer claim is never older than an inner one.

Note the consequence worth knowing before designing against it: the strip's
shared line is the newest of **four** and the note's is the newest of **518**,
so the two can differ by a minute and the note's is the later. They are nested
claims, not a contradiction, and the inner one is the exception.

### What it costs on the wire

**40 bytes a frame, measured** — `,"observedAt":"2026-09-25T18:01:00.000Z"`,
against `sentAt`'s 36 (ADR 0033). One per **frame**, never one per security,
which is ADR 0033's fourth constraint and the reason the field is on the
aggregate rather than on a figure: every figure already carries its own `at`.

And it is **zero** in the state that matters for CI's published sizes: an
aggregate over zero observations omits the field, so the 928-byte CI frame is
928 bytes still.

### The word

`Observed through`, and `Computed` is retired. Keeping the term over a
different value is the one change that would have made the repair invisible.
`As of` was rejected as vague about _of what_ on a note whose other two terms
name their subject. `Observed through` names the subject and the grain, is
parallel to the note's own `Observed prices`, and is the status bar's idiom for
the same kind of fact (`Showing data through …`) — a shared spelling rather
than a second home: that cell states it about **this browser's** subscriptions
and only when the feed is degraded, and it is the surface that owns the
connection word. There is no threshold, no status and no connection word here.
An age is not a verdict.

## `computedAt` is still on the wire, and still out of the liveness rule

It is a real fact about the frame and ADR 0033's constraints bind it. It is
still read by `market-proxies.ts`, which asks the trading calendar about the
instant the join ran — the one remaining shipped reader — and by nothing that
draws a sentence. `the-send-instant-is-not-a-clock` is **untouched** and still
green for its own reason: `pnpm invariants` reports `52 invariants hold.`, and
`pnpm break the-aggregate-instant-becomes-a-clock` still names it.

`observedAt` was deliberately **not** added to that check's list. It is
`startsAt`'s family — a fact about the market — and it is the field a staleness
rule over the aggregate would legitimately be built on. Widening that list
would have made it green here for a reason it was not written for, which is
this repository's named way of losing a guard. Story 4.7 owns whether such a
rule exists, and the constraint is written into its `STORY.md`.

## The check, and the transcript of it passing wrongly

**`the-overview-note-dates-an-observation`** — two conjuncts over
`overview-source-note.ts`, read through `withoutComments` because the argument
for the repair discusses `computedAt` at length in that file's own prose:

1. the word `computedAt` does not appear in the code;
2. **every `Date.parse` in the file names `observedAt`** — the clause a
   re-implementer cannot avoid writing, since drawing an instant off this frame
   means parsing one.

Four defects were written and run against it, which is `CLAUDE.md`'s 2026-09-26
procedure:

| Defect                                                     | Verdict                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| (a) the literal revert — `Date.parse(overview.computedAt)` | red, _does not read `observedAt` at all_                                    |
| (b) a destructure — `const { computedAt } = overview`      | red, _reads `computedAt`_                                                   |
| (c) the instant arrives as a defaulted parameter           | red, _reads `computedAt`_                                                   |
| (d) the browser folds the instant off `overview.figures`   | red, _parses `figure.at`, which is not the aggregate's observation instant_ |

**And the transcript this procedure exists for.** Defect (d) names `computedAt`
nowhere, so the first conjunct alone is green on it. Run against a copy of the
check with the second conjunct removed and the defect in the file:

```
$ node scripts/check-invariants.mjs
52 invariants hold.
```

That is the check passing wrongly on the alternative this task rejected. Both
halves were then restored and the same defect reports:

```
  ✗ the-overview-note-dates-an-observation
    apps/frontend/src/components/OverviewSourceNote/overview-source-note.ts parses `figure.at`, which is not the aggregate's observation instant. …
```

**Two breaks**, because the conjuncts fail differently —
`the-send-instant-is-not-a-clock`'s pair is the precedent:

```
$ pnpm break the-overview-note-dates-the-arithmetic
✓ apps/frontend/src/components/OverviewSourceNote/overview-source-note.ts broken → red → restored byte-identical.
  matched: reads `computedAt`

$ pnpm break the-overview-note-folds-the-instant-in-the-browser
✓ apps/frontend/src/components/OverviewSourceNote/overview-source-note.ts broken → red → restored byte-identical.
  matched: is not the aggregate's observation instant
```

`"Observed through"` was also added to
`one-provenance-note-on-the-landing-route`'s term list, which asserts each of
the note's terms is written in exactly one shipped file. `Computed` never was
in that list and could not be: it is a word half the product may legitimately
use. The new one names a subject.

## Done when

1. **Yes** — the drawn instant is `observedAt`, folded from the join's whole
   answer, and the clause renders nothing when the field is absent.
2. **Yes, asserted at three levels.** The producer (`market-overview.test.ts`:
   two joins over one set of observations differ in `computedAt` and agree in
   `observedAt`); the gateway, over a real socket
   (`market-gateway.process.test.ts`: two browsers connect 20 ms apart and the
   second frame's `computedAt` differs while its `observedAt` does not); and
   the browser (`overview-source-note.spec.ts`: two loads of `/` draw the same
   string). What **no** level reaches is the three-joins-per-cold-load figure
   itself, which Task 4.8.3 counted off the wire and nothing guards.
3. **Yes** — unchanged, green, and its break still lands.
4. **Yes** — see the grid above.
5. **Yes** — ADR 0038's `computedAt` consequence and ADR 0029 both carry dated
   amendments. ADR 0029's is the interesting one: this is the first clause
   whose own data was a **process fact wearing a market fact's clothes**, so it
   could never be absent, and decision 1's test — _is this clause's data
   present_ — passed on it for a fortnight.
6. See the gates below.

## What falsified a document

- **ADR 0038's `computedAt` consequence** was right and incomplete: it named
  the one place the instant must not go and did not say that it had already
  reached a drawn sentence. Amended, with the before/after quoted.
- **ADR 0029 decision 1**, as above — amended rather than rewritten.
- **`overview-source-note.ts`'s own docblock** carried, since 2026-10-09, the
  sentence _"Choosing between a per-frame instant and a `data as of` instant is
  a product decision and is not taken here."_ It is taken now and the docblock
  is rewritten around it.
- **Four stale comments** elsewhere said the aggregate's instant is _drawn by
  `OverviewSourceNote` under `Computed`_ — in `market-breadth.ts`,
  `movers.ts`, `market-breadth.test.ts`, `BreadthLedger.test.tsx` and
  `overview-breadth-region.spec.ts`. All five amended in this change, because
  recording a correction and propagating it are two obligations.
- **`live-feed.ts`'s `overview` docblock** said _"a surface that wants to date
  these figures reads it"_ about `computedAt`. False as of today; amended, and
  it now names both instants and the difference.
- **Nothing in `CLAUDE.md`** is falsified. Its _Current state_ section
  describes the landing page's source note as naming both tapes, which is
  unchanged; it does not quote the `COMPUTED` line.

## What this changes for its siblings

Written into their own files rather than linked, because a pointer is what a
reader follows when they already know to look.

- **Story 4.7** (`STORY.md`): the degraded set must photograph the new sentence
  and not `COMPUTED`; the landing page states an **age and not a verdict**, by
  the same decision Story 3.10 took three times, so saying the feed has stopped
  there is a reversal rather than a fix; and `observedAt` is now the honest
  input to a staleness rule over the aggregate, deliberately left outside
  `the-send-instant-is-not-a-clock` so that nothing stands in the way of 4.7
  deciding to use it.
- **Task 4.8.9** (`TASK-09`): a fourth browser spec exists, it loads `/` five
  times in one test, and it has no flake history — a new spec's first red is
  the one most likely to be mistaken for a regression in the branch it lands
  beside.
- **Task 4.8.10** (`TASK-10`): the invariant count is 52; the new check and its
  two breaks; `the-send-instant-is-not-a-clock` now guards **two of the wire's
  three instants** and the third is uncovered on purpose; and a sweep nobody
  has run — what else in `apps/frontend/src` draws a process clock.

## Gates

### `pnpm verify` — green, read as output rather than as an exit code

```
42 components, 42 stories files.
515 documents, 1705 cross-file links, 39 anchor links, 0 broken.
52 invariants hold.
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
packages/shared test:  Test Files  22 passed (22)      Tests   440 passed (440)
apps/backend test:     Test Files  50 passed (50)      Tests  1031 passed (1031)
apps/frontend test:    Test Files  86 passed (86)      Tests  1396 passed (1396)
apps/backend test:process:  Test Files 2 passed (2)    Tests    44 passed (44)
```

**No `Unhandled Errors` block in any of the four runs** — grepped for, because
an unhandled error is not a failed assertion and a run can still exit 0.

The **first** `pnpm verify` of this change failed, at lint, and is recorded
because the exit code was not what said so: two
`@typescript-eslint/no-unnecessary-condition` errors in the new browser spec
(`term.textContent?.trim() ?? ""` — `textContent` on an element is `string` in
the e2e DOM lib, not `string | null`). Repaired and re-run.

`pnpm test:database` was **not** run: this change touches no SQL, no schema,
no migration and no repository.

### `pnpm e2e` — the new spec passed every time; the suite did not come back clean, and the cause is measured rather than argued

**Three full runs, three disjoint failure sets, none of them in this change's
blast radius and none of them on `/`:**

| Run | Result                        | Failed                                                                                                                                                      |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `4 failed, 228 passed (5.4m)` | `securities-route` axe at 1280x560; `security-explorer-shell` axe at 1440 and 1024; `security-holiday-week` listener — **all four 30 s timeouts**           |
| 2   | `3 failed, 230 passed (6.2m)` | `securities-route` axe with no close; `security-price-chart` volume alt text — **timeouts**; `security-price-chart` two crosshairs — `element(s) not found` |
| 3   | `1 failed, 231 passed (4.8m)` | `security-window-control` readout at desktop — `element(s) not found`                                                                                       |

`e2e/specs/overview-source-note.spec.ts` passed in **all three**, at 2.2–4.2 s
and 7.1–7.5 s.

**Every failure passes when re-run scoped**, on the same checkout, minutes
later: the run-1 set 9/9 in 7–12 s each (against 37–50 s before timing out),
the run-2 set 2 passed 1 skipped, the run-3 spec 15/15 in 28 s.

**And the machine is the explanation, measured.** `uptime` during the runs
read a load average of **34.28**, against `scripts/overview-instrument.mjs`'s
own `LOAD_CEILING = 1.0`; the largest consumer is a Virtualization.framework
VM at 86.7% CPU with a Citrix session beside it, neither of them this
repository's. The specs that fail are the slow ones — axe over the 518-row
universe table is 10k nodes and takes 19–50 s against a 30 s test timeout.

**This is reported rather than claimed green.** The repository's own rule
is that `n = 6` cannot separate a 12% flake from a regression, and three runs
is fewer; what three runs _can_ establish is that the failing sets are
**disjoint**, which a regression's would not be, and that the one spec this
task added passed in all of them. Task 4.8.9 owns characterising browser
flakes on a settled machine, and the three sets above are handed to it in its
own file.
