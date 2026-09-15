# Task 2.14.10 — The epic close: the cost, the ADR, the sweep, and what ships open

**Status:** **Complete — 2026-09-15.** It closes Story 2.14 and Epic 2.
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

> **Amended 2026-09-15 by Task 2.14.6. One item is discharged, one subject is
> confirmed for the ADR, and two entries are owed to the close's own reading of
> `docs/GAPS.md`.**
>
> - **Half of the criterion-2 confirmation above is done.** 2.14.5's amendment
>   asks that the pass cover the strings Tasks 2.14.6 and 2.14.7 add _after_ it.
>   2.14.6 added its own two rows to [`PROVENANCE.md`](PROVENANCE.md) §11.3 — the
>   four drawn vacancy sentences, and their spoken twins read separately — each
>   judged in §11.1's two directions. **Only 2.14.7's strings are still owed.**
> - **The ADR's §6 subject is confirmed rather than changed**, and it is now a
>   built decision rather than a refusal: the distinction is derived on the client
>   from `SecuritiesResponse.coverage`, the bars wire is unchanged, and the
>   reversal trigger — _the first consumer of `GET /market-data/bars` that does
>   not also hold the tracked universe_ — is recorded in three places
>   (`PROVENANCE.md` §6.2, `MARKET-DATA-API.md` §6, and beside the route's own
>   debug line). The ADR should carry the **general** form, because it is the
>   rule and not the instance: **a surface may make the confident claim only when
>   the thing that would license it has actually been read** — the degradation
>   rule, which is why `StoredHistory` has three members and not two.
> - **Two new `GAPS.md` entries to read at the close**, both about the empty
>   page: the coverage array's `1m`-only shape against a daily-timeframe empty,
>   and that nothing holds a drawn sentence and its spoken twin to the same
>   _answer_. Neither can be made mechanical today; both name a re-measure that
>   resolves.
> - **And one figure to check, not cite:** `docs/GAPS.md`'s break table gained
>   three rows for **one** invariant, because a break proves one substitution and
>   not a loop. The table is the count, and that sentence has been wrong once.

> **Amended 2026-09-15 by Task 2.14.7. One owed item is discharged, the ADR
> gains a fifth subject, and three things join the list that ships open.**
>
> - **Acceptance criterion 2 is now wholly done, and this close owes it nothing.**
>   2.14.5's amendment asked that the pass cover the strings 2.14.6 and 2.14.7 add
>   after it; 2.14.6 added its rows and 2.14.7 has added its two —
>   [`PROVENANCE.md`](PROVENANCE.md) §11.3, closed with a dated note. **Do not go
>   looking for 2.14.7's strings; check the note is there and move on.**
>   One of them taught the table something general and the note records it: **a
>   deferral claims nothing in either direction, and what to check instead is
>   that it does not quietly imply what it is deferring about.** Epic 3 ships at
>   least one more of those.
> - **A fifth ADR subject, and it is the one with the longest reach after the
>   degradation rule.** `VISUAL-LANGUAGE.md` now carries _a surface that owns
>   nothing defers_, and it generalises the grain rule from **sentences** to
>   **surfaces and controls**: the surface that owns the data owns the account of
>   it, everything else points once and stops; a region whose subject is missing
>   says something or defers, and **never nothing**; and a deferral is spoken
>   where an answer is not, because the test is whether a spoken twin already
>   exists. Two surfaces shipped that shape before it was a rule — search
>   deferring to the tracked universe, and the volume plot deferring to the Price
>   region — which is the usual sign that it is one. Fold it into the paragraph
>   with §3.2's _one function, two readers_: both are the same instinct, that one
>   fact has one home.
> - **Three more things ship open, all recorded in
>   [`docs/GAPS.md`](../../../docs/GAPS.md) with a re-measure, and all found by a
>   person looking at a screen.** They belong in the close's list rather than
>   being left in the gaps file alone, because two of them have owners outside
>   this epic:
>   - **That every named region on a screen says something when its subject is
>     missing.** No general check exists: a region whose content is legitimately
>     conditional looks identical to one whose content silently disappeared. One
>     screen is covered by one browser test. **Owner: the next story that adds a
>     region.**
>   - **The defaulted note invites a reader to use a control that has just said
>     it is unavailable** — _Search for another one above_ under search's own
>     _Nothing to search yet_. Half the sentence is still true. **Trigger: the
>     second sentence in the product that points at another surface's control.**
>   - **The masthead's primary navigation is clipped at 390**, reading
>     `Market O` with no affordance saying so. Outside this epic's surface — it
>     is the chrome — and in every screenshot 2.14.7 took. **Owner: the first
>     story that touches `AppHeader`.**
> - **And the invariant-count instance has a second occurrence, which makes it a
>   pattern worth one sentence rather than an anecdote.** 2.14.5's amendment
>   records `docs/GAPS.md`'s table reading _seven_ against a list of eight.
>   2.14.7 found `CLAUDE.md`'s **command block** reading _seven_ against a list of
>   **ten**, in a different file, about the same list. Two independent copies of
>   one count, both stale, neither checked by anything — and the close should say
>   that rather than fix it twice and forget. `pnpm invariants` printing its own
>   count on every run is what makes the prose copies removable; the sentence to
>   consider is whether either copy needs a number at all.

> **Amended 2026-09-15 by Task 2.14.8. One placeholder below is answered, the ADR
> gains a bullet, the sweep gains four confirmations rather than repairs, and the
> close now hands something onward to a _second_ epic.**
>
> - **The placeholder is gone.** _"Plus whatever Task 2.14.8 deferred"_ is edited
>   in place below. The answer is §28's cold-load breach, and the entry's shape
>   matters: **it is a hand-off with a named owner, not a deferral.** Epic 14
>   owns it, beside the `Expand all` exception that is the same component and
>   probably the same repair, and the trigger is kept **above** the epic.
> - **Say "handed" rather than "accepted", and never "amended".** §28's target is
>   unchanged and is right. What it gained is a dated amendment **naming the two
>   exceptions** — the opposite move from watering a target down, and the close
>   will read as the wrong thing if it is summarised carelessly.
> - **The sweep is four confirmations, not four repairs.** `CLAUDE.md` (the open
>   item moved from _open_ to _owned_), `docs/GAPS.md`, `PRODUCT_SPEC.md` §28 and
>   `planning/EPICS.md` were all edited by 2.14.8 itself. **Confirm they still say
>   it, and confirm they agree with each other** — this close's own note warns
>   that this epic contains a day on which two documents recorded a claim as false
>   while five others went on asserting it, and a figure now living in six places
>   is exactly that shape.
> - **The close hands onward to two epics, not one.** The existing bullet hands
>   Epic 3 what it inherits. There is now a second: **Epic 14** carries the two
>   §28 exceptions in its own `EPIC.md`, and **Epic 5** carries the trigger in
>   its own, because Epic 5's anomaly-score-per-security is the named candidate
>   for firing it and a trigger nobody reads at the moment it fires never fires.
>   Confirm all three landed; do not write a fourth copy.
> - **`Expand all` is the one to re-read while writing this.** It was accepted in
>   Story 2.11 as _neither new nor routine_ — and the "not new" half of that
>   argument is the cold-load breach, which is now owned rather than accepted. The
>   two entries are joined in Epic 14's `EPIC.md` for that reason, and the close
>   should not restate either as though it stood alone.

> **Amended 2026-09-15 by Task 2.14.9. Two criteria are discharged, a third
> needs a recorded reading the way criterion 2 did, the sweep gains two files and
> the §28 hand-off gains a deployed figure.**
>
> - **Acceptance criteria 4 and 5 are discharged, and this close owes them a
>   record rather than a repeat.** The exit criterion was executed deployed by a
>   person at 1440, 1024 and 390, with the store's freshness read **first** —
>   `GET /diagnostics/freshness`, zero sessions behind on both timeframes, all
>   518 securities — and `specs-deployed/security-explorer-journey.spec.ts` now
>   asserts that journey on every deploy. The deployed suite is **four files and
>   18 tests**, green twice at 30.3 s and 31.0 s. **Do not re-walk it**; the
>   figures, the three-viewport table and the two instrument findings are in
>   [2.14.9](TASK-09-the-deployed-suite-asserts-the-exit-criterion.md) §§1–2.
> - **Acceptance criterion 3 has criterion 2's problem and needs the same
>   treatment.** It reads _every failure and partial state in the epic renders
>   locally **and deployed**_. The local half is done — 2.14.7 produced the set.
>   **The deployed half cannot be discharged as written, and that is structural
>   rather than an omission.** A healthy deployment produces none of those
>   states: the coverage sentence renders only under `partial`, both vacancy
>   sentences only where something is missing, the volume deferral only under
>   `refused` or `failed` — and the deployed suite deliberately **never
>   intercepts a route**, because everything it asserts is about a real
>   environment being really correct. So the honest reading is _every failure and
>   partial state renders locally, and the deployed environment is asserted to be
>   in **none** of them_, which is a stronger claim about a production site than
>   the criterion asks for. **Record the reading beside the criterion in
>   `STORY.md`**, as §11.1 did for criterion 2; a future reader otherwise finds an
>   unmet criterion where there is a corrected one.
> - **The sweep gains two files, as confirmations.**
>   [`e2e/README.md`](../../../e2e/README.md) and
>   [`docs/GAPS.md`](../../../docs/GAPS.md) both carried the live claim _the
>   deployed suite is three files and 16 tests and none of them drives Story
>   2.13_. Both were amended by 2.14.9 rather than rewritten — the gap **narrows
>   rather than closes**, and for a sharper reason than before. Confirm they still
>   say it and that they agree with each other.
> - **And that is a third instance of this close's own pattern**, which makes it
>   worth the sentence 2.14.7 asked for rather than an anecdote. 2.14.5 found
>   `docs/GAPS.md`'s invariant table reading _seven_ against a list of eight;
>   2.14.7 found `CLAUDE.md`'s command block reading _seven_ against a list of
>   **ten**; 2.14.9 found one claim about the deployed suite's contents, stale in
>   **two** files at once. Three occurrences, one shape: **a count or an inventory
>   copied into prose beside a list that moves, checked by nothing.** The close
>   should say the shape, not fix the third one and forget.
> - **The §28 hand-off gains its deployed figure, which 2.14.8 asked for by
>   name.** That task's inoculation said the one new thing worth recording would
>   be the breach behaving differently on the deployed host, because none of the
>   three measurements was taken over a network against the real store. It does:
>   **52–54 ms on two of six cold loads at 1440**, three per route — the bottom of
>   the measured 50–76 ms band, and **intermittent** where locally it is every
>   cold load. The plausible reading is that an internet round trip spreads the
>   same work across more frames. **Carry it into Epic 14's `EPIC.md` beside the
>   local figures**; it is a reason the deployed number is softer, never a reason
>   to think the repair is less needed. No timing assertion was added to
>   `specs-deployed/`, deliberately.
> - **One candidate for the ADR, and it is one sentence rather than a subject.**
>   §0.1's _a claim about data requires data_ turns out to govern **assertions**
>   as well as renderings, and in both directions: a deployed spec may assert only
>   what the environment it runs against can actually produce, so a state that
>   renders when something is wrong is unassertable on a healthy site exactly as a
>   state that renders when data is present is unassertable on an empty store. It
>   is the same rule pointed at a test rather than at a screen, and it is why the
>   deployed journey asserts structure and no figure.

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
  surface should copy. **And one short bullet that is not a subject but belongs in the same
  ADR** (added 2026-09-15 by Task 2.14.8): **this epic ships a measured exception
  to `PRODUCT_SPEC.md` §28 and it is owned rather than accepted.** ADR 0024
  carries `Expand all`'s exception as exactly such a bullet, for the same
  component, which is the precedent to copy — an ADR that records a decision
  about a screen and omits the one published target that screen misses is the
  kind of omission a reader finds later and distrusts the whole document for.
  One bullet: the figure, that it was measured three times and attributed from
  both ends, the owner, and the trigger. Then read `docs/adr/README.md` and
  confirm the index covers every ADR
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
  - ~~Plus whatever Task 2.14.8 deferred~~ — **answered 2026-09-15, and it is a
    hand-off rather than a deferral, which is a different entry in this list.**
    §28's breach on `/securities` and `/securities/:symbol` — one cold-load task
    of **50–76 ms**, the 518-row universe table rather than the chart, measured
    three times and attributed from both ends each time — is handed to **Epic
    14** by name, beside the `Expand all` exception (69–87 ms) that is the same
    component and probably the same repair. **The trigger is kept above the
    epic**: _the first time a second surface on that page renders per-row markup
    at universe scale_, which is why Epic 5's `EPIC.md` now carries it too.
    §28's **target is not amended** and must not be described as amended in the
    close — it gained a dated amendment **naming the two exceptions**, which is
    the opposite move. `SEARCH-AND-SELECTION.md` §10 holds all three datings and
    the argument.
  - **Three states a healthy deployment structurally cannot show, recorded so
    their absence is not later read as a missing check** (2026-09-15, Task
    2.14.9). The coverage sentence, both vacancy sentences and the volume plot's
    deferral all render only when something is less than perfect, and the
    deployed store is backfilled nightly. This is not owed to anybody and needs
    no repair — it is the reason the deployed journey asserts structure and no
    figure, and the reason a spec asserting any of them would be red exactly when
    the store is healthiest. `e2e/README.md`'s post-deploy section and
    `docs/GAPS.md` both carry it.
  - Plus the `synthetic` branch that no recorded body exercises.
- **Hand Epic 3 what it inherits**, in one paragraph in `EPIC.md`: the
  provenance pattern extends from _which feed_ to _which feed, and is it still
  connected_; `FeedIndicator` has read `disconnected` throughout this epic
  deliberately and correctly and Epic 3 is what makes it true; and the two-feed
  sentence this story wrote is the first thing Epic 3's socket will produce.
- **Then the gates.** `pnpm verify`, `pnpm e2e`, `pnpm e2e:deployed`, and
  `pnpm test:database` — the last is not in `verify` and this epic is the one
  that added every database test in the tree. **`pnpm e2e:deployed` means more
  than it did when this bullet was written** (2026-09-15): it is four files and
  18 tests, and one of them walks the epic's exit criterion. Read
  `GET /diagnostics/freshness` before believing anything it says about a
  coverage state — a current store cannot produce one.

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

---

# What this task did — 2026-09-15

## 1. Acceptance criteria 1–8, each by name

| #   | Criterion                                                                                | Discharged by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A user looking at any market number can see which feed it came from, without hovering    | **Met, under a reading now recorded in `STORY.md` beside the criterion.** The chrome plus `SourceNote`; **not** a mark inside the plot frame, which is a decision with an argument (§1.2) rather than an omission. Verified live at 1440 on the running pair: the chrome reads `MARKET FEED — NOT CONFIGURED` and the note's `SOURCE` row reads `All US exchanges` — §1.3's second condition firing on the default deployment, which is the case the original table said could not happen                                                      |
| 2   | No screen states or implies full US-market coverage                                      | **Met, under §11.1's reading — _coverage claimed wrongly in either direction_.** `PROVENANCE.md` §11 is the pass as a list: §11.2 how the corpus was enumerated, §11.3 every surface with its judgement, §11.4 what became mechanical, §11.5 what could not. **The one check this close owed was the hole**: that §11.3 gained rows for the strings 2.14.6 and 2.14.7 added _after_ the pass ran. It did — four drawn vacancy sentences and their spoken twins (2.14.6), two more (2.14.7) — closed with a dated note. The pass was not re-run |
| 3   | Every failure and partial state renders locally **and deployed**, no global error screen | **Met under a corrected reading, now recorded in `STORY.md`.** Local half: Task 2.14.7's set (§12). Deployed half is **structurally undischargeable as written** — a healthy deployment produces none of those states — so the honest claim is the stronger one: the deployed environment is asserted to be in **none** of them                                                                                                                                                                                                                |
| 4   | The exit criterion executed in the deployed environment                                  | **Met by Task 2.14.9**, walked by a person at 1440, 1024 and 390 with the store's freshness read first (`GET /diagnostics/freshness`: zero sessions behind on both timeframes, all 518 securities). **Not re-walked here**                                                                                                                                                                                                                                                                                                                     |
| 5   | That journey asserted by the deployed suite; the local suite covers the failure states   | **Met by Task 2.14.9.** `specs-deployed/security-explorer-journey.spec.ts`; the deployed suite is four files and 18 tests                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6   | The cost figure re-taken with the database running                                       | **Done here** — §2 below, and `HOSTING.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | The ADRs written; `CLAUDE.md` and `README.md` reflect what landed                        | **Done here** — **ADR 0029**, §3; the sweep, §4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 8   | `pnpm verify` passes and both browser suites pass — **all four green**                   | **Done here** — §7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**The first half of criterion 7 was stale when written and reading it as a
backlog would have produced six duplicate ADRs.** All six ADRs its scope bullet
names already exist, written at each story's own close, plus six it does not
name. What it owed was **one** ADR for this story's own decisions, and a check
that the index is current: `docs/adr/README.md` now holds **29 rows against 29
files**.

## 2. The cost figure, and the question that was never unanswerable

Read from `Microsoft.CostManagement/query`, `ActualCost`, grouped by
`ServiceName`, over **seven full days** (2026-09-07 → 2026-09-13) because a
month-to-date figure over a partial month is not a rate. Full table and
arithmetic in `HOSTING.md`.

- **`$7.57`/month at the measured rate** — Container Registry `$5.07` (67%),
  Container Apps `$2.50` (33%), **database `$0.00`**, Monitor and Log Analytics
  `$0.00`. **38% of the `$20` budget**, no alert fired, `currentSpend` `$2.6763`
  month-to-date.
- **All three of Task 2.1.1's falsifiable predictions hold**, and the third is
  conservative: the predicted band was `$9.21`–`$19.04` and the measured rate is
  **below the bottom of it**. The gap is entirely Container Apps — `$4.21`
  predicted, `$2.50` measured. The registry matched its prediction almost to the
  cent.
- **Task 1.11.3's finding is confirmed and has got worse.** The registry was 54%
  of the bill; it is now **67%**, not because it moved but because the compute it
  serves costs less than predicted. The reversal trigger is unchanged — the bill
  mattering — and GHCR is one image reference and one pull secret away.
- **The free offer is 12 days spent and ~11.6 months remaining**, expiring around
  2027-09-03. The database contributed `$0.00` through a 48-million-bar backfill,
  which is the load it was most likely to break under. At expiry `$16.09`/month
  arrives on one day and takes the total to **`$23.66`** — over budget, with no
  code change and no traffic change.
- **Market data is free.** Alpaca costs quota, not cash. No provider request
  appears on this bill in any month.

**And the cost question that was refused four times was never unanswerable — it
was being asked through the wrong API.** `az consumption usage list` now returns
**81 records** naming all seven billable products including the database, with
**every one carrying `pretaxCost: 'None'`** — so that instrument is genuinely
unusable and is the fourth distinct shape of its refusal. The Cost Management
query endpoint is not refusing; it is **rate-limiting**: `429` on the first two
attempts and a full answer on the third, behind a twenty-second retry loop. Four
tasks recorded a refusal that was a missing retry. `HOSTING.md`'s historical
record is amended in place with a dated pointer rather than rewritten.

## 3. The ADR

**[ADR 0029](../../../docs/adr/0029-provenance-on-screen-the-partial-states-and-what-an-honest-empty-answer-certifies.md)
— Provenance on screen, the partial states, and what an honest empty answer
certifies.** Eight decisions, folded as the amendments to this task asked:

1. **A claim about data requires data, applied per clause** (§0.1 and its
   2026-09-14 amendment) — and, since 2.14.9, governing **assertions** as well as
   renderings, in both directions. One sentence, three decisions, and the reason
   a deployed spec asserts structure and no figure.
2. **The note states what the chrome cannot**, carried in its amended form:
   the operative rule is _suppression requires a positive match_, and the
   duplication it exists to prevent became **structural** — the two conditions
   are negations of each other.
3. **The stitched-series ledger** — each stretch, in contribution order, with its
   bar count, never sorted and never deduplicated to the first — with the
   non-contiguity reversal trigger and the store defect that is Epic 3's.
4. **Return a structure, not a sentence**, folded into **one paragraph** with
   §3.2's _one function, two readers_ and `VISUAL-LANGUAGE.md`'s _a surface that
   owns nothing defers_, exactly as 2.14.5 and 2.14.7 asked. All three are one
   instinct: **one fact has one home.**
5. **The coverage sentence bound to `partial`**, with the full instants and the
   reason the canvas's short form was wrong.
6. **The adjustment is one value per series and unrepresentable per source.**
7. **The two empty answers, told apart on the screen and not on the wire** — and
   the general form, which is the half with reach: **a surface may make the
   confident claim only when the thing that would license it has actually been
   read**, which is why `StoredHistory` has three members.
8. **One bullet, not a subject: the measured §28 exception, owned rather than
   accepted**, copying ADR 0024's precedent for the same component. The figure,
   that it was measured three times and attributed from both ends, the owner, and
   the trigger. **§28's target is not amended** and the ADR says so in those
   words.

## 4. The document sweep, done with greps rather than from memory

**The upward half is a pass, and recording that it was a pass is the point.**
§8.2's `IEX` grep over every Markdown file in the tree was re-confirmed:
`CLAUDE.md` invariant 6, `PRODUCT_SPEC.md` §7.1, `README.md`, `UNIVERSE.md`
§16.6 and `EPIC.md` are all correct about the asymmetry, and Story 2.3's task
files are historical records left standing. **The difference between _swept_ and
_was already clean_ is worth the sentence**, because this epic contains a day on
which two documents recorded a spec claim as false while five others went on
asserting it.

**2.14.8's four confirmations all hold and they agree with each other.**
`PRODUCT_SPEC.md` §28 carries its dated amendment naming both exceptions and
stating the target is unchanged; Epic 14's `EPIC.md` holds the figures, the three
candidate repairs and the re-measure; Epic 5's `EPIC.md` holds the trigger;
`CLAUDE.md` reads **owned** rather than open. A figure now living in six places
is exactly the shape this close warns about, and they were compared rather than
assumed.

**2.14.9's two confirmations hold**: `e2e/README.md` and `docs/GAPS.md` both
carry the deployed suite's amended contents, and they agree.

**The forward half, and what changed:**

- **`CLAUDE.md`** — Epic 2 is **complete, 14 stories**; the _what a user can see_
  section gains the note, the coverage sentence and the two empty answers; the
  settled list gains ADR 0029's four rules; the open list gains the two Epic 3
  sentences, the region gap, the search note and the 390 masthead clip; the
  design-test count is corrected to **seven**; `PROVENANCE.md` joins _Where the
  record lives_.
- **`README.md`** — the shell paragraph and the `/securities/:symbol` row, which
  still described a price chart alone with six unfilled regions.
- **`EPIC.md`** — the status line and a close: what Epic 3 inherits, what ships
  open with owners, what the epic cost, and the one pattern found three times.
- **`STORY.md`** — the `Status`, a _what landed_ section in the words of what is
  on the screen, and **the readings for criteria 1 and 3** beside the criteria
  themselves, as §11.1 did for criterion 2. The struck-through prose is left
  alone: it is the record of what was planned.
- **`docs/adr/README.md`** — ADR 0029 indexed; 29 rows against 29 files.
- **`HOSTING.md`** — the cost figure, and the dated amendment on the refusal.
- **Epic 14's `EPIC.md`** — the **deployed** §28 figure, which 2.14.8 asked for
  by name and 2.14.9 measured: 52–54 ms on two of six cold loads at 1440,
  intermittent where locally it is every cold load.

**Two prose counts were removed rather than corrected.** `CLAUDE.md`'s command
block said _twelve claims_ and its record table said _a current index of ADRs
0001–0028_. Both were correct at the moment of reading and both are the shape
that has already gone stale twice. `pnpm invariants` prints its own count; the
ADR index is a current index. **Where a document must carry a number, the list
itself is the count** — which is what `docs/GAPS.md` already says in those words.

**And that pattern now has three occurrences, which is why it is stated as a
shape rather than fixed a third time.** `docs/GAPS.md`'s invariant table read
_seven_ against a list of eight (found 2.14.5); `CLAUDE.md`'s command block read
_seven_ against a list of **ten** (found 2.14.7); one claim about the deployed
suite's contents was stale in **two files at once** (found 2.14.9). A count or an
inventory copied into prose beside a list that moves, checked by nothing. **This
task file was a fourth occurrence**: its own amendments said test 4 had been
deferred _four_ times while `PROVENANCE.md` §12.6 had already recorded the
**sixth**.

## 5. The must-not-ship fixture sweep, against the deploy build

**Run where they had never been run.** All seven bodies are now `pnpm
invariants` entries rather than prose greps, but the invocation was the point:
they had only ever been checked against a developer's `pnpm build`. The deploy
build differs by exactly one thing — `deploy.yml` builds nothing of its own and
sets `VITE_API_BASE_URL` — so it was reproduced:

```
VITE_API_BASE_URL=https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io pnpm build
pnpm invariants
```

**Clean.** `12 invariants hold`, which includes `fixture-in-the-bundle` over all
seven distinctive strings — `holiday-week.json` (357 kB, the largest, and the one
no store could answer because the week has not happened), the recorded universe
(190,736 B), `dense.json` (221,603 B), `uncovered.json` (146,807 B),
`daily.json`, `daily-year.json` (the only string reaching into 2025), and the
bars body. Nothing found.

## 6. The four design tests, applied to what this story built

Applied to two captures taken on the running pair at 1440 on 2026-09-15: the
Price region carrying a live **partial** answer, and the foot of the Explorer
carrying the source note.

**1. Would a stranger believe this is a real funded product? Yes**, and the
reason is specific to this story rather than inherited. The note reads
`SOURCE / PRICES / CLASSIFICATION` in three labelled rows of micro type, with
`Unadjusted` and `curated` picked out and the qualifying sentence beneath in
lighter ink. That is the register of a terminal's footnote, not a caption — and
the thing a stranger actually reacts to is that the product volunteers _Prices as
they printed. Not restated for stock splits._ when nothing forced it to. Products
that are not real do not disclose.

**2. Does it look designed rather than defaulted? Yes**, and the evidence is what
is **absent**. There is **one** note for the whole screen, at the foot, in one
type size — not a caption under each plot, not a tooltip, not a badge. Five
correct additions made one at a time would have produced three of each, and the
reason they did not is that Task 2.14.2 drew the whole surface on a canvas before
any of it was a component.

**3. Is there a moment worth showing somebody? Yes, and it is the coverage
sentence.** On the capture the Price rail reads _Holding 1,560 bars, through
2026-09-11 16:00:00 EDT, of a window running to 2026-09-14 16:00:00 EDT_ against
a chart whose uncovered ground stops at the same instant. A product that answers
_here is what I have and here is what you asked for_, in full instants, beside a
picture that agrees with it, is the moment. The short form the canvas drew would
have rendered that same state as _"through 16:00, of a window running to 16:00"_
— a sentence saying a window was missed by nothing at all.

**4. Does it feel alive? No — and this is the SEVENTH time.** Not the fifth this
task file predicted: Tasks 2.4.4, Story 2.12's close, Task 2.13.2, Story 2.13's
close, Task 2.14.2 and `PROVENANCE.md` §12.6 are six, and this is seven.

**Seven deferrals of one criterion is not caution; it is the shape of a criterion
that never gets met**, and the reason it needs writing down rather than deferring
again is that **its trigger is the calendar rather than a condition, so nothing
fires.** Each deferral was individually correct and for the same reason: the hard
version of the question is what happens when a **price** changes, and there are
no live prices. This story made it harder rather than easier — everything it
built is a static sentence about a static answer, and a provenance note that
animated would be an alarm. The one moving thing in the epic, the refreshing
hairline, is already the correct exception.

**It is deferred by name to Epic 3's motion vocabulary against real moving
numbers**, and Epic 3's `EPIC.md` is where it now sits. If Epic 3 closes without
answering it, the count is eight and the honest conclusion is that the test needs
replacing rather than deferring.

## 7. The gates

**All four green, 2026-09-15.**

| Gate                 | Result                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify`        | **green.** `311 documents, 1125 cross-file links, 39 anchor links, 0 broken`; `12 invariants hold`                                                                                                           |
| `pnpm e2e`           | **140 passed, 2.8m**                                                                                                                                                                                         |
| `pnpm e2e:deployed`  | **18 passed, 30.9s**, four files — and the store was read **first**: `GET /diagnostics/freshness` reports `1m=0 behind, 1d=0 behind`, so a coverage state was structurally unavailable and none was asserted |
| `pnpm test:database` | **165 tests, 6 files, 4.28s** against a real PostgreSQL server. Not a `verify` step, and this epic added every database test in the tree                                                                     |

`pnpm e2e:deployed` means more than it did when this task was written: **four
files and 18 tests**, one of which walks the epic's exit criterion.
`GET /diagnostics/freshness` is read before believing anything it says about a
coverage state — a current store cannot produce one.
