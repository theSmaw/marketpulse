# Task 4.7.3 — The figures that do not survive a fresh join

**Status:** In progress — 2026-10-10
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.1

## Objective

**Story 3.10's inherited rule — _nothing clears the prices on a degraded
feed_ — is true of a browser-side kill and false of a fresh join.** Reachable
by a reload, and routine on every deploy.

## What the user can see when this lands

**A reload during an outage stops contradicting itself.** Today it draws four
live prices and eleven ranked sectors at the top and `Of the 503 companies we
track, none were heard from in the last 5 minutes` in the middle.

## Work

### The mechanism, read from source rather than inferred

- `market-gateway.ts`'s `sendSnapshot()` sends a **freshly computed**
  `overviewMessage()` on connect **and on every subscribe** — three joins per
  cold load of `/`.
- `market-breadth.ts`'s eligibility pass, which breadth **and** movers are both
  taken from, filters on `bar.startsAt` inside a **5-minute** window. With
  nothing arriving it empties.
- `market-overview.ts`'s `buildMarketOverview` marks a proxy or sector entry
  `state: "live"` for as long as the observation sits in the map, **with no
  expiry at all**.

So the top of the screen and the middle disagree, each correct about its own
subject — **Task 3.4.9's `two true halves, one contradiction` arriving by a
fifth door.**

### And the deploy case is worse because it is routine

A restarted replica has an empty observation map and **serves browsers for
45.8–46.5 s before its own feed authenticates** (`docs/GAPS.md` entry 8). So
**every deploy during a session flips every open tab to yesterday's closes for
about 46 seconds with the status bar reading `LIVE`** — correctly, because the
socket is healthy and frames are arriving. Nothing on screen says anything is
wrong.

### The repair, and it is the owner's choice of the four

**The gateway serves a reconnecting client its LAST BROADCAST aggregate rather
than a recomputed one.** One place, and it also **removes two of the three
joins per cold load** that Task 4.8.3 counted. Rejected, with their reasons:
the browser additionally refusing a poorer aggregate (a second place that has
to know what _poorer_ means); expiring the proxy and sector entries on the same
window (throws away figures a reader was reading, which Story 3.10 decided
against); and photographing it as honest (defensible per region, indefensible
as a set, and it leaves the deploy case shipping).

**The rule this expresses**, which is the overview's version of one this
product already holds twice — `LiveFeedView.resumes`' refill rule and
`use-bar-series`' never-blank rule:

> **An aggregate that has held figures must not fall back to its empty state
> because of a join the reader did not ask for.**

### Boundaries and traps

Task 4.8.11 put a `clients.size > 0` guard **inside `publishObservations`** and
Task 4.8.8's `the-aggregate-has-three-producer-paths` counts the ways into
`overviewMessage()` by **slicing both producers by indentation with a
sentinel** — so a repair that hoists a call for readability turns that check
red. **The snapshot path is what you are changing**, so expect to amend that
invariant's claim in the same change, as 4.8.11 did.

And nothing on the socket callback's path may throw: it is called from the
socket's own callback, where an unhandled rejection is a crashed process.

### What it owes

A **behavioural** assertion rather than a grep — the process suite drives a
real socket with an injected clock — and its break, with the 2026-09-26
procedure and the **passing-wrongly transcript kept**. Note Task 4.8.11's
lesson on this exact surface: **the obvious wire-level assertion was green on
the defect**, because an empty broadcast sends nothing either way. Assert on
what the gateway **served**, not on what a quiet client received.

**Reversal trigger, a condition:** _the first consumer that must be served a
recomputed aggregate on connect rather than the last broadcast one_ — a
diagnostics route, a replay client, an agent.

## Done when

1. A reconnecting or subscribing client is served the last broadcast aggregate,
   and the figures on screen survive a reload during an outage
2. The deploy case is shown to be repaired — a restarted replica no longer
   flips an open tab to yesterday's closes
3. A behavioural assertion holds it, with its break and the transcript of the
   check passing wrongly first
4. `the-aggregate-has-three-producer-paths` still holds, with its claim amended
   if this changes what a path does
5. ADR 0038 carries a dated amendment if this changes what it describes
6. `pnpm verify`, `pnpm test:process` and the overview specs green

---

## Handed here by Task 4.7.1 — 2026-10-10: the poorer-aggregate-on-reconnect verb exists, and it is already produced once

Written here rather than linked.

**1. The verb is `overviewOnReconnect` on `serveFeed`** (`e2e/support/feed.ts`).
Serve the rich aggregate as `overview` and the one a restarted replica would
build as `overviewOnReconnect`; `drop()` and the page's own retry are the whole
production. Nothing in the spec reloads and nothing reaches into a component.

**2. It is produced and green already**, in
`e2e/specs/overview-held-outage.spec.ts`' third test — `HEARD_FROM` (four
observed proxies) on connect, `HEARD_NOTHING` (four `unknown`) on the
reconnect, and the strip's `774.03` is gone afterwards. **That test deliberately
does not judge the state**: whether the gateway should serve its last broadcast
aggregate instead is your decision, and the spec exists so the decision can be
measured rather than argued.

**3. It keys on `drop()`, not on a connection count, and that matters to you.**
A cold page opens more than one socket before anything is dropped — React's
`StrictMode` double-invokes the effect, so a dev page opens one plus an
open/close pair ~25 ms apart. Keying on `connections > 1` served the poorer
aggregate on the **first paint** and drew `No prices yet.` over four `None
stored` cells: a real state of this product, produced entirely by the
instrument. If your repair adds a second harness behaviour, key it on the drop.

**4. The counters are the plant proof.** `feed.overviews()` counts aggregate
frames sent across every connection, `feed.connections()` counts sockets **by
URL**, `feed.refusals()` counts retries this harness closed. A frame that was
built and never sent and a frame the page ignored leave the same screen; assert
growth rather than an absolute, because of the `StrictMode` pair above.

---

## What was done — 2026-10-10

### The repair, in one `let` and one `??`

`market-gateway.ts` keeps the aggregate it last **broadcast** and serves that
on connect and on subscribe:

```ts
let lastBroadcastOverview: WireMarketOverview | undefined;
// sendSnapshot():
send(client, overviewMessage(lastBroadcastOverview ?? overview()));
// publishObservations(), below both early returns:
lastBroadcastOverview = overview();
broadcast(overviewMessage(lastBroadcastOverview));
```

The aggregate became an **argument** to `overviewMessage`, which keeps the one
encode site `the-overview-frame-is-not-a-heartbeat` counts and is the only
reason that invariant's sentinel had to move. The memo write sits **below**
`if (clients.size === 0) return;`, so Task 4.8.11's guard is untouched and its
break still goes red.

**Two consequences beside the repair.** A cold `/` pays **one** join rather
than three once anything has been broadcast; and **two tabs of `/` no longer
disagree about the market** by however long apart they were opened, which is
the property the process suite's `serves a NEW browser what was last broadcast`
actually asserts.

### What a cold start is served, and why that is not the defect

**A freshly computed aggregate — the prior behaviour, kept deliberately.** A
process that has never broadcast has no reader whose figures it could
contradict, and what it computes is the true answer about what it holds: out of
hours, and on a deployment with `MARKET_DATA_PROVIDER=none`, the last stored
closes.

**The alternative was considered and refused with a reason.** If an absent memo
meant an **absent frame**, a browser holding figures would keep them across any
join — which repairs the deploy case — but an absent memo is also every cold
load of a process that has heard nothing. Withholding therefore deletes Story
4.2's `all-stored-one-session` and `no-provider-configured` states from the
landing page on **every** out-of-hours visit, **every** no-provider deployment
and **every gated run**, replacing four stored closes with `No prices yet.`
That is a worse defect than the one being repaired, and telling the two cases
apart needs a judgement about whether an aggregate is _poorer_ — the thing Gate
1 rejected in the browser for the same reason.

### Done-when 2 is HALF met, and the half it is not is arithmetic rather than a choice

**The deploy case is not fully repaired and no memo can repair it.** Traced
through, with `docs/GAPS.md` entry 8's own figures:

| t      | the arriving replica                                           |
| ------ | -------------------------------------------------------------- |
| 0 s    | starts, serves browsers, `clients.size === 0`                  |
| 0–46 s | its own feed refused `406`, fifteen or sixteen retries at 3 s  |
| ~46 s  | feed authenticates — and the platform terminates the incumbent |
| ~46 s  | every open tab reconnects (500 ms on `1001 going away`)        |

Two things follow and both are properties of the sequence rather than of the
code. **The arriving replica cannot have a last broadcast**, because
`publishObservations` returns early on `clients.size === 0` and no browser is
attached to it until the incumbent dies. And **the last broadcast it could have
had would be thin anyway**: its live map is seconds old, so the aggregate holds
one batch or none against breadth's 5-minute window. Moving the memo write
_above_ the `clients.size` guard was considered and does not help — it
reinstates the 1.521 ms-a-batch join Task 4.8.11 removed and buys an aggregate
that is still thin.

**So nothing a 46-second-old process can compute is better than what the
reader's own tab already holds**, and the only thing that would preserve it is
withholding the frame, refused above. Written up as a `docs/GAPS.md` entry —
_A replica restarted mid-session still serves its first browser a thin
aggregate_ — with three candidate repairs named and none costed, owned by **a
condition**: the first deploy mid-session that somebody watches `/` across.
**This is the owner's call rather than mine**, and it is in Gate 2's list.

### And one of this brief's own premises is falsified by the source

**The brief and Gate 1 both say the deploy window runs _with the status bar
reading `LIVE`_. Mid-session it does not.** During the refusal loop the
arriving replica's `StreamConnection` alternates `socket-opened` →
`error-frame` (`phase: "refused"`, `lastInboundAt` set) → `closed`, and
`feedStatusFrom` reads:

- `closed || lastInboundAt === undefined` → **`disconnected`** (the ~3 s gaps
  between retries, and the whole window before the first frame);
- market **open**, inbound current, `lastObservationAt === undefined` →
  **`stale`**.

`live` is reachable in that window **only out of hours**, where
`if (!marketOpen) return "live"` fires before the observation test — and the
one deployed reading behind the claim (`12:37:40 DISCONNECTED → 12:37:45 LIVE`,
`STORY.md`) was taken at **08:37 ET, pre-market**. So mid-session the chrome
_does_ flip, for most of the window, while the figures quietly fall back; the
claim that nothing on screen says anything is wrong is **the figures' claim,
not the chrome's**. Unmeasured against a real rollout and recorded as read from
source.

### What holds it: the producer's answer CHANGES between the broadcast and the join

Nothing on the wire tells a served aggregate from a recomputed one — both are a
`type: "overview"` frame carrying a well-formed aggregate. **Task 4.8.11's
lesson on this exact surface, met a second time.** Three weaker drafts were
written first, run against the unrepaired gateway, and **all three were
green**:

```text
 ✓ WEAK 1: the reloaded tab receives an overview frame 36ms
 ✓ WEAK 2: the reloaded tab's aggregate carries as many figures as the first tab's 30ms
 ✓ WEAK 3: no page error — the reloaded tab's frame decodes and names the symbol 30ms
 × serves a NEW browser what was last broadcast, not a fresh join 40ms
   → expected [ { …(3) } ] to deeply equal [ { …(4) } ]
 × serves the last broadcast on SUBSCRIBE too, which is the second join a cold `/` paid 51ms
   → expected [ { …(3) } ] to deeply equal [ { …(4) } ]
 × does not call the producer at all on a join after a broadcast 53ms
   → expected 4 to be 2 // Object.is equality
 ✓ serves a COMPUTED aggregate when nothing has been broadcast yet 7ms
 ✓ serves the NEWEST broadcast, not the first one 54ms
```

**A poorer aggregate is a well-formed aggregate**, which is why every weak form
passes: it has a frame, it has the same number of figures, it names the symbol.
The three weak tests were deleted; the transcript is the record. Note the fifth
is **also green on the defect** and is kept with that written into it — it
guards a hazard the repair _introduces_ (`??=` instead of `=`, a memo written
once), not the defect it repairs.

Five assertions shipped, in `market-gateway.process.test.ts`:

| Assertion                                         | Subject                                          |
| ------------------------------------------------- | ------------------------------------------------ |
| serves a NEW browser what was last broadcast      | which of two aggregates was served               |
| serves the last broadcast on SUBSCRIBE too        | the second of the three paths                    |
| does not call the producer at all on a join       | the join not running                             |
| serves a COMPUTED aggregate when nothing has been | the cold-start arm, by decision                  |
| serves the NEWEST broadcast, not the first one    | the `??=` hazard (green on the defect, labelled) |

### The break, performed by hand for Task 4.7.1's reason

`scripts/breaks.mjs` gains `the-fresh-join-recomputes-the-aggregate`, whose
substitution is the **omission** a re-implementer makes rather than an
inversion — the `??` goes and the call keeps computing, which is what every
line of this gateway did until today.

`pnpm break` refuses on an uncommitted target and this change is uncommitted,
so it was performed by hand with the registry's exact `find`/`replace` and the
file checksummed either side: **`103fd87046c74ba7563bfe8b9d5641e3`** before,
`9343fd5a790afc8c9420ee018807ef7a` broken, **`103fd87046c74ba7563bfe8b9d5641e3`**
restored.

```text
 FAIL  src/market-gateway.process.test.ts > a join is served the last broadcast aggregate (Task 4.7.3) > does not call the producer at all on a join after a broadcast
AssertionError: expected 4 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 4

 Test Files  1 failed (1)
      Tests  3 failed | 27 passed (30)
```

**Three assertion failures with twenty-seven tests still collecting and
passing**, which is the only red that proves a check works — not a parse error
and not the file broken outright.

### The browser half, and it is not vacuous

`overview-held-outage.spec.ts` gains a fourth test — _the figures and the
denominator survive a reconnect TOGETHER, which is what the gateway now serves_
— and the third test's docblock is amended: it **was** the defect produced and
is now a model of the **pre-repair** gateway and of the deploy case.

It reads the proxy strip and the breadth ledger **together**, because the
defect was never a missing figure: it was four live prices above `none were
heard from in the last 5 minutes`. `overviews()` is read either side, because a
reconnect never answered with an aggregate leaves both regions byte-identical
too.

```text
Running 4 tests using 1 worker
  ✓  1 … › a produced disconnection is held, and the refused retry is counted (4.3s)
  ✓  2 … › the default still answers the retry, which is what two shipped specs are about (3.5s)
  ✓  3 … › the reconnect can be answered with a poorer aggregate (3.4s)
  ✓  4 … › the figures and the denominator survive a reconnect TOGETHER, which is what the gateway now serves (3.4s)
  4 passed (15.3s)
```

**Red-checked rather than assumed.** With `overviewOnReconnect: HEARD_NOTHING`
added to the fourth test — a server that regresses — it fails on the strip:

```text
    + None stored
    +
    + No prices stored for these four yet.
      393 |   // **Neither region moved, and that is one claim about two of them.**
    > 394 |   expect(await proxies(page).innerText()).toBe(strip);
```

### `the-aggregate-has-three-producer-paths` needed its claim amended, and its sentinel

Both, and the brief predicted the first. The sentinel is `overviewMessage(`
rather than `overviewMessage()`, because the aggregate is now an argument and
the old one would have failed the **slice** check — _the slice taken for
`sendSnapshot` does not contain …_, which is a refusal rather than a silent
pass, so the check behaved correctly. The claim now says the first two paths
serve the last broadcast, and the note says, as 4.8.11's does, that **this
check cannot see which arm of the `??` ran and is not asked to**: it counts
paths, and a path that serves a remembered value is still a send. The count is
still **three**.

`a-fourth-path-to-the-aggregate`'s substitution was updated to
`broadcast(overviewMessage(overview()))` so the planted fourth path still
compiles and still expresses the defect; `every-break-can-still-land`'s anchor
(`}, KEEPALIVE_INTERVAL_MS);`) is untouched.

### What was swept, and what was left standing

`three joins per cold load of /` is false wherever it is a **live** claim.
Grepped: sixteen files. **Amended**: `docs/adr/0038` (two places — decision 1's
new amendment and decision 3's bullet), `scripts/check-invariants.mjs`,
`scripts/breaks.mjs`, `market-gateway.ts`, `market-gateway.process.test.ts`,
`market-overview.test.ts`, `overview-source-note.ts`, and
`planning/epic-14-performance-scale-validation/EPIC.md` — whose 2026-10-07
clause is keyed on the call-site **count**, which did not move, with a note
saying so and refusing the epic credit for a cost saving taken for a
correctness reason. **Left standing as historical records**: Story 4.8's
`STORY.md` and task files 4.8.3, 4.8.8, 4.8.10, 4.8.11, 4.8.12.

`overview-source-note.ts`'s is the interesting one: Task 4.8.12 removed
`computedAt` from the drawn note **because** the gateway advanced it when
somebody opened a tab. On a process that has broadcast, it no longer does — the
cause of that defect is gone on one path, and the repair is still right.

### Sideways hand-offs, written into the siblings' own files

Three, enumerated by reading this repair against each remaining task rather
than by grepping for a pointer:

- **4.7.4** — the instant it draws an age from can now be arbitrarily old on a
  fresh join, which makes its region's claim stronger; the age grows without
  bound on a dead feed and is identical on two tabs opened an hour apart; the
  cold-start arm is the only one where it is fresh, and that is CI's.
- **4.7.9** — the reload-during-an-outage row changed, and `overviewOnReconnect`
  now models the **deploy** state rather than the outage state. They used to be
  one picture.
- **4.7.11** — the `three joins` sweep with its file list and a re-grep at the
  close, the per-cold-load product now being an estimate of a different thing,
  and the new `docs/GAPS.md` entry.

## Done when — verdict

1. **Met.** A reconnecting or subscribing client is served the last broadcast
   aggregate, asserted over a real socket and demonstrated in a browser.
2. **HALF met, and the residue is arithmetic rather than a decision deferred** —
   a restarted replica has neither a memo nor a market state, traced above with
   entry 8's figures. In `docs/GAPS.md` with three candidates and a condition
   for an owner; **in Gate 2 for the owner's call.**
3. **Met**, with the transcript of three weaker drafts passing wrongly and the
   break's red kept.
4. **Met** — the claim and the sentinel both amended, the count still three.
5. **Met** — ADR 0038 carries a dated amendment in two places.
6. See the gate output below.
