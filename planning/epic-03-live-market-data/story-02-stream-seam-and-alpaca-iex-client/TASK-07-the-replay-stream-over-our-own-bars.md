# Task 3.2.7 — The replay stream, and the guard that stops it lying

**Status:** **Complete — 2026-09-18.** `replay-engine.ts`, `replay-stream.ts`, `replay-bar-source.ts`, migration `0009`, and a new `pnpm break`. `PROVIDER_IDS` gains `replay` **here**, beside the thing that produces one. See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.6

## Objective

A third implementation reading the **48.4M real minute bars already in
`market_bars`**, re-stamped onto the wall clock — so `pnpm dev` shows **real
intraday movement** outside market hours. Plus the two guards that keep it from
becoming a lie.

## What the user can see when this lands

**Nothing in the product**, and this is the subtle one: a **developer** running
`pnpm dev` outside a session now sees real prices moving. That is not a user-
visible feature — it is the instrument Story 3.4 needs, because **invented prices
cannot settle a motion vocabulary**; the shape of real intraday movement is the
thing being designed against.

## What is already decided and must not be re-taken

- **[ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md) decisions 7a–7f are the layering, and the story says read
  them before implementing.** One mechanism **prevents**, two **detect and
  bound**, one **raises the number of independent mistakes needed from one to
  two**. **None is a compiler, and the word "guaranteed" must not appear in this
  story's record.**
- **The replay refuses to run while `marketSessionStateAt(now)` is `open`** —
  decision 7, and the developer-side guard. It catches the person who left
  `MARKET_DATA_PROVIDER=replay` in their `.env` and is building against a
  recording believing they are on the live feed. **This owes a `pnpm break`
  entry.**
- **Production only tells the truth, at any hour.** The deployed backend is
  `alpaca`; outside a session it shows stored history, a clock reading closed and
  a feed not delivering. **This story must not ship anything that makes a
  deployed replay reachable.**
- **Bars are re-stamped onto the wall clock while `occurredAt` keeps the
  recorded instant** (acceptance criterion 10), and **no observation is ever
  emitted ahead of the replay's own clock** — invariant 4 in miniature, and the
  **first place in this product where that constraint is real rather than
  anticipated.**
- **One engine over a `ReplayBarSource` seam** serves this and the generated
  case, so pacing, ordering, session advance and `BarSource` stamping exist
  **once**.
- **It reads through the shipped `MarketBarsRepository.readBars`** rather than
  its own query — and note `status` is Story 2.3's invisible predicate: a replay
  shows what we **stored**, so it **must not filter** on it.

## Work

- **Build the engine over the `ReplayBarSource` seam**, then the stored-bars
  source behind it.
- **The open-market refusal**, which both refuses to start and **stops if already
  running**. Test both directions: a replay that refuses to start but keeps
  running once the bell rings is the same defect.
- **Re-stamp onto the wall clock; keep `occurredAt`.** Two instants, both real,
  neither invented. This is where invariant 4 becomes code.
- **Add `replay` to `PROVIDER_IDS` — moved here from 3.2.1 on 2026-09-18, and
  the reason is a rule rather than a preference.** `market-provenance.test.ts`
  holds that _a provider id is a member only when something can produce it_
  (precedent: `SECURITY_STATUSES`' `delisted`), and `createReplayStream` is that
  something. Expect **three compile errors at two sites**, measured in 3.2.1 by
  doing it and reverting: `PROVIDER_SERVES` (whose doc comment already argues
  the answer — `not-the-live-market`) and `createMarketDataProvider`'s
  exhaustive switch, where the specified return is **`undefined`**, because
  `replay` resolves to no **historical** provider exactly as `none` does
  (ADR 0030 §3).
- **A migration widening `bar_coverage_provider_check`**, for the same
  set-equality coupling `0008` documents. **This is the moment the window opens**
  — widening `PROVIDER_IDS` widens `schema.ts`'s insert types, so the compiler
  stops preventing a replayed write as the database starts permitting the value.
  3.2.8 closes it; say so in the migration.
- **`MARKET_FEEDS` already holds `replay` and its words are already written**
  (3.2.1, ADR 0030 §3's sentence verbatim). Stamp the feed; do not re-decide the
  words.
- **`NON_LIVE_MARKET_DATA=permitted` already gates this.** Spelling `replay` in
  `PROVIDER_SERVES` as `not-the-live-market` makes `config.ts` refuse to start
  any deployment selecting it without that key granted by name — which is ADR
  0030 §7's fourth mechanism, **already built**. Verify it fires rather than
  assuming it; that verification is cheap and is the difference between a
  mechanism and a belief.
- **The `pnpm break` entry** proving the open-market guard goes red. `CLAUDE.md`:
  a break that does not go red is equally evidence the break did not land —
  verify the substitution.
- **Do not let a replayed bar near the database.** That guard is 3.2.8's and it
  is deliberately a separate task, because it protects a different boundary.

## Done when

- A third implementation exists over one shared engine
- The replay **refuses to start while the market is open and stops if the bell
  rings under it**, proven by a `pnpm break` entry rather than asserted
- Bars carry the wall clock and `occurredAt` keeps the recorded instant; a test
  proves **nothing is emitted ahead of the replay's own clock**
- `replay` is stamped as provider and feed
- `pnpm dev` outside a session shows real movement; `pnpm test` never touches
  the database
- `pnpm verify` passes

## Notes

**This is the task most likely to be remembered fondly and to cause the most
damage**, and the story says so in its own words: the risk it creates is that the
application gets built against the replay and the real socket quietly stops
working. Everything above is the answer, and every part of it is mechanical
rather than a good intention. **If a mechanism here is inconvenient, that is the
mechanism working.**

---

## What was found

### The union widening produced exactly the three errors 3.2.1 predicted

3.2.1 measured them by doing the widening and reverting it. **Three errors at
two sites, and both answers were already argued in the tree:**

| Site                       | Error               | The answer, and where it was already written                                                                                                                                                                                                  |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROVIDER_SERVES`          | `TS2741`            | `not-the-live-market` — **its own doc comment predicted this member and argued the answer before it existed**: _"`fixture` invents prices and a replay of stored bars would not, and both answer `not-the-live-market` for the same reason."_ |
| `createMarketDataProvider` | `TS2322` + `TS1360` | `undefined` — ADR 0030 §3: `replay` resolves to no **historical** provider, exactly as `none` does                                                                                                                                            |

**The `satisfies`-guard pattern fired for the third time in that switch's life**,
before a line of it had been edited.

### §7a-bis's refusal fired for `replay` with no code written for it — verified, not assumed

The task says to verify rather than assume, and the verification is the reason
it is worth reporting:

```text
replay, no permission      : REFUSED — MARKET_DATA_PROVIDER is replay, which does not serve the live market…
replay, permitted by name  : STARTED, provider=replay
alpaca (the deployed one)  : STARTED, provider=alpaca
```

**One word in `PROVIDER_SERVES` bought the whole mechanism.** ADR 0030 §7's
fourth layer — _a second opt-in key production has never had_ — required nothing
from this epic; it required `replay` to be classified, and the classification is
total by construction.

**Made permanent rather than left as a one-off.** `config.test.ts` now has a test
**derived from `PROVIDER_SERVES`** rather than listing providers: every member
marked `not-the-live-market` must be refused. A provider added tomorrow is
covered the day it is added, with no test to remember to extend.

### One engine, one seam, and the temporal rule is the whole file

`replay-engine.ts` holds pacing, ordering and re-stamping **once**, behind a
`ReplayBarSource` seam — so the stored case (`replay-bar-source.ts`, over the
shipped `MarketBarsRepository.readBars`) and the generated case
(`createMemoryReplaySource`) are the same engine with different sources. **Every
test in this task runs with no database**, which is what `pnpm test` requires.

**The rule the engine exists to enforce:** a slice recorded later than the replay
clock has reached is **not emitted** — it is held and offered again later.
`PRODUCT_SPEC.md` §22 is emphatic that temporal isolation belongs in the data
layer rather than in an instruction, and **this is the first place in the product
where that constraint is real rather than anticipated.** Epic 13 builds the full
version; the shape it takes here is the shape it takes there.

### Two instants, and the one that does NOT move is the interesting one

- **`bar.startsAt` is re-stamped onto the wall clock.** A chart drawing _now_ has
  to plot it _now_.
- **The state machine is told the RECORDED instant.** §11.2 keys staleness on the
  observation's own timestamp, **and that rule does not bend because the source
  is a recording.** A replay whose staleness keyed on the presented instant would
  report a perfectly fresh feed while replaying a recording from last month —
  which is exactly the kind of quiet lie ADR 0030 exists to prevent.

Neither instant is fabricated: one is when it happened, the other is when we are
showing it. **What would be fabricated is a single instant claiming to be both.**

### The guard is checked on every pump, not only at start

A replay that refuses to start but keeps running once the bell rings is **the
same defect wearing a different hat** — the developer is still building against a
recording during a session. Both directions are tested, and
`pnpm break replay-refuses-during-a-session` proves the guard goes red.

**It needs a break more than most.** It is developer-side: nothing about a
deployed environment would ever exercise it, so a version that silently stopped
working would go unnoticed until somebody spent a session building against a
recording.

### The refusal throws, against this repository's usual grain

`PROVIDER.md` §8.5's line is that a result says what happened to a request and a
throw says the program is wrong. **A replay starting during a session _is_ the
program being wrong** — it is the developer who left `MARKET_DATA_PROVIDER=replay`
in their `.env`. A value here would be something a caller could ignore, and the
entire purpose is that it cannot be.

### Two small things the linter was right about, and one it was not

- A dead `if` wrapping only a comment, and a declared `exhausted` log event
  **nothing emitted** — a promise the code did not keep. Both removed; there is
  now a comment saying why no exhaustion signal exists, since a source with
  nothing left and a source whose next minute has not come round are
  indistinguishable from the engine, and inventing a distinction the seam cannot
  support is how a caller learns to trust one that is not there.
- **`if (running)` after the `await` was flagged as always-truthy and is not
  redundant**: `unsubscribe()` can land _during_ `await engine.due()`, and a
  timer scheduled after that would keep a stopped replay pumping for ever. Read
  through a function so the narrowing does not hide it — the indirection keeps
  the guard rather than being a lint escape.

### What was deliberately not built

- **The `recordSeries` refusal is 3.2.8's**, and migration `0009` says so in its
  own comment: widening `PROVIDER_IDS` widens `schema.ts`'s insert types, so
  **the compiler stops preventing a replayed write at the same moment the check
  starts permitting the value.** That window is open from `0009` until 3.2.8
  closes it. Deliberate: the alternative is a vocabulary the application knows
  and the database refuses, which fails a required check and buys nothing.
- **`status` is not filtered.** A replay shows what we _stored_, and a security
  delisted since was trading on the day being replayed. `readBars` does not
  filter, which is correct — the note exists so nobody adds one.
- **A recording never revises.** `u` is a property of the vendor's _live_ feed
  (§7.8); replaying one would be replaying a behaviour we did not record.

### The word that does not appear

**"Guaranteed."** ADR 0030 is explicit that none of the five mechanisms is a
compiler, and §7a-bis — the strongest — is still configuration. What changed is
that a single wrong value, or any omission, now stops the process.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the seventh
building block — and the one that needed the most care, because it is the one
that could do real damage.

**What this task built:** the ability to **replay a real past trading day** —
taking the actual minute-by-minute prices we already have stored, and playing
them back at real speed as though they were happening now.

**Why we need this.** The US market is open six and a half hours a day, and our
working day mostly is not. The next piece of design work is deciding **how a
changing price should look and move** on screen — and that cannot be designed
against made-up numbers, because invented prices do not move the way real ones
do. Real prices jump, pause, drift and gap in ways a random generator does not
reproduce.

**And why it is the most dangerous thing in this story.** The obvious risk is
that someone sees replayed prices and believes they are watching the market. The
subtler one — and the one our design document was written to answer — is that
**the team starts building against the convenient replay and the real connection
quietly stops working**, with nobody noticing until a customer does.

**So there are five separate mechanisms, and I want to be honest that none of
them is absolute:**

1. The system **refuses to start** if configured to serve anything other than
   the real market, unless someone explicitly grants a second permission by name.
   Production has never granted it.
2. The deployment process **reads** the live configuration and refuses to roll
   out if it is anything but the real feed.
3. A check after every deployment fails if production is ever replaying.
4. A scheduled check catches a setting changed by hand between deployments.
5. **The replay physically refuses to run while the market is open** — and stops
   itself if the market opens while it is running.

**A genuinely pleasing discovery: the first of those already existed.** We had
expected to build it. It turned out that simply _classifying_ the replay as "not
the live market" — one word, in a list we already keep — was enough, because the
refusal is written against that classification rather than against a list of
names. I checked it rather than assuming, and it refused exactly as it should.
I then turned that one-off check into a permanent test that covers **any** future
non-live data source automatically.

**The decision I most want to explain is about time.** A replayed price carries
**two** timestamps, and keeping both is the difference between honest and
misleading:

- **When it actually happened** — a real minute in September, never altered.
- **When we are showing it to you** — now, so a chart can plot it.

Neither is invented. What _would_ be invented is a single timestamp claiming to
be both. And critically, when the system asks itself _"is this price getting
stale?"_ it uses the **real** timestamp, not the display one. A replay that
checked the display time would cheerfully report a perfectly healthy feed while
playing back a recording from last month — precisely the quiet lie this whole
design exists to prevent.

**One more constraint worth naming**, because it is the first appearance of
something that becomes central later: the replay **never shows you a price from
later than the point the replay has reached**. That sounds obvious. It is the
foundation of a headline feature planned for much later — replaying a past day
and asking "what could anyone actually have known at 11:07?" — and getting it
wrong means information from the future leaking into an analysis of the past.
Building it into the data layer now, rather than hoping to remember later, is the
entire reason it is a rule rather than an intention.

**We also deliberately left one hole open, and wrote down where.** Adding the
replay to the list of data sources means the database now _accepts_ a replayed
price being saved. Nothing writes one — but the protection that will stop it is
the next task's, and the gap is recorded in the migration itself rather than
discovered later.

**How this unlocks progress.** A developer can now run the product at any hour
and watch **real** prices move. That is what the design work on motion needs.
**The next task closes the hole above and adds the health endpoint that lets a
deployment check itself.**

**What a user can see today: nothing new.** The deployed site still connects only
to the real market — and, counter-intuitively, **more** than it would have
without this work, because the replay never runs there and the live connection is
therefore the only thing that ever serves.
