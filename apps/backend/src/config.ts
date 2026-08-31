// The one place this application reads the environment.
//
// **Nothing outside this file may read `process.env`.** That is the invariant
// the module exists to create, and it is the thing that decays first — the
// second read added elsewhere is always the cheap one. Task 1.6.2 verified by
// grep that this file holds the only occurrence in the workspace; a future
// task that adds a second should either move it here or say why not.
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
  // is no default, which today cannot happen because nothing is required.
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

  // The undefined checks are redundant at runtime — a reader only returns
  // undefined after pushing a problem — and they are what narrows the types,
  // so the success path cannot be reached with a hole in it.
  if (problems.length > 0 || port === undefined || host === undefined) {
    throw new ConfigError(problems.join("\n"));
  }

  return Object.freeze({ port, host });
}
