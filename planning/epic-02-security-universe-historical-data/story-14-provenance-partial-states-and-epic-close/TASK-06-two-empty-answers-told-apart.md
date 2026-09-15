# Task 2.14.6 — The two empty answers, told apart or deliberately not

**Status:** Complete — 2026-09-15
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1 (decision 6), 2.14.2

> **Amended 2026-09-14 by Task 2.14.1, and this task changed shape more than any
> other.** It was written as a fork — put the distinction on the wire, or keep
> one sentence and argue for it. **Decision 6 took neither branch**
> ([`PROVENANCE.md`](PROVENANCE.md) §6): the two answers _are_ told apart, with
> two sentences, and the distinction is **derived on the client** from a request
> this screen already makes. So the wire branch below is struck through and the
> one-sentence branch is withdrawn; what replaces both is §6.2's derivation, and
> there is **no backend change in this task at all**.

> **Amended 2026-09-15 by Task 2.14.5.** Three things that task settled land on
> this one. Two are mechanisms to copy rather than re-derive; the third is a
> defect it found next door and deliberately did not fix.
>
> - **The string pass has a hole exactly the shape of this task.**
>   [`PROVENANCE.md`](PROVENANCE.md) §11 read every user-facing string the epic
>   had added **as of 2026-09-15**, and the two sentences below did not exist yet.
>   Acceptance criterion 2 says _every string the epic added_, so **this task owes
>   §11.1's two-direction read on its own two sentences** and a row each in §11.3.
>   That is the same correction Task 2.14.3 made to 2.14.5 and it is worth making
>   once more rather than discovering at the close: a pass that read every
>   sentence in the product except the newest ones is the wrong way round.
> - **`one-home-for-the-coverage-phrase` is the template for this task's
>   invariant**, and it comes with a helper. Both of 2.14.5's checks read their
>   sources through `withoutComments` in `scripts/check-invariants.mjs`, because
>   the first version went red on a doc comment quoting the sentence it guards —
>   and the sentences below are discussed in prose in at least three files. Use
>   the helper; do not re-derive the lesson.
> - **`No shares changed hands anywhere in the window.` already has two homes**,
>   `VolumeReading.tsx` and `chart-alternative.ts`, drawn and spoken, and nothing
>   guards them. It is adjacent to this task and **out of its scope** — it is a
>   zero-volume _bar reading_, not a vacancy — and it is named here so that
>   whoever extends the invariant neither widens into it by accident nor leaves it
>   unnoticed a second time. It also carries its own Epic 3 trigger (§11.3): it is
>   the one shipped sentence claiming something about **the market** rather than
>   about our store, and a single venue's silence the moment a live tail is
>   stitched on. Both facts are in [`docs/GAPS.md`](../../../docs/GAPS.md).

## Objective

Implement decision 6. The server already knows two different things and says
neither: _we hold nothing for this security and timeframe_ and _we hold
something, but nothing in the window you asked for_. Both are the same 200 body
with an empty `bars` array and a `null` coverage, deliberately, and the
difference exists in a **debug log and nowhere else**
(`routes/market-data.ts`). `ChartVacancy` therefore says the second one always,
because it cannot see the difference.

~~Either put the distinction on the wire and render both, or state in writing
that one sentence covers both and why.~~ **Settled 2026-09-14: neither.**
`SecuritiesResponse.coverage` omits a security with no bars rather than sending a
zero — _"the honest spelling of the difference between we hold nothing for this
and we hold none of this"_ — and the Security Explorer already fetches it for the
identity block. **The client can tell the two apart today, with no wire change.**
What stands unchanged is the fence: leaving `ChartVacancy` saying a thing it
cannot know is not available.

## What the user can see when this lands

**An empty chart explains itself correctly** rather than plausibly. _"We have no
data for this security"_ and _"nothing traded in this window"_ send a reader to
two different next actions — one changes the window, the other does not — and
today a reader gets whichever sentence we happened to write.

## What is already decided and must not be re-taken

- **Where the explanation is drawn is settled.** It moved off the panel and onto
  the plot as `ChartVacancy`, and `pnpm invariants` holds that it has exactly one
  home (`VOLUME-AND-WINDOW.md` §79). The **placement** is not this task's; the
  **wording** is.
- **An empty series is a 200, not a 404.** A 404 is an unknown _security_ and
  never an empty series (`routes/market-data.ts`). Unchanged by anything here.
- **`covered` is `null` exactly when the series is empty**, and that null is
  load-bearing — it is how a client tells _the series is empty_ from _this server
  did not say_. Do not overload it with a third meaning.
- **The two serialiser traps this task carried are no longer reachable**, and
  they are struck rather than deleted so nobody re-derives them: ~~a property
  absent from a `fast-json-stringify` schema silently vanishes~~ and ~~a declared
  JSON type disagreeing with the TypeScript one is coerced, a `null` under
  `"number"` reaching the wire as `0`~~. Both were hazards of **adding a field**,
  and decision 6 adds none. They stay live for any task that does.
- **A claim about data requires data** ([`PROVENANCE.md`](PROVENANCE.md) §0.1).
  ~~The source note renders nothing when `bars.length === 0`, so on both of these
  states the vacancy sentence is the **whole** explanation on screen.~~
  **Corrected 2026-09-14, and the conclusion survives the correction.** §0.1 is
  **per clause** since Task 2.14.2, and Task 2.14.4 draws the one clause whose
  data is not the bars — so a zero-bar page carries a one-line source note
  saying the sector and industry are curated, and not silence. What is still
  true, and is the half that matters here: **nothing on that page explains the
  empty picture except the vacancy sentence.** The note says where the _words
  above_ the chart came from and nothing about why there is no chart. So this
  sentence is still carrying the whole weight, with one grey line of unrelated
  provenance beneath it — which is worth knowing before writing it, because the
  page is less bare than §0.1 first implied and the sentence must still read as
  the answer rather than as one of two footnotes.

## Work

**The derivation, which is the whole mechanism.** A symbol **absent** from
`SecuritiesResponse.coverage` is _we hold nothing at all_; **present** is _we
hold something, just not here_. It reads off the view the page already has; it
adds no request, no field, no union member and no fixture.

- **Write the second sentence**, in `ChartVacancy`'s module beside the first.
  §6.3 settles both: case two keeps today's wording verbatim, and case one is
  _"No history stored for NVDA yet."_ over _"We hold no bars for this security at
  this timeframe. Changing the window will not help — the store is filled
  overnight."_ The sentences differ on the **next action**, which is the reason
  the distinction is worth drawing at all.
- **The degradation rule, and it is a rule rather than a preference: when the
  universe answer is not available, the vacancy says the window sentence.** It
  never infers _we hold nothing_ from an absence it could not read. A failed or
  in-flight `GET /securities` must not produce a confident sentence about the
  store — that is the same defect this task exists to remove, arriving from the
  other side.
- **Carry the `1m`-only seam.** `SecuritiesResponse.coverage` sends the minute
  half of the ledger by Task 2.8.9's stated choice, so a security holding minute
  bars and no daily bars reads as case two at `3M` and `1Y` when it is case one.
  The backfill fills both, so the shape is unlikely rather than impossible.
  Record it beside the derivation; do not widen the endpoint for it.
- **Extend `pnpm invariants`, and do it in the same change.**
  `one-home-for-the-empty-explanation` anchors on the literal
  `"No bars stored for this window."` and asserts exactly one source file holds
  it. The second sentence is a second literal with the same hazard —
  `e2e/support/app.ts`'s `readable()` does not filter `aria-hidden`, and CI's
  store is 518 securities and **zero bars**, so every chart there is an `empty`
  and a duplicate is a strict-mode failure in every spec. Cover both literals,
  and read them through `withoutComments` (2026-09-15): a check a correct doc
  comment can trip is a check nobody can keep green, and these sentences are
  quoted in prose in more than one file.
- **A check you add owes a break.** Add the entry to `scripts/breaks.mjs` and run
  `pnpm break <name>`; a check that has never failed has never been tested.
- **`MARKET-DATA-API.md` and `routes/market-data.ts`'s outcome table are
  unchanged and that is now a claim worth checking rather than editing.** The row
  that maps both cases to one body is still correct, and the debug line that
  tells them apart on the server stays — it is the operator's view of a
  distinction the client now draws independently. Add a sentence there saying the
  client derives it, so the next reader does not "fix" the single row.

**Also:**

- The untracked and synthetic notes stay as they are. `untracked` is a badge on
  a security we hold bars for and no longer follow; `synthetic` has never
  executed against any recorded body and remains a recorded gap rather than a
  fabricated fixture.
- Stories for every vacancy the product can reach, in the grid.

## Done when

- `ChartVacancy` says only what the client can know, and what it says was
  decided rather than inherited.
- Both sentences render, from the derivation rather than from a guess, and the
  **universe-unavailable** case falls back to the window sentence.
- The spoken half agrees: `series-announcement.ts`'s `empty` sentence tells the
  two apart too. A state that reaches the view and not the announcement is a
  state a screen-reader user cannot observe.
- `pnpm invariants` covers **both** literals, `scripts/breaks.mjs` has an entry
  for the new one, and `pnpm break <name>` was run and went red.
- **Both new sentences are read against §11.1's two directions and given a row
  each in [`PROVENANCE.md`](PROVENANCE.md) §11.3** — implying coverage the plan
  does not have, and disclaiming coverage it does. The second is the live hazard
  here: a sentence about an empty window that says something about _the market_
  rather than about _our store_ is the defect §11.3 records next door.
- `MARKET-DATA-API.md` records that the single outcome row is deliberate and the
  client derives the distinction.
- `pnpm verify` and the frontend suite pass; the empty case was looked at against
  `DATABASE_NAME=marketpulse_bare pnpm dev`, which is the store where every chart
  is a correct empty.

## Notes

Do the `store:bare` run early rather than at the end. It is the cheapest way to
see both empties on a real page, and it is the shape CI has — so anything this
task asserts in a browser spec is asserted against that store whether or not you
looked at it first.

**`store:bare` produces case one for every security**, because it has 518
securities and zero bars, so nothing is in the coverage array. Case two needs a
store that holds bars and a window outside them — a developer's own store with a
window reaching into the current session is the cheap one. **Both empties are not
visible in one store**, and a pass that only ever saw `store:bare` would have seen
the new sentence and never the old one.

---

## What was done

**Decision 6, implemented with no backend change**, as §6.2 settles it. An empty
chart now says which empty answer it is, and the distinction is derived on the
client from a request the Security Explorer already makes.

### The derivation

`apps/frontend/src/components/PriceChart/chart-vacancy.ts` — one pure function
over two views, in `source-note.ts`'s shape and for its reason:

```
storedHistoryFor(securities: SecuritiesView, symbol: string): StoredHistory
```

`StoredHistory` has **three** members and the third is the rule rather than a
state somebody forgot. `"some"` is a symbol present in
`SecuritiesResponse.coverage`; `"none"` is a symbol the universe holds and that
array does not; `"unknown"` is everything else — in flight, failed, or a symbol
the response does not carry at all — and every reader renders it as the **window**
sentence. A boolean would have made the degradation rule a `?? false` at a call
site, which is exactly where it would later be written the other way round.

`SecurityExplorer` reads it once and hands the same value to the panel, to both
plots and to the announcement. That is what makes the drawn fork and the two
spoken forks incapable of disagreeing: they share a derivation, not a string.

### The four sentences, and the four spoken twins

| Plot   | Case one (`"none"`)                      | Case two (`"some"` / `"unknown"`)   |
| ------ | ---------------------------------------- | ----------------------------------- |
| Price  | `No history stored for NVDA yet.`        | `No bars stored for this window.`   |
| Volume | `No volume history stored for NVDA yet.` | `No volume stored for this window.` |

The price plot's detail line forks with it — _"Changing the window will not help
— the store is filled overnight."_ against the window sentence's _"We asked for
… and hold nothing in it."_ — and so does the spoken half, in
`chart-alternative.ts` (both plots) and `series-announcement.ts` (the panel's
live region). The spoken wording is deliberately **not** the drawn wording: the
announcement says _this security_ rather than the symbol, because every
announcement already opens with the symbol.

### Three things building it settled

- **The volume headline gained a word, and the word came from the check.**
  §6.3's amendment specifies `No volume stored for NVDA yet.` and that string
  cannot be guarded: it is a **prefix of the window sentence**, so
  `one-home-for-the-empty-explanation` could not have told the two homes apart
  and would have stayed green with the sentence deleted — the rot `CLAUDE.md`
  names, built in deliberately. `No volume history stored for ` is distinct, and
  reads as the parallel of the price headline. Recorded in `PROVENANCE.md` §6.3
  and in `VISUAL-LANGUAGE.md`, because the next person to shorten it will be
  right about the prose and wrong about the guard.
- **The `1m` seam is visible from the other side, and the wording already
  covers it.** Looked at on a real page: removing one security's minute ledger
  row on a store that still holds its daily bars draws _No history stored for
  ZTS yet_ under an identity block still printing `72.97 ▲ +0.15%`, because that
  close comes from a **daily** bar the coverage array never described. The
  sentence stays true because it says _at this timeframe_ — a clause that was
  careful in §6.3 and is load-bearing now. In `docs/GAPS.md` with a re-measure.
- **The browser suite would have gone red in CI on the first push.** Nine specs
  locate a settled answer by the window sentence, and **CI's store is 518
  securities and zero bars** — so every chart there becomes case one the moment
  this ships, and every one of those locators would have matched nothing. They
  now read one exported pattern, `AN_EMPTY_PLOT` in `e2e/support/app.ts`. One
  needed more than a pattern: `security-series-states.spec.ts` forces an empty
  body and then asserts the _window_ detail line, which case one does not draw,
  so it now branches on which answer is on screen and asserts both. This was
  found by reading, not by a six-minute round trip.

### What was looked at, on a page

Both empties, which no single store can show:

- **Case two**, on the developer's store at `/securities/NVDA?sessions=1` — the
  window reaches into a session the nightly backfill has not caught up with.
- **Case one**, by removing one security's `1m` ledger row (restored
  immediately, row count checked back to 1,036) and opening
  `/securities/ZTS?sessions=1`. The volume headline measures **233px** in an
  801px content box — one line, centred, no overflow — against the window
  sentence's 198px.

`store:bare` was not needed to see case one once that was available, and the
shape it produces is the same: 518 securities, zero coverage rows, every
security case one.

### What CI found that no local run did

**One browser spec went red on the first push, and it was right to.**
`security-series.spec.ts` asserted that the Price region carries a market
instant with its zone — `EDT`/`EST` — _in either empty answer_, on the stated
grounds that an empty one still names the window it asked for. Case one does
not, deliberately: naming a window a reader cannot usefully change is the thing
§6.3 removed.

Two things worth keeping out of it:

- **The assertion was green in CI only because of an incidental string.** The
  check is about a timestamp being formatted in market time rather than the
  runner's zone. On a zero-bar store the only instant on the page came from the
  window vacancy's requested range — not from anything the check is about. It is
  the same trap `security-price-chart.spec.ts` records two files over in almost
  the same words: _green against a chart nobody had pointed at_, because the
  helper fell back to the first `EDT` in the region. The spec now scopes the
  assertion to answers that have an instant to get wrong, and asserts of the
  store vacancy that it claims **no** window. The coverage that genuinely
  disappears from CI's run is in `docs/GAPS.md`.
- **The local approximation of CI's store was not one.** Case one was produced
  by deleting a security's `1m` ledger row, which leaves the **bars** serving —
  so the default window still drew a chart and the spec took the populated
  branch and passed, exactly where CI took the vacancy branch and failed.
  `pnpm store:bare` is the faithful shape; it builds in about a minute and the
  whole suite runs against a bare pair in four. **124 passed, 15 skipped, 0
  failed** against it. Recorded on TASK-07, whose production recipes this
  belongs to.

### Checks

- `pnpm invariants` — `one-home-for-the-empty-explanation` now covers **four**
  literals, each read through `withoutComments`, each anchored on a string that
  must be **found**. The two case-one headlines interpolate the symbol, so each
  is anchored on its longest fixed fragment.
- `pnpm break` gained three entries — `volume-explanation-twice`,
  `no-history-sentence-twice`, `no-volume-history-sentence-twice` — and all
  four were run: **broken → red → restored byte-identical**, each matching
  `one-home-for-the-empty-explanation`.
- `pnpm verify` green. 943 frontend tests, 20 of them new: the derivation
  against recorded universe bodies (`chart-vacancy.test.ts`), both plots'
  sentences and their hidden twins, both spoken channels, and two route-level
  tests that drive both requests. The last of those found a real defect —
  `stored` was reaching the volume plot and the announcement but not the price
  plot — which no unit test could have seen.

### Documents

`PROVENANCE.md` §6.3 amended with the three findings and §11.3 given two rows
(both new sentence sets read in §11.1's two directions; neither implies coverage
we lack nor disclaims coverage we have); §9's table gains the derivation's
module. `MARKET-DATA-API.md` §6 records that the single outcome row is
deliberate and that the client derives the distinction, with the reversal
trigger restated against that route; `routes/market-data.ts`'s debug branch says
the same thing beside the log line, so it is not deleted as redundant.
`VISUAL-LANGUAGE.md` gains the volume pair, the third state and the general rule
it is an instance of. `docs/GAPS.md` gains the three break rows, a note that
four rows are one invariant, and two new entries.

**Canvas:** `Provenance and the empty answers.dc.html` gains **§11 — Where the
distinction comes from, and the third state §06 did not draw**: the derivation
as a three-row decision table, why it is free, what it costs instead, the rule
the third row is, the three findings, and what a reviewer should look for.
Nothing in §06 was redrawn — it was right — and no token was added.

### What the user can see

**An empty chart that explains itself correctly rather than plausibly.** Before
today every empty plot said the same thing — _no bars stored for this window,
and a window reaching into the current session is usually this_ — which is right
most of the time and wrong for a security we hold nothing for. Now the two send
a reader to two different next actions, and one of them says explicitly that the
control on screen will not help.

**What a user still cannot do:** watch a price move. There is no live data.

---

## For the stakeholder — what this actually was, in plain words

### The problem, in one screen

Open a chart and sometimes there is nothing on it. That is not a bug — sometimes
there genuinely is nothing to draw — but until today the product gave the same
explanation whatever the reason, and the explanation it gave was a **guess**:

> _No bars stored for this window. A window reaching into the current session is
> usually this: stored history is caught up overnight._

That sentence is right most of the time. It is wrong in one specific case, and
the case is not rare: a security we hold **no** history for at all. Then the
sentence quietly tells you to wait, or to try a different date range, when
neither will ever help.

For a product whose entire claim is _we will not tell you anything we cannot
show you the evidence for_, an explanation that is usually right is the wrong
kind of thing to have on the screen. It is the difference between an answer that
is plausible and one that is correct.

### What it says now

Two sentences, chosen by what we actually hold:

> **No history stored for NVDA yet.** We hold no bars for this security at this
> timeframe. Changing the window will not help — the store is filled overnight.

> **No bars stored for this window.** We asked for … and hold nothing in it. A
> window reaching into the current session is usually this: stored history is
> caught up overnight.

They send you to two different next actions, and that is the whole point. One
tells you to press a different time window — the control is right there. The
other tells you not to bother, because nothing you can do on this screen changes
the answer, and the data will arrive overnight.

### Three decisions worth knowing about

**One: this cost nothing on the server, and that was the interesting part.** The
obvious way to do this is to add a new field to the data the chart asks for. We
didn't — because the page already asks a _second_ question, for the list of
securities, and the answer to that question already contains this fact. A
security we hold no prices for is simply **missing** from that list's
"how much history do we hold" section. So the screen already knew; it just had
never been asked. No new server work, no new data on the wire, nothing for a
future feature to keep in step.

The cost of that choice is written down rather than hidden: this only works on a
screen that asks both questions. When something reads the price data on its own —
the AI investigation tools in Epic 10 are the named candidate — the distinction
will have to go on the wire properly, and the condition for doing it is recorded
so nobody has to re-derive the argument.

**Two: when we don't know, we say less.** If the list of securities hasn't
arrived yet, or failed to arrive, the chart shows the _window_ sentence — the
one that claims less. It never guesses "we hold nothing for this security" from
a list it couldn't read. That sounds obvious written down; it is exactly the
same mistake this task exists to fix, arriving from the other direction, and the
code is shaped so that only a positive answer earns the confident sentence.

**Three: the two answers look identical, deliberately.** Same marker, same type,
same colour, same position. The difference between them is a fact about our
data, not a difference in how bad things are — both are perfectly correct
answers — so giving one a warning colour or heavier type would rank one above
the other and mislead about severity. What tells them apart is what the sentence
is _about_: one names the security, the other names the time window. That also
means the distinction survives for somebody who cannot see colour at all, which
is a standing rule in this product rather than a nicety.

### One thing we found by looking rather than testing

The four sentences are also spoken — a screen reader hears its own version of
each. It would have been easy to fix the visible half and leave the spoken half
saying the old, sometimes-wrong thing, which is how a fact quietly disappears for
one audience. Both halves fork, from one shared decision, and a test on the whole
page proves they agree. That test immediately caught a real wiring mistake:
the volume chart and the spoken summary had the new information and the price
chart did not. Nothing smaller than a whole-page test could have seen it.

### Where this leaves the product

Epic 2 is one task from done. The Security Explorer now tells you where its
numbers came from, how fresh they are, how much of the window they cover, which
parts of the description are ours rather than the market's — and, as of today,
an honest account of itself when it has nothing to show you at all. That last
one matters more than it sounds: **most of what a user will see in the next few
weeks is an empty or partial chart**, because the live feed does not arrive
until Epic 3, and a product that explains its gaps well reads as careful where
one that hand-waves them reads as broken.

**What you still cannot do: watch a price move.** That is Epic 3, and it is
next.
