# 0033 — A send instant on the wire, for measurement only

**Status:** Accepted
**Date:** 2026-09-22
**Story:** [3.6 Live Prices Across the Tracked Universe](../../planning/epic-03-live-market-data/story-06-live-prices-across-the-universe/STORY.md), Task 3.6.4

## Context

`PRODUCT_SPEC.md` §28 publishes one performance target for market updates:
**server-received event → application state under 250 ms p95**, excluding
upstream-provider latency. It names both ends. For four days, **three stories
carried that sentence as an acceptance criterion none of them could meet** —
3.4's criterion 5 (which stopped that story closing), 3.6's criterion 5 and
3.11's criterion 4 — and `docs/GAPS.md` entry 12 recorded why: **no message on
the market-stream wire carried a server-side instant.** The only instant a
browser received was `WireObservation.startsAt`, which §7.3 measured as the
**start of the minute the bar covers** — a fact about the market, not about
when this backend did anything. §28 excludes the provider, so it could not
substitute. A browser cannot time a journey whose start was never stamped.

Task 3.4.8 had taken the browser's half — _frame delivered to the page → price
on screen_, **p95 52 ms** on a production build under the real burst shape —
and said in as many words that it was half a journey. The risk entry 12 named
is that _52 ms against 250 ms_ reads as a fifth of the budget to anyone who
does not have that paragraph.

**Every deferral was individually correct**: changing the wire is a decision
about the **protocol**, which Story 3.3 froze, rather than a measurement
somebody forgot, and no single surface story owned it. Story 3.5's close moved
it to 3.6 because that story was already opening the wire for the universe
table and was the first to need the figure at universe scale.

## Decision — every server message carries `sentAt`, and it is read by nothing but an instrument

**The gateway stamps every frame it sends** — `snapshot`, `bars`, `feed`, and
the farewell — with `sentAt`, an ISO 8601 instant read from **the gateway's own
wall clock at the moment of the send**, per client. A browser subtracts it from
its own clock at the frame's arrival and again when the table's DOM changes,
and the two differences are §28's leg and the rest of the journey.

### The four constraints, each somebody's measured defect

1. **A new field, never a second meaning for `startsAt`.** That field is
   load-bearing in three places at once — the identity block's qualifier
   (_change from 2026-09-11's close_ is computed from it), the current market
   state's revision rule (a revision for a minute already passed is dropped so
   the latest observation never walks backwards), and every stored row. One
   name, one meaning; a stamp on the bar's own instant would break all three.
2. **A third clock reading, for measurement only.** `STREAM-SEAM.md` §3 is the
   record of what happened when two clocks were merged: the 165 s disconnection
   threshold is **monotonic** and the 60 s staleness threshold is **wall
   clock**, and using one for both made `stale` unreachable — silently, with
   every test green. `sentAt` is worse than either as a threshold input: it is
   a server clock read on a browser's machine, so it is skew as readily as
   latency, and a rule keyed on it fires on a viewer whose clock is a minute
   out and never on a feed that has stopped. **It must not reach
   `feed-liveness.ts`** — nor the backend adapter over it, nor the browser's
   derivation from it. `pnpm invariants` holds that line
   (`the-send-instant-is-not-a-clock`) and `pnpm break
the-send-instant-becomes-a-clock` proves the check goes red.
3. **Honest only as a distribution.** A server clock and a browser clock
   disagree. One reading is skew as readily as latency and a negative reading
   is skew by definition. The figure is published as p50 / p95 / max with **n**
   and its two ends named, never as a single reading — this repository's own
   rule is that latency is not asserted without a large n.
4. **One per frame, not one per observation.** A frame carries up to 518
   securities, and stamping each would be 518 copies of one instant on a wire
   whose universe payload is already 58 KiB. Measured on the wire rather than
   computed: **36 bytes** a frame, at most 16 frames a minute.

### Two smaller decisions inside it

- **A frame without a stamp is unreadable.** The only producer of this
  protocol is our own gateway and it stamps everything, so an unstamped frame
  is a shape this product does not send. Admitting it would make the field
  optional in every reader, which is how a measurement-only field quietly
  becomes one that is sometimes there. The protocol version is **not** bumped:
  an older browser ignores a field it does not know, and the deploy rolls the
  backend before the frontend, so no new browser ever meets an old gateway.
- **It does not enter application state.** `LiveFeedConnection` holds no
  `sentAt`, no latency and no derived age — §11.1 keeps `staleSeconds` off the
  wire because a derived age is a clock read wearing a different name, and the
  same argument applies to a field on a view object. The instrument reads the
  raw frame; nothing on a screen reads the stamp.

### What it is stamped by

The gateway takes `wallNow` as a seam — `Date.now()` in production — and the
process suite asserts the stamp is **that** clock's reading at the moment of
**each** send, including that two clients published the same batch get two
stamps. `pnpm break the-gateway-stamps-nothing` replaces the stamp with a
constant and proves the suite notices.

## Alternatives considered

- **Re-purpose `startsAt`, or shift it to the send instant.** Rejected for
  constraint 1: three load-bearing readers of one field.
- **Stamp each observation.** Rejected for constraint 4, and because the
  question is about a frame's journey rather than a bar's — a frame is what the
  gateway sends and what a browser receives.
- **An epoch millisecond rather than an ISO string.** Thirteen characters
  against twenty-four. Rejected for consistency: every instant on this wire is
  an ISO 8601 string (`asInstant`), a log line quoting a frame is readable, and
  the difference is eleven bytes on sixteen frames a minute.
- **Amend §28 to say which half this product measures, and add no field.**
  Story 3.11's hand-off named this as the honest fallback. Rejected because the
  target is right and the instrument is one field: publishing a target a
  product cannot measure is how a stated invariant quietly stops being true.
- **Put the browser's reading into `LiveFeedView` for a diagnostics surface.**
  Deferred rather than rejected; nothing on a screen needs it, and adding state
  nobody renders is the shape ADR 0023 resists. The reversal trigger below
  names the condition.

## Consequences

- §28's full figure can be taken, and was — Task 3.6.4's record carries the
  distribution with its conditions; `STREAM-SEAM.md` §8.9 carries the standing
  account. Story 3.4's criterion 5 became measurable retroactively and Story
  3.11's criterion 4 is a re-take rather than an invention.
- **The one place the wire changed after Story 3.3 froze it.** Every
  hand-built frame in a test or a browser spec gained the field, and the
  compiler named each one — which is the shape `WireFields`' `-?` exists for.
- A frame is 36 bytes larger. The universe payload's headline figure, 56.9 KiB
  a minute, is written in eleven places and was **not** rewritten: the change
  is under 0.1% and Task 3.5.8's amendment already decided that churn on that
  figure is not worth its cost. The new reading is recorded beside it.

## Reversal trigger, as a condition

**The first surface that renders a latency, an age or a clock offset derived
from `sentAt`.** At that point the field has a second reader, the "measurement
only" clause is false, and two things are due at once: the value moves into
application state through `live-feed.ts` with the invariant re-scoped to name
what may read it, and the skew caveat becomes a product problem rather than a
footnote — a server's clock shown on a viewer's screen needs the viewer's
offset accounted for, which nothing here does.

A second trigger, narrower: **the first time the wire's frame rate stops being
bounded by the upstream frame rate** (§11.1's own trigger). Sixteen stamps a
minute is a footnote; a per-browser computation or a replay scrub that
produces hundreds is a cost to re-take.
