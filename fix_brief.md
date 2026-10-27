# Implementation brief: the round after fix10 (fix11), from the UX proposal

Written 2026-10-27 18:45 JST against the drdr-dr tree as it stood at 18:25 JST, while the **fix10 round was still
running** (fix10.md, 18:05 JST; its code is tagged `fix10 §n` in comments). Nothing in drdr-dr was edited for this
brief. Line numbers are from 18:25 and will drift; function names are the anchors.

**How to read it.** Section A is what fix10 already has in the tree (so the next round does not redo it). Section B
is what the proposal (`proposal.md`) changes or adds, ordered by impact, each mapped to files and functions, with
what to verify on a phone. Section C is the phone verification script. Where the proposal and fix10's own brief
disagree, the disagreement is stated and the recommendation is marked; Josh decides.

---

## A. Already in the fix10 tree (18:25 JST), per file

| Concern | Where | What fix10 does |
|---|---|---|
| Live partials from Soniox | `web/drdr-bridge.js` `livePartial`, `c.live`; `player.rb` `absorb_bridge` (`data['partial']`) | non-final tokens reach the game ≤10×/s as `partial` |
| Arming state | `drdr-bridge.js` `pttDown` sets `stt:'connecting'`, `'listening'` only after the socket took its config; `player.rb` `@stt_live` | the proposal's *arming* exists under the name `connecting` |
| Failure reasons | `drdr-bridge.js` `TELL` map, `notify(key)` → `stt_msg`; `player.rb` ~l.305 shows them "in the failed pill (or slot)" | empty / blocked / reconnecting / failed, with `Lang` strings |
| Speech pill (the proposal's take card) | `player.rb` `@talk_ui` phases `:listening :sending :sent :failed`, `tick_confirm`; `action_ui.rb` `draw_speech10`, `draw_live_card`; `layout.rb` `@pill` (over the mic, left of ACT) | the sent line "flies" into the feed (`director.rb` l.21 note) |
| Slot for a spoken action | `player.rb` `@slot` phases `:listening :sending :judging :confirm :pressed :reason :said :failed :cancelled`, `inspire`, `inspired`, `pend`, `confirm_slot`, `cancel_slot`, `slot_height`; `action_ui.rb` `draw_slot10`, `slot_beams`, `press_fx` | slot opens under the selected row; standing additive rays in the slot while speaking; label churns in (`churn_text`); one beam sweeps the row on landing |
| Confirm policy | `player.rb` `harmful?`, `pend` (`must = hostile || !judged || requires item`), `AUTO_PLAIN` = 90 ticks, `AUTO_REWRITTEN` | harmless-as-heard auto-confirms after 1.5 s; rewrites auto-confirm after `AUTO_REWRITTEN`; hostile / unjudged / item actions must be confirmed |
| Up/down only, ✓/✕ | `player.rb` `menu_step` (`dir[0] == 0` only), `select_row`, `confirm_choice`; `action_ui.rb` `draw_strip10`, `button10`, `check_mark`, `cross_mark` | the strip under the selected row |
| ACT raised | `layout.rb` l.58–62: ACT at `mic.y + 92`, the mic and pad moved down 36 px | 92 px, permanent |
| Menu anchored low | `layout.rb` `@menu_floor`, `@menu_floor_right`; `player.rb` ~l.593 "anchored low, by the thumbs" | **the card no longer floats beside the target** (fix10.md §4 asked for this) |
| Haptic | `drdr-bridge.js` `haptic()` (iOS switch trick) on press, release, ✓ | |
| Green indicator over the player (colour skin) | fix10.md §9(a) | asked; check `skin_color.rb` `draw_talk_indicator` for the bars |

---

## B. What this proposal changes or adds, by impact

### B1. The ray should run from the mic into the slot (highest visual impact, cheap)

- **Now:** `action_ui.rb` `slot_beams` draws rays standing *inside* the slot. The connection between the thing the
  thumb is holding and the place the words will land is not drawn.
- **Proposal:** one beam from the top of the mic to the slot's centre (two `sprites/beam.png` at angle, widths 26
  and 9 px, `blendmode_enum: 2`, alpha 0.55/0.6, width and offset modulated by two sines), plus 4–8 `✦`/`·` labels
  drifting along it; it thins to 35 % on release and fades 300 ms after the judge answers. Keep fix10's in-slot
  sheen as the beam's landing glow.
- **Where:** `action_ui.rb` new `mic_ray(from, to, level, thin)` called from `draw_slot10` for phases `:listening
  :sending :judging`; `layout.rb` `mic_at` for the origin; the slot's rect from `menu_geo`.
- **Budget:** two sprites + ≤8 labels per frame. If `perf_test.py --throttle 6` drops under 30 fps, draw the ray into
  the existing koma-style render target at half size.
- **Verify on a phone:** hold the violet mic with the menu open; the ray must appear within one frame, breathe
  with your voice, thin on release, and be gone 300 ms after the label lands.

### B2. The gate: rewrites and doubt wait; only confident, unchanged, harmless acts go by themselves

- **Now:** `pend` sets `auto_at` for rewrites too (`AUTO_REWRITTEN`), so an "Attempt to fly" performs on its own
  if the player does nothing. Josh's 18:09 §9(d): "Wait for the green confirm on rewrites, doubts or low margins."
- **Proposal:** `auto_at = nil` whenever `rewritten`, whenever the judge's top category P < 0.75, or whenever the
  margin to the second category < 0.25; `AUTO_PLAIN` stays for the rest but should drop to 320 ms (the proposal's
  `landed_auto → pressed`); 1.5 s is a long time to stare at a slot that will press itself.
- **Where:** `sidecar/inspire.py` `decide` already returns `confidence` and `probs` (top 5); add `gate: bool`
  and `margin: float` to the dict so `player.rb` `pend` reads one flag instead of recomputing. `server.py`
  `api_inspire` passes `r` through unchanged, so nothing else moves. Hostile stays as `harmful?` in `player.rb`
  (presets `hit shoot shove grab`, `draw`, items) plus the sidecar's `HOSTILE` for learned verbs.
- **Verify:** say "fly over to her": the slot must show the ✓/✕ strip and wait; say "wave at her": it performs by
  itself within half a second; say "punch her": it waits. Log line `ev: inspire` shows `gate` and `margin`.

### B3. A reason is not final: the slot stays, the next mic press replaces it

- **Now:** `tick_confirm` clears a `:reason` slot after 230 ticks (~3.8 s); `inspire` cancels a `:confirm` slot
  when the mic is pressed again, but a `:reason` slot has already vanished.
- **Proposal:** a `:reason` slot persists until ✕, the stick, ACT, or the next mic press (which reuses the slot:
  `inspire` → `@slot = @slot.merge(phase: :listening, …)` instead of a new slot). Show "hold the mic to try again"
  at the right of the slot. The feed copy stays as is.
- **Where:** `player.rb` `tick_confirm` (`when :reason`), `inspire` (the `cancel_slot(:replaced)` branch should
  cover `:reason` too), `action_ui.rb` `draw_slot10` (`:reason` text), `lang.rb` (both languages).
- **Verify:** "set my rose on fire" → red slot; hold the mic again without leaving the menu: the red slot turns
  violet and listens.

### B4. The menu card: beside the target, not docked low (a disagreement; Josh decides)

- **Now:** fix10.md §4 asked for the card "anchored low rather than floating by the target", and `layout.rb`
  `@menu_floor` does that.
- **Proposal:** keep it beside the target (fix3's placement, `build_menu_rows`), because the thing you act on and
  its verbs should be one glance apart and the map must stay the performance (UX_IMPLICATIONS priority 2). The
  thumbs do not need to reach the card: the stick selects and ✓/✕ sit under the selected row wherever the card is.
- **Trade-off, honestly:** the low card is nearer the thumbs for *tapping* rows and keeps the top of the map
  clear; the target card keeps the target in view and makes far-drag targets legible. If both exist, make it a
  Settings row ("Menu: by the target / near the thumbs") and test with Josh; do not keep two code paths without a
  switch.
- **Where:** `player.rb` `build_menu_rows` (the candidate sides and `keep_clear` scores), `layout.rb`
  `@menu_floor*`.

### B5. The take card rises from the mic and lifts into the feed (small deltas to the pill)

- **Now:** `draw_speech10` / `@pill` is a strip over the mic, left of ACT, and the sent line "flies" into the feed.
- **Proposal:** keep it. Three details: show the partial words in a **dashed** box and the final in a **solid bold**
  one (the player must be able to tell "still forming" from "this is it"); pop a ✓ badge on the mic's shoulder for
  300 ms at the final (the eye is on the thumb); lift the card into the feed only after 420 ms so the final can be
  read. Failure kinds keep their own looks: grey for *didn't catch that* (plus the existing `?` over the `@`), amber
  for *mic not ready* / *blocked* (persisting until the next press).
- **Where:** `action_ui.rb` `draw_speech10`, `draw_live_card`; `player.rb` `@talk_ui` phases; `skin_color.rb` /
  `skin_ascii.rb` `draw_mic` (the badge).
- **Verify:** on a cold page the first press shows the grey dashed ring and "MIC WARMING"; an early release says
  "let go · hold again" and the next press works; a normal take shows dashed words, then bold words, then the
  line in the feed.

### B6. The commit moment: one shared beat for menu picks and slot presses

- **Now:** `press_fx` (white rect + glow, additive) exists; `@pressed[:ticks]` holds the beat.
- **Proposal:** make the beat the same for a ✓ on a curated row and on a slot: white wash 420 ms, **hitstop 5 ticks
  on the UI layer only** (not the map), a `·` glyph ring (`dot_ring`, 600 ms), 9–12 glyph sparks from the row's
  right end through the `marks` system, a 2-frame 14 % flash, 3 px nudge for 180 ms, and the tick sound
  (`tools/synth_fx.py`: 1800→600 Hz, 250 ms). Then the △ line at +520 ms, the menu leaves at +900 ms (+1100 for a
  slot, so the new row is seen).
- **Where:** `player.rb` `confirm_choice`, `confirm_slot`, `run_confirmed`, `@pressed[:ticks]`; `action_ui.rb`
  `press_fx`, `dot_ring`; `stage.rb` `time_scale` (a UI-only variant: freeze `@pressed`/slot/ray timers, not
  `@presets`); `audio.rb` + `tools/synth_fx.py` for the tick.
- **Verify:** a ✓ feels like a hit (the menu freezes for a beat); the map keeps breathing underneath.

### B7. Green bars over the player in both skins

- **Now:** fix10.md §9(a) asks for it in colour; the ASCII skin today only has the `?`.
- **Proposal:** five bars (4 px wide, 4 px gap, 4–24 px by level, per-bar phase as the web build's `drawVoice`)
  with an additive glow in colour; `|` `:` `.` glyph columns in ASCII; a faint grey stub plus "…" while arming.
- **Where:** `skin_color.rb` `draw_talk_indicator` (l.1354), `skin_ascii.rb` `draw_talk_indicator` (l.1008);
  `pl.level` from the bridge.

### B8. Cancel while judging must discard the late answer

- **Now:** `inspired` ignores a result when `@slot[:phase] != :judging || @slot[:heard] != text`; good. But
  `api_inspire` has already added the verb to `player_actions` and spread it (`spread()`), so a cancelled action
  still enters the menus later.
- **Proposal:** send an `inspire_id` with the request; a cancel posts `/api/inspire/cancel {id}`; the sidecar
  skips `pa.add` and `spread()` for a cancelled id (or adds it with `uses: 0` and no spread). Minor, but it keeps
  principle 10 (nothing kept that was not seen).
- **Where:** `server.py` `api_inspire` (+ a small `api_inspire_cancel`), `player.rb` `cancel_slot`, `net.rb`.

### B9. Timings table to adopt (ms unless ticks)

See `proposal.md` §4. The ones that differ from fix10's constants: `AUTO_PLAIN` 90 ticks → 20 ticks (320 ms);
`:reason` auto-clear 230 ticks → never; slot open 220 ms (fix10's `slot_height` eases over 10 ticks = 167 ms,
fine); menu stays 400 ms after a pick, 1100 ms after a slot press.

---

## C. Phone verification script (390×844, DPR 2, colour then ASCII)

Use `tools/phone_test.py` with `--mic-wav` for real Soniox takes and `--init-js` for the slow-audio race
(fix9 §16's init script). Capture each as a constant-res clip (`--screencast`).

1. **Cold page, first press.** Expect: grey dashed ring + "MIC WARMING" + grey stub over the `@`; no green until
   the console logs the socket config. Release early: "let go · hold again"; next press: green within ~150 ms.
2. **Normal take.** Expect: green mic + five bars over the `@` (both skins); on release a dashed card with partial
   words within 220 ms; bold card at the final; ✓ badge on the mic; the line in the feed after ~420 ms; "…" over the
   responder; first NPC card ≥ 900 ms after release.
3. **Empty take** (`--mic-wav` silence, 1 s). Expect: grey "didn't catch that" card, `?` over the `@`, caption for
   1.6 s, nothing sent (`/api/say` not posted).
4. **Denied mic** (Playwright context without the permission). Expect: amber "microphone blocked · allow it in
   Settings", persisting; no card over the `@`.
5. **Menu: stick.** Expect: up/down only; sideways does nothing; the strip opens under the selected row 120 ms after
   the stick settles and the rows below move with it; hold-repeat 500/200 ms; ✓ performs with the beat; tapping the
   selected row again performs; ✕ and ACT leave.
6. **Slot: ok** ("tap her on the shoulder"). Expect: slot opens 220 ms, the ray from the mic, words typed on
   release, label churns in, performs by itself within 320 ms, the new row stays visible 1.1 s with a violet dot,
   `ev: inspire` shows `gate: false`.
7. **Slot: rewrite** ("fly over to her"). Expect: struck-through original under the churning label, the strip with
   "do this instead?", nothing happens until ✓; ✕ closes the slot and the verb is not in the menu afterwards.
8. **Slot: hostile** ("punch her in the jaw"). Expect: waits for ✓ even at P 0.9; the 양으로 갈겨 버리기 case in 루이
   뉘똥 샾 must wait too.
9. **Slot: reason** ("set my rose on fire"). Expect: red slot with the sentence, the feed copy, "hold the mic to try
   again"; a second press reuses the slot.
10. **Slot: slow judge** (`--throttle 0.5,2000`). Expect: the words under the sweeping underline, "judging…" after
    2 s, the thread-ray still drawn, fail-open at 5 s with "as said" and the gate if hostile.
11. **Say** ("tell her she's beautiful"). Expect: "said ↓" for 700 ms, the words become `ADVENTURER:` in the feed,
    Act mode leaves 400 ms later.
12. **FPS.** `perf_test.py --throttle 1,4,6` with the ray on screen; ≥ 30 fps at 6×.
13. **Korean world** (루이 뉘똥 샾): every caption and slot text in Korean; the churn never scrambles syllables.
