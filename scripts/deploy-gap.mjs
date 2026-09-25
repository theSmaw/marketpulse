// **What a BROWSER's connection does across a deploy — for Story 4.7.**
//
//   node scripts/deploy-gap.mjs [minutes]
//
// ## The question, and why the existing figures do not answer it
//
// Task 4.1.7 measured that a client reads `LIVE` for **165 s** after losing
// its network, because `DISCONNECTED_AFTER_MS` is a monotonic watchdog on
// *any* inbound frame. Story 4.7 owns whether that is right for a browser, and
// the alternatives are priced against one number nobody has: **how long does a
// browser actually go without a frame during an ordinary deploy?**
//
// What is known is about the **backend**: Task 3.11.6 measured its upstream
// Alpaca socket refused for **45.8 s and 46.5 s** across two rollouts, because
// Container Apps overlaps revisions. **That is not the browser's gap.** A
// browser's socket is to OUR gateway, it closes with `1001 going away` on
// shutdown, and the client comes back in **500 ms** on that code rather than
// the 2 s it uses for anything else (Task 3.5.5). The new replica may be
// serving long before its upstream feed is.
//
// **So the browser's gap could be a second or it could be a minute**, and a
// threshold chosen without it is the same mistake as a denominator chosen
// without a curve.
//
// ## What it records
//
// A real page on the deployed site, with `window.WebSocket` wrapped from an
// `addInitScript` — never `routeWebSocket`, so this is the shipped client with
// its own reconnect policy rather than a simulation of one. Every socket open,
// every close with its code, and every inbound frame's arrival instant.
//
// **Count by URL, never by event** (Task 3.11.2): a page holds sockets that are
// not this product's, and a number with no URL beside it cannot tell them
// apart.
//
// The summary is computed from the log, so a killed run still summarises, and
// it reports the **longest inter-frame gap** — which is what the watchdog
// actually measures — beside the socket downtime, which is what a reader would
// call the outage.

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const SITE =
  process.env.E2E_DEPLOYED_BASE_URL ??
  "https://red-smoke-029583a0f.5.azurestaticapps.net";

const RUN_FOR_MS = Number(process.argv[2] ?? 600) * 60_000;
const DRAIN_EVERY_MS = 5_000;

const OUT = resolve(REPO_ROOT, ".capture/deploy-gap");
mkdirSync(OUT, { recursive: true });

const startedAt = new Date();
const stamp = startedAt.toISOString().slice(0, 19).replace(/[:T]/gu, "-");
const LOG = resolve(OUT, `gap-${stamp}.jsonl`);

const record = (row) => {
  appendFileSync(
    LOG,
    `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`,
  );
};

const PAGE_INSTRUMENT = `(() => {
  const out = [];
  globalThis.__gap = out;

  const Native = globalThis.WebSocket;

  globalThis.WebSocket = function (url, protocols) {
    const socket = protocols === undefined
      ? new Native(url)
      : new Native(url, protocols);

    // Count by URL, never by event: a dev server's HMR socket is not ours.
    if (!String(url).includes("/market-stream")) return socket;

    out.push({ kind: "open", at: Date.now() });

    socket.addEventListener("message", (event) => {
      let type = "?";
      try { type = JSON.parse(String(event.data)).type ?? "?"; } catch {}
      out.push({ kind: "frame", type, at: Date.now() });
    });

    socket.addEventListener("close", (event) => {
      out.push({ kind: "close", code: event.code, at: Date.now() });
    });

    return socket;
  };
  globalThis.WebSocket.prototype = Native.prototype;
  Object.assign(globalThis.WebSocket, Native);
})();`;

function summarise(why) {
  const rows = [];

  try {
    for (const line of readFileSync(LOG, "utf8").split("\n")) {
      if (line.trim() === "") continue;
      rows.push(JSON.parse(line));
    }
  } catch {
    // A run that logged nothing still summarises, saying so.
  }

  const frames = rows.filter((row) => row.kind === "frame");
  const closes = rows.filter((row) => row.kind === "close");
  const opens = rows.filter((row) => row.kind === "open");

  // The longest silence between inbound frames — the quantity the 165 s
  // watchdog actually measures.
  let longestGapMs = 0;
  let longestGapAt = null;

  for (let i = 1; i < frames.length; i += 1) {
    const gap = frames[i].at - frames[i - 1].at;
    if (gap > longestGapMs) {
      longestGapMs = gap;
      longestGapAt = new Date(frames[i - 1].at).toISOString();
    }
  }

  // Socket downtime: each close to the next open.
  const downtimes = [];
  for (const close of closes) {
    const next = opens.find((open) => open.at > close.at);
    if (next) downtimes.push({ code: close.code, ms: next.at - close.at });
  }

  const summary = {
    why,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    site: SITE,
    frames: frames.length,
    opens: opens.length,
    closes: closes.length,
    longestInterFrameGapMs: longestGapMs,
    longestInterFrameGapAfter: longestGapAt,
    socketDowntimes: downtimes,
    watchdogMs: 165_000,
    note:
      "The gap is what DISCONNECTED_AFTER_MS measures; the downtime is what a " +
      "reader would call the outage. They are different numbers and Story " +
      "4.7's decision is about the first one.",
    log: LOG,
  };

  writeFileSync(
    resolve(OUT, `summary-${stamp}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(`\n${JSON.stringify(summary, null, 2)}\n`);
}

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch();
const context = await browser.newContext();
await context.addInitScript(PAGE_INSTRUMENT);
const page = await context.newPage();
await page.goto(`${SITE}/securities`, { waitUntil: "domcontentloaded" });

process.stdout.write(
  `\nBrowser gap across a deploy — ${SITE}\n` +
    `  started ${startedAt.toISOString()}, running ${String(RUN_FOR_MS / 60_000)} minutes\n` +
    `  log ${LOG}\n\n`,
);

const deadline = Date.now() + RUN_FOR_MS;
let lastFrameAt = Date.now();
let lastWord = "(unread)";

while (Date.now() < deadline) {
  await page.waitForTimeout(DRAIN_EVERY_MS);

  let rows;
  try {
    rows = await page.evaluate(() => {
      const out = globalThis.__gap ?? [];
      globalThis.__gap = [];
      return out;
    });
  } catch {
    record({ kind: "drain-failed" });
    continue;
  }

  for (const row of rows) {
    record(row);
    if (row.kind === "frame") lastFrameAt = row.at;
    if (row.kind === "close") {
      process.stdout.write(
        `  ${new Date().toISOString()} socket closed ${String(row.code)}\n`,
      );
    }
  }

  // **The word beside the gap**, because the gap is only interesting through
  // what a reader sees. If a browser goes 165 s without a frame on a healthy
  // connection, the watchdog flips it to `DISCONNECTED` while it is connected
  // — and that is a defect rather than a threshold question.
  const word = await page
    .locator("footer")
    .first()
    .innerText()
    .then(
      (text) =>
        /\b(LIVE|STALE|DISCONNECTED|NOT CONFIGURED)\b/u.exec(text)?.[1] ??
        "(none)",
    )
    .catch(() => "(unreadable)");

  if (word !== lastWord) {
    record({ kind: "word", word, previous: lastWord });
    process.stdout.write(
      `  ${new Date().toISOString()} word ${lastWord} -> ${word}\n`,
    );
    lastWord = word;
  }

  const silent = Math.round((Date.now() - lastFrameAt) / 1000);
  if (silent >= 60 && silent % 30 < 5) {
    process.stdout.write(
      `  ${new Date().toISOString()} ${String(silent)} s without a frame\n`,
    );
  }
}

summarise("deadline");
await browser.close();
