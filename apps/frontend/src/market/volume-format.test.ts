import { describe, expect, it } from "vitest";

import {
  formatVolume,
  formatVolumeExact,
  spokenVolume,
} from "./volume-format.js";

describe("a volume on an axis or in a summary", () => {
  it("abbreviates thousands, millions and billions", () => {
    expect(formatVolume(742)).toBe("742");
    expect(formatVolume(9_814)).toBe("9.81K");
    expect(formatVolume(4_061_234)).toBe("4.06M");
    expect(formatVolume(1_040_000_000)).toBe("1.04B");
  });

  it("holds three significant digits, which is what keeps the column aligned", () => {
    // §5b: `M` and `B` are letters and letters are not tabular, so the alignment
    // rule is a constant digit count and a right-aligned trailing edge. These
    // four are the widths that have to stay within a character of each other.
    const widths = new Set(
      [9_810_000, 104_000_000, 1_040_000_000, 12_300_000_000].map(
        (volume) => formatVolume(volume).length,
      ),
    );

    expect([...widths].sort()).toEqual([4, 5]);
    expect(formatVolume(9_810_000)).toBe("9.81M");
    expect(formatVolume(104_000_000)).toBe("104M");
    expect(formatVolume(1_040_000_000)).toBe("1.04B");
    expect(formatVolume(12_300_000_000)).toBe("12.3B");
  });

  it("promotes the suffix when the rounding crosses a magnitude", () => {
    // The defect this catches is a thousandfold error produced by rounding alone:
    // 999,500 rounds to 1.00 million, so a suffix chosen from the raw value would
    // label it `1.00K`. Nothing about that renders badly.
    expect(formatVolume(999_499)).toBe("999K");
    expect(formatVolume(999_500)).toBe("1.00M");
    expect(formatVolume(999_499_000)).toBe("999M");
    expect(formatVolume(999_500_000)).toBe("1.00B");
  });

  it("writes no decimal point below a thousand, because a volume is a count", () => {
    expect(formatVolume(0)).toBe("0");
    expect(formatVolume(1)).toBe("1");
    expect(formatVolume(999)).toBe("999");
    expect(formatVolume(1_000)).toBe("1.00K");
  });

  it("says nothing rather than NaN for a figure that is not one", () => {
    expect(formatVolume(Number.NaN)).toBe("—");
    expect(formatVolume(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("a volume read aloud", () => {
  it("uses words rather than letters, because 4.06M is not English", () => {
    expect(spokenVolume(9_814)).toBe("9.81 thousand");
    expect(spokenVolume(4_061_234)).toBe("4.06 million");
    expect(spokenVolume(1_040_000_000)).toBe("1.04 billion");
  });

  it("names shares only where no magnitude word carries the subject", () => {
    expect(spokenVolume(742)).toBe("742 shares");
    expect(spokenVolume(1)).toBe("1 share");
    expect(spokenVolume(0)).toBe("0 shares");
  });

  it("quotes the same figure the written form does, to the same precision", () => {
    // The two forms are decided in one module so they cannot drift; this is the
    // property that makes that worth doing. A sighted reader and a listener must
    // not be able to quote different numbers off one bar.
    for (const volume of [742, 9_814, 999_500, 4_061_234, 1_040_000_000]) {
      const written = formatVolume(volume).replace(/[KMB]$/, "");
      expect(spokenVolume(volume).startsWith(written)).toBe(true);
    }
  });

  it("says unknown rather than NaN", () => {
    expect(spokenVolume(Number.NaN)).toBe("unknown");
  });
});

describe("the exact figure the readout states", () => {
  it("groups every third digit, and rounds nothing", () => {
    // §5a: the readout is the place the picture's roundings are undone, so this is
    // the one volume string in the product that is not an approximation.
    expect(formatVolumeExact(4_061_234)).toBe("4,061,234");
    expect(formatVolumeExact(742)).toBe("742");
    expect(formatVolumeExact(1_234)).toBe("1,234");
    expect(formatVolumeExact(1_000_000)).toBe("1,000,000");
    expect(formatVolumeExact(12_345_678_901)).toBe("12,345,678,901");
  });

  it("keeps the digits the abbreviation threw away", () => {
    expect(formatVolume(4_061_234)).toBe("4.06M");
    expect(formatVolumeExact(4_061_234)).toBe("4,061,234");
  });

  it("uses a real minus sign, for the reason price-format.ts does", () => {
    // A volume is a count and cannot be negative, so this is a corrupt body
    // rather than a market condition — and a hyphen-minus is a different width
    // from the digits around it, which undoes tabular alignment.
    expect(formatVolumeExact(-1_234)).toBe("−1,234");
  });

  it("says nothing rather than NaN", () => {
    expect(formatVolumeExact(Number.NaN)).toBe("—");
  });
});
