// What a test can see about a field, which is less than what matters about one
// and is worth stating rather than discovering.
//
// **Not colour, and not because it is discouraged.** No stylesheet is applied
// in this environment at all, so `getTokens()` throws here and every class
// name is a hashed string with no rule behind it. The error state's hue, the
// hairline border, the corner radius and the reserved trailing slot are
// structurally invisible to this file — a browser is the only level that can
// see any of them, and the workshop is where they are reviewed.
//
// So what is left is the part that is semantics rather than paint: that the
// label names the input, that the two "unavailable" flavours announce
// themselves correctly, that a description reaches the control, and that a
// value typed is a value reported.

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TextField } from "./TextField.js";

function noop() {
  return undefined;
}

/**
 * The accessible description of an element, resolved the way a screen reader
 * resolves it: follow `aria-describedby`, in the order it lists, and read what
 * is there.
 *
 * Written out rather than reached for as a query option, and the reason is a
 * trap worth recording. Testing Library's `description` option exists on
 * `getByRole` and **not** on `getByLabelText`, which silently ignores unknown
 * options — so the first version of the three assertions below passed while
 * checking nothing at all, and `tsc` was the only thing in `pnpm verify` that
 * said so. A green test is not evidence the assertion ran.
 */
function describedTextOf(element: HTMLElement): string | undefined {
  const ids = element.getAttribute("aria-describedby");

  if (ids === null) {
    return undefined;
  }

  return ids
    .split(" ")
    .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "")
    .join(" ");
}

describe("TextField", () => {
  // The defect this guards is the one the component's API is shaped to make
  // impossible: a placeholder standing in for a label. `getByLabelText` passes
  // on a real `<label for>` and fails on a placeholder in every configuration
  // this repository uses, which is why it is the assertion rather than a check
  // on the `for` attribute.
  it("names the input with its visible label", () => {
    render(<TextField label="Find a security" value="" onValueChange={noop} />);

    const input = screen.getByLabelText("Find a security");

    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("text");
  });

  it("gives two fields with the same label two distinct associations", () => {
    render(
      <>
        <TextField label="Symbol" value="" onValueChange={noop} />
        <TextField label="Symbol" value="" onValueChange={noop} />
      </>,
    );

    // From `useId`, which is why the ids are generated rather than derived
    // from the label — two identical ids is a broken association that renders
    // perfectly.
    const ids = screen.getAllByLabelText("Symbol").map((input) => input.id);

    expect(new Set(ids).size).toBe(2);
  });

  it("reports every keystroke as the whole value", () => {
    const onValueChange = vi.fn();

    render(
      <TextField label="Symbol" value="NV" onValueChange={onValueChange} />,
    );

    fireEvent.change(screen.getByLabelText("Symbol"), {
      target: { value: "NVD" },
    });

    expect(onValueChange).toHaveBeenCalledWith("NVD");
  });

  it("is described by its hint", () => {
    render(
      <TextField
        label="Symbol"
        value=""
        onValueChange={noop}
        hint="14 matches across 518 securities"
      />,
    );

    expect(describedTextOf(screen.getByLabelText("Symbol"))).toBe(
      "14 matches across 518 securities",
    );
  });

  // The error state's two halves. `aria-invalid` is what a screen reader
  // announces; the description is what it then reads out. A field that had one
  // without the other would be either a silent failure or an unexplained one.
  it("marks an errored field invalid and describes it with the message", () => {
    render(
      <TextField
        label="Symbol"
        value="NVDAAA"
        onValueChange={noop}
        error="A symbol is at most five characters."
      />,
    );

    const input = screen.getByLabelText("Symbol");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(describedTextOf(input)).toBe("A symbol is at most five characters.");
  });

  it("reads the error before the hint when a field has both", () => {
    render(
      <TextField
        label="Symbol"
        value="NVDAAA"
        onValueChange={noop}
        hint="Symbol or name"
        error="A symbol is at most five characters."
      />,
    );

    expect(describedTextOf(screen.getByLabelText("Symbol"))).toBe(
      "A symbol is at most five characters. Symbol or name",
    );
  });

  it("sets no description at all when there is neither", () => {
    render(<TextField label="Symbol" value="" onValueChange={noop} />);

    // `aria-describedby=""` points at an element with no id. The absence is
    // the correct state, not an empty string.
    expect(
      screen.getByLabelText("Symbol").hasAttribute("aria-describedby"),
    ).toBe(false);
  });

  // Only the attributes, and the omission is deliberate rather than lazy: the
  // obvious second half — fire a change and assert nothing was reported —
  // **passes for the wrong reason and then fails.** `fireEvent.change`
  // dispatches on the node directly rather than simulating a person, so jsdom
  // delivers the event to a read-only input that no browser would, and the
  // assertion measures the test library rather than the control. The real
  // guarantee is the user agent's, and the attributes are the whole of what
  // this component owes it.
  //
  // **The assertion inverted at Task 2.11.9 and that is the point of it.** It
  // used to read `input.disabled === true`; an unavailable field now renders
  // `aria-disabled` and `readOnly` instead, so that it stays in the tab order
  // and the sentence saying why it cannot answer — attached with
  // `aria-describedby`, which is read *when a control is reached* — can be
  // reached at all. `TextFieldProps.disabled` carries the walk that found it.
  it("marks the input unavailable without removing it from the tab order", () => {
    render(
      <TextField label="Symbol" value="NVDA" onValueChange={noop} disabled />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("Symbol");

    expect(input.getAttribute("aria-disabled")).toBe("true");
    // What actually stops the value changing. An `aria-disabled` input is an
    // ordinary editable one as far as the user agent is concerned.
    expect(input.readOnly).toBe(true);
    // The whole reason for the pair: a natively disabled input is not
    // focusable, and an unreachable control cannot have its reason read.
    expect(input.disabled).toBe(false);
  });

  // Escape empties a clearable field, and must not empty one nobody is
  // editing. The native attribute used to make this true for free by refusing
  // the keystroke; `readOnly` does not, so the guard is the component's.
  it("ignores Escape in an unavailable field", () => {
    const onClear = vi.fn();
    render(
      <TextField
        label="Symbol"
        value="NVDA"
        onValueChange={noop}
        onClear={onClear}
        disabled
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Symbol"), { key: "Escape" });

    expect(onClear).not.toHaveBeenCalled();
  });

  // --- The four states added 2026-09-11 from the canvas's TEXT FIELD — STATES ---

  // The distinction that matters and is easy to get wrong: a warning is not an
  // error. The value is fine, so `aria-invalid` must stay absent — a field
  // announced as invalid when nothing is wrong is worse than a silent one.
  it("describes a warning without marking the field invalid", () => {
    render(
      <TextField
        label="Symbol"
        value="HALTD"
        onValueChange={noop}
        warning="Symbol is valid but halted."
      />,
    );

    const input = screen.getByLabelText("Symbol");

    expect(describedTextOf(input)).toBe("Symbol is valid but halted.");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("lets an error outrank a warning, and shows only one message", () => {
    render(
      <TextField
        label="Symbol"
        value="X"
        onValueChange={noop}
        warning="Symbol is valid but halted."
        error="Unknown symbol."
        valid
      />,
    );

    const input = screen.getByLabelText("Symbol");

    expect(describedTextOf(input)).toBe("Unknown symbol.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText("Symbol is valid but halted.")).toBeNull();
  });

  // `false` and absent are different answers. Absent means "never checked";
  // `false` means "checked, and it passed".
  it("says a validated field passed, rather than saying nothing", () => {
    const { rerender } = render(
      <TextField label="Symbol" value="NVDA" onValueChange={noop} />,
    );

    expect(screen.getByLabelText("Symbol").hasAttribute("aria-invalid")).toBe(
      false,
    );

    rerender(
      <TextField label="Symbol" value="NVDA" onValueChange={noop} valid />,
    );

    expect(screen.getByLabelText("Symbol").getAttribute("aria-invalid")).toBe(
      "false",
    );
  });

  it("makes a read-only field readable and selectable, not disabled", () => {
    render(
      <TextField
        label="Session close"
        value="2026-09-04 16:00:00 EDT"
        onValueChange={noop}
        readOnly
      />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("Session close");

    expect(input.readOnly).toBe(true);
    // The difference from `disabled`, asserted rather than described: a
    // read-only field still takes focus, so its value can be selected and
    // copied. A disabled one cannot.
    expect(input.disabled).toBe(false);
  });

  it("offers no clear affordance on a read-only field", () => {
    render(
      <TextField
        label="Session close"
        value="2026-09-04 16:00:00 EDT"
        onValueChange={noop}
        onClear={noop}
        readOnly
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  // An affix is a unit. A unit that is visible and unspoken is a number read
  // without it, so both ends reach the accessible description.
  it("speaks its affixes as part of the field's description", () => {
    render(
      <TextField
        label="Last close"
        value="225.76"
        onValueChange={noop}
        prefix="$"
        suffix="USD"
        hint="Previous session"
      />,
    );

    expect(describedTextOf(screen.getByLabelText("Last close"))).toBe(
      "$ USD Previous session",
    );
  });

  it("announces a field in flight as busy", () => {
    render(<TextField label="Symbol" value="NV" onValueChange={noop} busy />);

    expect(screen.getByLabelText("Symbol").getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  // The clear affordance is three things that travel together, and each is
  // asserted because each has been shipped without the others somewhere.
  describe("the clear affordance", () => {
    it("appears only once there is something to clear", () => {
      const { rerender } = render(
        <TextField
          label="Find a security"
          value=""
          onValueChange={noop}
          onClear={noop}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Clear Find a security" }),
      ).toBeNull();

      rerender(
        <TextField
          label="Find a security"
          value="NV"
          onValueChange={noop}
          onClear={noop}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Clear Find a security" }),
      ).toBeDefined();
    });

    it("is absent entirely from a field that is not clearable", () => {
      render(<TextField label="Symbol" value="NVDA" onValueChange={noop} />);

      expect(screen.queryByRole("button")).toBeNull();
    });

    // The `Esc` chip is a claim about what the control does. This is the
    // assertion that keeps it from being decoration.
    it("clears on Escape, which is what the chip in the field promises", () => {
      const onClear = vi.fn();

      render(
        <TextField
          label="Symbol"
          value="NVDA"
          onValueChange={noop}
          onClear={onClear}
        />,
      );

      fireEvent.keyDown(screen.getByLabelText("Symbol"), { key: "Escape" });

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    // The combobox in Task 2.11.4 has its own answer to Escape — close the
    // surface, keep the query — and it has to be able to win. The consumer's
    // handler runs first and a `preventDefault()` in it is the veto.
    it("lets a consumer's own Escape handler pre-empt the clear", () => {
      const onClear = vi.fn();

      render(
        <TextField
          label="Symbol"
          value="NVDA"
          onValueChange={noop}
          onClear={onClear}
          onKeyDown={(event) => {
            event.preventDefault();
          }}
        />,
      );

      fireEvent.keyDown(screen.getByLabelText("Symbol"), { key: "Escape" });

      expect(onClear).not.toHaveBeenCalled();
    });
  });
});
