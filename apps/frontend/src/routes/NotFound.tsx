import { Link } from "react-router";

import { cx } from "../cx.js";
import { PATHS } from "./paths.js";
import styles from "./routes.module.css";

// The not-found state, and it is a route rather than a fallback nobody looks
// at. Two things follow from that.
//
// It says what happened and offers the way back, because an unknown URL is
// almost always a mistyped address or a stale link and the user can act on
// both. And it is deliberately **not** an error screen in Story 1.7's sense:
// nothing failed here. The product's rule is that failures degrade locally and
// stay labelled; this is not one, so it does not borrow the vocabulary of one —
// no red, no status token, no apology.
//
// It does not render the path it did not find. That would be echoing the URL
// into the page, and the URL is user-controlled input.
export function NotFound() {
  return (
    <section className={styles.route}>
      <p className={styles.label}>Not found</p>
      <h1 className={styles.title}>No such page</h1>
      <p className={styles.prose}>
        That address does not match anything in MarketPulse. It may have been
        mistyped, or it may be a link to something this application does not
        have yet — most of it is still to be built.
      </p>
      <Link className={cx(styles.back)} to={PATHS.overview}>
        Go to Market Overview
      </Link>
    </section>
  );
}
