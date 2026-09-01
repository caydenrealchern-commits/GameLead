# Owner-Entered Inbox

**Date:** 2026-08-31
**Status:** Approved, ready for implementation plan

## The problem

Two defects, both reported by the owner after using the live tool.

**Invented names.** The tool asked for one lead name, then "See it run across ten"
produced nine strangers from a hardcoded list. A business owner looking at Priya K.
and Gary P. is looking at people who do not exist and do not belong to them. It
reads as a canned demo at exactly the moment the tool is trying to make the
campaign feel like theirs.

**One clock for ten conversations.** The reveal advanced all ten leads together by
send day. Every lead sat on the same message on the same day. Real campaigns do
not behave that way: a lead who books on day 0 has a two-message conversation
while a silent lead gets four sends, and those two things are not synchronised.
Presenting them in lockstep was confusing.

A third item, requested at the same time: the SMS copy should read more like a
person wrote it.

## Decisions

Taken with the owner during design, recorded here because each closes off an
alternative that would otherwise look reasonable later.

**The owner adds up to 10 of their own leads.** No name is ever invented.

**The owner sets each outcome from the inbox**, with a three-way choice per lead:
replied, said no, went quiet. Roughly ten taps for a full list. The alternative,
stepping through all ten sequences, is twenty decisions and over ten minutes, so
it was rejected as a different kind of confusing.

**Outcomes start blank.** Considered and rejected: pre-filling a realistic spread.
The owner wants to set every one themselves. The risk this accepts is a run where
every lead is marked silent, which is mitigated in copy rather than by forcing
outcomes (see Ending below). Nothing is faked.

**Teaching notes move into the threads.** They currently live in a guided
walkthrough that this design removes. Each message in an opened thread carries its
"why this works" note beneath it, so the lesson arrives while the owner is looking
at a named person they actually know.

**Reply timing is assigned, not asked.** A lead marked "replied" still needs a
point in the sequence where the reply landed, because replying to message 1 and
replying to message 4 are different conversations, and the message 4 reply is the
most persuasive thing in the tool. Asking a second question per lead would double
the taps. Instead the nth replier is assigned the nth reply point, cycling
message 1, message 2c, message 4. It is honest, since that is how replies arrive
across a real sequence, and it means an owner who marks three leads as replied
sees the message 4 booking without being asked anything extra.

## Structure

```
1. THREE QUESTIONS     industry, job value, how long cold        (unchanged)
2. YOUR INBOX          add up to 10 leads by name
                       each unset row: "What did Dave do?"
                       [ replied ]  [ said no ]  [ went quiet ]
                       tally builds live as outcomes are set
3. A LEAD'S THREAD     that lead's full conversation for their
                       outcome, one teaching note per message
4. DONE                copy the five messages, book a call
```

## Data model

A single flat array replaces the campaign builder.

```js
S.leads = [ { name, outcome, replyAt } ]
```

- `name`: owner-entered, trimmed, whitespace-collapsed, escaped on render.
- `outcome`: `null` until set, then `'booked' | 'declined' | 'noreply'`.
- `replyAt`: only meaningful when `outcome === 'booked'`. Assigned at set time
  from the cycling counter: `'m1' | 'm2c' | 'm4'`.

Thread shape is derived from `outcome` and `replyAt`, reusing the existing
`threadFor` logic:

| Outcome  | replyAt | Sends                     | Reply | Ends        |
|----------|---------|---------------------------|-------|-------------|
| booked   | m1      | m1, m2a                   | 1     | Booked      |
| booked   | m2c     | m1, m2c, m2a              | 1     | Booked      |
| booked   | m4      | m1, m2c, m3, m4, m2a      | 1     | Booked      |
| declined | n/a     | m1, m2b                   | 1     | Declined    |
| noreply  | n/a     | m1, m2c, m3, m4           | 0     | No reply    |

Every message in the library is still reachable, and a silent lead still shows all
four sends with all four notes. The teaching survives even an all-silent run.

## Screens

**Inbox.** Add field plus list. An unset row shows the lead's name and the
three-way choice inline. A set row shows a status chip and opens the thread on
tap, with a way to change the outcome. Tally line above the list counts what has
been set. Add control disappears at ten. Continue is available once at least one
lead has an outcome.

**Thread.** Read-only conversation for one lead: day stamps, outgoing messages,
the reply if there is one, and a teaching note under each outgoing message. Back
returns to the inbox at the scroll position it was opened from.

**Ending.** Adapts to what the owner actually set, and never claims a rate. If
nothing booked, it says so plainly and points at what the run still proved: the
list is now known rather than assumed, and message 4 is where unexpected answers
come from. The offer is unchanged.

## Copy rewrite

The messages gain the single largest naturalness improvement available to them:
the owner now types real names, so a message can open with one. This was
impossible before. It is a bare first name, not a merge-tag pleasantry, so it does
not reintroduce the "Hi {{name}}, hope you're well!" pattern the original spec
banned.

Direction across all 96 variants:

- Open with the lead's first name.
- Cut self-justification. The current message 1 explains why the sender is
  messaging before asking anything; a real text does not.
- Shorter sentences, more contractions, fewer subordinate clauses.
- Keep the industry specificity. The failure test still applies: a message that
  could be sent unchanged to another trade has failed.

Before and after, roofing at the top value band, cold over a year:

> **Now** hi, it's [your name] at [your business]. out of the blue, i know: we
> quoted you for the roof over a year ago. i'm going back through old enquiries
> that never got a straight answer. did it ever go ahead? a no is a completely
> fine answer.

> **After** hi Dave, it's [your name] from [your business]. bit random, but we
> quoted you for the roof a while back and i never heard either way. did you get
> it sorted?

## Deleted

- `buildCampaign` and its fixed 3/1/6 pool
- `COPY.campaign.names` and every invented name
- the global day clock: `S.dayIdx`, `CONFIG.revealDays`, `RESOLVE_DAY`,
  `tally()`'s day argument, the day reveal controls and day notes
- the guided walkthrough: `GRAPH`, `pushChain`, `openOpts`, `stageOfTrail`,
  `screenWalk`, `screenEnd`, `S.trail`, `S.history`, `S.leadIdx`,
  `S.leadOutcomes`, `CONFIG.act1Leads`
- `CONFIG.act2.framing` / `enterCta` and the act 1 to act 2 transition

## Unchanged

Single self-contained file, no dependencies, no network requests, no email gate,
booking as the only call to action, the existing Calendly URL, light theme, no em
dashes, mobile-first at 390px with 360px support, `prefers-reduced-motion`,
`prefers-contrast`, and the layered copy architecture
(`buildSequence(industry, valueBand, coldBand)`).

## Testing

- Adding, renaming and removing leads; the cap at ten; empty and whitespace-only
  names rejected; markup in a name never rendered as HTML.
- Every outcome renders the right thread: correct send count, correct reply
  presence and position, correct ending.
- Reply-point cycling: three leads marked replied produce one message 1 reply,
  one message 2c reply and one message 4 reply.
- Tally matches the set outcomes exactly, including an all-silent run.
- Every thread opens and closes, restoring inbox scroll position.
- Continue reaches the copy-out and offer with no email asked for anywhere.
- No console errors, nothing clips at 360px, reduced motion usable.
- Copy lint across all 96 combinations; no message byte-identical across two
  industries; every message opens with the lead's name.
