# Task 3.5.5 — A browser receives only what it asked for

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.2, 3.5.3

## Objective

Make the downstream fan-out **per browser**. Today `market-gateway.ts` holds one
`Set<WebSocket>` and a `broadcast()` that sends the identical payload to every
client — correct for five symbols and one page, and **wrong at 518**.

Criterion 3: _a browser that has subscribed to eight securities must not be sent 518._

## What the user can see when this lands

**Nothing directly**, but this is the task that makes
[3.6](../story-06-live-prices-across-the-universe/STORY.md) affordable rather
than merely possible. Without it, a security page open on one symbol receives
the whole universe every minute and throws 517 of them away in the browser.

## The asymmetry that makes this necessary rather than tidy

**Upstream is a constant and downstream is not.** §10.2 settles that this
backend always asks Alpaca for the same 518 — there is no diffing and no
unsubscribe path, and Task 3.5.2 is explicit that building one would be
designing for a problem this epic does not have.

**Downstream is the opposite.** Story 3.6's overview wants all 518. A security
page wants one. Epic 4's overview will want a different subset again. The
browser's selection is genuinely dynamic, and it is the **only** dynamic
subscription in this epic.

Do not let the upstream decision leak into this one. They look like the same
problem and they are not.

## Coalescing, which is a real case rather than a precaution

Several observations for one security inside one tick **happens at the open**.
Two shapes and they need different answers:

- **Two different minutes for one symbol** — both are real, and the later one is
  the current state. Send the latest; a browser rendering a price does not want
  a backlog it will overwrite within a frame.
- **A revision of a minute already sent** — §14.1's `u` frame, 29.1–30.1 s
  later, **35.3% of which change the close**. This is not a duplicate to
  collapse; it is a correction that must reach the browser, because Story 3.4's
  mark fires on observation **content** and a silently dropped revision is a
  price that stays wrong.

**Collapsing those two cases together is the defect this section exists to
prevent.**

## Work

- A subscribe message in the browser protocol, and a per-client symbol set
- Send an observation to a client only if that client asked for its symbol
- Coalesce per `(client, symbol)` within a tick, **latest wins**, with revisions
  exempt from collapse
- The snapshot on connect is **already** scoped by what the client asked for —
  and if it asks for nothing yet, it receives nothing rather than everything
- Keep the wire shape §11.1 defines; this task changes **who** receives an
  observation, never what one looks like

## Done when

1. A client subscribed to one symbol receives one symbol's observations while a
   second client subscribed to the universe receives all of them, **on the same
   process, at the same time**
2. Checked at a size where the difference is visible — criterion 3's own
   words — which means hundreds of symbols, not three
3. A revision reaches a subscribed client even when it arrives in the same tick
   as a newer minute for the same symbol
4. A client that has asked for nothing receives nothing, and this is not an
   error
5. `pnpm break` proves the filter goes red when removed — a broadcast to all is
   exactly what the test must catch
6. `pnpm verify` passes

## The trap worth writing down before it is hit

**Every one of these questions has a wrong answer that works perfectly for one
security**, which is the story's own reason for existing. A test with three
symbols and two clients passes against a `broadcast()` that ignores the filter
entirely, because with three symbols the right answer and the wrong answer are
the same bytes often enough. Size the assertion so they differ.
