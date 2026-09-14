# Task 2.14.10 — The epic close: the cost, the ADR, the sweep, and what ships open

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1 – 2.14.9

> **Amended 2026-09-14 by Task 2.14.4 — one candidate for the ADR, and one for
> the sweep.** Neither is a new task; both are things this close is the right
> place to take.
>
> - **A rule the ADR should carry, because it outlives this story:** _is this an
>   instant somebody stamped, or a date somebody typed?_ Every other timestamp in
>   this product is converted to market time, and that is right for one a server
>   stamped. The curated file's `checkedOn` is a calendar date a person types,
>   widened to a UTC-midnight instant only because JSON has no date type — convert
>   it and the screen reads a day early with **nothing on the page looking
>   wrong**. It is recorded in `VISUAL-LANGUAGE.md`'s Provenance section as a
>   standing question, and it is load-bearing well past Epic 2: Epic 3's live
>   clock, Epic 9's filing dates and Epic 13's replay clock all hang dates on
>   surfaces.
> - **A candidate for `pnpm invariants` rather than for `GAPS.md`:** _no renderer
>   reads `FieldGroupProvenance.source`._ It is a free string by design, so no
>   compile-time table can ever guard it, and the rule that keeps the slug off the
>   screen is currently a decision plus one component test. It is a single grep
>   and would owe a `pnpm break` entry. Decide it here rather than leaving it —
>   the list's own rule is that an entry which can be made mechanical should be.

> **Amended 2026-09-14 by Task 2.14.1.** The ADR's candidate second subject moved
> (the empty distinction did **not** go on the wire), the document sweep turned
> out to be a **confirmation** rather than a repair
> ([`PROVENANCE.md`](PROVENANCE.md) §8.2), and acceptance criterion 2 needs
> reading against the measurement rather than as written (§8.1). Each is edited in
> place below.

> **Amended 2026-09-15 by Task 2.14.5, and one item below is now discharged
> rather than owed.**
>
> - **Acceptance criterion 2 is done.** The bullet below says it "must not be
>   signed off as written" and asks for a record of how it was discharged. That
>   record exists: [`PROVENANCE.md`](PROVENANCE.md) §11 is the pass as a list —
>   §11.1 states the inversion and the reading, §11.2 how the corpus was
>   enumerated, §11.3 every surface with its judgement, §11.4 what became
>   mechanical and §11.5 what could not. `STORY.md` carries the reading beside the
>   criterion itself. **What is left here is a confirmation and one check**: that
>   the pass covers the strings Tasks 2.14.6 and 2.14.7 added _after_ it, which is
>   2.14.6's own amended done-when. Do not re-run the pass; check the two rows are
>   there.
> - **The ADR gains a fourth candidate, and it is the one with reach.** §3.2's
>   _one function, two readers_ shipped as a mechanism rather than a preference:
>   the drawn sentence and the spoken one are one string, and a second copy fails
>   the build. It generalises past provenance — every surface this product gives a
>   screen reader has a visible twin — and it is the concrete form of §2's _return
>   a structure, not a sentence_ rather than a separate idea. Fold them into one
>   paragraph.
> - **One more thing ships open, and it has an owner already.**
>   `No shares changed hands anywhere in the window.` is the only shipped sentence
>   claiming something about **the market** rather than about our store. True
>   while every bar is the consolidated tape; a single venue's silence the moment
>   Epic 3 stitches an IEX tail. **Owner: Epic 3**, alongside the two-feed ledger,
>   and carried in [`docs/GAPS.md`](../../../docs/GAPS.md) since 2026-09-15. It is
>   listed below.
> - **A live claim in this file was already corrected**: `docs/GAPS.md`'s
>   invariant table read _seven_ while the list had been eight since 2026-09-14.
>   Fixed 2026-09-15, and it is worth one sentence in the close as an instance of
>   this document's own failure mode — a number in prose beside a list that moves.

## Objective

Close Story 2.14 and close Epic 2: take the cost figure with a database
running, write the ADR this story's **own** decisions need, sweep every document
that now describes a tree that has changed, apply the four design tests, and
state in writing what ships **open and with an owner** rather than quietly.

## What the user can see when this lands

**Nothing new on screen.** What changes is that the epic is finished and its
record is true. Say "nothing visible" plainly, and name what the user still
cannot do: **watch a price move.** There is no live data; that is Epic 3.

## What is already decided and must not be re-taken

- **The six ADRs this story's scope bullet lists already exist**, written at each
  story's own close: 0014 (the database), 0015 (migrations), 0018 (the provider
  and provenance), 0020 (the storage model), 0023 (frontend state), 0027 and
  0028 (charting). Plus 0016, 0017, 0019, 0021, 0024 and 0026, which the bullet
  does not name. **Reading acceptance criterion 7 as a backlog produces six
  duplicates.** What it actually owes is the ADR for _this_ story's decisions
  and a check that the index is complete.
- **ADRs are never renumbered and their decisions are never rewritten.** A
  present-tense description that has become false gets a **dated amendment**
  beside it.
- **An applied migration is immutable**, comments included. Applied migrations
  therefore contain historical claims that are wrong today, and that is the
  correct state — the sweep does not touch them.
- **Story files record what was true when they were written.** Amend live
  claims; leave historical records standing. A sentence duplicated for legibility
  is counted with a grep before it is corrected.

## Work

- **The ADR this story owes.** One ADR for the decisions Task 2.14.1 took — the
  obvious subject being **what a series says when its sources disagree about
  feed**, which is a wording rule with a mechanism behind it and which Epic 3 is
  the first thing to exercise. Fold in whichever of 2.14.1's other five decisions
  are load-bearing. ~~the wire-level empty distinction is the candidate~~ —
  **decision 6 kept it off the wire** (§6.2), so the candidate is now the shape of
  the refusal: a distinction worth drawing, drawn from a response the screen
  already holds, with the condition that would put it on the wire after all. Two
  others earn their place: §1.3's _the note states what the chrome cannot_, which
  is the rule that will govern every provenance surface Epics 3 and 8 add; and
  §0.1's _a claim about data requires data_, which is one line and governs three
  decisions. **Both are carried in their amended forms and not as first
  written** (2026-09-14): §1.3's operative rule is _suppression requires a
  positive match_, and its interesting property is that the duplication it exists
  to prevent became **structural** — the note's condition for naming a feed is
  the negation of the chrome's for claiming one, so the two cannot print the same
  fact; and §0.1 is applied **per clause**, which is what lets a zero-bar page
  carry one true line rather than none. A third candidate worth a paragraph is
  §2's _return a structure, not a sentence_, which is what stops the visible
  claim and the spoken one drifting and is the pattern every later provenance
  surface should copy. Then read `docs/adr/README.md` and confirm the index covers every ADR
  through this one — the index is a current index, not an append log.
- **The cost figure, re-taken with the database running**, against the $20
  budget and its alerts (acceptance criterion 6). The free-offer clock started at
  signup — the subscription's first resource is stamped `2026-09-03T05:32:32Z` —
  so record **how much of the twelve months is spent** alongside the monthly
  figure, because that is the number that decides anything. `HOSTING.md` is the
  home, and the B1MS tier and the networking mode are the two irreversible
  choices the figure should be read against. **Market data is free** — Alpaca
  costs quota, not cash; do not report a provider request as a cost.
- **The must-not-ship fixture sweep, against the deploy build.** The list grew by
  five in Story 2.13 — `dense`, `uncovered`, `holiday-week` (**357 kB**, now the
  largest), `daily` and `daily-year` — each with its own distinctive grep. All
  seven were re-run green at Story 2.13's close against a freshly built `dist/`.
  **They have never been run against the _deploy_ build**, which is a different
  invocation on a different machine, and this story is the one that touches the
  deploy. Run them there.
- **The document sweep, and §8 hands it a list rather than a search.** Two halves,
  and they are different jobs:
  - **The upward half is already a pass.** §8.2 grepped every Markdown file in
    the tree for `IEX`: `CLAUDE.md` invariant 6, `PRODUCT_SPEC.md` §7.1,
    `README.md`, `UNIVERSE.md` (superseded in place by its own §16.6) and
    `EPIC.md` are all already correct about the asymmetry. **Confirm rather than
    repair**, and record that it was a pass — this epic's history contains a day
    on which two documents recorded a spec claim as false while five others went
    on asserting it, and the difference between _swept_ and _was already clean_ is
    worth one sentence.
  - **The forward half is real.** `CLAUDE.md` and `README.md` reflect what
    actually landed (criterion 7): the current-state section, the "what a user can
    see today" section, the open items, the epic status. `EPIC.md` gains its
    close. And **this story's own STORY.md contains the inverted premise**, struck
    through in two places — §8.1 is explicit that **the struck-through prose is a
    historical record and needs no correction**; what needs amending is the
    `Status`, the _What the user can see_ section and the acceptance criteria.
- ~~**Acceptance criterion 2 must not be signed off as written** (§8.1). Record
  how it was actually discharged — coverage claimed wrongly in **either**
  direction — so a future reader does not find an unmet criterion where there is
  a corrected one.~~ **Done 2026-09-15 by Task 2.14.5**, and the bullet is struck
  rather than deleted because the reasoning behind it is what makes the record
  readable. §11 is the pass, §11.1 the reading, and `STORY.md` carries it beside
  the criterion. **What remains here is one check**: that §11.3 gained a row for
  each user-facing string Tasks 2.14.6 and 2.14.7 added after the pass ran. A
  pass with a hole the size of the two newest sentences is the failure this
  criterion is most likely to be signed off with.
- **Acceptance criterion 1 needs its reading recorded too** (§1.2). _"without
  hovering"_ is met by the masthead plus `SourceNote`; it is **not** met by a mark
  inside the plot frame, and that is a decision with an argument rather than an
  omission. State it, or a future reader calls the criterion unmet.
- **The four design tests, applied to a screenshot of what this story built**,
  in writing: real funded product; designed rather than defaulted; a moment worth
  showing somebody; **does it feel alive**. That fourth has been answered _"not
  yet"_ **four** times — Task 2.4.4, Story 2.12's close, Task 2.13.2 and Story
  2.13's close — each correctly and for the same reason: the hard version of the
  question is what happens when a **price** changes, and there are no live
  prices. If it is deferred again here, **write the number five**, and note that
  its trigger is the calendar rather than a condition, which is precisely why it
  needs writing down: nothing fires.
- **State what ships open, with owners.** Neither is this story's work and both
  are the close's to record honestly — _"nobody checked"_ and _"it was checked
  and it was fine"_ are different artefacts and only one is worth anything to
  Epic 11:
  - **The listening pass.** Whether a polite live region changing every 477 ms
    **queues or replaces** is a property of a specific screen reader on a
    specific platform — not readable from the DOM, a timing, or by an agent. The
    repair is designed and unshipped: split the sentence, do not raise the floor.
    **Owner: a person with a screen reader, before Epic 11 hands this surface to
    a model.**
  - **The weekday `1D` photograph.** Narrower since 2026-09-14 — a named window
    now ends at the last session whose bell has rung, so the photograph that
    cannot be taken is only the one between the bell and that night's backfill.
    **Owner: the next person to open `/securities/NVDA?sessions=1` on the
    deployed site during market hours.**
  - **The two-feed ledger, which is correct and unproducible.** The sentence
    invariant 6 exists for — each stretch, in contribution order, with its bar
    count — is reached only through `twoFeedStitchView()`, the recorded stitch
    with one field changed, because every recorded body carries `sip` and no
    shipped endpoint produces two feeds. **Owner: Epic 3**, whose IEX socket is
    the first thing that can record a real one; the function is named and
    commented so that deleting it and pointing its three readers at a fixture is
    the obvious move. Carried in `docs/GAPS.md` since 2026-09-14.
  - **The one sentence that claims something about the market.**
    `No shares changed hands anywhere in the window.` is true while every stored
    bar is the consolidated tape and becomes a single venue's silence reported as
    the whole market's the first time a live tail is stitched on — the failure
    `PRODUCT_SPEC.md` §7.1 forbids, in the one place a reader would never look for
    it. It also has **two homes** today, drawn and spoken, and nothing guards
    them. **Owner: Epic 3**, beside the two-feed ledger. `PROVENANCE.md` §11.3 and
    `docs/GAPS.md`.
  - Plus whatever Task 2.14.8 deferred, and the `synthetic` branch that no
    recorded body exercises.
- **Hand Epic 3 what it inherits**, in one paragraph in `EPIC.md`: the
  provenance pattern extends from _which feed_ to _which feed, and is it still
  connected_; `FeedIndicator` has read `disconnected` throughout this epic
  deliberately and correctly and Epic 3 is what makes it true; and the two-feed
  sentence this story wrote is the first thing Epic 3's socket will produce.
- **Then the gates.** `pnpm verify`, `pnpm e2e`, `pnpm e2e:deployed`, and
  `pnpm test:database` — the last is not in `verify` and this epic is the one
  that added every database test in the tree.

## Done when

- Acceptance criteria 1–8 are each addressed by name, with what discharged them
  — criteria 1 and 2 including the reading they were discharged under, because
  both are met in a form other than the one they are written in. **Criterion 2 is
  already discharged** (§11); what this close owes it is the check that the pass
  covers the strings added after it ran.
- The story's ADR is written and `docs/adr/README.md` indexes it.
- The cost figure is in `HOSTING.md`, dated, with the offer's remaining months.
- All seven fixture greps were run against the **deploy** build and found
  nothing.
- `CLAUDE.md`, `README.md`, `EPIC.md`, `STORY.md` and `docs/GAPS.md` describe the
  tree that exists; `pnpm links` and `pnpm invariants` pass.
- The four tests are applied in writing and test 4 carries a count.
- Everything shipping open is named with an owner.
- `pnpm verify`, both browser suites and `pnpm test:database` are green.

## Notes

Do not idle while the suites run — write the record, amend the documents,
prepare the commit. And do the document sweep with greps rather than from
memory: this epic's own history contains a day on which two documents recorded
that a spec claim was false while the spec, the README, two ADRs and an
invariant went on asserting it.
