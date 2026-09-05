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
| An API default page size | no — Story 2.9                  | A limit sized to "the whole universe fits in one response"                                                                                                                                                                                                           |
| A frontend list          | no — Story 2.10/2.11            | Rendering all of them without virtualisation                                                                                                                                                                                                                         |
| The bar ingestion        | no — Story 2.8                  | Alpaca's per-request symbol limit and rate limits, which Story 2.7 measures                                                                                                                                                                                          |
| Storage                  | **yes** — measured              | Story 2.1 measured **~22.5 GiB usable** and estimated **~1.18 GB/year** of minute bars at 100 securities. Linear in security count: ~5.9 GB/year at 500, so **~4 years** of headroom against the current disk before the read-only threshold, against **~20** at 100 |

Of the eight, exactly two exist today and neither constrains the count. **The storage row
is the one with a real number in it**, and it is the one Task 2.3.6 should hand forward
rather than have Story 2.8 rediscover: expansion to 500 is free everywhere except the
disk, where it costs a factor of five against a figure Story 2.1 already took.

**Task 2.3.6 re-took this walk rather than citing it — see §12.5.** Four of the eight rows
now exist and none of them constrains the count; the table above is the prediction and
§12.5 is the reading.

---

## 9. The list, and the distribution read against §7 (Task 2.3.4, 2026-09-05)

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
way to learn the count, and the only place the number 101 appears in the repository is
this document. Task 2.3.6 owes the argument; this task owed the absence, and it is absent.

---

## 10. Is ~100 enough? — the sizing question, PARKED with a trigger (2026-09-05)

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

**Even 5,000 securities with a year retained is about $15/month of disk**, and the write
load is ~10 KB/s, which the measured 120 IOPS handles comfortably _provided bars are
batched per minute rather than written per row_ (note 5,000 rows × 13 columns sits almost
exactly on Postgres's 65,535 bind-parameter ceiling, so batches need chunking). The real
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
per security per year**, at Story 2.1's assumed ~120 bytes per row = **~11.8 MB per
security per year** — 1.18 GB/year at 100, **5.9 GB/year at 500**. Against Story 2.1's
measured **~22.5 GiB usable** (27.46 GiB free on an empty disk, read-only below 5 GiB),
that is **~20 years of headroom at 100 and ~4 at 500**. Expansion costs a factor of five
against a figure already taken, and the disk is resizable upward.

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

### 12.7 §9's distribution did not move, and that is a decision

The obvious reading of "add one and remove one" is that this task ships a changed list. It
does not: `apps/backend/src/universe.ts` is **byte-identical** to where Task 2.3.4 left it,
and §9's distribution table is untouched.

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
