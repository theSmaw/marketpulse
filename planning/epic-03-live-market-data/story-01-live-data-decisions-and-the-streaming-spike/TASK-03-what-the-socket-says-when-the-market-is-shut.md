# Task 3.1.3 — What the socket says when the market is shut

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.2

## Objective

Measure what arrives on the IEX stream **outside a regular session** — pre-market,
after hours, overnight, a weekend and a holiday — and establish whether a
connection that is up says anything at all when the market is not.

This is placed before the in-session task on purpose, and the ordering is
Epic 2's lesson inverted. Task 2.7.1 ran on Labor Day and lost a measurement to
a shut market; **what it got wrong was not the day but the question.** So this
task takes every measurement a shut market can give, deliberately and first,
leaving Task 3.1.4 a session window it does not have to share.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3, and the specific thing this task buys is
that Story 3.10's degraded states are designed against a measured quiet socket
rather than an imagined one.

## What is already decided and must not be re-taken

- **`CALENDAR.md` owns _is the market open_.** This task owns _does the socket
  say anything_, and the two are different questions — the whole point of
  measuring it is that the answers may not line up.
- **`FeedStatus` and `MarketSessionStatus` are separate vocabularies**,
  deliberately, for exactly this reason: the market being open does not mean
  data is flowing, and a socket being up does not mean the market is open.
- **An absent bar is ordinary on IEX.** `ALPACA.md` §5.2 measured **82.8%**
  median minute coverage on IEX against **99.7%** on SIP, worst case **43.1%**
  (`CCI`) — on _stored_ IEX history. Silence is therefore not evidence of a
  broken socket, and this task is where that stops being a guess.

**Added 2026-09-15 by Task 3.1.2, which has now read the socket** —
[`LIVE-DATA.md`](LIVE-DATA.md) §4:

- **The recorder's control-frame path is proven, so silence in a capture is
  readable.** The server answers a client ping with the payload echoed (§4.6).
  Without that, "no keepalive observed" would have been indistinguishable from a
  recorder that structurally cannot see one — and Node's built-in `WebSocket`
  is exactly such a recorder, which is why the harness uses `ws@8`.
- **Figure 16 is already bounded from below: no server-initiated ping in 30 s of
  quiet.** This task owns the long idle and must not re-take the short one.
- **A clean client-initiated close is observed as `1006` with an empty reason**
  (§4.2), because Alpaca never echoes a close frame. So a `1006` seen at the end
  of an idle hold is **not** evidence the server closed us — the harness must
  record whether it asked for the close before the code means anything.
- **An error is a frame, not a closure.** Nine deliberately bad requests, nine
  frames, the socket never closed once (§4.4). A quiet socket that is still open
  is the expected shape here, not a surprise.

## Work

Run the harness across the boundaries and record, per window, what arrived.

- **The four windows**, each named with its market-time range: pre-market
  (04:00–09:30 ET), the open boundary itself, after hours (16:00–20:00 ET), and
  a period with no session at all — overnight, a weekend, or the next holiday
  the calendar table carries.
- **Per window, per channel**: does anything arrive on `b`; does anything arrive
  on `t` and `q` for a small symbol set; and is there any traffic at all —
  keep-alives, control frames, or nothing whatsoever. **Nothing whatsoever is a
  finding**, and it is the one that decides whether Story 3.10's staleness
  detection can ever distinguish _quiet_ from _dead_ without a heartbeat of our
  own.
- **Do extended-hours bars arrive on `b`, and are they marked?** If pre-market
  and after-hours bars come through the same channel with nothing distinguishing
  them, that is a product decision landing in Story 3.6 and 3.7 — a chart that
  silently gains a thin pre-market tail is a different drawing — and it must be
  written down here rather than discovered there.
- **The idle behaviour of a connection nobody is talking to.** Hold it open
  across a long quiet period and record what happens: whether the server sends
  anything, whether it closes, and after how long. Record the **longest observed
  silence** and the instant it started and ended — that figure is the input to
  Decision 5's staleness thresholds and to the heartbeat question above.
- **The boundary instants.** When does traffic start relative to 09:30 ET, and
  when does it stop relative to 16:00 ET? Both to the second, both by our clock
  with Task 3.1.2's offset applied or declared. A feed that starts at 09:30:00
  and one that starts at 09:30:47 produce different first-paint behaviour on
  every screen this epic builds.

Write the findings into `LIVE-DATA.md` with the window, the instant, the counts
and the verbatim frames, in the capture format Task 3.1.2 fixed. State clearly
what was **not** covered — a holiday that did not occur inside this story's
window is an unmeasured case, and saying so is worth more than inferring it.

## Done when

- Every one of the four windows has a dated, instrument-named record, or is
  explicitly listed as unmeasured with the reason. **A window listed as
  unmeasured gets a named owner and a condition, not just a reason** — the
  weekend is five days from this story's start and "unmeasured" with nobody
  holding it is how a window is never taken at all.
- The longest observed silence is recorded with its instants.
- The extended-hours question is answered, with frames, and its consequence for
  Stories 3.6, 3.7 and 3.9 is named.
- The open and close boundary instants are recorded to the second.
- `pnpm verify` passes. No code changed and no credential written.

## Notes

The trap here is treating an empty capture as a failed run. An empty capture
that is **recorded, timed and bounded** is a measurement: it is what tells
Story 3.10 that a quiet socket is indistinguishable from a dead one, which is
precisely the finding that forces a heartbeat into the design rather than into a
bug report.

---
