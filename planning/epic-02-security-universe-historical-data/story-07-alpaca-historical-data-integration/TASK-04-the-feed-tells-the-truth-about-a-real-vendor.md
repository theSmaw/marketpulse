# Task 2.7.4 — Point the deployed backend at Alpaca and let the chrome name the real feed, changing no frontend code at all

**Status:** Not started
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

## Objective

Set `MARKET_DATA_PROVIDER=alpaca` on the deployed Container App, deploy, and read the site.
The `Market feed` region should go from `NOT CONFIGURED` to **the feed open decision 6
settled**, under that feed's sentence from `MARKET_FEED_DESCRIPTIONS`.

**No file in `apps/frontend` changes.** That is not a convenience, it is the point: it is the
test of whether Task 2.6.7 built a reporting mechanism or a caption. Its own write-up said so —
_"when the real supplier is connected, that same indicator will start reading IEX with no change
to the website's code at all"_ — and this is the task that either confirms it or finds out what
was missed.

## What the user can see when this lands

**The first true thing this product has ever said about market data.** On the deployed site, on
all five routes, the header's first region reads `MARKET FEED` / `IEX` and a sentence explaining
what IEX is and is not.

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
assumed**: no route calls `getBars`, and `GET /market-data` reads `provider.feed` and nothing
else. Confirm it by grep and by reading the route, in this task, because the whole argument rests
on it. If something does reach it, this task waits for Task 2.7.5.

## The layout risk, which is real and specific

**The `synthetic` sentence and a real feed's sentence are not the same length, and this region
has a `34ch` measure.** _"Generated test data. Not a market feed."_ is 39 characters; any
honest description of a real feed's coverage is roughly twice that — and whichever decision 6
settles, this is the **first time the longest sentence in `MARKET_FEED_DESCRIPTIONS` renders in
the chrome**. If decision 6 adds a `sip` member, its sentence is new copy and has never been
rendered anywhere, so it carries this risk in full.

Task 2.5.5 found a real layout defect by exactly this route — a component that looked correct in
every state the running application could reach, and broke on the longest string it renders, on
a date the application could not be put into. The workshop is where that is caught. So:

- Look at `FeedProvenance`'s permutation grid with every feed, at 1280×720, ×560 and ×480
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

- The platform variable, and the secret reference from Task 2.7.2, set together in one
  `az containerapp update` — Story 2.1's finding applies, that a pair of variables where one is
  meaningless without the other is one command or none
- Deploy through the pipeline. **Do not `az containerapp update --image` a hand build**: the
  merge is the mechanism, and Task 1.11.7 measured that a hand-set image is silently undone by
  the next merge
- Read the deployed page in a browser, with the tab **visible** — an automated tab reports
  `hidden`, makes no request, and sits on placeholders indefinitely, which Tasks 1.12.3, 1.12.7
  and 1.12.8 each had to rediscover
- Read `GET /market-data` on the deployed backend directly, before and after, and record both
  bodies — `{"feed":null}` → `{"feed":"<whatever decision 6 settled>"}`
- Confirm the deployed backend did not notice: `/health` 200 throughout, `uptimeSeconds` rising
  and never resetting across the revision rollover, `restartCount` 0
- Read the `secrets` array back on the running revision, and record that ADR 0011's claim is now
  formally expired **on a deployment that serves traffic** rather than only in a manifest
- The Log Analytics leak check, on the revision that now holds a vendor key
- A screenshot, because this is the first stakeholder-visible change in the story

## Done when

- The deployed chrome reads **the feed decision 6 settled**, with its sentence, on all five
  routes, in a real browser — and that word is **true of what this deployment actually reads**,
  which is the whole point of the region and the thing `ALPACA.md` §2 put in doubt
- `git diff` touches no file under `apps/frontend/src`
- `pnpm e2e:deployed` passes **unamended**
- The deployed axe reading is 0 violations / 37 passes / 1 inconclusive, matching the pre-merge
  gate — the three-way agreement Story 1.13 established as the comparison the report exists to be
- Log Analytics returns zero for the key id, the secret, `APCA-` and `Authorization`
- Local `MARKET_DATA_PROVIDER=fixture` still reads `SIMULATED`, and the default is still `none`

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
