# The tracked universe — MarketPulse

**Task:** 2.3.1 — Choose the vocabulary, the taxonomy and where the metadata comes from,
shipping nothing
**Date:** 2026-09-05
**Status:** decided; nothing installed, no migration written, no row loaded, tree
byte-identical

This is Story 2.3's one document about what a security **is** in this product and which
ones it tracks. It is to Story 2.3 what `DATA-LAYER.md` is to Story 2.2, `HOSTING.md` to
Story 1.11 and `BROWSER-TESTING.md` to Story 1.13. One document per subject; a second one
about the same subject is a copy waiting to disagree.

Tasks 2.3.4 and 2.3.6 write into this file as well — the count, the sector distribution
read against the rule, and the procedure for changing the list. It is the place the next
person changing the universe looks, which is why the procedure goes here and not into a
task file.

Every measurement below was **taken on this machine and reverted**, not cited.

---

## The decisions, in one paragraph

**The taxonomy is the eleven GICS-shaped sectors, chosen against the ETFs rather than
against familiarity**, because Epic 5 compares a security to _its sector ETF_ and a
taxonomy whose members do not map one-to-one onto the SPDR set produces a security with a
sector and no benchmark. **`SECURITY_KINDS` widens from two members to three** — `equity`,
`sector_etf`, `index_etf` — so the index-proxy / sector-proxy distinction is one column
with one source of truth rather than a nullable second column or an unwritten rule.
**`status` gets exactly two members, `active` and `untracked`**, because those are the two
this story can produce. **Sector and industry come from a curated file in this
repository**, and its cost — that it goes stale silently — is recorded as this
repository's third kind of gap rather than glossed. **Provenance is a source and a
retrieval timestamp per _field group_** rather than one column on the row, because the
fields genuinely have different sources. **The universe is a seed script and not a
migration**, per `apps/backend/migrations/README.md` §7. **It lives in a `.ts` module
under `apps/backend/src/`**, and the deciding evidence is measured rather than aesthetic:
a data file is invisible to `tsc`, and — the finding nobody predicted — it is also absent
from `dist/`, therefore from `pnpm deploy`, therefore from the container image.

---

## 1. The sector taxonomy, decided against the ETFs

**Eleven sectors, and each one has an ETF.** The mapping is the thing that makes this the
right taxonomy rather than merely a list, so it is written out beside it:

| Sector                 | Sector ETF | Note                                         |
| ---------------------- | ---------- | -------------------------------------------- |
| Technology             | `XLK`      | The ceiling in §7 exists because of this one |
| Health Care            | `XLV`      |                                              |
| Financials             | `XLF`      |                                              |
| Consumer Discretionary | `XLY`      | AMZN and TSLA live here, not in Technology   |
| Communication Services | `XLC`      | GOOGL and META live here, not in Technology  |
| Industrials            | `XLI`      |                                              |
| Consumer Staples       | `XLP`      |                                              |
| Energy                 | `XLE`      |                                              |
| Utilities              | `XLU`      |                                              |
| Real Estate            | `XLRE`     |                                              |
| Materials              | `XLB`      |                                              |

Every member of the first column has a member of the second, which is acceptance
criterion 3's second half satisfied by the taxonomy's own construction rather than by data
entry. That is deliberate: the criterion can only be broken by adding a _twelfth_ sector,
and there is nowhere to add one without also naming its ETF.

**Why not GICS by name.** GICS is the vocabulary people recognise and it is proprietary —
S&P and MSCI license the classification and its constituent assignments. What is free is
the eleven-sector _shape_, which is what the sector SPDRs already imply and which the
industry has effectively standardised on. So these are GICS-shaped names used as ordinary
English sector names, with no GICS data, no GICS constituent list and no licence.

**Why not derive the taxonomy from something else.** Two alternatives were considered.
A coarser taxonomy (say five buckets) makes every sector large enough for a breadth number
but makes "relative to sector" nearly meaningless — a bucket containing both a utility and
a semiconductor is not a peer group. A finer one (GICS industry groups, 25 of them) has no
free ETF per member, so it fails the criterion this decision was taken on. **Industry is
still a column**, and it is where the fine grain lives; it just has no benchmark attached
and Epic 5 must not assume one.

**Two limitations to carry, stated rather than discovered later.**

- **The sector SPDRs hold S&P 500 constituents only.** So a tracked equity that is not in
  the S&P 500 has a sector, has a benchmark, and is _not a constituent of that benchmark_.
  That is fine for a relative-move comparison and wrong for anything that treats the ETF
  as the sector's complete membership. Epic 5 reads this paragraph.
- **The Technology / Communication Services / Consumer Discretionary boundary is
  genuinely arguable**, and it is the boundary the demo runs through. Whatever Task 2.3.4
  assigns, the assignment is a recorded claim with a provenance of `curated` (see §5), not
  a fact — which is exactly why provenance is per-field.

### Is the mapping domain vocabulary or data?

**Domain vocabulary, in `packages/shared`, as a `Record<Sector, string>`** — a
recommendation to Task 2.3.2 rather than a decision it may not revisit. Three reasons.
Epic 5's relative-move and Epic 4's sector rows both read it, so it is a fact both sides
depend on rather than a fact about our particular list. A `Record` keyed by the sector
union is **total by construction**, so a sector added without its ETF is a compile error —
which is acceptance criterion 3's second half expressed at compile time, where the loader's
version of it (Task 2.3.5) is a run-time check over the actual list. And it puts the
mapping in the same arrangement `SECURITY_KINDS` already has: the union in
`packages/shared`, the database as the backstop.

The argument against, which is real: it is a table of strings that changes when the ETF set
changes, and it will then be in two places — `packages/shared` and the universe file's own
rows for `XLK`, `XLV` and the rest. The mitigation is that the rows are _derivable_ from
the mapping (a `sector_etf` row's `sector` is the key it is the value of), so Task 2.3.4
should generate them from it rather than typing them twice, and Task 2.3.5's set-level
validation should compare the two.

---

## 2. Index proxy versus sector proxy: `SECURITY_KINDS` widens to three

**`kind` becomes `equity | sector_etf | index_etf`.**

`SPY`, `QQQ`, `DIA` and `IWM` are what "the market" means; the eleven SPDRs are what "the
sector" means; Epic 4 and Epic 5 need to tell them apart. This is one column, with one
source of truth in `packages/shared`, and no rule anybody has to remember.

Task 2.2.4 chose `text` + `check` over a Postgres `enum` specifically so that a widening
like this is writeable in one migration — inside a transaction, which is what a migration
is here, adding an enum value _and using it_ is refused with `unsafe use of new value
"etf" of enum type`. **This is the first time that argument pays**, and Task 2.3.3 should
say so when it writes `0003`.

**What widening costs, counted rather than assumed.** The literal `'etf'` appears in ten
places across the tree; grepped, **not one of them is a comparison**. Six are prose in
comments, two are in `dist/` (regenerated), and the two that are code are the `check`
constraint in `0002_securities.sql` and the `SECURITY_KINDS` array itself — both of which
Task 2.3.3 rewrites anyway. There is no reader to break, because `securities` holds zero
rows and nothing selects from it.

**"Is this an ETF" becomes a derived helper** over the const array rather than an equality
— `ETF_KINDS` or an `isEtf()` beside the union — which is a small cost and the only one.

Two alternatives, both rejected:

- **A second column** (`kind` stays `equity | etf`, plus `etf_role` nullable). It keeps
  the existing two-member vocabulary, and it costs a nullable column that must be non-null
  exactly when `kind = 'etf'`. The database can express that as a cross-column check;
  nothing in `packages/shared` can, so the type system would permit a state the database
  refuses at run time — which is the gap `SECURITY_KINDS` already has once and should not
  have twice.
- **Inferring it from whether `sector` is set.** No schema change at all, and it is the
  trap: it is a rule nobody wrote down, and it reads an _absence_ as a positive claim.
  Acceptance criterion 3 makes an unclassified equity fail the load, which closes the
  obvious hole — but a rule that is only correct because a different rule is enforced
  elsewhere is exactly the kind of coupling that breaks silently when one of the two moves.

**Consequence for `sector` on an ETF row.** A `sector_etf` row's `sector` is the sector it
proxies; an `index_etf` row's `sector` is `null`. So `sector` stays nullable and its
nullability now has two distinct meanings that the `kind` column disambiguates — which is
the shape that made widening `kind` the answer rather than inferring from `sector`.

---

## 3. The `status` vocabulary

**Two members: `active` and `untracked`.**

| Member      | Means                                                                | Producer          |
| ----------- | -------------------------------------------------------------------- | ----------------- |
| `active`    | In the universe file; we track it and we store bars against it       | Task 2.3.5 loader |
| `untracked` | Removed from the universe file. **The row stays and so do its bars** | Task 2.3.6        |

This is what replaces a soft delete, per `apps/backend/migrations/README.md` §5: nothing
is `deleted_at`-ed, because a delisted security's bars are still what happened and Epic 13
replays a date on which it was in the universe.

**`delisted` is deliberately not a member, and this is the decision most likely to be
questioned.** It is a genuinely different event from `untracked` — one is a fact about the
market and the other a fact about us, and conflating them is the thing that is cheap now
and a migration later. The reason it is absent is not that the distinction is unreal; it
is that **nothing in this story can produce it.** `API_ERROR_CODES` carries this
repository's own stated rule — a member is added when the thing it names can be produced —
and it has been applied twice already (`UNSUPPORTED_MEDIA_TYPE` was refused because no
request produces a 415; `SERVICE_UNAVAILABLE` was designed and left unadded until the
story that can return it). A member with no producer is a vocabulary entry that means
"this has never happened", which is indistinguishable in the data from "this cannot
happen".

> **ANSWERED 2026-09-07 by Task 2.7.8, and the answer is still two members — see §15.**
> The producer was named, the producer looked, and the finding is that this vendor
> **cannot produce the member honestly**: its `status` field means "we will not trade
> this", which is a fact about the vendor rather than about the market, and it disagrees
> with the tape 8% of the time. `delisted` therefore does not ship, the new owner is
> **Story 2.8's ingestion** — bars stopping is a better-correlated signal that costs no
> request — and what shipped instead is `pnpm universe:check`, which reports and changes
> no row. The paragraph below is kept as the reasoning that was correct when written.

**Its producer is named, so nobody has to rediscover it: Story 2.7**, which carries this
forward in its own Scope and as its fourth open decision rather than only being named here
— a deferral recorded in one document and not in the story that inherits it is a deferral
with no owner. Alpaca's assets
endpoint carries an asset status, and that is the first thing in this product with any
opinion about whether a symbol is still listed. Adding the member then is one migration of
a shape this repository has now proved twice — drop the check, add the member, add the
check — and Task 2.3.3's `0003` is the worked example.

**The third option, one collapsed `inactive` member, is rejected outright.** It is cheaper
than either of the above and it destroys the distinction permanently: a symbol we stopped
tracking is **reversible** and a delisted one is not, and Task 2.3.6 has to produce a
re-add that lands on the original `id`.

### What every later reader owes this column

`status` is an **invisible predicate** — a reader that forgets to filter on it shows
untracked securities. `migrations/README.md` §5's own argument is that one invisible
predicate is a design and two is a bug waiting for whoever forgets, and this is the one.
Task 2.3.6 owns naming the readers; the rule this task fixes is that **`status` is
displayed rather than filtered away wherever a human is looking at a security**, because
"we stopped tracking this on 2026-11-04" is information, and silently vanishing rows is
the failure `deleted_at` would have caused.

---

## 4. Provenance: a source and a retrieval timestamp per field group

Acceptance criterion 6 says the metadata's source is recorded **per field** in a way Story
2.14 can display, and invariant 6 says provenance is displayed rather than implied. The
fields do not share a source:

| Field group    | Fields                       | Source                                                                    | Written by |
| -------------- | ---------------------------- | ------------------------------------------------------------------------- | ---------- |
| Profile        | `symbol`, `name`, `exchange` | the curated file today; plausibly Alpaca's assets endpoint from Story 2.7 | Task 2.3.5 |
| Classification | `sector`, `industry`         | the curated file (§5)                                                     | Task 2.3.5 |
| Identity       | `cik`                        | Epic 9                                                                    | Epic 9     |
| Ours           | `kind`, `status`             | this repository — a judgement, not a retrieval                            | Task 2.3.5 |

So **a single `source` column on the row is already known to be wrong**, and the question
is how much less wrong the alternatives are.

**The shape: two columns per group, `<group>_source` and `<group>_retrieved_at`.** Task
2.3.3 adds `profile_source` / `profile_retrieved_at` and `classification_source` /
`classification_retrieved_at`. `cik`'s pair is **deliberately not added now** — Epic 9 is
what populates `cik`, and a column that is null for every row in every environment until
Epic 9 is a column that cannot be checked against anything. `kind` and `status` get no
pair at all, because "we decided this" is not a retrieval and a `retrieved_at` on it would
be a timestamp pretending to be evidence.

What Story 2.14 reads, so it does not have to reverse-engineer it: for any field on
screen, the group it belongs to, that group's `source` string, and that group's
`retrieved_at`. The mapping from field to group is the table above, and it belongs in
`packages/shared` beside `Security` so the renderer and the loader agree.

**The `observed_at` question, answered explicitly rather than by omission** — which Task
2.3.3's brief asks for and Task 2.2.4 set the precedent for. `retrieved_at` is a
_retrieval_ timestamp and is exactly what invariant 5's evidence pair asks for. There is
still **no `observed_at`**, because a security's sector is not a fact about the market at
an instant; there is no moment at which "AAPL is in Technology" became true in the way a
price became true. `market_bars` in Story 2.8 remains the first table that exercises the
pair, and adding a defaulted `observed_at` here to make the convention look tested would
be precisely the leak the convention forbids.

**Two alternatives, rejected:**

- **One `jsonb` provenance object.** New sources need no migration, which is its whole
  appeal. The compiler holds nothing about it, `information_schema` can confirm only that
  it is `jsonb`, and Story 2.14 would have to reverse-engineer its shape — which that
  story's brief says explicitly it must not have to. It also puts an unvalidated
  open-ended object on the row, which is the same shape `ApiError.details` was
  deliberately made `readonly string[]` to avoid.
- **A separate `security_field_provenance` table.** Fully general, one row per (security,
  field), and it would give this schema its first foreign key — which would exercise the
  `<table_singularised>_id` naming rule Task 2.2.4 recorded as untested. It is rejected on
  proportion: a join, plus four or five rows per security, to carry two facts that are the
  same for every row the loader writes in a single run. **The naming rule therefore stays
  untested**, and Task 2.3.3 owes saying so, because Story 2.8 then inherits it.

**Cost, stated:** a genuinely new field group means a migration. Given there are four
groups and three of them are already named, that is a cost paid roughly once per epic that
introduces a new metadata source.

---

## 5. Where sector and industry come from: a curated file in this repository

> **Amended 2026-09-08 by Task 2.8.2 — the decision is narrowed and the trigger below has
> fired.** The universe is now the S&P 500 (503 equities), and the classification comes from
> that index's own published GICS assignment, read at **curation** time and checked into this
> same file. The objection this section raises against ETF-derived sectors — that the SPDRs
> hold index constituents only — is dissolved rather than worked around, because the universe
> _is_ the index. Everything below is the record of the decision as taken at ~100 rows and is
> correct in its own terms; §16 is what supersedes it, including this section's own reversal
> trigger and what replaced it.

**Alpaca's assets endpoint carries neither.** That is the fact that makes this a decision
rather than a default, and it is the one people assume is free.

**The choice is a curated file, checked into this repository, reviewed in a diff.** At
~100 rows it is a page of data. It costs no dependency, no second credential, no second
failure mode in the loader, and no licence question — which the third-party options all
raise, and which the taxonomy decision in §1 has already had to navigate once.

**The two alternatives:**

- **A third-party metadata source with its own licence and key.** It is the answer at 500
  securities and it is not the answer at 100. It adds a credential to a deployment that
  currently holds **none** (Story 2.1 ended with the app's `secrets` array `null`, read
  back twice), a network call to a loader that currently has one job, and a second failure
  mode — a load that fails because a metadata provider is down, for data that changes a
  handful of times a year.
- **Deriving sector membership from ETF holdings.** Genuinely appealing, because it makes
  §1's mapping self-consistent by construction: a security is in Technology because `XLK`
  holds it. It fails on two counts. Holdings files are themselves a provider dependency
  with a licence, and — decisively — **the SPDRs hold S&P 500 constituents only**, so
  every tracked equity outside the index would derive to _no sector at all_, which
  acceptance criterion 3 turns into a failed load.

### The cost: it goes stale silently, and that is a gap of this repository's third kind

This is the honest half and it is recorded as a gap rather than glossed. **Nothing checks
that the curated file still describes reality.** It is not a file no tool reads — a `.ts`
module is typechecked, linted and formatted (§6) — it is the _other_ kind: a file every
tool reads, carrying a claim that has quietly stopped being true. The same class as
`apps/frontend`'s `types` array, which stated an invariant it had stopped enforcing for
two stories, and as the local/deployed Postgres version pin.

**What "stale" actually looks like, so a later story knows what it would have to detect:**

| Drift                      | Example                                          | Symptom here                                                                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A ticker change            | `FB` → `META`                                    | The old symbol stops matching anything at the provider; Story 2.7's bar requests return nothing for it, and the row is a company that no longer exists under that name. This is the case the surrogate key exists for, and Task 2.3.6 owns whether it is handled or named as a gap |
| A sector reclassification  | A name moves Technology → Communication Services | Nothing fails. Epic 5 compares it against the wrong benchmark and Epic 4 counts it in the wrong breadth number, indefinitely, and correctly-looking                                                                                                                                |
| A delisting or acquisition | A tracked name is acquired                       | Bars stop arriving. §3's `status` has no member for it yet and Story 2.7 is its producer                                                                                                                                                                                           |

The middle row is the dangerous one, because it is the only one with **no symptom at all**.

**The reversal trigger** — the condition, not a story number, in the shape `report-error.ts`
already uses: **a sector reclassification is found in the data after having been wrong for
a while, or the universe passes ~250 securities.** At 100 rows a person can re-read the
file; at 250 nobody will. On that day the answer is a metadata provider and the licence
question that comes with it, and the mitigation until then is that
`classification_retrieved_at` (§4) makes the file's age _visible on screen_ through Story
2.14 rather than only in git history — which is a weaker guarantee than a check and a
stronger one than nothing.

---

## 6. The universe is a seed script, in a `.ts` module, under `apps/backend/src/`

### Seed script, not a migration

`apps/backend/migrations/README.md` §7 already answers this in the general case and names
Story 2.3 as the story that chooses. The answer is **not a migration**, and it was re-taken
here rather than cited for one reason: acceptance criterion 2's word **idempotent**.

- For a migration, "idempotent" means _does nothing the second time_. A migration does
  that trivially and uselessly.
- For this universe it has to mean _converges on the file_ — an edited sector, a corrected
  name and an added symbol are all picked up on the next run.

Those are different programs and only one of them is useful. And since Task 2.2.7 a
migration edited after it has been applied is **refused outright**, so a wrong sector
committed inside a migration could not be corrected in that file at all — only by a second
migration correcting the first, forever, in an append-only history.

§7's stated exception was checked and does not apply: it exempts a lookup table whose rows
the _schema_ depends on, where a row's absence would leave the schema invalid rather than
merely empty. No constraint references a `securities` row.

### The format: a `.ts` module, on measurements taken here

Four candidate formats, `prettier --file-info` for each — the one-liner that has been the
deciding evidence three times in this repository:

| Candidate       | `inferredParser` | ESLint                | `tsc`   |
| --------------- | ---------------- | --------------------- | ------- |
| `universe.ts`   | `"typescript"`   | 168 rules, type-aware | **yes** |
| `universe.json` | `"json"`         | `File ignored…`       | no      |
| `universe.yaml` | `"yaml"`         | `File ignored…`       | no      |
| `universe.csv`  | **`null`**       | `File ignored…`       | no      |

So a `.csv` universe carries the exact signature `apps/backend/migrations/*.sql`, the
`Dockerfile` and `scripts/dev.sh` carry: **read by nothing**. Confirmed end to end rather
than inferred — with a probe `.json` and a probe `.csv` in `apps/backend/src/`, root
`pnpm format:check` reported the JSON and **silently skipped the CSV entirely**, exiting 1
for a formatting complaint about a file whose _contents_ it has no opinion about either.

**Two further measurements decided it, and the second one nobody predicted.**

**A `.json` cannot be imported without friction.** `resolveJsonModule` is unset anywhere in
this workspace, and under `module: nodenext` a probe import produced two errors at once:

```
error TS1543: Importing a JSON file into an ECMAScript module requires a
              'type: "json"' import attribute when 'module' is set to 'NodeNext'.
error TS6307: File '…/probe-universe.json' is not listed within the file list of
              project '…/apps/backend/tsconfig.json'.
```

**And a data file does not reach the container image.** `tsc -b` was run with a probe
`.json` and a probe `.csv` sitting in `apps/backend/src/`, and **neither appears in
`apps/backend/dist/`**. `apps/backend/package.json` declares `files: ["dist",
"!dist/**/*.test.*"]`, so what `pnpm deploy` copies — and therefore what the runtime image
contains — is `dist/` and nothing else. A data-file universe would be present on a laptop,
present in git, and **absent from production**, discovered by Task 2.3.7. That is exactly
the position `apps/backend/migrations/` is in and which CLAUDE.md already records as
handed forward; a `.ts` module compiles into `dist/` and is carried for free.

**So the file is `apps/backend/src/universe.ts`**, beside `schema.ts`, and Task 2.3.4's
rows typecheck against `Security`: a row missing a sector, or carrying a sector that is not
in the taxonomy, is a **compile error** rather than a load-time failure. That is the whole
reason this format wins, and it is what lets Task 2.3.5's loader concentrate on the rules
a type cannot express — the cross-row ones.

**Not `packages/shared`.** Only the backend loads the universe, and that package is
consumed as built output by the frontend, so ~100 rows of data would land in the
frontend's type graph and its bundle's dependency graph for no reader. The _vocabulary_
goes there (§1, §2, §3); the _rows_ do not. Story 2.11's search reads them from the API.

**The cost of `.ts`, stated:** it is less obviously data, and somebody will eventually want
to generate it from a spreadsheet. That is fine — the generator writes the module.

---

## 7. The selection rule

> **Superseded 2026-09-08 by Task 2.8.2 (§16.5), and rules 1, 6 and 7 survive.** Membership
> is now an index rather than an allocation, so the floor of 6, the ceiling of 12 and the
> market-cap-spread rule no longer decide anything — though all three are still _met_, which
> is a stronger result than meeting a rule written to be met. Rule 4's IEX liquidity
> constraint lapses for stored bars (§16.6) and survives for Epic 3's live feed. Read on for
> what the rules were for; §16.5 is the table of where each one stands.

Written before the list, because a list written first gives a rule reverse-engineered from
it, which is how "not 40% technology" becomes something asserted rather than met.

**The shape:**

```
 11 sector SPDRs    XLK XLV XLF XLY XLC XLI XLP XLE XLU XLRE XLB
  4 index proxies   SPY QQQ DIA IWM
~85 equities        >= 6 and <= 12 per sector
────────────────────────────────────────────────
~100 securities
```

**The rules, each expressed as something checkable:**

1. **Every one of the eleven sectors is present**, and has its ETF. Total by construction
   (§1), and the loader re-checks it against the actual list (Task 2.3.5).
2. **A floor of 6 equities per sector.** 6 × 11 = 66. Below that a breadth percentage is
   arithmetic over so few names that "67% of the sector is negative" means four securities,
   and §11's breadth reading looks broken rather than informative. Epic 5's relative-move
   is likewise only interesting where a sector has peers to be relative to.
3. **A ceiling of 12 equities per sector.** 12 of ~85 is **14.1%**, so the "not 40%
   technology" criterion is met with margin rather than approached. This is the rule a
   naive "top 100 by market cap" list fails, and it is the reason the list is allocated by
   sector before it is ranked by anything.
4. **Liquidity means liquid _on IEX_.** Invariant 6 and §7.1: Alpaca's free tier is IEX,
   not consolidated SIP, so a name that is liquid on the consolidated tape and thin on IEX
   gives an anomaly score computed over noise. This is the rule that pulls in the opposite
   direction from rule 3, and it is why the ~19 discretionary slots (85 − 66) exist.
5. **Market-cap spread within a sector**, not only mega-caps: a sector of ten mega-caps
   moves as one thing and its breadth number is always ~100% or ~0%.
6. **Every symbol PRODUCT_SPEC.md names by hand is present**, or its absence is argued.
   Counted out of the spec rather than recalled: **NVDA** (18 occurrences, §38's flagship
   demo), **SPY** (6), **AMD** (3, §17's toolset example and §20's comparison chart),
   **AVGO** (2), **TSLA** (1, §9's mock screen), **QQQ**, **DIA**, **IWM** (1 each, §6).
7. **A deep semiconductor group.** §38's demo concludes "semiconductor weakness is broad"
   and §11's breadth example is "82% of semiconductor securities currently negative" —
   both of which are **industry**-level claims, not sector-level. So `industry` needs at
   least one group with enough constituents for that sentence to be true of something, and
   semiconductors is the one the demo names. This rule constrains `industry`, which has no
   ETF and therefore no benchmark; it is a coverage rule, not a comparison rule.

**How Task 2.3.4 checks it:** by printing a count per sector _from the file itself_ and
reading it against rules 2, 3 and 7 — acceptance criterion 4 says **inspected**, and the
difference between inspected and asserted is that table. If the list fails its own rule,
change the list; if the rule was wrong, change **this document** and say why. A rule
quietly relaxed to fit a list is the failure this split exists to prevent.

---

## 8. Expanding to 500 without redesign

§6 asks for this to be demonstrated by argument and by absence, never by loading 500. Task
2.3.6 owes the walk; this task owes the list of places a hard-coded 100 could hide and
which of them exist today:

| Place                    | Exists today?                   | What would make expansion cost something                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The universe file        | no — Task 2.3.4                 | An `EXPECTED_COUNT`, or an array length asserted anywhere                                                                                                                                                                                                                                                                                                                              |
| The loader               | no — Task 2.3.5                 | A batch size or a single multi-row `insert` built as one statement. ~~Postgres's 65,535 bind-parameter ceiling is reachable at 500 rows × 13 columns~~ — **wrong by an order of magnitude, corrected in Task 2.3.8**: 500 × 13 is 6,500, and the loader writes **12** columns, so the ceiling arrives at **5,461** rows. The loader chunks anyway (§11), so 500 is still one statement |
| The schema               | **yes** — `0002_securities.sql` | Nothing. `bigint` identity, no partitioning, no size assumption                                                                                                                                                                                                                                                                                                                        |
| The validation           | no — Task 2.3.5                 | An O(n²) cross-row check; trivial at 100, still trivial at 500                                                                                                                                                                                                                                                                                                                         |
| An API default page size | no — Story 2.9                  | A limit sized to "the whole universe fits in one response"                                                                                                                                                                                                                                                                                                                             |
| A frontend list          | no — Story 2.10/2.11            | Rendering all of them without virtualisation                                                                                                                                                                                                                                                                                                                                           |
| The bar ingestion        | no — Story 2.8                  | Alpaca's per-request symbol limit and rate limits, which Story 2.7 measures                                                                                                                                                                                                                                                                                                            |
| Storage                  | **yes** — measured              | Story 2.1 measured **~22.5 GiB usable** and estimated **~1.18 GB/year** of minute bars at 100 securities. Linear in security count: ~5.9 GB/year at 500, so **~4 years** of headroom against the current disk before the read-only threshold, against **~20** at 100                                                                                                                   |

Of the eight, exactly two exist today and neither constrains the count. **The storage row
is the one with a real number in it**, and it is the one Task 2.3.6 should hand forward
rather than have Story 2.8 rediscover: expansion to 500 is free everywhere except the
disk, where it costs a factor of five against a figure Story 2.1 already took.

**Task 2.3.6 re-took this walk rather than citing it — see §12.5.** Four of the eight rows
now exist and none of them constrains the count; the table above is the prediction and
§12.5 is the reading.

---

## 9. The list, and the distribution read against §7 (Task 2.3.4, 2026-09-05)

> **This is a historical record of the 101-security list, correct as at 2026-09-05 and left
> standing.** The shipped file is 518 securities since Task 2.8.2; §16.4 carries the current
> distribution. Do not read the table below as describing the tree.

**Written by Task 2.3.4, into this document rather than into a task file**, because §7's
rule and the list that satisfies it disagreeing is the failure the split exists to catch,
and a reader who has to open two files to notice will not notice.

The list is `apps/backend/src/universe.ts`. **101 securities: 86 equities, the 11 sector
proxies and the 4 index proxies.**

### The distribution, printed from the file rather than asserted

Acceptance criterion 4 says the distribution is **inspected**, and the difference between
inspected and asserted is this table. It was produced by importing the compiled module and
counting — the throwaway script is not kept, because Task 2.3.5's loader is where a
standing check belongs and a second one here would be the copy that disagrees.

| Sector                 | ETF    | Equities | % of equities |
| ---------------------- | ------ | -------: | ------------: |
| Technology             | `XLK`  |       12 |         14.0% |
| Health Care            | `XLV`  |        9 |         10.5% |
| Financials             | `XLF`  |        9 |         10.5% |
| Consumer Discretionary | `XLY`  |        9 |         10.5% |
| Industrials            | `XLI`  |        8 |          9.3% |
| Communication Services | `XLC`  |        7 |          8.1% |
| Consumer Staples       | `XLP`  |        7 |          8.1% |
| Energy                 | `XLE`  |        7 |          8.1% |
| Utilities              | `XLU`  |        6 |          7.0% |
| Real Estate            | `XLRE` |        6 |          7.0% |
| Materials              | `XLB`  |        6 |          7.0% |

**Read against §7's rules, one at a time, rather than summarised as "it passes":**

1. **Every sector present, with its ETF.** Eleven of eleven, and the eleven `sector_etf`
   rows are generated from `SECTOR_ETFS` rather than typed, so this one cannot fail by
   data entry. Confirmed against the actual symbols in the list, not against the mapping.
2. **Floor of 6.** Met exactly — utilities, real estate and materials sit **on** the line
   rather than above it. See "where the rule bit" below; that is a decision, not a
   shortfall.
3. **Ceiling of 12.** Met exactly — technology sits **on** the line. The largest sector is
   **14.0%** of the equities against the criterion's 40%, so the criterion is met with
   margin rather than approached.
4. **Liquid on IEX.** Every name is a large, heavily traded US listing. This is the rule
   that is **not checkable from the file** and is the one most likely to be wrong: it is a
   claim about IEX activity taken on judgement, and Story 2.7 is the first thing that can
   measure it. Recorded as a claim rather than presented as verified.
5. **Market-cap spread within a sector.** Present by construction in the blocks where it
   matters: TSLA sits beside GM and F, NVDA beside INTC and MU, GOOGL and META beside T
   and VZ. A sector of ten mega-caps has a breadth number that is always ~0% or ~100%.
6. **Every symbol PRODUCT_SPEC.md names by hand.** All eight present — **NVDA**, **SPY**,
   **AMD**, **AVGO**, **TSLA**, **QQQ**, **DIA**, **IWM** — checked by lookup against the
   compiled list rather than by reading. Nothing is absent, so nothing needs arguing.
7. **A deep semiconductor group.** **8 constituents** on `Semiconductors`, which is the
   deepest industry in the file and the whole reason technology is at the ceiling. §38's
   "semiconductor weakness is broad" and §11's "82% of semiconductor securities currently
   negative" are **industry**-level claims, and a group of three makes both of them
   arithmetic over nothing.

Ten industries carry three or more constituents (`Semiconductors` 8, `Electric Utilities`
5, `Pharmaceuticals` 4, `Diversified Banks` 4, then six at 3), across **45 distinct
industries**. That spread is what stops the industry column being decorative: a
sector-level breadth number and an industry-level one can disagree, which is exactly the
distinction §11's worked example draws.

### Where the rule bit, stated rather than smoothed over

**Rules 3 and 4 pull against each other and rule 4 won twice.** Utilities, real estate and
materials are at the floor of 6 and not above it, because there are not many large,
IEX-liquid US names in them and padding a block with thin ones would give Epic 5 an
anomaly score computed over noise — which is worse than a small sector, because it is
wrong rather than merely coarse. §7 anticipated this tension and the ~19 discretionary
slots absorbed it in the other direction instead: they went to technology, health care,
financials and consumer discretionary, where liquidity is not the constraint.

**The rule was not relaxed and the list was not padded.** No number in §7 changed.

### The classification is a single source, which is what Task 2.3.5 needs to know

**Every row's profile and classification came from the same place: hand curation in this
repository, with no per-row exception.** No sector, industry, name or venue was taken from
a different source. So Task 2.3.5's loader may write **one** `classification_source` and
one `profile_source` string for the whole file and needs no per-row override — which is
the one negative fact this task owed §4's arrangement, and it holds.

`cik` is `null` on all 101 rows. Epic 9 populates it, and a guessed identifier is worse
than an absent one because Epic 9 will trust it.

**The technology / communication services / consumer discretionary boundary is where this
file is most arguable**, exactly as §1 warned: AMZN and TSLA are consumer discretionary,
GOOGL and META are communication services, and a reasonable person would put all four in
technology. That assignment is a recorded claim with a provenance of `curated`, not a
fact — which is why provenance is per field group and why it is worth having at all.

### What holds it, and what this task did not build

The compiler holds the row-level rules, and all four were **made to fail before being
believed**: a sector outside the taxonomy is `TS2345` naming the eleven members; an index
proxy carrying a sector is `TS2322`; a row that omits `industry` is `TS2741`, because
under `exactOptionalPropertyTypes` an omitted key is not a `null` one; and a twelfth
sector added to `SECTORS` is `TS2741` twice in `packages/shared` — once for `SECTOR_ETFS`
and once for `SECTOR_LABELS` — before it ever reaches this file. A malformed ticker is a
`TypeError: Not a valid US equity ticker: "NVDA CORP"` at module load, produced.

**Every cross-row rule is left to Task 2.3.5 and deliberately not half-expressed here** —
no duplicate-symbol check, no "every sector has its ETF" check, no count. Those are
statements about the whole list, which is the same shape Task 2.2.4 refused to encode as a
row-level `check`.

**Nothing was loaded.** `securities` holds **0 rows**, read back after the work.

### The count is recorded here and encoded nowhere

Per §8: there is no `EXPECTED_COUNT`, no asserted array length, no page size and no
constant anywhere that would have to change to reach 500. `UNIVERSE.length` is the only
way to learn the count, and ~~the only place the number 101 appears in the repository is
this document~~ — **true of shipped source and no longer true tree-wide** (Task 2.3.8): it
now appears in `CLAUDE.md`, `README.md` and several task files, all of them prose. §12.5's
narrower re-take — no `EXPECTED_COUNT`, no asserted length, no page size **in code** — is
the accurate form and is the one that matters. Task 2.3.6 owes the argument; this task owed the absence, and it is absent.

---

## 10. Is ~100 enough? — the sizing question, PARKED with a trigger (2026-09-05)

> **UN-PARKED and settled 2026-09-08 by Task 2.8.2 — the universe is the S&P 500, 518
> securities in total, and the taxonomy is coarsened to GICS industry groups.** The trigger
> fired in the bars-are-exempt direction (recorded at the foot of this section), and this
> section's own instruction — settle §5's metadata source before picking a number — turned
> out to be sharper than it reads: the two are **one** decision, because one number is what
> makes one source correct. §16 is the record. This section's evidence stands as written and
> its deadline ("after Story 2.8 it costs a re-backfill") is **met** rather than passed.

**Raised by the user after Task 2.3.4 shipped, and worth recording rather than answering
in a conversation that scrolls away.** The question: 100 securities does not sound like
enough to group meaningfully, see correlation, or reason about cause.

**The decision is to PARK the sizing and ship the 101, with a named trigger rather than a
vague intention to revisit.** What follows is the evidence on both sides, because the
trigger only makes sense against it.

### The concern is right, and here is the measured form of it

Printed from the shipped file, not estimated:

| Reading                                      | Value                    |
| -------------------------------------------- | ------------------------ |
| Distinct industries across 86 equities       | **45** (mean depth 1.91) |
| Industries with exactly one member           | **23 of 45 (51%)**       |
| Equities in an industry of depth < 4         | **65 of 86**             |
| Equities in an industry of depth ≥ 8         | **8 of 86**              |
| Sector breadth granularity (one name, in pp) | **8.3 – 16.7pp**         |

Three consequences that are defects rather than opinions:

1. **"Relative to its industry" is undefined for 23 of 86 equities**, because their
   industry has one member — themselves. Epic 5 reads this.
2. **PRODUCT_SPEC.md §11's own worked example is arithmetically unreachable.** "82% of
   semiconductor securities currently negative" cannot be produced by 8 constituents: the
   achievable values are 0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100%. **The smallest group
   that can produce 82% ± 0.5pp is 11.** Our deepest industry is 8.
3. **§27 names 500 nodes as the _initial_ visualisation target**, not the synthetic one.
   At 101 the live topology ships at a fifth of its specified size.

### One part of the concern that does not survive contact

**Correlation quality is not a function of security count.** It is bounded by observations
per pair, and minute bars over sixty sessions give ~23,000 per security, which is ample.
Going wider makes it _worse_, not better: 86 equities is 3,655 pairs and 500 would be
124,750, so at any fixed threshold the spurious-edge count scales with the pair count.
§10's "retain only the strongest N relationships per node" is what bounds that, and it
works identically at either size. **And causation is not a universe-size problem at all** —
it is an evidence problem owned by Epic 9's filings and the `CONFIRMED`/`SUPPORTED`/
`POSSIBLE`/`UNKNOWN` ladder. Ten times the securities buys none of it.

So the fix is **group depth**, not list length, and that has two levers rather than one.

### The free lever, which should happen whatever the size becomes

**The industry taxonomy is finer than GICS's own industry-group level (25 groups) on a
universe a fraction of the size GICS classifies.** Merging `Semiconductors` with
`Semiconductor Equipment`, the three REIT labels, the two oil-and-gas labels and so on
takes 45 labels to roughly 20 and **doubles every group's depth with no new data at all**.
That is not parked and does not depend on the trigger below; it is a taxonomy decision this
document already owns.

### What was found about the feed, and why the sizing is parked on it

The blocker was expected to be Alpaca's free-tier symbol cap. Read from documentation on
2026-09-05 — **not measured, and that distinction is the reason this is parked**:

- [Alpaca's pricing page](https://alpaca.markets/data) states the free plan as
  **"Limited to 30 symbols"**, flatly, alongside 200 API calls/min and the IEX feed.
- [Alpaca's own streaming guide](https://alpaca.markets/learn/streaming-market-data) is
  more precise: _"Users with Free Plan are allowed one concurrent connection and the
  subscription is limited to **30 channels at a time for trades and quotes**. However,
  **there is no limit to the number of channels with minute bars**."_
- The reference documentation states **neither**.

**If the bars exemption holds, the cap does not bind this product at all**, because §11's
four calculations — price percentile, volume ratio, relative move, breadth — are every one
of them bar-based, and nothing in the detection model consumes a trade or a quote. §7.1
lists trades among the initial data; §11 does not need them. **If the pricing page is
right instead, the cap binds at 30 and the current 101 is already over it**, which would be
a much larger problem than the sizing question.

Two readings of one sentence, two orders of magnitude apart, and a live account settles it
in minutes. **That is the trigger.**

### IEX coverage, which caps the useful size independently

[IEX reports](https://www.iex.io/article/etf-trading-trends) **3.8% of overall US equity
volume and 4.7% intraday as of Q2 2026** — higher than the 2–3% assumed in conversation,
and re-read rather than recalled. As a sampling argument, an IEX minute bar is reliably
populated down to roughly **1–2M shares/day consolidated**, which is about the **top
1,000–1,500 US equities**. Below that, minutes with zero trades become common, and three
things degrade together: the price series gains gaps, the volume ratio divides by a near-
zero median, and — worst — **breadth is polluted, because a security with no trades is
"unchanged" and is therefore neither advancing nor declining.** Adding thin names makes the
aggregate number _less_ trustworthy, not more.

One subtlety to carry: **a volume ratio survives the sample and an absolute volume does
not.** "4.1× typical" compares IEX against IEX and is sound; a displayed share count is
~3.8% of the truth and must be labelled, which invariant 6 already requires.

### The cost, since it is not the constraint

Storage re-read from the Azure Retail Prices API on 2026-09-05: **$0.115/GB/month**,
backup $0.095 — both reproducing Story 2.1's figures. The bar arithmetic validates against
Story 2.1's recorded 1.18 GB/year at 100 securities (390 minutes × 252 sessions × ~120
bytes × 100 = 1.18 GB), so the model is sound:

| Securities | Bars/yr | Disk/yr | Time to read-only on 22.5 GiB |
| ---------: | ------: | ------: | ----------------------------- |
|        101 |    9.9M |  1.2 GB | ~20 years                     |
|        500 |     49M |  5.9 GB | ~4 years                      |
|      1,000 |     98M | 11.8 GB | ~2 years                      |
|      5,000 |    491M |   59 GB | ~5 months                     |

**Even 5,000 securities with a year retained is about ~~$15~~ $12.40/month of disk** (re-derived in Task 2.3.8 from this document's own meters: 59 GB × $0.115 storage + 59 GB × $0.095 backup), and the write
load is ~10 KB/s, which the measured 120 IOPS handles comfortably _provided bars are
batched per minute rather than written per row_ (note 5,000 rows × **12** columns is 60,000, just inside
Postgres's 65,535 bind-parameter ceiling — the loader chunks at **5,461** rows regardless,
so this is a margin rather than a limit; the ~~13~~ 12 is Task 2.3.8's correction). The real
database cost is the tier: Story 2.1 measured that an **idle B1ms banks almost no CPU
credits**, so there is no reservoir for sustained ingestion.

**So money is not what decides this.** What decides it is curation.

### The constraint that actually binds at scale, and it is not the feed

**Sector and industry cannot be hand-curated for a thousand securities.** "~100 rows,
reviewable in a diff" is the stated justification for the curated file in §5, and it does
not survive 1,000 rows. So a universe materially larger than today's **reopens §5's
decision**, and the two free options are better than they looked when §5 declined a
fetcher:

- **The eleven sector SPDRs publish their holdings**, so ETF membership _is_ the sector
  classification for every S&P 500 constituent — the option §5 named and set aside.
- **SEC EDGAR gives every filer a free SIC code**, from an API Epic 9 already commits to.
  A different taxonomy, but mappable, and it costs no licence and no new vendor.

**This is now the harder limit than the feed**, and whoever un-parks the sizing should
settle §5 before picking a number, not after.

### The trigger, stated precisely

**Story 2.7 confirms, against a real key, whether minute-bar subscriptions are exempt from
the 30-channel cap.** Until then the universe stays at 101 and nothing is re-sized.

- **If bars are exempt** — reopen the sizing with ~500 as the starting proposal and
  ~1,500 as the architectural target, settle §5's metadata source first, and coarsen the
  taxonomy in the same change.
- **If the cap is 30 symbols across all channels** — this is not a sizing question any
  more, it is a blocker on Epic 3, and the universe must _shrink_ or the product must buy
  Alpaca's Algo Trader Plus at **$99/month**, which also removes the IEX quality ceiling.
- **Either way the taxonomy coarsening above is unaffected** and should not wait.

Nothing in the tree encodes the count, so un-parking costs one file edit for as long as no
bars have been stored against these rows. **After Story 2.8 it costs a re-backfill**, which
is the real deadline on this decision and is worth more than the trigger itself.

### THE TRIGGER FIRED — measured 2026-09-07 by Task 2.7.1, and the answer is "bars are exempt"

**Measured against a live free-plan account**, not read. The full record is
[`ALPACA.md`](../story-07-alpaca-historical-data-integration/ALPACA.md) §1; the short form:

- **Minute bars: no practical limit.** One subscription was accepted at **60**, then at
  **101**, **500**, **1,500** and **5,000** symbols — the last being `PRODUCT_SPEC.md` §27's
  _synthetic_ target, accepted on the free plan in 867 ms.
- **Trades: capped at 30**, refused at 60 with `code=405 symbol limit exceeded`.

**The trades refusal is the control and it is what makes this a measurement.** A server that
silently dropped the thirty-first subscription would look identical to one that accepted it,
so the acknowledgement's accepted list was **counted**. Bars accepted where trades were
refused, on one connection, seconds apart.

**So Alpaca's streaming guide is right and its pricing page is wrong.** The blocker branch
does not apply: 101 is nowhere near a cap, Epic 3 has no subscription problem, and the
$99/month Algo Trader Plus exit is not needed for capacity.

**Per this section's own instruction the sizing is NOT re-taken here**, because §5's metadata
source must be settled before a number is picked — that is Story 2.8's re-curation. What has
changed is that the sizing is **unblocked** rather than parked, and the taxonomy coarsening
above was never blocked at all.

### And the constraint this section names as binding has WEAKENED — for stored data only

§10 caps the useful universe on IEX's ~3.8% volume share, arguing that thin names gain gaps
and — worst — **pollute breadth**, because a security with no trades is neither advancing nor
declining. **That argument survives for LIVE data and largely does not for HISTORICAL data.**

Task 2.7.1 found the free plan is **asymmetric** (`ALPACA.md` §2): the **live stream is IEX
only** (`wss://…/v2/sip` is refused, `409 insufficient subscription`), while **historical bars
default to SIP** — the full consolidated tape, restricted only by recency, not by tape. The
same six thin equities over the same three sessions:

| Feed          | Coverage range |      Mean | Longest gap |
| ------------- | -------------- | --------: | ----------: |
| `iex`         | 43.1% – 99.7%  | **82.8%** |  **15 min** |
| default (SIP) | 98.5% – 100%   | **99.7%** |   **2 min** |

`CCI` reads **43.1%** on IEX and **98.5%** on SIP for the same session.

**So whoever un-parks the sizing should read `ALPACA.md` §2 first**, because this section's
quality argument and its ~1,000–1,500 estimate were both derived from IEX's share, and that is
now known to be the wrong tape for anything Story 2.8 stores. **It does not make the number
larger by itself** — §5's curation problem is untouched and is still the harder limit, exactly
as this section already concluded.

**One thing this hands to Task 2.7.4 rather than resolving**: if stored bars are SIP, then
`Market feed: IEX` is the wrong label for them, and invariant 6 requires the label to be
right. That is a product-truth question for a person, and `ALPACA.md` §2 states it.

---

## 11. The loader, and what `*_retrieved_at` means on a re-run (Task 2.3.5, 2026-09-05)

**Written here rather than only in a task file**, because it is a rule about
_this document's own §5 mitigation_ and about what somebody editing the list has
to remember to do.

### The decision: the file states the date, and the loader copies it

`0003` made `profile_retrieved_at` and `classification_retrieved_at` `not null`
with no default, so the loader has to supply a value. **The obvious value is
`now()` and it is wrong**, in a way that leaves no trace: it makes the column
mean _when the loader last ran_, which is always today, and §5 above names
`classification_retrieved_at` as the mitigation that "makes the file's age
visible on screen through Story 2.14 rather than only in git history". A
timestamp that resets on every deploy makes the age permanently invisible and
turns the mitigation into decoration — while looking, on screen, exactly like a
freshly-checked classification.

So the column means **when the data was last checked against its source**, and
for a curated list that is a value only the file can state. It is
`UNIVERSE_PROVENANCE` in `apps/backend/src/universe.ts`, two groups matching the
two `0003` gave columns to, each a `source` string and a `YYYY-MM-DD` `checkedOn`
that the loader parses as UTC midnight. The loader validates it — a malformed
date is a refused load rather than an `Invalid Date` reaching Postgres — and
otherwise copies it verbatim.

**The obligation this creates, and nothing enforces it:** move the date **when
you have actually re-checked the list against a source**, in the same commit as
whatever that check changed. Leaving it while the file drifts is exactly the
state Story 2.14 is meant to be able to show a user, so this is a gap of the
third kind by construction rather than by accident — the column is _designed_ to
be able to say "nobody has looked at this in a year", which it can only do if
nobody moves it dishonestly.

**`profile_retrieved_at` will diverge from `classification_retrieved_at` the day
Story 2.7 fills the profile fields from Alpaca**, which is a genuine retrieval
and where `now()` is the correct answer. Two columns rather than one is what
makes that expressible; today they carry the same date because the same person
typed both.

### What the loader does, in one paragraph

`pnpm universe` — a separate command and not a phase of `pnpm migrate`, per §6.
It validates the whole list as a **set** before opening a connection, reports
every violation rather than the first, and writes in one transaction, so a
refused universe leaves the table byte-for-byte as it was — produced three ways
(an unclassified equity, a sector with no ETF, a duplicate symbol), each at exit
1, with the table's fingerprint identical before and after all three. It upserts
on `symbol`, so re-running converges on the file rather than merely doing
nothing, and `updated_at` moves on a row that changed and **not** on one that did
not — which is a real behaviour with a real test, because Task 2.2.4 removed the
trigger and recorded that maintaining that column is the writer's obligation.

### One finding that corrects a premise this story was working from

Task 2.3.4 and Task 2.3.5's brief both recorded that a **duplicate symbol has no
backstop at all**, on the reasoning that an upsert is the one write shape a
unique index cannot refuse. Produced with the check disabled, that is **half
right, and the half that holds is the half you can see today**:

- **Both copies in the same `insert` statement** — Postgres refuses it outright,
  SQLSTATE `21000`, _"ON CONFLICT DO UPDATE command cannot affect row a second
  time"_. Exit 1, nothing written. **This is what happens at 101 securities**,
  because the loader puts 5,461 rows in one statement.
- **Copies in different statements** — completely silent. The load printed
  **`✓ 102 securities in the universe`** at **exit 0** while `securities` held
  **101 rows**, counting the second write as _unchanged_. Which copy survives
  depends on chunk ordering, which nobody controls and nothing reports.

So the database's protection here is **a property of the list being small**, and
it disappears past ~5,461 securities or the first time anybody changes the
batching — a performance edit nobody would review as a correctness one. The
check is worth having for that reason rather than the stated one, and §8's list
of places a hard-coded count could hide gains a row it did not have: the batch
size, which is derived from Postgres's bind-parameter ceiling and the column
count rather than chosen.

### The removal seam, left open on purpose

A symbol in the database and not in the file is **counted, reported and left
untouched**. Deleting it, changing its `status` and refusing the load are the
three answers; they are not interchangeable, and one of them destroys the bars
Story 2.8 will have stored against the row. ~~**Task 2.3.6 chooses.**~~ **Task 2.3.6 chose the status transition — §12.** Leaving the
row alone is the only option all three remain reachable from, which is why it is
what a loader written before that decision does.

---

## 12. Changing the list: what a removal means, and what 500 costs (Task 2.3.6, 2026-09-05)

**This is the section somebody changing the universe reads**, which is why it is here and
not in a task file — the same treatment `e2e/README.md` and `apps/backend/migrations/README.md`
got, and for the same stated reason.

Every figure below was taken against a real PostgreSQL 18.6 in a **scratch database**
(`marketpulse_scratch`, created, ruined and dropped), which is Task 2.2.6's pattern applied
for the same reason: this task's whole purpose is to leave a database in states nobody
wants to keep. **The development database was never pointed at** — confirmed afterwards, it
still holds 101 rows, all `active`, all with `updated_at` identical to `recorded_at`, so
nothing in this task touched it.

### 12.1 The decision: a removal is a status transition, and nothing is ever deleted

**A symbol removed from `universe.ts` has its row marked `status = 'untracked'`. The row
stays. Everything stored against it stays.** `apps/backend/src/load-universe.ts`'s
`untrackAbsent` is the whole of it.

The three answers were not interchangeable and the other two are refused in writing:

| Answer                | Why not                                                                                                                                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DELETE`              | Story 2.8 stores `market_bars` against `security_id`, so it either orphans that history or cascades and destroys it; Epic 13 replays a date on which the security **was** tracked, which a row that no longer exists cannot answer; and it is the only one of the three that cannot be undone |
| Refuse the load       | It turns the one edit this file exists to receive — deleting a line — into an error, and the workaround anybody would reach for is a hand-run `DELETE`, which is the row above with no record of it                                                                                           |
| **Status transition** | **Chosen.** `migrations/README.md` §5 already argued the shape: nothing is soft-deleted, there is no `deleted_at`, and what changes is a status that is _displayed_ rather than filtered away                                                                                                 |

**A removal is a fact about us and not about the market**, which is §3's argument for
keeping `untracked` and `delisted` apart, and it is why the reversible answer is the
correct one: we may put the symbol back next week, and the market cannot un-delist a
company.

### 12.2 The cost, stated rather than discovered: `status` is an invisible predicate

`migrations/README.md` §5's own argument is that **one invisible predicate is a design and
two is a bug waiting for whoever forgets**. This is the one, and it is the price of not
having a `deleted_at`. So the readers are named here rather than left for each of them to
decide alone:

| Reader                                        | Owner                   | Filters on `status`?                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bar ingestion — which symbols to subscribe to | Stories 2.7, 2.8        | **Yes — `active` only.** Paying a rate-limited feed for a symbol nobody tracks is the clearest case in the list                                                                                                                                                                                          |
| Market breadth, sector performance            | Epics 4, 5              | **Yes — `active` only.** "62% of the sector is negative" over securities we stopped following is a wrong number, not a coarse one                                                                                                                                                                        |
| Topology nodes and edges                      | Epic 6                  | **Yes — `active` only.** An untracked node has no live price to size or colour it by                                                                                                                                                                                                                     |
| Anomaly detection                             | Epic 5                  | **Yes — `active` only.** It runs over the tracked market by definition                                                                                                                                                                                                                                   |
| The universe list and search                  | Stories 2.4, 2.10, 2.11 | **No — show it, with its status.** §3's rule: "we stopped tracking this" is information, and silently vanishing rows is the failure `deleted_at` would have caused                                                                                                                                       |
| Security Explorer for one symbol              | Epic 7                  | **No.** A deep link to an untracked security shows its stored history and says it is untracked; a 404 would be a lie about data we hold                                                                                                                                                                  |
| **Replay**                                    | **Epic 13**             | **No, and this is the one that matters.** Replay asks what was knowable on a past date, and a security untracked _today_ was tracked _then_. A replay that filtered on today's `status` would silently rewrite history — invariant 4's failure arriving through a column rather than through a timestamp |

**The rule in one sentence, for anybody adding a reader that is not in this table:** filter
on `status` when you are computing over _the market we track now_, and never when you are
showing or replaying _something we stored_.

> **`pnpm universe:check` (Task 2.7.8) is deliberately NOT an eighth row**, and saying why
> is worth more than adding one. It reads the **curated file** and the vendor's catalogue,
> and never opens a database at all — so the question this table asks does not arise for
> it, and the file's rows are `active` by construction. That is the same property that
> makes "it changes no row" structural rather than disciplined. §15.7.
>
> The row this table would have gained is the one that **did not ship**: a writer
> transitioning `status` to `delisted` during ingestion. §15.3 produced why — the loader
> writes `status` from the file on every deploy and would silently revert it.

### 12.3 The three changes, produced against a real database

The subject sector is **health care**, chosen because §9's distribution sits on **both**
bounds at once — technology is at the ceiling of 12 and utilities, real estate and
materials are each at the floor of 6 — so an add to technology or a removal from utilities
would break §7's own selection rule in the same commit that demonstrated a change. Health
care, financials and consumer discretionary sit at 9 and have slack in both directions.

**Add — `BMY` (Bristol-Myers Squibb, Pharmaceuticals), health care 9 → 10.**

```text
  ✓ 102 securities in the universe
      1 inserted
      0 updated
      101 unchanged
```

One new row, `active`, with `sector` and `industry` as written. **Nothing else moved**:
`0` of the other 101 rows have an `updated_at` different from their `recorded_at`, and all
101 still share one identical `updated_at`. That is the property with no trigger behind it
and therefore the one most likely to be wrong.

One detail worth knowing before somebody reads it as a fault: the new row's `id` was
**138**, not 102, against a `max(id)` of 101 beforehand. An upsert consumes an identity
value **per row per run** whether or not anything changed (Task 2.3.5 measured the same
mechanism from the other side), so the value a new row lands on reflects its position in
the file within that run rather than any ordering in time. Ids are stable and explicitly
not contiguous.

**Remove — `GILD` deleted from the file, health care 10 → 9.**

```text
  ✓ 101 securities in the universe
      0 inserted
      0 updated
      101 unchanged

  ○ 1 in the database and not in the file, now marked untracked:
      GILD
```

`GILD` kept `id` 34, its name, its sector, its industry and its `recorded_at`; `status`
became `untracked` and `updated_at` moved. The table went to **102 rows** while the file
held 101 — which is the whole point: the row count and the universe count are different
numbers from the first removal onward. Nothing else was touched.

**Removed and then run again — the steady state.**

```text
  ○ 1 already untracked, unchanged: GILD
```

`updated_at` was **byte-identical** across that second run. This is deliberately a
different line from the one above: a removal is a one-off event and the row will be absent
from the file for the rest of the project, so a loader that rewrote it on every run would
move `updated_at` forever and make that column mean "when the loader last ran" — the same
failure the upsert's own `where` clause exists to prevent, arriving through a second door.
It is also why the loader stops shouting the paragraph: an output nobody reads is how the
_next_ removal goes unnoticed.

**Re-add — `GILD` put back.**

```text
      0 inserted
      1 updated
```

Back to `active`, on **`id` 34**, with `recorded_at` still the original insert — so the row
genuinely never left — and `updated_at` moved. **This needed no code at all**: `status` is
in the upsert's `is distinct from` list, so a file that says `active` over a row that says
`untracked` is a row that changed.

### 12.4 The `DELETE` alternative, produced — because otherwise the id check proves nothing

Under the chosen answer the re-add landing on the original `id` is **nearly vacuous**: the
row never left the table, so of course its key survived. Presenting that as evidence for
the surrogate key would be presenting a trivial pass as a demonstration. So the rejected
answer was produced by hand — `delete from securities where symbol = 'GILD'`, then re-run
the loader, which is exactly what a `DELETE`-based removal followed by a re-add would do:

|                                   | Chosen (`untracked`) | Rejected (`DELETE`)                 |
| --------------------------------- | -------------------- | ----------------------------------- |
| `id` after re-add                 | **34** — unchanged   | **541** — a new row                 |
| `recorded_at`                     | the original insert  | the re-insert                       |
| Anything referencing the old `id` | still correct        | orphaned, or destroyed by a cascade |

That is the contrast the check is worth having for, and it is why `market_bars.security_id`
(Story 2.8) can reference `securities.id` at all.

### 12.5 The walk for 500, re-taken rather than cited

§6 asks for expansion to 500 to be shown **by argument and by absence**, never by loading
500 — a synthetic 500-row load would prove the loader scales and nothing else. §8 predicted
where a hard-coded 100 could hide; this is the reading, four tasks later, with four of the
eight rows now built.

**The absence, by grep over shipped source** (`apps/backend/src/*.ts`,
`packages/shared/src/*.ts`, `apps/backend/migrations/*.sql`, `scripts/*.mjs`, comments and
tests excluded): the only occurrences of `100`, `101` or `500` are an HTTP status in
`errors.ts`, a millisecond rounding factor in `index.ts`, and the words "S&P 500" inside
`SPY`'s fund name. **There is no `EXPECTED_COUNT`, no asserted array length, no page size
and no limit anywhere.** `UNIVERSE.length` is still the only way to learn the count.

| Place                    | Exists now?                  | Reading at 500                                                                                                                            |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| The universe file        | **yes** — `universe.ts`      | Free. Sector blocks are arrays; §7's floor and ceiling are a product rule a person re-reads, not a constant                               |
| The loader's batching    | **yes** — `load-universe.ts` | Free, and **derived**: `chunkSize` is `65,535 ÷ 12 columns` = **5,461 rows per statement**, so 500 is still one statement                 |
| The loader's untrack     | **yes** — this task          | Free. Its `where symbol in (…)` is bound by the number of _absentees_, not by the universe                                                |
| The validation           | **yes** — `validateUniverse` | Free. Set-based, `O(n)`; there is no `O(n²)` cross-row check                                                                              |
| The schema               | **yes** — `0002`/`0003`      | Free. `bigint` identity, no partitioning, no size assumption                                                                              |
| An API default page size | no — Story 2.4/2.9           | The first real one. A limit sized to "the whole universe fits in one response" is the trap, and it is cheap to avoid before it is written |
| A frontend list          | no — Stories 2.10, 2.11      | Rendering 500 rows without virtualisation                                                                                                 |
| The feed                 | no — Stories 2.7, 2.8        | **The binding constraint.** See below                                                                                                     |

**Two costs are real and neither is in this repository.**

**Storage**, derived rather than quoted: ~390 minutes × 252 trading days = **98,280 bars
per security per year** (**assuming per-session requests — see the note below**), at Story 2.1's assumed ~120 bytes per row = **~11.8 MB per
security per year** — 1.18 GB/year at 100, **5.9 GB/year at 500**.

> **Conditional since 2026-09-08 (Task 2.7.9), and the condition is a request SHAPE rather
> than a date.** This figure assumes **390 bars a session**, which is exactly what Alpaca
> returns for a **per-session** request — measured at 1.00×. A **span-shaped** request
> (`[first.open, last.close)` over many days) also collects extended-hours prints across the
> nights between, at **~2.35×**, giving **~2.8 GB/year**. So the number is right for the
> backfill design Story 2.8 should adopt and wrong for the one it might drift into. It is
> **not** restated upward, because inflating it would misprice the correct design; it is
> restated **with its condition attached**. `ALPACA.md` §7c.
> Against Story 2.1's
> measured **~22.5 GiB usable** (27.46 GiB free on an empty disk, read-only below 5 GiB),
> that is **~20 years of headroom at 100 and ~4 at 500**. Expansion costs a factor of five
> against a figure already taken, and the disk is resizable upward.

**The feed is what actually binds, and it binds well below 500.** §10 parked the sizing on
one unmeasured fact Story 2.7 owns — whether minute-bar subscriptions are exempt from
Alpaca's free tier's 30-channel cap, which two of Alpaca's own pages disagree about. If
they are not exempt, **101 is already over the cap** and 500 is not a question. So the
honest form of "500 needs no redesign" is: **nothing we have written constrains the count,
and the provider might.** That is the sentence Story 2.7 should inherit.

### 12.6 The ticker change is a recorded gap, with an owner

`FB` → `META` is the case the surrogate key exists for — `0002_securities.sql` names it —
and **this story does not handle it**, deliberately. A rename is not an add plus a remove,
because the bars belong to the same company; but the loader keys on `symbol`, so nothing
here can join the old rows to the new name.

Produced rather than assumed, by renaming one row's symbol in the file:

```text
      1 inserted
  ○ 1 in the database and not in the file, now marked untracked:
      GILD

  id | symbol | status
  541| GILD   | untracked
  643| GILDX  | active
```

**Two rows, two ids, and nothing joining them.** The old row keeps its history and is
correctly marked untracked; the new row starts empty. That is not wrong — it is exactly
what the data model says happened, from a file that cannot express "these are the same
company".

**It is a gap and not a defect, and the honest gap is preferred to a mechanism built
against no instance** — there is no rename in the current list, and a `previous_symbol`
column, a rename map or a `company_id` above `securities` would each be a mechanism nobody
can test. **The owner is Story 2.7**, which is the first thing in this product with any
opinion about a symbol's lifecycle: Alpaca's assets endpoint carries an asset status and a
stable per-asset identifier, and the migration that adds `delisted` to `SECURITY_STATUSES`
is the natural place to decide whether a rename gets an identity too. Until then, **a
rename loses the link between the old bars and the new symbol**, and that sentence is the
whole of the gap.

> **CLOSED 2026-09-07 by Task 2.7.8 — as a decision, not a mechanism. See §15.5.** A rename
> orphans the old bars and that is now written down rather than owed. **The premise this
> deferral rested on turned out to be false**: the assets endpoint's "stable per-asset
> identifier" does **not** survive a rename — six real renames were checked and the id
> differs in every one — so recording it would buy nothing, and the fourth answer wins on
> measurement rather than on economy. If the trigger ever fires — **a rename in the list**,
> of which there is none — the recommendation is a **rename map in the curated file**, which
> §15.5 re-ranks first precisely because the cause diagnosed above is a file that cannot
> express "these are the same company". The deadline is unchanged: Story 2.8.
>
> §15.6 records a hazard this measurement found that nobody had named — **tickers are
> recycled**, 229 of them in the current market — which is why `pnpm universe:check` reports
> one.

### 12.7 §9's distribution did not move, and that is a decision

The obvious reading of "add one and remove one" is that this task ships a changed list. It
does not: **every ROW is byte-identical to where Task 2.3.4 left it**, and §9's distribution
table is untouched. ~~`apps/backend/src/universe.ts` is byte-identical~~ — **narrowed in Task
2.3.8, which checked rather than repeated it**: the file is not, because 2.3.5 added
`UNIVERSE_PROVENANCE` and a story-number sweep and 2.3.8 corrected a wrong comment, but
`git diff 7c4d844 HEAD -- apps/backend/src/universe.ts` touches **no `symbol`, `name`,
`exchange` or `industry` line at all**. The rows are the claim; the file was the wrong unit
to make it in.

The list is a **product decision** taken in 2.3.4 against §7's rule, and churning it to
satisfy a demonstration is the failure that split exists to prevent — a list edited for a
task's convenience rather than for a reason about the market. Task 2.2.6 set the precedent
in the same shape: it broke a migration eight ways, recorded every one, and finished with
the tree byte-identical. What this task ships is the **mechanism and the procedure**; what
it demonstrates, it demonstrates and reverts.

### 12.8 The procedure — read this before editing the list

1. **Edit `apps/backend/src/universe.ts`.** Add a row to the right sector block, or delete
   one. A symbol is a `Ticker` and goes through `toTicker`, so a malformed one throws at
   module load rather than accumulating with the other violations.
2. **Check §7's bounds by hand.** A floor of 6 and a ceiling of 12 equities per sector.
   **Nothing checks this** — deliberately, because it is a product judgement and a check
   asserting the shape of today's list is the `EXPECTED_COUNT` problem wearing a different
   hat. §9's table is the current distribution; three sectors are at the floor and one is
   at the ceiling, so an add to technology or a removal from utilities, real estate or
   materials breaks the rule.
3. **Fix the block's own comment.** Each sector block in `universe.ts` states its count and
   its relation to §7's bounds (`// 9 — three industries deep enough…`). **No instrument
   anywhere would catch a comment left stale** — it compiles, lints, formats and loads — so
   this is a rule only a person can hold, exactly like `migrations/README.md`'s "never edit
   an applied migration". Edit §9's table in the same commit.
4. **Do _not_ move `UNIVERSE_PROVENANCE.checkedOn`** for an add or a remove. See §12.9.
5. **`pnpm build && pnpm universe`.** The loader converges on the file. Read what it says
   it did: an added symbol is `inserted`, a removed one appears under `now marked
untracked`, and everything else should be `unchanged`.
6. **If it refuses**, it named every violation in one run and wrote nothing. Fix the file
   and run it again; the table is exactly as it was.
7. **Deployed, `pnpm universe` runs from the deploy** (Task 2.3.7), so a merge is what
   makes the change live.

### 12.9 Does adding a symbol count as re-checking the list? — **No**

This had to be decided rather than left to habit, because of an interaction Task 2.3.5
measured: the loader compares `classification_retrieved_at` like any other column, so
**moving `checkedOn` by one day reports `0 inserted, 101 updated, 0 unchanged`** and moves
every row's `updated_at`.

**`checkedOn` means the whole list was checked against a source on that date.** Adding one
symbol is checking _that symbol_ — it says nothing about the other hundred, whose sector
assignments may have been stale for a year. Moving the date would claim a hundred
verifications that did not happen, in the exact column §5 nominates as the mitigation for
the curated file going stale silently, and Story 2.14 would then show a user a freshly
checked classification that is nothing of the kind.

The cost of the other direction is real and is the safe one: a newly added row carries a
`classification_retrieved_at` **older than the moment it was written**, so the column
understates that row's freshness. It never overstates it. Provenance is per _field group_
and not per row (§4), so a per-row exception is not available and would be the wrong shape
if it were — it would put a hundred dates in a file whose whole claim is that one person
curated all of it at once.

**Move the date when you have actually re-checked the list against a source**, in the same
commit as whatever that check changed — and take that commit **separately** from an
add-or-remove commit, or the correct "101 updated" reads as a bug and somebody
"simplifies" away the `is distinct from` clause that makes `updated_at` mean anything.

---

## 13. The deployed universe, and where the load runs (Task 2.3.7, 2026-09-05)

**101 rows are in the managed database.** Read back off it rather than trusted from the
step's output: `securities` holds **101 rows, all `active`, none `untracked`**, split
**86 equities / 11 `sector_etf` / 4 `index_etf`**, and the per-sector distribution is
**identical to §9's table row for row** — technology 12, health care 9, financials 9,
consumer discretionary 9, industrials 8, communication services 7, consumer staples 7,
energy 7, utilities 6, real estate 6, materials 6, each beside its own ETF. Identical is
the check rather than a coincidence: §9's figures were printed from the compiled file on a
laptop and these were read out of a server in North Central US.

### 13.1 The decision: a step in `deploy.yml`, after the migration, before either half of the code

`.github/workflows/deploy.yml` gained one step, **`Load the tracked universe`**, sited
immediately after `Migrate the deployed database` and before the backend image is built.
The two other shapes were weighed rather than dismissed.

**A boot-time job was genuinely available here and is not for migrations, which is the
half worth stating first.** Task 2.2.7 killed boot-time migration on a fact about the
image: `apps/backend/package.json`'s `files` is `["dist", "!dist/**/*.test.*"]`, so the
container carries `migrate.js` and **not** `apps/backend/migrations/` — a description of
the schema with nothing that can create it. Neither half of that transfers. Both halves of
this mechanism compile into `dist/` and were measured on the shipped files:
~~`dist/universe.js` **28,819 B** and `dist/load-universe.js` **31,608 B**~~ — **re-taken
in Task 2.3.8 from a clean clone AND from the working tree, with both sources byte-identical
to this commit, and neither figure reproduces: they are `dist/universe.js` **31,792 B** and
`dist/load-universe.js` **35,004 B**.** ~~31,792~~ **32,039 B once 2.3.8's own
one-comment correction landed in that file, which is the point rather than a footnote: a
`.js` size is checked by NOTHING and moves on a comment edit, so a byte count recorded in
prose about compiled output is the most perishable figure this repository keeps.** The recorded pair was almost certainly measured
against a `dist/` built before 2.3.6's `untrackAbsent` landed. Neither is a
`*.test.*` file, which is the claim these numbers exist to support and is unaffected. So the image carries the data **and** the mechanism, and the argument had
to be found somewhere else.

**It was, and it did not exist before Task 2.3.6.** That task made the loader write rows it
did not insert — a symbol in the database and not in _that_ loader's file is marked
`untracked`. A boot-time seed runs on **every replica start**, and during a rollout the
outgoing and incoming revisions carry **different `universe.ts` files**. So an old replica
booting would untrack a symbol the new file has just added while the new replica sets it
`active`, and **which value survives depends on start order** — a flip-flop against
production with nothing recording it. Before 2.3.6 the loader could only converge upward:
every write named a symbol in its own file, so two loaders with different files produced
the union and removed nothing. The removal seam is what closed the boot-time option.
Task 2.2.7's other objection transfers unchanged: the startup probe is 2 s / 3 s / 30, so a
replica waiting on a lock is killed at roughly 90 s, and `Single` revision mode at
`minReplicas: 1` makes an unready replica **no service** rather than a degraded one.

**A manual command** is rejected for 2.2.7's reason: it is a step somebody forgets, and the
universe would then be whatever the last person to remember made it.

**It is a second step and not a phase of the migration step**, which is the cost Task 2.3.5
named in advance rather than a duplication. A migration and a seed mean different things by
_idempotent_. The step boundary is what makes a red result say **which** of them failed.

**After the migration** because a seed that runs before its own migration is the one
ordering that cannot work — and the loader fails loudly and by name if it does, its error
path naming `pnpm migrate`. **Before the code** for the reason the migration is: a failure
here means **nothing rolled**, so the deploy is a no-op rather than half-done. It leaves
the database ahead of the code, which is survivable while the universe only ever adds rows
the old revision does not read, and stops being survivable the moment a revision's code
depends on a symbol only its own `universe.ts` names. That is Story 2.9's first route, and
it is the same expand-then-contract rule `apps/backend/migrations/README.md` §9 already
states for schema.

### 13.2 Every deploy, and two of the arguments against it do not survive measurement

**It runs on every deploy.** Run-once is tempting precisely because the table is populated
after the first one, and it is rejected on one decisive ground: it would make editing
`apps/backend/src/universe.ts` **a change that ships nowhere**. The repository's universe
and production's would diverge silently, which is exactly what §11's converge-on-the-file
design exists to make impossible.

The three costs the task named were weighed, and two of them are smaller than they look.

- **"A write against production on every merge."** A no-op run writes **nothing**, proved
  rather than asserted: after the first load, two further runs reported `0 inserted, 0
updated, 101 unchanged`, and the database says the same thing more strongly — **0 rows
  where `updated_at <> recorded_at`, and exactly one distinct `updated_at` across all 101
  rows**. That is the `on conflict … where … is distinct from` comparison of §11 holding
  against a database this project cannot drop. So the recurring cost is a comparison, not a
  write.
- **"The Consumption plan's idle rate is conditional on under 1,000 bytes per second."**
  **This does not apply**, and saying so is a correction rather than a concession: that
  condition is a property of the **container app's replica**, and this step runs on a
  GitHub runner talking to Postgres. It never touches the replica. The backend's
  `uptimeSeconds` rose from 161.5 to 591.8 across every load, refusal and re-run in this
  task with no restart, which is the same fact from the other end.
- **"A step that usually does nothing is a step nobody reads."** This one is real and has
  no measurement to dissolve it. What is left is that the step prints its three counters,
  and `0 inserted, 0 updated, 101 unchanged` is the line that says the file and the
  database agree — which is worth more than silence.

**Its own deadline is `timeout 120`**, the same number as the migration step and for a
related but different reason. This takes no advisory lock, and a hung _connect_ is already
bounded by the pool's 5-second `connectionTimeoutMillis`; what is unbounded is a hung
_query_, of which a concurrent migration holding an `ACCESS EXCLUSIVE` lock on `securities`
is the realistic cause. Measured against a load that takes **~3 s wall** against this
database from a laptop across the Pacific, and a migration the runner completes in 1.181 s,
that is generous by more than an order of magnitude. The same number as the step above
because two deadlines to explain is worse than one.

### 13.3 The identity: nothing had to be granted, and that was executed rather than inferred

The step connects as **`marketpulse-github-deploy`**, exactly as the migration does and for
the same forced reason — Task 2.1.6 measured that a service principal cannot mint a token
for another principal's Postgres role, so CI could not be the backend even if that were
wanted.

**Whether its grants cover a loader was the open question, and the answer is that they
already did.** That role **owns** `securities` — read back from `pg_tables`, along with the
other three tables in `public` — and ownership carries DML. Confirmed twice, weakly and
then strongly. `has_table_privilege('marketpulse-github-deploy', 'securities', …)` returns
true for `SELECT`, `INSERT`, `UPDATE` and `DELETE`. And then, because a privilege function
is a claim about a privilege rather than about a statement, **every verb the loader
actually uses was executed against the deployed table under `set role
"marketpulse-github-deploy"` and rolled back**: the `insert … on conflict (symbol) do
update`, the `update … set status = 'untracked'` that 2.3.6 added, and the `select` the
untrack sweep reads. All three succeeded as that role. **No `grant` statement was needed,
so `HOSTING.md` gains none** — which is the outcome worth recording, because the grants
that _do_ exist live only there.

The loader appears in `pg_stat_activity` as **`application_name = marketpulse-universe`**,
not as the runtime service, which is Task 2.2.7's labelling decision applied a second time.

### 13.4 Both failure classes were produced against the deployed table, populated

Task 2.2.7's question — what a failure leaves behind — asked again, and answered by
producing it rather than by asserting the transaction. The table was fingerprinted first:
`md5` over every column of all 101 rows, ordered by symbol,
**`af810ff6671f05938a0d027e45c1a28d`**.

**A refused universe.** `MU`'s symbol was changed to `INTC` in `apps/backend/src/universe.ts`,
rebuilt, and run against the deployed database. Exit **1**, naming the symbol: _"INTC
appears more than once."_ Afterwards the fingerprint is **`af810ff6…`**, the row count 101
and the identity sequence unmoved at 305 — and **no connection was opened at all**, because
validation runs before the pool is built. So a bad universe is refused without the database
hearing about it.

**An unreachable database, against a populated table.** `DATABASE_HOST` set to
`203.0.113.7` (RFC 5737, guaranteed unroutable, so a genuine packet-drop timeout rather
than a refusal). Exit **1** in **5.43 s** — the pool's `connectionTimeoutMillis` — with
`Connection terminated due to connection timeout`. Fingerprint **`af810ff6…`** again.

**And the third class turns out not to exist, which is the finding.** The task expected a
mid-transaction database refusal to be producible. It is not, and the reason is that `0003`
aligned the three levels: every constraint the deployed `securities` carries —
`securities_kind_check`, `securities_sector_check`, `securities_sector_matches_kind`,
`securities_status_check`, `not null` on `exchange` — is mirrored in the discriminated
union, so **nothing the compiler accepts is rejected by the database**. The one exception is
a duplicate symbol, which the validator catches first. So the reachable deployed failure
modes are exactly two, validation and connection, and both were produced. The
whole-load-transaction property itself was proved locally at Task 2.3.5 by lowering the
bind-parameter ceiling, and it is a property of the code rather than of the environment.

**The fingerprint is `af810ff6671f05938a0d027e45c1a28d` before the breaks, after both of
them, and after two further successful loads** — the deployed table has not changed one
byte since the first load committed.

### 13.5 What the deployed rows say, spot-checked

`NVDA` reads `NVIDIA Corporation` / `NASDAQ` / `equity` / `technology` / `Semiconductors` /
`active`; `SPY` reads `SPDR S&P 500 ETF Trust` / `ARCA` / `index_etf` with a **null**
sector and industry; `XLK` reads `Technology Select Sector SPDR Fund` / `ARCA` /
`sector_etf` / `technology` with a null industry. All eight symbols `PRODUCT_SPEC.md` names
by hand are present — **AMD, AVGO, DIA, IWM, NVDA, QQQ, SPY, TSLA**. `cik` is **null on all
101 rows**, which is Epic 9's to populate.

**Provenance is uniform and it is the file's date rather than the load's**: all 101 rows
read `profile_source` `curated`, `classification_source` `curated`, and both
`*_retrieved_at` columns **`2026-09-05 00:00:00+00`** — midnight, which is
`UNIVERSE_PROVENANCE.checkedOn` copied verbatim. The loads themselves ran at 15:15 UTC. So
§11's decision that the column means _when the list was checked_ and not _when the loader
ran_ is visible in production, and the mitigation §5 offers against silent staleness is
intact.

**Nothing else in `public` changed.** Four tables before and four after; `kysely_migration`
holds three rows and `migration_checksum` three.

### 13.6 `0003` confirmed from the database rather than inferred from a merge

The task file was amended twice on the assumption that `0003_security_vocabulary` had
reached production. **Confirmed here rather than assumed**, which matters because a missing
`status` check would let the untrack path write a value nothing constrains:
`kysely_migration` holds `0001_baseline`, `0002_securities` and
`0003_security_vocabulary` (applied `2026-09-05T12:37:50.356Z`), and all four checks are on
the table, `securities_status_check` reading
`CHECK ((status = ANY (ARRAY['active'::text, 'untracked'::text])))`.

### 13.7 The identity sequence runs ahead deployed, exactly as it does locally

Read off `securities_id_seq` at each stage: **305** after the privilege probe (2) and three
loads (303), and **406** after a fourth. `min(id)` is 3 and `max(id)` is 103, so **ids are
stable across runs and the sequence is not**. That is §11's "an upsert consumes an identity
value per row per run whether or not anything changed", confirmed on the managed server —
and a gap in a surrogate key is not something anyone can act on, which is why the loader
does not mention it.

### 13.8 Nothing goes into `e2e/specs-deployed/`, and the trigger is named

**No.** No route serves a security until Story 2.9, so there is nothing browser-visible to
make a rollback decision from — which is the argument Task 2.2.7 already made about a
schema and Task 2.1.7 made about the database behind `/health`. **The reversal trigger is
Story 2.9's first route that serves the universe**, at which point a deployed check has a
list to assert on and a wrong one is a user-visible fault.

### 13.9 The deployed backend did not notice, and the leak check is clean

`/health` answered **200 throughout**, `uptimeSeconds` rising **161.5 → 394.0 → 591.8** and
**never resetting**; the replica is the same one throughout (created `2026-09-05T15:12:07Z`,
revision `0000082`), `ready: true`, `restartCount: 0`; and `/diagnostics/database` reported
`reachable: true` in 154–166 ms with a matching `x-request-id`. This is the first deploy
step that writes **rows** rather than DDL, and it is as invisible to the running system as
the migration was.

**The leak check on this task's five producers is zero.** The loader's own output on every
run — the successful loads, the refusal and the connection failure — holds no `eyJ`, no
`Bearer `, no `access_token` and no `ossrdbms`; the new workflow step holds none; and **the
deployed rows hold none by construction**, confirmed by a pattern match across every text
column. Log Analytics is not a producer here at all, because the loader runs on a runner and
never writes to that workspace. **The container app's `secrets` array was re-read and is
still `null`** — on a deployment whose database now holds 101 rows written by a role
authenticated with a token nothing stores — so ADR 0011's claim that nothing deployed holds
a credential is confirmed for the third story running.

Every operator query in this task passed the token through `docker exec -e PGPASSWORD` with
**no `=value`**, which is Task 2.1.5's terminal-echo finding applied rather than recalled.

### 13.10 The honest gap: the step's BODY ran, the step has not

**Task 2.2.7's gap arrives again and it is worth stating in the same words.** A step added
to `deploy.yml` only runs on `main`, so **its first execution is the first merge after this
story**. What was proved here is the step's **body** — the same commands, against the same
server, over the same code path — run from a laptop, plus **both branches of its shell
logic** exercised with a `timeout` stand-in: the success branch exits 0, and the failure
branch exits **1** and emits its `::error::` annotation. That last one is not ceremony. The
`if ! cmd; then status=$?` form shipped in the migration step on 2026-09-05 and made a
**refused migration report success**; this step captures `status` from the command and the
failure branch was executed rather than read.

**Two things the body could not prove and one it could.** It could not prove the runner's
network path, which the migration step already proves on every merge. It could not prove
the token mint as the deploy principal, because a laptop cannot impersonate a service
principal that has no secret — **but the thing that mint is _for_ was proved**, by executing
the loader's every statement under `set role "marketpulse-github-deploy"` (§13.3). What is
left unproven is a step that already works one line above it.

The first real run will print `0 inserted, 0 updated, 101 unchanged`, because this task
loaded the rows by hand — which is a weaker demonstration than the body run above, and is
the only thing that proves the step is wired into the workflow at all.

---

## What this task deliberately did not decide

- ~~**The actual symbols.** Task 2.3.4's, and it is a product conversation. Writing them
  here would be the rule reverse-engineered from the list.~~ **Task 2.3.4 wrote them; see
  §9.** The struck-through sentence is kept because the order it describes is the point:
  the rule in §7 was written before the list and did not move to accommodate it.
- **The exact column names in `0003`.** Task 2.3.3's, following §2, §3 and §4.
- **What a removal does to a reader.** §3 fixes the vocabulary and states that `status` is
  an invisible predicate; **naming the readers is Task 2.3.6's**, because it cannot be
  answered before a removal has been produced.
- **The ticker-change case.** `FB` → `META` is the case the surrogate key exists for, and
  the loader keys on `symbol`, so nothing here can join the old rows to the new name. Task
  2.3.6 decides whether this story handles it or records it as a gap with an owner — and
  the honest gap is preferred to a mechanism built against no instance.
- **The loader's command name.** Task 2.3.5's, and it must be checked against
  `pnpm help -a` before being claimed: `clean`, `env`, `config`, `start` and `test` are all
  real pnpm built-ins and a root script shadows a built-in repository-wide.

---

## The tree is byte-identical

Nothing was installed, no migration was written, no row was loaded, no dependency and no
lockfile line changed. Three probe files (`probe-universe.json`, `probe-universe.csv`,
`probe-import.ts`) were created under `apps/backend/src/` to take the §6 measurements and
were deleted; `apps/backend/dist/` was rebuilt afterwards. `git status --porcelain` reports
only this file and the task file.

---

## 14. The close (Task 2.3.8, 2026-09-06)

Every figure in this section was taken against the shipped tree — from a clean clone where
a clone is the honest place — and **re-taken rather than cited**, which is the rule this
document's own §13 exists under.

### 14.1 The deployed step ran, and that is the gap 2.3.7 could not close

`deploy.yml`'s `Load the tracked universe` step had never executed on `main` when 2.3.7
shipped, because a step in that workflow only runs there. Its first real execution is the
merge of 2.3.7's own pull request — **deploy run `33975545926`** — and it printed:

```text
  ✓ 101 securities in the universe
      0 inserted
      0 updated
      101 unchanged
```

Exit 0. That is the weaker demonstration 2.3.7 predicted, because the rows were already
loaded by hand, and it proves the one thing the body run could not: **the step is wired
into the workflow at all.** It also proves the token mint as `marketpulse-github-deploy`
from the runner, which a laptop structurally cannot do — 2.3.7 could only prove the role's
_authority_, by `set role` from the administrator's session.

**Its cost is 2 s wall, of which the loader itself is 0.428 s**, against the ~3 s §13.2
measured from a laptop. The runner and the database are both in the United States and the
laptop is not; this is Task 1.13.5's geography finding a second time. The migration step
beside it reported `Nothing pending.` / `Already up to date` in **0.62 s**, against the
**1.181 s** §13.2 recorded.

### 14.2 The two databases hold the same universe, proved by fingerprint

The honest form of criterion 2's deployed half. It is **not re-runnable from a clone** —
it needs Azure credentials `pnpm verify` deliberately does not have, and writes to a
database carrying a `CanNotDelete` lock — so it was read back instead.

With one stated expression over every column that must agree
(`symbol|name|exchange|kind|sector|industry|cik|status` plus the four provenance columns,
ordered by symbol):

|          |                                    |
| -------- | ---------------------------------- |
| Local    | `ee27fda00f3fc6838b054b285630c19c` |
| Deployed | `ee27fda00f3fc6838b054b285630c19c` |

That is a stronger statement than a column-by-column comparison: **the same file produced
both.** The deployed table holds 101 rows, all `active`, 86 / 11 / 4, with the sector
distribution identical to §9 row for row, and both `*_retrieved_at` columns reading
`2026-09-05 00:00:00+00` — the file's date, in production, which is §11's decision visible
where it matters.

All three migration checksums agree **three ways** — the local database, the deployed
database, and `shasum -a 256` of the files:

```text
0001_baseline            cdebe2eabc21e2d0b555b9351c597fb9c102eeee2f678c7c6db188ccbbd56ca5
0002_securities          8a944594c3fdf6e5cd0b9cbb88a45a19e28c85a815a1c27df7ff7faf903b540a
0003_security_vocabulary b52847a22b9260f53accb8034b802c005578f71e34008c8e0fc9e5ac72e36cfe
```

`0003` is recorded as applied at **`2026-09-05T12:37:50.356Z`**, reproducing §13.6.
Engine: **PostgreSQL 18.6** at both ends.

**`securities_id_seq.last_value` moved 406 → 507 across the CI load**, with ids still
3–103. That is §11's "an upsert consumes an identity value per row per run whether or not
anything changed", visible in production for the first time — and it is also independent
evidence that the deploy step really did write through the upsert rather than short-circuit.

### 14.3 Criteria 3 and 5, re-made

**Criterion 3.** An equity with no sector — which the discriminated union refuses at
compile time, so a cast is what lets the _runtime_ validator be exercised at all — exits 1
naming the symbol. A sector whose ETF is missing, together with a duplicated symbol,
reports **three problems in one run**:

```text
The universe was refused and nothing was written. 3 problems:
  ✗ NVDA appears more than once. …
  ✗ Sector `materials` is on 6 securities and the universe has no sector_etf row for it. …
  ✗ The taxonomy names `materials`, SECTOR_ETFS maps it to XLB, and the universe has no sector_etf row for it.
```

**The table's fingerprint is identical before and after all three**, because validation
runs before the pool is built.

**Criterion 5**, run end to end against a real database:

| Step          | Reported                                      | Row                                         |
| ------------- | --------------------------------------------- | ------------------------------------------- |
| Add `VRTX`    | `1 inserted, 0 updated, 101 unchanged`        | new id                                      |
| Remove `GILD` | `0 / 0 / 101` plus `1 … now marked untracked` | **id 34 kept, original `recorded_at` kept** |
| Run again     | `1 already untracked, unchanged`              | `updated_at` **byte-identical**             |
| Re-add `GILD` | `0 inserted, 1 updated, 100 unchanged`        | **same id 34, same `recorded_at`**          |

The re-add returning the **same surrogate key** is the whole argument for §12, because
Story 2.8's bars hang off exactly that key. The table was restored to its pre-probe
fingerprint afterwards.

### 14.4 Three things the close found that no task predicted

**The frontend artefact moved 115 bytes and this story shipped no frontend file.**
`packages/shared` is inlined into the bundle, so a change there is a change to the
artefact. The array-literal vocabularies (`SECURITY_KINDS`, `SECTORS`,
`SECURITY_STATUSES`) are tree-shaken out **completely** — a grep of the bundle for
`sector_etf`, `untracked` or any sector name returns **zero** — but **`SECTOR_ETFS` is
built by calling `toTicker()` eleven times**, and the bundler cannot prove a call
side-effect-free, so it keeps the eleven calls and drops the object. Confirmed by
rebuilding Story 2.2's close commit, which reproduces 348,135 B exactly. **The rule to
carry: a vocabulary declared as a literal is free to the browser and one declared through
a constructor is not.**

**Two recorded figures were wrong when written rather than gone stale**, both found by
rebuilding rather than by reading: Storybook's output is **65 files** and reproduces 65 at
Story 2.2's close commit as well, so the recorded 63 had been carried as "unchanged" across
two closes that never re-took it; and §13.1's built-file sizes do not reproduce, corrected
in place above.

**The twelve convention blocks were stale by two story closes**, not one — the first time
that sweep has found more than one increment outstanding.

### 14.5 The figures

|                                                |                                                                                                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean clone                                    | 417 packages; **419 store entries / 285,008 KB / 4,766 lockfile lines**, reproducing Story 2.2's baseline exactly — the check, because this story added no dependency |
| Install-script sweep                           | `esbuild@0.28.2` and nothing else                                                                                                                                     |
| `pnpm verify`                                  | exit 0 in **33.21 s** cold from the clone; **27.0 s** warm with a database, **27.0 s** with none                                                                      |
| `pnpm test` / `test:process` / `test:database` | **287** / **14** / **55** (2 files, 939 ms; exit 1 with no database, not skipped)                                                                                     |
| Local first load                               | `pnpm migrate` 3 migrations in **0.504 s**; `pnpm universe` 101 inserted in **0.329 s**                                                                               |
| Frontend artefact                              | 348,250 B `1a92544a…` + 12,128 B `134d5dd8…` + 1,101 B `bcb28338…` + 300 B = **361,779 B**, 279 modules                                                               |
| Storybook                                      | **65 files**, 9.3 MB                                                                                                                                                  |

### 14.6 Two hazards that reappeared on the way in

**The `developer-laptop` firewall rule had moved again** — `122.11.246.19` → `.11`, its
third sighting. `HOSTING.md` already records the _pattern_ rather than an address, which
is why this cost one command rather than a diagnosis.

**`libpq` still cannot do `verify-full` where Node can.** A `postgres:18` container's
`psql` refuses with `root certificate file … does not exist`, and then with
`certificate verify failed` even against `sslrootcert=system`, while the repository's own
`pg` connects with nothing shipped. That is Task 2.1.5's finding — "no CA file in the
Dockerfile" is a property of the **runtime**, not of the certificate — arriving unchanged.

---

## 15. The symbol lifecycle: `delisted`, and whether a rename gets an identity (Task 2.7.8, 2026-09-07)

The two gaps §3 and §12.6 opened with **Story 2.7 named as the owner**, answered here
because that story is the first thing in this product to hold a vendor credential. Both are
now closed; neither closed the way the deferral expected.

> **These figures are observations of a live third party on one day**, in `ALPACA.md`'s
> sense rather than this document's. Re-measure rather than cite. The instrument that took
> them ships as `pnpm universe:check`, so re-taking them is one command rather than a
> harness.

### 15.1 The decisions, in one paragraph

**`delisted` does NOT ship as a `SECURITY_STATUSES` member**, and **a ticker rename gets no
identity**. What ships instead is `pnpm universe:check`, a reporting command that compares
the curated file against the vendor's catalogue and **changes no row** — the middle of open
decision 4's three shapes, and Task 2.1.7's shape for exactly this kind of question. Both
refusals are taken on measurement rather than on economy: the endpoint turned out to be
nearly free, and **cost is not the axis either decision turns on**.

### 15.2 Why `delisted` is not a member: the vendor's `inactive` is a fact about the VENDOR

This is the argument that decided it, and it is a new one — neither §3 nor Story 2.7's own
open decision 4 anticipated it.

§3 refuses to collapse `active` and `untracked` into one `inactive` member precisely because
**one is a fact about the market and the other a fact about us**. Alpaca's `status` field is
a _third_ kind of thing: it means **"we will not trade this"**, which is a fact about
Alpaca's brokerage. Importing it as `delisted` would be labelling a third party's fact about
_itself_ as a fact about the market — the same conflation §3 already refuses, arriving
through a door §3 did not have.

**Measured, not asserted.** A deterministic sample of 50 active and 50 inactive US equities,
each checked against the tape for daily bars in August 2026:

| Vendor says | n   | Still printing bars |
| ----------- | --- | ------------------: |
| `active`    | 50  |       **50 (100%)** |
| `inactive`  | 50  |          **4 (8%)** |

So an automatic transition would have marked **4 in 50 still-trading securities as
delisted**. `LWACU`, `FRSH`, `SEMG` and `ITG` were the four. That is the measured error rate
of the shape open decision 4 called "probably right".

**And an inactive row carries no delisting DATE.** It is identical in shape to an active one
— `id`, `class`, `exchange`, `symbol`, `name`, `status`, `tradable`, the margin fields —
with no timestamp anywhere. A `delisted` status sourced from here could therefore never
answer _when_, and **Epic 13's replay needs exactly that**: it asks what was knowable on a
past date, and "this security is delisted **now**" says nothing about whether it was listed
then. §12.2's table already makes replay the reader that must not filter on `status`; a
member with no date would be one it could not use even if it did.

### 15.3 The second writer, produced rather than argued

Open decision 4 predicted this and it is worth having the demonstration rather than the
prediction. `load-universe.ts` writes `status` from the file on **every deploy** — that is
how §12's untrack-and-re-add works — so a `status` written by anything else is reverted by
the next merge.

Produced in a scratch database, with the file unchanged and saying `active`:

```text
update securities set status='untracked' where symbol='GILD';   ->  GILD -> untracked
pnpm universe                                                   ->  0 inserted, 1 updated, 100 unchanged
select status from securities where symbol='GILD';              ->  GILD -> active
```

**Silently.** No warning, and the loader's own counters report it as an ordinary update. So
adopting `delisted` was never one decision but two — the member, **and** who owns the column
— and the three ways out are all worse than not needing them: the loader stops writing
`status` for rows it did not insert (which changes §12's behaviour and needs its own
argument), or `delisted` is expressed in the **file** (which makes it a reporting check after
all), or the loader learns a precedence rule nothing checks and somebody later simplifies.

A reporting command needs none of them, because it writes nothing.

### 15.4 What the reporting command is actually for, and it is not mainly `delisted`

**Zero of the 101 are inactive**, and zero are unknown to the vendor. So a `delisted`
mechanism would have been built against **no instance**, which this document declines on
principle (§12.6) and Task 2.7.8's own Notes name as the first failure mode to avoid.

What justifies the command is a different gap with a real instance: §5 records the curated
file's silent staleness as a gap of this repository's third kind, and nothing had ever been
able to see any of it. `pnpm universe:check` is the first instrument that can, and on the day
it was written it found a real defect — **`WMT` carried `NYSE` and Walmart moved its listing
to NASDAQ on 2024-12-09.** Fixed in the same commit, and the check is clean afterwards.

**Names are deliberately not compared, and that is a measurement rather than an omission.**
The obvious third check reports **64 of 101** rows differing and **zero** of them
substantive: the vendor writes house style — `State Street Technology Select Sector SPDR ETF`
for `Technology Select Sector SPDR Fund`, `Eli Lilly & Co.` for `Eli Lilly and Company`. A
report that is 64 lines of noise around one real finding is a report nobody reads, which is
the failure §12's loader already refuses when it declines to shout the same line forever.
`exchange` survives because it is a short controlled vocabulary that moves only when a
listing genuinely moves.

**`profile.checkedOn` moved to 2026-09-08 and `classification.checkedOn` did not**, which is
the two-group design in §4 paying off visibly for the first time. Every row's symbol, name
and exchange was re-checked against a source, so §11's bar for moving the date is genuinely
met; Alpaca carries neither sector nor industry, so the classification group was not
re-checked at all and moving its date would claim a hundred verifications that did not
happen. The loader reports `0 inserted, 101 updated` afterwards, which is §12.9's stated
behaviour, and the two dates now differ in the database — read back to confirm it.

### 15.5 Why a rename gets no identity: the premise was FALSE

> **Confirmed 2026-09-08 by Task 2.8.2 (§16.7) rather than re-taken.** The deadline named
> below is now spent: Task 2.8.6 stores bars against these ids, so the cost of a future
> rename is stated rather than deferred — the old row keeps its bars and its id, the new
> symbol gets an empty row, and nothing joins them. The trigger is unchanged (a rename in the
> list) and there is still none.

§12.6, this task's brief and Story 2.7's open decision 5 all rest on one sentence — that the
assets endpoint "carries a stable per-asset identifier that survives a symbol change", which
would make a rename **detectable** rather than merely representable.

**It does not. Six real renames, six different identifiers, and not one match:**

| Rename                    | Old symbol today             | Ids equal? |
| ------------------------- | ---------------------------- | ---------- |
| `SQ` → `XYZ` (Block)      | **404, gone entirely**       | **No**     |
| `ANTM` → `ELV` (Elevance) | **404, gone entirely**       | **No**     |
| `RTN` → `RTX` (Raytheon)  | inactive, different id       | **No**     |
| `TWTR` → `X` (Twitter)    | inactive, different id       | **No**     |
| `FISV` → `FI` (Fiserv)    | both exist, different ids    | **No**     |
| `FB` → `META` (Meta)      | **active — a ProShares ETF** | **No**     |

The vendor issues a **new asset row with a new id** on a rename and retires or drops the old
one. So recording `alpaca_asset_id` would buy nothing for the purpose it was proposed for:
it identifies an asset **within a response**, not a company **across time**.

Task 2.7.8's brief says of decision 5 that if the endpoint is not adopted "that argument
evaporates and the fourth answer gets much stronger". It evaporates **even though the
endpoint is adopted**, because the identifier does not do the job claimed for it — which is
a stronger result, and only a measurement could have produced it.

**So the fourth answer ships: a rename orphans the old bars, and this is where that is
written down.** The other three candidates are re-ranked by the same measurement rather than
merely re-declined:

- **`previous_symbol` on `securities`** — still a list-of-one masquerading as a column, and
  now with **no source to populate it from**, because the vendor cannot tell us a rename
  happened.
- **`company_id` above `securities`** — still the correct general answer, still a table §30
  does not contain, and now demonstrably **not** derivable from this vendor.
- **A rename map in the curated file** — **strengthened**, and it is the recommendation if
  the trigger below ever fires. It is the only candidate that does not depend on a vendor
  identifier that turns out not to exist, and §12.6's own diagnosis says why: the cause is a
  file that cannot express _"these are the same company"_, so the fix belongs in the file.
  A human editing the universe knows `FB` became `META`.

**The deadline is unchanged and it is Story 2.8**, because it stops being cheap the moment
bars hang off those ids. **The trigger is a rename in the list**, which today has none.

### 15.6 The hazard the measurement found, which nobody had named

> **Promoted 2026-09-08 by Task 2.8.2 (§16.7) from a report line to a PRE-BACKFILL CHECK.**
> Run `pnpm universe:check` before loading a changed universe and treat a recycled-ticker
> line as **blocking**, not informational: after Task 2.8.6 this stops being a latent
> corruption risk and becomes corruption of stored history. Run against the 518-security
> list it is clean — 0 flags.

`FB` today is **ProShares S&P 500 Dynamic Buffer ETF** — an entirely different company, on a
different venue, with a different id. **Tickers are recycled**, and 229 of them in the
current market carry both an active and an inactive row.

That is a latent corruption risk in the mechanism §12 already ships, and it is worth stating
because it is the one thing that makes "do nothing" unsafe **in the long run** rather than
merely incomplete. The loader keys on `symbol`. §12's untrack-and-re-add is correct and cheap
for the **same** company — the row flips back on its original `id`, which is the whole
argument for it — and if a ticker is recycled to a **different** company and somebody adds it
to the file, the loader does exactly the same thing: it flips the **old** company's row back
to `active` on the old `id`, and Story 2.8's bars for two different companies land on one row.

**Zero of our 101 are affected today**, checked. So this ships as a **line in the report**
rather than as a mechanism — `pnpm universe:check` flags a tracked symbol that also carries a
retired row under a different name — which keeps it on the right side of the line this
document draws against mechanisms built with nothing to test them on: it is three lines over
data already fetched, and it is testable as a pure function against a synthetic row, which is
exactly what the fast suite does with it.

### 15.7 What was adopted, and what it costs

`pnpm universe:check`, `apps/backend/src/alpaca-assets.ts` and
`apps/backend/src/check-universe.ts`, plus twelve tests. **No migration, no schema change, no
new environment variable, no dependency, and no new writer of any column.**

- **It reads the FILE and not the database**, which is what makes "changes no row" structural
  rather than disciplined — there is no pool in it and nothing to point at a database. It
  therefore needs no database at all, unlike `pnpm universe`.
- **It is not and cannot be a `pnpm verify` step.** `verify` runs with no network and no
  credential (Story 2.7's acceptance criterion 7). The `:check` suffix it shares with
  `env:check` and `format:check` names the kind of thing it is, not where it runs.
- **It gets no retry, and that is the decision rather than an omission.** `withRetry` is
  typed to `MarketDataProvider` and wraps bar fetching only. This is a command a person runs
  and reads, so a plain failure in front of somebody who can re-run it is the right answer.
  The reversal trigger is this running unattended.
- **A finding does not change the exit code.** The exit code answers _did the check run_,
  never _did it find something_ — `/diagnostics/database`'s rule (Task 2.1.7), and the guard
  against somebody wiring a network-dependent check into CI where it would go red on a
  vendor's house-style change.
- **It costs Story 2.8's backfill nothing.** The assets endpoint is on the **trading** API,
  which Task 2.7.7 measured as a separate rate-limit budget (`ALPACA.md` §6b). Two requests,
  ~2.5 s, and the whole catalogue — 14,277 active and 19,188 inactive US equities — rather
  than a lookup per symbol.

### 15.8 What §3 and §12.6 now say

§3's `SECURITY_STATUSES` table is **unchanged at two members**, and its "its producer is
named: Story 2.7" paragraph is superseded by this section rather than deleted — the producer
was named, the producer looked, and the answer is that this vendor cannot produce the member
honestly. **The owner of a future `delisted` is Story 2.8's ingestion**, which is the first
thing that will notice bars stopping — a signal that is better correlated with reality than
the vendor's flag (100% against 92%), costs no request, and arrives as a consequence of work
that story is doing anyway.

§12.6's gap is **closed as a decision rather than as a mechanism**: a rename orphans the old
bars, the reason is §15.5, and the reversal trigger is a rename in the list.

---

## 16. The re-curation: the size, the metadata source and the taxonomy (Task 2.8.2, 2026-09-08)

§10 parked the sizing with a trigger, §5 declined a metadata source, and §10's own
instruction was that the second must be settled **before** the first. Both are settled here,
in one editing session, because they touch one file and a second pass after Story 2.8's
backfill is exactly what §10's deadline exists to prevent.

> **The deadline was real and this is the last cheap moment.** Nothing in the tree encodes
> the count, so this cost one file edit. After Task 2.8.6 stores a bar against
> `security_id`, a security added has no history and a security removed leaves rows filed
> against a row that says `untracked`.

### 16.1 The decisions, in one paragraph

**The universe is the S&P 500** — 503 equities — plus the eleven sector SPDRs and the four
market proxies, **518 securities**. **The metadata source is the index's own published GICS
classification**, which is what makes the size affordable rather than what the size forced.
**`industry` is the GICS industry group (level 2, 25 labels)** rather than the sub-industry
(level 4) this file carried, which is the coarsening §10 called free and never blocked.
**A rename still gets no identity**, and the recycled-ticker hazard is promoted from a
report to a **pre-backfill check**.

### 16.2 The size and the metadata source are ONE decision, and that is the finding

§10 says to settle §5 first and does not say why the two are the same question. They are,
and the mechanism is worth stating because it inverts §5's own conclusion.

§5 declined ETF-derived classification on one decisive objection, quoted:

> the **SPDRs hold S&P 500 constituents only**, so every tracked equity outside the index
> would derive to _no sector at all_, which acceptance criterion 3 turns into a failed load.

That objection is a statement about the **relationship between the universe and the index**,
not about the source. Defining the universe **as** the index dissolves it rather than working
around it:

- **Coverage is 100% by construction.** There is no equity outside the index to have no
  sector, so criterion 3 cannot fail for the reason §5 feared.
- **`SECTOR_ETFS` stops being a mapping we assert and becomes one the data satisfies.** §1
  chose eleven sectors because eleven SPDRs exist; the eleven SPDRs partition this list
  exactly. §1's own stated cost — that the mapping is a claim nothing checks — is now
  checkable against a published source.
- **The selection rule becomes something a reader can verify.** §7's floor-of-6 /
  ceiling-of-12 allocation was a rule only this document could adjudicate. "The S&P 500" is
  a rule anyone can check.

So the answer to §10's "settle §5 before picking a number" is not _pick a source, then a
number_: it is that **one number makes one source correct**, and 503 is that number.

### 16.3 What was actually read, and the check that makes the mapping evidence

Three sources, each used for exactly the fields it is authoritative for:

| Fields                       | Source                                             | Rows |
| ---------------------------- | -------------------------------------------------- | ---: |
| `symbol`, `name`, `exchange` | Alpaca's asset catalogue                           |  503 |
| `sector`, `industry`         | the published S&P 500 GICS classification          |  503 |
| everything, for the 15 ETFs  | curated by hand — neither source classifies a fund |   15 |

**The taxonomy mapping is validated rather than asserted, and that is the part worth
copying.** GICS nests industry group inside sector, so a sub-industry mapped to a group
whose sector disagrees with the constituent's own published sector is a **mapping error**
rather than a datum. The mapping table names the sector each of its 25 groups belongs to,
and every one of the 503 constituents was checked against it: **127 of 127 sub-industries
mapped, 0 unmapped, 0 sector mismatches.** That is 503 independent checks of a hand-written
table, which is a different claim from having read it twice.

**The generator is deliberately not in the repository.** It read three files and wrote one,
and it is checked in nowhere, because a generator beside its output creates a question
nothing answers — _is the file still what the generator would produce?_ — which is this
repository's third kind of gap, in a new place. §5's artefact is the **file**: typechecked
by the compiler, validated by the loader, constrained by the database, and reviewable in a
diff. The procedure is recorded here so it is reproducible; the reversal trigger is
**needing to regenerate more than about once a year**, at which point the generator ships
with a staleness answer rather than without one.

### 16.4 The taxonomy: what the coarsening actually bought

Not a merge we chose — a **published level of a published taxonomy**, which is what §10
meant by "finer than GICS's own industry-group level (25 groups)".

|                                |   Before |          After |
| ------------------------------ | -------: | -------------: |
| Equities                       |       86 |        **503** |
| Distinct `industry` labels     |       45 |         **25** |
| Mean members per label         |     1.91 |      **20.12** |
| Labels with exactly one member | 23 (51%) |          **0** |
| Labels with ≥ 11 members       |        0 |   **20 of 25** |
| Equities in a label of ≥ 11    |        0 | **478 of 503** |
| Deepest label                  |        8 |         **57** |

Three defects §10 recorded as _defects rather than opinions_, and where each stands:

1. **"Relative to its industry" was undefined for 23 of 86 equities.** It is now defined for
   **all 503**: the shallowest group has two members and there are no singletons.
2. **PRODUCT_SPEC.md §11's worked example was arithmetically unreachable.** "82% of
   semiconductor securities currently negative" needs a group of at least 11 to land within
   ±0.5pp; the deepest group was 8. `Semiconductors & Semiconductor Equipment` is now **20**
   — the demo's own group, and the one §7 rule 7 exists to protect.
3. **§27 names 500 nodes as the _initial_ topology target.** The live graph now ships at
   **518 nodes** rather than at a fifth of its specified size, so Epic 6 renders the thing
   §28's 60 FPS target was written against rather than a scaled-down stand-in.

**The sector allocation was not chosen and still passes §7's intent.** The largest sector is
industrials at **16.5%** of equities against §7 rule 3's "not 40% technology" criterion, and
the smallest is energy at 21, comfortably above rule 2's floor of 6. Both were **met** by an
index nobody tuned, which is a stronger result than meeting a rule written to be met.

### 16.5 The rules from §7 that survive, are superseded, or lapse

| §7 rule                              | Status                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1. Every sector present with its ETF | **Survives**, and is now satisfied by construction rather than by allocation              |
| 2. Floor of 6 per sector             | **Superseded.** Met (min 21), but the index decides membership                            |
| 3. Ceiling of 12 per sector          | **Superseded.** Its _intent_ — no sector dominating — is met at 16.5%                     |
| 4. Liquidity means liquid on IEX     | **Lapses for stored data**, see §16.6. Survives for Epic 3's live feed                    |
| 5. Market-cap spread within a sector | **Superseded.** An index spanning ~$5bn to ~$4tn has more spread than a hand-picked block |
| 6. Every symbol the spec names       | **Survives and is re-checked.** NVDA, SPY, AMD, AVGO, TSLA, QQQ, DIA, IWM all present     |
| 7. A deep semiconductor group        | **Survives, and is met with far more margin** — 20 rather than 8                          |

### 16.6 The IEX-versus-SIP correction §10 owes, applied

§10's ~1,000–1,500 "useful universe" estimate was derived from **IEX's ~3.8% volume share**,
and the argument was that thin names gain gaps and pollute breadth. Task 2.7.1 measured the
free plan to be **asymmetric**: the live stream is IEX-only, and **historical bars default
to SIP** — 99.7% mean minute coverage against IEX's 82.8%.

**So that quality ceiling binds Epic 3 and does not bind anything Story 2.8 stores**, and it
would not have excluded an S&P 500 constituent at either tape in any case. What §10 got
right and is unaffected: the ceiling is real for live data, and a **volume ratio** survives
a sampled tape where an **absolute share count** does not.

### 16.7 The rename map, and the hazard promoted to a check

Both are §15's handover and both had Story 2.8 as their deadline.

**A rename still gets no identity, and §15.5's decision is confirmed rather than re-taken.**
The premise every alternative rested on — that the vendor's asset id survives a symbol
change — was measured false across six real renames. The recommendation if the trigger ever
fires is unchanged and is the **rename map in the curated file**, because it is the only
candidate that does not depend on an identifier that turns out not to exist. **The trigger
is a rename in the list, and there is none**: all 503 symbols are listed and active at the
vendor, checked. Building a map against no instance is what §12.6 declines on principle.

**What did change is the deadline's status.** It was _"cheap until bars hang off these
ids"_, and Task 2.8.6 is about to make bars hang off them. So the cost of a future rename is
now stated rather than deferred: **the old row keeps its bars and its id, the new symbol
gets a new row with none, and nothing joins them.** That is the accepted outcome, and the
repair is a forward one — a rename map plus a backfill of the new symbol.

**The recycled-ticker hazard is promoted from a report line to a pre-backfill check.** §15.6
found 229 tickers in the current market carrying both an active and a retired row, and the
loader keys on `symbol`, so a recycled ticker added to the file flips a **different**
company's row back to `active` on the old `id` and two companies' bars land on one row.
Before this task that was a corruption risk; after Task 2.8.6 it is corruption of stored
history. **The rule: run `pnpm universe:check` before loading a changed universe, and treat
a recycled-ticker line as blocking rather than informational.** Run against this list it is
**clean — 0 flags across all 518** — which is what made the growth safe rather than merely
large.

### 16.8 What §5's decision now is, and its new reversal trigger

§5's _"a curated file, because ~100 rows is reviewable in a diff"_ is **narrowed rather than
overturned**, and the honest form is: the file is still the artefact, still reviewed, still
typechecked — and at 503 rows a reviewer checks its **shape** (the counts, the group depths,
the sectors) rather than reading every row, because the rows came from a source rather than
from memory.

**Two of §5's three staleness modes now have an instrument and one still does not.**
`pnpm universe:check` sees a ticker change and a delisting; **a sector reclassification
remains the dangerous one with no symptom at all**, exactly as §5 says — and it is now worse
in one respect, because a constituent leaving or joining the index is a fourth mode that did
not exist when the list was hand-picked. What mitigates it is unchanged and is now honest
rather than decorative: `classification_retrieved_at` says when this group was last checked
against its source, and Task 2.8.2 moved it for the first time since the list was written.

**§5's stated reversal trigger — "the universe passes ~250 securities" — has fired**, and
the answer it predicted was _"a metadata provider and the licence question that comes with
it"_. That is **not** what was adopted, and the reason is worth recording: a published index
constituent list with its own classification is neither a licensed provider nor a runtime
dependency, and it is read at curation time rather than at load time, so the loader still
has one job and the deployment still holds one credential. The **new** trigger is a universe
that is not an index — the moment membership stops being decidable from a published list,
the fetcher and the licence question come back.

---
