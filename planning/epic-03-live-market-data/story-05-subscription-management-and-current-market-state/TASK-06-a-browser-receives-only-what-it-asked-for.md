# Task 3.5.6 — A browser receives only what it asked for

**Status:** **Complete — 2026-09-21.** A browser receives only what it asked for. The page **declares its own need** rather than the feed inferring it from an address — which is a change of approach from what the amendments assumed, and the reason is in the record. Five process tests at 200 symbols, one browser assertion that the subscription survives a reconnect, one `pnpm break`.
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

---

## What was built

### A second protocol union, not a fourth message type

`MarketStreamMessage` is everything the **server** says. `SubscribeMessage` is
everything a **browser** says, and they are deliberately different types: a
gateway that could receive a `snapshot`, or a browser that could decode a
`subscribe`, is a category error the compiler should refuse rather than a case
somebody has to remember not to write. The version field is shared, because a
protocol mismatch after a deploy is one fact about one wire regardless of which
end noticed it.

**An empty `symbols` list is legal** and means exactly what it says — §11.1's
omission semantics applied to a subscription. It is also the state every
browser is in for the first moments of every connection, including each
reconnect.

### The gateway holds a map rather than a set

`Set<WebSocket>` became `Map<WebSocket, Set<string>>`. `broadcast()` survives
for the **feed** message, which every browser is owed; observations go through
a per-client filter in `publishObservations`.

**`scopedTo` returns `undefined` rather than an empty object**, so a client
that wants none of this batch is sent **nothing**. An empty `bars` message
would make a browser decide what _no observations_ means, and the answer is
that it should never have been asked.

**The message is encoded per client**, because the payloads genuinely differ. A
shared encode would be a cache keyed on the subscription — a mechanism with no
measured problem behind it.

### A late subscribe is answered with a `snapshot`

Task 3.5.4's rule, preserved on the door this task opens. A snapshot sets the
arrival mark's baseline; `bars` fires it. Answering a subscribe with `bars`
would mark every newly subscribed security — on every subscribe and, since Task
3.5.5, **on every reconnect**.

Without the reply at all, a browser that subscribes after connecting waits for
each security's next bar: a median of a minute and **up to 187** for a thin one,
which is exactly the wait the snapshot exists to remove.

### The subscription is re-asserted on every socket

Task 3.5.5's trap, closed. `connectMarketStream` now returns a connection
rather than a disconnect, buffers the wanted symbols and sends them on `open`.
A reconnect therefore re-subscribes without anybody asking — the same shape §8.7
forced on the upstream client.

**Changing the subscription does not reopen the socket.** The hook keeps the
socket effect on `[tickMs]` and carries the subscription in refs, with a
separate effect keyed on a **primitive** derived from the list. A dependency on
the array itself would re-send on every render of every parent; tearing the
socket down would make every navigation a reconnect, losing the snapshot and
the `LIVE` word for as long as a dial takes.

## The decision that changed mid-task

**The amendments assumed the subscription would be derived from the address.** I
wrote that module, tested it, and then deleted it — because the premise was
false: `App` **renders** `<BrowserRouter>` rather than living inside one, so it
cannot call `useLocation`.

The options were to restructure a 322-line, heavily-argued `App` so the hooks
sit inside the router, or to have the page declare what it needs. **The second
is both cheaper and better architecture**: the page says what it wants, nothing
couples the feed to a URL shape, and a screen that wants securities no address
names is a prop rather than a redesign.

`SecurityExplorer` declares `[symbol]` on mount and **withdraws on unmount**, so
a reader who navigates away stops being sent a price nothing renders.

## What scaling falsified — three of this file's own tests

**All three were correct when written**, and all three encoded _everyone gets
everything_, which is the contract this task ends.

| Test                                | Why it broke                                                                |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `delivers a bar down a real socket` | _attach and wait_ was the whole protocol; it now has to subscribe first     |
| `sends the snapshot FIRST…`         | the **first** snapshot is now empty, because nothing has been asked for yet |
| `omits an unobserved security…`     | same — the omission is now read off the answer to a subscribe               |

**And one of my own new tests had a race that read as a broken filter.**
`waitFor("snapshot")` matched the **initial** snapshot still in the buffer, so
the test cleared and published before the server had processed the subscribe.
The failure said _no bars within 5 s_, which looks exactly like a filter
dropping everything. Fixed with a counting waiter, so _the next one_ is
sayable — and the note is on the helper, because the next person will write the
same test.

## Evidence

- `pnpm break every-browser-gets-the-whole-universe` — red, restored
  byte-identical
- 5 process tests at **200 symbols** — the task's own warning is that three
  symbols passes against a `broadcast()` that ignores the filter entirely
- Well-formed generated tickers, because `toTicker` validates the shape and
  `SYM0` throws before it can test anything
- A browser assertion that the page **re-sends its subscription on every
  reconnect** — the only level that can check it
- `pnpm verify` green: 16 invariants, 921 backend, 1050 frontend, **29** process

**One honest caveat about the browser suite.** A full local `pnpm e2e` failed
2–5 specs per run, **with a different set each time** and durations of 12–40 s
against a normal 1–8 s — the signature of load on this machine rather than a
defect. Each failing spec passes in isolation, and the 21 specs this change
could plausibly affect all pass together. CI's run on a dedicated runner is the
arbiter.

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**A browser is now sent only the companies it is actually showing.**

### What was wrong

Since Friday the server has been watching all 518 companies we track — which is
what the market overview, the anomaly detection and the AI investigation tools
all need.

It was also **sending all 518 to every open browser, every minute**. A page
showing one company received 517 prices it had no use for and threw them away.
We measured it on the wire: **57 KB a minute, per open tab**, and the same again
every time a tab connects or reconnects.

In absolute terms that is small, and it was an accepted temporary cost — we
scaled the feed up deliberately before building the filter, because building
the filter first would have meant designing for a problem we did not yet have.
What makes it worth closing on schedule is that it scales with **browsers ×
companies**, and both of those only ever grow.

### How it works now

The browser says what it wants. The server keeps a note of it per connection and
sends each browser only its own securities.

Three details were worth getting right rather than quickly:

**A browser that has asked for nothing receives nothing.** That is a normal
state, not an error — it is what every browser is doing for the first fraction
of a second of every connection.

**Asking later gets an immediate answer.** If a browser subscribes after
connecting, the server replies at once with what it already holds. Without that,
the browser would wait for each company's next price — typically a minute, and
for a thinly traded company **up to three hours**.

**And that reply is deliberately labelled as _here is what we already hold_**
rather than _here is news_. Last week we added a small mark that appears when
new data arrives. If the answer to _here is what I want_ were labelled as news,
that mark would fire for every newly subscribed company — the exact problem we
solved on Friday, arriving through a different door.

### A decision I changed halfway through

The plan, written three days ago, was for the application to work out which
company a browser wanted **from the web address** — a security page's address
already names its company.

I built that, tested it, and then deleted it, because the plan rested on
something untrue: the part of the application that owns the connection sits
_outside_ the router and cannot see the address at all. The choice was to
restructure a large, carefully-documented file so it could, or to let each
screen say what it needs.

**The second is cheaper and better.** Nothing is tied to the shape of a URL, and
the first screen that wants companies no address names — a watchlist, a
comparison a user assembles — becomes a small change rather than a redesign.
Worth flagging because the plan said otherwise and the record now explains why
it doesn't.

### Something worth knowing about the tests

**Three of our existing tests broke, and all three were correct when written.**
They encoded the old contract — _connect and you receive everything_ — which is
precisely what this work ends. That is the third time this week that scaling
something has falsified a test that was right at the time, and it is a good
sign: the tests were specific enough to notice.

One of my _new_ tests also had a subtle flaw that made it look like the filter
was broken — it checked its results a fraction too early and saw the server's
previous reply. Worth mentioning because the failure message pointed at the
product rather than the test, which is the kind of thing that costs an hour if
you take it at face value.

### What you would see today

**Nothing on screen** — but the product is now doing roughly a five-hundredth
of the work per browser that it was this morning.

**Next:** protecting the server from a browser that stops reading, a round of
measurements, and then the screen this whole run of work has been building
towards — **live prices across all 518 companies at once**.
