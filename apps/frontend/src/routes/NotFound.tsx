import { Link } from "react-router";

import { linkClassName } from "../components/Button/Button.js";
import { PageHeader } from "../components/PageHeader/PageHeader.js";
import { PATHS } from "./paths.js";
import styles from "./routes.module.css";

// The address that matched nothing.
//
// It is a route like any other — the same masthead, the same rule — rather than
// a full-page error, and that is PRODUCT_SPEC.md §36's rule reaching the
// smallest case: a mistyped address is a normal product state, and collapsing
// to a global error screen for one is exactly the reflex §36 forbids.
//
// The way back is a real `<Link>` carrying `Button`'s classes through
// `linkClassName`, rather than a `<button>` with an `onClick` that navigates.
// An anchor styled as a control keeps the anchor's semantics — middle-click,
// copy link address, the status bar — and a button that navigates has none of
// them. That export exists for exactly this case and says so.
export function NotFound() {
  return (
    <div className={styles.route}>
      <PageHeader
        eyebrow="Not found"
        title="No such page"
        description="That address does not match anything in MarketPulse. It may have been mistyped, or it may be a link to something this application does not have yet — most of it is still to be built."
      />
      <p className={styles.actions}>
        <Link className={linkClassName("secondary")} to={PATHS.overview}>
          Go to Market Overview
        </Link>
      </p>
    </div>
  );
}
