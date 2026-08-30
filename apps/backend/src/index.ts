// The entrypoint: the only file that knows there is a process, an
// environment, and a socket. The application itself is server.ts.
//
// Configuration is read inline here, and deliberately: this task's acceptance
// criterion is "a configurable port", which two `process.env` reads satisfy.
// Story 1.6 owns configuration properly — a config module, a schema, typed
// settings — and replacing two reads is far easier than unpicking an
// abstraction invented before there was anything to configure.

import process from "node:process";

import { buildServer } from "./server.js";

const DEFAULT_PORT = 3000;

// Not 0.0.0.0. A development server should not be reachable on every
// interface on the machine; a container needs 0.0.0.0 and gets it by setting
// HOST, which is exactly why this is a variable in the first place
// (Story 1.11).
const DEFAULT_HOST = "127.0.0.1";

class ConfigError extends Error {}

function readPort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PORT;
  }

  // Number() rather than parseInt(): parseInt("3000nonsense") is 3000, which
  // would silently accept a typo'd value.
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(
      `PORT must be an integer between 1 and 65535, received ${JSON.stringify(raw)}`,
    );
  }

  return port;
}

function readHost(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_HOST;
  }

  return raw.trim();
}

let port: number;
let host: string;

try {
  port = readPort(process.env.PORT);
  host = readHost(process.env.HOST);
} catch (error) {
  // Fail before the logger exists, so this goes to stderr as a plain line
  // rather than as a Fastify log record. The message names the variable and
  // the value it was given; a Node bind error names neither.
  process.stderr.write(
    `${error instanceof ConfigError ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const app = buildServer();

// Signal handling is Task 1.2.4 and belongs here rather than in buildServer(),
// because it is a property of this process, not of the application.

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error, "server failed to start");
  process.exit(1);
}
