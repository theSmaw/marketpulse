# Task 2.7.2 — Put the Alpaca key through the configuration boundary and onto the platform, fetching nothing

**Status:** Complete (2026-09-07)
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
  non-retryable by `PROVIDER.md` §8.1. ~~Task 2.7.5 produces it.~~ **Task 2.7.6 produces it** —
  corrected 2026-09-07 on closing this task: 2.7.5 is pagination and coverage, and the error
  taxonomy against a real vendor is 2.7.6, which names a bad key as its first deliberate cause.
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
   gets committed in this entire story.

   **Evidence from 2.7.1 (2026-09-07), which narrows this rather than removing it:** its 22
   captures were written by a harness that swept each one for the credential's bytes and
   **refused to write on a match**, and all 22 came back clean — so **no Alpaca error body
   observed so far echoes the credential**, including the `401` a bad key produces, which is an
   nginx HTML page carrying nothing of ours. Those captures lived **outside the repository** and
   never entered the tree. The risk is unchanged for Task 2.7.3's fixtures, which are the ones
   that _do_ get committed; reuse the same refuse-on-match sweep rather than a manual check.

   **Also delete the scratchpad credential file** Task 2.7.1 used, once this task has given the
   key its real home. It is outside the tree and `chmod 600`, but it is a second copy of a live
   secret and this task is what makes it redundant

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

---

## What was actually done (2026-09-07)

Kept short and factual; the durable records are `HOSTING.md`'s "The Alpaca credential on the
platform", `CLAUDE.md`'s Story 2.7 paragraph, and the dated amendment on ADR 0011 §10.

- **Two variables**, `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY`, in `CONFIG_VARIABLES`
  and `apps/backend/.env.example`. **The first entries in that table that are optional with
  no default**, which needed one comment corrected: the interface said "no default" implied
  "required", and those two came apart here.
- **`Config` gained `alpaca?: AlpacaConfig`**, spread in conditionally and frozen separately,
  so the object holds a whole credential or has no key at all. The half-set case is
  unrepresentable because `loadConfig` refuses it.
- **Three cross-variable rules**, all through the existing accumulator: a key id with no
  secret, a secret with no key id, and `MARKET_DATA_PROVIDER=alpaca` with neither. Ten new
  tests, and **five deliberate breaks in `config.ts`, each seen to fail and reverted** with
  the file byte-identical afterwards.
- **`pnpm env:check` gained a fifth failure mode**: a variable with no default must be
  documented **blank**. This is a leak guard rather than tidiness — the default comparison
  is structurally inapplicable to a no-default variable, so before it a real key pasted into
  the tracked example would have passed. Made to fail, along with its four existing ways.
- **The platform**: `az containerapp secret set alpaca-api-secret-key`, plus
  `ALPACA_API_KEY_ID` as a plain `value` and `ALPACA_API_SECRET_KEY` as a `secretRef`.
  Revision `0000113`, `RunningAtMaxScale`, `/health` 200, `/market-data` still
  `{"feed":null}`. The `secrets` array is **non-`null` for the first time**.
- **Key Vault costed and declined**, with the reversal trigger named. See `HOSTING.md`.
- **The five-producer leak check is clean**, with a non-vacuity control on the Log Analytics
  half. The scratchpad credential file is deleted; its harness survives and holds zero
  credential bytes.
- **The four startup cases were produced against the built server**, not reasoned about: no
  key (starts, serves), provider selected with no key (exit 1, both variables named, no
  value), half a credential (exit 1), real credential present (starts, does nothing, and the
  eight log lines it wrote contain neither needle).

### Two things worth carrying that the brief did not anticipate

**1. `alpaca` is deliberately still not a valid `MARKET_DATA_PROVIDER` value, so the check
that matters had to read the raw environment.** `PROVIDER_IDS` ships `fixture` alone and
gains its second member in Task 2.7.3, with the client that can produce it — the rule that a
union member arrives with its producer, held four times. Adding it here to make a
configuration check convenient would have broken that rule, broken
`createMarketDataProvider`'s deliberate exhaustive-switch compile error, and put a vendor
name in `packages/shared` a task before anything vendor-shaped existed. So the check reads
`env.MARKET_DATA_PROVIDER` raw, which is the `DATABASE_PASSWORD` check's own idiom for its
own reason: **only the raw value says what an operator asked for.** The cost is stated
rather than hidden — today that configuration reports two problems, and the first
disappears on its own in 2.7.3 with no edit here.

**2. The most valuable leak result was one nobody planned.** Putting the real credential in
`apps/backend/.env` exercised the root `.dockerignore`'s `.env` entry against a live secret
for the first time. `.env` is _gitignored_, which is not the same as being outside a build
context — a context is assembled from the working tree — so that one line is the only thing
between a developer's credential and the builder stage. The image contains **no `.env` at
all** and zero credential bytes.

### What is deliberately still open, with its owner

- **The convention-block test-count sweep.** `pnpm test` moved 619 → **629**; the ten
  duplicated blocks in Epic 1's story files are swept at a **story close**, which is Task
  2.7.9's, per the precedent Task 2.6.8 set. Recorded here so it is inherited rather than
  rediscovered.
- **A key that is present but wrong** is not checked anywhere yet, by decision. Task 2.7.6
  produces `unauthorised` against the live API.
- **Rotation** is an `az` command that leaves no record here. That is the accepted cost of
  the Container App secret over Key Vault and it is written down in `HOSTING.md` rather than
  discovered later.

---

## In plain language — what this task did for the product, and why

**Short version: MarketPulse now has a key to the front door of its market-data supplier,
and we have proved that key is not lying around anywhere it should not be. Nothing on any
screen changed, and that is the intended outcome.**

### The situation before this task

Everything MarketPulse eventually does — the anomaly scores, the charts, the AI
investigations — starts with real prices, and real prices come from a supplier called
Alpaca. Alpaca gives you two strings of characters that together prove you are you: an
identifier and a password, effectively. Last task we obtained them and used them once, from
a throwaway script, to answer some questions about what the free plan can actually do.

They were sitting in a temporary file on a laptop. That is fine for an afternoon and is not
a place to keep a credential.

### What this task did

It gave the key a permanent, correct home, and it did **not** build anything that uses the
key yet. That separation is on purpose, and it is the one decision worth explaining to a
non-engineer, because it looks like unnecessary ceremony and is not.

A credential's failure mode is not a bug — it is a **leak**. A bug announces itself when
something stops working. A leaked key announces nothing at all; you find out months later,
from somebody else. So the work of handling a credential is the work of _looking_ — checking
every place a copy could have been left — and that is a different activity from writing a
feature. Mixed into the same task as "make the thing fetch prices", the looking is what gets
skipped when the fetching starts working.

Concretely, three things now exist:

**A documented slot.** The application has a formal list of every setting it reads, and a
check that runs on every build making sure that list and the documentation for it agree. The
Alpaca credential is now on that list. Somebody joining the project can read one file and
see that this credential exists, what it is for, and that it is optional.

**A safe on the hosting platform.** The live deployment now stores the secret in Microsoft
Azure's own secret store, which the application is granted permission to read. It is the
first time in this project's history that anything secret has been stored anywhere — until
today, the deployed system genuinely held no credentials at all, and we had recorded that
fact four separate times. That claim has now formally expired, and we amended the original
document to say so with the date, rather than quietly editing history.

**Proof that it has not escaped.** We searched six places for the key's exact characters:
the source code, the compiled backend, the shipped container, the website the public
downloads, the server's logs, and the automated build logs. Zero hits everywhere. One of
those searches carried a control — we confirmed the log search was looking at 2,158 real log
entries, because a search that finds nothing because it is looking at nothing is worthless
and looks identical to a clean result.

### Three decisions a stakeholder might reasonably question

**"Why two settings instead of one?"** Because exactly one of the two halves is actually
secret. The identifier is sent openly on every request and is printed on Alpaca's own
website; the other half is the real password. Keeping them separate is what lets us say
"never show this one, and freely show that one" — which matters practically: when something
goes wrong at 3am, being able to see _which_ key is configured, without exposing the
password, is the difference between a five-minute fix and an hour.

**"What happens if somebody deploys this and forgets the key?"** The application refuses to
start, loudly, naming exactly which settings are missing and never printing their values.
That was a genuine open question and we chose the strict answer for one reason: asking for
Alpaca is a deliberate act, so a deployment that asked for it and cannot do it has told us
something is wrong, and starting anyway would mean a system that looks healthy and silently
serves nothing.

**"So do you check that the key actually works when it starts?"** No, deliberately, and this
is the decision most likely to look like a gap. Checking would mean calling Alpaca every
single time the server starts. Alpaca counts our requests, and the hosting platform
automatically restarts anything that takes too long to start — so if Alpaca were slow or
down, our own service would enter an endless restart loop over a supplier problem that has
nothing to do with whether our system is healthy. A wrong key will announce itself the first
time we actually ask for a price, which is soon and is the right moment.

### What a user can do now that they could not before

Nothing. Genuinely nothing — and the task was designed so that this is verifiable rather
than merely claimed: we confirmed the live site behaves identically before and after,
including the status strip still honestly reporting that no market feed is configured.

### Where this sits on the road to something visible

The nine tasks in this story go: measure the supplier's real limits (done), give the key a
home (**this task**), fetch and translate one page of real prices, **put the true feed name
on screen** — that is the first visible one, and it is fourth of nine rather than last,
deliberately, so the story demonstrates something before it ends — then handle pagination,
errors, retries, and the details of a symbol's lifecycle.

After that, Story 2.8 stores prices, Story 2.9 serves them, and **Story 2.12 draws the first
chart**. This task is a small, unglamorous, load-bearing step: it is the one that means the
next task can simply ask for prices without also having to invent, and get right, how a
secret is handled.
