# Task 4.7.7 — The 332 frames, and the keepalive the threshold is derived from

**Status:** Complete — 2026-10-11
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.1

## Objective

**One decision, not two** — and the coupling runs the opposite way from the way
this story's own file describes it.

## What the user can see when this lands

**Nothing.** A phone stops receiving about 15 MB a session it never needed.

## Work

### The defect, confirmed in source

`alpaca-stream.ts`'s `apply()` notifies `onConnectionChange` **unconditionally**,
and it is called **inside the per-item loop** over the inbound vendor message —
and **also on the vendor's `ping`**. `index.ts` answers each with
`gateway.publishFeedState()`, a broadcast to every client. Measured against the
deployed gateway: **~332 `feed` frames a minute in session** (median; min 3,
max 385), one burst in second `:00`, **119 bytes each, with no
`perMessageDeflate`** — so **39,508 B/min ≈ 15.4 MB a 6.5-hour session per
attached browser**, on the screen this story measures at 390.

**Nothing is lying**: the connection's `lastFrameAt` really did move. The fault
is that **a change to the watchdog's private bookkeeping is published as a
change to the browser's feed state**, and it is invisible because
`sameLiveFeedView` already suppresses the no-op render — **the mitigation for
the symptom predates any count of the cause.**

### The repair, and where it goes

Notify only when the **published** view differs from the last published one.
**`sameLiveFeedView` cannot be lifted**: it compares eight fields, five of them
frontend-only concepts and one derived on the browser's two clocks. The
backend's published view is `WireFeedState` — **three primitives** — so what is
wanted is a new `sameWireFeedState`, **beside `WireFeedState` in
`packages/shared`**, which is one home for one subject rather than a duplicate.

**The gate belongs inside `market-gateway.ts`'s `publishFeedState()`, not in
`index.ts`**, for three mechanical reasons: `readFeedState` is **time-dependent**
so only the send site can compare what was last **sent**; the keepalive and the
farewell call `broadcast(feedMessage())` **directly** and must stay ungated; and
**the handshake log line must stay outside the gate**, because it carries
`phase` and `subscribedSymbols`, which the published view throws away and which
are an operator's only view of the vendor handshake.

### And the threshold, which is the same decision

Repairing this **removes the vendor's 54 s heartbeat from the browser's inbound
stream**, because `apply` publishes on `ping` too. So the browser's idle floor
stops being 54 s and becomes **the keepalive, 120 s** — and the shipped 165 s
goes from **3.06× margin to 1.375×**, which is **1.4 missed keepalives**. One
delayed keepalive — timer drift, an ingress hiccup, a GC pause in a process also
running a 518-security join 6.8–16.1 times a minute — puts a **healthy** browser
at `DISCONNECTED`. **This story's own ~90 s candidate is falsified by the repair
this story also makes.**

**The owner's decision: re-derive the KEEPALIVE and keep 165 s.** At ~55 s,
165 s is **three missed heartbeats of our own heartbeat** rather than the
vendor's — which is ADR 0036's rule honoured rather than a number tuned. Cost:
~**130 B/min** per browser against today's ~30, and still **4.4× inside
`HOSTING.md`'s 240 s ingress idle ceiling** against today's 2×.

**`DISCONNECTED_AFTER_MS` is not touched**, and could not be: the same constant
**arms the backend's vendor watchdog**. `KEEPALIVE_INTERVAL_MS` is what moves,
and it is a cross-module ceiling with a hosting measurement behind it — so the
240 s headroom is restated in the change rather than assumed.

### What can and cannot be verified, stated before it is attempted

**The defect cannot be reproduced on anything a developer can run.**
`fixture-stream.ts` calls `apply` **once per tick** and `replay-stream.ts` once
per **slice** — neither has a per-item loop — so a local run publishes ~1 frame
a minute. The available proofs are: **a unit test over `handleMessage` with a
multi-item array** (`alpaca-stream.test.ts` is the home), **a unit test that the
gate suppresses an identical published view and passes a changed one**, and **a
deployed in-session re-count**, which is owed and needs a session.

**And one figure survives the repair intact**: `/`'s **2 renders per applied
batch** is unchanged, because `feed` frames never re-rendered. **This is a
bytes-and-battery repair, not a render repair** — say so, rather than letting a
reader infer otherwise.

### Documents this falsifies

**ADR 0033's _"36 bytes a frame, at most 16 frames a minute"_ is false in the
tree** and has been owed an amendment since Task 4.1.6. The field obeys the
constraint; **the frame carrying the field does not.** A dated amendment, not a
rewrite.

## Done when

1. A `feed` frame is published only when the **published** view changes, gated
   at the send site, with the keepalive, the farewell and the handshake log
   untouched
2. `sameWireFeedState` lives beside `WireFeedState` with one subject
3. `KEEPALIVE_INTERVAL_MS` is re-derived so 165 s is three missed gateway
   heartbeats, with the 240 s ingress headroom restated and the byte cost stated
4. A unit test over a multi-item vendor message proves the defect's shape, and
   another proves the gate — **with the deployed re-count named as owed**
5. ADR 0033 and ADR 0036 carry dated amendments where this changes what they
   describe
6. `pnpm verify` and `pnpm test:process` green

---

## Handed here by Task 4.7.2 — 2026-10-10: the no-data state reads `STALE`, not `LIVE`

**Produced and photographed at four widths.** With the socket answered and no
observation ever delivered, the status bar reads:

```text
MARKET FEED IEX Trades reported by the IEX exchange only — not the full US
consolidated tape. STALE Connected, and no live prices have arrived yet.
```

— from the **first paint**, because `feedStatusFrom` returns `stale` on an
**absent** last observation rather than after 60 s of wall clock have elapsed.
`.capture/proxy-states/readings.json` carries the same reading for its rows 01
and 02, so this is longstanding rather than new.

**Why it is yours.** The 165-second `LIVE` this story owns is the state where
observations arrived **and then stopped**. Any derivation that argues from _a
phone reads `LIVE` while nothing has arrived_ is arguing about a state this
product does not have; the honest form of the complaint is _a phone reads
`LIVE` for 165 s after the last bar it did receive_. Both halves of the
threshold argument should be stated against the state that actually occurs.

---

## What was done — 2026-10-11

### The gate, and where it sits

`market-gateway.ts`'s `publishFeedState()` reads `feedState()` **once**,
compares it against the last **broadcast** view, and returns without sending
when they match:

```ts
const state = feedState();
const last = lastPublishedFeedState;

if (last !== undefined && sameWireFeedState(state, last)) return;

lastPublishedFeedState = state;
broadcast(feedMessage(state));
```

`feedMessage` now takes the state as an **argument** rather than reading
`feedState()` itself — otherwise a send site that compared one reading would
send another, since `feedStatusFrom` is a conclusion drawn fresh every time it
is asked.

`sameWireFeedState` lives beside `WireFeedState` in
`packages/shared/src/market-stream-protocol.ts`, and its field list is a
`Record<keyof WireFeedState, true>` rather than an array of names, so **a fourth
field on the wire is a compile error here** rather than a field silently left
out of the gate.

**What stays ungated, each for its own reason:**

| Site                            | Why                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| the **keepalive**               | it exists so the ingress sees traffic on a socket whose feed is legitimately silent for 76 minutes; a suppressed keepalive does nothing |
| the **farewell**                | the last thing a browser hears before the socket closes, and its `disconnected` may equal what was published                            |
| `index.ts`'s **handshake log**  | carries `phase` and `subscribedSymbols`, which the published view throws away — an operator's only account of the vendor handshake      |
| the **snapshot**'s `feed` field | unchanged; it is per-client and is how a browser's first paint is honest                                                                |

The keepalive **records** what it sent: after it, every attached browser holds
that state, which is exactly what the gate compares against.

### The one decision the brief did not contain: the snapshot invalidates the memo

`lastPublishedFeedState` means _every attached browser has received this_. A
snapshot sends a feed state to **one** client, which makes that sentence false,
so the snapshot **clears** the memo rather than updating it. Both alternatives
were tried:

- **Updating it** strands every browser attached _earlier_ on a state the gate
  then refuses to correct — and it is worse than argued: with the memo updated
  from the snapshot, the first publish after any connect is suppressed, which
  reddened **8** tests including two written years earlier (transcript below).
- **Leaving it alone** strands the _late joiner_, whose snapshot caught an
  intermediate state the feed has since returned from, until the next keepalive.

Clearing costs **one extra frame per connect** against the ~332 a minute the
gate removes.

### The keepalive, re-derived

```ts
export const KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3; // 55_000
```

Written as the division rather than as `55_000`, so the relation cannot decay if
either number is re-derived.

- **165 s is unchanged**, and `DISCONNECTED_AFTER_MS` could not have moved: the
  same constant arms the backend's vendor watchdog in `alpaca-stream.ts`.
- **165 / 55 = exactly 3** — three missed heartbeats of **our own** heartbeat,
  which is ADR 0036's rule honoured rather than a number tuned. At the old
  120 s it was **1.375**.
- **Byte cost, measured** rather than cited — `encodeMarketStreamMessage` over
  the real shapes: **119 B** for `live`/`iex`/open, 120 for `stale`, **127** for
  `disconnected`/`null`, 126 for `synthetic`. So the keepalive is
  **129.8 B/min** per attached browser at 55 s against **59.5 B/min** at 120 s,
  and the defect was `332 × 119 = 39,508 B/min` ≈ 15.4 MB a 6.5-hour session.
  (The brief's _"~130 B/min against today's ~30"_ compares a rate per minute
  with the module's old _"~30 messages an hour"_; the measured pair is
  130 against 60.)
- **The 240 s ingress ceiling, restated rather than assumed** —
  `HOSTING.md` quotes Azure Container Apps' ingress at a 240-second timeout,
  named as **idle** in the premium settings table, so it is a ceiling on
  silence. 55 s clears it by **4.36×**, against 2× before; **four** consecutive
  lost keepalives would now be needed to reach it. The ceiling has stopped being
  the keepalive's derivation and is now a constraint the derivation has to
  clear.

### Task 4.7.2's falsification, honoured

Nothing in this derivation argues from _a phone reads `LIVE` while nothing has
arrived_. That state does not exist: `feedStatusFrom` returns `stale` on an
**absent** last observation, from the first paint. Both halves of the argument
here are about the state that does occur — **the browser last heard a frame N
seconds ago** — which is what the 165 s monotonic threshold measures and is
exactly why the keepalive is its denominator.

### This is a bytes-and-battery repair, not a render repair

`/`'s **2 renders per applied batch is unchanged**. `feed` frames never
re-rendered: `sameLiveFeedView` suppressed them, which is why the defect
survived a whole epic — **the mitigation for the symptom predated any count of
the cause.** No render count, no screenshot and no page-error check can see this
change in either direction.

### What could and could not be verified

**Could not, and is owed:** the **deployed in-session re-count**. No local
stream has the per-item loop — `fixture-stream.ts` applies once per tick,
`replay-stream.ts` once per slice — so a developer's run publishes ~1 frame a
minute before the repair and ~1 after it. Written into Story 4.9's own
`STORY.md` with the instrument, the window and the expectation (~1.4 frames in
75 s), and `docs/GAPS.md`'s entry is **amended rather than closed** until that
reading exists.

**Could, and did** — six new tests in `market-gateway.process.test.ts` (real
socket, frames counted) and three in `alpaca-stream.test.ts` (the vendor side's
per-item notify, the `ping`, and one published view across twenty items).

### The passing-wrongly transcripts

**Four defects a next author would plausibly write, each applied to the real
tree, run, and reverted with the file compared byte-for-byte afterwards.** The
new tests were written first and were green; these are the proof that they are
not green for a reason of their own.

```text
A no gate at all (the tree before this task)
     × sends ONE frame for 332 publishes of an unchanged state 128ms
     × sends the next frame when the published view DOES change 131ms
      Tests  2 failed | 34 passed (36)

B the keepalive gated for consistency
     × leaves the KEEPALIVE ungated, which is what the ingress needs 5056ms
      Tests  1 failed | 35 passed (36)

C the snapshot UPDATES the memo instead of clearing it
     × leaves a HEALTHY client on the same process untouched 98ms
     × does NOT ride the feed-state path 5019ms
     × sends ONE frame for 332 publishes of an unchanged state 5009ms
     × sends the next frame when the published view DOES change 5022ms
     × gates on the view's own fields, so `feed` alone changing publishes 5029ms
     × leaves the KEEPALIVE ungated, which is what the ingress needs 5027ms
     × leaves the FAREWELL ungated, even when it repeats what was published 5022ms
     × does not strand a LATE JOINER on the state its snapshot carried 5033ms
      Tests  8 failed | 28 passed (36)

D the gate compares `status` only, by hand
     × gates on the view's own fields, so `feed` alone changing publishes 5061ms
      Tests  1 failed | 35 passed (36)

restored; identical: True
```

And the vendor side, with `apply` hoisted out of the per-item loop — the defect
a reader "simplifying" `handleMessage` would introduce, which would make the
gate above look like a repair while the connection stopped seeing the evidence:

```text
     × notifies the subscriber once per item of one message 4ms
     × moves the published view at most ONCE across twenty of them 2ms
      Tests  2 failed | 34 passed (36)
restored: True
```

**One of these tests was green for the wrong reason and was rewritten.** The
first draft of _one published view across a batch_ asserted the status was
unchanged either side of twenty items, against a `WALL_NOW` a minute past the
bar's own minute — so **both readings were `stale`** and the assertion held
however many views the batch had moved through. Probed deliberately:

```text
BEFORE stale AFTER stale LASTOBS 1789567260000
AssertionError: expected [ 'stale', 'stale', 1789567260000 ] to be 'SHOWME'
```

It now counts: twenty notifications, mapped through `feedStatusOf` on a clock
inside the bar's freshness window, and **one** distinct published view.

### The two break entries, and why neither could be run as `pnpm break`

`scripts/breaks.mjs` gained `the-feed-frame-is-a-heartbeat-again` (the gate
removed — the tree as it stood until today) and
`the-keepalive-stops-being-three-missed-heartbeats` (the constant back to
`120_000`, the edit that looks harmless because its old justification is still a
true sentence about a ceiling). **`break-verify.mjs` refuses on a dirty target**
and this task is uncommitted, so both are registered and the equivalent
substitutions were performed by hand with a byte comparison either side —
experiment A above is `the-feed-frame-is-a-heartbeat-again`'s substitution
exactly. They should be run with `pnpm break <name>` once committed.

**And one existing break had to be repointed in the same change**:
`the-overview-frame-rides-the-heartbeat` anchored on
`publishFeedState() { broadcast(feedMessage()); }`, which this task's body
replaces. `pnpm invariants` caught it —
`every-break-can-still-land` reported _its `find` matches 0 times_ — which is
that check doing exactly what it was written for. It now anchors on the
six-space `broadcast(feedMessage(state));`, unique because the keepalive's copy
is at four spaces, and its `proves` text was amended: the rate no longer reaches
a browser, but `publishFeedState` is still **called** ~332 times a minute, so an
ungated frame put on that path still inherits it.

### Documents

- **ADR 0033** — a dated amendment beside constraint 4 (_"36 bytes a frame, at
  most 16 frames a minute"_: true of the `bars` path and of nothing else; the
  field obeyed it, the frame did not), and a **second** amendment under the
  reversal trigger, which **had already fired when it was written** and never
  went off because it was worded against a rate nothing counted.
- **ADR 0036** — a dated amendment beside the threshold table: 165 s unchanged,
  a third number now derived from it, and a note that one constant arms two
  sockets as three missed heartbeats of a **different** heartbeat each. Plus a
  new reversal condition: the first change to either heartbeat.
- **`docs/GAPS.md`** — both entries amended rather than closed. The frame-count
  entry carries the repair, the mechanical coverage and the new expectation; the
  165 s entry carries the keepalive's new value and the Gate 1 decision.
- **`scripts/check-invariants.mjs`** — `the-overview-frame-is-not-a-heartbeat`'s
  comment said the defect was _"unrepaired on purpose and handed to Story 4.7"_.
  Amended, with why the check is still load-bearing: `publishFeedState` is still
  called at the vendor's item rate, and `sameWireFeedState` compares three
  primitives and would not see an aggregate.
- **`market-gateway.ts`** — the snapshot's own comment said the next thing an
  unsubscribed browser would hear is _"the 120 s keepalive — two minutes"_. Now
  55 s.
- **Sideways:** Story 4.9's `STORY.md` carries the deployed re-count as an
  actionable section of its own; Task 4.7.11's list has both ADR items marked
  discharged so the close neither re-takes nor misses them.

### Gates

`pnpm verify` green, including `pnpm test:process` as its last step:

```text
$ node scripts/check-invariants.mjs
53 invariants hold.
...
apps/backend test:  Test Files  50 passed (50)
apps/backend test:       Tests  1035 passed (1035)
apps/frontend test:  Test Files  86 passed (86)
apps/frontend test:       Tests  1406 passed (1406)
apps/backend test:process:  Test Files  2 passed (2)
apps/backend test:process:       Tests  55 passed (55)
```

No `Unhandled Errors` block in any run.

**And the four browser specs that talk to the real gateway rather than a
`routeWebSocket` mock**, because this change is a wire change:

```text
$ pnpm e2e market-feed.spec.ts market-connection.spec.ts market-reconnect.spec.ts market-stream-socket-count.spec.ts
  15 passed (14.3s)
```

The full suite was **not** run: the machine's one-minute load was 11.0 across 8
cores, and nothing else in the suite reaches the gateway's publish rate — every
other overview and security spec serves its own socket from
`e2e/support/feed.ts`.
