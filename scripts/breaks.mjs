// The breaks this repository knows how to perform, and what each one proves.
//
// One entry per invariant in `scripts/check-invariants.mjs`. Every check there
// is a claim that something in the tree holds; an entry here is the edit that
// makes it stop holding, so `pnpm break <name>` can demonstrate that the check
// is live rather than decorative.
//
// `CLAUDE.md`: *a break that does not go red is not evidence the check works —
// it is equally evidence the break did not land.* These are how that gets
// verified without anybody hand-editing a file and remembering to undo it.
//
// ## The shape of an entry
//
//   name     what `pnpm break <name>` is called
//   proves   the sentence a reader sees; what going red demonstrates
//   file     repo-relative, and it must be committed — `break-verify.mjs`
//            refuses on a dirty target because it restores by overwriting
//   find     the exact text to replace. **Must occur exactly once**, which the
//            harness checks before touching anything
//   replace  what to put there
//   command  argv, run from the repository root
//   expect   a string that must appear in the failing output, so a command
//            failing for an unrelated reason is not mistaken for a proof
//   build    true when the break only reaches the subject through a build, so
//            the harness rebuilds before the command and again after restoring
//
// ## Why the first entry is the only one that rebuilds
//
// `no-fixture-reaches-the-bundle` is a claim about `apps/frontend/dist/`, which
// no edit touches directly — the leak happens when a shipped source file
// imports a recorded body and the bundler pulls 357 kB of market data in behind
// it. So that break edits the source and the harness builds twice: once to make
// the leak real, once after restoring so the next command does not read a
// polluted `dist/` and go red for a reason that no longer exists.

export const BREAKS = [
  // **The first entry whose command is not `check-invariants.mjs`, and the
  // harness's contract already allows it — `command` is argv.** The check being
  // proven is a startup refusal rather than a grep, so what has to go red is a
  // test.
  //
  // Two tests cover it and this break edits the one thing both depend on. The
  // unit test proves `loadConfig` throws; `index.process.test.ts` proves the
  // SERVER DIES, which is the claim that actually matters — "the container
  // refuses to start" is inferrable from the unit test only if you already
  // believe `index.ts` exits on a `ConfigError`.
  //
  // The edit is the one somebody would plausibly make: not deleting the block,
  // but softening the condition while it still reads as a check. A deleted
  // block is obvious in review; an inverted comparison is not.
  {
    name: "non-live-data-refused-at-startup",
    proves:
      "A deployment can be configured to serve generated or recorded prices " +
      "without asking by name, which is how fabricated data reaches a real " +
      "user. The refusal is what stands there.",
    file: "apps/backend/src/config.ts",
    find: '    nonLiveMarketData !== "permitted"',
    replace: '    nonLiveMarketData === "permitted"',
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "src/config.test.ts",
    ],
    expect: "refuses a provider that does not serve the live market",
    // **`build: true`, and it was added after the break left a polluted
    // `dist/` behind.** The vitest command reads `src/` directly, so nothing
    // about going red needs a build — but `index.process.test.ts` spawns
    // `dist/index.js`, and `pnpm verify` runs it. Without this the harness
    // restores the source byte-identical and leaves the SABOTAGED build on
    // disk, where the next thing to read it is a suite that then fails for a
    // reason that no longer exists.
    //
    // It was found by running the built server by hand, which is the check
    // `CLAUDE.md` puts first: the server started and served fixture prices
    // while every test was green.
    build: true,
  },
  {
    name: "the-tape-check-gets-validated",
    proves:
      "Somebody 'tidies' `0010_market_bars_feed.sql` by dropping NOT VALID, and " +
      "the next deploy validates the check: a full read of the heap \u2014 " +
      "6.2 s on a laptop over 48.8 million rows, ~508 s on the deployed tier's " +
      "10 MiB/s \u2014 inside `timeout 120 pnpm migrate` and Kysely's single " +
      "transaction. The deploy rolls back with nothing applied, at merge time, " +
      "and the migration looks correct in review (Task 3.7.2, ADR 0034).",
    file: "apps/backend/migrations/0010_market_bars_feed.sql",
    find: "        check (feed in ('iex', 'sip', 'synthetic', 'replay'))\n        not valid;",
    replace:
      "        -- pnpm break: reverted automatically\n" +
      "        check (feed in ('iex', 'sip', 'synthetic', 'replay'));",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "stays NOT VALID",
  },
  {
    name: "the-tape-default-lies-about-the-past",
    proves:
      "The column's default names a tape the pre-existing rows did NOT come " +
      "from. Every bar stored before `0010` is the consolidated SIP tape; a " +
      "default of `iex` would relabel 48.8 million of them as a single venue " +
      "without touching one, and the ledger \u2014 still saying `sip` \u2014 " +
      "would disagree with every bar under it (Task 3.7.2, ADR 0034).",
    file: "apps/backend/migrations/0010_market_bars_feed.sql",
    find: "    add column feed text not null default 'sip';",
    replace:
      "    -- pnpm break: reverted automatically\n" +
      "    add column feed text not null default 'iex';",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "does not know the column exists",
  },
  {
    name: "the-writer-stamps-a-constant",
    proves:
      "The writer takes each bar's tape from the series' own provenance and " +
      "not from a literal. A constant `sip` is true of every bar the backfill " +
      "writes today and false of the fixture provider's `synthetic` series " +
      "and of Story 3.8's `iex` \u2014 the row would carry the wrong tape " +
      "with nothing else wrong (Task 3.7.3, criterion 1). Needs a database, " +
      "so it lives outside `verify`.",
    file: "apps/backend/src/market-bars.ts",
    find: "            batch,\n            source.feed,\n          );",
    replace:
      "            batch,\n" +
      '            "sip", // pnpm break: reverted automatically\n' +
      "          );",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "reads back with `synthetic` on every bar",
  },
  // **Retired 2026-09-23 by Task 3.8.3, and this note is the record.** The
  // entry here proved the OVERLAP refusal: an IEX series overlapping stored SIP
  // bars was rejected before a row was touched. Task 3.7.4 wrote it saying the
  // refusal existed so that Story 3.8's decision would not be taken in passing.
  // Story 3.8 then took that decision deliberately — `0011` makes a second tape
  // a second ROW rather than a collision, so the overlap is now the point of
  // the column and the refusal is gone from `ForeignSourceReason`. A break
  // whose defect is no longer a defect is deleted rather than repointed. The
  // two refusals that remain, `stitched` and `provider`, keep their own
  // entries; `the-second-tape-is-folded-into-the-first` below still holds the
  // read side.
  {
    name: "the-second-tape-is-folded-into-the-first",
    proves:
      "A stored window holding two tapes is read back as two sources in " +
      "contribution order. With the run split disabled every bar joins the " +
      "first stretch and an IEX afternoon is served under `sip` \u2014 " +
      "invariant 6 failing with nothing else wrong (Task 3.7.5, criterion " +
      "2). Needs a database, so it lives outside `verify`.",
    file: "apps/backend/src/market-bars.ts",
    find: "    if (current?.feed !== row.feed) {",
    replace:
      "    if (current === undefined) { // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "two sources, in that order",
  },
  {
    name: "the-sources-are-written-by-hand",
    proves:
      "A served series' sources reach the wire without passing through " +
      "`mergeSeriesProvenance`, whose adjustment check is the reason the " +
      "function is the only route to a multi-source record (Task 3.7.5, " +
      "criterion 2). The invariant reads the file, because two identical " +
      "arrays cannot be told apart by a test.",
    file: "apps/backend/src/market-bars.ts",
    find: "    : mergeSeriesProvenance(first, second, ...more);",
    replace:
      "    : ({ adjustment: first.adjustment, sources: [first.sources[0], second.sources[0], ...more.map((p) => p.sources[0])] } as SeriesProvenance); // pnpm break: reverted automatically",
    command: ["pnpm", "invariants"],
    expect: "writes a `sources:` array by hand",
  },
  {
    name: "a-live-answer-is-held-across-the-minute-it-changes",
    proves:
      "A chart of the session in progress is served a minute behind the store. " +
      "The live answer's lifetime was a ROLLING minute measured from the " +
      "request, so it straddled the boundary its own argument appealed to: " +
      "written at :30 it was still served at the next minute's :05, by which " +
      "time the writer had stored that minute's bar. Up to 59 seconds of a " +
      "chart one bar behind, with nothing on it saying so.",
    file: "apps/backend/src/series-cache.ts",
    find: "            liveAnswerTtlMs(now),",
    replace:
      "            LIVE_ANSWER_TTL_MS, // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "src/series-cache.test.ts",
    ],
    expect: "expires a live window AT the minute boundary",
  },
  {
    name: "the-last-close-compares-one-minute-with-itself",
    proves:
      "The universe table prints a fabricated move. `readLastCloses` takes " +
      "the newest TWO ROWS and calls them (last, previous); since ADR 0035 a " +
      "minute may hold a row per tape, so on a reconciled window those two " +
      "rows are one instant twice and the percentage is computed between the " +
      "consolidated close and the single-venue close of the SAME minute. It " +
      "does not throw \u2014 it renders, correctly formatted and correctly " +
      "coloured. Needs a database, so it lives outside `verify`.",
    file: "apps/backend/src/market-bars.ts",
    find:
      '            .distinctOn("market_bars.observed_at")\n' +
      '            .select(["market_bars.observed_at", "market_bars.close"])',
    replace:
      "            // pnpm break: reverted automatically\n" +
      '            .select(["market_bars.observed_at", "market_bars.close"])',
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "compares two instants rather than one instant twice",
  },
  {
    name: "the-served-minute-keeps-both-its-rows",
    proves:
      "A chart request over a reconciled session is a 500 for every reader. " +
      "ADR 0035 keeps both tapes and `0011` lets the key hold them, so a " +
      "minute may carry two rows; `toBarSeries` refuses bars that are not " +
      "strictly ascending by instant and THROWS, which the route answers as a " +
      "500 on a page load. Without the `distinct on`, `readSeries` hands it " +
      "both rows. Needs a database, so it lives outside `verify`.",
    file: "apps/backend/src/market-bars.ts",
    // **Re-anchored by Task 3.8.5**, and caught by `every-break-can-still-land`
    // rather than by review. That task gave `readLastCloses` the same
    // `distinctOn` at a deeper indent, and an eight-space anchor is a
    // SUBSTRING of a twelve-space one — so this entry began matching twice and
    // could no longer land. The anchor now carries the line after it, which
    // differs between the two call sites.
    find:
      '        .distinctOn("market_bars.observed_at")\n' + "        .select([",
    replace:
      "        // pnpm break: reverted automatically\n" + "        .select([",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "serves a window whose minutes each hold two tapes",
  },
  {
    name: "the-live-writer-claims-the-whole-session",
    proves:
      "The live writer's ledger claim ends at the last bar it holds. Claim " +
      "more and `planRequests` finds the session WHOLLY INSIDE the covered " +
      "window and skips it \u2014 so tonight's backfill never fetches the " +
      "consolidated version and the store keeps a thin one-venue session " +
      "permanently, with no collision, no error and nothing on any screen " +
      "(Task 3.8.1's finding, Task 3.8.3's decision). Needs a database, so " +
      "it lives outside `verify`.",
    file: "apps/backend/src/live-bar-writer.ts",
    find: "    new Date(last.bar.startsAt.getTime() + MINUTE_MS),",
    replace:
      "    new Date(last.bar.startsAt.getTime() + 8 * 60 * MINUTE_MS), // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "claims only the minutes it holds",
  },
  {
    name: "the-tape-leaves-the-conflict-target",
    proves:
      "The writer's `on conflict` names the four columns the unique key " +
      "covers. With the tape removed the target no longer matches any unique " +
      "index and Postgres refuses the statement outright \u2014 *there is no " +
      "unique or exclusion constraint matching the ON CONFLICT " +
      "specification* \u2014 so every write fails rather than mislabelling " +
      "anything (Task 3.8.2, ADR 0035). Needs a database, so it lives " +
      "outside `verify`.",
    file: "apps/backend/src/market-bars.ts",
    find: '        .columns(["security_id", "timeframe", "observed_at", "feed"])',
    replace:
      '        .columns(["security_id", "timeframe", "observed_at"]) // pnpm break: reverted automatically',
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "ON CONFLICT",
  },
  {
    name: "the-presence-check-forgets-the-tape",
    proves:
      "The pre-read that decides `inserted` against `corrected` is scoped to " +
      "the tape. Without that scope a genuine insert on a second tape matches " +
      "the first tape's row, is counted as a correction, and " +
      "`extendCoverage` never adds it to the ledger's `bar_count` \u2014 the " +
      "ledger UNDER-REPORTS, which is one of the two silent failures " +
      "`market-bars.ts` exists to prevent. Found by a test rather than by " +
      "review (Task 3.8.2).",
    file: "apps/backend/src/market-bars.ts",
    find: '        .where("feed", "=", feed)\n        .where("observed_at", ">=", first.startsAt)',
    replace:
      '        .where("observed_at", ">=", first.startsAt) // pnpm break: reverted automatically',
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "keeps both, with their own numbers",
  },
  {
    name: "a-second-module-queries-the-ledger",
    proves:
      "The ledger has one reader. `stored-sources-only-through-the-merge` " +
      "greps ONE file for a select of the withdrawn `bar_coverage.feed`, " +
      "which is sound only while `market-bars.ts` is the only module that " +
      "builds a query against that table \u2014 the seam `DATA-LAYER.md` " +
      "requires. A second querier could select the column and pass the grep " +
      "(Task 3.7.6).",
    file: "apps/backend/src/store-freshness.ts",
    find: "export function lastCompletedSession(",
    replace:
      "// pnpm break: reverted automatically\n" +
      'const reintroduced = (db) => db.selectFrom("bar_coverage").select("feed");\n' +
      "export function lastCompletedSession(",
    command: ["pnpm", "invariants"],
    expect: "builds a query against",
  },
  {
    name: "the-live-edge-appends-a-correction",
    proves:
      "A corrected minute is APPENDED to the drawn series rather than " +
      "replacing the one it corrects. `toBarSeries` refuses bars that are not " +
      "strictly ascending and throws, and a throw inside a React render takes " +
      "the page down \u2014 so this is a blank page, ~30 s after a bar, on a " +
      "tab that has been open a while. It is the defect Task 3.8.4 already " +
      "paid for on the server side, where it was a 500 on a page load.",
    file: "apps/frontend/src/market/live-series.ts",
    find:
      "  const bars = [...byInstant.entries()]\n" +
      "    .sort(([a], [b]) => a - b)\n" +
      "    .map(([, bar]) => bar);",
    replace:
      "  const bars = [...series.bars, ...inWindow]; // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "live-series",
    ],
    expect: "strictly ascending",
  },
  {
    name: "a-live-stretch-gets-epic-2s-word",
    proves:
      "A second producer of `All US exchanges` appears, which is how one " +
      "venue's bars come to be labelled as the whole consolidated tape \u2014 " +
      "the coverage claim `PRODUCT_SPEC.md` \u00a77.1 forbids, in the one " +
      "place a reader would never look for it (Task 3.9.7).",
    file: "apps/frontend/src/components/SourceNote/source-note.ts",
    find: "export function toSourceNote(",
    replace:
      'const FEED_LABEL = "All US exchanges"; // pnpm break: reverted automatically\nexport function toSourceNote(',
    command: ["pnpm", "invariants"],
    expect: "is produced in 2 place(s)",
  },
  {
    name: "a-new-component-spells-the-consolidated-word",
    proves:
      "A component written AFTER the guard was — the landing screen's source " +
      "note — spells `All US exchanges` itself. This is the case the check " +
      "could not see until 2026-09-26: it read a hard-coded seven-path array " +
      "of the files that happened to discuss the word on the day it was " +
      "written, so any file added later was outside it and the check stayed " +
      "green. Verified before it was repaired, with this exact edit: the run " +
      "reported `1 of 34 invariants failed` and " +
      "`the-consolidated-word-has-one-producer` was not among them " +
      "(Task 4.2.7).",
    file: "apps/frontend/src/components/OverviewSourceNote/overview-source-note.ts",
    find: 'const STORED_CLOSE_FEED: MarketFeed = "sip";',
    replace:
      'const STORED_CLOSE_FEED: MarketFeed = "sip";\n' +
      'const STORED_CLOSE_LABEL = "All US exchanges"; // pnpm break: reverted automatically',
    command: ["pnpm", "invariants"],
    expect: "is produced in 2 place(s)",
  },
  {
    name: "a-region-grows-its-own-source-note",
    proves:
      "A second provenance note appears on the landing screen — the footnote " +
      "pile `PROVENANCE.md` §1.3's one-note-per-screen rule exists to " +
      "prevent, and the duplicate Task 3.10.9 found and deleted, arriving " +
      "this time inside a region rather than beside a chart. Three regions " +
      "on that screen are deferrals today and 4.3, 4.4 and 4.5 each land one " +
      "with figures in it, so this is the next likely instance rather than a " +
      "hypothetical (Task 4.2.7).",
    file: "apps/frontend/src/components/MarketProxyStrip/MarketProxyStrip.tsx",
    find: "export function MarketProxyStrip({",
    replace:
      "export function StripSourceNote() {\n" +
      '  return <OverviewSourceNote overview={undefined} feed={{ state: "checking" }} />;\n' +
      "} // pnpm break: reverted automatically\n" +
      "export function MarketProxyStrip({",
    command: ["pnpm", "invariants"],
    expect: "is rendered in 2 place(s)",
  },
  {
    name: "a-second-surface-says-the-notes-terms",
    proves:
      "A region draws its own caption out of the SHARED vocabulary — no new " +
      "literal for a feed, so `one-home-for-the-feed-words` is silent, and " +
      "the reader gets the same provenance facts twice on one screen. That " +
      "is the likelier shape of a second note than a renderer inventing a " +
      "feed's label, and nothing caught it before Task 4.2.7.",
    file: "apps/frontend/src/components/MarketProxyStrip/MarketProxyStrip.tsx",
    find: "export function MarketProxyStrip({",
    replace:
      'const STRIP_TERM = "Closing prices"; // pnpm break: reverted automatically\n' +
      "export function MarketProxyStrip({",
    command: ["pnpm", "invariants"],
    expect: "should be written only in",
  },
  {
    name: "the-market-claiming-sentence-gets-a-second-home",
    proves:
      "The silent-window sentence goes back to being a literal in the drawn " +
      "strip beside the one in its spoken twin \u2014 two copies of the only " +
      "sentence this product ships that claims something about the MARKET " +
      "rather than about our store. The fact it carries is how wide a claim " +
      "the series' feeds entitle it to make, so a correction applied to one " +
      "copy leaves the other reporting one exchange's silence as everybody's " +
      "(Task 3.9.8).",
    file: "apps/frontend/src/components/PriceChart/VolumeReading.tsx",
    find: "return <span className={styles.flat}>{describeSilence(feeds)}</span>;",
    replace:
      "return (\n      <span className={styles.flat}>\n        No shares changed hands anywhere in the window.\n      </span>\n    ); // pnpm break: reverted automatically",
    command: ["pnpm", "invariants"],
    expect: "is produced in 2 place(s)",
  },
  {
    name: "the-two-feed-state-is-typed-again",
    proves:
      "The two-feed fixture goes back to being a recorded body with one " +
      "field changed. That state is what this product's whole provenance " +
      "design exists for, and a view built by editing another body asserts " +
      "by construction the thing it is supposed to demonstrate \u2014 that a " +
      "two-TAPE record looks like a two-`sip` one with a different letter in " +
      "it. Nothing checked that for two epics (Task 3.9.7).",
    file: "apps/frontend/src/fixtures/bar-series.ts",
    find: "export function barSeriesFixtureRequest(",
    replace:
      "export function twoFeedStitchView() {} // pnpm break: reverted automatically\nexport function barSeriesFixtureRequest(",
    command: ["pnpm", "invariants"],
    expect: "names `twoFeedStitchView` again",
  },
  {
    name: "a-prepared-index-loses-its-adopter",
    proves:
      "A `PREPARED` entry whose `adoptedBy` migration does not exist is " +
      "caught. `pnpm index:prepare` would build the index on every deploy " +
      "and report `waiting for <migration>` for ever \u2014 a fault that " +
      "reads as progress (`migrations/README.md` \u00a79, raised by Task " +
      "3.8.2, mechanised at Story 3.8's close).",
    file: "apps/backend/src/prepare-indexes.ts",
    find: '    adoptedBy: "0011_market_bars_unique_bar_by_tape",',
    replace:
      '    adoptedBy: "0011_market_bars_unique_bar_by_tape_renamed", // pnpm break: reverted automatically',
    command: ["pnpm", "invariants"],
    expect: "name a migration that does not exist",
  },
  {
    name: "the-ledgers-tape-is-read-again",
    proves:
      "The ledger's `feed` column comes back as a read. It is the tape the " +
      "window was OPENED with and nothing else \u2014 withdrawn by Task " +
      "3.7.4, off the domain object since 3.7.5 \u2014 and a reader would " +
      "serve a two-tape window under its first tape (`TAPE.md` \u00a77).",
    file: "apps/backend/src/market-bars.ts",
    find: '      "bar_coverage.provider",\n      // Not `bar_coverage.feed`',
    replace:
      '      "bar_coverage.provider",\n      "bar_coverage.feed", // pnpm break: reverted automatically\n      // Not `bar_coverage.feed`',
    command: ["pnpm", "invariants"],
    expect: "reads the ledger's `feed` column",
  },
  {
    name: "a-second-provider-is-relabelled",
    proves:
      "A series from another provider is refused rather than written under " +
      "the ledger row's provider. The row carries the tape and not the " +
      "provider, so the ledger is the only place a window's provider is " +
      "written and it names one (Task 3.7.4). Needs a database, so it lives " +
      "outside `verify`.",
    file: "apps/backend/src/market-bars.ts",
    find: "          if (held.provider !== source.provider) {",
    replace:
      "          if (held.provider !== source.provider && false) { // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "refuses a second provider",
  },
  {
    name: "replayed-series-refused-by-the-store",
    proves:
      "A replayed bar can be written to `market_bars`. Its prices are real but " +
      "its instants were re-stamped onto the wall clock, so storing one puts a " +
      "price in the permanent record at a time it did not happen — and nothing " +
      "downstream could ever tell.",
    file: "apps/backend/src/market-bars.ts",
    find: '      if (source.provider === "replay" || source.feed === "replay") {',
    replace: "      if (false) {",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test:database",
      "src/market-bars.database.test.ts",
    ],
    expect: "refuses a series whose provenance names replay",
    // **The guard has to be RUNTIME and this break is why that is not an
    // opinion.** Task 3.2.7 widened `PROVIDER_IDS`, which widened `schema.ts`'s
    // insert types — so the compiler stopped preventing this write at the same
    // moment migration `0009` made the database check start permitting the
    // value. Neither end refuses it. Removing this one line is all it takes.
    build: true,
  },
  {
    name: "the-workspace-package-leaves-the-bundle",
    proves:
      "The frontend stops bundling `@marketpulse/shared` and nothing says so. " +
      "`tsc` resolves the workspace package through project references and " +
      "the bundler resolves it through `node_modules` — two entirely " +
      "different mechanisms — so a build can typecheck perfectly while the " +
      "browser gets nothing. Story 1.4's render check stood in for this proof " +
      "for five epics BY EXISTING, which is why nobody could delete a " +
      "component gallery from the landing page until Task 4.1.4 made it a " +
      "check instead.",
    file: "packages/shared/src/market-provenance.ts",
    // The live feed's honest sentence, whose one home this file is and whose
    // uniqueness `feed-words-in-a-renderer` keeps. Breaking it HERE rather
    // than in the frontend is the point: the invariant has to notice the
    // PACKAGE leaving the bundle, not a caller changing its mind.
    find:
      '"Trades reported by the IEX exchange only \u2014 not the full US ' +
      'consolidated tape."',
    replace: '"pnpm break: reverted automatically"',
    command: ["pnpm", "invariants"],
    expect: "workspace package",
    // `build: true`, because the check reads `apps/frontend/dist/` — a break
    // that does not reach the bundle proves nothing, and the restore has to
    // reach it too or the next command reads a polluted artefact.
    build: true,
  },
  {
    name: "the-deploy-stops-reading-the-provider",
    proves:
      "The deploy rolls an image over a container app configured to serve a " +
      "replay or a fixture, and nothing stops it. ADR 0030 7b is the ONLY " +
      "preventive mechanism among the replay guards — 7c and 7d are both " +
      "detective and bound the DURATION of a wrong state rather than its " +
      "existence. Task 3.11.7 found that the step had never been written " +
      "while the ADR and `docs/GAPS.md` both asserted it, which is a claim " +
      "about a mechanism reading identically whether the mechanism is there.",
    file: ".github/workflows/deploy.yml",
    find: '          if [ "$provider" != "alpaca" ]; then',
    replace: '          if [ "$provider" != "" ]; then',
    command: ["pnpm", "invariants"],
    expect: "no longer reads the configured provider before it rolls",
    // **The break weakens the assertion rather than deleting the step**, which
    // is the shape the real regression would take: a step that still exists,
    // still runs and still prints the provider, and passes on every value.
    // Deleting the step is the loud version; this is the quiet one.
  },
  {
    name: "replay-refuses-during-a-session",
    proves:
      "A developer who left MARKET_DATA_PROVIDER=replay in their .env can " +
      "build against a recording during a live session while believing they " +
      "are on the real feed — and a replay already running does not stop when " +
      "the bell rings. ADR 0030 §7f is the only guard that reaches that case.",
    file: "apps/backend/src/replay-stream.ts",
    // **Repointed 2026-09-18 after the guard gained a try/catch**, and the
    // harness caught the drift rather than passing: it refuses when a break
    // does not land exactly where its entry says, because a green run against a
    // substitution that never happened proves nothing. That is `CLAUDE.md`'s
    // "when you touch a file an entry names, check the entry", enforced rather
    // than remembered.
    find: '    return marketSessionStateAt(at).status === "open";',
    replace: "    return false;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "src/replay-stream.test.ts",
    ],
    expect: "REFUSES to start while the market is open",
    // The guard is developer-side rather than production-side, which is exactly
    // why it needs a break: nothing about a deployed environment would ever
    // exercise it, so a version that silently stopped working would go
    // unnoticed until somebody spent a session building against a recording.
    build: true,
  },
  {
    name: "market-data-default-is-none",
    proves:
      "Forgetting to configure a market-data provider yields INVENTED PRICES " +
      "rather than no feed at all. The default is the last thing standing " +
      "between a misconfiguration and fabricated data on a real screen.",
    file: "apps/backend/src/config.ts",
    find: 'const DEFAULT_MARKET_DATA_PROVIDER: MarketDataProviderSelection = "none";',
    replace:
      'const DEFAULT_MARKET_DATA_PROVIDER: MarketDataProviderSelection = "fixture";',
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "src/config.test.ts",
    ],
    expect: "does not fire on the default, which serves no market data at all",
    // **The assertion existed since Story 2.6; the break did not, and that is
    // the gap Task 3.2.6 closed.** `PROVIDER.md` §5.3 calls this the most
    // important line in the fixture work — *invented prices must never be
    // reachable by forgetting to configure something* — and until now nothing
    // had ever proved the test that guards it goes red. A default that has
    // never been tested by breaking it is a default nobody has checked.
    //
    // Note it is a DIFFERENT guard from `non-live-data-refused-at-startup`
    // above, which proves the `NON_LIVE_MARKET_DATA` refusal. That one stops a
    // deployment that NAMES a non-live provider; this one stops a deployment
    // that names nothing at all. Two ways to reach fabricated prices, two
    // breaks.
    build: true,
  },
  {
    name: "fixture-in-the-bundle",
    proves:
      "A recorded market body imported by a shipped source file reaches every " +
      "visitor, and the invariant catches it.",
    file: "apps/frontend/src/routes/SecurityExplorer.tsx",
    find: 'import { useNavigate } from "react-router";',
    replace:
      'import { useNavigate } from "react-router";\n' +
      "\n" +
      "// eslint-disable-next-line no-restricted-imports -- pnpm break: reverted automatically\n" +
      'import { BAR_SERIES_FIXTURES } from "../fixtures/bar-series.js";\n' +
      "\n" +
      "// eslint-disable-next-line no-console -- pnpm break: reverted automatically\n" +
      "console.log(JSON.stringify(BAR_SERIES_FIXTURES).length);",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "no-fixture-reaches-the-bundle",
    build: true,
  },

  {
    name: "second-density-breakpoint",
    proves:
      "A media query in the chart's stylesheet is a second home for the 600 px " +
      "density boundary, and the invariant catches it.",
    file: "apps/frontend/src/components/PriceChart/PriceChart.module.css",
    find: ".chart {",
    replace:
      "@media (width < 600px) {\n  .chart {\n    --density: compact;\n  }\n}\n\n.chart {",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-density-breakpoint",
  },

  {
    name: "coverage-edge-matches-the-seam",
    proves:
      "The coverage edge drawn in the session seam's own rhythm is invisible " +
      "where the two coincide, and the invariant catches it.",
    file: "apps/frontend/src/components/PriceChart/chart-marks.module.css",
    find: "stroke-dasharray: 6 3;",
    replace: "stroke-dasharray: 3 3;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "three-dash-rhythms-and-they-differ",
  },

  {
    name: "second-readout-reservation",
    proves:
      "A third plot restating the readout reservation instead of composing it " +
      "puts one decision in two homes, and the invariant catches it.",
    file: "apps/frontend/src/components/PriceChart/PriceChart.module.css",
    find: ".plot {",
    replace: ".plot {\n  min-height: var(--chart-readout-height);",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-readout-reservation",
  },

  {
    name: "route-seeds-initiallycollapsed",
    proves:
      "A route seeding `initiallyCollapsed` reintroduces the collapse-by-" +
      "default Task 2.11.8 declined, and the invariant catches it.",
    file: "apps/frontend/src/routes/SecurityExplorer.tsx",
    find: 'import { useNavigate } from "react-router";',
    replace:
      'import { useNavigate } from "react-router";\n' +
      "\n" +
      "// pnpm break: reverted automatically\n" +
      "const initiallyCollapsed = true;\n" +
      "void initiallyCollapsed;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "initiallycollapsed-stays-unused",
  },

  {
    name: "words-count-elapsed-time",
    proves:
      "A coverage clause recomputed from elapsed time instead of from the axis " +
      "reports a gap across a weekend the picture gives no width to, and the " +
      "invariant catches the derivation going away.",
    file: "apps/frontend/src/components/PriceChart/chart-alternative.ts",
    find: "  const position = positionOfInstant(axis, instant);",
    replace:
      "  const position = Math.round(\n" +
      "    (instant.getTime() - axis.from.getTime()) / 60_000,\n" +
      "  );",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-axis-behind-the-words-and-the-wash",
  },

  {
    name: "ceiling-spelled-twice",
    proves:
      "The cache TTL spelled as its own literal can drift from the max-age the " +
      "header states, and the invariant catches the derivation going away.",
    file: "apps/backend/src/series-cache.ts",
    find: "export const CLOSED_ANSWER_TTL_MS = CLOSED_ANSWER_SECONDS * 1_000;",
    replace: "export const CLOSED_ANSWER_TTL_MS = 300_000;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "the-five-minute-ceiling-stays-derived",
  },

  {
    name: "empty-explanation-twice",
    proves:
      "The empty-window sentence restored to the panel while the plot also " +
      "draws it puts two visible copies inside one region — a Playwright " +
      "strict-mode failure in every browser spec on a store with no bars — and " +
      "the invariant catches the second home.",
    // The break is the change somebody would actually make: putting the
    // sentence back where it used to be, because the plot's copy is easy to
    // miss when reading the panel. That is the reason this check exists rather
    // than a synthetic edit chosen to trip a grep.
    file: "apps/frontend/src/components/BarSeriesPanel/BarSeriesPanel.tsx",
    find: '    case "empty":\n      return null;',
    replace:
      '    case "empty":\n' +
      "      return (\n" +
      "        <p>\n" +
      "          {/* pnpm break: reverted automatically */}\n" +
      "          No bars stored for this window.\n" +
      "        </p>\n" +
      "      );",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "volume-explanation-twice",
    proves:
      "The volume plot's empty sentence re-inlined in the spoken alternative " +
      "puts one fact in two vocabularies — and one of them is the copy no " +
      "sighted reader ever checks — and the invariant catches the second home.",
    // The break is the change somebody would actually make: making the spoken
    // sentence quote the drawn one, on the reasonable-sounding grounds that a
    // listener and a reader should be told the same thing. They should be told
    // the same *fact*; visible text is written to be scanned and an
    // announcement to be heard once, out of context.
    file: "apps/frontend/src/components/PriceChart/chart-alternative.ts",
    find:
      "        `No bars are stored anywhere in the window asked for, ` +\n" +
      "        `${formatMarketRange(view.series.coverage.requested)}, so the whole ` +\n" +
      "        `frame is empty ground.`\n" +
      "      );",
    replace: "        `No volume stored for this window.`\n" + "      );",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "no-history-sentence-twice",
    proves:
      "Case one's price headline re-inlined in the announcement is the drawn " +
      "sentence and the spoken sentence written twice — the drift a screen and " +
      "a screen reader can diverge through with nothing to notice — and the " +
      "invariant catches the second home.",
    // The break is the plausible one: hoisting the visible headline into the
    // live region so the two "cannot disagree". They cannot disagree *because*
    // one of them is derived and the other is written, and quoting a drawn
    // string in a spoken one is the arrangement that guarantees the opposite.
    file: "apps/frontend/src/components/BarSeriesPanel/series-announcement.ts",
    find: '            "no history is stored for this security at this timeframe. A different window will not change that; the store is filled overnight."',
    replace: "            `No history stored for ${symbol} yet.`",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "no-volume-history-sentence-twice",
    proves:
      "Case one's volume headline re-inlined in the volume alternative is the " +
      "fourth of these sentences given a second home, and the invariant " +
      "catches it as surely as the first three.",
    // The break is the same motivation one plot across: the volume plot's
    // spoken sentence quoting its drawn one. It is written out separately
    // because four literals is four hazards — `PROVENANCE.md` §6.3 costed them
    // as four `pnpm break` entries and this is the fourth.
    file: "apps/frontend/src/components/PriceChart/chart-alternative.ts",
    find:
      "          `No volume history is stored for ${symbol} at this timeframe, so ` +\n" +
      "          `the whole frame is empty ground.`",
    replace: "          `No volume history stored for ${symbol} yet.`",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "coverage-sentence-twice",
    proves:
      "The coverage sentence re-inlined in the announcement puts the phrase " +
      "in a second home, which is how one fact becomes two vocabularies — " +
      "the drift a screen and a screen reader can diverge through with " +
      "nothing to notice — and the invariant catches it.",
    // The break is the change somebody would actually make: putting the
    // sentence back where it was assembled until Task 2.14.5, because reaching
    // into a component's `series-facts.ts` from the announcement looks like a
    // layering mistake until you know why it is one function.
    file: "apps/frontend/src/components/BarSeriesPanel/series-announcement.ts",
    find: "        coveragePhrase(view.series),",
    replace:
      "        `holding ${formatCount(view.series.bars.length)} bars, ` +\n" +
      "          `through ${String(view.series.coverage.covered.end)}, ` +\n" +
      "          `of a window running to ${String(view.series.coverage.requested.end)}.`,",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-coverage-phrase",
  },

  {
    name: "feed-words-in-a-renderer",
    proves:
      "A renderer writing its own words for a feed is a claim about US market " +
      "coverage that no vocabulary decided — `PRODUCT_SPEC.md` §7.1 and " +
      "invariant 6 — and the invariant catches the second spelling.",
    // The break is the plausible one rather than a synthetic edit: a fallback
    // label in the component that renders the chrome's feed indicator, for the
    // deployment where no provider is configured. It reads as defensive and it
    // is a coverage claim.
    file: "apps/frontend/src/components/FeedIndicator/FeedIndicator.tsx",
    find: "export function FeedIndicator({",
    replace:
      "// pnpm break: reverted automatically\n" +
      'const FALLBACK_FEED_LABEL = "All US exchanges";\n' +
      "void FALLBACK_FEED_LABEL;\n" +
      "\n" +
      "export function FeedIndicator({",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-feed-words",
  },

  {
    name: "a-renamed-spec-leaves-a-dangling-name",
    proves:
      "A browser spec renamed without its references is invisible to every " +
      "other check here — `pnpm links` resolves Markdown links and these are " +
      "backticked filenames in TypeScript comments. It happened on " +
      "2026-09-19, and the invariant catches it.",
    // The break is the thing that actually occurred rather than a synthetic
    // edit: a comment in one spec naming another that has been renamed away.
    file: "e2e/specs/market-feed.spec.ts",
    find: "`market-connection.spec.ts` owns the other direction",
    replace: "`market-feed-degrades.spec.ts` owns the other direction",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "every-spec-named-in-the-suite-exists",
  },

  {
    name: "a-second-socket-in-the-frontend",
    proves:
      "A second place in the frontend that opens the market socket is a " +
      "connection nothing above it holds state for — and a second place that " +
      "knows the address is a second place that can be pointed at the wrong " +
      "one. `api-client.ts` is the only file that calls `fetch` for the same " +
      "reason, and the invariant catches the socket's version of it.",
    // The break is the plausible one rather than a synthetic edit: the hook
    // that holds the feed's state reaching for a socket of its own, which is
    // exactly the draft `one-home-for-the-socket` went red on when it was
    // first run.
    file: "apps/frontend/src/market/use-live-feed.ts",
    find: "export function useLiveFeed(",
    replace:
      "// pnpm break: reverted automatically\n" +
      "const RECONNECT = (url: string): WebSocket => new WebSocket(url);\n" +
      "void RECONNECT;\n" +
      "\n" +
      "export function useLiveFeed(",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-socket",
  },

  {
    name: "connection-words-in-a-renderer",
    proves:
      "A renderer writing its own sentence about the connection is a second " +
      "spelling of a claim the vocabulary decided — `LIVE-DATA.md` §11.3 is " +
      "explicit that these are a record rather than a string in a component " +
      "— and the invariant catches it.",
    // The break is the plausible one: the component that renders the feed cell
    // growing its own sentence for the deployment where nothing is configured.
    // It reads as helpful and it is the exact duplicate §11.3 forbids.
    file: "apps/frontend/src/components/FeedProvenance/FeedProvenance.tsx",
    find: "export function FeedProvenance(",
    replace:
      "// pnpm break: reverted automatically\n" +
      'const FALLBACK = "No market-data provider is configured.";\n' +
      "void FALLBACK;\n" +
      "\n" +
      "export function FeedProvenance(",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-feed-words",
  },

  {
    name: "straight-apostrophe-on-screen",
    proves:
      "A straight apostrophe in a rendered sentence sets one screen in two " +
      "kinds of punctuation — which typechecks, lints, renders and matches " +
      "every assertion written with the same glyph — and the invariant " +
      "catches it.",
    // The break is the tree as it shipped until 2026-09-15: `BackendIndicator`
    // wrote *the service's address* while `UniverseTable` wrote *the service’s
    // address*, and a backend that was down put both on one screen.
    file: "apps/frontend/src/components/BackendIndicator/BackendIndicator.tsx",
    find: "Something answered at the service’s address, and it was not this service.",
    replace:
      "Something answered at the service's address, and it was not this service.",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-apostrophe-in-the-product-voice",
  },

  {
    name: "search-repeats-the-table",
    proves:
      "Search and the tracked universe render from one fetch, so one failure " +
      "puts both on screen — and a search hint that carries the table's own " +
      "prospect is the same paragraph printed twice, which no browser " +
      "assertion can see when the copy is a clause inside a longer sentence.",
    // The break is the tree as it actually shipped from 2026-09-11 to
    // 2026-09-15: the retryable hint carried the table's prospect verbatim.
    // Restoring it is the whole break, which is the strongest kind — the check
    // is proved against the defect it was written for rather than a synthetic
    // one.
    file: "apps/frontend/src/components/SecuritySearch/SecuritySearch.tsx",
    find:
      '? "Nothing to search yet: the tracked universe is temporarily ' +
      "unavailable. Search comes back when it answers, and the control that " +
      'asks again is with the universe itself."',
    replace:
      '? "Nothing to search yet: the tracked universe is temporarily ' +
      "unavailable. This is usually brief, and the control that asks again is " +
      'with the universe itself."',
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "search-and-the-universe-share-no-words",
  },

  // **Task 3.4.3's two, and they prove the assertion that did not exist.**
  //
  // Story 3.2 shipped three implementations of `MarketDataStream` that nothing
  // constructed. This story found the same shape one level out: three that were
  // constructed and **none of which drove itself**. Both breaks restore the tree
  // as it actually shipped, which is the strongest kind — the check is proved
  // against the defect it was written for rather than a synthetic one.
  {
    name: "fixture-stream-drives-itself",
    proves:
      "A stream a running process constructs reports a healthy connection and " +
      "emits nothing for ever, because the only thing that advances it is a " +
      "test calling tick(). Every other suite drives it by hand, so nothing " +
      "else in the repository can see this.",
    file: "apps/backend/src/fixture-stream.ts",
    find: "      timer = setTimer(() => {\n        stream.tick();\n      }, tickEveryMs);",
    replace:
      "      // pnpm break: reverted automatically — the tree as it shipped\n" +
      "      // until 2026-09-20, with no clock at all.",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "self-driving",
    ],
    expect: "produces a minute with nothing but time passing",
  },

  {
    name: "replay-start-is-a-real-session",
    proves:
      "The replay's default start validates one date and stamps another — the " +
      "candidate's MARKET date against the calendar, the candidate's UTC date " +
      "onto the instant — so before about 04:00 UTC it lands on a day the " +
      "market was shut and the replay reports `live` while emitting nothing.",
    // The tree as it shipped from Task 3.4.2 to Task 3.4.3. The original tests
    // could not see it because every case ran at 12:00:00Z, where the two dates
    // agree — and because they made the same conversion the code did.
    file: "apps/backend/src/market-stream.ts",
    find: "    if (session !== undefined) return session.open;",
    replace:
      "    if (session !== undefined)\n" +
      "      // pnpm break: reverted automatically\n" +
      "      return new Date(\n" +
      "        Date.UTC(\n" +
      "          day.getUTCFullYear(),\n" +
      "          day.getUTCMonth(),\n" +
      "          day.getUTCDate(),\n" +
      "          13,\n" +
      "          30,\n" +
      "          0,\n" +
      "          0,\n" +
      "        ),\n" +
      "      );",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "market-stream",
    ],
    expect: "lands on a real trading session",
  },

  // **Task 3.4.5's, and it is the smallest edit in this file.** The decision
  // Story 3.4 took is that the mark fires when a bar ARRIVES, not when the
  // price CHANGES — and the break is one argument, swapped for the one
  // somebody would naturally reach for.
  {
    name: "the-mark-fires-on-arrival-not-on-change",
    proves:
      "A renderer that keys the arrival mark on the PRICE rather than on the " +
      "observation's instant silently implements `mark on change`, which is " +
      "the opposite of what was decided — and every test that ticks a " +
      "DIFFERENT price passes against it, because the two implementations " +
      "only disagree on the quiet minute.",
    file: "apps/frontend/src/components/SecurityIdentity/SecurityIdentity.tsx",
    find:
      "  const arrival = useArrival(\n" +
      "    symbol,\n" +
      "    observationIdentity(live),\n" +
      "    liveFromSnapshot,\n" +
      "  );",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  const arrival = useArrival(\n" +
      "    symbol,\n" +
      "    live === undefined ? undefined : String(live.close),\n" +
      "    liveFromSnapshot,\n" +
      "  );",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "SecurityIdentity",
    ],
    expect: "fires when a bar arrives with an UNCHANGED close",
  },

  // **Task 3.4.6's, and it restores the tree exactly as Task 3.4.5 shipped it**
  // — which is the strongest kind of break: the check is proved against the
  // defect it was written for rather than a synthetic one.
  {
    name: "a-revision-is-a-bar-arriving-too",
    proves:
      "Keying the arrival mark on the INSTANT leaves a correction unmarked, " +
      "because a revised bar carries the minute it corrects. Three of the " +
      "fourteen revisions measured in one session changed the close, so a " +
      "reader watches the figure move with nothing marking it — the inverse " +
      "of what the mark was decided to mean.",
    file: "apps/frontend/src/components/SecurityIdentity/SecurityIdentity.tsx",
    find:
      "  const arrival = useArrival(\n" +
      "    symbol,\n" +
      "    observationIdentity(live),\n" +
      "    liveFromSnapshot,\n" +
      "  );",
    replace:
      "  // pnpm break: reverted automatically — the tree as 3.4.5 shipped it\n" +
      "  const arrival = useArrival(\n" +
      "    symbol,\n" +
      "    live === undefined ? undefined : String(live.startsAt.getTime()),\n" +
      "    liveFromSnapshot,\n" +
      "  );",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "SecurityIdentity",
    ],
    expect: "fires the mark when a corrected bar replaces the SAME minute",
  },

  // **And the words, which three later stories consume.**
  {
    name: "extended-hours-words-in-a-renderer",
    proves:
      "`pre-market` is a claim about WHEN a price is from, derived from the " +
      "bar's own instant because nothing on the frame distinguishes an " +
      "extended-hours bar. A renderer spelling it itself is a claim no " +
      "vocabulary decided, on a word Stories 3.6, 3.8 and 3.9 all consume.",
    file: "apps/frontend/src/components/SecurityIdentity/SecurityIdentity.tsx",
    find: "              : EXTENDED_HOURS_WORDS[extendedHours],",
    replace:
      "              : // pnpm break: reverted automatically\n" +
      '                extendedHours === "pre_market"\n' +
      '                ? "pre-market"\n' +
      '                : "after-hours",',
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-feed-words",
  },

  // **Task 3.4.7's, and it is `docs/GAPS.md` entry 11 becoming mechanical.**
  // The defect shipped for a few hours on 2026-09-21 and nothing below a
  // browser could see it: no stylesheet is applied in the component tests, so
  // a computed opacity is not a question that level can ask.
  {
    name: "the-mark-does-not-outlive-its-motion",
    proves:
      "An animation of ZERO duration applies no keyframe styles at all, so an " +
      "element whose visible state lives only in its keyframes falls back to " +
      "the CSS initial value. Without a base `opacity`, reduced motion turns " +
      "the arrival mark into a PERMANENT dot — the opposite of the vocabulary " +
      "it belongs to, because a mark that persists reads as a state.",
    // **Repointed 2026-09-21 by Task 3.6.2, which moved the base it guards.**
    // The disc, its ink, its `opacity: 0` and its decay went to a shared
    // motion layer when the mark acquired a second consumer, so the defect
    // this break performs now lands in one file and reaches BOTH surfaces —
    // which makes it a stronger break than it was, not a weaker one: under
    // reduced motion it would leave a permanent dot on the identity block and
    // on 518 table rows at once.
    // **RESTART `pnpm dev` BEFORE RUNNING THIS — 2026-09-25, Task 3.11.10.**
    // It reported *did NOT go red* against a dev server that had been up for
    // two hours, and went red on the first run after a restart with the break
    // applied. `CLAUDE.md` already carries the cause — *a `composes` change
    // does not reliably hot-reload* — and what was missing is that it applies
    // to `pnpm break`, where the symptom is a FALSE ALL-CLEAR rather than a
    // stale screen. Every entry whose `file` is a CSS module has this.
    file: "apps/frontend/src/styles/motion.module.css",
    find: "  opacity: 0;\n\n  /*\n   * **Decays rather than loops.**",
    replace:
      "  /* pnpm break: reverted automatically — the tree as 3.4.5 shipped it */\n\n  /*\n   * **Decays rather than loops**",
    command: ["pnpm", "e2e", "security-price-motion.spec.ts", "--anyway"],
    expect: "the mark is INVISIBLE under reduced motion",
  },

  // **Task 3.4.8's, and it is the layout half of that task's acceptance.**
  // The timing figures were a throwaway instrument and are gone; this is the
  // claim that can go wrong later, so it stays.
  {
    name: "an-arrival-moves-nothing",
    proves:
      "The arrival mark takes layout space, so every price update shifts the " +
      "figure beside it. `a value that changes width must not move anything " +
      "around it` is why the numerals are tabular, and nothing below a " +
      "browser can see a block that jumps on every tick — jsdom computes no " +
      "layout at all.",
    file: "apps/frontend/src/components/SecurityIdentity/SecurityIdentity.module.css",
    // **The first draft of this break did NOT go red**, which is the rule in
    // `CLAUDE.md` catching itself: swapping `absolute` for `static` leaves an
    // **inline** `<span>`, and `width`/`height` do not apply to a non-replaced
    // inline box — so the mark collapsed to nothing and shifted nothing.
    // `inline-block` is the version that actually takes the 8 px.
    //
    // **Repointed 2026-09-21 by Task 3.6.2.** `.arrival` now takes its
    // appearance from the shared motion layer and declares only its position
    // here, so the rule no longer opens with `position: absolute` — the
    // `composes:` line does. The substitution targets the declaration rather
    // than the top of the rule.
    find:
      '  composes: arrivalMark from "../../styles/motion.module.css";\n' +
      "  position: absolute;",
    replace:
      "  /* pnpm break: reverted automatically */\n" +
      '  composes: arrivalMark from "../../styles/motion.module.css";\n' +
      "  display: inline-block;",
    command: ["pnpm", "e2e", "security-price-motion.spec.ts", "--anyway"],
    expect: "an arrival moves nothing around the price",
  },

  // **Task 3.4.9's, and it restores the tree exactly as it shipped for four
  // days** — the strongest kind, because the check is proved against the defect
  // it was written for rather than a synthetic one.
  {
    name: "a-slow-browser-grows-a-queue-forever",
    proves:
      "A browser that stops reading grows an unbounded queue inside the " +
      "backend \u2014 measured on 2026-09-21 at 5.1 MB after 100 universe " +
      "batches and 33.6 MB after 600, linear and with no ceiling. It is the " +
      "failure `PRODUCT_SPEC.md` \u00a736 exists to prevent and the hardest kind " +
      "to find later: it appears only on a slow connection during a busy " +
      "session.",
    file: "apps/backend/src/market-gateway.ts",
    find: "    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {",
    replace: "    // pnpm break: reverted automatically\n" + "    if (false) {",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "run",
      "test:process",
      "src/market-gateway.process.test.ts",
    ],
    expect: "stops reading",
  },
  {
    name: "every-browser-gets-the-whole-universe",
    proves:
      "The fan-out ignores what a browser asked for and sends everything to " +
      "everybody \u2014 correct for five symbols and one page, and wrong at 518: " +
      "a security page showing ONE symbol received the whole universe every " +
      "batch, 56.9 KiB measured on the wire for ONE message of 518 " +
      "observations, and discarded 517 of them. The " +
      "cost scales with browsers \u00d7 universe and both only grow. " +
      "(Task 4.8.10, 2026-10-10: the figure used to be written `a minute` " +
      "here and in four other places; the feed is 6.8\u201316.1 batches a " +
      "minute and the per-minute rate is unmeasured.)",
    file: "apps/backend/src/market-gateway.ts",
    find: "      if (!wanted.has(observation.symbol)) continue;",
    replace:
      "      // pnpm break: reverted automatically\n" + "      void wanted;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "run",
      "test:process",
      "src/market-gateway.process.test.ts",
    ],
    expect: "only what it asked for",
  },
  {
    name: "a-subscription-after-a-close-throws",
    proves:
      "The transport sends a subscription whenever it has one, without asking " +
      "the socket whether it can take it \u2014 the shape Story 3.5 shipped. A " +
      "subscription change landing in the 500 ms between the gateway's close " +
      "and the retry's dial then calls `send` on a CLOSING socket, which " +
      "throws; the call comes from a React effect, an effect's throw is a " +
      "render error, and the root has no boundary above `App`, so the PAGE " +
      "GOES BLANK until a reload. `market-reconnect.spec.ts` found it on " +
      "2026-09-22, three tests at once, while Task 3.6.5 ran the gates.",
    file: "apps/frontend/src/market/market-stream-client.ts",
    find: "    if (wanted === undefined || socket.readyState !== OPEN) return;",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    if (wanted === undefined) return;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "market-stream-client",
    ],
    expect: "after the socket closed",
  },
  {
    name: "the-table-ignores-the-live-price",
    proves:
      "The universe table stops handing a row its live observation, so a bar " +
      "arriving changes nothing on the only screen that shows 518 of them \u2014 " +
      "Story 3.6's whole headline, undone in one prop. Every unit test over the " +
      "reducer still passes, because the reducer is right and nothing renders " +
      "it; only a browser watching the row can see it (Task 3.6.6).",
    file: "apps/frontend/src/components/UniverseTable/UniverseTable.tsx",
    find: "                      live={observations.get(security.symbol)}",
    replace:
      "                      // pnpm break: reverted automatically\n" +
      "                      live={undefined}",
    command: ["pnpm", "e2e", "universe-live-update.spec.ts", "--anyway"],
    expect: "changes a row's price",
  },
  {
    name: "the-table-marks-no-arrival",
    proves:
      "A bar arriving in the table draws no mark, so the row changes by " +
      "silently swapping text \u2014 PRODUCT_SPEC.md \u00a75.6's exact " +
      "description of a screen that feels dead. The mark is the same rule the " +
      "identity block composes; losing the handle on the row is invisible to " +
      "every level below a browser (Task 3.6.6).",
    file: "apps/frontend/src/components/UniverseTable/UniverseTable.tsx",
    find: "              data-arrival={arrival}",
    replace:
      "              // pnpm break: reverted automatically\n" +
      "              data-arrival={undefined}",
    command: ["pnpm", "e2e", "universe-live-update.spec.ts", "--anyway"],
    expect: "marks the row that arrived",
  },
  {
    name: "a-price-re-renders-every-symbol-link",
    proves:
      "The row's static half re-renders on every tick \u2014 the state Task " +
      "3.6.1 shipped and Task 3.6.5 measured on a production build at 47 ms " +
      "of script per tick for 518 rows, against \u00a728's 50 ms line, plus " +
      "40 ms every 30 s when the health poll re-rendered the route with " +
      "nothing changed. Removing the memo is invisible on a screen and in " +
      "every presentation test; only a render count sees it.",
    file: "apps/frontend/src/components/UniverseTable/UniverseTable.tsx",
    find: "const RowIdentity = memo(function RowIdentity({",
    replace:
      "// pnpm break: reverted automatically\n" +
      "const RowIdentity = (function RowIdentity({",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "UniverseTable.render-cost",
    ],
    expect: "re-renders no symbol link",
  },
  {
    name: "the-gateway-stamps-nothing",
    proves:
      "Every frame the gateway sends carries a `sentAt` that is not the " +
      "gateway's clock at the send \u2014 here a constant, which is what a " +
      "stamp taken once at module load, or copied from a cached payload, " +
      "would also be. A browser subtracting it would publish a figure about " +
      "nothing, and `PRODUCT_SPEC.md` \u00a728's p95 would read as met or " +
      "missed on a number with no start. The stamp is the whole instrument " +
      "`docs/GAPS.md` entry 12 waited four days for (Task 3.6.4).",
    file: "apps/backend/src/market-gateway.ts",
    find: "  const sentAt = (): string => new Date(wallNow()).toISOString();",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  const sentAt = (): string => new Date(0).toISOString();",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "run",
      "test:process",
      "src/market-gateway.process.test.ts",
    ],
    expect: "from the injected clock",
  },
  {
    name: "the-send-instant-becomes-a-clock",
    proves:
      "The wire's send instant reaches the liveness rule \u2014 a THIRD clock " +
      "reading joining the two `STREAM-SEAM.md` \u00a73 keeps apart. That " +
      "section records what merging two of them did: the 60 s staleness " +
      "comparison could never fire, silently, with every test green. " +
      "`sentAt` is a server clock read on a browser's machine, so it is skew " +
      "as readily as latency; a threshold keyed on it would fire on a viewer " +
      "whose clock is a minute out and never on a feed that has stopped. It " +
      "exists for measurement only (Task 3.6.4, ADR 0033).",
    file: "packages/shared/src/feed-liveness.ts",
    find: "export const STALE_AFTER_MS = 60_000;",
    replace:
      "export const STALE_AFTER_MS = 60_000;\n" +
      "// pnpm break: reverted automatically\n" +
      "export const sentAt = STALE_AFTER_MS;",
    command: ["pnpm", "invariants"],
    // Repointed 2026-09-26 by Task 4.2.4: the failure message names the word
    // now that the check guards two of them.
    expect: "reads `sentAt`",
  },
  // **The second word in `the-send-instant-is-not-a-clock`** (Task 4.2.4).
  // It is a separate entry rather than a widening of the one above because
  // the two words fail differently: `sentAt` is skew, and `computedAt`
  // **moves whenever a browser opens a tab** — so a threshold keyed on it
  // does not merely misfire, it reports a dead feed as healthy for as long as
  // anybody keeps connecting.
  //
  // The substitution is `feed-liveness.ts` rather than `live-feed.ts` for the
  // first entry's reason: the shared rule is where a fourth clock would
  // actually be adopted, and it is the file the guard names first.
  {
    name: "the-aggregate-instant-becomes-a-clock",
    proves:
      "The overview's `computedAt` reaches the liveness rule. It is the " +
      "instant the AGGREGATE was true, and the gateway rebuilds the " +
      "aggregate on every connect, every subscribe and every applied batch " +
      "\u2014 so it advances whenever somebody opens a tab, with no market " +
      "data behind it at all. A staleness threshold keyed on it reads a " +
      "**dead feed as `LIVE`** for as long as the gateway keeps " +
      "recomputing, which is the exact inversion the 60 s rule exists to " +
      "prevent (Task 4.2.4, ADR 0033's first constraint generalised).",
    file: "packages/shared/src/feed-liveness.ts",
    find: "export const STALE_AFTER_MS = 60_000;",
    replace:
      "export const STALE_AFTER_MS = 60_000;\n" +
      "// pnpm break: reverted automatically\n" +
      "export const computedAt = STALE_AFTER_MS;",
    command: ["pnpm", "invariants"],
    expect: "reads `computedAt`",
  },
  {
    name: "a-deploy-strands-every-open-tab",
    proves:
      "The browser's socket never comes back, which is the state Story 3.3 " +
      "shipped and this product lived with: EVERY backend deploy left EVERY " +
      "open tab reading `DISCONNECTED` until somebody reloaded, and deploys " +
      "happen on every merge to `main`. The retry is a few lines and its " +
      "absence is invisible until a socket dies \u2014 which nothing below a " +
      "browser can make happen.",
    file: "apps/frontend/src/market/use-live-feed.ts",
    find: '          if (event.kind === "closed") scheduleRetry(event.code);',
    replace:
      "          // pnpm break: reverted automatically\n" +
      "          void scheduleRetry;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "use-live-feed",
    ],
    expect: "dials again after the socket closes",
  },
  {
    name: "the-snapshot-marks-every-security-as-arriving",
    proves:
      "The arrival mark fires on the snapshot, so every page load announces " +
      "518 securities as news \u2014 the thing the reader has just asked to " +
      "see. Story 3.4's disc means *a bar arrived for this security*; a " +
      "snapshot is *what we already held when you connected*. The identity " +
      "block mounts BEFORE the socket delivers, so without this branch the " +
      "figure goes from absent to a price and that is indistinguishable from " +
      "an arrival. A mark that fires every visit means nothing, and it would " +
      "take the rest of the vocabulary with it.",
    file: "apps/frontend/src/components/SecurityIdentity/SecurityIdentity.tsx",
    find:
      "  if (fromSnapshot) {\n" +
      "    if (observation !== mounted.observation)\n" +
      "      setMounted({ symbol, observation });\n" +
      "    return undefined;\n" +
      "  }",
    replace: "  // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "SecurityIdentity",
    ],
    expect: "fire on a SNAPSHOT",
  },
  {
    name: "a-short-acknowledgement-goes-unreported",
    proves:
      "The server acknowledges fewer symbols than we asked for and nothing " +
      "says so. \u00a74.2 measured that the acknowledgement is the FULL CURRENT " +
      "STATE rather than a delta, so the server is authoritative about what " +
      "we hold \u2014 which makes a shortfall a fact rather than an inference, " +
      "and counting it is the control that made the original cap measurement " +
      "mean anything.",
    file: "apps/backend/src/alpaca-stream.ts",
    find: "      if (symbolCount !== symbols.length) {",
    replace:
      "      // pnpm break: reverted automatically\n" + "      if (false) {",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "alpaca-stream.test",
    ],
    expect: "shortfall",
  },

  {
    name: "an-empty-subscription-is-sent-to-the-vendor",
    proves:
      "An empty `bars` list reaches Alpaca, which \u00a74.4 measured returns " +
      "`400 invalid syntax`. That is the frame a `status` filter matching " +
      "nothing \u2014 or a universe that failed to load \u2014 produces, so the " +
      "failure arrives looking like a protocol bug rather than like our own " +
      "empty selection.",
    file: "apps/backend/src/alpaca-stream.ts",
    find: "    if (symbols.length === 0) {",
    replace: "    // pnpm break: reverted automatically\n" + "    if (false) {",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "alpaca-stream.test",
    ],
    expect: "refused-empty",
  },

  {
    name: "the-upstream-set-stops-being-the-universe",
    proves:
      "The live subscription goes back to a hard-coded literal, so the " +
      "current market state fills with a handful of securities while every " +
      "reader outside this epic \u2014 Epic 4's overview, Epic 5's scores, Epic " +
      "7's tools \u2014 believes it holds the tracked market. Deriving the set " +
      "from the universe is also what makes *a symbol outside the universe " +
      "cannot reach the subscribe frame* true by construction.",
    file: "apps/backend/src/market-stream.ts",
    find: "export const STREAM_SYMBOLS: readonly Ticker[] = trackedTickers();",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export const STREAM_SYMBOLS: readonly Ticker[] = trackedTickers().slice(\n" +
      "  0,\n" +
      "  5,\n" +
      ");",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "stream-subscription",
    ],
    expect: "tracked universe rather than a literal",
  },
  // **The break is written before the frame it forbids** (Task 4.2.1), so it
  // cannot substitute a wrong call for a right one — there is no right one
  // yet. It **creates** the shape instead: an overview frame broadcast from
  // `publishFeedState`, which is precisely the defect, written the way
  // somebody would plausibly write it (beside the existing broadcast, in the
  // handler that already has a `broadcast` in scope).
  //
  // The substituted code does not typecheck — `"overview"` is not on the wire
  // union yet — and that is fine: `pnpm invariants` is a grep over the source
  // and needs no build, which is why this entry has no `build: true`. When
  // Story 4.2 adds the frame type, this break stops being a compile error and
  // starts being exactly the merge somebody could make.
  {
    name: "the-overview-frame-rides-the-heartbeat",
    proves:
      "The overview frame is broadcast from `publishFeedState`, the path Task " +
      "4.1.6 measured at **~332 `feed` frames a minute** on the deployed " +
      "gateway \u2014 `alpaca-stream.ts` calls `apply()` inside the " +
      "per-vendor-item loop and `index.ts` answers every `onConnectionChange` " +
      "with `publishFeedState()`. **That defect was repaired on 2026-10-11 " +
      "by Task 4.7.7** \u2014 the send site now gates on a change to the " +
      "published view \u2014 so the rate no longer reaches a browser; what " +
      "has not changed is that `publishFeedState` is still CALLED ~332 " +
      "times a minute, so an unsuppressed frame put on this path still " +
      "inherits the rate. An aggregate over 518 securities here would be " +
      "sent ~332 times a minute instead of once, to every browser " +
      "regardless of subscription, with no suppression covering it.",
    file: "apps/backend/src/market-gateway.ts",
    // **Repointed 2026-10-11 (Task 4.7.7)**, which moved the body this
    // anchored on. The anchor is the six-space `broadcast(feedMessage(state))`
    // \u2014 unique in the file, because the keepalive's copy is at four.
    find: "      broadcast(feedMessage(state));",
    replace:
      "      // pnpm break: reverted automatically\n" +
      "      broadcast(feedMessage(state));\n" +
      "      broadcast(\n" +
      "        encodeMarketStreamMessage({\n" +
      '          type: "overview",\n' +
      "          version: MARKET_STREAM_PROTOCOL_VERSION,\n" +
      "          sentAt: sentAt(),\n" +
      "        }),\n" +
      "      );",
    command: ["pnpm", "invariants"],
    expect: "mentions the overview frame",
  },
  // **The second break for one check, and it exists because a review broke
  // the FIRST version of that check three ways** (Task 4.2.1). The original
  // sliced its regions by counting braces from the next `{` after a marker,
  // and an ordinary refactor — destructuring the handler's parameter — made
  // the "body" the destructuring pattern, so an overview publish on the line
  // after `publishFeedState()` reported `30 invariants hold.`
  //
  // The check no longer looks for a brace; this entry is what says so. It is
  // the shape somebody actually produces, not an adversarial one: nothing
  // about `({ phase, subscribedSymbols }) =>` is wrong, and the whole point
  // is that the guard must survive it.
  //
  // `CLAUDE.md`: *a fix nobody has seen fail is the thing this repository
  // refuses.*
  {
    name: "the-destructured-handler-hides-the-overview-frame",
    proves:
      "The heartbeat guard can be walked past by destructuring a parameter. " +
      "With a brace-counting region slice, " +
      "`onConnectionChange: ({ phase, subscribedSymbols }) => {` makes the " +
      "inspected region the destructuring pattern rather than the handler " +
      "body \u2014 so a publish on the line after `gateway.publishFeedState()` " +
      "is invisible, on the exact ~332-frames-a-minute path the check exists " +
      "to refuse (Task 4.1.6, measured on the deployed gateway). Going red " +
      "is what proves the regions are delimited by the file's formatted " +
      "shape instead.",
    file: "apps/backend/src/index.ts",
    find:
      "    onConnectionChange: (connection) => {\n" +
      "      app.log.debug(\n" +
      "        { phase: connection.phase, symbols: connection.subscribedSymbols },\n" +
      '        "market stream connection changed",\n' +
      "      );\n" +
      "      gateway.publishFeedState();\n" +
      "    },",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    onConnectionChange: ({ phase, subscribedSymbols }) => {\n" +
      "      app.log.debug(\n" +
      "        { phase, symbols: subscribedSymbols },\n" +
      '        "market stream connection changed",\n' +
      "      );\n" +
      "      gateway.publishFeedState();\n" +
      '      gateway.publishOverview({ type: "overview" });\n' +
      "    },",
    command: ["pnpm", "invariants"],
    expect: "mentions the overview frame",
  },
  {
    name: "a-second-subscriber-on-the-upstream-socket",
    proves:
      "Two things subscribe to one market socket \u2014 the defect Task 3.5.2 " +
      "removed. It is not untidy, it is TWO POLICIES: the gateway broadcast " +
      "the raw batch while the current market state drops a revision for a " +
      "minute already passed, so they disagreed about what had happened and " +
      "nothing said which was authoritative. The free plan also allows ONE " +
      "connection, so the count has a bill attached.",
    file: "apps/backend/src/index.ts",
    find: "  registerMarketStreamCloser(unsubscribe);",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  stream.subscribe([], {\n" +
      "    onObservations: (batch) => void batch,\n" +
      "    onConnectionChange: (connection) => void connection,\n" +
      "  });\n" +
      "  registerMarketStreamCloser(unsubscribe);",
    command: ["pnpm", "invariants"],
    expect: "subscribe to the market stream",
  },
  {
    name: "the-figures-lose-their-reservation",
    proves:
      "The chart and the window control move 90 px when an answer with bars " +
      "replaces one without. `Figures` returned `null` in the four states " +
      "with no readable series until Task 3.8.3, so `.reading` collapsed and " +
      "everything under it rose \u2014 including the segmented control the " +
      "reader has just pressed. jsdom computes no layout, so the unit half " +
      "asserts the structure the height depends on; the browser half is " +
      "`security-window-change.spec.ts`.",
    file: "apps/frontend/src/components/BarSeriesPanel/BarSeriesPanel.tsx",
    find: "  if (series === null) return <FiguresReservation />;",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  if (series === null) return null;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "BarSeriesPanel",
    ],
    expect: "keeps one figures strip in every state",
  },
  {
    name: "bars-check-calls-a-reconciled-session-a-fault",
    proves:
      "`pnpm bars:check` puts a red line under every security on the night " +
      "its output matters most. `bar_coverage.bar_count` counts ROWS, and " +
      "since ADR 0035 a minute may hold one per tape \u2014 measured at 430 " +
      "rows over a 390-minute session in Task 3.8.9's rehearsal. At a " +
      "threshold of one row a minute, a correctly reconciled session is " +
      "reported as an invariant violation: the tool's loudest line, firing on " +
      "the thing the whole story was built to make safe.",
    file: "apps/backend/src/bar-completeness.ts",
    find: "const MAX_ROWS_PER_MINUTE = 2;",
    replace:
      "const MAX_ROWS_PER_MINUTE = 1; // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "src/bar-completeness.test.ts",
    ],
    expect: "says nothing about a session reconciled from two tapes",
  },
  {
    name: "the-store-claims-one-securitys-frontier-as-its-own",
    proves:
      "The universe summary promises a date 178 securities do not reach. " +
      "`through` took the MAXIMUM end date across the universe, which was the " +
      "same as the minimum while only a nightly backfill wrote bars \u2014 the " +
      "code said so and named the condition that would end it. Storing the " +
      "live session ended it: the feed is one venue carrying 65.1% of a " +
      "median name's minutes, so during a session the maximum is one " +
      "security's reach presented as the store's.",
    file: "apps/frontend/src/components/UniverseTable/coverage.ts",
    find: "    if (through === null || end < through) through = end;",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    if (through === null || end > through) through = end;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "src/components/UniverseTable/coverage.test.ts",
    ],
    expect: "reports the day EVERY security reaches",
  },
  {
    name: "the-store-is-told-only-what-is-news",
    proves:
      "Every revision for a minute the live path has already moved past is " +
      "dropped on the floor. The current market state drops a superseded " +
      "revision on purpose \u2014 it is not news \u2014 but it is still true, " +
      "and \u00a714.1 measured 35.3% of revisions changing the close. Handing " +
      "the writer the APPLIED list instead of the TRACKED one makes this " +
      "product's stored history permanently and knowably wrong for a fraction " +
      "of bars, with nothing to report it.",
    file: "apps/backend/src/index.ts",
    find: "      void liveBarWriter.store(observed.tracked).then(",
    replace:
      "      // pnpm break: reverted automatically\n" +
      "      void liveBarWriter.store(observed.applied).then(",
    command: ["pnpm", "invariants"],
    expect: "does not hand the live bar writer",
  },
  {
    name: "the-live-stream-loses-its-consumer",
    proves:
      "The process discards every live observation again \u2014 the state this " +
      "product was in until Task 3.5.1, where a unit suite over the " +
      "current-state object passes either way. Three defects of this exact " +
      "family have shipped with `pnpm verify` green: something that exists in " +
      "one layer and cannot be reached from the next.",
    file: "apps/backend/src/index.ts",
    // **Re-anchored by Task 3.5.2**, which restructured this line. The old
    // `find` no longer matched and `pnpm break` said so rather than passing —
    // which is the entry doing its job: a break that cannot land is a check
    // nobody is testing. The new form is also a better regression than the old
    // one: it broadcasts the RAW batch instead of what the state applied,
    // which is precisely the divergence this task removed.
    //
    // **Re-anchored again by Task 3.8.3, and the anchor MOVED rather than
    // being re-spelled.** That task split the call in two so the live bar
    // writer could take the applied list. Re-pointing at the broadcast line
    // alone would have left `currentMarketState.observe(` on the line above —
    // still present, so the invariant would still have passed and the break
    // would have gone red only on `every-break-can-still-land`. A break that
    // fails for the wrong reason proves nothing, which the harness says in as
    // many words. So the substitution now removes the `observe` call itself,
    // which is the wiring the invariant is about.
    // **Re-anchored a THIRD time by Task 3.8.7**, and the reason is the same
    // as 3.8.3's: the line this sits on keeps being the one a task changes,
    // because it is where the stream meets everything downstream. That task
    // split the return value into two lists, so the binding is `observed`.
    // The substitution still removes the `observe` call, which is the wiring
    // the invariant is about.
    find: "      const observed = currentMarketState.observe(observations);",
    replace:
      "      // pnpm break: reverted automatically\n" +
      "      const observed = { applied: observations, tracked: observations };",
    command: ["pnpm", "invariants"],
    expect: "does not feed the market stream",
  },
  {
    name: "the-current-state-holds-an-untracked-security",
    proves:
      "`UNIVERSE.md` \u00a712.2 makes `status` an INVISIBLE PREDICATE \u2014 one " +
      "invisible predicate is a design and two is a bug waiting for whoever " +
      "forgets. The current market state is a computation over *the market we " +
      "track now*, so it filters to `active`; Story 3.8's stored read path " +
      "deliberately does not, and a reader who makes the two agree breaks one " +
      "of them. Nothing but this test says so.",
    file: "apps/backend/src/current-market-state.ts",
    // **Re-anchored by Task 3.8.7**, which renamed the local binding: the
    // option is still `tracked`, but `tracked` is now also the name of a list
    // `observe` returns, so the universe set is destructured as `universe`.
    find: "        if (!universe.has(observation.symbol)) continue;",
    replace:
      "        // pnpm break: reverted automatically\n" +
      "        if (false) continue;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "current-market-state",
    ],
    expect: "outside the tracked universe",
  },
  {
    name: "the-chrome-inherits-epic-2s-word-again",
    proves:
      "The chrome's venue goes back to naming the HISTORICAL provider's tape " +
      "while a live socket reports a different one \u2014 which is what shipped " +
      "from 2026-09-21 and was seen on the deployed site as `ALL US " +
      "EXCHANGES` beside prices that were entirely IEX. Two true halves, one " +
      "false impression, and `PRODUCT_SPEC.md` \u00a77.1's own sentence " +
      "breached on every route (Task 3.10.6).",
    file: "apps/frontend/src/components/AppFooter/venue.ts",
    find: "  if (live.feed === null) return configured;",
    replace:
      "  // pnpm break: reverted automatically\n" +
      '  if (configured.state === "configured") return configured;\n' +
      "  if (live.feed === null) return configured;",
    command: ["pnpm", "--filter", "@marketpulse/frontend", "test", "venue"],
    expect: "never puts a venue beside a live tape that is not it",
  },
  {
    name: "a-failed-refill-wipes-the-chart",
    proves:
      "A refetch NOBODY ASKED FOR turns a working chart into an error " +
      "message. The refill goes out because a socket came back, not because " +
      "a reader pressed anything, and a page that was drawing a correct " +
      "answer must not lose it because that request did not come back — " +
      "which is `PRODUCT_SPEC.md` §36's global error screen arriving " +
      "locally. On a socket that dropped 38 times in 4h 36m (2026-09-22) " +
      "this is a chart that breaks every few minutes (Task 3.10.7).",
    file: "apps/frontend/src/market/use-bar-series.ts",
    find:
      "          if (\n" +
      "            quiet &&\n" +
      '            result.outcome !== "ok" &&\n' +
      '            previous.view.state !== "loading"\n' +
      "          )\n" +
      "            return previous;",
    replace: "          // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "use-bar-series",
    ],
    expect: "leaves the chart alone when the refill fails",
  },
  {
    name: "the-ledger-inherits-epic-2s-word-too",
    proves:
      "The live tail is counted under the STORED tape's name, so IEX bars " +
      "arriving over the socket are listed as `All US exchanges` in the " +
      "source note's ledger — `CLAUDE.md`'s invariant 6 in the ledger " +
      "rather than in the chrome, where Task 3.10.6 repaired the same " +
      "defect. The canvas has drawn the correct shape since Task 2.14.4 " +
      "(`Provenance and the empty answers` §10, Shape B) and nothing " +
      "could produce it from a live edge (Task 3.10.8).",
    file: "apps/frontend/src/market/live-series.ts",
    find: "  const opensAStretch = liveFeed !== null && liveFeed !== last.feed;",
    replace:
      "  const opensAStretch = false; // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "live-series",
    ],
    expect: "gives the live tail its own stretch when its tape differs",
  },
  {
    name: "the-live-row-loses-its-word",
    proves:
      "The stretch still being added to is marked by a DISC alone, so the " +
      "only thing distinguishing *a window the server answered with two " +
      "tapes* from *a window this page is extending over a socket* is a " +
      "4×4 px dot — invisible in greyscale, to a low-vision reader " +
      "and to a listener. Colour is never the sole encoding of anything in " +
      "this product and neither is shape (Task 3.10.8).",
    file: "apps/frontend/src/components/SourceNote/SourceNote.tsx",
    find: "                        arriving",
    replace:
      "                        {/* pnpm break: reverted automatically */}",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "SourceNote",
    ],
    expect: "marks the last stretch, in words as well as a disc",
  },
  {
    name: "the-market-stream-goes-silent-again",
    proves:
      "The vendor client's diagnostic events stop reaching production. " +
      "`createAlpacaStream` has emitted eleven of them since Story 3.2 and " +
      "**nothing passed an `onLog`** until 2026-09-25, so a socket that " +
      "authenticated, a credential that was refused, a watchdog that fired " +
      "and a `406` retried every three seconds were all silent — which " +
      "is why a dead feed ran for about FORTY HOURS unseen from 2026-09-19, " +
      "and why nobody can say what recovered it (Task 3.11.3).",
    file: "apps/backend/src/stream-log.ts",
    find:
      '      if (level === "warn") logger.warn(details, message);\n' +
      "      else logger.info(details, message);",
    replace: "    // pnpm break: reverted automatically",
    command: ["pnpm", "--filter", "@marketpulse/backend", "test", "stream-log"],
    expect: "routes each line to the level it named",
  },
  {
    name: "the-socket-count-stops-filtering",
    proves:
      "The socket count stops filtering by URL and counts every WebSocket on " +
      "the page — which on a dev server includes **Vite's HMR " +
      "connection, twice**. That is exactly how Task 3.10.7 measured `three " +
      "market-stream sockets in twelve seconds` on a page that opens one: " +
      "the wrong number became a `docs/GAPS.md` entry, a floor on the gap " +
      "refill, a paragraph in `CLAUDE.md` and a task, and survived four days " +
      "of being quoted rather than re-run. **Count by URL, never by event** " +
      "(Task 3.11.2).",
    file: "e2e/specs/market-stream-socket-count.spec.ts",
    find: '    if (!ws.url().includes("/market-stream")) return;',
    replace: "    // pnpm break: reverted automatically",
    command: ["pnpm", "e2e", "market-stream-socket-count.spec.ts", "--anyway"],
    expect: "a page opens one market-stream socket and keeps it",
  },
  {
    name: "a-flapping-socket-becomes-a-poll",
    proves:
      "A refill fires on EVERY reconnection with no floor, so a socket that " +
      "churns turns the chart's fetch into a poll — in a hook whose own " +
      "refetch policy says it does not poll. Measured 2026-09-24: an " +
      "ordinary security page opens THREE market-stream sockets in twelve " +
      "seconds (`docs/GAPS.md`), so this is a refetch every four seconds " +
      "rather than a hypothetical. It cost four bisecting runs to attribute, " +
      "because in a browser suite it reads as machine contention (Task " +
      "3.10.7).",
    file: "apps/frontend/src/market/use-bar-series.ts",
    find:
      "    const now = Date.now();\n" +
      "    if (now - lastRefillAt.current < BAR_INTERVAL_MS) return;\n" +
      "    lastRefillAt.current = now;",
    replace: "    // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "use-bar-series",
    ],
    expect: "asks at most once a minute however often the feed flaps",
  },
  {
    name: "a-refill-supersedes-the-request-it-is-waiting-for",
    proves:
      "A refill ABORTS the request already in flight, which is what starting " +
      "one does. For a reader changing the window that is right; for a " +
      "resume it is wrong twice over — the running request was about to " +
      "deliver the same fresh answer, and a socket that flaps aborts each " +
      "refill with the next, so NOTHING ever lands and the page sits on " +
      "`loading` with no answer coming and no control to ask for one (Task " +
      "3.10.7).",
    file: "apps/frontend/src/market/use-bar-series.ts",
    find: "    if (inFlight.current) return;",
    replace: "    // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/frontend",
      "test",
      "use-bar-series",
    ],
    expect: "does not supersede a request that is already running",
  },
  {
    name: "a-resume-does-not-reach-the-page",
    proves:
      "A reconnection updates the store correctly and **never reaches a " +
      "consumer**, because the render gate upstream of the reducer does not " +
      "compare it. The failure is silent in the worst way: every number on " +
      "screen is right, the feed reads `LIVE`, and the minutes lost to the " +
      "dropout are simply never filled. This is Task 3.4.1's defect shape " +
      "with a different field (Task 3.10.7).",
    file: "apps/frontend/src/market/live-feed.ts",
    // **Repointed 2026-09-26 by Task 4.2.4**, which added a term after this
    // one. The old pair took the bare comparison and left the trailing `&&`
    // inside a trailing comment, so the substitution was a PARSE ERROR rather
    // than a missing check — red, but for the wrong reason, which
    // `break-verify.mjs` correctly refuses as evidence. The `&&` now travels
    // with the term.
    find: "    a.resumes === b.resumes &&",
    replace: "    true && // pnpm break: reverted automatically",
    command: ["pnpm", "--filter", "@marketpulse/frontend", "test", "live-feed"],
    expect: "makes a reconnection a change even when nothing else moved",
  },
  // **The same defect shape, a third time** (Task 4.2.4) — Task 3.4.1's for
  // the observations Map, Task 3.10.7's for `resumes`, and this one for the
  // overview aggregate. It is a separate entry rather than a widening because
  // what is LOST differs: there, a gap never filled; here, four figures at the
  // top of the landing page that update in the store and never reach a screen.
  {
    name: "the-aggregate-does-not-reach-the-page",
    proves:
      "The overview arrives, the reducer holds it correctly, and the render " +
      "gate upstream of the reducer does not compare it \u2014 so nothing " +
      "ever draws it. `sameLiveFeedView`'s own comment records what this " +
      "looked like the first time: *a first moving price that does not " +
      "move, with every test green*, because the reducer is right and " +
      "nothing renders. The field was added to the gate in the same change " +
      "as the field itself, which is the only ordering in which this is not " +
      "found by a person looking at a still page (Task 4.2.4).",
    file: "apps/frontend/src/market/live-feed.ts",
    find: "    a.overview === b.overview",
    replace: "    true // pnpm break: reverted automatically",
    command: ["pnpm", "--filter", "@marketpulse/frontend", "test", "live-feed"],
    expect: "makes an arriving aggregate a change even when nothing else moved",
  },
  {
    name: "a-stream-without-a-feed-word",
    proves:
      "A deployment whose chrome can say a CONNECTION word says `no " +
      "market-data provider is configured` three words from it, because the " +
      "feed on the wire comes only from a historical provider and ADR 0030 " +
      "makes a replay produce none. §11.3's grid has had the correct row " +
      "since 2026-09-17 and nothing could reach it.",
    file: "apps/backend/src/routes/market-data.ts",
    find:
      "    feed:\n" +
      "      marketData.provider?.feed ?? feedWithoutAProvider(marketData.selection),",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    feed: marketData.provider?.feed ?? null,",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "market-feed-grid",
    ],
    expect: "also reports a feed",
  },
  {
    name: "the-close-outruns-the-rehearsal",
    proves:
      "`LIVE-REHEARSAL.md` says Story 3.11 cannot close with a missing row, " +
      "and for three days nothing asserted it — the sentence named a " +
      "completion marking in `EPIC.md` that does not exist. A claim about a " +
      "mechanism reads identically whether the mechanism is there or not.",
    // **Repointed 2026-09-25 by Task 3.11.11, and the move is the finding.**
    // Until today this entry edited Story 3.11's `Status:` line, because the
    // story was open and the ledger had empty rows — one substitution supplied
    // the missing half. Task 3.11.8 filled the last empty row and Task 3.11.10
    // found the break could no longer go red: the invariant needs the story
    // COMPLETE **and** a row empty, and a break is one file.
    //
    // The close supplies the first condition permanently, so the substitution
    // moved to the second. It blanks row 3.3 and pushes the real row out of
    // the regex's reach with a leading character, which is why the original
    // text survives underneath rather than being deleted.
    file: "planning/epic-03-live-market-data/LIVE-REHEARSAL.md",
    // Repointed 2026-09-25: the story's status line stopped being
    // `Not started` when Task 3.11.1's split gave it one. `pnpm invariants`
    // caught it on the same commit, which is what that check is for.
    //
    // **AND IT CANNOT GO RED TODAY — 2026-09-25, Task 3.11.10, and the reason
    // is worth more than the entry.** The invariant needs TWO conditions:
    // Story 3.11 marked complete, AND a row in `LIVE-REHEARSAL.md` still
    // empty. Task 3.11.8 filled the last three empty rows, so marking the
    // story complete no longer makes anything fail — **the check was disarmed
    // by the thing it was written to protect being finished.** A break is one
    // file, so no single substitution can restore both halves.
    //
    // **What to do rather than weaken it**: the day Story 3.11's status says
    // complete, repoint this entry at `LIVE-REHEARSAL.md`, emptying one row's
    // cells, and run it. Then the story's own completion is the first
    // condition and the substitution is the second. Task 3.11.11 carries it.
    find: "| 3.3   | 2026-09-24 |",
    replace:
      "| 3.3 | \u2014 | \u2014 | \u2014 | \u2014 | \u2014 |\n" +
      "x| 3.3   | 2026-09-24 |",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "rehearsal rows",
  },
  {
    name: "a-second-clock-on-the-landing-page",
    proves:
      "The Market Overview grows a clock of its own, which is what " +
      "PRODUCT_SPEC.md §9's sketch invites: it draws `LIVE  10:42:16 ET` " +
      "across the top of this screen, and both halves already exist in the " +
      "chrome. Two surfaces answering *what time is it in the market* can " +
      "disagree — the two-surfaces defect this product has produced four " +
      "times on one screen — and `useMarketClock` ticks, so the second " +
      "caller re-renders every second on the page that is about to hold four " +
      "aggregates over 518 securities.",
    file: "apps/frontend/src/routes/MarketOverview.tsx",
    // **Re-anchored 2026-09-26 by Task 4.2.5**, which gave this route two props
    // and moved the line this entry had named since Task 4.1.4. `CLAUDE.md`:
    // *when you move or reformat anything a break names, run the break* — and
    // the reason it is a rule is that nothing goes red in the meantime. The
    // check is still provable; it was `every-break-can-still-land` that would
    // have said otherwise, an hour later, in the failing direction.
    find: "}: MarketOverviewProps = {}) {",
    replace:
      "}: MarketOverviewProps = {}) {\n" +
      "  // pnpm break: reverted automatically\n" +
      "  useMarketClock();",
    command: ["pnpm", "invariants"],
    expect: "useMarketClock",
  },
  {
    name: "a-second-caller-of-the-live-feed-hook",
    proves:
      "A live table's obvious wiring is one subscription per row. This " +
      "repository has the counterfactual already — `useMarketClock` in " +
      "`AppHeader` gives 0 whole-route re-renders in 20 s where the same " +
      "hook in `App` gives 40 — and at 518 rows that is 518 subscriptions " +
      "behind one socket.",
    file: "apps/frontend/src/routes/SecurityExplorer.tsx",
    find: "  const liveSymbols = useMemo(() => {",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  useLiveFeed({ symbols: [] });\n" +
      "  const liveSymbols = useMemo(() => {",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "call sites use",
  },
  // ## Story 4.2's three, all on the join (Task 4.2.3)
  //
  // The first two prove `one-home-for-the-live-change` and the third proves
  // `one-producer-of-the-overview-aggregate`. All three edit
  // `market-overview.ts`, because that is where the next author of an
  // aggregate over this seam will be standing.
  {
    name: "the-proxies-do-their-own-arithmetic",
    proves:
      "Somebody with the live map and the stored closes in the same function " +
      "writes the subtraction inline. It is right for most of the day, and " +
      "on the evening the nightly backfill catches up the store's last " +
      "session and the live bar's session MEET \u2014 so every figure on the " +
      "screen reads \u22480.00%: well-formed, correctly-formatted, " +
      "correctly-coloured numbers saying the market did not move. " +
      "`changeFromClose`'s same-session branch is the thing that is lost, " +
      "and losing it is invisible (Task 4.2.3).",
    file: "apps/backend/src/market-overview.ts",
    find: "        change: changeFromClose(observed.bar, close),",
    replace:
      "        change: {\n" +
      "          percent:\n" +
      "            close === undefined\n" +
      "              ? null\n" +
      "              : ((observed.bar.close - close.close) / close.close) *\n" +
      "                100,\n" +
      "          basis: close?.session ?? null,\n" +
      "        },",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "never call `changeFromClose`",
  },
  {
    name: "a-second-join-in-a-second-file",
    proves:
      "**The defect the first draft of this guard walked straight past**, " +
      "and the shape Story 4.3 will actually write: a join in a file that " +
      "is not `market-overview.ts`, holding `LastClose` rather than the wire " +
      "type, with both operands INFERRED. The first version of " +
      "`one-home-for-the-live-change` selected on `SecurityLastClose` and " +
      "reported `32 invariants hold.` against exactly this. The other three " +
      "breaks all edit the file where the check already works; this one is " +
      "the second file (Task 4.2.3 review).",
    // `current-market-state.ts` and not a new file, because a break is a
    // substitution in a committed file — and it is the *right* second file
    // anyway: this module's own note says a derivation belongs beside it
    // rather than on it, which is precisely the line somebody crosses here.
    file: "apps/backend/src/current-market-state.ts",
    find: "export const snapshotOf = (",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export function sectorMove(\n" +
      "  state: CurrentMarketState,\n" +
      "  closes: ReadonlyMap<Ticker, LastClose>,\n" +
      ") {\n" +
      "  const moves = [];\n" +
      "  for (const [symbol, observed] of state.all()) {\n" +
      "    const close = closes.get(symbol);\n" +
      "    if (close === undefined) continue;\n" +
      "    moves.push({\n" +
      "      symbol,\n" +
      "      percent:\n" +
      "        ((observed.bar.close - close.close) / close.close) * 100,\n" +
      "    });\n" +
      "  }\n" +
      "  return moves;\n" +
      "}\n\n" +
      "export const snapshotOf = (",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "can reach both halves of the join and never call",
  },
  {
    name: "a-second-basis-is-read",
    proves:
      "The basis field is read outside the one function that chooses a " +
      "basis. `previousClose` is not a price, it is the answer to *measure " +
      "from what* \u2014 and a second module asking that question is a second " +
      "same-session policy that nothing holds to the first. Clause one of " +
      "`one-home-for-the-live-change` (Task 4.2.3).",
    file: "apps/backend/src/market-overview.ts",
    find: "    const close = closes.get(symbol);",
    replace:
      "    const close = closes.get(symbol);\n" +
      "    // pnpm break: reverted automatically\n" +
      "    const basis = close?.previousClose ?? close?.close ?? null;\n" +
      "    void basis;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "read it as a basis",
  },
  // ## Story 4.4's two, both on the classifier (Task 4.4.2)
  //
  // One per clause of `one-classifier-for-the-direction-of-a-move`, because
  // the two clauses recognise the defect by different means and a single
  // break would leave one of them unproven. The first edits
  // `market-overview.ts` — where the next author of an aggregate over
  // this seam is standing — and the second edits `sector-ranking.ts`,
  // which is where clause three's population lives.
  //
  // **Neither of these is the break that found the real defect in the check.**
  // `CLAUDE.md`: *a break proves the check works on the code you were looking
  // at.* The first draft of clause two required a character BEFORE the word,
  // so it matched `changePercent` and missed `percent` — and both breaks
  // below would have gone red anyway, because both name a property. It was
  // found by writing the file the next author would write, in
  // `apps/backend/src/market-breadth.ts`, and keeping the transcript of
  // `40 invariants hold.`
  {
    name: "breadth-counted-on-the-raw-sign",
    proves:
      "A breadth count beside the join classifies each figure itself, with a " +
      "comparison rather than through `directionOf`. Two things go wrong and " +
      "neither looks wrong: a +0.004% move is counted an advancer while its " +
      "own row prints `0.00%` — the three-channels-disagreeing defect " +
      "`PriceChange` exists to prevent, expressed as a total — and " +
      "`NaN > 0` and `NaN < 0` are both false, so every non-finite figure " +
      "lands in the final `else`. In a count that is the sentence *518 " +
      "unchanged, 0 advancing, 0 declining*: a confident, well-formed claim " +
      "that the market did not move. Clause two (Task 4.4.2).",
    file: "apps/backend/src/market-overview.ts",
    find: "export function buildMarketOverview(",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export function countBreadth(entries: readonly { change: " +
      "{ percent: number | null } }[]) {\n" +
      "  let advancing = 0;\n" +
      "  let declining = 0;\n" +
      "  let unchanged = 0;\n" +
      "  for (const entry of entries) {\n" +
      "    const percent = entry.change.percent;\n" +
      "    if (percent === null) continue;\n" +
      "    if (percent > 0) advancing += 1;\n" +
      "    else if (percent < 0) declining += 1;\n" +
      "    else unchanged += 1;\n" +
      "  }\n" +
      "  return { advancing, declining, unchanged };\n" +
      "}\n\n" +
      "export function buildMarketOverview(",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "classify a move by comparing it against zero",
  },
  {
    name: "breadth-rounded-then-counted",
    proves:
      "The same count written by somebody who HAS read " +
      "`price-direction.ts`: they reach for `displayedPercent`, which fixes " +
      "the +0.004% half, bind it to a short local and compare that — so " +
      "clause two's pattern cannot see it, and the non-finite half is still " +
      "open, because `displayedPercent(NaN)` is `NaN` and compares false " +
      "both ways. Clause three, which is keyed on the rounding helper's own " +
      "call sites rather than on an identifier's name (Task 4.4.2).",
    file: "packages/shared/src/sector-ranking.ts",
    find: "export function rankSectorFigures(",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export function countBreadth(moves: readonly number[]) {\n" +
      "  let advancing = 0;\n" +
      "  let declining = 0;\n" +
      "  let unchanged = 0;\n" +
      "  for (const value of moves) {\n" +
      "    const shown = displayedPercent(value);\n" +
      "    if (shown > 0) advancing += 1;\n" +
      "    else if (shown < 0) declining += 1;\n" +
      "    else unchanged += 1;\n" +
      "  }\n" +
      "  return { advancing, declining, unchanged };\n" +
      "}\n\n" +
      "export function rankSectorFigures(",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "round a percentage to the displayed precision and then compare",
  },
  {
    name: "a-second-pairing-of-a-sector-and-its-benchmark",
    proves:
      "The inverse of `SECTOR_ETFS` is written by hand, in the module that " +
      "renders eleven rows \u2014 which is where an author is standing when " +
      "they need a label for the symbol the frame carries. One wrong key puts " +
      "XLV's figure on the Financials row and **every number on the screen is " +
      "still right**: it satisfies every arithmetic guard here, passes every " +
      "state grid and is invisible in greyscale. The only thing on the row " +
      "that can contradict it is the printed ticker (Task 4.3.4).\n\n" +
      "**The first version of the check required the ticker to be QUOTED and " +
      'passed green on this exact defect** \u2014 `{ XLK: "Technology", ' +
      "\u2026 }` has eleven bare identifier keys and not one string literal. " +
      "It was found by writing the file Task 4.3.5 would write rather than by " +
      "reading the check, and the substitution below is a bare key for that " +
      "reason.",
    // **The surface that already renders the relationship**, rather than the
    // module that derives it. `UniverseTable.tsx`'s own docblock says
    // *`SECTOR_ETFS` is the table that says XLK is what Technology is measured
    // against, and this page is the first thing in the product to render it* —
    // so a component reaching for a local copy is this file's own temptation
    // and not a hypothetical one. It is also the honest target under the rule
    // that a break editing the file the check was written around proves the
    // least.
    file: "apps/frontend/src/components/UniverseTable/UniverseTable.tsx",
    find: 'const NOT_APPLICABLE = "\u2014";',
    replace:
      "// pnpm break: reverted automatically\n" +
      "const BENCHMARK_LABELS: Record<string, string> = {\n" +
      '  XLK: "Technology",\n' +
      '  XLV: "Health Care",\n' +
      "};\n" +
      "void BENCHMARK_LABELS;\n\n" +
      'const NOT_APPLICABLE = "\u2014";',
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "name more than one sector benchmark ticker",
  },
  {
    name: "a-second-overview-aggregate",
    proves:
      "A second call to the builder, added **in the file that already has " +
      "one** \u2014 which is the shape the real regression takes, and the " +
      "shape a count of FILES cannot see. " +
      "`one-subscriber-on-the-upstream-socket` learned that the expensive " +
      "way; this entry is what stops the same check being written twice " +
      "(Task 4.2.3).\n\n" +
      "**Strengthened 2026-09-26 by Task 4.2.4, which added the first " +
      "legitimate call site.** The entry used to add TWO calls at once, " +
      "because there were none; it now adds exactly ONE, which is the real " +
      "regression and the weaker signal \u2014 a counter that has to notice " +
      "1 \u2192 2 rather than 0 \u2192 2.",
    file: "apps/backend/src/market-overview.ts",
    find: "export function buildMarketOverview(\n  inputs: MarketOverviewInputs,\n): readonly MarketOverviewEntry[] {",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export function overviewOrEmpty(\n" +
      "  inputs: MarketOverviewInputs,\n" +
      "): readonly MarketOverviewEntry[] {\n" +
      "  return buildMarketOverview(inputs);\n" +
      "}\n\n" +
      "export function buildMarketOverview(\n" +
      "  inputs: MarketOverviewInputs,\n" +
      "): readonly MarketOverviewEntry[] {",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "call sites build the market overview",
  },
  // ## Task 4.2.6's two, on the strip's honest states
  {
    name: "a-second-staleness-sentence",
    proves:
      "The strip's staleness claim gets a second home in the component that " +
      "draws it \u2014 which is where it would be written, because that is " +
      "where an author is standing when they decide a cell should say it " +
      "too. `last prices of the session` is the only sentence on the landing " +
      "page that says a figure is NOT CURRENT, and Story 3.10 settled that a " +
      "degradation is announced in exactly one place; two copies can be " +
      "corrected apart, and the half that rots is the one nobody produced.",
    file: "apps/frontend/src/components/MarketProxyStrip/MarketProxyStrip.tsx",
    find: "        <p className={cx(styles.note)}>{note}</p>",
    replace:
      "        // pnpm break: reverted automatically\n" +
      "        <p className={cx(styles.note)}>\n" +
      "          {note} \u00b7 last prices of the session\n" +
      "        </p>",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "should be written only in",
  },
  {
    name: "the-landing-spec-stops-driving-the-frame",
    proves:
      "The one browser spec that drives an `overview` frame stops driving it " +
      "\u2014 which is how the landing route lost its only figure assertion " +
      "once already. Task 4.2.8 wrote this spec, ran it green, and recorded " +
      "it in its task file, in `docs/GAPS.md` and in a commit message; the " +
      "commit staged `planning` and `docs` only, so `main` received three " +
      "documents describing a mechanism and not the mechanism. `pnpm verify` " +
      "and `pnpm e2e` were both green without it, because a suite cannot miss " +
      "a file it has never heard of, and `landing-route.spec.ts` asserting " +
      "the seven region NAMES passes long before any region holds a number.\n\n" +
      "The substitution is the surviving half of that failure: the file is " +
      "present and no longer exercises the wire. It is keyed on the FRAME " +
      "rather than the filename, so renaming the spec is not a regression " +
      "and deleting its reason for existing is.",
    file: "e2e/specs/overview-proxy-live-update.spec.ts",
    find: '      type: "overview",',
    replace:
      "      // pnpm break: reverted automatically\n" + '      type: "bars",',
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "drives an `overview` frame and asserts the figure",
  },
  {
    name: "a-staleness-threshold-in-milliseconds",
    proves:
      "`LIVE-DATA.md` \u00a711.2 refused a per-security staleness threshold " +
      "with a measurement behind it \u2014 an ordinary maximum gap of 187 " +
      "minutes between one security's bars, p50 one minute \u2014 and the " +
      "regression is not a verdict word but the CALENDAR being replaced by " +
      "arithmetic. `if (age > FIVE_MINUTES)` reads as a repair, is one line, " +
      "and is invisible in a green suite because every fixture in the file " +
      "is inside whatever window its author picked.\n\n" +
      "**Repointed 2026-09-26 in the same change that deleted the check's " +
      "second half.** It used to add a `const STALE_AFTER_MS` and prove a " +
      "no-numeric-literal rule \u2014 a tripwire that `3e5` walked straight " +
      "through and that a trailing comment with a digit in it would have " +
      "turned red for nothing. It now performs the actual substitution: the " +
      "calendar read replaced by a duration comparison, which is what the " +
      "surviving clause sees.",
    file: "apps/frontend/src/market/market-proxies.ts",
    find: "    const state = marketSessionStateAt(new Date(now));",
    replace:
      "    // pnpm break: reverted automatically\n" +
      '    const state = { status: now - at.getTime() < 300_000 ? "open" : "x" };',
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "no longer CALLS",
  },
  {
    name: "the-region-grid-is-capped-again",
    proves:
      "Task 4.1.3's fixed grid comes back \u2014 `height: 82vh` with three " +
      "proportional rows \u2014 and `Sector performance` is capped at 265 px " +
      "with eleven rows, a printed ladder and a two-line footer inside it. " +
      "Because `Region` passes `scrollable` unconditionally the page does not " +
      "look broken: the box reads correct and is SHORT BY SIX ROWS, with the " +
      "weakest sectors below a fold nobody can see the edge of. Measured " +
      "under the break: 264.5 px of box against 443 px of content.",
    // **The defect somebody else will write, rather than the one I just fixed.**
    // Task 4.1.3 argued for a fixed `height` in as many words, for Epic 6's
    // WebGL canvas, and the first person to give the topology a resolved box
    // will reach for it again. Nothing about that edit looks wrong.
    //
    // **One substitution has to land both halves, because either alone is
    // harmless** — which is the shipped repair being belt and braces rather
    // than a weakness in the break. With `min-height` the `fr` rows size to
    // max-content whatever their minimum is (measured: still 461 px with
    // `minmax(0, 1fr)`), and with `minmax(min-content, 1fr)` the tracks hold
    // their content even against a definite height. It takes the pair to cap
    // the region, so the `replace` writes the pair.
    //
    // **Restart the dev server before running this one.** The target is a CSS
    // module and `CLAUDE.md` records the symptom under `pnpm break`: a guard
    // reported as absent when it is there.
    file: "apps/frontend/src/routes/MarketOverview.module.css",
    find: "    repeat(2, minmax(min-content, 1fr));",
    replace: "    repeat(2, minmax(0, 1fr));\n  height: 82vh;",
    command: ["pnpm", "e2e", "overview-sector-region.spec.ts", "--anyway"],
    expect: "does not scroll them",
  },
  {
    name: "a-figure-lands-on-the-wrong-row",
    proves:
      "The permutation with the MAP INNOCENT \u2014 the residual half, and " +
      "the one no grep can reach. `SECTOR_ETFS` is right, the derived " +
      "inverse is right, it is read correctly, and the renderer pairs a row " +
      "with its neighbour's move: rows 5 and 6 exchange figures and every " +
      "other row is untouched. Produced under the break: `5 / Financials / " +
      "XLF / \u25b2 up / +0.12%` \u2014 a real figure for a real sector, on " +
      "the wrong row, with the printed ordinals still ascending and the " +
      "figures no longer descending.",
    // **This is the break the new assertion actually owes, and the one beside
    // it is not.** `two-sectors-swap-their-benchmarks` goes red against the
    // spec Task 4.3.5 shipped, which already asserted the label beside the
    // ticker; what 4.3.7 added is the **figure** in the triple, and this is
    // the defect that separates them. Recorded because it was produced:
    // against the 4.3.5 spec this substitution passes **3 of 3**, green, with
    // two sectors wearing each other's moves.
    //
    // Rows 5 and 6 rather than 1 and 2 on purpose: the old spec asserted the
    // first and last rows' figures by hand, so a transposition at either end
    // was already covered and a break there would prove less than it looked.
    file: "apps/frontend/src/market/sector-performance.ts",
    find: "    rows: figures.map((figure) => {\n      const move = moveOf(figure);",
    replace:
      "    rows: figures.map((figure, index) => {\n" +
      "      const move = moveOf(\n" +
      "        (index === 4 ? figures[5] : index === 5 ? figures[4] : figure) ??\n" +
      "          figure,\n" +
      "      );",
    command: ["pnpm", "e2e", "overview-sector-region.spec.ts", "--anyway"],
    expect: "OWN label, ticker and figure",
  },
  {
    name: "two-sectors-swap-their-benchmarks",
    proves:
      "The permutation \u2014 the one defect class where every individual " +
      "number on the screen is correct. One transposition in the sector " +
      "\u2192 benchmark map and XLF's figure carries the Health Care label: " +
      "it compiles, it lints, it satisfies every arithmetic guard, it sums " +
      "correctly, it appears in no state grid and it survives greyscale. " +
      "Produced under the break: `5 / Health Care / XLF / \u25b2 up / " +
      "+0.31%` \u2014 the rank, the ticker and the figure all XLF's own, and " +
      "the word wrong. `one-pairing-of-a-sector-and-its-benchmark` cannot " +
      "see it, because there is still exactly one table and it is still read " +
      "correctly; only a browser spec that asserts the LABEL beside the " +
      "TICKER beside the FIGURE, over eleven distinguishable figures, can.",
    // **The defect somebody else will write.** Nobody hand-writes an inverse
    // any more \u2014 the invariant refuses one \u2014 so what is left is a
    // transposition in the one table, which is what a twelfth sector, a fund
    // change or an alphabetical tidy-up produces. The substitution is a swap
    // rather than an edit for that reason: one wrong key would leave a ticker
    // unmapped and the row would label itself with its own symbol, which is a
    // visibly different failure and an easier one.
    //
    // **The assertion this proves is only as good as its figures.** A shared
    // or repeated value passes against any permutation, so the spec asserts
    // eleven distinct figures BEFORE it asserts the triple; if that
    // distinctness assertion is ever weakened this break goes green with the
    // map still transposed.
    file: "packages/shared/src/security.ts",
    find: '  health_care: toTicker("XLV"),\n  financials: toTicker("XLF"),',
    replace: '  health_care: toTicker("XLF"),\n  financials: toTicker("XLV"),',
    command: ["pnpm", "e2e", "overview-sector-region.spec.ts", "--anyway"],
    expect: "OWN label, ticker and figure",
  },
  {
    name: "the-settle-becomes-a-delay-plus-a-duration",
    proves:
      "The sector list's two events \u2014 a figure changing and a position " +
      "changing \u2014 are separated in TIME: one settle of stillness, then " +
      "one settle of travel. Written as a literal in the delay position it " +
      "looks identical on screen and is a different product under " +
      "`prefers-reduced-motion`: `tokens.css` resolves the token to `0ms` at " +
      "the one layer that answers the preference, so a literal leaves the " +
      "reader who asked for LESS motion waiting 240\u00a0ms in front of a " +
      "list that is not moving.",
    // **The defect the next author writes, rather than the one just fixed.**
    // `transition: transform 240ms ease 240ms` is what anybody reaches for
    // first, and the token spelling looks like pedantry until you read the
    // `@media` block in `tokens.css`. Nothing about the edit looks wrong: the
    // gesture is byte-identical for every reader without the preference set,
    // which is every reviewer.
    //
    // **The same substitution also turns `overview-sector-order.spec.ts`'s
    // reduced-motion half red**, at `expect(await transformsSeen(page)).toBe(0)`
    // \u2014 the row is held under its inverse transform for 240\u00a0ms with
    // nothing happening, which is the whole defect, sampled every animation
    // frame. The registered command is the invariant because it needs no pair
    // running.
    //
    // No dev-server restart is needed for this one although its target is a CSS
    // module: the command reads the file, not the page.
    file: "apps/frontend/src/components/RankedList/RankedList.module.css",
    find: "    var(--motion-ease-standard) var(--motion-duration-settle);",
    replace: "    var(--motion-ease-standard) 240ms;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "not twice",
  },
  {
    name: "a-break-that-can-no-longer-land",
    proves:
      "A break whose `find` no longer matches proves nothing, and nothing " +
      "says so: breaks are deliberately outside `pnpm verify` because several " +
      "need a browser or a database. Two arrival-rule entries rotted this way " +
      "on 2026-09-21 — Task 3.5.4 gave `useArrival` a third argument, " +
      "Prettier wrapped the call, and both entries silently stopped landing.",
    // **The registry breaking itself**, which is the only honest target: the
    // claim is about `breaks.mjs`, so the defect has to live there.
    //
    // **The find spans two lines on purpose.** A single-line literal taken
    // from this file appears twice the moment it is written down here — once
    // where it belongs and once inside this entry — and the harness refuses a
    // substitution that matches more than once. Writing it as a concatenation
    // puts a `\n` ESCAPE in this file's source where the target has a real
    // newline, so the entry cannot match itself.
    file: "scripts/breaks.mjs",
    find:
      '    find: "  const liveSymbols = useMemo(() => {",\n' + "    replace:",
    replace:
      "    // pnpm break: reverted automatically\n" +
      '    find: "  const liveSymbols = useMemoNOPE(() => {",\n' +
      "    replace:",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "can no longer land",
  },
  {
    name: "the-producer-forgets-to-rank-the-sectors",
    proves:
      "The sector ranking actually runs between the server and the screen. " +
      "`rankSectorFigures` is called in exactly one place in shipped code \u2014 " +
      "`toWireMarketOverview`, which is handed the eleven in `SECTORS`' " +
      "declared order \u2014 and **nothing in the browser ranks**, so a frame " +
      "that arrives unranked is drawn faithfully, in the wrong order, with " +
      "every figure on it correct and every printed ordinal ascending. The " +
      "three sector specs that serve their own already-ranked frames all stay " +
      "green under this substitution, which is why this one exists: it is the " +
      "only spec in the suite that reads a frame the real gateway produced. " +
      "Produced under the break: the drawn figures came back " +
      "`1.32, -0.18, 0.67, 0.89, 0.99, 1.07, 0.35, 0.32, -0.31, 0.86, 0.37` " +
      "against a descending expectation \u2014 an assertion failure with the " +
      "file's other test still passing.",
    // **The defect the next author writes.** Nobody deletes a comparator; what
    // happens is that a second section is added to the aggregate and the new
    // one is encoded without going through the rank \u2014 which is this exact
    // line with `rankSectorFigures` missing. The clause is the **call**, not
    // the function, for that reason.
    //
    // **`build: true` is load-bearing here and the reason cost a diagnosis.**
    // `pnpm e2e` drives the running dev pair, which serves `dist/`, and the
    // backend's watch loop did **not** rebuild on the restore during Task
    // 4.3.8 \u2014 leaving a byte-identical source beside a broken `dist/`,
    // which is a red suite that looks exactly like a flake. The harness builds
    // both ways, so the tree and the process it drives cannot disagree.
    file: "apps/backend/src/market-overview.ts",
    find: "sectors === undefined ? undefined : rankSectorFigures(encode(sectors));",
    replace: "sectors === undefined ? undefined : encode(sectors);",
    command: ["pnpm", "e2e", "overview-sector-ranking.spec.ts", "--anyway"],
    expect: "strongest first, keyless last",
    build: true,
  },
  {
    name: "the-population-is-stated-as-a-literal",
    proves:
      "No shipped sentence states the size of the tracked universe as a " +
      "figure. Every surface naming the population reads it off the frame, " +
      "so this product cannot say *503* on a screen where the frame said " +
      "something else \u2014 which it did, for a day, in the one story whose " +
      "entire subject is the denominator. `MarketOverview.tsx` read " +
      '*"among the 503 companies we track"* in the state where the frame ' +
      "arrived and its breadth section was REFUSED, which is precisely the " +
      "state with no readable denominator; Task 4.4.8's produced state grid " +
      "drew a frame carrying `tracked: 400`, its section refused, and the " +
      "region saying 503. The repair was NO number rather than a different " +
      "one \u2014 ADR 0029's defer rule applied to a clause.",
    // **The clause is `we track`, not the number**, because `CLAUDE.md` says to
    // prefer one the re-implementer cannot avoid writing. A grep for `503`
    // rots the day the curation changes size, says nothing about `518`, and
    // would fire on an HTTP status — of which this frontend discusses
    // several. `we track` is this product's own phrase for the population,
    // written identically in the ledger's heading, in its spoken claim and in
    // the region's sentence.
    //
    // **The break is deliberately in a DIFFERENT file from the defect that
    // shipped**, and a different number. The real defect was in
    // `MarketOverview.tsx` and said 503; this one is in the view builder's
    // heading and says 518 — because a break that edits the file the check
    // was written around proves only that the check sees that file. Both were
    // run at the time this entry was added and both went red.
    file: "apps/frontend/src/market/market-breadth.ts",
    find: "    setHeading: `Of the ${String(tracked)} we track`,",
    replace:
      "    // pnpm break: reverted automatically\n" +
      '    setHeading: "Of the 518 we track",',
    command: ["pnpm", "invariants"],
    expect: "state the population as a figure rather than reading it off",
    // No `build:` \u2014 unlike its neighbour this check reads SOURCE, so the
    // bundle is irrelevant and a rebuild either side would be four minutes
    // spent proving nothing.
  },
  {
    name: "the-breadth-buckets-are-transposed",
    proves:
      "The breadth count's one translation is wrong. `directionOf` answers " +
      "`positive | negative | unchanged` about a NUMBER and the market's words " +
      "for the same three facts are *advancing*, *declining* and *unchanged*, " +
      "so `bucketOf` is the single place the two vocabularies meet \u2014 and a " +
      "transposition there is a count that is individually well-formed in " +
      "every field: the identity still holds, `measured` is still the sum of " +
      "its own accumulators, `tracked` is still the set, the screen still " +
      "agrees with the frame, and the headline's glyph, word and sign all " +
      "still agree with each other. Nothing in a browser can see it from the " +
      "frame alone, because breadth is a REDUCTION and the frame carries no " +
      "recoverable input. Produced under the break: `advancing: 166, " +
      "declining: 335` against a recount of `advancing: 335, declining: 166` " +
      "taken from `GET /securities`' own closes \u2014 an assertion failure " +
      "with the file's other two tests still passing, which is the design: a " +
      "partition claim is not a direction claim.",
    // **The defect the next author writes**, and it is why the clause is the
    // translation rather than the tally: nobody inverts an accumulator, but the
    // three wire names are not the three direction names, and this `switch` is
    // the one place somebody has to write the pairing out. Its own docblock
    // says so.
    //
    // **It only goes red on a store that holds closes.** The recount reads
    // `GET /securities`' `lastCloses`, so on CI's store \u2014 518 securities,
    // zero bars \u2014 the test SKIPS with its reason printed rather than
    // passing vacuously, and this break is unprovable there. That is the same
    // shape as `the-producer-forgets-to-rank-the-sectors`, which needs a ranked
    // order no gated machine can produce.
    //
    // `build: true` for that entry's recorded reason: `pnpm e2e` drives the dev
    // pair, which serves `dist/`, and a watch loop that rebuilds on the break
    // and not on the restore leaves byte-identical source beside a broken
    // `dist/` \u2014 a red suite that reads exactly like a flake.
    file: "apps/backend/src/market-breadth.ts",
    find:
      '    case "positive":\n      return "advancing";\n' +
      '    case "negative":\n      return "declining";',
    replace:
      "    // pnpm break: reverted automatically\n" +
      '    case "positive":\n      return "declining";\n' +
      '    case "negative":\n      return "advancing";',
    command: ["pnpm", "e2e", "overview-breadth-counts.spec.ts", "--anyway"],
    expect: "recounted from the store's own closes",
    build: true,
  },
  {
    name: "the-landing-page-asks-only-for-the-proxies",
    proves:
      "The landing route's subscription is built from `overview.figures` " +
      "alone — the four index proxies — while the page draws eleven " +
      "sector rows from `overview.sectors`. The gateway scopes both `bars` " +
      'and `snapshot` to what a client asked for, so `observations.get("XLK")` ' +
      "is permanently `undefined` and the arrival mark Story 4.3 designed, " +
      "drew, tested and shipped CANNOT FIRE on the deployed page. It shipped " +
      "that way and was invisible to everything: the unit tests hand " +
      "`sectorPerformance` an observations map directly, and the three " +
      "furnished browser specs serve sector observations the gateway could " +
      "never have sent. Produced under the break: `the page has not " +
      "subscribed to XLK — it asked for DIA, IWM, QQQ, SPY`.",
    // **The defect somebody else will write, and it is the one that shipped.**
    // Nobody deletes a spread; what happens is that a section is added to this
    // frame and nothing adds it here, because the subscription reads like a
    // detail of the strip rather than the page's whole claim on the feed. So
    // the substitution is *the frame's other sections dropped*, which is
    // exactly the state Story 4.3 left behind.
    //
    // Vite serves this file from source, so no build is needed — unlike
    // the two backend entries below.
    //
    // **Repointed 2026-10-08 by Task 4.5.5, which is this entry's own rule
    // happening.** The key gained the movers' ten — a third section, added by
    // the task after the one that wrote this break — and the `find` stopped
    // matching. `every-break-can-still-land` is what said so; nothing else
    // would have, because breaks are outside `pnpm verify`.
    //
    // The substitution is unchanged in meaning: the key collapses to the four
    // proxies, which is the shipped defect. It now proves **two** sections at
    // once — the spec's sector test fails first, on `XLK`, and its movers test
    // fails the same way on `NVDA` — and the `expect` below is deliberately
    // the sector one, so this entry keeps asserting the state it was written
    // around rather than quietly becoming a test of the newest section.
    file: "apps/frontend/src/routes/MarketOverview.tsx",
    find:
      "  const symbolKey = [\n" +
      "    ...[...(overview?.figures ?? []), ...(overview?.sectors ?? [])].map(\n" +
      "      (figure) => figure.symbol,\n" +
      "    ),\n" +
      "    ...moverSymbols(overview),\n" +
      "  ]",
    replace:
      "  const symbolKey = [...(overview?.figures ?? [])]\n" +
      "    .map((figure) => figure.symbol)",
    command: ["pnpm", "e2e", "overview-frame-sections.spec.ts", "--anyway"],
    expect: "has not subscribed to XLK",
  },
  {
    name: "the-proxy-section-is-taken-negatively",
    proves:
      "The proxy section of the overview frame is defined as the COMPLEMENT " +
      "of the sector set rather than as the proxy set. It is observationally " +
      "identical today — the join is handed fifteen symbols — and it " +
      "is a loaded gun: Story 4.4's breadth count widens the join to the 503 " +
      "equities, and a complement then puts every one of them in " +
      "`overview.figures`. Hundreds of cells in a strip built for four, a " +
      "~56 KB frame, and `market-proxies.ts`' five folds (`newest`, " +
      "`sharedBasis`, `sharedClosingSession`) computing over 507 entries, " +
      "with no compile error, no failing test and every individual number on " +
      "screen correct. Story 4.3's comment there warned against a SLICE and " +
      "could not cover this, because the sector predicate was positive and " +
      "the proxy one was not.",
    // **No browser can see this one and that is why the grep exists.** The
    // two filters return identical arrays until the join widens, so the
    // pass-through assertion in `overview-frame-sections.spec.ts` is green
    // under both — verified by hand before this entry was written, and
    // recorded in Task 4.4.1. The check is therefore over the SHAPE of the
    // split rather than over its output, and this is the substitution it is
    // written around.
    file: "apps/backend/src/index.ts",
    find: "    proxies: entries.filter((entry) => isProxySymbol.has(entry.symbol)),",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    proxies: entries.filter((entry) => !isSectorSymbol.has(entry.symbol)),",
    command: ["pnpm", "invariants"],
    expect: "does not name its own set",
  },
  {
    name: "a-section-is-handed-the-join-whole",
    proves:
      "A section of the overview frame is handed the join's whole answer " +
      "instead of its own members — which is the shortest thing to write " +
      "when the next story needs the whole answer for a count, and it is " +
      "wrong in the one direction nobody looks: the SECTION, not the " +
      "aggregate. The strip then draws every security the join saw. This is " +
      "the half `each-overview-section-names-its-own-set` cannot prove on its " +
      "own, because what goes wrong is a number on the wire rather than a " +
      "shape in a file.",
    // **`build: true` for `the-producer-forgets-to-rank-the-sectors`' reason**,
    // which cost a diagnosis there: `pnpm e2e` drives the dev pair, the pair
    // serves `dist/`, and the backend's watch loop did not rebuild on the
    // restore — a byte-identical source beside a broken build, which
    // reads exactly like a flake.
    file: "apps/backend/src/index.ts",
    find: "entries.filter((entry) => isProxySymbol.has(entry.symbol))",
    replace: "entries",
    command: ["pnpm", "e2e", "overview-frame-sections.spec.ts", "--anyway"],
    expect: "exactly the four index proxies",
    build: true,
  },
  {
    name: "the-breadth-count-includes-the-funds",
    proves:
      "Breadth is counted over the join's WHOLE answer rather than over the " +
      "503 equities — which since Task 4.4.4 widened the join to 518 is the " +
      "shortest thing to write, because `entries` is sitting there already " +
      "in the right shape. The count then includes `SPY` and the eleven " +
      "sector SPDRs ALONGSIDE their own constituents, which makes " +
      "`Market breadth` and `Market proxies` non-independent: in a " +
      "one-sided market all fifteen fall the same way as the names inside " +
      "them, shifting the figure by up to ~2.9 points toward the majority. " +
      "No compile error, no failing test, three plausible counts, and every " +
      "number on screen individually correct.",
    // **This check's own first draft was green on this substitution**, and
    // that is why the clause it tests is the SET rather than the derivation:
    // a draft asserting the section was taken from `entries` is satisfied by
    // the defect being the defect. Task 4.4.4 kept the transcript.
    //
    // A grep rather than a browser, deliberately: the counts are
    // well-formed in both states and the difference is fifteen out of ~500,
    // so nothing a spec can assert tells them apart — and on CI, with zero
    // bars, every figure is `unknown` and both states count zero.
    //
    // **Repointed 2026-10-08 by Task 4.5.4**, which extracted the eligibility
    // pass so the movers could be a selection from the same array this count
    // is a tally of. The substitution is the same defect written the new
    // shortest way — the pass taken over the join's whole answer — and it is
    // now red for two reasons rather than one: the `breadth:` line stops
    // naming the binding, and `index.ts` holds two eligibility passes.
    file: "apps/backend/src/index.ts",
    find: "    breadth: marketBreadth(eligible),",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    breadth: marketBreadth(eligibleMoves(entries, { asOf, marketOpen })),",
    command: ["pnpm", "invariants"],
    expect: "does not name",
  },
  // ## Task 4.5.4's one, on the population a RANKING is taken over
  //
  // **The defect is a second eligibility pass, not a wrong filter**, and that
  // is what the substitution had to be: `topMovers` takes `EligibleMoves`, so
  // `movers: equities` does not compile and the type system already holds that
  // door. What compiles, runs and looks right is a second **pass** — over the
  // join's whole answer, because `entries` is sitting there in the right
  // shape and the line reads like the one above it.
  //
  // What it costs is two things at once. The ranked list then holds `SPY` and
  // `XLE` — drawn a third time, twenty-four pixels from a sector row and a
  // proxy cell asserting the same figures, which is one fact with three homes
  // — and its denominator becomes 518 beside a breadth count of 503 **on the
  // same screen**, two regions apart. Both lists are well-formed, correctly
  // ordered and individually correct.
  //
  // **Confirmed passing WRONGLY first**, which is the procedure `CLAUDE.md`
  // added on 2026-09-26: the three-link chain in
  // `breadth-is-counted-over-the-equities-alone` and the two-row `SECTIONS`
  // table were both green against this exact line. The transcript is in
  // `TASK-04`.
  {
    name: "a-mover-ranked-over-the-whole-universe",
    proves:
      "The movers are ranked over a SECOND eligibility pass, taken over the " +
      "join's whole answer rather than over the one the breadth count is a " +
      "tally of. The list then carries `SPY` and the sector SPDRs beside " +
      "their own constituents — the same figures two other regions are " +
      "already asserting, twenty-four pixels away — and states a denominator " +
      "of 518 beside a breadth count of 503 on the same screen. It " +
      "typechecks, it runs, every row is ordered correctly and every number " +
      "on it is individually right (Task 4.5.4).",
    file: "apps/backend/src/index.ts",
    find: "    movers: eligible,",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    movers: eligibleMoves(entries, { asOf, marketOpen }),",
    command: ["pnpm", "invariants"],
    expect: "the one eligibility pass",
  },
  // **The ranking's denominator — Task 4.5.6, two breaks for two halves.**
  //
  // The first is the half nothing below a real browser's accessibility tree
  // can see; the second is the half that is numerically invisible in every
  // state anybody photographs. Both were produced against the shipped files
  // before they were registered, and the **first draft** of the check they
  // prove reported `46 invariants hold.` against a third variant — the route
  // handing `breadth.claim` in as a prop — which is why the check now requires
  // every rendering of the clause to be rooted at `view.claim`. The transcript
  // is in `TASK-06`.
  {
    name: "the-rankings-denominator-is-silenced",
    proves:
      "The movers region's footer — the only place on that surface that says " +
      "what the two lists were ranked over — is swept into the accessibility " +
      "tree's blind spot by an `aria-hidden` it inherits from the siblings it " +
      "sits among. `RankedList`'s `.rules` and `.ladder` both carry one " +
      "legitimately, so the edit reads as tidying. The region draws NO " +
      "ladder and prints no denominator anywhere, so after it a listener " +
      "gets ten ranked rows with nothing to measure the selection against — " +
      "a top five over 446 of 503 that looks exactly as confident as one " +
      "over all of them. The DOM is correct, every component test passes, " +
      "every browser spec that reads text passes, and axe is silent.",
    file: "apps/frontend/src/components/Movers/Movers.tsx",
    find: "      <p className={cx(styles.claim)}>",
    replace: '      <p className={cx(styles.claim)} aria-hidden="true">',
    command: ["pnpm", "invariants"],
    expect: "hides the region's only denominator",
  },
  {
    name: "the-ranking-reads-the-breadth-denominator",
    proves:
      "The ranked region's sentence is built from the BREADTH section's " +
      "count rather than from the movers section's own `eligible`. The two " +
      "are the same number by construction — one eligibility pass over one " +
      "array, consumed twice — so every state anybody photographs is " +
      "byte-identical and no test can tell. It is still wrong: " +
      "`encodeBreadth` drops the whole breadth section on one non-finite " +
      "count (ADR 0031), and the ranked region then states no denominator at " +
      "all in precisely the state `WireMoverLists.eligible` was added to " +
      "survive — which is a ranked list with no denominator, the one thing " +
      "Story 4.5 must not ship.",
    file: "apps/frontend/src/market/movers.ts",
    find: "    count: movers.eligible,",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    count: breadth.measured,",
    command: ["pnpm", "invariants"],
    expect: "reaches the breadth section",
  },
  {
    name: "the-denominator-is-drawn-and-not-spoken",
    proves:
      "The breadth region's footer carries two renderings of one sentence in " +
      "one `<p>` — a drawn method clause and a visually-hidden denominator " +
      "sentence — and the next reader deletes the second as a duplicate. It " +
      "reads like one. The ladder that prints N is `aria-hidden`, so after " +
      "that edit the denominator this story exists to put on screen reaches " +
      "NO LISTENER: the three counts arrive with nothing to measure them " +
      "against. The DOM is correct either way, every component test passes, " +
      "every browser spec passes, and axe is silent — the only instrument " +
      "that can see it is `Accessibility.getFullAXTree` in a real browser.",
    // **Chosen over the two other plausible edits**, both of which this check
    // also refuses and both of which were produced before it was registered:
    // `aria-hidden` swept onto the spoken span from the drawn sibling beside
    // it, and `.spoken` "simplified" from the clip-rect idiom to
    // `display: none`. This one is the likeliest, because it is the one a
    // reader makes while believing they are removing a duplicate — the other
    // two need somebody to be editing accessibility deliberately.
    file: "apps/frontend/src/components/BreadthLedger/BreadthLedger.tsx",
    find:
      "            <span className={cx(styles.spoken)}>" +
      "{view.claim.spoken}</span>\n",
    replace: "            {/* pnpm break: reverted automatically */}\n",
    command: ["pnpm", "invariants"],
    expect: "expected exactly 1",
  },
  // **The narrow grid is re-laid and the DOM is not — Task 4.4.7.**
  //
  // The landing route's six regions each name a grid area, so source order and
  // drawn order are two independent facts: the stylesheet can be re-laid
  // without touching the route. Task 4.4.7's decision is that the DOM holds the
  // **≤860 order**, because that is the layout where sequence *is* the
  // hierarchy — and there are six tab stops inside the grid, so the order is a
  // keyboard reader's route through the screen rather than a detail of markup.
  //
  // The substitution is the edit the next author makes: **two lines of
  // `grid-template-areas` swapped at ≤860**, which is `CLAUDE.md`'s own
  // *every breakpoint that narrows a grid must restate its areas* arriving one
  // step later — the areas get restated and the DOM does not follow. It is
  // chosen over re-ordering the JSX deliberately: a reverted JSX order is
  // caught by the spec's *names* assertion, which is the half already proved by
  // construction, while this reaches the **geometric** half, which only a
  // browser can see. jsdom computes no layout, so every unit and component test
  // in this repository passes against it.
  {
    name: "the-narrow-grid-is-re-laid-without-the-dom",
    proves:
      "The landing route's \u2264860 reading order stops matching its source " +
      "order, so a keyboard reader and a screen reader meet the regions in an " +
      "order the screen does not show \u2014 a WCAG 1.3.2 / 2.4.3 defect that is " +
      "structurally invisible below a real browser (Task 4.4.7).",
    file: "apps/frontend/src/routes/MarketOverview.module.css",
    find: '      "breadth"\n      "sectors"',
    replace: '      "sectors"\n      "breadth"',
    command: ["pnpm", "e2e", "overview-region-order.spec.ts", "--anyway"],
    expect: "is not below Market breadth",
  },
  // **The narrow row inherits its tracks — Task 4.5.1.**
  //
  // `every-row-variant-restates-its-tracks` holds rule 2 of
  // `RankedList.module.css`: every selector stating an explicit track list
  // above 37rem states one below it, even where the two come out identical.
  //
  // The substitution deletes the **movers** row's narrow restatement and
  // leaves its wide one, which is the file's own measured defect one step
  // further on: the five-track list would then apply at 390, where the row
  // draws four cells into a 342 px region, and the two that no longer fit grow
  // implicit tracks — inside a `subgrid`, which cannot grow columns beyond the
  // range it adopts, that is a **second row of the `<li>`**. The same omission
  // on `.bar` made every row 33 px instead of 26 and the region 503 instead of
  // 461, and was found by `pnpm probe` and by nothing else.
  //
  // **The check was proved on a different defect first**, which is the half a
  // break cannot reach: a break edits the file the check was written around,
  // so it cannot tell a check that works from one that was fitted to this
  // text. The first draft — a grep for `.movers` inside the narrow block —
  // was green against a third variant added to the wide block and forgotten in
  // the narrow one, which is the defect the *next* story writes rather than
  // this one. The shipped check keys on the division instead: a row variant
  // **is** a `grid-template-columns` declaration, and the pairing is what the
  // re-implementer cannot avoid.
  {
    name: "the-narrow-row-inherits-its-tracks",
    proves:
      "A row variant states its tracks at one width and inherits them at " +
      "another, so a cell with nowhere to go grows an implicit track and " +
      "every row of the list changes height — invisible to jsdom, to axe " +
      "and to every test below `pnpm probe` (Task 4.5.1).",
    file: "apps/frontend/src/components/RankedList/RankedList.module.css",
    find:
      "  .movers {\n" +
      "    grid-template-columns: 2ch 64px minmax(0, 1fr) 68px;\n" +
      "    column-gap: var(--space-8);\n" +
      "  }\n",
    replace: "  /* pnpm break: reverted automatically */\n",
    command: ["pnpm", "invariants"],
    expect: "state a track list above 37rem and none below it",
  },
  // ## Task 4.5.2's two, both on the order of a move
  //
  // One per clause of `one-comparator-for-the-order-of-a-move`, because the
  // two clauses recognise the defect by different means and a single break
  // would leave one unproven. Both edit `market-overview.ts` — where the next
  // author of an aggregate over this seam is standing, and the honest target
  // under the rule that a break editing the module the check was written
  // around proves the least.
  //
  // **Neither of these is what found the real defect in the check.** That was
  // `apps/backend/src/market-movers.ts`, the file the next story would write,
  // run against `docs/GAPS.md`'s own candidate clause — *the subtraction of
  // two displayed percentages* — which reported `45 invariants hold.` with
  // that file in the walked population of 60. The next author subtracts two
  // ranking keys and rounds nothing, and the narrow clause had no anchor in
  // the home and never could have had one.
  {
    name: "movers-ranked-by-a-second-comparator",
    proves:
      "A top-N beside the join ranks the figures itself, with a subtraction " +
      "rather than through `compareByMove`. Two things go wrong and neither " +
      "looks wrong on screen: the `?? 0` places a security we have heard " +
      "nothing about among the genuinely flat ones — ADR 0029's false " +
      "impression expressed as a RANK POSITION — and the raw subtraction " +
      "un-holds *two figures equal at displayed precision never swap*, so a " +
      "list whose members are 0.003% apart and both print `+0.41%` " +
      "re-orders up to ~16 times a minute with nothing on it changing. " +
      "Clause two (Task 4.5.2).",
    file: "apps/backend/src/market-overview.ts",
    find: "export function buildMarketOverview(",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export function topMovers(\n" +
      "  figures: readonly WireOverviewFigure[],\n" +
      "  limit: number,\n" +
      "): readonly WireOverviewFigure[] {\n" +
      "  return [...figures]\n" +
      "    .sort(\n" +
      "      (left, right) =>\n" +
      "        (right.changePercent ?? 0) - (left.changePercent ?? 0),\n" +
      "    )\n" +
      "    .slice(0, limit);\n" +
      "}\n\n" +
      "export function buildMarketOverview(",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "order one move against another outside the one comparator",
  },
  {
    name: "movers-rounded-then-sorted",
    proves:
      "The same top-N written by somebody who HAS read `sector-ranking.ts`: " +
      "they reach for `displayedPercent`, which fixes the displayed-tie " +
      "half, bind it to a short local and sort on that — so clause two's " +
      "pattern cannot see it, because neither operand names a move. The " +
      "absent-key half is still open, and so is the tie's direction: the " +
      "rounding makes two display-equal figures compare 0, and whether the " +
      "arrival order survives then depends on this author's comparator " +
      "rather than on the one home's. Clause three, which is keyed on the " +
      "rounding helper's own call sites rather than on an identifier's name " +
      "(Task 4.5.2).\n\n" +
      "`displayedPercent` is deliberately left unimported by the " +
      "substitution: the clause is a grep over the file's text, and an " +
      "import line is exactly the incidental a re-implementer might write " +
      "differently.",
    file: "apps/backend/src/market-overview.ts",
    find: "export function buildMarketOverview(",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export function topMovers(\n" +
      "  figures: readonly WireOverviewFigure[],\n" +
      "  limit: number,\n" +
      "): readonly WireOverviewFigure[] {\n" +
      "  const scored = figures.map((figure) => ({\n" +
      "    figure,\n" +
      "    at: displayedPercent(readMove(figure)),\n" +
      "  }));\n" +
      "  scored.sort((left, right) => right.at - left.at);\n" +
      "  return scored.slice(0, limit).map(({ figure }) => figure);\n" +
      "}\n\n" +
      "export function buildMarketOverview(",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "round a percentage to the displayed precision and sort",
  },
  // **The hold at two lists — Task 4.5.7, three breaks.**
  //
  // All three were produced against the shipped files before they were
  // registered, and each transcript is in `TASK-07`. The first two were run by
  // hand rather than through `pnpm break`, because the tree was already dirty
  // with the change they prove — a `break-verify` run refuses a dirty target,
  // correctly.
  {
    name: "the-hold-is-scoped-to-one-list",
    proves:
      "The hold is wired to one of the region's two lists. This is the " +
      "edit the next author makes without noticing: `Movers` draws two " +
      "`RankedList`s from two arrays, so the pin has to be applied twice, " +
      "and applying it once leaves a region whose head says `ORDER HELD` " +
      "over a list that is re-ordering. It is `docs/GAPS.md` entry 13's " +
      "sibling — two speakers, one contradiction — and it is the exact " +
      "failure the region-scoped hold exists to prevent: the losers list " +
      "moving out from under a pointer that is APPROACHING it diagonally " +
      "across the region.\n\n" +
      "Nothing below a browser can see it. jsdom has no pointer, so a " +
      "component test can only pass the pin in as a prop — and " +
      "`Movers.test.tsx` does, which is why it stays green against a region " +
      "wired to one list only if the test happens to assert the other. The " +
      "spec hovers one list and asserts the ORDER of both.",
    file: "apps/frontend/src/components/Movers/Movers.tsx",
    find: "          rows={withHeldRows(rowsInPinnedOrder(view.losers, pinned))}",
    replace:
      "          /* pnpm break: reverted automatically */\n" +
      "          rows={withHeldRows(view.losers)}",
    command: ["pnpm", "e2e", "overview-movers-hold.spec.ts", "--anyway"],
    expect: "a pointer in EITHER list holds BOTH",
  },
  {
    name: "a-new-member-is-swept-to-the-bottom",
    proves:
      "A member the pin has never seen is drawn after the whole pinned " +
      "block instead of in its ranked position — which is **the arithmetic " +
      "this repository shipped** until Task 4.5.7, correct for eleven fixed " +
      "sectors and wrong the moment a list's membership can change. A new " +
      "#1 gainer is then drawn at #5 with `1` printed beside it, under four " +
      "rows printing `2`-`5`.\n\n" +
      "It is the plausible re-write rather than an invented defect: " +
      "`?? pinned.length + index` is three tokens, it reads as obviously " +
      "safe, and every other assertion about the hold passes with it in " +
      "place. The state it is wrong in occurs 0.22-0.45 times a minute " +
      "(measured over three real sessions), so it is rare enough that " +
      "nobody meets it while developing and common enough that a reader " +
      "does.",
    file: "apps/frontend/src/market/sector-performance.ts",
    find: "    at: positions.get(row.symbol) ?? insertionPoint(index),",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    at: positions.get(row.symbol) ?? pinned.length + index,",
    command: ["pnpm", "e2e", "overview-movers-hold.spec.ts", "--anyway"],
    expect: "drawn in its ranked position",
  },
  {
    name: "the-held-badge-grows-the-head",
    proves:
      "The movers head's slot reserves less room than the badge needs, so " +
      "the slot GROWS when the badge replaces `Top 5 each way` on pointer " +
      "enter. This is not a hypothetical: `min-width: 100px` is the figure " +
      "Task 4.5.3 measured against the slot's own content (98 x 16) and " +
      "carried over from the sector region, and the badge measures " +
      "**100.33 x 22** — so the shipped reserve was 0.33 px short of the " +
      "thing it exists to hold, for one task in this region and from Task " +
      "4.3.6 in the other.\n\n" +
      "It is invisible everywhere else. The region title's own box does not " +
      "move at 1440, because the header has slack and the title is " +
      "`flex: 0 1 auto`; jsdom computes no layout at all; and a screenshot " +
      "of either state alone is correct. The assertion reads the slot's box " +
      "with each string in it and requires them equal.\n\n" +
      "**Restart the dev server before running this one.** It edits a CSS " +
      "module, and a `composes` change does not reliably hot-reload — under " +
      "`pnpm break` the symptom is a guard reported as ABSENT when it is " +
      "there, which is the one direction that wastes a repair.",
    file: "apps/frontend/src/components/Movers/Movers.module.css",
    find: "  min-width: 101px;",
    replace: "  min-width: 100px; /* pnpm break: reverted automatically */",
    command: ["pnpm", "e2e", "overview-movers-hold.spec.ts", "--anyway"],
    expect: "a pointer in EITHER list holds BOTH",
  },
  // ## Task 4.8.10's one, on Epic 14's second condition made mechanical
  //
  // The defect is the one the next story writes rather than an invented one:
  // Epic 5 fills the `Unusual activity` region, its own `EPIC.md` says *every
  // tracked security scored 0-100, ranked*, and the cheapest version of that
  // is a list over the universe. The plant is that list, in that region, in
  // the markup a reader would write, and it typechecks.
  {
    name: "a-row-per-security-on-the-landing-page",
    proves:
      "A surface on `/` renders one element per tracked security \u2014 Epic " +
      "14's SECOND reversal condition, adopted 2026-10-09 and worded " +
      "exactly for this. The plant is the shape Epic 5 is most likely to " +
      "write: the `Unusual activity` region, which is `reserved` today, " +
      "drawing an `<li>` per entry of the universe it already holds. The " +
      "landing document goes from 491 elements to 1,009 on a 518-security " +
      "store, and `/` joins `/securities` in `PRODUCT_SPEC.md` \u00a728's " +
      "exception list \u2014 Task 4.8.6 priced it at a worst animation frame " +
      "of 24.7 ms becoming roughly 60-75.\n\n" +
      "**Nothing cheaper can see it.** jsdom computes no layout, but that " +
      "is not even the obstacle: the claim is about the whole document the " +
      "route produces, which only a real page has, and `pnpm invariants` " +
      "is a grep over text. A node CEILING would be a figure somebody has " +
      "to re-measure every time a reserved region is filled, so the " +
      "assertion is an EQUALITY between the full universe and a 27-row " +
      "sample of the same body.\n\n" +
      "**Two things this entry records because they cost a draft each.** " +
      "The `<tr>` half of that spec is GREEN on this plant \u2014 the planted " +
      "list is `<li>`, so a check that only forbade a table on `/` would " +
      "pass wrongly, and the printed `rowsAtFullUniverse: 0` beside the " +
      "failure is that transcript. And the spec's FIRST draft settled on " +
      "three regions being visible, which happens long before " +
      "`GET /securities` is answered: the untrimmed arm read 491 with the " +
      "plant drawing nothing yet, the two arms differed by the TRIMMED " +
      "arm's 27 rows, and the shipped tree was green for a reason that had " +
      "nothing to do with the claim. Both arms now prove the body arrived " +
      "and read the count only once it has stopped moving.",
    file: "apps/frontend/src/routes/MarketOverview.tsx",
    find: '          filledBy="Every tracked security scored 0\u2013100 for how unusual its behaviour is, ranked, each score carrying its explanation."\n        />',
    replace:
      "        >\n" +
      "          {/* pnpm break: reverted automatically */}\n" +
      "          <ul>\n" +
      "            {[...names.keys()].map((symbol) => (\n" +
      "              <li key={symbol}>{symbol}</li>\n" +
      "            ))}\n" +
      "          </ul>\n" +
      "        </Region>",
    command: [
      "pnpm",
      "e2e",
      "overview-no-element-per-security.spec.ts",
      "--anyway",
    ],
    expect: "does not grow with the tracked universe",
  },
  // ## Task 4.5.8's three, on what a RANKED frame can be checked against
  //
  // All three were produced against the shipped files before they were
  // written down, under `CLAUDE.md`'s procedure: the file the next story
  // would write, run first, with the transcript of it passing kept. The
  // transcripts are in `TASK-08`.
  //
  // The instrument for all three is `overview-movers-ranking.spec.ts`, which
  // is a **pass-through** — `ws.connectToServer()`, every frame forwarded
  // verbatim, no stub at all — because four overview specs in Story 4.3
  // passed against a server with the ranking deleted, each furnishing the
  // order it then checked.
  {
    name: "the-movers-population-is-the-join-whole",
    proves:
      "The movers are ranked over the 503 EQUITIES rather than over the " +
      "join's whole answer. The join sees all 518 since Task 4.4.4, so the " +
      "whole universe is sitting there in the right shape, and a ranking " +
      "over it puts `SPY` and the eleven sector SPDRs in the lists " +
      "**beside their own constituents** \u2014 every figure on the row " +
      "correct, the order correct, and a denominator that disagrees with " +
      "the count directly above it on screen.\n\n" +
      "**It is deliberately a substitution the three-link chain in " +
      "`breadth-is-counted-over-the-equities-alone` cannot see**, which is " +
      "a finding rather than a convenience: that chain runs " +
      "`breadth:` \u2192 `const eligible =` \u2192 `const equities =` " +
      "\u2192 the identifier `isEquitySymbol`, and it stops at the " +
      "binding's NAME. What the binding is built FROM is unchecked, so " +
      "`new Set(trackedTickers())` keeps every link intact and widens the " +
      "population to 518. `pnpm invariants` reports all clauses holding " +
      "under this break. What catches it is a figure read from an " +
      "independent source: `GET /securities` says 503 active equities and " +
      "the frame says 518.\n\n" +
      "Produced under the break: `expect(movers.tracked).toBe(population." +
      "length)` read `Expected: 503 / Received: 518`, and the second " +
      "test's `expect(movers.eligible).toBe(moves.length)` read the " +
      "same pair \u2014 two assertion failures, no page error, and " +
      "`pnpm invariants` reporting every clause holding except " +
      "`every-break-can-still-land`, which fires on any applied break. " +
      "`overview-breadth-counts." +
      "spec.ts` goes red on the same substitution and for the same reason, " +
      "which is two instruments rather than a redundancy: the count and " +
      "the ranking are one array and a defect in the set is visible in " +
      "both.",
    // `build: true` for `the-producer-forgets-to-rank-the-sectors`' recorded
    // reason: `pnpm e2e` drives the dev pair, which serves `dist/`, and a
    // watch loop that rebuilds on the break and not on the restore leaves
    // byte-identical source beside a broken `dist/` \u2014 a red suite that
    // reads exactly like a flake.
    file: "apps/backend/src/index.ts",
    find: "const isEquitySymbol = new Set<string>(equityTickers());",
    replace:
      "// pnpm break: reverted automatically\n" +
      "const isEquitySymbol = new Set<string>(trackedTickers());",
    command: ["pnpm", "e2e", "overview-movers-ranking.spec.ts", "--anyway"],
    expect: "the population is the set the universe says it is",
    build: true,
  },
  {
    name: "the-movers-lists-are-direction-swapped",
    proves:
      "Each list holds the rows whose direction matches its own heading. " +
      "The swap below is the one transposition that is **invisible to every " +
      "structural check on the wire**: `readMovers` verifies that each list " +
      "is in the comparator's own order and that the two are disjoint, and " +
      "both survive \u2014 a `GAINERS` list of falls, inserted " +
      "un-reversed, is descending by key and passes `isRankedByMove`, and a " +
      "`LOSERS` list of rises, inserted reversed, is ascending and passes " +
      "`isRankedByMove(\u2026, true)`. So the frame is accepted, the " +
      "region draws, every figure is individually correct, every ordinal " +
      "ascends, and the screen says the day's five biggest falls are the " +
      "gainers.\n\n" +
      "**It cannot be caught by a sign assertion**, which is why the spec " +
      "does not write one as the wrong-end check: under a " +
      "`sorted.slice(0, 5)` / `sorted.slice(-5)` implementation a one-sided " +
      "market puts the same sign at both ends. What catches it is the " +
      "relation BETWEEN the lists \u2014 the weakest gainer is strictly " +
      "stronger than the strongest loser, which fails under a " +
      "transposition and under a reversal and holds in every one-sided " +
      "state.\n\n" +
      "Produced under the break: `expect(Math.min(...shownGainers))." +
      "toBeGreaterThan(Math.max(...shownLosers))` read " +
      "`Expected: > 0.04 / Received: -0.03` \u2014 the swapped `GAINERS` " +
      "drew `-0.02, -0.02, -0.02, -0.02, -0.03`, least-negative first, " +
      "and the swapped `LOSERS` drew the five smallest rises. Both tests " +
      "in the file went red, with assertion failures and other tests " +
      "still collecting.",
    file: "packages/shared/src/sector-ranking.ts",
    find:
      '    if (direction === "positive") keepBounded(gainers, { item, key }, limit);\n' +
      '    if (direction === "negative")\n' +
      "      keepBounded(losers, { item, key }, limit, true);",
    replace:
      "    // pnpm break: reverted automatically\n" +
      '    if (direction === "negative") keepBounded(gainers, { item, key }, limit);\n' +
      '    if (direction === "positive")\n' +
      "      keepBounded(losers, { item, key }, limit, true);",
    command: ["pnpm", "e2e", "overview-movers-ranking.spec.ts", "--anyway"],
    expect: "disjoint from the other",
    build: true,
  },
  {
    name: "the-cut-keeps-the-first-five-it-meets",
    proves:
      "**The cut** \u2014 that nothing outside a list outranks the " +
      "smallest thing inside it, which is the whole difference between a " +
      "ranking and ten plausible rows. The substitution stops the bounded " +
      "insert the moment the list is full rather than when the candidate " +
      "fails to overtake anything, so each list becomes the first five " +
      "qualifying securities **in population order**, ranked among " +
      "themselves.\n\n" +
      "Every other property survives it: five rows, five distinct symbols, " +
      "both lists disjoint, every row keyed, each list in the comparator's " +
      "own order at displayed precision, every direction matching its " +
      "heading, `eligible` and `tracked` unchanged, and the two lists " +
      "interleaving in exactly one way. `readMovers` accepts the frame and " +
      "the region draws it. **Nothing on the screen or on the wire is " +
      "wrong except which five securities they are** \u2014 which is why " +
      "the only instrument that can see it is one that recomputes the " +
      "population's moves from a second source.\n\n" +
      "**Produced under the break, and the transcript is the reason this " +
      "entry is the most useful of the three: the FIRST test PASSED.** " +
      "Every frame-checkable claim \u2014 the bound, the keys, the two " +
      "orders, the disjointness, the interleave, the directions, the " +
      "population and the screen\u2019s agreement with the frame \u2014 " +
      "was green on a top five that was not the top five, which is " +
      "`CLAUDE.md`\u2019s *confirm the check passes WRONGLY first* " +
      "produced rather than reasoned about. The second test read " +
      "`Expected [12.44, 11.98, 8.54, 8.51, 8.4] / Received " +
      "[3.37, 1.94, 1.55, 1.37, 0.37]`, and **271 of the 503 eligible " +
      "securities outranked the weakest row the region drew**.\n\n" +
      "It goes red in `pnpm test` too, at `sector-ranking.test.ts`' " +
      "*agrees with the full sort it replaces*. That is the point rather " +
      "than a redundancy: the unit test proves the rule against a corpus " +
      "**we wrote**, and this spec proves the shipped producer applied it " +
      "to the 503 securities in the store.",
    file: "packages/shared/src/sector-ranking.ts",
    find: "  if (at >= limit) return;",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  if (kept.length >= limit) return;",
    command: ["pnpm", "e2e", "overview-movers-ranking.spec.ts", "--anyway"],
    expect: "recomputed from the store's own closes",
    build: true,
  },
  // ## Task 4.5.8's two, both on the width of a ticker
  //
  // One per side of `the-universe-holds-no-ticker-wider-than-the-track`: the
  // claim is an arithmetic relation between a **curated file** and a
  // **stylesheet**, and a check on either half alone passes the day the other
  // moves. So the data half is broken by curating a row and the geometry half
  // by narrowing the track back to the value the defect shipped with.
  //
  // **Neither target is the file the check was written around**, which is the
  // rule a break is worth the least for breaking: the check reads two files
  // and both breaks edit one of the two rather than the check.
  {
    name: "a-seven-character-ticker-is-curated",
    proves:
      "A row is added to the tracked universe whose symbol is wider than " +
      "the movers row's ticker track \u2014 which is what a curator does, " +
      "not what a programmer does, and is why the claim needed a mechanism " +
      "at all. It compiles, it lints, `pnpm test` is green, every browser " +
      "spec is green, and on one row of one region the ticker paints over " +
      "the 8 px mark slot and, at 390 where the gap is 4 px, over the " +
      "company name. `.symbol` is `white-space: nowrap` with no `overflow` " +
      "and a grid item does not clip, so nothing below `pnpm probe` can " +
      "see it \u2014 and `pnpm probe` can only see it on a day the symbol " +
      "happens to be in the top five.\n\n" +
      "The substitution adds a **triple**, which is the form the next row " +
      "takes whatever the constructor around it is called \u2014 rather " +
      "than lengthening an existing symbol, which is a thing nobody does.",
    file: "apps/backend/src/universe.ts",
    find: '    ["IWM", "iShares Russell 2000 ETF", "ARCA"],',
    replace:
      '    ["IWM", "iShares Russell 2000 ETF", "ARCA"],\n' +
      "    // pnpm break: reverted automatically\n" +
      '    ["GOOGL.X", "Alphabet Inc. Class A, when issued", "NASDAQ"],',
    command: ["pnpm", "invariants"],
    expect: "longer than 5 characters",
  },
  {
    name: "the-movers-ticker-track-narrows-to-the-sector-rows",
    proves:
      "The movers row's ticker track is set back to the 52 px the sector " +
      "row states \u2014 which is the defect Task 4.5.8 repaired, written " +
      "the way it was written the first time: by reaching for the value one " +
      "rule further down the same stylesheet. 52 px leaves the symbol 36, " +
      "and `GOOGL`, `CMCSA` and `BRK.B` measure 44.20 in the shipped face " +
      "and 50.73 in the cold-load one.\n\n" +
      "It is the half a check on the curated file alone cannot see: the " +
      "data is unchanged and every symbol is five characters or fewer, so " +
      "the only thing that has moved is the room they are drawn in.",
    file: "apps/frontend/src/components/RankedList/RankedList.module.css",
    find: "  grid-template-columns: 2ch 68px minmax(0, 1fr) 80px 78px;",
    replace:
      "  /* pnpm break: reverted automatically */\n" +
      "  grid-template-columns: 2ch 52px minmax(0, 1fr) 80px 78px;",
    command: ["pnpm", "invariants"],
    expect: "narrower than a five-character ticker needs",
  },

  // ## The two sticky reservations, and why they are two breaks rather than one
  //
  // Task 4.6.1. Each edge is reserved by its own declaration, each is exercised
  // by a walk in **one** direction — forward Tab brings an off-screen target to
  // the bottom edge, Shift+Tab to the top — so a single break would leave the
  // other declaration's clause unproven. The substitution in both is the
  // *defect as it shipped*: the chrome's height reserved exactly, with the
  // focus ring left outside it.
  //
  // **`base.css` is Vite-served**, and this repository has a recorded false
  // all-clear from a CSS break run against a dev server that had been up for
  // hours. `pnpm invariants` reads the file from disk rather than the server, so
  // these two are immune to it — but the browser walk the same defect fails is
  // not, and if it is run by hand the server is restarted first.
  {
    name: "the-top-reservation-forgets-the-ring",
    proves:
      "`scroll-padding-top` reserves the sticky chrome exactly and leaves " +
      "the focus ring outside it \u2014 which is what shipped from " +
      "2026-09-11 to 2026-10-08 and is `docs/GAPS.md`'s own entry. Every " +
      "stop the browser scrolls flush to the masthead then has 4 px of a " +
      "2 px outline behind it, at every width and on every route.\n\n" +
      "It is invisible to everything below a browser \u2014 jsdom computes " +
      "no layout and axe reads zero violations throughout \u2014 and it " +
      "was invisible to the browser spec that walked for it, because that " +
      "spec compared the same border box the declaration reserved. " +
      "`overview-focus-ring.spec.ts` goes red at -4.00 px on the Shift+Tab " +
      "walk at all four widths; this is the half that runs with no server.",
    file: "apps/frontend/src/styles/base.css",
    find:
      "  scroll-padding-top: calc(\n" +
      "    var(--sticky-chrome-height, 0px) + var(--focus-reach) +\n" +
      "      var(--scroll-overshoot)\n" +
      "  );",
    replace:
      "  /* pnpm break: reverted automatically */\n" +
      "  scroll-padding-top: calc(\n" +
      "    var(--sticky-chrome-height, 0px) + var(--scroll-overshoot)\n" +
      "  );",
    command: ["pnpm", "invariants"],
    expect: "does not name `--focus-reach`",
  },
  {
    name: "the-bottom-reservation-is-a-typed-length",
    proves:
      "The footer's reservation is written as a length rather than as its " +
      "terms \u2014 `calc(33px + 4px)`, which is the status bar's height at " +
      "1440 and the ring's reach, both correct at the width the author had " +
      "open. The bar wraps to two rows at 768 and three at 390, where its " +
      "height is 53 and 73, so a typed length is right at one viewport and " +
      "20 to 40 px short at the others \u2014 and the narrow ones are the " +
      "ones a development machine never shows.\n\n" +
      "The arithmetic still reads as the repair, which is what makes it the " +
      "likelier re-implementation than deleting a term: the numbers are " +
      "both real, and both were measured \u2014 once.",
    file: "apps/frontend/src/styles/base.css",
    find:
      "  scroll-padding-bottom: calc(\n" +
      "    var(--sticky-footer-height, 0px) + var(--focus-reach) +\n" +
      "      var(--scroll-overshoot)\n" +
      "  );",
    replace:
      "  /* pnpm break: reverted automatically */\n" +
      "  scroll-padding-bottom: calc(33px + 4px);",
    command: ["pnpm", "invariants"],
    expect: "does not name `--sticky-footer-height`",
  },

  // The next region that makes a row clickable will not be written in any of
  // the four directories Task 4.6.4's own brief names, because a new region is
  // a new directory by this repository's convention. So the break is performed
  // on a **fifth** surface on the same screen, which is the clause that matters:
  // the check walks the shipped trees, and a directory list — which is what
  // the first draft of it was, and which was GREEN on a
  // `components/UnusualActivity/` written to prove it — cannot see a file
  // that does not exist yet.
  {
    name: "a-row-handler-moves-the-address",
    proves:
      "A surface that draws rows resolves its destination at ACTIVATION " +
      "rather than at render. The frame that re-orders the list lands " +
      "between the key press and the handler — 0.4 order changes and 0.3 " +
      "membership changes a minute, measured over three sessions — and " +
      "the wrong security opens with every number on screen right " +
      "throughout, which is the one thing a reader cannot undo with their " +
      "eyes. With a `<Link to={securityPath(symbol)}>` the defect is not " +
      "representable; the check is what keeps it that way (Task 4.6.4).",
    file: "apps/frontend/src/components/BreadthLedger/BreadthLedger.tsx",
    find: "}: BreadthLedgerProps) {\n  const quietHeadingId = useId();",
    replace:
      "}: BreadthLedgerProps) {\n" +
      "  // pnpm break: reverted automatically\n" +
      "  const open = (symbol: string) => {\n" +
      "    globalThis.location.href = `/securities/${symbol}`;\n" +
      "  };\n" +
      "  void open;\n" +
      "  const quietHeadingId = useId();",
    command: ["pnpm", "invariants"],
    expect: "`location.href`",
  },
  // **The guard axe can no longer give — Task 4.6.6, ADR 0039.**
  //
  // `Region` passes `Panel`'s `scrollable`, which is `overflow: auto` **and**
  // `tabIndex={0}` on one element, because a box that scrolls and cannot be
  // reached by keyboard is a WCAG 2.1.1 failure. That property was held by
  // axe's `scrollable-region-focusable` and **cannot be any more**: the rule
  // does not fire while the scrolling box contains something focusable — which
  // is why the original defect stood five stories — and Story 4.6 put links
  // inside the rows of three of the landing route's regions. The replacement is
  // `expectEveryRegionIsATabStop`, on both routes that draw regions.
  //
  // The substitution deletes the prop, which is the loudest form of the defect
  // and the one the axe gate would have caught before Story 4.6. **The defect
  // the next author actually writes was tried first, per `CLAUDE.md`'s
  // 2026-09-26 rule**: `scrollable={children !== undefined}` — a stop only
  // where there is content, which is the better of the two conditions ADR 0039
  // rejects. It goes red on `/` at both widths, naming `Market topology`,
  // `Unusual activity` and `Current investigations` at `tabIndex -1`.
  //
  // **And the `/securities` half passed wrongly against it**, which is why the
  // command below runs both: all eight of that route's regions have content, so
  // the conditional form is invisible there. The landing route is the only
  // surface in this product that draws a `reserved` region, and it is therefore
  // the only one that can see the condition a re-implementer reaches for.
  {
    name: "a-region-stops-being-a-tab-stop",
    proves:
      "A region keeps `overflow: auto` and loses its `tabIndex`, so a pointer " +
      "user can see content a keyboard user cannot reach — WCAG 2.1.1, the " +
      "defect Task 1.13.4 found on this product's first CI browser run. From " +
      "Story 4.6 onwards axe is structurally unable to report it, because " +
      "`scrollable-region-focusable` does not fire while the scrolling box " +
      "contains something focusable and three of the landing route's regions " +
      "now hold links (Task 4.6.6, ADR 0039).",
    file: "apps/frontend/src/components/Region/Region.tsx",
    find: "      className={className}\n      scrollable\n      title={name}",
    replace: "      className={className}\n      title={name}",
    command: [
      "pnpm",
      "e2e",
      "overview-region-order.spec.ts",
      "securities-route.spec.ts",
      "-g",
      "DOM order|keyboard stop",
      "--anyway",
    ],
    expect: "tabIndex -1",
  },

  // --- Task 4.6.5: the states where there is nothing to open ---
  //
  // The check these three prove is **a browser query rather than a grep**, and
  // that is the decision worth reading before adding a fourth:
  //
  //   > Every `<a>` on `/` whose href matches `/securities/` has, as its
  //   > accessible name, exactly a ticker the frame carried.
  //
  // Task 4.6.4's invariant was green on the exact defect it forbids because
  // its corpus was four directories, and *a new region is a new directory by
  // this repository's convention*. A query over the rendered page has no
  // corpus to be wrong about: the next author's region is on the page or it is
  // not on the screen. The transcript of it catching a stranger's file —
  // `<Link to={securityPath("advancing")}>` written into `BreadthLedger.tsx`,
  // a fifth surface in neither ranked directory — is in Task 4.6.5's record,
  // and the clause was re-ordered ahead of the link **count** because of it:
  // with the count leading, the same defect reads `Expected length: 22,
  // Received length: 23`, which is true and says nothing.
  {
    name: "the-reservation-links-its-slugs",
    proves:
      "`RESERVED_SECTORS`' eleven rows stop being `held`, so " +
      "`RankedList` builds each one a destination from its `symbol` \u2014 " +
      "which is the sector's own SLUG. The first paint of every load then " +
      "carries `/securities/technology` and ten more addresses that are " +
      "not securities. `visibility: hidden` and `aria-hidden` keep them " +
      "off the screen and out of the accessibility tree and do nothing " +
      "whatever to an `href`, which is why this shipped for a fortnight " +
      "with every check green (Task 4.6.5).",
    file: "apps/frontend/src/market/sector-performance.ts",
    find: "    held: true,\n  })),\n};",
    replace: "    // pnpm break: reverted automatically\n  })),\n};",
    command: ["pnpm", "e2e", "overview-nothing-to-open.spec.ts", "--anyway"],
    expect: "/securities/technology",
  },
  {
    name: "the-quiet-group-forgets-a-held-row",
    proves:
      "`RankedList`'s trailing group hard-codes `held={undefined}` instead " +
      "of asking the row. It read as sound \u2014 *a quiet row is one we are " +
      "refusing to RANK, which is the opposite of a row that is not " +
      "there* \u2014 and it was true when it was written. Every row of " +
      "`RESERVED_SECTORS` is rankless, so the reservation's eleven held " +
      "rows arrive in exactly that group and the line throws their `held` " +
      "away: the producer-side repair one file over is undone from here, " +
      "with nothing in that file changed (Task 4.6.5).",
    file: "apps/frontend/src/components/RankedList/RankedList.tsx",
    find: "              held={row.held}\n            />\n          ))}\n        </ul>",
    replace:
      "              /* pnpm break: reverted automatically */\n" +
      "              held={undefined}\n            />\n          ))}\n        </ul>",
    command: ["pnpm", "e2e", "overview-nothing-to-open.spec.ts", "--anyway"],
    expect: "/securities/technology",
  },
  // The third is the composition defect rather than the link, and the edit is
  // the one somebody plausibly writes: a guard that still READS as a guard.
  // `document.activeElement` after React removes the focused element is
  // `<body>`, which is not `null` \u2014 so `active !== null` returns early
  // every time and the recovery never runs, while the line looks like it is
  // checking that focus went somewhere.
  {
    name: "a-dropped-row-drops-the-focus",
    proves:
      "The region's hold pins the ORDER and Story 4.5.7 deliberately left " +
      "the MEMBERSHIP moving under it, at 0.21\u20130.44 changes a minute. So " +
      "the `<li>` holding a reader's focus unmounts with their hands " +
      "still on it, focus falls to `<body>`, the document's tab order " +
      "restarts at the top and their next press is six regions from " +
      "where they were reading. Two correct decisions; the defect exists " +
      "only where they meet, and no unit test drives the frame that " +
      "produces it (Task 4.6.5).",
    file: "apps/frontend/src/components/RankedList/RankedList.tsx",
    find: "    if (active !== null && active !== document.body) return;",
    replace:
      "    // pnpm break: reverted automatically\n" +
      "    if (active !== null) return;",
    command: ["pnpm", "e2e", "overview-nothing-to-open.spec.ts", "--anyway"],
    expect: "does not drop focus to the body",
  },
  // **The repair that looks like a tidy-up — Task 4.8.7.**
  //
  // The substitution is the file the next author writes, and it is not a
  // mangling: `return marketWallClockAt(instant).date;` is what
  // `marketDateAt` was until 2026-10-09, reads as one fact with one home, and
  // is what a reviewer would ask for. What it costs is **two
  // `Intl.formatToParts` calls per answer that are then discarded** — the
  // offset is computed and thrown away — measured at 1,554 calls for 518
  // conversions and 3.37 ms against 1.29 ms.
  //
  // The draft check this defect defeated is recorded in `check-invariants.mjs`
  // beside the invariant: a file-level grep for `marketDateFromParts` reports
  // `50 invariants hold.` against the line below, because `marketWallClockAt`
  // still calls the helper.
  {
    name: "the-market-date-takes-the-offset-path-again",
    proves:
      "`marketDateAt` goes back to being `marketWallClockAt(instant).date`, " +
      "which reads the market formatter's parts three times for an answer " +
      "that needs one and computes a UTC offset it discards. It was 93% of " +
      "the overview join's pre-repair 3.44 ms over 518 securities (the join " +
      "is 1.521 ms since — Task 4.8.11 — and this function's share of that " +
      "is unmeasured), which runs once per " +
      "applied batch plus three times per cold load of `/`, and 518 calls a " +
      "tick in the browser's own universe table. Nothing on any screen " +
      "changes, which is the whole reason the check has to be structural " +
      "(Task 4.8.7).",
    file: "packages/shared/src/market-time.ts",
    find: "  return marketDateFromParts(wallClockParts(instant));",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  return marketWallClockAt(instant).date;",
    command: ["pnpm", "invariants"],
    expect: "routes through the offset path",
  },
  // **A fourth path to the aggregate — Task 4.8.8.**
  //
  // The condition Epic 14's repaired 2026-10-07 clause rests on is a
  // **call-site count**, and a condition keyed on a count reads identically
  // whether anything holds it or not. The substitution is the file the next
  // story writes rather than a mangling: a timer that refreshes the overview
  // so a browser whose market has gone quiet is not left on a stale
  // aggregate. It is a plausible feature, it compiles, and nothing on any
  // screen looks wrong.
  //
  // **It was produced and run BEFORE the invariant existed**, which is the
  // 2026-09-26 rule: `pnpm invariants` reported `50 invariants hold.` against
  // exactly this line. `the-overview-frame-is-not-a-heartbeat` misses it
  // because the timer sits **outside the keepalive slice** — by one line — and
  // adds no `type: "overview"` encode site; `one-producer-of-the-overview-
  // aggregate` misses it because `buildMarketOverview` gains no call site.
  // The join is reached through `overview()`, which is unmemoised.
  //
  // `}, KEEPALIVE_INTERVAL_MS);` is the anchor rather than the `return {`
  // below it, because *outside the keepalive slice* is the whole point of the
  // defect and that marker is the slice's own end marker.
  {
    name: "a-fourth-path-to-the-aggregate",
    proves:
      "A fourth cadence for the overview aggregate, from a timer of its " +
      "own, placed one line outside the keepalive slice. Every existing " +
      "guard here is green on it: no new encode site, no new " +
      "`buildMarketOverview` call site, and the word `overview` in none of " +
      "the four feed-path regions. `overview()` is unmemoised, so each " +
      "call is a full join over all 518 securities — 1.521 ms a batch " +
      "(Task 4.8.11, re-taken after Task 4.8.7's repair and superseding " +
      "Task 4.8.3's 3.72 ms). Epic 14's 2026-10-07 clause fires on this " +
      "count, and before 2026-10-09 nothing read it (Task 4.8.8). **The " +
      "three paths are no longer three joins** — Task 4.7.3 made the " +
      "snapshot pair serve `lastBroadcastOverview` — which is why the " +
      "substitution passes `overview()` explicitly: a fourth path that " +
      "computes is exactly the shape the memo was introduced to stop " +
      "reappearing.",
    file: "apps/backend/src/market-gateway.ts",
    find: "  }, KEEPALIVE_INTERVAL_MS);",
    replace:
      "  }, KEEPALIVE_INTERVAL_MS);\n\n" +
      "  // pnpm break: reverted automatically\n" +
      "  const overviewRefresh = setTimer(() => {\n" +
      "    if (clients.size > 0) broadcast(overviewMessage(overview()));\n" +
      "  }, 30_000);",
    command: ["pnpm", "invariants"],
    expect: "sit outside both known producers",
  },

  // **The one break in this file whose first draft went GREEN on the defect,
  // and the transcript is in Task 4.8.11.** The obvious assertion is that *no
  // overview frame is sent with nobody attached* — and it passes against
  // the unguarded gateway, because `broadcast` iterates an empty map and no
  // frame reaches anybody either way. The join ran regardless. So the subject
  // had to be the PRODUCER being called, which is why the command below is a
  // process test with a `vi.fn()` in it rather than a grep.
  {
    name: "the-join-runs-with-nobody-attached",
    proves:
      "The 518-join runs on a deployment with nobody looking. " +
      "`overviewMessage()` is evaluated as an ARGUMENT to `broadcast`, so " +
      "removing this guard puts the join back in front of the client map " +
      "read \u2014 1.521 ms p50 a batch with zero clients (re-measured " +
      "2026-10-10, n = 298, tight, calibrator reference 1.217 ms), which is " +
      "10.3 ms of script a minute at the 6.8-batch midday floor and 24.5 ms " +
      "at the close's 16.1, for an aggregate sent to nobody " +
      "(`PRODUCT_SPEC.md` \u00a79.1's idle-rate condition). **Nothing on the " +
      "wire can see it**: no frame is sent either way, so only the producer " +
      "being called says so (Task 4.8.11).",
    file: "apps/backend/src/market-gateway.ts",
    find: "      if (clients.size === 0) return;",
    replace: "      // pnpm break: reverted automatically",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "run",
      "test:process",
      "src/market-gateway.process.test.ts",
    ],
    expect: "does NOT build the aggregate when no browser is attached",
  },
  // **The figures that do not survive a fresh join — Task 4.7.3.**
  //
  // The substitution is the **omission** a re-implementer makes rather than an
  // inversion: the `??` goes and the call keeps computing, which is what every
  // line of this gateway did until 2026-10-10 and what the next author will
  // write if they are reading the three paths rather than the memo. It
  // compiles, it typechecks, and on a healthy feed nothing on any screen looks
  // wrong — the aggregate a reconnect recomputes is the same one it was holding
  // **while bars are arriving**.
  //
  // **Three weaker drafts of this assertion were produced first and all three
  // were GREEN on the defect**, which is Task 4.8.11's lesson on this exact
  // surface, met a second time: *the reloaded tab receives an overview frame*,
  // *it carries as many figures as the first tab's*, and *it decodes and names
  // the symbol*. A poorer aggregate is a well-formed aggregate. The transcript
  // is in Task 4.7.3's record. What goes red is an assertion on **which of two
  // aggregates the gateway served**, with a producer whose answer changes
  // between the broadcast and the join.
  {
    name: "the-fresh-join-recomputes-the-aggregate",
    proves:
      "A reconnecting or subscribing browser is served a freshly computed " +
      "aggregate instead of the last broadcast one. Reachable with a " +
      "**reload** during an outage, and routine: breadth and movers come " +
      "from one eligibility pass over a **5-minute** window on each bar's " +
      "own `startsAt`, while a proxy or sector entry is marked `live` with " +
      "no expiry at all — so the top of `/` draws four live prices and " +
      "eleven ranked sectors and the middle says `none were heard from in " +
      "the last 5 minutes`. Two true halves, one contradiction (Task " +
      "3.4.9), by a fifth door. Nothing on the wire tells a served " +
      "aggregate from a recomputed one, so the assertion is on WHICH of " +
      "two the gateway sent.",
    file: "apps/backend/src/market-gateway.ts",
    find: "        send(client, overviewMessage(lastBroadcastOverview ?? overview()));",
    replace:
      "        // pnpm break: reverted automatically\n" +
      "        send(client, overviewMessage(overview()));",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "run",
      "test:process",
      "src/market-gateway.process.test.ts",
    ],
    expect: "serves a NEW browser what was last broadcast",
  },

  // **Two entries for one invariant, like `the-send-instant-is-not-a-clock`'s
  // pair, and for the same reason: the check has two conjuncts and they fail
  // differently.** The first is the word's presence, which the obvious revert
  // trips. The second is the parse's argument, and it is the conjunct that
  // earns its place — Task 4.8.12 ran the browser-side fold against a version
  // of the check carrying only the first conjunct and it reported
  // `52 invariants hold.` with the defect in the file.
  {
    name: "the-overview-note-dates-the-arithmetic",
    proves:
      "The landing page's source note draws the instant the JOIN ran. The " +
      "gateway reaches the producer on every connect and every subscribe " +
      "— three joins per cold load of `/`, counted off the wire — " +
      "so on a feed that has stopped the sentence reads the minute the " +
      "reader opened the tab, under a term saying it describes the figures " +
      "above it. Invariant 6 implied rather than displayed, and it shipped " +
      "that way from 2026-09-26 to 2026-10-10 (Task 4.8.12).",
    file:
      "apps/frontend/src/components/OverviewSourceNote/" +
      "overview-source-note.ts",
    find: "  const instant = Date.parse(overview.observedAt);",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  const instant = Date.parse(overview.computedAt);",
    command: ["pnpm", "invariants"],
    expect: "reads `computedAt`",
  },
  {
    name: "the-overview-note-folds-the-instant-in-the-browser",
    proves:
      "The note dates the screen from the figures the FRAME carries rather " +
      "than from the join's whole answer — the rejected alternative, " +
      "and it fails in two directions at once. The sections are selections " +
      "(four proxies, eleven benchmarks, the top five either way) while " +
      "breadth's counts and the movers' denominator are taken over 503 " +
      "equities whose own instants never travel: so the drawn instant is " +
      "older than the truth, and it is **absent altogether** on a frame " +
      "whose proxies are yesterday's closes while five hundred equities are " +
      "live, which is the ordinary state of IEX. The word `computedAt` is " +
      "nowhere in the file, so the first conjunct is green on it " +
      "(Task 4.8.12).",
    file:
      "apps/frontend/src/components/OverviewSourceNote/" +
      "overview-source-note.ts",
    find: "  const instant = Date.parse(overview.observedAt);",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  const instant = Date.parse(overview.figures[0].at);",
    command: ["pnpm", "invariants"],
    expect: "is not the aggregate's observation instant",
  },
  // **Task 4.7.1's, and it restores the harness exactly as it behaved for a
  // fortnight** — the strongest kind, because the check is proved against the
  // defect it was written for rather than a synthetic one.
  //
  // The substitution is the omission a re-implementer makes rather than an
  // inverted condition: the refusal branch, the option and both docblocks stay
  // exactly where they are, read correctly, and the one line that ever makes
  // `dropped` true is gone. That is the shape of the original defect too —
  // Task 3.10.9 fixed this in `scripts/state-grid.mjs`, which was deleted, and
  // nobody carried the fix into the shared harness.
  //
  // **Two of the three tests go red and they fail on different claims**, which
  // is what makes this a proof rather than a crash: the first on the chrome no
  // longer being byte-identical either side of the retry, the third on the
  // poorer aggregate never being served. The second test — the one that
  // asserts the DEFAULT still answers the retry — stays green, because the
  // break is the default.
  {
    name: "the-harness-answers-the-browsers-own-retry",
    proves:
      "A produced `disconnected` HEALS ITSELF about two seconds after " +
      "`drop()`, because the harness answers the browser's own retry with a " +
      "fresh `live` snapshot \u2014 `ABNORMAL_FIRST_MS` in " +
      "`reconnect-policy.ts`. A real outage does not answer the retry, so " +
      "every assertion about a stopped feed becomes a race with it: the " +
      "state is read inside a two-second window rather than held, and a spec " +
      "that asserts it one line later reads the HEALED screen and says " +
      "nothing at all about the outage.\n\n" +
      "It is Task 3.10.9's fourth instrument error, whose own write-up names " +
      "the tell \u2014 *one state giving two readings from one drive*. Nothing " +
      "below a browser can see it: the thresholds have unit tests and the " +
      "retry has unit tests, and what neither can do is lose a socket and " +
      "then be asked for another one.",
    file: "e2e/support/feed.ts",
    find:
      "      // **Set before the close, and it is what `reconnect` and\n" +
      "      // `overviewOnReconnect` key on** \u2014 see `dropped` above for why a\n" +
      "      // connection count was the wrong thing to key on.\n" +
      "      dropped = true;",
    replace:
      "      // pnpm break: reverted automatically \u2014 the harness as it\n" +
      "      // behaved until 2026-10-10, answering every retry.",
    command: ["pnpm", "e2e", "overview-held-outage.spec.ts", "--anyway"],
    expect: "a produced disconnection is held",
  },
  // **The age beside the denominator** (Task 4.7.4), and the substitution is
  // the **omission** a re-implementer makes rather than an inversion: the
  // interval goes and the clause keeps formatting the instant the wire sent,
  // which is what every surface in this product that prints a *through* does
  // today — `OverviewSourceNote`'s `Observed through` and `FeedIndicator`'s
  // `Showing data through` both draw a bar's own `startsAt` raw.
  //
  // It cannot be verified by reading the check: the first draft of the
  // invariant was *the builder reads `observedAt`*, and the defect that
  // matters — a second producer folding its own instant off
  // `overview.figures` — passed it green. That transcript is in Task 4.7.4's
  // record; this break proves the half a one-file grep can see.
  {
    name: "the-footer-age-drops-its-interval",
    proves:
      "The age two regions state beside their denominator is drawn from a " +
      "bar's own `startsAt`, which is the **start** of the minute the bar " +
      "describes. Measured with a control (`LIVE-DATA.md` §7.3): one " +
      "stamped `14:01:00Z` arrives at `14:02:00.5Z`, so the data reaches " +
      "through 14:02 and the raw read says 14:01 — under-stating the " +
      "reach by a minute, in the direction that makes a healthy feed look " +
      "behind. Task 3.3.4 made the same correction in `feed-liveness.ts`, " +
      "where leaving it out made `live` structurally unreachable during a " +
      "session, silently, with every test green.",
    file: "apps/frontend/src/market/measured-set.ts",
    find: "  const closedAt = new Date(startsAt + OBSERVATION_INTERVAL_MS);",
    replace:
      "  // pnpm break: reverted automatically\n" +
      "  const closedAt = new Date(startsAt);",
    command: ["pnpm", "invariants"],
    expect: "without adding `OBSERVATION_INTERVAL_MS`",
  },
  // **The feed frame's rate** (Task 4.7.7), and the substitution is the tree
  // as it stood until this task rather than an invention: `publishFeedState`
  // broadcast on every call, and every advance of the vendor connection — once
  // per item of an inbound message and again on its `ping` — was a call.
  // Measured on the deployed gateway in session: **~332 frames a minute**,
  // 119 bytes each uncompressed, ≈15.4 MB a session per attached browser.
  //
  // **Nothing on any screen looks wrong under the break**, which is why it
  // survived a whole epic: `sameLiveFeedView` collapses the no-op render, so
  // the mitigation for the symptom predated any count of the cause. The
  // command is therefore a process test with a real socket, counting frames —
  // no unit level can see a rate, and no local stream can produce one
  // (`fixture-stream.ts` applies once per tick, `replay-stream.ts` once per
  // slice).
  {
    name: "the-feed-frame-is-a-heartbeat-again",
    proves:
      "A `feed` frame is broadcast to every attached browser on every " +
      "`publishFeedState()` rather than only when the PUBLISHED view " +
      "changes \u2014 three primitives, compared by `sameWireFeedState`. What " +
      "moves 332 times a minute is the watchdog's private bookkeeping " +
      "(`lastInboundAt`), which is not on the wire at all, and the browser " +
      "re-derives nothing from it. It is a bytes-and-battery defect rather " +
      "than a render one, so no screen and no render count can see it.",
    file: "apps/backend/src/market-gateway.ts",
    find:
      "      const state = feedState();\n" +
      "      const last = lastPublishedFeedState;\n" +
      "\n" +
      "      if (last !== undefined && sameWireFeedState(state, last)) return;\n" +
      "\n" +
      "      lastPublishedFeedState = state;\n" +
      "      broadcast(feedMessage(state));",
    replace:
      "      // pnpm break: reverted automatically\n" +
      "      broadcast(feedMessage(feedState()));",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "run",
      "test:process",
      "src/market-gateway.process.test.ts",
    ],
    expect: "sends ONE frame for 332 publishes of an unchanged state",
  },
  // **The keepalive's derivation** (Task 4.7.7). The substitution is the value
  // it held until this task, and the point of the entry is that reverting it
  // is exactly the edit that looks harmless: 120 s is *half the 240 s ingress
  // ceiling*, which is a true sentence about a ceiling that is no longer the
  // binding constraint. Once the gate above removed the vendor's 54 s
  // heartbeat from the browser's inbound stream, the browser's idle floor
  // became this timer, and at 120 s the 165 s `DISCONNECTED_AFTER_MS` is
  // **1.375** keepalives \u2014 one delayed message puts a healthy browser on
  // `DISCONNECTED`.
  {
    name: "the-keepalive-stops-being-three-missed-heartbeats",
    proves:
      "`KEEPALIVE_INTERVAL_MS` is derived from the threshold that READS " +
      "it \u2014 `DISCONNECTED_AFTER_MS / 3`, ADR 0036's three-missed-" +
      "heartbeats rule applied to our own heartbeat rather than Alpaca's. " +
      "A literal passes every other check in the tree and keeps clearing " +
      "the 240 s ingress ceiling, so nothing else notices that the margin " +
      "against the disconnection threshold has gone from 3\u00d7 to 1.375\u00d7.",
    file: "apps/backend/src/market-gateway.ts",
    find: "export const KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3;",
    replace:
      "// pnpm break: reverted automatically\n" +
      "export const KEEPALIVE_INTERVAL_MS = 120_000;",
    command: [
      "pnpm",
      "--filter",
      "@marketpulse/backend",
      "test",
      "src/market-gateway.test.ts",
    ],
    expect: "is three missed heartbeats of OUR OWN heartbeat",
  },
];
