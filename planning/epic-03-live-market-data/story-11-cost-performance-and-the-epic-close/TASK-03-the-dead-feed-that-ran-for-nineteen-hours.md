# Task 3.11.3 — The dead feed that ran for nineteen hours, and the eight events that reach production nowhere

**Status:** Not started
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
