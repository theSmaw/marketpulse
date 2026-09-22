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
      "minute, 56.9 KiB measured on the wire, and discarded 517 of them. The " +
      "cost scales with browsers \u00d7 universe and both only grow.",
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
    expect: "reads the send instant",
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
    find: "      gateway.publishObservations(currentMarketState.observe(observations));",
    replace:
      "      // pnpm break: reverted automatically\n" +
      "      gateway.publishObservations(observations);",
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
    find: "        if (!tracked.has(observation.symbol)) continue;",
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
    file:
      "planning/epic-03-live-market-data/" +
      "story-11-cost-performance-and-the-epic-close/STORY.md",
    find: "**Status:** Not started",
    replace: "**Status:** Complete <!-- pnpm break: reverted automatically -->",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "rehearsal rows",
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
];
