# ADR 0029 — Provenance on screen, the partial states, and what an honest empty answer certifies

**Status:** Accepted
**Date:** 2026-09-15
**Delivered by:** Epic 2, Story 2.14 (Tasks 2.14.1–2.14.10) — and it closes Epic 2

## Context

Story 2.14 made the product tell the truth about its own data. That sounds like a
caption exercise and is not: what it actually settled is **who is allowed to say
what, about which data, in whose words** — and every one of those rules is
exercised again by an epic that has not been written yet.

**Three later epics inherit the pattern rather than the sentences.** Epic 3 turns
_which feed_ into _which feed, and is it still connected_, and is the first thing
that can produce a series whose sources disagree. Epic 8 hangs evidence
provenance — source, event timestamp, retrieval timestamp, calculation method —
on a finding, which is the same shape pointed at a different claim. Epic 10 hands
a tool result to a model with none of a page's other fetches behind it, which is
the condition that reverses decision 7 below. Invariant 5 already says confidence
and provenance are part of the domain model rather than prose; this is the ADR
that says what the model is allowed to print.

**And this epic began from an inverted premise, which is why the rules matter
more than the wording.** The story was planned against _Alpaca's free tier is
IEX, label it as a disclaimer_. It is the opposite: stored historical bars are
the consolidated SIP tape and only the live stream is IEX
([`ALPACA.md`](../../planning/epic-02-security-universe-historical-data/story-07-alpaca-historical-data-integration/ALPACA.md)
§2). A product that had written the disclaimer into a component would have
shipped a **false hedge** — a screen disclaiming coverage it has — and no check
anywhere would have seen it. What protects against the next inversion is not a
better sentence; it is that the sentence has one home, derived from data, guarded
by a grep.

The working record is
[`PROVENANCE.md`](../../planning/epic-02-security-universe-historical-data/story-14-provenance-partial-states-and-epic-close/PROVENANCE.md),
twelve parts, which carries every alternative, every measurement, every reversal
trigger and the two passes (the coverage-honesty string pass, §11; the failure and
partial-state set, §12). **Every figure in it is dated and is an observation
rather than a fact.** This document cites it rather than restating it, except
where a number _is_ the argument.

## Decisions

### 1. A claim about data requires data, applied per clause

`market-bars.ts` exports `SOURCE_OF_NOTHING` — a fully-formed, entirely truthful
provenance record describing **zero bars**. A screen that prints it says
`All US exchanges · Unadjusted · retrieved 8 September` under an empty frame:
four accurate words describing nothing, which is a **stronger false impression
than silence**, because a reader takes them as a claim about the picture.

So the feed, the adjustment and the coverage sentence all render nothing when
`bars.length === 0`.

**And the rule is applied per clause, not per note** (§0.1, amended 2026-09-14).
The classification clause's data is not the bars — it is the universe response,
which on a zero-bar page has resolved and is still printing
`Technology · Semiconductors · NASDAQ` three centimetres above. Suppressing the
only sentence saying those two words are curated, because a _different_ fetch
came back empty, removes a true claim from the page where least else competes for
attention. It is also the commonest page in the suite: **CI's store is 518
securities and zero bars**, so the rule applied per note would suppress that claim
on every page CI renders.

Each clause renders when its own data is present; the note renders when at least
one clause does.

**It governs assertions as well as renderings, in both directions** (added
2026-09-15 by Task 2.14.9). A deployed spec may assert only what the environment
it runs against can actually produce. A state that renders when something is
wrong is unassertable on a healthy site exactly as a state that renders when data
is present is unassertable on an empty store. It is the same rule pointed at a
test rather than at a screen, and it is why
`specs-deployed/security-explorer-journey.spec.ts` asserts structure and no
figure.

### 2. The note states what the chrome cannot, and never repeats what the chrome can

The Security Explorer gains **one** source note, at the foot of its region group,
in the micro type — not one per region. Its governing rule resolves the
prominence question by answering a different one: not _how loud_, but _what is
this surface for_.

| Fact                                          | Who states it                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| the deployment's feed                         | the **chrome**, always                                                                                                  |
| **this series'** feeds                        | the **note**, when they number more than one, or when the single feed is not the one `useMarketFeed` reports configured |
| the adjustment                                | the **note**, always (when there are bars)                                                                              |
| when these bars were retrieved                | the **note**, always (when there are bars)                                                                              |
| where sector and industry came from, and when | the **note**, always                                                                                                    |

**The operative form of the rule is _suppression requires a positive match_**
(§1.3, amended 2026-09-14), and its interesting property is that the duplication
it exists to prevent became **structural**: the note's condition for naming a
feed is the negation of the chrome's condition for claiming one, so the two
cannot print the same fact. A rule that only a reviewer enforces became a rule
the types enforce.

The second condition **fires today**, and on the default deployment:
`MARKET_DATA_PROVIDER` defaults to `none`, the chrome then reads
`MARKET FEED — NOT CONFIGURED`, and the store goes on serving stored bars
regardless, because a stored series does not need a live provider. So the page
holds numbers while the chrome makes no feed claim at all — and the note is the
only thing that can say whose numbers they are.

**Three captions for one fact set is the footnote pile**, and it is exactly what
five correct additions made one at a time produce. That is why
[Task 2.14.2](../../planning/epic-02-security-universe-historical-data/story-14-provenance-partial-states-and-epic-close/TASK-02-the-provenance-surface-on-the-canvas.md)
drew all of it on a canvas at once, before any of it was a component.

### 3. A series' feeds are named as a ledger — each stretch, in contribution order, with its bar count

A stitched series must **never collapse into naming whichever feed is first in
the list**. The sentence names every stretch:

> Stitched: 780 bars from **All US exchanges**, then 30 from **IEX**.
> _Trades reported by the IEX exchange only — not the full US consolidated tape._

**The counts are what make _whichever is first_ visibly wrong rather than
invisibly wrong.** A reader told _780 then 30_ cannot mistake the chart for a
single-venue chart, and a renderer that dropped a source produces a sentence whose
arithmetic does not reach the bar count on the axis. `barCount` rather than a time
range, because `barCount` is what `BarSource` carries; walking the bars in the
client to compute a range is the client **deriving** provenance rather than
reading it.

The `iex` sentence rides along under the inherited rule (ADR 0019 §3): a feed gets
a sentence when its label cannot stand alone. **That is where invariant 6's fence
actually stands — not on the acronym, on the sentence under it.**

**Reversal trigger: the first source whose stretch is not contiguous.** A count
locates a stretch only while each source contributes one run of bars; the moment
one does not, the count stops answering _which part_ and the wire owes a range.

**One structural condition this depends on, and it is Epic 3's to honour.** The
sentence is true only while the IEX tail is stitched **at read time** from a
provider result. `bar_coverage` holds provenance per `(security, timeframe)`, not
per bar — so the day Epic 3 **stores** an IEX bar into `market_bars`, the single
provenance row describes it as SIP, `mergeSeriesProvenance` is never called, and
the series reports one feed with complete confidence and is wrong. That is a
defect in the store, not in this wording.

### 4. Return a structure, not a sentence — and one function, two readers

Every vocabulary in this layer returns **structured description** rather than an
assembled string: the ordered stretches each with label, count and optional
sentence; the adjustment as a label plus a sentence; the coverage phrase as a
phrase, not a paragraph. A function returning one string forces a renderer to
choose between markup and plain text, and puts the emphasis inside the string.

**That shipped as a mechanism rather than a preference, and it generalises past
provenance.** The drawn sentence and the spoken one are **one string with two
renderings**, and a second copy **fails the build**: `pnpm invariants` holds that
each of these sentences has exactly one home, and `scripts/breaks.mjs` proves each
check goes red. Every surface this product gives a screen reader has a visible
twin, and the two channels are deliberately worded differently — visible text is
written to be scanned, an announcement to be heard once — which is precisely the
condition under which two hand-written copies silently disagree.

**The sibling rule, from `VISUAL-LANGUAGE.md`: a surface that owns nothing
defers.** The surface that owns the data owns the account of it; everything else
points once and stops. A region whose subject is missing **says something or
defers, and never nothing**. And a deferral is spoken where an answer is spoken,
because the test is whether a spoken twin already exists. Two surfaces shipped
that shape before it was a rule — search deferring to the tracked universe, and
the volume plot deferring to the Price region — which is the usual sign that it is
one. Both rules are the same instinct: **one fact has one home.**

**Where the words live** (§9): a vocabulary describing a domain value lives in
`packages/shared` beside that value; a sentence assembling several of them for one
screen lives beside the component that draws it; **neither is ever a literal
inside JSX**. `FieldGroupProvenance.source` is a free string by design, so no
compile-time table can guard it — the note names the **group**, never the slug,
and a renderer printing `s&p-500-gics + curated ETFs` at a reader is printing an
internal slug.

### 5. The coverage sentence is bound to `partial`, and has a visible home rather than only a spoken one

> holding 59 bars, **through 2026-09-11 16:00:00 EDT**, of a window running to
> 2026-09-14 16:00:00 EDT.

It appears exactly when the answer is short of the window asked for. On `loaded`
the axis is the answer. On the picture, a short answer is already told by the
uncovered wash and the coverage edge — enough to say _something is missing_ and
_it stops here_, and not enough to say **when**, which is exactly what a reader
cannot recover from a session-ordinal axis.

**The instants are written in full**, and the canvas drew them short. The first
partial answer on a running pair is why: it reads _through 2026-09-11 16:00:00
EDT, of a window running to 2026-09-14 16:00:00 EDT_ — two different days, which
the short form renders as _"through 16:00, of a window running to 16:00"_, a
sentence saying a window was missed by nothing at all.

**It is not a source-note clause**, and the distinction stated positively is the
reusable half: the note answers _whose numbers are these_; a reader asking _how
much of my window did you answer_ is asking about the **request**.

**Reversal trigger: the first reader that has to tell _we hold all of it_ from
_we hold all of it that exists so far_.** Epic 3's live tail is the named
candidate — a fully-covered window during a session is complete and still moving,
at which point `loaded` needs a sentence too.

### 6. The adjustment is one value per series, and it is unrepresentable per source

`adjustment` sits on `SeriesProvenance` and **not** on `BarSource`;
`SeriesProvenance` is branded and obtainable only from `toSeriesProvenance` or
`mergeSeriesProvenance`; and the second **refuses** to join two adjustments. So
the trap — _every stored bar is the same adjustment, so a per-source disclosure is
one fact repeated N times until the day it is not_ — has no day on which it is
not.

`raw` is invisible in testing and **wrong exactly once**: a series spanning no
corporate action returns identical numbers in both modes, which is almost every
series almost all the time. The disclosure is cheap today for the same reason it
is nearly pointless today.

**Reversal trigger — and it makes the disclosure louder, not absent: the first
window this product offers that spans a corporate action in a security it
tracks.** Epic 5's return percentiles are the named candidate, where an
unadjusted 10-for-1 is _"a −90% return sitting at the 100th percentile of every
distribution it touches, producing a permanent, confident and entirely false
anomaly."_

### 7. The two empty answers are told apart on the screen, not on the wire — and the general rule is degradation

_We hold nothing for this security_ and _we hold nothing in this window_ are the
same 200 body and imply different next actions. They are told apart **on the
client**, from `SecuritiesResponse.coverage`, whose own comment carries the
property this turns on: a security with no bars is **absent from the array rather
than present with a zero**. The Explorer already fetches `GET /securities` for its
identity block, so the distinction costs no wire change.

What it costs instead, stated so it is a decision rather than a saving: the empty
state depends on **two** requests; `coverage` is `1m`-only, so a security holding
minute bars and no daily bars reads as case two at `3M` and `1Y`; and the
distinction is a property of the **screen**, not of the response.

**The general rule, which is the half with reach: a surface may make the confident
claim only when the thing that would license it has actually been read.** When the
universe answer is not available, the vacancy says the window sentence. It never
guesses about the store from an absence it could not read. That is why
`StoredHistory` has **three** members and not two, and the failure of one request
must never produce a confident sentence about the other.

**Reversal trigger: the first consumer of `GET /market-data/bars` that does not
also hold the tracked universe.** Epic 10's agent tools are the named candidate —
a tool result is read on its own, and _"nothing held"_ against _"nothing in this
window"_ is exactly the distinction a model must not be left to infer.

**Four literals, not two**, because there are two plots under one axis and each
names its own subject: a price plot saying _no history for NVDA yet_ above a
volume plot saying _none for this window_ tells a reader two different stories
about one empty screen. The two answers are otherwise identical in weight — same
marker, type, ink, position and ground — because the difference between them is a
fact about our store rather than a difference in severity.

### 8. This epic ships a measured exception to `PRODUCT_SPEC.md` §28, and it is owned rather than accepted

Every cold load of `/securities` and `/securities/:symbol` spends one main-thread
task of **50–76 ms** against §28's _no routine main-thread task > 50 ms_.
Measured three times and attributed from both ends each time; it is the
**518-row universe table**, not the chart. Deployed it is **52–54 ms on two of
six cold loads at 1440** — the bottom of the band, and intermittent where locally
it is every cold load, which is most plausibly an internet round trip spreading
the same work across more frames.

**Owner: Epic 14**, beside `Expand all`'s 69–87 ms exception, which is the same
component and probably the same repair — ADR 0024 carries that one as exactly
this kind of bullet, which is the precedent being copied. **The trigger is kept
above the epic**, because a trigger nobody reads at the moment it fires never
fires: _the first time a second surface on that page renders per-row markup at
universe scale_. Epic 5's anomaly-score-per-security is the named candidate, and
Epic 5's `EPIC.md` carries the trigger for that reason.

**§28's target is not amended.** It gained a dated amendment **naming the two
exceptions**, which is the opposite move from watering a target down. An ADR that
records a decision about a screen and omits the one published target that screen
misses is the kind of omission a reader finds later and distrusts the whole
document for.

## What a green suite certifies here, and what it does not

### What it certifies

- **That each of these sentences has exactly one home.** `pnpm invariants` holds
  it for the four vacancy literals, the coverage sentence, the volume deferral and
  the feed's words; `pnpm break` proves each check goes red under a documented
  substitution, one break per literal, because a break proves one substitution and
  not a loop.
- **That no renderer writes its own words for a feed** — the check that stands
  where invariant 6 stands.
- **That every apostrophe a reader sees is the same glyph**, which typechecks,
  lints and renders identically either way and matches whichever glyph the
  assertion happened to use.
- **That no recorded market body reaches the shipped bundle**, seven of them,
  each by a string distinctive to it — re-run on 2026-09-15 against the **deploy**
  build (`VITE_API_BASE_URL` set to the deployed backend), which is a different
  invocation from the one they had always been run against.
- **That the deployed environment walks the epic's exit criterion on every
  deploy**: search NVDA, open it, read price and volume, change the window.

### What it does NOT certify

- **That a drawn sentence and its spoken twin describe the same answer.** They
  share a derivation, not a string — deliberately, since the two channels are
  worded differently. What stops them drifting is one value threaded from one
  place (`storedHistoryFor`) and a unit test on each side.
- **That the two-feed ledger says something true.** All sixteen recorded
  bar-series bodies carry `feed: "sip"`, `stitched.json` included, because both
  halves of that stitch came from Alpaca's historical API. The state is reached
  through `twoFeedStitchView()` — the recorded stitch with **one field changed**
  through the real transition. **No server this product runs can produce the
  answer this sentence renders.**
- **That a polite live region changing every 477 ms queues or replaces.** That is
  a property of a specific screen reader on a specific platform, readable from
  neither the DOM, a timing, nor an agent.
- **That the in-frame empty sentence is legible on the ground it sits on.**
  `--chart-uncovered` is 1.107:1 against the plot ground, `getTokens()` throws
  where no stylesheet is applied, and a browser is the only level that can see
  contrast.
- **That a region whose subject is missing says anything at all.** A region whose
  content is legitimately conditional looks identical to one whose content
  silently disappeared. One screen is covered by one browser test; no general
  check exists.
- **That the `synthetic` feed branch is right.** It has never executed — no
  recorded body carries it.

## Consequences

- **Epic 3 inherits the pattern and two unproducible sentences.** The two-feed
  ledger and _No shares changed hands anywhere in the window._ are both correct
  today and both become false the first time an IEX tail is stitched on: the
  first because the store cannot say which tape a row came from, the second
  because it is the only shipped sentence claiming something about **the market**
  rather than about our store, and a single venue's silence is not the market's.
  Both are in [`docs/GAPS.md`](../GAPS.md) with a re-measure.

  > **Amended 2026-09-24 — both prophecies came true and both are discharged,
  > by Tasks 3.9.7 and 3.9.8.** The paragraph above is left standing because it
  > is the prediction, and it was right on both counts and for the stated
  > reasons. The ledger: `market_bars` gained a `feed` column (ADR 0034), a
  > served window derives its sources from the stored rows, and the frontend's
  > version of the state is a **recorded** body since Task 3.9.7. The sentence:
  > it has one home since Task 3.9.8, `describeSilence`, which reads its scope
  > off the series' own tapes — `anywhere` only where the consolidated tape is
  > what we read. Both are checks with breaks behind them now rather than
  > entries in a list. **Decision 1 is what did the work in both cases**: a
  > claim about data requires data, applied to the scope of a claim rather than
  > to its presence.

- **Epic 8's evidence provenance is this shape pointed at a different claim.**
  Source, event timestamp, retrieval timestamp, calculation method, raw-data
  reference — and the rule that governs it is decision 1: a claim about evidence
  requires evidence, and _"not enough evidence to explain this move"_ is the
  first-class outcome that rule produces.
- **Epic 10 is the named candidate for reversing decision 7.**
- **`pnpm invariants` grew from seven claims to twelve over this story**, and
  four of those twelve are one invariant guarding four literals. The count lives
  in the run's own output; the prose copies of it have been stale twice.
- **The failure and partial-state set is a set rather than a per-component
  checklist**, and producing it that way is what found four defects none of which
  was visible one state at a time (`PROVENANCE.md` §12.3).

## Related

- [ADR 0018](0018-the-market-data-seam-provenance-on-screen-and-what-a-fixture-backed-test-certifies.md)
  — the provider seam and the first provenance on screen
- [ADR 0019](0019-the-alpaca-client-a-measured-vendor-and-what-a-recorded-fixture-certifies.md)
  §3 — _a feed gets a sentence when its label cannot stand alone_, inherited here
- [ADR 0021](0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)
  — the grain of provenance on the wire
- [ADR 0024](0024-search-selection-and-the-security-explorer-shell.md) — the
  Explorer shell, and the `Expand all` exception this ADR's decision 8 is joined
  to
- [ADR 0027](0027-the-chart-layer-hand-built-svg-and-what-a-green-chart-suite-certifies.md)
  §14.1 — the coverage rule the coverage sentence qualifies
- [ADR 0028](0028-the-time-window-the-per-bar-mark-and-the-answer-that-stays-on-screen.md)
  — the window the coverage sentence is measured against
