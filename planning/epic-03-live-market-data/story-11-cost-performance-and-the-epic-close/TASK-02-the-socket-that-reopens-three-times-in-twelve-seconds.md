# Task 3.11.2 — The socket that reopens three times in twelve seconds

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

**The one defect in this story that a user could feel**, and the first thing a
stakeholder sees from this close.

## What the user can see when this lands

**A page that opens one connection and keeps it.** Nothing on screen changes —
and that is the point, because nothing on screen is wrong today either.

## The measurement, and it is not an estimate

Task 3.10.7 wrote a throwaway counter against `/securities/NVDA` on a local
pair:

```text
SOCKETS: 3        # in twelve seconds
BAR REQUESTS: 3
```

**Three market-stream connections in twelve seconds** — roughly one every four
seconds — and **the same on the commit before that task**, so it predates the
work that found it.

**The gateway is not the cause.** Two external Node clients held sockets to it
for **30 s with zero closes** while the page churned. Whatever ends them is this
browser's end.

## Why it has gone unseen, which is the interesting part

**Nothing on screen is wrong while it happens.** The reconnect is Task 3.5.5's
and it works; a snapshot restores every price; `fromSnapshot` correctly declines
to mark any of them as an arrival. The cost was invisible until something was
wired to the **event** rather than to the state — and the first thing that was,
was Task 3.10.7's gap refill, which turned a four-second reconnect into a
four-second **refetch**.

**That refill now has a floor of one a minute**, which suppresses the symptom
and is written down as suppressing it. **This task removes the cause**, and the
floor's own comment names the condition.

## What to establish before repairing anything

- **Is it the deployed site too?** The one deployed figure points the other way:
  the 2026-09-24 session watch saw its own socket close **twice in 420 minutes**.
  But that is a **Node client**, not a browser page. Run the same counter
  against `pnpm e2e:deployed` before assuming either answer.
- **Is it development-only?** The candidates are React `StrictMode`'s
  double-invoke, Vite's HMR, and the dev server's proxy. Each is checkable
  against a **production build** served by `vite preview`, which is thirty
  seconds and settles it.
- **Is it a teardown?** `market-stream-client.ts` holds the retry policy and
  `App` holds the connection. A subscription effect re-running, or the client
  being re-created on a render, would produce exactly this.

> **The trap `docs/GAPS.md` records against this class**: a page that reconnects
> correctly looks identical to a page that never disconnected. Count sockets;
> do not read the chrome.

## Work

- The counter run against a **production build** and against the **deployed**
  site, both figures recorded
- The cause found, or the finding narrowed and re-recorded with what was ruled
  out
- The repair, if the cause is ours
- A check that a page opens **one** socket and keeps it, with a `pnpm break`
- Task 3.10.7's refill floor re-read: if the cause is gone, its comment says so;
  the floor stays either way, because two reconnections in a minute still cannot
  have lost two different minutes' bars

## Done when

1. The deployed and production-build figures are recorded beside the local one
2. The cause is repaired, or ruled out with what was checked
3. A socket count is asserted mechanically, break-verified
