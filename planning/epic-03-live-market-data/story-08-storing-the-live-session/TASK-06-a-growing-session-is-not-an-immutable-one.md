# Task 3.8.6 — A growing session is not an immutable one

**Status:** **Complete — 2026-09-23.** Criterion 7 was **already met** by Task 2.9.8's design — `isClosedWindow` keys on the last **bell that has rung**, not on _now_ — and the task's headline hazard could not happen. The real defect was one layer in: the **server-side** live lifetime was a _rolling_ minute measured from the request, so it straddled the minute boundary its own argument appealed to and withheld a bar the store already held for up to **59 s**. It now runs **to the next boundary**. §5's reversal trigger is evaluated in writing and **half of it was wrong**: the stitch's tail fell from **270 min to 1**, the clamp turns that into **no metered request at all** — and rules 2 and 3 therefore become _more_ necessary, not less. One case is left standing with a trigger: `max-age=300` is unreachable because the frontend never builds an absolute window.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

The read path was designed against a store that stopped at yesterday's close.
Task 3.8.3 changed that, and two decisions made under the old premise now need
re-reading rather than assuming: **the stitch's bound** and **what a cached
answer promises**.

## What the user can see when this lands

**Nothing new, and one thing that stops being wrong.** A chart of a session
being written to as it happens must not be served from a validator written for
a session that never changes.

## The two things to re-read

**1. The caching table, which has a third case now.**
`MARKET-DATA-API.md` §11 argued `ETag`s on _a closed session's bars never
change_, with the qualification already recorded that the bars do not change and
the **response** does. Its table gives an absolute window entirely inside closed
sessions `private, max-age=300`, and anything reaching into the current session
`private, no-cache`. **A session being written to as it happens is the third
case**, and the hazard is precise: an absolute window whose end has passed but
whose bars are still being filled in by the writer — an afternoon window
requested at 15:00 and served again at 15:10 — looks closed to the rule and is
not. Five minutes of freshness over a series growing every minute is a stale
chart with a valid validator.

**And since 2026-09-23 there is a concrete thing to key on.** Task 3.8.3
settled that the live writer claims `[first.startsAt, last.startsAt + 1
minute)` and never the session close, so **`bar_coverage.covered_end` advances
once a minute for every security the feed is carrying** — confirmed against a
real ledger. That makes _is this window still growing_ a question the store can
answer rather than one the clock has to guess: a window whose end is at or past
the ledger's `covered_end` is one the writer has not finished. Whether the
validator should read it is this task's to decide; that it is readable is not
in doubt.

**And a third case that is not about growth at all — added 2026-09-23 by Task
3.8.4.** The two above are both _a window gaining bars_. This one is **a window
whose bars change without gaining any**, and the caching argument has never had
to hold it.

Since 3.8.4 a served minute is the **preferred** tape rather than the only one.
So a window served at 20:00, before the backfill, returns the IEX bars; the
same window served at 21:00, after it, returns the **consolidated** bars for
those same minutes. Same instants, same bar count, **different prices**, and a
`provenance.sources` that has changed shape. `MARKET-DATA-API.md` §11's premise
is _a closed session's bars never change_ — that is now false in a second and
less obvious way, and the session does not have to be growing for it to bite.

The hazard is precise and it is the one the table's `max-age=300` was written
against: a window entirely inside closed sessions is cacheable by that rule, and
the reconciliation can land inside those five minutes. **Whatever validator this
task lands on has to change when the tape serving a minute changes**, not only
when a bar arrives — which is an argument for deriving it from something that
moves on a correction, `recorded_at` being the obvious candidate since `0004`
argued it as exactly that record.

**2. The stitch's bound, whose reversal trigger has fired.**
`MARKET-DATA-API.md` §5 recorded: _the tail's **source** changes when Epic 3 has
a live stream worth joining — at that point rule 2's clamp and rule 3's bound
both stop being necessary, because a stream is not a metered request and is not
16 minutes stale._ **That is now true.** Re-read the section against the tree,
decide whether the stitch is still earning its metered request for most windows,
and record the answer — including "it is, and here is when". The decision to
stitch is not automatically reversed; what changed is the thing being stitched.

## Work

- Re-read `MARKET-DATA-API.md` §5 and §11 against a store that holds today, and
  amend both with a date rather than rewriting them
- Whatever the caching rule needs in `routes/market-data.ts` and
  `series-cache.ts`, with the third case named in the table
- `routes/market-data.test.ts`: the growing-session case asserted — the same
  window asked twice across a write must not be served from a validator that
  says it did not change
- A `pnpm break` for the clause that carries it
- **Measure what the stitch costs now** on a window the store can answer in
  full, against Story 2.9's recorded figures, and say whether the metered
  request still happens
- `LIVE-SESSION.md` §on reading a session that is still being written

## Done when

1. A response for a growing session is not served stale from a validator
   written for an immutable one — criterion 7
2. §5's reversal trigger is evaluated **in writing**, with a verdict
3. `pnpm verify` and `pnpm test:database` pass

## What was done — 2026-09-23

### The headline hazard could not happen, and checking took four clock readings

The task said an absolute window _"whose end has passed but whose bars are still
being filled in — an afternoon window requested at 15:00 and served again at
15:10 — looks closed to the rule and is not."_

**It does not look closed to the rule.** `isClosedWindow` asks whether a window
ends before the last **bell that has rung**, not before **now**. During a
session `closedThrough` is _yesterday's_ close, so every window touching today
is `no-cache`:

| clock                      | window              | verdict       |
| -------------------------- | ------------------- | ------------- |
| during the session, 19:00Z | today 13:30Z→19:00Z | `no-cache`    |
| during the session, 19:00Z | today 13:30Z→15:00Z | `no-cache`    |
| after the close            | today's session     | `max-age=300` |
| after the close            | yesterday           | `max-age=300` |

And every **named** window is `no-cache` whatever it resolved to — which is what
the frontend sends. **Criterion 7 was met before Story 3.8 existed.** Task 2.9.8
got it right for a reason that outlived its own premise, which is worth saying
because this is the second task in a row whose stated hazard was not the real
one.

### The real defect was one layer in, and Task 3.8.3 created it

`LIVE_ANSWER_TTL_MS` — the **server-side** lifetime for a window reaching into
the live session — is a **rolling** minute measured from the request. Its
argument has two legs and Story 3.8 broke both:

- _A second request inside the same minute cannot be answered with a bar the
  first one could not have had._ Right in intent, **wrong in implementation**: a
  rolling minute straddles the boundary the argument appeals to.
- _This TTL is a bound on what we ask the vendor._ **No longer what it does** —
  see §5's verdict below.

Measured against the real cache:

```text
written 18:00:30   read 18:00:45  HIT
                   read 18:01:05  HIT   <-- the 18:00 bar is in the store
                   read 18:01:29  HIT   <-- and is not being served
                   read 18:01:31  miss
```

**Up to 59 seconds of a chart one bar behind the store, with nothing on it
saying so.** Harmless while the store gained nothing during a session; a defect
the moment 3.8.3 made it gain a bar a minute.

**The repair is alignment, not a shorter number.** The lifetime now runs to the
next minute boundary: a second request in the same minute is still a hit — the
first leg's whole intent, kept — and the first request of a new minute is a
miss. A shorter rolling TTL would have been a worse answer to the same
question, trading hits for staleness instead of removing the straddle.

**The residual race is stated rather than closed.** An entry written _after_ a
boundary but _before_ that minute's bar has been stored holds until the next
one. That window is the socket's delivery plus one 2.3 ms write. Closing it
means reading the ledger on every cache hit, which is the query the cache exists
to avoid.

### §5's reversal trigger, evaluated in writing — and half of it was wrong

Measured through `tailWindow` and `alpacaServableEnd`, a reader at 18:00Z asking
for today 13:30Z→18:00Z:

|                   | tail the stitch asks for | after rule 2's clamp | metered request |
| ----------------- | ------------------------ | -------------------- | --------------- |
| before Task 3.8.3 | **270 min**              | 254 servable min     | **yes**         |
| after Task 3.8.3  | **1 min**                | 0 servable min       | **NONE**        |

**The stitch's metered request disappears during a session** — not because the
stitch was removed, but because the store now covers everything the free plan
would serve. The decision to stitch is untouched; it has almost nothing left to
stitch.

**And the trigger's prediction is wrong in its own terms.** It said rule 2's
clamp and rule 3's bound _"both stop being necessary"_. The opposite holds for
rule 2: the clamp is **precisely** what turns the writer's one-minute tail into
no request at all, so it is doing more work than before. Rule 3 stands too — the
live writer fills only **today**, and a store stale by a week still needs the
bound that stops a five-session request becoming a multi-day fetch.

The premise was _a stream is not a metered request and is not 16 minutes stale_.
True of the **stream** — and the stitch does not read the stream. It reads the
**store the stream writes**, through the same provider seam as before.
`MARKET-DATA-API.md` §5 now carries that correction.

### One case left standing, with a trigger rather than a repair

`max-age=300`'s tolerance rested on the **rarity** of a closed window's body
changing — the section says so: _"Rare; `BarWriteResult.corrected` is the only
trigger for noticing"_. Since Task 3.8.4 the nightly reconciliation changes the
**prices** of an already-closed window for every security, every night. Not
rare.

It is left because it is **unreachable from this product**: `max-age` applies
only to the **absolute** window form, and the frontend constructs only
`{ form: "named" }` — the absolute variant exists in the type and is built
nowhere. Withdrawing the row would cost one round-trip (a `304` is 0 bytes;
2–3 ms measured on loopback) for a consumer that does not exist, so the
proportionate answer is a trigger: **the first client that sends an absolute
window.**

### Checks

Three tests in `series-cache.test.ts`, one of which fails without the repair —
the entry written at `:30` being served in the next minute. The existing
whole-minute test is unchanged and still passes, because `MID_SESSION` sits
exactly on a boundary; its **comment** was corrected, since the reason it gave
(bounding the vendor request) is no longer what the number does.

`pnpm break a-live-answer-is-held-across-the-minute-it-changes` proves the red.
`pnpm verify` green, `pnpm test:database` passes.

## For a stakeholder — a status report, 2026-09-23

### What this was about

**Now that the product remembers the trading day as it happens, we had to check
that it does not then show you a stale copy of it.**

Storing the live session created a situation the product had never been in: the
database **changes while you are looking at it**. A new price arrives every
minute. Everything we had decided about re-using an answer was decided when the
data stopped at yesterday's close and could not move.

This task re-read those decisions. There were two, and the interesting thing is
which one turned out to be broken.

### The one we expected to be broken was fine

We expected the problem to be in how long a browser is told it may re-use a
chart. It was not. That rule asks whether the window you requested ends before
the last closing bell that has **actually rung** — not before the current
moment — so anything touching today's session is already marked
"check with me before re-using this". We verified it at four different times of
day rather than trusting the reasoning.

That decision was made a fortnight ago for a reason that has outlasted the
situation it was made in. Worth saying, because this is the second task running
where the written-down hazard was not the real one, and the habit of checking
before building is what caught both.

### The one that was broken was one layer further in

Our **server** also holds answers briefly, so that a hundred people asking for
the same chart in the same minute do not become a hundred database queries. That
hold lasted one minute — on the reasoning that new data only appears once a
minute, so nothing can be missed.

The reasoning was right and the implementation did not match it. The minute was
counted **from the moment you asked**, not from the clock. So an answer built at
half past the minute was still being handed out five seconds into the _next_
minute — by which time the new price existed in our database and was simply not
being served. **Up to 59 seconds of a chart that is one price behind, with
nothing on the screen to suggest it.**

We changed the hold to end **at the minute boundary** instead of a minute after
you asked. The saving it was there for is untouched: ask twice in the same
minute and you still get one database query. Ask in a new minute and you get the
new price.

### A cost that has quietly disappeared

The other decision we re-read was about money — or rather about our data
allowance.

When a chart asked for "up to now", the product used to fetch the missing recent
part from our data provider. That costs quota, and it was carefully bounded.
**It no longer happens.** Because we now write the session down ourselves as it
arrives, the missing part has shrunk from about **270 minutes to one** — and
that single minute falls inside the fifteen-minute window the free plan withholds
anyway, so the provider declines to be asked at all.

We had written down, a fortnight ago, that when a live feed arrived the two
safety limits around that fetch "stop being necessary". **That prediction was
wrong and we have corrected it.** One of those limits is exactly what turns the
one-minute gap into no request — remove it and the cost comes straight back. The
other still protects against a database that has fallen days behind. Both stay.

This matters more than the milliseconds: a future engineer reading that
paragraph would have removed a limit believing it was obsolete, and paid for it
in data allowance during every trading session.

### One thing we deliberately did not fix

There is a case we found, confirmed, and chose to leave: a chart of an already
finished day can be re-used by a browser for five minutes, and our overnight job
can replace those prices with better ones inside that window. The original
argument for allowing it was that such changes are rare. They are no longer
rare — they now happen to every security, every night.

We left it because **nothing in the product can reach it.** That re-use only
applies to one way of requesting a chart, and our own application never uses
that way — it exists in the code as a possibility and is never constructed. We
wrote down the exact condition that should make us revisit it: the first time
any client asks for a chart that way.

Fixing something unreachable, on a premise that no longer holds, would have cost
a round-trip for a user who does not exist.

### Where the product stands

Six of ten tasks in this story are done. The live session is written down,
served correctly, honestly labelled, safe to reconcile overnight, and now
**served fresh while it is still being written**.

**What is next** is the visible one: the two screens that will start presenting
today's session as stored history rather than as a live feed. That is the task
the last two have been clearing the way for.

**What you still cannot see** is any of this against the real market during
trading hours — one sitting with the market open, now shared with two other
stories that need the same window.
