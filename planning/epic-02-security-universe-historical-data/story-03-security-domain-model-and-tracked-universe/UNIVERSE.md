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

**Its producer is named, so nobody has to rediscover it: Story 2.6**, which carries this
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
2.13 can display, and invariant 6 says provenance is displayed rather than implied. The
fields do not share a source:

| Field group    | Fields                       | Source                                                                    | Written by |
| -------------- | ---------------------------- | ------------------------------------------------------------------------- | ---------- |
| Profile        | `symbol`, `name`, `exchange` | the curated file today; plausibly Alpaca's assets endpoint from Story 2.6 | Task 2.3.5 |
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

What Story 2.13 reads, so it does not have to reverse-engineer it: for any field on
screen, the group it belongs to, that group's `source` string, and that group's
`retrieved_at`. The mapping from field to group is the table above, and it belongs in
`packages/shared` beside `Security` so the renderer and the loader agree.

**The `observed_at` question, answered explicitly rather than by omission** — which Task
2.3.3's brief asks for and Task 2.2.4 set the precedent for. `retrieved_at` is a
_retrieval_ timestamp and is exactly what invariant 5's evidence pair asks for. There is
still **no `observed_at`**, because a security's sector is not a fact about the market at
an instant; there is no moment at which "AAPL is in Technology" became true in the way a
price became true. `market_bars` in Story 2.7 remains the first table that exercises the
pair, and adding a defaulted `observed_at` here to make the convention look tested would
be precisely the leak the convention forbids.

**Two alternatives, rejected:**

- **One `jsonb` provenance object.** New sources need no migration, which is its whole
  appeal. The compiler holds nothing about it, `information_schema` can confirm only that
  it is `jsonb`, and Story 2.13 would have to reverse-engineer its shape — which that
  story's brief says explicitly it must not have to. It also puts an unvalidated
  open-ended object on the row, which is the same shape `ApiError.details` was
  deliberately made `readonly string[]` to avoid.
- **A separate `security_field_provenance` table.** Fully general, one row per (security,
  field), and it would give this schema its first foreign key — which would exercise the
  `<table_singularised>_id` naming rule Task 2.2.4 recorded as untested. It is rejected on
  proportion: a join, plus four or five rows per security, to carry two facts that are the
  same for every row the loader writes in a single run. **The naming rule therefore stays
  untested**, and Task 2.3.3 owes saying so, because Story 2.7 then inherits it.

**Cost, stated:** a genuinely new field group means a migration. Given there are four
groups and three of them are already named, that is a cost paid roughly once per epic that
introduces a new metadata source.

---

## 5. Where sector and industry come from: a curated file in this repository

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
| A ticker change            | `FB` → `META`                                    | The old symbol stops matching anything at the provider; Story 2.6's bar requests return nothing for it, and the row is a company that no longer exists under that name. This is the case the surrogate key exists for, and Task 2.3.6 owns whether it is handled or named as a gap |
| A sector reclassification  | A name moves Technology → Communication Services | Nothing fails. Epic 5 compares it against the wrong benchmark and Epic 4 counts it in the wrong breadth number, indefinitely, and correctly-looking                                                                                                                                |
| A delisting or acquisition | A tracked name is acquired                       | Bars stop arriving. §3's `status` has no member for it yet and Story 2.6 is its producer                                                                                                                                                                                           |

The middle row is the dangerous one, because it is the only one with **no symptom at all**.

**The reversal trigger** — the condition, not a story number, in the shape `report-error.ts`
already uses: **a sector reclassification is found in the data after having been wrong for
a while, or the universe passes ~250 securities.** At 100 rows a person can re-read the
file; at 250 nobody will. On that day the answer is a metadata provider and the licence
question that comes with it, and the mitigation until then is that
`classification_retrieved_at` (§4) makes the file's age _visible on screen_ through Story
2.13 rather than only in git history — which is a weaker guarantee than a check and a
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
goes there (§1, §2, §3); the _rows_ do not. Story 2.10's search reads them from the API.

**The cost of `.ts`, stated:** it is less obviously data, and somebody will eventually want
to generate it from a spreadsheet. That is fine — the generator writes the module.

---

## 7. The selection rule

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

| Place                    | Exists today?                   | What would make expansion cost something                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The universe file        | no — Task 2.3.4                 | An `EXPECTED_COUNT`, or an array length asserted anywhere                                                                                                                                                                                                            |
| The loader               | no — Task 2.3.5                 | A batch size or a single multi-row `insert` built as one statement; Postgres's 65,535 bind-parameter ceiling is reachable at 500 rows × 13 columns                                                                                                                   |
| The schema               | **yes** — `0002_securities.sql` | Nothing. `bigint` identity, no partitioning, no size assumption                                                                                                                                                                                                      |
| The validation           | no — Task 2.3.5                 | An O(n²) cross-row check; trivial at 100, still trivial at 500                                                                                                                                                                                                       |
| An API default page size | no — Story 2.8                  | A limit sized to "the whole universe fits in one response"                                                                                                                                                                                                           |
| A frontend list          | no — Story 2.9/2.10             | Rendering all of them without virtualisation                                                                                                                                                                                                                         |
| The bar ingestion        | no — Story 2.7                  | Alpaca's per-request symbol limit and rate limits, which Story 2.6 measures                                                                                                                                                                                          |
| Storage                  | **yes** — measured              | Story 2.1 measured **~22.5 GiB usable** and estimated **~1.18 GB/year** of minute bars at 100 securities. Linear in security count: ~5.9 GB/year at 500, so **~4 years** of headroom against the current disk before the read-only threshold, against **~20** at 100 |

Of the eight, exactly two exist today and neither constrains the count. **The storage row
is the one with a real number in it**, and it is the one Task 2.3.6 should hand forward
rather than have Story 2.7 rediscover: expansion to 500 is free everywhere except the
disk, where it costs a factor of five against a figure Story 2.1 already took.

---

## What this task deliberately did not decide

- **The actual symbols.** Task 2.3.4's, and it is a product conversation. Writing them
  here would be the rule reverse-engineered from the list.
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
