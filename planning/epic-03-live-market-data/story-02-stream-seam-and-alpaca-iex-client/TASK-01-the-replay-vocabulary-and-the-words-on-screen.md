# Task 3.2.1 — `replay` enters the two unions, and the words that must exist beside it

**Status:** **Complete — 2026-09-18.** `MARKET_FEEDS` widened with ADR 0030 §3's words. **`PROVIDER_IDS` was deliberately NOT widened** — a standing rule this task file had overlooked moved it to 3.2.7, beside the code that produces one. Carries a migration, and two corrections to the task's own plan. See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.1 (complete)

## Objective

Add `replay` to `PROVIDER_IDS` and `MARKET_FEEDS` in `packages/shared`, and
supply every piece of prose the `satisfies` guards then demand. **Nothing else.**
This is first because it is the step that makes every later task's provenance
stamping a compile error rather than a runtime surprise.

## What the user can see when this lands

**Nothing.** No route, no screen, no behaviour — two unions gain a member and the
chrome gains a word it cannot yet reach.

## What is already decided and must not be re-taken

- **ADR 0030 §3 already specifies `replay` as both a `ProviderId` and a
  `MarketFeed`.** Task 3.1.8 confirmed neither union holds it and named this
  story as the owner. This task is **implementing a specification, not taking a
  decision** — if the implementation seems to want a different shape, that is a
  finding for ADR 0030, not a choice to make here.
- **The word on screen is `REPLAYING`, never `LIVE`** — [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
  §2.6 owns the vocabulary and carries it as a fifth cell. `LIVE` reads as a
  claim about the market rather than about the connection, and a replay is not
  the market.
- **A feed added without words is already a compile error**, by the `satisfies`
  guard beside `MARKET_FEEDS`. That guard is the mechanism this task leans on;
  do not weaken it to make the addition quieter.
- **`MARKET_FEED_DESCRIPTIONS` must not imply coverage the feed does not have**
  — invariant 6, and `PRODUCT_SPEC.md` §7.1 is explicit that a reader must not be
  misled, which is a stronger thing than printing an acronym.

## Work

- **Add `replay` to both unions** and follow the compile errors. There should be
  several and each one is the guard doing its job; **write down how many fired
  and where**, because that count is the evidence the guard works and it is
  cheaper to record now than to re-derive.
- **Write the description and the sentence beside it.** A replay is our own
  stored consolidated-tape bars, re-stamped onto the wall clock. The honest
  sentence says so — it is **not** live, it is **not** IEX, and it is **not** the
  market now. Follow `market-provenance.ts`'s existing rule for when a label
  needs a sentence beside it rather than inventing a second rule.
- ~~**Add the `REPLAYING` cell to the feed vocabulary** wherever `LIVE`'s four
  cells already live, per §2.6.~~ **CORRECTED 2026-09-18 during implementation —
  this bullet over-reached and the work was NOT done here.**
  [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
  §11.3's string-home table is explicit: the connection word's home is _"a new
  record beside `FEED_STATUSES`, same `satisfies` guard"_, and its state is
  **"Unwritten. Story 3.3."** So `LIVE`'s cells do not "already live"
  anywhere — the record that turns a `FeedStatus` into a word does not exist,
  and writing it here would be the scaffolding `CLAUDE.md` forbids.

  **The distinction that makes this correct rather than a dodge:** `REPLAYING`
  is a **rendering of the `live` connection state when the feed identity is
  `replay`** — not a fourth `FeedStatus`. `FEED_STATUSES` still holds three
  members and this task added none. What `replay` needed in a vocabulary was its
  **feed** words, and those landed in `MARKET_FEED_DESCRIPTIONS` as specified.

- **Check `pnpm invariants` still holds every spelling to one home.** The
  invariant that one fact has one home is what stops a drawn sentence and its
  spoken twin drifting apart, and a new member is exactly when that drifts.

## Done when

- `PROVIDER_IDS` and `MARKET_FEEDS` both hold `replay`, and `pnpm build` is green
- Every `satisfies` guard that fired is satisfied with **words a non-specialist
  can read**, not a placeholder
- The task file records **how many compile errors the addition produced and
  where**, as evidence the guard is load-bearing rather than decorative
- `REPLAYING` exists in the vocabulary; **nothing renders it yet**
- `pnpm verify` passes

## Notes

**This task is deliberately tiny and deliberately first.** Every later task in
this story stamps provenance, and doing the vocabulary last means every one of
them carries a `// TODO: replay` that the compiler cannot see. Doing it first
means the compiler names each site.

---

## What was found

### The `satisfies` guard fired, and the count is the evidence

Widening **both** unions — the task's original plan — produced **four compile
errors at three sites**, every one named by the compiler rather than found by
reading:

| Site                                                    | Error                                                            | From           |
| ------------------------------------------------------- | ---------------------------------------------------------------- | -------------- |
| `PROVIDER_SERVES` (`market-provenance.ts:125`)          | `TS2741` property `replay` missing                               | `PROVIDER_IDS` |
| `MARKET_FEED_DESCRIPTIONS` (`market-provenance.ts:234`) | `TS2741` property `replay` missing                               | `MARKET_FEEDS` |
| `createMarketDataProvider` (`market-data.ts:116`)       | `TS2322` **and** `TS1360` — `"replay"` not assignable to `never` | `PROVIDER_IDS` |

**Three of the four came from `PROVIDER_IDS`**, which matters for the correction
below: they will now fire in **Task 3.2.7** instead, beside the producer. Only
`MARKET_FEED_DESCRIPTIONS` belonged to this task, and it is answered.

### Correction 1 — `PROVIDER_IDS` does not belong in this task

**Found by a test failing, and the test was right.**
`market-provenance.test.ts` asserts `PROVIDER_IDS` equals exactly
`["fixture", "alpaca"]` under the title _"ships a member only for a provider
something can produce"_, and its comment makes clear this is a **standing rule
with a live precedent**, not a count awaiting an update:

> _a provider id is a member only when something can produce it, which is the
> rule (`SECURITY_STATUSES`' — `delisted` still waits for the code that can set
> it) rather than the count._

**The rule is right and this task's plan was wrong.** Nothing produces a replay
bar until 3.2.7. `MarketDataProviderSelection` derives from `PROVIDER_IDS`, so
adding the member makes **`MARKET_DATA_PROVIDER=replay` a value that validates
at startup and that nothing can honour** — which `market-data.ts`'s own doc
comment names as the exact thing its exhaustive switch exists to prevent.

**The two unions are not alike, and that is the resolution rather than a
compromise:**

- **`MARKET_FEEDS` is a label vocabulary.** A feed value only ever appears
  stamped on data; no data carries `replay`, so **no wrong state is reachable**.
  The `satisfies` guard forces the words to exist before anything can render
  them. It lands here.
- **`PROVIDER_IDS` is operator-settable configuration.** It lands in **3.2.7**,
  beside `createReplayStream` — the same rule `alpaca` followed when it arrived
  beside `alpaca-provider.ts`.

**The guard was not weakened to make the addition quieter**, which this task's
own _must not re-take_ section forbids. The assertion is untouched.

### Correction 2 — the `REPLAYING` cell is Story 3.3's, not this task's

Recorded in the Work section above. §11.3's string-home table says the
connection word's home is **unwritten and owned by Story 3.3**, and `REPLAYING`
is a **rendering of the `live` connection state when the feed is `replay`** —
not a fourth `FeedStatus`. `FEED_STATUSES` still holds three members.

### An unplanned migration, and the window it opens

ADR 0030 §3 specifies one and the task file did not restate it.
`market-bars.database.test.ts` ties both check constraints to the two unions and
asserts **set equality**, so widening a union without the SQL turns
`pnpm test:database` — a **required** check — red.
`0008_replay_provenance_vocabulary.sql` widens the **feed** check only; the
provider check moves to 3.2.7 with its union.

**Stated rather than left to be discovered:** when 3.2.7 widens `PROVIDER_IDS`,
`schema.ts`'s insert types widen with it, so **the compiler stops preventing a
replayed write at the same moment the database check starts permitting the
value.** Task 3.2.8's runtime guard in `recordSeries` is what closes that window,
and the migration says so in its own comment.

### What was checked and found already true

- **`PROVIDER_SERVES`'s doc comment had already predicted this member and its
  answer** — _"`fixture` invents prices and a replay of stored bars would not,
  and both answer `not-the-live-market` for the same reason"_. When 3.2.7 adds
  the provider, the answer is already argued.
- **ADR 0030 §7's "second opt-in key that production has never had" already
  exists, and the ADR already said it would cover `replay`** — §7 names the
  classification as holding "for providers nobody has thought of yet — `replay`
  included, when Story 3.2 adds it." `config.ts` refuses to start a deployment
  whose provider is marked `not-the-live-market` unless
  `NON_LIVE_MARKET_DATA=permitted` is granted by name. **Verified against the
  code rather than taken from the document**, which is the only thing that
  separates a mechanism from a belief. Nothing to build; 3.2.7 should still
  prove it fires.
- **`pnpm invariants` holds at 12**, and `pnpm break feed-words-in-a-renderer`
  still goes red with the new member present — the one-home guard was re-proven
  rather than assumed.
- **§11.3's reversal trigger fired** — _the first feed added to `MARKET_FEEDS`_ —
  and `LIVE-DATA.md` is amended to record that it fired and what the guard
  caught.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical price and volume charts. What they still cannot do is watch a price
move — there is no live market data yet. That is this epic's job, and it is the
epic in progress now.

**What this task did, in one sentence:** it taught the system a new word for
where a price came from, and — more importantly — it stopped short of teaching it
a word it could not yet back up.

**The longer version, because the restraint is the interesting part.**

We are about to build two things at once: a connection to the real live market,
and a **replay** that re-plays real prices from a past trading day. The replay
exists for a practical reason — the US market is open for six and a half hours a
day, and our working day mostly is not. Without it, anyone designing how a moving
price should _look_ would be designing against invented numbers, and invented
numbers do not move the way real ones do.

**That creates an obvious danger: somebody sees replayed prices and thinks they
are looking at the market right now.** Our whole product is built on never
misleading anyone about where a number came from. So before building the replay
at all, this task added the **label** it will wear — _"Replay — real bars from a
past US session, replayed. Not the live market."_ That sentence is deliberately
correcting two different misunderstandings at once: these numbers are **not
invented**, and they are **not now**.

**Then it deliberately did less than planned, and this is the part worth
reporting.** The original plan also added "replay" to the list of data sources an
operator can switch the system to. A test stopped it — and the test was right.
The rule it protects is one this codebase has followed for a while: **a source
only goes on the menu once something can actually serve it.** Nothing can serve a
replay yet; that gets built in a few tasks' time. Adding it early would have
created a setting somebody could switch on that would quietly produce no data at
all.

**We could have changed the test. We didn't, and that is a deliberate standard.**
Weakening a check to let a change through is how safety rails quietly stop
working — and this particular rail is one of several standing between a developer
tool and a real user seeing fake prices. The task's own instructions said, in
advance, not to weaken the guard to make the change quieter. It held.

**One thing confirmed rather than discovered, and the distinction matters.**
There is a safety mechanism this epic depends on: a special permission a
deployment must be granted by name before it can serve anything other than the
real live market. **It was built months ago, and our own design record already
said so** — the decision document for the replay states plainly that the
protection extends to the replay "when Story 3.2 adds it". So this is not a
happy accident; it is a plan working. What this task actually did was **check it
against the code rather than trust the document**, which is the standard here:
a mechanism nobody has verified is a belief.

**How this unlocks progress.** Small as it is, this is the first line of code in
the story that makes the live market feed possible. The next tasks build the
connection itself. **Two stories from now the product shows a live price for the
first time** — and when it does, the words describing where that price came from
will already be correct, because they were decided here, before anything could
render them wrong.

**What a user can see today: nothing new.** This was vocabulary and restraint.
The screen is unchanged.
