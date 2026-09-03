import { BACKEND_DEGRADED_CAUSES, BACKEND_STATUSES } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { BackendIndicator } from "./BackendIndicator.js";

// Three states, two degraded causes and one not-yet-checked placeholder, which
// is five renderings rather than three — and the fifth is the one worth having
// on screen: an indicator that has never once been answered says so, rather
// than showing an empty space where a time should be.
//
// The grid is also the argument for the whole component. Nothing in it is red,
// the only colour is the amber on `degraded`, and `healthy` and `unreachable`
// are the same grey told apart by the shape of the marker alone — which is what
// survives the greyscale check this palette's red and green fail at 1.05:1.
//
// The workshop never makes a request, and that is the point of building this
// before it is wired to anything: every state here is a prop, so all five are
// reviewable side by side without a backend to break.

// A fixed time rather than `new Date()`, so the story renders the same thing on
// every reload and a visual diff of the workshop is not a clock.
const LAST_SUCCESS = new Date(2026, 8, 4, 10, 42, 17);

const meta = {
  title: "Status/BackendIndicator",
  component: BackendIndicator,
  parameters: { layout: "padded" },
  args: {
    status: "healthy",
    degradedCause: null,
    lastSuccessAt: LAST_SUCCESS,
    hasChecked: true,
  },
} satisfies Meta<typeof BackendIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Healthy: Story = { args: { status: "healthy" } };

export const DegradedNotOkStatus: Story = {
  args: { status: "degraded", degradedCause: "not-ok-status" },
};

export const DegradedUnreadableBody: Story = {
  args: { status: "degraded", degradedCause: "unreadable-body" },
};

export const Unreachable: Story = { args: { status: "unreachable" } };

// The state a misconfigured `VITE_API_BASE_URL` produces: unreachable, and
// never once answered, so there is no time to show and the component says so
// instead of leaving a gap.
export const NeverSucceeded: Story = {
  args: { status: "unreachable", lastSuccessAt: null },
};

// Not a state. Before the first poll settles the hook's `status` reads
// `unreachable`, which is true and uninteresting, and rendering it would flash
// "unreachable" on every page load.
export const NotYetChecked: Story = {
  args: { hasChecked: false, lastSuccessAt: null },
};

export const AllPermutations: Story = {
  render: () => (
    <div className={gridStyles.grid}>
      <span className={gridStyles.label}>not yet checked</span>
      <BackendIndicator
        status="unreachable"
        degradedCause={null}
        lastSuccessAt={null}
        hasChecked={false}
      />

      {BACKEND_STATUSES.map((status) =>
        status === "degraded" ? (
          BACKEND_DEGRADED_CAUSES.map((cause) => (
            <Fragment key={cause}>
              <span className={gridStyles.label}>
                {status} — {cause}
              </span>
              <BackendIndicator
                status={status}
                degradedCause={cause}
                lastSuccessAt={LAST_SUCCESS}
                hasChecked
              />
            </Fragment>
          ))
        ) : (
          <Fragment key={status}>
            <span className={gridStyles.label}>{status}</span>
            <BackendIndicator
              status={status}
              degradedCause={null}
              lastSuccessAt={LAST_SUCCESS}
              hasChecked
            />
          </Fragment>
        ),
      )}

      <span className={gridStyles.label}>unreachable — never succeeded</span>
      <BackendIndicator
        status="unreachable"
        degradedCause={null}
        lastSuccessAt={null}
        hasChecked
      />
    </div>
  ),
};
