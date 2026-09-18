# Task 3.2.3 — The recorded frame corpus, and the one thing that cannot be re-recorded

**Status:** **Complete — 2026-09-18.** 14 fixtures: **12 transcribed verbatim, 2 reconstructed**. The reconstructed pair is the `u` revision, and it is the whole answer to what deleting the harness cost. 37 tests. See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.2

## Objective

Build the socket's fixture corpus in the shape `src/fixtures/alpaca/` already
holds for the HTTP API, so **every state this story must handle is reachable
with no market, no credential and no network.**

## What the user can see when this lands

**Nothing.** Test data.

## Read this first — the captures are gone

**Story 3.1's 31 captures were deleted on 2026-09-18 with the harness**, which
was always the plan (`ALPACA.md` §11's shape: run it, record the findings,
delete it). What survives is [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md), and it survives **precisely
because this moment was anticipated**: §4.1 records the handshake frame by frame
with every frame labelled, §4.2 the six things a state machine would get wrong,
§4.4 nine bad-subscription probes, §4.5 the `sip` refusal, and §8 the seven fault
probes with their instants.

**So this task transcribes a documented record rather than replaying a capture,
and that difference must be stated on every fixture it writes.** A fixture
derived from prose is evidence of what we _recorded_, one remove further from
the vendor than `src/fixtures/alpaca/`'s HTTP bodies, which are raw. **Do not
let the two look alike in the tree** — a later reader who mistakes a transcribed
frame for a recorded one will over-trust it.

**If a frame is needed that §4–§8 does not carry verbatim, it must be recorded
against the live socket rather than invented**, and that is a real cost now the
harness is gone. Say so in the task's findings rather than quietly writing a
plausible frame: **a plausible frame is exactly the failure a fixture corpus
exists to prevent**, and this repository already has the rule — a green run
certifies internal consistency, not a vendor.

## Work

- **Transcribe every frame §4 and §8 carry**, each in its own file, with a
  `MANIFEST.json` in the existing shape naming for each: what it is, **which
  `LIVE-DATA.md` section it came from**, the date it was originally observed, and
  **explicitly that it is transcribed rather than raw**.
- **Excluded from Prettier and from line-ending normalisation**, exactly as
  `src/fixtures/alpaca/` already is — both rewrite evidence, and
  `.prettierignore` already says why. Check the new directory is actually covered
  rather than assuming the existing entry reaches it.
- **Cover the unhappy states**, which are the ones with no other route to a test:
  `402 auth failed` (byte-identical for wrong key, wrong secret and no credential
  — §8.3), `400 invalid syntax`, `406 connection limit exceeded`, `409
insufficient subscription`, the nine bad subscriptions of §4.4, and a server
  close.
- **Cover the happy ones too**: the greeting, `authenticated`, a subscription
  acknowledgement, a `b` bar, and a `u` revision **for the same `(symbol,
minute)` as one of the `b` frames** — 3.2.4 cannot test replacement without
  that pairing, and a corpus that makes the case untestable has failed.
- **A frame with the server's 54 s ping**, because the watchdog in 3.2.5 has
  nothing to test against otherwise.
- **Record what the corpus does NOT cover**, in `ALPACA.md` §10's shape.

## Done when

- Every state in acceptance criterion 2 has a fixture
- `MANIFEST.json` names each one's provenance and **says transcribed rather than
  raw**, distinguishably from the HTTP corpus
- The directory is excluded from Prettier and line-ending normalisation,
  **verified** rather than assumed
- A `b` and a `u` exist for the same `(symbol, minute)`
- What the corpus cannot cover is written down with a named owner
- `pnpm verify` passes

## Notes

**This is the task where the cost of deleting the harness is actually paid**, and
it is worth paying attention to how large that cost turns out to be — it is the
first evidence about whether "record the findings, delete the instrument" holds
up under a story that needs the instrument's output. **Write down which frames
had to be re-recorded rather than transcribed**, because that number is the
honest answer, and Story 3.1's §13.5 claims the document is sufficient.

---

## What was found

### The corpus: 14 frames, in two tiers, and the tiers are the point

`apps/backend/src/fixtures/alpaca-stream/`, with `MANIFEST.json` carrying each
frame's chain of custody. **Three tiers are defined and only two are used:**

| Tier            | Meaning                                                                                                          | Count                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `raw`           | Bytes the vendor sent, stored unaltered                                                                          | **0** — and a test asserts it stays 0 |
| `transcribed`   | Copied character-for-character from a `LIVE-DATA.md` section that quoted the frame                               | **12**                                |
| `reconstructed` | Shape inferred from a transcribed frame, values from a measured table. **Nobody has seen these bytes on a wire** | **2**                                 |

**`raw` is defined and deliberately empty.** `src/fixtures/alpaca/` holds raw
HTTP bodies; this corpus holds none, and naming the tier we _cannot_ reach is
what stops a later frame being quietly promoted into it.

### The answer to this task's own question: the harness cost exactly one frame

The task asked how large the cost of deleting the instrument turns out to be,
because Story 3.1 §13.5 claims the document is sufficient. **The answer is:
sufficient for twelve frames out of fourteen, and the two it could not carry are
the `updatedBars` revision.**

**No verbatim `u` frame exists anywhere in this repository** — checked with a
`grep` across every `.md`, `.ts` and `.json` in the tree. §7.8 recorded what the
fourteen revisions _changed_ — symbol, bar timestamp, lag, which fields — and
**never quoted one**. That is a real gap in an otherwise excellent record, and it
is the kind that is invisible until somebody needs the bytes rather than the
finding.

**What was done about it, and what was deliberately not done.** The task forbids
inventing a plausible frame and requires recording one against the live socket
instead. **That was not possible today and the harness was not the reason**: a
`u` frame only occurs during a live session, and the corpus was built at
**02:28 ET with the market shut**. So even a rebuilt instrument would have had
nothing to record.

The two fixtures are therefore built to minimise what is guessed:

- The **envelope** is the verbatim NVDA `b` frame from §7.3 with `T` changed —
  so every field name and the whole structure comes from a frame that was really
  observed.
- The **values** follow §7.8's measured table: one changes `v` and `n` only
  (the 11-of-14 majority), the other moves the close (the 3-of-14 case that
  matters).
- **Both declare what was inferred**, in the manifest, and a test fails if a
  `reconstructed` frame ever omits that list.

**The risk is bounded and worth stating precisely rather than generally.** The
_semantics_ are measured and not in doubt — a revision supersedes a
`(symbol, minute)`, arrives 29.1–30.1 s later, changes the close 35.3% of the
time and changes nothing 0% of the time (§14.1, n=68). What is inferred is
**only whether a `u` carries the same field set as a `b`**. If it does not, Task
3.2.4's mapper is wrong about `u` and right about everything else.

**Owner: Task 3.2.5**, the first task that opens a real socket. **Trigger: the
first `u` frame it observes in a live session** — record it verbatim, replace
both fixtures, re-tier to `transcribed`. Recorded in `docs/GAPS.md` and beside
the files in `MANIFEST.json`'s `knownWeakness` block.

### The exclusions did NOT reach the new directory

The task said to check rather than assume, and it was right to.
`.prettierignore` and `.gitattributes` both name
`apps/backend/src/fixtures/alpaca/` — which does **not** cover
`alpaca-stream/`. Both now carry an entry, and the comment states the reason
**one step removed** from the HTTP corpus's rather than copying it: these are not
raw bytes, so the property being protected is that each file still matches the
document it was transcribed from, character for character.

**Verified three ways rather than asserted:**

- `git check-attr text` reports `unset` on the new directory.
- `pnpm format` leaves every fixture **byte-identical** (md5 before and after).
- **A copy placed outside the ignore expands from 1 line to 14.** That third
  check matters, because the first attempt at it was a **false negative**: a copy
  in the scratchpad was left alone by Prettier, which looked like proof the
  ignore was unnecessary. It was outside the project, so Prettier found no
  config. The probe was moved inside the tree and the mangling was immediate.

### What the corpus does NOT cover, in `ALPACA.md` §10's shape

**Stated rather than quietly omitted.**

- **The heartbeat is not a file, and cannot be.** The server's 54 s ping is a
  WebSocket **control** frame rather than a JSON payload. `ws@8` surfaces it as a
  `ping` event; Node's built-in `WebSocket` cannot see it at all (§4.6), which is
  what decides the library. `stream-connection.test.ts` covers it as an event.
- **A close is not a file either.** All five observed causes produce `1006` with
  an empty reason (§8.5), so there is nothing to store — the discriminator is the
  close **latency**, which is a measurement rather than a payload.
- **No frame here was observed during a market session except the bar.** The
  fault probes were taken against a shut market, which is the right place to
  inject faults and the wrong place to observe data.
- **Nothing certifies the vendor.** `CLAUDE.md`'s standing rule applies at full
  strength here and then some: a green run certifies internal consistency
  against a corpus we **transcribed**, not a corpus we recorded.
- **`n=1` on the revision behaviour's shape.** One account, one session.

### What was checked and found already true

- **§4.1's frames are quoted exactly** and transcribed without ambiguity,
  including the detail that matters most — the unsubscribe reply
  `[{"T":"subscription"}]` has **no `bars` key at all**, which a parser reading
  it unconditionally breaks on. It is the only frame that catches that, and it
  survived the transcription.
- **§4.4's nine probes collapse to four distinct frames**, because five causes
  share one `400 invalid syntax`. Recorded as one fixture with all five causes
  named rather than five identical files.
- **Every error code the spike observed has a fixture** — 400, 402, 405, 406,
  409 — asserted as a set, so a sixth arriving without a fixture fails a test.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This epic is what
changes that; this was its third building block.

**What this task did:** built a library of **recorded examples of what the market
data service actually says to us** — its greeting, its acknowledgements, and
every way it can refuse us — so that we can test our software against all of them
**without a live market, without a password, and without a network connection.**

**Why that matters more than it sounds.** The US market is open six and a half
hours a day. Without this, testing how our system handles a rejected connection
would mean waiting for one to happen — and some of these situations happen once
a month. Now every one of them is a file, and the tests run in under a second,
at any hour, on any machine, including the one that checks our work before every
change goes live.

**A genuine cost came due here, and it is the honest part of this report.**

Two weeks ago we spent nine days watching the real market feed and writing down
everything it did. Then we **deleted the recordings** — deliberately, and the
plan said so from the start. The idea is that the written record should be good
enough that the recordings are not needed.

**This is the first task that tested that claim, and the result is: twelve out of
fourteen.** Twelve of the examples we needed were written down word for word and
could be copied straight across. **Two could not.** For those, our notes recorded
what _changed_ — "the price was corrected from 758.85 to 758.81 about thirty
seconds later" — but never the exact message that carried it.

**What we did about it, and what we deliberately did not do.** The easy move
would have been to write a plausible-looking message and move on. We did not,
because a plausible fake is precisely the thing a library of real examples exists
to prevent — it would look like evidence and be a guess. Instead:

- We built those two from a **real** message we do have, changing only the parts
  our notes actually measured.
- We labelled them **differently and more weakly** than the others, in a
  machine-readable way, with an automated check that fails if anyone ever
  upgrades that label without doing the work.
- We wrote down **exactly what is guessed** — one thing: whether that kind of
  message carries the same fields as the kind we have seen.
- We assigned it an owner and a trigger: **the next task opens a real connection
  to the market, and the first genuine example it sees replaces ours.**

**One point of accuracy worth making: the deleted recordings were not actually
the obstacle today.** These particular messages only occur while the market is
trading, and we built this at half past two in the morning New York time. Even
with the recordings still on disk, we could not have captured one.

**A small thing that shows the process working.** The task told me to _check_
that these new files were protected from our automatic code formatter rather than
assume it — the formatter would rewrite them and destroy the exactness that is
their entire value. They were **not** protected: the existing rule named a
similarly-named folder and did not reach the new one. Then my first attempt to
prove the fix worked gave a **false pass**, for a subtle reason. I tested it
again properly, and it is now verified three different ways.

**How this unlocks progress.** The next two tasks translate these messages into
prices and build the real connection. Both can now be built and tested **against
real examples of what the market service says**, rather than against someone's
recollection of it. **Two stories from now a price moves on screen** — and when
something goes wrong with that connection at three in the morning, the behaviour
will already have been tested, because it is sitting in a file.

**What a user can see today: nothing new.** This was test data. The screen is
unchanged.
