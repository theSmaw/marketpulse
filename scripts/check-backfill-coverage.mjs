// The scheduled catch-up must fill every timeframe the application reads.
//
// ## The bug this exists to make impossible
//
// On 2026-09-12 the identity block on `/securities/ADI` read
// `LAST SESSION CLOSE 362.25 ▲ +1.61%` dated `2026-09-04`, beside a chart whose
// last point was `378.98` on `2026-09-11`. Two closes 4.6% apart on one screen,
// and a label that had been false for eight days.
//
// The cause was one missing flag. `.github/workflows/backfill.yml` ran its
// nightly catch-up as `--sessions 10` with **no `--timeframe`**, and
// `backfill.ts` declares `let timeframe: Timeframe = "1m"`. So the scheduled job
// only ever filled minute bars, while `routes/securities.ts` read its last close
// at `CLOSE_TIMEFRAME = "1d"` — a constant ten lines from the `1m` one it sits
// beside.
//
// **Both halves of that contradiction were files in this repository, and nothing
// ever put them side by side.** The job was green every night, because it did
// exactly what it was asked; it was asked for the wrong thing. That is the
// shape this script exists to refuse: not a broken process, but a *correct*
// process satisfying a narrower contract than the application depends on.
//
// `BARS.md` §8.18 and §8.18.1 carry the full account.
//
// ## Why this belongs in `pnpm verify` and could
//
// `verify` runs with no servers, no database, no network and no credentials, and
// `CLAUDE.md` says to keep it that way. **This check needs none of them.** Both
// facts it compares are static text in the tree — the workflow's scheduled
// arguments, and the timeframe constants the backend reads. So the one gate that
// runs on every change can hold a property that is otherwise only observable in
// a live deployment over time.
//
// That is the whole leverage here: freshness itself is a runtime property and is
// checked at runtime (`/diagnostics/freshness`, asserted by the deployed check).
// **The *contract* is static**, and a static contradiction should never have
// needed a deployment to reveal it.
//
// ## What it proves
//
// That every timeframe the backend reads from the bar store appears in the
// scheduled backfill's arguments.
//
// ## What it does NOT prove, and must not be described as proving
//
//  1. **That the store is actually current.** This is a check on the *job's
//     arguments*, not on data. A cron that is disabled, failing, or
//     rate-limited passes here — GitHub disables a `schedule:` after 60 days
//     with no pushes, which `backfill.yml` itself records. That failure is
//     `/diagnostics/freshness`' to catch, and the split is deliberate: a static
//     check cannot see a live store, and a live check cannot run in `verify`.
//  2. **That the arguments are otherwise sane.** `--sessions 10` could be
//     `--sessions 1` and this would pass. The session count is a judgement
//     recorded in the workflow header, not a contract.
//  3. **That the frontend reads no third timeframe.** It parses the *backend's*
//     constants, because the store is only ever read through the backend. A
//     frontend asking for a timeframe the backend cannot serve is a different
//     defect, and the request contract catches it.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WORKFLOW = ".github/workflows/backfill.yml";
const SECURITIES_ROUTE = "apps/backend/src/routes/securities.ts";
const TIMEFRAME_TYPE = "packages/shared/src/bar.ts";

/**
 * Timeframes the system can store but the scheduled run deliberately does not
 * fill, each with the reason.
 *
 * Empty today, and that is the point: an entry here is an explicit decision
 * that something is allowed to go stale, rather than an omission nobody
 * noticed. The bug this script exists to prevent looked exactly like an entry
 * that was never written down.
 */
const DELIBERATELY_UNFILLED = new Map();

/**
 * Every timeframe the system can store, from the one place that declares them.
 *
 * **This is the anchor, and choosing it was the second attempt.** The first
 * version read the `…TIMEFRAME: Timeframe = "…"` constants in the route and
 * required those to be filled. That is the precise contract — and it is
 * silently defeated by a rename: renaming `CLOSE_TIMEFRAME` to `closeTf` made
 * this script find one constant instead of two and pass, which is the exact
 * class of defect it exists to prevent, one level up. Verified by doing it.
 *
 * `TIMEFRAMES` cannot be hidden that way. It is a single exported `as const`
 * that `Timeframe` is derived from, so every read in the system is typed
 * against it and `tsc` protects the name. A member added here is a member the
 * scheduled run must fill or explicitly excuse.
 *
 * The stricter rule is also the more honest one: a timeframe the store can hold
 * is a timeframe somebody can request, and "we can serve it but we never
 * refresh it" is a decision that should have to be written down.
 */
function storableTimeframes(source) {
  const declaration = /export const TIMEFRAMES = \[([^\]]*)\] as const/.exec(
    source,
  );
  if (declaration === null) return null;

  return [...declaration[1].matchAll(/"([^"]*)"/g)].map(([, value]) => value);
}

/**
 * The timeframes the backend is known to read, for the message rather than for
 * the contract.
 *
 * Kept after the anchor moved, because naming the constant that reads a
 * timeframe is what makes a failure actionable — "1d is unfilled" is a fact,
 * "1d is unfilled and CLOSE_TIMEFRAME reads it" is a place to go. A rename now
 * costs a less specific error message rather than a silent pass.
 */
function declaredTimeframes(source) {
  const declarations = [
    ...source.matchAll(
      /const\s+(\w*TIMEFRAME)\s*:\s*Timeframe\s*=\s*"(1m|1d)"/g,
    ),
  ];

  return declarations.map(([, name, timeframe]) => ({ name, timeframe }));
}

/**
 * The timeframes the scheduled run actually fills.
 *
 * The scheduled passes are a bash array literal in the workflow, which is not
 * something YAML parsing reaches — the value is inside a `run:` block. So this
 * reads the array by name.
 *
 * **A pass with no `--timeframe` means the default**, which is `backfill.ts`'s
 * `let timeframe: Timeframe = "1m"`. That default is the whole bug, so it is
 * resolved here explicitly rather than treated as "no timeframe": a script that
 * ignored a bare `--sessions 10` would report zero timeframes for the exact
 * configuration that shipped the defect.
 */
function scheduledTimeframes(workflow) {
  // **The array with literals in it, not the first one.** The job assigns
  // `passes` twice — `("$BACKFILL_ARGS")` for a dispatch, and a list of literal
  // argument strings for the scheduled run. Taking the first match reads the
  // dispatch branch, whose content is a variable this script cannot resolve and
  // should not try to: a dispatch is an operator naming a range, and it is not
  // the thing under contract here.
  //
  // Found by running this script: it reported `1m` missing `1d` against a
  // workflow that fills both, which is a false positive and would have been a
  // check nobody trusted.
  const arrays = [...workflow.matchAll(/passes=\(([^)]*)\)/gs)]
    .map(([, body]) => body)
    .filter((body) => !body.includes("$"));

  const literal = arrays[0];
  if (literal === undefined) return null;

  const passes = [...literal.matchAll(/"([^"]*)"/g)].map(([, pass]) => pass);
  if (passes.length === 0) return null;

  return passes.map((pass) => {
    const flag = /--timeframe\s+(1m|1d)/.exec(pass);
    return { pass, timeframe: flag === null ? "1m" : flag[1] };
  });
}

async function main() {
  const [workflow, securities, barType] = await Promise.all([
    readFile(path.join(root, WORKFLOW), "utf8"),
    readFile(path.join(root, SECURITIES_ROUTE), "utf8"),
    readFile(path.join(root, TIMEFRAME_TYPE), "utf8"),
  ]);

  const storable = storableTimeframes(barType);

  // An empty result is a failure and not a pass. If `TIMEFRAMES` is renamed or
  // restyled this script would otherwise check nothing and say so in green,
  // which is the same class of defect it exists to prevent.
  if (storable === null || storable.length === 0) {
    fail(
      `No \`export const TIMEFRAMES = [...] as const\` found in ${TIMEFRAME_TYPE}.`,
      "That declaration is this check's anchor: it is the one place every",
      "timeframe in the system is named, and `tsc` protects it from a rename.",
      "Finding none means the pattern in scripts/check-backfill-coverage.mjs is",
      "stale and the check has silently stopped checking anything.",
    );
  }

  const reads = new Map(
    declaredTimeframes(securities).map((entry) => [
      entry.timeframe,
      entry.name,
    ]),
  );

  const scheduled = scheduledTimeframes(workflow);

  if (scheduled === null) {
    fail(
      `No \`passes=(…)\` array found in ${WORKFLOW}.`,
      "The scheduled catch-up's timeframes are read from that array. If the job",
      "was restructured, update the pattern in scripts/check-backfill-coverage.mjs",
      "rather than deleting this check — the contract it holds is that the",
      "scheduled run fills every timeframe the backend reads.",
    );
  }

  const filled = new Set(scheduled.map((pass) => pass.timeframe));
  const missing = storable.filter(
    (timeframe) =>
      !filled.has(timeframe) && !DELIBERATELY_UNFILLED.has(timeframe),
  );

  if (missing.length > 0) {
    fail(
      "The scheduled backfill does not fill every timeframe this system stores.",
      "",
      ...missing.map((timeframe) => {
        const reader = reads.get(timeframe);
        return reader === undefined
          ? `  MISSING  ${timeframe}  — declared in TIMEFRAMES, filled by nothing`
          : `  MISSING  ${timeframe}  — read by ${reader} in ${SECURITIES_ROUTE}`;
      }),
      "",
      `  The scheduled run fills: ${[...filled].sort().join(", ")}`,
      ...scheduled.map((pass) => `    pnpm backfill ${pass.pass}`),
      "",
      "This is the defect BARS.md §8.18 records: the job filled 1m only, while",
      "the identity block read its last close at 1d, and the two disagreed on",
      "screen by 4.6% for eight days with a green cron every night.",
      "",
      `Add a pass to the \`passes=(…)\` array in ${WORKFLOW} — or, if this`,
      "timeframe is deliberately never refreshed, add it to DELIBERATELY_UNFILLED",
      "in this script with the reason. Silence is the one option that is not",
      "available.",
    );
  }

  const excused = [...DELIBERATELY_UNFILLED.keys()];
  console.log(
    `backfill coverage: this system stores ${storable.join(", ")}; ` +
      `the scheduled run fills ${[...filled].sort().join(", ")}` +
      (excused.length > 0
        ? `; deliberately unfilled: ${excused.join(", ")}`
        : "") +
      ".",
  );
}

function fail(...lines) {
  console.error(`\n${lines.join("\n")}\n`);
  process.exit(1);
}

await main();
