# Task 2.14.6 — The two empty answers, told apart or deliberately not

**Status:** Not started
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
  and a duplicate is a strict-mode failure in every spec. Cover both literals.
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
