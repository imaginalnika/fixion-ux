# Inventory at the top: three directions

**Not applied to `/workspace/drdr-dr`; mockups only.** Static HTML/SVG + Playwright screenshots.

- Board: `site/mock/inventory/index.html` · options: `optA.html`, `optB.html`, `optC.html` (toggles: orientation × skin × language; `?solo=1&f=0..5` = one phone)
- Renderer: `site/mock/inventory/inventory.js` + `inventory.css` (fonts from `site/assets/fonts/`, no external fetches)
- Thinking: `inventory/THINKING.md` · shots: `inventory/shots/` · rebuild: `cd inventory && node shots.js`

Frames on every page: **0 empty** (zero chrome) · **1 first pickup in flight** (dashed path = annotation) · **2 first slot** · **3 several** (with the green speaking-dot) · **4 equipment unlocked** · **5 tapped open**.

## Options

| | Title | One line |
|---|---|---|
| A | Two pockets / 두 주머니 | Josh's A: items pack right→left from under the ⚙, equipment left→right from the left edge; the middle stays open over the stage. |
| B | The growing shelf / 자라는 선반 | Josh's B: one centred tray that grows with the story — a lone slot, then a hairline shelf, then a mint "hand" ring parts the items when the story first dresses you. |
| C | The slug line / 등장인물 줄 | Mine: the inventory is your screenplay character slug — `YOU, in a coat (card, key, coin)` — typed at the top; items fly up as their letters. |

**Recommendation: B**, with C's letter-churn as the ASCII landing and C's screenplay block as the text of B's open card.

Shared decisions (see THINKING.md): portrait tray hangs under the header in the 92-px headroom (header, ⚙, ♪ untouched; map not covered); landscape tray shares the 52-px header strip between title and ♪. Using items stays in the ACT menu; the tray is a display, tap = open downward, long-press slot = name. Speech cards / live banner draw over the tray (it dims to 35 %). Items = parchment `#e9dcbc` discs / `[x]`; equipment = mint `#6fe2c7` discs + halo / `{x}`.

## SPEC: item-fly targets (logical game coords, y up)

Portrait w 720, `top = screen_top − 88` (header `top−64…top`, ⚙ `(676, top−32)`). Landscape header `h−52…h`, ⚙ `(w−36, h−26)`, ♪ hit box starts at `w − 128`.

**Timing (all options):** lift 5 ticks (83 ms, +12 px, scale 1→1.25) · flight `clamp(18 + dist/30, 24, 34)` ticks (400–570 ms), easeOutCubic, quadratic Bézier with `P1 = (lerp(P0.x, P2.x, 0.3) + side·80, P2.y + 80)` (side = +1 if the slot is right of the pickup) — swings out, rises 6–10 px past the slot line, drops in · settle 7 ticks (117 ms, scale 1.15→1.0). Typical ≈ 770 ms. Trail: 3 ghosts at t−0.06/−0.12/−0.18, alpha 0.45/0.25/0.12.

### A · Two pockets
- Portrait first item **(676, top − 96)**, r 22 (under ⚙). Next: `x = 676 − 56·i` (right → left), 6 visible, the 6th becomes `+n`.
- Portrait first equipment **(44, top − 96)**, r 22 + halo r 28. Next: `x = 44 + 56·j` (left → right), 3 visible.
- Landscape first item **(w − 168, h − 26)**, r 18 → (1390, 694) at w 1558, (1112, 694) at w 1280. Next: `x = w − 168 − 46·i`.
- Landscape first equipment **(max(map_x + 30, title_end + 40), h − 26)** → (469, 694) at w 1558. Next `+46·j`.
- On land: slot debut = 6 dots spin in from 1.8 r, 8 ticks before arrival · land = glow.png additive, r 1.0→1.6, alpha 160→0 over 18 ticks · ASCII: brackets type in, contents churn `:` `.` glyph (3 ticks each).
- Envelope (4th item, after card/key/coin; `optA-envelope-*.png`): lands **(508, top − 96)**, r 22 = `676 − 56·3`, left of the coin.

### B · The growing shelf
- Portrait first item **(360, top − 96)**, r 22.
- Next items (no equipment yet): n = count after pickup, `x_i = 360 + (i − (n−1)/2)·56`; the new item takes the right end, older slots slide −28 during the flight (easeInOutQuad, same duration).
- n ≥ 3: hairline shelf at y top − 126, ±(row half-width + 18), 1 px parchment 40 %.
- First equipment **(360, top − 96)**, hand ring r 28 (+ halo r 34); items part to `x = 360 ± (64 + 56·rank)`, item k even → right, odd → left, rank = ⌊k/2⌋. Items slide outward 10 ticks *before* the coat arrives, then the ring dots in. More equipment: ring widens to a capsule, pitch 52 centred on 360, items shift out 26 per extra piece. Cap 4 per side, then `+n`.
- Landscape first item **(map_x + map_w/2, h − 26)**, r 18 → (739, 694) at w 1558, (600, 694) at w 1280. Next `x_i = cx + (i − (n−1)/2)·46`; with equipment, hand r 23 and items at `cx ± (53 + 46·rank)`; 5 per side, must stay > title_end + 20 and < ♪ hit box − 24.
- On land: as A (glow swell + 6-dot ring).
- Envelope (4th item, after card/key/coin; `optB-envelope-*.png`): lands **(444, top − 96)**, r 22 at the right end (`360 + 1.5·56`); the three items slide −28 to 276/332/388 during the flight, shelf widens.

### C · The slug line
- Portrait line: baseline centre y = **top − 96**, left x = 24, font 24.
- First item: the slug types `YOU (` / `당신 (` in 6 ticks; target = word centre `(24 + w(prefix) + w(word)/2, top − 96)` → EN "card" and KO "카드" both **(125, top − 96)**.
- Next items: appended after `, `: `x = cursor + w(word)/2; cursor += w(word) + w(", ")`. Overflow at width 672 → `(card, key +3)` / `(카드, 열쇠 외 3)`.
- Equipment: clause inserted after the cue (`, in a coat` / ` · 코트 차림`); items slide right by w(clause) over 8 ticks; letters fly to the clause centre (≈ (170, top − 96) for KO in the mock).
- Landscape line: y = h − 26, left x = map_x (439 at w 1558), font 19 → first word centre **(519, 694)** at w 1558; must end < ♪ hit box − 24.
- Measure words with `calcstringbox` in game; the mono estimate is for the mock.
- On land: letters (one label per glyph) fly, staggered 3 ticks, same Bézier; each glyph churns 2 random glyphs → itself (2 ticks each), then the word glows parchment for 18 ticks.
- Envelope (4th item, after card/key/coin; `optC-envelope-*.png`): letters 봉 투 land at word centre **(355, top − 96)** in `당신 (카드, 열쇠, 동전, 봉투)` (EN "envelope" → (398, top − 96)).

## DragonRuby capability risk

Low for all three: discs = the circle sprite the deck already draws, glow = existing `glow.png` with additive blend, dots and letters = labels, Bézier evaluated per tick in Ruby. No shaders, no render targets. The dashed fly paths and `→ (x, y)` pills are mockup annotations only. Watch-outs: B's re-centre tween moves several sprites at once (trivial cost); C needs real string widths (`calcstringbox`) for Hangul and a per-glyph label pool for the fly.

## Deliberately skipped

- No DragonRuby code; nothing under `/workspace/drdr-dr` touched.
- No animation in the pages (static frames; timing is in the SPEC).
- The "lit ACT-menu item row → its tray slot glows" link is described in THINKING.md, not drawn.
- Overflow (`+n`) and the speech-card-over-tray dim state are specified, not drawn.
- Landscape at w 1280 (desktop) is specified by formula; mocks use the 1558-wide phone landscape like the cancel-do set.
