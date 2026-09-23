# Task 3.8.7 — The surfaces that now show a stored today

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

Two shipped surfaces change meaning the moment the store holds today, and both
were handed here by the stories that built them. Neither is a new feature;
both are the kind of thing that is **invisible until somebody watches it**.

## What the user can see when this lands

**Consistency across a reload**, which is the sort of thing a user notices only
when it is wrong: a row that was live before the reload and is stored after it
should not change what it claims, and a page re-read from the store should not
pretend prices are arriving.

## 1. The universe table's dating rule, which this story blurs

Handed here by Story 3.6's close. The `Last` column used to hold one kind of
number — a close from the consolidated tape, all from one session — so the date
was stated **once, in the heading**. A live price is a different kind of number
from a different feed, so once any row is live the heading withdraws its shared
claim and **each stored row carries its own session date**, while a live row
carries none and is spoken as `Live price`. Measured then: the exception set
went from 3 of 518 to about 197.

**Storing the live session blurs the line that rule draws.** After 3.8.3 a
reload shows today's bars as **stored**. Decide, in this story's file, what a
stored bar from **today's** session says in that cell and whether it is dated —
and keep the two things the table already guards: the spoken word tells the two
kinds apart, and a claim about a session is made only while it is true of the
whole column.

## 2. The arrival mark, which must not fire on a re-read

Handed here by Story 3.4's close. The mark means **a bar arrived for this
security** — an event — and re-reading a stored session is not one. The
vocabulary is _work in progress loops, a state persists, **a fact arriving
decays**_, and a mark that fired while a user scrolled through yesterday would
make the vocabulary's own sentence false.

**The mechanism to check rather than rebuild**: the mark keys on the
observation's **content**, and `SecurityIdentity` remembers the instant it
mounted with so a first paint marks nothing. Whether that still holds when the
prices come from a **store** rather than a socket is this story's to confirm —
and Story 3.4's close named it as _the one thing that would be invisible until
somebody watched it_.

Note also, from Story 3.6's close: the table is memoised on the observation's
identity, so a stored bar handed to it under a **new object for the same
minute** is a re-render of that row.

## Work

- The dating decision, taken and written down, with whatever the table needs
- Confirm or repair the arrival mark against a store-fed page, and **assert it
  in a browser** — this is a layout-and-time fact, so nothing below `pnpm e2e`
  can see it
- `pnpm probe` at the four viewports if either surface's shape moves
- A `pnpm break` for whichever rule is now load-bearing
- Design: read the source note's two-feed rendering against
  `VISUAL-LANGUAGE.md`'s provenance section now that it has real data behind it
  for the first time, and record whether the drawn result matches what the
  canvas intended. **Check `DesignSync` first** — see the note in `STORY.md`

## Done when

1. What a stored bar from today's session claims in the `Last` column is decided
   and drawn
2. The arrival mark is proved not to fire on a store re-read, in a browser
3. `pnpm verify` passes and the browser suite is green
