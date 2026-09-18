import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const CORPUS = join(dirname(fileURLToPath(import.meta.url)), "alpaca-stream");

interface Frame {
  readonly file: string;
  readonly provenance: "raw" | "transcribed" | "reconstructed";
  readonly from: string;
  readonly what: string;
  readonly inferred?: readonly string[];
}

const manifest = JSON.parse(
  readFileSync(join(CORPUS, "MANIFEST.json"), "utf8"),
) as {
  frames: readonly Frame[];
  provenanceTiers: Record<string, string>;
  knownWeakness: { owner: string; trigger: string };
};

const onDisk = readdirSync(CORPUS)
  .filter((f) => f.endsWith(".json") && f !== "MANIFEST.json")
  .sort();

const read = (file: string): string => readFileSync(join(CORPUS, file), "utf8");

describe("the socket frame corpus", () => {
  // The manifest is the only thing carrying each frame's chain of custody. A
  // frame added without one is a frame a reader will assume came off a wire.
  it("lists exactly the files on disk, in both directions", () => {
    expect(manifest.frames.map((f) => f.file).sort()).toEqual(onDisk);
  });

  it("gives every frame a provenance tier the manifest itself defines", () => {
    for (const frame of manifest.frames) {
      expect(Object.keys(manifest.provenanceTiers)).toContain(frame.provenance);
      expect(frame.from).not.toHaveLength(0);
      expect(frame.what).not.toHaveLength(0);
    }
  });

  it("claims NOTHING is raw, because nothing is", () => {
    // `src/fixtures/alpaca/` holds raw HTTP bodies. This corpus holds none:
    // Story 3.1's captures were deleted with the harness, so the best tier
    // available here is `transcribed`. Asserting it stops a later frame being
    // quietly promoted.
    expect(manifest.frames.filter((f) => f.provenance === "raw")).toHaveLength(
      0,
    );
  });

  it("makes every reconstructed frame declare what was inferred", () => {
    // The tier is a claim about trust, and `reconstructed` without a list of
    // what was guessed is the claim without the substance.
    for (const frame of manifest.frames) {
      if (frame.provenance !== "reconstructed") continue;
      expect(frame.inferred ?? [], frame.file).not.toHaveLength(0);
    }
  });

  it("names an owner and a condition-shaped trigger for the known weakness", () => {
    expect(manifest.knownWeakness.owner).toMatch(/3\.2\.5/);
    expect(manifest.knownWeakness.trigger).not.toHaveLength(0);
  });
});

describe("the frames themselves", () => {
  it.each(onDisk)("%s parses and is a non-empty array", (file) => {
    const parsed: unknown = JSON.parse(read(file));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed as unknown[]).not.toHaveLength(0);
  });

  it.each(onDisk)(
    "%s is stored as ONE line, as it came off the wire",
    (file) => {
      // The transcription is only auditable against `LIVE-DATA.md` while the file
      // still matches it character for character. `.prettierignore` and
      // `.gitattributes` both carry an entry for this directory; this is the
      // assertion that notices if either stops covering it.
      expect(read(file).trimEnd().split("\n")).toHaveLength(1);
    },
  );

  it("pairs a bar and its revision on the same (symbol, minute)", () => {
    // Task 3.2.4 cannot test replacement without this pairing, and a corpus
    // that makes the case untestable has failed.
    const bar = (
      JSON.parse(read("bar-nvda.json")) as { S: string; t: string }[]
    )[0];
    const revisions = [
      "bar-nvda-revision-volume-only.json",
      "bar-nvda-revision-close-changed.json",
    ];

    for (const file of revisions) {
      const revision = (
        JSON.parse(read(file)) as { T: string; S: string; t: string }[]
      )[0];
      expect(revision?.T, file).toBe("u");
      expect(revision?.S, file).toBe(bar?.S);
      expect(revision?.t, file).toBe(bar?.t);
    }
  });

  it("has a revision that moves the close and one that does not", () => {
    // §14.1 measured 35.3% of revisions changing the close and NONE changing
    // nothing at all, so both shapes have to be reachable in a test.
    const close = (file: string): number =>
      (JSON.parse(read(file)) as { c: number }[])[0]?.c ?? Number.NaN;

    expect(close("bar-nvda-revision-volume-only.json")).toBe(
      close("bar-nvda.json"),
    );
    expect(close("bar-nvda-revision-close-changed.json")).not.toBe(
      close("bar-nvda.json"),
    );
  });

  it("carries every error code the spike observed", () => {
    const codes = onDisk
      .filter((f) => f.startsWith("error-"))
      .map((f) => (JSON.parse(read(f)) as { code: number }[])[0]?.code)
      .sort((a, b) => (a ?? 0) - (b ?? 0));

    // 400 invalid syntax, 402 auth failed, 405 symbol limit, 406 connection
    // limit, 409 insufficient subscription. Every one is a FRAME on a socket
    // that stays open (§4.2, §8.4).
    expect(codes).toEqual([400, 402, 405, 406, 409]);
  });

  it("has an acknowledgement with no `bars` key at all", () => {
    // §4.1's unsubscribe-everything reply. A parser reading `bars`
    // unconditionally breaks here, and this is the only frame that catches it.
    const ack = (
      JSON.parse(read("subscription-ack-empty.json")) as object[]
    )[0];
    expect(ack).toEqual({ T: "subscription" });
  });
});
