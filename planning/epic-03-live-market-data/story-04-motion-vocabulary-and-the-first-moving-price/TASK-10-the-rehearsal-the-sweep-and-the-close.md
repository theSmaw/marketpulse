# Task 3.4.10 — The live rehearsal, the sweep, and the close

**Status:** Not started
**Amended:** 2026-09-21 after Task 3.4.6 — the rehearsal is **two sittings or one that straddles the bell**, because the extended-hours mark cannot be seen with the market open and no fixture or replay can stand in for it.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.9

## Objective

Close the story, and **accept it against the live feed** rather than against the
instrument it was designed with.

## What the user can see when this lands

**Nothing new.** Story 3.5 is next.

## The rehearsal is the acceptance, and it is not optional

**Design against the replay; accept against the live feed.** The replay is real
recorded movement and is the right instrument for the _decision_ — it is not the
instrument for the _acceptance_. This story owes a **dated row in
[`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md)**, watched during a real session.

**And it cannot be skipped by running the replay again**, which is the shape the
skip would take: the replay is our own stored bars and therefore agrees with our
own assumptions by construction. A green rehearsal against it certifies nothing
the design pass did not already.

> **AMENDED 2026-09-21 after Task 3.4.6 — the rehearsal can no longer be a
> single sitting inside the session, and finding that out on the morning would
> cost the window.**

**The extended-hours mark cannot be seen with the market open.** That is what it
means. It renders for `before_open` and `after_close` only, so the one
criterion below that says _with the market open_ and the one mark shipped on
2026-09-21 are **mutually exclusive by construction**.

So the rehearsal is **two sittings, or one that straddles the bell**:

| Window                                   | What only this window shows                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| **04:00–09:30 ET** or **16:00–20:00 ET** | the **extended-hours mark**, on real data, for the first time                 |
| **09:30–16:00 ET**                       | a genuinely quiet minute, a correction, and `pnpm probe` with the market open |

**Neither the replay nor any fixture can stand in for the first row.** ADR
0030's replay re-stamps recorded bars onto the **wall clock**, so out of hours
every bar it produces lands on a weekend and carries **no mark at all** — which
is why Task 3.4.6's three states live in the workshop rather than on the running
page. **The mark is shipped and has never been seen against a real bar.**

**And one third-party assumption is worth a single glance while real frames are
in front of you.** Task 3.4.6 argued that `weekend` and `holiday` need no mark
because **IEX trades on neither**, so a live observation cannot carry such an
instant. That is an assumption about a vendor rather than a measurement. If a
frame ever turns up stamped outside a trading day, the mark says nothing and
nobody finds out — so note the answer either way, in the vendor's own document.

**Two things to watch for that the replay cannot show:**

- **A quiet minute produces no frame at all** (§7.2), and IEX covers **65.1% of
  minutes for a median symbol and 2.1% for `ERIE`** (§7.6). **A still price is
  the feed working**, and whether that reads as _alive but quiet_ or as _broken_
  is the question the whole vocabulary turns on — and only a real session has
  genuinely quiet minutes in it.
- **A correction arriving ~30 s later** (§7.8). Fourteen were measured in one
  session; the replay does not produce them unless somebody made it. **Since
  Task 3.4.6 there is a shipped behaviour to watch rather than only an event**:
  a revision **fires the arrival mark**, and the qualifier's instant **does not
  advance**. Confirm both against a real one — that pair is the entire argument
  for a correction having no treatment of its own, and it has only ever been
  seen against a rerender in a test.

## Work

- **Watch a real session** and fill in the rehearsal row.
- **Sweep upward, and expect to find something.** `VISUAL-LANGUAGE.md`'s Motion
  section says it is a thin first cut and that **Epic 3 owns the full
  vocabulary** — that sentence becomes false here. `CLAUDE.md`'s _what is open_
  carries **the fourth design test, deferred eight times**; this is the story
  that pays it and that entry is the one to correct rather than extend.
- **Both audits, by enumeration with a count** — the shape Story 3.2's close
  established and both of which have caught something every time:
  - **Hand-offs**: grep `LIVE-DATA.md` and this story's own file for every
    `Story 3.N`, and confirm each constraint is in the owning story's **own**
    file in words it can act on. **Counting citations measures citation, not
    delivery** — Story 3.3's close found Story 3.10 cited twenty times with
    nothing in its own file.
  - **Construction sites**: every export this story adds, grepped for a caller
    outside a test. Story 3.3's close deleted one this way.
- **An ADR if a decision outlives the story.** A motion vocabulary that five
  stories inherit is a strong candidate; argue the absence if not.
- **Walk the acceptance criteria against a running system**, and `pnpm probe` at
  four viewports **with the market open**, which criterion 8 requires and which
  only this task can satisfy. **Probe the extended-hours case too, out of
  hours**: Task 3.4.6 measured the identity block at **88 px against 72 px** at
  390 when the word is present, so the block has two heights and only one of
  them has ever been photographed at four widths.

## Done when

- **A dated row in `LIVE-REHEARSAL.md`**, watched during a real session — not
  the replay
- A quiet minute was watched, and what it reads as is written down
- **The extended-hours mark was seen on a real bar**, which requires a window
  the session itself excludes — or its absence is recorded with the reason
- **A real correction was watched**, and both halves confirmed: the mark fires,
  the instant does not advance
- `VISUAL-LANGUAGE.md`'s "Epic 3 owns the vocabulary" sentence is corrected, and
  `CLAUDE.md`'s eight-deferral entry is closed rather than extended
- Both audits ran **with counts recorded**
- An ADR is written or its absence argued in a paragraph
- Every acceptance criterion in [`STORY.md`](STORY.md) is walked against a
  running system, with the market open
- `pnpm verify` and `pnpm e2e` pass
