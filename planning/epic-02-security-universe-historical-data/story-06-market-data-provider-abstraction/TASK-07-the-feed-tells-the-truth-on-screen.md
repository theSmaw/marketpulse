# Task 2.6.7 — The feed tells the truth: provenance on screen, and the end of an invented status

**Status:** Complete
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

> **Amended 2026-09-07 by Task 2.6.6: that last bullet is not automatic and this task has to
> make it true.** `MARKET_DATA_PROVIDER` selects a **provider**, and `PROVIDER.md` §4.2 is
> emphatic that provider and feed vary _independently_ — one vendor serves a single venue on
> a free plan and the consolidated tape on a paid one. So _"set `MARKET_DATA_PROVIDER` and
> the region reads `IEX`"_ requires something to answer **which feed does this configured
> provider serve**, and after Task 2.6.6 **nothing can**: `MarketDataProvider` carries
> `id: ProviderId` and no feed, and a feed reaches the frontend today only on a
> `SeriesProvenance` — i.e. attached to a series somebody actually fetched. See the amended
> section below; this is the decision that was hiding inside the sentence.

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

**Amended 2026-09-07 by Task 2.6.5: the eight-member error taxonomy is NOT a third candidate
here, and it is worth saying because both are about "the market feed".** `BarsResult`'s
members — `rate-limited`, `upstream-unavailable`, `unauthorised` and the rest — are facts
about **one request**, produced and consumed inside `apps/backend`. This region reports a
**standing configuration**: which provider this deployment reads and which feed it serves,
which is true before any request is made and stays true while one fails. Rendering a
per-request outcome in the chrome would be the `FeedStatus` widening above wearing a different
costume, and it would need a live request the chrome does not make. Story 2.12 renders a
failed fetch, beside the thing that failed to load.

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

> **Amended 2026-09-07 by Task 2.6.6, which shipped the backend half of this and turned one
> assumption in this section into an open question.**
>
> **What now exists to read from.** `apps/backend/src/market-data.ts` exports
> `resolveMarketData(config)` returning `{ selection, provider }`, and it holds **both**
> deliberately, because only one of them survives the default: `selection` is
> `MarketDataProviderSelection` — `"none" | "fixture"`, derived from `PROVIDER_IDS` — and is
> answerable whatever is configured, while `provider` is `MarketDataProvider | undefined`
> because **`none` is ABSENCE and not a null object**. So this section's instinct is
> confirmed as shipped code rather than as advice: the question _"which provider is
> configured"_ is answered by `config.marketDataProvider`, and `MarketDataProvider.id` is
> structurally unable to answer it in the one state this task exists to render.
>
> **The question it opened, and it is this task's to close.** The configuration names a
> **provider**; `MARKET_FEED_DESCRIPTIONS` is keyed by a **feed**. There is no mapping
> between them anywhere, and there deliberately is not — §4.2 keeps them independent because
> conflating them is the mistake `MarketFeed` exists to prevent. Today a feed only ever
> arrives on a `SeriesProvenance`, i.e. attached to a series somebody fetched, and this
> region reports a **standing configuration** with no request behind it. Three shapes, and
> the choice is real:
>
> - **A `feed` on `MarketDataProvider`**, declared by each implementation. Cheap, and it is a
>   claim the provider is well placed to make — but under `none` there is no provider, so
>   this alone cannot render the default state and needs the `none` sentence beside it
>   regardless.
> - **A second configuration variable.** Honest about the fact that a vendor's feed is a
>   property of the _plan we are on_ rather than of the vendor — which is exactly §4.2's
>   argument — at the cost of a fourteenth variable and a pair nothing checks.
> - **Render the PROVIDER and not the feed** until a series has actually been fetched, and
>   let Story 2.12 render the feed beside the chart from `SeriesProvenance`, which is where it
>   is already carried and already true. The narrowest answer, and it makes the
>   "one value changes and it reads `IEX`" bullet above false as written rather than
>   aspirational — so if this is chosen, **amend that bullet rather than leaving it.**
>
> Whichever is taken, note that `fixture`'s feed is `synthetic` and its sentence is
> _"Generated test data. Not a market feed."_, which is the state a developer running
> fixtures must see and is `PROVIDER.md` §5.4's whole safety mechanism arriving on screen.

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

---

## What shipped (2026-09-07)

Nine files new, thirteen amended, **no dependency and no lockfile change at all**.

| File                                           | What it is                                                |
| ---------------------------------------------- | --------------------------------------------------------- |
| `packages/shared/src/market-data-response.ts`  | the wire contract, one field, plus `isMarketDataResponse` |
| `apps/backend/src/routes/market-data.ts`       | `GET /market-data`                                        |
| `apps/frontend/src/use-market-feed.ts`         | the hook and `MarketFeedView`                             |
| `apps/frontend/src/components/FeedProvenance/` | the component, its stylesheet, its stories and its tests  |
| `e2e/specs/market-feed.spec.ts`                | five browser journeys                                     |

### The decisions this task owed, and what each rests on

**1. The feed is a field on `MarketDataProvider`, and it removes a copy rather than adding
one.** The brief's three shapes were weighed and this one won on a mechanical argument rather
than a preference: `fixture-provider.ts` already wrote `feed: "synthetic"` as a **literal
inside its own `BarSource`**, so before this task the chrome's claim about the configured feed
and a series' claim about its own could have been made to disagree by editing one of them.
The field is now `FIXTURE_FEED`, read in both places. §4.2 says provider and feed vary
independently, and that is an argument against **inferring** a feed from a provider id — not
against a provider **declaring** one, because the thing that holds the credential is exactly
the thing that knows which plan it is on.

The two rejections are recorded in the interface: a **second environment variable** (a
fourteenth, and a pair nothing checks, which lets an operator set two things that cannot both
be true, and which duplicates a fact the client already has); and **rendering only the
provider** until a series exists, which leaves §7.1 unmet in the state that matters — a
deployment reading a single venue would say so nowhere until somebody opened a chart. The
line that keeps §4.2 true is stated beside the field: this is the **standing claim about what
the deployment is configured to read**, `SeriesProvenance` is the authority for a
**particular** series, and the reversal trigger is a provider that serves more than one feed
per request.

**2. The value comes from a small endpoint of its own — and `/securities` was rejected for a
harder reason than the brief anticipated.** The brief worried about conflating two provenance
records; true, and secondary. The decisive fact is that the thing rendering this is the
**chrome**, which is on all five routes, while `useSecurities` fetches only on `/securities`.
A field there would leave the market-feed region empty on four routes out of five, including
the landing route. `/health` stayed closed on Task 2.1.7's terms. The pre-emption is written
into **Story 2.9's own file**, the way Story 2.4's were.

**3. The body is ONE field, and `provider` is deliberately absent.** `API_ERROR_CODES`' rule
governs a response's fields as much as a union's members — a field exists when something
reads it — and nothing reads the provider: every provider declares a feed, so `feed === null`
happens **exactly** when none is configured, and what §7.1 requires on screen is the feed
rather than the vendor. The name arrives with its first reader, Story 2.14, off
`SeriesProvenance` where it already travels.

**4. Provenance renders INSIDE the market-feed region, and it replaces the status word rather
than sitting beside it.** Not a fourth region — `.clock` is `align-items: flex-end` as the end
of the strip, and `AllPermutations` stopped being a cartesian product for a reason a fourth
axis makes worse. And **the hard-coded `FeedIndicator` left the chrome entirely**: keeping a
`DISCONNECTED` word beside a truthful provenance line would be keeping the invented value,
which is the one thing this task exists to remove. `FeedIndicator` still ships and still has
a real consumer (the landing route's render check); Epic 3 brings it back to the chrome
**beside** provenance rather than instead of it, because "which venues are in the numbers" and
"is data arriving right now" are two facts.

**5. The predicate is STRICTER than `isHealthResponse`, which is a deliberate divergence.**
That one accepts a `status` it has not been taught, because a newer server is a version skew.
This one refuses a feed it has no words for, on two arguments: there is nothing honest to do
with an unrecognised slug — rendering it raw is the caption problem this story exists to
prevent — and the skew window does not exist here, because a new feed slug is a change to
`packages/shared`, which is inlined into the bundle, and `deploy.yml` ships both halves from
one commit. An unrecognised feed therefore arrives as `unreadable-body` and renders as the
honest `unknown`.

**6. `AppHeader` takes ONE prop for this and four for the backend, and that is not an
inconsistency.** The four-props rule exists because those four fields are _independent_ and a
component would have to be trusted not to construct their impossible combinations.
`MarketFeedView` is a discriminated union, which is the shape that makes those combinations
unconstructible — so spreading it would hand the renderer back exactly the space it removes.
`UniverseTable` takes `SecuritiesView` whole for the same reason.

**7. The hook is called in `App`, and the rule is now stated once rather than re-derived: a
hook that makes a network request is called in `App`; a hook that does not is called where it
renders.** `useMarketClock` is in `AppHeader` because the argument there is render _rate_.
This one asks the backend, so `useBackendHealth`'s argument applies — the header sits inside
its own `ErrorBoundary`. It costs the tree **two** renders, the mount and the settle, and
then nothing, so Task 1.12.5's accepted per-poll re-render is not made worse and its reversal
trigger is not fired.

### The axe gate found a real accessibility defect, in the one state where being wrong matters most

**The first draft put the amber on the `SIMULATED` word as well as its marker**, on the
argument that it is the one word in the chrome that must be read rather than glanced past.
The gate rejected it with a **real violation** rather than this repository's standing
`color-contrast` inconclusive: `--palette-amber` (`#e2b544`) on the page ground measures
**1.73:1** at 12px, where 4.5 is the threshold — **worse than the 2.09:1 `--ink-disabled`
that Task 1.12.4 was caught by**, found the same way, and reproduced at all three viewports.

The intention was right and the mechanism was wrong, and the design language already carries
the correct one: **standing out, like receding, is a job for weight and hierarchy and never
for ink outside the contrast floor** — which is the argument `AppHeader`'s current-route link
already makes, carrying its state in weight and an underline rather than in ink alone. The
`synthetic` state now has **four** channels and every one of them clears the floor: the one
square marker in the region, the only strong-weight word in the status strip, the sentence
_"Generated test data. Not a market feed."_, and the amber on the marker — where it decorates
an `aria-hidden` silhouette whose meaning is carried by the word beside it, which is the same
placement `BackendIndicator` gives its own amber and the reason that component was never
caught by this rule.

**After the fix the baseline is unmoved**: `0 violations / 37 passes / 1 inconclusive
(color-contrast)` on the landing route at **1280×720, ×560 and ×480**, in **all three** feed
states, which is nine readings reproducing Task 1.5.4's figure exactly.

### Eight deliberate breaks, each seen to fail and reverted

| Break                                                   | Result                                                    |
| ------------------------------------------------------- | --------------------------------------------------------- |
| a literal caption in place of the shared sentence       | **3** component tests red, **2** browser journeys red     |
| the schema's `["string","null"]` narrowed to `"string"` | **3** route tests red — the empty-string trap, reproduced |
| the predicate loosened to accept any string feed        | **2** shared tests red, **1** hook test red               |
| a hard-coded `FeedIndicator` put back in the chrome     | **1** header test red, **1** browser journey red          |
| the hook mapping a null feed to `configured`            | **1** hook test red                                       |
| `feed` removed from the fixture provider                | **`TS2741`** — a compile error, not a test                |
| `feed` added to the interface (before implementing it)  | **`TS2741`** in a file this task had not yet edited       |
| the amber left on the label                             | **3** axe readings red, at three viewports                |

The sixth and seventh are the ones worth carrying: `MarketDataProvider.feed` is enforced by
the **compiler**, so a Story 2.7 client that forgets to declare its feed cannot ship, and a
green `pnpm test` proves none of it while `pnpm verify` does — because it builds before it
tests.

### Figures

- **`pnpm verify` exit 0 in 31.7 s.** `pnpm test` is **619** (206 + 230 + **183**),
  `pnpm test:process` 14, `pnpm test:database` 61.
- **`pnpm e2e` is 28 across ~~six~~ SEVEN spec files** (up from 23 across six) **and the wall
  time did not move**: 1.0 m, still dominated by the recovery journey. The marginal cost of a
  journey here is still zero until the suite grows past that one minute. **The "six" was
  wrong when written and is corrected here rather than quietly** — it was a count of the
  files that existed _before_ this task's own, which is Task 1.13.6's "five spec files" error
  in a new place: a file count taken from memory of the directory rather than from `ls`.
- **The artefact moved, and both halves are explained.** JavaScript 369,437 → **371,463 B**
  (`c8f1c3ad…`), CSS 17,317 → **18,063 B** (`ed3d1744…`), `index.html` 1,101 B (`7b0075a8…`),
  `staticwebapp.config.json` 300 B, for **390,927 B over four files at 300 modules**. The
  +2,026 B of JavaScript is the component, the hook, `getMarketData`, the predicate — and
  **`MARKET_FEED_DESCRIPTIONS` reaching the browser for the first time**, which Task 2.6.3
  measured at zero because nothing read it; the words are now in the bundle, confirmed by
  grep. The +746 B of CSS is `FeedProvenance.module.css` entering the artefact. `FeedIndicator`
  did **not** leave the bundle, correctly: the landing route's render check still uses it.
- **The endpoint on the running pair**: `{"feed":null}` at 200 in 13 bytes, with
  `x-request-id` and the CORS headers every other route carries.

### The honest gap, which is Tasks 2.2.7 and 2.3.7's word for word

**The deployed page has not been read, because the route is not deployed.** `deploy.yml` only
runs on `main`, so the first execution is the first merge after this one. Measured rather than
assumed: the deployed backend answers `/market-data` with **404** carrying the `ApiError`
contract (`{"code":"NOT_FOUND","message":"Route not found.","requestId":"…"}`), which is the
"before" state recorded precisely.

That measurement bought something the task did not set out to get: **it is the exact state
production is in for the ninety seconds of the rollout that ships this**, because the two
halves deploy as two steps and a new frontend can ask an old backend. A test now asserts that
the chrome degrades to `unknown` / _"The market feed could not be read."_ on that response
rather than breaking or claiming a feed.

**A deployed assertion was added anyway**, inside `two-halves.spec.ts`'s existing page load,
so it costs the deployed backend **nothing**. It clears that suite's _"something no other
instrument can see"_ bar for the same reason the two failures above it do:
`MARKET_DATA_PROVIDER` is set on the Container App and **exists in no file in this
repository**, so a local instrument is structurally unable to read it, and a false provenance
claim on a public URL is §35's subject and a rollback decision. It asserts the claim is a
**real** one — one of the vocabulary's words, settled, never a connection word — and
deliberately not **which**, because that is a deployment setting.

---

## For the stakeholders — what changed, in plain terms

### The short version

**Until today, MarketPulse's header lied.** In the top-right corner, under the words `MARKET
FEED`, it said `DISCONNECTED`. It had said that on every page, on every visit, since the very
first version of the interface — and it was not reading anything. It was a word somebody had
typed into the page. It was _honest_ in the sense that we genuinely have no market data yet,
but it was still a made-up status on a market product, in the one part of the screen a person
is entitled to assume is reporting something real.

It now says what is actually true. On the site today it reads:

> **MARKET FEED**
> ○ NOT CONFIGURED
> No market-data provider is configured.

That is a real answer, fetched from our own service, about how that service is actually set
up right now. Change the setting and the page changes with it — with nobody touching the
front end.

### Why this is worth a whole task rather than a one-line fix

Because of a promise this product makes and a rule it has to keep.

The market data we can afford covers **one US exchange, IEX — not all of them.** That is
completely normal for a product at this stage, and it is completely unacceptable to be vague
about. A screen showing a price without saying where it came from invites a reader to assume
it is the whole market. Our own specification says, in as many words, that MarketPulse must
never imply that. So _where the number came from_ is not a footnote here; it is part of the
product.

There is a lazy version of this that we deliberately did not build: printing `Market feed:
IEX` under the chart. It technically satisfies the rule and it fails the point, because most
people do not know what IEX is, and three letters tell them nothing. What is on screen instead
is a short label **and a sentence**:

> **IEX** — Trades reported by the IEX exchange only — not the full US consolidated tape.

A reader who has never heard of IEX cannot come away from that thinking they are looking at
the whole US market. That is the actual requirement, and it is why the words live in one
place in the codebase rather than being retyped wherever somebody happens to need them — one
sentence, one definition, no copies to drift apart.

### The safety mechanism nobody sees until it matters

Developers can run MarketPulse against **invented prices** — a built-in generator, so that
work can carry on without a data subscription, offline, on a train. That is very useful and
it is also the single most dangerous thing in this codebase, because a screenshot of invented
prices looks exactly like a screenshot of real ones. Somebody puts one in a slide deck and it
becomes a claim about the market.

We could have handled that with a rule: _remember to add a "SAMPLE DATA" banner_. Rules like
that get forgotten. Instead the header now says it **structurally** — a deployment running on
generated data reads:

> **SIMULATED** — Generated test data. Not a market feed.

Nobody has to remember. It is impossible to screenshot the product on fake data without also
screenshotting the sentence saying it is fake.

Getting that state to stand out taught us something worth reporting. The first attempt marked
it in amber — the one accent colour in the design — including the word itself. Our automated
accessibility check rejected it: amber text on our warm off-white background is far too faint
to be legible for anyone with low vision, by a wide margin. So the word is now the only
**bold** word in the header instead, with the amber kept on the small square marker beside it,
plus the sentence. Three ways of noticing it, all of them readable. It is a small illustration
of something we have decided to hold as a standard: the accessible version and the
better-looking version are usually the same version, once you stop reaching for colour first.

### What a stakeholder can do with this today

Open the site. Look at the top-right. It tells you the truth about how the deployment is
configured, and it will keep telling you the truth as that configuration changes — including
during the roughly ninety seconds of a deployment when the two halves of the system are
briefly out of step, where it says _"The market feed could not be read"_ rather than guessing.

**What you still cannot do is see a price.** No numbers, no charts, no securities data of any
kind. That is genuinely the next stretch of work: the very next story connects the real market
data provider, after which this same region will read `IEX` **with no change to the interface
at all** — which is the proof that what we built is a display of real information rather than
another typed-in word. Charts follow a few stories after that.

### Where this sits in the plan

This was the seventh of eight tasks in a story that was, by design, almost entirely invisible
— it built the plumbing that every price in this product will arrive through: the shape of a
price observation, the record of where it came from, the interface any data provider has to
satisfy, the full list of ways a data request can fail, and an offline stand-in that
implements all of it.

Five of those eight tasks changed nothing on screen, and we said so plainly at the start
rather than dressing it up. This task is why that was acceptable: it was scheduled **inside**
the story rather than deferred to some later polish phase, precisely because a run of
invisible work with nothing to show at the end is how a project loses the thread of what it is
building. It is also the smallest honest thing we could have shipped. A chart drawn from
invented prices was technically available and was rejected twice over — it would have forced a
major charting decision, three stories early, by accident and under time pressure, and it
would have put made-up numbers on a market product's screen, which is exactly what the
paragraphs above are about.

One task remains in this story: writing down the architecture decision record, so that the
reasoning behind all of it survives the people who made it.
