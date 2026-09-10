# Task 2.9.1 — Settle the four open decisions and the namespace, shipping no route

**Status:** Complete — 2026-09-09
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Story 2.8 (complete)

## Objective

Take this story's four open decisions — the window vocabulary, downsampling,
pagination, and the read-side join — plus the path the series endpoint lives at,
**with measurements rather than preferences**, and write them down in one document
before any contract is typed. Task 2.6.1's precedent: settle the shape, ship nothing.

## What the user can see when this lands

**Nothing.** No route, no type, no page. The payoff is Story 2.12's chart, and the
thing this task buys is that Tasks 2.9.2 to 2.9.6 do not each answer the same
question differently. Say so plainly when reporting it.

## Work

Produce `MARKET-DATA-API.md` in this directory — the subject document for this
story, listed in `CLAUDE.md`'s _Where the record lives_ table by the close task
(2.9.10 when this was written; **2.9.11** since 2026-09-10) — and
settle each of the following in it, with the alternatives and a **reversal trigger
that is a condition rather than a story number**.

- **The namespace and the path.** `GET /market-data` already exists (Task 2.6.7)
  and answers _which feed is this deployment reading_. That amendment says the
  namespace is yours to shape and states the one hard rule: **no second endpoint
  may answer "which feed"**. Weigh `/market-data/bars`, `/securities/:symbol/bars`
  and a third if there is one, and note that Story 2.11 gives a security its own
  frontend route — which is an argument about URLs a person types, not necessarily
  about the API's shape. Decide once; three later epics inherit it.

- **Open decision 1 — named windows, absolute ranges, or both.** The story states
  the trade: a named window keeps one definition of a session, an absolute range
  keeps the server dumber. Three facts bind it and are already settled upstream:
  a wire instant is a **UTC ISO 8601 string**, a session is a **`YYYY-MM-DD`
  market date and a separate wire type**, and `lastMarketSessions(n, endDate)`
  **refuses rather than truncates** outside 2024–2028 (ADR 0017 decision 9).
  `packages/shared` may not read the wall clock — lint enforces it — so `today`
  is resolved in the handler and passed in.

- **Open decision 2 — downsampling, and it now has a number under it.** A year of
  minute bars for one symbol is **97,530 rows ≈ ~~8.4 MB~~ 11.08 MB of JSON**
  (`BARS.md` §8.6, whose row count reproduced exactly and whose payload figure was
  found 24% low when this task re-took it — see `MARKET-DATA-API.md` §8),
  so "send them all" is not an answer. Decide whether the server ever reduces a
  series, and if it does, **decide it as an aggregation rather than as a
  sampling**: taking every _n_ th bar deletes exactly the spikes this product
  exists to notice, whereas bucketing to `first(open), max(high), min(low),
last(close), sum(volume)` is the same operation that made `1d` out of `1m` and
  is expressible in SQL over `numeric`. Note the constraint from `PROVIDER.md`
  §9.4 and `bar.ts`: a **stored** `1d` bar is never derived from `1m`, because
  replay reconstructs from what was stored — a **served** reduction is a different
  claim and the response has to be able to say which it is.

- **Open decision 3 — a cap, pagination, or neither.** Story 2.4 answered the
  universe's version by having no page size at all, on the argument that _the
  thing that reaches 500 without an edit is no number rather than a bigger one_.
  **That argument does not transfer**, and the story says so: a series' size is a
  function of a user's request. Decide what happens when a request exceeds
  whatever is chosen — a 400 naming the limit, a silently reduced series, and a
  paged answer are three different products — and prefer the one where a client
  **cannot** be handed fewer bars than it asked for without being told.

- **Open decision 4 — the read-side join** (added by Task 2.8.8). The store holds
  **complete sessions only**; the catch-up runs at 08:00 UTC before the open, so
  today's session is not in it. Three shapes, none chosen: serve only what is
  stored; stitch a live tail and label the seam; or ask the provider for the whole
  window on demand. Two measurements are already in hand — a mid-session fetch is
  **always ~16 minutes stale** and returned 134 of 390 minutes at a simulated
  12:00 ET, and every stored bar is **SIP** where Epic 3's stream is **IEX**.
  `SeriesProvenance.sources` is a list precisely so a stitch can report two feeds.
  **Recommend option 1 for this epic** unless the measurement says otherwise, and
  write the trigger for option 2 as a condition — Epic 3 having a live tail worth
  joining — rather than as a story number.

- **State what a "partial answer" is, in this contract's own words**, because
  three later tasks assert it: §36 says _"we have data through 15:42"_ and _"we
  have nothing for this symbol"_ are answers rather than errors, and
  `SeriesCoverage` already has the shape for both — `requested` always present,
  `covered` `null` exactly when the series is empty. The job here is to say which
  HTTP status each is and to refuse the temptation of a 404 for an empty series.

- **Restate the `status` rule so Task 2.9.4 cannot get it wrong.** `UNIVERSE.md`
  §12.2 puts this path firmly on the do-not-filter side: an `untracked` symbol's
  stored history is still what happened, so it is served and labelled untracked.
  Stories 2.7 and 2.8 filter; this does not.

## Done when

- `MARKET-DATA-API.md` exists and settles the namespace and all four open
  decisions, each with its alternatives and a reversal trigger stated as a
  condition
- Every figure in it was taken in this task or quoted with its source and date —
  no number is carried forward from `CLAUDE.md`
- The story's open-decision list is struck through in `STORY.md` the way Story
  2.4's was, pointing at the document rather than repeating it
- `pnpm verify` passes — which for a documentation-only task means `pnpm links`
  and `prettier` on the new file

## Notes

The user owns open decisions 2 and 4. Bring the numbers and a recommendation
rather than the question — `BARS.md` §2's three-option table is the format that
worked.

---

## What was produced, 2026-09-09

[`MARKET-DATA-API.md`](MARKET-DATA-API.md) — nine sections, the namespace and all
four open decisions, each with its alternatives and a reversal trigger stated as a
condition. No route, no type, no page, as intended.

| Question                | Settled as                                                                             | Owner        |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------ |
| The namespace and path  | `GET /market-data/bars`, symbol as a query parameter                                   | This task    |
| 1 — the window          | **Both**; absolute is the primitive, a named session count resolves to one server-side | This task    |
| 2 — downsampling        | **The server never reduces a series**                                                  | **The user** |
| 3 — a cap or pagination | **10,000 bars, refused with a 400 naming the limit.** No pagination                    | This task    |
| 4 — the read-side join  | **Stitch the store to a live tail and label the seam**, with four bounding rules       | **The user** |

Decision 4 went to the user with the numbers and a recommendation of "serve only
what is stored"; **the user chose the stitch**, so §5 records the stitch as the
decision and adds the bound the recommendation existed to protect — the read path
fetches only the uncovered tail, and at most the current session's, so a stale
store cannot turn a page load into a multi-day metered vendor request. Decision 2
came back delegated — _"what would you recommend based on the product spec"_ — so
§3 argues it from §5.1, §11, §22 and §35 rather than from the payload alone.

**Measurements taken in this task**, all against the local 48,027,772-row store:
payload and timing for five windows at both timeframes; server-side OHLCV
bucketing at 5m/15m/60m; `stringify`/`parse` cost at seven series sizes; per-bar
byte cost across eight securities; and the store's coverage frontier. §8 records
the method for each.

**One figure was falsified and swept the same day.** `BARS.md` §8.6's _"97,530
rows ≈ 8.4 MB of JSON"_ reproduces its row count exactly and is **24% low on the
payload** — it is 11.08 MB. Corrected at every live site (`BARS.md` §8.6 by dated
amendment beside the original rather than a rewrite, `STORY.md`'s 2026-09-08
amendment, Tasks 2.9.8 and 2.9.9, and this file), with the method recorded so the
next reader re-takes it rather than citing it.

---

## For the stakeholder — what this was, in plain terms

**Nothing appeared on screen today, and that was the point.** This task is the
one where we decide the rules before anyone writes the code that has to follow
them. The alternative — letting the next four pieces of work each answer the same
question in their own way — is how a product ends up with three slightly different
ideas of what "the last five days" means.

Here is what MarketPulse now holds: **48 million real minute-by-minute price
records** for 518 US companies, roughly a year deep. What it does not yet have is
a way for the screen to ask for them. That request-and-answer format is what this
story builds, and today we settled its five ground rules.

### The five decisions, and why

**1. Where the price history lives, as a web address.** We chose to group it with
everything else about _the market_ rather than filing it under each individual
company. The deciding reason is a feature already in the product plan: the AI is
supposed to be able to say "compare NVIDIA, AMD, Broadcom and the S&P 500 on one
chart". Filing prices under a single company makes that four separate requests
forever; grouping them under the market makes it one, later, when we need it. We
built nothing extra today — we just avoided a door that would have been bricked
up.

**2. How you ask for a stretch of time.** You can either give exact start and end
times, or say "the last five trading days" and let our server work out what that
means. We support both, and the second one exists for a genuinely awkward reason:
**your computer's calendar is not the stock market's calendar.** Someone opening
the app in Singapore in the morning is, from New York's point of view, still on
yesterday. If the browser worked out "the last five days" itself, that user would
silently get the wrong five days — a chart that looks completely normal and is
shifted by one day. The market's calendar lives on our server, so the server
answers that question.

**3. Do we ever shrink the data before sending it?** A year of minute-by-minute
prices for one company is **97,530 data points and 11 megabytes** — far too much
to send to a browser for a chart. The obvious fix is to squash them into
five-minute or hourly chunks before sending. **We decided not to**, and there are
two reasons worth understanding.

The first is that we already have a better version of that. We separately store
one summary record per trading day, straight from the market — and those official
daily figures include the opening and closing auctions, which the minute-by-minute
data can miss. So a daily record we _received_ is more accurate than a daily
record we would _calculate_. For a long chart, a year of daily prices is 251
points and 29 kilobytes: 0.26% of the data, and better.

The second reason is about trust, which is the product's whole proposition.
MarketPulse's promise is that every number a user sees is something that was
actually observed, traceable back to its source, with its origin displayed. The
moment we start manufacturing summary figures and sending them in the same shape
as observed ones, a user can no longer tell which is which — and the specification
explicitly forbids "manufacturing missing observations". It would also break the
replay feature, which has to reconstruct exactly what was knowable at a past
moment from what was actually recorded.

**4. What happens when someone asks for too much.** We set a ceiling of **10,000
price points per request**, and a request over it is politely refused with a
message saying what the limit is, how much was asked for, and the two ways to fit
inside it. We deliberately did _not_ choose the alternative — quietly sending less
than was asked for — because a chart drawn from silently truncated data is wrong
and looks completely fine.

The number 10,000 was measured rather than picked. Interestingly, the thing we
expected to be the constraint wasn't: even the full 97,530 points are processed by
a browser in 25 milliseconds. What actually hurts is **the download** — 1.8 MB
compressed is well over a second on an ordinary connection. At 10,000 points the
download is 184 kB, about a sixth of a second. That covers a full month of
minute-by-minute data and every daily chart we can currently draw.

**5. What to show for "today", when we don't have today yet.** Our stored history
is deliberately assembled from _completed_ trading days, so a chart running up to
"now" would otherwise stop at the last closing bell. **You chose to join the two
together and clearly mark the join** — stored history plus a live tail — rather
than letting charts end in the past.

That is the more ambitious answer and it is the right one for the product, so the
job today was to make it safe rather than to argue with it. The risk is our
supplier's **request allowance** — the free plan we are on permits about 200
requests a minute across the whole account and refuses the rest — and a naive
version would fetch fresh data on every single chart load, proportional to how far
behind our stored history had fallen. So the rule we wrote down is that we fetch
**only the missing tail, and at most today's** — anything older is a gap our
overnight process should fill, and the chart says honestly how far its data
reaches. We also recorded that the caching work later in this story stops being a
nice-to-have and becomes the thing that keeps this within the allowance.
(**Wording corrected 2026-09-09**: this paragraph said the plan "charges per
request". It does not — the plan is free and the limit is a rate limit, not a
price. See Task 2.9.5's stakeholder correction.)

There is one detail here that matters to the product's honesty. The two halves of
a joined chart come from **different sources**: our stored history covers every US
exchange, while the live feed our plan gives us covers only one exchange. We are
not allowed to blur that. The data format we built earlier already carries a _list_
of sources rather than a single one precisely so a joined chart can say "this part
came from here, that part from there" — and today's decision is the first thing
that actually uses it.

### One thing we found and fixed

A figure we were handed to work from — the size of a year of price data — turned
out to be **24% too low**. We re-measured it properly and corrected it everywhere
it was quoted, including in two pieces of work that haven't started yet and would
have been planned against the wrong number. The conclusion it supported was
unchanged; the number simply had to be right, and this repository's standing rule
is to re-measure rather than to pass figures along.

### Where this leaves the product

Epic 2 is the foundation: get real market data in, and get it onto a screen. The
data is in — 48 million records. The next four pieces of work build the request
format, the response format, the database read, and the endpoint itself. Then, in
**Task 2.9.7, the first real share price this product has ever displayed** appears
on the securities page. The charts follow in Stories 2.12 and 2.13.

None of that could start honestly until today's five questions had one answer
each.
