# Epic 11 — Generative Workspace

**Status:** Not started
**Sequence:** 11 of 15 — follows Epic 10 (AI-Assisted Investigations)
**Spec references:** PRODUCT_SPEC.md §5.4 (AI manipulates state, not HTML), §18 (generative UI), §19 (workspace history and undo), §34 (human-in-the-loop controls)

## Goal

Allow the AI to change how evidence is presented, rather than only responding with text.

## Outcome

Natural-language intent dynamically changes the analytical workspace.

## Scope

- Typed workspace-command schema
- Command validation
- `focusSymbols`
- `openChart`
- `compareSymbols`
- `setTimeWindow`
- `highlightGraphNodes`
- `setGraphEncoding`
- `pinEvidence`
- AI-generated workspace commands
- Workspace-command history
- Undo/redo
- User-pinned components

## Exit criteria

A request such as:

> Is this really a semiconductor sell-off or mostly the largest companies?

can cause MarketPulse to:

- change the graph;
- create a comparison;
- alter chart contents;
- focus the relevant securities;

while still using only trusted frontend components.

**Milestone:** by the end of this epic MarketPulse demonstrates the AI/frontend interaction the portfolio is built around.

## One entry condition, inherited rather than invented (added 2026-09-15)

**A listening pass with a real screen reader is owed before this epic starts**,
and until 2026-09-15 the roadmap gave it no home: Epic 2 closed it with the owner
_"a person with a screen reader, **before Epic 11**"_, while the only
accessibility review in fifteen epics is Epic 15's — four epics too late to help
here.

The finding, from `VOLUME-AND-WINDOW.md` §65: the security page's spoken bar
sentence is **25 words against a 1,500 ms pacing floor**, and whether a live
region changing every **477 ms** queues or replaces is a property of a specific
screen reader on a specific platform — **not readable from the DOM, from a
timing, or by an agent**. The repair is designed and unshipped: split the
sentence, do not raise the floor.

**Why it lands here specifically.** This epic is where a model starts driving
that surface: `focusSymbols`, `setTimeWindow` and `compareSymbols` change the
same regions, and they fire faster and less predictably than a person pressing
an arrow key. A live region that queues rather than replaces is a minor
annoyance under human control and an unusable backlog under an agent's. **So the
pass is cheap now and load-bearing the moment this epic ships.**

It needs a person with VoiceOver or NVDA. `e2e/README.md`'s own words: a green
axe run is not an accessibility review — and this epic's gate is not a check
that can be added.

## Handed here by Epic 5's close — 2026-10-29 (Task 5.7.5): three new things a listener cannot read from a DOM

`CLAUDE.md`'s standing open item — _a listening pass with a real screen
reader_ — names **this epic** as its deadline: _before Epic 11 hands this
surface to an agent_. Epic 5 added three entries to it, and none is answerable
from a DOM, a timing or by an agent. They are recorded here because the deadline
is this epic's and the item is otherwise a list nobody owns.

- **The score's explanation is a real `<table>` whose last column SUMS to the
  figure above it.** Whether an addition is _read_ — rather than heard as four
  unrelated cells — is a listener's question. The ledger carries one row per
  factor in every state, so a fully-refused security produces four rows of
  reasons and no figure.
- **The band is stated ONCE for ten rows.** On `/`, `TOP 10 · ALL EXTREME` sits
  in the region's heading rather than on each row, measured and deliberate — the
  per-row chip cost 25% of a 308 px row and all ten rows share one band in 35 of
  77 instants. **A listener who arrives at row 7 has no band at all**, which a
  sighted reader does not experience.
- **Six refusal sentences can occur in one region.** Whether that reads as
  thoroughness or as noise is the same question for a listener as for a reader,
  and the answers may differ.

**And the security page acquired a SECOND `<table>` in Epic 5** — the ledger,
beside the tracked universe. `docs/GAPS.md` records what that cost: every bare
`getByRole("table")` on that route became ambiguous, which reached `main` and
**skipped a deploy**. Any agent-driven navigation of this surface needs the same
care: _the table_ is no longer a unique thing to ask for.
