// The one place this application reads the environment.
//
// **Nothing outside this file may read `process.env`.** That is the invariant
// the module exists to create, and it is the thing that decays first — the
// second read added elsewhere is always the cheap one. Task 1.6.2 verified by
// grep that this file holds the only occurrence in the workspace; a future
// task that adds a second should either move it here or say why not.
//
// **Amended 2026-09-07 by Task 2.6.8: a second reader exists and it said why.**
// `entra-token.ts` (Task 2.1.6) reads `IDENTITY_ENDPOINT` and `IDENTITY_HEADER`
// deliberately, and it exists to protect this invariant rather than to break
// it: `IDENTITY_HEADER` is itself a bearer credential, so routing it through
// here would put a live credential on the frozen `Config` object in the module
// whose no-credential guarantee is structural. Those two are the platform's,
// not ours, which is why neither is in `CONFIG_VARIABLES` or `.env.example`.
// Two shipping readers, both accounted for; a third still owes an argument.
//
// **And one thing this header did not say until Task 2.6.6 made it matter:**
// this file imports `PROVIDER_IDS` from `packages/shared`, which makes it the
// first file in `apps/backend` to depend on that package at build time. That is
// load-bearing for `scripts/local-database.mjs`, which reads the built
// `dist/config.js` — so a `packages/shared` that has not been built takes
// `pnpm db` down with it, and `pnpm build` orders that.
//
// There is no schema library, and that is a measured decision rather than an
// omission — Task 1.6.1 spiked Zod 4.5.4 and Valibot 1.4.2 to full parity with
// what index.ts already did, then threw both away. The deciding finding is
// specific to environment variables: a schema over `process.env` is a schema
// over a record whose values are always strings, so "blank means absent" and a
// message quoting the value the operator actually typed have to be written by
// hand either way. `z.coerce.number()` reports NaN and loses the input, and
// `PORT=` parses as port 0 — a real value meaning "any free port" — rather
// than as the default. See docs/adr/0006 (Task 1.6.7) for the full record.
//
// So "validated against a declared schema" here means a declared set of
// readers plus the CONFIG_VARIABLES table below, not a library.

import { PROVIDER_IDS } from "@marketpulse/shared";
import path from "node:path";
import process from "node:process";

// Thrown by the readers and re-thrown once by loadConfig() with every problem
// in it. Exported because index.ts distinguishes it from a programming error:
// a ConfigError is an operator mistake and gets a plain stderr line, anything
// else is a bug and gets a stack.
export class ConfigError extends Error {}

const DEFAULT_PORT = 3000;

// Not 0.0.0.0. A development server should not be reachable on every
// interface on the machine; a container needs 0.0.0.0 and gets it by setting
// HOST, which is exactly why this is a variable in the first place
// (Story 1.11).
const DEFAULT_HOST = "127.0.0.1";

const MIN_PORT = 1;
const MAX_PORT = 65535;

// The one browser origin allowed to call this API (Task 1.8.3).
//
// The default is the development server's own origin, so a clean clone with no
// `.env` at all has a working pair — which is this story's headline criterion.
// It is the same shape as PORT and HOST defaulting to 3000 and 127.0.0.1:
// values chosen so that the environment nobody configures is the one a first
// run happens in.
//
// Two consequences an operator should read rather than discover. **The default
// is not safe by omission**: a deployment that never sets CORS_ORIGIN allows a
// page served from `http://localhost:5173` to call it, so somebody's local dev
// server can talk to production. That is small — there is no cookie and no
// credential to ride along, because `credentials` is off in cors.ts — and it is
// real, so Story 1.11 sets this variable explicitly. **And there is no
// environment concept to lean on** (ADR 0007 §1): nothing here branches on
// which environment it is in, so "required in production" is not a thing this
// application can express. A documented default that `env:check` keeps honest
// is what replaces it.
//
// It is one origin and not a list. Story 1.12 owns the allowlist and may widen
// this to a separated set; a list today would be a reader, a separator
// convention and an error message written for a case that does not exist.
//
// It is `http://localhost:5173` and not `http://127.0.0.1:5173`, which are two
// different origins to a browser rather than two spellings of one. The dev
// server binds IPv6 loopback and is genuinely unreachable on the IPv4 literal
// — re-measured in Task 1.8.3: `curl http://127.0.0.1:5173/` is
// connection-refused while `[::1]:5173` and `localhost:5173` both answer 200,
// and this server is the exact reverse (`127.0.0.1:3000` answers, `[::1]:3000`
// is refused). So `localhost` is the only spelling that is both what Vite
// prints in the terminal and what the browser puts in the `Origin` header.
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";

// --- The database (Task 2.1.3) ---
//
// **Discrete variables and not a single `DATABASE_URL`, and the decision was
// taken away rather than taken.** A URL is the obvious shape — one value a
// platform can hold, accepted by every Postgres tool — and it assumes the
// credential is a string that sits inside it. Task 2.1.1 made that assumption
// false: the deployed server is Microsoft Entra only, password authentication
// `Disabled`, with **no admin user created at all**, so the deployed password
// field is filled at connect time by code that mints a token per connection.
// There is no string to put in a URL. A URL plus a separate auth switch was
// the runner-up and loses because it makes one value mean different things
// depending on another; a URL locally and discrete variables deployed is two
// shapes and is rejected on sight.
//
// The other half of the argument is that discrete variables let the credential
// be handled separately from the five values that are not one — which is what
// makes the `entra` case expressible at all, and what keeps the password out
// of every message this module can produce.
//
// **These defaults are the local development database, and that is not a
// coincidence — it is the definition.** `scripts/local-database.mjs` reads
// them out of the built `dist/config.js`, exactly as `pair-addresses.mjs`
// reads `PORT` and `HOST`, and hands them to `compose.yaml`. So there is one
// place that says where the local database is, and `pnpm db`,
// `pnpm ready` and the application cannot disagree about it. The direction is
// the right way round: a container's `POSTGRES_USER`/`POSTGRES_PASSWORD`/
// `POSTGRES_DB` are what **creates** a database, and these are what
// **connects** to one, so the creation follows the connection rather than the
// other way about.
const DEFAULT_DATABASE_HOST = "127.0.0.1";
const DEFAULT_DATABASE_PORT = 5432;
const DEFAULT_DATABASE_NAME = "marketpulse";
const DEFAULT_DATABASE_USER = "marketpulse";

// The local fixture, and it is in the repository on purpose: it authenticates
// a container `compose.yaml` publishes on loopback only, holding a database
// whose entire future contents are re-derivable from Alpaca. Treating it as a
// secret would mean a `.env` file every clean clone has to write before the
// database starts.
//
// It is the same shape as `CORS_ORIGIN` defaulting to the dev server's origin
// and carries the same hazard — a deployment that never overrides it points at
// something that is not there. What softens it here and does not soften it
// there is `DATABASE_AUTH`: this value is not read at all unless the mode says
// `password`, so a deployment cannot fall back onto the fixture by forgetting
// a variable. It has to ask for password authentication by name.
const DEFAULT_DATABASE_PASSWORD = "marketpulse";

// **Which credential mechanism, named rather than inferred.**
//
// The tempting shape is to infer it — a password is set, so use one; none is
// set, so mint a token. That fails silently in both directions, which is the
// whole reason this variable exists. A deployment that forgot the password
// variable would fall through to the identity path and produce an
// authentication error about an identity nobody was thinking about; a laptop
// with a stale password variable would send one to a server that refuses
// passwords outright. A named mode is cheaper than either failure, and it is
// what lets this module reject the second case at startup instead.
//
//   password — a literal from DATABASE_PASSWORD. The local container, and any
//              server with password authentication enabled.
//   entra    — a Microsoft Entra access token, minted per connection from the
//              container app's managed identity and used as the password.
//              DATABASE_PASSWORD is not read. **The token never comes from the
//              environment, so this module never holds it** — see loadConfig.
export const DATABASE_AUTH_MODES = ["password", "entra"] as const;

export type DatabaseAuth = (typeof DATABASE_AUTH_MODES)[number];

const DEFAULT_DATABASE_AUTH: DatabaseAuth = "password";

// libpq's own names, deliberately, because a driver takes one of these and a
// third vocabulary in between is a translation table nobody asked for.
//
//   disable     — no TLS. What the local container offers: `pnpm ready`
//                 reports `no TLS offered` against it, measured in Task 2.1.2.
//   require     — encrypted, certificate NOT verified. This is what Microsoft's
//                 own managed-identity sample connection string does with
//                 `Trust Server Certificate=true`, and Task 2.1.1 recorded that
//                 we must not copy it. It is in the vocabulary because it is a
//                 real libpq mode and refusing to name it would not stop anyone
//                 reaching for it; it is never the default.
//   verify-full — encrypted and the certificate verified against a CA, host
//                 name included. What the managed server gets.
//
// The default is `disable` because the default of every variable in this file
// is what a clean clone needs, and a clean clone's database is the container.
// Story 2.1's acceptance criterion 2 is about TLS rather than encryption if
// convenient, and this is the variable it lands on.
export const DATABASE_SSL_MODES = [
  "disable",
  "require",
  "verify-full",
] as const;

export type DatabaseSsl = (typeof DATABASE_SSL_MODES)[number];

const DEFAULT_DATABASE_SSL: DatabaseSsl = "disable";

// The levels pino understands, in the order pino orders them, plus `silent`.
//
// This is deliberately pino's whole set rather than a curated subset. A
// narrower list would be a second vocabulary to keep in step with the logger's
// own, and the thing it would buy — refusing `trace` because nothing emits at
// it yet — costs an operator a rejected value for a level the library
// genuinely supports. The set is the logger's; the default is ours.
//
// `silent` is not a level but a sentinel meaning "emit nothing", and it is in
// for one concrete reason: Story 1.9 drives `buildServer()` under a test
// runner, where a server narrating every injected request is noise. Admitting
// it here costs one array entry against inventing a second mechanism later.
// The cost is that an operator can switch off error logging in production —
// which is what they asked for, in a variable they had to set by hand.
export const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

// `info` is pino's default, so this default is "what the server did before
// this variable existed" rather than a new opinion.
const DEFAULT_LOG_LEVEL: LogLevel = "info";

// How a log record is rendered. Not what is in it, and not which records are
// emitted — the same pino, the same fields, the same levels either way.
//
// This is a value, not an environment. Task 1.6.3 decided this application has
// no variable naming which environment it is in, and nothing here reverses
// that: `LOG_FORMAT` reads exactly like `PORT`, through the same module, with
// the same precedence, and no code branches on "am I in development". What
// makes development pretty is that `scripts/dev.sh` — the file that *is* the
// development loop — sets it. Production sets nothing and gets JSON.
export const LOG_FORMATS = ["json", "pretty"] as const;

export type LogFormat = (typeof LOG_FORMATS)[number];

// JSON is the default because the environments that read nothing are the ones
// that ship logs to a machine. Prettifying is opt-in, by the one caller that
// has a human in front of it.
const DEFAULT_LOG_FORMAT: LogFormat = "json";

// Which market-data provider serves prices, or `none` for no provider at all.
//
// DERIVED from `packages/shared`'s `PROVIDER_IDS` rather than restated, so a
// provider added there — which Story 2.7 will do, in the same commit as the
// client that produces it — becomes selectable without an edit here, and
// `createMarketDataProvider`'s exhaustive switch is what then fails the build
// until somebody wires it up. A second literal list would be a copy that
// silently disagrees, and the disagreement's symptom is a configuration value
// the operator can set and nothing can honour.
export const MARKET_DATA_PROVIDER_SELECTIONS = [
  "none",
  ...PROVIDER_IDS,
] as const;

export type MarketDataProviderSelection =
  (typeof MARKET_DATA_PROVIDER_SELECTIONS)[number];

// **The default is `none`, and this is the safety decision in Story 2.6.**
//
// A backend serving fixture bars is serving invented prices, which is
// PRODUCT_SPEC §35's "manufacture missing observations" verbatim — so a default
// that quietly works is a default that quietly ships fabricated market data to
// whatever is pointed at it. Task 1.8.3's `CORS_ORIGIN` note is the precedent
// and its lesson is exactly this: a default that is convenient in development
// is a decision about production, and it must be written down as one.
//
// It is also the honest value today: at the end of Story 2.6 no vendor client
// exists, so `none` is what the deployed backend genuinely is. A developer opts
// into fixtures by writing one line in `apps/backend/.env`, and the
// deliberateness of that act is the property being bought.
const DEFAULT_MARKET_DATA_PROVIDER: MarketDataProviderSelection = "none";

// --- The Alpaca credential (Task 2.7.2) ---
//
// **This is the first bearer secret this application has ever held**, and it is
// a different kind of thing from every value above it. `DATABASE_PASSWORD` is a
// fixture that authenticates a container published on loopback; the deployed
// database credential is an Entra token this module never receives at all
// (Task 2.1.6). This one is a third-party secret with no identity behind it:
// there is nothing to mint, so it has to be stored, and the module's standing
// rule that **the resolved configuration is never logged** stops being a
// promise about a fixture and becomes a promise about a live credential.
//
// **Two variables and not one packed string.** Alpaca authenticates with a key
// id and a secret sent as two headers, so they are two values. A packed
// `id:secret` would need a parser somebody wrote — which is a failure mode —
// and the halves could then not be documented, defaulted or redacted
// separately. That last one is the deciding argument: exactly one of these two
// is a secret, and that sentence is only expressible if they are two names.
//
// **Only the secret is secret.** The key id travels in the clear in every
// request header and is on the vendor's own dashboard, so treating it as a
// credential would mean redacting the one value whose visibility helps an
// operator tell which of two keys is configured. `.env.example` says so
// explicitly, because the reflex is to redact both.
//
// **Neither has a default**, which is a shape `CONFIG_VARIABLES` has not
// carried before: every variable so far is optional *with* a default, because a
// default is what a clean clone needs. A credential's absence cannot be
// defaulted — an invented one is a value that is present and wrong, which fails
// at the first request rather than at startup — so absent means absent, and the
// `alpaca` key on `Config` is genuinely missing rather than holding empty
// strings.
export const ALPACA_KEY_ID_VARIABLE = "ALPACA_API_KEY_ID";
export const ALPACA_SECRET_KEY_VARIABLE = "ALPACA_API_SECRET_KEY";

// The provider selection that needs the pair, as a string rather than as a
// member of `MarketDataProviderSelection` — because it is not one yet.
//
// `PROVIDER_IDS` shipped `fixture` alone and gained `alpaca` in Task 2.7.3, in
// the same commit as the client that can produce it: this repository's rule
// that a union member arrives with the code that produces it, held five times
// and not broken here for a configuration check's convenience. So the check
// below reads the **raw** environment value, exactly as the `DATABASE_PASSWORD`
// check does and for the same reason — only the raw value says what an operator
// *asked for*, and a selection this build cannot honour is still a request.
//
// **Amended 2026-09-07 by Task 2.7.3, and the raw read still earns its place.**
// This paragraph used to record that `MARKET_DATA_PROVIDER=alpaca` with no key
// reports **two** problems — that the selection is unknown to this build, and
// that the credential is missing — and that the first line would disappear on
// its own once the member existed. It has: `readEnum` accepts the value now, so
// the run reports **one** problem, which is the credential.
//
// The check itself is unchanged and deliberately still reads the raw value.
// That is not a leftover: the parsed value is only available *after* `readEnum`
// has succeeded, so a check written against it would say nothing at all on the
// day a future provider id is misspelled — where the raw read reports the
// credential problem beside the vocabulary problem, which is what the
// accumulator is for.
const ALPACA_PROVIDER_SELECTION = "alpaca";

// The settings the application gets. Written by hand rather than inferred, and
// that is the shape Task 1.6.1 measured into: `exactOptionalPropertyTypes`
// makes an optional key `?: T`, while both schema libraries infer
// `?: T | undefined`, so an inferred type is a TS2375 against a declared one.
// Declare the interface; build the readers to fit it.
//
// Both keys are required here because both have defaults. A genuinely optional
// key — a credential Epic 2 brings, say — is spread in conditionally
// (`...(value === undefined ? {} : { key: value })`) rather than assigned
// `undefined`, for the same reason.
export interface Config {
  readonly port: number;
  readonly host: string;
  readonly logLevel: LogLevel;
  readonly logFormat: LogFormat;
  readonly corsOrigin: string;
  readonly database: DatabaseConfig;
  readonly marketDataProvider: MarketDataProviderSelection;

  // **Absent when no Alpaca credential is configured**, which is a clean
  // clone, every test that does not ask for one, and the deployment until
  // Task 2.7.4 flips it. Absent rather than present-and-empty: the two are
  // different facts, and `exactOptionalPropertyTypes` is what keeps them
  // distinguishable — a client that reads this key with no credential gets a
  // compile error rather than a request signed with `""`.
  //
  // Both halves are present or neither is. There is no state in which one is
  // set, because `loadConfig` refuses that configuration rather than
  // representing it.
  readonly alpaca?: AlpacaConfig;
}

// The Alpaca market-data credential, as two values.
//
// Nested for `DatabaseConfig`'s reason — one thing with parts, handed whole to
// the one consumer that needs it (Task 2.7.3's client) — and frozen separately,
// because `Object.freeze` is shallow.
export interface AlpacaConfig {
  /**
   * The key id. **Not a secret**: it goes in the clear in an
   * `APCA-API-KEY-ID` header on every request and is on the vendor's own
   * dashboard, so a message may name it and an operator seeing it is being
   * helped rather than leaked to.
   */
  readonly keyId: string;

  /**
   * The secret key. **This is the secret**, and the whole of this module's
   * no-credential-in-a-log rule now points at this one field: no message this
   * application can produce may contain its value, asserted in
   * `config.test.ts` against a value that is deliberately not any fixture.
   */
  readonly secretKey: string;
}

// Nested rather than seven more `database`-prefixed keys on Config, because
// this is one thing with parts rather than seven settings that happen to share
// a prefix — and because Task 2.1.4's pool takes exactly this object and
// nothing else. `loadConfig` freezes it separately: `Object.freeze` is shallow,
// so a nested object is only frozen if it is frozen.
export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly auth: DatabaseAuth;

  // Present when `auth` is `password` and **absent** when it is `entra` —
  // absent rather than `undefined`, which is the distinction
  // `exactOptionalPropertyTypes` exists to draw and which this file's own
  // comment above predicted "a credential Epic 2 brings" would be the first to
  // need. It matters beyond tidiness: a pool in `entra` mode that reads this
  // key gets a compile error rather than a silent empty string.
  readonly password?: string;

  readonly ssl: DatabaseSsl;
}

// The machine-readable declaration of what this application reads.
//
// Task 1.6.6 writes `.env.example` and wants something to check it against. A
// schema library would have had an object to walk; a set of readers does not,
// unless it is written to have one — so this is that one, and it is the
// difference between 1.6.6 having a staleness answer and having a sentence
// apologising for not having one. It is deliberately a plain table rather than
// the readers' source of truth: making the readers loop over it would trade
// four checked call sites for a generic executor, which is the settings
// framework this story is meant to resist. What keeps the two in step is that
// there are two of them on one screen.
export interface ConfigVariable {
  readonly key: string;
  readonly required: boolean;

  // The value used when the variable is absent or blank, as it would appear in
  // a shell — so `.env.example` can quote it verbatim. `undefined` means there
  // is no default.
  //
  // ~~which today cannot happen because nothing is required.~~ **Amended
  // 2026-09-07 by Task 2.7.2**: the sentence tied "no default" to "required",
  // and the two came apart. The Alpaca pair below is **optional with no
  // default** — absent is a legitimate configuration, and a credential is the
  // one kind of value that cannot have an invented one, because an invented
  // credential is present and wrong and fails at the first request instead of
  // at startup. `check-env-example.mjs` already handles this shape: it skips
  // the default comparison when `default` is `undefined`, so the example
  // documents the variable with a blank value.
  readonly default: string | undefined;
  readonly description: string;
}

export const CONFIG_VARIABLES: readonly ConfigVariable[] = [
  {
    key: "PORT",
    required: false,
    default: String(DEFAULT_PORT),
    description: `TCP port the API server listens on. An integer between ${String(MIN_PORT)} and ${String(MAX_PORT)}.`,
  },
  {
    key: "HOST",
    required: false,
    default: DEFAULT_HOST,
    description:
      "Interface the API server binds to. 0.0.0.0 to accept connections from outside the machine.",
  },
  {
    key: "LOG_LEVEL",
    required: false,
    default: DEFAULT_LOG_LEVEL,
    description: `Lowest severity the server emits. One of ${LOG_LEVELS.join(", ")}. \`silent\` emits nothing at all, errors included.`,
  },
  {
    key: "LOG_FORMAT",
    required: false,
    default: DEFAULT_LOG_FORMAT,
    description: `How a log record is rendered: ${LOG_FORMATS.join(" or ")}. \`pretty\` is for a human reading a terminal and is what \`pnpm dev\` sets; anything shipping logs to a machine wants json.`,
  },
  {
    key: "CORS_ORIGIN",
    required: false,
    default: DEFAULT_CORS_ORIGIN,
    description:
      "The one browser origin allowed to call this API, matched exactly (scheme, host and port). The default is the Vite dev server, so a fresh clone works with no .env at all; a deployment should set this to the site's own origin.",
  },
  {
    key: "MARKET_DATA_PROVIDER",
    required: false,
    default: DEFAULT_MARKET_DATA_PROVIDER,
    description: `Which market-data provider serves prices: ${MARKET_DATA_PROVIDER_SELECTIONS.join(" or ")}. \`none\` means no provider is configured and the backend serves no market data — the default, because \`fixture\` serves INVENTED prices and a default that quietly works is one that quietly ships fabricated data.`,
  },
  {
    key: ALPACA_KEY_ID_VARIABLE,
    required: false,
    default: undefined,
    description:
      "Alpaca market-data API key id. NOT a secret: it travels in the clear in a request header and is on Alpaca's dashboard, so it may appear in a message or a log line. Optional with no default — absent means no Alpaca credential is configured, which is what a clean clone is. Setting this without ALPACA_API_SECRET_KEY is a startup error rather than half a credential.",
  },
  {
    key: ALPACA_SECRET_KEY_VARIABLE,
    required: false,
    default: undefined,
    description:
      "Alpaca market-data API secret key. THIS IS A SECRET: no message this application produces may contain its value, and it belongs in apps/backend/.env locally and in a Container App secret deployed — never in this repository. Optional with no default; setting it without ALPACA_API_KEY_ID is a startup error.",
  },
  {
    key: "DATABASE_HOST",
    required: false,
    default: DEFAULT_DATABASE_HOST,
    description:
      "Host the database is reached at. The default is the local development container `pnpm db` starts, which publishes on loopback only.",
  },
  {
    key: "DATABASE_PORT",
    required: false,
    default: String(DEFAULT_DATABASE_PORT),
    description: `TCP port the database listens on. An integer between ${String(MIN_PORT)} and ${String(MAX_PORT)}.`,
  },
  {
    key: "DATABASE_NAME",
    required: false,
    default: DEFAULT_DATABASE_NAME,
    description: "Name of the database to connect to.",
  },
  {
    key: "DATABASE_USER",
    required: false,
    default: DEFAULT_DATABASE_USER,
    description:
      "Role to connect as. Under DATABASE_AUTH=entra this is the managed identity's own name rather than a database-local role.",
  },
  {
    key: "DATABASE_AUTH",
    required: false,
    default: DEFAULT_DATABASE_AUTH,
    description: `How the connection authenticates: ${DATABASE_AUTH_MODES.join(" or ")}. \`password\` reads DATABASE_PASSWORD; \`entra\` mints a Microsoft Entra access token per connection from the container app's managed identity and never reads DATABASE_PASSWORD at all. Named rather than inferred, so a forgotten variable is a startup error instead of a confusing authentication failure.`,
  },
  {
    key: "DATABASE_PASSWORD",
    required: false,
    default: DEFAULT_DATABASE_PASSWORD,
    description:
      "Password for DATABASE_USER. Read only under DATABASE_AUTH=password, and setting it alongside DATABASE_AUTH=entra is a startup error rather than a value that is quietly ignored. The default is the local container's fixture, which is in this repository on purpose; a real credential belongs in .env and nowhere else.",
  },
  {
    key: "DATABASE_SSL",
    required: false,
    default: DEFAULT_DATABASE_SSL,
    description: `TLS for the database connection: ${DATABASE_SSL_MODES.join(", ")}. The default suits the local container, which offers no TLS. \`require\` encrypts without verifying the certificate and is deliberately never a default; the managed server wants \`verify-full\`.`,
  },
];

// Blank is absent, everywhere and for every reader. `PORT=` is the commonest
// shape in a .env file — a placeholder nobody filled in, a line copied from
// the example — and Task 1.6.3 is about to write one of those files. Treating
// it as a value is how `Number("")` starts the server on port 0.
function present(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function readString(
  env: Record<string, string | undefined>,
  key: string,
  fallback: string,
): string {
  return present(env[key]) ?? fallback;
}

export function readInt(
  env: Record<string, string | undefined>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = present(env[key]);
  if (raw === undefined) {
    return fallback;
  }

  // Number() rather than parseInt(): parseInt("3000nonsense") is 3000, which
  // would silently accept a typo'd value.
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    // JSON.stringify quotes the value so an operator can see the whitespace or
    // the stray character they typed. A Node bind error names neither the
    // variable nor the value.
    throw new ConfigError(
      `${key} must be an integer between ${String(min)} and ${String(max)}, received ${JSON.stringify(env[key])}`,
    );
  }

  return value;
}

// The third reader, and the one Task 1.6.3 went looking for a caller for and
// did not find. `LOG_LEVEL` is that caller.
//
// The `allowed` list is the source of both the check and the message, so a
// value added to the vocabulary cannot be accepted while the error still
// advertises the old set. The message quotes the raw value the same way
// readInt does — an operator who typed a trailing space or the wrong case sees
// it, and casing is the likeliest mistake here: pino's levels are lowercase
// and `LOG_LEVEL=INFO` looks correct.
//
// The cast on the return is the one place this file asserts something the
// compiler cannot see. `allowed.includes()` on a `readonly T[]` narrows nothing
// in TypeScript — its parameter type is `T`, so passing a `string` is an error
// before it is a narrowing — and the alternatives are a type predicate helper
// that says the same thing with more ceremony. The guard immediately above it
// is what makes it true.
export function readEnum<T extends string>(
  env: Record<string, string | undefined>,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = present(env[key]);
  if (raw === undefined) {
    return fallback;
  }

  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ConfigError(
      `${key} must be one of ${allowed.join(", ")}, received ${JSON.stringify(env[key])}`,
    );
  }

  return raw as T;
}

// Where a `.env` file lives: beside `package.json` in this package, rather
// than in the current working directory.
//
// The cwd is what Node itself defaults to, for both `process.loadEnvFile()`
// and `--env-file`, and it is what dotenv does — so this is a deliberate
// divergence. Both of the ways this server is started (`scripts/dev.sh` via
// `pnpm --filter @marketpulse/backend dev`, and `start`) run with the package
// as their cwd, so the two agree today by coincidence; resolving from the
// module makes them agree by construction. It also survives the case the
// coincidence does not — `node apps/backend/dist/index.js` from the repository
// root, which is the shape of every "just run the built output" instruction.
//
// This file emits to `dist/config.js`, so `..` is the package root, and it
// stays the package root under `pnpm deploy --filter` (Story 1.11), which
// copies `dist/` and `package.json` into one directory together.
const ENV_FILE = path.join(import.meta.dirname, "..", ".env");

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

// Load `apps/backend/.env` into process.env, if there is one.
//
// This is `process.loadEnvFile()` and not the `--env-file` flag, and the
// deciding measurement is that `--env-file` on a missing file is **exit 9
// before any application code runs** — so a fresh clone, which has no `.env`,
// would not start. `--env-file-if-exists` fixes that and writes a line to
// stderr every time instead. But the real argument is the one the flags cannot
// answer: a flag has to be repeated at every invocation site, and there are two
// of them here — `start` in package.json and `node --watch dist/index.js`
// inside scripts/dev.sh, which is the one file `pnpm verify` checks with
// nothing. Two copies of the loader is exactly the "works in dev, differs in
// production" bug this is supposed to prevent, and `NODE_OPTIONS` cannot hold
// the flag either (Node rejects it outright). In-process, there is one call
// site and the two entrypoints cannot disagree.
//
// Precedence is Node's and it is the conventional one, measured both ways
// round: a variable already set in the real environment **wins** over the same
// key in the file. That is what a container depends on, and it is why nothing
// here has to special-case production.
//
// A missing file is the ordinary case rather than an error — a fresh clone has
// none, and a container has none by design — so ENOENT is swallowed and
// everything else is re-thrown for index.ts to report. The path is returned so
// a caller can say which file it read; nothing does yet, and Story 1.7 owns the
// logger that would.
//
// Calling this is the entrypoint's job, not this module's: it mutates the
// process, which is precisely what loadConfig() was written not to do.
export function loadEnvFile(): string | undefined {
  try {
    process.loadEnvFile(ENV_FILE);
    return ENV_FILE;
  } catch (error) {
    if (isFileNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

// Validation happens when this is called, not when the module is imported.
//
// A module that throws on import is hostile to a test that wants to assert the
// throwing, and Story 1.9 will want exactly that — the same reason
// buildServer() keeps process concerns out of the application. It is also why
// `env` is a parameter: the readers can be driven with a plain object and no
// process to mutate. The default is the one concession, and it is what keeps
// `process.env` to a single occurrence in the workspace.
//
// This function throws; it never exits. Only the entrypoint exits.
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const problems: string[] = [];

  // The accumulator, and the one thing the schema libraries did that the code
  // this replaces did not: report every bad key rather than the first. The
  // reads used to be sequential, so a bad PORT and a bad HOST were two runs to
  // discover.
  const read = <T>(reader: () => T): T | undefined => {
    try {
      return reader();
    } catch (error) {
      if (error instanceof ConfigError) {
        problems.push(error.message);
        return undefined;
      }
      throw error;
    }
  };

  const port = read(() =>
    readInt(env, "PORT", DEFAULT_PORT, MIN_PORT, MAX_PORT),
  );
  const host = read(() => readString(env, "HOST", DEFAULT_HOST));
  const logLevel = read(() =>
    readEnum(env, "LOG_LEVEL", LOG_LEVELS, DEFAULT_LOG_LEVEL),
  );
  const logFormat = read(() =>
    readEnum(env, "LOG_FORMAT", LOG_FORMATS, DEFAULT_LOG_FORMAT),
  );
  const corsOrigin = read(() =>
    readString(env, "CORS_ORIGIN", DEFAULT_CORS_ORIGIN),
  );

  const marketDataProvider = read(() =>
    readEnum(
      env,
      "MARKET_DATA_PROVIDER",
      MARKET_DATA_PROVIDER_SELECTIONS,
      DEFAULT_MARKET_DATA_PROVIDER,
    ),
  );

  const databaseHost = read(() =>
    readString(env, "DATABASE_HOST", DEFAULT_DATABASE_HOST),
  );
  const databasePort = read(() =>
    readInt(env, "DATABASE_PORT", DEFAULT_DATABASE_PORT, MIN_PORT, MAX_PORT),
  );
  const databaseName = read(() =>
    readString(env, "DATABASE_NAME", DEFAULT_DATABASE_NAME),
  );
  const databaseUser = read(() =>
    readString(env, "DATABASE_USER", DEFAULT_DATABASE_USER),
  );
  const databaseAuth = read(() =>
    readEnum(env, "DATABASE_AUTH", DATABASE_AUTH_MODES, DEFAULT_DATABASE_AUTH),
  );
  const databasePassword = read(() =>
    readString(env, "DATABASE_PASSWORD", DEFAULT_DATABASE_PASSWORD),
  );
  const databaseSsl = read(() =>
    readEnum(env, "DATABASE_SSL", DATABASE_SSL_MODES, DEFAULT_DATABASE_SSL),
  );

  // The credential is read raw rather than through `readString`, because
  // `readString` takes a fallback and there is no fallback for a credential.
  // `present()` is what makes a blank line in `.env` absent rather than an
  // empty string — the same rule every other variable gets, and it matters
  // more here: an empty-string secret would be a credential that exists and
  // cannot work.
  const alpacaKeyId = present(env[ALPACA_KEY_ID_VARIABLE]);
  const alpacaSecretKey = present(env[ALPACA_SECRET_KEY_VARIABLE]);

  // --- Two checks that are about a pair of variables rather than one ---
  //
  // These are the first cross-variable rules in this module, and they exist
  // because the alternative to each is a failure at first connection rather
  // than at startup — which is Task 2.1.3's stated 3am case: nothing is wrong
  // until something asks the database a question.
  //
  // They go through the same accumulator as the readers, so a configuration
  // that is wrong in a reader's way and in a pair's way at once reports both.

  // A password set alongside the identity path is the "laptop with a stale
  // variable" case, and it is worth rejecting rather than ignoring because the
  // two readings of it are opposite: either the mode is wrong and the password
  // should be used, or the password is left over and is being sent to a server
  // that refuses passwords outright. Guessing between them is what produces an
  // authentication error nobody can attribute.
  //
  // It keys on the variable being **present in the environment**, not on the
  // resolved value, because the resolved value always exists — it has a
  // default. And **the message names the variable and never the value**: this
  // is the one line in this file that could put a credential into a log, and
  // `readInt` and `readEnum` quoting what the operator typed is exactly the
  // habit that would have done it.
  // Dot notation rather than a bracketed key, because `dot-notation` rejects
  // the latter on an index signature. Reading the raw environment here rather
  // than the resolved value is the whole point: the resolved value always
  // exists, so only the raw one can say whether anyone asked for it.
  const passwordWasSet = present(env.DATABASE_PASSWORD) !== undefined;

  if (databaseAuth === "entra" && passwordWasSet) {
    problems.push(
      "DATABASE_PASSWORD is set but DATABASE_AUTH is entra, which authenticates with a Microsoft Entra access token and never reads a password. Unset one of them: the server this mode is for has password authentication disabled, so the password would be sent and refused.",
    );
  }

  // An access token is a bearer credential valid for up to 24 hours. Sending
  // one over a connection that is not encrypted hands it to anything on the
  // path, and `entra` is only ever the managed server, which enforces
  // encryption anyway — so `disable` here cannot be a deliberate choice, only
  // a variable somebody forgot to change.
  if (databaseAuth === "entra" && databaseSsl === "disable") {
    problems.push(
      "DATABASE_SSL is disable but DATABASE_AUTH is entra, which sends an access token as the password. That is a bearer credential in the clear; the managed server enforces encryption in any case. Use verify-full.",
    );
  }

  // --- Two more cross-variable rules, and they are Story 2.7's open decision 3 ---
  //
  // The question the story asked — *what does a missing or invalid key do at
  // startup?* — turns out to have **two halves with different answers**, and
  // that is the finding rather than a compromise.
  //
  //   Absent, with a provider selected that needs it → a startup REFUSAL, here.
  //     Selecting a provider is a deliberate act, so a deployment that selected
  //     Alpaca and forgot the key has stated an intention this process cannot
  //     honour. PRODUCT_SPEC §36's degrade-locally principle is about failures
  //     at RUN time, and Story 1.12's `degraded` vocabulary is about a service
  //     that answered badly — neither describes a configuration that was never
  //     coherent.
  //
  //   Present but WRONG → not a startup concern at all, and deliberately not
  //     checked here. The only way to find out is to make a request, and a
  //     startup probe against a metered third party is a request nobody asked
  //     for: it puts the process's liveness in a vendor's hands, on a platform
  //     whose startup probe kills a replica at roughly ninety seconds, which
  //     turns a vendor outage into a crash loop. That is the failure Task 2.1.4
  //     designed the database probe to avoid, on this platform, for this
  //     reason. A wrong key surfaces as `unauthorised`, already a member of
  //     `BarsResult` and already non-retryable; Task 2.7.6 produces it.
  //
  //   Absent, with the default provider → NOTHING HAPPENS, and that is the case
  //     a clean clone is in. Story 2.7's acceptance criterion 6 is that
  //     sentence: a fresh checkout with no `.env` builds, tests, runs and
  //     passes `pnpm verify` with no Alpaca key anywhere.

  // Half a credential has no correct reading. Either the pair was meant and one
  // line was lost, or neither was meant and one is left over — the
  // `DATABASE_PASSWORD`-with-`entra` shape exactly, and refused for the same
  // reason: guessing between two opposite readings is what produces a failure
  // nobody can attribute. It fires regardless of which provider is selected,
  // because a half-set pair is a mistake whether or not anything reads it.
  //
  // **The message names the variables and never a value.** The secret is
  // obvious; the key id is deliberately not quoted either, because a message
  // about a missing half has no use for the half that is present.
  if (alpacaKeyId === undefined && alpacaSecretKey !== undefined) {
    problems.push(
      `${ALPACA_SECRET_KEY_VARIABLE} is set but ${ALPACA_KEY_ID_VARIABLE} is not. Alpaca authenticates with both, sent as two headers; set the pair or neither.`,
    );
  }

  if (alpacaKeyId !== undefined && alpacaSecretKey === undefined) {
    problems.push(
      `${ALPACA_KEY_ID_VARIABLE} is set but ${ALPACA_SECRET_KEY_VARIABLE} is not. Alpaca authenticates with both, sent as two headers; set the pair or neither.`,
    );
  }

  // The raw read is the point, and it is the `DATABASE_PASSWORD` check's own
  // idiom: only the raw value says what an operator ASKED FOR. `alpaca` IS a
  // member of `MARKET_DATA_PROVIDER_SELECTIONS` since Task 2.7.3, so the parsed
  // value could express this request today — and the raw read is kept anyway,
  // because it also fires for a provider id this build does not know, which the
  // parsed value structurally cannot.
  if (
    present(env.MARKET_DATA_PROVIDER) === ALPACA_PROVIDER_SELECTION &&
    (alpacaKeyId === undefined || alpacaSecretKey === undefined)
  ) {
    problems.push(
      `MARKET_DATA_PROVIDER is ${ALPACA_PROVIDER_SELECTION} but ${ALPACA_KEY_ID_VARIABLE} and ${ALPACA_SECRET_KEY_VARIABLE} are not both set. Alpaca serves nothing without a credential, so this deployment asked for a provider it cannot use.`,
    );
  }

  // The undefined checks are redundant at runtime — a reader only returns
  // undefined after pushing a problem — and they are what narrows the types,
  // so the success path cannot be reached with a hole in it.
  if (
    problems.length > 0 ||
    port === undefined ||
    host === undefined ||
    logLevel === undefined ||
    logFormat === undefined ||
    corsOrigin === undefined ||
    marketDataProvider === undefined ||
    databaseHost === undefined ||
    databasePort === undefined ||
    databaseName === undefined ||
    databaseUser === undefined ||
    databaseAuth === undefined ||
    databasePassword === undefined ||
    databaseSsl === undefined
  ) {
    throw new ConfigError(problems.join("\n"));
  }

  // Nothing logs this object, and nothing should.
  //
  // The tempting convenience is a startup line naming what the process
  // actually read, which is genuinely useful right up until Epic 2's Alpaca
  // credentials and Epic 10's model-provider key are keys on it. The
  // alternative — configuring pino's `redact` with those paths — is a denylist,
  // and a denylist's failure mode is a key nobody added to it, silently, in the
  // one place secrets are hardest to retract from. So the rule is the simpler
  // one and it is stated here rather than inferred: **the resolved
  // configuration is never logged.** Log the individual non-secret value at the
  // point it matters instead — Fastify already prints the host and port in its
  // `Server listening at` line, which is the whole of what a startup dump would
  // have been good for.
  // The password is spread in conditionally rather than assigned, so that in
  // `entra` mode the key is genuinely **absent** rather than present and
  // undefined. That is the `exactOptionalPropertyTypes` idiom this file's own
  // interface comment named in advance, and here it carries a meaning: there
  // is nothing to read, rather than a credential that happens to be empty.
  const database: DatabaseConfig = Object.freeze({
    host: databaseHost,
    port: databasePort,
    name: databaseName,
    user: databaseUser,
    auth: databaseAuth,
    ...(databaseAuth === "password" ? { password: databasePassword } : {}),
    ssl: databaseSsl,
  });

  // **The strongest form of the no-credential-in-a-log rule turned out to be
  // structural rather than disciplined, and it is worth stating as a result.**
  // The rule above says the resolved configuration is never logged, and Task
  // 2.1.3 was written expecting the database to be its first real test. It is
  // not, quite: the deployed credential is an Entra **access token**, minted
  // per connection by the pool, and it does not come from `process.env` — so
  // this module never receives it and cannot leak it however carelessly it is
  // used. What this module holds is the local fixture, which is in the
  // repository on purpose. So the deployed half of the rule is not a promise
  // this file has to keep; it is a promise Task 2.1.4's pool has to keep, and
  // that is where the leak check belongs.
  //
  // The rule stays exactly as it was, because Story 2.7's Alpaca key **will**
  // arrive through here and it is a bearer secret with no identity behind it.
  // Spread in conditionally, and both halves at once — so the object either
  // has a whole credential or has no `alpaca` key at all. The half-set case
  // cannot reach here, because the checks above refused it.
  //
  // Frozen separately for `database`'s reason: `Object.freeze` is shallow, so a
  // nested object is only frozen if it is frozen.
  const alpaca: AlpacaConfig | undefined =
    alpacaKeyId !== undefined && alpacaSecretKey !== undefined
      ? Object.freeze({ keyId: alpacaKeyId, secretKey: alpacaSecretKey })
      : undefined;

  return Object.freeze({
    port,
    host,
    logLevel,
    logFormat,
    corsOrigin,
    database,
    marketDataProvider,
    ...(alpaca === undefined ? {} : { alpaca }),
  });
}
