/**
 * `pnpm universe:check` — compare the curated universe against what the vendor
 * currently lists, and **change nothing** (Task 2.7.8).
 *
 * This is the shape Story 2.7's open decision 4 settled on: not a status
 * transition written during ingestion, and not silence. `UNIVERSE.md` §15 is
 * the argument and this file is the mechanism.
 *
 * ## What it is for, and it is not mainly `delisted`
 *
 * `UNIVERSE.md` §5 records the curated file's one real cost as a gap of this
 * repository's third kind: **it goes stale silently, and nothing can tell.**
 * This is the first instrument that can see any of that staleness, and on the
 * day it was written it found an instance — `WMT` carried `NYSE` in the file
 * against `NASDAQ` at the vendor, Walmart having moved its listing. That is the
 * difference between this and the `delisted` mechanism Story 2.3 expected: a
 * transition writer would have been built against **no instance**, which
 * `UNIVERSE.md` declines on principle, and this has one.
 *
 * ## It compares the FILE, not the database
 *
 * Deliberately, and it is what makes "changes no row" structural rather than
 * disciplined: there is no pool here, no `Kysely`, and no database to point at.
 * `pnpm universe:check` therefore needs no database at all, unlike
 * `pnpm universe`, and cannot be made to write one by a future edit without
 * that edit being obvious.
 *
 * It also means the `status` filter question `UNIVERSE.md` §12.2 puts to every
 * reader does not arise: the file's rows are `active` by construction.
 *
 * ## It is not a `pnpm verify` step, and it never can be
 *
 * `verify` runs with **no network access** — Story 2.7's acceptance criterion 7,
 * measured at every clean-clone run since Story 2.1 — and with no credential.
 * A check that needs both would fork the definition of "verified" in exactly the
 * way `README.md`'s founding rule exists to prevent. The `:check` suffix it
 * shares with `env:check` and `format:check` names the *kind* of thing it is —
 * compare two descriptions and report the drift — and not where it runs.
 */

import type { AlpacaAsset } from "./alpaca-assets.js";
import type { Security } from "@marketpulse/shared";

/**
 * One thing worth a person's attention.
 *
 * A discriminated union rather than a list of strings, for the reason
 * `BarsResult` is one: the report renders each kind differently and a test
 * asserts on the kind rather than on prose, so rewording a sentence does not
 * move a check.
 */
export type UniverseFinding =
  | {
      /**
       * In our file; the vendor lists it, and says it is not active.
       *
       * **This is a `delisted` CANDIDATE and not a delisting.** Alpaca's
       * `inactive` means "we will not trade it", which was measured against the
       * tape at **8% disagreement** — 4 of 50 sampled inactive symbols were
       * still printing daily bars. `UNIVERSE.md` §15.2.
       */
      readonly kind: "not-active";
      readonly symbol: string;
      readonly vendorName: string;
    }
  | {
      /**
       * In our file, and the vendor has never heard of it.
       *
       * Different from `not-active` and reported separately because the fix is
       * different: this is a symbol that is wrong, retired outright, or
       * recycled away, where `not-active` is a security the vendor knows and
       * has stopped carrying.
       */
      readonly kind: "unknown-to-vendor";
      readonly symbol: string;
    }
  | {
      /** Our `exchange` is not the vendor's. Real, checkable staleness. */
      readonly kind: "exchange-drift";
      readonly symbol: string;
      readonly ours: string;
      readonly theirs: string;
    }
  | {
      /**
       * Our symbol is active, and the vendor ALSO holds an inactive row for it
       * under a different name — so the ticker has been recycled.
       *
       * **The one finding here with no instance in our universe today**, and it
       * is included anyway because it is the only thing that would catch the
       * corruption Story 2.7's open decision 5 leaves open: the loader keys on
       * `symbol`, and 229 tickers in the current market carry both an active
       * and an inactive row. `UNIVERSE.md` §15.6 has the mechanism.
       *
       * It is three lines over data already fetched and it is testable as a
       * pure function against a synthetic row, which is what keeps it on the
       * right side of the line `UNIVERSE.md` draws against mechanisms built
       * with nothing to test them on.
       */
      readonly kind: "recycled-ticker";
      readonly symbol: string;
      readonly previousName: string;
    };

/**
 * Compare the curated universe against the vendor's catalogue.
 *
 * **Pure, and taking both sides as parameters**, which is the property that
 * matters: `validateUniverse` is written the same way and for the same reason —
 * it is what lets the fast suite hand this synthetic catalogues, including the
 * two findings that have no instance in the shipping file and could otherwise
 * only ever be watched *not* firing.
 *
 * ## Names are deliberately NOT compared, and that is a measurement
 *
 * The obvious third check is `name`, and it was built and removed. Against the
 * real catalogue it reports **64 of 101** rows differing, of which **zero** are
 * substantive: the vendor writes house style — `State Street Technology Select
 * Sector SPDR ETF` for `Technology Select Sector SPDR Fund`, `Eli Lilly & Co.`
 * for `Eli Lilly and Company`. A report that is 64 lines of noise around one
 * real finding is a report nobody reads, which is the failure Task 2.3.6 named
 * when it declined to shout the same line on every run forever. `exchange` is a
 * short controlled vocabulary and drifts only when a listing genuinely moves,
 * which is why it survives and `name` does not.
 */
export function compareUniverseToVendor(
  universe: readonly Security[],
  active: readonly AlpacaAsset[],
  inactive: readonly AlpacaAsset[],
): readonly UniverseFinding[] {
  const activeBySymbol = new Map(active.map((asset) => [asset.symbol, asset]));
  const inactiveBySymbol = new Map<string, AlpacaAsset>();
  for (const asset of inactive) {
    if (!inactiveBySymbol.has(asset.symbol)) {
      inactiveBySymbol.set(asset.symbol, asset);
    }
  }

  const findings: UniverseFinding[] = [];

  for (const security of universe) {
    const symbol: string = security.symbol;
    const current = activeBySymbol.get(symbol);

    if (current === undefined) {
      const retired = inactiveBySymbol.get(symbol);
      findings.push(
        retired === undefined
          ? { kind: "unknown-to-vendor", symbol }
          : { kind: "not-active", symbol, vendorName: retired.name },
      );
      continue;
    }

    if (current.exchange !== security.exchange) {
      findings.push({
        kind: "exchange-drift",
        symbol,
        ours: security.exchange,
        theirs: current.exchange,
      });
    }

    // A recycled ticker: the same symbol is active for us and also carries a
    // retired row for something else. Compared on `name` rather than on `id`,
    // because the vendor issues a *new* id on a rename — so equal ids would
    // catch nothing and unequal ids would flag every symbol.
    const previous = inactiveBySymbol.get(symbol);
    if (previous !== undefined && previous.name !== current.name) {
      findings.push({
        kind: "recycled-ticker",
        symbol,
        previousName: previous.name,
      });
    }
  }

  return findings;
}

/** What one run of the check produced. */
export interface UniverseCheckOutcome {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
  readonly errors: readonly string[];
}

/**
 * Render the findings.
 *
 * **A finding does not change the exit code, and that is the decision.** The
 * exit code answers *did the check run*, never *did it find something* — for
 * the reason `/diagnostics/database` answers `200` with `reachable: false`
 * (Task 2.1.7): the question was answered correctly. Every finding here is
 * input to `UNIVERSE.md` §12.8's human editing step rather than a fault, and a
 * non-zero exit would invite somebody to wire this into CI, where it needs a
 * network and a credential that `pnpm verify` deliberately does not have and
 * would go red on a vendor's house-style change.
 */
export function summariseUniverseCheck(
  checked: number,
  findings: readonly UniverseFinding[],
): UniverseCheckOutcome {
  const lines = [
    `\n  ✓ ${String(checked)} securities checked against the vendor`,
  ];

  if (findings.length === 0) {
    lines.push(
      "\n  Nothing to look at. Every tracked symbol is listed and active, every exchange",
      "  agrees, and no ticker has been recycled.\n",
    );
    return { exitCode: 0, lines, errors: [] };
  }

  const of = (kind: UniverseFinding["kind"]): UniverseFinding[] =>
    findings.filter((finding) => finding.kind === kind);

  const notActive = of("not-active");
  if (notActive.length > 0) {
    lines.push(
      `\n  ○ ${String(notActive.length)} tracked but no longer active at the vendor:`,
      ...notActive.map((f) =>
        f.kind === "not-active" ? `      ${f.symbol}  (${f.vendorName})` : "",
      ),
      "",
      "    This is a CANDIDATE and not a verdict. The vendor's `inactive` means it will",
      "    not trade the symbol, which is a fact about the vendor rather than about the",
      "    market — measured at 8% disagreement against the tape. Check it before",
      "    editing `apps/backend/src/universe.ts`, per `UNIVERSE.md` §12.8.",
    );
  }

  const unknown = of("unknown-to-vendor");
  if (unknown.length > 0) {
    lines.push(
      `\n  ○ ${String(unknown.length)} tracked and unknown to the vendor entirely:`,
      `      ${unknown.map((f) => f.symbol).join(", ")}`,
      "",
      "    A symbol the vendor has never heard of is more likely a typo or a retired",
      "    ticker than a delisting. No bars will ever arrive for it.",
    );
  }

  const drift = of("exchange-drift");
  if (drift.length > 0) {
    lines.push(
      `\n  ○ ${String(drift.length)} whose listing venue disagrees with the file:`,
      ...drift.map((f) =>
        f.kind === "exchange-drift"
          ? `      ${f.symbol}  file says ${f.ours}, vendor says ${f.theirs}`
          : "",
      ),
      "",
      "    A listing genuinely moves. This is `UNIVERSE.md` §5's silent staleness made",
      "    visible; fix the file and move `UNIVERSE_PROVENANCE.profile.checkedOn`.",
    );
  }

  const recycled = of("recycled-ticker");
  if (recycled.length > 0) {
    lines.push(
      `\n  ! ${String(recycled.length)} whose ticker has been used before by something else:`,
      ...recycled.map((f) =>
        f.kind === "recycled-ticker"
          ? `      ${f.symbol}  previously "${f.previousName}"`
          : "",
      ),
      "",
      "    Stored bars for this symbol may span two different companies. The loader keys",
      "    on `symbol` and cannot tell them apart. `UNIVERSE.md` §15.6.",
    );
  }

  lines.push(
    "",
    "  Nothing was written. This command reads the curated file and the vendor, and",
    "  never touches a database.\n",
  );

  return { exitCode: 0, lines, errors: [] };
}

/**
 * Read the vendor and compare it against the curated universe.
 *
 * The two catalogue reads run **in parallel** because they are independent and
 * sit on the trading API's own rate-limit budget, which Task 2.7.7 measured as
 * separate from the data API's (`ALPACA.md` §6b) — so two requests here cost
 * Story 2.8's backfill nothing.
 *
 * A missing credential is a **refusal with an instruction**, not an empty
 * report: `loadConfig` already refuses a half-set credential and a provider
 * selected without one, so the only way to arrive here without a key is to have
 * configured no Alpaca at all, and the honest answer is to say so.
 */
export async function checkUniverse(): Promise<UniverseCheckOutcome> {
  const { loadConfig, loadEnvFile } = await import("./config.js");
  const { fetchAlpacaAssets } = await import("./alpaca-assets.js");
  const { UNIVERSE } = await import("./universe.js");

  let credential;
  try {
    // `apps/backend/.env` is where a developer's key lives, and `loadConfig`
    // deliberately does not read it — `loadEnvFile` is the only thing here that
    // writes `process.env`, which is why it is called from an entrypoint rather
    // than from `loadConfig`. `fetch-bars.ts` takes the same two lines for the
    // same reason.
    loadEnvFile();
    credential = loadConfig().alpaca;
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [`\n${error instanceof Error ? error.message : String(error)}\n`],
    };
  }

  if (credential === undefined) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        "\nNo Alpaca credential is configured, so there is nothing to check against.\n" +
          "Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY in apps/backend/.env — see\n" +
          "apps/backend/.env.example.\n",
      ],
    };
  }

  try {
    const [active, inactive] = await Promise.all([
      fetchAlpacaAssets(credential, "active"),
      fetchAlpacaAssets(credential, "inactive"),
    ]);

    return summariseUniverseCheck(
      UNIVERSE.length,
      compareUniverseToVendor(UNIVERSE, active, inactive),
    );
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        `\nThe vendor could not be read, so nothing was compared.\n\n  ${
          error instanceof Error ? error.message : String(error)
        }\n\nNothing was written either way. Run it again.\n`,
      ],
    };
  }
}
