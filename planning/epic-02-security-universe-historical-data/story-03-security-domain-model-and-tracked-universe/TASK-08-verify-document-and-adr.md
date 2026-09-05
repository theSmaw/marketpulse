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
  first-run sequence is currently four steps and this story plausibly made it five
- **Criterion 3 has to be re-made rather than cited.** Produce a universe with an
  unclassified equity and one with a sector missing its ETF, run the loader, read the exit
  code and the message. Criterion 5 likewise: add, remove and re-add a symbol
- **Criterion 4 is a reading rather than a claim**: print the distribution from the shipped
  file and compare it against `UNIVERSE.md`'s recorded table and against the selection
  rule's stated floor
- **Criterion 6 is the one most likely to have quietly become false**, because provenance
  is decided in 2.3.1, given columns in 2.3.3 and filled in 2.3.5, and nothing renders it
  until Story 2.13. Check it by reading a row and asking whether a person could tell where
  each field came from without reading the loader
- **Re-take every figure**: store entries, `node_modules` size and lockfile lines against
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
  - `apps/backend/src/schema.ts` says `status` is `string` "deliberately not a union" and
    "it narrows when `Security` arrives", and says the sector column's rule is "deliberately
    NOT encoded"
  - `apps/backend/migrations/0002_securities.sql` carries four numbered decisions, at least
    two of which (`status` has no check; Story 2.3 owns the vocabulary) stop being true
  - `apps/backend/migrations/README.md` §7 on seed data, which is what this story read to
    decide, and its checked-versus-prose lists, which 2.3.3 moved entries between
  - `CLAUDE.md` and `README.md`: test counts, the first-run sequence, the command table,
    the levels of test, and the "three engine pins" and gap lists if 2.3.3 touched them
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
- **Say what this story hands forward and be precise about which parts are properties and
  which are claims**, in the shape Task 2.2.8 used: the symbol list every later story
  iterates is a property, and "the architecture expands to 500 without redesign" is an
  argument that has never been executed

## Done when

- All seven acceptance criteria re-run against the shipped tree, with criteria 3, 4 and 5
  re-made rather than cited
- Every figure re-taken, including from a clean clone where that is the only honest place
- Every claim the sweep found is corrected, with historical records left standing
- `docs/adr/0016-*` exists, and `CLAUDE.md`'s ADR paragraph and count are updated
- STORY.md is closed with an outcome, and the story's open decisions all read as settled

## Notes

The failure this close is most likely to produce is a correction that is itself wrong.
Task 1.7.7 rebuilt four commits to find two of those, and the rule that came out of it is
the one to apply here: **a correction to a recorded figure is itself a claim and needs the
same measurement the original did.**
