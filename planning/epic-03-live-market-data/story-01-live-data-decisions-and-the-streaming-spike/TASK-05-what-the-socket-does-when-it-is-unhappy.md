# Task 3.1.5 — What the socket does when it is unhappy

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.4

## Objective

Produce, deliberately, every way this connection can go wrong, and record the
frames and the codes verbatim — so that Story 3.2's state machine and
Story 3.10's degraded states are written against a measured vendor rather than a
documented one.

The precedent is exact and it is the reason this is a task rather than a
paragraph: `ALPACA.md` §9b records that a mapping written from documentation got
**three things wrong** on the HTTP API, and every one of them was a case a
reasonable reader would have got wrong the same way.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3 for the connection state, and Story 3.10
for the whole set of degraded states — which is the story that cannot be done
honestly without this capture.

## What is already decided and must not be re-taken

- **The free plan allows exactly one connection.** So a duplicate connection is
  not an edge case in this product, it is the **deploy**: a rolling replica
  replacement has two processes alive at once by design, and whichever behaviour
  the server picks is a production behaviour on every deploy.
- **The socket is outbound and `minReplicas: 1` is required** (ADR 0011). No
  ingress timeout governs it; the failure mode that kills it is the replica
  ceasing to exist, and that failure **looks like a feed that stops rather than
  an error**.
- **A 5xx never carries the thrown message** and a message written for a
  developer is internal detail. Whatever this task finds, the mapping it feeds
  reaches a user as a product sentence, not as a vendor string.
- **`PRODUCT_SPEC.md` §36: degrade incrementally and locally**, never collapse
  to a global error screen. Every fault below has to have a local answer.

**Added 2026-09-15 by Task 3.1.2** — [`LIVE-DATA.md`](LIVE-DATA.md) §4.2 and
§4.4, and the first of these reshapes the taxonomy's own _How our side finds
out_ column rather than informing it:

- **The close code carries no intent.** A clean, client-initiated `close(1000)`
  is observed locally as **`1006` with an empty reason** — the same code a
  dropped link produces — because Alpaca never echoes a close frame. Confirmed
  at two wait lengths. So **no row in this taxonomy may be distinguished by its
  close code alone**, and the harness must record what it asked for before a
  code means anything. This is the measurement Story 3.10 most needs.
- **An error is a frame, not a closure.** Nine deliberately bad requests, nine
  `T=error` frames, the socket never closed once. A fault that arrives as a
  message on the data channel is the normal case here, so a state machine that
  tears a socket down on one error is wrong — and a fault probe that waits for a
  close will record a false _silent_.
- **The `sip` refusal is the shape to expect from an auth-stage failure**
  (§4.5): the socket **opens**, the greeting is identical to the working
  endpoint's, the refusal arrives at authentication as `409`, and **the server
  leaves the socket open afterwards**. Expect the bad-credential probes below to
  have the same shape, and record whether they do — a client keying "connected"
  off `onopen` reports healthy forever in exactly this case.

**Added 2026-09-15 by Task 3.1.3** — [`LIVE-DATA.md`](LIVE-DATA.md) §6.3 and
§6.4. One of these removes work from this task and one adds a probe nobody knew
to ask for:

- **The plain idle question is answered, so do not re-take it.** The server
  heartbeats a WebSocket `ping` every **54 seconds** — measured at 53.96–54.04 s
  on a socket subscribed to nothing and on one subscribed to all 518, so it is a
  property of the connection rather than of the subscription — and it did not
  close an idle connection across Task 3.1.3's holds. The idle bullet below is
  therefore **not** _does an idle socket get closed_; it is the rude-client case
  immediately after.
- **The probe this task now owes: a client that stops answering.** Every capture
  in this story pongs, because `ws@8` answers a ping automatically and silently.
  **Nothing has measured what Alpaca does to a connection that stops ponging**,
  and it is not academic: a Story 3.2 client built on Node's built-in
  `WebSocket` can neither see the ping nor send a pong (§4.6), so it would fall
  into this case **by construction** on its first quiet night. Produce it
  deliberately — suppress the automatic pong, hold, and record whether the
  server closes, after how many missed heartbeats, and with what code. This is
  the other half of figure 19.
- **Check that nothing else is holding the socket before starting**, for the
  reason Task 3.1.4 now carries the same line: one connection on this plan, and
  Task 3.1.3 may have an unattended multi-hour hold running. An overlap turns
  this task's duplicate-connection measurement into a measurement of itself.

## Work

Produce each of the following, record the frames, the close codes and the
timings verbatim, and note in each case **how our side finds out** — a frame, a
close, a timeout, or nothing at all. The last is the dangerous one.

- **A duplicate connection.** Two authenticated connections on one plan. Which
  one survives; what the loser receives; whether the winner is disturbed; how
  long it takes. Then the deploy-shaped version: connection B authenticates
  while A is mid-session, and A is the one holding subscriptions.
- **A bad credential** — wrong key, wrong secret, absent, and well-formed but
  revoked if that can be produced. Frames and codes, each distinguished, because
  Story 3.2's operator-facing log needs to tell "you typed it wrong" apart from
  "your account changed".
- **An idle period, in the one form Task 3.1.3 could not take**: a client that
  receives the server's 54-second heartbeat and **does not answer it**. Does the
  server close, after how many missed pongs, and with what code. The quiet-but-
  polite case is already measured (§6.3, §6.4) and is not re-taken here.
- **A server-side close** — whatever can be induced, plus whatever is observed
  unprompted across the story's running time. Record any unsolicited close that
  happens, with its instant and code, even if it was not provoked; **an
  unprovoked close observed once is the single most valuable frame in this
  capture**, because it is the one Story 3.10 has to survive and the one nothing
  can schedule.
- **A network interruption on our side** — the link dropped under the socket
  rather than closed by the server. What the client observes, how long it takes
  to notice, and whether anything is silently lost.
- **What happens to subscriptions across a reconnect.** Does the server remember
  them? Almost certainly not, and it must be captured rather than assumed,
  because Story 3.5's subscription model is either authoritative state we
  re-assert or a thing we believe the server holds — and those are different
  designs.
- **What is missed while away.** Reconnect after a gap of a known length during
  a session and establish whether the bars for those minutes are ever delivered,
  replayed, or simply gone. **Gone is the expected answer and it is the one that
  writes Story 3.10's gap-filling scope** — a chart that carries a hole from a
  thirty-second dropout for the rest of the day is the defect that story exists
  to prevent, and the repair is an HTTP backfill rather than a socket feature.
- **Reconnection courtesy.** Whether reconnecting immediately is penalised, and
  if so how — this is the input to Story 3.2's backoff, and a backoff policy
  invented without it is a guess with a number in it.

Write the taxonomy into `LIVE-DATA.md` as a table: the fault, how it was
produced, the verbatim frame or code, how our side learns of it, and the time to
detection. Add a short section naming **which faults are silent**, because those
are the ones that need a timer rather than a handler.

## Done when

- Every fault above is either produced and recorded, or listed as not
  producible with the reason.
- Each row states how our side finds out and how long that takes — **and, where
  the answer is a close, states what the client had asked for**, because `1006`
  means nothing on its own.
- The silent faults are named as a set.
- The subscription-across-reconnect and the missed-bars questions are answered
  with frames, and their consequences are named against Story 3.5 and
  Story 3.10 by name.
- `pnpm verify` passes. No credential written, and every capture swept.

## Notes

Fault injection against a third party is the part of this story most likely to
be shortened under time pressure, and it is the part whose absence is invisible
until production. The three things the HTTP mapping got wrong were all
**plausible-and-false**, which is exactly what a documentation-based guess
produces. Budget the session time for it.

---
