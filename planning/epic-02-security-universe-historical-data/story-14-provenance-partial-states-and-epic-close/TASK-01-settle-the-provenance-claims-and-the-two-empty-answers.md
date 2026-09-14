# Task 2.14.1 — Settle what this product claims about its own data, and create the subject document

**Status:** Complete (2026-09-14). Subject document:
**[`PROVENANCE.md`](PROVENANCE.md)** in this directory — created by this task.
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** Story 2.13 (complete)

## Objective

Take this story's three open decisions — **how prominent the feed label is**,
**the exact wording when a series' sources disagree**, and **whether "data
through …" appears when the data is simply historical** — plus three more this
story cannot avoid and no later task should be left to take by accident, and
write them into **`PROVENANCE.md`** before a single string reaches a screen.

Tasks 2.9.1, 2.10.1, 2.11.1, 2.12.1 and 2.13.1 are the precedent. What is
different here is that every decision on this list is a **claim about the truth
of a number**, not a mechanism. A window chosen badly is a product that is
awkward; a provenance sentence chosen badly is a product that is **wrong about
its own data**, which is the one failure PRODUCT_SPEC.md §35 names explicitly
and invariant 6 exists to prevent.

## What the user can see when this lands

**Nothing.** No new label, no new sentence, no new state. The payoffs are Task
2.14.3 (the series' own provenance on screen), Task 2.14.4 (the curated file's
age) and Task 2.14.5 (recency). Say "nothing visible" plainly when reporting it
and name those three.

## What is already decided and must not be re-taken

Read these first. Five of them would otherwise be settled here differently, and
each is recorded with its argument somewhere else.

- **The premise this story was planned against is inverted, and the inversion is
  measured.** Stored historical bars are **SIP, the full consolidated tape**; the
  live stream is **IEX only**. `ALPACA.md` §2, re-measured rather than cited. The
  disclaimer this story's title implies is the opposite of the truth for
  everything this epic stores.
- **A feed gets a sentence when its label cannot stand alone, and not
  otherwise** — ADR 0019 §3. `IEX` gets one; `All US exchanges` does not. That
  rule is inherited. What is open is what a **series with two of them** says.
- **The words are not chosen in a component.** They live in
  `MARKET_FEED_DESCRIPTIONS`, beside the vocabulary they describe, and the
  `satisfies` on that record makes a feed added without words a compile error. A
  string literal in a renderer puts that guarantee back outside the compiler.
  Any wording this task settles lands **there**, not in JSX.
- **Provenance is a field on the data, not a caption on a component**
  (`market-provenance.ts`). A series names a **list** of sources. That shape is
  settled and this task spends it rather than revisiting it.
- **Colour is never the sole encoding**, and nothing in the provenance treatment
  is red or green. A single-venue feed is not a fault — §36 makes it a product
  state. The one amber in the existing treatment is `synthetic`, and it carries a
  square and a sentence beside it.

## Work

Settle each of the following in `PROVENANCE.md`, with the alternatives that were
weighed and a **reversal trigger that is a condition rather than a story
number**.

- **Open decision 1 — how prominent, and where.** Today there are two surfaces
  and they say different things: `FeedProvenance` in the chrome states what this
  **deployment** reads, once; `BarSeriesPanel` states what **this series** is
  made of, and — measured, `BarSeriesPanel.tsx` §74.1 — renders **nothing at all
  until the sources name two distinct feeds**, which no body this product can
  currently produce does. So the honest summary of today is: _the chrome makes a
  standing claim, and the numbers on the Security Explorer carry none of their
  own._ Decide whether that is right. The argument for per-series labelling is
  that **a screenshot of a chart travels**, and a screenshot carries no chrome.
  The argument against is noise on a panel that already holds a coverage
  sentence, four prices, two windows and a count.
- **Open decision 2 — the wording when sources disagree**, which is two claims
  rather than one. The chrome's standing claim is shipped and settled. What is
  open is the sentence a **series** says when stored SIP bars sit beside a live
  IEX tail, and the failure mode to design against is named: it **must not
  collapse into naming whichever feed is first in the list**. Note what you may
  and may not do here — `stitched.json` is a real recorded body naming two
  sources that name the **same** feed, so the two-feed case is **not
  producible** from any body a server has sent. Settle the wording; do not
  fabricate a body to demonstrate it (Task 2.14.3 owns how it is reached from a
  story without claiming a server sent it).
- **Open decision 3 — "data through …" when the data is simply historical.**
  §36's shape is _"Live feed disconnected — displaying data through 10:42:17"_,
  and that sentence earns its place because something **stopped**. Nothing has
  stopped here. Decide between: always state the end of coverage; state it only
  when the answer is short of what was asked; or state it only when it is behind
  by more than some threshold the store can actually be behind by. Whatever is
  chosen, `/diagnostics/freshness` already answers _how many sessions behind is
  the store_ and is the thing that knows.
- **Decision 4 — the adjusted/unadjusted disclosure.** `adjustment` is on every
  source of every series, on the wire, in every fixture, and is rendered
  **nowhere**. Decide what a reader is told, in what words, and whether it is
  per-series or per-source — and note the trap: on this plan every stored bar is
  the same adjustment, so a per-source disclosure is one fact repeated N times
  until the day it is not.
- **Decision 5 — what the metadata provenance says.** Sector and industry did
  not come from the market-data provider, and `GET /securities` already carries
  `provenance.profile` and `provenance.classification`, each a source and a
  retrieval timestamp, rendered nowhere. Decide the words, the placement, and
  **what a stale curated file looks like** — this is the column Story 2.3
  argued for and this story renders.
- **Decision 6 — whether the two empty answers go on the wire.**
  `routes/market-data.ts` distinguishes _nothing held for this security and
  timeframe_ from _nothing held in this window_ in a **debug log and nowhere
  else**; both are the same 200 body, deliberately. Decide whether that
  distinction becomes a field, and be explicit about what it costs: a new
  discriminant on a response shape six modules parse, a new state in a union, a
  new story, and a sentence that must stay true when Epic 3 stitches a live tail
  onto both. The alternative — one honest sentence covering both — is defensible
  and must be argued rather than defaulted to. Task 2.14.6 implements whatever
  is decided; it does not get to decide it.

Also record, without deciding anything: **the `synthetic` branch of
`BarSeriesPanel` has never executed against any recorded body**, all seven valid
fixtures being `sip`, and it is not honestly fake-able because a synthetic feed
implies `provider: "fixture"` too. Carry it forward as a known gap with its
cause, not as a to-do.

## Done when

- `PROVENANCE.md` exists in this directory, with the six decisions above, each
  with alternatives weighed and a reversal trigger that is a **condition**.
- Every wording decision names the **module** the words will live in, and none of
  them is a string in a component.
- The decisions that contradict this story's own scope prose (the IEX
  disclaimer) are called out, so Task 2.14.10's sweep has a list rather than a
  search.
- `pnpm links` passes; `pnpm verify` passes. Nothing else changed.

## Notes

The temptation here is to settle three decisions and start typing. Resist it:
the reason the last five stories each opened with a decision task is that every
one of them found an arithmetic or a constraint that would have been discovered
three tasks later as a re-write. The specific one waiting here is decision 6 —
putting a distinction on the wire is cheap on the day and permanent afterwards.

---

## What was done — 2026-09-14

[`PROVENANCE.md`](PROVENANCE.md) exists, with all six decisions settled, each
with the alternatives weighed and a reversal trigger that is a **condition**.
Nothing else in the tree changed: no component, no module, no string. `pnpm
links` and `pnpm verify` pass.

### The six, in one line each

| #                    | Settled as                                                                                                                                                                              | Reversal trigger (a condition)                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 — prominence       | One **source note** at the foot of the Security Explorer, governed by _the note states what the chrome cannot, and never repeats what the chrome can_                                   | the first screen showing two securities' series at once                                 |
| 2 — two feeds        | The sentence **names the split in contribution order with the bar counts** — _"Stitched: 780 bars from All US exchanges, then 30 from IEX"_ — never a set of labels and never the first | the first source whose stretch is not contiguous                                        |
| 3 — "data through …" | Bound to **`partial`** only, with one function feeding both the visible sentence and the spoken one                                                                                     | the first reader that must tell _we hold all of it_ from _all of it that exists so far_ |
| 4 — adjustment       | **Per series** (the type already forbids per-source); `raw` → **Unadjusted** with a sentence, `split-adjusted` → no sentence                                                            | the first offered window spanning a corporate action                                    |
| 5 — metadata         | The note names the **group**, not the source slug; **classification only**, not profile; the date is the disclosure and there is **no staleness mark**                                  | the first two securities on one screen with different classification sources            |
| 6 — the wire         | **No.** The distinction is already derivable from `GET /securities`' coverage array, which this screen already fetches                                                                  | the first consumer of `/market-data/bars` that does not also hold the universe          |

### Five findings that changed a decision rather than decorating one

- **A claim about data requires data.** `SOURCE_OF_NOTHING` hands a renderer a
  complete, truthful provenance record describing **zero bars**. Printing it
  under an empty frame is four accurate words making a false impression. One
  rule, read off one field, governs decisions 1, 3 and 4.
- **The screenshot argument proves something narrower than it appears.** Nothing
  short of a mark _inside the plot frame_ survives a crop — which ADR 0027's
  element budget and §74's decluttering both refuse. So it is accepted in the
  form it can carry: on the page with the number, not one route away.
- **Decision 6 needed no wire change at all.** `SecuritiesResponse.coverage`
  omits a security with no bars rather than sending a zero, and the Explorer
  already fetches it. The distinction was reachable today; the cost avoided was a
  new discriminant on a shape six modules parse.
- **`FieldGroupProvenance.source` is a free `string` and can never have a
  compile-guarded vocabulary.** That is why decision 5 names the _group_ and
  keeps the slug off screen — a discovery made while settling it, not a
  preference.
- **Decision 2's sentence has a structural dependency outside this story.**
  `market_bars` stores no per-bar feed; the two-source case exists only while the
  IEX tail is _stitched at read time_. The day Epic 3 **stores** an IEX bar, the
  ledger describes it as SIP and the series reports one feed confidently and
  wrongly. Recorded in §2.3 as Epic 3's defect, so this document is not blamed
  for the sentence being false.

Also carried forward, decided about deliberately: the `synthetic` branch of
`BarSeriesPanel` has never executed — all sixteen valid recorded bodies are
`sip` — and is not honestly fake-able, because a synthetic feed implies
`provider: "fixture"` too.

### What Task 2.14.10's sweep is owed

§8 hands it a list rather than a search. The headline: **the upward sweep has
already happened.** Every Markdown file in the tree was grepped for `IEX` and
`CLAUDE.md`, `PRODUCT_SPEC.md` §7.1, `README.md`, `UNIVERSE.md` and `EPIC.md` are
all already correct about the asymmetry. The close confirms rather than repairs.
The one live hazard is **acceptance criterion 2**, which is inverted by the
measurement and must not be applied as written — stored bars _are_ the full
consolidated tape, so read literally it would ask us to delete the true label.

### What the user can see

**Nothing.** No new label, no new sentence, no new state. The payoffs are
[2.14.3](TASK-03-where-these-numbers-came-from-on-screen.md) (the series' own
provenance on screen), [2.14.4](TASK-04-the-curated-files-age-and-what-alpaca-did-not-tell-us.md)
(the curated file's age) and [2.14.5](TASK-05-through-when-and-the-coverage-honesty-pass.md)
(through when the data runs) — with [2.14.2](TASK-02-the-provenance-surface-on-the-canvas.md)
drawing all of it at once first.

**What they still cannot do:** watch a price move. There is no live data, and the
two-feed sentence settled here has no producer until there is.

---

## For the stakeholder — what this was, in plain words

**The short version:** before we write a single word onto the screen about where
our numbers come from, we decided exactly what we are allowed to claim. This task
produced no visible change and it is the reason the next three tasks can.

### The problem it solves

MarketPulse shows people prices, volumes and — soon — anomaly scores, and it
exists to be _trusted_. A product that shows a number without saying where it came
from is asking to be believed rather than checked, and this product's whole pitch
is the opposite of that. Our own product specification lists _hiding where data
came from_ and _inventing observations we do not have_ among the things
MarketPulse must never do.

The trouble is that "say where the number came from" sounds like a one-line job
and is not. There are four separate things a reader might need to know, they
change independently, and one of them is about to start contradicting itself:

- **Which exchanges are in this number?** Our data supplier gives us the _full US
  market_ for stored history, but only _one single exchange_ for the live feed we
  switch on next. So from the next epic, a single chart on screen will be part
  full-market and part single-exchange, and one label at the top of the page will
  be wrong about half of it.
- **Have these prices been restated?** When a company splits its shares ten-for-one,
  a chart that has not been adjusted shows a 90% crash that never happened. Ours
  are unadjusted, deliberately, and nothing currently tells anyone that.
- **How old is this?** Both the prices and the sector labels have an age, and
  neither is shown.
- **And where did the _sector_ come from?** It did not come from the market feed
  at all — it is a curated list we maintain. Put a sector three centimetres above
  a price chart and a reader will reasonably assume it came from the same place.

### What we decided, and why

The single most useful decision was a rule rather than a string: **the page states
what the top-of-screen banner cannot, and never repeats what it can.** The banner
already says what feed this deployment reads, on every screen; repeating that under
the chart is noise. What the banner can never say is what has been done to _these_
prices, when _they_ were fetched, and where _this_ sector label came from. So the
page gains exactly one short line at the bottom carrying those, and the feed only
in the case where the banner is genuinely wrong about it.

That rule is what keeps this from becoming what we were most worried about: five
individually reasonable additions to the most crowded screen in the product,
adding up to a pile of small print nobody reads. We had just spent a session
_removing_ clutter from that screen for measured reasons; putting it straight back
would have been a task that had not read the one before it.

Two decisions saved real work:

- **The "we have nothing to show you" problem needed no new plumbing.** Today an
  empty chart says the same thing whether we have no data for that company at all
  or simply nothing in the fortnight you asked for — and those call for opposite
  reactions from the user (wait, versus pick a different date range). The obvious
  fix was to add a new field to an API that six parts of the app read, which is
  cheap today and permanent afterwards. We found that a _different_ API the same
  screen already calls answers the question for free. So the user gets the
  correct sentence and we added nothing to the contract.
- **The adjustment question was already answered by the code's own design**, which
  makes it impossible to mix restated and unrestated prices in one chart. We were
  about to re-decide something the type system had settled months ago.

And one decision was deliberately _not_ to build something. The curated sector
list shows its date, and nothing turns amber when it gets old — because we have
no agreed schedule for refreshing it, so "old" would be a number somebody invented
at the moment of drawing it. The honest order is: put the existing freshness check
on a schedule first, _then_ the screen can say "overdue" and mean it.

### How this moves the product forward

Epic 2 has been building the machinery: a database, half a market's worth of
history, an API, a search box, a price chart and a volume chart. All of that works.
What it does not yet do is _account for itself_ — and that is the difference
between a working chart and one an analyst will put in front of their boss.

The next three tasks put these decisions on screen, one after another, so this
epic's last story shows something within days rather than after a week of
documents. After that the epic closes: the full journey tested against the live
site on every deploy, the running costs re-checked, and an honest list of what
ships unfinished and who owns it.

The bigger payoff is the epic after this one. When the live feed arrives, a single
chart genuinely will be stitched from two different data sources with different
coverage — and the sentence that explains that honestly to a reader is written,
argued and waiting, rather than being invented under time pressure by whoever gets
there first. We also found, while writing it, that our database currently has no
way to record which of the two feeds a stored price came from. That is a real
problem for the next epic and we now know about it three weeks before it would
otherwise have bitten.
