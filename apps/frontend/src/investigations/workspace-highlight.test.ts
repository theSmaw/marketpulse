import { describe, expect, it } from "vitest";

import {
  applyWorkspaceHighlight,
  highlightOutlivesChannelEnd,
  type WorkspaceHighlightCommand,
} from "./workspace-highlight.js";
import {
  INVESTIGATION_EVENT_TYPES,
  TERMINAL_EVENT_TYPES,
} from "@marketpulse/shared";

const command = (
  investigationId: string,
  subject: string,
): WorkspaceHighlightCommand => ({
  investigationId,
  subject,
  symbols: [`${subject}-PEER`],
  relations: ["sector_membership"],
});

describe("applyWorkspaceHighlight", () => {
  it("replaces an earlier investigation's command WHOLESALE — no state holds two peer sets", () => {
    // Story 7.4's AC 8: a second investigation's command *wholly* replaces the
    // first. The reason it is a replacement rather than a merge is that
    // nothing on screen could say which peers were whose — the note names one
    // subject and counts one set.
    const first = command("inv-1", "NVDA");
    const second = command("inv-2", "CVX");

    const held = applyWorkspaceHighlight(first, {
      kind: "commanded",
      command: second,
    });

    expect(held).toBe(second);
    expect(held?.symbols).toStrictEqual(["CVX-PEER"]);
    // The union that must never exist, asserted as an absence rather than
    // assumed: the earlier subject is gone, not beside the later one.
    expect(held?.symbols).not.toContain("NVDA-PEER");
  });

  it("withdraws ONLY the command the withdrawing run placed", () => {
    // The reachable case this id exists for, from `workspace-highlight.ts`'
    // own header: a run on NVDA places a command; the reader navigates away
    // (the command survives, deliberately); a second run's stream dies before
    // placing anything. That second run's withdrawal must leave NVDA's
    // highlight exactly where it is.
    const held = command("inv-1", "NVDA");

    expect(
      applyWorkspaceHighlight(held, {
        kind: "withdrawn",
        investigationId: "inv-2",
      }),
    ).toBe(held);

    expect(
      applyWorkspaceHighlight(held, {
        kind: "withdrawn",
        investigationId: "inv-1",
      }),
    ).toBeUndefined();
  });

  it("a withdrawal against an empty holder is a no-op rather than an error", () => {
    // The ordinary case on every machine: a run whose stream drops before it
    // ever produced a command still reports the end of its own channel.
    expect(
      applyWorkspaceHighlight(undefined, {
        kind: "withdrawn",
        investigationId: "inv-1",
      }),
    ).toBeUndefined();
  });
});

describe("highlightOutlivesChannelEnd", () => {
  // **Iterated over the exported list rather than spelling any event name** —
  // this task's own requirement, and what makes Story 7.5's cancellation a
  // member of this guarantee with no change here or in the module.
  it.each(TERMINAL_EVENT_TYPES)(
    "keeps the highlight when the stream's last word was %s",
    (type) => {
      expect(highlightOutlivesChannelEnd(type)).toBe(true);
    },
  );

  it("withdraws it for every NON-terminal last word, and for a stream that carried none", () => {
    const nonTerminal = INVESTIGATION_EVENT_TYPES.filter(
      (type) => !(TERMINAL_EVENT_TYPES as readonly string[]).includes(type),
    );
    // A guard against this assertion going vacuous if `TERMINAL_EVENT_TYPES`
    // ever grows to cover the vocabulary: an empty `.every` is `true`.
    expect(nonTerminal.length).toBeGreaterThan(0);

    for (const type of nonTerminal) {
      expect(highlightOutlivesChannelEnd(type)).toBe(false);
    }

    // The stream that opened and closed with nothing in it — a dead channel
    // with no word at all, which is the hardest case for a positional rule to
    // get right and the easiest for this one.
    expect(highlightOutlivesChannelEnd(undefined)).toBe(false);
  });

  it("every terminal type is a member of the vocabulary it is drawn from", () => {
    // Not a tautology: `TERMINAL_EVENT_TYPES` is its own `as const` array in
    // the shared model, so a type named there and misspelled — or removed from
    // `INVESTIGATION_EVENT_TYPES` — would leave this function answering
    // `true` for a word no event can ever carry, and nothing else in this
    // repository compares the two lists.
    for (const type of TERMINAL_EVENT_TYPES) {
      expect(INVESTIGATION_EVENT_TYPES).toContain(type);
    }
  });
});
