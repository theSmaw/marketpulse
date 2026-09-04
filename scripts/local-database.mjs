// Where the local development database is, and the command that starts it
// (Task 2.1.2) — `pnpm db`.
//
// **One definition, two readers**, which is `pair-addresses.mjs`'s arrangement
// applied to a third service. The readers are this script, which hands the
// values to `compose.yaml` as environment variables, and
// `scripts/check-ready.mjs`, which dials the address. `compose.yaml` declares
// every one of them **required with no default**, so it cannot drift from this
// file by quietly falling back to a plausible number — a bare
// `docker compose up` stops with a message naming this script rather than
// starting a database on a port nobody chose. That is the same decision
// `e2e/playwright.config.ts` takes about `E2E_BASE_URL`, for the same reason.
//
// **What this is not:** it is not the application's connection settings. Task
// 2.1.3 owns putting those through the configuration boundary — `CONFIG_VARIABLES`,
// both `.env.example` files and `pnpm env:check` — and it has a real decision to
// make about their **shape**, because the deployed server authenticates as a
// managed identity and this one authenticates with a password, so a single
// `DATABASE_URL` with the credential inside it would fit one of the two and
// narrow the other away. Nothing here chooses that, and nothing here is read by
// the application: the fields below are printed as parts rather than assembled
// into a URL precisely so this file does not answer 2.1.3's question by
// accident.
//
// **The password is a fixture and not a secret.** It is in the repository on
// purpose. It authenticates a container `compose.yaml` publishes on loopback
// only, holding an empty database whose entire future contents are re-derivable
// from Alpaca. Treating it as a secret would mean a `.env` file every clean
// clone has to write before the database starts, which is the cost this task
// exists to keep down.
//
// Dependency-free, like the four checks beside it.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/**
 * The local development database, defined once.
 *
 * `version` is the **major** and it is pinned to the deployed server's, chosen
 * by Task 2.1.1: PostgreSQL 18. The major is the grain that matters — Azure
 * patches the minor itself, so a `18.6` here would be a pin the managed server
 * cannot honour. Nothing checks that this number and the deployed server's
 * `--version` still agree; it is a stated invariant, recorded in the gap list.
 *
 * `port` is 5432, the conventional default, so that `psql` and every GUI find
 * it with no arguments. The cost is that a machine already running a native
 * PostgreSQL on 5432 has a conflict — see `pnpm db`'s own failure below, and
 * note that changing it here is one edit that both readers follow.
 */
export const LOCAL_DATABASE = Object.freeze({
  version: "18",
  host: "127.0.0.1",
  port: 5432,
  user: "marketpulse",
  password: "marketpulse",
  database: "marketpulse",
});

/**
 * The values `compose.yaml` interpolates. Every one of them is required there,
 * so this object and that file cannot disagree about whether a value exists —
 * only about what it should be, which is what having one definition prevents.
 *
 * @returns {Record<string, string>}
 */
export function composeEnvironment() {
  return {
    MARKETPULSE_DB_VERSION: LOCAL_DATABASE.version,
    MARKETPULSE_DB_PORT: String(LOCAL_DATABASE.port),
    MARKETPULSE_DB_USER: LOCAL_DATABASE.user,
    MARKETPULSE_DB_PASSWORD: LOCAL_DATABASE.password,
    MARKETPULSE_DB_NAME: LOCAL_DATABASE.database,
  };
}

// Everything below runs only when this file is the command, so
// `check-ready.mjs` can import the definition above without starting anything.

if (resolve(process.argv[1] ?? "") === import.meta.filename) {
  // Arguments are forwarded to `docker compose` untouched, so `pnpm db down`,
  // `pnpm db logs -f`, `pnpm db ps` and `pnpm db exec postgres psql …` all work
  // the way Docker documents them. With no arguments it starts the database and
  // **waits for it to be accepting connections** rather than for the container
  // to exist: `--wait` gates on `compose.yaml`'s healthcheck, which is what
  // makes `pnpm db && pnpm ready` answer immediately instead of polling through
  // the server's initialisation.
  const args =
    process.argv.length > 2
      ? process.argv.slice(2)
      : ["up", "--detach", "--wait"];

  const compose = spawnSync("docker", ["compose", ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, ...composeEnvironment() },
  });

  // Docker is a prerequisite for the database and for nothing else — `pnpm dev`
  // and `pnpm verify` never reach this file — so its absence is reported as the
  // narrow thing it is rather than as a broken checkout.
  if (compose.error !== undefined) {
    const missing =
      /** @type {{ code?: string }} */ (compose.error).code === "ENOENT";

    console.error(
      missing
        ? "\n`docker` is not on the PATH. It is a prerequisite for the local database and for\n" +
            "nothing else in this repository — `pnpm dev`, `pnpm verify` and the browser suite\n" +
            "all run without it. Install Docker Desktop, or see README.md for the alternatives\n" +
            "and why they were rejected.\n"
        : `\ndocker compose could not be run: ${compose.error.message}\n`,
    );
    process.exit(1);
  }

  // A child killed by a signal has a null status and a named signal; reporting
  // that as 0 is how an interrupted command reads as a successful one. The same
  // rule this repository has applied at every layer it has added.
  if (compose.signal !== null) {
    console.error(`\ndocker compose was killed by ${compose.signal}.`);
    process.exit(1);
  }

  if (compose.status === 0 && process.argv.length === 2) {
    const { host, port, database, user, version } = LOCAL_DATABASE;

    // Printed as parts rather than as a connection URL, deliberately: the URL
    // is a connection *shape* and choosing one is Task 2.1.3's, not this
    // file's. See the header.
    console.log(
      `\n  PostgreSQL ${version} on ${host}:${String(port)}  database ${database}  user ${user}\n\n` +
        "  It outlives `pnpm dev` and it holds state, so leave it running.\n" +
        "  `pnpm db down` stops it; the data survives that and `pnpm db down -v` is what removes it.\n",
    );
  }

  process.exit(compose.status ?? 1);
}
