# Task 3.3.7 — Verify, document, the capture this story owns, and the close

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.6

## Objective

Close the story, and **discharge the one capture it inherited** — which is
cheap now and was impossible before.

## What the user can see when this lands

**Nothing new.** `LIVE` landed in 3.3.5. **Story 3.4 is next and it is the one
that moves a number** — the first time anything on this screen changes because
the market did.

## Work

- **THE CAPTURE THIS STORY OWNS — do it while a session is open.**
  `docs/GAPS.md` entry 7: **no verbatim `updatedBars` frame exists in this
  repository**, so two fixtures carry an **inferred envelope**. The risk is
  bounded to one thing — whether a `u` frame carries the same field set as a
  `b` — and if it differs, Task 3.2.4's mapper is wrong about `u` and right
  about everything else.

  **It has been re-pointed twice and must not be a third time.** Task 3.2.5
  built the client but nothing constructed one; Task 3.2.9 started one at
  06:10 ET with the market shut. **An owner that is a finished task never
  fires.** This story is the first developed against a running feed **during**
  sessions, so the trigger is something you meet rather than remember.

  **And there is a pre-flight this task must not skip**, because the last
  attempt failed on it: a capture on 2026-09-18 was refused `406 connection
limit exceeded` **by a stale process of our own** — a dry-run that never
  exited and outlived its own deleted source by a day
  ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §8.2). **Check nothing already holds the connection
  before connecting, and refuse rather than wait.**

  Record the frame verbatim, replace both fixtures, re-tier them to
  `transcribed` in `MANIFEST.json`, and **retire the GAPS entry** rather than
  re-pointing it.

- **The subject document.** This story decides a protocol, a transport and a
  set of words. Decide deliberately whether that is a new document or a section
  of [`STREAM-SEAM.md`](../story-02-stream-seam-and-alpaca-iex-client/STREAM-SEAM.md)
  — which is already _how a live observation reaches this process_ and may
  simply want _and how it reaches a browser_. **Add it to `CLAUDE.md`'s table if
  it is new; do not create a second home if it is not.**
- **An ADR if a decision outlives the story**, and **argue the absence if not**.
  The likely candidate is the protocol guard from 3.3.1 — what plays
  `satisfies`'s role on a socket is a decision Epic 10's event stream inherits.
- **Sweep upward**, and expect to find something: this story is the first to put
  a live claim on a screen, and `PROVENANCE.md`, `VISUAL-LANGUAGE.md` and
  `CLAUDE.md`'s _What a user can see today_ all describe a product that cannot
  say anything about **now**.
- **Both audits, by enumeration with a count** — the shape Story 3.2's close
  established and both of which caught something:
  - **Hand-offs**: grep [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) for every `Story 3.N` and `Owner:`
    line, and confirm each constraint is in the owning story's **own** file in
    words it can act on. **Counting citations measures citation, not delivery** —
    Story 3.2's close produced a false positive doing exactly that.
  - **Construction sites**: every exported factory, route and hook this story
    adds, grepped for a caller outside a test. **Story 3.2 shipped three
    implementations with no construction site and a green `verify` throughout.**
- **Walk the acceptance criteria against a RUNNING system**, not only the suite.
- **`pnpm verify`, `pnpm e2e`, `pnpm probe`**, and every gate this story can
  break.

## Done when

- **`docs/GAPS.md` entry 7 is RETIRED**, with a verbatim `u` frame in the
  corpus re-tiered to `transcribed` — or, if a session genuinely could not be
  had, re-pointed **with the reason written down**, which is the third time and
  should feel expensive
- The subject document exists or is argued into an existing one; `CLAUDE.md`
  names it if new
- An ADR is written or its absence argued in a paragraph
- Both audits ran **with counts recorded**
- Every acceptance criterion in [`STORY.md`](STORY.md) is walked against a
  running system
- `pnpm verify` and `pnpm e2e` pass

## Notes

**This is the first close in the epic with a user-visible thing behind it**, so
the sweep matters more than usual: every document that says this product cannot
speak about the present became false in 3.3.5, and none of them knows yet.
