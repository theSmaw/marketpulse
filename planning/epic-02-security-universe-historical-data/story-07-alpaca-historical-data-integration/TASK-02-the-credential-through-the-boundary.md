# Task 2.7.2 — Put the Alpaca key through the configuration boundary and onto the platform, fetching nothing

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.1

## Objective

Give the key a home: in `CONFIG_VARIABLES` and `apps/backend/.env.example` so `pnpm env:check`
covers it, and on the platform through Story 2.1's identity. Settle the story's open decision 3
— what a missing or invalid key does at startup — and prove nothing leaked.

**Nothing fetches anything.** No client, no request, no vendor code. This is Task 2.1.3's shape
(the connection settings landed one task before the pool that used them) and it is kept apart
for Task 2.1.3's reason: the configuration boundary has its own failure modes, its own tests
and its own cross-variable checks, and folding it into the client is how a credential ends up
being read in three places.

## This is the first bearer secret this system has ever held, and a recorded claim expires here

`EPIC.md` predicted this arrives in Story 2.1 and **Task 2.1.8 corrected it to this story**.
Read that correction before starting, because the half that does not transfer is the important
half:

- **What transfers is the identity.** The container app has a system-assigned managed identity
  that already authenticates to Postgres, and it is the thing that will read this secret.
- **What does not transfer is the mechanism.** The database credential needed no storage at
  all — Task 2.1.1 chose Entra-only authentication, so a token is minted per connection and
  nothing is kept. An Alpaca key is a **bearer secret from a party with no Azure identity**.
  There is nothing to mint. It has to be stored somewhere.

So the Container App's `secrets` array — read back as `null` in Tasks 1.11.3, 2.1.6, 2.1.8 and
2.2.7, and **exercised by nothing in this repository** — gets its first use. That is this
story's largest unknown and `EPIC.md` names it as such rather than leaving 2.7 to discover it.

**ADR 0011's claim that nothing deployed holds a credential stops being true when this lands.**
Do not quietly falsify it: record the expiry as a dated amendment beside the claim, which is
the treatment Task 2.5.6 established — an ADR's decision is never rewritten, but a present-tense
description of the tree that has become false gets a dated note.

## What the user can see when this lands

**Nothing.** The deployed backend is unchanged in behaviour: `MARKET_DATA_PROVIDER` is still
`none`, `GET /market-data` still answers `{"feed":null}`, and the chrome still reads
`MARKET FEED / NOT CONFIGURED`. Task 2.7.4 is what changes that, and it changes it by setting
one platform variable rather than by shipping a pixel.

What a **developer** can see is that `pnpm env:check` reports two more backend variables, and
that starting the backend with `MARKET_DATA_PROVIDER=alpaca` and no key refuses to start with a
message naming both variables and neither value.

## The two variables, and why two rather than one

Alpaca authenticates with a key **id** and a **secret**, sent as two headers. They are two
values, so they are two variables: `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY`.

Do not be tempted into one packed string. Task 2.1.3 took the same decision one dependency over
and the argument is the same — a packed credential has to be split by code somebody wrote,
which is a parser and a failure mode, and the halves then cannot be documented or defaulted
separately. It is also what makes the redaction rule below expressible: exactly one of these
two is a secret, and the message that names it must never name its value.

**Only the secret is secret.** The key id is an identifier — it travels in every request header
and is on Alpaca's own dashboard — and treating it as a credential means redacting something
whose visibility helps debugging. Say so explicitly in `.env.example`, because the reflex is to
redact both and the cost of that is an operator who cannot tell which of two keys is
configured.

## Open decision 3 — what a missing or invalid key does at startup

The story offers two answers and the honest one is **that the question has two halves with
different answers**, which is the finding rather than a compromise.

- **Absent, with `MARKET_DATA_PROVIDER=alpaca`** — a **startup refusal**, and it is a
  cross-variable check of exactly the shape Task 2.1.3 built for `DATABASE_AUTH` /
  `DATABASE_PASSWORD`. The reasoning: selecting a provider is a deliberate act, and a
  deployment that selected Alpaca and forgot the key has stated an intention the process cannot
  honour. §36's degrade-locally principle is about **failures at run time**, not about a
  configuration that was never coherent, and Story 1.12's `degraded` vocabulary is about a
  service that answered badly rather than one that was never configured.
- **Present but wrong** — **not a startup concern at all**, because the only way to find out is
  to make a request, and a startup probe against a metered API is a request nobody asked for. A
  wrong key surfaces as `unauthorised`, already a member of `BarsResult` and already marked
  non-retryable by `PROVIDER.md` §8.1. Task 2.7.5 produces it.
- **Absent, with `MARKET_DATA_PROVIDER` at its default `none`** — nothing happens, and that is
  the case a clean clone is in. The variables are **optional**, and a fresh checkout with no
  `.env` still runs, still passes `pnpm verify`, and still serves `pnpm dev`. Acceptance
  criterion 6 is this sentence.

The cross-variable check goes through `config.ts`'s existing accumulator, so a run with three
things wrong reports three lines rather than the first one — the property Task 2.1.3
established and measured.

## Where the secret lives on the platform

Two shapes, and `HOSTING.md` records the second as recommended-but-not-decided. Cost both and
take one, with the loser's reason written down:

- **A Container App secret**, set with `az containerapp secret set` and referenced from an
  environment variable by `secretRef`. Cheapest: one command, no new resource, no new role
  assignment, and it is the mechanism the `secrets` array exists for. The cost is that the
  value is held by the app and is only as good as the platform's own access control, and
  rotation is another `az` command that leaves no record here.
- **A Key Vault reference**, with the secret in a vault and the app's managed identity granted
  read. More moving parts — a vault, a role assignment, a second thing that can be
  misconfigured and that this repository cannot see — and it buys rotation without touching the
  app, an audit trail, and a boundary that survives somebody holding app-level access.

**Whichever is chosen, it joins the sixth kind of `pnpm verify` gap** — configuration that
exists only in the platform, which no file here holds and no check can read. That list is
already the largest instance in the project and this makes it larger; add the row rather than
letting it arrive silently. And note the standing hazard it inherits: `deploy.yml` uses `update`
and never `create`, so a secret set by hand persists across deploys and is invisible in every
diff.

## The leak check, on five producers

Task 2.1.6 established the procedure and this is its second use — with the difference that
**this time there really is a stored secret to leak**, where the database credential was a
token nothing kept. Run all five and report zero:

1. **The repository** — no key in source, in a fixture, in a test, in `planning/`, or in a
   recorded HTTP body. Task 2.7.1's captured responses are the risk: an error body can echo a
   request header, and a fixture recorded straight off the wire is the most plausible way a key
   gets committed in this entire story
2. **The built backend** — `apps/backend/dist`, and separately the **image**, remembering Task
   2.1.6's finding that `dist` contains compiled test files the `files` field keeps out of the
   image, so the two are different answers
3. **The frontend bundle and `storybook-static`** — which should be trivially zero, because the
   browser talks to the MarketPulse backend and never to Alpaca. Prove it anyway; the sentence
   in `apps/frontend/.env.example` exists precisely because somebody will one day try it
4. **Log Analytics**, for the key id, the secret, `APCA-` and `Authorization`
5. **Terminal echo and the CI run log** — Task 2.1.5 leaked a live token by passing it as a
   command argument, and Task 2.2.7 found GitHub echoing a step's script source with the value
   masked. Count both as places a credential lands

And the redaction rule, asserted rather than trusted: **no message this application can produce
names the secret's value**. Task 2.1.3's `DATABASE_PASSWORD` test is the model, including its
sharpest detail — the test uses a value that is deliberately not any real or fixture credential,
because a test written against a public fixture passes while leaking a real one.

## Work

- `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY` in `CONFIG_VARIABLES`, in
  `apps/backend/.env.example`, both optional, with the "only one of these is secret" note
- The cross-variable check, through the existing accumulator, made to fail
- The `Config` interface: the pair spread in conditionally under `exactOptionalPropertyTypes`,
  the idiom `config.ts`'s own comment names and that `DATABASE_PASSWORD` already uses
- The platform secret, by whichever mechanism won, with the decision and the loser recorded in
  `HOSTING.md` beside Story 2.1's credential section
- `pnpm env:check` made to fail all four of its ways with the new variables in play
- The five-producer leak check, clean, reported
- ADR 0011's dated amendment, and `EPIC.md`'s prediction confirmed rather than left standing
- The sixth-kind gap list gains its row in `CLAUDE.md`

## Done when

- A clean clone with no `.env` builds, tests, runs and passes `pnpm verify` — criterion 6
- `MARKET_DATA_PROVIDER=alpaca` with no key refuses to start naming both variables and neither
  value; with a key it starts and does nothing, because nothing fetches yet
- The secret is on the platform, read back, and the `secrets` array is non-`null` for the first
  time in this project's history — recorded as such
- All five leak producers return zero
- `pnpm verify` is exit 0 with no network access and no database

## Notes

The reason this is its own task rather than the first half of the client is that a credential's
failure mode is not a bug, it is a disclosure, and disclosures are found by looking rather than
by testing. Story 2.1 spent a whole task here and found four things worth keeping; this one has
the harder job, because that story's strongest result was that there was no secret to leak.

One thing to resist: a startup validation request to prove the key works. It converts a
configuration question into a metered API call on every replica start, it makes the process's
liveness depend on a third party, and on a platform whose startup probe kills a replica at
roughly ninety seconds it turns a vendor outage into a crash loop — which is precisely the
failure Task 2.1.4 designed the database probe to avoid, on the same platform, for the same
reason.
