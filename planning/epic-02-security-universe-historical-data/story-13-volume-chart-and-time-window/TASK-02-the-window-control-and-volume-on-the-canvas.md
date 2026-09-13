# Task 2.13.2 — The window control and the volume plot on the design canvas

**Status:** Complete — 2026-09-13
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.1

## Objective

Decide what the **window control** and the **volume plot** look like on the
`Component library for MarketPulse` design canvas — the source of truth for the
design language since 2026-09-11 ([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md))
— and land whatever tokens fall out of it, in the chain the ADR fixes: **canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components**.

Separate from 2.13.1 for the reason 2.12.2 was separate from 2.12.1: the first
decides what the product offers, this decides the **instrument**. And before
2.13.4 and 2.13.6 rather than after them, because a control drawn first and
styled second is a row of default buttons with our colours on it, which is test 2
of the four failed exactly.

This task owns the story's two stated design surfaces, and they are not the same
kind of problem:

- **The window control** is a small, high-traffic component that Epic 8 reuses and
  Epic 11 drives. It is the first control in this product that changes what the
  data _says_.
- **The price/volume pair** is the product's first composed visualisation, and the
  story is explicit that its **proportion must be decided rather than defaulted**:
  volume is a supporting series and must not compete with price for attention.

## What the user can see when this lands

**Nothing in the application** — and something real in the canvas and the
workshop. New tokens show up on Storybook's token surfaces, including
`Foundations/Chart tokens`, which `CHARTING.md` §17.4 kept deliberately as the
place a chart mark is reviewed as a **language** before it is drawn anywhere.

## Work

- **Take the window control's positions on the canvas**, reached with
  `DesignSync`. At minimum: whether it is a segmented control, a row of buttons or
  something else; the selected state's encoding — and note the standing rule that
  **colour is never the sole encoding of anything**, so selection needs weight,
  shape or a mark as well as ink; the label idiom, which is very likely the
  existing letterspaced micro-label rather than a new one; where the control sits
  relative to the Price region's header; and what it looks like when a window
  **cannot be offered** (2.13.1's decision 6).

- **Decide the proportion of the pair.** Price and volume share an x-axis exactly
  and the grid already places the Volume region directly beneath Price at the same
  width — `SecurityExplorer.tsx`'s comment calls that the one adjacency in §8.3
  that is not a preference. What is open is the **height ratio** and what the
  volume plot keeps of the price plot's chrome: its own value scale or none,
  gridlines or none, its own time labels or the price chart's. A supporting series
  that repeats every mark of the primary one competes with it.

- **The volume bars themselves, and they are the first marks on this axis that are
  per bar.** Read `CHARTING.md` §1 and §2 before drawing anything: one element per
  bar at the cap is **9,790 plot elements and main-thread tasks of 137–254 ms**,
  and a candle body at the default window is **0.47 px** wide. So the visual
  question and the rendering question are the same question here. Decide what a
  volume column looks like **at both ends of the density range** — 0.47 px and
  ~7 px — and note that §10.3's density flag and its pair of tokens already exist
  and are not a media query (§11.1).

- **The bars are fills, and that has bitten this chart once already.** §14.5: a
  fill is opaque where every earlier mark was a stroke, which is how the uncovered
  ground painted over the axis rule, and §17.5 item 4 names the volume bars as the
  next fills this axis will carry. Decide the bars' ink **against the ground and
  against the uncovered ground**, not against white.

- **Direction, if the bars carry it.** `market.css`'s `--price-positive` and
  `--price-negative` differ by **1.009:1 under `grayscale(1)`** — hue is the
  entire difference — and a volume bar coloured by the bar's own direction is a
  mark whose meaning vanishes under a greyscale filter unless a second channel
  carries it. Decide whether volume encodes direction at all. "No" is a strong
  answer: volume is a magnitude, the price line above it already says which way
  the window went, and 2.12.5's wash was revised **on a screenshot** after four
  greyscale simulations passed against a chart that was wrong.

- **What happens between one window and the next** — the story names this as where
  test 4, _does it feel alive_, is most obviously answerable, and it has now been
  answered "not yet" twice, deferred by name to Epic 3's motion vocabulary. An
  instant swap of one dataset for another is the version that feels dead. What you
  **inherit whole** is stale-while-loading (`FRONTEND-STATE.md` §2's amendment): a
  held answer for the same request paints in the first commit, marked by a rail
  above the body — a dashed marker, a sentence, a travelling dashed hairline — and
  **no number is touched**; the settle wash plays only if a figure actually moved.
  This task's job is to decide what, if anything, the **chart** adds to that, and
  to say plainly if the answer is nothing.

- **Reserve room for what arrives later**, which is cheaper now than as three
  retrofits: Epic 5's volume baseline — the flagship demo's _"Volume 3.8×
  normal"_ line is drawn **on this plot** — Epic 8's comparison series, and Epic
  9's filing markers on the shared time axis. Reserving room means saying where
  each goes and what it displaces, not drawing it. Note §10.2 measured the
  anomaly-marker lane at **2.3 px of headroom** at the compact height, so this is
  a real constraint rather than a courtesy.

- **Land the tokens in the chain and in order.** A value enters
  `VISUAL-LANGUAGE.md` with its rationale, then `tokens.css` or `market.css`
  depending on whether it carries market meaning, then a component reads it.
  `styles/tokens.ts` throws at startup if a declared token is missing from the
  stylesheet, which is the mechanism that keeps this honest — and **no stylesheet
  is applied in the test environment**, so nothing below `pnpm e2e` can see any of
  it. Where a canvas value fails a measured accessibility floor, ADR 0026's **one
  standing exception** applies: adopt the intent, not the value, and record the
  measurement beside the token. It has fired three times.

- **Write the four tests down against a picture**, so 2.13.10 is not the first
  time anybody applies them.

## Done when

- The window control's and the volume plot's positions exist on the canvas and are
  recorded in `VOLUME-AND-WINDOW.md`, including where the canvas and this
  repository disagreed
- The pair's proportion is a decided number with a reason, not a default
- The volume mark is specified at **both** ends of the density range, and its ink
  is measured against the plot ground and the uncovered ground
- Whether volume encodes direction is decided, and if it does, the non-colour
  channel is named
- What the window transition adds beyond the inherited stale rail is decided —
  including "nothing", with a reason
- Epic 5's baseline, Epic 8's series and Epic 9's markers each have a stated place
- Any new token exists in `VISUAL-LANGUAGE.md`, in the stylesheet and in
  `styles/tokens.ts`'s declared set, in that order
- `pnpm verify` and `pnpm stories` pass

## Notes

The fence is that **this task draws no volume and no control in the application**.
A token with no consumer is fine and expected for one task; a component that
appeared in order to demonstrate a token is 2.13.4 arriving without its axis
module, its states or its measurement.

The second fence is the **readout**. The shared reading is 2.13.5's, and its
reserved height is the property §15.4 found wrong at every viewport but 1440 — a
reading wraps where the invitation does not. What this task may decide is how a
two-series reading is **laid out**; what it may not do is reintroduce a
`min-height` token as the reservation.

---

## Amended 2026-09-12 by Task 2.13.1 — one surface on this list does not exist, and one that does is missing

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) settled what the control offers,
and two of this task's inputs changed.

**The set is five members with decided labels**, so the control's width is a
known quantity rather than something the canvas discovers: `1D` `5D` `1M` `3M`
`1Y`, visible labels abbreviated and accessible names spelled out (§4d). Design
against five, not against "a small set".

**There is no unavailable-window state to draw, and this task should not invent
one.** The bullet above asks for "what it looks like when a window **cannot be
offered** (2.13.1's decision 6)". Decision 6 answered that question the other
way: **neither refusal is reachable through the control.** The calendar has 676
sessions of headroom against a widest offer of 252, and the timeframe mapping
forecloses the 10,000-bar cap for every session count from every source. So no
window in this control is ever disabled, greyed, or unaskable — which also means
2.13.6 does not need `TextField`'s `aria-disabled` + `readOnly` idiom here, and
the WCAG consequence that idiom drags with it does not arise.

**What replaces it is a state nobody currently owns: the control with nothing
selected.** §4(b) decided that the address admits any session count the server
accepts — `?sessions=7` from a hand-edited URL, and `?sessions=30` from Epic
11's `setTimeWindow` — and that the control **shows no selection rather than
snapping to the nearest**, because snapping would rewrite the user's address
into a different window. That is a real, reachable, permanent state of this
component, it is the first thing a stranger sees if they edit the address, and it
needs a canvas position: five unselected buttons must not read as broken, as
loading, or as "nothing has happened yet".

Add to **Done when**:

- The control's **no-selection** state has a canvas position and does not read as
  broken or as loading
- The selected state is designed for a set of **five** known labels, with the
  visible/accessible split of §4(d) recorded

---

## What was done — 2026-09-13

**Nothing was drawn in the application, and the fence held.** There is no volume
plot, no window control and no change to any route. `SecurityExplorer.tsx`'s
Volume region still holds the placeholder naming this story, and Task 2.13.4 is
still the first volume in MarketPulse. Three tokens shipped with no application
consumer, which the brief says is fine and expected for one task.

What exists now:

- **`Volume and window.dc.html`**, a new file in the `Component library for
MarketPulse` project — the canvas is the source of truth (ADR 0026), and it was
  added as its own file for the **scope** reason as well as the mechanical one.
  Eleven numbered sections, and the specimens are **drawn rather than
  described**: the price/volume pair at the measured 1,019 px region with the
  control in the Price header, the volume mark at four densities, the partial
  state in both plots, and the control in five states plus a greyscale pair.
  **Both series in it are real** — NVDA's 1,950 stored minute bars from
  2026-08-31 to 2026-09-04, read out of `fixtures/bar-series/dense.json`, which
  is also where §10.3's measurements came from.
- **`VISUAL-LANGUAGE.md` gained four sections** under _The chart_: the supporting
  series, the volume mark, the direction decision, and the window control — plus
  a motion paragraph, three token rows and an amendment to _Room reserved for
  what arrives later_ giving each of Epic 5, 8 and 9 a place on the second plot.
- **Three tokens**, in the chain and in order: `--chart-volume` in `tokens.css`'s
  theme block, `--chart-volume-height` and `--chart-volume-height-compact` in the
  geometry block, all three in `styles/tokens.ts`'s declared set.
- **Two new Storybook stories** on `Foundations/Chart tokens`, which
  `CHARTING.md` §17.4 kept for exactly this: the volume column at its three
  densities, and the column on all four grounds as rendered and under
  `grayscale(1)`.
- **`VOLUME-AND-WINDOW.md` Part two**, §§8–17, with every decision carrying its
  alternatives and a reversal trigger that is a condition.

### The decisions, in one line each

| Question               | Answer                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| The control's form     | A segmented control, five cells, `--control-height`, micro-label idiom                      |
| The selected state     | A 2 px **near-black** bar + weight + ink — the tab idiom without the accent                 |
| The no-selection state | Not drawn as a state. A readout beside the box always states the **resolved session count** |
| The pair's proportion  | **88 : 280** and **68 : 220** — the compact pair keeps the ratio                            |
| What volume keeps      | Axis rule, seams, one value label, the coverage treatment                                   |
| What it drops          | Gridlines, intraday times, the wash, the reference rule                                     |
| The volume mark        | **One path**, three regimes from one rule: _does a bar have a pixel of its own_             |
| The ink                | `#848995` — 3:1 against **all four** grounds a column can stand on                          |
| Direction on volume    | **No**, and a column has no geometry left to carry a second channel                         |
| The window transition  | **Nothing beyond the inherited stale rail** — two windows have no interpolable intermediate |

### The three things that were found rather than reasoned

1. **`--surface-page` does not exist as a hover ground on a raised panel.** It is
   **1.02:1 against white**. It works for a row inside a floating result surface,
   which is its only existing consumer; drawn on a control standing on a panel,
   the hovered cell was indistinguishable from its neighbours. Hover is
   `--surface-sunken`.
2. **The readout inside the box read as a sixth button.** It was drawn there
   first, on a sunken ground, and it both looked like a control and competed with
   hover for the one ground a cell can take. Outside the box, in the micro-label
   idiom, it is unmistakably a readout.
3. **A cost `CHARTING.md` §1 does not measure.** §1's constraint is an element
   _count_; the per-pixel rule reduces the volume mark at 1M from 8,190 stems and
   **158 kB** of path attribute to 726 stems and **16.8 kB**. The same arithmetic
   puts the **price line at 1M at about 103 kB**, against 24.5 kB today — and a
   line cannot take that repair without deciding what a downsampled line means.
   Nothing has measured the parse or memory cost of a path attribute that size.
   Raised rather than absorbed: `VOLUME-AND-WINDOW.md` §10.4, owed by Task
   2.13.9.

### One omission found while landing the tokens

**`--chart-filing-lane` was never in `styles/tokens.ts`'s declared set.** Task
2.12.4 declared it in `tokens.css`; Story 2.12's close recorded that all sixteen
`--chart-*` tokens had an application _consumer_ and did not check that all
sixteen were _declared_. So the one mechanism this repository has for turning a
missing token into a startup throw naming itself did not cover the token
reserving Epic 9's lane — its disappearance would have moved every tick label
14 px and thrown nothing. Added.

### `pnpm verify` and `pnpm stories`

Both pass. Note what that does **not** mean here, which is nearly everything: no
stylesheet is applied in the test environment, so `getTokens()` throws there and
colour assertions are structurally impossible. Every value in this task was
checked in a browser by a person looking at it, and that is the only level that
can.

---

## For the stakeholders — what this actually was, in plain terms

**Nothing new appeared in MarketPulse today, and that was the plan.** This is the
second of two decision-first tasks in this story, and the argument for it is the
same one that paid off three weeks ago when we designed the price chart before we
drew it: the fastest way to get a control on screen is to build it and then try
to make it look right, and that reliably produces a row of default buttons with
our colours on them.

There were two things to decide, and they are genuinely different problems.

### The time-window control

This is the first control in the product that changes **what the data says**
rather than how it looks — press `1M` and you are looking at a different month of
market history. It is small, it will be on screen constantly, and two later parts
of the product reuse it: the feature that compares two companies side by side,
and the AI, which can move the window itself while it is investigating something.

We settled that it is a **segmented control** — one box with five compartments,
`1D` `5D` `1M` `3M` `1Y` — rather than five separate buttons or a dropdown. Five
separate buttons read as five unrelated actions; a dropdown hides five options
that comfortably fit on screen behind a click, and it is the single most
generic-looking control a browser offers.

**The part worth reading about is what happens when nothing is selected**, because
that turns out to be a real and permanent state rather than an edge case. The
window lives in the web address, and the address will accept any number of
trading days — seven, thirty — including numbers the AI will ask for. We
deliberately do **not** snap the control to the nearest button, because that
would quietly rewrite somebody's link into a different window and answer a
question they did not ask. So the control genuinely can show five unselected
buttons.

Five empty buttons look broken. Our answer was not to draw a "broken" state but
to **add a small readout beside the control that always says how many trading
sessions are actually on screen** — `5 SESSIONS`, `21 SESSIONS`, `7 SESSIONS`.
Now the unselected case explains itself, and we got something else for free: it
tells the honest truth that "1 month" is not a month, it is twenty-one trading
days. The button says the approximation; the readout says the fact.

### Volume, and a problem that is visual and technical at the same time

Volume is the number of shares traded. It matters here because half of our
unusual-activity detection is a volume calculation, and the headline line in the
product demo — _"Volume 3.8× normal"_ — is a claim a user has to be able to check
by looking at a picture.

Volume sits **beneath** the price chart, sharing the same time axis. We decided
its height is **88 pixels against price's 280** — just under a third — and that
number was taken from the demo line rather than chosen by eye. If a spike is
3.8 times the normal bar, then the normal bar is drawn at one 3.8th of the plot's
height. At 88 pixels a normal bar is 23 pixels tall and you can see the
difference between "normal" and "a bit elevated". At a quarter of the height you
cannot. At half the height, volume stops being a supporting chart and starts
competing with the price.

We also decided what volume **does not** get: no horizontal guide lines, no
second set of time labels, no colour. Everything a supporting chart repeats from
the primary one is a way of competing with it.

**And there is a real engineering problem hiding inside the visual one.** A month
of minute-by-minute data is 8,190 bars in a chart about 726 pixels wide — which
is **nine bars per pixel**. Drawing one shape per bar would put nearly ten
thousand objects on the page and freeze the browser for a quarter of a second;
we measured exactly that during the price chart work. So the whole volume chart
is drawn as **one single shape**, always, whether the window holds sixty bars or
eight thousand.

The nice part is what happens at the dense end. When nine bars share one pixel,
only the tallest one can possibly be seen — the other eight are painted over.
So instead of drawing all nine we draw **the tallest one per pixel**. The picture
is byte-for-byte identical, and the drawing instruction shrinks from 158 kB to
**16.8 kB and then stops growing**, because it is now limited by how wide the
screen is rather than by how much history you asked for. Crucially, this changes
only what is _drawn_ — point at any bar and you still get that exact bar's exact
share count, to the share.

### Two decisions you might expect us to have made differently

**Volume bars are not coloured green and red.** Most finance products colour each
volume bar by whether that minute's price went up or down. We do not, for the
reason that has shaped several decisions on this product: roughly one man in
twelve cannot reliably tell our green from our red, and we measured that
converted to grey **they are the same shade**. The price chart solves this by
carrying direction as _geometry_ — the line finishes above or below a dotted
reference line. A volume bar has no geometry left to spare: it starts at the
bottom and its height already means something else. And the question is not one
anybody is actually asking — volume is a quantity, our unusual-volume measure has
no up-or-down in it, and the price line directly above already says which way
things went, three separate ways.

**Changing the window is not animated, and that is a decision rather than an
omission.** You cannot smoothly slide from "five days" to "one month", because
every frame in between would be a chart of a time window nobody asked to see. We
would be drawing four false pictures to soften the arrival of a true one. What we
did commit to is the part that actually makes an interface feel responsive: the
button lights up **in the same instant you press it**, before any data arrives;
the previous chart stays on screen with a small marker saying new data is
loading; and no number on the page moves while you are reading it.

### Why this unlocks progress

Four later pieces of the product hang off decisions taken today, and each of them
now has a stated place rather than a redesign waiting for it: the marker that
will draw _"3.8× normal"_ on the volume chart (Epic 5 — it needs no new design at
all, it reuses a line the price chart already has); the comparison view (Epic 8 —
and we have written down now, rather than discovering later, that comparing two
companies can show two price lines but **cannot** show two volume charts); the
markers showing when a company filed something with the regulator (Epic 9 — the
space reserved for them simply moves below volume); and the AI's ability to
change the time window itself, which is precisely the case that produces the
"nothing selected" state we designed for today.

### What is still not possible

You cannot see volume in MarketPulse, and you cannot change the time window. Both
arrive over the next few tasks — volume first, deliberately, because one new
series on an axis already known to be correct is a smaller problem than a control
that moves two charts at once. After that the epic's promise is met: search for a
company, open it, and inspect its recent price **and volume** history.

### One thing we are flagging rather than quietly repeating

Our own design bar has four tests, and the fourth is _"does it feel alive?"_. It
has now been answered "not yet, and not from here" **three stories running**, each
time for the same defensible reason: the hard version of that question is what
should happen on screen when a _price_ changes, and we have no live prices yet.
Epic 3 is the next epic and it brings them. But three deferrals of one criterion
is the shape of a criterion that quietly never gets met, so we have written the
count down and asked the next story's close to carry it forward — if Epic 3 ships
without answering it, that should be visible as a debt rather than as a habit.
