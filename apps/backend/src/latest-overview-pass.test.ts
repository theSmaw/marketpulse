import { describe, expect, it } from "vitest";

import { createLatestOverviewPass } from "./latest-overview-pass.js";

import type { OverviewPass } from "./market-overview.js";

// The holder (Task 7.2.5). No server, no socket, no database — and no join:
// a pass here is a stand-in, because what this module is about is RETENTION
// and nothing in it reads a frame's contents.

const passOf = (computedAt: string): OverviewPass => ({
  frame: { computedAt, feeds: [], figures: [] },
  figureOf: () => undefined,
});

describe("the latest overview pass", () => {
  it("reads `undefined` before the producer has computed one", () => {
    // **The arm every gated machine and every cold deploy is in**, and the
    // reason `get_market_breadth` has a refusal at all. It is deliberately
    // not an empty pass: a fabricated zero-figure aggregate is
    // indistinguishable from a real one computed over a quiet market, and the
    // two are different claims (`TOOL_REFUSALS`' own `no-aggregate-yet` /
    // `nothing-observed` pair).
    expect(createLatestOverviewPass().read()).toBeUndefined();
  });

  it("hands back the pass it was given, so the producer writes by returning", () => {
    // **The single-writer mechanism, as a behaviour rather than as a grep.**
    // `recordPass` returning its argument is what lets the producer's own
    // `return` statement BE the write — so there is no way to compute a pass
    // this process then does not hold, and no second statement for a later
    // author to forget.
    const holder = createLatestOverviewPass();
    const pass = passOf("2026-11-19T14:02:00.000Z");

    expect(holder.recordPass(pass)).toBe(pass);
    expect(holder.read()).toBe(pass);
  });

  it("holds the NEWEST pass, not the first", () => {
    // A holder written once is a different defect wearing the same clothes:
    // every reader after 09:30 would get the open's figures for the rest of
    // the day. `latest ??= pass` is the one-character version of it.
    const holder = createLatestOverviewPass();
    const first = passOf("2026-11-19T14:02:00.000Z");
    const second = passOf("2026-11-19T15:30:00.000Z");

    holder.recordPass(first);
    holder.recordPass(second);

    expect(holder.read()).toBe(second);
  });

  it("records a pass nobody was broadcast, which is the widening over `lastBroadcastPass`", () => {
    // **The difference from the `let` this replaced, stated as a test.** The
    // gateway's own memo was written on the broadcast path alone, so a
    // process with no browser attached held nothing — and since Task 4.8.11
    // such a process genuinely does not run the join at all. The holder is
    // written by the PRODUCER, so what it means is *the latest answer this
    // process computed*, with no claim about who was listening.
    //
    // There is nothing in this file that could make it otherwise, which is
    // the point: the holder has no notion of a client, so the widening is
    // structural rather than a behaviour somebody has to maintain.
    const holder = createLatestOverviewPass();
    const pass = passOf("2026-11-19T14:02:00.000Z");

    holder.recordPass(pass);

    expect(holder.read()).toBe(pass);
  });
});
