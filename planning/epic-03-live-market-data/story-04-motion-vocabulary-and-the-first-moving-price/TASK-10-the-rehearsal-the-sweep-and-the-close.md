# Task 3.4.10 — The live rehearsal, the sweep, and the close

**Status:** Not started
**Amended:** 2026-09-21 after Task 3.4.7 — the ADR question is now **two decisions**, and the second one reaches past this epic.
**Amended:** 2026-09-21 after Task 3.4.9 — the construction-site audit now has **two forms**, because the export grep would not have caught a published row nothing could reach.
**Amended:** 2026-09-21 after Task 3.4.8 — **§28's p95 is half-measured and the rehearsal cannot close it**, because no wire message carries a server instant. Do not record it as met.
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
    file in words it can act on. **`CLAUDE.md`'s listening backlog grew by two
    entries on 2026-09-21** and its owner is _a person with a screen reader_
    rather than a story — check it reads as one item with four entries rather
    than as four items, because a backlog nobody can hold in their head is a
    backlog nobody picks up. **Counting citations measures citation, not
    delivery** — Story 3.3's close found Story 3.10 cited twenty times with
    nothing in its own file.
  - **Construction sites, and since 2026-09-21 in TWO forms** — because the
    first form would not have caught Task 3.4.9.
    - **The export form**: every export this story adds, grepped for a caller
      outside a test. Story 3.3's close deleted one this way.
    - **The REACHABILITY form**, which is new: every row of every state grid
      this story published, walked from its **producers** rather than its
      renderers. Task 3.4.9's defect had a caller — what had no implementation
      was the **decision**, so an export grep returns clean while a documented
      row sits on a screen-in-a-document for four days. `docs/GAPS.md` entry 13
      carries the family; this story published rows in `VISUAL-LANGUAGE.md`'s
      motion set and in `Live in the chrome` §11, and neither has been walked.
  - **And the open item this story fired.** `CLAUDE.md` carries _nothing checks
    that a named region says something when its subject is missing_, owned by
    _the next story that adds a region_. Task 3.4.9 met its **harder form** —
    _nothing checks that a named region says something coherent when it has two
    subjects_ — and answered it for one cell. **Decide whether that entry
    widens or gains a sibling**, rather than leaving a fired trigger reading as
    unfired.
- **An ADR if a decision outlives the story.** A motion vocabulary that five
  stories inherit is a strong candidate; argue the absence if not. **The case
  got stronger on 2026-09-21 and it is now TWO decisions rather than one**, and
  they are different in kind, which is the thing to weigh:
  - **the motion vocabulary** — _work in progress loops, a state persists, a
    fact arriving decays_ — which Stories 3.6, 3.7 and 3.9 inherit, and which
    already governs a glyph the chrome also uses;
  - **a self-changing value announces nothing**, in `FRONTEND-STATE.md` §7 with
    four reasons and a trigger. That one reaches past this epic entirely: Epic 5
    has anomaly scores that change on their own and Epic 10 an agent event
    stream, and **both will meet the trigger rather than the decision**.

  One ADR, two, or none with a paragraph — but decide it against both, not
  against the motion half alone.

- **Confirm the deployed chrome really is unchanged.** Task 3.4.9 promised it
  and verified it with a unit test over every selection — `alpaca` still reports
  `sip`, `fixture` `synthetic`, `none` `null`. **The rehearsal is the first time
  a person sees the production path**, and criterion 8's walk with the market
  open is where that promise stops being a test and becomes an observation.
- **Do NOT expect the rehearsal to close §28's p95**, and do not let the sweep
  record it as met. Task 3.4.8 measured _frame delivered → price on screen_ at
  **p95 52 ms** on a production build; §28's clock starts at
  **server-received**, and **no message on the wire carries a server-side
  instant** — so there is nothing to subtract from and a real session supplies
  latency without supplying a way to measure it. `docs/GAPS.md` entry 12 holds
  the whole state and **Story 3.11 owns the decision**, which is a protocol
  change rather than a missing test. What this sweep owes is only that the
  browser half is never quoted as the whole.
- **The production-bundle recipe, if any criterion needs one** — Task 3.4.8's,
  and it is four lines rather than a rediscovery: `pnpm build`, then
  `CORS_ORIGIN=http://localhost:4173 pnpm --filter @marketpulse/backend start`,
  then `pnpm --filter @marketpulse/frontend preview`, then
  `E2E_BASE_URL=http://localhost:4173` in front of Playwright. The six-test
  motion spec passes against it as well as against `pnpm dev`.
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
