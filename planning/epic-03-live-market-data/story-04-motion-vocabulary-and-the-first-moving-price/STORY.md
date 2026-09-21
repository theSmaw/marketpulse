# Story 3.4 — The Motion Vocabulary & the First Price That Moves

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.3
**Epic scope covered:** the motion vocabulary (design test 4), live price updates in the UI — on one surface

## Description

**The design criterion this product has answered _not yet_ seven times.**

`VISUAL-LANGUAGE.md`'s Motion section is explicit that it is a thin first cut
rather than a system, and that **Epic 3 owns the full vocabulary** — _"the hard
question in this product is what should happen when a price changes on screen,
and that has to be answered against real moving numbers. A vocabulary settled
against the first screen that needed any — a table that arrives once and then
sits still — would be a vocabulary designed for the easy case and then inherited
by the hard one."_ Three tokens exist: `quick` at 120 ms for a state change
under the pointer, `settle` at 240 ms for content arriving, and `pulse` at
1400 ms for a wait that breathes. **Nothing says what happens when a number
changes**, and Story 3.3 has just made numbers that can.

Seven deferrals of one criterion is not caution; it is the shape of a criterion
that never gets met, and Epic 2's close said so and handed it here by name.

So this story settles the vocabulary **and applies it to exactly one surface**:
the last price in the Security Explorer's identity block. One surface, because a
vocabulary is a decision and three surfaces would make it three decisions.

## What the user can see when this story lands

**A price that changes while they watch it**, on `/securities/NVDA`, with the
market open — the first number in this product's history that moves on its own.

And a vocabulary underneath it that says how: what a rising value does, what a
falling one does, what an unchanged tick does (very likely nothing, and that is
a decision rather than an omission), how long it lasts, and what a reader with
`prefers-reduced-motion` gets instead.

What the user still cannot do: watch the universe table move (Story 3.6), see
the chart extend to now (Story 3.7), or reload the page and still see today
(Story 3.9). And with the market shut they see a still price with an honest
sentence, which is Story 3.10's subject and is stubbed honestly here.

## Why it sits here in the sequence

**Immediately after the first live value can reach a browser, and immediately
before three surfaces would each need one.** Stories 3.6, 3.7 and 3.10 all put
changing values on screen; if this story ran after any of them, the vocabulary
would be reverse-engineered from whatever the first of them happened to do.

It is also the last cheap moment. The identity block's last price is **one
number in one place** — the smallest possible subject for a decision this
consequential, and small enough that getting it wrong twice costs an afternoon.

**Amended 2026-09-16 — this story's design work no longer waits for 21:30.**
[ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)
adds a replay of our own stored minute bars behind the stream seam, so the
vocabulary can be designed against **real recorded intraday movement** at any
hour of the day. That matters specifically here: this criterion has been
answered _not yet_ seven times, and the eighth deferral would most plausibly
have been "there was one evening and it was not enough".

Two constraints come with it, and they are the difference between designing
against motion and designing against a toy:

- **Design against the replay; accept against the live feed.** The replay is
  real recorded movement and is the right instrument for the decision. It is not
  the instrument for the acceptance: this story owes a **dated rehearsal row in
  [`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md)**, watched during a real session.
- **Design at 1×.** The engine takes a speed multiplier and a developer may run
  it faster to iterate, but **the vocabulary must be settled at the cadence the
  product actually has** — one observation per symbol per minute (§2.1). A
  motion language tuned against a 10× replay is a language designed for a market
  that does not exist, which is this story's own warning about the easy case
  inherited by the hard one, one level down.

## Scope

- **The vocabulary**, as tokens and as rules, in `VISUAL-LANGUAGE.md` and
  `tokens.css`, **and synced to the design canvas**. ADR 0026's chain is
  canvas → document → tokens → components, and the motion row is the one place
  in the product where it has already run backwards; that row _owes a sync_ and
  says so. **Establish that the canvas is reachable before designing anything**,
  so this epic's largest design decision is not the second exception.
- **What a changing value does.** The candidates are a direction-carrying
  flash, a brief emphasis on the digits that changed, a mark that appears beside
  the number, or nothing at all with only the digits swapping. Take it against
  the two rules already standing, both of which have teeth here:
  - **Motion must never make a number harder to read.** A value that fades or
    slides while an analyst is reading it is worse than one that changes
    instantly. This is the constraint that makes a market application's motion
    genuinely hard and it is why the existing set is so small.
  - **Colour is never the sole encoding of anything.** The price palette differs
    by **1.04:1 in greyscale**, so hue is the entire difference between up and
    down — shape, sign, glyph or word must carry it. A green flash and a red
    flash are the same flash to a large number of readers, and this repository
    has already caught a real defect where four greyscale simulations passed
    against a chart that was wrong.
- **What a value arriving for the first time does**, which is `settle`'s
  existing job and probably needs nothing new.
- **`prefers-reduced-motion`, answered at the token layer as it already is.** The
  durations resolve to `0ms` under the preference, so a consumer reading the
  tokens honours it by construction and a consumer hard-coding `240ms` is the
  only way to get it wrong. A flash that is the **only** signal of a change is
  a change invisible to that reader — so whatever carries direction must survive
  the motion being removed.
- **The rule that already governs and must not be broken here**: _motion in this
  product means work in progress, and nothing else may borrow it._ A moving rule
  under a finished sentence is the fourth design test answered backwards — alive
  where alive would be a lie. A **price** changing is not work in progress; it
  is a fact arriving, and if the vocabulary needs those to look different, say so
  in the document.
- **The rate problem, which is a design problem before it is a performance one.**
  A minute bar changes a price once a minute; a trade stream changes it many
  times a second. Whatever Story 3.1 decided, the vocabulary must state what
  happens when two changes arrive inside one animation, because _every_ answer
  that does not state it produces a smear.
- **The identity block's last price**, wired to the stream for one security.
- **What a spoken interface hears.** A region that changes on its own is a live
  region question, and this repository already has a **known, unshipped repair**
  in that area: the spoken bar sentence is 25 words against a 1,500 ms pacing
  floor, and whether a region changing every 477 ms queues or replaces _is
  readable from neither the DOM nor a timing nor by an agent_. A price that
  changes every minute is a gentler case than that one and is the same question.
  **Do not announce a price change by default** — decide it, and write down what
  was decided and what nobody has heard yet.

## Out of scope, and who owns it

- The universe table — Story 3.6, which inherits this vocabulary and does not
  extend it
- The chart — Story 3.7. A chart that animates its own first paint is decoration
  rather than a market moving, and `VISUAL-LANGUAGE.md` already says so
- The degraded states' own treatment — Story 3.10
- A listening pass with a real screen reader. That is owed by this repository
  already, is owned by _a person with a screen reader_ rather than by a story,
  and this story adds to its backlog rather than discharging it

## Open decisions — settle with the user

**Both were settled on 2026-09-21 by Task 3.4.4**, in front of four treatments
running on the real component at 1×, and they were settled **together** because
the second decides what the first means. **The mark is a small disc beside the
figure that appears and decays, and it fires when a bar ARRIVES rather than when
the price CHANGES** — so it does not say _this price moved_, which the `▲`
already says. It says **a bar arrived for this security**, which is a claim
about the feed that nothing else on the screen makes and that §11.2's refusal to
give a security a status word does not forbid, because it makes no threshold
judgement. The argument, the three rejected options and the reversal trigger are
in `The motion vocabulary.dc.html` §05 and in
[Task 3.4.4](TASK-04-three-treatments-on-a-real-screen.md).

**The sweep that followed amended four tasks and added none**, which is worth
recording because one of the four was a contradiction rather than a tidy-up:

- **3.4.5** gained the trap the decision creates. _Fires on arrival, not on
  change_ is silently reversed by the obvious implementation — a renderer that
  compares closes — and **every test stays green**, because the two only
  disagree on the quiet minute. The assertion is the negative: _a bar arriving
  with an unchanged close still fires the mark._ It also gained the fourth
  token, the loop/persist/decay rule, and the disposal of 3.4.4's instrument.
- **3.4.6's §2 premise is STALE and was corrected rather than deleted.** It was
  written against a _"price moved" animation_ that no longer exists: the mark
  claims only _a bar arrived_, and a correction **is** a bar arrival, so the lie
  it was written to prevent cannot be told by the mark. Left unamended it would
  have invented a second motion treatment the vocabulary had just decided it
  does not need. What survives is narrower and is about the **figure**, not the
  mark — and a decided absence is now the stronger starting position.
- **3.4.7** gained the one state where criterion 3 actually bites. On a minute
  the price **moved**, the digits carry it with the motion removed. On a
  **quiet** minute the mark is the _sole_ signal — and reduced motion erases
  exactly that one. The qualifier's instant may already be the survivor, which
  is the first thing to check rather than the last.
- **3.4.8** keeps a figure instead of re-deriving it (0 layout shift at four
  widths, taken in the workshop; only the production re-take is owed) and gains
  one: **the mark's firing rate**, because the reversal trigger's second clause
  is a number and Story 3.6 needs something to compare 518 rows against.

**Nothing was added, deleted or re-ordered.** The decision is fully specified,
its one genuinely new obligation lives inside 3.4.7, and the scale question is
Story 3.6's and was handed over in that story's own words.

### 3.4.5's sweep — 2026-09-21, and it found a defect in its own merge

**Three tasks amended, none added, deleted or re-ordered.** Two of the three
come from the same thing: **the mark keys on the observation's instant**, which
is what makes it fire on a quiet minute — and is also what makes it **not fire
on a revision**, because a correction carries the minute it corrects (§7.3).

- **3.4.6** owns that, and it is now a decision rather than a behaviour. It may
  well be right — one bar already arrived for that minute — but three of
  fourteen revisions changed a close, so the unargued version lets a reader
  watch the **figure move with no mark at all**, which is the inverse of the
  decision's intent. The detection is the **same comparison `useArrival`
  already makes**, so a second copy of it is how the two answers drift apart;
  and `WireObservation` carries **no `supersedes` field**, so widening the wire
  is a protocol change rather than a renderer change.
- **3.4.7** gained a concrete assertion in place of a general worry, and
  `[data-arrival]` as its handle. The mark is already `aria-hidden`, asserted —
  so the live-region decision is about the DOM text rather than about the
  treatment.
- **3.4.8** gained the animation's own cost as a **measurement rather than an
  assumption**. It is an `opacity` animation on an 8px absolutely-positioned
  element and the expected answer is _nothing measurable_; **expected to be
  free** is how a cost gets inherited by five stories.

**And 3.4.5's own record was corrected twice**, because both errors were mine
and both would have misled somebody:

- It claimed §7.8's fourteen revisions were a real case of _two changes inside
  one animation_. **They are not** — a revision does not change the instant, so
  it produces no second mark. The mechanism is right and the justification was
  wrong, which is how a right mechanism gets removed later by somebody who
  checks.
- **It shipped a defect and the sweep found it by looking.** Under
  `prefers-reduced-motion` the token resolves to `0ms`, an animation of zero
  applies **no keyframe styles at all**, and `.arrival` declared no base
  opacity — so the mark rendered at `1` and **stayed for ever**. A reader who
  asked for less motion got a permanent dot: the opposite of the vocabulary that
  task shipped, since a mark that persists reads as a **state**. Repaired with
  `opacity: 0` as the base, verified on the running page both ways, and recorded
  as `docs/GAPS.md` entry 11 because **nothing in `pnpm verify` can see a
  computed opacity**.

### 3.4.6's sweep — 2026-09-21, and the rehearsal lost a window it never had

**Three tasks amended, none added, deleted or re-ordered.** The important one is
a **scheduling conflict** that would otherwise have been found on the morning of
the rehearsal:

- **3.4.10 is now two sittings, or one that straddles the bell.** The
  extended-hours mark renders for `before_open` and `after_close` **only**, so
  it **cannot be seen with the market open** — and that task's own criterion 8
  requires the market open. Nothing can stand in for the out-of-hours window
  either: the replay re-stamps onto the wall clock, so every bar it produces out
  of hours lands on a **weekend** and carries no mark at all. **The mark is
  shipped and has never been seen against a real bar.** The correction case
  also gained a shipped behaviour to confirm rather than an event to look out
  for — the mark fires, the instant does not advance — and one third-party
  assumption got a line: _IEX trades on neither a weekend nor a holiday_ is an
  assumption rather than a measurement, and the rehearsal is the one time real
  frames are in front of somebody.
- **3.4.7's subject changed rather than grew.** The spoken qualifier is now
  **three clauses** — `07:42 EDT · pre-market · change from …` — on a surface
  that changes once a minute, against a **1,500 ms** pacing floor. How the `·`
  is spoken, whether the clause order survives being heard, and whether a
  clause that only _sometimes_ appears has quietly acquired a region are all new
  and none is decidable from a DOM. Three of its five greyscale states are
  already checked, so it confirms rather than re-derives; the **correction** is
  the one that has never been in a greyscale frame.
- **3.4.8 gained a second height.** The identity block is **88 px at 390** for
  an extended-hours price against **72 px** for a regular-session one. That is a
  legitimate wrap rather than thrash — the chrome's own answer — but a figure
  taken against only the regular case is a figure about one of the two states
  this surface has.

### 3.4.7's sweep — 2026-09-21, and the useful part is an unlock rather than a warning

**Two tasks amended and one suite document, none added, deleted or re-ordered.**

- **3.4.8 got the instrument it did not have.** Task 3.4.7 built `serveFeed` —
  a market socket answered **entirely from the test**, with a `push` that sends
  a `bars` frame on demand. CI has no credential, so before it **a runner could
  not reach a state where a price exists at all**, let alone changes, and every
  figure that task owes needs an arrival. §7.4's burst — **332 bars in 243 ms**
  — is reachable through it as a single `push`. Its limit travels with it:
  it furnishes the **wire**, so it measures the browser's half and not the
  server's, and §28's clock starts at _server-received_. **A number labelled as
  §28's when it is missing a gateway and a socket is worse than no number.**
- **3.4.10's ADR question is now two decisions rather than one**, and they are
  different in kind. The motion vocabulary is inherited by three stories inside
  this epic; **a self-changing value announces nothing** reaches past it
  entirely — Epic 5's anomaly scores change on their own and Epic 10 streams
  agent events, and **both will meet that decision's trigger rather than the
  decision**. Decide against both or the answer is about half the question.
- **`e2e/README.md` gained what the new spec does not certify.** Five green
  tests say everything about what the browser does with an arrival and
  **nothing about whether one arrives** — if the gateway stopped sending `bars`
  for ever, all five would still pass. That chain is covered piecewise
  elsewhere and **nowhere end to end in a browser**, which is the sentence to
  keep rather than the reassurance.

The original wording stands below, because it is what the decision was taken
against.

1. **The treatment itself.** This is a design decision with product weight and
   the user has a standing instruction about the bar; put two or three real
   options on a real screen and let them be looked at rather than described.
   Static mock-ups cannot settle a motion decision.
2. **Whether an unchanged tick shows anything.** A feed that says _still 174.32_
   is information, and drawing it is the difference between a live application
   and a static one during a quiet minute — and also the difference between a
   calm screen and a twitching one.

## Handed here by Task 3.3.5 — 2026-09-19: the motion vocabulary already has one rule, and it is not yours to re-take

**`LIVE` is on the screen as of today, and it does not move.** That was the
decision this story inherits, and it came from the canvas rather than from a
preference — `Failure and partial states.dc.html` states it as a language rule:

> **Motion in this product means work in progress and nothing else may borrow
> it.**

It has already governed a shipped decision once: the settled states of the
chart's rail are static and only _refreshing_'s hairline travels, because a
state that moved while saying something had finished was the defect that nearly
shipped in Task 2.14.5.

**So the vocabulary you are designing is not a blank page. Three constraints
arrive with it:**

1. **Motion means work in progress.** A price that has _changed_ has finished
   changing — so whatever marks it is a different thing from the hairline that
   marks a request in flight, and the two must be distinguishable at a glance or
   one of them is lying.
2. **Green means price-positive.** The identity accent is crimson and scoped to
   four positions in the chrome; green is spent. A motion that arrives in a
   colour has to answer what that colour already means here.
3. **`LIVE` stays still, and that is the standing answer rather than a
   placeholder.** It is a statement of fact about a connection. If this story
   concludes the word itself should acquire motion, that is a **reversal of a
   decision taken with its reasoning written down** — `Live in the chrome.dc.html`
   §07 — and it wants the same treatment rather than a quiet edit.

**The fourth design test — _does it feel alive_ — is now eight deferrals old and
this is the story that pays it.** Task 3.3.5 could not: the honest version of
aliveness is a number that changes, and it shipped none. You will have the first
one. Read `Live in the chrome.dc.html` before drawing, for the same reason 3.3.5
read `Failure and partial states.dc.html` before drawing — it reserved this
position by name, and that reservation is now yours.

## Handed here by Task 3.3.4 — 2026-09-19, and one of the three is a trap

Story 3.3 built the browser's end of the socket and **deliberately stopped
short of holding prices**. Three things follow, written here rather than left in
3.3's task files, because a story close sweeps the documents the story wrote and
this is not one of them.

**1. The observation store is yours, and the shape is already decided.**
`useLiveFeed` keeps the newest observation's **instant** — staleness needs it —
and **not the observations themselves**. What to add is §10.3's **one Map,
latest observation only**, with §11.1's omission semantics: an entry for every
security observed and **no entry at all** for the rest, so _present but empty_
is unspellable. It goes into `advanceLiveFeed` in
`apps/frontend/src/market/live-feed.ts`, which is additive — the reducer, its
event union and the transport all already carry the whole message.

**2. The trap: `sameLiveFeedView` will silently stop your prices moving.**
`use-live-feed.ts` only sets state when the derived view **differs**, because
Task 3.3.2's gateway re-sends the feed state every 120 s and a hook that
notified on every message would re-render the application thirty times an hour
to redraw an identical word. That gate compares five named fields. **Add
observations to the connection and forget the comparison, and the Map will
update while the screen never does** — a first moving price that does not move,
with every test green, because the reducer is right and the gate is upstream of
it. Extend `sameLiveFeedView` in the same change, and assert the negative: _a
new price causes a render._

**3. `OBSERVATION_INTERVAL_MS` is a minute because §10.1 chose minute bars.**
Task 3.3.4 found that §11.2's staleness rule measured an observation's age from
the instant that **opens** its interval, so `live` was unreachable in session;
the repair adds the interval's duration. **Nothing checks that the subscribed
timeframe is actually a minute.** If this story or any after it subscribes to a
second timeframe, that constant is silently wrong in the same invisible way —
and the duration then belongs on the observation rather than in a module
constant. That is the constant's stated reversal trigger, and this is the story
most likely to fire it.

## The design bar

**This is the story where test 4 is finally answered, and the answer has to be
yes.** The other three tests apply as always, and one of them is at unusual
risk: _is there a moment in it worth showing somebody_ has been the hardest test
for this product's sober, dense screens, and a price moving well is the most
showable thing it has ever had. It is also, done badly, the fastest route to
looking like a defaulted trading widget.

**Restraint is not the same as plain**, and the inverse applies here: the
correct answer may be very small, and it must still be _decided_ rather than
minimal by default.

## Acceptance criteria

1. `VISUAL-LANGUAGE.md` carries the vocabulary with its rationale, its rejected
   alternatives and a reversal trigger, and the canvas carries it too — or the
   canvas's unreachability is recorded in the same terms the motion row already
   uses
2. Every duration is a token; no component hard-codes one
3. Under `prefers-reduced-motion`, a price change is still perceivable — the
   direction survives the motion being removed
4. Direction is never carried by hue alone, checked in **greyscale** rather than
   argued
5. A price on `/securities/:symbol` updates without a page refresh, within
   §28's **250 ms p95 from server-received event to application state**, measured
   rather than assumed and excluding provider latency
6. Two changes inside one animation produce a defined result, and it is the one
   the document states
7. No routine main-thread task over 50 ms, and no layout thrash: a value that
   changes width must not move anything around it — the numerals are tabular for
   this reason and the reason is now load-bearing
8. `pnpm probe` at all four viewports, and a person looked at the screen with
   the market open before the browser suite ran
9. `pnpm verify` passes

## Tasks

**Ten, sequential, each self-contained** — eight when this story was split.
**Task 3.4.3 was inserted on 2026-09-20** because Task 3.4.2 found that no
stream implementation delivers an observation into a running process, and
**Task 3.4.9 on 2026-09-21** because 3.4.3's demonstration put two true and
contradictory sentences in one cell of the chrome. Four put something on a
screen; a fifth changes one only for a developer, and says so.

| #      | Task                                                                                                                                             | Visible?                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 3.4.1  | [The observation store, and the gate that would have stopped it](TASK-01-the-observation-store-and-the-gate-that-would-have-stopped-it.md)       | No                                 |
| 3.4.2  | [The first price that moves, with no vocabulary yet](TASK-02-the-first-price-that-moves-with-no-vocabulary-yet.md)                               | **the screen**                     |
| 3.4.3  | [**A stream that drives itself**, and the assertion that was missing](TASK-03-a-stream-that-drives-itself.md)                                    | **YES — the number finally moves** |
| 3.4.4  | [Three treatments on a real screen, and the decision](TASK-04-three-treatments-on-a-real-screen.md)                                              | **YES** — the instrument           |
| 3.4.5  | [**The vocabulary, as tokens and as rules**](TASK-05-the-vocabulary-as-tokens-and-rules.md)                                                      | **YES**                            |
| 3.4.6  | [The two marks this story acquired](TASK-06-the-two-marks-this-story-acquired.md)                                                                | **YES**                            |
| 3.4.7  | [What a listener hears, and what survives the motion being removed](TASK-07-what-a-listener-hears-and-what-survives-the-motion-being-removed.md) | No                                 |
| 3.4.8  | [The measurements this story owes](TASK-08-the-measurements-this-story-owes.md)                                                                  | No                                 |
| 3.4.9  | [The cell that answers two questions, and says which for neither](TASK-09-the-cell-that-answers-two-questions.md)                                | **developer only**, and says so    |
| 3.4.10 | [The live rehearsal, the sweep, and the close](TASK-10-the-rehearsal-the-sweep-and-the-close.md)                                                 | No                                 |

### Why 3.4.3 was inserted rather than folded into 3.4.2

**Because it is not the same work.** 3.4.2 wired a component and took a design
decision about what a block says; 3.4.3 is a backend defect in the seam
underneath, and its three faults — a replay source that yields nothing, a
fixture stream with no timer, and an Alpaca connection held by production —
have nothing to do with each other or with the screen.

**And the split keeps the record honest.** 3.4.2's deliverable is _unmet_ rather
than _done_, and a task that absorbed the fix would have made that disappear.

**Closed 2026-09-20, and the suspect 3.4.2 named was innocent.**
`createStoredReplaySource` was correct all along — an instrument proved it in
91 ms. The faults were `defaultReplayStart` **validating one date and stamping
another** (it checked the candidate's _market_ date and returned its _UTC_ one,
which lands on a Saturday before about 04:00 UTC) and the fixture having no
clock. Both are now break-verified. The finding that outlives them: **3.4.2's
four tests of that walk all ran at `12:00:00Z`, the one time of day where the
two dates cannot disagree, and asserted by performing the same conversion the
code did.** A check written in the same units as the thing it checks cannot see
a units error.

### Why 3.4.9 was added on 2026-09-21

**Because a replay and a live connection had never been on one screen together
before.** Task 3.4.3's demonstration put them there, and the market-feed cell
said `NOT CONFIGURED … No market-data provider is configured.` three words from
`REPLAYING … Replaying a past session.`

**Both sentences are true and both were designed**: the first is the _stored
series'_ provenance, the second the _live connection's_, and one environment
variable selects both — so `replay` is a valid live selection and, by ADR 0030
§3, deliberately no historical provider at all. Nothing is lying; §11.3's grid
simply has **no cell for that pair**, which is why no test could fail on it and
why it is invisible in production, where one provider answers both questions.

**It is not folded into 3.4.4.** That task decides how a changing number looks;
this one decides what a status cell says when it has two subjects. Putting them
together would give one task two decisions and let the smaller one be settled
by whoever happened to be editing the file.

**The finding it carries is bigger than the fix.** Story 3.2's close found three
implementations with **no construction site**; this is that one level further
out — **three implementations that are constructed and none of which drives
itself.** Every test drives them by hand, so nothing has ever asserted that a
stream left alone in a process produces anything, and `pnpm verify` was green
throughout. **3.4.3 is finished when something would go red if a stream stopped
driving itself**, not when a number moves.

### The ordering, and the one place it is load-bearing

**The moving number ships BEFORE the vocabulary, and that is the whole shape of
the split** — which 3.4.3's insertion protects rather than disturbs: the
decision still waits for a screen with a changing number on it, and now there
is a task whose job is to produce one.

Open decision 1 says _static mock-ups cannot settle a motion decision_, and the
same sentence rules out settling it against a number that does not move yet. So
3.4.2 puts a deliberately undesigned price on screen — digits swapping, nothing
else — and 3.4.4 takes the decision against **that**, running, at 1×.

It has a second effect worth stating: **the undesigned version is a real
candidate rather than a control.** The story says the correct answer may be very
small, and shipping the smallest possible version first means any treatment has
to beat it on purpose rather than by default.

**Everything before the decision is reversible and everything after it is
inherited by five stories**, which is why the two measurement tasks are late:
measuring a treatment nobody has chosen is measuring the wrong thing.

### What this split does NOT do

- **It does not design in the story file.** 3.4.4 is where the treatment is
  decided, with the owner, in front of a running screen — and the rejected
  options travel to 3.4.5 rather than being lost between them.
- **It does not accept against the instrument it designed with.** 3.4.10's
  rehearsal is a real session, because the replay is our own stored bars and
  agrees with our own assumptions by construction.

## What this story hands forward

The vocabulary every remaining story in this epic uses, and the first answer to
a question this product has been postponing since Epic 1.

---

## Handed here by Task 3.1.4 — 2026-09-17, and it is two new obligations

Both are consequences of decisions the owner took on 2026-09-17
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11), and **neither existed when this story was
written**.

**1. An extended-hours mark.** Pre-market and after-hours bars are **rendered
and marked** rather than filtered. Nothing on the frame distinguishes them
(§7.7), so the mark is entirely ours to invent, and Stories 3.6, 3.7 and 3.9
consume it. This story owns the vocabulary; it did not previously owe one.

**2. A treatment for _this corrected_ that is not the treatment for _this
moved_.** The product subscribes `updatedBars`, so a displayed number can be
replaced about thirty seconds later by a corrected one for the same minute
(§7.8). **A correction is not a price movement** and must not borrow motion that
says it is — three of fourteen corrections changed the close price by a few
cents, which under a "price moved" animation would read as a real tick that
never happened.

**And the rate is now known**, which is what this story was waiting for: a
minute's bars land within **243 ms p50 / 511 ms p95** (§7.4) — about 320 symbols
in a quarter of a second, once a minute — rather than as a smooth stream. Motion
designed against a smooth arrival will be designed against a case that does not
occur.

---

## Handed here by Task 3.1.7 — 2026-09-17, and it is one sentence to design against

**A live price is at most about a minute old for a liquid security, may
legitimately be hours old for a thin one, and both of those are the feed working
correctly.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.1, and both halves are measured.

A bar arrives ~**0.5 s after its minute closes** (§7.4), so a security that
trades every minute has a ceiling of a minute. But IEX coverage is **65.1% of
minutes for a median symbol and 2.1% for `ERIE`** (§7.6), and a quiet minute
produces **no frame at all** rather than a zero-volume bar (§7.2).

**What that means for this story is the thing most likely to be got wrong: a
number here ticks ONCE A MINUTE or less, never continuously.** There is no
intra-minute movement on any screen in this epic — trades cannot reach 518
symbols at all (§1.4's 30-symbol cap) and are not delivered by any story in it.
**A motion vocabulary designed against a streaming tape will look correct in a
mock and dead in production**, and the honest version has to make a once-a-minute
step feel alive rather than animating a continuum that does not exist.

**And this story owes two marks it did not originally owe**, both from §7.11:

- **An extended-hours mark.** Pre-market and after-hours bars are rendered and
  marked rather than filtered, and nothing on the frame distinguishes them
  (§7.7) — so the mark is entirely ours to invent, and Stories 3.6, 3.7 and 3.9
  consume it.
- **A treatment for _this corrected_ that is not the treatment for _this
  moved_.** The product subscribes `updatedBars`, so a displayed number can be
  replaced ~30 s later by a corrected one for the same minute (§7.8). **A
  correction is not a price movement** and must not borrow motion that says it
  is — three of fourteen corrections changed the close price, which under a
  "price moved" animation would read as a real tick that never happened.

**Plus the burst shape, which is the rate this story is actually designing
against**: about **332 bars land inside 243 ms**, once a minute (§7.4) — not a
smooth arrival.

---

## The design canvas is NOT reachable — checked 2026-09-17 by Task 3.1.9

> **SUPERSEDED 2026-09-19 — the canvas is reachable and has been written to
> twice.** Tasks 3.3.5 and 3.3.6 reached
> `Component library for MarketPulse` through `DesignSync` and added
> `Live in the chrome.dc.html` to it. **The section below is a correct record of
> what was true on 2026-09-17 and is no longer a description of the tree** — it
> is kept because the two options it names are the ones that would apply if the
> link broke again, and because ADR 0026 records the reason it was hard to find:
> the canvas is a `PROJECT_TYPE_PROJECT` and `DesignSync`'s `list_projects`
> filters to design-system projects, so it **does not appear in the listing**. A
> reader who goes looking there finds an empty result and concludes it was never
> created, which is the wrong conclusion and an easy one to reach. Its id is in
> ADR 0026.
>
> **So Task 3.4.4 designs on the canvas first**, which is ADR 0026's chain the
> right way round — and the motion row's standing debt is discharged there
> rather than recorded a second time.

`EPIC.md` warned that the `Component library for MarketPulse` canvas was not
reachable from the session that planned this epic, and asked for the question to
be answered rather than assumed. **It was answered, and the answer is no.**

`DesignSync` lists two design-system projects on this account and **neither is
it**: one is an unrelated deck, the other is empty.

**This is a broken link in a chain the product depends on.**
[ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)
makes that canvas **the source of truth for the design language** — canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components — so the first link is
currently unavailable.

**This story is the next thing that needs it**, and needs it for work that does
not exist in the canvas anyway: a motion vocabulary, an **extended-hours mark**
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11) and a **_this corrected_ treatment** distinct from
_this moved_ (§7.8).

**Two honest options, and the second needs saying out loud rather than
drifting into:**

- **Restore access** to the canvas before designing, which is what ADR 0026's
  chain assumes.
- **Design forward from `VISUAL-LANGUAGE.md`** and record the divergence. ADR
  0026 is explicit that the document is **downstream** of the canvas, so
  designing from it is a **deliberate exception** — and an exception recorded
  beside the work is a very different thing from a chain that quietly stopped
  being followed.
