import type { Meta, StoryObj } from "@storybook/react-vite";
import { Component } from "react";

import gridStyles from "../stories.module.css";
import { ErrorBoundary } from "./ErrorBoundary.js";

// A boundary has two renderings — its children, or the fallback where they
// should have been — and the interesting one is the transition between them.
// So `CaughtThenRecovered` is the story that earns its place: click **Try
// again** and the region comes back working, in the workshop, without the page
// reloading.
//
// The child that throws is a **class** component, and that is not incidental.
// A boundary catches errors thrown during render, in lifecycle methods and in
// constructors; a constructor is the one of the three that can consult
// something outside itself without being an impure render, which is what lets
// this throw once and then succeed. The React Compiler's purity rules have
// never fired on shipped code here and this is not the place to start.
//
// `armed` is an object created once per story mount and cleared by the first
// construction. The boundary's reset remounts the subtree — it keys the
// children on a counter — so the second construction sees a disarmed cell and
// renders normally. That is the whole recovery mechanism, demonstrated rather
// than described.

class ThrowsWhileArmed extends Component<{
  readonly armed: { current: boolean };
}> {
  constructor(props: { readonly armed: { current: boolean } }) {
    super(props);

    if (props.armed.current) {
      props.armed.current = false;
      throw new Error("Story: the region's contents failed to render");
    }
  }

  override render() {
    return <p>Recovered — this is the region&rsquo;s real content.</p>;
  }
}

const meta = {
  title: "Feedback/ErrorBoundary",
  component: ErrorBoundary,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nothing thrown: the boundary is invisible and renders exactly its children.
// Worth a story of its own, because "adds no wrapper element you can see" is a
// property rather than an absence — it renders a keyed `Fragment`.
export const Healthy: Story = {
  args: {
    title: "Market topology could not be displayed",
    detail: "The rest of this screen is unaffected.",
    children: <p>The region&rsquo;s content, rendering normally.</p>,
  },
};

// Throws on every mount, so **Try again** re-throws and the fallback stays.
// That is the correct behaviour for a failure that has not gone away, and it is
// worth seeing beside the story below so that "recovery" is not mistaken for
// "the button always fixes it".
export const CaughtAndStaysBroken: Story = {
  args: {
    title: "Market topology could not be displayed",
    detail: "The rest of this screen is unaffected.",
    children: <ThrowsWhileArmed armed={{ current: true }} />,
  },
  // The literal props are repeated rather than read from `args`, and that is
  // `exactOptionalPropertyTypes` again: `args.detail` is `string | undefined`,
  // which is not an optional `string`, so forwarding it is TS2769 on the
  // element. The same distinction that makes `ErrorBoundary.render` branch.
  render: () => (
    // A fresh cell per render, re-armed every time, so this one never recovers.
    <ErrorBoundary
      title="Market topology could not be displayed"
      detail="The rest of this screen is unaffected."
    >
      <ThrowsWhileArmed armed={{ current: true }} />
    </ErrorBoundary>
  ),
};

// The one to click. Throws once, recovers on reset — and the page does not
// reload, which is the distinction the criterion is about.
export const CaughtThenRecovered: Story = {
  args: {
    title: "Market topology could not be displayed",
    detail: "The rest of this screen is unaffected.",
    children: null,
  },
  render: () => {
    const armed = { current: true };

    return (
      <ErrorBoundary
        title="Market topology could not be displayed"
        detail="The rest of this screen is unaffected."
      >
        <ThrowsWhileArmed armed={armed} />
      </ErrorBoundary>
    );
  },
};

// Both renderings side by side. There is no cartesian product to lay out here —
// the boundary's own props are the fallback's, whose grid is in
// `ErrorFallback.stories.tsx` — so what this grid is for is the pair: the same
// boundary, the same props, one child that throws and one that does not.
export const AllPermutations: Story = {
  args: {
    title: "Market topology could not be displayed",
    children: null,
  },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>child renders</span>
        <ErrorBoundary
          title="Market topology could not be displayed"
          detail="The rest of this screen is unaffected."
        >
          <p>The region&rsquo;s content, rendering normally.</p>
        </ErrorBoundary>
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>child throws</span>
        <ErrorBoundary
          title="Market topology could not be displayed"
          detail="The rest of this screen is unaffected."
        >
          <ThrowsWhileArmed armed={{ current: true }} />
        </ErrorBoundary>
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>child throws, compact</span>
        <ErrorBoundary
          title="The header could not be displayed"
          detail="Navigation is unavailable; the page below is unaffected."
          compact
        >
          <ThrowsWhileArmed armed={{ current: true }} />
        </ErrorBoundary>
      </div>
    </div>
  ),
};
