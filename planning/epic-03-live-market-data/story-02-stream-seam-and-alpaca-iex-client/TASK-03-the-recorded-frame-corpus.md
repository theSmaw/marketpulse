# Task 3.2.3 — The recorded frame corpus, and the one thing that cannot be re-recorded

**Status:** Not started
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
