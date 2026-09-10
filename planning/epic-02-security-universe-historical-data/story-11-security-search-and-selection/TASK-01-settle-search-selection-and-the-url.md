# Task 2.11.1 — Settle where search lives, how it matches, and what the address carries, shipping no component

**Status:** Complete — 2026-09-11
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** Story 2.10 (complete)

## Objective

Take this story's three open decisions — **where search lives**, **client-side or
server-side matching**, and **the URL shape** — together with the positions the
design work is asked for in [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) §8, and write
them down in one document before a control is typed.

Tasks 2.9.1 and 2.10.1 are the precedent, and the reason is the same: this story
is followed immediately by two chart stories and then by an epic that adds a
symbol switcher, a comparison picker and a window control. Every one of those is
a control, and the first control in a product decides what the rest look like. A
decision taken once here is a decision six later screens inherit rather than
re-take four different ways.

## What the user can see when this lands

**Nothing.** No field, no result, no pixel. The payoff is Task 2.11.4, which puts
the first interactive control in this product on screen, and the shell in 2.11.7.
Say so plainly when reporting it — this repository states "nothing visible"
rather than dressing it up, and names the task that pays it off.

## Work

Produce **`SEARCH-AND-SELECTION.md`** in this directory — the subject document
for this story, added to `CLAUDE.md`'s _Where the record lives_ table by the
close task (2.11.10) — and settle each of the following in it, with the
alternatives that were weighed and a **reversal trigger that is a condition
rather than a story number**.

- **Open decision 1 — where search lives.** A dedicated route, a persistent
  control in the chrome, or both. The argument is not aesthetic: a persistent
  control is how an analyst tool behaves and makes symbol switching cheap, which
  is what Epic 5 onward wants, and it touches `AppHeader` — which today carries a
  deliberate three-region status strip (feed, backend health, market clock) in a
  56px masthead. A route touches nothing and is simpler.

  Two things must appear in the decision or it is a preference. **What the
  masthead actually holds at each viewport** — read it rather than recalling it,
  and say what gives way if a field goes in. And **what Epics 4, 6 and 11 need**:
  §8.1's overview and §10's topology both select a security by other means, so
  the question is whether search is the way _in_ to a security or one of several,
  and the answer changes where it belongs.

- **Open decision 2 — client-side or server-side matching.** The measurement is
  already taken and the story's own amendment records it: the whole universe of
  518 securities reaches a browser as **20,072 bytes** compressed, and the
  deployed fetch is **~484 ms** against a **~376 ms** conditional floor. The page
  that will hold search **already fetches it** — `useSecurities` runs on
  `/securities` today — so client-side matching costs one request that is already
  being made, and gives per-keystroke results with no debounce problem.

  Decide it on the **ceiling** rather than on today, which is what the story asks:
  §6 names 100–500 securities for V1 and the universe is already 518. State what
  would move it — a corpus we do not ship (company aliases, former names), fuzzy
  ranking that needs a server index, or search over anything beyond the tracked
  universe, which §37 puts out of V1. If the answer is client-side, say what the
  server would have to be asked for if it changes, so it is a re-wiring rather
  than a redesign.

- **Open decision 3 — the URL shape.** Half of this is inherited and not open:
  **the path names the subject and the query names the view**, an absent
  parameter means the default, and the application never writes a parameter it
  did not need (`FRONTEND-STATE.md` §3). `/securities/:symbol` exists in
  `ROUTE_PATTERNS` and `securityPath()` is the only thing that builds one.

  What is genuinely open is smaller and user-visible: **does a search query
  belong in the address?** Is a half-typed query a shareable state, does the back
  button walk keystrokes, and what does the address do while a user is looking at
  the list rather than at one security. Decide it, and note that the answer binds
  Story 2.13's window control, which puts the first real parameter in the query.

- **Two constraints that are not decisions, recorded here because they are what a
  later reader will otherwise re-argue.** `status` is **not** filtered — an
  untracked security is findable and marked, never hidden (`UNIVERSE.md` §12.2),
  and a search that drops it reintroduces exactly the failure the schema avoids
  by having no `deleted_at`. And the **summary line must not become a lie**: it
  says which of two numbers it is reporting, so if filtering changes what is on
  screen the line has to say so.

- **The live-region rate**, which `FRONTEND-STATE.md` §7 hands this story by name.
  `/securities` already has two polite regions. A field that re-requests or
  re-announces per keystroke drives one at typing speed, which is actively
  hostile. Settle the rule now — a debounce with a named interval, or silence
  while a query is being typed and one sentence when results settle — and settle
  whether a third asynchronously-filled surface is being added to this page,
  because that fires §7's other reversal trigger and is cheap to decide before
  the layout exists.

- **Read the design deliverable against [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) and
  record what came back.** The brief asks for positions on the same three
  decisions; where design's recommendation and this document disagree, the
  disagreement is the interesting content and belongs in the file rather than
  being resolved silently. Record specifically: the input idiom (bordered or
  underlined, and why), whether `Locked` is drawn now or dropped until
  authentication exists, whether a result row carries a price, and whether the
  icon set gains a sixth member. That last one is a decision about the interface
  having another symbol, not a detail — the set has been closed at five since the
  refresh.

## Done when

- `SEARCH-AND-SELECTION.md` exists and settles three decisions plus the
  live-region rate, each with its alternatives and a reversal trigger that is a
  condition
- The matching decision states the **ceiling** it was taken against and what
  would move it, not only today's byte count
- The URL decision says what the address does while a query is being typed
- The two inherited constraints — `status` unfiltered, the summary line — are
  written down where the next four tasks will read them
- The design deliverable's positions are recorded, including where they disagree
  with this file
- Nothing is added to `apps/frontend/src` — verified by `git status`
- `pnpm verify` passes, which for a documentation task means `pnpm links` in
  particular

## Notes

The likeliest scope leak is drawing the control while deciding where it goes.
This task decides **where, how it matches, and what the address says**; the field
itself is 2.11.3 and the combobox is 2.11.4. If a decision here appears to force
the shape of the field, that is a finding to record rather than a licence to take
it.

The second likeliest is deciding the Security Explorer's grid here because it is
adjacent. It is Task 2.11.7's, and it is a layout question that wants the search
control to already exist.

---

## What was done — 2026-09-11

The deliverable is
[`SEARCH-AND-SELECTION.md`](SEARCH-AND-SELECTION.md), this story's subject
document. Nothing was added to `apps/frontend/src` — confirmed by `git status`,
whose only entries are that file, the design deliverable and `notes.txt`.

**The three decisions, in one line each:**

1. **Where search lives — on the page**, in the Security Explorer screen's
   header, above both the panel and the table. The chrome is untouched. The
   argument that decided it is that `/securities` and `/securities/:symbol`
   render the **same screen**, so a page-level field already _is_ a persistent
   symbol switcher wherever a symbol is being looked at.
2. **Matching — client-side**, over the universe `useSecurities` already fetches.
   Taken against §27's 5,000-security synthetic ceiling rather than against
   today: matching 5,000 securities measured **0.58 ms**, two orders of magnitude
   inside a frame.
3. **The URL — the query never reaches the address**, not even transiently. The
   path names the security; the query string stays empty and Story 2.13's window
   control puts the first parameter in it.

Plus the live-region rate (§4): the visible list updates **per keystroke**, the
spoken sentence waits **400 ms** after the last one, and the query is quoted
inside the sentence because a live region whose text does not change announces
nothing.

**The masthead was measured rather than recalled**, which is what the task asked
for and what settled decision 1. Its content is **903px** wide — 24px padding, a
250px identity block, a 40px gap, 565px of navigation in four tabs. There is no
media query in `AppHeader.module.css`; `.nav` is `overflow-x: auto`, so **the
navigation is what gives way**, and it gives way at 1024, where a 240px field
leaves 121px and the four tabs begin to scroll.

**Two escalations, one of which changed the answer.** The result row's price was
put to the user with a recommendation of change-only plus one surface-level
qualifier; **the user chose the design deliverable's position — price and change
on every row** — so §5 records that and narrows it into an honesty rule instead:
the surface names the close's session once, a row whose own session is earlier
carries its own date, and the number is labelled a close rather than a price. The
other escalation, where search lives, came back as recommended.

**One finding worth more than the decision it informed.** A naive
substring-anywhere match over the company name is measurably wrong: `nv` matches
`FRT`, `INVH`, `IVZ`, `KVUE` and `QQQ` — Federal Realty **Inv**estment Trust,
**Inv**itation Homes, **Inv**esco, Ken**vu**e and **Inv**esco QQQ Trust — and a
person typing `nv` means NVIDIA. Task 2.11.2 has that as a test to write rather
than a defect to find.

**The design deliverable was read against the brief and the result is in §5**,
following the precedent `VISUAL-LANGUAGE.md` set with `story-10-design.html`: a
reference and not a specification. Eight positions taken, four narrowed, six
declined. The most important decline is not stylistic — the mock's masthead reads
`SIP CONSOLIDATED` over a **live** feed indicator, which is invariant 6 inverted:
the free plan's live stream is IEX only, and that label claims coverage of every
US exchange for a stream with one venue in it. A dozen fabricated figures in the
mock (aggregate ADV, market cap, a `0.42ms` latency, a CUSIP and an ISIN, two
securities we do not track, and placeholder cards labelled Stories 2.15 and 2.16,
which do not exist) are listed by name so that none of them is copied forward.

`pnpm verify` passes.

---

## For the stakeholders — what this week's work actually was, in plain terms

**Nothing changed on screen, and that is the intended outcome of this particular
piece of work.** What it produced is a set of settled answers so that the six
tasks after it can build rather than deliberate. If you want the one-sentence
status: **MarketPulse can already show you 518 real companies and one company's
real trading history, and the next fortnight is about letting you _find_ a company
instead of typing its address into the browser.** This task is the design meeting
that makes that fortnight straightforward.

### The three questions that had to be answered first

**1. Where does the search box go?**

The obvious answer — put it in the top bar, like every trading terminal — turned
out to be the wrong one, and we know that because we measured the top bar instead
of eyeballing it. It is already full: the logo, the product name and the four
main navigation tabs use up 903 pixels of it, and on a 1024-pixel-wide laptop
screen adding a search box would push the navigation tabs into a little
sideways-scrolling strip. That is the kind of thing that looks fine on the
developer's large monitor and is quietly broken on a smaller one.

So the search box goes **on the page**, at the top of the Securities screen. The
happy accident that makes this genuinely as good rather than just cheaper: the
list of companies and an individual company's page are the same screen in our
application. Put the search box there and it is available at exactly the moments
somebody wants to switch company — which is the whole point of wanting it in the
top bar. We have written down the specific condition under which we would revisit
this (a different screen needing to change which company it is about), so it is a
decision with an expiry condition rather than a permanent one.

**2. Should typing search the computer or ask the server?**

Every letter you type could be sent to our server to be looked up, or the browser
could already be holding the whole list and search it instantly. We chose
instantly, and we chose it on the basis of a measurement rather than a hunch: the
full list of 518 companies is **20 kilobytes** over the network — roughly the size
of a small photograph's thumbnail — and the page downloads it already, for the
table you can see today. Searching that list takes **three ten-thousandths of a
second**.

The more useful thing we measured is what happens if the product grows. We
duplicated the list up to **5,000 companies** — ten times the size the product
plan calls for — and searching it still took **six ten-thousandths of a second**.
So this is not a decision that quietly expires the moment the product succeeds.
We also wrote down exactly what would change our mind (searching by a company's
former name, for example — somebody typing "Facebook" and expecting to find
"Meta") and exactly what we would ask the server for if it did, so that change
would be an afternoon's rewiring rather than a redesign.

**3. What should the web address say?**

The address will name the company — `/securities/NVDA` — so you can bookmark it,
send it to a colleague, and have it open on the right thing. What we decided
against is putting your half-typed search into the address. Two reasons, both
about not being annoying: a link to somebody else's unfinished typing is not
useful to anybody, and if the address changed on every keystroke, the browser's
back button would walk you backwards through your own letters one at a time
instead of taking you back to where you came from.

There is one honest cost, and we would rather state it than have somebody find
it: if you search, open a company, and press Back, you land on the list with an
empty search box rather than your previous search. We think that is the right
trade — the alternative is the address-bar churn above — and it is now written
down as a decision rather than waiting to be reported as a bug.

### The bit we spent the most care on, which you cannot see at all

Screen-reader users hear the page rather than see it, and this screen already
speaks twice: once about the company list and once about the trading history
panel. A search box is the first thing in this product that changes while somebody
is actively typing, and the naive implementation would have the page talking over
them at typing speed. That would be genuinely hostile, so it was settled now,
before anything is built: **the results on screen update on every keystroke — no
lag, that part must feel instant — but the page only speaks 400 milliseconds after
you stop typing, and when it speaks it says which search it is talking about.**
That last detail is not fussiness; a spoken sentence that reads "7 matches" is
completely silent if the previous one also said "7 matches", so the sentence quotes
your query to guarantee it has actually changed.

### On the design work

A design mock was produced for this story and it did a lot of good work: its
bordered field, its monospace typing, its clear button and escape hint, its treatment
of a company we no longer track (shown and marked, never hidden), and its
insistence that selecting a result changes the address were all adopted. **You
asked for prices on the search results and that is what we are building**, with
one condition attached: our prices are the last trading session's closing prices,
not live prices, so the results panel states which session it is showing and any
individual row from an older session says so itself. A number without a date
beside it is the single easiest way for a financial product to mislead somebody
without technically lying, and we are not going to do that.

We also declined a handful of things from the mock, and one of them matters beyond
this screen. The mock labelled our live market feed "SIP Consolidated" — meaning
the full US market. Our live feed, on the plan we are on, carries **one exchange**.
Shipping that label would have been the product claiming market-wide coverage it
does not have, which is precisely the failure our own architecture rules exist to
prevent. It was caught here because somebody read the mock against the rulebook,
which is the reason this task exists at all. Along with it we catalogued a dozen
invented figures in the mock — a market-capitalisation total, a network latency, a
securities identification number for NVIDIA — by name, so that none of them gets
copied into the real product by a well-meaning hand later.

### What happens next, and when you will see something

The next two tasks are still invisible: the matching logic and its tests, then the
search field itself, reviewable in our component workshop. **Task 2.11.4 is where
this becomes real** — a working search box on the page, where typing `nvid` finds
NVIDIA and pressing Enter opens it. After that: every failure state made honest,
the Security Explorer page layout that the next four epics hang their features
off, a control for navigating 518 rows, and a keyboard and screen-reader pass.

At the end of this story, the sentence somebody can demonstrate is the one this
epic was set up to deliver: **search for NVDA and open it.** Charts are the two
stories after that.
