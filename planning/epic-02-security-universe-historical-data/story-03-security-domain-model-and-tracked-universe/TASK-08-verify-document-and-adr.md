# Task 2.3.8 — Verify from a clean clone, document, and record ADR 0016

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Tasks 2.3.1 to 2.3.7

## Objective

Re-run all seven acceptance criteria against the shipped tree, re-take every figure rather
than citing one, sweep the tree for claims this story falsified, and record **ADR 0016**.

**0016 and not 0014**, which is reserved for Story 2.1's own close, and ADRs are never
renumbered.

## Work

- **Re-run every acceptance criterion from a clean clone**, which is the eleventh such run
  and the first where the thing being verified is _data_. Criterion 2 is the one a clone
  actually tests — one documented command into a clean database — and note the trap the
  last close found: `compose.yaml` declares a fixed Compose project name, so **a fresh
  clone does not get a fresh database**, and `pnpm db down -v` is what empties it. The
  first-run sequence ~~is currently four steps and this story plausibly made it five~~ **is
  five since 2.3.5** — `pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate` →
  `pnpm universe` — and the **last two** now have no symptom if skipped, where the note used
  to name only the fourth: a migrated database holding zero securities ticks in `pnpm ready`,
  passes `pnpm verify` and serves `pnpm dev` exactly as an unmigrated one does
- **Criterion 3 has to be re-made rather than cited.** Produce a universe with an
  unclassified equity and one with a sector missing its ETF, run the loader, read the exit
  code and the message. Criterion 5 likewise: add, remove and re-add a symbol
- **Criterion 4 is a reading rather than a claim**: print the distribution from the shipped
  file and compare it against `UNIVERSE.md`'s recorded table and against the selection
  rule's stated floor
- **Criterion 6 is the one most likely to have quietly become false**, because provenance
  is decided in 2.3.1, given columns in 2.3.3 and filled in 2.3.5, and nothing renders it
  until Story 2.14. Check it by reading a row and asking whether a person could tell where
  each field came from without reading the loader
- **Re-take every figure**, and note the two this story has already moved: ~~`pnpm test` is
  **257** (55 + 99 + 103) after 2.3.2's eighteen tests, and `pnpm test:database` is **37**
  after 2.3.3's fourteen~~ — **both figures were wrong when written and were corrected at
  Task 2.3.4 by running the four commands rather than by re-reading the tasks that recorded
  them.** `pnpm test` is **264** (55 + **106** + 103) and `pnpm test:database` is **39**. The
  backend's 99 appears to be a count that predates Story 2.2's own additions; the database
  suite's 37 is two short. The struck-through numbers are kept because **this is the exact
  failure this task's own closing note warns about, arriving before the task started** — a
  correction to a recorded figure is itself a claim, and 257 was a claim nobody measured.
  Re-take all four again at the close rather than citing this line, which is a measurement
  taken three tasks earlier and will have moved if 2.3.5 or 2.3.6 adds a test — both of
  which are expected to. **2.3.5 did: `pnpm test` is now `286` (55 + 128 + 103) and
  `pnpm test:database` is `53` across two files**, and 2.3.6 will move both again, so this
  line is a waypoint rather than a figure to cite. Both figures also appear in `README.md`
  and `CLAUDE.md`; **2.3.5 corrected them in both** — along with two that were already stale
  before this story started (`229` and `246` in `README.md`, and a `25` for the database
  suite) — so what is left for this task is re-taking rather than discovering, plus whatever
  2.3.6 moves. Neither 2.3.2 nor 2.3.3 added a
  dependency, so the install baseline below should reproduce exactly — and that
  reproduction is the check rather than a coincidence. Store entries, `node_modules` size
  and lockfile lines against
  the last recorded baseline (**419 entries / 285,008 KB / 4,766 lockfile lines** from a
  clean clone, `Packages: +417`); the install-script sweep, which must still return
  `esbuild@0.28.2` and nothing else; `pnpm verify` cold and warm, with and without a
  database; all four test commands and their counts; and the frontend artefact's four
  files, which should reproduce **361,664 B** to the byte unless this story shipped
  frontend source — and if it did not, that reproduction is the check rather than a
  coincidence
- **Sweep for claims this story falsified**, and note that this story has an unusually
  specific list of them, because three files say in their own comments that Story 2.3 owns
  something. Start there rather than with a general grep:
  - `packages/shared/src/security.ts` says "**This is deliberately not `Security`.** Story
    2.3 owns that interface" — false the moment 2.3.2 lands
  - ~~`apps/backend/src/schema.ts` says `status` is `string` "deliberately not a union"~~ —
    **already corrected by 2.3.3**, which narrowed `status` to `SecurityStatus` and `sector`
    to `Sector | null` in the same change as the migration. Re-read it rather than assuming
    2.3.3 got all of it
  - **`apps/backend/migrations/0002_securities.sql` is a CONFLICT rather than a sweep item,
    and 2.3.3 left it deliberately untouched.** Its four numbered decisions are now
    substantially false — `status` has a check, `kind` is three members, decision 1's worked
    example is the `'etf'` value `0003` consumed, and the `sector` comment's "deliberately
    NOT encoded" is half wrong. But `migrations/README.md` ends with the one convention no
    instrument can hold: **never edit a migration that has been applied.** Nothing here
    would catch it — there is no checksum, `migrate.ts` matches by name and never reads a
    file's contents, so editing a comment is mechanically invisible — which makes it exactly
    the rule that erodes by being harmless the first time. **Resolve it explicitly rather
    than by reflex.** The shape that costs nothing is to leave `0002` byte-identical and let
    `0003`'s header be the correction, since a reader arrives at these files in order and
    `0003` already says what it changed and why; a header note in `0002` pointing forward is
    the middle option and is still an edit. Whatever is chosen, say so in the ADR, because
    the next stale migration comment is Story 2.8's and it will be read against this
    precedent
  - **`apps/backend/migrations/0003_security_vocabulary.sql` and
    `apps/backend/src/migrate.database.test.ts`**, both new in 2.3.3 and both figure-dense.
    `0003`'s header states that Task 2.2.7 has not been done, that `deploy.yml` has no
    migration step and that the deployed database has never been migrated — ~~**all three
    stop being true the moment Story 2.2 is finished**, which may well be before this story
    closes~~ **and all three are false already**, checked at 2.3.4: Story 2.2's eight tasks
    all read Complete, `deploy.yml` carries a `Migrate the deployed database` step, and
    2.2.7's commit is an ancestor of `origin/main`. So this is a live wrong claim rather than
    a pending one — **and it is inside a migration that will have been applied by the time
    this task runs**, which puts it under the same `0002` conflict below rather than beside
    it. Resolve the two together and with one rule, because a reader arriving at
    `migrations/` in order meets both
  - **`apps/backend/src/universe.ts`**, new in 2.3.4 and the most figure-dense file this
    story shipped — **and the one whose figures a task inside this story is expected to
    falsify.** Each sector block's comment states its count and its relation to §7's bounds,
    and the technology block's states that eight of its twelve are semiconductors; Task 2.3.6
    adds a symbol and removes one, and **nothing anywhere would catch a comment left
    behind** — it compiles, lints, formats and loads either way. Check the comments against
    the rows rather than against `UNIVERSE.md` §9, since §9 is the other thing 2.3.6 edits
    and two stale copies agreeing with each other is the failure mode
  - **`apps/backend/src/load-universe.ts`**, new in 2.3.5 and the second most figure-dense
    file this story shipped. It carries three measurements in comments — 5,461 rows per
    statement, `securities_id_seq.last_value` 404 against `max(id)` 101 after four runs, and
    the two-branch duplicate finding below — none of which any instrument re-takes. It also
    **names Task 2.3.6 as the owner of the removal seam in two places**, one of them a test
    name, so both go stale the moment that task decides
  - **`README.md`'s new `pnpm universe` section**, which publishes a worked example of the
    loader's output (`0 inserted / 1 updated / 100 unchanged`) — a prose figure of exactly
    the kind this repository's fourth gap records as checkable by nothing — and
    **`UNIVERSE.md` §11**, which is where 2.3.5's decisions live
  - `apps/backend/migrations/README.md` §7 on seed data, which is what this story read to
    decide, and its checked-versus-prose lists, which 2.3.3 moved entries between
  - **The `equity | etf` two-member claim, which Task 2.3.1 counted at eleven sites** so
    this sweep does not have to rediscover them. **Re-counted after 2.3.3 and the shape has
    changed rather than shrunk**: `packages/shared/src/security.ts` now names `equity | etf`
    three times and every one is _historical inside a live file_ — the widening's own
    account, a rejected alternative, and a struck-through note about the one commit in which
    the union and the constraint disagreed. `0003` names `'etf'` three times, all of them
    describing what it removed. `migrate.database.test.ts` names it twice, once in a comment
    about Postgres's rewriting and once as the deliberate probe value — **that probe is
    load-bearing and must not be "modernised"**, because the member `0003` dropped is the
    one worth proving is refused. The only site that is a live, wrong claim is
    `0002_securities.sql`, which is the conflict above. **The rest are historical and must
    be left standing** — Story 2.2's own task files record the
    constraint as it was when they were written, and `UNIVERSE.md` names `equity | etf`
    inside a _rejected alternative_, where it is correct. That is the live-versus-historical
    distinction a naive grep-and-replace destroys, arriving with a count attached for once
  - **`UNIVERSE.md` itself**, which is the one document this story wrote and the one most
    likely to have gone stale inside its own story: §7's selection rule against the
    distribution 2.3.4 actually produced, §8's storage arithmetic, and the §5 reversal
    trigger. A record that contradicts the tree it describes is the failure Task 1.11.8
    found in `CLAUDE.md`'s own artefact paragraph
  - `CLAUDE.md` and `README.md`: test counts, the first-run sequence, the command table,
    the levels of test, and the "three engine pins" and gap lists if 2.3.3 touched them
- **Sweep the DUPLICATE-SYMBOL premise, which 2.3.5 half-falsified and which is stated as a
  live claim in at least three places.** **Added after 2.3.5.** Task 2.3.4's amendment,
  `STORY.md`'s "Amended after Task 2.3.4" section and Task 2.3.5's own Work bullet all say a
  duplicate symbol has **no backstop at all**, because an upsert is the one write shape a
  unique index cannot refuse. Measured with the check disabled, that is **half right**:
  within one `insert` Postgres refuses it outright (`21000`, _"ON CONFLICT DO UPDATE command
  cannot affect row a second time"_), which is what happens at 101 rows; across statements it
  is silent, and the load printed `✓ 102 securities in the universe` at exit 0 over a table
  holding 101. `STORY.md`'s copy was corrected at 2.3.5; the task files' copies are
  **historical** — they record what was believed when the work was briefed, and the
  correction lives in 2.3.5's own "What shipped" and in `UNIVERSE.md` §11 — so leave them
  standing and check that the ADR states the measured version rather than the briefed one.
  This is the live-versus-historical distinction again, arriving on a claim rather than on a
  count
- **Count the duplicated blocks before correcting them.** This repository has twice
  recorded that a sentence duplicated for legibility must be counted with a grep before it
  can be corrected, and twice found the recorded count was of the places somebody
  remembered. Distinguish live claims from historical records that are correct in their own
  context — the distinction a naive grep-and-replace destroys
- **Write `docs/adr/0016-*`** in the shape 0015 established, with **four lists rather than
  two**: what a green load certifies, what it cannot, what the universe _is_, and what it is
  not. The second list is the one worth the effort, and it has obvious members already: a
  green load says the file was read and the rows are there, and says **nothing** about
  whether a sector is still correct, whether a symbol still trades, or whether the list is
  still a good one — the curated file's silent staleness, recorded as a property rather
  than a worry. The ADR also carries the taxonomy, the selection rule, the proxy
  distinction, the removal semantics and the provenance shape, because those are the
  decisions Epics 4, 5, 6 and 9 inherit
- **Do NOT close the sizing question, and do not let the ADR imply it is closed.**
  `UNIVERSE.md` §10 parks it on a Story 2.7 measurement with both branches written out, and
  an ADR that records "101 securities" as a settled decision would quietly retire a parked
  one — which is the failure mode this repository already records for deferrals that lose
  their owner. ADR 0016's "what the universe is not" list should carry it explicitly: the
  count is provisional, the trigger is named, and **the deadline is Story 2.8 rather than
  Story 2.7**, because re-sizing is free until bars are stored. Note the related item that
  is _not_ parked and may well be actionable by the time this task runs: the industry
  taxonomy is finer than GICS's own industry-group level on a universe a fraction of the
  size, half the groups are singletons, and coarsening it needs no new data
- **Say what this story hands forward and be precise about which parts are properties and
  which are claims**, in the shape Task 2.2.8 used: the symbol list every later story
  iterates is a property, and "the architecture expands to 500 without redesign" is an
  argument that has never been executed

## Done when

- All seven acceptance criteria re-run against the shipped tree, with criteria 3, 4 and 5
  re-made rather than cited
- The `0002_securities.sql` conflict is resolved explicitly — edited or deliberately left,
  with the reasoning in the ADR either way
- Every figure re-taken, including from a clean clone where that is the only honest place
- Every claim the sweep found is corrected, with historical records left standing
- `docs/adr/0016-*` exists, and `CLAUDE.md`'s ADR paragraph and count are updated
- STORY.md is closed with an outcome, and the story's open decisions all read as settled

## Notes

The failure this close is most likely to produce is a correction that is itself wrong.
Task 1.7.7 rebuilt four commits to find two of those, and the rule that came out of it is
the one to apply here: **a correction to a recorded figure is itself a claim and needs the
same measurement the original did.**

---

## Amended after Task 2.3.4 (2026-09-05)

Two corrections and one new sweep item. No work added or removed.

- **Two recorded figures were wrong and are corrected by measurement**: `pnpm test` is
  **264** (55 + 106 + 103), not 257, and `pnpm test:database` is **39**, not 37 — run per
  package rather than re-read. The bullet's claim that 2.3.2 and 2.3.3 updated `README.md`
  and `CLAUDE.md` is also wrong; that sweep is still this task's. This is this task's own
  closing note arriving before the task did.
- **`0003`'s three "will stop being true" claims are already false**, because Story 2.2
  finished — so they join the `0002` conflict rather than waiting behind it, and both should
  be resolved by one rule.
- **`apps/backend/src/universe.ts` is a new sweep item**, and an unusual one: it describes
  its own shape in comments that **Task 2.3.6 is expected to falsify**, with no instrument
  anywhere that would notice.

---

## Amended after Task 2.3.5 (2026-09-05)

Two figures moved, three sweep items added, one bullet's conditional became a fact. No work
added or removed.

- **`pnpm test` is `286` and `pnpm test:database` is `53`**, and 2.3.6 will move both again
  — so the waypoint is recorded and the instruction to re-take at the close stands. 2.3.5
  corrected both in `README.md` and `CLAUDE.md`, plus two figures (`229`, `246`, `25`) that
  were stale before this story began.
- **The first-run sequence IS five steps**, and the "no symptom if skipped" note now covers
  the last two rather than the fourth alone.
- **Three new sweep items**: `load-universe.ts`, `README.md`'s `pnpm universe` section, and
  `UNIVERSE.md` §11.
- **The duplicate-symbol premise is half-falsified** and needs sweeping as a claim rather
  than as a count — `STORY.md` is corrected, the task files are historical, and the ADR must
  carry the measured version.
