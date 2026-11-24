import type { Confidence } from "@marketpulse/shared";
import { CLAIM_CEILING, CONFIDENCE_LEVELS } from "@marketpulse/shared";
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
      claim: undefined,
      confidence: undefined,
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
      claim: undefined,
      confidence: undefined,
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
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
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
      claim: undefined,
      confidence: undefined,
    },
  ],
  terminal: false,
  connectionLost: true,
};

/**
 * **The whole pipeline, mid-run — Task 7.2.7's own subject.** Six rows, which
 * is what a reader meets from the first frame after a press: `optimisticChecklist`
 * seeds `INVESTIGATION_STEP_COUNT` rows rather than one that grows into six, so
 * the checklist's HEIGHT is settled before any response arrives.
 *
 * The sentences below are the six tools' own `description`s copied for a
 * workshop illustration; each one's single home is the tool that declares it
 * (`tool-return-percentile.ts` and five beside it), and nothing reads this
 * story — a sentence that changes there and not here makes a story look dated,
 * never the product wrong.
 */
const wholePipeline: ChecklistState = {
  symbol: "NVDA",
  investigationId: "inv-1",
  steps: [
    {
      id: "step-1",
      description: "Measure move",
      status: "completed",
      startedAt: "2026-11-20T14:00:00.000Z",
      completedAt: "2026-11-20T14:00:00.001Z",
      durationMs: 1,
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
    },
    {
      id: "step-2",
      description: "Measure price anomaly",
      status: "completed",
      startedAt: "2026-11-20T14:00:00.001Z",
      completedAt: "2026-11-20T14:00:00.001Z",
      durationMs: 0,
      claim: "−4.20% over 5 min — 94th of 4,620",
      confidence: "SUPPORTED",
    },
    {
      id: "step-3",
      description: "Measure volume anomaly",
      status: "completed",
      startedAt: "2026-11-20T14:00:00.001Z",
      completedAt: "2026-11-20T14:00:00.001Z",
      durationMs: 0,
      claim: "Volume rate — no stored distribution to rank against",
      confidence: "UNKNOWN",
    },
    {
      id: "step-4",
      description: "Compare against sector benchmark",
      status: "completed",
      startedAt: "2026-11-20T14:00:00.001Z",
      completedAt: "2026-11-20T14:00:00.002Z",
      durationMs: 1,
      claim: "−3.10 pts against XLK over 5 min — 92nd of 3,180",
      confidence: "SUPPORTED",
    },
    {
      id: "step-5",
      description: "Calculate market breadth",
      status: "running",
      startedAt: "2026-11-20T14:00:00.002Z",
      completedAt: undefined,
      durationMs: undefined,
      claim: undefined,
      confidence: undefined,
    },
    {
      id: undefined,
      description: undefined,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      claim: undefined,
      confidence: undefined,
    },
  ],
  terminal: false,
  connectionLost: false,
};

/** The same six rows as a reader meets them in the FIRST frame after the
 * press — every one queued, every one holding room for a sentence that has
 * not arrived yet. */
const wholePipelineQueued: ChecklistState = {
  ...wholePipeline,
  investigationId: undefined,
  steps: wholePipeline.steps.map(() => ({
    id: undefined,
    description: undefined,
    status: "queued",
    startedAt: undefined,
    completedAt: undefined,
    durationMs: undefined,
    claim: undefined,
    confidence: undefined,
  })),
};

/**
 * **The probe target AC 6's ceiling was taken against — the worst case, not an
 * edge case.**
 *
 * Every row completed, every claim exactly `CLAIM_CEILING` characters, and all
 * four confidence levels drawn including the one with no producer in this epic.
 * The tail is `·` rather than words so that the line is at the ceiling **by
 * construction** and cannot drift if that constant moves: the longest claim the
 * six shipped `toFinding` functions can actually produce is 66 characters
 * (`Market correlation — the benchmark’s history crosses a price break`,
 * measured over the full cross-product of `FINDING_TYPES` and
 * `TOOL_REFUSAL_CLAIMS` at Task 7.3.2), and this story pads that to the bound
 * so the probe measures the worst line the mint will ever permit rather than
 * the worst one it happens to emit today.
 *
 * Refusal claims are the longest sentences this product draws and a zero-bar
 * store refuses every step, which is why the empty store is the measurement's
 * worst case — and why these six rows, rather than `WholePipeline`'s, are what
 * `pnpm probe` was pointed at.
 */
const atTheCeiling = (level: Confidence): string =>
  "Market correlation — the benchmark’s history crosses a price break".padEnd(
    CLAIM_CEILING,
    `·${level.slice(0, 1).toLowerCase()}`,
  );

const ceilingClaims: ChecklistState = {
  ...wholePipeline,
  steps: wholePipeline.steps.map((step, index) => {
    const level =
      CONFIDENCE_LEVELS[index % CONFIDENCE_LEVELS.length] ?? "UNKNOWN";
    return {
      ...step,
      id: `step-${String(index + 1)}`,
      description: step.description ?? "Calculate return correlation",
      status: "completed" as const,
      durationMs: 1,
      claim: atTheCeiling(level),
      confidence: level,
    };
  }),
  terminal: true,
};

export const ClaimsAtTheCeiling: Story = {
  args: {
    checklist: ceilingClaims,
    announcement: "",
    pastCoverThreshold: false,
  },
};

export const Queued: Story = {
  args: {
    checklist: queued,
    announcement: "",
    pastCoverThreshold: false,
  },
};
/** First paint, all six rows — Task 7.2.7's Done-when 1. */
export const SeededOnPress: Story = {
  args: {
    checklist: wholePipelineQueued,
    announcement: "",
    pastCoverThreshold: false,
  },
};
/** Four complete, one running, one still queued — `PRODUCT_SPEC.md` §14's
 * own example shape, which draws the whole checklist at once. */
export const WholePipeline: Story = {
  args: {
    checklist: wholePipeline,
    announcement: "Calculate market breadth running",
    pastCoverThreshold: true,
  },
};
// Running, UNDER the 160 ms cover threshold — a static ring, no breathing.
// This is the ordinary case for this story's own one-tool run.
export const Running: Story = {
  args: {
    checklist: running,
    announcement: "",
    pastCoverThreshold: false,
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
  },
};
export const Completed: Story = {
  args: {
    checklist: completed,
    announcement: "Measure move complete, 120 ms",
    pastCoverThreshold: false,
  },
};
export const Dropped: Story = {
  args: {
    checklist: dropped,
    announcement: CONNECTION_LOST_SENTENCE,
    pastCoverThreshold: false,
  },
};

// Nothing pressed yet — Done-when 2. This component renders nothing at all
// here; the `Investigate` button lives in `Region`'s own `meta` slot
// (`SecurityExplorer.tsx`) and is never hidden regardless of this state.
export const Invisible: Story = {
  args: {
    checklist: undefined,
    announcement: "",
    pastCoverThreshold: false,
  },
};

export const AllPermutations: Story = {
  args: {
    checklist: queued,
    announcement: "",
    pastCoverThreshold: false,
  },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.grid}>
      <span className={gridStyles.label}>queued</span>
      <InvestigationChecklist
        checklist={queued}
        announcement=""
        pastCoverThreshold={false}
      />
      <span className={gridStyles.label}>running, under 160ms</span>
      <InvestigationChecklist
        checklist={running}
        announcement=""
        pastCoverThreshold={false}
      />
      <span className={gridStyles.label}>running, breathing</span>
      <InvestigationChecklist
        checklist={running}
        announcement=""
        pastCoverThreshold
      />
      <span className={gridStyles.label}>completed</span>
      <InvestigationChecklist
        checklist={completed}
        announcement=""
        pastCoverThreshold={false}
      />
      <span className={gridStyles.label}>connection lost</span>
      <InvestigationChecklist
        checklist={dropped}
        announcement=""
        pastCoverThreshold={false}
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
  },
  render: () => (
    <div style={{ filter: "grayscale(1)" }} className={gridStyles.grid}>
      <span className={gridStyles.label}>queued</span>
      <InvestigationChecklist
        checklist={queued}
        announcement=""
        pastCoverThreshold={false}
      />
      <span className={gridStyles.label}>running, breathing</span>
      <InvestigationChecklist
        checklist={running}
        announcement=""
        pastCoverThreshold
      />
      <span className={gridStyles.label}>completed</span>
      <InvestigationChecklist
        checklist={completed}
        announcement=""
        pastCoverThreshold={false}
      />
    </div>
  ),
};
