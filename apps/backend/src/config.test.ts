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
  DATABASE_AUTH_MODES,
  DATABASE_SSL_MODES,
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
      // The loud default: `fixture` serves invented prices, so opting into it
      // has to be a deliberate act (Task 2.6.6).
      marketDataProvider: "none",
      database: {
        host: "127.0.0.1",
        port: 5432,
        name: "marketpulse",
        user: "marketpulse",
        auth: "password",
        password: "marketpulse",
        ssl: "disable",
      },
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

  it("freezes what it returns, the nested database included", () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);

    // `Object.freeze` is shallow, so the nested object is only frozen because
    // `loadConfig` freezes it separately. Asserted rather than assumed: the
    // outer assertion above passes either way, which is exactly the shape of
    // check that reads as covering something it does not.
    expect(Object.isFrozen(loadConfig({}).database)).toBe(true);
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
        DATABASE_HOST: "db.example",
        DATABASE_PORT: "6432",
        DATABASE_NAME: "pulse",
        DATABASE_USER: "reader",
        DATABASE_AUTH: "password",
        DATABASE_PASSWORD: "correct-horse",
        DATABASE_SSL: "verify-full",
      }),
    ).toStrictEqual({
      port: 8080,
      host: "0.0.0.0",
      logLevel: "debug",
      logFormat: "pretty",
      corsOrigin: "https://marketpulse.example",
      marketDataProvider: "none",
      database: {
        host: "db.example",
        port: 6432,
        name: "pulse",
        user: "reader",
        auth: "password",
        password: "correct-horse",
        ssl: "verify-full",
      },
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

// The credential half of Task 2.1.3, which is where the two environments
// genuinely differ rather than merely being configured differently: the local
// container takes a password and the managed server refuses one outright.
describe("loadConfig database credentials", () => {
  // `exactOptionalPropertyTypes` makes "absent" and "present as undefined" two
  // different things, and here the difference carries meaning: under `entra`
  // there is nothing to read, rather than a credential that happens to be
  // empty. `toStrictEqual` distinguishes them; `toEqual` does not, which is
  // why this is written the long way.
  it("omits the password entirely under entra rather than setting it undefined", () => {
    const { database } = loadConfig({
      DATABASE_AUTH: "entra",
      DATABASE_SSL: "verify-full",
    });

    expect(database.auth).toBe("entra");
    expect("password" in database).toBe(false);
    expect(Object.keys(database)).not.toContain("password");
  });

  it("carries the password under password mode", () => {
    expect(loadConfig({}).database.password).toBe("marketpulse");
  });

  it("accepts every mode in both vocabularies", () => {
    for (const ssl of DATABASE_SSL_MODES) {
      expect(loadConfig({ DATABASE_SSL: ssl }).database.ssl).toBe(ssl);
    }

    // `entra` needs a TLS mode that is not `disable`, which is the cross-check
    // below — so the two vocabularies cannot be swept independently.
    for (const auth of DATABASE_AUTH_MODES) {
      expect(
        loadConfig({ DATABASE_AUTH: auth, DATABASE_SSL: "verify-full" })
          .database.auth,
      ).toBe(auth);
    }
  });

  // The two cross-variable rules, which are the first in this module. Each
  // exists because the alternative is a failure at first connection rather
  // than at startup.
  it("rejects a password set alongside the identity path", () => {
    expect(() =>
      loadConfig({
        DATABASE_AUTH: "entra",
        DATABASE_SSL: "verify-full",
        DATABASE_PASSWORD: "left-over-from-last-week",
      }),
    ).toThrow(ConfigError);
  });

  // It keys on the variable being **present**, not on the resolved value —
  // which always exists, because it has a default. A blank one is absent, so
  // this must not fire.
  it("does not fire on a blank password, which is absent", () => {
    expect(
      loadConfig({
        DATABASE_AUTH: "entra",
        DATABASE_SSL: "verify-full",
        DATABASE_PASSWORD: "",
      }).database.auth,
    ).toBe("entra");
  });

  it("rejects an access token sent over an unencrypted connection", () => {
    expect(() => loadConfig({ DATABASE_AUTH: "entra" })).toThrow(
      "DATABASE_SSL is disable but DATABASE_AUTH is entra",
    );
  });

  // **The redaction rule, asserted rather than trusted.** `readInt` and
  // `readEnum` quote what the operator typed, which is the right habit for a
  // port and the wrong one for a credential — so the one message in this module
  // that mentions DATABASE_PASSWORD must name the variable and never the value.
  // The value used here is deliberately not the local fixture: the fixture is
  // public, so a test written against it would pass while leaking a real one.
  it("never puts the password's value into a message", () => {
    const secret = "hunter2-not-the-local-fixture";

    let message = "";
    try {
      loadConfig({
        PORT: "nonsense",
        DATABASE_AUTH: "entra",
        DATABASE_PASSWORD: secret,
      });
    } catch (error) {
      if (error instanceof ConfigError) {
        message = error.message;
      }
    }

    expect(message).toContain("DATABASE_PASSWORD");
    expect(message).not.toContain(secret);

    // And the rest of the accumulator still quotes what it should, so this is
    // a rule about one value rather than a message that gave up on detail.
    expect(message).toContain('received "nonsense"');
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
    // `string | undefined` since Task 2.7.2: the Alpaca pair is optional with
    // **no** default, which is a shape this table had not carried before. The
    // credential's absence is a legitimate configuration and an invented one
    // would be a value that is present and wrong.
    const actualDefaults: Record<string, string | undefined> = {
      PORT: String(config.port),
      HOST: config.host,
      LOG_LEVEL: config.logLevel,
      LOG_FORMAT: config.logFormat,
      CORS_ORIGIN: config.corsOrigin,
      MARKET_DATA_PROVIDER: config.marketDataProvider,
      DATABASE_HOST: config.database.host,
      DATABASE_PORT: String(config.database.port),
      DATABASE_NAME: config.database.name,
      DATABASE_USER: config.database.user,
      DATABASE_AUTH: config.database.auth,
      DATABASE_PASSWORD: config.database.password ?? "",
      DATABASE_SSL: config.database.ssl,
      ALPACA_API_KEY_ID: config.alpaca?.keyId,
      ALPACA_API_SECRET_KEY: config.alpaca?.secretKey,
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

// --- The Alpaca credential (Task 2.7.2) ---
//
// The first bearer secret this application holds. These tests are the second
// use of Task 2.1.3's redaction procedure, and the difference is that this
// time there is genuinely a stored secret to leak: the database credential this
// module receives is a public fixture, and the deployed one never arrives here
// at all.
describe("loadConfig and the Alpaca credential", () => {
  const KEY_ID = "PKEXAMPLENOTREALKEYID";
  const SECRET = "not-the-real-secret-and-not-any-fixture-either";

  // Story 2.7's acceptance criterion 6, as a test rather than as a sentence: a
  // clean clone has no `.env`, therefore no credential, therefore no `alpaca`
  // key — and it is **absent** rather than present and empty, which is the
  // distinction `exactOptionalPropertyTypes` exists to draw.
  it("has no alpaca key at all when neither variable is set", () => {
    const config = loadConfig({});

    expect(config.alpaca).toBeUndefined();
    expect("alpaca" in config).toBe(false);
  });

  it("carries both halves when both are set", () => {
    const config = loadConfig({
      ALPACA_API_KEY_ID: KEY_ID,
      ALPACA_API_SECRET_KEY: SECRET,
    });

    expect(config.alpaca).toStrictEqual({ keyId: KEY_ID, secretKey: SECRET });
  });

  // Shallow freeze is the trap `database` already records, and a nested object
  // is only frozen if it is frozen. Asserted rather than assumed, because the
  // outer assertion passes either way.
  it("freezes the nested credential as well as the config", () => {
    const config = loadConfig({
      ALPACA_API_KEY_ID: KEY_ID,
      ALPACA_API_SECRET_KEY: SECRET,
    });

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.alpaca)).toBe(true);
  });

  // A blank line in `.env` is absent, everywhere and for every reader. It
  // matters more here than for `PORT`: an empty-string secret would be a
  // credential that exists and cannot possibly work.
  it("treats a blank credential as absent rather than as an empty secret", () => {
    expect(
      loadConfig({ ALPACA_API_KEY_ID: "", ALPACA_API_SECRET_KEY: "   " })
        .alpaca,
    ).toBeUndefined();
  });

  // Half a credential has two opposite readings — the pair was meant and a line
  // was lost, or neither was meant and one is left over — so it is refused
  // rather than guessed at. The `DATABASE_PASSWORD`-with-`entra` shape exactly.
  it("refuses a key id with no secret, naming both variables", () => {
    let message = "";
    try {
      loadConfig({ ALPACA_API_KEY_ID: KEY_ID });
    } catch (error) {
      if (error instanceof ConfigError) {
        message = error.message;
      }
    }

    expect(message).toContain("ALPACA_API_KEY_ID");
    expect(message).toContain("ALPACA_API_SECRET_KEY");
  });

  it("refuses a secret with no key id, naming both variables", () => {
    expect(() => loadConfig({ ALPACA_API_SECRET_KEY: SECRET })).toThrow(
      ConfigError,
    );
  });

  // **Story 2.7's open decision 3, first half.** Selecting a provider is a
  // deliberate act, so a deployment that selected Alpaca and forgot the key has
  // stated an intention this process cannot honour — a startup refusal rather
  // than a degraded start.
  //
  // Note what this asserts and what it does not. `alpaca` is not yet a member
  // of `MARKET_DATA_PROVIDER_SELECTIONS` — `PROVIDER_IDS` gains it in Task
  // 2.7.3, with the client that can produce it — so this configuration reports
  // **two** problems today and one of them will disappear on its own. The
  // credential message is the one this test is about, and it is producible now
  // precisely because the check reads the raw environment value rather than the
  // parsed selection.
  it("refuses MARKET_DATA_PROVIDER=alpaca with no credential, naming both variables and neither value", () => {
    let message = "";
    try {
      loadConfig({ MARKET_DATA_PROVIDER: "alpaca" });
    } catch (error) {
      if (error instanceof ConfigError) {
        message = error.message;
      }
    }

    expect(message).toContain("MARKET_DATA_PROVIDER is alpaca");
    expect(message).toContain("ALPACA_API_KEY_ID");
    expect(message).toContain("ALPACA_API_SECRET_KEY");
  });

  it("does not fire on MARKET_DATA_PROVIDER=alpaca when the credential is present", () => {
    let message = "";
    try {
      loadConfig({
        MARKET_DATA_PROVIDER: "alpaca",
        ALPACA_API_KEY_ID: KEY_ID,
        ALPACA_API_SECRET_KEY: SECRET,
      });
    } catch (error) {
      if (error instanceof ConfigError) {
        message = error.message;
      }
    }

    // The selection itself is still refused until 2.7.3 adds the member, so the
    // message is not empty — but the credential complaint must be gone.
    expect(message).not.toContain("asked for a provider it cannot use");
  });

  // **The redaction rule, asserted rather than trusted.** This is the whole
  // reason this task is separate from the client: a credential's failure mode
  // is a disclosure rather than a bug, and disclosures are found by looking.
  //
  // The value is deliberately not any fixture and not any real key, for Task
  // 2.1.3's stated reason — a test written against a public fixture passes
  // while leaking a real one.
  it("never puts the secret key's value into any message", () => {
    let message = "";
    try {
      loadConfig({
        PORT: "nonsense",
        ALPACA_API_SECRET_KEY: SECRET,
      });
    } catch (error) {
      if (error instanceof ConfigError) {
        message = error.message;
      }
    }

    expect(message).toContain("ALPACA_API_SECRET_KEY");
    expect(message).not.toContain(SECRET);

    // The rest of the accumulator still quotes what it should, so this is a
    // rule about one value rather than a message that gave up on detail.
    expect(message).toContain('received "nonsense"');
  });

  // Every problem in one run, which is what the accumulator is for: a
  // configuration wrong in a reader's way, a database pair's way and the
  // Alpaca pair's way reports three lines rather than the first.
  it("reports a reader problem, a database pair problem and an Alpaca pair problem together", () => {
    let message = "";
    try {
      loadConfig({
        PORT: "nonsense",
        DATABASE_AUTH: "entra",
        DATABASE_SSL: "verify-full",
        DATABASE_PASSWORD: "left-over",
        ALPACA_API_KEY_ID: KEY_ID,
      });
    } catch (error) {
      if (error instanceof ConfigError) {
        message = error.message;
      }
    }

    expect(message.split("\n")).toHaveLength(3);
    expect(message).toContain("PORT");
    expect(message).toContain("DATABASE_PASSWORD");
    expect(message).toContain("ALPACA_API_SECRET_KEY");
  });
});
