// Placeholder. The real server — Fastify or NestJS, routing, configuration —
// is Story 1.2. This file exists to prove that the backend resolves
// @marketpulse/shared through its `exports` map and that `node:` builtins
// typecheck, and it should be replaced wholesale rather than grown.
import process from "node:process";

import { toTicker, type Ticker } from "@marketpulse/shared";

const ticker: Ticker = toTicker("AAPL");

process.stdout.write(`@marketpulse/backend skeleton — shared resolves: ${ticker}\n`);
