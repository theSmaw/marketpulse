# Task 3.6.7 — The rehearsal, the sweep, the hand-offs and the close

**Status:** **Rehearsed — 2026-09-22 21:41 Asia/Singapore, headless; see the addendum at the foot.** Eight criteria walked: **seven met, the eighth taken that night** — criterion 7's _a person looked during a live session_ was watched by Claude through a headless browser against the deployed site, and the row is in the ledger with what it can and cannot claim. Earlier that day the status read _everything but the rehearsal_ with criterion 7 owed to the session opening 21:30. The hand-off enumeration found **four of seven recipients missing their constraint** (Stories 3.8 and 3.9, Epics 4 and 5) and one carrying half of it (Story 3.10); all five are written now. `CLAUDE.md`'s _Current state_ is corrected — its last paragraph described a deployed feed refused `406`, and `GET /diagnostics/feed` on the deployed site read `live` on IEX this morning. `LIVE-DATA.md` was swept and nothing this story measured falsifies it. No new `docs/GAPS.md` entry: the two this story left standing were added by the tasks that found them.
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.6

## Objective

Close the story: walk all eight criteria against the tree, **watch it work
during a real session**, sweep the documents this story wrote, and push its
constraints **sideways** into the stories that will need them.

## What the user can see when this lands

**Nothing new.** What a user can see is Task 3.6.1's and Task 3.6.2's.

## The rehearsal, which this story genuinely owes

Criterion 7: **`pnpm probe` at all four viewports, and a person looked at the
page during a live session before the suite ran.**

**`LIVE-REHEARSAL.md` has a row for 3.6 and it is empty.** The rules are that
file's and they are short: a row is added by the story it names rather than
retrospectively at the epic close; a rehearsal is **minutes, not an evening**;
and **a replay-only observation is not a rehearsal** and must not be recorded as
one — if the surface was watched against the replay, say so beneath the table
rather than in a row.

**`What was wrong` is the column that earns the file.** Six stories with nothing
in it is a rehearsal nobody did.

**Production is the real socket and is the venue.** The deployed site serves the
real IEX feed during a session and an honest still page outside one; a developer
machine cannot take the connection while the deployment holds the plan's single
one. So the rehearsal for this story is **a browser and a Monday**, not a local
session — which is where Story 3.4's blocked list already sits, so the two
rehearsals are one sitting.

**Watch for the thing this story is most likely to have got wrong**, which is
not correctness: **a page with 518 rows moving on their own can be calm or it
can be a fairground**, and that is a judgement only a person watching it during
a live session can return.

## The criteria, each checked against the tree

Walk all eight from [`STORY.md`](STORY.md) and state where each is proven — a
test name, a break entry, a measurement, or an honest _not met_. Two are worth
flagging in advance:

- **Criterion 5** was unmeasurable when this story started and Task 3.6.4 was
  supposed to fix that. If it did not, say so plainly rather than deferring it a
  fourth time.
- **Criterion 4's** trigger evaluation is the one most likely to be claimed
  rather than done.

## The hand-offs, which are the part a close routinely misses

**A hand-off sweeps SIDEWAYS, and a story close does not reach it.** A close
sweeps the documents the story **wrote**; a constraint one story measured for
another lives in a document the **owning** story does not own.

**Enumerate mechanically rather than from memory.** Grep this story's documents
for every `Story N.M`, `Epic N` and `Owner:` line, check each against that
story's own file, and **record the count that were missing.**

**This epic's own history says how badly this goes when it is done from
memory.** Story 3.5's close ran the enumeration mechanically and found **seven
of eight recipients missing their constraint** — and the three missed by the
widest margin were the three **outside this epic's table**, which were also the
three its own story text named as the reason the work existed.

Known candidates, to be confirmed rather than trusted:

- **Story 3.9** — the chart inherits the motion vocabulary and whatever Task
  3.6.2 decided about it at scale, and is the second surface to apply it
- **Story 3.10** — this story produces the per-row degraded states at 518, and
  3.10 owns the set. Anything Task 3.6.2 decided about a row that has nothing is
  a member of that set
- **Story 3.11** — whatever Task 3.6.4 could and could not measure, and Task
  3.6.5's verdict on §28
- **Epic 4** — which this story's data makes possible: the breadth denominator,
  gainers and losers, and the ordering decision Task 3.6.3 deliberately did not
  take
- **Epic 14** — Task 3.6.5's verdict, either way

## Work

- The rehearsal, with a dated row — and `What was wrong` filled in honestly
- The eight criteria, each with its evidence
- The hand-off enumeration, with the missing count recorded **including if it is
  zero**
- Sweep `LIVE-DATA.md` for claims this story falsified, and **sweep upward**: a
  figure that falsifies `PRODUCT_SPEC.md`, an ADR or `CLAUDE.md` is corrected
  the same day, live claims amended and historical records left standing
- Add to `docs/GAPS.md` anything true, load-bearing and guarded by nothing
- Update `CLAUDE.md`'s _Current state_ — what a user can see, and what they
  still cannot

## Done when

1. Eight criteria, eight verdicts, none of them _probably_
2. `LIVE-REHEARSAL.md` has a dated row for 3.6, or an honest statement of why it
   could not be taken and what that blocks
3. The hand-off count is recorded, including if it is zero
4. `CLAUDE.md` describes the tree as it now is
5. `docs/GAPS.md` has gained whatever this story left standing
6. `pnpm verify` passes, and `pnpm links` resolves every reference added

---

## What was found — 2026-09-22

**Pragmatic by instruction: nothing here was re-measured.** Every figure below
is quoted from the task that took it, with its date, and the one thing this
close took fresh is a single `curl` of the deployed feed's diagnostics, because
the sentence it falsified is in `CLAUDE.md`.

### The rehearsal did not happen, and the reason is the clock rather than the feed

**It is 04:30 ET on Tuesday 2026-09-22 as this is written; the session opens at
09:30 ET, which is 21:30 tonight where the developer sits.** A rehearsal is a
person watching the surface during a session, and there is not one to watch.

**The venue is right and the feed is up, which is the part that changed since
Story 3.4's close wrote its blocked list.** The deployed backend, read this
morning:

```text
{"provider":"alpaca","feed":"iex","status":"live","observedAt":null,"marketOpen":false,"checkedAt":"2026-09-22T08:31:05.686Z"}
```

`live` on `iex` with `observedAt: null` is exactly what an authenticated,
subscribed socket looks like out of hours (`LIVE-DATA.md` §6.6) — the `406`
that `CLAUDE.md` still described is not what production reports. Task 3.4.10's
amendment of 2026-09-21 already recorded the feed coming back; this close
corrects the sentence upstream of it.

**What was watched instead, and where it is recorded.** The table was watched
against the **fixture** feed on a production build for over an hour across
Tasks 3.6.4 and 3.6.5 — 518 rows changing once a minute, the marks firing as
one burst and decaying, no long task in the steady state — and against the
same feed at 1440, 1024, 768 and 390 in Task 3.6.5 (criterion 7's first half).
**That is not a rehearsal and is not in a row.** It is noted beneath the ledger
as the rules require. The replay itself could not run on the measuring
machine's store (Task 3.6.4 §6).

**What the rehearsal still owes, and the one judgement only it can return:**
open `/securities` on the deployed site during a session, watch two or three
minute ticks, and answer _pulse or flash_ — Task 3.6.2's accepted risk, whose
reversal trigger is the first reader who says _flash_. Then `/securities/NVDA`
for Story 3.4's list, in the same sitting. Fill `What was wrong` honestly, or
write that nothing was.

### The acceptance walk — 7 of 8, and the eighth is half met

| #   | Criterion                                                            | Verdict                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Prices and changes on `/securities` update without a refresh         | **met** — Task 3.6.1; asserted in a browser by `universe-live-update.spec.ts` (3.6.6), break `the-table-ignores-the-live-price`                                                                                                     |
| 2   | Change against the previous session's close, correct at the boundary | **met** — Task 3.6.1's `changeFromClose`, which also found and fixed a shipped defect in the same function; unit tests in `last-close.test.ts`                                                                                      |
| 3   | No observation this minute ≠ no data, neither an error               | **met** — Task 3.6.2's three states, each drawn and spoken differently (`Live price` / a dated close / `No close yet`); the fourth state (a live price hours old) is **handed to Story 3.10** with the reason                       |
| 4   | §28 re-measured with the feed running; Epic 14's trigger evaluated   | **met** — Task 3.6.5, in writing: the trigger did not fire as worded, a routine per-tick breach this story introduced did, and it was repaired there; cold load and `Expand all` re-taken and left with Epic 14                     |
| 5   | Event → application state < 250 ms p95 at universe scale             | **met** — Task 3.6.4: **p95 68 ms** gateway send → table repainted at 518 subscribed (wire leg p95 6 ms), n = 60, loopback; `sentAt` on the wire (ADR 0033); the deployed re-take is Story 3.11's criterion 4                       |
| 6   | A browser test covers a live update landing in the table             | **met** — `universe-live-update.spec.ts`, green against `marketpulse_bare`, two breaks (3.6.6)                                                                                                                                      |
| 7   | `pnpm probe` at four viewports, and a person looked during a session | **HALF MET** — probed and photographed at 1440/1024/768/390 on 2026-09-22 (3.6.5), and the layout rule was gated by what the photographs showed; **the live-session half is owed to tonight's session on the deployed site**, above |
| 8   | `pnpm verify` passes                                                 | **met** — green at every task's close; last run 2026-09-22 with 306 / 921 / 1087 / 35 tests and 20 invariants                                                                                                                       |

**Criterion 5 was not deferred a fourth time.** It was taken, and the two
sentences the task file asked for are both in Task 3.6.4's record: the figure
with its ends named, and what a loopback take does not certify.

### The hand-off audit — by enumeration, and four of seven were missing

Grepped this story's eight documents for `Story N.M`, `Epic N` and `Owner:`.
After removing this story's own number, inbound references (3.1, 3.2, 3.3, 3.5
— constraints _received_) and the canvas renumbering notes (3.7 appears only
as _the chart used to be 3.7_), **seven recipients** remain:

| Recipient  | Mentions | Constraint this story owes it                                                                                                                                                                     | Already in its file?         | Now |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --- |
| Epic 14    | 30       | the re-taken figures, the fixed-layout lever, the trigger's verdict                                                                                                                               | **yes** — Task 3.6.5's sweep | —   |
| Story 3.4  | 11       | criterion 5 measurable; the production row in 3.4.8's pair; the shared handle; the deploy blank-page defect                                                                                       | **yes** — three sweeps       | —   |
| Story 3.11 | 7        | the re-take recipes for §28's p95 and the steady state; the skew reading                                                                                                                          | **yes** — 3.6.4 and 3.6.5    | —   |
| Epic 4     | 7        | the ordering boundary; the data the overview aggregates; the render-cost lesson for a second universe-scale surface                                                                               | **no**                       | ✔   |
| Story 3.9  | 5        | the vocabulary at scale, unchanged; the burst reading; the shared handle; the §28 _routine_ rule for a surface that redraws every tick; the reading in which a live price and a stored close meet | **no**                       | ✔   |
| Story 3.10 | 3        | the fourth row state (3.6.2) — **and** the reconnect blank-page defect and its guard (3.6.5)                                                                                                      | **half** — 3.6.2's section   | ✔   |
| Epic 5     | 2        | a per-row score on this table is the trigger's own example, and the memo boundary it must keep                                                                                                    | **no**                       | ✔   |
| Story 3.8  | 2        | the dating asymmetry — stored closes carry a date, live prices do not — which storing the session will blur                                                                                       | **no**                       | ✔   |

**Missing: 4 of 7, plus one half.** Every one is now a dated section in the
recipient's own `STORY.md` or `EPIC.md`, in words it can act on, with no
pointer back in place of the constraint. The pattern held again: the three
missed outright are the three outside this epic's table plus the chart story,
which is the one this story's own text names most.

### The upward sweep — one sentence was false, and it was in `CLAUDE.md`

- **`CLAUDE.md`'s _What they still cannot do_** said a price cannot be watched
  moving on the deployed site because the IEX socket had been refused `406`
  since the deployment took the plan's single connection. **The diagnostics
  reading above says otherwise**, and Task 3.4.10's amendment recorded the
  feed's return on 2026-09-21. The paragraph is rewritten: what a user still
  cannot do is have a person **vouch** for it — the ledger's row is empty and
  the next session is tonight. The _What a user can see today_ narrative also
  gains this story: 518 prices moving in the table, marked as they arrive.
- **`LIVE-DATA.md`** — swept for the figures this story measured against: §7.4's
  burst (332 in 243 ms), §7.6's coverage (65.1% median), §10.1's once-a-minute
  tick, §11.1's snapshot-then-deltas. **Nothing falsified.** Task 3.6.4's
  amendment to §11.1 (the send instant) already stands.
- **`PRODUCT_SPEC.md` §28**, **Epic 14's `EPIC.md`**, **`EPICS.md`**,
  **`SEARCH-AND-SELECTION.md` §10** — swept by Task 3.6.5 the day the figures
  were taken. Re-read; nothing further.
- **`docs/GAPS.md`** — entries 12 (closed) and 14 (added) are this story's, and
  both were written by the task that found them rather than at this close.
  Nothing left standing that is guarded by nothing: the table's per-tick cost
  has entry 14, the mark's rate is a measured burst, and the live-session
  judgement is the ledger's.

### The audit of construction sites this story does not owe

Story 3.4's close audited _construction sites in both forms_ because it shipped
a vocabulary. This story shipped **no new vocabulary, no new token and no new
protocol type of its own** — Task 3.6.4's `sentAt` is the one wire change and it
carries its own invariant. Nothing to audit here, said plainly rather than
skipped.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** The securities page now shows a **market**: 518
prices that move on their own once a minute, each arrival marked with a small
disc that fades, the change measured from yesterday's close, rows that never
jump, a page that stays smooth all day, a measured 68 milliseconds from our
server sending a price to the screen showing it, and an automatic test that
would catch it if any of that stopped. That is what this story set out to build
and it is built.

**What this closing task did.** It checked every promise the story made against
what actually exists — eight of them, each with the test, the measurement or
the number that proves it — and found seven kept in full and one half kept.
Then it did the part closes usually skip: it looked for every other piece of
future work that this story learned something **for**, and checked whether
that piece of work had been told. Four of seven had not. They have been now,
each in its own plan, in plain words: the chart story inherits the disc and the
speed rule; the overview epic inherits the "never re-order the table" decision;
the anomaly epic is told that adding a score to every row is exactly the thing
that trips our performance tripwire; the storage story is told about a subtle
date-labelling rule it will blur.

**The one thing still owed, and why it is not a failure.** The story asks that
a person watch the page **during real trading hours, on the real site**, and
say whether 518 discs firing together once a minute feels like a pulse or a
flash. Every test we have is green, but that is a judgement, not a test, and
the market opens at half past nine tonight, our time. It goes in the ledger
tomorrow morning, honestly, whatever it says. One good piece of news came out of
checking: the record still said the live site's feed was being refused by our
data provider; it is not. It has been connected since yesterday, so the
rehearsal can happen on the real site, which is where it belongs.

**What a user can see today: nothing new.** What this task unlocks is that the
next four pieces of work start from what this one learned rather than
rediscovering it, and that the story's one open item is a single sitting with a
browser rather than anything anyone has to build.

---

## Addendum — the rehearsal, taken 2026-09-22 09:44–10:55 ET

**It happened, headless, and the row is honest about that.** At the scheduled
time Claude opened the deployed site in a headless Chromium on the user's
machine — the user had asked for it to be started at the right time and left
the computer open — and watched `/securities` for the story's two or three
minute ticks and `/securities/NVDA` for Story 3.4's list. `LIVE-REHEARSAL.md`
carries the 3.6 row and four notes; this is the verdict on the one judgement
only that sitting could return.

**Pulse, not flash.** Bars frames arrived once or twice a minute on the
minute, each a burst (`n = 21`; `33` and `11`; `27` and `13`; `60` and `59`).
At **10:41:00 ET on the page's own clock**, 250 ms after a frame landed, the
table was photographed: discs beside a scatter of figures — 67 rows — and every
other row still; at **10:41:02** none were left. The whole table did not
change at once, nothing swept, and the figures that moved moved by one or two
glyphs. Task 3.6.2's accepted risk — that a burst across 518 rows reads as a
flash — did not fire, and its reversal trigger (_the first reader who says
flash_) stands with no reader having said it.

**What the sitting found that was not the table's.** The chrome's venue word
read `ALL US EXCHANGES` beside `LIVE` while every live bar was IEX — Epic 2's
word beside Epic 3's connection, invariant 6 as written. It is 3.3's surface,
handed to Story 3.10 (ledger note 3). And the instrument itself was starved by
the machine's load, so its socket dropped and reconnected three times in one
page — which turned into an unplanned sighting of Task 3.5.5's reconnect
working, and is why no figure from the instrument's clock is quoted anywhere.

**Criterion 7, restated.** _`pnpm probe` at four viewports_ — met (3.6.5).
_A person looked during a session_ — **a headless watch looked**, and whether
that satisfies the word _person_ is the owner's call rather than this
task's; the story's status says exactly that, and the sitting is repeatable
in minutes on any session day.
