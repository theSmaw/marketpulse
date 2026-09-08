# Task 2.7.8 — What this vendor knows about a symbol's lifecycle: `delisted`, and whether a rename gets an identity

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.7

## Objective

Answer the story's open decisions 4 and 5 — both handed here by Story 2.3, both with named
owners rather than left open — and ship whatever the answers require.

**The one thing this task must not do is leave either unanswered.** Story 2.3 deferred them
_here_ by naming the producer, and that is how a deferral with an owner becomes a deferral with
none.

## What the user can see when this lands

**Possibly a second visible change in this story, and possibly nothing.** It depends on the
first decision:

- If `delisted` is adopted, `/securities` renders it, because Task 2.4.4 already built the
  treatment: an untracked row keeps its place, its sector band and its alphabetical position,
  and carries a chip in receding ink with **no red**, because `UNIVERSE.md` §3 makes this
  information rather than a fault. A second status is a second chip and no new design decision.
- If it is declined, **nothing visible changes**, and the deliverable is a written answer with
  an owner plus — if the reporting shape is chosen — a command an operator runs.

Say which in the write-up. A task whose visible outcome depends on a decision should state both
branches before taking it, so that "nothing changed" is legible as a decision rather than as
work that did not happen.

## Decision 4 — `delisted`

`SECURITY_STATUSES` ships with `active` and `untracked` because those are the two Story 2.3
could **produce**, following the rule `API_ERROR_CODES` has now been held to four times. This is
the first thing in the product with any opinion about whether a symbol is still listed —
Alpaca's **assets** endpoint, which is a _different endpoint_ from the bars endpoint this story
is otherwise about, so adopting it is a real scope choice rather than a free consequence.

The three shapes, and the story's own file says the middle one is probably right:

> **The endpoint was read incidentally by Task 2.7.1 (2026-09-07), and it changes the cost
> arithmetic below.** `GET /v2/assets?status=active&asset_class=us_equity` answers **`200` with
> every active US equity in ONE request** — 12,881 of them, of which 12,881 matched a plain
> ticker pattern. It is **not** a per-symbol lookup, so _"a second request per symbol against a
> metered plan"_ — the stated cost of the first shape below — **is wrong by four orders of
> magnitude**. One request covers the entire universe, and Task 2.7.1 separately measured that
> the rate limit is **per request rather than per symbol**, so it costs ~~1 of 201 per window~~
> **nothing at all against the bars budget — amended 2026-09-07 by Task 2.7.7.**
>
> That task settled `ALPACA.md` §6's open per-key-or-per-endpoint question while driving the
> limit, and the answer is **per API**: with the data bucket drained to `429`, a second _data_
> path was refused in the same window while `paper-api`'s `/v2/assets/NVDA` answered **`200` at
> `x-ratelimit-remaining: 199`**. **The assets endpoint lives on the trading API and therefore
> has a budget of its own**, untouched by anything this story does. Task 2.7.7 also hit it on
> the real key incidentally, so it is confirmed reachable with this credential.
>
> **Read that as removing an objection rather than as an argument for adoption**, which is the
> trap this bullet is now four deep in. This task's own text says the second-writer problem is
> the stronger argument and that cost should not decide it; a fourth consecutive cost finding
> on the adoption side is exactly how a decision gets taken on the wrong axis. The price is now
> known to be **zero**, and the question is still whether `status` should have two writers.
>
> **And a THIRD argument arrived 2026-09-07 from Task 2.7.6, from outside this task's own
> subject.** That task confirmed by measurement that **`unknown-symbol` is not producible from
> the bars endpoint**: a ticker that does not exist answers `200` with
> `{"bars":{},"next_page_token":null}`, byte-identical to a real symbol with no prints in the
> window, and `PROVIDER.md` §8.2 makes the second a success. So a member of `BarsResult` that
> Story 2.14 renders as an _answer_ rather than as a failure can never arrive. **The assets
> endpoint is the only thing in this vendor's API with an opinion about whether a symbol
> exists**, so adopting it here is also what would make that member producible.
>
> Weigh it honestly rather than as a free win: populating a union member is explicitly **not** a
> reason to spend a request (`PROVIDER.md` §8.7's own line, and this task's second shape says so
> too). It is a third argument on the same side of an endpoint that is nearly free and is being
> considered anyway — not an argument for adopting it on its own.
>
> That materially strengthens the case for adopting the endpoint at all. It does **not** settle
> decision 4, because the second-writer problem below is untouched by cost and is the stronger
> argument — but the decision should now be taken on that argument rather than on a price that
> turned out not to exist. The stable per-asset identifier decision 5 needs is on the same
> response.

- **Transition during ingestion.** Call the assets endpoint as part of fetching and move a
  symbol to `delisted` when the vendor says it is no longer active. Automatic and always
  current, at the cost of ~~a second request per symbol against a metered plan~~ **one cheap
  request covering the whole universe** (see above), and of a writer that changes rows as a side
  effect of reading market data.
- **A reporting check.** Call it once, name the symbols worth looking at, **change no row**.
  This is Task 2.1.7's shape for exactly this kind of question, and its argument transfers: the
  endpoint says _whether_, a person decides _what to do_, and a curated universe already has a
  human editing step (`UNIVERSE.md` §12.8) that this feeds into.
- **Decline it here**, and hand it to Story 2.8's ingestion, which is the first thing that will
  actually notice bars stopping.

**Take the answer on evidence**: a symbol whose bars stop arriving and a symbol Alpaca reports
inactive are two different signals, and only one of them costs a request. Check whether any
symbol in the current 101 is even affected — if none is, that is an argument for the cheap shape
rather than for the thorough one, and `UNIVERSE.md`'s own standing preference is that **an
honest deferral with a named owner beats a mechanism built against no instance**.

### If it is adopted, two things follow that are easy to miss

**The migration is a shape proved twice**: drop the check constraint, add the member to
`SECURITY_STATUSES`, add the check back. `0003_security_vocabulary.sql` is the precedent, and
Task 2.2.5's database suite already compares `SECURITY_STATUSES` against the constraint Postgres
rewrote, so the two cannot silently disagree.

**And `status` acquires a second writer, which is a real interaction rather than a detail.**
`load-universe.ts` writes `status` from the file on **every deploy** — that is how Task 2.3.6's
untrack-and-re-add works, and it is why a re-added symbol comes back on its original id. A
`delisted` transition written by anything else is therefore **overwritten by the next deploy**,
silently, because the file says `active` and the loader's `is distinct from` comparison sees a
row that changed. So adopting `delisted` means deciding who owns that column:

- the loader stops writing `status` for rows it did not insert, which changes Task 2.3.6's
  behaviour and needs its own argument; or
- `delisted` is expressed in the **file** rather than in the database, which keeps one writer
  and makes the check a reporting one after all; or
- the loader learns that `delisted` outranks `active`, which is a precedence rule nothing
  checks and that somebody will later "simplify"

**This is the strongest argument for the reporting shape** and it should be stated as such
rather than discovered halfway through a migration. `UNIVERSE.md` §12.2's seven-reader table
gains a row either way.

## Decision 5 — whether a ticker rename gets an identity

`UNIVERSE.md` §12.6 produced the gap against a real database rather than reasoning about it:
renaming a symbol in the curated file gives **two rows, two ids and nothing joining them** — the
old row correctly `untracked` with all its history, the new one empty. `FB` → `META` is the case
the surrogate key exists for and `0002_securities.sql` names it.

Four candidates:

- **`previous_symbol` on `securities`** — cheapest, handles one rename, and is a list-of-one
  masquerading as a column the second time a security is renamed.
- **A rename map** in the curated file, which is where the knowledge actually lives, since a
  file that cannot express _"these are the same company"_ is the whole cause.
- **`company_id` above `securities`** — the correct general answer and a table nobody has
  planned, in an epic whose §30 table list does not contain one.
- **Accept that a rename orphans the old bars, and write it down.** Legitimate, and it is what
  ships today.

**The evidence to take it on is cheap**: the assets endpoint carries a **stable per-asset
identifier** that survives a symbol change, so if that endpoint is adopted for decision 4 at
all, recording it is the cheapest identity available and makes a rename **detectable** rather
than merely representable. If the endpoint is not adopted, that argument evaporates and the
fourth answer gets much stronger.

Whichever is chosen: **the decision is cheapest before Story 2.8 backfills**, and it stops being
cheap the moment bars hang off those ids. That is the deadline, and it is the reason this task
exists in this story rather than in Epic 13.

## What "answered" means

An answer is: the shape, the alternatives with why each lost, the owner if it is deferred, and
the trigger that would reverse it. Recorded in `UNIVERSE.md` — §3 for the status vocabulary and
§12.6 for the rename, which are where the gaps were opened — and reflected in this story's own
file so a reader of Story 2.7 alone is not left thinking it was forgotten.

## Work

- Read the assets endpoint against the real key: what it carries, what an **inactive** symbol
  looks like (Task 2.7.1 read only `status=active`, so the inactive shape is still unknown), and
  whether the identifier is genuinely stable. **Its cost is already measured** — one request for
  all 12,881 active US equities, and **free against the bars budget** — the trading API meters
  separately (Task 2.7.7, `ALPACA.md` §6b)

  **One thing not to assume: an assets client gets no retry for free.** `withRetry` is typed to
  `MarketDataProvider`, so it wraps bar fetching and nothing else. If this endpoint is called
  from a scheduled or deployed path rather than by a person, decide whether it needs its own
  resilience; if it is a reporting command somebody runs, a plain failure is the right answer
  and saying so is the decision

- Check whether any of the current 101 is inactive or renamed, because that decides whether
  either mechanism has an instance to be tested against
- Take decision 4, with the second-writer interaction argued rather than discovered
- Take decision 5, with the deadline stated
- Ship whatever they require — a migration and a chip, a reporting command, or a paragraph
- Update `UNIVERSE.md` §3, §12.2 and §12.6, and this story's open-decision list

## Done when

- Both decisions are recorded with alternatives, owner and trigger
- Anything adopted is exercised end to end against the real database — including, if `delisted`
  ships, a run of `pnpm universe` afterwards proving the loader does not undo it
- `/securities` renders the new status correctly if there is one, at three viewports, with the
  axe baseline unmoved
- `pnpm verify`, `pnpm test:database` and `pnpm e2e` are all green

## Notes

Two failure modes to avoid, and they pull in opposite directions.

The first is **building the general answer**: a `company_id` table, a rename map and a
transition mechanism, against a universe containing no renamed and no delisted security. That
is a mechanism nobody can test, which `UNIVERSE.md` already declined once for exactly this
reason.

The second is **deferring both again**, which is more likely and worse, because Story 2.3
deferred them here deliberately and named this story as the producer. A third deferral with no
new argument is how a decision becomes nobody's — and the reason it cannot simply be pushed to
Story 2.8 is that Story 2.8 is the thing that makes it expensive.
