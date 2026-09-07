# Task 2.7.4 — Point the deployed backend at Alpaca and let the chrome name the real feed, changing no frontend code at all

**Status:** Complete (2026-09-07)
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.3

> **AMENDED 2026-09-07 — this task said `IEX` throughout and that may be the wrong word.**
> Task 2.7.1 measured that this plan is **asymmetric**: historical bars default to **SIP**, the
> full consolidated tape, while the live stream is **IEX only** (`wss://…/v2/sip` →
> `409 insufficient subscription`). See [`ALPACA.md`](ALPACA.md) §2.
>
> So the sentence this task was written to put on a public page —
> _"Trades reported by the IEX exchange only — not the full US consolidated tape"_ — **is very
> probably false for anything this deployment reads**, and it is false in the direction that
> matters: it **understates** our coverage while claiming a specific limitation we do not have.
> `PRODUCT_SPEC.md` §7.1 and invariant 6 are about not implying coverage we lack; a label that
> is simply wrong fails them either way.
>
> **This does not block the task and does not move it.** What it does is make the task depend on
> **open decision 6**, which `STORY.md` routes to Task 2.7.3 — the first thing that writes a
> `feed` into a provenance record. By the time this task runs, the vocabulary, the provider's
> `feed` and `MARKET_FEED_DESCRIPTIONS`' sentence are already decided. **This task renders the
> answer and checks it on a real page; it does not pick it.**
>
> Read every `IEX` below as _"whatever decision 6 settled"_. The mechanism, the layout risk, the
> deployed-spec argument and the axe baseline are all unaffected — they are about a region
> rendering a truthful value, not about which value it is.

> **RESOLVED 2026-09-07 by Task 2.7.3, and the placeholder above is now a concrete word: the
> feed is `sip`, and the chrome will read `CONSOLIDATED TAPE`** under _"All US exchanges, via
> the consolidated tape."_ The client sends `feed=sip` **explicitly** rather than taking the
> vendor's measured-identical default, so the provenance record is true by construction rather
> than by an assumption about a default that could move.
>
> **`MarketFeed` needed no change**, which the block above raised as a possibility: Task 2.6.3
> shipped `sip` beside `iex` and `synthetic`, its sentence is already written, and
> `FeedProvenance` already has a story for it. So the _"new copy that has never been rendered
> anywhere"_ risk did **not** materialise — but a different and sharper one did, and it is in
> the layout section below, re-aimed.
>
> Leaving this task reading _"whatever decision 6 settled"_ after the decision is taken would
> be the deferral-with-no-owner shape this story's own notes warn about. It is settled; the
> word is `sip`.

## Objective

Set `MARKET_DATA_PROVIDER=alpaca` on the deployed Container App, deploy, and read the site.
The `Market feed` region should go from `NOT CONFIGURED` to **`CONSOLIDATED TAPE`** (open
decision 6, settled `sip` by Task 2.7.3), under that feed's sentence from
`MARKET_FEED_DESCRIPTIONS` — _"All US exchanges, via the consolidated tape."_

**No file in `apps/frontend` changes.** That is not a convenience, it is the point: it is the
test of whether Task 2.6.7 built a reporting mechanism or a caption. Its own write-up said so —
_"when the real supplier is connected, that same indicator will start reading IEX with no change
to the website's code at all"_ — and this is the task that either confirms it or finds out what
was missed.

## What the user can see when this lands

**The first true thing this product has ever said about market data.** On the deployed site, on
all five routes, the header's first region reads `MARKET FEED` / **`CONSOLIDATED TAPE`** and a
sentence explaining what that covers.

**And it is a better sentence than this task was written expecting.** It was drafted against
`IEX`, whose honest description is a _limitation_ — _"not the full US consolidated tape"_. The
measured answer is the opposite claim, so the first thing this product says about market data is
that its history covers every US exchange rather than one venue.

For six stories that region read a hard-coded `DISCONNECTED`, listed in `README.md` among the
things a correct installation shows that read as faults. Story 2.6 replaced the invented word
with a truthful one — `NOT CONFIGURED`, which was also true. This is the first time it names a
real vendor's real feed.

**What the user still cannot do is see a price.** There is no chart, no series, no number: the
claim is about what this deployment is **configured to read**, which is exactly what
`MarketDataProvider.feed` means and exactly what §7.1 requires to be displayed. Say that plainly
in any demonstration, because a `Market feed: IEX` label beside no data invites the reading that
data is flowing.

## Why this is honest three tasks before the client is finished

The client at this point handles one page, maps a response, and throws on anything else. Two
questions follow and both have clean answers.

**Is the claim true?** Yes, and it is the only kind of claim being made. `feed` is the standing
statement about what this deployment is configured to read — `PROVIDER.md` §4.2's amendment says
so in the sentence that keeps the field honest — and it would be equally true if the client were
finished or if it were half-written. `SeriesProvenance` remains the authority for a particular
series, and there are no series yet.

**Can anything reach the unfinished parts?** No, and this should be **confirmed rather than
assumed**: no route calls the fetch method, and `GET /market-data` reads `provider.feed` and
nothing else. Confirm it by grep and by reading the route, in this task, because the whole
argument rests on it. If something does reach it, this task waits for Task 2.7.5.

> **AMENDED 2026-09-07 by Task 2.7.3, because the grep as written would have PASSED VACUOUSLY.**
> This paragraph said _"no route calls `getBars`"_. **There is no `getBars` anywhere in the
> tree** — the interface method is **`fetchBars`** — so the grep returns zero for the wrong
> reason and reads as a confirmation. That is the same class as a `-t` filter matching no test
> and exiting 0, which `CLAUDE.md` already records.
>
> The corrected check, and its **expected result is no longer zero**:
>
> ```sh
> grep -rn "fetchBars" apps/backend/src/routes/   # must be 0 — the claim
> grep -rln "fetchBars" apps/backend/src/         # 4 files, none of them a route
> ```
>
> Re-run at Task 2.7.3: **zero in `routes/`**, and four callers overall —
> `market-data-provider.ts` (the declaration), `fixture-provider.ts` and `alpaca-provider.ts`
> (the two implementations), and **`fetch-bars.ts`, which is new**. That last one is
> `pnpm bars`, an **operator command** rather than a route, and it is reachable only from a
> terminal — so the argument holds, and it now holds against a grep that can actually fail.

## The layout risk, which is real and specific

~~**The `synthetic` sentence and a real feed's sentence are not the same length, and this region
has a `34ch` measure.** _"Generated test data. Not a market feed."_ is 39 characters; any
honest description of a real feed's coverage is roughly twice that — and whichever decision 6
settles, this is the **first time the longest sentence in `MARKET_FEED_DESCRIPTIONS` renders in
the chrome**. If decision 6 adds a `sip` member, its sentence is new copy and has never been
rendered anywhere, so it carries this risk in full.~~

**AMENDED 2026-09-07 by Task 2.7.3: the risk is real, and it is aimed at the wrong string.**
Measured, now that decision 6 is settled and the value is known:

| Feed        | Label rendered      | Label chars | Sentence chars |
| ----------- | ------------------- | ----------: | -------------: |
| `iex`       | `IEX`               |       **3** |         **77** |
| `sip`       | `CONSOLIDATED TAPE` |      **17** |         **44** |
| `synthetic` | `SIMULATED`         |       **9** |         **39** |

**The sentence is not the problem.** `sip`'s is **44 characters** — five more than `synthetic`'s,
which has rendered in the chrome since Task 2.6.7 — and the longest sentence in the record is
**`iex`'s 77**, which this deployment will now never show. The paragraph above predicted the
first rendering of the longest sentence; the opposite happened.

**The label is the problem, and it is a 5.7× change on the word rather than a 1.1× change on the
sentence.** `.label` composes `microLabel`, which is `text-transform: uppercase` plus
`letter-spacing: 0.08em`, so the strip's only strong-weight word goes from **`IEX` (3)** or
**`SIMULATED` (9)** to **`CONSOLIDATED TAPE` (17)** — uppercase, letter-spaced, inside
`AppHeader.module.css`'s `max-width: 34ch`, in a grid whose other two regions take their space
from the same row. **Nothing in the chrome has ever rendered a feed label longer than nine
characters.**

So the checks below are the right checks and the thing to watch is the **word**, not the
sentence — and note the word may wrap where a sentence is designed to.

Task 2.5.5 found a real layout defect by exactly this route — a component that looked correct in
every state the running application could reach, and broke on the longest string it renders, on
a date the application could not be put into. The workshop is where that is caught. So:

- Look at `FeedProvenance`'s permutation grid with every feed, at 1280×720, ×560 and ×480 —
  and look at **`CONSOLIDATED TAPE` specifically**, which is the longest label the chrome can
  render and 5.7× the one it renders today
- Look at the **assembled header** in the workshop and in a browser, because the strip is a grid
  and the region that grows takes its space from its neighbours — the `Backend service` region's
  own two-sentence states are the ones to check it against
- Re-run the axe gate on the landing route in all three feed states, as Task 2.6.7 did, and
  expect the baseline unmoved at 0 violations / 37 passes / 1 inconclusive

If it wraps badly, **fix the layout and not the sentence.** The sentence is the requirement —
`PROVIDER.md` §4.4 is explicit that `Market feed: IEX` satisfies §7.1's letter and fails its
intent — and shortening it to fit a column is the failure mode that section exists to prevent.

## The deployed specs are deliberately not amended, and that is the check

`e2e/specs-deployed/two-halves.spec.ts` asserts that the chrome's provenance claim is a **real**
one and deliberately **not which one**, because `MARKET_DATA_PROVIDER` is a deployment setting
that exists in no file in this repository. Task 2.6.7 took that decision and it holds here: a
spec asserting `IEX` would go red the day somebody legitimately moved a deployment to a paid
plan or to fixtures.

**So the check is that it passes unchanged**, on a deployment whose feed just changed from
nothing to IEX. A spec that had to be edited would mean it was asserting the deployment rather
than the mechanism.

## Work

- ~~The platform variable, and the secret reference from Task 2.7.2, set together in one
  `az containerapp update`~~ — **amended 2026-09-07: this is now ONE variable, and the reason
  the original sentence gave no longer applies.** Task 2.7.2 already set both credential
  variables on the app (`ALPACA_API_KEY_ID` as a plain `value`, `ALPACA_API_SECRET_KEY` as a
  `secretRef` into the `secrets` array) on revision `0000113`, so all this task sets is
  **`MARKET_DATA_PROVIDER=alpaca`**. Story 2.1's one-command-or-none finding was about a pair
  where one value is meaningless without the other; here the pair is already in place and the
  third variable is independent of it.

  **That ordering is not incidental and is worth knowing before anyone "simplifies" it into one
  update.** Task 2.7.2's cross-variable check refuses startup when the provider is selected and
  the credential is absent — so had the credential not already been on the app, setting
  `MARKET_DATA_PROVIDER=alpaca` alone would produce a revision that fails to start, on a
  platform whose liveness probe restarts it, sitting at `Activating` for ten minutes first. The
  credential landing a task early is what makes this task's update a single safe setting

- Deploy through the pipeline. **Do not `az containerapp update --image` a hand build**: the
  merge is the mechanism, and Task 1.11.7 measured that a hand-set image is silently undone by
  the next merge
- Read the deployed page in a browser, with the tab **visible** — an automated tab reports
  `hidden`, makes no request, and sits on placeholders indefinitely, which Tasks 1.12.3, 1.12.7
  and 1.12.8 each had to rediscover
- Read `GET /market-data` on the deployed backend directly, before and after, and record both
  bodies — `{"feed":null}` → `{"feed":"sip"}`
- **Amend `FeedProvenance.stories.tsx`, which now carries a false claim in shipped source.**
  Found by Task 2.7.3 while checking the layout risk above: that file says `sip` is
  _"Not reachable on this project's plan"_ and _"needs an entitlement this project does not
  have"_, in two places. Measured 2026-09-07, this plan serves SIP for historical bars on the
  **free** tier, and after this task it is the **deployed production value** — so the one
  rendering the comment calls unreachable becomes the only one a user ever sees. It also
  reverses that story's stated argument for the permutation grid, which was that two of six
  states cannot be produced in a browser: **`sip` can now be produced by looking at the
  deployed site**, and `synthetic` is the one that still needs a local `MARKET_DATA_PROVIDER`.
  The grid's argument survives on `synthetic` alone and on `iex`, which this deployment will
  now never show
- Confirm the deployed backend did not notice: `/health` 200 throughout, `uptimeSeconds` rising
  and never resetting across the revision rollover, `restartCount` 0
- Read the `secrets` array back on the running revision and **confirm** it — the claim expired
  at Task 2.7.2 and ADR 0011 already carries the dated amendment, so this is a re-read on the
  revision that actually **uses** the secret rather than merely holds it. That distinction is
  the one thing left to record here: 2.7.2 put a credential on an app that read it nowhere
- The Log Analytics leak check, on the revision that now holds a vendor key
- A screenshot, because this is the first stakeholder-visible change in the story

## Done when

- The deployed chrome reads **`CONSOLIDATED TAPE`**, with its sentence, on all five routes, in
  a real browser — and that word is **true of what this deployment actually reads**, because the
  client sends `feed=sip` explicitly rather than relying on a default, which is the whole point
  of the region and the thing `ALPACA.md` §2 put in doubt
- **The label does not wrap or crowd its neighbours** at 1280×720, ×560 and ×480 — the specific
  risk, re-aimed above: 17 uppercase letter-spaced characters where the chrome has never
  rendered more than nine
- `git diff` touches no file under `apps/frontend/src`
- `pnpm e2e:deployed` passes **unamended**
- The deployed axe reading is 0 violations / 37 passes / 1 inconclusive, matching the pre-merge
  gate — the three-way agreement Story 1.13 established as the comparison the report exists to be
- Log Analytics returns zero for the key id, the secret, `APCA-` and `Authorization`
- Local `MARKET_DATA_PROVIDER=fixture` still reads `SIMULATED`, and the default is still `none`
- `FeedProvenance.stories.tsx` no longer claims `sip` is unreachable on this plan

## Notes

This task is deliberately fourth of nine rather than seventh, and the reason is delivery rather
than engineering: it is available the moment a provider exists that can declare a feed, it costs
one platform setting and no code, and every task after it is invisible. Story 2.6 put its
visible task seventh of eight and said plainly that five of eight were invisible; this story can
do better for free, and a story whose only visible moment is at the end is a story that
demonstrates nothing if it stops early.

The thing to resist is treating the label as finished work on provenance. It is the **standing**
claim, and Story 2.14 still owns the per-series one — which is the harder half, because a
stitched series names a list of sources and a chart has to render that honestly.

---

## What was done, and what it measured (2026-09-07)

**The deployed site now names a real vendor's real feed.** `MARKET_DATA_PROVIDER=alpaca` is
set on the Container App, revision `0000116`, and the chrome reads
`MARKET FEED` / **`CONSOLIDATED TAPE`** / _"All US exchanges, via the consolidated tape."_ on
all five routes. `GET /market-data` on the deployed backend went `{"feed":null}` →
`{"feed":"sip"}`, recorded before and after.

**Task 2.6.7 built a reporting mechanism rather than a caption, and this is the proof.** No
file in `apps/frontend/src` that _renders_ anything changed. What changed is one platform
variable, and the value on screen followed. Two workshop stories files changed, and both
changes are documentation rather than mechanism — see the honest-gap note below.

### The layout risk did not materialise, and it was measured rather than eyeballed

The re-aimed risk was the **label**: `CONSOLIDATED TAPE` is 17 uppercase, letter-spaced
characters where the chrome had never rendered more than nine. Measured with a `Range` over
the text node, in a real Chromium, at the three viewports plus two narrower widths:

| Viewport               | Label text | Label measure | Lines | Sentence lines | Horizontal overflow |
| ---------------------- | ---------: | ------------: | ----: | -------------: | ------------------- |
| 1280×720 / ×560 / ×480 |   141.7 px |      250.7 px |     1 |              1 | none                |
| 1024×720               |   141.7 px |      250.7 px |     1 |              1 | none                |
| 860×720                |   141.7 px |      250.7 px |     1 |              1 | none                |

**109 px of slack — 43% headroom — inside the region's `34ch` measure**, and the measure does
not narrow with the viewport, because the header grid gives this region a fixed track. The
same figures reproduce on the **deployed** site at 1280×720. Nothing wraps, nothing crowds:
the strip reads `CONSOLIDATED TAPE` · `HEALTHY` · `05:11:40 ET / CLOSED / Labor Day` with the
neighbours where they were.

**The prediction this task was drafted with was inverted, exactly as Task 2.7.3 said.** The
longest _sentence_ in `MARKET_FEED_DESCRIPTIONS` is `iex`'s 77 characters, which wraps to two
lines under the measure — and this deployment will now never show it. `sip`'s is 44, five more
than `synthetic`'s, which has rendered in the chrome since Task 2.6.7.

### The claim is true of what this deployment actually reads

`alpaca-provider.ts` declares `ALPACA_FEED = "sip"` and `toAlpacaQuery` sends `feed=sip`
**explicitly** rather than taking the vendor's measured-identical default — so the word on the
page is true by construction rather than by an assumption about a default that could move.
That was the doubt `ALPACA.md` §2 raised and it is closed.

The reachability argument was **confirmed rather than assumed**, against the corrected grep
(`fetchBars`, not the non-existent `getBars` the task first named):

- `grep -rn "fetchBars" apps/backend/src/routes/` → **0**
- four callers overall, none of them a route: the interface declaration, the two
  implementations, and `fetch-bars.ts`, which is `pnpm bars` — an operator command reachable
  only from a terminal.

`GET /market-data` reads `provider.feed` and constructs its body once at registration. Nothing
a browser can do reaches the unfinished half of the client.

### The rollover, and one criterion that could not hold as written

`/health` answered **200 on every poll** through the change, and the old replica served until
the new one was ready — Task 1.11.7's "traffic weight is not what serves" again. Afterwards:
revision `0000116` `RunningAtMaxScale` at weight 100, replica `ready: true`,
**`restartCount: 0`**, the superseded `0000115` `Deprovisioning` at weight 0.

**`uptimeSeconds` did reset — 164.9 s → 11.3 s — and the criterion asking that it not is
wrong as written rather than failed.** A configuration change _is_ a new revision, and a new
revision is a new replica, so `process.uptime()` necessarily restarts. The checkable and
meaningful claim, which held, is that **no request returned a non-200 through the rollover**.
Recorded rather than quietly satisfied, because the same sentence will be copied into the next
task that sets a platform variable.

### The secret, read back on the revision that uses it

`secrets` holds `alpaca-api-secret-key` and `ALPACA_API_SECRET_KEY` is a `secretRef`. This is
the distinction the task asked to record: **Task 2.7.2 put a credential on an app that read it
nowhere, and `0000116` is the first revision that actually constructs the client.** ADR 0011's
_"nothing deployed holds a credential"_ expired at 2.7.2 and is confirmed expired here for the
right reason.

**The leak check is clean on Log Analytics**, against a non-vacuous **2,183-record** two-hour
window spanning the rollover: `APCA-`, `Authorization`, `eyJ`, `Bearer `, the 26-character key
id and the 44-character secret all return **0**.

### The accessibility baseline is unmoved, three states × three viewports

**Nine readings, every one `0 violations / 37 passes / 1 inconclusive (color-contrast)`**, with
`color-contrast` passing on 68 nodes each time — which is the blind-renderer control Task
1.13.6 built. The three feed states were produced by fulfilling `/market-data` rather than by
restarting the backend three times; `route.fulfill()` bypasses the browser's CORS check (Task
1.13.3) and the reading is of the rendered page either way.

Deployed, `pnpm e2e:deployed` reports the landing route at **0 / 37 / 1 (`color-contrast`)** —
the pre-merge gate's numbers, the three-way agreement Story 1.13 established.

### The deployed specs passed unamended, which is the mechanism check

`pnpm e2e:deployed` is **15 passed in 15.5 s**, including _"the deployed chrome makes a real
claim about the market feed"_ — which previously passed against `not configured` and now passes
against `CONSOLIDATED TAPE`, with no edit. A spec that had needed editing would have meant it
was asserting the deployment rather than the mechanism. Local `pnpm e2e` is **28 passed** in
1.0 m against a pair running `MARKET_DATA_PROVIDER=alpaca`, for the same reason:
`market-feed.spec.ts` deliberately asserts that the word is _one of_ the vocabulary and never
which.

### The other two states still work

Read off the built server rather than the browser: `MARKET_DATA_PROVIDER=fixture` →
`{"feed":"synthetic"}` (`SIMULATED`), unset → `{"feed":null}` (`NOT CONFIGURED`). The default
is still the loud one.

### Two shipped comments were false, and the second was not on the task's list

`FeedProvenance.stories.tsx` said `sip` _"needs an entitlement this project does not have"_ and
was _"not reachable on this project's plan"_, in two places. Corrected, with the asymmetry
recorded rather than merely removed: **this plan is SIP for history and IEX for the live
stream**, so `iex` is now the rendering nothing produces and Epic 3 is the sibling provider
that will.

**`AppHeader.stories.tsx` carried the same class of error and nobody had listed it.** Its
`AllPermutations` row 2 was captioned _"a real feed, healthy backend — what Story 2.7 turns
this into"_ and rendered `iex` — a caption that became false the moment this task landed. That
row now renders `sip`, because it is the deployed value **and** because it carries the longest
label the strip can render, which is the thing a chosen-rows grid exists to let somebody
review. `iex` is not lost: it keeps its own single-state story, which renders the same
assembled header under the same `34ch` measure, and it is the row that exercises the
two-line sentence wrap. **One tests the word, the other tests the line under it.**

### The honest gap: `git diff` does touch `apps/frontend/src`

The "Done when" list contains a contradiction — it requires both that `git diff` touch no file
under `apps/frontend/src` and that `FeedProvenance.stories.tsx` stop claiming `sip` is
unreachable, and that file is under `apps/frontend/src`. Both stories files were amended, and
the criterion's **intent** is met exactly: the diff is 62 insertions across two workshop files,
of which the only non-comment changes are one `FEED` map entry, one new story, and one grid row
swapped from `iex` to `sip`. **No component, no hook, no stylesheet and no application module
changed at all** — the mechanism the criterion exists to test is untouched, and the value on
screen changed because a platform variable did.

### Figures

`pnpm verify` **exit 0**; `pnpm test` **683** (206 + 294 + 183); `test:process` 14;
`pnpm e2e` **28 passed in 1.0 m**; `pnpm e2e:deployed` **15 passed in 15.5 s**. No dependency,
no lockfile change, no new script and no `verify` step.

---

## For the stakeholders — in plain language

**MarketPulse now tells you, on the live website, where its market data comes from — and for
the first time it is naming a real supplier's real data rather than describing its own absence.**

Every screen has a strip along the top with three small readouts. The first one is about the
market data. For six development cycles it read `DISCONNECTED`, which was a word somebody typed
into the page — honest about there being nothing behind it, and still a made-up value sitting on
a market product, which is exactly the sort of thing this product is being built to never do.
The previous cycle replaced it with `NOT CONFIGURED`, which was true and was still only a
statement about ourselves. It now reads **`CONSOLIDATED TAPE`**, with a plain-English line
underneath: _"All US exchanges, via the consolidated tape."_

**That sentence is better news than we expected to be able to report.** The product
specification has a rule about this: we must never imply we can see the whole US market when we
can only see part of it. The plan was to display `IEX` — one exchange out of many — and to say
so in words. When we actually held the account keys and measured what our plan gives us, the
historical data turned out to come from the **full consolidated tape**: every US exchange, not
one. So the first thing this product says about market data is a broader claim than we had
budgeted for, and it is a measured claim rather than an optimistic one. We ask the supplier for
the full tape by name on every request rather than accepting whatever they hand us by default —
which means the label on the page cannot quietly become wrong if the supplier changes their
mind about defaults.

**How much work did this take? One setting.** That is the whole point of the task, and it is
worth spelling out because it is the kind of result that is invisible when it goes well. Two
cycles ago we replaced the fake readout with one that asks the server what the truth is. This
cycle we told the server which supplier to use, and the website started saying so — with no
change whatsoever to any part of the website's code. Had we built a caption instead of a
reporting mechanism, this would have been a code change, a rebuild and a redeployment, and the
label would drift out of date the next time anything moved. It is not, and it will not.

**The specific thing we were worried about, and how it turned out.** `CONSOLIDATED TAPE` is
nearly six times longer than the three letters we had designed the space for, and that strip is
tight — the readout beside it and the market clock take their room from the same row. A
previous cycle caught a real layout fault in exactly this way, so we measured it before touching
production: at every screen size we test, the words sit comfortably on one line with about 40%
room to spare, and nothing else moved. If it had not fitted, the rule was to fix the layout and
never to shorten the sentence, because the sentence is the requirement.

**And nothing broke.** We changed the setting on the live service and watched: the site stayed
up on every check throughout, the new instance came up cleanly with no restarts, all four
navigation links and the not-found page still work, and the accessibility checks are identical
to before — nine separate readings across three data-source states and three window sizes, all
matching the established baseline exactly, both locally and on the live site. We also confirmed
that the supplier's password does not appear anywhere in our logs, checked against a two-hour
window of 2,183 log entries covering the change itself.

**What you still cannot do is see a price.** There is no chart, no table of quotes, no number
from the market anywhere on screen. The claim on the page is about what this deployment is
**configured to read**, which is precisely what the specification asks us to display. Please say
that plainly if you demo it, because a real supplier's name beside no data invites the
assumption that data is flowing. Fetching prices into a terminal works today; **storing** them
is the next chunk of work, and putting them on a chart is the one after that.

**Where this sits in the plan.** This was deliberately scheduled fourth of nine rather than
last, because it was available the moment there was a real supplier to name, it cost one setting
and no code, and everything else remaining in this stretch of work is invisible from the outside.
A block of work whose only visible moment is at the very end is a block of work that demonstrates
nothing if it stops early. This one now has something to show from the middle onwards.

**One caution to carry forward.** This is the _standing_ claim — "this is the supplier we are
set up to read". A later piece of work owns the harder version: when a chart stitches together
data we stored last month with data we fetched a minute ago, possibly from two different
sources, the chart has to say so honestly rather than picking one and hoping. That is a real
problem and it is scheduled; today's readout is not it, and should not be mistaken for finished
work on the subject.
