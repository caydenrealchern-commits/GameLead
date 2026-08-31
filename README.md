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

Inbox-first. You name a real lead, walk their conversation, then see what the
same sequence does to a whole list.

```
INPUTS   industry · job value · how long cold
   │
INBOX    empty, with one field: name a lead you actually have.
         The row appears as "Not contacted". Tap it to open the thread.
   │
ACT 1    That lead's journey. You choose at both decision points.
   │
ACT 2    Ten leads. Yours sits at the top, already resolved; the other
         nine run on a fixed distribution. Step day 0 → 3 → 7 → 14 and
         watch the tally move. Any thread opens in full.
   │
COPY-OUT · GATE · OFFER
```

Naming the lead is the only typing in the tool, and it is the point: a sequence
addressed to "Dave Wilson" reads as something you might actually send, where the
same screen headed "Your old lead" reads as a demo.

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

The totals are exact rather than approximate. The user's single lead claims one
slot out of a fixed ten-slot pool, and whichever of the four possible outcomes
they reach, the remaining nine still land on 3/1/6. The message-4 booking can
never come from the user, because the state machine has no reply branch after
message 4 — so it is always one of the automatic nine.

The automatic leads are spread through the list by computation rather than a
fixed table, so the layout holds however many slots the user claims.

That exactness is what lets the day-by-day notes state hard numbers ("eight say
nothing", "six never answer") instead of hedging.

## Tests

Two suites, both run in Chromium at 390px and 360px.

`test.js` covers the act 1 machine: all four terminal paths, back-navigation
out of each, day stamps, reduced motion, 360px overflow, and that no message is
byte-identical across two industries.

`test2.js` covers the naming step and the campaign: that an empty name is
rejected, whitespace is normalised, renaming works, the name carries into the
thread header and to the top of the campaign, and that markup typed into the
name is never rendered as HTML. Then that the totals land on 3/1/6 with exactly
one message-4 booking for every outcome the user can reach, that the reveal
advances and the tally increments correctly day by day, skip-to-result, every
thread opening and closing, back navigation from each new screen (including
falling out of the walkthrough back to the inbox), and that continue reaches
the unchanged gate, copy-out and offer.

A separate lint pass checks all 96 input combinations (576 messages) for
assembly artifacts. An unhurried run reaches the final tally in about 40
seconds.
