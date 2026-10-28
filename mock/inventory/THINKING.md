# Inventory at the top: thinking before drawing

Written 2026-10-28 before any mockup HTML. Sources: `drdr-dr/docs/philosophy/*`, `drdr-dr/mygame/app/layout.rb`,
`fixion-ux/site/` (proposal, fix brief, mocks), `fixion-ux/cancel-do/`, `inventory/refs/` (c11, c12, c15, pickup_01…08).

## 0. The tension to respect

PHILOSOPHY.md §8 (anti-goals): *"No quest log, no visible stats, no inventory bar (removed in fix3; items are rows
in the action menu)."* layout.rb still carries the scar: `# the left column (no item bar any more)`.

So Josh is not asking for the fix2 item bar back. He is asking for something that obeys the rule *"HP hidden until
it matters"* applied to things you carry: **nothing until the story hands you something, and then only as much UI
as the story has earned.** That is the bar every option below has to clear:

- Empty world → zero pixels of inventory. Not a dim outline, not a "0", not a bag icon.
- Using an item stays where it already is: the ACT menu's item rows ("Give the rose"). The top tray is a
  **display + memory** surface (what you have, what you wear), not a new verb. That keeps the three-control rule
  (UX_IMPLICATIONS §3): pad, mic, ACT. The tray is a fourth *thing to look at*, never a fourth thing you must press.

## 1. Where it lives relative to the existing header

Portrait (720 logical wide, layout.rb):

```
top            = screen_top − 88            # already clear of the notch / status bar
header         = y top−64 … top,  h 64      # [● LIVE r1][scene title ………]   [♪ on] [⚙]
                                            #  ♪ at x ≈ 586 (gear.x − r − 66), ⚙ at x 676, both y top−32
headroom       = y top−156 … top−64, h 92   # "the space above is headroom for speech cards"
map row 0 top  = map_y = top − 156
```

The header strip itself is full: status chip (x 16–180), scene title (x 196–~400), ♪ (≈ 568–660), ⚙ (652–700).
What is left (≈ 400–560) fits three 44-px slots at most, and the title would collide in EN.

**Decision, portrait: the tray hangs from the header, in the top of the 92-px headroom, centre line y = top − 96.**
It reads as part of the top bar (it touches the header's bottom hairline) but does not replace or squeeze the
header. Slots are r 22 (44 logical ≈ 24 css px), so the tray band is y top−120 … top−72; the bottom 16 px of
headroom stays empty above the map, and the map itself is never covered when collapsed.

Speech cards over row-0 actors also use that headroom. Rule: **cards win.** A speech card draws over the tray, and
the tray drops to 35 % alpha while a card overlaps it (it is a display; nothing is lost). The fly never targets a
slot that is under a card: the item waits at the end of its arc for ≤ 0.4 s, or lands anyway at 35 %.

Landscape (layout.rb: header h 52, `map_y = h − 66`, gear `x: w − 36, y: h − 26`, ♪ `gear.x − r − 54`):
there is only 14 px between header and map, so **in landscape the tray shares the header strip**, centre line
y = h − 26. The strip is wide: title ends ≈ x 400, ♪'s hit box starts at gear.x − 92 (≈ 1430 on a 1558-wide phone,
≈ 1152 on 1280). Everything between is free and sits directly above the map column. Slots shrink to r 18.

Notch / safe area: layout.rb already pushes `top` down 88 logical when `allscreen_top` is taller than 1280, so the
tray inherits the header's safe area for free. On landscape phones the notch is on the side; the tray is centred
or anchored to the map, never to the screen edge, so it never meets the notch.

## 2. Thumb reach: mostly a display

On a 390×844 phone the tray is ≈ 90 css px from the top: the far corner of a one-handed grip. That is fine because:

1. **Items arrive there by themselves** (the fly). Nothing is asked of the thumb.
2. **Items are used from the ACT menu**, as now (one row per carried item on a person). The menu is near the target
   and driven by the stick; the tray is not needed to use anything.
3. **Inspecting is rare and two-handed-OK**: tap the tray (anywhere on it, one 64-px-tall hit strip, not per slot)
   → it **expands downward** into a card over the top of the map listing names (and the one-line story of each
   item, if the scribe gave one). Tap the tray again, or anywhere outside the card, to fold it. No new control,
   no cancel button: the stick ◀/▶ stay the cancel/do of Act mode and are untouched.
4. Long-press a single slot = its name in a small tag under it (a peek, no card). Same gesture for equipment.

Equipment does **not** get a different gesture: the open card has two sections (장비 / 소지품). One gesture, one card.

Optional nicety (not drawn): when the ACT menu's lit row is an item row ("장미 건네기"), that item's slot in the tray
glows faintly, so the tray answers "which rose?" without ever being touched.

## 3. Appearing on first need

The tray does not exist until the first pickup. The debut beat is the fly itself:

1. Pickup (tick 0): the item lifts off its tile (5 ticks, +12 px, scale 1 → 1.25).
2. Slot materialises (≈ tick 26, 8 ticks before landing): six `·` dots spin in from r × 1.8 and settle into the
   slot ring, the 글자들 dot ring the game already uses for landed actions. In ASCII: `[` then `]` type in.
3. Land (≈ tick 34): the item drops into the ring, overshoots 1.15 → 1.0 (7 ticks), a soft additive glow swells
   and fades (18 ticks). ASCII: the bracket contents churn `[:]` → `[.]` → `[*]` (3 ticks each).
4. Nothing else. No toast, no "item added" banner. The feed already gets the △ line ("△ 당신이 카드를 줍는다.").

Later pickups reuse 1 → 3 with the slot appearing at the next packing position (see each option's SPEC).

## 4. Equipment vs items

Items are *carried* (rose, key, card, coin). Equipment is *on you* (worn coat, held umbrella/knife). The difference
must read without colour:

- **Colour**: items get the inventory accent **parchment `#e9dcbc`** (the script's paper, warm, never app-blue,
  distinct from ACT's amber so nobody thinks items went "into" ACT). Equipment gets **mint `#6fe2c7`**, the @'s own
  colour: what you wear is drawn in your colour. Diegetic, and it ties the top tray to the player on the map.
- **Shape**: item slots are discs; equipment slots are discs with a second, wider ring (a "worn" halo).
  ASCII: items `[*]`, equipment `{[}` (curly = on the body).
- **Arrival**: equipment is only unlocked when the story first puts something on you ("△ 점원이 당신에게 코트를
  입혀 준다."). Until then there is no equipment zone at all. Each option decides *where* it opens.

## 5. The item-fly (common to every option; targets differ)

- **Path**: quadratic Bézier from the pickup tile centre P0 to the slot centre P2, control point
  `P1 = (lerp(P0.x, P2.x, 0.3) + side·80, P2.y + 80)` in logical y-up coords (a little *above* the slot line),
  `side = +1` if the slot is right of P0, else −1. The item swings out, rises ≈ 6–10 px past the slot line and drops into it,
  which is the "slight arc up then settle" and makes the landing read as *into* the tray rather than *at* it.
- **Duration**: lift 5 ticks (83 ms) + flight `clamp(18 + dist/30, 24, 34)` ticks (400–570 ms) + settle 7 ticks
  (117 ms). Typical portrait pickup (≈ 650 px) ≈ 46 ticks ≈ **770 ms** door to rest.
- **Easing**: flight `t' = easeOutCubic(t)` (fast leave, soft arrival); scale 1.25 → 1.0 along the flight.
- **Trail**: three ghost copies of the item sprite/glyph at t − 0.06, − 0.12, − 0.18, alpha 0.45 / 0.25 / 0.12.
- **Everything is HTML5-safe**: one sprite or label per item, `lines` for nothing at runtime (the dashed path in the
  mockups is an annotation only), the existing `glow.png` with additive blend for the swell, discs = the circle
  sprite the deck already uses, dots = labels. **No shaders, no render targets.**

The current r2 pickup sends the item to ACT (pickup_01…08). The only engine change implied is the target point of
that tween and the slot drawing; the lift / glow pieces already exist in the SFX/VFX pass.

## 6. ASCII equivalents

| Colour affordance | ASCII |
|---|---|
| parchment item disc | `[x]` brackets in parchment-tinted text, the item's glyph inside |
| mint equipment disc + halo | `{x}` curly brackets in mint |
| slot materialising (dot ring) | `[` then `]` type in, 3 ticks apart |
| land glow | contents churn `:` → `.` → glyph; brackets bold for 10 ticks |
| fly trail | the glyph plus two `·` behind it |
| overflow | `+3` |
| open card | box-drawing frame `┌─┐` with `> ` on the hovered line, like the ASCII action menu |
| new item (unseen) | a trailing `'` (prime) instead of a dot |

Item glyphs (ASCII skin, roguelike-ish, no clash with the map's `# . = T h & o b +`):
card `c`, key `k`, coin `$`, rose `*`, coat `[` (equip), umbrella `/` (equip).

## 7. Conflict check

- **Cancel/do on the stick ◀/▶ (option 1, axis-locked)**: the tray uses no stick direction and adds nothing to the
  deck. The deck in every mockup is the current one (stick ring mint 메뉴/MENU, violet mic 행동 말하기/ACTION,
  amber ACT 행동/ACT), untouched.
- **Green speaking-dot over the player**: drawn in the "several items" frame to show the two coexist. The fly
  starts at the pickup tile, not at the @, and leaves upward within 3 ticks, so it never sits on the dot.
- **ACT no longer receives items**: removing that flight also removes a false affordance (items "in" ACT implied
  ACT was a bag).
- **Speech cards / live banner**: cards over row-0 actors draw over the tray (it dims). `live_banner` sits at
  `header.y − 84` portrait, i.e. over the headroom too: the banner is transient; the tray dims under it.
- **Settings sheet**: unaffected; ⚙ and ♪ keep their positions and hit boxes in every option.

## 8. The three directions this leads to

- **A · Two pockets** (Josh's idea A): items pack right→left from under the ⚙; equipment packs left→right from the
  left edge; the middle stays empty over the stage. Most legible; a bit "toolbar".
- **B · The growing shelf** (Josh's idea B): one centred tray that grows from the middle. 1 item = one lonely slot;
  3+ = a hairline shelf appears under them; equipment unlocked = the items part like a curtain and a larger mint
  "hand" ring opens in the centre. The UI literally grows with the story.
- **C · The slug line** (mine): Fixion is a screenplay, and the chapter text already carries held items. So the
  inventory is the player's character slug, typed at the top: `YOU (card, key, coin)`, and later
  `YOU, in a coat, holding an umbrella (card, key, coin)`. Items fly up as their *letters* and churn into the word.
  Text-only: the cheapest in DragonRuby and native to the ASCII skin.

Leaning before drawing: **B**, borrowing C's letter-churn for the ASCII landing and C's slug as the text inside B's
open card. A is the safe fallback if Josh wants equipment always separable at a glance.
