# Task 2.14.7 — Every failure and partial state in the epic, checked as a set

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.3, 2.14.4, 2.14.5, 2.14.6

> **Amended 2026-09-14 by Task 2.14.1.** Two entries join the set: the two empty
> answers are now genuinely two states rather than one sentence used twice, and
> **they cannot both be produced in one store**; and a zero-bar page's missing
> `SourceNote` is a designed absence that belongs in the enumeration rather than
> looking like a gap in it.

> **Amended 2026-09-14 by Task 2.14.3.** The second of those entries splits in
> two, and the note's **reduced** shape — one clause, on every zero-bar page — is
> a state the enumeration would otherwise miss entirely. See the list below.

> **Amended 2026-09-14 by Task 2.14.4, which built that clause.** The split
> above is right and the **causes** under it were incomplete. Two more entries
> join the set, and one live claim in the list below was wrong: the note renders
> nothing on a page whose universe fetch has not resolved or has failed **and on
> one whose address names a symbol the universe does not hold** — which, unlike
> the other two, is reachable by typing it. The new story-only entry is the
> classification clause **with no date**. Both are in the list.

> **Amended 2026-09-15 by Task 2.14.5.** A state joins the set, a rule joins the
> decided list, and the store hazard this task already carries turns out to have
> a third case.
>
> - **The coverage sentence is a state**, and it is the newest voice in the set:
>   `Holding 1,560 bars, through 2026-09-11 16:00:00 EDT, of a window running to
2026-09-14 16:00:00 EDT.`
> - **It cannot be seen in the two stores this pass is most likely to be run
>   against.** `store:bare` has zero bars, so every chart there is a correct
>   `empty` and never a `partial`; the deployed store is backfilled nightly and
>   answers a named window in full, so it is `loaded`. **A developer's own store,
>   a few sessions behind, is the only one that produces it** — which makes three
>   states in this set that no single store can show together, where the task was
>   written for two.
> - **The rail now has three possible occupants and a stated priority**, and that
>   is the one place in the epic where three sentences compete for one slot. It is
>   exactly what this task is for: _held window_, _refreshing_, _coverage_. Check
>   them as a trio.

## Objective

Acceptance criterion 3, and the local half of criterion 5. Take every failure
and partial state this epic can produce — **as a set, in one sitting, on one
screen size, by a person looking at them** — and establish three things: each is
a designed state, none of them produces a global error screen, and together they
speak in one voice.

The per-component work is already done. Story 2.10 shipped six union members,
Story 2.13 shipped four more states of a window change, and each was reviewed
against its own story. **Nothing has ever reviewed them against each other**,
which is where a product acquires four different words for _"we could not reach
the server"_.

## What the user can see when this lands

**The product behaves the same way every time something is missing** — and looks
deliberate while doing it. This is the criterion §36 makes a product
requirement: failures degrade locally, the rest of the workspace and any
gathered evidence stay visible and labelled, and there is no global error screen
anywhere in the epic's surface.

## What is already decided and must not be re-taken

- **Every state is produced from a named cause and reviewable in a stories
  grid** — the copy matrix, visible text against announced sentence for every
  state, is in Story 2.10's `TASK-08`. **Read it before rewriting any of it.**
- **A wait longer than 160 ms is covered by a pulsing panel over the picture,
  never over a number**, and the in-flight rail sentence was withdrawn because it
  lived 3–68 ms (ADR 0028, amended 2026-09-14). Do not reintroduce a sentence
  nobody can read.
- **The rail's order is stated rather than stacked** (`VOLUME-AND-WINDOW.md` §82,
  `PROVENANCE.md` §3.2): held window, then refreshing, then coverage, then
  nothing. This pass checks that the three speak one voice; it does not re-decide
  which of them wins.
- **Motion means work in progress, and nothing else may borrow it**
  (`VISUAL-LANGUAGE.md`, 2026-09-15). A settled rail's hairline is static; only
  `.refreshing`'s marches. A state in this set that moves while saying something
  has finished is a defect this pass should catch, and it is the one that nearly
  shipped in 2.14.5.
- **The last answer stays on screen until a newer one replaces it.** A window
  change never blanks the page.
- **One `Try again` per screen**, and every failure has an honest sentence.
- **A 5xx never carries the thrown message**, and a natively `disabled` control
  is not focusable — so anything `aria-describedby` hangs off it is unreachable,
  which is why `TextField` renders `aria-disabled` + `readOnly`. Both of those
  are shipped rules this pass verifies rather than re-decides.

## Work

- **Enumerate the set before producing any of it.** At minimum: search
  unavailable; the universe unreachable; a security not in the universe; a
  security found with no data; **both** empties, which are now two distinct
  sentences derived from two different facts (2.14.6) and which **cannot both be
  seen in one store** — `store:bare` gives only the first; a partial window **and its coverage
  sentence**, which is 2026-09-15's addition and is visible in **neither**
  `store:bare` **nor** the deployed store — the first has no bars and the second
  has them all, so only a developer's own store a few sessions behind produces
  it; a
  chart request failed; a window change refused by the cap; a window change failed with
  the previous window still readable; the stale mark; the untracked badge; the
  backend unreachable entirely; a security page opened cold with no backend at
  all; ~~**and the state where `SourceNote` renders nothing**, which is every
  zero-bar page and is a designed absence rather than a missing element~~ —
  **corrected 2026-09-14: it is two states, not one, and the enumeration gains
  the more interesting of them.** §0.1 is **per clause** since Task 2.14.2, and
  Task 2.14.3 implemented it that way, so: a zero-bar page draws the note
  **reduced to its classification clause alone** — the designed absence is of the
  two bar-derived clauses rather than of the note — and the note renders
  **nothing at all** only where no clause has data, which is a page whose
  universe fetch has not resolved or has failed. Both belong in the list, and the
  first is the one nobody would think to look at, because it is the shape **every
  page CI renders** ([`PROVENANCE.md`](PROVENANCE.md) §0.1).

  **Two more, added 2026-09-14 once Task 2.14.4 had built the clause**, and the
  second corrects the sentence immediately above rather than extending it:

  - **The classification clause with no date** — `provenance` absent from the
    universe envelope, the claim standing, and the date replaced by _When they
    were last checked is not recorded._ **No server this product runs can produce
    it**, because there is one curated file, so it is a story and that fact goes
    in the list beside it. It is the one entry in the set where what is missing is
    a **qualification** rather than an answer, and it carries no marker
    deliberately — which is worth checking against the rest of the set, since
    every other absence in it has one.
  - **A symbol the universe does not hold**, where the note renders **nothing**.
    The sentence above names two causes for that and there are three; this is the
    only one a person reaches by typing. It is also the entry most likely to be
    judged wrongly in isolation: `SecurityIdentity` has already said what is wrong
    with the address, in its own words and with its own marker, so what this pass
    checks is that **one** surface answers and the others are silent — not that
    each of them says something.

  Write the list into `PROVENANCE.md` — the list **is** the deliverable of this
  bullet, because a set checked from memory is a set with a hole in it.

- **Produce each one for real**, against a running pair. `store:bare` gives the
  empties; a stopped backend gives the unreachable states; `?sessions=` beyond
  the cap gives the refusal. Where a state needs a body no server sends, it is a
  story rather than a browser — and that fact goes in the list beside it, because
  "reviewed in Storybook" and "seen in the product" are different artefacts.
- **Look at them side by side.** Screenshot each, at 1440 and 390, with
  `pnpm probe`. The point of the pass is the comparison, and it is invisible one
  state at a time: four sentences that are each individually fine and
  collectively four different voices is the exact defect this task exists to
  find.
- **Check for a global error screen at every level**, which is the one hard
  criterion in the set. The `ErrorBoundary` exists and a thrown render is the way
  to a full-page failure; verify that each region's failure stays in its region,
  and remember that a boundary reset cannot recover state that lives **above**
  the boundary (that is a documented non-assertion, not a bug to chase).
- **Cover the failure states in the local browser suite** — criterion 5's local
  half. `backend-failure-states.spec.ts`, `security-series-states.spec.ts` and
  `security-window-change.spec.ts` exist and are the homes; extend rather than
  add a parallel file. Two suite rules apply: **before asserting on a number,
  ask whether CI has the data** (518 securities, zero bars), and a chart mark is
  **counted** rather than asserted visible, because a horizontal gridline is zero
  pixels tall and Playwright reports it `hidden`.
- **Run scoped while iterating.** `pnpm e2e security-series-states.spec.ts -g "…"`
  is seconds; the whole suite is five minutes and is for the end.

## Done when

- The enumerated set is in `PROVENANCE.md`, each entry with how it was produced
  and where it was seen — product or story.
- Every state renders as a designed state at 1440 and 390, and the screenshots
  were looked at as a set.
- **The rail's three occupants were compared against each other**, not only each
  against its own story: they share one slot, one reserved height and one marker,
  and three sentences that are individually fine and collectively three voices is
  the defect this task exists to find, arriving in the one place the product
  guarantees a reader will meet them in sequence.
- No state in the set produces a global error screen, and that was verified
  rather than assumed.
- The local browser suite covers the failure states; `pnpm e2e` is green.
- `pnpm verify` passes.

## Notes

This task is where this epic either reads as trustworthy or reads as broken, and
it is the one most likely to be declared done from a green suite. A green suite
says the states exist. It says nothing about whether they speak the same
language, and that is the entire deliverable.
