# Task 3.4.10 — The live rehearsal, the sweep, and the close

**Status:** **Rehearsed in part — 2026-09-22, headless; two of criterion 8's owed items taken, three still owed (the addendum at the foot).** Until that night: **BLOCKED on the rehearsal — everything else complete, 2026-09-21.** The sweep, both audits (with counts), the ADR decision and the acceptance walk are done and are below. **The story does not close**, because two acceptance criteria cannot be met tonight and neither is a matter of effort: ~~criterion 5 is **unmeasurable** without a protocol change (`docs/GAPS.md` entry 12)~~ — **measurable and taken since 2026-09-22, see the amendment under _Do NOT expect the rehearsal to close §28's p95_ below** — and criterion 8's _with the market open_ needs a session — the market is shut and the deployed backend still holds the plan's **one** Alpaca connection, verified at 23:06 EDT.
**Amended:** 2026-09-21 after Task 3.4.7 — the ADR question is now **two decisions**, and the second one reaches past this epic.
**Amended:** 2026-09-21 after Task 3.4.9 — the construction-site audit now has **two forms**, because the export grep would not have caught a published row nothing could reach.
**Amended:** 2026-09-21 after Task 3.4.8 — **§28's p95 is half-measured and the rehearsal cannot close it**, because no wire message carries a server instant. Do not record it as met.
**Amended:** 2026-09-21 after Task 3.4.6 — the rehearsal is **two sittings or one that straddles the bell**, because the extended-hours mark cannot be seen with the market open and no fixture or replay can stand in for it.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.9

## Objective

Close the story, and **accept it against the live feed** rather than against the
instrument it was designed with.

## What the user can see when this lands

**Nothing new.** Story 3.5 is next.

## The rehearsal is the acceptance, and it is not optional

**Design against the replay; accept against the live feed.** The replay is real
recorded movement and is the right instrument for the _decision_ — it is not the
instrument for the _acceptance_. This story owes a **dated row in
[`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md)**, watched during a real session.

**And it cannot be skipped by running the replay again**, which is the shape the
skip would take: the replay is our own stored bars and therefore agrees with our
own assumptions by construction. A green rehearsal against it certifies nothing
the design pass did not already.

> **AMENDED 2026-09-21 after Task 3.4.6 — the rehearsal can no longer be a
> single sitting inside the session, and finding that out on the morning would
> cost the window.**

**The extended-hours mark cannot be seen with the market open.** That is what it
means. It renders for `before_open` and `after_close` only, so the one
criterion below that says _with the market open_ and the one mark shipped on
2026-09-21 are **mutually exclusive by construction**.

So the rehearsal is **two sittings, or one that straddles the bell**:

| Window                                   | What only this window shows                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| **04:00–09:30 ET** or **16:00–20:00 ET** | the **extended-hours mark**, on real data, for the first time                 |
| **09:30–16:00 ET**                       | a genuinely quiet minute, a correction, and `pnpm probe` with the market open |

**Neither the replay nor any fixture can stand in for the first row.** ADR
0030's replay re-stamps recorded bars onto the **wall clock**, so out of hours
every bar it produces lands on a weekend and carries **no mark at all** — which
is why Task 3.4.6's three states live in the workshop rather than on the running
page. **The mark is shipped and has never been seen against a real bar.**

**And one third-party assumption is worth a single glance while real frames are
in front of you.** Task 3.4.6 argued that `weekend` and `holiday` need no mark
because **IEX trades on neither**, so a live observation cannot carry such an
instant. That is an assumption about a vendor rather than a measurement. If a
frame ever turns up stamped outside a trading day, the mark says nothing and
nobody finds out — so note the answer either way, in the vendor's own document.

**Two things to watch for that the replay cannot show:**

- **A quiet minute produces no frame at all** (§7.2), and IEX covers **65.1% of
  minutes for a median symbol and 2.1% for `ERIE`** (§7.6). **A still price is
  the feed working**, and whether that reads as _alive but quiet_ or as _broken_
  is the question the whole vocabulary turns on — and only a real session has
  genuinely quiet minutes in it.
- **A correction arriving ~30 s later** (§7.8). Fourteen were measured in one
  session; the replay does not produce them unless somebody made it. **Since
  Task 3.4.6 there is a shipped behaviour to watch rather than only an event**:
  a revision **fires the arrival mark**, and the qualifier's instant **does not
  advance**. Confirm both against a real one — that pair is the entire argument
  for a correction having no treatment of its own, and it has only ever been
  seen against a rerender in a test.

## Work

- **Watch a real session** and fill in the rehearsal row.
- **Sweep upward, and expect to find something.** `VISUAL-LANGUAGE.md`'s Motion
  section says it is a thin first cut and that **Epic 3 owns the full
  vocabulary** — that sentence becomes false here. `CLAUDE.md`'s _what is open_
  carries **the fourth design test, deferred eight times**; this is the story
  that pays it and that entry is the one to correct rather than extend.
- **Both audits, by enumeration with a count** — the shape Story 3.2's close
  established and both of which have caught something every time:
  - **Hand-offs**: grep `LIVE-DATA.md` and this story's own file for every
    `Story 3.N`, and confirm each constraint is in the owning story's **own**
    file in words it can act on. **`CLAUDE.md`'s listening backlog grew by two
    entries on 2026-09-21** and its owner is _a person with a screen reader_
    rather than a story — check it reads as one item with four entries rather
    than as four items, because a backlog nobody can hold in their head is a
    backlog nobody picks up. **Counting citations measures citation, not
    delivery** — Story 3.3's close found Story 3.10 cited twenty times with
    nothing in its own file.
  - **Construction sites, and since 2026-09-21 in TWO forms** — because the
    first form would not have caught Task 3.4.9.
    - **The export form**: every export this story adds, grepped for a caller
      outside a test. Story 3.3's close deleted one this way.
    - **The REACHABILITY form**, which is new: every row of every state grid
      this story published, walked from its **producers** rather than its
      renderers. Task 3.4.9's defect had a caller — what had no implementation
      was the **decision**, so an export grep returns clean while a documented
      row sits on a screen-in-a-document for four days. `docs/GAPS.md` entry 13
      carries the family; this story published rows in `VISUAL-LANGUAGE.md`'s
      motion set and in `Live in the chrome` §11, and neither has been walked.
  - **And the open item this story fired.** `CLAUDE.md` carries _nothing checks
    that a named region says something when its subject is missing_, owned by
    _the next story that adds a region_. Task 3.4.9 met its **harder form** —
    _nothing checks that a named region says something coherent when it has two
    subjects_ — and answered it for one cell. **Decide whether that entry
    widens or gains a sibling**, rather than leaving a fired trigger reading as
    unfired.
- **An ADR if a decision outlives the story.** A motion vocabulary that five
  stories inherit is a strong candidate; argue the absence if not. **The case
  got stronger on 2026-09-21 and it is now TWO decisions rather than one**, and
  they are different in kind, which is the thing to weigh:
  - **the motion vocabulary** — _work in progress loops, a state persists, a
    fact arriving decays_ — which Stories 3.6, 3.8 and 3.9 inherit, and which
    already governs a glyph the chrome also uses;
  - **a self-changing value announces nothing**, in `FRONTEND-STATE.md` §7 with
    four reasons and a trigger. That one reaches past this epic entirely: Epic 5
    has anomaly scores that change on their own and Epic 10 an agent event
    stream, and **both will meet the trigger rather than the decision**.

  One ADR, two, or none with a paragraph — but decide it against both, not
  against the motion half alone.

- **Confirm the deployed chrome really is unchanged.** Task 3.4.9 promised it
  and verified it with a unit test over every selection — `alpaca` still reports
  `sip`, `fixture` `synthetic`, `none` `null`. **The rehearsal is the first time
  a person sees the production path**, and criterion 8's walk with the market
  open is where that promise stops being a test and becomes an observation.
- **Do NOT expect the rehearsal to close §28's p95**, and do not let the sweep
  record it as met. Task 3.4.8 measured _frame delivered → price on screen_ at
  **p95 52 ms** on a production build; §28's clock starts at
  **server-received**, and **no message on the wire carries a server-side
  instant** — so there is nothing to subtract from and a real session supplies
  latency without supplying a way to measure it. `docs/GAPS.md` entry 12 holds
  the whole state and the decision is a protocol change rather than a missing
  test. **Owner re-assigned 2026-09-21, from Story 3.11 to Story 3.6 — Task
  3.6.4** — because three stories were carrying the criterion and none owned
  it; when that lands, this story's criterion 5 becomes measurable
  retroactively. What this sweep owes is only that the
  browser half is never quoted as the whole.

  > **AMENDED 2026-09-22 by Task 3.6.4 — it landed, and this instruction
  > inverts.** Every frame now carries `sentAt` (ADR 0033), and the whole
  > journey was taken at 518 subscribed securities on a production build:
  > **p95 6 ms** gateway send → frame in the page, **p95 68 ms** gateway send
  > → universe table repainted, n = 60, loopback. The one-row surface this
  > story built is a strict subset of that page's work, so the figure bounds
  > this story's criterion 5 from above. **The rehearsal may now record
  > criterion 5 as met by quoting that figure, with its ends and its loopback
  > condition named** — and if it wants this page's own reading, the four-line
  > instrument is in this story's `STORY.md` amendment and in Task 3.6.4's
  > record. `docs/GAPS.md` entry 12 is closed. The acceptance-walk row below
  > is left as it was written on 2026-09-21; it records what was true then.

- **The production-bundle recipe, if any criterion needs one** — Task 3.4.8's,
  and it is four lines rather than a rediscovery: `pnpm build`, then
  `CORS_ORIGIN=http://localhost:4173 pnpm --filter @marketpulse/backend start`,
  then `pnpm --filter @marketpulse/frontend preview`, then
  `E2E_BASE_URL=http://localhost:4173` in front of Playwright. The six-test
  motion spec passes against it as well as against `pnpm dev`.
- **Walk the acceptance criteria against a running system**, and `pnpm probe` at
  four viewports **with the market open**, which criterion 8 requires and which
  only this task can satisfy. **Probe the extended-hours case too, out of
  hours**: Task 3.4.6 measured the identity block at **88 px against 72 px** at
  390 when the word is present, so the block has two heights and only one of
  them has ever been photographed at four widths.

## Done when

- **A dated row in `LIVE-REHEARSAL.md`**, watched during a real session — not
  the replay
- A quiet minute was watched, and what it reads as is written down
- **The extended-hours mark was seen on a real bar**, which requires a window
  the session itself excludes — or its absence is recorded with the reason
- **A real correction was watched**, and both halves confirmed: the mark fires,
  the instant does not advance
- `VISUAL-LANGUAGE.md`'s "Epic 3 owns the vocabulary" sentence is corrected, and
  `CLAUDE.md`'s eight-deferral entry is closed rather than extended
- Both audits ran **with counts recorded**
- An ADR is written or its absence argued in a paragraph
- Every acceptance criterion in [`STORY.md`](STORY.md) is walked against a
  running system, with the market open
- `pnpm verify` and `pnpm e2e` pass

---

## What was found

### The rehearsal did not happen, and both reasons are measured rather than excuses

**It is 2026-09-21, 23:06 EDT on a Sunday.** `marketSessionStateAt` answers
`weekend`; the next session opens Monday at 09:30 EDT and pre-market at 04:00.

**And even then, a local rehearsal is refused.** Measured, not assumed:

```text
$ node scripts/capture-u-frame.mjs --handshake
socket open on wss://stream.data.alpaca.markets/v2/iex — waiting for the greeting
greeted; authenticating

ERROR FRAME: [{"T":"error","code":406,"msg":"connection limit exceeded"}]
```

**The free plan allows ONE connection and the deployment has it** — §8.2's
`406`, and `docs/GAPS.md` entry 10's standing blocker, unchanged. So the
rehearsal needs **two things this task cannot grant itself**: a session, and the
connection released.

**This is not a task that can be finished by trying harder**, and recording it
that way rather than running the replay again is the whole point of the
instruction _it cannot be skipped by running the replay again_ — the replay is
our own stored bars and agrees with our own assumptions by construction.

### What the rehearsal still owes, in one place

| Needs                                     | Window                        | Why nothing else can produce it                                                                                |
| ----------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **the extended-hours mark on a real bar** | 04:00–09:30 or 16:00–20:00 ET | the replay re-stamps onto the wall clock, so out of hours every bar lands on a **weekend** and carries no mark |
| **a genuinely quiet minute**              | 09:30–16:00 ET                | §7.2's _no frame at all_; only a real session has one                                                          |
| **a real correction**                     | 09:30–16:00 ET                | §7.8's fourteen; confirm **both halves** — the mark fires, the instant does **not** advance                    |
| **`pnpm probe` with the market open**     | 09:30–16:00 ET                | criterion 8                                                                                                    |
| **one vendor glance**                     | any live frame                | does a frame ever arrive stamped outside a trading day? Task 3.4.6 **assumed** not                             |

### The upward sweep — two sentences were false and both are corrected

- **`VISUAL-LANGUAGE.md`'s _"nothing here yet says what happens when a price
  changes"_** was true for five months and is false. The deferral is **kept as
  the record of why it was made** with a closing note above it, rather than
  rewritten — and its reasoning turned out to be right: a vocabulary settled
  against a table that arrives once _would_ have been designed for the easy
  case, and what made the hard case answerable was a number that moved.
- **`CLAUDE.md`'s _what a user can see today_** now carries the mark, the
  extended-hours word and the reduced-motion answer. The **fourth design test**
  entry was closed on 2026-09-21 rather than extended, which is the eighth
  deferral ending.

### Audit 1 — hand-offs, by enumeration, with the count

**Six stories are named by this story's files. Three had nothing actionable in
their own.**

| Named          | Times | In its own file?                                                            |
| -------------- | ----- | --------------------------------------------------------------------------- |
| Story 3.6      | 11    | **yes** — 8.63 marks/second, and 3.4.8's figures narrowing what the cost is |
| Story 3.9      | 5     | **yes** — its own file already names the vocabulary and the mark            |
| Story 3.11     | 2     | **yes** — §28's unmeasurable half                                           |
| **Story 3.5**  | 2     | **NO** — and the count concealed it                                         |
| **Story 3.8**  | 3     | **no**                                                                      |
| **Story 3.10** | 3     | **no**                                                                      |

**Story 3.5 is the one worth reporting**, because it is the exact failure this
audit's own wording warns about: _counting citations measures citation, not
delivery_. Its file had two references to Story 3.4 and **both were its own
authoring** — _"the screens are exactly Story 3.4's"_ — not a constraint handed
to it. The constraint that was missing is the largest one this story found:
**the empty snapshot makes the whole identity block change its claim on every
page load**, up to a minute in, which is a bigger visual event than any price
tick and which the motion vocabulary has no word for.

All three now carry a constraint in **words they can act on**:

- **3.5** — the snapshot event, §11.1's omission semantics, and _the arrival
  mark must not fire on a snapshot_.
- **3.8** — the extended-hours mark is **derived and must not become a stored
  field**; a stored observation keeps its instant exactly; and a replay of the
  store must not fire the arrival mark, because re-reading is not an arrival.
- **3.10** — _a still price is now three different things_, only one of which is
  a fault; nothing clears the prices; the mark simply **stops** and there is no
  fourth behaviour for that; and a reduced-motion reader never saw it anyway, so
  the instant that stops advancing is the signal.

### Audit 2 — construction sites, in both forms

**The export form: 10 exports, 1 with no non-test caller, and it is correct.**

`defaultReplayStartForTest` is called only from `market-stream.test.ts` — which
is what it is named for. It exposes a private calendar walk so the walk can be
asserted, and that walk is where Task 3.4.3 found a Saturday. The other nine —
`fromWireObservation`, `changeFromClose`, `extendedHoursAt`,
`EXTENDED_HOURS_WORDS`, `FEED_SERVES`, `REPLAY_FEED`, `worseFeedStatus`,
`observationIdentity`, `useArrival` — all have shipped callers.

**The reachability form: every published row walked from its producers.**

| Row                              | Producer                      | Reachable                            |
| -------------------------------- | ----------------------------- | ------------------------------------ |
| `--motion-duration-quick`        | 5 component stylesheets       | yes                                  |
| `--motion-duration-settle`       | 5 component stylesheets       | yes                                  |
| `--motion-duration-pulse`        | `ChartPending.module.css`     | yes                                  |
| `--motion-duration-decay`        | `SecurityIdentity.module.css` | yes                                  |
| `Live in the chrome` §11's pairs | `MarketDataProviderSelection` | walked by `market-feed-grid.test.ts` |

**Nothing unreachable, which is the first time this form has been run** — and
the reason it exists is that Task 3.4.9's defect had a caller, so the export
form returned clean while a documented row sat unreachable for four days.

### The open item this story fired: a sibling, not a widening

`CLAUDE.md`'s _nothing checks that a named region says something when its
subject is missing_ met its harder form. It is recorded as a **sibling** rather
than a widening, and the argument is that **the repairs differ**: the original
wants a region to **speak**; this one wants two speakers to **agree**, which is
checked by walking the **producers** rather than by rendering a state.

### The ADR question: ONE, and the absence of the second is argued

**[ADR 0032](../../../docs/adr/0032-a-value-that-changes-on-its-own-announces-nothing.md)
— _a value that changes on its own announces nothing_.** Written because it
reaches **past this epic**: `PRODUCT_SPEC.md` §11's anomaly scores change on
their own and §33's investigation stream pushes events for as long as an
investigation runs. Neither epic's file knows this decision exists, and the
natural thing to reach for — _it changes, so announce it_ — is what it decides
against. Its full statement is in `FRONTEND-STATE.md` §7; the ADR exists because
an author asking _should my anomaly score announce itself?_ will never look in
_how the frontend holds state and fetches_.

**The motion vocabulary deliberately gets no ADR**, and that is the more
interesting half. Its home is the **design canvas** by ADR 0026, with
`VISUAL-LANGUAGE.md` below it — and that document is read by **every story that
builds a screen**, which is exactly the audience. **A second home for it in an
ADR would be the duplication this repository fails a build over.** The one-line
version is in ADR 0032's _what this does not decide_, for a reader who arrived
at the wrong document.

So: **the two decisions differ in where their readers are**, not in importance,
and that is what decided one ADR rather than two.

### The acceptance walk — 7 of 9, and the two outstanding are not effort

|     | Criterion                                                             |                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | vocabulary, alternatives, trigger, canvas                             | **met** (3.4.5)                                                                                                                                                                     |
| 2   | every duration a token, proved by grep                                | **met** (3.4.5)                                                                                                                                                                     |
| 3   | reduced motion — a change still perceivable                           | **met**, asserted in a browser (3.4.7)                                                                                                                                              |
| 4   | direction never by hue alone, in greyscale                            | **met**, and now a check rather than a screenshot                                                                                                                                   |
| 5   | **250 ms p95 server-received → application state**                    | **NOT MET — unmeasurable.** Half taken at p95 **52 ms**; no wire message carries a server instant. GAPS 12; **owner moved to Story 3.6 (Task 3.6.4) on 2026-09-21**, was Story 3.11 |
| 6   | two changes inside one animation                                      | **met** — restart, stated and asserted                                                                                                                                              |
| 7   | no task over 50 ms, no layout thrash                                  | **met** — **zero** long-task entries across 6,640 observations                                                                                                                      |
| 8   | probe at four viewports, **and a person looked with the market open** | **HALF MET** — probed many times, including both block heights; the market-open half is the rehearsal                                                                               |
| 9   | `pnpm verify`                                                         | **met** — 299 / 896 / 1031 / 19, 14 invariants                                                                                                                                      |

### Both block heights, at four widths — and the second exists at ONE width only

Task 3.4.6 measured 88 px against 72 px **at 390** and the record has said _the
block has two heights_ ever since. Photographed at all four:

| Width   | pre-market | regular    | after-hours |
| ------- | ---------- | ---------- | ----------- |
| 1440    | 415×**72** | 331×72     | 422×**72**  |
| 1024    | 415×**72** | 331×72     | 422×**72**  |
| 768     | 415×**72** | 331×72     | 422×**72**  |
| **390** | 358×**88** | 331×**72** | 358×**88**  |

**Above 390 the word costs nothing at all** — the qualifier still fits on one
line. The second height is a phone-width fact rather than a property of the
state, which is narrower than the record implied and is the useful correction.

## For a stakeholder — a status report, 2026-09-21

**This task is the story's closing act, and it is the one task in this story
that could not be finished.** Everything that does not need the live market is
done; the part that does is waiting on two things, and neither is effort.

**The first is the clock.** Closing this story requires watching the product
against the **real market**, not against our recording of a past day — because a
recording agrees with our own assumptions by construction, so a successful
rehearsal against it would prove nothing. It is Sunday evening in New York. The
market opens tomorrow.

**The second is our own deployment.** Our data provider's free plan allows
**one** live connection, and the deployed site holds it. We checked rather than
assumed — the connection was refused, in as many words. So even when the market
opens, running this rehearsal means standing the deployed site's feed down for
the duration, which is a decision rather than a task.

**We wrote down exactly what the rehearsal still owes**, so it is a
half-hour's work when the window opens rather than a rediscovery: the
before-the-bell mark on a real price, a genuinely quiet minute, a real
correction, a look at four screen sizes during trading, and one glance at
whether our data provider ever sends a price stamped outside a trading day —
something we currently **assume** it does not.

**What did get done, and two things in it are worth reporting.**

**We audited what this story handed to other pieces of work, and found three
gaps.** One of them is the kind this project has been caught by before: a story
that _mentions_ another story is not the same as a story that **tells** it
something. One piece of upcoming work referenced this one twice and had been
told nothing — and what was missing was the biggest visual finding we made: on
**every page load**, the price block changes its entire claim about a minute in,
and that is a larger event than any price tick. All three now carry instructions
in their own notes, in words they can act on.

**And we wrote one architecture record, not two, for a reason worth explaining.**
Two decisions from this story outlive it. The first — how a changing price
looks — already lives in the design system that every screen-building task
reads, and copying it into a second document is exactly the duplication this
project fails a build over. The second — **a value that changes on its own does
not announce itself to a screen reader** — reaches well past this phase into
work nobody has started, and the people who will need it would never think to
look where it currently lives. So that one got the record, with the condition
under which we would change our minds written into it.

**Two of nine acceptance criteria are outstanding, and we are naming them rather
than rounding up.** One is the market-open observation above. The other is a
speed target we **cannot currently measure**: our figure covers the browser's
half of the journey and is a fifth of the budget, but the message arriving from
our server carries no timestamp, so there is nothing to subtract from. That is a
decision about our own protocol and it belongs to a later piece of work —
recorded honestly rather than quietly counted as passed.

**What a user can see today: nothing new.** The story's visible work shipped
over the preceding days; this task is the part that makes it defensible.

---

## Amended 2026-09-21 — the blocker halved, and the venue was wrong

**Nothing here changes because of Task 3.4.7**; that sweep ran when 3.4.7 landed
and its amendments are in 3.4.5, 3.4.8, this file and `STORY.md`. What changed
is the world this task recorded as blocking it.

### The deployed feed was dead when this was written, and is not now

The blocker above reads _the deployment has the connection_, measured at 23:06
EDT. True then, and it was the **lesser** half of the problem: at that moment
the deployed backend was also in `CrashLoopBackOff`, reporting
`{"status":"disconnected","observedAt":null}` — so production held the one
connection **and could not use it**. Six fatal exits, and three merges that
never reached production.

That was repaired the same night (`alpaca-stream.ts`'s retry wrote the
handshake into a socket that had not opened). Production now reads:

```text
{"provider":"alpaca","feed":"iex","status":"live","observedAt":null,"marketOpen":false}
```

`observedAt: null` is correct at 10:55Z on a Sunday — the market is shut and no
bars flow. **What matters is `status: live`: the socket connects, authenticates
and subscribes.**

### So the rehearsal's venue is the DEPLOYED SITE, not a local pair

This task framed the blocker as _a session, and the connection released_, which
assumes a local rehearsal. **The epic's exit criterion does not**: it asks that
every visible story has been _watched working against the real IEX socket,
during a real session_. **Production is that socket**, and it needs nothing
released.

| What the rehearsal owes                                   | Deployed site alone?                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| the extended-hours mark on a real bar                     | **Yes** — open it 04:00–09:30 ET                                                                   |
| a genuinely quiet minute                                  | **Yes** — watch during a session                                                                   |
| a real correction, both halves                            | **Yes** — the mark fires, the instant does not advance                                             |
| `pnpm probe` with the market open                         | **No** — probe runs against a pair you started, so this still needs the connection or a substitute |
| the vendor glance — a frame stamped outside a trading day | **No** — frame-level access, so the connection or **Story 3.11's logging**                         |

**Three of five are unblocked by a browser and a Monday.** The remaining two are
the honest residue, and the second is better answered by 3.11 wiring `onLog`
than by standing the deployment down.

### And what the rehearsal will SEE has changed underneath it

This list was written before Story 3.5 existed. Production is now running
`1a569e0`, which includes 3.5.1–3.5.6, so **do not read these as regressions**:

- **The first-paint flash is gone** (3.5.4). The identity block is correct on
  the first frame; it no longer shows `LAST SESSION CLOSE` and then changes all
  three lines a minute later. That event was the thing 3.4.3 recorded as _the
  biggest visual change on the page_ — its absence is the deliverable.
- **A page subscribes to the one security it shows** (3.5.6), so the feed a
  rehearsal watches is **scoped**, not the whole universe.
- **A tab survives a deploy** (3.5.5) — worth confirming opportunistically if a
  merge lands mid-session, since it is otherwise hard to arrange.
  > **AMENDED 2026-09-22 by Task 3.6.5 — confirm it deliberately rather than
  > opportunistically, and on `/securities/NVDA`.** That task's gates found a
  > tab that did **not** survive a deploy on a developer's machine: a
  > subscription change in the 500 ms between the gateway's `1001` and the
  > retry's dial called `send` on a closing socket from a React effect, and
  > nothing above `App` catches an effect's throw — the page went **blank**
  > until a reload. It bisected to `main`, so it was live in every deploy
  > since Task 3.5.6, and it is repaired (the transport asks the socket's own
  > `readyState`). The rehearsal is the first time a person watches a real
  > deploy under this page, and that is what the fix is for.

**None of this weakens the five items above**; it changes what a watcher should
expect between them.

---

## Handed here by Task 3.5.8 — 2026-09-21: five figures you can confirm for almost nothing

**Written into this file rather than left in 3.5.8's record**, because that task
wrote _"handed to Task 3.4.10's rehearsal"_ in its own pages and nowhere else —
which is the shape this epic has now lost a constraint to **twice**. A pointer
is what a reader follows when they already know to look.

### What 3.5.8 could not confirm, and why it is your blocker too

Task 3.5.8 was asked to **confirm six recorded figures rather than re-derive
them**. It confirmed one — `LIVE-DATA.md` §10.3's _0.2 MB_ current-state map,
measured at **222.8 KiB**, within 9%.

**The other five are observations of the vendor's socket**, and re-taking any of
them needs exactly what you need: a live session **and** the plan's one
connection, which the deployment holds (`docs/GAPS.md` entry 10).

| Figure                                                                           | Source | What confirming it needs                                      |
| -------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| 1,500 symbols accepted in 305 ms                                                 | §4.3   | a subscribe frame against the real socket                     |
| 65.1% median minute coverage, **2.1% for `ERIE`**                                | §7.6   | a session's worth of frames                                   |
| p50 gap one minute, **maximum 187**                                              | §11.2  | a session's worth of frames                                   |
| 332 bars in 243 ms                                                               | §7.4   | one open burst                                                |
| Revisions **0.064%** of bars, **29.1–30.1 s** late, **35.3%** changing the close | §14.1  | a session, and it overlaps your _real correction_ row exactly |

**They are currently recorded as _cited with their dates_ rather than
re-confirmed** — deliberately, because letting a citation read as a
confirmation is the failure `CLAUDE.md`'s _measure rather than cite_ exists to
prevent.

### Why this costs you almost nothing

**Three of the five fall out of what you are already watching.** Your list
already owes _a genuinely quiet minute_ (§11.2's gap), _a real correction_
(§14.1's both halves) and _one vendor glance_. A session that produces those
produces the evidence for §7.6, §11.2 and §14.1 as a by-product — the marginal
cost is **writing the numbers down**, not gathering them.

§4.3 and §7.4 need a little more: the accepted count on the acknowledgement,
and the size of the open burst. Both are single readings, and Task 3.5.3
already made the accepted count something the client **logs**.

### What this does NOT ask of you

**Not a re-derivation.** If a figure still looks right, say _confirmed_ with the
date. If it has moved, that is the more valuable outcome and it sweeps
**upward** — `LIVE-DATA.md` is Story 3.1's document, so a moved figure is
corrected there rather than here, on the day it is found.

**And not a blocker on your own close.** These are a bonus the same session
buys. If the rehearsal happens and nobody writes the five down, the story still
closes — they simply stay cited rather than confirmed, and the next person to
need one pays the full cost of taking it.

---

## Amended by Task 3.6.1 — 2026-09-21: what the rehearsal will see has changed again, and three stories can now be one sitting

**This is the second time this task's blocked list has been overtaken by work
done after it was written**, which is what happens to a rehearsal that waits on
a calendar.

### The surface grew

The list above is about the **security page**. Since Task 3.6.1 the
**tracked-universe table on `/securities` is live too** — 518 rows whose `Last`
and `Change` columns move on their own — so the same sitting now has two
surfaces to watch rather than one.

**Two things on that table are worth a deliberate glance** and neither is
checkable by anything mechanical:

- **Does it read as calm or as a fairground?** Nothing marks an arrival yet
  (Task 3.6.2 decides that in front of this running), so what a rehearsal sees
  is the _floor_ — 518 figures changing with no decoration at all. **If that is
  already too busy, Task 3.6.2's answer is decided before it starts.**
- **Does a row with no live price read as a fact or as a fault?** Roughly 200 of
  518 on a given minute, and they carry a session date where the live rows carry
  none. That treatment is Task 3.6.1's and it has never been seen against a real
  mixture — only against a fixture stream, where everything went live at once.

### The rehearsal ledger now wants three rows, and they are one sitting

`LIVE-REHEARSAL.md` has empty rows for **3.4** (this one), **3.5** — added at
that story's close, which found it had been wrongly exempted — and **3.6**.

**All three are watchable in one visit to the deployed site during a session**,
because production runs the real IEX socket and the three surfaces are the
chrome, the security page and the universe table. The file's own rule is that a
rehearsal is **minutes, not an evening**; three of them are still minutes.

**Do not record one row and infer the other two.** A row is added by the story
it names, and `What was wrong` is the column that earns the file.

### And one item on the list above has an answer now

The list records `pnpm probe` with the market open as still needing the
connection. **That is unchanged** — but Task 3.6.1 took `pnpm probe` against a
**fixture** stream and found a real defect with it: rows at 35px and 53px, and a
row changing height the first time an observation reached it. So the probe is
worth running against whatever stream is available rather than waiting for a
live one; it found a layout defect that every automated check was green through.

---

## Amended by Task 3.6.2 — 2026-09-21: two audit rows moved, and the hand-off row's figure was wrong

**This task ran two audits whose whole value is that they can be re-run.** Both
have rows that are now false, so both are corrected rather than left to fail
quietly on the next pass.

### The export form

`observationIdentity` no longer lives in `SecurityIdentity.tsx`. It moved to
**`apps/frontend/src/market/arrival.ts`** on 2026-09-21, with a second function
beside it — `arrivalKey` — because Task 3.6.2 gave the arrival rule a **second
consumer** and two implementations of _what counts as an arrival_ is the shape
Task 3.5.2 removed from the subscription. `useArrival` stays where it is: the
identity block needs a hook because the route changes symbol underneath it
without re-mounting, and a table row is keyed by its symbol, so the same rule
reduces to a pure function there.

### The reachability form

| Row                       | Producer, as this task recorded it | Producer now                                                                           |
| ------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `--motion-duration-decay` | `SecurityIdentity.module.css`      | **`styles/motion.module.css`**, composed by `SecurityIdentity` **and** `UniverseTable` |

**The move is the point rather than a detail.** The token had one consumer when
this table was written; it has two now, and the shapes moved into a shared
layer so the vocabulary has one home. A re-run of this form against the old row
would report a producer that no longer declares it.

### The hand-off row's figure

The table of stories named in this story's documents records **Story 3.6** as
carried _"yes — 8.63 marks/second"_. **The hand-off happened and the figure in
it was wrong**: see Task 3.4.8's amendment. The constraint reached 3.6's own
file, which is what this form checks; what the form cannot check is whether
what reached it was true.

**That is a limit of the audit worth stating.** It counts whether a constraint
crossed the boundary, not whether it was correct when it did — and a confident
wrong figure crosses just as cleanly as a right one.

### And the rehearsal gained its sharpest item

Task 3.6.2 kept the mark unchanged at 518 and recorded a reversal trigger that
**only a rehearsal can evaluate**: _the first rehearsal in which a reader
describes the minute tick as a **flash** rather than as a **pulse**_.

Everything measurable says the mark is cheap and rare. What no measurement
settles is whether **~321 discs appearing together, once a minute** reads as a
market breathing or as a page flashing — and held at full density in the
browser they form a vertical column that reads more like furniture than like
events. **Watch for it deliberately**, because it is the one question this
story's own subject left open and the answer is a judgement rather than a
figure.

---

## Addendum — what the 2026-09-22 sitting answered, item by item

The rehearsal Story 3.6 owed was one sitting with this story's, and it was
taken on 2026-09-22 09:44–10:38 ET by Claude through a headless browser
against the deployed site (`LIVE-REHEARSAL.md`, the 3.4 row and note 1). The
table above, verdict by verdict:

| Needs                                     | Verdict from the sitting                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **the extended-hours mark on a real bar** | **Still owed.** The market was open for the whole sitting; every instant read `HH:MM EDT · change from …` with no qualifier, which is correct and answers nothing about the qualifier.                                                                                                                 |
| **a genuinely quiet minute**              | **Not seen in the six minutes actually observed** — every observed minute had at least one bars frame — and the stretches the stalled instrument did not watch cannot be counted as seen. Still owed as a sighting; not owed as a repair.                                                              |
| **a real correction**                     | **Not observable by this instrument**, which kept frame counts and not instants. Still owed, and the next instrument keeps `(symbol, startsAt)` per frame so a repeat is a correction.                                                                                                                 |
| **`pnpm probe` with the market open**     | **Not taken.** `probe` runs against a local pair, and the deployed page was photographed at 1440 only. The block was seen at one width with a live figure: `LATEST PRICE 228.05 ▲ +0.29% · Sep 22 · 09:44 EDT · change from 2026-09-21's close`.                                                       |
| **one vendor glance**                     | **Answered for this sitting only.** Every bars frame seen was stamped inside the 2026-09-22 session (13:46:00Z, 13:48:00Z, 14:04:00Z, 14:05:00Z, 14:08:03Z …); none arrived stamped outside a trading day. Task 3.4.6's assumption held on the day it was looked at, which is what a glance certifies. |

**What the sitting did see on this story's surface**: the figure, the glyph
and the instant changing together across seven readings — up, down and
`— unchanged 0.00%` all carried a glyph or a word beside the hue — and one
arrival mark on the block. **What was wrong on the surface: nothing.** What was
wrong beneath it is the chrome's venue word (ledger note 3), 3.3's and now
Story 3.10's.

**Criterion 8 therefore reads: probed (met) and a headless watch looked with
the market open (taken, with the word _person_ left to the owner).** The story
does not mark itself closed on that; the three items above stay owed, and the
first sitting on a shut market takes the first of them.
