import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ChecklistState } from "../../investigations/index.js";
import { CONNECTION_LOST_SENTENCE } from "../../investigations/index.js";
import gridStyles from "../stories.module.css";
import { InvestigationChecklist } from "./InvestigationChecklist.js";

// The checklist's three glyph states and the dropped-stream sentence — Task
// 7.1.4. Every story below is a plain `ChecklistState`, built by hand rather
// than run through a stream: this component takes a view and draws it, and
// `use-investigation.test.ts`/`investigation-checklist-state.test.ts` are
// where the reducer that produces one is proven.

const meta = {
  title: "Investigations/InvestigationChecklist",
  component: InvestigationChecklist,
  parameters: { layout: "padded" },
} satisfies Meta<typeof InvestigationChecklist>;

export default meta;

type Story = StoryObj<typeof meta>;

const queued: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: undefined,
      description: undefined,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
    },
  ],
  terminal: false,
  connectionLost: false,
};

const running: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: "step-1",
      description: "Measure move",
      status: "running",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: undefined,
      durationMs: undefined,
    },
  ],
  terminal: false,
  connectionLost: false,
};

const completed: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: "step-1",
      description: "Measure move",
      status: "completed",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: "2026-11-16T14:00:00.120Z",
      durationMs: 120,
    },
  ],
  terminal: true,
  connectionLost: false,
};

const dropped: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: "step-1",
      description: "Measure move",
      status: "running",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: undefined,
      durationMs: undefined,
    },
  ],
  terminal: false,
  connectionLost: true,
};

const noop = (): void => {
  // Stories do not start a real investigation.
};

export const Queued: Story = {
  args: {
    checklist: queued,
    announcement: "",
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
};
// Running, UNDER the 160 ms cover threshold — a static ring, no breathing.
// This is the ordinary case for this story's own one-tool run.
export const Running: Story = {
  args: {
    checklist: running,
    announcement: "",
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
};
// Running, PAST the threshold — the same static ring, plus the breathing
// row-ground. `pastCoverThreshold` is the one thing that tells these two
// stories apart; neither reads `step.status` for it.
export const RunningBreathing: Story = {
  args: {
    checklist: running,
    announcement: "Measure move running",
    pastCoverThreshold: true,
    onInvestigate: noop,
  },
};
export const Completed: Story = {
  args: {
    checklist: completed,
    announcement: "Measure move complete, 120 ms",
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
};
export const Dropped: Story = {
  args: {
    checklist: dropped,
    announcement: CONNECTION_LOST_SENTENCE,
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
};

// The control itself, with nothing pressed yet — Done-when 2. The button
// is never hidden; only the checklist beneath it is.
export const Invisible: Story = {
  args: {
    checklist: undefined,
    announcement: "",
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
};

export const AllPermutations: Story = {
  args: {
    checklist: queued,
    announcement: "",
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.grid}>
      <span className={gridStyles.label}>queued</span>
      <InvestigationChecklist
        checklist={queued}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />
      <span className={gridStyles.label}>running, under 160ms</span>
      <InvestigationChecklist
        checklist={running}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />
      <span className={gridStyles.label}>running, breathing</span>
      <InvestigationChecklist
        checklist={running}
        announcement=""
        pastCoverThreshold
        onInvestigate={noop}
      />
      <span className={gridStyles.label}>completed</span>
      <InvestigationChecklist
        checklist={completed}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />
      <span className={gridStyles.label}>connection lost</span>
      <InvestigationChecklist
        checklist={dropped}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />
    </div>
  ),
};

/**
 * **`grayscale(1)` — Done-when 5.** The three glyphs are told apart by
 * silhouette alone (`Marker`'s `dashed`/`ring`, `Icon`'s `check`) and the
 * breathing ground moves between two achromatic surface tones — nothing
 * here spends the price palette or the anomaly ramp, so nothing here is lost
 * when hue is.
 */
export const InGreyscale: Story = {
  args: {
    checklist: queued,
    announcement: "",
    pastCoverThreshold: false,
    onInvestigate: noop,
  },
  render: () => (
    <div style={{ filter: "grayscale(1)" }} className={gridStyles.grid}>
      <span className={gridStyles.label}>queued</span>
      <InvestigationChecklist
        checklist={queued}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />
      <span className={gridStyles.label}>running, breathing</span>
      <InvestigationChecklist
        checklist={running}
        announcement=""
        pastCoverThreshold
        onInvestigate={noop}
      />
      <span className={gridStyles.label}>completed</span>
      <InvestigationChecklist
        checklist={completed}
        announcement=""
        pastCoverThreshold={false}
        onInvestigate={noop}
      />
    </div>
  ),
};
