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

## Tests

`scratchpad/test.js` in the build session drove Chromium through all four
terminal paths, back-navigation out of each, the gate (submit / skip /
unreachable webhook), reduced motion, 360px overflow, and asserted no message
is byte-identical across two industries. A separate lint pass checked all 96
input combinations (576 messages) for assembly artifacts.
