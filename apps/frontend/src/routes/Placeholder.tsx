import type { ReactNode } from "react";

import styles from "./routes.module.css";

// The shape every route placeholder takes: what this screen is, its name, and
// one sentence saying which epic fills it. A placeholder is identifiable rather
// than empty — this is the first thing anyone clicking through MarketPulse will
// see, and it will be that for several epics, so "coming soon" on a white page
// is not good enough.
//
// It lives in `src/routes/` rather than `src/components/`, and that placement
// is a decision rather than a convenience. `scripts/check-stories.mjs` walks
// `src/components/` specifically, so a component there owes a `.stories.tsx`
// covering its permutations — and this one has a single state with two strings
// in it. Route furniture is not workshop material. Task 1.5.3 owns the general
// question of where that line falls now that there is real chrome; this file
// only claims that a route placeholder sits on the far side of it.
export function Placeholder({
  label,
  name,
  children,
}: {
  readonly label: string;
  readonly name: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={styles.route}>
      <p className={styles.label}>{label}</p>
      <h1 className={styles.title}>{name}</h1>
      <p className={styles.prose}>{children}</p>
    </section>
  );
}
