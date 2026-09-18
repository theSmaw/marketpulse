# Task 3.2.8 — `GET /diagnostics/feed`, the store's refusal, and the checks a green `verify` cannot make

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.7

## Objective

The runtime half of "what must not rot": a diagnostics route, a store that
refuses a replayed bar, and the deployed check that can fail after a merge.

## What the user can see when this lands

**Nothing on a screen.** `GET /diagnostics/feed` is the first thing in this story
an operator can actually observe — a route, not an interface — and it is what
Story 3.3 reads from.

## What is already decided and must not be re-taken

- **`verify` has no credentials by design**, so **a runtime claim needs a
  runtime check.** Pointing `verify` at a live store would fork the definition of
  "verified".
- **A deployed check runs after a merge, so it gates nothing** — its output is a
  **rollback decision**. That is not a weakness to apologise for; it is why the
  axe rule is asymmetric too.
- **`recordSeries` must throw on provenance naming `replay`, and it must be a
  RUNTIME guard** — because widening `PROVIDER_IDS` widened `schema.ts`'s insert
  types, so **the compiler stopped preventing the write at the same moment the
  database check started permitting the value.** 3.2.1 is what created that
  window; this closes it.
- **`check-deployed.mjs` fails when the market is open and the deployed feed is
  not a connected `iex`, and at ANY hour if the deployed feed is `replay` at
  all.**
- **Every check owes a break** — `scripts/breaks.mjs` is the registry, and a
  check that has never failed has never been tested.

## Work

- **`GET /diagnostics/feed`**, beside the shipped `/diagnostics/freshness`.
  Declare `500: apiErrorSchema` and use the `satisfies Record<keyof T, …>` idiom
  — **copy it for every new route**, because a field on the interface and not in
  the schema otherwise vanishes silently on the wire.
  - It reports the connection state, the feed identity and the instant of the
    last observation. **Note these are different questions** (§11.2): _our socket
    is fine and the market feed behind it is dead_ must be expressible.
  - **It must not leak the credential, the endpoint or a thrown message.** A 5xx
    never carries the thrown message, and a message written for a developer is
    internal detail too.
- **`recordSeries` refuses replay provenance**, with a `pnpm break` entry.
- **Extend `check-deployed.mjs`** with both conditions above, and **verify the
  deploy's provider read** described in ADR 0030 §7a — it **reads** the
  configured provider and refuses to roll on the wrong one, and it **never sets**
  it, because `deploy.yml` deliberately does not restate the app's environment.
- **The scheduled probe** that bounds how long a wrong state can last — §7's two
  detect-and-bound mechanisms are only meaningful together, since `deploy.yml`
  has no `schedule:` and **nothing looks at production between merges**.
- **Add every new claim to `docs/GAPS.md`** with a `Re-measure:` line, or make it
  mechanical. `CLAUDE.md`'s rule: an entry that can be made mechanical should be.

## Done when

- `GET /diagnostics/feed` exists, declares its error schema, and leaks nothing —
  proven by a test walking the route table
- `recordSeries` throws on replay provenance, with a passing `pnpm break`
- `check-deployed.mjs` fails on both conditions, and each is break-verified
- The scheduled probe exists and its cadence is written down with its reason
- Every new claim is either a `verify` step or a `GAPS.md` entry with a
  re-measure
- `pnpm verify` passes, still with no network and no database

## Notes

**The honest framing of this task, which the story insists on**: none of these is
a compiler. One prevents, two detect and bound, one raises the number of
independent mistakes needed from one to two. **The word "guaranteed" must not
appear in this story's record** — and a task that quietly writes it is the first
sign the layering has been misunderstood.
