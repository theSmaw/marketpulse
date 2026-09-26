# Task 4.2.1 — The two snapshots explained, the record corrected, and the path this frame may not take

**Status:** **Complete — 2026-09-26.** The spare snapshot is **149 bytes and empty by construction**, so the amendment this story was built on sized a problem that does not exist. `resumes` counted snapshots against a gateway that sends two per connection, firing a spurious gap-fill on every cold load — repaired. The heartbeat guard went in **before** the frame it guards, and its first version **passed green on the exact defect it forbids** after an ordinary refactor; the second is anchored to formatted shape rather than to braces, with two breaks.
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

---

## What was done — 2026-09-26

### The frames, sized — and the mechanism is what was proved, not the size

A throwaway Node client against the local gateway, since deleted. The
cold-load sequence — `subscribe []`, then `subscribe ["SPY","QQQ","DIA","IWM"]`
750 ms later:

```text
frame 1  +14ms   type=snapshot  bytes=149  observations=0
frame 2  +14ms   type=snapshot  bytes=149  observations=0
frame 3  +769ms  type=snapshot  bytes=149  observations=0
```

Frame 1, verbatim:

```text
{"type":"snapshot","version":1,"sentAt":"2026-09-26T00:46:53.049Z","observations":{},"feed":{"status":"disconnected","feed":null,"marketOpen":false}}
```

A client that never subscribes receives **exactly one** frame in five seconds.

**Two kinds of emptiness, and the record distinguishes them.** Frames 1 and 2
are empty **structurally** — `clients.set(client, new Set())` runs above
`sendSnapshot()` and the `message` listener that would fill `wanted` is
registered after it, so the filter can match nothing. Frame 3 is empty
**incidentally**, because no provider is configured on the measuring machine.
**No populated snapshot was measured here and 56.9 KiB is not restated as
measured.** What is proved is the count and the structural emptiness of the
first.

An incidental figure: the same state as a `feed` message is **127 bytes**
against the snapshot's 149. The 119 bytes quoted elsewhere was not reproduced,
so the measured number is used and its provenance said.

### The record corrected — four sites, one of them an amendment

`STORY.md`'s two amendments and `EPIC.md`'s cadence claim were corrected in
place; **Task 4.1.6's own file received a dated amendment with its original
text intact** — the `snapshot: 2` count stands and only the inference in its
last two sentences is withdrawn. Three further sites were swept and **left
standing** as historical or correctly scoped.

**Why the empty connect-time frame stays**, recorded beside `sendSnapshot()`
and in `STORY.md`: it is the only frame an unsubscribed browser receives before
the 120 s keepalive, and it carries `feed`. Rejected alternatives named — send
it as a `feed` message (a branch for 22 bytes, and it moves the browser's
_this is a connection_ edge onto a frame that also arrives on a timer), and
drop it and shorten the keepalive (worse on the measurement that set
`KEEPALIVE_INTERVAL_MS` at half Azure's 240 s idle ceiling).

### `resumes` — and it counted the wrong thing

`snapshots: number` became **`connections: number` + `greeted: boolean`**.
`greeted` clears on `opened` **and** on `closed`; `connections` increments on a
snapshot only when `!greeted`.

**Clearing on both is load-bearing rather than belt-and-braces**, found in
review: the transport emits `closed` from `error` while the socket may still be
`OPEN`, so a message can arrive after `closed` and before the next `opened`.

Seven sequences were walked adversarially — cold load, a dropout and return,
two reconnections inside one minute, a snapshot with no preceding `opened`
(unreachable: the `open` listener is registered before the `message` listener),
`closed` twice via the `error`+`close` pair, `opened` with no `closed`, and a
StrictMode double-mount — and **no sequence silently fires or silently
suppresses**. The once-a-minute floor is still what limits the fills.
`connections` and `greeted` live on `LiveFeedConnection`, not on
`LiveFeedView`, so nothing new escapes `sameLiveFeedView`.

### The guard, and the version of it that did not work

**The first implementation passed green on the exact defect it forbids.**
`bodyAfter` took the first `{` after its marker, so changing
`onConnectionChange: (connection) =>` to a destructured parameter — an ordinary
refactor — made the inspected "handler body" the destructuring pattern, and a
`publishOverview({ type: "overview" })` on the next line reported
`30 invariants hold.` Two further holes: a `}` in a trailing comment truncated
a region (`withoutComments` strips block and whole-line comments only, an
asymmetry documented as _the safe direction_ which **inverts** for a brace
matcher), and a call-shaped marker could be retargeted by the first internal
call site added above the definition.

**The brace matcher was removed rather than patched**, because all three
objections were structural to brace counting. Each region is now delimited by a
start marker and an **end marker taken from the indentation**, plus a
**sentinel the slice must contain** — so a slice shorter than the code it must
refuse fails naming that, rather than passing. `withoutTrailingComments` is
local to this consumer; `withoutComments` is untouched.

All three holes were reproduced against the new check and go red, each naming
the right region. **And the zero case was probed independently at the close**:
renaming the `feedMessage` anchor makes the invariant go red **and** trips
`every-break-can-still-land` on the break's now-unmatched `find` — both
failures arriving together, which is the pair that should happen.

### Gates

`pnpm verify` **exit 0** — 35 components / 35 stories, 470 documents and 1,647
cross-file links with 0 broken, **30 invariants hold**, shared 316 passed,
backend 948 passed, frontend 1,155 passed, `test:process` 35 passed, **no
`Unhandled Errors` block**. `pnpm --filter @marketpulse/frontend test live-feed`
61 passed. Both breaks red and restored byte-identical:
`the-overview-frame-rides-the-heartbeat` and
`the-destructured-handler-hides-the-overview-frame`.

**Not run, with reasons:** `pnpm e2e` — nothing here touches a layout or a
browser behaviour, and the cold-load claim belongs in a unit test.
`pnpm test:database` — no data-layer change.

## For a stakeholder — a status report, 2026-09-26

### What this was

**Checking the foundations of a piece of work before building on them** — and
finding two of them wrong.

This story's plan rested on two statements about how our market data reaches a
browser. One said a particular duplicated message was among the largest things
we send, arriving for every visitor at the moment the market opens. The other
said the server sends one bundle of prices a minute.

**Neither was true.** The duplicated message is 149 bytes — about a
four-thousandth of what the plan assumed — and it is empty for a structural
reason that cannot vary. And the server sends up to sixteen bundles a minute,
not one. Both are now corrected wherever the product's records repeat them.

### What we found on the way

**A defect nobody had noticed, in code that has been shipping for weeks.** The
application counts how many times its live connection has come back, and uses
that to decide whether it missed any data while away. It was counting the
wrong thing — so every ordinary page load looked like a reconnection and
triggered a needless refetch. It was invisible because a second piece of
timing usually swallowed it, which is exactly the kind of fault that surfaces
later on a slower network and looks like something else entirely.

### The part worth telling

**We added a safeguard, and the first version of it did not work.** It was
meant to stop a future change from putting a heavy new message on a path that
sends things hundreds of times a minute. A reviewer tried the most ordinary
refactor a developer might make to the code nearby — and the safeguard went on
reporting that everything was fine, with the forbidden thing sitting right
there.

That is the failure this team fears most: a check that reads exactly the same
whether it is working or not. It was rebuilt on a different principle, all
three ways of fooling it were reproduced and now fail correctly, and we
deliberately broke it twice more to watch it catch them.

### Where this leaves the work

**Nothing is visible on screen yet, and that is the plan.** Three more pieces
of groundwork — the calculation, the message that carries it, and the drawing,
which is already done — and then four live index figures appear at the top of
the landing page.
