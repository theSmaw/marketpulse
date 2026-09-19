# Task 3.3.4 — The frontend transport: one module that knows the URL

**Status:** **Complete — 2026-09-19.** The transport, the pure reducer and the hook, in `apps/frontend/src/market/`. **A shipped defect was found before the browser could inherit it: `live` was unreachable during a session**, which is 3.2.6's defect in a mirror. 36 tests, and a new `pnpm invariants` check with its break.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.3

## Objective

The browser's side of the socket — **one module, one place that knows the
address**, and a hook above it holding domain state. No component changes.

## What the user can see when this lands

**Nothing.** A hook nothing calls yet.

## What is already decided and must not be re-taken

- **`api-client.ts` is the only file in the application that calls `fetch`**,
  and that is a stated property of this repository. **A socket is a second
  boundary and wants the same treatment**: one module, one place that knows the
  URL, everything above it holding domain state.
- **Configured at BUILD time**, like every other frontend value — which means
  the deployed frontend **cannot be pointed at a different backend without a
  rebuild**, and that is the existing consequence rather than a new one.
- **Two clocks** (delivered by Task 3.2.6, in this story's `STORY.md`):
  `disconnected` at 165 s is **monotonic**; `stale` at 60 s is **wall clock**.
  Using one for both makes `stale` **unreachable** — it shipped that way once.
  Anything here computing a status or an age takes **both**.
- **`stale` is gated on the market being open** (§11.2). Out of hours the same
  socket is legitimately silent for **76 minutes**.

  **AMENDED 2026-09-19 after Task 3.3.1, and this is now a decision this task
  owes rather than an inherited fact.** That task put `marketOpen` on the wire
  in `WireFeedState`, **so the browser now has two answers** to _is the market
  open_:

  | Answer                     | Whose clock      | What it is about                                    |
  | -------------------------- | ---------------- | --------------------------------------------------- |
  | `WireFeedState.marketOpen` | The **server's** | What the feed's own gate actually used              |
  | `useMarketClock`           | The **viewer's** | What this person's machine says the market is doing |

  **They can disagree, and the disagreement is the point rather than a bug.**
  `marketSessionStateAt` takes an instant (ADR 0017), so it is only as good as
  the clock supplied — a viewer an hour out would compute a different session
  state from the server's, and gating on theirs would suppress or invent a
  staleness warning about a feed the server can see perfectly well.

  **Decide which drives the status, and say why in the code.** The likely answer
  is the **server's**, because the status describes the server's feed — but
  `MarketClock` must keep rendering the **viewer's**, because that region is a
  timezone claim about the person reading it, and this story's `Out of scope`
  explicitly refuses to turn it into a synchronisation claim.

  **Do not let them silently be the same variable.**

### `feed: null` is a THIRD thing, and the hook is where it stops being confusable — added 2026-09-19 after Task 3.3.3

`connectionWordFor(status, feed)` returns **`null`** when the feed identity is
`null`, because §11.3's grid gives the unconfigured row a `—` in the connection
cell rather than a word. **That rule is already written and this task must not
re-derive it** — but it lands two obligations here:

- **A `feed: null` state has no connection to age.** Do not run §11.2's 60 s and
  165 s thresholds over a deployment that was never asked to connect to
  anything: a staleness threshold applied to a feed that does not exist produces
  a transition between two states that are both _nothing is configured_.
- **`the server has no provider` and `we lost the server` are two different
  facts and both arrive as `disconnected`.** The first is what the gateway sends
  (3.3.2); the second is this hook noticing its own socket is gone. **They are
  distinguishable here and nowhere above here** — once the hook has collapsed
  them into one `FeedStatus`, no component can tell them apart.

  **SETTLED by the owner on 2026-09-19** (`STORY.md` open decision 3): the
  chrome says **`DISCONNECTED` once our own socket dies, whatever the feed
  identity**, so the cell reads `NOT CONFIGURED · DISCONNECTED`. The `—` in
  §11.3's grid belongs to _the server has no provider_ and **not** to _we cannot
  reach the server_.

  **So this hook must carry the distinction outward, and it must be an argument
  to `connectionWordFor` rather than a second code path** — that function exists
  precisely so one place decides, and `pnpm break
connection-words-in-a-renderer` goes red for the alternative.
  `connectionWordFor`'s unconditional `null` on `feed === null` is the grid read
  literally and is now **half a rule**; completing it is this task's, and the
  test that proves it belongs beside the pure reducer's.

- **There is no store** (§12.1, ADR 0023). Live state has **one writer** — the
  message handler — and many readers, and **age is derived rather than held**.
  The walk is recorded; do not re-take it because prop-drilling chafes.

## Work

- **The transport module.** Connect, decode with 3.3.1's boundary, hand typed
  messages up. It knows the URL and nothing above it does.
- **The hook.** State as a plain discriminated union whose transition is a
  **pure function** — `FRONTEND-STATE.md` §1's shape, which is what keeps a
  later store a re-wiring rather than a rewrite.
- **Derive the status in the browser** from the connection state and the
  observation instants, taking both clocks. **Do not send a status the server
  computed** — §11.1 has no `staleSeconds` on the wire for the same reason.
- **A closed socket is a state, not an error boundary.** §36 forbids collapsing
  to a global error screen, and this is the first place in the frontend where
  that is testable.
- **Handle the `unreadable` decode, which Task 3.3.1 made a value rather than a
  throw.** `decodeMarketStreamMessage` returns
  `{ kind: "unreadable", reason }` for a malformed message, **and something has
  to do something with it.** The transport must not crash — that is the whole
  reason it is a value — but a message the browser cannot read is also not
  nothing: dropping it silently means a protocol mismatch after a deploy looks
  identical to a quiet feed. **Decide whether it is logged, counted, or surfaced,
  and record which.**
- **A `feed` message arrives every 120 s whether or not anything changed —
  added 2026-09-19 after Task 3.3.2.** The gateway keeps the socket alive
  against Azure's **240-second idle** ingress timeout, because §6.6 measured our
  own feed legitimately silent for **76 minutes** out of hours and an
  unkeepalived socket would be cut every four minutes all night.

  **Two consequences for this hook, and the second is the subtle one:**

  1. **An unchanged state must not cause a render.** Story 3.3's criterion 6
     measures the render count against `useMarketClock`'s baseline — lifting
     that hook to `App` produced **40 re-renders in 20 s against 0**. Thirty
     keepalives an hour is not that, but a hook that notifies on every message
     rather than on every _change_ is the same defect at a lower rate, and it is
     free to avoid.
  2. **The keepalive is ALSO the browser's liveness signal, and that is a
     stronger position than the backend's.** Story 3.2's client watches inbound
     frames because the vendor's 54 s heartbeat is the only thing distinguishing
     a quiet feed from a dead one. Here the gateway's 120 s keepalive plays the
     same role — **so a browser that has heard nothing for 165 s has genuinely
     lost the socket**, rather than merely watching a quiet market. Say so where
     the threshold is applied, because it is the reason the same number means
     something different on this side.

- **No reconnection policy** — Story 3.10's. Report `disconnected` honestly and
  stop. **Say so in the code**, because a transport is exactly where somebody
  adds a retry loop without noticing it is a policy.

## Done when

- One module knows the socket URL; a grep proves nothing else does
- The hook's transition is a pure function with tests and **no socket**
- Both clocks are taken, and a test proves `stale` is reachable — the regression
  that made it unreachable is the reason this is an acceptance criterion
- A closed socket produces a state, not a thrown render
- **An `unreadable` message has a decided disposition** — not dropped by default
- **A keepalive `feed` message carrying an unchanged state causes no render**
- **Which `marketOpen` gates the status is decided and argued in the code**, and
  `MarketClock` still renders the viewer's clock
- **No component consumes the hook yet**
- `pnpm verify` passes

---

## What was found

### `live` was unreachable in session — a shipped defect, found by arithmetic rather than by a test

**This is the task's real finding, and it was in the backend rather than in
anything this task wrote.**

§11.2's table specifies `stale` as _no observation for 60 s while the market is
open_, and justifies the number from **§7.9's 8.6 s longest in-session silence
of any inbound frame** — a fact about **arrival**. But the rule is applied to
**an observation's own instant**, and **§7.3 measured that `t` marks the START
of the interval**, with a control and a verbatim frame:

```text
a bar stamped `14:01:00Z` arrives at `14:02:00.5Z`
```

So the newest observation a minute-bar feed can possibly hold is **60.5 s old at
the instant it arrives**, and `wallNow - lastObservationAt >= 60_000` was
therefore **true on every healthy delivery**. Proven against the shipped code
before anything was changed:

```text
age of the newest observation at the moment it arrived: 60500 ms
status: stale
```

**This is Task 3.2.6's defect in a mirror.** That one merged two clocks and made
`stale` unreachable; this one measured from the wrong end of an interval and
made `live` unreachable. Both were invisible to every test for the same reason:
**every test supplied round numbers for the pair _(bar instant, arrival)_, and
the defect only appears when the two are a minute apart — which is to say, when
they are realistic.**

Both halves were in this repository's own record, two sections apart, and
neither had been read against the other. §7.3's measured pair is now in three
test files by name.

**The repair keeps §11.2's sentence and fixes its arithmetic.** An observation
describes an interval and is not _late_ until that interval has closed, so the
age is measured from the end and the 60 s of silence begins there.
`OBSERVATION_INTERVAL_MS` holds the duration, with **a second timeframe on this
feed** as its reversal trigger — at which point the duration belongs on the
observation rather than in a module constant.

### The rule moved to `packages/shared`, and the file had predicted it

`stream-connection.ts`'s own doc comment said its inputs were arguments rather
than readings so that the module _"would let this move into `packages/shared`,
where reading the wall clock is a lint error (ADR 0017), without changing a
line."_ That is what happened, and the design survived it unchanged.

**What moved is the rule; what stayed is the mapping.** `phase` is a _vendor
handshake_ concept — `greeted`, `authenticated`, `refused` are Alpaca's frames
and mean nothing to a browser — so `feedStatusOf` is now a four-line adapter
collapsing it to one boolean. **Seven call sites were named by the compiler**,
not one of them by reading.

### Two connections, one word

The thing the story had not said out loud:

| Link                  | Who watches it                              |
| --------------------- | ------------------------------------------- |
| Alpaca → our backend  | `apps/backend/src/stream-connection.ts`     |
| our backend → browser | **`apps/frontend/src/market/live-feed.ts`** |

Either can fail while the other is perfect, and the chrome shows **one** word.
So the two answers are combined with `worseFeedStatus`: a browser whose own
socket is healthy has learned nothing about the market if the backend's feed is
dead, and the backend's last word of `live` is not evidence of anything once we
cannot hear it.

**And the browser derives rather than trusting, for a reason with a number in
it.** Task 3.3.2's keepalive is the rate at which an unchanged feed state is
re-sent, so **the server's word can be 120 s old**: a feed that went stale a
second after a `feed` message would be reported live for nearly two minutes.
Deriving in the browser applies the same rule sooner. §11.1 keeps `staleSeconds`
off the wire for the same shape of reason.

### The decisions this task owed, and the answers

**Whose `marketOpen` gates staleness: the server's.** The status describes the
**server's** feed, and `marketSessionStateAt` is only as good as the clock it is
handed (ADR 0017) — a viewer an hour out would suppress or invent a staleness
warning about a feed the server can see perfectly well. It also arrives on the
same message as the state it gates, so there is never a window where staleness
is computable and the gate is not. **`MarketClock` keeps rendering the viewer's
own clock**, because that region is a timezone claim about the person reading
it; the code says so where they could otherwise become one variable.

**An `unreadable` message is COUNTED, and reported once.** Counted because
dropping it silently makes a protocol mismatch after a deploy look identical to
a quiet feed — the ambiguity §11.2's thresholds exist to remove. Reported once
per connection rather than per message, because a mismatch produces the same
reason every time and a console filling at the feed's own rate is a log nobody
reads. Not surfaced: a count in a status strip is developer detail.
`reportUnreadableMessage` sits in `report-error.ts` — the one place this
application reports anything — at `warn` rather than `error`, because everything
else in that file is a broken render and this is a working page.

**A `feed: null` deployment is not aged.** Running §11.2's staleness over a feed
that was never asked to connect produces a transition between two states that
both mean _nothing is configured_. Our own socket's liveness is still measured,
because that is how `backendReachable` is known — which is the flag that
completes §11.3's half-rule.

### The keepalive costs a bounded one-off, not thirty renders an hour

The connection lives in a **ref** and only the derived **view** is state, with
`sameLiveFeedView` as the gate. Holding the connection in state would have made
Task 3.3.2's 120 s keepalive re-render the application to redraw an identical
word — the shape of defect that produced **40 re-renders in 20 s against 0**
when `useMarketClock` was lifted to `App`, at a lower rate.

**The first assertion was "zero renders" and that was wrong about React rather
than about the code.** Setting state to a value React considers unchanged bails
out of re-rendering the subtree, but React may still call the component once
before it does. The test now asserts the property that actually matters —
**renders do not grow with keepalives** — measured across two batches of three.

**And there is a timer, because silence has no event.** A feed that stops
produces nothing to react to, so the only way to notice 165 s of it is to look.
Five seconds: 1/12 of the 60 s threshold and 1/33 of the 165 s one, and a tick
that changes nothing renders nothing.

### The React Compiler fired again, and the repair was simpler again

The `refs` rule rejected a draft that mirrored the hook's options into a ref
**during render**. It was right. The fix is that the seams are captured by
`useRef`'s initial value and never written — **which is the honest semantics
rather than a workaround**: a socket's clock and its constructor are fixed for
as long as it is open, and swapping either under a live connection is not a
thing to support, it is a new connection.

**The test suite then caught the other half.** An intermediate draft put the
seams in the effect's dependency list, which tore the socket down and rebuilt it
on **every render** — visible only as a snapshot that vanished between a message
and the assertion about it. Three tests failed and all three were the same
defect.

This is the third time these rules have fired in this repository and the third
time the repair was smaller than the code it replaced.

### A new invariant, which went red on its own first run

**`api-client.ts` is the only file in this application that calls `fetch`, and a
socket is a second network boundary.** `one-home-for-the-socket` now holds both
halves — `MARKET_STREAM_PATH` and `new WebSocket(` appear in exactly one shipped
frontend file — and it caught a real thing immediately: the **hook** was
constructing the socket, which is not a network boundary but a thing holding
state about one. Moved to the transport.

`MARKET_STREAM_PATH` itself moved to `packages/shared`, because the frontend
cannot import from `apps/backend` and the alternative was the browser spelling
the path a second time. **The origin did not move and must not**: it is a
build-time fact about a deployment, not a fact about the protocol.

```text
✓ a-second-socket-in-the-frontend  broken → red → restored byte-identical
```

### What was deliberately not built

- **No reconnection.** Story 3.10's. `disconnected` is reported honestly and
  the transport stops, and the code says so — a transport is exactly where
  somebody adds a retry loop without noticing it is a policy.
- **No observation store.** The hook keeps the newest observation's **instant**,
  because staleness needs it, and **not the observations themselves**. §11.1's
  omission semantics and §10.3's one-Map rule deserve the task that renders a
  price rather than a Map nobody reads. Story 3.4 adds it to an existing
  reducer, which is additive.
- **No component consumes it.** Task 3.3.5.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the **fourth
of seven** tasks in the story that changes that — **`LIVE` appears on screen at
the next one.**

**What this task built: the browser's end of the wire.**

The previous three tasks defined the language, opened the door, and wrote the
words. This one is the part inside the browser that holds the connection open,
listens, and works out what to say. After this, everything needed for the screen
exists; the next task puts it on the screen.

**But the interesting part is a bug we found in work already shipped.**

The system has a rule for deciding whether the market feed is healthy: _if no
new price has arrived for 60 seconds while the market is open, say the feed has
stalled._ Sensible, and it has been in place for two days.

**It could never say "live" during trading hours.** The reason is a detail
nobody had put next to it. Our market data arrives as **one-minute summaries**,
and each one is stamped with the time the minute **began** — a summary of
10:41–10:42 is stamped 10:41, and it is delivered at 10:42, when the minute is
over. We measured that precisely during the research phase and wrote it down:
_a bar stamped 14:01:00 arrives at 14:02:00.5._

So the freshest piece of data the system can ever hold is already **just over 60
seconds old the moment it arrives** — and the 60-second rule fired on every
single healthy delivery. The feed would have reported itself as stalled all day,
every day, while working perfectly.

**Both halves of that were in our own documentation, two sections apart, and
nobody had read one against the other.** One section justified the 60 seconds
using a measurement about how often data _arrives_; the other measured what the
timestamps actually _mean_. Each was correct.

**Why no test caught it:** every test used tidy round numbers for "when the data
happened" and "when it arrived". The fault only shows up when those two are a
minute apart — which is to say, when they are realistic. The real measurement is
now written into three test files by name, so it cannot drift back.

**The fix keeps the rule and corrects the sum.** A one-minute summary isn't
_late_ until its minute is over, so the clock starts there. And this is a
striking echo: two days ago we found the **mirror** of this bug, where the
system could never say "stalled". Same rule, opposite failure, both silent.

**A design point worth reporting, because it changes what the screen can
honestly say.**

There are **two** connections between a stock exchange and a person looking at
our page: one from the market to our server, and one from our server to their
browser. Either can break while the other is perfect. The screen has room for
**one** word.

We resolved this by always reporting the **worse** of the two. A browser with a
perfect connection to a server whose market feed is dead has learned nothing
about the market — and our server's last cheerful report is worth nothing once
the browser can no longer hear it. A chain is as live as its weakest link, and
saying otherwise is exactly the lie this story exists to avoid.

**And the browser works the answer out for itself rather than believing the
server**, which sounds like duplication and is not. Our server only re-states
its health every two minutes (it has to — see the previous task). So a feed that
failed one second after a report would be described as healthy for nearly two
more minutes. The browser applying the same rule to the same data notices
straight away.

**One small thing that protects the page.** If a message ever arrives that this
version of the page cannot understand — which is what a half-finished deployment
looks like — it is **counted, and mentioned once**. Not ignored, because then a
broken deployment would look exactly like a quiet market; and not repeated on
every message, because a warning arriving at the feed's own rate is one nobody
reads. The page carries on working throughout.

**We also added a new automatic rule.** Only one file in the entire browser
application is allowed to know the server's address or open a connection to it —
the same rule that already governs ordinary web requests. **It failed the moment
we switched it on**, catching a second place that was quietly opening its own
connection. Fixed, and then we deliberately broke it again to confirm the check
really does go red.

**How this unlocks progress.** Everything the screen needs now exists: the
language, the connection, the words, and the state. **The next task is the
visible one** — `LIVE`, on every route, and true.

**What a user can see today: nothing new.** One task from now, the corner of the
screen tells the truth about the market for the first time.
