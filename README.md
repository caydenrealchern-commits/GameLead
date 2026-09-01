# Reactivation Sequence Builder

An interactive guide that walks a business owner through a five-message SMS
database-reactivation sequence written for their own business, including the
branches most people get wrong.

Built to spec: `2026-08-28-reactivation-sequence-builder-design.md`, then
restructured to `docs/superpowers/specs/2026-08-31-owner-entered-inbox-design.md`.

## Deploy

Two files: `index.html` and `og.png`, plus an optional `netlify.toml` for
caching and security headers. Drag them (or the zip) onto
[app.netlify.com/drop](https://app.netlify.com/drop), no account required to
deploy, though you need one to keep the site. No build step, no
dependencies, no backend, no API keys, nothing metered.

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

Inbox first, and every lead in it is one the owner actually has. The tool
never decides what a lead did; it only supplies the next message.

```
INPUTS   industry · job value · how long cold
   │
INBOX    empty. Add up to ten leads by name, one at a time.
         Each row shows where that conversation has got to.
   │
THREAD   opens on message 1, already written for their trade.
         Then, after every send: what came back?
         They replied · They said no · Nothing
         The answer decides which message comes next.
         The booking ask sits at the bottom, once it resolves.
   │
COPY-OUT · OFFER
```

Each lead carries a `path`: the list of answers the owner has given, one per
message sent. An empty path is a conversation not yet started. `walk()` turns
a path into the beats to draw plus either the stage still waiting on an answer
or the ending it arrived at. Nothing in there decides anything, which is the
point: every branch on screen is one the owner clicked.

Five sends over roughly two weeks, a decision after each one, three endings:

```
Msg 1  Day 0 ─┬─ replied ──► Msg 2a ──► booked
              ├─ said no ──► Msg 2b ──► parked
              └─ nothing ──► Msg 2c  Day 3
                               ├─ replied ──► Msg 2a ──► booked
                               ├─ said no ──► Msg 2b ──► parked
                               └─ nothing ──► Msg 3  Day 7
                                                ├─ replied ─► Msg 2a
                                                ├─ said no ─► Msg 2b
                                                └─ nothing ─► Msg 4  Day 14
                                                               ├─ replied ─► Msg 2a
                                                               ├─ said no ─► Msg 2b
                                                               └─ nothing ─► cleaned
```

A reply arriving off message 3 or 4 gets its own ending, because "they
answered the message you nearly did not send" is a different lesson from "they
answered straight away", and it is the one the tool most wants an owner to
take away.

Undo takes the last answer back off; restart takes the conversation back to
message 1. Both are quiet text links, because they must never outweigh the
question being asked.

Nothing is gated anywhere. There is no email field. Every thread and the full
five-message sequence are free to take, and the only call to action is booking
a call to have the campaign run at scale, offered twice: at the bottom of a
conversation that has just resolved, and on the copy-out screen.

Typing the names is the only typing in the tool, and it is the point. A
sequence addressed to "Dave Wilson" reads as something you might actually
send; the same screen headed "Your old lead" reads as a demo. Filling the
screen with ten invented names, or playing a two-week conversation out before
the owner has even seen the first message, reads as a worse demo still. The
tool did both at different points and does neither now.

## Tests

Two Playwright suites against the real file in Chromium.

`test.js` drives the inbox: the three-answer gate, adding leads and every
rejection (empty, whitespace-only, duplicate regardless of case, markup in a
name never rendered as HTML), the cap at ten and the input coming back after a
removal, that a thread opens on message 1
alone with no reply, no silence and no booking ask on screen until the owner
answers; that one answer produces exactly one more send and asks again; undo
and restart; all seven paths through the tree, each checked for send count,
reply and silence counts, teaching notes, ending text, header chip and inbox
chip; the tally counting a half-run lead as mid sequence rather than as an
outcome; threads opening at the top and restoring inbox scroll on the way back, and the copy-out and offer with
no email asked for anywhere and no raw template token left in the pasted text.
It ends with a full-page overflow check at 360px and 390px.

`test2.js` covers what the flow cannot reach by clicking: that the page fetches
nothing and references no external script, stylesheet or image; that the Open
Graph and Twitter tags a link post depends on are present and absolute; that
all 96 input combinations assemble six whole messages with no unfilled slot, no
em dash and no spacing artifact; that all 1,248 thread states (96 combos times the
13 paths an owner can click) render without throwing, with the right send
count, the lead's name on screen, and the booking ask present exactly when the
conversation has resolved; that no tap target is under 34px tall at 360px; and that
`prefers-reduced-motion` removes the motion without removing the tool.

A separate lint pass reads all 576 assembled messages for repeated words,
double punctuation and length.

Both suites fail the run on any console error, not just a failed assertion.
