import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import gridStyles from "../stories.module.css";
import { TextField, type TextFieldProps } from "./TextField.js";

function noop() {
  return undefined;
}

/**
 * One specimen in the grid: everything about a field except the two things
 * every specimen shares. `icon` is genuinely absent from the last entry rather
 * than passed as `undefined` — `exactOptionalPropertyTypes` is on, and the
 * difference between "no icon" and "an icon whose value is undefined" is one
 * the type system here insists on.
 */
type Specimen = Omit<TextFieldProps, "label" | "onValueChange">;

// The workshop is where this component is actually reviewed, and for this one
// that is not a formality: `VISUAL-LANGUAGE.md` deferred input fields for three
// stories on the ground that "a control designed against no consumer is a
// control designed against a guess", so the first thing anybody should be able
// to do with the answer is see every state of it at once.
//
// The state set is the canvas's `TEXT FIELD — STATES` section, twelve panels,
// mapped onto this component. Ten of the twelve are here as stories; `03 ·
// FOCUS` is the token layer's and cannot be forced from a story, and `12 ·
// LIVE` is `Interactive` below under a different name.
//
// **Every story here is static except `Interactive`.** A field is a controlled
// input, so a story that let you type would need state, and state in eight
// stories is eight places for the permutation grid to stop being a comparison.
// The grid below is the review surface; `Interactive` is the one that proves
// the thing works.
//
// The two states this consumer added are the ones to look at hardest, because
// both have a failure mode the grid is the only way to see: **neither may shift
// the layout under a cursor.** Compare `Empty` and `Filled` in the grid — the
// caret position must not move when the `Esc` chip and the clear button
// appear — and compare `Busy` against `Filled`, where nothing at all may move.
//
// `Locked`, the seventh state of the 2026-08-31 specification, is **not here
// and that is the decision** rather than an omission. See the component header.

const meta = {
  title: "Controls/TextField",
  component: TextField,
  parameters: { layout: "padded" },
  args: {
    label: "Find a security",
    value: "",
    placeholder: "Symbol or name",
    icon: "magnifier",
    onValueChange: noop,
  },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The permutations, as data rather than as ten hand-written blocks — which is
 * what lets the grid below differ only in what this list says it differs in.
 */
const PERMUTATIONS: readonly {
  readonly name: string;
  readonly props: Specimen;
}[] = [
  { name: "Empty", props: { icon: "magnifier", value: "" } },
  {
    name: "Filled",
    props: { icon: "magnifier", value: "NVDA", onClear: noop },
  },
  {
    name: "Filled, no clear affordance",
    props: { icon: "magnifier", value: "NVDA" },
  },
  {
    name: "Error",
    props: {
      icon: "magnifier",
      value: "NVDA NVDA NVDA NVDA",
      error: "A symbol is at most five characters.",
    },
  },
  {
    name: "Warning",
    props: {
      icon: "magnifier",
      value: "HALTD",
      warning: "Symbol is valid but halted — data may be stale.",
    },
  },
  {
    name: "Valid",
    props: { icon: "magnifier", value: "NVDA", valid: true },
  },
  {
    name: "Read-only",
    props: { value: "2026-09-04 16:00:00 EDT", readOnly: true },
  },
  {
    name: "With affix",
    props: { value: "225.76", prefix: "$", suffix: "USD" },
  },
  {
    name: "Disabled",
    props: { icon: "magnifier", value: "NVDA", disabled: true },
  },
  {
    name: "Disabled, empty",
    props: { icon: "magnifier", value: "", disabled: true },
  },
  {
    name: "Searching",
    props: {
      icon: "magnifier",
      value: "NV",
      busy: true,
      hint: "Searching 518 securities",
    },
  },
  {
    name: "Results open",
    props: {
      icon: "magnifier",
      value: "NV",
      surfaceOpen: true,
      onClear: noop,
      hint: "14 matches across 518 securities",
    },
  },
  {
    name: "Small",
    props: { icon: "magnifier", value: "NVDA", size: "small" },
  },
  // The idiom with no search in it, which is the specimen that says out loud
  // that this is a field rather than a search box: Story 2.13's window control
  // is the next consumer and it is not looking anything up.
  { name: "No icon", props: { value: "09:30" } },
];

export const Empty: Story = {};

export const Filled: Story = {
  args: { value: "NVDA", onClear: noop },
};

/**
 * Hover is a pseudo-class and a story cannot force one, so this is the resting
 * field with a note rather than a drawn state — the honest version of a state
 * the workshop cannot produce. Put the pointer on it.
 */
export const Hover: Story = { args: { value: "NVDA" } };

/**
 * Focus is the same, and doubly so: it is deliberately **not this component's
 * style**. One global `:focus-visible` rule owns it. Tab into the field.
 */
export const Focus: Story = { args: { value: "NVDA" } };

export const ErrorState: Story = {
  // Named `Error` on the shelf and `ErrorState` in the module: the state is one
  // of the specification's six and must read as such in the workshop, and a
  // module-scope binding called `Error` shadows the global one.
  name: "Error",
  args: {
    value: "NVDA NVDA NVDA NVDA NVDA NVDA",
    error: "A symbol is at most five characters.",
  },
};

/**
 * Valid, with a caveat — the canvas's `06 · WARNING`. Nothing is wrong with
 * what was typed, so the field is **not** `aria-invalid`; the dashed border is
 * what tells it apart from the error above, and it survives greyscale.
 */
export const Warning: Story = {
  args: {
    value: "HALTD",
    warning: "Symbol is valid but halted — data may be stale.",
  },
};

/** Checked and good — the canvas's `08 · VALID`. The tick is achromatic on purpose. */
export const Valid: Story = {
  args: { value: "NVDA", valid: true },
};

/**
 * A value you may read and select but not edit — the canvas's `09 · READ-ONLY`.
 * **Not the `Locked` state Task 2.11.3 dropped**: that one was a permission and
 * its trigger is authentication, which the product still excludes. This is a
 * display state with no permission in it.
 */
export const ReadOnly: Story = {
  args: {
    label: "Session close",
    value: "2026-09-04 16:00:00 EDT",
    readOnly: true,
  },
  // Built rather than spread, because this story wants **no** icon and the
  // shelf default has one. `exactOptionalPropertyTypes` is on, so "absent" and
  // "present as `undefined`" are different types and `icon: undefined` is a
  // `TS2375` — the same trap the permutation list below avoids by simply not
  // listing `icon` on the entries that do not want one.
  render: () => (
    <TextField
      label="Session close"
      value="2026-09-04 16:00:00 EDT"
      onValueChange={noop}
      readOnly
    />
  ),
};

/** Fixed units inside the box — the canvas's `11 · WITH AFFIX`. They never scroll with the value. */
export const WithAffix: Story = {
  args: { label: "Last close", value: "225.76", prefix: "$", suffix: "USD" },
  // No icon here either — see `ReadOnly` above for why it is built rather than
  // spread.
  render: () => (
    <TextField
      label="Last close"
      value="225.76"
      onValueChange={noop}
      prefix="$"
      suffix="USD"
      hint="Previous session"
    />
  ),
};

export const Disabled: Story = {
  args: { value: "NVDA", disabled: true },
};

/** A request or a computation is in flight. Nothing may move but the sweep. */
export const Busy: Story = {
  args: { value: "NV", busy: true, hint: "Searching 518 securities" },
};

/** Something is open directly beneath, and the field is its head. */
export const SurfaceOpen: Story = {
  args: {
    value: "NV",
    surfaceOpen: true,
    onClear: noop,
    hint: "14 matches across 518 securities",
  },
};

/** The dense height, 28px, for a field inside a toolbar rather than above one. */
export const Small: Story = {
  args: { value: "NVDA", size: "small", onClear: noop },
};

/**
 * The one story with state, and the only place the control's behaviour — rather
 * than its appearance — can be reviewed: type, then clear it with the `x` or
 * with Escape, which is the key the chip claims.
 */
export const Interactive: Story = {
  parameters: { controls: { disable: true } },
  render: function Interactive(args) {
    const [value, setValue] = useState("");

    return (
      <TextField
        {...args}
        value={value}
        onValueChange={setValue}
        onClear={() => {
          setValue("");
        }}
        hint={
          value === ""
            ? "Type a symbol, then press Esc to clear it"
            : `${String(value.length)} characters`
        }
      />
    );
  },
};

// The grid the rule exists for. Full-width specimens, so `.stack` rather than
// the two-column `.grid` every smaller component uses — a field squeezed into a
// `max-content` column would hide the one thing worth comparing, which is
// whether the input's left edge sits in the same place in every one of them.
export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  // It does not read `args`, deliberately: a grid whose specimens can be
  // changed one control at a time is not a comparison any more.
  render: () => (
    <div className={gridStyles.stack}>
      {PERMUTATIONS.map(({ name, props }) => (
        <div className={gridStyles.stackItem} key={name}>
          <p className={gridStyles.label}>{name}</p>
          <TextField
            label="Find a security"
            placeholder="Symbol or name"
            onValueChange={noop}
            {...props}
          />
        </div>
      ))}
    </div>
  ),
};
