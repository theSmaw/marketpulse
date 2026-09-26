# Task 4.2.1 — The two snapshots explained, the record corrected, and the path this frame may not take

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** nothing

## Objective

**This story is built on two premises and both are false.** They were written
into `STORY.md` by Task 4.1.6's amendment and by Task 4.1.1's, and this story
quotes them as the reason for a sequencing constraint and for a cadence. Before
anything is added to this wire, the record has to say what the wire does.

**Premise 1 — "one subscribe produces two snapshots, and a spare snapshot is a
duplicate of the largest frame on the wire, per browser, at exactly the moment
the market opens."** The count is right and the inference is wrong. The gateway
calls `sendSnapshot()` twice by construction, and **the first call is
structurally guaranteed to be empty**: `clients.set(client, new Set())` runs one
line above it in the `upgrade` handler, so `wanted.has(symbol)` is false for all
518 and `observations` is `{}` unconditionally. There is no path that makes it
non-empty — the `message` listener that would populate `wanted` is registered
_inside_ the same callback. The frame is on the order of 120 bytes against the
56.9 KiB the amendment sizes it at.

**Premise 2 — "the gateway already sends one `bars` frame a minute, and the
aggregate belongs on that cadence."** `publishObservations` is called once per
upstream batch, and `market-stream-protocol.ts` records the measurement:
**at most ~16 messages a minute**. The _arrival mark_ fires as one burst a
minute; the _frames_ do not. "On the `bars` cadence" therefore means up to
sixteen recomputations a minute, not one.

**And there is a third thing, which is not a premise but a trap.** Task 4.1.6
measured `alpaca-stream.ts` calling `apply()` inside the per-vendor-item loop
and `index.ts` answering `onConnectionChange` with `publishFeedState()` — **~332
`feed` frames a minute, broadcast to every browser regardless of subscription**,
unrepaired on purpose and handed to Story 4.7. An overview frame wired to that
path would be sent ~332 times a minute instead of once, and unlike the 119-byte
`feed` frame it would not be small — and `sameLiveFeedView`, the suppression
that hid the `feed` defect for a whole epic, would not cover it.

**So the guard is written before the frame exists**, which is the only ordering
in which it can be proved to work against the real defect rather than against a
memory of it.

## What the user can see when this lands

**Nothing.** Three documents say something true that they did not say before,
one counter stops lying, and a check exists that refuses a frame on the wrong
path. Task 4.2.5 is what a person will see.

## Work

- **Confirm the mechanism against a running gateway, with the frame SIZES
  printed.** Reading settles it; measuring records it. Task 4.1.6's own lesson
  applies with the noun changed — _count by URL, never by event_ becomes
  **size the frame, never assume from the type**. Quote at least one frame
  verbatim in the record; the instrument is deleted afterwards and a conclusion
  is not evidence.
- **Correct `STORY.md`'s two amendments in place**, and propagate. The
  falsification travels **upward** and is swept the same day, not at the story
  close: grep for every site quoting either premise, correct the live claims,
  and give Task 4.1.6's own record a **dated amendment** rather than a rewrite —
  it is a historical record of what was measured, and what was measured was
  right.
- **Record why the empty connect-time snapshot stays**, where the next reader
  looks. It is the only frame an unsubscribed browser receives before the 120 s
  keepalive, and it carries `feed`, so removing it would leave such a browser
  silent for two minutes. Decided, with the alternative named.
- **Repair `resumes`.** `live-feed.ts` computes `resumes: Math.max(0,
state.snapshots - 1)` under a comment asserting _"The gateway sends one on
  every connection, first or fiftieth"_. It sends **two, plus one per
  subscription change**. So an ordinary cold load with no dropout reaches
  `resumes >= 1` and fires `use-bar-series`'s gap-fill refetch — suppressed
  today only by `if (inFlight.current) return`, which is a timing race and
  therefore the shape that survives a suite and appears on a warm cache. Fix the
  count, fix the comment that states the false premise, and cover the cold-load
  case.
- **Add `the-overview-frame-is-not-a-heartbeat`** to `pnpm invariants`: the
  overview encode/publish symbol appears in `market-gateway.ts` exactly once and
  **not** inside `publishFeedState` / `feedMessage` / the feed broadcast, and
  `index.ts`'s `onConnectionChange` handler does not reference it. It guards a
  symbol that does not exist yet, so it must be written to pass cleanly on the
  zero case — **a grep that matches nothing looks exactly like a grep that
  passes**, and the existing invariants carry that branch by name.
- **The break, in the same change**: `the-overview-frame-rides-the-heartbeat`
  adds a publish call beside `gateway.publishFeedState()` in `onConnectionChange`.
  Its `proves:` text quotes Task 4.1.6's measured frame counts verbatim, because
  the defect it reproduces is a ~332×/minute amplification and the number is the
  argument.

## Done when

1. `STORY.md` says what the two snapshots are, with the byte size, and no
   surviving site in the repository claims the spare one is large
2. No surviving site claims the gateway sends one `bars` frame a minute
3. Task 4.1.6's record carries a dated amendment and its original text is intact
4. A cold page load with no disconnection produces `resumes === 0` and issues no
   gap-fill refetch, asserted rather than observed
5. `pnpm invariants` carries the heartbeat check, and `pnpm break` proves it red
   and restores the tree byte-identical
6. The instrument used to size the frames is deleted, and its findings quote at
   least one frame verbatim
