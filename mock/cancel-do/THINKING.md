# 취소 / 하기: what confirm and cancel should be in Fixion

Written before any mockup. Sources: `drdr-dr/docs/philosophy/{PHILOSOPHY,UX_IMPLICATIONS}.md`, `action_ui.rb`
(`draw_strip10`, `button10`), `player.rb` (`cancel_do_strip`, `tick_pointer`, `confirm_choice`, `cancel_choice`,
`pend`), `layout.rb`, the two rejected frames (v1 `agent-runs/cancel-do-current-frame.png`, v2
`grokbot-handoff/fix11-phone/K-cancel-do-redesign.png`).

## 1. What the two decisions actually are

There are two different moments, and the current UI treats them as one.

**A. A menu pick.** The player has moved the stick to a row they can read (부르기, 빤히 보기 …). The intent is theirs,
it is fully visible, and nothing was interpreted. Asking "are you sure?" here costs a second tap for no
information gained. Principle 9 (timing is most of the feel) and UX_IMPLICATIONS §"Confirm / cancel" ("confirm
every menu pick: safer, slower; against principle 9") both say: **a pick is not a question, it is a press.** What
it needs is one control that means "do the lit row", plus a way back.

**B. A gated spoken action.** The player said something; Jev judged it and the label landed in the slot,
possibly rewritten ("뺨 한 대 갈겨" → "뺨 때리기"). `pend` holds it when it is hostile, unsure, or uses an item.
This is the only real question in the flow: *the judge proposes, the player confirms* (principle 5, intent in,
outcome out; and the mishearing incident where "양으로 갈겨" hit 젬마 for 3). Here the player is not saying
"go". They are saying "yes, that is what I meant". So the confirmation belongs **to the words in the slot**.

So "confirm" means two things: *commit the row I chose* (fast, no question) and *accept the judge's reading*
(a real question, rarer, must be deliberate for harm). "Cancel" also means two things: *back out of the menu*
(leave Act mode, nothing done) and *reject the judge's reading* (drop the slot, stay in the menu). A good design
makes the first of each almost invisible and the second unmistakable.

## 2. What the philosophy rules out

- **You are the one character the author does not control.** Committing is the one place the player writes into
  the screenplay with their own hand. It should feel like a *take* (the push-to-talk mic already does: hold,
  release, it went in), not like dismissing a system dialog. An OK/Cancel alert says "the software is asking
  you". Fixion should feel like "you are about to do this in the room".
- **The scene stays visible.** Whatever confirms must not cover the target, the menu card or the slot. It also
  must not push the feed off (today `feed_clear_of` shrinks the feed to make room for the pair above ACT).
- **One hand, three controls** (UX_IMPLICATIONS #3): stick, mic, ACT. "fix10's green/red confirm buttons must not
  become a fourth control that lives permanently on the deck." v1 and v2 are exactly that: a fourth and fifth
  control, present for the whole of Act mode.
- **Feel over information** (#4): a confirmation step adds latency between intent and the author's answer, "it has
  to be short or skippable".
- UX_IMPLICATIONS already names the cancel: *"the walk pad's left (back) should remain cancel so one hand still
  does everything."* In Act mode the pad's ◀ and ▶ are dead today (`pad_glyph` hides them). That is free space
  in exactly the right place.

## 3. Why v1 and v2 (and "above 행동") felt wrong

1. **They are app chrome.** v1 is a red/green rectangle pair, the stock bottom-sheet strip. v2 is a pair of iOS-ish
   filled discs with soft rims. Neither borrows anything from the deck's own language (mint ring stick, violet ✦
   mic, amber ACT, letter glyphs). They read as "a dialog was opened", not "the deck changed mode".
2. **They are detached from what they confirm.** The thing being confirmed (the lit row or the slot) is on the
   map, top left. The ✓ is on the deck, bottom right, ~450 css px away, and it says only "하기", not *what*.
   The eye has to go card → deck → card.
3. **ACT has two neighbours that do ACT's job.** In Act mode the yellow 행동 disc *leaves* when tapped, the green
   하기 right on top of it *does*, and the red 취소 also leaves. Three buttons in one thumb's spot, two
   meaning "leave", and the biggest, brightest one (yellow) is the one that does *nothing*
   with your choice. That is why "above 행동" reads as weird even if the buttons were beautiful: it stacks two
   meanings onto one spot, and the strongest-looking button has the weakest meaning.
4. **They are always there.** The pair shows the whole time the menu is open, including while you are still
   browsing, so it reads as a permanent fourth/fifth control instead of a moment.
5. **They eat the feed.** The pair sits where the feed's last lines are, so the feed is shoved up exactly when
   the △ line you are about to cause will appear.

## 4. Thumb reach

**Portrait 390×844, both thumbs.** The deck row is at y ≈ 653 css: stick centre x ≈ 61 (left thumb), mic x ≈ 195,
ACT x ≈ 331 (right thumb). The map (menu card, target, slot) is y ≈ 130–500: reachable with a stretch of either
thumb, not comfortably, and reaching up covers the screen with your hand. So:

- *Easy zone*: the stick (left thumb, directional, so the "hit target" is a whole half of the stick) and ACT
  (right thumb, r ≈ 30 css, already where the thumb rests).
- *Stretch zone*: anything on the card or at the target. Fine for an optional tap, bad as the only way to commit.
- *Danger zone*: anything between mic and ACT. The mic is the main verb (principle 4); a mis-hit there starts a
  take. v2's 취소 disc hangs over that gap.

Stick gestures are the most forgiving target there is. A flick left is a 40 css px half-disc you cannot
miss, and it needs no eyes. The risk is a sloppy diagonal while scrolling ↑↓. Fix it with dominant-axis
detection and, for ▶ = do, a deliberate push past ~60 % of the throw.

**Landscape.** In `layout.rb` all three controls sit in one horizontal row low in the right column (pad 1176,
mic 1300, ACT 1424 on a 1558-wide logical canvas, y ≈ 530). On a phone held sideways the *right* thumb covers
both the pad and ACT, and the left thumb has the feed column (no controls). So "left thumb cancels, right thumb
confirms" does not hold in landscape. Anything stick-based works one-thumbed. Anything around ACT must not grow
left into the mic, so ACT-anchored shapes have to open up and to the right.

## 5. What follows

1. **A menu pick commits with a control the player already uses.** It should take no second tap and no new button.
   The obvious candidates are ACT itself (A-to-confirm muscle memory, and the yellow button finally means "do"),
   the stick's dead ▶, or tapping the lit row or the target.
2. **Back-out lives on the stick's ◀** (UX_IMPLICATIONS said so) and on tapping empty floor. Tapping ACT to leave
   is fine *only* if ACT is not also the commit.
3. **The gated question is answered where it is asked**, at the slot, or with a control whose face carries the
   slot's label, and harm needs a deliberate gesture (a hold or a second push), not a lucky tap.
4. **Whatever shows "하기" also shows *what*.** The verb is printed on or next to the commit control.
5. **It appears only when there is something to do** and in the deck's own materials (mint ring, amber disc,
   letters), so the ASCII skin can draw it with rings, lines and glyphs, and shape and position carry the
   meaning (◀ left / ▶ right, ✕ / ✓), not red/green alone.

## 6. The options this produces

Each option is a different *place* and *gesture*, not a different skin:

| # | Title | Where | Pick commits by | Cancel / leave by | Gated slot |
|---|---|---|---|---|---|
| 1 | Stick compass | the stick's dead ◀ ▶ | push ▶ | push ◀ (ACT tap still leaves) | push and hold ▶ (short fuse on the notch) |
| 2 | ACT takes the verb | ACT's face | tap ACT (face reads 하기, verb above it) | stick ◀, or tap floor | same tap; face shows the slot's label |
| 3 | The row is the button | the menu card | tap the lit row's 하기 end | ✕ tab on the card, tap floor, ACT | the slot itself has ✕ and ✓ ends |
| 4 | Hold fuse | ACT, mirrored on the row | hold ACT, row fills, full = done | let go early (nothing happens); quick tap leaves | longer fuse |
| 5 | Touch them | the target's reticle | tap the person (gate shows verb ✓) | tap empty floor; ACT leaves | gate turns red, same tap |
| 6 | ACT collar | one crescent on ACT's upper rim | tap the collar's 하기 half | tap its 취소 half | collar stays, verb chip shows the label |

Option 6 is the one that keeps the pair by ACT, done as *part of* ACT (one object, opening away from the mic) so
Josh can compare the "fix the look" answer against the "fix the model" answers.

**My recommendation** (also in README): **2 (ACT takes the verb) with 1's ◀ cancel**. It has the fewest new
concepts: ACT opens the menu, the stick chooses, ACT does it, the stick backs out. It adds no new
object to the deck and costs nothing on the common path, and the gated case gets the slot's label on ACT's face. 5's tap
on the target is a good *extra* path for touch players on top of 2.
