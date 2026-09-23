# Task 3.8.7 — The late revision the live path throws away

**Status:** **Complete — 2026-09-23.** `currentMarketState.observe` returns **two lists** now: `applied`, what is news, unchanged in meaning for the gateway; and `tracked`, what is true, which the writer takes. A revision for a superseded minute reaches the store, moves the numbers, and never the tape. The live path is unchanged and that is asserted rather than assumed. **One guard added after a demonstration**: handed a bar and its revision in one socket message, `toBarSeries` throws and the per-security catch costs that security **the bar as well as the revision** — demonstrated against the shipped writer. Whether the vendor sends that pair is **not established and the measurement points the other way** (a revision is four to five messages behind its bar), so it is a guard on a shape the types permit rather than a repair of a seen fault. One new invariant, three breaks proven, two of them re-anchored after this task moved their lines. The §14.1 count is owed and cannot be taken before the open.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

Story 3.5's close handed this story a defect that **only the store can fix**,
and stated the consequence of not fixing it in terms this task should not soften:

> A revision for a **superseded** minute is discarded by the live path entirely.
> §14.1 measured revisions at **0.064%** of bars, **35.3% of them changing the
> close** — so these are materially wrong numbers rather than noise. The only
> place they can be applied is the **store**.
>
> **If Story 3.8 does not apply them, this product's stored history is
> permanently and knowably wrong for a small fraction of bars — and nothing will
> ever report it**, because the frame that would have corrected it was dropped a
> story earlier.

## What the user can see when this lands

**Nothing.** A small number of stored prices stop being wrong.

## What makes it a task rather than a line

- **The live path's discard is correct and must stay.** Task 3.5.1 decided that
  `currentMarketState` ignores a revision for a minute already passed, because
  applying it would make the latest observation _older than the one it replaced_
  and every reader would watch the price jump backwards. **Do not "fix" that.**
  The case you inherit is specifically the **late** one — §14.1 measured
  revisions arriving **29.1–30.1 s** after their bar, usually inside the same
  minute and not always.
- **So the store needs a path the live surface does not have**, and the seam
  where the revision is dropped is in Story 3.5's code rather than yours. The
  first question is where the store learns about a revision at all: today the
  gateway broadcasts `currentMarketState.observe(...)`'s **return value**, which
  is deliberately the filtered list.

  **The seam has a shape now, added 2026-09-23 by Task 3.8.3**, and it is
  three lines in `index.ts`:

  ```ts
  const applied = currentMarketState.observe(observations);
  gateway.publishObservations(applied);
  void liveBarWriter.store(applied).then(…);
  ```

  So the writer is a **second consumer of the same filtered list** rather than
  of the raw one, and that was deliberate: 3.8.3 recorded that widening its
  input _would have taken this task's decision in passing_. The change you
  make is `store(applied)` → the raw list, or a second call carrying the
  revisions the filter dropped — and the reason it is yours is that `applied`
  is what makes the store and every open browser agree by construction. Say
  what replaces that guarantee.

  **Two warnings that cost real time in 3.8.3.** `the-live-stream-loses-its-consumer`
  is anchored on the first of those three lines, and its substitution has to
  **remove the `observe` call** rather than re-spell the broadcast — re-pointing
  it at `publishObservations` leaves `currentMarketState.observe(` on the line
  above, the invariant still passes and the break goes red for the wrong
  reason, which the harness says in as many words. And `live-bar-writer.ts`'s
  header states the applied-list rule twice; a change here that leaves it
  standing is a comment that has become false in the file it governs.

- **A correction moves the numbers and not the tape**, which is 3.7.3's rule and
  a compile-time one: `MarketBarsTable.feed`'s update type is `never`. A
  revision that arrives on the same tape is an ordinary correction; one that
  arrives on another is 3.8.1's decision.
- **A correction is now defined by the tape, and that is mechanical since
  `0011`.** The unique key covers `(security_id, timeframe, observed_at,
feed)`, so a revision arriving on the **same** tape conflicts and upserts —
  an ordinary correction — while one arriving on **another** tape is simply a
  different row. That is ADR 0035 rather than a special case for this task to
  invent, and it means the path you add has to carry the revision's own tape
  rather than assume the stored row's.
- **And take 3.8.2's lesson before you add a query.** Its writer's pre-read of
  _which minutes are already here_ was not scoped to the tape, so a genuine
  insert counted as a correction and the ledger silently under-reported. Any
  query you add that asks _does this bar already exist_ asks it **per tape**;
  `migrations/README.md` §9 carries the general form.
- **A revision to a SHADOWED tape changes nothing a reader can see, and that
  will look like a broken fix — added 2026-09-23 by Task 3.8.4.** Since that
  task a served minute is the **preferred** tape: where a consolidated bar
  exists it wins, and the IEX row beside it is stored but not served. Your
  revisions arrive on the **live** tape. So a late correction applied to a
  minute the backfill has already reconciled is written correctly, changes the
  stored row correctly, and is **invisible through `readSeries`** — because the
  reader is being served the other row.
  That is the system behaving as designed, and it is a trap for this task's
  tests: an assertion that reads the revision back through `readSeries` fails on
  a reconciled minute and passes on an unreconciled one, which looks like
  flakiness and is not. Assert through `readBars`, or on the row, or on a
  minute the consolidated tape has not reached — and say in the test which, and
  why. The value of applying it anyway is Epic 13's: replay reads the tape that
  was observable, and that is the row you are correcting.
- **`recorded_at` is the record that a correction happened** — it is the only
  signal, and `0004` argued it rather than an `updated_at`. The
  `is distinct from` clause on the writer's `on conflict` is what keeps it
  meaning that, and a revision that changes nothing must not move it.

## Work

- The path from a late revision to the store, without changing what the live
  surface does
- `market-bars.database.test.ts`: a revision for a superseded minute reaches the
  store and moves the numbers; one that changes nothing moves no row and no
  `recorded_at`; the tape does not move
- A `pnpm break` proving the revision is applied rather than dropped
- **Count them** over a real session if one is available, against §14.1's
  0.064% — a figure this product has never taken from its own store
- `LIVE-SESSION.md` §on corrections

## Done when

1. A revision for a superseded minute is applied to the store, proved in
   `pnpm test:database`
2. The live path's behaviour is unchanged, and that is asserted rather than
   assumed
3. `pnpm verify` and `pnpm test:database` pass

## What was done — 2026-09-23

### The seam: one batch, two lists, two owners

`currentMarketState.observe` applies **two** filters and returned **one** list
that both readers took. That is right for the gateway and wrong for the store,
and the difference is which filter each reader is entitled to:

- **The universe gate is everyone's.** A symbol outside the tracked universe has
  no `securities` row, so the store could not write it if it tried. Neither list
  carries one.
- **The supersede rule is the live surface's alone.** Dropping a revision for a
  minute already passed is a statement about what is **news about now**, not
  about what is **true**, and the store's subject is the second one.

So `observe` returns `ObservedBatch { applied, tracked }`. The gateway takes
`applied`; the writer takes `tracked`. Making it a **shape change rather than a
second method** was deliberate: it is a compile error at every call site, so the
decision has to be seen rather than defaulted into.

**What replaces the guarantee, which the task asked for by name.** Task 3.5.2's
rule was that broadcasting the return value makes the store and every browser
agree _by construction_. That is **narrowed, not withdrawn**: they still agree
about the **latest observation** of every security, because `applied` is still
the only thing broadcast, and they now deliberately differ about **past**
minutes, where the store is right. That is the product's own model — a live
surface reports what is news; the record reports what was true.

### The defect this found rather than the one it was sent for

**One batch is one socket message.** `observationsIn` flat-maps every
observation frame in a message into a single `onObservations` call, so a bar and
its revision for the same minute can arrive **together**. Reproduced against the
shipped writer before anything was changed:

```text
warn: live bars refused by the store
      Bars must be strictly ascending by startsAt, but bar 1 starts at …13:30:00.000Z
recordSeries calls: []   inserted: 0
```

`toBarSeries` throws on two bars stamped alike, the writer's per-security catch
turns it into a refusal, and **the security loses the bar as well as the
revision** — silently, to a `warn` line.

`seriesFor` now collapses a batch to one observation per instant, **last
winning**, because within one batch that is what a revision _is_: frames arrive
in the order the vendor sent them. It is the rule the store already applies
across batches through `on conflict`, moved to before the series is built —
`toBarSeries` will not hold two bars on one instant long enough for the store to
decide.

**Corrected the same day, and it is the third time this session the stated
reachability was wider than the evidence.** The paragraph above said such a
batch _can_ arrive. That is true of the **types** and is not supported by the
**measurement**: `LIVE-DATA.md` §14.1 put revisions **29.1–30.1 s** after their
bar and §9.5 put the vendor at **8.8 messages/min** at the open — so a revision
is **four to five messages** behind its bar, and the recorded `b` and `u`
fixtures are two separate messages. Nothing observed has ever carried the pair.

So this is a **guard on a shape the types permit** rather than a repair of a
defect anybody has met. It stays, because it costs one `Map` and the failure it
prevents is silent and expensive — the security loses a real bar, not just a
revision. But it is not evidence of a live fault, and the record should not
read as though it were.

### What the store does with a correction

| behaviour                                                   | assertion                                      |
| ----------------------------------------------------------- | ---------------------------------------------- |
| a revision for a minute the live path moved past is applied | `corrected: 1`, `inserted: 0`, the close moves |
| a revision that changes nothing moves no row                | `unchanged: 1`, `recorded_at` identical        |
| a correction moves the numbers and never the tape           | the row keeps `iex`                            |

The second is the one that keeps `recorded_at` meaning what `0004` argued it
means — the record that a correction **happened** — and the `is distinct from`
clause on the writer's `on conflict` is the mechanism.

### The trap Task 3.8.4 left here, asserted rather than met

A served minute is the **preferred** tape and revisions arrive on the **live**
one, so a correction to a reconciled minute is written correctly and is
**invisible through `readSeries`**. A test reading it back that way would fail
on a reconciled minute and pass on an unreconciled one — flakiness that is not
flakiness. The suite asserts **both halves**, the consolidated close through
`readSeries` and the corrected live close through `readBars`, and says which and
why. The value of applying it anyway is Epic 13's: replay reads the tape that
was observable, and that is the row being corrected.

### Two breaks rotted on this change, and one new invariant

`index.ts` is the process, so no runner instruments it and this wiring is at 0%
coverage by construction. It is held by a grep —
**`the-store-takes-what-is-true-not-what-is-news`**, asserting both halves — with
`pnpm break the-store-is-told-only-what-is-news` proving the red.

Two existing breaks stopped landing and `every-break-can-still-land` said so:

- **`the-live-stream-loses-its-consumer`, re-anchored a THIRD time.** That line
  keeps being the one a task changes, because it is where the stream meets
  everything downstream. 3.5.2 wrote it, 3.8.3 split it, 3.8.7 renamed the
  binding for two lists.
- **`the-current-state-holds-an-untracked-security`**, because this task
  renamed the local universe binding to `universe` — the option keeps its name,
  but `tracked` is now also a list `observe` returns, and two subjects cannot
  share one word in one function.

All three were run: red for the right reason, restored byte-identical.

### The count is owed and cannot be taken yet

The task asks for corrections **counted over a real session** against §14.1's
**0.064%**, a figure this product has never taken from its own store. It is
07:31 EDT, `before_open`, and the deployment holds the plan's one connection.

**And the store cannot answer it either**, which is worth stating rather than
leaving as an exercise: every stored row is `sip` from the backfill, and the
backfill does not correct. It needs the **live** tape over a session. Written
into Task 3.4.10's shared-sitting list, beside the rehearsal item it overlaps
exactly — _a real correction, both halves_ — where it costs nothing extra.

### Checks

Four tests in `current-market-state.test.ts` (the two lists, the live path
unchanged, an ordinary observation in both, an untracked symbol in neither), two
in `live-bar-writer.test.ts` (the collapse, and that it does not collapse two
genuine minutes), four in `market-bars.database.test.ts`. `pnpm verify` green,
`pnpm test:database` **128 passed** in that file.

## For a stakeholder — a status report, 2026-09-23

### What this was

**Our data provider sometimes corrects a price it has already sent us. We were
throwing those corrections away, and this task catches them.**

About half a minute after publishing a minute's trading, the exchange feed
occasionally sends a revised version of it — a slightly different closing price,
a corrected volume. Measured earlier in this epic: this happens to roughly
**0.064% of prices**, and **just over a third of those change the closing
price**. Small, but they are **wrong numbers rather than noise**.

The live screen ignores a correction that arrives too late, and that is
**correct and stays**. If a correction for 2:01pm arrived after 2:02pm had
already been shown, applying it would make the price on screen jump backwards in
time, which no reader could make sense of. So the screen is right to say "that
is not news".

The problem was that **nothing else was looking**. The part of the system that
writes history down was being handed the same filtered list the screen got, so a
correction the screen ignored was simply lost. As the previous story put it when
it handed us this: our stored history would be permanently and knowably wrong
for a fraction of prices, **and nothing would ever report it** — because the
message that would have corrected it had been discarded one step earlier.

### What we changed, and what it costs

The filtering step now produces **two** answers instead of one: _what is news_,
which the screen gets, and _what is true_, which the history gets.

That sounds obvious in hindsight and it gives up something real, so we wrote
down what. Previously the screen and the database could not disagree, because
they were handed the identical list. Now they can — deliberately. They still
agree completely about **the latest price of every security**. They differ only
about **prices from earlier in the day**, and where they differ, the database is
the one that is right.

That is not a compromise; it is the product's own model. A live screen reports
what is happening. A record reports what happened.

### The defect we found while doing it

This is the part worth reading.

While testing the change we reproduced something that was already broken. Prices
arrive from the exchange in batches, and occasionally a price **and its
correction** arrive in the same batch. When that happened, the history writer saw
two versions of one minute, refused the pair as contradictory, and wrote
**neither** — losing not just the correction but the original price too. It
failed quietly into a log line, so nothing would have raised it.

We fixed it the way the rest of the system already works: within a batch, a later
version of a minute is the correction to the earlier one, so we keep the later
one and write it. One price per minute, the corrected one.

### Where this leaves the record

Three things are now true of a stored price that were not true this morning: a
late correction reaches it; a correction that changes nothing leaves it
completely alone, so our record of _when a price was corrected_ keeps meaning
that; and a correction changes the numbers and never which exchange feed the
price came from.

There is one honest oddity we asserted rather than hid. Once the overnight job
has replaced a minute with the fuller market-wide version, a correction to our
live version is still written — and is no longer what you would see on a chart,
because the chart shows the fuller one. That is correct: the corrected live
version is what the **Market Replay** feature will need, because replay must show
what was actually observable at the time. We wrote a test that checks both halves
so a future engineer does not mistake it for a broken fix.

### One thing we owe and could not do

We were asked to **count** these corrections over a real trading session and
compare against the 0.064% figure measured earlier. We could not: it is half past
seven in the morning in New York and the market is shut.

It is also not something our database can answer, which is worth being clear
about rather than leaving vague — every price we have stored so far came from the
overnight job, which never corrects anything. Counting needs the live feed during
a session. We have added it to the list of things waiting on the one sitting with
the market open that three parts of this project now share, where it costs
nothing extra: it uses exactly the same frames as an item already on that list.

### Where the product stands

Seven of ten tasks in this story are done. The live session is written down,
served correctly, honestly labelled, safe to reconcile overnight, served fresh
while it is still being written, and now **corrected when the exchange corrects
itself**.

**What is next** is the visible one: the two screens that will start presenting
today's session as stored history rather than as a live feed. Three tasks in a
row have been clearing the way for it.

**What you still cannot see** is any of this against the real market during
trading hours. That sitting is now carrying seven items for three stories.
