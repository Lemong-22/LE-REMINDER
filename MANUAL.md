# LE-REMINDER — User Manual

A personal routine/task dashboard, for exactly one person: you. This is a
plain-language guide to using the deployed app — for how it's built or
deployed, see `CLAUDE.md` / `DEPLOY.md` / `CONTEXT/RETROSPECTIVE.md`
instead.

---

## Signing in

Go to the production URL and click **Continue with GitHub**. Only the one
GitHub account tied to `ALLOWED_EMAIL` can ever get in — anyone else's
GitHub login is rejected automatically, no matter how they reach the
login page. Once you're signed in, the session stays valid on that
device until you sign out or the session expires; signing in on a second
device (phone + laptop, say) doesn't affect the first one — both stay
signed in independently.

---

## The Home tab

**Daily Task** (top-left card) is a quick checklist of just your *Daily*
routines (the ones on a Fixed Calendar / Daily schedule) — check one off
here and it completes the same routine shown in the grid below; it's a
shortcut, not a separate list.

**Overall Progress** (top-right card) is a live count of every routine's
current status across the whole account — not just today's dailies.

**Routines** (the card grid) is every routine you've created, sorted by
urgency (Overdue first, then Due, then everything else). Each card shows:

- Its current **status** (see below) and **category** badge
- What kind of schedule it's on, in plain text (e.g. "Daily", "Every 3
  days", "Weekly · Mon, Wed, Fri", "Monthly · day 1")
- When it was last completed

**On desktop**, hover a card to reveal Complete / Pause / Edit buttons.
**On a phone**, tap the card once to reveal the same buttons — tap
anywhere else (or tap one of the buttons) to hide them again.

**Today's To-Do** (right sidebar) is a separate, plain scratchpad — type
anything in the box and hit **+** to add it. It's tied to your account
(so it's the same list on every device), but it's deliberately *not* a
routine: no schedule, no status, just a checkbox and free text. Click
**Edit List** to reveal a delete (×) button next to each item.

---

## Creating or editing a routine

Click **+ New Routine** (or **Edit** on an existing card).

**Name** — whatever you want to call it.

**Category** — free text, not a fixed list. Type anything (it's saved
exactly as typed). The pills underneath are one-tap suggestions, not the
only allowed values — they're built from whatever categories you've
already used across your routines, so anything you type once shows up
as a suggestion the next time you create or edit a routine.

**Task Type** — pick one:

- **Fixed Calendar** — repeats on a schedule you set: Daily, Weekly (pick
  which days), or Monthly (pick a day of month, 1–31).
  - **Mandatory** toggle: if on, missing an occurrence keeps the routine
    **Overdue** until you complete it — it doesn't quietly reset when the
    next occurrence starts. If off, a missed occurrence just goes back to
    **Due** for the next one.
- **Rolling Interval** — due a fixed number of days/weeks/months *after
  you last completed it*, rather than on a calendar date. Good for things
  like "replace every 3 months" that don't care what day of the week it
  lands on.
- **One-off** — happens once. Optionally give it a deadline; without one
  it just stays **Due** until you complete it whenever.

Click **Save Routine**. Editing an existing routine uses the same
dialog — it opens pre-filled with its current values. **Delete Routine**
(bottom-left of the dialog, only shown when editing) removes it for good.

---

## Understanding status

| Status | Meaning |
|---|---|
| **Overdue** | Missed and (for Fixed Calendar routines) mandatory, or a One-off/Rolling-Interval task past its due point. |
| **Due** | Not yet completed for the current period, not yet overdue. |
| **Done** | Completed for the current period (Fixed Calendar/Rolling Interval). |
| **Paused** | Manually paused — won't show as Due/Overdue no matter what the schedule says, until you resume it. |
| **Finished** | A One-off task that's been completed — it's done permanently, not "done for now." |

Completing a routine always records the fact (a `CompletionEvent`) even
though today's dashboard only shows current state, not history — that
history is there and preserved for whenever a future version of this app
wants to show it.

---

## All Tasks tab

A flat table of every routine — same data as the Home grid, denser, no
hover actions. Useful for scanning everything at once rather than
browsing card by card.

## Analytics tab

Not built yet — the dashboard currently only computes and shows *current*
state (Due/Overdue/Done/etc.), not trends or streaks over time.

---

## Sync across devices

Routines and Today's To-Do are both stored in the database, not on your
device — open the dashboard on your phone and your laptop at the same
time, and a change on one appears on the other within about 5 seconds,
no manual refresh needed. Switching back to a tab that's been in the
background also triggers an immediate refresh the moment it's visible
again, so you're never looking at stale data for long either way.

## The idle dimmer

If the dashboard sits untouched for 5 minutes on a desktop or tablet
screen, it dims to near-black (fading in, then fading back out the
moment you touch it again) — meant for a screen that's mounted somewhere
and left on all the time, to reduce glare/burn-in risk. This is
deliberately skipped on a phone, since a phone was never at risk of
screen burn-in and the dim would just be a strange thing to see when you
pick it back up.

## What this app does *not* do

LE-REMINDER computes and displays state — it does not push notifications,
send emails, or alert you about anything by itself. If you're expecting a
buzz on your phone when something goes Overdue, that's HERMES-AGENT's job
(a separate system), not this app's — this dashboard is the source of
truth it reads from, not the thing doing the alerting.

## The Agent API

There's a small automation surface (`/api/agent/routines`,
`/api/agent/todos`) that lets VIN, your automation agent, read and create
routines/todos on your behalf, authenticated with a bearer secret rather
than your GitHub login. You won't interact with this directly through
the UI — it exists for VIN, not for you to call by hand.
