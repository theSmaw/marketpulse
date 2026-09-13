# Task 2.13.10 — Deployed, the four tests applied, documented, and an ADR

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.9

## Objective

Close the story: verify it **on the deployed site** rather than on a developer's
machine, apply the four design tests to what is actually on screen, finish
`VOLUME-AND-WINDOW.md` as the subject document, and record the decisions as an ADR.

## What the user can see when this lands

**Volume and a window control on the live site**, cold and from a deep link, at three
viewports — and the epic's exit criterion met in substance: search for NVDA, open it,
inspect recent historical **price and volume** over a period of their choosing.

## Work

- **Verify deployed, and note the two stores photograph differently.** The deployed
  store is backfilled nightly and answers the default window in full; a developer's
  answers it four-fifths short. **Both are correct** (`CHARTING.md` §11.3), and the
  deployed environment is the one place the coverage treatment is _not_ under
  observation — so a window that is short deployed is worth finding and showing,
  which a wider window now makes easy.
- **Poll for coherence rather than checking once.** The frontend's upload is not
  atomic: for roughly two seconds around a deploy that changes the artefact a cold
  load can be broken, in two distinct ways, and the window **opens** at the second
  the deploy step reports success.
- **Deep-link the window.** A cold load of a URL carrying a non-default window is the
  one path that exercises the address, the server's resolution and the first paint
  together — and `staticwebapp.config.json` is part of the artefact precisely so that
  works. Remember **three hosts behave differently** for an unmatched path; say which
  one you tested.
- **Apply the four tests to a screenshot of the deployed page**: would a stranger
  believe this is a real funded product; does it look designed rather than defaulted;
  is there a moment in it worth showing somebody; **does it feel alive**. The fourth
  has been answered "not yet, and not from here" **twice**, deferred by name to Epic
  3's motion vocabulary against real moving numbers. This story is the strongest case
  it will get before then, because a window change is a real transition between two
  real datasets — so answer it honestly and, if it is still no, say what would change
  it and who owns that.
- **Finish `VOLUME-AND-WINDOW.md`.** Everything the eight tasks before this found, in
  the shape `CHARTING.md` uses: what was measured, what was rejected, what a green
  check does and does not certify. Include the list **Story 2.14 inherits** in one
  place — the window vocabulary, the timeframe mapping's home, whatever the states
  left unplaced for provenance, and the new fixtures — because §17.5's equivalent
  list is the thing this story found most useful at its own start.
- **Write the ADR.** ADR 0027 is the last one; this is **0028**. Its subject is the
  decisions 2.13.1 and 2.13.2 took that outlive this screen: the window vocabulary
  Epic 8 reuses and Epic 11 pushes through `setTimeWindow`, the timeframe mapping, and
  the shared-axis property. ADRs are never renumbered and their decisions are never
  rewritten; a present-tense description that becomes false gets a dated amendment
  beside it. Update `docs/adr/README.md`'s index in the same change.
- **Sweep upward, and do it here rather than at the epic close.** A measurement that
  falsifies a governing document is swept the same day, and falsification travels
  **upward** — this story's figures touch `CHARTING.md` §16.5's trigger (which fires
  if a window wider than three months at `1d` is offered), `CLAUDE.md`'s gap list,
  `EPIC.md`'s status paragraph and the "What a user can see today" paragraphs in
  `CLAUDE.md`. Amend live claims, leave historical records standing, and grep for a
  sentence duplicated for legibility before correcting it.
- **Add this story's new unchecked claims to `CLAUDE.md`'s gap list**, and make
  mechanical whatever can be: a prose entry with a re-measure command is a check
  nobody runs, and a `verify` step is one that cannot be skipped. `pnpm
coverage:check` is the precedent for that migration. Every entry that stays needs
  its break **performed**, not assumed — a break that does not go red is equally
  evidence the break did not land.
- **Run the gates this change can break**, not only the one a task file names:
  `pnpm verify`, `pnpm e2e` and `pnpm test:database` if anything touched the data
  path, plus `pnpm e2e:deployed`.

## Done when

- Volume and the window control are verified on the deployed site, cold and from a
  deep link, at three viewports
- The four tests are applied to the deployed page and answered in writing, test 4
  included
- `VOLUME-AND-WINDOW.md` is complete, including what Story 2.14 inherits in one place
- ADR 0028 exists, the index lists it, and nothing earlier was renumbered
- Every document this story falsified is amended, dated, with historical records left
  intact
- `CLAUDE.md`'s gap list carries this story's unchecked claims, each with a re-measure
  that was actually performed
- `pnpm verify`, `pnpm e2e` and `pnpm e2e:deployed` pass
- The epic's exit criterion is demonstrated end to end on the deployed site and
  `EPIC.md` says so

## Notes

The fence is Story 2.14. The feed label's wording, a stitched series naming two
sources, the curated file's age, and the epic's formal close are **all** 2.14's. What
this task owes is an accurate statement of what is left.

And the honest caveat, in the shape 2.12.10 used: a green run here certifies the
chain and not coverage, the figures are one machine on one day, and nothing re-takes
them. What is mechanical is said to be mechanical; everything else is prose with a
date on it.

---

## Amended 2026-09-12 by Task 2.13.1 — one conditional sweep is now unconditional

`CHARTING.md` §16.5's reversal trigger is _"the first window control offering a
range wider than three months at `1d`"_, and the sweep bullet above is written as
_"which fires if a window wider than three months at `1d` is offered"_.

**It is offered.** [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §1.2 settled a
1Y window at `1d` — 252 sessions, 17.0 ms per render — so the trigger has fired
and §16.5 needs a dated amendment saying so rather than a re-reading of its
condition. Its 672-session row also becomes a historical figure at this close:
"max" was declined, so no control can reach it.

Two smaller carries for the same sweep:

- **§17.5 item 5's `1d` branches stop being unexecuted** the moment 2.13.6 ships
  a 3M window. Amend that item rather than leaving it as a standing warning.
- **The window vocabulary is the half of this story ADR 0028 exists for.** §4's
  table — the label, the accessible name, the address, the spoken sentence, the
  timeframe and the session count — is what Epic 8 reuses, Epic 11 pushes and
  Epic 13 distinguishes its scrubber from, and §4(b)'s "the address admits any
  count the control does not offer" is the single decision with the longest
  reach in it.

---

## Amended 2026-09-13 by Task 2.13.2 — ADR 0028 gains a subject, and test 4 gains a count

Two carries from [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) Part two.

### ADR 0028's subject is wider than the vocabulary

The Work section scopes it to _"the window vocabulary, the timeframe mapping, and
the shared-axis property"_. §10 added a **rendering** decision that outlives this
screen by at least as far: **the volume mark is one path at every window, and
below a pixel per bar it is one stem per pixel column carrying that column's
maximum.**

That belongs in the ADR rather than only in `CHARTING.md`, because it is the
second statement of ADR 0027's constraint and it generalises it. 0027 says the
chart layer is hand-built SVG and that one element per bar at the cap costs
9,790 elements and 137–254 ms. This says what a **per-bar** mark does about that,
and Epic 5's anomaly markers and Epic 9's filing markers are both per-bar marks
that will meet the same question. It also carries the cost §10.4 raised and
2.13.9 measures — the path **string**, which 0027's element count does not see.

Note 0027 is not reopened and gets no amendment for this: it decided the
renderer, and this decides what to draw with it.

### Test 4 gets a count, not only a verdict

_Does it feel alive_ has now been answered "not yet, and not from here" **three
stories running** — by Task 2.4.4 when the motion section was written, by Story
2.12's close, and by 2.13.2's four tests against the artboard. Each deferral was
individually correct and for the same reason: the hard version of the question is
what happens when a **price** changes, and there are no live prices.

The Work bullet already asks for an honest answer and for _"what would change it
and who owns that"_. **Add the count.** Three deferrals of one criterion is the
shape of a criterion that never gets met, and the count is the only thing that
makes it visible as a debt rather than as a habit. Epic 3 is the next epic and it
does bring the moving numbers, so the trigger is met by the calendar rather than
by a condition — which is precisely why it needs writing down: nothing fires.

What this story **can** answer is the half that is latency rather than motion, and
2.13.6 built it: the selection moves in the frame the press lands, the frame
re-labels rather than re-lays-out, and no number moves while it is being read.
Answer that half separately rather than folding it into the verdict.

Add to **Done when**:

- ADR 0028 records the per-bar rendering rule and its path-string cost alongside
  the window vocabulary, and says why ADR 0027 is not reopened
- Test 4's answer carries the **count** of deferrals and names what would change
  it, and the latency half is answered separately from the motion half
- Story 2.14's close inherits the count in writing

---

## Amended 2026-09-13 by Task 2.13.3 — three of this task's sweep targets are already swept, and the ADR gains a third decision

### What 2.13.3 already swept, so it is checked rather than done again

This task's _"sweep upward"_ bullet names `CHARTING.md` §16.5's trigger and
`CLAUDE.md`'s gap list. Both were swept on 2026-09-13, the same day the
measurement landed, per `CLAUDE.md`'s own rule:

- **`CHARTING.md` §16.5** carries a dated amendment: the trigger fired, the repair
  landed, every figure in its table is now a historical record, and the framing
  _"memoise the walk on its window"_ is corrected to a **market date**.
- **`MARKET-DATA-API.md` §12.4** carries one too — its 20.6 ms on every cache hit
  is no longer a live claim, and its own trigger is discharged.
- **`VOLUME-AND-WINDOW.md` §1.2** records that 1Y's precondition is met.
- **`CLAUDE.md`'s gap list** gained one entry: _that the trading-calendar walk
  stays memoised_, which nothing in `verify` can see because a function that got
  slower is still correct. Its re-measure is a timing, so it is one of the entries
  that **cannot** be made mechanical — a timing gate in `pnpm test` measures the
  runner. Say so when this task sorts the residue.

What remains for this task on that bullet is unchanged: `EPIC.md`'s status
paragraph, `CLAUDE.md`'s "what a user can see today" paragraphs, and whatever
2.13.4 to 2.13.9 falsify.

### ADR 0028 gains a third decision, and it is the one with the widest reach

The Work bullet names two subjects — the window vocabulary and the timeframe
mapping — plus "the shared-axis property". That third one is now built and is
sharper than the phrase suggests, and there is a fourth worth its own paragraph:

- **The shared axis is a type, not a discipline.** `timeFrame` is the only function
  in the chart layer that takes a window; `priceFrame` and `volumeFrame` take one
  of its results, so **neither can build an axis**. Epics 5, 8, 9 and 11 all hang
  marks on this axis, and the rule they inherit is that a second plot is handed the
  frame rather than the window.
- **The trading-calendar walk is memoised in `packages/shared`, on a market date,
  with no clock and a bound that is the calendar's own range.** That is a decision
  about the shared package's hottest module with consequences for Epic 13's replay
  — a memo keyed on anything ambient would be a temporal-isolation hazard — and it
  is the kind of thing that gets quietly undone by a simplification. It belongs in
  an ADR rather than only in a task file, with its reversal trigger stated: **the
  first caller that needs a session for a date outside the calendar's range**, at
  which point the bound stops being structural and the cache needs a policy.

---

## Amended 2026-09-13 by Task 2.13.4 — part of the sweep is done, `VOLUME-AND-WINDOW.md` has a Part three, and ADR 0028's shared-axis decision is now describable in one sentence

### What 2.13.4 already swept, so this task checks rather than repeats

Per `CLAUDE.md`'s rule that a falsification is swept the same day rather than at
the story close — and its sharper corollary, that _"Task N is the deadline"_
routinely covers the product decision and not the document that was wrong:

- **`EPIC.md`'s status paragraph and exit-criterion paragraph** — amended. The
  criterion is now "all but met", volume is named as drawn, and what remains is
  the window control rather than "volume and the window control".
- **`CLAUDE.md`'s "what a user can see today"** — a new paragraph for the volume
  plot and the shared axis, and the "what they still cannot do" sentence
  re-pointed at 2.13.5 and 2.13.6.
- **`CLAUDE.md`'s gap list** — three entries added (the shared mark stylesheet,
  the throwing `useChartAxis`, the columns' plot clip), each with a re-measure,
  two of them with the break performed. The placeholder-count entry is corrected
  from six to five **and** gained the finding that a workshop fixture is a third
  copy nothing greps.
- **`CHARTING.md` §17.5 item 4** — carries a dated amendment: discharged, with
  the correction that volume's baseline is its axis rule and therefore runs the
  full frame rather than stopping at the coverage edge.

What remains on the sweep bullet is unchanged: whatever 2.13.5 to 2.13.9
falsify, and this story's own close.

### `VOLUME-AND-WINDOW.md` has a Part three

The Work bullet says _"finish `VOLUME-AND-WINDOW.md`"_ as though it were one act
at the end. It is now three parts — the decisions (2.13.1), the instrument
(2.13.2), and **the rendering** (2.13.4, §§18–21), which records what changed when
the design met a real page: four corrections to Part two and the measurements off
the running plots. **Continue that shape rather than rewriting it.** §21 already
carries the "what Part three hands on" list in the form §17.5 uses, which is the
form this task's closing list should extend.

### ADR 0028's third decision, sharpened

The 2.13.3 amendment describes the shared axis as _"a type, not a discipline"_.
That is right and incomplete now it is built: it is a type **and a single call
site**, held by three things together, and the ADR should say all three because
each is separately undoable —

1. `timeFrame` is the only function in the chart layer that takes a window;
   `priceFrame` and `volumeFrame` take one of its results.
2. `chartFrame`, the composition that took a whole plot box and could therefore
   build an axis out of one plot's height, is **deleted**.
3. `useChartAxis` **throws** outside a provider, so a plot cannot quietly fall
   back to building its own.

And the consequence Epics 5, 8, 9 and 11 inherit is a sentence rather than a
principle: **a second plot is handed the frame, never the window, and it draws at
the frame's width rather than at its own measurement.** The last clause is the
one that is not obvious and is the one a reader would drop — two equal-width
elements measured a frame apart are two different numbers for one render.

### One thing for the deployed verification specifically

The deployed store answers the default window **in full**, so it is the one place
the volume plot's coverage treatment is not under observation — and it is also the
one place the **gapped** column regime is unlikely to appear, because a full five
sessions at `1m` is 1,950 bars and firmly in the silhouette. `VOLUME-AND-WINDOW.md`
§19.2's accepted half-width end columns are therefore best re-checked on a
deployed **3M** window, which the control makes reachable. Say which window the
screenshot is of.

Add to **Done when**:

- The sweep bullet's list is checked against what 2.13.4 already amended rather
  than re-applied
- ADR 0028 states the shared axis as three separately-undoable mechanisms and one
  inherited sentence, not as a property
- The four tests' screenshots say **which window** they are of

---

## Amended 2026-09-13 by Task 2.13.5 — ADR 0028's shared-axis decision gains a **fourth** mechanism, and the sweep gains two "one home" claims

### The fourth mechanism, and it is the one that is easiest to undo by tidying

The 2.13.4 amendment states the shared axis as three separately-undoable
mechanisms. **There is a fourth, and it belongs in the same list rather than in a
paragraph of its own**, because it is the same wrapper and the same throw:

4. The read position lives in a **second context** on that wrapper, and
   `useChartReading` throws outside it. Neither frame owner consumes it.

The reason it earns a line in an ADR rather than a code comment is that the
correct implementation and the catastrophic one are the same size and look
identical on screen. One value carrying both the frame and the read position is
handed to every `useChartAxis()` caller, and both frame owners are callers — so a
pointer move would rebuild a 1,950-point path string and a 726-stem silhouette to
move one vertical rule, at the **17× CPU on the pointer path with no long task at
all** that `CLAUDE.md` records as invisible to `PRODUCT_SPEC.md` §28's own
criterion. The "simplification" of merging two context values is a one-line
change.

The consequence sentence Epics 5, 8, 9 and 11 inherit gains a clause:
**a second plot is handed the frame, never the window; it draws at the frame's
width rather than at its own measurement; and anything that changes on a pointer
move reaches it through a context neither frame owner reads.**

And state, in the ADR, that this is **not** `FRONTEND-STATE.md` §1's store trigger
firing. That trigger is _the first piece of state two features must agree about
that neither owns_; this is two components inside one feature on one route. A
reader meeting two context providers in one component will otherwise reasonably
conclude the trigger fired quietly and nobody wrote it down.

### Two sweep targets that are new, and are claims rather than code

Both are of the class this task checks rather than re-applies:

- **`chart-readout.module.css` is the one home for the readout's shape, its
  reservation and its figure idiom**, and `chart-marks.module.css` gained the
  reading layer, the crosshair and the disc. Two strips styled twice would be two
  copies of one decision; a third plot restating them is the obvious next change.
  `CLAUDE.md`'s gap list carries the re-measure.
- **`volumePeakBar` is the one derivation of the window's busiest bar**, read by
  the volume strip and by `chart-alternative.ts`'s `peakClause`. It was a `find`
  in one file and would have been a second in the other.

### One thing found rather than built, for the close's honesty

2.13.5 found a **shipped browser assertion that had been green against the wrong
element** since Task 2.12.6: `security-price-chart.spec.ts` asked a helper with an
`.or()` fallback for _some_ clock time, and the panel's own live sentence
satisfies it. `e2e/README.md` gained the rule. Worth a line in the close, because
this story's own instruments are the third set to be checked this way and the
count of "a green check that was checking nothing" is now three across two
stories — which is the sort of figure §14.2's four tests are supposed to be read
against.

Add to **Done when**:

- ADR 0028 states the shared axis as **four** separately-undoable mechanisms, and
  says explicitly that the second context is not the store trigger firing
- The two new "one home" claims are checked against `CLAUDE.md`'s gap list rather
  than re-argued

---

## Amended 2026-09-13 by Task 2.13.6 — ADR 0028 gains a **fifth** decision and a sixth mechanism, three sweep targets are already swept, and test 4's latency half is answerable from a real screen

### ADR 0028's subjects, after this task

The four already named are unchanged: the window vocabulary, the timeframe
mapping, the shared axis as four separately-undoable mechanisms, and the memoised
calendar walk. Two more belong beside them, and both outlive this screen.

**Five: the address is the window's home, and the client refuses nothing.**
`?sessions=N` carries a **count** and not a name, because that is already the
wire's own parameter — so the address _is_ the request, spelled once. Three
consequences reach further than this screen and are the ADR-worthy part
([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §31):

- **The address admits any count the server accepts, and the control shows no
  selection rather than snapping.** This is the decision with the longest reach in
  the story: it is what makes Epic 11's `setTimeWindow` work two epics early, and
  it is what a later author "fixes" by rounding to the nearest offered window.
- **The client repairs nothing.** A value that is not a count is asked for anyway
  and the server's refusal is rendered — `use-security-symbol.ts`'s precedent
  generalised from a ticker to a number, with one recorded imprecision (the wire
  carries a `number`, so `abc` is refused as `NaN`).
- **Read in one place, built in one.** The symbol's arrangement applied to the
  view, and the reason the parser is not in the vocabulary module.

**Six: on a daily axis a slot is a session.** This is a chart-layer rule rather
than a window one, and it belongs in the ADR because Epics 5, 8, 9 and 11 all hang
marks on this axis and every one of them will ask where an instant goes. The
vendor stamps a daily bar at **midnight**, which is outside trading hours, so the
`1m` rule — place an instant by where it falls inside a session — drops every bar
in a `1d` window and draws a correct, empty, **plausible** frame. State the defect
with the rule: it is the clearest example in this story of a branch that
typechecked, read correctly and had never run.

Note the shared axis's mechanism list stays at four. This is a rule about
`positionOfInstant`, not a fifth structural guard.

### What 2.13.6 already swept, so this task checks rather than repeats

Per `CLAUDE.md`'s same-day rule, and its corollary that _"Task N is the deadline"_
covers the product decision and not the document that was wrong:

- **`CHARTING.md` §12.2** — dated amendment. The extent band was drawn at `1d`,
  measured at 31 px of a 280 px plot, and **declined a second time**; its stated
  reason (a hairline at `1m`) does not survive the measurement, and the new
  reversal trigger is a condition rather than a window.
- **`CHARTING.md` §17.5 item 5** — dated amendment. The `1d` branches are
  discharged, and the item records that recording the body found two defects
  reading it could not.
- **`CHARTING.md` §14.4's token row** — `--price-unchanged-wash` is now
  **declined** rather than deferred, and `chart-tokens.stories.tsx` says so on the
  page where the language is reviewed. This task's token audit should read it that
  way.
- **`CLAUDE.md`** — the "what a user can see today" paragraphs, the story's status
  line, the fixture bundle-leak list (two new bodies with their own greps), and
  **three** new gap-list entries, two of them with the break performed.
- **`e2e/README.md`** — the spec count, fifteen files and 122 tests.
- **The canvas** — `Volume and window.dc.html` gained §§12–13 and §01's focus
  artboard was corrected. That is the chain ADR 0026 fixes working in the
  direction it is supposed to: the product corrected the canvas, in the canvas.

What remains on the sweep bullet is unchanged: `EPIC.md`, whatever 2.13.7 to
2.13.9 falsify, and this story's own close.

### Test 4's latency half is now answerable from a screen rather than an artboard

2.13.2's amendment says to answer the latency half separately from the motion
half. It is built and it was observed on the running page: the selection moves in
the frame the press lands (the control holds no state — it reads the address), the
frame re-labels rather than re-lays-out, and no figure moves while it is being
read. **Answer it from the deployed page anyway**, because the deployed store
answers in full and a developer's does not — the transition a stranger sees is
between two complete pictures, which is the version test 4 is actually about.

The **count of deferrals stays at three** unless the motion half changes it. This
task adds nothing to it.

### Two things for the deployed verification specifically

- **The deep-link case is now concrete.** `?sessions=63` cold is the path that
  exercises the address, the server's resolution, the `1d` timeframe and the first
  paint together — and it is the window 2.13.4's amendment asks for the
  end-column screenshot at. One load covers both.
- **`1D` is the window to photograph on the deployed store**, because it is the
  one place its `empty` is a fact about the free plan's fifteen-minute embargo
  rather than about an uncaught-up backfill. 2.13.7 answers §1.3's trigger; this
  task is where the screenshot behind it should come from.

Add to **Done when**:

- ADR 0028 records the address rule and the daily-axis placement rule alongside
  the four subjects already named, and says why the shared axis's mechanism list
  stays at four
- The sweep bullet's list is checked against what 2.13.6 already amended —
  `CHARTING.md` §12.2, §17.5 item 5, the token row, `CLAUDE.md`, `e2e/README.md`
  and the canvas — rather than re-applied
- Test 4's latency half is answered from the **deployed** page, and the deferral
  count is stated as three

---

## Amended 2026-09-13 by Task 2.13.7 — ADR 0028 gains a **seventh** subject, `VOLUME-AND-WINDOW.md` has a Part six, §1.3's trigger is answered but its screenshot is still owed, and three sweep targets are already swept

### ADR 0028's seventh subject: **what is on screen is not always what came back**

The six already named are unchanged — the window vocabulary, the timeframe
mapping, the shared axis as four separately-undoable mechanisms, the memoised
calendar walk, the address rule, and the daily-axis placement rule. This one
belongs beside them and reaches further than any of them except the address:

**The last _answer_ a page painted is kept, together with the request it answers,
until a newer answer replaces it — cleared on a change of security and never
otherwise** ([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §36).

Three things make it ADR-worthy rather than a screen detail:

- **It is the seam Epic 3 lands on.** A screen that already knows how to keep
  showing the last true thing while it waits for the next one is a screen a socket
  can feed. The live feed's _"displaying data through 10:42:17"_ (`PRODUCT_SPEC.md`
  §36) is this rule with a different sentence on it.
- **It is what makes Epic 11's `setTimeWindow` safe to hand to a model**, together
  with the address rule. An agent changing the window with nobody touching anything
  is precisely the case where a page that blanks, or a chart that silently relabels
  itself, is worst.
- **It is not a seventh member of the state union and it is not `stale`**, and the
  ADR should say why, because both are the obvious readings and both are wrong: it
  is a fact about **two** requests, and a union member describes one. State also
  that `FRONTEND-STATE.md` §2's reversal trigger — _a chart that redraws a held
  series in a second style_ — stays **unfired**, for the same reason §1's store
  trigger has to be disclaimed for the second context: a reader meeting this will
  otherwise conclude a trigger fired quietly.

Note ADR 0023 is **not** reopened. It decided that there is no store; this decides
what one screen shows while two requests are in play, and it is spelled as a pure
transition beside the ones that file already argues for.

### `VOLUME-AND-WINDOW.md` has a Part six, and §41 is the list to extend

The Work bullet still says _"finish `VOLUME-AND-WINDOW.md`"_. It is now **six**
parts — decisions, instrument, rendering, reading, control, and **every state of a
window change** (§§36–41). Continue the shape rather than rewriting it, and note
that §41 already carries the "what Part six hands on" list in the form §17.5 uses,
which is the form this task's closing list extends.

### §1.3's trigger is **answered**; what this task still owes is the photograph

2.13.6's amendment says _"2.13.7 answers §1.3's trigger; this task is where the
screenshot behind it should come from."_ Half of that is done and the other half
moved.

**Answered: 1D stays** (§39). Looked at at 1440 in a real browser: the frame is
real, the whole plot is the same uncovered ground a partial answer uses for its
short tail, and the sentence names the window, the fact and the schedule. That is
a decision now, not an open trigger, and this task should record it as settled
rather than re-take it.

**What moved is the premise.** Photographed on the **deployed** store on
2026-09-13, a **Saturday**, `?sessions=1` resolved to a completed session the
nightly backfill holds in full: a complete intraday line at −1.38%, no uncovered
ground anywhere. So §1.3's _"1D is **reliably** empty"_ is true only **during** a
session, and the deployed store outside one shows the best picture the control
offers rather than the emptiest.

**This task therefore still owes the weekday photograph** — the one place 1D's
emptiness is a fact about the free plan's fifteen-minute embargo rather than about
an uncaught-up backfill, which is what 2.13.6's amendment was actually asking for.
Take it on a trading day, and put it beside the weekend one; the pair is the
honest record and either alone is misleading.

### What 2.13.7 already swept, so this task checks rather than repeats

- **`CLAUDE.md`** — the story's status line, the "what a user can see today"
  paragraph (a new one for the held answer, the rail and the re-anchored
  crosshair), and **three** new gap-list entries: the hidden-tab
  `ResizeObserver` warning, the discharged stranded-observer defect, and the
  held-answer style claim. Two of the three had their break performed.
- **`FRONTEND-STATE.md`** — a new §8, a dated amendment recording that the
  document's §1 and §4 describe a layer in which one union answered both
  questions, and that Story 2.13's control is the first thing to separate them.
- **`EPIC.md`** — status and exit-criterion paragraphs, which had been two tasks
  stale. The criterion now reads **met in substance**, and what remains is named
  as the three tasks that make it checkable.
- **`e2e/README.md`** — sixteen spec files and 129 tests, plus a note that three
  of the heaviest specs time out under contention at four workers and pass in
  isolation, so a red run that goes green alone is not a flake to bisect.
- **`STORY.md`** — status.

What remains on the sweep bullet is unchanged: whatever 2.13.8 and 2.13.9
falsify, and this story's own close.

### Two things for the deployed verification specifically

- **A window change is now worth photographing in three frames rather than one.**
  The deployed store answers in full, so the transition a stranger sees is between
  two **complete** pictures with a rail in between — which is the version test 4's
  latency half is actually about (2.13.6's amendment asks for it from the deployed
  page). The rail's third form, a refusal over a held answer, is reachable there
  by a hand-typed `?sessions=1000` after an answer has landed.
- **`pnpm e2e:deployed` does not cover any of this.** The deployed suite is three
  specs about routing, the universe and the two halves; nothing in it drives the
  window control or the rail. Say so in the close rather than letting a green
  deployed run imply it.

Add to **Done when**:

- ADR 0028 records the held-answer rule as its seventh subject, says why it is
  neither a seventh union member nor `stale`, and disclaims both
  `FRONTEND-STATE.md` triggers explicitly
- §1.3's trigger is recorded as **answered** rather than re-taken, and the
  **weekday** 1D photograph is taken and placed beside the weekend one
- The sweep bullet's list is checked against what 2.13.7 already amended —
  `CLAUDE.md`, `FRONTEND-STATE.md`, `EPIC.md`, `e2e/README.md` — rather than
  re-applied
- The close states what `pnpm e2e:deployed` does **not** cover, the window control
  and the rail included

---

## Amended 2026-09-13 by Task 2.13.8 — **the screen-reader pass belongs here, not to Story 2.14**, the sweep gains three swept targets and one new one, and ADR 0028 gains **no** subject

### The correction first: 2.13.8 handed three questions to the wrong owner

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §45 closed with three questions
that need a person and a screen reader, and named **Story 2.14's close** as their
owner. **That is wrong and this amendment moves them here.**

The argument is `CLAUDE.md`'s own, applied one layer over: _visual quality is an
acceptance criterion on the story that builds the screen, not polish deferred to a
later epic — polish deferred is polish never._ Whether a surface can be **used**
is the same kind of claim as whether it looks right, and all three surfaces are
this story's: the spoken bar sentence, the held-window rail's clause, and the
window control's manual activation. Story 2.14 is the epic's close and owns the
feed label; handing it an accessibility question about a control 2.13 shipped is
deferring across a story boundary for work this story owes.

It also fits the shape of this task rather than straining it. This is already the
place where a **person** looks at a deployed page and answers four questions in
writing. Listening to it is the same act with a different sense.

**The three, with what is already measured and what the repair is if the answer
is no:**

1. **Can somebody stepping along bars actually hear the traded volume?**
   The mechanism works — `Tab` to the plot, arrow, and the region says
   _"…Open 230.40, high 230.58, low 230.25. **Volume 882 thousand.**"_ The
   concern is arithmetic: the sentence is **25 words**, about **8 seconds** at a
   default rate, and `READING_ANNOUNCEMENT_MIN_GAP_MS` is **1,500** — a floor
   argued in Task 2.12.6 as _roughly how long a screen reader takes to read one of
   these sentences_, and **not revisited when Task 2.13.5 added the volume
   clause**. Driven and timed on 2026-09-13: two arrow presses announce at 477 ms
   and 1,981 ms, so the region changes about four times faster than it can be
   spoken. Whether that **queues** or **replaces** is reader-dependent and is the
   whole question; if it queues, the volume figure is the first thing lost because
   it is last.
   **Repair if it is no: split the sentence** — instant, close and direction while
   stepping, the four prices and the volume on a pause. **Not** a higher floor,
   which would make a fast walk silent.
2. **Is the held-window clause reachable in practice?**
   _"NVDA: the series could not be read. This is usually temporary. Try again in a
   moment. **The 21-session window is still on screen.**"_ Appended last, by
   design (§37), and it is the clause that tells a listener _the page kept the
   previous answer_ rather than _the page went blank_. Same class as (1) and the
   same failure mode.
3. **Is manual activation discoverable from the radio's own announcement?**
   §32 chose `Space`-to-commit on the claim that _"1 year, radio button, not
   checked, 5 of 5"_ tells a listener a press is pending. The tree is correct and
   every cell now carries the readout as its description (§43.4). Whether _"not
   checked"_ is **enough** is not answerable without listening.
   **Repair if it is no**: an explicit hint in the description, or
   selection-following-focus with a `replace`d address — which §32 declined
   because it spends four addresses and four requests on one intention, and that
   argument is unchanged.

**Record the answer either way**, including "it was fine", because _nobody
checked_ and _it was checked and it was fine_ are different artefacts and only one
of them is worth anything to Epic 11.

Add to **Done when**:

- A real screen reader is used on the deployed page, and §45's three questions are
  each answered in writing — the reader and the platform named, because the answer
  to (1) is reader-dependent by construction
- Anything found is repaired **here** or raised with a condition and a named
  owner, and `VOLUME-AND-WINDOW.md` §45's attribution to Story 2.14 is corrected
  to match what actually happened

### What 2.13.8 already swept, so this task checks rather than repeats

Three of this task's sweep targets are paid:

- **`CHARTING.md`** carries a dated amendment at §15.3, beside the Story 2.12
  quote of the coverage clause rather than replacing it — the clause said _the
  bars stop at_ and was false by two sessions at `1d` (§43.2). The historical
  quote is left standing, which is the rule.
- **`CLAUDE.md`'s gap list** gained four entries and one **correction**: 2.13.4's
  dash-rhythm entry was over-stated, found by running its own re-measure (§43.5).
  Two of the three rhythms are shared and the third correctly is not.
- **`CLAUDE.md`'s "what a user can see today"** gained the walk's paragraph, and
  the must-not-ship fixture list gained `holiday-week.json` at **357 kB**, which
  is now the largest thing in that directory. Its grep was performed against a
  real `dist/` and finds nothing; **perform it again after the deploy build**,
  because that is the artefact that ships.

### And one new sweep target, which is `CHARTING.md`'s rather than this story's

**§7's tick vocabulary gained a rule.** A time tick is now dropped when it falls
within 5% of the axis from a session date (`MIN_TICK_SEPARATION`), because a half
day puts its midday 32 px from the next date and the two were drawn on top of each
other (§43.3). That is a fact about **how this product draws a time axis**, not
about windows, so it belongs in `CHARTING.md` beside §7.1's answer 9 — _a session
boundary carries the date and everything between carries the time_ — of which it
is the corollary: when the two collide, the **time** loses.

### ADR 0028 gains **no** subject from 2.13.8, and that is worth saying

Seven subjects are named by the amendments above this one and the number is
unchanged. 2.13.8 produced four repairs and a measurement, and none of them is a
decision with reach:

- The tick-separation rule is a drawing rule and goes to `CHARTING.md`, above.
- The alternative naming the **resolved session count** is the window vocabulary —
  ADR 0028's **first** subject — reaching one more surface, not a new decision.
  Say it there rather than eighth.
- _A description on a roving-tabindex group is unreachable_ is a **hazard**, not a
  decision. It is on the gap list with a re-measure and a browser assertion, which
  is where a hazard belongs; an ADR recording it would be recording a bug fix.

A reader arriving at ADR 0028 after reading Part seven will expect an eighth
subject, which is exactly why this paragraph exists.
