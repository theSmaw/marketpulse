# Task 4.7.7 — The 332 frames, and the keepalive the threshold is derived from

**Status:** Not started
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
