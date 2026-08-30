# Reactivation Sequence Builder

An interactive guide that walks a business owner through a five-message SMS
database-reactivation sequence written for their own business — including the
branches most people get wrong.

Built to spec: `2026-08-28-reactivation-sequence-builder-design.md`.

## Deploy

`index.html` is the whole thing. Drag it into Netlify. No build step, no
dependencies, no backend, no API keys, nothing metered. The optional lead
webhook is the only network request the page can make; with `webhookUrl` blank
it makes none at all.

## Configure

Everything tunable lives in the `CONFIG` object at the top of the `<script>`:

| Key | What it does |
|---|---|
| `bookingUrl` / `bookingLabel` | The offer CTA. `free` should stay in the label. |
| `offerHeading` / `offerBody` | Post-gate offer copy. |
| `quietOffer` / `quietOfferLink` | The single-line offer repeated on the three ending screens. |
| `webhookUrl` | Where the email gate POSTs. Blank skips the request entirely. |
| `gateEnabled` | `false` shows the copy-out without asking for an email. |
| `typingMs` | Typing-indicator duration. Ignored under `prefers-reduced-motion`. |
| `currencyDefault` | `'£'`, `'$'`, or `null` to detect from `navigator.language`. |
| `sender` / `business` | Placeholders the user replaces before sending. |
| `days` | Send timings for messages 1, 2c, 3 and 4. |
| `compliance` | The opt-out / local-rules note shown in the UI. |

A webhook failure is caught and logged; it never blocks the copy-out or the
booking link.

## How the copy is built

Not 96 hand-written sequences. Three layers assembled at runtime by
`buildSequence(industry, valueBand, coldBand)`:

- **8 industry vocabulary packs** — the job noun, the realistic objection, the
  two-named-times booking line, and the industry-specific reason-to-act for
  message 3.
- **4 tone templates**, one per average job value — a £300 job gets short and
  casual, a £15,000 job gets longer and consultative. Each supplies its own
  connectives and sign-offs, so the bands differ by sentence, not by a flag.
- **3 openers**, one per how-long-cold band — "we spoke a few weeks ago" and
  "we quoted you over a year ago" are different conversations.

Each pack carries two registers (`q` quick / `c` considered); the tone template
picks which one applies. All strings live in `COPY`; none are inline in logic.

## Design

Light, flat, no gradients. Type is set in the platform system font, which
already ships optical sizing and tracking tables; tracking is size-specific
(tight on the display line, near zero at body, open on small uppercase
labels) rather than one value everywhere.

Colour is deliberately scarce. Near-black carries every primary action, and
the accent appears in exactly three places: the mark, the rule on the teaching
note, and the underline under the headline — under it rather than in it,
because the accent on white would fail contrast.

Press feedback lands on pointer-down, not on release. Transitions are
critically damped (no overshoot) at a ~360ms response; messages enter from
below, the direction they arrive from. `prefers-reduced-motion` and
`prefers-contrast` are both honoured.

## Structure

Two acts. Act 1 teaches the branch logic on one thread at a time; act 2 shows
what the same sequence does to a list.

```
INPUTS  industry · job value · how long cold
   │
ACT 1   Lead 1, then Lead 2 — you choose at both decision points.
        Lead 2's branches are filtered so you cannot land on the same
        ending twice; the inbox only makes sense if two things happened.
   │
ACT 2   Ten leads. Yours are already resolved, the other eight run on a
        fixed distribution. Step day 0 → 3 → 7 → 14 and watch the tally
        move. Any thread opens in full.
   │
COPY-OUT · GATE · OFFER   unchanged
```

Act 1's single-lead machine:

Five sends over roughly two weeks, two decision points, three terminal states:

```
Msg 1  Day 0 ─┬─ interested ──────► Msg 2a ──► won
              ├─ not interested ──► Msg 2b ──► parked
              └─ no reply ────────► Msg 2c  Day 3
                                       ├─ replies ──► Msg 2a ──► won
                                       └─ no reply ─► Msg 3  Day 7
                                                       └─────► Msg 4  Day 14 ──► cleaned
```

The walkthrough is entirely ungated. Only the copy-out step asks for an email,
and it can be skipped.

## The campaign distribution

Ten leads always total **3 booked / 1 declined / 6 no reply**, with exactly one
booking arriving off message 4. This is fixed, not randomised — a run where
nobody books argues against the tool, and a run where everybody books is not
believable.

The totals are exact rather than approximate because act 1 filters out branches
leading to an ending already seen, so the user's two leads always differ. That
leaves only ten reachable input combinations, and a ten-slot pool minus the
user's two claims lands on 3/1/6 every time. The message-4 booking can never
come from the user, because the state machine has no reply branch after message
4 — so it is always one of the automatic eight.

That exactness is what lets the day-by-day notes state hard numbers ("eight say
nothing", "six never answer") instead of hedging.

## Tests

Two suites, both run in Chromium at 390px and 360px.

`test.js` covers the act 1 machine: all four terminal paths, back-navigation
out of each, day stamps, reduced motion, 360px overflow, and that no message is
byte-identical across two industries.

`test2.js` covers the campaign: that act 1 yields two different endings, that
the totals land on 3/1/6 and exactly one message-4 booking for every reachable
combination, that the reveal advances and the tally increments correctly day by
day, skip-to-result, every thread opening and closing, back navigation from
each new screen, and that continue reaches the unchanged gate, copy-out and
offer.

A separate lint pass checks all 96 input combinations (576 messages) for
assembly artifacts. An unhurried run reaches the final tally in about 40
seconds.
