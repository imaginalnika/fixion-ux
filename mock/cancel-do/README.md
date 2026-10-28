# 취소 / 하기: six directions (mockups only)

**Not applied to `/workspace/drdr-dr`; mockups only.** No DragonRuby code was changed, pushed or deployed.

- Thinking first: [`THINKING.md`](THINKING.md)
- Comparison board: `site/mock/cancel-do/index.html` (open it via `file://`; no server or build step)
- Per option: `site/mock/cancel-do/opt1.html` … `opt6.html`. Each has the flow in 4 frames (menu open → pick →
  gated spoken action → result), toggles for orientation / skin / language (`?o=p|l&s=color|ascii&l=ko|en`), and
  the full 2×2×2 matrix of the pick frame.
- Screenshots: `cancel-do/shots/` (390×844 or 844×390 CSS, deviceScaleFactor 2), reproduce with `node shots.js` from
  this folder. Per option: all 8 `optN-{portrait,landscape}-{color,ascii}-{ko,en}.png` (pick frame), plus
  `optN-portrait-color-ko-gated.png`, `optN-portrait-color-ko-result.png` and `optN-page.png` (the whole option
  page). Also `index.png`.

## Conclusion of THINKING.md (short)

A menu pick is a *press*, not a question. The only real question is a gated spoken action (the judge proposes,
the player confirms). v1 and v2 added a fourth and fifth control above 행동. That spot is far from the row being
confirmed, and the pair sat next to a yellow button that *leaves* when tapped, so two of three buttons in one
spot meant "leave". So the fix is a different place and gesture, not a different skin.

**Recommendation: option 2 (ACT takes the verb) with the stick's ◀ as cancel**, optionally plus option 5's "touch
the target" as an extra touch path.

## Options

| # | Title | One-line rationale |
|---|---|---|
| 1 | Stick compass | The left thumb that chooses also does and undoes: the stick's dead ◀ ▶ become 취소 / 하기, and the deck gains no control. |
| 2 | ACT takes the verb | The big yellow button finally means "do": its face reads 하기 and the verb sits on its rim, so one press does exactly what you read. |
| 3 | The row is the button | You confirm on the words you are confirming: the lit row grows a 하기 end and the card gets its own 취소, so nothing is added to the deck. |
| 4 | Hold fuse | Committing becomes a take, like the mic: hold ACT and the lit row fills; let go early and nothing happened. No second button exists. |
| 5 | Touch them | The confirm lives in the scene, not the chrome: the target's reticle opens into a gate with the verb, and you do it by touching them. |
| 6 | ACT collar | If the pair must stay by ACT, make it part of ACT: one crescent hugging its rim, 취소 \| 하기, opening away from the mic. |

## DragonRuby / HTML5 notes

Everything is discs, rings, lines, labels and additive glow (the existing `Draw.disc/ring/glow/label`, `thick`).
No shaders anywhere. Things that need more than today's primitives:

- **1 Stick compass**: the rim notches are ring *segments*. `Draw.ring` draws full rings, so you need a segment
  helper (a run of `thick` strokes, like `button10`'s countdown arc already does) or a pre-cut sprite. It also
  needs a dominant-axis rule in `tick_pad` so a sloppy ▼ never commits.
- **4 Hold fuse**: tick arcs are the same `thick`-stroke arcs as the existing auto-confirm countdown. The input
  needs a hold timer on ACT that yields to drag-to-aim once the touch moves past `AIM_DEAD`.
- **6 ACT collar**: a filled annulus *segment* (two zones) has no primitive today. Either pre-render two
  crescent sprites (tinted per skin) or approximate with many `thick` strokes. The hit test is an
  angle-plus-radius check around ACT.
- **2, 3, 5**: no new drawing capability (labels, rects, existing brackets). 2 and 5 change the meaning of a
  tap on ACT in Act mode (from leave to do, or leave stays), which is a `tick_pointer` change, not a rendering one.

## Housekeeping / deviations

- `cancel-do.js` is not "tiny": it is the single shared SVG renderer that draws every phone (all options, frames,
  orientations, skins, languages) from `layout.rb`'s numbers. I chose this over 6×32 hand-written static phones;
  the output is still static (no animation, no build step).
- Copied the game's Hangul font (`notosansmonocjkkr-{regular,bold}.otf` + OFL) from `drdr-dr/mygame/fonts` into
  `site/assets/fonts/` so KO text renders as in the game. Nothing in `drdr-dr` was modified.
- Landscape uses a 1558×720 logical canvas (844×390 phone) with `layout.rb`'s landscape branch (map centred-left,
  pad / mic / ACT in a row in the right column at y≈540, feed in the left column).
- The map is a simplified 루이 뉘똥 shop. Only the deck, the menu card, the slot and the confirm affordances are
  meant to be accurate.
- No video, no Codex, no push/PR. Playwright from `/workspace/fixion-build/node_modules/playwright`; nothing installed.
