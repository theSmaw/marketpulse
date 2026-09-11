import type {
  EquitySecurity,
  IndexEtfSecurity,
  Security,
  SecurityCoverage,
  SecurityLastClose,
} from "@marketpulse/shared";
import { toMarketDate, toTicker } from "@marketpulse/shared";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  FIXTURE_SUBJECTS,
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
// The two numbers rather than two literals: a test that spells 400 and 1500
// itself is a second copy of the decision, and would go green against a
// constant somebody changed.
import {
  SEARCH_ANNOUNCEMENT_DELAY_MS,
  SEARCH_ANNOUNCEMENT_MIN_GAP_MS,
} from "../../market/index.js";
import type { SecuritiesView } from "../../use-securities.js";
import { toSecuritiesView } from "../../use-securities.js";
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

/**
 * A loaded universe, built **through the real transition** rather than as a
 * literal.
 *
 * The body is invented and small on purpose — these are behaviour tests and a
 * reader has to be able to hold the corpus in their head — but the *state* is
 * the one `useSecurities` produces, because a hand-written `loaded` is a shape
 * the application may not be able to reach. The state tests further down use
 * the recorded 518 instead, where the point is the state rather than the
 * behaviour.
 */
function loadedUniverse(
  securities: readonly Security[] = UNIVERSE,
  lastCloses: readonly SecurityLastClose[] = [...CLOSES.values()],
  coverage: readonly SecurityCoverage[] = securities.map(barsFor),
): SecuritiesView {
  return toSecuritiesView(LOADING_UNIVERSE, {
    outcome: "ok",
    status: 200,
    requestId: null,
    data: { securities, coverage, lastCloses },
  });
}

/** A coverage record, so the ordinary row is one that holds bars. */
function barsFor(security: Security): SecurityCoverage {
  return {
    symbol: security.symbol,
    timeframe: "1m",
    start: "2025-09-08T13:30:00.000Z",
    end: "2026-09-04T20:00:00.000Z",
    barCount: 92_195,
  };
}

function renderSearch(
  view: SecuritiesView,
  onOpen: (symbol: string) => void = vi.fn(),
) {
  render(<SecuritySearch view={view} onOpen={onOpen} />);
  return { field: screen.getByRole<HTMLInputElement>("combobox"), onOpen };
}

function setUp(onOpen: (symbol: string) => void = vi.fn()) {
  return renderSearch(loadedUniverse(), onOpen);
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
    renderSearch(loadedUniverse(UNIVERSE, []));

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
    renderSearch(loadedUniverse(many, []));

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

describe("the pointer", () => {
  // The row commits on `mousedown`, not `click`, because the input's blur
  // closes the surface and blur lands **first** in a browser.
  //
  // These tests pin the wiring — that pressing a row reports the right symbol —
  // and they are **not** what proves the ordering. jsdom neither focuses nor
  // blurs, so the failure mode does not exist at this level. The browser suite
  // owns that half (`securities-route.spec.ts`, "clicking a result opens that
  // security"), which is where swapping this for a `click` handler goes red.
  it("opens the row that was pressed", () => {
    const onOpen = vi.fn();
    const { field } = setUp(onOpen);

    typeInto(field, "nv");
    fireEvent.mouseDown(firstRow());

    expect(onOpen).toHaveBeenCalledExactlyOnceWith("NVDA");
  });

  it("opens the row under the pointer rather than the first one", () => {
    const onOpen = vi.fn();
    const { field } = setUp(onOpen);

    typeInto(field, "nv");
    const [, second] = options();
    if (second === undefined) throw new Error("expected two rows");
    fireEvent.mouseDown(second);

    expect(onOpen).toHaveBeenCalledExactlyOnceWith("NVR");
  });

  it("makes the hovered row the one Enter would open", () => {
    const onOpen = vi.fn();
    const { field } = setUp(onOpen);

    typeInto(field, "nv");
    const [, second] = options();
    if (second === undefined) throw new Error("expected two rows");
    fireEvent.mouseEnter(second);
    press(field, "Enter");

    expect(onOpen).toHaveBeenCalledExactlyOnceWith("NVR");
  });
});

describe("the session a close belongs to", () => {
  it("names the session once on the surface when every row shares one", () => {
    const { field } = setUp();

    typeInto(field, "nv");

    expect(screen.getByText(/Closes as of 2026-09-04/)).not.toBeNull();
    expect(firstRow().textContent).not.toContain("close 2026-09-04");
  });

  // The case the uniform one cannot be trusted to cover: a row behind the
  // surface's date has to say so, or the footer is lying about that row.
  it("gives a row its own date when it is behind the surface's", () => {
    renderSearch(
      loadedUniverse(UNIVERSE, [
        ...[...CLOSES.values()].filter((record) => record.symbol !== "NVDA"),
        close("NVDA", 228.45, 226.0, "2026-08-28"),
      ]),
    );

    typeInto(screen.getByRole<HTMLInputElement>("combobox"), "nv");

    // The surface can no longer name one session, so it names none...
    expect(screen.queryByText(/Closes as of/)).toBeNull();
    // ...and the rows carry their own.
    expect(firstRow().textContent).toContain("close 2026-08-28");
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
    renderSearch(loadedUniverse());

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
    renderSearch(loadedUniverse());

    typeInto(screen.getByRole<HTMLInputElement>("combobox"), "nv");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });

    // The list is already right; only the sentence is waiting.
    expect(options()).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("");
    vi.useRealTimers();
  });

  // **The floor, and the defect it answers** (Task 2.11.9).
  //
  // The debounce above works perfectly above its own threshold and inverts
  // below it: an inter-key gap longer than 400 ms makes *every* keystroke look
  // like the last one. Walked in Chromium, typing `nvidia` at two keys a
  // second made this region speak **seven times**, six of them while the
  // person was still typing — which is `SEARCH-AND-SELECTION.md` §4's own
  // reversal trigger, fired by the pass it nominated.
  //
  // So a second number caps how often the region may speak at all, and this
  // asserts the two properties that make it a repair rather than a longer
  // wait: a keystroke inside the floor does **not** produce a second sentence,
  // and what lands when the floor lifts is the state **now** rather than the
  // one that was pending when it closed.
  it("will not speak twice inside the floor, and says the current state when it does", async () => {
    vi.useFakeTimers();
    const { field } = renderSearch(loadedUniverse());

    typeInto(field, "nv");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_ANNOUNCEMENT_DELAY_MS);
    });
    expect(screen.getByRole("status").textContent).toBe(
      'Security search: 2 matches for "nv". NVDA first.',
    );

    // A second query, settled by the debounce's own reckoning, and refused by
    // the floor.
    typeInto(field, "nvi");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_ANNOUNCEMENT_DELAY_MS);
    });
    expect(screen.getByRole("status").textContent).toBe(
      'Security search: 2 matches for "nv". NVDA first.',
    );

    // A third, typed while still inside the floor. When the floor lifts it is
    // *this* one that is spoken — the sentence the person is waiting on, not
    // the one they had already moved past.
    typeInto(field, "nvid");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_ANNOUNCEMENT_MIN_GAP_MS);
    });
    expect(screen.getByRole("status").textContent).toBe(
      'Security search: 1 match for "nvid". NVDA.',
    );

    vi.useRealTimers();
  });
});

// Everything below is Task 2.11.6: the states that are not a query and a
// result. Each is produced from a **named cause** — a recorded body, a derived
// one, a transport outcome — through the same transition the hook uses, rather
// than by handing this component a state somebody typed.

describe("a query that matches nothing", () => {
  it("says so in a sentence rather than reporting zero", () => {
    const { field } = setUp();

    typeInto(field, "zzz");

    expect(options()).toHaveLength(0);
    // The words matter more than the absence: the surface used to render an
    // empty listbox with `0 matches` under it, which reads as a failure.
    expect(screen.getByText(/No security matches “zzz”/)).not.toBeNull();
    expect(screen.queryByText("0 matches")).toBeNull();
  });

  it("says how large the corpus it searched was", () => {
    const { field } = setUp();

    typeInto(field, "zzz");

    expect(
      screen.getByText(
        `Search covers the ${String(UNIVERSE.length)} securities MarketPulse holds, by symbol and by company name.`,
      ),
    ).not.toBeNull();
  });
});

describe("while the universe is still loading", () => {
  it("keeps the control usable and holds what was typed", () => {
    const { field } = renderSearch(LOADING_UNIVERSE);

    typeInto(field, "nv");

    expect(field.getAttribute("aria-disabled")).toBeNull();
    expect(field.readOnly).toBe(false);
    expect(field.value).toBe("nv");
  });

  // The defect this exists to forbid: an empty corpus matches nothing, so the
  // no-matches sentence is *reachable* here and would be a claim about the
  // market made from data nobody has seen.
  it("never reports no matches against a universe it has not got", () => {
    const { field } = renderSearch(LOADING_UNIVERSE);

    typeInto(field, "nv");

    expect(screen.queryByText(/No security matches/)).toBeNull();
    expect(screen.getByText("Still loading securities.")).not.toBeNull();
    expect(
      screen.getByText(/“nv” is kept and will match as soon as/),
    ).not.toBeNull();
  });

  it("says the same thing out loud, with its subject and the query", async () => {
    vi.useFakeTimers();
    const { field } = renderSearch(LOADING_UNIVERSE);

    typeInto(field, "nv");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("status").textContent).toBe(
      'Security search: still loading securities. "nv" is kept.',
    );
    vi.useRealTimers();
  });
});

describe("when the universe could not be read", () => {
  it("marks the field unavailable and says why, when waiting may help", () => {
    const { field } = renderSearch(securitiesFixtureView("nothingAnswered"));

    expect(field.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText(/the tracked universe did not answer/),
    ).not.toBeNull();
    // Retryable, so the sentence says waiting may work — and points at the one
    // control on the screen that asks again rather than growing a second one.
    expect(
      screen.getByText(/A service starting up looks exactly like this/),
    ).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says waiting will not help when it will not", () => {
    const { field } = renderSearch(securitiesFixtureView("notThisService"));

    expect(field.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText(/asking again would produce the same answer/),
    ).not.toBeNull();
  });

  // The recorded 503: the one failure this client's contract calls retryable.
  it("separates a service that answered badly from one that did not answer", () => {
    renderSearch(securitiesFixtureView("unavailable"));

    expect(
      screen.getByText(/the tracked universe is temporarily unavailable/),
    ).not.toBeNull();
    expect(screen.queryByText(/did not answer/)).toBeNull();
  });

  // §36, in the small: search failing is not search disappearing.
  it("is still on the page, labelled, in every one of them", () => {
    renderSearch(securitiesFixtureView("nothingAnswered"));

    expect(screen.getByLabelText("Find a security")).not.toBeNull();
  });

  // **The reason has to be reachable, not merely attached** (Task 2.11.9).
  //
  // This state hangs its explanation off the control with `aria-describedby`,
  // and a description is read *when the control is reached*. The field used to
  // be natively `disabled`, which is not focusable — measured in Chromium, the
  // tab order in this state ran straight from the last navigation link to the
  // first region, so the sentence was computed correctly, attached correctly,
  // on screen, and structurally unreachable by the one person it was written
  // for.
  //
  // jsdom cannot press Tab, so what is asserted here is the property that
  // decides it: the input is not natively disabled, and the ids its
  // description points at resolve to the sentence. The keyboard half is
  // `e2e/specs/search-keyboard.spec.ts`.
  it("leaves the reason reachable, by leaving the control in the tab order", () => {
    const { field } = renderSearch(securitiesFixtureView("nothingAnswered"));

    expect(field.disabled).toBe(false);

    const described = (field.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

    expect(described).toMatch(/the tracked universe did not answer/);
  });

  it("offers no fallback that this cause has taken away", () => {
    renderSearch(securitiesFixtureView("nothingAnswered"));

    // One fetch feeds both surfaces, so the state where search cannot answer
    // is the state where the table has no rows to click. A sentence pointing
    // at it would be pointing at an empty table.
    expect(screen.queryByText(/table/i)).toBeNull();
  });
});

describe("when the service holds no securities", () => {
  it("says the service answered and holds nothing, which is not a failure", () => {
    const { field } = renderSearch(securitiesFixtureView("empty"));

    expect(field.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText(/answered correctly and holds no securities/),
    ).not.toBeNull();
  });
});

describe("an untracked security, against the real universe", () => {
  it("is found by its own symbol and marked", () => {
    const { field } = renderSearch(securitiesFixtureView("untracked"));

    typeInto(field, FIXTURE_SUBJECTS.untracked.toLowerCase());

    expect(options()).toHaveLength(1);
    expect(firstRow().textContent).toContain("Untracked");
  });

  // The state this task exists for, and the one that looks like nothing.
  //
  // `status` is the first tie-break, so an untracked security ranks below a
  // tracked one inside its tier: over a query with more matches than the cap it
  // is pushed off the shown slice while the total still counts it. On screen
  // that is indistinguishable from the row having been filtered out, which is
  // the one thing `UNIVERSE.md` §12.2 forbids.
  it("is counted in the total when the cap pushes it off the list", () => {
    const { field } = renderSearch(securitiesFixtureView("untracked"));

    typeInto(field, "a");

    // Ten shown out of ninety-nine matched — measured against the recorded
    // universe, where untracking AAPL moves it from match 2 to match 50.
    expect(options()).toHaveLength(10);
    expect(screen.getByText("showing 10 of 99")).not.toBeNull();

    const shown = options().map((option) => option.textContent);
    expect(shown.some((text) => text.includes("Apple Inc."))).toBe(false);
    // It is off the slice and not out of the answer: the same universe, asked
    // more precisely, still has it.
    expect(screen.queryByText("Untracked")).toBeNull();
  });

  it("is still there when the query is precise enough to reach it", () => {
    const { field } = renderSearch(securitiesFixtureView("untracked"));

    typeInto(field, "aapl");

    expect(firstRow().textContent).toContain("Apple Inc.");
    expect(firstRow().textContent).toContain("Untracked");
  });
});

describe("a partially backfilled universe", () => {
  // All three of these are true facts that look like defects, and none is
  // reachable from the store as it stands: every one of the 518 securities has
  // bars, a close, and the same session.
  it("says a security holds no bars before somebody opens it", () => {
    const { field } = renderSearch(securitiesFixtureView("gaps"));

    typeInto(field, "ad");

    const row = options().find((option) =>
      option.textContent.includes(FIXTURE_SUBJECTS.withoutBars),
    );
    expect(row?.textContent).toContain("no bars stored");
  });

  it("states a missing close rather than leaving the column blank", () => {
    const { field } = renderSearch(securitiesFixtureView("gaps"));

    typeInto(field, "ad");

    const row = options().find((option) =>
      option.textContent.includes(FIXTURE_SUBJECTS.withoutClose),
    );
    expect(row?.textContent).toContain("No close");
  });

  it("gives a row its own date when it is behind the rest, and says nothing on the surface", () => {
    const { field } = renderSearch(securitiesFixtureView("gaps"));

    typeInto(field, "ad");

    // The closes no longer agree, so the surface names no session at all...
    expect(screen.queryByText(/Closes as of/)).toBeNull();
    // ...and the row that disagrees carries its own.
    const row = options().find((option) =>
      option.textContent.includes(FIXTURE_SUBJECTS.behindSession),
    );
    expect(row?.textContent).toContain("close 2026-08-28");
  });

  it("leaves the ordinary rows alone", () => {
    const { field } = renderSearch(securitiesFixtureView("gaps"));

    typeInto(field, "ad");

    const row = options().find((option) => option.textContent.includes("ADP"));
    expect(row?.textContent).not.toContain("no bars stored");
    expect(row?.textContent).not.toContain("No close");
  });
});

describe("the ARIA the states have to keep honest", () => {
  // A combobox claiming to be expanded over a listbox that is not in the
  // document is a lie a screen reader reads out and axe catches. The two
  // sentence states have a surface and no listbox, so they are not expanded.
  it("is not expanded when its surface is a sentence", () => {
    const { field } = setUp();

    typeInto(field, "zzz");

    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("is expanded when there is a listbox to point at", () => {
    const { field } = setUp();

    typeInto(field, "nv");

    expect(field.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).not.toBeNull();
  });

  it("opens no surface at all when the universe cannot be searched", () => {
    const { field } = renderSearch(securitiesFixtureView("empty"));

    fireEvent.focus(field);

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });
});
