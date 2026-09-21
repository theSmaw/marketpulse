# Task 3.4.5 — The vocabulary, as tokens and as rules

**Status:** **Complete — 2026-09-21.** `--motion-duration-decay: 900ms` shipped, the arrival mark is on the identity block's price and was watched at 1× against the replay, the vocabulary and its three rejected alternatives are in `VISUAL-LANGUAGE.md` and on the canvas, and **the trap is break-verified** — `pnpm break the-mark-fires-on-arrival-not-on-change`. Task 3.4.4's instrument is deleted.
**Amended:** 2026-09-21 after Task 3.4.4 — the decision, the trap inside it, the fourth token, the vocabulary's spine, and the instrument this task disposes of.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.4

## Objective

Ship the decision: the chosen treatment on the identity block's price, every
duration a token, and the vocabulary written down where the next five stories
will read it.

## What the user can see when this lands

**The first price that moves the way this product has decided prices move.**
Every remaining story in the epic inherits it.

## What is already decided and must not be re-taken

- **The treatment itself** — Task 3.4.4, with the owner. This task implements
  and does not revisit.
- **Every duration is a token; no component hard-codes one.** Three exist —
  `quick` 120 ms, `settle` 240 ms, `pulse` 1400 ms — and `VISUAL-LANGUAGE.md` is
  explicit that they are a thin first cut rather than a system.
- **`prefers-reduced-motion` is answered at the token layer**, as it already is:
  the durations resolve to `0ms` under the preference, so a consumer reading
  tokens honours it **by construction** and a consumer hard-coding `240ms` is
  the only way to get it wrong.
- **A value arriving for the first time is `settle`'s existing job** and
  probably needs nothing new. Say so rather than inventing a fourth token to be
  thorough.
- **Amended 2026-09-21 by Task 3.4.4: a fourth token IS owed, and the bullet
  above is not an argument against it.** That bullet is about the **first
  paint**; the chosen treatment is a **decay**, which is neither `quick` (a
  state change under the pointer), nor `settle` (content arriving), nor a loop.
  It is the only member of the set whose point is that it ends by
  **disappearing** rather than by arriving somewhere. Take the number here; the
  shape was taken on the canvas.

## What Task 3.4.4 decided, and the trap inside it

**The mark fires when a bar ARRIVES, not when the price CHANGES.** Open
decision 2 was answered `yes` in the same sitting, and that is what turns the
mark from _this price moved_ — which `PriceChange` already says with a glyph, a
sign and a hue — into **a bar arrived for this security**, which nothing else on
the screen says.

> **The obvious implementation silently reverses that decision, and every test
> stays green.**

A renderer that compares `close` to the previous `close` implements _mark on
change_. It is the natural thing to write, it looks correct, and **a test that
ticks a different price passes against it** — because the two implementations
only disagree on the quiet minute, which is exactly the case a test is least
likely to write.

**This is Task 3.4.1's `sameLiveFeedView` trap one level on**, and the defence
is the same shape: assert the **negative**.

> **A bar arriving with an UNCHANGED close still fires the mark.**

Two things make it implementable rather than only assertable:

- **The observation's own instant is the trigger, not its value.** §10.3 already
  requires every entry to carry its own `startsAt`, and a re-arrival for a new
  minute carries a new one — so _something arrived_ is readable without
  comparing prices at all.
- **A CSS animation does not restart when the same animation is re-applied to
  the same element.** Task 3.4.4 met this and recorded the repair: alternate two
  animations with **different names**, and do **not** reach for a React `key` on
  the block — `SecurityIdentity` animates its own arrival, so a remount replays
  _the block arriving_ on every price change, which is a fading, sliding panel
  and is the one thing `VISUAL-LANGUAGE.md`'s rule A forbids.

## The rate rule, which is a design problem before it is a performance one

**Two changes inside one animation must produce a defined result, and it must be
the one the document states** — because _every_ answer that does not state it
produces a smear.

At this story's own cadence that is rare: a symbol ticks **once a minute or
less**. But it is not hypothetical — **332 bars land inside 243 ms** once a
minute (§7.4), and Story 3.6 puts 518 of them on one screen. **Decide it here,
at one number, where it is cheap.**

## Work

- **`VISUAL-LANGUAGE.md` carries the vocabulary** with its rationale, its
  **rejected alternatives** and a **reversal trigger as a condition**. The
  rejected options are Task 3.4.4's and must not be lost between the two tasks.
- **`tokens.css` carries the durations**, and the component reads them.
- **The canvas carries it too** — ADR 0026's chain, the right way round for the
  first time on this row.
- **State the two-changes rule**, and assert it.
- **Say what a price changing is**, since the standing rule is that motion means
  work in progress: a price arriving is **a fact, not progress**, and if the
  vocabulary needs those to look different the document says how. **Task 3.4.4
  answered this and the answer is the vocabulary's spine** — record it rather
  than re-derive it: _work in progress **loops**, a state **persists**, a fact
  arriving **decays**._ It is what lets the status bar's static disc and this
  story's decaying one be the same glyph without colliding, and a fourth
  behaviour added to that set is a change to the vocabulary rather than to a
  component.
- **Dispose of Task 3.4.4's instrument**, which is this task's to do and
  nobody else's. `MotionTreatments.stories.tsx`, `motion-treatments.module.css`
  and the losing three treatments exist only to have been compared; the
  repository's rule is _run it, record the findings, delete it_, and the
  findings are already recorded in Task 3.4.4 and on the canvas. **Keep
  `data-live-figure` and `data-live-price`** — they were added so the chosen
  mark could be attached to them rather than to a generated class name, which is
  what this task now does.

## Done when

- `VISUAL-LANGUAGE.md` carries the vocabulary, its rejected alternatives and a
  reversal trigger; the canvas carries it too
- **Every duration is a token** — a grep proves no component hard-codes one
- Two changes inside one animation produce the stated result, asserted
- **A bar arriving with an unchanged close still fires the mark** — asserted,
  and it fails against a renderer that compares prices
- The treatment is on the identity block's price and was **looked at** at 1×
- **Task 3.4.4's instrument is deleted**, and the two `data-` hooks it left
  behind are what the shipped treatment hangs on
- `pnpm verify` passes

---

## What was found

### The token, and why 900ms is bounded rather than picked

`--motion-duration-decay: 900ms`, the set's fourth member and its first
**decay**.

**The number is argued from the two tokens either side of it**, which is what a
vocabulary is for — a duration invented in isolation is a duration nobody can
check:

- **Longer than `settle` (240 ms)**, which is deliberately short enough that
  _nobody waits for it_. A mark whose whole job is to be **caught** by somebody
  looking elsewhere needs more than one whose job is to go unnoticed.
- **Shorter than `pulse` (1400 ms)**, which is the duration chosen precisely so
  a reader does **not** watch it. A mark that outlived the thing designed to be
  ignored would be asking for more attention than it has earned.

**The hold-then-fade lives in the keyframes, not in a second token.** Two tokens
for one gesture is how a set of four stops being legible.

### The set is now three shapes, not four durations

| Token | Value | Shape |
| --- | --- | --- |
| `--motion-duration-quick` | 120 ms | once |
| `--motion-duration-settle` | 240 ms | once |
| `--motion-duration-pulse` | 1400 ms | **loop** — work in progress |
| `--motion-duration-decay` | **900 ms** | **decay** — a fact arriving |

> **Work in progress LOOPS. A state PERSISTS. A fact arriving DECAYS.**

That is the sentence that makes the status bar's static disc and this story's
decaying one **the same glyph two inches apart without colliding**, and it is
why the shipped mark is `--space-8` — `Marker`'s own box — rather than a new
silhouette. A fourth behaviour added to that set is a change to the vocabulary
rather than to a component.

### The trap was real, and the break is one argument

The task's own brief named it: a renderer that compares `close` to the previous
`close` implements _mark on change_, which is the opposite of what was decided,
and **every test that ticks a different price passes against it**.

The implementation keys on the observation's **instant** instead —
`useArrival(symbol, live?.startsAt.getTime())` — and the break is that one
argument swapped for the one somebody would naturally reach for:

```text
pnpm break the-mark-fires-on-arrival-not-on-change
  - const arrival = useArrival(symbol, live?.startsAt.getTime());
  + const arrival = useArrival(symbol, live?.close);

  ✓ broken → red → restored byte-identical.
    matched: fires when a bar arrives with an UNCHANGED close
```

**The assertion is the negative**, and it is the only one of the five new tests
that fails against the wrong implementation — the other four pass either way,
which is exactly why the brief insisted on it.

### Three things the implementation had to get right, and one it reversed

**1. The `key` goes on the mark, never on the block.** A CSS animation does not
restart when the same animation is re-applied to the same element, so React
replacing the node is the mechanism. Task 3.4.4 recorded why the obvious version
is wrong and it is worth repeating here: `.identity` animates **its own
arrival**, so a `key` on the block replays _the block arriving_ on every price
change — a fading, sliding panel, which is the one thing the motion rule forbids
outright.

It is also the stated answer to **two changes inside one animation**:
**restart, never queue or overlap.** There is only ever one mark node, so
queueing cannot happen by construction — and §7.8's **14 revisions in one
session** make that a real case rather than a hypothetical one.

**2. The mounted instant is remembered, so the first paint marks nothing.** A
mark on load would claim a bar arrived when the page merely opened. The instant
the component first saw is held and never advanced, so **any other instant is an
arrival** — correct whether the first bar came in the connect-time snapshot
(§11.1) or turned up a minute later.

**3. It resets on a change of symbol**, because the route does **not** re-mount
this component — Task 2.11.5 measured that. Without the reset, navigating to a
security whose price was already held would mark an arrival that happened while
somebody was looking at a different company. Asserted.

**And one line of the brief was reversed.** The amended task said to **keep**
`data-live-figure` and `data-live-price`. They were **deleted**. They existed so
an instrument *outside* the module could position a candidate against a CSS
Module's generated class name; the instrument is gone and the shipped mark lives
inside the module, where `styles.price` is the anchor. **A hook with no reader
is the exact shape Story 3.2 and Task 3.4.3 each spent a task finding**, and
this story is not adding a third. If a browser assertion later wants a handle it
adds one with a stated reason.

### Watched at 1×, on the real page, against the replay

Not inferred from a test. `MARKET_DATA_PROVIDER=replay` on `/securities/NVDA`,
waiting out a real minute:

```text
arrival-decays 0.9s   8×8   rgb(24, 28, 35)   •  219.40  ▲ +0.51%
Sep 20 · 21:06 EDT · change from 2026-09-11's close
```

**The mark clears the block's left edge by 142 px at every width** — 1440, 1024,
768 and 390 — and is never off-screen. It is absolutely positioned, so it shifts
nothing by construction, and `pnpm probe` returns the identity block at
`1392×107`, `976×107`, `720×203` and `342×219`: **identical to the figures Task
3.4.3 recorded before the mark existed.**

### The instrument is gone

`MotionTreatments.stories.tsx` and `motion-treatments.module.css` are deleted,
with the losing three treatments in them. _Run it, record the findings, delete
it_ — and the findings are in Task 3.4.4, on the canvas, and now in
`VISUAL-LANGUAGE.md`, which is where the **rejected** options had to land so a
vocabulary that records only its answer does not invite the same argument again.

## For a stakeholder — a status report, 2026-09-21

**Where the product is.** A user can explore 518 US companies and their
historical charts, the chrome says honestly whether live data is arriving, and a
price moves on its own. **As of today it moves the way this product has decided
prices move** — and that decision is now written down in the one place five more
pieces of work will read it from.

**What shipped.** The small dot you chose. When a price update arrives for the
company on screen, a dot appears beside the number, holds for a moment, and
fades. That is all it does, and the restraint is the product of a rule rather
than of taste: **a number must never be harder to read because it changed.** The
dot therefore touches nothing inside the figure — no fading digits, no sliding,
no colour wash behind the price. The price is fully legible for the whole of the
dot's life.

**The one number worth explaining.** The dot lives for **nine-tenths of a
second**, and that was not plucked out of the air. We already had two timings in
the product: a quarter of a second for *content arriving*, chosen to be short
enough that nobody waits for it, and one-point-four seconds for *a panel
breathing while you wait*, chosen so that you specifically **do not** watch it.
A mark whose job is to be **caught** out of the corner of your eye has to last
longer than the one nobody waits for, and less than the one designed to be
ignored. Nine-tenths of a second sits between them, for that reason.

**The rule underneath it is worth more than the dot.** The product now has three
kinds of movement and each means exactly one thing:

- something **looping** means work is in progress;
- something **sitting still** is a state;
- something that **appears and fades** is a fact that just arrived.

That is why the dot can be the same little circle the status bar already uses
without the two being confused — they behave differently, and behaviour is
easier to read than shape. It also means the next person to add movement is
choosing from three meanings rather than inventing a fourth.

**The mistake we specifically defended against.** The natural way to build this
is to compare the new price with the old one and show the dot when they differ.
That would have been the **opposite** of what you decided — you chose to show it
on every update, including one where the price is the same, because that is what
makes it say *this company is being fed* rather than *this price moved*. The
trap is that it looks correct, and **every ordinary test passes against it**,
because the two versions only disagree on the quiet minute. So the test we wrote
is that exact case, and we then deliberately broke the code in precisely that
way to confirm the test goes red. It did.

**One line of the plan was reversed, deliberately.** The plan said to keep two
small technical hooks that the comparison tool needed. Once the comparison tool
was deleted, nothing read them — and this project has now twice spent a whole
task discovering something that was built and never actually used. Leaving a
third behind on purpose would have been indefensible, so they went too.

**What a user can see today.** On the Security Explorer, out of market hours,
against our own recorded data: a price that changes on its own and **a dot that
tells you it is live**. That is the first answer this product has ever given to
*does it feel alive* — a question that had been answered **not yet** eight times
since the beginning.

**What is still to come in this story:** a mark for prices that arrive outside
normal trading hours, the question of what a screen reader hears, and the
measurements this story owes. And the dot is deliberately on **one number** so
far — the 518-company table and the chart inherit it, and the one open question
we have already flagged is whether nine dots a second across one page is still
calm.
