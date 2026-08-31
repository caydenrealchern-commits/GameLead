# Reactivation Sequence Builder

An interactive guide that walks a business owner through a five-message SMS
database-reactivation sequence written for their own business, including the
branches most people get wrong.

Built to spec: `2026-08-28-reactivation-sequence-builder-design.md`.

## Deploy

Two files: `index.html` and `og.png`, plus an optional `netlify.toml` for
caching and security headers. Drag them (or the zip) onto
[app.netlify.com/drop](https://app.netlify.com/drop), no account required to
deploy, though you need one to keep the site. No build step, no
dependencies, no backend, no API keys, nothing metered. The optional lead
The page makes no network requests at all. Nothing is collected, nothing is
sent, and there is no backend to fail.

### Rebuilding the deploy zip

Netlify Drop takes a zip, so bundle the three files whenever the page changes:

```sh
zip reactivation-builder-netlify.zip index.html og.png netlify.toml
```

The zip is gitignored on purpose. It is derived from those three files, and a
committed copy would go stale the moment the page changed, anyone downloading
it from the repo would deploy an old build.

### Order matters

Netlify Drop gives you a random subdomain first, so pick your final site name
*before* editing the share tags, otherwise you edit and re-drop twice.

1. Drop the zip. Netlify assigns something like `sparkly-tiramisu-a1b2c3`.
2. **Site configuration → Change site name** → pick the real one. The URL
   becomes `https://<your-name>.netlify.app`.
3. *Now* do the two steps below, then drop the zip again.

Then check the link preview: paste the URL into LinkedIn's Post Inspector to
force a re-scrape before posting for real. LinkedIn caches the first fetch
hard, and you do not want it caching a card-less version.

The site URL is baked into three Open Graph tags in the `<head>`. If the site
ever moves, those are the only lines that need changing.

## Design

Light, flat, no gradients. Type is set in the platform system font, which
already ships optical sizing and tracking tables; tracking is size-specific
(tight on the display line, near zero at body, open on small uppercase
labels) rather than one value everywhere.

Colour is deliberately scarce. Near-black carries every primary action, and
the accent appears in exactly three places: the mark, the rule on the teaching
note, and the underline under the headline, under it rather than in it,
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
COPY-OUT · OFFER
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

Nothing is gated. The whole walkthrough and the full five-message sequence are
free to take, and the only call to action is booking a call to have the
campaign run at scale.

## The campaign distribution

Ten leads always total **3 booked / 1 declined / 6 no reply**, with exactly one
booking arriving off message 4. This is fixed, not randomised, a run where
nobody books argues against the tool, and a run where everybody books is not
believable.

The totals are exact rather than approximate. The user's single lead claims one
slot out of a fixed ten-slot pool, and whichever of the four possible outcomes
they reach, the remaining nine still land on 3/1/6. The message-4 booking can
never come from the user, because the state machine has no reply branch after
message 4, so it is always one of the automatic nine.

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
the copy-out and offer with no email asked for anywhere.

A separate lint pass checks all 96 input combinations (576 messages) for
assembly artifacts. An unhurried run reaches the final tally in about 40
seconds.
