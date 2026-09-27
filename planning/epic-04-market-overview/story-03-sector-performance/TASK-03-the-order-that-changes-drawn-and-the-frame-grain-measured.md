# Task 4.3.3 — The order that changes, drawn — and the frame grain measured first

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.2

## Objective

**The re-order treatment moved here from Story 4.5 so it is decided on eleven
rows rather than a top-N over 518** — and it cannot be judged until one cheap
measurement is taken.

**The measurement is the prior question: do the eleven sector ETFs' bars arrive
in ONE `bars` frame, or across several of the ~16 a minute?** Four figures in one
frame is a **synchronised wave**; four across several is a **stagger the data
gives you free**. These are the eleven most liquid sector funds in the market, so
per-symbol coverage is near total and they will very likely land together — which
is the bad case. **A rehearsal that cannot say which of the two the watcher saw
answers nothing.**

And the risk this re-opens is one the canvas **accepted rather than disproved**.
`The mark multiplied by five hundred.dc.html` defends 518 simultaneous marks on
**rate**, and offers one perceptual reading — discs at full density read as
_"a vertical column that reads more like furniture than like events"_. **Neither
comfort reaches here**: the rate argument is about cost, and the texture argument
needs density that eleven rows do not have. Eleven discs in a vertical column
plus a whole-list re-order inside the same 240 ms is the gesture a page makes when
it reloads.

## What the user can see when this lands

**Nothing on the running product**, and one number written down that decides how
the next two tasks behave.

## Work

- **Measure the frame grain from the gateway, before drawing the treatment.**
  Print the evidence: **count by URL, never by event** — a browser page holds
  sockets that are not this product's, and a number with no URL beside it cannot
  tell them apart, which cost this repository a suppression, two documents and a
  task. And note the instrument trap from the same record: both browser-side
  instruments in `scripts/` drained their page buffer by **rebinding a global**
  while the page's wrapper kept pushing into the array it had closed over, so
  every drain after the first returned nothing and reported a silent socket on a
  healthy connection. Drain with `splice` in place. **Say which half the reading
  proves** — a measurement against a quiet system certifies the wiring and not
  the loop.
- **`The order that changes.dc.html`** — two events, one marked and one animated,
  and why a fourth mark was refused; the FLIP, one settle for the whole list, no
  stagger; the ordinal as the persistent record; reduced motion and what
  survives; the pointer/focus hold with `ORDER HELD`; several at once with the
  synchrony risk restated at eleven **against the measurement above**; and a live
  instrument — eleven rows, one minute, **1× by default** with 10×
  iteration-only and greyscale switches, the shape `Market proxies.dc.html` §05
  established.
- **The reversal trigger, as a condition**: _the first sitting in which a person
  reports the sector region as flashing or refreshing rather than as facts
  arriving._ And the lever named — **the disc goes, not the motion**, because a
  ranked list's aliveness is its order, where the strip needed the disc because
  four barely-changing figures need a _look_.

## Constraints handed to this task

- **Two events, and they are genuinely two.** A figure changing fires the shipped
  arrival disc, unchanged, on the shipped rule — _it fires when a bar arrives, not
  when the price changes_. A position changing is carried by **the movement**.
- **No fourth mark.** A mark saying _this row moved_ is information a reader can
  only use by remembering where it was, which is the thing they cannot do. The
  travel carries both positions; the printed ordinal is the record.
- **A row can mark without moving, and move without marking.** The second is the
  correctness argument: its neighbour's bar arrived and overtook it, and **this
  row received nothing** — so marking it with the arrival disc would claim data
  that did not arrive.
- **`--motion-duration-settle` (240 ms), not a new limb.** The token's own job is
  _"content arriving — long enough to be seen as an arrival and short enough that
  nobody waits for it"_, and a row that arrived somewhere new is content
  arriving. The vocabulary's three limbs describe what a **mark** does.
- **Transform only, and DOM order equals visual order.** Animating `top`, `order`
  or `grid-row` is per-frame layout on the page §28 can least afford it — and
  re-ordering with CSS while the DOM stays put hands a screen reader a
  **different ranking** from the one drawn, invisible to axe, to jsdom and to a
  screenshot.
- **Rows keyed by `symbol`, never by index**, or React rewrites nodes rather than
  moving them and destroys hover, focus and any in-flight decay.
- **Clear the transform without relying on `transitionend`.** Under reduced
  motion the token is `0 ms` and a zero-duration transition may not fire one,
  leaving a row stuck under a transform — the identical class of defect to the
  missing `opacity: 0` base, failing in the same direction: a reader who asked
  for less motion gets a permanently displaced row.
- **The hold is `stateMark`'s third consumer** — _a state PERSISTS_ — and the
  first time that limb has been used for something a reader caused.

## Done when

1. The frame grain is measured, with a frame quoted verbatim and its URL beside
   it, and the instrument deleted
2. The drawing says whether eleven marks plus a re-order is a wave or a stagger,
   **on the measurement rather than on reasoning**
3. Its instrument runs at 1× by default and honours `prefers-reduced-motion`
4. The reversal trigger is written as a condition, and names the disc as the
   lever
5. Reduced motion's surviving channel is drawn, not asserted
