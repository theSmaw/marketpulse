# Task 3.11.3 — The dead feed that ran for nineteen hours, and the eight events that reach production nowhere

**Status:** **Complete — 2026-09-25.** All **eleven** vendor events now reach the correlation-id logger, with the level decided in one pure, total, exhaustive place — so a twelfth event is a **compile error rather than a silence**, which is this task's own defect arriving a second time. `check-deployed.mjs` refuses a `disconnected` feed **at any hour** rather than only in session, with a 20-second grace derived from the measured deploy handover. **What this cannot retrieve is why the feed recovered on 2026-09-21**: that evidence never existed.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

**Make a feed that has stopped visible to somebody who is not looking at a
page.** Story 3.10 made the _browser_ honest; nothing made the _deployment_
audible.

## What the user can see when this lands

**Nothing directly** — and the thing it prevents is the reason it is third
rather than ninth: a live feed that stopped and nobody knew is the one failure
in this epic where **production is lying to a real user** rather than a
developer being inconvenienced.

## The measured fact

`market-stream.ts` **never references `onLog`.** Eight diagnostic events exist
on the seam and reach production nowhere — which is why a dead feed ran for
**nineteen hours** unseen.

Story 3.10 did not repair it, deliberately: it is a cost-and-observability
question rather than a degraded-state one, and that story's subject was what a
**page** says.

## What already exists, and must not be duplicated

- **`GET /diagnostics/freshness`** answers _how many trading sessions behind is
  the store_, computed on request so it has no schedule to miss, and
  `check-deployed.mjs` fails on it after a merge.
- **`GET /diagnostics/feed`** answers what the provider selection and feed are.
- **The browser's own reading** is Story 3.10's and is not this: `FeedStatus`
  is what a page concludes, and a page nobody has open concludes nothing.

**The question this task answers is the one none of those do: was the socket
receiving anything, and when did it last?** A deployment can answer
`{"provider":"alpaca","feed":"iex"}` while receiving nothing at all — which is
exactly the nineteen hours.

## The constraint that shapes it

**The writer never throws and never fails loudly** — `live-bar-writer.ts` is
called from the socket's own callback, where an unhandled rejection is a crashed
process, so every refusal is caught per security, counted and logged. Whatever
this task adds inherits that rule: **a diagnostic that can crash the process is
worse than no diagnostic.**

And `CLAUDE.md`'s own line: **the resolved configuration is never logged**, and
`redact` was rejected as a denylist whose failure mode is the key nobody added.

## Work

- The eight events wired to something that reaches production — the
  correlation-id logger is the obvious candidate and needs checking rather than
  assuming
- **A last-observation instant on `/diagnostics/feed`**, or the recorded reason
  it belongs somewhere else
- `check-deployed.mjs` extended, **only as far as it can honestly assert at any
  hour** — Task 3.11.1's decision 2 governs this and this task implements
  whatever it settled
- A `pnpm break` for whatever is asserted
- The nineteen hours written into `docs/GAPS.md` as closed, or as narrowed with
  what still would not be seen

## Done when

1. A feed that is connected and receiving nothing is visible without opening a
   page
2. Nothing added can crash the process, asserted rather than argued
3. `check-deployed.mjs` asserts what decision 2 said it should, and no more

## Amended by Task 3.11.1 — 2026-09-25: decision 2 is settled, and the outage got longer

**This task's `check-deployed.mjs` work item deferred to decision 2. It is
answered: _only what holds at any hour_.**

So the shape is fixed and is not to be re-litigated here:

- **assert** the deployment is configured for the real provider, that it is
  **never replaying** (ADR 0030, 7c), and — the new part, which is this task's —
  a **last-observation instant**
- **never** assert `status: live`
- **do not** add a scheduled in-session check. It was rejected as _a new
  mechanism with its own failure modes and its own silence when it breaks_

> **Which puts more weight on this task than the split gave it.** The rejected
> option is the one that would have caught the nineteen hours; what replaces it
> is the instant. _The socket is up and has heard nothing since Tuesday_ has to
> be readable at 3am from one HTTP call, or nothing mechanical notices a dead
> feed at all. That is the honest cost of decision 2 and this task is what pays
> it.

**And the incident is bigger than this file says.** Task 3.11.1 read
`weekend-watch.mjs`'s output — 1,065 samples, unopened for four days — and the
outage was not nineteen hours: it ran from **2026-09-19T13:56Z to
2026-09-21T05:44Z, about forty hours**, through the whole of Friday's session
and the weekend. It then **recovered unattended** and stayed up.

**Nobody can say what recovered it**, and the reason is exactly this task's
subject: the eight events that would have said were not being logged. **An
outage that ends on its own is worse than one that needs a restart**, because
nothing learned anything — and the next one will be the same until this lands.

## Amended by Task 3.11.2 — 2026-09-25: the middle work item is ALREADY SHIPPED, and this task narrows

**`GET /diagnostics/feed` already carries a last-observation instant.** It was
listed here as _a last-observation instant on `/diagnostics/feed`, or the
recorded reason it belongs somewhere else_ — and `diagnostics.ts` has served
`observedAt` all along, documented in its own comment as _when the newest
observation was **true in the market**_, with a `["string", "null"]` schema.

**And it populates.** From `weekend-watch.mjs`'s capture, verbatim:

```json
{
  "provider": "alpaca",
  "feed": "iex",
  "status": "live",
  "observedAt": "2026-09-21T12:17:00.000Z",
  "marketOpen": false,
  "checkedAt": "2026-09-21T12:18:48.369Z"
}
```

```json
{
  "provider": "alpaca",
  "feed": "iex",
  "status": "stale",
  "observedAt": "2026-09-21T13:53:00.000Z",
  "marketOpen": true,
  "checkedAt": "2026-09-21T13:55:00.087Z"
}
```

It is `null` only when the process has observed nothing since it started —
which is what it read for the whole forty-hour outage, beside
`status: "disconnected"`.

> **So the outage was visible from one HTTP call the entire time.** Not from a
> log, not from a page: from an endpoint this product already shipped, which
> nothing was reading. That sharpens what this task is for and shrinks it.

**What this task still owes, narrowed:**

1. **`onLog`** — the eight diagnostic events, genuinely unwired, and the reason
   nobody can say **what recovered** the feed on that Sunday.
2. **One assertion in `check-deployed.mjs`** reading the field that already
   exists, per decision 2: never `status: live`, but `status` and `observedAt`
   **reported**, and a refusal when `status` is `disconnected` — which holds at
   any hour and would have caught the forty hours on the first merge after it
   started.

**What it no longer owes**: adding the field.

> **And a data point taken while checking this.** At **2026-09-25T03:13Z**,
> market shut, the deployed backend answered `status: "live"` with
> `observedAt: null` — so **§9.3's _hold the socket always_ is what production
> does today.** The section written during the outage says it is not; that was
> true of that weekend and is not true now.

---

## What was done — 2026-09-25

### The eleven events, wired

`createAlpacaStream` has emitted diagnostic events since Story 3.2 and
**nothing ever passed it an `onLog`**, so every one fell into its own `noop`.
`market-stream.ts` now takes one and `index.ts` passes `streamLogTo(app.log)` —
the correlation-id logger, because it is already the one sink that reaches the
platform and a second would be a second place to look.

**There are eleven rather than the eight this file was written against**:
Story 3.5 added `subscription-shortfall` and `subscription-refused-empty`, and
`closing-deliberately` was there all along.

### The level is the whole editorial content, and it is decided in one place

`stream-log.ts` maps an event to a level, a message and the fields worth having
beside it. **`warn` is _something is wrong with the feed_; `info` is _the feed
did what it is supposed to do_** — because a log where everything is `warn` is
a log nobody reads and one where everything is `info` is a log nobody greps.

| `info`                                                          | `warn`                                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `authenticated`, `subscribed`, `closed`, `closing-deliberately` | `connection-limit`, `credentials-refused`, `frame-rejected`, `unexpected-error-frame`, `liveness-watchdog-fired`, `subscription-shortfall`, `subscription-refused-empty` |

> **`connection-limit` warns even though every deploy meets one**, which is the
> one place the mapping disagrees with itself on purpose. §8.2's overlap is
> **seconds**; the 2026-09-19 outage was **the same frame retried every three
> seconds for forty hours**. The event cannot tell those apart and neither can
> a level — **what tells them apart is how many lines there are**, and that is
> only countable if they are logged at a level somebody looks at.

**And nothing logged carries a credential or a price.** `credentials-refused`
carries **no detail at all**, which is also what the wire supports: §8.3
measured `402` as byte-identical for a wrong key, a wrong secret and no
credential, so a line claiming to distinguish them would be inventing the
distinction. Asserted, not argued — a test greps the serialised line for
`key|secret`.

### The defect, prevented from recurring by the shape rather than by a note

The mapping is a **pure, total, exhaustive `switch`**. A twelfth event is a
**compile error**, which is precisely this task's own defect — an event emitted
into nothing — arriving a second time and being refused.

```text
pnpm break the-market-stream-goes-silent-again
  ✓ broken → red → restored byte-identical.
    matched: routes each line to the level it named
```

### Criterion 2 — nothing added can crash the process, asserted

This runs inside the market socket's own callback, where an unhandled throw is
a **crashed process**; `live-bar-writer.ts` carries the same rule.

`streamLogLine` cannot throw. The only thing inside the boundary that can is
**the logger**, which is a vendor's — so `streamLogTo` catches and swallows,
and a test drives **every one of the eleven events** through a logger that
throws on both methods and asserts none of them propagates.

> **Swallowed rather than re-reported**, because the only surface left to report
> a broken logger _to_ is the logger. Losing a line is a line; losing the
> process is the feed.

### Criterion 3 — what `check-deployed.mjs` asserts, and the gap it closes

Decision 2 fixed the shape and this implements it. **The check already required
a connected `iex` while the market is open.** What it did **not** do is object
to `disconnected` out of hours — so the only hours a dead feed could be caught
were the six and a half a session lasts, and only if somebody merged during
them. **The 2026-09-19 outage ran about forty hours and most of it was out of
session.**

**Condition 3, new: `disconnected` is a fault at any hour.** What makes that
assertable is §9.3 — the deployment holds the socket _always_ — confirmed at
**2026-09-25T03:13Z** with the market shut:
`{"status":"live","observedAt":null,"marketOpen":false}`.

> **`stale` is NOT a failure**, and that distinction is what this whole epic is
> built on: `stale` is connected and nothing arriving, which out of hours is
> exactly right and in hours is ordinary on IEX at 65.1% median coverage. Only
> `disconnected` means _there is no socket_.
>
> **`observedAt` is reported and never asserted on.** It is legitimately `null`
> after a restart and legitimately hours old over a weekend; an age threshold
> here would be a second staleness rule competing with the one
> `feed-liveness.ts` owns, and §11.2's answer to _what threshold_ was **none**.

**And a grace window derived rather than chosen.** Every deploy meets a `406`
by design while the outgoing replica holds the plan's single slot; the arriving
one retries every 3 s, and an unplanned 2026-09-19 reproduction measured
**1,149 ms to the `406` and 9,498 ms to the close**. So `disconnected` is
retried for **20 s** — comfortably past the handover plus a retry — and **only
that verdict is retried**: a replaying deployment, a 404 or a wrong feed in
session resolve by nobody waiting. **Without it, condition 3 would go red on
the handover of every deploy**, which is the cry-wolf this epic has spent three
tasks avoiding elsewhere.

### What this does NOT fix, stated rather than implied

- **Why the feed recovered on 2026-09-21 is unknowable.** The evidence never
  existed. This makes the _next_ one answerable.
- **A log is only read by somebody looking**, and between merges nothing reads
  anything. Decision 2 rejected a scheduled in-session check as a new mechanism
  with its own silence. **`docs/GAPS.md` carries the residue with an owner that
  is a condition — the first outage that begins and ends between two merges**,
  which is the case neither the log nor the check can see.

### Gates

`pnpm verify` green — **2,450 tests, 26 invariants**. One new break, red on
demand. Full `pnpm e2e` green.

## For a stakeholder — a status report, 2026-09-25

### What this was

**Six days ago our live market feed died and nobody knew for forty hours.**

The reason is simple enough to state in a sentence: **the part of our system
that talks to the market data provider was reporting what it was doing to
nobody.** It had eleven things it could say — _I connected_, _my credentials
were rejected_, _the provider is refusing me a connection_, _I have heard
nothing for too long_ — and all eleven went into a function that did nothing
with them. That function had been there, empty, since the feature was built.

So when the feed went down on a Friday morning, there was no line anywhere
saying so. It was found by someone probing the system from outside, by hand.

### What we did

**Wired all eleven of them to the log the rest of the system already writes
to**, and decided in one place how loud each one is:

- **A warning** for the things that mean something is wrong — credentials
  refused, connection refused, nothing heard for too long.
- **An ordinary note** for the things that mean it is working — connected,
  subscribed, closed on purpose.

That split matters more than it sounds. A log where everything is a warning is
a log nobody reads.

**One judgement call worth explaining.** _The provider is refusing me a
connection_ happens on **every single deployment** — briefly, by design, while
the old copy of our software hands over to the new one. Logging it as a warning
therefore cries wolf a little. We do it anyway, because **that same message,
repeated every three seconds for forty hours, was the outage**. The message
cannot tell those apart; only **how many of them there are** can, and you can
only count them if they are written down.

### And the check after each deployment now looks at the feed

Every time we ship, an automated check confirms the live site is healthy. It
already asked _is the feed connected?_ — **but only during market hours.**
Outside them it accepted any answer.

The outage began on a Friday morning and ran through the weekend, so **most of
it happened in exactly the hours the check was not asking.** It now asks at any
hour, and it would have caught this one on the first deployment after it began.

Two deliberate limits:

- **It does not complain about a quiet feed**, only a _missing_ one. Our data
  source is genuinely silent much of the time — that is normal, and a check
  that shouted about it would be ignored within a week.
- **It waits twenty seconds before complaining**, because during every
  deployment there is a brief handover where the connection legitimately does
  not exist. We measured that handover at about ten seconds and doubled it.

### The honest limits

**We still cannot say what fixed the outage.** It recovered on its own, on the
Sunday morning, and the evidence that would have explained it was never
recorded. This work makes the next one explicable; it cannot retrieve the last
one.

**And a log only helps someone who looks.** Between deployments, nothing reads
it. We considered a scheduled check running every few minutes during market
hours and decided against it — it is another moving part that can fail quietly
in its own way. That leaves one gap, and we have written it down rather than
papered over it: **an outage that starts and ends between two deployments would
still pass unnoticed.**

### Where the product stands

**The last story of the live-market phase, three of ten tasks done.** The
remaining seven are measurements, documents and one sitting where a person
watches the product work during a real trading session — the only thing in this
whole phase that has never been done by a human being.
