import type { Bar } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { cx } from "../../cx.js";
import { securitiesFixtureView } from "../../fixtures/securities.js";
import { SecurityIdentity } from "./SecurityIdentity.js";
import styles from "./motion-treatments.module.css";

// **The instrument Task 3.4.4 takes its decision with, and it is not a
// deliverable.**
//
// Open decision 1 says *static mock-ups cannot settle a motion decision*, and
// Task 3.4.2 added the half that is easy to miss: neither can a number that
// does not move. Task 3.4.3 made one move. So this puts four candidates on the
// **real component**, side by side, changing on their own, and lets them be
// looked at.
//
// ## Why this exists beside a design canvas that already runs them
//
// `The motion vocabulary.dc.html` is the source of truth for the **argument**
// (ADR 0026) and it runs the same four. What it cannot do is run them against
// `tokens.css`: every colour on a canvas page is a hex somebody typed. This is
// the only place a candidate meets the product's **real** palette, its real
// tabular figures and its real `prefers-reduced-motion` answer — which is also
// why the greyscale check belongs here rather than there.
//
// ## The cadence is the product's, and the faster one is labelled
//
// **`OneMinute` is the story the decision is taken on.** A vocabulary tuned
// against a 10x replay is a vocabulary designed for a market that does not
// exist, which is this story's own warning one level down. `TenTimes` exists so
// a candidate can be seen repeatedly while iterating, and the decision is not
// taken on it.
//
// ## The values are recorded, not invented
//
// The four prices are the four Task 3.4.3 watched arrive off the socket —
// NVDA's replayed 2026-09-11 minutes — so the instrument moves the way the
// market actually moved rather than the way a generator imagines.

/** NVDA, replayed 2026-09-11, as Task 3.4.3 recorded them off the wire. */
const RECORDED = [219.4, 219.6, 219.96, 219.78] as const;

/** §10.1's grain. The cadence the product actually has. */
const ONE_MINUTE_MS = 60_000;

const barAt = (close: number): Bar => ({
  startsAt: new Date("2026-09-11T14:01:00Z"),
  open: close,
  high: close,
  low: close,
  close,
  volume: 0,
});

/**
 * Walk the recorded values on an interval, and report which way each step went.
 *
 * The index rather than the value, because a treatment has to re-run when the
 * **same** value arrives twice — a revision (§7.8 measured 14 in one session)
 * replaces a minute with a corrected one, and the mark must fire for that too.
 */
function useRecordedWalk(everyMs: number): {
  readonly step: number;
  readonly close: number;
  readonly rising: boolean;
} {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((previous) => previous + 1);
    }, everyMs);
    return () => {
      clearInterval(timer);
    };
  }, [everyMs]);

  const index = step % RECORDED.length;
  const previousIndex = (index + RECORDED.length - 1) % RECORDED.length;
  const close = RECORDED[index] ?? RECORDED[0];
  const previous = RECORDED[previousIndex] ?? RECORDED[0];

  return { step, close, rising: close >= previous };
}

/**
 * The classes that make a mark fire on this step.
 *
 * **Alternating two animation names rather than toggling one class**, because a
 * CSS animation does not restart when the same animation is re-applied to the
 * same element. The module comment has the full argument, including why the
 * obvious fix — remounting the block with a `key` — is worse: `SecurityIdentity`
 * animates its own arrival, so a remount would replay *the block arriving* on
 * every price change, which is the one thing rule A forbids.
 */
const fireOn = (step: number, rising: boolean): (string | undefined)[] => [
  styles.host,
  rising ? styles.up : styles.down,
  // The first paint is a mount rather than a change. A mark there would claim a
  // price moved when the page merely loaded.
  step === 0 ? styles.first : step % 2 === 1 ? styles.odd : styles.even,
];

function Treatment({
  head,
  name,
  cost,
  hostClass,
  close,
  fire,
}: {
  readonly head: string;
  readonly name: string;
  readonly cost: string;
  /** Absent for treatment A, which is the shipped state and marks nothing. */
  readonly hostClass?: string | undefined;
  readonly close: number;
  readonly fire: (string | undefined)[];
}) {
  return (
    <div
      className={cx(
        styles.cell,
        hostClass,
        ...(hostClass === undefined ? [] : fire),
      )}
    >
      <p className={cx(styles.head)}>{head}</p>
      <p className={cx(styles.name)}>{name}</p>
      <SecurityIdentity
        symbol="NVDA"
        view={securitiesFixtureView("full")}
        live={barAt(close)}
      />
      <p className={cx(styles.cost)}>{cost}</p>
    </div>
  );
}

function Rig({ everyMs, greyscale }: { everyMs: number; greyscale: boolean }) {
  const { step, close, rising } = useRecordedWalk(everyMs);
  const fire = fireOn(step, rising);

  return (
    <div>
      {/*
        The counter is the honest part of the instrument at 1x: it is the only
        thing that distinguishes *nothing has happened yet* from *a change
        landed and treatment A said nothing about it* — which is itself the
        finding this page exists to put in front of somebody.
      */}
      <p className={cx(styles.cost)}>
        One change every {Math.round(everyMs / 1000)} s · changes so far: {step}
      </p>
      <div className={cx(styles.rig, greyscale ? styles.greyscale : undefined)}>
        <Treatment
          head="Treatment A"
          name="Nothing"
          close={close}
          fire={fire}
          cost="The shipped state. A change is invisible unless you are looking straight at it — one glyph in the middle of six."
        />
        <Treatment
          head="Treatment B"
          name="The direction rule"
          close={close}
          hostClass={styles.ruleHost}
          fire={fire}
          cost="Position carries direction — above for a rise, below for a fall — so it survives greyscale without the hue. Loudest of the three, and it repeats what the arrow already says."
        />
        <Treatment
          head="Treatment C"
          name="The digits that changed"
          close={close}
          hostClass={styles.digitsHost}
          fire={fire}
          cost="The most informative and the most literal. It points at the cents almost every time, because that is what a minute moves — so it risks becoming a fixture a reader stops seeing."
        />
        <Treatment
          head="Treatment D"
          name="The arrival mark"
          close={close}
          hostClass={styles.arrivalHost}
          fire={fire}
          cost="The quietest, and the only one that touches nothing inside the figure. It reuses the chrome’s own marker glyph — which is either the best argument for it or a confusion with a status marker."
        />
      </div>
    </div>
  );
}

const meta = {
  title: "Market/SecurityIdentity/Motion treatments (3.4.4)",
  component: Rig,
  parameters: { layout: "fullscreen" },
  args: { everyMs: ONE_MINUTE_MS, greyscale: false },
} satisfies Meta<typeof Rig>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **The story the decision is taken on.** One change a minute, which is the
 * cadence the product actually has — so the first change lands sixty seconds
 * after the page settles, and the wait is part of what is being judged.
 */
export const OneMinute: Story = {};

/**
 * **Iteration only.** Ten times the rate, so a candidate can be seen
 * repeatedly; a treatment that reads well here and badly at a minute is a
 * treatment designed for a market that does not exist.
 */
export const TenTimes: Story = { args: { everyMs: ONE_MINUTE_MS / 10 } };

/**
 * Rule B's check, and it is not optional: the price palette differs by
 * **1.04:1 in greyscale**, so hue is the entire difference between up and down.
 * A candidate that loses its meaning here is not a candidate.
 */
export const Greyscale: Story = {
  args: { everyMs: ONE_MINUTE_MS / 10, greyscale: true },
};
