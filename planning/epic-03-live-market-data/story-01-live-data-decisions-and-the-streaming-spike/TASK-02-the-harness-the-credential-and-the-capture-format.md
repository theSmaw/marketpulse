# Task 3.1.2 — The harness, the credential boundary, the capture format, and the handshake recorded verbatim

**Status:** Complete (2026-09-15)
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

## What was done (2026-09-15)

**Nine captures, all swept clean twice, and the socket has been read for the
first time in this repository's life.** The full record is
[`LIVE-DATA.md`](LIVE-DATA.md) **§4** — the handshake frame by frame, the six
things a state machine written from documentation would get wrong, the nine
bad-subscription probes, the `sip` refusal first-hand, the control-frame
findings and the clock discipline — with **§5** recording how to re-take all of
it. Nothing of substance is duplicated here; what follows is what this task
found, decided and left standing.

### The instrument

`~/marketpulse-live-spike/`, **outside the repository entirely**. Eight scripts
and one recorder on Node 24, one dependency (`ws@8`), and a `universe.json`
holding the 518 symbols extracted **once, as data**, so the harness imports
nothing from the workspace. **Task 3.1.9 deletes the directory, the credential
with it.** The tree is byte-identical outside `planning/`.

The one design choice worth arguing: **`ws@8` rather than Node's built-in
`WebSocket`.** The WHATWG API defines no ping or pong event, so an instrument
built on the global cannot see a control frame at all — and Task 3.1.3's entire
job is to sit in silence and report what arrived, which is unreadable from a
recorder that structurally cannot see half of what might arrive. That is also a
**constraint on Story 3.2's client**, found here for nothing (§4.6).

### What the captures answer, and what they do not

Two lines are **struck** from §3's register — figure 3 (the handshake) and
figure 11 (connect + authenticate + subscribe for 518: **1,312–1,537 ms,
518/518 accepted**, and read as an envelope rather than a budget until it is
re-taken from the deployment rather than from Asia/Singapore). Figure 16 is
**bounded from below and deliberately not struck**: no server ping in 30 s of
quiet is not the keepalive interval, and a long idle is Task 3.1.3's window.

### Three findings that change a later story's shape rather than informing it

1. **Alpaca does not validate symbols.** `bars:["ZZQQTESTX"]` was accepted and
   echoed back as held. A subscription acknowledgement is therefore not evidence
   a symbol exists, so **Story 3.5 must validate against our own universe before
   the frame is sent** — otherwise a typo and a genuinely quiet security are the
   same observation.
2. **An empty symbol list is a `400`.** That is exactly the frame a filter
   matching nothing produces, so "send whatever the selection resolves to" is a
   bug on the empty selection — the easy one to write.
3. **A clean client-initiated close is observed as `1006`**, the same code a
   dropped link produces, because Alpaca never echoes a close frame. Confirmed
   at two different wait lengths. **Story 3.10 cannot read intent off the close
   code**; the client must carry its own.

And the one that reshapes the state machine rather than a story: **the
subscription acknowledgement is the full current state, not a delta**, and when
it is empty the channel key is **absent** rather than `[]`.

### The clock, which is the finding this task did not expect to have

Three independent NTP references agree to within 2.1 ms that this machine's
clock is **≈257 ms behind true time** — larger than the whole of
`PRODUCT_SPEC.md` §28's 250 ms budget, and with the flattering sign: an
uncorrected arrival gap measured here reads a quarter of a second **faster**
than it was. §3.2 calls figure 8 the most consequential number on the register;
taken naively today it would have been wrong in the direction nobody checks.

So the correction is a **mechanism rather than a note**: the harness re-takes
the offset at the top of every run and writes it into the capture header, so it
belongs to the capture rather than to a paragraph. Tasks 3.1.4 and 3.1.5
subtract their **own** capture's offset before quoting any gap. The machine's
clock was deliberately **not** corrected — a spike that silently changes the
environment it measures cannot be re-run against the same conditions.

**The vendor's clock could not be pinned down**, and that is stated rather than
omitted: Alpaca's `Date` header has one-second granularity against a 769–1,288
ms round trip, which bounds the offset between −570 ms and +420 ms and measures
nothing. Figure 8 carries that sentence with it.

### The credential boundary, and the break

Two layers, because a redaction the author forgot is the case this exists for:
`redact()` at the moment a frame is recorded, and `sweep()` **refusing to write
the file** if the credential's bytes survive in verbatim, percent-encoded or
**base64** form — the last being a smuggling `redact()` alone would not catch.
`verify-captures.mjs` re-sweeps every file on disk afterwards, independently of
the writer.

**And the check was broken on purpose**, per this repository's rule that a check
which has never gone red has never been tested. `sweep-break.mjs` defeats
`redact()`, and all three refusals fire with **no file appearing on disk**
(§4.9). This is the half of acceptance criterion 4 that makes it checkable
rather than assumed.

### Controls, and the one that matters most

Every capture states **before it runs** what result would have told us the
instrument was lying, and §4 says which fired. Three carry real weight: the
three-second silence before `auth` (which is what makes "the greeting is
server-initiated" a measurement rather than an assumption), the 60-symbol trades
subscription (`405`, still, on 2026-09-15 — so the instrument demonstrably sees
a refusal, and every "accepted" beside it means something), and three NTP
servers rather than one.

### Swept upward

`ALPACA.md` §10's bullet saying nothing about the WebSocket beyond the
subscription cap had been measured **stopped being true today**, and it has a
dated amendment pointing at `LIVE-DATA.md` §4 rather than a rewrite — with what
is _still_ unmeasured on that date named, so the pointer cannot be read as more
than it is. `LIVE-DATA.md` §1.3 gains the first-hand `sip` shape beside the
inherited claim. Nothing else was falsified.

## What the user can see

**Nothing, and nothing is running that could be seen** — as the task said. No
code shipped, no route, no pixel. The payoff is Story 3.3.

---

## For the stakeholders — a plain-English status report

**Where the product is.** MarketPulse today is a working market explorer: you
can search 518 US companies, open one, and read its price and volume history on
real market data with an honest note saying where those numbers came from. What
it cannot do is show you anything happening _now_. Epic 3 is the epic that makes
the application live, and this story is the homework before the building.

**What this task actually did.** Before we write a single line of the code that
holds a live connection to our market-data provider, we built a small
disposable instrument — think of it as a stethoscope rather than a part of the
product — pointed it at the provider's live feed, and wrote down exactly what
came back. Nine recordings, every message captured word for word, all of it
outside the product's own codebase and scheduled for deletion at the end of the
story.

**Why bother, rather than just reading the manual?** Because the last time this
project mapped a provider's behaviour from its documentation, three things in
that mapping were wrong, and one of them would have shipped. So the rule here is
simple: measure, don't cite. It cost a morning and it has already paid for
itself three times over.

**The three things we learned that would otherwise have become bugs.**

1. **The provider will happily accept a stock symbol that does not exist.** We
   asked it to stream us "ZZQQTESTX" and it said yes. That means its
   confirmation is worthless as a check — so _we_ must validate symbols before
   we ask. Without this finding, a simple typo in our list would have looked
   exactly like a genuinely quiet stock: no error, no warning, just a company
   that never updates. That is the worst kind of bug, because nothing goes red.
2. **When we hang up politely, it looks identical to the line dropping.** The
   provider doesn't say goodbye, so our end reports a normal disconnection the
   same way it reports a crash. If we hadn't known, the product would have
   announced "live feed disconnected — reconnecting" every single time it shut
   down on purpose. We now know the software has to remember its own intentions.
3. **Sending an empty list of stocks is an error, not a no-op.** That is exactly
   the message our code would naturally send when a filter matches nothing — a
   very ordinary situation. Easy bug to write, cheap to now avoid.

**The finding we did not go looking for, and the most important one.** Much of
Epic 3 turns on a promise about speed: a market event should reach your screen
in under a quarter of a second. Measuring that means comparing the provider's
timestamp against our own clock — so we checked our clock first, against three
independent time references. **It was a quarter of a second slow.** Had we not
checked, every speed measurement in this story would have flattered us by
roughly the entire size of the target we are measuring against, and we would
have reported passing a test we were failing. The instrument now re-checks the
clock at the start of every recording and stores the correction alongside the
data, so the fix travels with the measurement instead of relying on somebody
remembering a paragraph.

**On safety, in plain terms.** Connecting to the feed requires a secret key.
That key never enters the codebase; it lives in a single file outside it and is
deleted when this story ends. Every recording is scanned for the key's
fingerprint before it is saved, and the writer _refuses to save the file_ if it
finds one — including if the key had been disguised. And we deliberately broke
that safeguard to prove it actually stops things, rather than trusting a check
that has never once fired. It fired, and nothing reached disk.

**What this unlocks.** Three tasks after this one each need a specific and
unrepeatable moment — the market shut, the market busy, the connection
deliberately broken — and none of them can now waste that moment debugging a
recorder. We also confirmed the important capacity question first-hand: all 518
companies we track can be subscribed to in a single request, accepted in full,
in about a quarter of a second. There is no scale problem between here and a
live product.

**What you still cannot do.** Everything this epic promises. Nothing on screen
has changed and nothing will until **Story 3.3**, which is three stories away,
where the word `LIVE` appears in the application's header. The first price that
actually moves in front of you arrives in **Story 3.4**. The sequence is
deliberately built so the wait is short — the previous epic made users wait
seven stories for something visible, and that was a mistake we are not
repeating.

---
