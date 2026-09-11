# Task 2.11.6 — Every state produced, not described

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.4

## Objective

Produce every state search can be in — from a named cause, in the workshop and
in a test — rather than reasoning about them. Task 2.10.8 is the precedent and
the reason it was a task rather than a step applies here too: the interesting
states are the ones the happy path cannot reach, and an unreachable state is one
nobody has looked at.

## What the user can see when this lands

**An honest sentence for every way this can go wrong**, and for the several ways
it can go right that look like going wrong. Typing `zzz` says so and is not an
error. A security that exists with no stored bars says that, and it is a correct
answer rather than a failure. An untracked security is found and marked rather
than missing. And when the backend is unreachable, the search says so **without
collapsing the page** — §36's rule, which this product has honoured on every
screen so far and must not break on its first control.

## Amended 2026-09-11 by Task 2.11.4 — three of these are settled or half-built

Read before starting, so none of it is designed twice:

- **The resting state is settled: the surface is absent.** This file left it open
  ("whether the result surface is absent or is showing something useful"). It is
  absent — `expanded` is false whenever the trimmed query is empty, so there is
  no surface and no listbox in the DOM at all. What remains here is whether that
  is the _right_ answer and whether anything should occupy the space.
- **The stale-close and missing-close rows already have a story and a test**
  (`MixedSessions` and `WithoutCloses`, plus two component tests). They were
  built because the control could not render without answering them. What is
  left is the rest of this list, not those two.
- **The control is rendered only when the universe has loaded.** That is not a
  designed state — it is the absence of one, and it is this task's to replace.
  Today the field simply is not on the page while the universe is loading,
  unreachable, or answered badly, which is the least honest of the available
  answers and the reason this task exists.

## Work

Every state below gets a **story** and, where it is behavioural, a **test**. The
fixture backend from Task 2.10.6 and the recorded response bodies in
`src/fixtures/` are how they are produced without a server; note that those
fixtures are imported by tests and stories only and **must not reach the shipped
bundle** — a fixture pulled into a component by a well-meant import ships a
recorded market body to every visitor.

- **No query.** The resting state. Whether the result surface is absent or is
  showing something useful was a design decision; implement it and say in the
  header which it was. **Narrowed 2026-09-11 by Task 2.11.2: the matcher returns
  nothing for an empty or whitespace-only query**, deliberately — the whole
  universe is already on screen underneath — so if this state shows something, it
  comes from somewhere other than the matcher and the header says where.
- **Query, no matches.** Not an error. `zzz` is a reasonable thing to type, and
  the copy must not read like a failure.
- **Query, one match.** The case where pressing Enter obviously works.
- **Query, many matches.**
- **More matches than shown.** The matcher returns the shown slice and the true
  total (2.11.2); this is where "N more matches" becomes a sentence a person
  reads, and it must say what to do about it. **Reachable from real data — added
  2026-09-11 by Task 2.11.2**: the cap is **ten** (`SECURITY_MATCH_LIMIT`) and
  typing `a` against the real universe matches **99**. So unlike the two close
  states below, this one needs no constructed fixture, and the story should use
  the real query rather than a made-up one.
- **An untracked security in the results.** Shown and marked, unmistakably, never
  hidden. This is the state that reintroduces a real schema-level failure if it
  is got wrong, so it is produced with a named fixture rather than trusted.

  **One interaction to produce deliberately — added 2026-09-11 by Task 2.11.2.**
  `status` is not a filter, but it **is** the first tie-break: an untracked
  security ranks below a tracked one in the same tier (`SEARCH-AND-SELECTION.md`
  §6's dated amendment). With more matches than the cap, that demotion can push
  an untracked security off the _shown_ slice while the `total` still counts it —
  which is correct behaviour and indistinguishable on screen from the thing this
  state exists to forbid. Produce it: a query with more than ten matches, one of
  them untracked, and check that what the surface says about the total is what
  makes the difference legible. It is unreachable from real data twice over —
  all 518 securities are `active` today.

- **A symbol with no stored bars.** It exists in the universe and has nothing
  behind it — a first-class answer. The market-data layer already has the
  vocabulary for this and **the words must not be reinvented**: read
  `bar-series-view.ts` and `BarSeriesPanel` and keep one set of terms, in which
  _partial_ is an answer rather than a failure.
- **A row whose close is older than the surface says, and a row with no close at
  all — added 2026-09-11 by Task 2.11.1.** The result row carries a close and a
  change (the user's decision, `SEARCH-AND-SELECTION.md` §5), the surface names
  the session once, and a row whose own `session` is earlier carries its own date.
  **Both of those are unreachable from real data today and that is exactly why
  they need producing here**: measured 2026-09-11, all 518 securities have a close
  and all 518 sessions read `2026-09-04`, so a bug in which the footer states one
  session while a row's close came from another is **invisible while the data is
  uniform**. A partially-backfilled security is the condition that ends the
  uniformity, and it is constructed from a fixture rather than waited for. Neither
  is an error state: an older close is a true fact about what we hold, and a
  missing one is the same first-class answer as a missing bar.
- **The universe is still loading.** The control exists before its corpus does.
  Say what it does — disabled with a reason, or accepting input and holding it —
  and make it a state rather than a flicker.
- **The universe could not be read.** Distinguish **retryable** from not, which
  is the decision `FRONTEND-STATE.md` settled: a retryable failure gets a retry
  and a sentence saying waiting may help; a permanent one gets neither, because a
  retry button on something that will fail again is a lie the user pays for
  twice. Branch on `code`, never on the status number, and never put the raw code
  on screen — `requestId` remains the only internal identifier this product
  shows.
- **The rest of the page survives all of it.** Search failing leaves the panel
  and the table exactly as they were. §36: degrade locally, never collapse to a
  global error screen.

Two further pieces of work that are about states rather than a state:

- **The summary line must still be true** in every one of these. If filtering
  changes what is on screen, the line says so; whatever it does, it never reports
  a number that disagrees with what a person can count. There is a test for this
  and it is worth writing as an assertion about the sentence rather than about a
  number.

- **The announcement.** One sentence per settled subject, naming its subject,
  at the rate Task 2.11.1 settled. Add the test that a sentence read out of
  context is complete — that is what makes two queued regions survive being
  queued in either order.

## Done when

- Every state above has a story, and `pnpm stories` passes
- Each state is produced from a **named cause** — a fixture, a stubbed response,
  an empty universe — rather than by setting a prop by hand where the real cause
  is reachable
- The untracked case and the no-stored-bars case have tests naming them,
  including an untracked security demoted past the cap
- The capped state is produced from the real query that reaches it (`a`, 99
  matches) rather than from an invented one
- The stale-close and missing-close rows are produced from a fixture, since real
  data cannot reach either today
- A failing search leaves the panel and the table rendering
- The summary line has a test that would fail if filtering made it a lie
- The vocabulary matches `bar-series-view.ts` rather than adding a second set
- No fixture is imported by a shipped component — re-measure the way `CLAUDE.md`
  records it: build, then grep `dist/` for a fixture bar timestamp and find
  nothing
- The axe gate reads zero violations; `pnpm verify` passes

## Notes

The precedent worth copying exactly from Task 2.10.8 is _produced, not
described_. A story that sets `state: "unavailable"` by hand proves the component
can render a string; a story that drives the real code path with a stubbed
failure proves the state is reachable and that the copy is what a person actually
sees. Where the real cause genuinely cannot be reached in the workshop, say so in
the story's own comment rather than leaving the difference invisible.
