/**
 * `pnpm bars`' argument handling and its refusals (Task 2.7.3).
 *
 * **Every test here is offline**, which is why the argument parsing is in a
 * module rather than in `scripts/fetch-bars.mjs`: the wrapper is a name, a
 * built-output guard and an exit code, and none of those is testable.
 *
 * What is deliberately NOT tested here is the fetch. That is
 * `alpaca-provider.test.ts`'s, against a real local server; a second copy
 * driven through this command would be testing the same transport twice and
 * would need either a credential or a stub.
 */

import { describe, expect, it } from "vitest";

import { fetchBarsCommand } from "./fetch-bars.js";

/**
 * An environment with **no** Alpaca credential, so every test below stops at
 * the credential check and none of them can reach the network.
 *
 * `loadEnvFile()` runs first inside the command and reads `apps/backend/.env`,
 * which on a developer's machine holds a real key — so an assertion that
 * depended on the credential being absent would pass in CI and make a metered
 * request locally. What makes these safe is that they stop at the ARGUMENTS,
 * before the credential is even looked at.
 */
const NO_ENV = {};

describe("the arguments", () => {
  it("refuses a run with no symbol, and says how to use it", async () => {
    const outcome = await fetchBarsCommand([], NO_ENV);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("No symbol given");
    expect(outcome.errors.join("\n")).toContain("pnpm bars <SYMBOL>");
  });

  it("refuses a symbol that is not a well-formed ticker", async () => {
    const outcome = await fetchBarsCommand(["not a ticker"], NO_ENV);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("not a well-formed ticker");
  });

  it("refuses a timeframe outside TIMEFRAMES, naming the set", async () => {
    const outcome = await fetchBarsCommand(["NVDA", "5m"], NO_ENV);

    expect(outcome.exitCode).toBe(1);
    // The allowed set comes from the vocabulary rather than from a literal, so
    // a third member cannot be accepted while the message advertises two —
    // `readEnum`'s rule, applied here.
    expect(outcome.errors[0]).toContain("1m or 1d");
  });

  it("refuses an adjustment outside ADJUSTMENTS, naming the set", async () => {
    const outcome = await fetchBarsCommand(["NVDA", "1d", "split"], NO_ENV);

    expect(outcome.exitCode).toBe(1);
    // Note `split` is the VENDOR's word. Ours is `split-adjusted`, and the
    // mapping between them lives in alpaca-mapping.ts and nowhere else.
    expect(outcome.errors[0]).toContain("raw or split-adjusted");
  });

  it("reports the problem before anything reads a credential", async () => {
    const outcome = await fetchBarsCommand(["NVDA", "banana"], NO_ENV);

    expect(outcome.errors.join("\n")).not.toContain("ALPACA_API_KEY_ID");
  });
});

describe("what it does with no credential configured", () => {
  it("names both variables rather than failing obscurely", async () => {
    // The environment is passed explicitly and holds neither variable, so this
    // is the clean-clone case regardless of what the developer's .env holds.
    const outcome = await fetchBarsCommand(["NVDA"], NO_ENV);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("ALPACA_API_KEY_ID");
    expect(outcome.errors.join("\n")).toContain("ALPACA_API_SECRET_KEY");
  });

  // The credential's VALUE must never reach a message, which is the rule
  // config.ts asserts for DATABASE_PASSWORD and which this command inherits by
  // never interpolating one.
  it("names the variables and never a value", async () => {
    const secret = "hunter2-not-a-real-alpaca-key";
    const outcome = await fetchBarsCommand(["NVDA"], {
      ALPACA_API_SECRET_KEY: secret,
    });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).not.toContain(secret);
  });
});
