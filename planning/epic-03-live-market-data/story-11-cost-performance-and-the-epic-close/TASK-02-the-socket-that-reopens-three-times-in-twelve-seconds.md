# Task 3.11.2 — The socket that reopens three times in twelve seconds

**Status:** **Complete — 2026-09-25, and the defect does not exist.** The deployed page opens **one** market-stream socket and holds it; a dev page opens one plus a `StrictMode` open/close pair 25 ms apart. **Two of the three sockets the original counter saw were Vite's HMR connection.** The wrong number had become a `docs/GAPS.md` entry, a floor on the gap refill, a paragraph in `CLAUDE.md` and this task — and survived four days of being quoted rather than re-run. All four are corrected, and the real claim is asserted for the first time.
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

---

## What was done — 2026-09-25

### The measurement, taken three ways in about twenty minutes

The original counter reported a number without a URL beside it. Printing the
URLs answers the whole question:

```text
dev, as it ships          4 sockets in 12,243 ms
  +   96ms  OPEN          ws://localhost:5173/?token=…          <- Vite HMR
  +  153ms  OPEN          ws://localhost:5173/?token=…          <- Vite HMR
  +  308ms  closed +333ms ws://localhost:3000/market-stream
  +  337ms  OPEN          ws://localhost:3000/market-stream

dev, StrictMode removed   3 sockets in 12,248 ms
  +   96ms  OPEN          ws://localhost:5173/?token=…          <- Vite HMR
  +  153ms  OPEN          ws://localhost:5173/?token=…          <- Vite HMR
  +  333ms  OPEN          ws://localhost:3000/market-stream     <- one, held

DEPLOYED                  1 socket in 12,639 ms
  + 1212ms  OPEN          wss://…/market-stream                 <- one, held
```

**So the product opens one socket and keeps it.** The extra open/close pair in
development is `StrictMode`'s double-invoke — it opens, tears down and
re-opens within **25 ms**, which is the effect's cleanup being _proved_ rather
than failing. There is no four-second churn and there never was.

### What went wrong, and it is not a socket

`page.on("websocket")` fires for **every** socket the page holds. On a dev
server, two of them are **Vite's HMR connection**. The counter added them up.

> **The transferable rule: count by URL, never by event.** A browser page holds
> sockets that are not this product's, and a number with no URL beside it
> cannot tell them apart.

**The cost of not doing that** is the part worth recording. The figure became:

| Where it landed                                       | Now                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| a `docs/GAPS.md` entry with an owner and a re-measure | **withdrawn**, and replaced by the rule with a spec behind it    |
| a **floor** on the gap refill (`use-bar-series.ts`)   | **kept**, on its own arithmetic — the justification is rewritten |
| a paragraph in `CLAUDE.md`'s current state            | **withdrawn**, dated                                             |
| a task in this story's split                          | **this one**                                                     |
| a commit message and a PR body                        | quoted, four days, never re-run                                  |

**Nothing re-ran it because nothing could**: the counter was a throwaway,
deleted the day it was written, and every reader after that was reading a
conclusion rather than evidence. That is `ALPACA.md` §11's rule — _quote at
least one frame, body or row verbatim_ — failing in the one way it is designed
to prevent, and the reason this file quotes all three readings above.

### The repair is a check rather than a change

**No product code changed.** What was missing is that **nothing asserted the
product's actual claim**, which is why a wrong measurement of it stood for four
days.

`e2e/specs/market-stream-socket-count.spec.ts` counts sockets whose URL
contains `/market-stream` and asserts **the last one was never closed** — the
second half mattering because, in `docs/GAPS.md`'s own words against this
class, _a page that reconnects for ever looks identical to a page that never
disconnected_.

It allows **two** rather than asserting one, deliberately: `StrictMode`'s pair
is real on every developer's machine and absent in CI, so `=== 1` would be a
test that fails locally and passes on the runner — the worst of both.

```text
pnpm break the-socket-count-stops-filtering
  ✓ broken → red → restored byte-identical.
    matched: a page opens one market-stream socket and keeps it
```

**The break removes the URL filter**, which is precisely how the wrong number
was produced in the first place.

### The floor stays, and its comment no longer lies

Task 3.10.7's refill floor was added _because_ of the churn. **It is kept**,
because its own justification never depended on it: two reconnections inside
one minute cannot have lost two different minutes' bars, so the second refill
would ask for an answer the first already has. **What is deleted is the claim
that it is suppressing something.**

### Gates

`pnpm verify` green — **2,446 tests, 26 invariants**.
`pnpm e2e market-stream-socket-count.spec.ts` 1 passed. One new break, red on
demand. **No product code changed.**

## For a stakeholder — a status report, 2026-09-25

### What this was supposed to be

The one repair in this closing phase that a user could feel. We had measured an
ordinary page **opening three connections to our live feed every twelve
seconds** — roughly one every four — and, because the same happened on older
code, concluded it was a long-standing fault nobody had noticed.

### It is not happening, and never was

Twenty minutes of re-measuring, this time **printing which connection was
which**:

- **The live site opens one connection and keeps it.** One. For the whole
  observation.
- On a developer's machine, **two of the "three" belong to the development
  tooling itself** — the thing that reloads the page when you edit a file. They
  are not our product and they do not exist in the live site.
- The one genuine extra is a development-only safety feature deliberately
  building the page twice to prove our cleanup code works. It opens and closes
  in **25 milliseconds**, and that is it working.

**So there is nothing to repair.**

### The part that is worth your attention

**A wrong number travelled a long way in four days.** It became an entry in our
register of known gaps, a restriction on a feature we had just built, a
paragraph in the document new contributors read first, and a task on this
plan — and it was quoted in a commit message and a pull request.

**Nobody re-ran it, because nobody could.** The tool that produced it was
written to be thrown away, and everybody after the first day was reading the
conclusion rather than the evidence.

We have a standing rule for exactly this — _a throwaway instrument must quote
its raw readings, because the conclusion outlives the tool and the evidence
does not_ — and this is what it looks like when the rule is skipped. All three
readings are quoted in full in the technical record, and the four places that
repeated the wrong number now carry the correction with the date.

### What we built instead

**An automated check for the thing nobody was checking**: that a page opens one
connection to the live feed and keeps it. That is the product's actual promise,
and until today nothing verified it — which is why a wrong measurement of it
could stand unchallenged.

We also deliberately broke the check to confirm it works, and the way we broke
it is by removing the very filter whose absence caused the original mistake.

### Where the product stands

**The final story of the live-market phase, two of ten tasks done.** The next
one is the failure that actually matters: a feed that stops with nobody
noticing — which, we now know from a monitoring file nobody had opened, once
lasted forty hours.
