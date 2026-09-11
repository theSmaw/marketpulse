import type {
  EquitySecurity,
  IndexEtfSecurity,
  Security,
  SecurityLastClose,
} from "@marketpulse/shared";
import { toMarketDate, toTicker } from "@marketpulse/shared";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SecuritySearch } from "./SecuritySearch.js";

// What this file asserts, and what it deliberately does not.
//
// It does **not** assert colour — no stylesheet is applied in this environment,
// so it is structurally impossible here and a browser is the only level that
// can see contrast. It does not assert a `useId()` value or a DOM snapshot
// containing one. And where the component splits a string across elements to
// emphasise the matched characters, it asserts **the concatenation a screen
// reader is handed** rather than the pieces — a row that reads "NVIDIA
// Corporation" to a person must read that way to a test, whatever markup gets
// it there.

const equity = (
  symbol: string,
  name: string,
  over: Partial<EquitySecurity> = {},
): EquitySecurity => ({
  symbol: toTicker(symbol),
  name,
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
  ...over,
});

const NVDA = equity("NVDA", "NVIDIA Corporation");
const NVR = equity("NVR", "NVR, Inc.", { sector: "consumer_discretionary" });
const HSY = equity("HSY", "The Hershey Company", {
  sector: "consumer_staples",
});
const DEAD = equity("BBBY", "Bed Bath & Beyond Inc.", { status: "untracked" });
const SPY: IndexEtfSecurity = {
  symbol: toTicker("SPY"),
  name: "SPDR S&P 500 ETF Trust",
  exchange: "ARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
};

const UNIVERSE: readonly Security[] = [NVDA, NVR, HSY, SPY, DEAD];

const close = (
  symbol: string,
  value: number,
  previous: number,
  session = "2026-09-04",
): SecurityLastClose => ({
  symbol,
  session: toMarketDate(session),
  close: value,
  previousClose: previous,
});

const CLOSES = new Map<string, SecurityLastClose>([
  ["NVDA", close("NVDA", 230.36, 228.45)],
  ["NVR", close("NVR", 6298.85, 6373.95)],
  ["HSY", close("HSY", 173.15, 175.06)],
  ["SPY", close("SPY", 770.19, 773.17)],
  ["BBBY", close("BBBY", 0.12, 0.13)],
]);

/**
 * Typing, one keystroke at a time.
 *
 * `fireEvent` rather than `user-event`, which this workspace does not install:
 * every interaction here is a change, a key or a pointer event, and adding a
 * library to spell them differently is the kind of dependency
 * `CLAUDE.md` asks to be resisted until complexity demonstrates the need.
 *
 * It fires one `change` **per character** rather than setting the value once,
 * because "the list updates on every keystroke" is a claim about the
 * intermediate states and a single change event would never visit them.
 */
function typeInto(field: HTMLElement, text: string) {
  field.focus();
  for (let end = 1; end <= text.length; end += 1) {
    fireEvent.change(field, { target: { value: text.slice(0, end) } });
  }
}

const press = (field: HTMLElement, key: string) =>
  fireEvent.keyDown(field, { key });

function setUp(onOpen: (symbol: string) => void = vi.fn()) {
  render(
    <SecuritySearch universe={UNIVERSE} lastCloses={CLOSES} onOpen={onOpen} />,
  );
  return { field: screen.getByRole<HTMLInputElement>("combobox"), onOpen };
}

const options = () => screen.queryAllByRole("option");

/**
 * The first result row, as an element rather than a maybe-element.
 *
 * `noUncheckedIndexedAccess` makes every index access optional, and both ways
 * of waving that away are lint errors here — a `!` assertion and an
 * `as HTMLElement` cast. Failing loudly is the honest third option, and it
 * gives a better message than a cast would have when the list is empty.
 */
function firstRow(): HTMLElement {
  const [row] = options();
  if (row === undefined) throw new Error("expected at least one result row");
  return row;
}

describe("finding a security", () => {
  it("matches by symbol", () => {
    const { field } = setUp();

    typeInto(field, "nvd");

    expect(options()).toHaveLength(1);
    expect(options()[0]?.textContent).toContain("NVIDIA Corporation");
  });

  it("matches by name", () => {
    const { field } = setUp();

    typeInto(field, "hershey");

    expect(options()).toHaveLength(1);
    expect(options()[0]?.textContent).toContain("HSY");
  });

  it("is case tolerant in both directions", () => {
    const { field } = setUp();

    typeInto(field, "NVIDIA");
    expect(options()).toHaveLength(1);

    fireEvent.change(field, { target: { value: "" } });
    typeInto(field, "nvidia");
    expect(options()).toHaveLength(1);
  });

  it("shows nothing at all until something is typed", () => {
    setUp();

    expect(options()).toHaveLength(0);
    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("updates the visible list on every keystroke rather than on a delay", () => {
    const { field } = setUp();

    // No timers advanced, no waitFor: the list is synchronous by contract, and
    // a test that waited for it would pass against a debounce. Each assertion
    // sits between two keystrokes, which is the only place a debounce shows.
    field.focus();

    fireEvent.change(field, { target: { value: "n" } });
    expect(options()).toHaveLength(2);

    fireEvent.change(field, { target: { value: "nvd" } });
    expect(options()).toHaveLength(1);
  });
});

describe("the row's five facts", () => {
  it("carries symbol, name, sector, type and a close with its change", () => {
    const { field } = setUp();

    typeInto(field, "nvda");
    const row = firstRow();

    expect(row.textContent).toContain("NVDA");
    expect(row.textContent).toContain("NVIDIA Corporation");
    expect(row.textContent).toContain("Technology");
    expect(row.textContent).toContain("Equity");
    expect(row.textContent).toContain("230.36");
    expect(row.textContent).toContain("+0.84%");
  });

  it("maps both ETF kinds onto one word a person recognises", () => {
    const { field } = setUp();

    typeInto(field, "spy");

    expect(options()[0]?.textContent).toContain("ETF");
    expect(options()[0]?.textContent).not.toContain("INDEX ETF");
  });

  it("gives the change a direction that is not carried by colour alone", () => {
    const { field } = setUp();

    typeInto(field, "nvr");

    // `PriceChange` hides the glyph from assistive technology and exposes a
    // word; the word is the part a greyscale reader still gets.
    expect(options()[0]?.textContent).toMatch(/down/);
  });

  it("shows an untracked security rather than filtering it out, and marks it", () => {
    const { field } = setUp();

    typeInto(field, "bbby");

    expect(options()).toHaveLength(1);
    expect(options()[0]?.textContent).toContain("Untracked");
  });

  it("states a missing close instead of rendering an empty cell", () => {
    render(
      <SecuritySearch
        universe={UNIVERSE}
        lastCloses={new Map()}
        onOpen={vi.fn()}
      />,
    );

    typeInto(screen.getByRole<HTMLInputElement>("combobox"), "nvda");

    expect(options()[0]?.textContent).toContain("No close");
  });
});

describe("the surface's footer", () => {
  it("names the session once, and reports the true total", () => {
    const { field } = setUp();

    typeInto(field, "nv");

    expect(screen.getByText(/Closes as of 2026-09-04/)).not.toBeNull();
    expect(screen.getByText("2 matches")).not.toBeNull();
  });

  it("says the list is a slice when the cap bites", () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      equity(
        `CAP${String.fromCharCode(65 + index)}`,
        `Capital ${String(index)}`,
      ),
    );
    render(
      <SecuritySearch
        universe={many}
        lastCloses={new Map()}
        onOpen={vi.fn()}
      />,
    );

    typeInto(screen.getByRole<HTMLInputElement>("combobox"), "cap");

    expect(screen.getByText("showing 10 of 14")).not.toBeNull();
  });
});

describe("the emphasis", () => {
  // The measured defect, asserted through the DOM rather than the matcher: a
  // row that emphasised at `indexOf` would bold the "he" of "The".
  it("emphasises at the matcher's word boundary, not the first occurrence", () => {
    const { field } = setUp();

    typeInto(field, "he");
    const row = firstRow();

    expect(within(row).getByText("He")).not.toBeNull();
    // The whole name still reads correctly however it was split up.
    expect(row.textContent).toContain("The Hershey Company");
  });

  it("emphasises in the symbol when the symbol is what matched", () => {
    const { field } = setUp();

    typeInto(field, "nvd");
    const row = firstRow();

    expect(within(row).getByText("NVD")).not.toBeNull();
    expect(row.textContent).toContain("NVIDIA Corporation");
  });
});

describe("the keyboard", () => {
  it("opens the only match on Enter", () => {
    const onOpen = vi.fn();
    const { field } = setUp(onOpen);

    typeInto(field, "nvid");
    press(field, "Enter");

    expect(onOpen).toHaveBeenCalledExactlyOnceWith("NVDA");
  });

  it("does nothing on Enter when nothing matched", () => {
    const onOpen = vi.fn();
    const { field } = setUp(onOpen);

    typeInto(field, "zzzz");
    press(field, "Enter");

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("moves the active option with the arrows and opens that one", () => {
    const onOpen = vi.fn();
    const { field } = setUp(onOpen);

    typeInto(field, "nv");
    press(field, "ArrowDown");
    press(field, "Enter");

    expect(onOpen).toHaveBeenCalledExactlyOnceWith("NVR");
  });

  it("points at the active option instead of moving focus into the list", () => {
    const { field } = setUp();

    typeInto(field, "nv");

    expect(document.activeElement).toBe(field);
    const active = field.getAttribute("aria-activedescendant");
    expect(active).not.toBeNull();
    expect(
      document.getElementById(active ?? "")?.getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("closes the list on Escape and keeps the query", () => {
    const { field } = setUp();

    typeInto(field, "nv");
    press(field, "Escape");

    expect(options()).toHaveLength(0);
    expect(field.value).toBe("nv");
  });

  it("clears the field on a second Escape", () => {
    const { field } = setUp();

    typeInto(field, "nv");
    press(field, "Escape");
    press(field, "Escape");

    expect(field.value).toBe("");
  });
});

describe("what it says out loud", () => {
  it("says nothing on arrival, because nothing has happened", () => {
    setUp();

    expect(screen.getByRole("status").textContent).toBe("");
  });

  // The region belongs to a subject and its sentences name it — the rule that
  // survives being queued behind the two regions already on this page.
  it("names its subject in the sentence it speaks", async () => {
    vi.useFakeTimers();
    render(
      <SecuritySearch
        universe={UNIVERSE}
        lastCloses={CLOSES}
        onOpen={vi.fn()}
      />,
    );

    typeInto(screen.getByRole<HTMLInputElement>("combobox"), "nv");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("status").textContent).toBe(
      'Security search: 2 matches for "nv". NVDA first.',
    );
    vi.useRealTimers();
  });

  it("stays silent until the typing stops", async () => {
    vi.useFakeTimers();
    render(
      <SecuritySearch
        universe={UNIVERSE}
        lastCloses={CLOSES}
        onOpen={vi.fn()}
      />,
    );

    typeInto(screen.getByRole<HTMLInputElement>("combobox"), "nv");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });

    // The list is already right; only the sentence is waiting.
    expect(options()).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("");
    vi.useRealTimers();
  });
});
