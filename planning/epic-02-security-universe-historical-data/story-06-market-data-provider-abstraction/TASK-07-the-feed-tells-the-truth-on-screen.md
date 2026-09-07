# Task 2.6.7 — The feed tells the truth: provenance on screen, and the end of an invented status

**Status:** Not started
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Tasks 2.6.3, 2.6.6

## Objective

Spend this story on the one thing in it a stakeholder can see, and it is not a chart. The
header's **market-feed region has been rendering an invented `DISCONNECTED` since Story
1.5** — hard-coded, listed in `README.md` among the things a correct first run shows that
read as faults. This task replaces it with something true, and builds the provenance
presentation vocabulary invariant 6 requires, once, in the story that owns the words.

## What the user can see when this lands

**The chrome stops lying about the market feed**, and starts saying what is actually the
case: which market-data provider this deployment is configured to read, which feed that
provider serves, and — until Story 2.7 — that none is configured yet.

Concretely, on the deployed site:

- the `Market feed` region no longer shows a fabricated connection state
- it names the feed, in the vocabulary Task 2.6.3 fixed, and carries the thing §7.1 requires
  it to carry: that this is **one venue and not the consolidated US tape**
- when Story 2.7 lands, **one configuration value changes and this same region reads `IEX`**
  with nothing here edited — which is the check that this task built a renderer for data
  rather than a caption

**What the user still cannot see: a price, a chart, or any number at all.** That is Stories
2.9 to 2.13, and the payoff is 2.12.

## Why this is the honest slice, and why a chart is not

A fixture-backed chart is available at this point and is **rejected**, with the reasoning
recorded rather than left implicit — see the amendment in [`STORY.md`](STORY.md). Two
arguments, either sufficient. It would take Story 2.12's charting decision — a whole-product
decision inherited by Epics 6, 8 and 11 — inside a story about a data interface, by accident,
which is the failure this epic's own sequencing exists to prevent. And it would put invented
prices on a market product's screen, which is §35's "manufacture missing observations" and is
precisely the criticism already recorded against Story 1.4's render check.

What is left is small and genuinely valuable: **the product currently makes a false claim in
its chrome, and this story is the one that knows what the true claim is.**

## Work

### Do not widen `FeedStatus`, and the argument is one this repository has already made twice

`FeedStatus` — `live | stale | disconnected` — is about a **live connection**, which is
Epic 3's and does not exist. Provenance is a different fact: it is true whether or not
anything is connected, and it is attached to data rather than to a socket.

Task 1.12.1 refused to widen `HealthStatus` into `BackendStatus` for exactly this shape, and
Task 1.12.4 then refused to widen `FeedIndicator` into a second indicator's job — "two
indicators sharing one marker language, not one indicator whose meaning widens". Both
arguments apply unchanged. **Provenance is a third thing beside the status word, not a fourth
member of it.**

What that leaves open, and what this task decides: whether provenance renders **inside** the
market-feed region beside the status word, or as its own region. Note the constraint the
strip already carries — the market clock is `align-items: flex-end` as the end of the strip,
so a fourth region appended after it takes that edge away (Task 1.12.5 hit this once
already), and `AppHeader`'s `AllPermutations` story stopped being a cartesian product for a
reason that a fourth axis makes worse.

### Where the value comes from — and a frontend literal is not an option

**Amended 2026-09-07 by Task 2.6.4: `MarketDataProvider` now carries a `readonly id:
ProviderId`, and it is deliberately NOT the source this task should reach for first.** It is
there so a retry wrapper reports the id of the thing it _wraps_ rather than inventing one —
and under `MARKET_DATA_PROVIDER=none`, which is the default and is the state this task exists
to render honestly, **there is no provider object to ask**. So the question _"which provider
is configured"_ is answered by the configuration, not by an instance; `id` is what answers
_"which provider produced this series"_, which is a different question and is already carried
on `SeriesProvenance` anyway. Reading it off a provider would make the one state this task
must get right the one state it cannot reach.

A hard-coded `IEX` in a React component is a caption, which Task 2.6.3 spent a whole task
establishing is the thing this must not be. It also goes stale silently the day the plan is
to move to SIP. So the value is read from the backend, and there are three candidate homes
with real differences:

- **`/health`.** Not a candidate. Task 2.1.7 settled that `/health` says nothing about
  dependencies, byte for byte, and reopening it means widening a contract with five readers
  and three platform probes pointed at it.
- **A field on an existing contract.** `/securities` already carries a provenance envelope
  — for _classification_ provenance, which is a different subject — and Story 2.4's
  `use-securities` already fetches it once on mount. Cheap; the risk is conflating two
  provenance records that answer different questions.
- **A small endpoint of its own.** Honest and separable; the cost is that Story 2.9 owns the
  market-data contract and this would be a first cut of it, which needs saying out loud in
  Story 2.9's file the way Story 2.4's pre-emptions were recorded.

Decide with the argument, and write the pre-emption down wherever it lands.

### The component, and the design bar applies

`apps/frontend/src/components/<Name>/`, presentational, one component per file, its
stylesheet and its stories beside it — the check enforces it. Every state gets a named story
plus the permutation grid, because the states here include two a browser cannot easily be put
into: **no provider configured**, and a provider whose feed is a single venue.

The bar is `CLAUDE.md`'s standing instruction and `VISUAL-LANGUAGE.md`'s: this must read as a
real funded product rather than a scaffold. Concretely, four things that are not negotiable
here because the rest of the chrome already holds them:

- the micro-label idiom comes from `type.module.css`'s `.microLabel` through `composes:`,
  not a fourth hand-copy — that layer exists because there were fourteen
- if a marker is used at all it is the `Marker` primitive, which owns four silhouettes and
  knows nothing about any vocabulary; colour arrives as `--marker-color` from the consumer
- **nothing here is red and nothing is green.** A single-venue feed is not a fault — §36
  makes it a product state — and this is the third component to hold that language
- a value a user might **transcribe** is `--font-mono`; a word they read is not

### The sentence has to be readable by a person who does not know what IEX is

This is the part with product weight and it should not be resolved by printing a slug. "IEX"
alone means nothing to most readers and "Market feed: IEX" satisfies §7.1's letter while
telling a non-specialist nothing. The requirement is that a reader is **not misled into
thinking this is full US market coverage**, which is a sentence rather than an acronym.

~~Write the words, and put them where the vocabulary lives rather than in JSX~~ — **amended
2026-09-07: the words are already written, and this task's job is to RENDER them rather than
to choose them.** `MARKET_FEED_DESCRIPTIONS` in `packages/shared/src/market-provenance.ts`
is a `Record<MarketFeed, { label, sentence }>`, shipped by Task 2.6.3 for exactly the reason
this section gives:

| Feed        | `label`           | `sentence`                                                                    |
| ----------- | ----------------- | ----------------------------------------------------------------------------- |
| `iex`       | IEX               | Trades reported by the IEX exchange only — not the full US consolidated tape. |
| `sip`       | Consolidated tape | All US exchanges, via the consolidated tape.                                  |
| `synthetic` | Simulated         | Generated test data. Not a market feed.                                       |

**So a string literal in JSX here is a second copy of a fact, and it is the copy that
drifts** — the same failure the twelve-block problem is made of. Import them. The `satisfies`
on that record means a feed added later without words is a compile error, so the pair cannot
fall out of step; a component that re-words them puts that guarantee back outside the
compiler.

Note the one thing the table does **not** cover, which is this task's to write: there is no
entry for _"no provider is configured"_, because that is not a feed. `MARKET_DATA_PROVIDER`'s
default is `none` (§5.3) and the honest rendering of it is this task's decision — it is a
sentence about our own configuration rather than about a market venue, which is why it does
not belong in a feed table.

A `title` attribute is not the answer for the sentence, for the reason Task 1.4.5 and Task
1.12.4 both rejected one: it is unreachable by keyboard and by touch.

### Accessibility, and the three checks that already exist

Task 2.4.5's precedent is the whole instruction:

- **not** a live region. `UniverseTable` owns the page's one `role="status"`, and the
  commonest transition here is the mount, so a live region would announce on every page load
  and every navigation — which is the argument `BackendIndicator` and `MarketClock` both made
- the axe gate runs on the assembled application and the baseline is known: landing route
  **0 violations / 37 passes / 1 inconclusive**, `/securities` **0 / 35 / 1**. Re-take it at
  1280×720, ×560 and ×480 and expect it unmoved. Note the trap Task 2.4.5 found: the gate
  waits for finite animations before reading, because it once measured a frame of a 240 ms
  entrance and reported 203 contrast violations on a correct page
- a browser journey in `e2e/specs/`, asserting on the rendered words — imported from
  `packages/shared` rather than written out, which is what that package being a workspace
  dependency of `e2e` is for. Remember `innerText()` reports the CSS-transformed uppercase
  where the DOM and every Playwright matcher see the real text

### And check it deployed

The value is read from the backend, so the only place it is genuinely proved is the deployed
pair. Whether this earns an addition to `e2e/specs-deployed/` is a judgement — that suite has
three files and its bar is "something no other instrument can see" — but the manual check is
not optional: **read the deployed page and confirm it says the true thing about the deployed
backend's configuration**, which is exactly the class of failure `two-halves.spec.ts` exists
for.

## Done when

- The header's market-feed region no longer renders a hard-coded status
- What it renders is derived from the backend's actual configuration, and changing that
  configuration changes the page with no frontend edit — demonstrated
- The provenance component exists with every state in the workshop, including the two a
  browser cannot easily reach
- A reader who does not know what IEX is cannot come away believing this is full US coverage
- The rendered words come from `MARKET_FEED_DESCRIPTIONS` rather than from JSX, and the
  browser journey asserts them by **importing** them — which is what `packages/shared` being
  a workspace dependency of `e2e` is for
- axe is unmoved at three viewports; a browser journey asserts the rendered words and was
  seen to fail
- `README.md`'s list of "things that read as faults on a correct first run" is **one shorter**
- The deployed page was read in a browser and tells the truth
- `pnpm verify`, `pnpm e2e` and the artefact measurement all taken; the bundle's movement is
  explained rather than noted

## Notes

The reason this is worth a task rather than a line in Task 2.6.8: it is the difference
between a story that ships an interface and a story a stakeholder can be shown the result of.
Five of this story's eight tasks are invisible and the story says so plainly — what makes
that acceptable is that this one is the seventh of eight rather than deferred polish, and
that the region it fixes has been showing an invented value for six stories.
