# Task 3.1.2 — The harness, the credential boundary, the capture format, and the handshake recorded verbatim

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.1

## Objective

Build the throwaway instrument that Tasks 3.1.3 to 3.1.5 point at the socket,
establish the credential boundary **before** a credential is ever read, fix the
capture format so three tasks produce comparable files rather than three
formats, and take the one measurement that needs no market session at all: the
**connect → authenticate → subscribe handshake**, recorded frame by frame.

The shape is `ALPACA.md` §11's and Task 1.13.1's, and it is a rule rather than a
style: **a harness outside the tree, run, recorded, deleted, leaving the tree
byte-identical outside `planning/`.**

## What the user can see when this lands

**Nothing**, and nothing is even running that could be seen. The payoff is
Story 3.3.

## What is already decided and must not be re-taken

- **The credential never touches a file in the repository.** It lives in an env
  file outside the tree for the length of this story and is deleted at the end.
- **Every capture is swept for the credential's own bytes before being written,
  and the writer refuses on a match.** This is the shape that was verified clean
  across 22 captures in Task 2.7.1 — it is a mechanism, not a habit, and it is
  what makes acceptance criterion 4 checkable rather than assumed.
- **A measurement carries its own control or it is not a measurement.**
  `ALPACA.md` §11: the cap test subscribed to trades **as well as** bars, so an
  accepting-everything server would have reported inconclusive rather than an
  exemption. Every capture below owes the same question — _what result would
  have told me my instrument was lying?_
- **Read the numbers, not the script's conclusion.** One automated verdict in
  Task 2.7.1 was wrong and was caught only because 391 > 390 is arithmetically
  impossible.
- **The stream endpoint is `wss://stream.data.alpaca.markets/v2/iex`.** The
  `sip` path is refused on this plan with `409 insufficient subscription`
  (`ALPACA.md` §2) — capture that refusal once here, so the claim is this
  story's own rather than inherited.

## Work

- **The harness.** Outside the tree, a handful of scripts, no dependency on
  anything in the workspace. It needs: a connection, the ability to subscribe to
  an arbitrary symbol list on an arbitrary channel set, and a **frame recorder**.
- **The capture format, fixed once here and used by 3.1.3, 3.1.4 and 3.1.5.**
  Every file carries: the endpoint, the instant the run started (ISO, with the
  market-time equivalent, because half the findings are about session
  boundaries), the subscription request verbatim, and then **one record per
  frame** carrying the raw frame, the instant it arrived by our clock, and the
  monotonic offset from the run's start. The arrival instant is not decoration:
  **the gap between a bar's `t` and its arrival is the number Task 3.1.4 exists
  to produce**, and it cannot be recovered afterwards from a file that did not
  record it.
- **Record the handshake verbatim.** Connect, authenticate, subscribe,
  unsubscribe, and the server's reply to each — including the control messages a
  reader would otherwise meet for the first time in Story 3.2's state machine.
  Note explicitly which of these are **server-initiated** and which are replies,
  because a state machine written against the wrong assumption looks correct
  until it hangs.
- **Record what a bad subscription does**: a symbol that does not exist, a
  symbol outside our universe, an empty list, and a channel this plan does not
  have. Whether the server rejects, ignores, or silently accepts is the
  difference between Story 3.5 validating a subscription and Story 3.5 trusting
  one.
- **Capture the `sip` refusal** once, verbatim, with its code.
- **Establish the clock discipline.** Record how the harness's own clock relates
  to a reference, once, with the method — every latency figure this story
  produces is a difference between a vendor timestamp and ours, and an unstated
  clock offset is a silent constant added to every one of them. If the offset
  cannot be established, **say so and state the figures as upper bounds** rather
  than quoting them as latencies.

Write the findings into `LIVE-DATA.md` as a new section — the handshake, the
control messages, the subscription-error behaviour and the clock note — and
record the method in the same shape `ALPACA.md` §11 records its own, so it can
be **re-taken rather than cited**.

## Done when

- The handshake, every control frame and every subscription-error behaviour is
  in `LIVE-DATA.md`, verbatim, dated, with the instrument named.
- The capture format is fixed and documented, and 3.1.3–3.1.5 can produce
  comparable files from it.
- The clock discipline is stated, or its absence is stated and every later
  figure is labelled an upper bound.
- No credential appears in any capture; the sweep ran and is recorded as having
  run. The harness still exists at this point — **Task 3.1.9 deletes it** — and
  the tree is byte-identical outside `planning/`.
- `pnpm verify` passes.

## Notes

This task is deliberately the boring one, and the reason it is separate is that
the next three tasks each have a **window** — a live session, a shut market, a
deliberate fault — and none of them should be spending its window debugging a
recorder. Build the instrument when there is no clock running against you.

---
