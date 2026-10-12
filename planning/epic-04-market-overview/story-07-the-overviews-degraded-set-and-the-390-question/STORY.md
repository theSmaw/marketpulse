# Story 4.7 — The Overview's Degraded Set, & the 390 Question Answered

**Status:** **Ten of eleven tasks complete — 2026-10-12. Five of the six acceptance criteria are MET and ONE ROW is owed: AC 5b, the sitting on a real phone during a real session (Task 4.7.10), which needs a calendar and nothing else.** ACs 1, 2, 3, 4, 5a and 6 are met, each with its evidence in the close below — thirteen states at four widths in colour and greyscale through the shipped socket path, a collision assertion over declared classes that fired in both directions, a gateway that serves its last broadcast aggregate on a fresh join, two regions that state the instant their window ended, **no second connection word (AC 4 is met by the owner holding Story 3.10's one-home rule)**, the 165 s threshold kept with the keepalive re-derived to 55 s, and eleven break entries each proven red. Three of this file's own premises were falsified at Gate 1, **four more by the tasks, and two by the briefs rather than by any measurement** — all corrected in place with the dated records left standing.
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.8 — **re-ordered 2026-09-27**, see below
**Epic scope covered:** live market status indicators, on the screen where they matter most

## Description

**Epic 3 enumerated the degraded set once, produced rather than imagined —
nine states, four widths, six surfaces compared by string. This story inherits
it rather than re-inventing it**, which is what this epic's `EPIC.md` says in
as many words.

**Three rules travel with it**, each somebody's measured defect: `FeedStatus`
is about the **connection** and `MarketSessionStatus` about the **session**,
and they must not be collapsed; **a quiet security is not a broken feed**; and
**the connection has one home** — the status bar — with every other surface
quiet by decision.

**But this screen is different from a security page in one way that matters.**
A security page showing a stale price is wrong about one name. **An overview
showing stale aggregates is wrong about the market**, and its whole claim is
_right now_. So the question this story answers is not _does the chrome say
the feed stopped_ — that is settled — but **what should four regions of
aggregates do when the thing they aggregate has stopped arriving?**

> **And the item `EPIC.md` says is owed a person BEFORE this epic ships a
> screen**: at 390 the status bar is the only surface that tells _the feed
> stopped_ apart from _the market is shut_, and it is at the foot of the
> viewport. Story 4.1 asked the question; **this story answers it**, with a
> real phone during a session, and repairs it if the answer is that nobody
> notices.

## What the user can see when this story lands

**A landing page that is honest when its data is not arriving**, in the
product's established words: the figures that were true stay on screen with the
instant they were true at, nothing pretends to be current, and no region
becomes an error message because a feed dropped.

**And on a phone, a reader can tell the difference between a quiet market and a
broken feed** — which today they cannot, and nothing mechanical can see it.

## Why it sits here in the sequence

**After the screen is complete and before anybody rehearses it.** The degraded
set is produced by walking a finished screen through its states; doing it
earlier means doing it twice, and doing it later means shipping a screen whose
worst states nobody has seen.

## Acceptance criteria

1. The overview's degraded states are **produced** — through the shipped socket
   path, not furnished — and photographed at 1440, 1024, 768 and 390, including
   in greyscale
2. **No two states read identically**, compared by string rather than by eye
3. Killing the feed changes no figure and raises no page error; every region
   keeps what it had with the instant it belongs to
4. The connection still has **one home**, and this screen adds no second
   connection word — or, if it must, the decision is recorded against ADR
   0029's fourth rule with a measurement behind it
5. **The 390 question has an answer from a real phone during a session**, and
   either a repair or a written statement of why the current shape is right
6. `pnpm break` entries for anything this story adds, run and red

## Design work

Inherit `Degraded states.dc.html` and `Failure and partial states.dc.html`
rather than starting a new vocabulary; **add only the states the overview has
that a security page does not** — chiefly a region whose aggregate is over a
map that has stopped growing.

## Out of scope

Changing the thresholds (165 s monotonic, 60 s wall — ADR 0036), and the
connection's home.

## Amended by Task 4.1.7 — 2026-09-25: the 390 question is answered, and it turned into a different one this story owns

**The question this story inherited was _does a reader notice the status bar
change at 390_. Measured on the deployed site, the answer is that for the first
165 seconds there is nothing to notice.**

### The measurement

A client at 390 × 780 with its network removed — airplane mode, a lift, a
tunnel — keeps reading **`LIVE`**:

```text
t=0s   connected: LIVE
t=20s  LIVE   … t=160s LIVE
t=165s DISCONNECTED
```

**Exactly 165 s, and the mechanism is not a mystery.** `DISCONNECTED_AFTER_MS`
is the monotonic watchdog — _no inbound frame of any kind for 165 s_
(`LIVE-DATA.md` §11.2, ADR 0036) — and it governs the **browser's** view as
well as the backend's. The socket closing does **not** flip the word: the
client detects that immediately and uses it only to start reconnecting.

**Two things the same run established, and both make the fold story weaker:**

- **The status bar is sticky**, so it is on screen at 390 whatever the scroll —
  Task 3.11.8 measured that and this confirms it.
- **When it does flip it GROWS**, four wrapped lines to six, and
  `BACKEND SERVICE` goes `UNREACHABLE` beside it. That is a size change that
  moves the page, which is a **stronger** peripheral signal than a word change.

### The decision this story owes

**165 s is defensible and it was derived for a different socket.** The number
comes from Alpaca's upstream heartbeat — 53.96–54.85 s across 82 intervals,
three missed — and it protects against flapping during a deploy, which
Task 3.11.6 measured at **~46 s** of feed outage. Both of those are about the
**backend's** connection.

**The browser's socket has its own heartbeat and its own failure mode.** Task
4.1.6 measured the gateway sending a `feed` frame every **20–50 s**, unchanged,
precisely so a quiet market still produces inbound traffic — which means the
browser could detect a dead gateway socket **far sooner than 165 s** and still
not cry wolf on a 46 s deploy.

**The alternatives, priced:**

|                               | Says `DISCONNECTED` after | Flaps on a 46 s deploy? |
| ----------------------------- | ------------------------- | ----------------------- |
| today                         | **165 s**                 | no                      |
| a shorter browser threshold   | ~75 s                     | no                      |
| retries failing for N seconds | ~60 s                     | no, if N > 46           |
| the socket closing            | immediately               | **yes**                 |

> **Whatever is chosen, it is a decision about a shipped vocabulary with one
> home**, so it carries ADR 0036's rule: the two-clock shape is the durable
> half and **the numbers are dated observations that get re-derived, not
> tuned.** A browser-side threshold is a _third_ number and needs its own
> derivation from the gateway's heartbeat rather than a fraction of this one.

### And what is still a person's

**The sitting is booked for the session of 2026-09-25**, on `/securities`
rather than on `/`: the landing page has no moving figures until Story 4.2, and
_do you notice it while reading a figure_ needs a figure. Task 4.1.7 carries the
protocol.

### One data point for the table above, taken overnight — 2026-09-25

**A browser's experience of a deploy is nothing like the backend's.** Across the
rollout of 2026-09-25T12:34Z, a page on the deployed site read:

```text
12:28:13  LIVE
12:37:40  DISCONNECTED
12:37:45  LIVE
```

**Five seconds**, against the **45.8 s / 46.5 s** the backend's upstream socket
was refused. They are different quantities and the difference is the point: the
gateway's new replica serves browsers long before its own feed is connected, and
the browser's reconnect is **500 ms on `1001 going away`** by design (Task
3.5.5).

> **It is a coarse reading and it is labelled as one**: the word was sampled
> every five seconds, so `≤ 5 s` is the resolution rather than the measurement,
> and the frame log that would have given the exact inter-frame gap was
> **broken at the time** by the drain defect found the same night. The fixed
> instrument is running and the next deploy gives the precise figure.

**What it already changes about the options**: the row that says _the socket
closing → flaps on a deploy_ is the one to re-examine. If a deploy costs a
browser five seconds rather than forty-six, then reporting on the socket's own
state may not flap at all — and the threshold conversation is about a phone in
a tunnel rather than about our rollouts.

### And the figure the table was missing — 2026-09-25, overnight

**On an idle connection out of hours, a browser's longest silence between
inbound frames is 54.0 s.** Measured over 5.5 minutes on the deployed site with
a fixed instrument: **17 frames — 3 snapshots, 12 `feed` heartbeats and 2
`bars`** (extended-hours prints), longest gap **54.0 s**.

**That 54 s is not a coincidence.** It is the upstream Alpaca heartbeat —
53.96–54.85 s across 82 intervals, `LIVE-DATA.md` §6.3 — arriving at the
browser as a `feed` frame. **The gateway's quiet-market traffic is paced by the
vendor's heartbeat**, so the browser's floor is the same number the 165 s
threshold was derived from, seen from one hop further away.

**So the three numbers the decision needs now exist:**

|                                                 | Measured                 |
| ----------------------------------------------- | ------------------------ |
| longest browser silence, **idle, out of hours** | **54.0 s** (n = 5.5 min) |
| browser's visible outage **across a deploy**    | **≤ 5 s**                |
| the watchdog                                    | **165 s**                |

> **165 s is a 3× margin over the worst thing a healthy browser does**, and the
> deploy it was protecting against costs a browser five seconds rather than
> forty-six. A browser-side threshold around **90 s** would keep a 1.6× margin
> on the idle gap and still not flap — and would halve the window in which a
> phone in a tunnel is told its prices are live.
>
> **This is one 5.5-minute sample and it says so.** ADR 0036's rule is that
> these numbers are dated observations to be re-derived rather than tuned, so
> the decision owes a longer idle sample — and the instrument that takes it now
> works, which it did not this morning.

**Amended 2026-10-12 at Story 4.7's close (the measurement is Task 4.7.7's,
2026-10-11). Every figure in the table above is a dated 2026-09-25 record and
stands as one; the two CONCLUSIONS drawn from it are withdrawn:**

- **The `54.0 s` idle floor WAS THE DEFECT.** `apply()` notified
  `onConnectionChange` on the vendor's `ping` as well as on every item of an
  inbound message, so the 54 s the browser was measuring is Alpaca's own
  heartbeat seen one hop away. The repair gates the publish on the **published
  view** changing, which removes the vendor's heartbeat from the browser's
  inbound stream altogether — so the browser's idle floor is **our keepalive**
  and nothing else.
- **The `3×` margin and the `~90 s` candidate go with it.** Against a 120 s
  keepalive 165 s is **1.375×**, not 3.06×, and **90 s would fire on every
  healthy idle browser**. The decision taken instead was to re-derive the
  **keepalive**: `KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3` = **55 s**,
  which makes 165 s three missed heartbeats of **our own** heartbeat.
  `DISCONNECTED_AFTER_MS` is **unchanged at 165 s** and could not have moved —
  the same constant arms the backend's vendor watchdog.
- **The `≤ 5 s` deploy reading stands, and its own premise did not.** It was
  taken at **08:37 ET, pre-market**, and `live` is reachable in the deploy
  window **only out of hours** (Task 4.7.3, read from source): mid-session
  `feedStatusFrom` returns `disconnected` between retries and `stale` once
  inbound is current with no observation. See the briefing failures in the
  close below.
- **What is still owed is the deployed re-count** — ~1.4 `feed` frames in 75 s
  against the 332 — written into Story 4.9's own file with the instrument, the
  window and the expectation.

## Handed to this story by Task 4.1.6 — 2026-09-25: the gateway's feed frame is one per vendor item

**This story owns a browser-side liveness threshold, and the number it would be
derived from has just been measured properly. It is bimodal, and the session
half is an artefact of a defect.**

### The measurement

Against the deployed gateway on 2026-09-25, from a client subscribed to all 518
securities for 3h48m:

| Condition          | `feed` frames per minute (median) |
| ------------------ | --------------------------------- |
| out of hours       | **2**                             |
| during the session | **332** (min 3, max 385)          |

They arrive as **one burst in second `:00` of the minute** — 1,734 of 1,746
frames in a five-minute slice, median inter-frame gap **0 ms**.

**The subscription does not scope them.** A socket subscribed to `NVDA` alone
received **310 frames in 75 seconds**, each **119 bytes**:

```json
{
  "type": "feed",
  "version": 1,
  "sentAt": "2026-09-25T15:04:22.667Z",
  "feed": { "status": "live", "feed": "iex", "marketOpen": true }
}
```

**Three distinct payloads in 3h48m**; 30,865 consecutive frames identical, 21
different.

### The cause, confirmed in source

`alpaca-stream.ts:255` calls `apply()` inside the **per-item** loop over the
inbound vendor message, and `apply` notifies `onConnectionChange`
**unconditionally** (line 214). `index.ts:791` answers that with
`gateway.publishFeedState()`, a broadcast to every client. The keepalive
(`KEEPALIVE_INTERVAL_MS = 120_000`) accounts for 0.5 frames a minute of the 332.

**Nothing is lying** — the connection's `lastFrameAt` really did move. The fault
is that a change to the watchdog's private bookkeeping is published as a change
to the browser's feed state.

**It is invisible because `sameLiveFeedView` already suppresses the no-op
render.** The mitigation for the symptom predates any count of the cause.

### What this story must do with it

1. **Do not derive a browser-side threshold from the 332.** It is a defect's
   rate and disappears when the defect does. The floor this product can rely on
   is the **keepalive**, and that is `120_000` ms — which is the number a
   browser-side threshold has to clear, not 20–50 s.
   **Discharged 2026-10-11 by Task 4.7.7, and the floor moved rather than being
   cleared:** the keepalive was re-derived to `DISCONNECTED_AFTER_MS / 3` =
   **55 s**, written as the division so the relation cannot decay, and 165 s
   was kept as three missed heartbeats of it. 55 s clears Azure's 240 s ingress
   idle ceiling by **4.36×** against 2× before, and costs **129.8 B/min** per
   attached browser against 59.5 — measured through the shipped encoder, which
   is 119–127 B a frame.
2. **The repair is one condition**, and it is this story's to take or refuse:
   notify only when the **published** view differs from the last published one.
   `sameLiveFeedView` is the comparison and already exists on the frontend; the
   question is whether the backend gets its own or lifts that one.
3. **Price the client cost in the decision**, because it is the argument: ~250
   frames/min at 119 bytes is **~30 KB/min, ~1.8 MB/hour, ~11.6 MB a session**
   per attached browser — on a screen this story is measuring at 390 on a phone.
4. **ADR 0033 owes a dated amendment.** Its fourth constraint reads _one per
   frame, 36 bytes measured, never one per security_. The field obeys it; the
   frame carrying the field does not.

> **And the repair moves this story's own baseline.** If the keepalive becomes
> the only routine `feed` frame, a browser's inbound traffic during a quiet
> minute is one frame every two minutes — which is the case a 165 s monotonic
> threshold was already uncomfortably close to. Re-derive both together or
> neither.

## Handed here by Story 4.2's close — 2026-09-26: the strip's degraded states are already photographed, and one new instant needs a verdict

**1. Inherit the grid rather than re-producing it.** Task 4.2.8 produced **16
states × 4 widths plus greyscale at 1440 — 80 photographs** — at
`.capture/proxy-states/`, with `readings.json` carrying the strip text, the
source-note text and the feed-cell text per state per width. Every row was
reached through the shipped socket path. **No two states read identically**,
with two documented exceptions worth knowing: `overview === undefined` and
`figures: []` are **one state on screen** by decision, and `all-stored-one-session`
against `no-provider-configured` are identical on the strip **and** the note and
told apart **by the chrome alone** — which is ADR 0029's one-home rule working
rather than a gap.

**2. `computedAt` is a new instant on the wire and you own what it says when the
feed has stopped.** The aggregate is computed once per applied batch, so every
figure on the landing page is as of `computedAt` — frozen between bursts, and
**unbounded when nothing arrives**. The strip says nothing about the connection
by decision; the source note renders `COMPUTED …` at **minute** precision. So a
reader of a dead feed sees figures, a stale `COMPUTED`, and the connection word
only in the status bar. **Decide whether that is enough**, and note the 165 s
watchdog means the word itself lags.

**3. The ~332 `feed` frames a minute are still yours**, unrepaired and now
guarded from acquiring a passenger: `the-overview-frame-is-not-a-heartbeat`
refuses an overview publish on the feed-state path, with two breaks behind it.

## Reassessed 2026-09-27 — you now run AFTER 4.8, and you gain one task

**You are the only story in this epic that cannot be finished without an external
event** — a real phone, during a real session, in a booked sitting. Sequenced
ahead of 4.8 you gated a measurement story that runs at any hour on any day, and
**Epic 3's record is exactly that failure**: it stayed open for nine stories
because a calendar-dependent obligation sat in front of work that needed no
calendar. Execution order is now `4.6 → 4.8 → 4.7 → 4.9`.

**The numbers were deliberately not changed.** `CLAUDE.md`'s rule is that
renumbering means remapping every reference in the same change, and
`docs/GAPS.md`, ADR 0033's owed amendment, `LIVE-DATA.md` and four sibling story
files all name `Story 4.7` for the degraded set and the 165-second question. The
dependency moved; the identifier did not.

### One task added: `AppHeader`'s `composes` defect, because it corrupted YOUR measurement

`.descriptor` composes `microLabel` and then declares `font-size: 9px;
line-height: 1` — and **loses**, because `composes` concatenates class names
rather than cascading and `type.module.css` lands later. Proven from the built
bundle: it renders at **11px/16px**.

**It is yours rather than anyone's because of what it corrupted.** That element
is the one `AppHeader.module.css`'s own comment calls _"the longest string in the
chrome — 201 px at 1440"_, in the argument that decided **what wraps at 390** —
which is your subject. The repair and the 201 px re-measure travel together.
Nothing in this product asserts a font size, so no test and no screenshot of the
existing states can see it.

**Done 2026-10-11 by Task 4.7.8, and this paragraph's own blast radius does not
exist.** The descriptor is **164.13 px** rather than 200.59 and the identity
block **198.13** rather than 234.59, so the comment's `201` and `235` were
**36.5 px wide**. The wrap argument was **re-measured rather than re-argued**
and comes out stronger: with the breakpoint temporarily disabled, `.identity`
198.13 plus `.clockCell` 128, both `flex-shrink: 0`, over-subscribe a 342 px
content box by **24 px before `.nav` gets a pixel** — so un-wrapped at 390 the
navigation would not read `Market O`, it would not be there at all.

**And every sticky-edge figure was re-taken and NOT ONE moved**, which this
file, `EPIC.md` and the task's own brief all said they would (_"it is not a
font-size change, it is a chrome-height change"_ — **false**). Above 560 px the
masthead is a fixed `--app-header-height` and the content is 27 px inside a
56 px box either way; at or below 560 px `.descriptor` is `display: none`, and
was before. Measured at four widths either side: `<header>` 57/57/57/**94**,
`<footer>` 33/33/53/**73**, `scroll-padding-top` 62/62/62/**99**, `-bottom`
38/38/58/**78** — identical. Named rather than implied: Story 4.6's +1.20 px
focus-ring clearance, the 0.09–0.14 px reverse-Tab entry,
`search-keyboard.spec.ts`'s 768 stops, `universe-navigation.spec.ts`'s
`stickyChromeClearance()` and the 94/73 at 390 are **unmoved**. One figure that
is not a sticky one did move: `.nav` goes 534 → 539 against a 539 scroll width
at 1024, so the primary navigation **stops scrolling at 1024**.

### What you inherit from 4.2, so nothing is produced twice

**16 states × 4 widths + greyscale at 1440 — 80 photographs** at
`.capture/proxy-states/`, with `readings.json` carrying the strip text, the
source-note text and the feed-cell text per state per width, every row reached
through the shipped socket path. Your ACs 1–2 become **extension** rather than
production. Two documented exceptions travel with it: `overview === undefined`
and `figures: []` are **one state on screen** by decision, and
`all-stored-one-session` against `no-provider-configured` are identical on the
strip **and** the note and told apart **by the chrome alone** — which is ADR
0029's one-home rule working rather than a gap.

## Handed here by Story 4.5 — 2026-10-08: a seventh region's states, and the 390 question has a new worst case

**The prescribed sideways grep did not find you** — Story 4.5's documents name
you nowhere. You were found by walking this epic's own story list and asking
_did 4.5 measure anything 4.7 acts on_, which is the second pass Task 4.4.8
recommended after its grep missed two of five. **Four of the five things below
are measurements you would otherwise re-take.**

### 1. The region is 466 px in EVERY state, at every width

> **Superseded 2026-10-11 by Task 4.7.4 — the figures below are Story 4.5's
> dated record and the region is now 491 px.** The footer reserves three
> lines rather than two, because the age clause wraps to a third at 390 and
> to none at 768 and above: `Movers` is **482 content in a 491 px region**
> (was 466 / 486) and `Market breadth` is **491 at all four widths**. The
> property the figures were recorded FOR is unchanged and is the point — one
> height in every state, at every width, so no state steps the lower page.
> Nine live sites carrying the 466 were corrected at this story's close.

Measured, not predicted, across seven states including the reservation, the
one-sided day and the empty one:

| state                                                       | 1440    | 1024    | 768     | 390     |
| ----------------------------------------------------------- | ------- | ------- | ------- | ------- |
| full, one-sided, N=1, empty, identical figures, first paint | **466** | **466** | **466** | **466** |

A one-sided day is padded with **held rows** — `visibility: hidden`,
`aria-hidden`, in the array the FLIP is handed — so the short list costs no
height. **Without that padding 5 → 2 shrinks the region by 81 px** and steps
the whole lower page at 768 and 390, where the grid rows are untied.

### 2. The page's new totals, so your degraded grid has a baseline

`1646 / 1646 / 2359 / 2565` after, against `1646 / 1646 / 1996 / 2220` before.
**Nothing at 1440 or 1024** — rows 2 and 3 share one `fr` — and **+363 / +345**
at 768 and 390.

### 3. The 390 question has a new worst case, and it is a NAME rather than a sentence

Every previous 390 clipping item in this epic has been a **sentence**. This
region's is a **company name**: `.label` is the one flexible track, and at 390
it holds **191.45 px ≈ 24 characters** against a universe whose names are
`p50 21, p75 26, p90 32, max 50`. So **roughly a quarter of the universe
ellipsises at 390 by design** — and the price column is dropped there
entirely, which is a decision rather than an overflow.

**What is mechanically invisible, as ever**: `textContent` is identical whether
a name wraps, clips, ellipsises or overflows. The longest name in the universe
is `Cognizant Technology Solutions Corporation Class A` at **308 px**; measure
against that, not against `NVDA`.

### 4. The degraded states you inherit, and one is reachable on every gated run

- **Both lists empty** — CI's permanent state, because the frame carries a
  movers section with two empty lists when nothing is rankable. The region
  draws its heading pair, the bound falls silent, and the footer says
  _"…none were heard from… There is nothing to rank."_
- **One list empty** — a one-sided market. It says
  `None of the names we measured declined.` — **not** _heard from_, which is
  the live grammar's phrase and is false about a closed market.
- **No movers section on the frame** — a rollback pinning a previous image.
  Distinct from _no frame at all_, which Story 4.4 learned the hard way after a
  docblock called them one state for a fortnight.
- **The feed stops**: the region is byte-identical and says nothing, which is
  Story 3.10's settled posture. The status bar is the only surface that speaks,
  and it reads `LIVE` for **165 seconds** after a client loses its network.

### 5. The suite's own health, which is yours and 4.9's together

Three whole-suite runs on 2026-10-08 failed 3, then 5, then 7 — **every
failure a 30 s timeout, zero assertion failures**, on the CPU-heaviest tests
(axe, the accessibility-tree walk), with a **different set each time**, while
the machine sat at load **23–33 on 8 cores** with ~37 MB free. CI passed all
three required checks. **The suite is not flaky and the change did not break
it; the machine could not execute it** — and those two look identical from a
terminal. The `--repeat-each=6` × 4 characterisation is **owed and not taken**,
because it needs a settled machine.

## Handed here by Story 4.6 — 2026-10-09: twenty-four destinations now exist on this screen, and three of your degraded states must not change what is openable

**Everything in Story 4.6's second half is a constraint on your photographs
rather than on your code.** `/` now holds **twenty-four `<a>` elements** — four
proxy symbols and twenty ranked tickers — each resolved at render from its own
row's identity. The rule Story 4.6 settled, and which your degraded set must
show rather than argue:

- **Nothing becomes non-activatable because a feed stopped.** A stale figure
  does not make a security unopenable, and a `disconnected` socket does not
  either: the destination is built from the row's **ticker**, which no feed
  state changes. If one of your states draws a ticker that cannot be opened,
  that is a defect rather than a degradation.
- **A tripped `ErrorBoundary` keeps the section's name, its landmark and its
  own tab stop**, and loses the roving stops with the content. That is the
  shipped behaviour, asserted in a browser.
- **The universe being unreachable leaves the links unaffected** — the
  accessible name of a ticker link is the ticker, not the company name, so an
  empty-names state still opens the right page.

**Two of your states are the ones no gated machine has ever drawn.** CI's store
has zero bars, so `eligible: 0` and both mover lists are empty for ever — the
**ten held pads** are CI's permanent state. A pad is handed **no link at all**
(Task 4.6.4's deliberate departure from its own brief), so a pad has no stop,
no arrow reachability and is never `End`'s target **by absence** rather than by
CSS. Photograph the padded state and the one-sided market with that in mind:
there is nothing to hover and nothing to focus in a pad, and the row must still
read as room rather than as a security.

### What you own that Story 4.6 raised and did not repair

**`Region` listens for `focusin` and `focusout` on its own box, and both
events bubble.** So moving focus from a region's section onto one of its rows
fires `report(false)` and then `report(true)`. The consequences, produced in a
browser by Task 4.6.5:

1. **Every arrow press inside a ranked region releases the order pin and takes
   it again**, which refreshes the pinned order to the last frame drawn — so a
   reader's list can re-order under an arrow press, which is the one thing the
   hold exists to prevent.
2. `useOrderHold`'s rule _"the first of the two sources to fire owns the pin"_
   **does not hold for a move WITHIN the region**, which releases first.
3. The un-pinnable window `use-order-hold.ts` documents — a reader arriving
   before the first frame — **closes the moment focus moves inside the
   region**. A keyboard reader can therefore reach the **section** while
   un-pinnable and never a **row**.

It was left alone deliberately: repairing it changes hold behaviour Story 4.5.7
settled with measurements, and it is a decision rather than a fix.

### And the 390 question has one more worst case

At 390 the ranked ticker track is `2ch 64px minmax(0,1fr) 68px` and the ticker
link measures **64 of 308 px** — confirmed to the pixel against the canvas.
The focus ring clears the price's ink by **+1.20 px at every width** on the
proxy strip, identical at 1440, 1024, 768 and 390, with the `None stored`
state at +5.35. **1.2 px is a pass, not a comfort**, and it was photographed at
8× rather than computed: a gap or an inset would move `.cell` off `16 + 26 + 16`
and take the whole seven-region grid with it. If your 390 pass wants more
clearance, it is a grid change and not a padding change.

## Handed here by Task 4.8.12 — 2026-10-10: the landing page already states an age, and the field a liveness rule over the aggregate would be built on now exists

Three constraints, written here rather than linked, because a pointer is what
a reader follows when they already know to look.

**1. `Observed through hh:mm` is on the landing page in every state where the
aggregate holds an observation, and it is the only surface on `/` that says how
old the figures are.** It drew `Computed hh:mm` until 2026-10-10 — the instant
the **join** ran, which the gateway re-runs on every connect — so on a stopped
feed it read the minute the reader opened the tab. Produced verbatim against a
developer's store whose newest bar is the 2026-09-11 session:

```
CLOSING PRICES  All US exchanges
COMPUTED        Oct 9 · 21:42 EDT
```

It now says nothing at all in that state. **Your degraded set must photograph
the new sentence, not that one**, and the state grid it comes from is
`e2e/specs/overview-source-note.spec.ts`, which produces five rows through the
shipped socket path and prints them.

**2. It is an age and not a verdict, by the same decision the security page
took three times.** No threshold, no status word, no connection word: `live` /
`stale` / `disconnected` have one home and it is the status bar. If your
degraded pass wants the landing page to say the feed has stopped, that is a
**reversal** of Story 3.10's one-home rule on a second screen, and it is a
conversation rather than a fix.

**3. The frame now carries `observedAt`, and it is the honest input to a
staleness rule over the aggregate — which is yours to decide, not ours.**
`sentAt` and `computedAt` are readings of this process's clock and
`the-send-instant-is-not-a-clock` holds both out of `feed-liveness.ts` and its
two adapters. `observedAt` is a bar's own `startsAt`, so it stops moving when
the market stops reaching us and it is **absent** when the aggregate contains
no observation. It was deliberately **not** added to that invariant's list, so
nothing mechanical stands between you and using it — which is the point. The
165-second `LIVE` this story already owns (`docs/GAPS.md`) is the question it
bears on.

## Handed here by Task 4.8.10 — 2026-10-10, at Story 4.8's close: your grid runs on a measured instrument, and `/` re-renders on every batch in every degraded state

Four constraints, written here rather than linked.

**1. The instrument your degraded grid needs already exists, is proved, and is
proved in a way worth copying.** Story 4.8 built a shared harness that drives
the running production pair and furnishes the market socket locally
(`routeWebSocket`), and the thing it got right is the part this story will be
tempted to skip: **a channel that reports nothing and a channel that is dead
produce the same output.** Every arm plants a deliberate block on the page that
produced the figure and counts the arm only if **every** channel it reports
caught the plant — `longtask`, `long-animation-frame` and an rAF-gap recorder.
`/securities`' cold-load breach is the proof that this is not pedantry: the
breach has not moved and the `longtask` channel, which three documents named as
the re-measure, now reports **nothing at all**. `PRODUCT_SPEC.md` §28 states
the three-channel method for this reason. The same rule generalises to your
grid: **prove the plant per channel**, and a produced state whose producer went
quiet looks exactly like a state that was drawn correctly.

**2. `/` re-renders on every applied batch in every degraded state, and the
count is measured.** **2 renders per applied batch** on `/` (`overview` plus
`bars`), at the feed's measured **6.8–16.1 batches a minute** — so
**13.6–32.2 a minute**, from **0** before Story 4.2 (Task 4.8.2, counted on
React's commit hook against the real gateway). That is true whatever the chrome
says, because the gate `sameLiveFeedView` compares the overview field by
**identity** and the decoder builds a new object per frame. So a degraded state
is not a still page, and any state you photograph twice may differ only in
which render you caught. The per-batch cost is small and measured — **3.7–5.1
ms** of main-thread work on `/`, zero `longtask` entries in seven arms, worst
rAF gap 17.7–17.8 ms — but the **count** is what your grid has to survive.

**3. Your 390 measurements are affected by one thing this story found and one
it did not.** A full `pnpm e2e` begun at a load average of **5.31** left the
machine at **31.04**, so **the browser suite is its own plant**: read the load
**before** a run, never during it, and treat every load figure in this
repository taken while a suite was executing as a measurement of the suite.
And a reported Playwright duration is **not** the quantity the 30 s per-test
ceiling governs — it reports durations longer than the one it enforces — so a
duration must not be turned into a percentage of the ceiling.

**4. One degraded state on `/` is cheaper to reach than it looks, and one is
not reachable at all.** The aggregate in CI's shape is **928 bytes** of ~~518~~
**four** `unknown` figures — **corrected 2026-10-10 by Task 4.7.2, which
produced the state and measured the frame** — `measured: 0`, `eligible: 0`,
two empty lists — so every
gated run is already a degraded state and your grid gets it free. What no
machine can reach is the **opposite** end: the ceiling is **4,078 bytes** with
all 518 observed on the observed basis, and it needs a store with bars **and** a
live session. Between them are three measured intermediate states (2,042 B with
closes and nothing observed; 3,142 B on the session basis; 3,990–4,002 B built
in a browser with the shipped encoder), and the figure moves with **the number
of securities heard from in the window**, not with anything in the code.

> **Amended 2026-10-10 by Task 4.7.2: the frame carries FOUR `unknown`
> figures, not 518, and the arithmetic is the proof.** A CI-shaped aggregate
> built from the shipped types — four `unknown` proxy figures, eleven
> `unknown` sectors, `measured: 0`, `eligible: 0`, `observedAt` absent — is
> **841 bytes**, against the **928** recorded off the real gateway; 518
> `unknown` figures alone would be roughly **21 KB**. The 518 and the 503 are
> the **population the breadth and movers sections count over**, carried as
> `tracked`, and `overview-frame-sections.spec.ts` asserts `figures` holds
> exactly four. Every byte figure in the paragraph above is unaffected; only
> the description of what is inside the frame was wrong.

## Gate 1 — 2026-10-10: eleven tasks, seven decisions, and three of this file's own premises falsified

### What the shaping falsified in this file

1. **The grid this story was told it would EXTEND holds no connection state.**
   `.capture/proxy-states/readings.json` is **81 rows across 16 state ids**,
   every one a **data or basis** state — `01-no-frame-before-the-floor` …
   `16-no-provider-configured`. No drop, no stale, no reconnect. And **zero**
   specs that visit `/` have ever degraded a feed. **ACs 1–2 are production
   with a method inherited.**
2. **The shared harness cannot hold a disconnection.** `e2e/support/feed.ts`'s
   `routeWebSocket` callback unconditionally re-sends a `live` snapshot, so a
   produced `disconnected` **self-heals ~2 s after `drop()`**. That is Task
   3.10.9's fourth instrument error, whose fix lived in a deleted script and
   **was never carried into the shared harness.**
3. **The ~90 s browser threshold this file floats is below the floor the repair
   it also proposes creates.** The `54.0 s` longest-idle figure **is** the
   332-frame defect — `apply()` notifies on the vendor's **`ping`** too — so
   after the repair the browser's only routine inbound frame is the **120 s
   keepalive**. 165 s goes from **3.06× margin to 1.375×**; 90 s would fire on
   every healthy idle browser.

### And two defects nobody had recorded

**The figures do not survive a fresh join.** `sendSnapshot()` computes a new
aggregate on connect **and on every subscribe**; breadth and movers come from a
**5-minute** window; a proxy or sector entry has **no expiry at all**. So a
**reload** during an outage draws four live prices and eleven ranked sectors at
the top and `none were heard from in the last 5 minutes` in the middle. And
because a restarted replica serves browsers for **45.8–46.5 s** before its own
feed authenticates, **every deploy mid-session flips every open tab to
yesterday's closes for ~46 s with the status bar reading `LIVE`.**

**The twenty ranked ticker stops vanish when an aggregate empties** — ADR
0039's own rejected shape (_a tab stop must not appear and disappear under a
reader_) applied to rows rather than regions, dropping a keyboard reader to
`<body>` on a timer nobody controls.

### The seven decisions

| Question                            | Decision                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The stale aggregate on a fresh join | **The gateway serves its last broadcast aggregate** to a reconnecting or subscribing client rather than a recomputed one — one place, and it removes two of the three joins per cold load. Rejected: a browser-side refusal as well; expiring the proxy and sector entries; photographing it as honest |
| The 332 frames and the threshold    | **Re-derive the KEEPALIVE and keep 165 s** — at ~55 s it is three missed heartbeats of **our own** heartbeat, which is ADR 0036's rule honoured rather than a number tuned. `DISCONNECTED_AFTER_MS` is untouched and could not be: the same constant arms the backend's vendor watchdog                |
| AC 5                                | **Split.** 5a is the threshold decision with its derivation and a condition-shaped re-derivation trigger, needing no session; 5b is the sitting. The status says which single row is owed rather than holding the whole story open                                                                     |
| Breadth's and Movers' age           | **Each states the instant its window ended**, beside the denominator it already states — an age, not a verdict, from the one builder both footers already read                                                                                                                                         |
| A connection word on `/`            | **The one-home rule holds. Ages only, never a verdict.** The status bar stays the only home for `live`/`stale`/`disconnected`                                                                                                                                                                          |
| The doubled ticker                  | **Reserve blank room** rather than repeating the ticker, accessible name unchanged                                                                                                                                                                                                                     |
| The strip's shared age line         | **Left as it is**, by decision — the scoping is clear from position, and the pair with the source note's instant is recorded as an idiom rather than reworded                                                                                                                                          |

### The eleven tasks

| #      | Title                                                                | What a user sees                                         |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------------- |
| 4.7.1  | A harness that can hold an outage                                    | Nothing                                                  |
| 4.7.2  | The states this weekend can draw, and Monday cannot                  | Nothing                                                  |
| 4.7.3  | The figures that do not survive a fresh join                         | **A reload during an outage stops contradicting itself** |
| 4.7.4  | An age beside the denominator                                        | **Both regions say when their window ended**             |
| 4.7.5  | The chorus, the doubled ticker, and a head that outlives its content | **Yes, at 390**                                          |
| 4.7.6  | The stops that vanish when an aggregate empties                      | Nothing, unless they use a keyboard                      |
| 4.7.7  | The 332 frames, and the keepalive the threshold is derived from      | Nothing — ~15 MB a session a phone stops receiving       |
| 4.7.8  | `AppHeader`'s `composes` defect and the 201 px re-measure            | A chrome at the size its stylesheet says                 |
| 4.7.9  | The degraded grid, produced and photographed                         | Nothing                                                  |
| 4.7.10 | The sitting, on a real phone                                         | Nothing new, looked at by a person                       |
| 4.7.11 | The sweeps and the close                                             | Nothing                                                  |

### What is deliberately not being done

- **A connection word on `/`** — see the decisions.
- **A per-security staleness verdict** — refused with a measurement: the
  ordinary maximum gap between one security's bars is **187 minutes**.
- **Feeding `observedAt` into `feedStatusFrom`** — it returns `stale` on
  absence, which would make **every gated run and every no-provider
  deployment read `stale` during a session**, and it would make `/`'s
  connection word computed over 518 securities while `/securities/:symbol`'s is
  computed over one: a route-dependent connection word.
- **Repairing the order hold's bubbling defect** — measured and recommended in
  4.7.6, not changed there.

## The close — 2026-10-12 (Task 4.7.11)

**Ten of eleven tasks complete. Five of six acceptance criteria met; one row
owed, and it needs a calendar rather than a decision.**

### The six criteria, each with its evidence

| AC                                             | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** produced and photographed, four widths   | **MET.** Thirteen states × four widths × seven surfaces, greyscale at every width, **104 photographs** — `e2e/specs/overview-degraded-grid.spec.ts`, a **kept** spec. Every row is a drive through the shipped socket path, the connect sequence, the decoder and the renderer. **One row is furnished and labelled `rollback`**, because `WireMarketOverviewInputs.breadth` is non-optional and no producer can build it. Three more are enumerated and not produced, each with its reason, printed by every run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **2** no two states read identically           | **MET, and expressed as a class rather than a count.** The assertion is _partition by drawn string equals partition by declared class_, pairwise, so it fails **in both directions** — and both fired for real during Task 4.7.9. The count form `rows.length - 1` was shown **green on the same defect**, because the pair that collapses is still a pair; it is simply a different pair.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **3** killing the feed changes no figure       | **MET**, and it needed a repair rather than a photograph: a **fresh join** used to recompute, so a reload during an outage drew four live prices over `none were heard from in the last 5 minutes`. The gateway serves its last broadcast aggregate (Task 4.7.3), both ranked regions state the instant their window ended (Task 4.7.4), and `expectNothingFailedToRender` holds in every produced state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **4** the connection still has one home        | **MET BY DOING NOTHING, and that is the decision rather than an omission.** The owner held Story 3.10's one-home rule at Gate 1: `/` gets **ages**, never a verdict, so no threshold, no status word and no connection word was added anywhere on the landing page. `a-second-staleness-sentence` and `one-home-for-the-strip-staleness-sentence` already refuse a second by name, and `the-send-instant-is-not-a-clock` keeps both process clocks out of the liveness rule — so the criterion is held by checks that existed before this story and needed no widening. Feeding the aggregate's `observedAt` into `feedStatusFrom` was refused **with a measurement** (it returns `stale` on absence, which would make every gated run and every no-provider deployment read `stale` during a session, and would make `/`'s connection word computed over 518 securities while `/securities/:symbol`'s is computed over one).                                                                                                                    |
| **5a** the threshold decision                  | **MET.** **165 s kept, the keepalive re-derived**: `KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3` = **55 s**, written as the division. ADR 0036 carries the dated amendment and a **second reversal condition** — the first change to either heartbeat. `DISCONNECTED_AFTER_MS` could not have moved: the same constant arms the backend's vendor watchdog.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **5b** an answer from a real phone             | **OWED — the single open row.** Task 4.7.10, `Not started`, needs a regular session. `LIVE-REHEARSAL.md` carries the row with its eight-step protocol and what a row of this kind may claim.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **6** a `pnpm break` entry for everything, red | **MET, with one qualification stated rather than hidden.** Eleven entries added — `the-harness-answers-the-browsers-own-retry`, `the-fresh-join-recomputes-the-aggregate`, `the-footer-age-drops-its-interval`, `a-mover-stands-its-ticker-in-for-its-name`, `the-region-head-outlives-its-content`, `a-region-does-not-catch-its-dropped-focus`, `the-feed-frame-is-a-heartbeat-again`, `the-keepalive-stops-being-three-missed-heartbeats`, `a-compose-carries-an-override`, `the-footer-age-reads-the-join-instead-of-the-market`, `the-break-registry-stops-parsing` — and **every one went red**. Two existing entries were **repointed** (`the-overview-frame-rides-the-heartbeat`, `a-fourth-path-to-the-aggregate`), one of them caught by `every-break-can-still-land` doing its job. **The qualification: `pnpm break` refuses a dirty target, so all but 4.7.9's were performed by hand with the registry's own `find`/`replace` and the file checksummed either side.** Re-run them with `pnpm break <name>` once this is committed. |

### Five first drafts were green on the defect they were written for

Recorded together because it is the story's own pattern rather than one task's:
a brace matcher walked past a block comment (4.7.8); a three-state walk missed
the retry cell (4.7.5); a spaced substring was never present because Playwright
normalises across cell boundaries with no separator (4.7.5); a clause tested for
an identifier that sits on the module's import line rather than for the addition
(4.7.4); and a focus listener was saved by reusing an effect gated on a prop six
of the seven regions do not pass (4.7.6). Beside them, three weaker wire-level
drafts passed against the unrepaired gateway (4.7.3) and one assertion was green
because both of its readings were `stale` (4.7.7). **`CLAUDE.md`'s 2026-09-26
rule — write the file the next story would write, keep the transcript of it
passing, then fix — earned its place seven more times.**

### The upward sweep

**Corrected (live claims): 31 sites in 21 files.** `STORY.md`'s own `54.0 s` / `3×` /
`~90 s` conclusions (one dated amendment under the table that holds them, plus
the `120_000` floor instruction and the 201 px blast-radius paragraph); the
`466 px` region height at **nine** live sites across `RankedList`, `Movers`,
`movers.ts`, two tests and two specs; the `120 s` keepalive at three sites in
`live-feed.ts` and its test; `518 unknown` in `docs/GAPS.md` and ADR 0038;
`three joins per cold load` residue in `check-invariants.mjs` (twice),
`overview-source-note.test.ts` and `market-stream-protocol.ts` — and
`market-gateway.process.test.ts`'s copy was **left alone on inspection**,
because Task 4.7.3 had already amended it four lines down and a second
amendment would be a second home for one correction; `Story 4.7 owns whether one is` in
`market-stream-protocol.ts`; `Story 4.7 owns it` in `session-sitting.mjs` and
`deploy-gap.mjs`; `EPIC.md`'s blast-radius line; the 165 s entry's post-repair
rate and its scope; and `CLAUDE.md`'s `composes:` entry, which described a
mechanism it did not name, plus its `466 px` and its 390 standing item.

**Left standing (dated records): 11 files.** The `54.0 s` table itself and the
`≤ 5 s` deploy reading (2026-09-25, Task 4.1.7's measurements); Gate 1's three
falsified premises (2026-10-10); Story 4.8's `STORY.md` and task files 4.8.3,
4.8.4, 4.8.8, 4.8.10, 4.8.11 and 4.8.12; Story 4.5's and 4.6's task records;
`docs/GAPS.md`'s discharged `AppHeader` entry and the two-instants entry's
original three-surface paragraph, each with its verdict beside it rather than
rewritten. Every `Work` section in this story's own task files is left exactly
as briefed, including the clauses the tasks then falsified — that is what makes
the findings readable.

**Four ADRs were amended by the tasks on the day their measurements were taken,
and re-read at the close NOTHING REMAINS in any of them**: ADR 0033's
constraint 4 and its reversal trigger, ADR 0036's threshold table plus a second
reversal condition (both Task 4.7.7), ADR 0038 in two places (Task 4.7.3) and
ADR 0039's rejected alternative (Task 4.7.6). **ADR 0029 was checked and needed
nothing**: the age clause renders only when its own data is present, which is
that ADR's defer rule rather than a change to it.

### Two premises were falsified by the BRIEFS rather than by the tasks, and they are the orchestrator's

Recorded as briefing failures because the distinction matters to whoever reads
the findings later: no measurement was wrong, the instruction was.

1. **_"Every deploy mid-session flips every open tab to yesterday's closes with
   the bar reading `LIVE`"_ — the second half is false.** Read from source by
   Task 4.7.3: mid-session `feedStatusFrom` returns `disconnected` across the
   retry gaps and `stale` once inbound is current with no observation, and
   `live` is reachable in that window **only out of hours**. The one deployed
   reading behind the claim was taken at **08:37 ET, pre-market**. The defect is
   the **figures'** silence, not the chrome's.
2. **_"The explanation lives at the foot of the page"_ — false, and this is the
   third task to be told it.** The status bar is **sticky** and in the terminal
   state reads `STALE · Connected, and no live prices have arrived yet.` about
   **250 px under the first apology at 390, at any scroll**. The fact is
   recorded correctly in this file, in `CLAUDE.md` (_false, measured twice and
   corrected 2026-09-25_) and in Story 3.10's record — and it still reached a
   task brief as the old claim. **A correction that is written down is not the
   same as a correction that has propagated**, which is this repository's own
   rule arriving from the brief-writing end.

Two more of the orchestrator's figures were corrected by Task 4.7.2 and are in
the same family: CI's 928-byte aggregate carries **four** unknown proxy figures
and eleven unknown sectors rather than 518 (518 unknown figures would be ~21 KB,
and the 518 is the **population**), and the terminal no-frame state reads
**`STALE`, not `LIVE`**, from the first paint.

### The sideways sweep — both passes, and the miss count is ZERO for the grep and FOUR for the walk

**Pass 1, the prescribed grep.** `Story N.M` across this story's eleven
documents returns 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8 and **4.9**; `Owner:`
returns two lines, both of which point inside this story. Of those, the only
**open** story is 4.9, and Task 4.7.7 had already written the deployed
re-count into its own file. **Pass 1's miss count: 0.**

**Pass 2, walking the epic's story list and the epics after it.** Four files
needed a hand-off the grep could not have found, and none of them is named
anywhere in this story's documents:

- **Story 4.9** — three more items beside 4.7.7's: the **owed sitting** (its
  rehearsal is the same sitting, not another one), the **suite verdict**'s new
  evidence (three specs and ~1.2–1.5 minutes added; 240 → 241 → 83 of the
  nineteen `overview-*`; `overview-nothing-to-open.spec.ts:545` failing **1 of
  48** with a named one-line repair; and the four-runs/four-failing-sets
  confounder with its two found causes), and the grid being **re-runnable**
  rather than quoted.
- **Epic 5** — `Unusual activity` is one of the seven regions, and three
  measured things govern the day it is filled: `Panel`'s `reserved` state is
  doing two jobs (a **degraded** region borrows the **deferred** hatch, and at
  1440 the unbuilt regions read as more intentional than the built ones), a new
  figure-bearing region joins a **kept** state grid with declared classes, and
  a region that waits adds a fifth apology — where the **order is not the
  repair**, because at 390 no two of the four sentences are ever co-visible.
- **Epic 6** — the same two treatment findings, plus the note that a canvas
  region contributes a surface to the grid whose text is its accessible
  fallback's, and that `Region`'s focus backstop is inherited free.
- **Epic 14** — ~332 frames a minute and ≈15.4 MB a session removed, with
  **read it as bytes and battery, not as a render saving** stated so the epic
  does not credit itself with a figure it cannot see; the keepalive's doubled
  **129.8 B/min**; and the per-cold-load join product now being an estimate of
  a different thing, to be **re-taken rather than divided**.

**Pass 2's miss count: 4.** Seven consecutive stories in this epic have now
found with the walk what the grep could not.

### `docs/GAPS.md`

**Six entries added, five amended, one discharged.** Added: `serveFeed`'s
default answering the retry; `observedAt` as the permitted wire instant with
the distinction no grep can make; the backgrounded tab; `deploy-gap.mjs`'s
hard-coded watchdog; the break registry's parse (**made mechanical in the same
change**); and the two-corner question at 390. Amended: the 165 s entry (twice
— the post-repair rate, and the scope correction that the no-frame state reads
`STALE`), the feed-frame count entry, the two-instants entry (**four** surfaces,
not three), the restarted-replica entry (the chrome's word in the deploy
window), and the `overview-nothing-to-open` flake entry's n. Discharged:
`AppHeader`'s descriptor, which became `a-compose-never-carries-an-override`
with a break.

### What ships open, and who owns it

| Item                                                                           | Owner                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **AC 5b — the sitting on a real phone**                                        | a person with a phone during a session; Story 4.9's rehearsal if it slips |
| The deployed in-session **feed-frame re-count** (~1.4 in 75 s against the 332) | Story 4.9, in its own file with the instrument                            |
| `ORDER HELD` over a **re-taken** pin that moves every row                      | **the owner**, at Gate 2 — it changes shipped hold behaviour              |
| A **degraded** region drawn like a **deferred** one                            | UX/Design and the owner; `Panel`'s variants are a canvas question         |
| A restarted replica serving its first browser a **thin** aggregate             | a condition — the first mid-session deploy somebody watches `/` across    |
| The two-instants family, now **four** surfaces                                 | the owner, across four surfaces rather than four tasks                    |
| `overview-nothing-to-open.spec.ts:545`'s non-retrying assertion                | whoever next reads that file                                              |
| `deploy-gap.mjs`'s hard-coded 165 s                                            | the next re-derivation of either threshold                                |

### The gate at the close

```text
$ pnpm verify
All matched files use Prettier code style!
42 components, 42 stories files.
527 documents, 1721 cross-file links, 39 anchor links, 0 broken.
54 invariants hold.
packages/shared test:  Tests   440 passed (440)
apps/backend  test:    Tests  1035 passed (1035)
apps/frontend test:    Tests  1413 passed (1413)
apps/backend test:process:  Tests  55 passed (55)
VERIFY EXIT=0
```

`Unhandled Error` grepped across the whole log: **zero occurrences.** `pnpm e2e`
was **not** re-run at the close and the reason is the diff — the only files
under `e2e/` that the close touches are two comments, both covered by root
`tsc -b` and `pnpm lint`. The last full suite in this story was Task 4.7.5's
(**241 passed, 16 skipped, 3.3m, green end to end**) and the last scoped one
Task 4.7.9's (**all nineteen `overview-*` specs, 83 passed, 1 skipped, 1.5m**).

## Gate 2 — accepted 2026-10-12, with AC 5b owed

**Accepted as ten of eleven tasks and five of six criteria**, on the shape the
AC 5 split was taken for at Gate 1: the status names which criteria are met and
which single row is owed, the way `LIVE-REHEARSAL.md` does, rather than holding
nine tasks' work open against a calendar. **Task 4.7.10 stays open** against a
booked sitting; the next regular session is 2026-10-12 09:30 ET.

### The owner's second decision at this gate

**Both `reserved`-state findings go to Epic 5, where Task 4.7.11 already wrote
them, and nothing changes here.** `Panel`'s `reserved` state is doing two jobs —
in the rollback state a **degraded** region is drawn exactly like one this
product **has not built yet**, same hatch and same muted sentence as
`Market topology`, differing only by the absence of an epic badge — and at 1440
**the three unbuilt regions read as more intentional than the four built ones**,
which are white voids with one 12 px grey sentence. Epic 5 owns the next region
to be filled and is the first story that meets both. Rejected: separating the
two treatments now (a canvas change plus a `Panel` state, widening a story one
row from closing) and raising the built regions' treatment (the opposite end of
the same observation, and bigger design work).

### What a user can see

Three visible changes, all on `/`. **Both ranked regions state the instant their
window ended**, beside the denominator they already state — an age, never a
verdict. **A mover row no longer says its ticker twice** while the universe is in
flight. **A region's head no longer claims figures its content has lost.** Plus
two repairs a reader meets by accident: a **reload during an outage stops
contradicting itself**, and the chrome's descriptor renders at the size its own
rule declares.

### What was not verified, and why

**Nobody has looked at this on a phone** — AC 5b, the one owed row. The
2,000 ms floor's premise (**174–277 ms first-frame times against a local
pair**) has never been met on a real network. The ~332-frame repair's
**deployed in-session re-count is owed**, because no locally runnable provider
has the per-item loop. And **the deploy case is beyond any memo**: the arriving
replica has no browser attached until the platform terminates the incumbent at
~46 s, so it cannot have a last broadcast — three uncosted candidates are in
`docs/GAPS.md` with a condition for an owner.
