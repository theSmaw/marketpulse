# Task 2.11.1 — Settle where search lives, how it matches, and what the address carries, shipping no component

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** Story 2.10 (complete)

## Objective

Take this story's three open decisions — **where search lives**, **client-side or
server-side matching**, and **the URL shape** — together with the positions the
design work is asked for in [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) §8, and write
them down in one document before a control is typed.

Tasks 2.9.1 and 2.10.1 are the precedent, and the reason is the same: this story
is followed immediately by two chart stories and then by an epic that adds a
symbol switcher, a comparison picker and a window control. Every one of those is
a control, and the first control in a product decides what the rest look like. A
decision taken once here is a decision six later screens inherit rather than
re-take four different ways.

## What the user can see when this lands

**Nothing.** No field, no result, no pixel. The payoff is Task 2.11.4, which puts
the first interactive control in this product on screen, and the shell in 2.11.7.
Say so plainly when reporting it — this repository states "nothing visible"
rather than dressing it up, and names the task that pays it off.

## Work

Produce **`SEARCH-AND-SELECTION.md`** in this directory — the subject document
for this story, added to `CLAUDE.md`'s _Where the record lives_ table by the
close task (2.11.10) — and settle each of the following in it, with the
alternatives that were weighed and a **reversal trigger that is a condition
rather than a story number**.

- **Open decision 1 — where search lives.** A dedicated route, a persistent
  control in the chrome, or both. The argument is not aesthetic: a persistent
  control is how an analyst tool behaves and makes symbol switching cheap, which
  is what Epic 5 onward wants, and it touches `AppHeader` — which today carries a
  deliberate three-region status strip (feed, backend health, market clock) in a
  56px masthead. A route touches nothing and is simpler.

  Two things must appear in the decision or it is a preference. **What the
  masthead actually holds at each viewport** — read it rather than recalling it,
  and say what gives way if a field goes in. And **what Epics 4, 6 and 11 need**:
  §8.1's overview and §10's topology both select a security by other means, so
  the question is whether search is the way _in_ to a security or one of several,
  and the answer changes where it belongs.

- **Open decision 2 — client-side or server-side matching.** The measurement is
  already taken and the story's own amendment records it: the whole universe of
  518 securities reaches a browser as **20,072 bytes** compressed, and the
  deployed fetch is **~484 ms** against a **~376 ms** conditional floor. The page
  that will hold search **already fetches it** — `useSecurities` runs on
  `/securities` today — so client-side matching costs one request that is already
  being made, and gives per-keystroke results with no debounce problem.

  Decide it on the **ceiling** rather than on today, which is what the story asks:
  §6 names 100–500 securities for V1 and the universe is already 518. State what
  would move it — a corpus we do not ship (company aliases, former names), fuzzy
  ranking that needs a server index, or search over anything beyond the tracked
  universe, which §37 puts out of V1. If the answer is client-side, say what the
  server would have to be asked for if it changes, so it is a re-wiring rather
  than a redesign.

- **Open decision 3 — the URL shape.** Half of this is inherited and not open:
  **the path names the subject and the query names the view**, an absent
  parameter means the default, and the application never writes a parameter it
  did not need (`FRONTEND-STATE.md` §3). `/securities/:symbol` exists in
  `ROUTE_PATTERNS` and `securityPath()` is the only thing that builds one.

  What is genuinely open is smaller and user-visible: **does a search query
  belong in the address?** Is a half-typed query a shareable state, does the back
  button walk keystrokes, and what does the address do while a user is looking at
  the list rather than at one security. Decide it, and note that the answer binds
  Story 2.13's window control, which puts the first real parameter in the query.

- **Two constraints that are not decisions, recorded here because they are what a
  later reader will otherwise re-argue.** `status` is **not** filtered — an
  untracked security is findable and marked, never hidden (`UNIVERSE.md` §12.2),
  and a search that drops it reintroduces exactly the failure the schema avoids
  by having no `deleted_at`. And the **summary line must not become a lie**: it
  says which of two numbers it is reporting, so if filtering changes what is on
  screen the line has to say so.

- **The live-region rate**, which `FRONTEND-STATE.md` §7 hands this story by name.
  `/securities` already has two polite regions. A field that re-requests or
  re-announces per keystroke drives one at typing speed, which is actively
  hostile. Settle the rule now — a debounce with a named interval, or silence
  while a query is being typed and one sentence when results settle — and settle
  whether a third asynchronously-filled surface is being added to this page,
  because that fires §7's other reversal trigger and is cheap to decide before
  the layout exists.

- **Read the design deliverable against [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) and
  record what came back.** The brief asks for positions on the same three
  decisions; where design's recommendation and this document disagree, the
  disagreement is the interesting content and belongs in the file rather than
  being resolved silently. Record specifically: the input idiom (bordered or
  underlined, and why), whether `Locked` is drawn now or dropped until
  authentication exists, whether a result row carries a price, and whether the
  icon set gains a sixth member. That last one is a decision about the interface
  having another symbol, not a detail — the set has been closed at five since the
  refresh.

## Done when

- `SEARCH-AND-SELECTION.md` exists and settles three decisions plus the
  live-region rate, each with its alternatives and a reversal trigger that is a
  condition
- The matching decision states the **ceiling** it was taken against and what
  would move it, not only today's byte count
- The URL decision says what the address does while a query is being typed
- The two inherited constraints — `status` unfiltered, the summary line — are
  written down where the next four tasks will read them
- The design deliverable's positions are recorded, including where they disagree
  with this file
- Nothing is added to `apps/frontend/src` — verified by `git status`
- `pnpm verify` passes, which for a documentation task means `pnpm links` in
  particular

## Notes

The likeliest scope leak is drawing the control while deciding where it goes.
This task decides **where, how it matches, and what the address says**; the field
itself is 2.11.3 and the combobox is 2.11.4. If a decision here appears to force
the shape of the field, that is a finding to record rather than a licence to take
it.

The second likeliest is deciding the Security Explorer's grid here because it is
adjacent. It is Task 2.11.7's, and it is a layout question that wants the search
control to already exist.
