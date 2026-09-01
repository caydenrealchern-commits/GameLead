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

Inbox-first, and every lead in it is one the owner actually has.

```
INPUTS   industry · job value · how long cold
   │
INBOX    empty. Add up to ten leads by name, one at a time.
         Each row asks one question: what did this person do?
         Replied · Said no · Went quiet
   │
THREAD   open any answered lead and read their sequence end to end,
         with the teaching note under each message. One lead at a
         time, because ten at once is not how a campaign is read.
   │
COPY-OUT · OFFER
```

Typing the names is the only typing in the tool, and it is the point. A
sequence addressed to "Dave Wilson" reads as something you might actually
send; the same screen headed "Your old lead" reads as a demo. Inventing ten
names the owner has never met reads as a worse demo still, which is why the
tool no longer does it.

Five sends over roughly two weeks, two places a reply can arrive, three
endings:

```
Msg 1  Day 0 ─┬─ replied ────────► Msg 2a ──► booked
              ├─ said no ────────► Msg 2b ──► parked
              └─ no reply ───────► Msg 2c  Day 3
                                     ├─ replied ──► Msg 2a ──► booked
                                     └─ no reply ─► Msg 3  Day 7
                                                     └────► Msg 4  Day 14
                                                              ├─ replied ─► Msg 2a
                                                              └─ nothing ─► cleaned
```

Nothing is gated. Every thread and the full five-message sequence are free to
take, and the only call to action is booking a call to have the campaign run
at scale.

## Where a reply lands

The owner says whether a lead replied, not when. Replying to message 1 and
replying to message 4 are different conversations, so rather than ask a second
question per lead, the nth replier takes the nth reply point from a three-step
cycle: message 1, message 2c, message 4. Mark three leads as having replied
and you get one of each, in that order, then it wraps.

That is honest rather than decorative. Replies really do arrive spread across a
sequence, and message 4 (the one nobody sends) getting an answer is the single
thing the tool most wants an owner to see. Cycling puts it on screen without
inventing an outcome the owner did not choose.

The tally counts only what the owner set, so an all-silent run stays all
silent. The endings carry that case: four messages and no reply is still a
result, because you now know a name is genuinely cold.

## Tests

Two Playwright suites against the real file in Chromium.

`test.js` drives the inbox: the three-answer gate, adding leads and every
rejection (empty, whitespace-only, duplicate regardless of case, markup in a
name never rendered as HTML), the cap at ten and the input coming back after a
removal, each outcome rendering its own thread shape (send count, reply
presence and position, silence beats, day stamps), the reply point cycling
m1 / m2c / m4 across three repliers and wrapping on the fourth, the tally
matching the set outcomes including an all-silent run, threads opening at the
top and restoring inbox scroll on the way back, and the copy-out and offer with
no email asked for anywhere and no raw template token left in the pasted text.
It ends with a full-page overflow check at 360px and 390px.

`test2.js` covers what the flow cannot reach by clicking: that the page fetches
nothing and references no external script, stylesheet or image; that the Open
Graph and Twitter tags a link post depends on are present and absolute; that
all 96 input combinations assemble six whole messages with no unfilled slot, no
em dash and no spacing artifact; that all 288 thread variants (96 combos times
three outcomes) render without throwing, with the right send count and the
lead's name on screen; that no tap target is under 34px tall at 360px; and that
`prefers-reduced-motion` removes the motion without removing the tool.

A separate lint pass reads all 576 assembled messages for repeated words,
double punctuation and length.

Both suites fail the run on any console error, not just a failed assertion.
