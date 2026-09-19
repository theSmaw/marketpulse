# Task 3.3.3 — The connection words, in a record with the same guard

**Status:** **Complete — 2026-09-19.** `packages/shared/src/feed-words.ts`, 15 tests, no socket. **§11.3's capitals turned out to belong to the stylesheet rather than to the strings**, which is what makes Task 3.3.5 a substitution rather than a change. The `one-home` invariant grew from two literals to seven and gained a second break.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.2

## Objective

The **one string this story owes and nobody has written**: what
`live | stale | disconnected` say to a person, in a record beside
`FEED_STATUSES` with the same `satisfies` guard `MARKET_FEED_DESCRIPTIONS` uses.

## What the user can see when this lands

**Nothing yet** — the words exist and nothing renders them. 3.3.5 does.

## What is already decided and must not be re-taken

- **[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.3 names this record as unwritten and names this
  story as its owner**, and it is explicitly **not a string in a component**.
- **The grid is settled** (§11.3), and the row that looks wrong is correct:
  **`IEX` / `LIVE` / `CLOSED`** at 03:00. Our connection is healthy; the market
  is shut. **Three regions, three facts, none collapsing into the others.**
- **`LIVE` means the feed is HEALTHY, not that data arrived** (§9.4) —
  authenticated, subscribed, heartbeat current. The intuitive definition is the
  wrong one here: §7.6 measured a median symbol producing a bar in 65.1% of
  minutes and `ERIE` in **2.1%**, so a definition keyed on data would report a
  correctly-working feed as not-live for most of the day.
- **`REPLAYING`, never `LIVE`, when the feed is `replay`** — ADR 0030 decision
  4, and Task 3.2.1 shipped the feed's words but **not** this connection word.
  It is a rendering of the `live` state when the feed identity is `replay`, not
  a fourth `FeedStatus`.
- **`FEED_STATUSES` has three members and gains none.** Both sentences §11.2
  requires be sayable already fall out of three.

### It owes a SECOND string, found 2026-09-19 after Task 3.3.2

**`NOT CONFIGURED` exists nowhere in the shipped vocabulary** — not in
`market-provenance.ts`, not in `FeedProvenance.tsx`. It is specified **only** in
§11.3's grid, on the row for a deployment with no provider:

```text
| none | — | either | `NOT CONFIGURED` + its sentence | — | either |
```

**And it does not obviously belong in either existing record**, which is why it
needs deciding rather than dropping into one:

- It is a **feed-cell** word, so `MARKET_FEED_DESCRIPTIONS` is the instinct —
  but that record is `Record<MarketFeed, …>` and **`none` is a `ProviderId`,
  not a `MarketFeed`**. Widening `MARKET_FEEDS` to hold it would be inventing a
  feed to describe the absence of one.
- It is not a **connection** word either. The grid's connection cell for that
  row is **`—`**, not a word.

**Decide where it lives and say why**, the same way the story's other
vocabularies argue their homes. The likely shape is a third small record keyed
on _what the chrome is being asked to render_ rather than on either union — but
take it deliberately.

## Work

- **The record**, beside `FEED_STATUSES` in `packages/shared`, using
  `ProvenanceDescription` — which exists precisely because two vocabularies
  already obey the same rule and a third interface would be a third place for it
  to drift.
- **Follow the sentence rule rather than inventing a second one**: _a sentence
  appears when the label cannot stand alone, and not otherwise._ `sip` has no
  sentence and that took three attempts; padding in a status strip is worse than
  silence because it teaches a reader the second line is not worth reading.
- **`REPLAYING` needs a home** — decide whether it is a member of this record or
  a rendering rule applied over it, and **say which in the code**. It is a
  connection word whose trigger is a **feed identity**, which is the one string
  in this product that crosses the two vocabularies.
- **The words must not imply the market's state.** `DISCONNECTED` says nothing
  about whether the market is open; the clock region says that, and §11.3's grid
  keeps them separate deliberately.

## Done when

- The record exists with the `satisfies` guard, so a fourth `FeedStatus` without
  words is a compile error
- **`NOT CONFIGURED` and its sentence exist, with a decided home and the reason
  written where they live**
- Every sentence is defensible against §11.3's grid, including the `LIVE` /
  `CLOSED` row
- `REPLAYING` has a decided home and the decision is argued where it lives
- **Nothing renders any of it yet**
- `pnpm invariants` still holds every spelling to one home
- `pnpm verify` passes

---

## What was found

### §11.3's capitals are the STYLESHEET's, and getting that wrong turned the suite red

The record was written first with the grid's spellings — `LIVE`, `STALE`,
`DISCONNECTED`, `REPLAYING`, `NOT CONFIGURED` — and pointing `FeedProvenance` at
the last of them **broke three component tests**, which were asserting the
`not configured` the component already shipped.

That is the useful kind of failure, because the correct repair was not the
obvious one. The chain:

- `styles/type.module.css`'s **`.microLabel` carries `text-transform:
uppercase`**, and **every cell of the status strip composes it** — the feed
  cell, the connection cell and the backend cell alike.
- So the capitals in §11.3's grid are **what a reader sees**, produced by the
  stylesheet. A label spelled `LIVE` in the data asks for them twice.
- The shipped vocabulary already says so: `MARKET_FEED_DESCRIPTIONS` ships
  `"Simulated"`, `"Replay"` and `"All US exchanges"`, and **only `"IEX"` is
  capitals, because the acronym is**.
- And the decisive precedent is the **other cell of this same strip**:
  `BackendIndicator`'s `STATUS_WORD` ships `healthy` / `degraded` /
  `unreachable` on a rule it states in a comment — _the words are the union's
  own members, so the screen and the type share one vocabulary._

**Two consequences worth keeping.** What a screen reader is handed is the **DOM
text**, not the transform, so the case in the data is a decision about the
spoken rendering rather than a cosmetic one — and this repository already has
an open listening pass it should not be quietly prejudging. And because
`FeedIndicator` renders the raw `FeedStatus` today, a record whose labels **are**
the union's members makes **Task 3.3.5 a substitution**: no pixel changes, no
browser assertion moves, and the diff is one import.

A test now holds both halves — every label lower case, and every connection
label identical to its union member.

### `NOT CONFIGURED`'s home: the grouping in the component was right about two of three

`FeedProvenance.tsx` held this string beside `checking` and `unknown`, under a
comment saying the three are _"the states that are about **us** rather than
about a venue"_. **That is true of two of them and false of this one:**

| State            | Whose fact                                    | Server knows it?                |
| ---------------- | --------------------------------------------- | ------------------------------- |
| `checking`       | This browser's first request has not returned | **No**                          |
| `unknown`        | This browser could not read an answer         | **No**                          |
| `not configured` | **The deployment's configuration**            | **Yes — it sends `feed: null`** |

`checking` and `unknown` genuinely cannot be server vocabulary — the server
always knows its own state, and both describe the **client's** ignorance. But
_no provider is configured_ is a fact the server holds and transmits, so it
belongs where the other transmitted words are. It is **not** in
`MARKET_FEED_DESCRIPTIONS`, because that record is `Record<MarketFeed, …>` and
**`none` is a `ProviderId`, not a `MarketFeed`**: widening the union would be
inventing a feed to describe the absence of one, and every consumer would then
have to handle a member that can never be stamped on a bar.

The task predicted "a third small record keyed on what the chrome is being asked
to render". What it became is slightly different and better: **two functions**,
`feedWordFor(feed)` and `connectionWordFor(status, feed)`, each keyed on
**exactly what the wire carries**. The wire's shape and the grid's shape are not
the same shape, and these are the two places that conversion happens.

### `REPLAYING` is a rendering rule, and the crossing happens in one function

ADR 0030 decision 4 forbids `LIVE` while the feed is `replay`, and the reason is
a category difference rather than a preference: `FeedStatus.live` is a claim
about a **connection**, while `LIVE` in the chrome reads as a claim about the
**market**. With a replay running on a Saturday afternoon those two diverge
completely.

**It is not a fourth `FeedStatus`** — §11.2 keeps that union at three, and the
socket's health genuinely is one of three things. It is a **rendering of `live`
when the feed identity is `replay`**, which makes it the one string in this
product that crosses the two vocabularies.

So the crossing lives in `connectionWordFor` and **nowhere else**. A component
writing `status === "live" && feed === "replay"` for itself would be a second
place the rule can be got wrong — and `pnpm break feed-words-in-a-renderer`
exists because exactly that has happened before with the feed's own words.

### `null` means there is nothing to say, which the grid says and the wire cannot

The grid gives the no-provider row a **`—`** in the connection cell rather than a
word, and the gateway sends `disconnected` with `feed: null` because
`FeedStatus` has three members and _not configured_ is not one of them.
`connectionWordFor` returns **`null`** for that case: a deployment with no
provider has no connection to describe, and `DISCONNECTED` there would be
technically true and actively misleading — it invites _something broke_ about a
deployment behaving exactly as configured.

### The sentence rule was applied rather than re-invented

_A sentence appears when the label cannot stand alone, and not otherwise._

- **`live` gets none.** `LIVE` beside a named venue and a market clock is not
  ambiguous, and padding in a status strip is worse than silence — it teaches a
  reader the second line is not worth reading. This is `sip`'s rule, which took
  three attempts to settle in Story 2.6.
- **`stale` gets one**, because it is the one that cannot stand alone: `STALE`
  invites _the price is wrong_, and the true statement is narrower — the
  connection is fine and nothing has arrived.
- **`disconnected` gets one**, and it has a specific job. §36's own example is
  written for this state, and Story 3.3's owner decided on 2026-09-19 that the
  instant appears **only** here and in `stale`. The sentence is therefore the
  only place a reader learns the numbers did not vanish.

**And none of them mentions the market.** `DISCONNECTED` says nothing about
whether the market is open; the clock region says that. Which is why the grid
row that looks wrong is correct: **`IEX` / `LIVE` / `CLOSED`** at 03:00 — our
connection is healthy, the market is shut, three facts that fail independently.

### The invariant grew a second home, and both breaks were re-proven

`one-home-for-the-feed-words` guarded **two** literals, both in
`market-provenance.ts`. It now guards **seven**, and takes a **home per
literal**, because the connection words are a second home rather than an
extension of the first — two facts that fail independently are two records.

**The labels themselves are deliberately not guarded.** `live` / `stale` /
`disconnected` appear legitimately in every file that switches on a
`FeedStatus`, and a check a `switch` statement can trip is a check nobody can
keep green. What is guarded is the **sentences** and the one multi-word label —
a renderer writing a sentence has invented a claim in a way a renderer writing
`live` has not.

A new break, `connection-words-in-a-renderer`, performs the plausible mistake:
the feed cell growing its own helpful sentence for the unconfigured deployment.
**And the pre-existing break was re-run**, because the loop it depends on was
refactored from `for (const literal of …)` to a destructuring one — a guard that
stopped working during that change would have looked identical to one that
works.

```text
✓ connection-words-in-a-renderer  broken → red → restored byte-identical
✓ feed-words-in-a-renderer        broken → red → restored byte-identical
```

### On "nothing renders any of it yet"

Strictly, one renderer changed: `FeedProvenance.tsx` now **reads**
`NOT_CONFIGURED_DESCRIPTION` instead of holding its own copy. That is the
criterion being satisfied rather than broken — a "decided home" that the
existing renderer ignores is not one home, it is two, and the invariant would
have said so. **No new words reach a screen**, and the rendered output is
byte-identical.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the **third of
seven** tasks in the story that changes that — **`LIVE` appears on screen at task
five**.

**What this task built: the words themselves.**

The previous two tasks built the language the server and browser speak, and the
connection they speak it over. This one writes **what a person actually reads**
— the handful of words the corner of the screen will use to say whether the
market data arriving is live, stalled, or not arriving at all.

It sounds trivial. It is roughly a hundred words of English, and nearly all of
the work was deciding **what each one is allowed to claim**.

**The most interesting decision: what does `LIVE` mean?**

The intuitive answer is _data is arriving right now_. **We measured that this is
the wrong definition.** In a typical minute of trading, the average company we
track produces a price update about **65%** of the time — and our quietest
company produces one in **2%** of minutes. A `LIVE` light keyed on data arriving
would spend most of the day off, on a feed working perfectly.

So `LIVE` means **the connection is healthy** — we are connected, subscribed,
and receiving the supplier's heartbeat. That produces one screen that looks
wrong and is right: at 3am you may see `IEX · LIVE · CLOSED`. Our connection is
healthy. The market is shut. **Three separate facts, none pretending to be the
others** — which is the whole reason this product labels its data at all.

**A word we refuse to say, and why.**

We can replay a past trading day in development. **The word `LIVE` must never
appear during one** — because `LIVE` reads as a claim about the _market_, not
about our plumbing, and replaying last Tuesday on a Saturday afternoon is not a
live market. The screen says `REPLAYING` instead, and the rule that decides this
lives in exactly **one** place in the code, so no future screen can quietly get
it wrong.

**And a word we refuse to say for the opposite reason.** When a deployment has
no market-data supplier configured at all, the connection cell says **nothing** —
a dash. Saying `DISCONNECTED` would be technically true and actively misleading:
it suggests _something broke_, when the system is behaving exactly as
configured.

**A small finding that saved the next task real work.**

I initially wrote all these words in capitals, because the specification writes
them that way. Three tests failed — and the reason was instructive. **The
capitals come from the design system, not from the words.** Our status strip
styles every label in uppercase automatically; the words themselves are stored
in plain lower case, which is exactly how the neighbouring cells of the same
strip already work.

Two things follow. Screen readers read the _stored_ word, not the styled one, so
storing shouty capitals is a decision about how the product sounds to a blind
user — not a cosmetic one, and not one to take by accident. And because the
stored words now match what the screen already shows, **the task that puts them
on screen becomes a one-line substitution** rather than a change that moves
pixels and breaks browser tests.

**We also strengthened a safety net.** This product has an automated rule that a
sentence shown to a user may only be written in **one** place — copy it into a
component and the build fails. That rule covered two sentences; it now covers
seven, including all of today's. We proved it works by deliberately breaking it
and watching the build go red, **and re-proved the older half**, because the
shared machinery was refactored today and a safety net that quietly stopped
working would look exactly like one that works.

**How this unlocks progress.** The language exists, the door exists, and now the
words exist. Next comes the wiring into the browser, and then the screen itself.
**`LIVE` appears on screen at task five of seven** — the first time this product
says anything true about the market _right now_.

**What a user can see today: nothing new.** Two more tasks, and the corner of the
screen comes alive.
