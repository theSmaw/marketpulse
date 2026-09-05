// Token acquisition, tested without a socket (Task 2.1.6).
//
// This file drives `acquireEntraAccessToken` with a plain environment object
// and a stub `fetch`, which is why it belongs in the **fast** suite beside
// `database.test.ts` rather than beside the process tests. Story 1.9's property
// — `pnpm test` needs no build and no socket — is the reason `FetchLike` is a
// parameter at all; a loopback server here would have been the easier thing to
// write and would have cost the suite developers run all day.

import { describe, expect, it } from "vitest";

import { CONNECT_TIMEOUT_MS } from "./database.js";
import {
  acquireEntraAccessToken,
  TOKEN_TIMEOUT_MS,
  type FetchLike,
} from "./entra-token.js";

// A value shaped like the thing that must never appear in a message. It is not
// a real header and not a real token; what matters is that it is distinctive
// enough that a grep over an error object cannot miss it.
const HEADER = "IDENTITY-HEADER-SECRET-8f3b2a1c";
const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.PAYLOAD-c4d5e6.SIGNATURE";

const ENV = {
  IDENTITY_ENDPOINT: "http://localhost:42356/msi/token",
  IDENTITY_HEADER: HEADER,
};

/** A `fetch` that answers whatever it is told to, and records what it was asked. */
function stubFetch(
  answer: {
    ok?: boolean;
    status?: number;
    body?: string;
    throws?: Error;
  },
  calls: { url: string; headers: Record<string, string> }[] = [],
): FetchLike {
  return (url, init) => {
    calls.push({ url, headers: init.headers });
    if (answer.throws) {
      return Promise.reject(answer.throws);
    }
    return Promise.resolve({
      ok: answer.ok ?? true,
      status: answer.status ?? 200,
      text: () =>
        Promise.resolve(answer.body ?? JSON.stringify({ access_token: TOKEN })),
    });
  };
}

/**
 * Everything a thrown error carries, not only its message.
 *
 * This is the check that catches the failure this criterion exists for: a
 * driver or a helper that attaches its options to an error leaks through
 * properties rather than through the message, and `String(error)` would not see
 * it. Task 2.1.4 used the same shape to clear `pg`.
 */
function everything(error: unknown): string {
  return JSON.stringify(error, Object.getOwnPropertyNames(error));
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    expect.fail(`expected an Error, got ${String(error)}`);
  }
  expect.fail("expected a rejection");
}

describe("acquireEntraAccessToken", () => {
  it("asks the container-app identity endpoint, with the header that recipe wants", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];

    await acquireEntraAccessToken(ENV, stubFetch({}, calls));

    expect(calls).toHaveLength(1);
    const call = calls[0];
    if (call === undefined) {
      expect.fail("no call recorded");
    }

    // The three things that are wrong in every copied virtual-machine recipe:
    // the address, the header name, and a missing api-version.
    expect(call.url).toContain("http://localhost:42356/msi/token");
    expect(call.url).not.toContain("169.254.169.254");
    expect(call.headers["X-IDENTITY-HEADER"]).toBe(HEADER);
    expect(call.headers.Metadata).toBeUndefined();
    expect(call.url).toContain("api-version=2019-08-01");

    // The audience. A token for the wrong resource is refused by the database
    // gateway rather than by the token endpoint, so nothing here would catch
    // it — this assertion is the only thing standing there.
    expect(call.url).toContain(
      `resource=${encodeURIComponent("https://ossrdbms-aad.database.windows.net")}`,
    );
  });

  it("returns the token and how long it took", async () => {
    const result = await acquireEntraAccessToken(ENV, stubFetch({}));

    expect(result.token).toBe(TOKEN);
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it("names IDENTITY_ENDPOINT's absence as 'not on this platform' rather than as a fault", async () => {
    const error = await rejection(acquireEntraAccessToken({}, stubFetch({})));

    expect(error.message).toContain("IDENTITY_ENDPOINT is not set");
    expect(error.message).toContain("DATABASE_AUTH=password");
  });

  it("distinguishes a broken injection from an absent one", async () => {
    const error = await rejection(
      acquireEntraAccessToken(
        { IDENTITY_ENDPOINT: ENV.IDENTITY_ENDPOINT },
        stubFetch({}),
      ),
    );

    expect(error.message).toContain("IDENTITY_HEADER is not set");
    expect(error.message).toContain("broken managed-identity injection");
  });

  it("names the endpoint it could not reach, which is what catches the VM recipe", async () => {
    const error = await rejection(
      acquireEntraAccessToken(
        ENV,
        stubFetch({
          throws: new Error("The operation was aborted due to timeout"),
        }),
      ),
    );

    expect(error.message).toContain("could not reach the identity endpoint");
    expect(error.message).toContain("http://localhost:42356/msi/token");
  });

  it("reports a non-200 by status and does NOT echo the body", async () => {
    // The body carries a token-shaped value on purpose. On the success path the
    // body *is* the credential, so a helpful implementation that echoes it on
    // failure is one edit away from echoing it on success.
    const error = await rejection(
      acquireEntraAccessToken(
        ENV,
        stubFetch({ ok: false, status: 400, body: `{"error":"${TOKEN}"}` }),
      ),
    );

    expect(error.message).toContain("answered 400");
    expect(everything(error)).not.toContain(TOKEN);
  });

  it("rejects a 200 that is not JSON", async () => {
    const error = await rejection(
      acquireEntraAccessToken(ENV, stubFetch({ body: "<html>no</html>" })),
    );

    expect(error.message).toContain("not JSON");
  });

  it("rejects a 200 with no access_token", async () => {
    const error = await rejection(
      acquireEntraAccessToken(ENV, stubFetch({ body: '{"expires_on":"1"}' })),
    );

    expect(error.message).toContain("no access_token");
  });

  // **The leak assertion, and it is the one this task exists for.**
  //
  // Every failure path is produced and every resulting error object read whole,
  // looking for the two things that must never travel in one: the identity
  // header, which is a bearer credential for the token endpoint, and the token
  // itself. Checked across `Object.getOwnPropertyNames` rather than the
  // message, because a leak of this kind arrives as an attached property.
  it("puts neither the identity header nor a token into ANY failure", async () => {
    const failures: Promise<unknown>[] = [
      acquireEntraAccessToken({}, stubFetch({})),
      acquireEntraAccessToken(
        { IDENTITY_ENDPOINT: ENV.IDENTITY_ENDPOINT },
        stubFetch({}),
      ),
      acquireEntraAccessToken(
        ENV,
        stubFetch({ throws: new Error("ECONNREFUSED") }),
      ),
      acquireEntraAccessToken(
        ENV,
        stubFetch({ ok: false, status: 500, body: TOKEN }),
      ),
      acquireEntraAccessToken(ENV, stubFetch({ body: TOKEN })),
      acquireEntraAccessToken(ENV, stubFetch({ body: "{}" })),
    ];

    for (const failure of failures) {
      const error = await rejection(failure);
      const whole = everything(error);
      expect(whole).not.toContain(HEADER);
      expect(whole).not.toContain(TOKEN);
      expect(whole).not.toContain("eyJ");
    }
  });
});

describe("the token deadline's relationship to the connection deadline", () => {
  // **An ordering nothing in `pnpm verify` can see, so a test holds it.**
  //
  // `pg` calls the credential function *inside* connection establishment, so a
  // token fetch allowed to outlive `connectionTimeoutMillis` is reported as a
  // generic connection timeout and the identity endpoint is never named — the
  // exact "slow, silent, correct-looking failure" this task's brief warns
  // about. Strictly below, the token fetch fails first and says what it was
  // doing.
  //
  // This is the same shape as the frontend's `API_TIMEOUT_MS` sitting below
  // `HEALTH_POLL_INTERVAL_MS`, and it gets the same treatment for the same
  // reason: the two numbers live in two files and only their relationship
  // matters.
  it("keeps the token deadline strictly below the connection deadline", () => {
    expect(TOKEN_TIMEOUT_MS).toBeLessThan(CONNECT_TIMEOUT_MS);
  });
});
