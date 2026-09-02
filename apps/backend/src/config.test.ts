// `loadConfig` is driven with a plain object and nothing else.
//
// It takes the environment as a parameter — defaulting to `process.env`, which
// is the only occurrence of that expression in the workspace — and it validates
// on call rather than on import. So there is no process to mutate, no module to
// re-import between cases, and no ordering between tests. That property was
// designed in Task 1.6.2 for this task before this task existed; these tests
// are what make it worth having.
//
// `loadEnvFile()` is deliberately not exercised and there is no `.env.test`.
// `index.ts` calls the loader, `config.ts` does not, and a variable already set
// in the real environment beats a file entry — so a runner that sets variables
// in its own process needs no file and cannot be surprised by a developer's
// `.env`. Task 1.6.3 measured that precedence both ways round.

import { describe, expect, it } from "vitest";

import {
  CONFIG_VARIABLES,
  ConfigError,
  LOG_FORMATS,
  LOG_LEVELS,
  loadConfig,
} from "./config.js";

describe("loadConfig defaults", () => {
  it("returns every default from an empty environment", () => {
    expect(loadConfig({})).toStrictEqual({
      port: 3000,
      host: "127.0.0.1",
      logLevel: "info",
      logFormat: "json",
      corsOrigin: "http://localhost:5173",
    });
  });

  // The case a schema library got wrong, and the reason Story 1.6 threw two of
  // them away: `z.coerce.number()` parses `""` as **port 0**. A `.env` line of
  // `PORT=` sets an empty string rather than leaving the key unset, so this is
  // what a commented-out-by-blanking variable actually does.
  it("treats a blank value as absent, so PORT= is the default and not port 0", () => {
    expect(loadConfig({ PORT: "" }).port).toBe(3000);
    expect(loadConfig({ PORT: "   " }).port).toBe(3000);
    expect(loadConfig({ HOST: "" }).host).toBe("127.0.0.1");
    expect(loadConfig({ CORS_ORIGIN: "" }).corsOrigin).toBe(
      "http://localhost:5173",
    );
  });

  it("trims a value rather than taking it literally", () => {
    expect(loadConfig({ PORT: " 8080 " }).port).toBe(8080);
    expect(loadConfig({ HOST: " 0.0.0.0 " }).host).toBe("0.0.0.0");
  });

  it("freezes what it returns", () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });
});

describe("loadConfig reading", () => {
  it("reads every variable", () => {
    expect(
      loadConfig({
        PORT: "8080",
        HOST: "0.0.0.0",
        LOG_LEVEL: "debug",
        LOG_FORMAT: "pretty",
        CORS_ORIGIN: "https://marketpulse.example",
      }),
    ).toStrictEqual({
      port: 8080,
      host: "0.0.0.0",
      logLevel: "debug",
      logFormat: "pretty",
      corsOrigin: "https://marketpulse.example",
    });
  });

  it("accepts every level in the vocabulary, `silent` included", () => {
    for (const level of LOG_LEVELS) {
      expect(loadConfig({ LOG_LEVEL: level }).logLevel).toBe(level);
    }
    for (const format of LOG_FORMATS) {
      expect(loadConfig({ LOG_FORMAT: format }).logFormat).toBe(format);
    }
  });
});

describe("loadConfig rejection", () => {
  // `ConfigError` is exported so the *type* can be asserted and not only the
  // message. `index.ts` catches this class specifically — anything else is a
  // programming error and is allowed to crash — so the class is part of the
  // contract rather than an implementation detail.
  it("throws ConfigError and never exits", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(ConfigError);
  });

  // The message quotes what the operator typed. That is why the readers are
  // hand-written: `z.coerce.number()` reports `NaN` and loses the input, which
  // is the one piece of information the person reading the line needs.
  it.each([
    ["abc", '"abc"'],
    ["0", '"0"'],
    ["65536", '"65536"'],
    ["8080.5", '"8080.5"'],
    ["-1", '"-1"'],
  ])("reports PORT=%s with the value the operator typed", (raw, quoted) => {
    expect(() => loadConfig({ PORT: raw })).toThrow(quoted);
    expect(() => loadConfig({ PORT: raw })).toThrow(
      "PORT must be an integer between 1 and 65535",
    );
  });

  it("accepts the boundary ports it names", () => {
    expect(loadConfig({ PORT: "1" }).port).toBe(1);
    expect(loadConfig({ PORT: "65535" }).port).toBe(65535);
  });

  // The error message's allowed set comes from the same array the check uses,
  // so a value added to a vocabulary cannot be accepted while the message still
  // advertises the old set.
  it("names the allowed set when a vocabulary is missed", () => {
    expect(() => loadConfig({ LOG_LEVEL: "verbose" })).toThrow(
      `LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}, received "verbose"`,
    );
    expect(() => loadConfig({ LOG_FORMAT: "yaml" })).toThrow(
      `LOG_FORMAT must be one of ${LOG_FORMATS.join(", ")}, received "yaml"`,
    );
  });

  // What the eleven-line accumulator in `loadConfig` exists for. Reporting the
  // first problem only means an operator with three bad values fixes them one
  // restart at a time.
  it("reports every bad key rather than the first", () => {
    let thrown: ConfigError | undefined;
    try {
      loadConfig({ PORT: "abc", LOG_LEVEL: "verbose", LOG_FORMAT: "yaml" });
    } catch (error) {
      if (error instanceof ConfigError) {
        thrown = error;
      }
    }

    // `expect.fail` returns `never`, so this narrows the type as well as
    // failing the test — which is what keeps the assertion below free of a
    // cast, and the type-aware lint rules will not accept one anyway.
    if (thrown === undefined) {
      expect.fail("loadConfig did not throw a ConfigError");
    }
    const message = thrown.message;

    expect(message).toContain("PORT");
    expect(message).toContain("LOG_LEVEL");
    expect(message).toContain("LOG_FORMAT");
    // One problem per line — `scripts/check-ready.mjs` indents this per line,
    // which is a fix Task 1.8.7 made after 1.8.6 found it indenting only the
    // first.
    expect(message.split("\n")).toHaveLength(3);
  });
});

describe("CONFIG_VARIABLES", () => {
  // `scripts/check-env-example.mjs` walks this table against both
  // `.env.example` files, and it reads the **built** `dist/config.js` because
  // the table is TypeScript and the script is not. That check owns the
  // agreement between the table and the documentation; what it cannot check is
  // that the table agrees with the readers beside it, which is this.
  it("documents a default that loadConfig actually produces", () => {
    const config = loadConfig({});
    const actualDefaults: Record<string, string> = {
      PORT: String(config.port),
      HOST: config.host,
      LOG_LEVEL: config.logLevel,
      LOG_FORMAT: config.logFormat,
      CORS_ORIGIN: config.corsOrigin,
    };

    // The key sets have to match first, or the loop below passes vacuously on
    // a table that has grown a variable no reader produces.
    expect(
      CONFIG_VARIABLES.map((variable) => variable.key).sort(),
    ).toStrictEqual(Object.keys(actualDefaults).sort());

    for (const variable of CONFIG_VARIABLES) {
      expect(variable.required).toBe(false);
      expect(variable.default).toBe(actualDefaults[variable.key]);
    }
  });
});
