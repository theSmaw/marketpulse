# Task 3.5.6 — A browser receives only what it asked for

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.3, 3.5.4

## Objective

Make the downstream fan-out **per browser**. Today `market-gateway.ts` holds one
`Set<WebSocket>` and a `broadcast()` that sends the identical payload to every
client — correct for five symbols and one page, and **wrong at 518**.

Criterion 3: _a browser that has subscribed to eight securities must not be sent 518._

## What the user can see when this lands

**Nothing directly**, but this is the task that makes
[3.6](../story-06-live-prices-across-the-universe/STORY.md) affordable rather
than merely possible. Without it, a security page open on one symbol receives
the whole universe every minute and throws 517 of them away in the browser.

## The asymmetry that makes this necessary rather than tidy

**Upstream is a constant and downstream is not.** §10.2 settles that this
backend always asks Alpaca for the same 518 — there is no diffing and no
unsubscribe path, and Task 3.5.3 is explicit that building one would be
designing for a problem this epic does not have.

**Downstream is the opposite.** Story 3.6's overview wants all 518. A security
page wants one. Epic 4's overview will want a different subset again. The
browser's selection is genuinely dynamic, and it is the **only** dynamic
subscription in this epic.

Do not let the upstream decision leak into this one. They look like the same
problem and they are not.

## Coalescing, which is a real case rather than a precaution

Several observations for one security inside one tick **happens at the open**.
Two shapes and they need different answers:

- **Two different minutes for one symbol** — both are real, and the later one is
  the current state. Send the latest; a browser rendering a price does not want
  a backlog it will overwrite within a frame.
- **A revision of a minute already sent** — §14.1's `u` frame, 29.1–30.1 s
  later, **35.3% of which change the close**. This is not a duplicate to
  collapse; it is a correction that must reach the browser, because Story 3.4's
  mark fires on observation **content** and a silently dropped revision is a
  price that stays wrong.

**Collapsing those two cases together is the defect this section exists to
prevent.**

## Work

- A subscribe message in the browser protocol, and a per-client symbol set
- Send an observation to a client only if that client asked for its symbol
- Coalesce per `(client, symbol)` within a tick, **latest wins**, with revisions
  exempt from collapse
- The snapshot on connect is **already** scoped by what the client asked for —
  and if it asks for nothing yet, it receives nothing rather than everything
- Keep the wire shape §11.1 defines; this task changes **who** receives an
  observation, never what one looks like

## Done when

1. A client subscribed to one symbol receives one symbol's observations while a
   second client subscribed to the universe receives all of them, **on the same
   process, at the same time**
2. Checked at a size where the difference is visible — criterion 3's own
   words — which means hundreds of symbols, not three
3. A revision reaches a subscribed client even when it arrives in the same tick
   as a newer minute for the same symbol
4. A client that has asked for nothing receives nothing, and this is not an
   error
5. `pnpm break` proves the filter goes red when removed — a broadcast to all is
   exactly what the test must catch
6. `pnpm verify` passes

## The trap worth writing down before it is hit

**Every one of these questions has a wrong answer that works perfectly for one
security**, which is the story's own reason for existing. A test with three
symbols and two clients passes against a `broadcast()` that ignores the filter
entirely, because with three symbols the right answer and the wrong answer are
the same bytes often enough. Size the assertion so they differ.

---

## Amended by Task 3.5.1 — 2026-09-21: one line of this task's coalescing rule is now wrong

This task said revisions are **exempt from collapse** and must always reach the
browser. **That is half right, and the half that is wrong would undo a decision
3.5.1 took deliberately.**

3.5.1 established that the current market state applies a revision by
`(symbol, minute)` and **never walks backwards**: a correction for a minute
already passed is ignored, because applying it would make the latest observation
older than the one it replaced, and every reader would watch the price jump
back in time for no reason a user could understand.

**A fan-out that forwarded every revision unconditionally would put exactly that
backwards jump on the screen** — the thing the state was built to prevent —
because Story 3.4's arrival mark fires on observation **content**, so a stale
correction would both move the number and mark it as news.

### The corrected rule

| Revision is for…                       | Forward to a subscribed browser?                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| the minute the browser currently holds | **Yes** — §14.1's 35.3% that change the close, and the whole reason `updatedBars` is subscribed |
| a minute already superseded            | **No** — it is not news about _now_; Story 3.9's store is where it belongs                      |

**This is the same rule as the state's, and after Task 3.5.2 it should be the
same code** rather than a second implementation that agrees by coincidence.
Once the gateway is fed from the state instead of from the raw stream, a
superseded revision never reaches the fan-out at all, and this table describes
what already happens rather than something to enforce again.

**Check that before writing a filter**: if 3.5.2 landed properly, the work here
may be zero.

---

## Amended by Task 3.5.2 — 2026-09-21: two thirds of this task turned out to be already done

The previous amendment said _check before writing a filter; the work here may be
zero._ It was checked. Two of the three pieces are gone, and one remains.

### 1. The revision half IS zero — confirmed, not assumed

3.5.2 made `gateway.publishObservations()` take **what the current market state
applied**. A revision for a minute already superseded never reaches the gateway
at all, so the two-row table above describes what **already happens** rather
than something to enforce again.

**Do not re-implement it, and do not add a second copy of the rule** — that was
exactly 3.5.2's argument for returning the applied set rather than teaching the
gateway the same policy.

### 2. Intra-batch coalescing is mostly already done, by the wire format

`observationsToWire` builds a `Record` keyed by symbol:

```ts
wire[observation.symbol] = toWireObservation(observation.bar);
```

So two observations for one symbol in a single batch **collapse to the later
one before the message is built**. The _latest wins_ rule this task was going to
implement is a property of the wire shape.

**What is still worth asserting** is that this is deliberate rather than
incidental, because it is invisible at the call site and a future change to the
wire shape — a list instead of a map — would silently remove it.

### 3. The per-client symbol filter is the whole of the remaining work

`broadcast()` still sends the identical payload to **every** client in the
`Set<WebSocket>`. That is the real subject of this task, and it is unchanged:

- a **subscribe message** in the browser protocol, and a per-client symbol set
- the filter belongs in **`publishObservations`**, which is now the single place
  observations become a message — `market-gateway.ts` no longer subscribes to
  anything
- the snapshot on connect scoped to what the client asked for, which Task 3.5.4
  will have just built unscoped

**And it closes a window 3.5.3 opened deliberately**: with the universe
subscribed and no filter, every attached browser receives all 518 observations a
minute. That is accepted as temporary and **this task is what makes it stop**.

---

## Amended by Task 3.5.3 — 2026-09-21: the window this task closes is now open and sized

3.5.3 scaled the upstream set to the tracked universe, so **every attached
browser now receives all 518 observations a minute** and discards all but the
one or two it is showing. That was accepted deliberately, with this task named
as what stops it.

**The size, computed from the real wire shape rather than estimated:
70.2 KiB per minute per attached browser**, and the same again as the snapshot
on every connect — which Task 3.5.5's reconnect makes more frequent than once
per visit.

That is still small in absolute terms. What makes it worth closing on schedule
is that it scales with **browsers × universe**, and both of those only grow.

**This task is also where the snapshot becomes scoped**, not just the ticks —
3.5.4 builds it unscoped and leaves the seam open on purpose. A client that has
asked for nothing yet receives nothing, which is an ordinary state rather than
an error.

---

## Amended by Task 3.5.4 — 2026-09-21: the seam is open, and there is now a rule to preserve

### The snapshot seam is genuinely filterable

3.5.3's amendment asked 3.5.4 to leave scoping easy. It did, and the reason is
worth stating precisely so this task does not go looking for a rewrite:

**`market-gateway.ts` calls `snapshot()` inside the connection handler**, once
per attached browser, and copies the result into a per-client `observations`
object. Scoping is therefore a **filter inside that loop** — the
`MarketGatewayOptions.snapshot` signature does not have to change and
`snapshotOf` does not have to learn about clients.

### The rule you must not break

**A snapshot is not an arrival** (3.5.4). Scoping the snapshot must not turn a
scoped one into something that marks:

- A client that subscribes to eight securities receives a snapshot of **eight**,
  and all eight are **baselines** — `withDelivery` replaces the set wholesale on
  a `snapshot` message, so a smaller snapshot is still a snapshot.
- **A late subscribe is the case to think about.** If a browser connects, gets
  an empty snapshot because it has asked for nothing, and _then_ subscribes to
  eight securities — what is sent in response? If it is a second `snapshot`
  message, the rule holds by construction. If it is a `bars` message, **every
  one of those eight marks**, which is the defect 3.5.4 exists to prevent
  arriving through a different door.

**Send it as a `snapshot`.** The type is not about ordering, it is about what
the message _means_: _here is what we already hold_, which is exactly what a
late subscribe asks for.

### And the window, now measured rather than estimated

The fan-out this task closes is **56.9 KiB** per minute per attached browser
(58,218 bytes, read off the wire at 518 securities by 3.5.4), plus the same
again on every connect — and Task 3.5.5's reconnect makes connects more frequent
than once per visit.

---

## Amended by Task 3.5.5 — 2026-09-21: the reconnect creates a trap this task must not fall into

### A subscription must be re-sent on every reconnect

The browser now **reconnects by itself** — and a reconnect is a **new socket**,
about which the server knows nothing.

Today that is harmless: a browser subscribes to nothing and receives everything,
so a fresh socket is as good as the old one. **The moment this task gives the
browser a subscription, that stops being true.** A reconnected tab that does not
re-send its symbols is a tab that is connected, says `LIVE`, and receives
**nothing** — which is worse than the `DISCONNECTED` state 3.5.5 removed,
because it looks healthy.

**Where it goes:** the subscribe must be sent from the socket's own `opened`
path rather than once at mount, so _every_ connection carries it — the first and
each retry alike. That is the same shape as the upstream client, which §8.7
measured as remembering nothing across a reconnect and therefore re-asserts its
constant every time.

**Assert it against a real reconnect**, which `market-reconnect.spec.ts` can now
do: drop the socket, let the page come back, and confirm the client still
receives only what it asked for.

### And the answer to a late subscribe is still a `snapshot`

Unchanged and now doubly true: a reconnect's catch-up **is** a late subscribe.
If the response to _here are my symbols_ is a `bars` message, every newly
subscribed security marks — 3.5.4's defect arriving through a different door,
on every reconnect rather than only on first load.
