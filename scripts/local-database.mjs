// The local development database, and the command that starts it (Task 2.1.2)
// — `pnpm db`.
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
// **Where that definition lives moved in Task 2.1.3, and this file is now a
// reader rather than the source.** Until then the address, the credentials and
// the database name were literals here. Then the application's connection
// settings joined `CONFIG_VARIABLES`, and a literal here would have been a
// **second** copy of exactly the kind `pair-addresses.mjs` exists to prevent: a
// `.env.example` default of `5432` against a `5433` here is a backend dialling
// a port nothing is on, with `pnpm ready` cheerfully reporting the database up
// because it read the other copy. So the settings come out of the backend's
// **built** `dist/config.js`, the way `pair-addresses.mjs` and
// `check-env-example.mjs` already read it, and a clean tree gets
// "run `pnpm build` first" rather than a resolver stack.
//
// The direction is the right way round rather than merely consistent. A
// container's `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` are what
// **creates** a database and `DATABASE_*` are what **connects** to one, so
// making the creation follow the connection means the database that gets made
// is the one the application is about to ask for. The other direction —
// `config.ts` defaulting from this script — was rejected in writing rather than
// by omission: it inverts the dependency, putting a shipped module that runs in
// production behind a development script that starts a container.
//
// **The image major is the one value that does not move.** Nothing in the
// application's configuration has any business naming a PostgreSQL version, so
// it stays a literal below — still unchecked against the deployed server's
// `--version`, still in both gap lists.
//
// **The password is a fixture and not a secret.** It is in the repository on
// purpose — as `apps/backend/.env.example`'s `DATABASE_PASSWORD` default now,
// rather than here. It authenticates a container `compose.yaml` publishes on
// loopback only, holding an empty database whose entire future contents are
// re-derivable from Alpaca.
//
// Dependency-free, like the four checks beside it.

import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const BACKEND_CONFIG = resolve(REPO_ROOT, "apps/backend/dist/config.js");

/**
 * The PostgreSQL **major** the container runs, pinned to the deployed server's
 * as chosen by Task 2.1.1: 18. The major is the grain that matters — Azure
 * patches the minor itself, so an `18.6` here would be a pin the managed server
 * cannot honour.
 *
 * This is deliberately not a `DATABASE_*` variable. It describes the server
 * rather than the connection, and a running application has no use for it.
 */
export const LOCAL_DATABASE_VERSION = "18";

/**
 * @typedef {object} LocalDatabase
 * @property {string} version
 * @property {string} host
 * @property {number} port
 * @property {string} user
 * @property {string} password
 * @property {string} database
 */

/**
 * Where the local database is, resolved from the backend's own configuration.
 *
 * Returns a discriminated result rather than throwing, and carries the message
 * with it, so both readers report the same failures in the same words —
 * `resolvePairAddresses`'s shape, for the same reason: an unbuilt tree and an
 * invalid `DATABASE_PORT` are ordinary states with a one-line answer rather
 * than exceptions worth a stack.
 *
 * @returns {Promise<{ ok: true, database: LocalDatabase } | { ok: false, message: string }>}
 */
export async function resolveLocalDatabase() {
  /** @type {{ loadConfig: () => { database: { host: string, port: number, name: string, user: string, auth: string, password?: string } }, loadEnvFile: () => string | undefined }} */
  let configModule;

  try {
    configModule = await import(BACKEND_CONFIG);
  } catch {
    return {
      ok: false,
      message: `Cannot read ${relative(REPO_ROOT, BACKEND_CONFIG)} — run \`pnpm build\` first.`,
    };
  }

  configModule.loadEnvFile();

  /** @type {{ database: { host: string, port: number, name: string, user: string, auth: string, password?: string } }} */
  let config;

  try {
    config = configModule.loadConfig();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);

    // Indented per line, because `config.ts` reports *every* bad key and a
    // single leading indent would align the first line and leave the rest hard
    // against the margin. The same treatment `pair-addresses.mjs` gives it.
    return {
      ok: false,
      message: `The backend's configuration is invalid, so this cannot say where the database is:\n\n${detail
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}\n`,
    };
  }

  const { host, port, name, user, auth, password } = config.database;

  // A container is created with a password. Under `DATABASE_AUTH=entra` there
  // is none — that mode's credential is a token minted per connection against a
  // managed identity, which a laptop structurally cannot be — so there is
  // nothing to create the container with, and this refuses rather than
  // inventing one. Task 2.1.1's asymmetry arriving as a command that says so.
  if (auth !== "password" || password === undefined) {
    return {
      ok: false,
      message:
        `DATABASE_AUTH is \`${auth}\`, so there is no password to create a local container with.\n` +
        "That mode authenticates with a Microsoft Entra access token against the managed\n" +
        "server; a local container has no identity to be. Set DATABASE_AUTH=password to use\n" +
        "the local database.\n",
    };
  }

  return {
    ok: true,
    database: {
      version: LOCAL_DATABASE_VERSION,
      host,
      port,
      user,
      password,
      database: name,
    },
  };
}

/**
 * The values `compose.yaml` interpolates. Every one of them is required there,
 * so this and that file cannot disagree about whether a value exists — only
 * about what it should be, which is what having one definition prevents.
 *
 * @param {LocalDatabase} database
 * @returns {Record<string, string>}
 */
export function composeEnvironment(database) {
  return {
    MARKETPULSE_DB_VERSION: database.version,
    MARKETPULSE_DB_PORT: String(database.port),
    MARKETPULSE_DB_USER: database.user,
    MARKETPULSE_DB_PASSWORD: database.password,
    MARKETPULSE_DB_NAME: database.database,
  };
}

// Everything below runs only when this file is the command, so
// `check-ready.mjs` can import the resolver above without starting anything.

if (resolve(process.argv[1] ?? "") === import.meta.filename) {
  const resolved = await resolveLocalDatabase();

  if (!resolved.ok) {
    console.error(`\n${resolved.message}`);
    process.exit(1);
  }

  const database = resolved.database;

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
    env: { ...process.env, ...composeEnvironment(database) },
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
    // Printed as parts rather than as a connection URL, deliberately: Task
    // 2.1.3 chose discrete settings over a `DATABASE_URL`, and printing one
    // here would be a shape the configuration boundary does not have.
    console.log(
      `\n  PostgreSQL ${database.version} on ${database.host}:${String(database.port)}  database ${database.database}  user ${database.user}\n\n` +
        "  It outlives `pnpm dev` and it holds state, so leave it running.\n" +
        "  `pnpm db down` stops it; the data survives that and `pnpm db down -v` is what removes it.\n",
    );
  }

  process.exit(compose.status ?? 1);
}
