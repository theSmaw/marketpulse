# Task 3.9.3 — The seam, the partial bar, and treatments on a real edge

**Status:** **Complete — 2026-09-24. All three decisions are NO**, each with a measurement behind it and a reversal trigger. So **Task 3.9.4 has nothing to draw and is deleted**. The measurement that decided them also found the thing this task did not go looking for: **the loudest motion this chart has is not the arriving point — it is the whole line shifting when a new extreme lands**, which carries real information and which nothing names. And it caught a hole in Task 3.9.2's evidence: that spec asserted the chart's **sentence**, not its **picture**, and the two disagreed for twenty minutes before the instrument turned out to be the thing that was wrong.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.2

## Objective

Settle this story's two open decisions **in front of a chart that is actually
extending**, and take the seam decision with them. Story 3.4's rule governs what
is added here: **work in progress LOOPS, a state PERSISTS, a fact arriving
DECAYS.**

## What the user can see when this lands

**Nothing yet.** This is the argument and the artefacts; 3.9.4 draws the result.
That separation is Story 3.4's (3.4.4 decided, 3.4.5 tokenised, 3.4.6 drew) and
it exists because a treatment argued and shipped in one change is a treatment
nobody compared.

## Three decisions, each with what makes it hard

**1. Is the minute in progress drawn as a bar?** Open decision 1. It is a real
observation of an incomplete minute, and drawing it identically to the 389
complete ones is a small false impression of exactly the family ADR 0029
refuses — _a claim about data requires data_. Against that: a chart whose last
point flickers in and out of existence every minute is worse than one that is
slightly optimistic, and the figure beside it in the identity block has already
made the same claim without hedging. Task 3.9.1 narrowed this: the **store**
never holds a partial minute (the writer holds it back), so a partial bar exists
only in the browser and only for the page that is open.

**2. Is the seam between stored and live drawn at all?** The story's own design
bar states the risk in both directions: _a seam drawn too loudly turns a
provenance fact into a decoration; drawn too quietly it is a claim the chart is
not making honestly._ Note what the seam is **not**: it is not where the data
becomes less trustworthy — both stretches are real bars — it is where the
**tape** changes, and the source note already says that in words with counts.
A second rendering of one fact needs an argument, and _one fact has one home_ is
this repository's rule.

**3. Does the edge mark?** The `[data-arrival]` handle is shared — the identity
block and all 518 table rows carry it, and a page-wide count on
`/securities/:symbol` already counts two. A third is free to build and is a
claim about attention. Task 3.6.2 measured that the mark is **not** the cost at
518 rows, so this is a design question and not a performance one.

## Work

- **Check `DesignSync` first.** ADR 0026's chain is canvas → `VISUAL-LANGUAGE.md`
  → `tokens.css` → components, and the canvas has been unreachable for this
  login twice (Stories 3.7 and 3.8 both recorded it). If it is reachable, this
  is the first story since that genuinely needs it; if not, record the third
  occurrence and work from the document
- Treatments **on the real component**, at 1×, against a real extending chart —
  a recording of a session is acceptable and a static mock is not
- Design artefacts in the Claude Design project, reusing `tokens.css` and the
  `preview/_card.css` idiom the `Universe table` group already established.
  **Prefer reuse to invention**
- The three decisions written down with their rejected alternatives and a
  reversal trigger each, as a **condition** rather than a story number
- A reading of how the two-feed source note and any drawn seam sit together,
  because between them they are two renderings of one fact

## Done when

1. Three decisions taken, each with alternatives and a trigger
2. Artefacts exist and reuse the language rather than extending it
3. Nothing is on screen, and the task says which task draws each decision

---

## Amended by Task 3.9.1 — 2026-09-24: one of the three decisions is withdrawn

**Decision 1 — _is the minute in progress drawn as a bar?_ — is gone.** There is
no minute in progress on the wire: `LIVE-DATA.md` §7 measured that a bar arrives
about half a second after the minute it describes has **ended**, and
`live-bar-writer.ts`'s `isComplete` is a guard against a bar stamped in the
**future** rather than a completeness test. Nothing partial reaches the store or
the browser.

**What takes its place is narrower and is a drawing question rather than a
domain one:** the last bar's numbers change about thirty seconds after it is
drawn, on 0.064% of bars, a third of which move the close. Whether that
correction is visible — a mark, a transition, or deliberately nothing — is the
decision to take here, and it is **not** the same as marking an arrival: the
bar was already there.

**And a measured constraint for decision 2, the seam.** The gaps on either side
of any seam are **invisible**, by design: `ERIE` drew 131 bars and `NVDA` 390
over one session, both the full width of the frame, at 4.3 px and 2.1 px a slot.
So a seam drawn as a break in the line would be the only break on a chart that
hides thirty-odd others, which is a stronger argument against drawing it than
this task's file originally carried.

## What was decided — 2026-09-24

### First, the measurement, because all three decisions turn on it

Taken against the **real components** on a local pair, at 1440 × 900, by
pushing a held-back **recorded** bar through the socket and reading the drawn
path either side. Not a mock and not a still.

| Window                                  | Bars  | Plot    | **Pixels a new minute buys** |
| --------------------------------------- | ----- | ------- | ---------------------------- |
| a 57-bar answer                         | 57    | 833 px  | **14.1 px**                  |
| a real session (production, 2026-09-23) | 390   | ~833 px | **2.1 px**                   |
| five sessions of minute bars            | 1,947 | 833 px  | **0.4 px**                   |

**And nothing slides.** Every existing point moved **0.00 px** horizontally in
every case. The axis is built from the **requested window** rather than from the
bars, so an arriving minute fills the next slot and the line behind it does not
move — which removes a whole objection nobody had yet raised and is worth
having in writing.

**But something else moves, a lot.** When the arriving bar is a new high or low
the **value scale re-ranges and every point shifts vertically**:

| Window          | The new extreme         | Median shift | Largest     |
| --------------- | ----------------------- | ------------ | ----------- |
| five sessions   | 0.2% above the old high | **2.4 px**   | **4.9 px**  |
| a 57-bar answer | 0.4% above the old high | **26.8 px**  | **77.2 px** |

### Decision 1 — the seam between stored and live is NOT drawn

**Three reasons, in the order they decide it.**

**One fact has one home.** The source note under the chart already names each
stretch, in contribution order, with its bar count and — for a single venue —
the sentence saying what that means. A drawn seam is a second rendering of
exactly that fact, and this repository's rule (ADR 0029) is that a drawn
sentence and its spoken twin are one string with two renderings, not two facts.

**A break in this line would be the only break on a chart that hides dozens.**
Task 3.9.1 measured that the session-ordinal axis closes gaps up: `ERIE` drew
131 bars and `NVDA` 390 over one session, both the full width of the frame. A
chart that draws the tape change as a discontinuity, while thirty missing
minutes on either side of it are invisible, teaches a reader the wrong lesson
about what a discontinuity means here.

**And the seam is not a trust boundary.** Both stretches are real bars from the
same vendor; what differs is the venue, which is a matter of _coverage_ rather
than of _quality_. `VISUAL-LANGUAGE.md`'s own warning applies in the direction
that decides it — _a seam drawn too loudly turns a provenance fact into a
decoration_.

**Rejected alternative**: a hairline vertical rule at the changeover, in
`--chart-seam`, which the token layer already has for the session boundary.
Rejected because that token means _a session ended here_, and giving it a
second meaning on the same axis is how a vocabulary stops being one.

> **Reversal trigger, as a condition.** The first time a served window holds a
> stretch whose provenance the source note **cannot** express per stretch — a
> third tape, a different adjustment, or a stretch the note is forced to
> summarise. Then the picture is carrying a fact the words have dropped, and
> the argument above inverts.

### Decision 2 — the live edge does NOT mark

**The measurement decides it.** A mark says _look here, this changed_. What
changed is **0.4 px** at the default window and **2.1 px** on a single session.
A 900 ms disc drawing attention to two pixels is a treatment whose subject
cannot be found once it has finished pointing.

**And the event is already marked, on the same screen, inches away.** Story
3.4's disc fires beside the identity block's figure when a bar arrives for this
security — the same event, the same instant, the same `[data-arrival]` handle.
A third home for one fact on one page is the rule broken twice in one
paragraph.

**Rejected alternative**: a disc on the last point, decaying over 900 ms, using
the shipped token. Drawn on the card so the argument has something to be about.
It is on the canvas as a **rejected** treatment rather than a future one.

> **Reversal trigger, as a condition.** The first surface in this product where
> a bar arrives and **nothing else on the same screen marks it** — a
> chart-only view, a comparison chart with no identity block, or a workspace
> pane an agent has opened. Then the chart is the only thing that can say a
> bar arrived, and it must.

### Decision 3 — a correction is NOT drawn either

Task 3.9.1 replaced the withdrawn partial-bar question with this one: the last
bar's numbers change ~30 s after it is drawn, on **0.064%** of bars, **35.3%**
of which move the close.

**No treatment**, and the reason is the measurement above rather than the rate.
When a correction moves the close **inside** the existing range, the line
changes by a pixel or two in one slot. When it moves the close **outside** it,
the value scale re-ranges and **every point on the chart moves** — median
2.4 px, largest 4.9 px at the default window. So a mark on the corrected point
would draw attention to the quietest version of the event and leave the loudest
one unnamed, which is worse than drawing nothing.

> **Reversal trigger, as a condition.** The first measurement of the live tape
> putting corrections above **1% of bars**, or the first report of a reader
> noticing a figure change under them. §14.1's 0.064% is one session on one
> plan and has never been re-taken from our own store.

### What the measurement found that this task was not looking for

**The chart's loudest motion is the re-scale, it carries information, and
nothing names it.** A new session high or low moves the whole line; the reader
sees the most dramatic thing this chart does and is told nothing about why. It
is not this task's to fix — naming an extreme is a different feature, it
belongs beside the anomaly marks `PRODUCT_SPEC.md` §8.3 already reserves room
for on this screen, and inventing it inside a task about a seam would be the
opposite of what these decisions are for.

**Recorded on the canvas and handed to Epic 5** rather than left to be
rediscovered.

### The consequence: Task 3.9.4 is deleted

Three decisions, three noes, so **there is nothing for _The vocabulary applied
to the edge_ to apply.** The task is deleted rather than left to be opened and
closed empty, and `STORY.md`'s table says why. Its one real obligation — a look
at four viewports with the feed running — already belongs to Task 3.9.9, which
owns `pnpm probe` with the market open.

**This is the second task in two stories where the answer was to draw
nothing**, and it is worth saying plainly that these are not the same
conclusion reached twice by reflex: Story 3.4 argued four treatments against a
moving price and **shipped one**. Here the measurement says the thing a
treatment would point at is two pixels wide and already has a marker three
inches above it.

### And a hole in Task 3.9.2's evidence, found by trying to use it

`security-live-edge.spec.ts` asserted that the chart **says** it is drawing one
more bar. It did not assert that the chart **draws** one. For twenty minutes
this task could not tell whether the line had grown, because the spoken
sentence said 61 and the path held 60 — and the difference turned out to be
**the instrument**: a bar invented one minute after the fixture's last landed on
a **session close**, an instant `timeAxis` gives no slot, so the sentence
counted a bar the picture could not place.

The product was right and the test was incomplete. Both are repaired here:

- The spec now asserts the **drawn point count** beside the sentence.
- It serves a **prefix of a recorded session** and pushes the held-back bars
  over the socket — which is exactly the split production is in, and which
  makes every instant a real trading minute with a real slot.
- And it waits for the answer before pushing. The version on `main` did not,
  and **CI caught it**: it passed locally every time and failed on a loaded
  runner, because a frame sent in the same tick as the navigation reaches a
  socket nobody has asked for yet. Same shape as the flake Task 3.8.9 repaired,
  same repair.

### `DesignSync`, for the third time

The two writable projects are `Ida's / Charlotte Puxley Design System` and
`Design System`. **The MarketPulse canvas is not among them**, as Stories 3.7
and 3.8 each recorded. This is the third occurrence and the story Story 3.8's
close named as the one that would genuinely need it. ADR 0026's chain is
downgraded rather than broken; `VISUAL-LANGUAGE.md` is the working source and
nothing here adds a token.

`preview/price-chart-live-edge.html` is updated in place: its fourth section is
now the **rejected** treatment with the measurement that rejects it, and a
fifth section carries the re-scale finding.

## For a stakeholder — a status report, 2026-09-24

### What this was

**We asked three design questions about the moving chart and answered no to all
three.** Then we deleted the task that was going to build the answers.

That sounds like nothing happened. What actually happened is that we measured
the thing first, and the measurement made three decisions obvious that would
otherwise have been taste.

### The question

Yesterday the chart started extending while you watch it. This task asked what,
if anything, should be _drawn_ to help you see it:

1. Should there be a visible join where our stored history ends and today's live
   data begins?
2. Should the newest point be marked as it arrives?
3. When a price is corrected a few seconds later, should that be shown?

### The measurement that decided it

We pushed real recorded market data through the real chart and measured what a
new minute actually does to the picture.

**A new minute is worth about two pixels.** On a single trading day it is
**2.1 px** wider. On the default view — five days of minute-by-minute prices —
it is **0.4 px**. Less than half a pixel.

So a marker pointing at "the bit that just arrived" would be pointing at
something smaller than the marker. And the same event is _already_ marked,
clearly, by the small disc beside the large price at the top of the same
screen — three inches above the chart.

**That decided questions 2 and 3.** Question 1 went the same way for a
different reason: the note under the chart already lists each data source in
words, with counts. Drawing it again as a line on the picture would be saying
one thing twice — and it would be the only visible break on a chart that
routinely hides dozens of quiet minutes without drawing anything at all.

### Every "no" comes with the condition that would reverse it

We do not record decisions as permanent. Each of the three is written down with
the specific circumstance that would make us revisit it — for example, **the
first screen where a price arrives and nothing else on that screen marks it.**
The moment this chart appears somewhere without the price block above it, the
answer to question 2 changes, and the note says so.

### The thing we were not looking for

**The most dramatic movement this chart makes is not the new point at all — it
is the whole line jumping when a new high or low arrives**, because the scale
has to re-range to fit it. We measured that too: every point on the chart moves,
by an average of 2–3 pixels and sometimes far more.

That is real information — a stock just hit a new high for the day — and
**nothing on the screen says so**. It is the loudest thing the chart does and
the least explained.

We did not fix it here, deliberately. Naming a new extreme is a different
feature; it belongs next to the "unusual activity" indicators this screen
already has space reserved for. It is written down where that work will find it,
rather than left to be discovered twice.

### And a hole in yesterday's work, found by using it

Yesterday's test checked that the chart **says** it is drawing one more price.
It did not check that the chart **draws** one.

For twenty minutes today those two things disagreed, and we could not tell
whether we had shipped a broken chart. It turned out the chart was right and
our measuring tool was wrong — it was asking for a price at a minute the market
is closed. But nothing in our tests could have told us which.

Both are now fixed. The test checks the picture as well as the words, and it
feeds the chart a genuine recording split in two — part served as history, part
delivered live — which is exactly the situation a real page is in. We also
fixed a timing fault in it that our build server caught and our own machine
never did.

### Where the product stands

**Three of nine tasks done**, and one deleted — the story got shorter twice this
week, both times because looking first showed there was less to build than the
plan assumed.

**What you can see:** a chart that extends while you watch it, with no
decoration on it, which is now a decision rather than an absence.

**What is next:** making the newest minute readable with the keyboard and the
crosshair, and the ledger that says which data came from where.
