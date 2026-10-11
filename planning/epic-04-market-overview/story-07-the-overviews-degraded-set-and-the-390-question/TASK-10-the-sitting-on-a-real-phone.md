# Task 4.7.10 — The sitting, on a real phone

**Status:** Not started — **needs a session: Monday 2026-10-12 09:30 ET at the earliest**
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.4, 4.7.5, 4.7.8, 4.7.9

## Objective

**AC 5b.** The epic says this item is owed a **person** before the epic ships a
screen, and no instrument can answer it.

## What the user can see when this lands

**Nothing new** — but what is on the screen will have been looked at by
somebody on the device it is hardest on.

## Work

### The protocol, in this order, because each step destroys the next one's evidence

1. **Before touching anything, photograph the whole page at 390 and scroll to
   the foot.** How far below the figures is the source note's instant? Do this
   first, because once you know you cannot un-know it while judging step 5.
2. **Hold the phone at reading distance and do not scroll.** Which regions are
   on screen at rest? Confirm the first figure a reader meets is a **count**,
   not a price — the ≤860 order puts breadth first.
3. **Find a mover row whose name clips.** At arm's length, does the `…` read as
   an ellipsis or as punctuation inside the name? Invisible to greyscale and to
   `textContent`.
4. **Find `FOXA` or `NWSA` if the day offers one** — both will be in the same
   list or neither. Measured over all 518 names: at a 24-character cut there
   are **zero** prefix collisions; at 22 there are exactly **two**, and they are
   `Fox Corporation Class A/B` and `News Corporation Class A/B`. Both pairs sit
   within one glyph of the stated capacity and **both are dual-class listings
   that move together**, so they genuinely co-occur in one list. Does the class
   letter survive? The ticker track is separate and the link's accessible name
   is the ticker, so this is a **visual** ambiguity rather than a broken link.
5. **Then take the network away and start a stopwatch.** For 165 s the subject
   is _do you notice anything at all while reading a figure_ — performed
   **mid-page with figures in view**, not with the footer deliberately in frame.
   At t=165 s the bar goes **four wrapped lines to six** and the page moves;
   record whether that is noticed peripherally or only on inspection.
6. **Restore the network and watch what the reconnect does to the figures.**
   This is the state Task 4.7.3 repaired; the sitting is the only instrument
   that can say whether the repair reads as nothing happening.
7. **Repeat 5–6 with Reduce Motion on.** Every disc is `0 ms` at the token
   layer, so this is the state in which `/` has **no per-row liveness signal
   whatsoever** and a re-rank teleports. The surviving carrier is the rank
   number, and whether that reads as _this moved_ is a person's call.
8. **Last, the focus ring at 1.20 px clearance** over the price ink, identical
   at all four widths. At 3× density on glass, in daylight, **is 1.2 px a ring
   or a touching line?** Story 4.6 called it _a pass, not a comfort_ and warned
   the repair is a grid change rather than a padding change.

### Two things the sitting is the only instrument for

**The 2,000 ms floor has never been met on a real network.** It is derived from
first-frame times of **174–277 ms against a local pair**; on cellular
mid-session the first frame may exceed it, in which case the terminal sentence
appears and is **then replaced by figures**.

**And a backgrounded tab.** `use-live-feed.ts` runs its read on a 5 s interval
**ungated by visibility** while the retry **is** gated, and browsers throttle
timers in a background tab to ≥1 minute. So a locked phone in a tunnel — the
actual 390 scenario — gets a word that lags by up to a throttled tick **and
does not redial at all** until `visibilitychange`. **No figure exists for
this.**

### Nothing synthetic reaches the deployed site

The sitting is against the **real deployed product and the real feed**. A
fixture or replay provider must never be pointed at it, at any hour.

## Done when

1. A person has performed all eight steps on a real phone during a real
   session, including a network loss and a restore
2. `LIVE-REHEARSAL.md` carries the row, with the note saying what a row of this
   kind may claim
3. The 2,000 ms floor and the backgrounded-tab behaviour are answered or
   recorded as still unanswered with the reason
4. Either a repair is made or **a written statement of why the current shape is
   right**, which is AC 5's own wording

---

## Handed here by Task 4.7.4 — 2026-10-11: two of the seven regions now date themselves, which is the 390 argument's own subject

Written here rather than linked.

**1. The sitting's step about scrolling for an instant has changed.** This
task's brief rests on the measurement that at 390 the page is 2,565 px and the
one screen-level instant — the source note's `Observed through` — is roughly
2,500 px below `Market breadth`, behind three reserved panels. **It no longer
is the only one**: both `Market breadth` and `Movers` state how far their own
observations reach, in their own footers, in the breadth-first order that puts
them near the top. So the question for the phone is no longer _can a reader
find an instant_ but **whether the one in front of them reads as an age rather
than as a verdict** — and whether a third line of micro text at 308 px wide is
legible held at arm's length, which is a thing only a person with a phone can
answer.

**2. Both regions are 16 px taller at 390**, in every state, because the
footer reserves three lines rather than two — the age wraps to a third line at
that width and to none at 768 and above. The page is correspondingly longer;
re-measure its height during the sitting rather than citing 2,565.

**3. The age is ABSENT, not empty, when nothing has been observed.** On a
deployment with no provider and in the first seconds after a restart there is
no sentence at all, and that is the designed answer — _say nothing rather than
say now_. If the phone shows a region with a two-line footer and a reader asks
_when_, the honest answer is that nothing has reached us yet, and whether the
silence communicates that is a listener's and a reader's judgement rather than
a check's.

## Handed here by Task 4.7.2 — 2026-10-10: at 390 the 390 question is a TWO-CORNER question, with the figures to put in front of a person

**Measured, not argued.** Over the five content surfaces — the proxy strip, the
sector ladder, the breadth ledger, the movers pair and the source note —
`the market is shut`, `the feed has stopped` and `the backend is gone` are
**byte-identical at 390**. The entire difference is carried by two cells at
**opposite corners** of the viewport: the masthead's session word
(`CLOSED · Weekend`, top right) and the status bar's connection word
(`DISCONNECTED`, bottom, sticky). A reader at 390 must consult both corners,
and the sitting should ask whether anybody does.

**The size signal, measured as the sticky bar's own box at 390** (two runs,
identical):

| state                          | footer height at 390 |
| ------------------------------ | -------------------- |
| `LIVE` + `HEALTHY`             | 109 px               |
| `STALE` + `HEALTHY`            | 131 px               |
| `DISCONNECTED` + `HEALTHY`     | **149 px**           |
| `DISCONNECTED` + `UNREACHABLE` | **169 px**           |

So the feed stopping grows the bar by **40 px** of a 780 px viewport (5.1%),
and a full outage by **60 px** (7.7%). At 1440 the same transition is **2 px** —
so whatever the sitting concludes about peripheral vision at 390 says nothing
about a desk, and the reverse. **It is a height and not a line count**: nothing
mechanical here counts wrapped lines, and `innerText` is identical however the
sentence wraps, which is one more reason the person is the instrument.
