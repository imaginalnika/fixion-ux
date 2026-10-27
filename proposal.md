# Fixion / DRDR: the mobile UX proposal (speech, the action menu, the mic in the menu)

Written 2026-10-27 (18:30 JST). Built on `docs/philosophy/PHILOSOPHY.md`, `ONTOLOGY.md` and `UX_IMPLICATIONS.md`
in the drdr-dr tree, on the audit in `current_state.md` (failure points F1 to F8) and on `research.md`. Phone
portrait first, iPhone Safari, the HTML5 build of the DragonRuby game. Everything here is implementable with what
DragonRuby 7.18 already does in HTML5: additive sprites, render targets, labels. No shaders.

Interactive mockups (touch and mouse, both skins, each state replayable): [talk](mock/talk.html) ·
[menu](mock/menu.html) · [mic to action](mock/slot.html). Clips: `../media/`. The implementation brief for the next
round is `fix_brief.md`.

Josh's answers that shaped this (18:09 JST): show the player's own words in the feed by default (yes); the
green indicator above the player while speaking comes back, in both skins; rewrites should be smooth; whether every
spoken action waits for a confirm and whether a red reason is final are left to this proposal; a session is "for now
just being in the scene".

> **Relation to the fix10 round (in progress at 18:25 JST).** fix10.md (18:05 JST) was written from the same audit and
> is already building most of this: live partials, a *connecting* state, a speech pill over the mic, the slot with its
> phases, up/down-only selection with ✓/✕, a raised ACT, standing beams in the slot, a confirm policy, haptics.
> Where this proposal differs it says so; `fix_brief.md` lists the deltas for the round after fix10. The two
> disagreements that need Josh: the menu card's place (fix10 docks it low near the thumbs; this proposal keeps it
> beside the target) and whether a rewrite may auto-confirm (fix10: after a delay; this proposal: never).

### Changelog

- **18:45 JST, Josh on the published proposal:** "make the inspire action at the very bottom. also no need to maintain
  the line". Read as:
  1. The spoken (inspire) action's slot always opens at the **very bottom of the action menu**, below every row, not
     under the selected row. The selection jumps to the slot while speaking. After it is performed, the new row stays
     at the bottom. ✕ while the slot is open puts the selection back on the row it was on.
  2. **No struck-through original.** The heard words morph straight into the judged label, rewrite or not, and no
     strikethrough line is kept in the slot. A gated rewrite still asks "do this instead?" on the strip, without the
     original line. The light ray from the mic to the slot stays: it is a VFX, not the line.

  Changed: §0 rows 9–10, §3a, §3b steps 1, 5 and 7, §4 (slot open, morph; the struck-subline row is removed), §5,
  §8 (P5), the slot mockup and the C clips. Unchanged and open for Josh: the feed's existing struck-through rewrite
  line at the perform step (fix3 behaviour, part of the transcript, not the slot).

---

## 0. The decisions in one screen

| # | Decision | From which principle |
|---|---|---|
| 1 | While talking: no words on screen, a green mic, and five green level bars over the `@` in both skins. | P4 speech is the main verb; Josh's capture rule |
| 2 | On release: a **take card** rises from the mic with the partial words at once (dashed), solidifies when final, ticks on the mic, then lifts into the feed as the player's line. | P10 nothing kept that was not seen; Q1 "yes, show" |
| 3 | A press never lights green until audio is flowing. Before that the mic is **arming** (grey dashed ring). Releasing while arming never finalizes; it says "let go · hold again". | F3 (the iOS first-press race); orb-ui's "connecting" rule |
| 4 | Four failure kinds, four different looks: *arming* (grey), *didn't catch that* (grey, a `?` beat over the `@`), *mic not ready* (amber, persists, tap to retry), *microphone blocked* (amber, says where to fix it). | research §1 Meta's error types |
| 5 | In Act mode the left stick moves the selection **up and down only**. Left and right do nothing. | F6 mixed semantics |
| 6 | The ✕ (red) ✓ (green) pair appears in its own strip **under the selected row**, rows below move down with it (160 ms). ✓ commits; tapping the selected row again also commits; ACT leaves. | Josh's ask; HIG symbols; Xbox A/B colours |
| 7 | ACT is raised 72 px above the mic's centre line, permanently (the caption moves under it). | F7; Hoober's lower-middle band |
| 8 | The commit is a moment: press state (white wash 80 ms), hitstop 90 ms, a glyph ring, sparks, a 1800→600 Hz tick; the menu stays 400 ms, then leaves in 200 ms. | P9 timing; 글자들 `contact()` |
| 9 | Pressing the mic in the menu slides a **slot** open at the **very bottom of the menu**, below every row, and the selection jumps to it (220 ms); a light ray runs from the mic into the slot while speaking; on release the heard words type in (≤400 ms); the judge runs under a thin ray. | Josh's ask; P1 the screenplay is the world |
| 10 | The judged label **lands in the slot**: the heard words **morph straight into the label** (320 ms glyph churn, rewrite or not); nothing of the original is kept. The slot is pressed (same moment as 8), performed, and becomes an ordinary row with a violet dot, staying at the bottom of the menu; the menu stays 1.1 s. | F4; P5 intent in, outcome out |
| 11 | **Gate rule (Q2):** a spoken action performs at once when the judge said `ok` or `duplicate` with P ≥ 0.75 **and** the preset is not hostile. Any rewrite, any doubt, any hostile act (hit/shoot/shove/grab) waits in the slot for ✓/✕. | P5, P10; F1 (the 양 hit) |
| 12 | A red **reason** lands in the same slot, bold red, with the feed copy as today. **Not final (Q4):** the slot stays; holding the mic again replaces it; ✕ or the stick closes it. | P5 fail open; Seaman/Pikachu beats for *no input*, honest status for *system* |
| 13 | `say` (it was speech): the words drop out of the slot into the feed as the player's line; Act mode leaves 400 ms later. | ontology §11 |
| 14 | Haptics: the iOS switch trick on mic down, mic up and ✓ only (direct gestures); the landing 2–5 s later uses sound and light only. | research §5 |
| 15 | The player is **a given role** (the adventurer, 광수, 주만): the UI never asks for a name or a character (Q5). | ONTOLOGY §6 |

---

## 1. The talk flow

### 1a. States

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> arming: mic down (haptic)
  arming --> listening: audio flowing (AudioContext running, mic track live, socket configured)
  arming --> warming_fail: mic up before audio flowed
  arming --> sys_fail: getUserMedia denied / socket error / 2.5 s without audio
  listening --> finalizing: mic up (haptic)
  finalizing --> heard: final text, non-empty
  finalizing --> nothing: final text empty
  finalizing --> sys_fail: socket closed / 5 s cap with nothing
  heard --> sent: take card lifts into the feed (ADVENTURER: …)
  sent --> idle: the room answers after the 0.9 s floor
  nothing --> idle: 1.6 s
  warming_fail --> idle: 2.2 s (or the next press)
  sys_fail --> arming: mic down again (tap to retry)
```

### 1b. What the player sees, state by state

**idle.** The mic as today: mint ring, "HOLD TO TALK".

**arming (mic down).** The ring turns grey and dashed and rotates; over the `@` a faint grey five-bar stub and a
small "…". Caption "MIC WARMING". This is the state the current build does not have, and it is where the thirteen
empty takes in the audit happened (F3). The green must not come on until the browser reports an audio frame to the
worklet and the Soniox socket has taken its config message. Typical arming is 60–150 ms on a warm page and is barely
seen; on a cold iOS page it is 300–2,000 ms and the player must see that something is being set up.

**listening.** The mic turns green with the three pulse rings scaled by level, as today. Over the `@`: five green
bars (4 px wide, 4 px apart, 4–24 px tall by level, with the per-bar phase from the web build's `drawVoice`), an
additive green glow behind them in the colour skin, `|`/`:`/`.` glyph columns in the ASCII skin. No words. This is
the indicator Josh asked back for (18:09), in both skins.

**finalizing (mic up).** The mic shows the eight orbiting dots as today, but now the **take card** rises at once
(220 ms, ease-out-back) from the top of the mic with whatever has been heard so far, in a dashed mint box with an
ellipsis: Soniox's non-final tokens, which the bridge currently throws away. The card updates as tokens arrive.
Median release-to-final is 2.3 s in the logs (F2); during that time the player reads their own words forming.

**heard.** The card solidifies: solid border, bold text, a ✓ badge pops on the mic's shoulder (300 ms ease-out-back)
with a rising two-tone tick. 420 ms later the card **lifts** (260 ms, ease-in, shrinking to 86 %) into the feed and
becomes the line `ADVENTURER: …` in the player's mint, which the fix9 "Show my lines = Yes" default already draws.
The "…" over the predicted responder appears as today and the floor runs.

**nothing (empty final, the stream had started).** The card says "didn't catch that" in grey, a `?` drifts up from
the `@` for 1.2 s (the existing beat, kept), the mic caption reads "DIDN'T CATCH THAT" for 1.6 s. This is a
character beat (Pikachu's "Pika?"), because the system did its job and heard silence.

**warming_fail (released while arming).** The card is amber: "mic was still warming — hold again". Caption "LET GO ·
HOLD AGAIN". Engineering rule behind it: the bridge must not send silence + `finalize` to a socket that never got its
config, and must not open a second socket; the pre-opened one is kept for the next press. The next press on a warm
page then arms in ~100 ms and the player is talking.

**sys_fail (denied, socket error, nothing after 2.5 s of arming, or a 5 s cap with no final).** The card is
amber and persists until the next press: "mic not ready · tap to retry", or "microphone blocked · allow it in
Settings" for a permission denial. Caption "MIC NOT READY · TAP TO RETRY". The sidecar gets the client-side reason
(fix9 §15). This is a system status and must look like one, not like a character beat.

### 1c. Why this and not a transcript while talking

Josh's rule is about capture: while you hold the button, only the green signal. The take card is understanding
feedback after you let go: the words are shown exactly once, in the moment you are already looking at the mic, and
then they become the committed line in the feed, which Josh now wants shown by default. The partial words appear
*before* the final so the 2 s wait reads as progress, not as a spinner. No new permanent text on the screen.

### 1d. Barge-in while talking

Pressing the mic during a performance cancels it as today. The take card does not change that. If a card from the
previous take is still lifting when the next press comes, it finishes its lift (260 ms) and the new press starts
arming; nothing is dropped.

---

## 2. The action menu

### 2a. Layout

- The menu card stays **beside the target on the map** (right of it if there is room, else left, else below or
  above), as built in fix3. Reason: principle 2 of the UX implications, the scene stays visible; the thing you act
  on and the verbs are one glance apart. The alternative (a deck-docked list near the thumbs) was considered and
  rejected: it hides which target you are on and turns the map into a background.
- Rows 46 px, 22 px type, the selected row mint with the `›` as today; `»` marks walk-up verbs; item rows keep
  their icons.
- **ACT is raised 72 px** (centre at the mic's centre minus 72 in DR's y-up coordinates), its caption moves under
  it, size unchanged (r 56). The lower-middle band is where a two-thumb grip on a portrait phone actually rests
  (Hoober); the very bottom was chosen for symmetry with the mic, not reach. The `lowered` scenario in the menu
  mockup shows the old position for comparison. In Act mode the caption reads "LEAVE".

### 2b. Input

- **Stick: up/down only.** Dead zone 16 px to take a direction, 10 px to let go (hysteresis, no jitter at the edge).
  A held direction repeats after 500 ms, then every 200 ms. Sideways motion in Act mode does nothing; the pad's
  left/right arrows are replaced by dots so the face says so.
- **✕ / ✓ strip.** 120 ms after the selection settles, a 40 px strip opens under the selected row (160 ms,
  ease-out; rows below move down in sync). ✕ red at the left of the pair, ✓ green at the right (Xbox positions,
  both as symbols, 38 px disks, 44 px hit area). A small "do it?" label at the left of the strip; for a slot with a
  rewrite it reads "do this instead?".
- **✓** commits. **Tapping the selected row again** commits too (one-handed, no reach to the strip). Tapping any
  other row selects it and moves the strip.
- **✕** closes the menu and leaves Act mode. **ACT** also leaves. The stick's left no longer means back.
- Desktop: ↑↓, Enter, Esc, E unchanged.

### 2c. The commit moment (every pick, menu or slot)

| ms | what |
|---|---|
| 0 | the row washes white (alpha 0.55 → 0 over 420 ms), the strip closes, a 1800→600 Hz sine tick, haptic if it was a tap |
| 0–90 | **hitstop**: the menu, the ray and the deck freeze for 90 ms (the map keeps breathing) |
| 0 | a `·`/`.` glyph ring expands from the row's centre (600 ms, ease-out), 9–12 glyph sparks (`- / | \`) fly from the row's right end and fall (300–600 ms), a 14 % white flash for 2 frames, a 3 px screen nudge for 180 ms |
| 520 | the △ line enters the feed; the walk-up (if any) starts on the map |
| 900 | the menu leaves (200 ms, ease-in) and Act mode ends |

This is 글자들's `contact()` at power ≈ 1 (hitstop .05+.05, sparks, ring, a sound) applied to a UI commit. It is
the same vocabulary the game already uses for a landed blow, so a menu pick feels like part of the world rather than
a widget. Josh's "clear sign of being pressed" is the white wash plus the hitstop; the hitstop is what makes it
read even under a thumb.

---

## 3. The mic in the menu (a spoken action)

### 3a. States

```mermaid
stateDiagram-v2
  [*] --> menu_idle: Act mode, a target, a selected row
  menu_idle --> slot_open: mic down (slot slides open at the bottom of the menu, selection jumps to it, 220 ms; ray from mic to slot)
  slot_open --> slot_listening: audio flowing (same arming rule as talk)
  slot_listening --> slot_filling: mic up (ray thins; heard words type into the slot, ≤ 400 ms)
  slot_filling --> slot_judging: words complete (underline sweeps; "judging…" after 2 s)
  slot_judging --> landed_auto: ok or duplicate, P ≥ 0.75, not hostile
  slot_judging --> landed_gated: rewrite, or P < 0.75, or hostile preset
  slot_judging --> reason: missing_prerequisite or meta
  slot_judging --> said: speech
  slot_judging --> landed_auto: sidecar error or 5 s timeout (fail open, "as said")
  landed_auto --> pressed: 320 ms after landing
  landed_gated --> pressed: ✓ (or tap the slot)
  landed_gated --> closed: ✕ / stick left
  pressed --> performed: 600 ms (△ line in the feed; the slot becomes a row with a violet dot)
  performed --> menu_idle_closing: 1.1 s, then the menu leaves
  reason --> slot_open: mic down again (the slot is replaced)
  reason --> closed: ✕ / stick
  said --> closed: the words drop into the feed as ADVENTURER:, Act mode leaves 400 ms later
  slot_listening --> nothing: mic up with no words ("didn't catch that", closes after 900 ms)
  slot_listening --> closed: ✕ mid-speech
  slot_judging --> closed: ✕ while judging (the sidecar's answer is discarded)
```

### 3b. Beat by beat

1. **Mic down (violet, in Act mode).** A new row slides open at the very bottom of the menu, below every row:
   0→46 px in 220 ms, ease-out, and the selection jumps to it. The slot is violet-tinted with a dashed border that marches. From the top of the
   mic a **ray** rises into the slot: a 26 px additive violet beam with a 9 px warm core, both wobbling in width and
   offset with two slow sines ("fluid"), and `✦`/`·` glyph motes drifting up the ray and dying in the slot. The mic's
   ten orbiting sparks run as today. Over the `@` nothing (an action is not speech).
2. **Speaking.** Nothing is written. The slot shows "…". The ray breathes with the mic level.
3. **Mic up.** The ray thins to a thread (35 % width). The heard words **type into the slot**, 18 ms per character,
   capped at 400 ms for long phrases, with a blinking `_`. This is the one place the player reads what was heard
   before anything happens, and it answers F1.
4. **Judging.** A violet underline sweeps under the words (900 ms loop). The thread stays. After 2 s of waiting a
   small "judging…" appears at the right of the slot; this covers the 2–5 s slow-network case without changing
   state. At 5 s the sidecar fails open: the words become the label with an "as said" tag and, if the preset is
   hostile, the gate still applies.
5. **Landed.** The ray ends with a 300 ms fade. The label arrives in the slot:
   - Kept (`ok`) or rewritten, the same motion: the heard words **morph straight into the label** with a 320 ms
     left-to-right **churn** (each heard letter turns into `@#%&*` glyphs and settles as the label's letter, the
     fix8 banner's motion) and a rising tone. No struck-through line is kept in the slot. A rewrite is gated (step
     6), so the strip's "do this instead?" is what tells the player the words were changed. The feed gets the
     existing struck-through rewrite line at the perform step. The morph is the smoothness Josh asked for: no cut,
     the player's words are visibly *becoming* the label.
   - If it matched an existing verb (`duplicate`): the slot shows the existing label for 380 ms, then collapses while
     the existing row takes the press. No new row.
6. **Gate or not.** `ok`/`duplicate` at P ≥ 0.75 and a non-hostile preset: the slot is pressed by itself 320 ms
   after landing. Anything else: the ✕/✓ strip opens under the slot and waits. Nothing is performed until ✓.
7. **Pressed, performed.** Exactly the commit moment of §2c, from the slot. 600 ms later the △ line enters the feed
   and the slot turns into an ordinary row at the bottom of the menu (mint, `»` if it is a walk-up, a violet dot for
   2.6 s that says "new"); learned verbs stay at the bottom of the list after that.
   The menu stays 1.1 s so the player sees the verb they made sitting among the others, then leaves. The verb is in
   the data already (fix3); now the player sees it join.
8. **Reason.** The slot turns red-tinted: the one-sentence reason in bold red, "hold the mic to try again" at the
   right, the strip opens with "nothing happens" and ✕ only. The feed gets the red line as today. The slot stays:
   the next mic press replaces it in place (the retry costs one gesture and the player keeps their spot in the menu),
   ✕ or the stick closes it.
9. **Said.** The slot shows the words in quotes with "said ↓" for 700 ms, then they drop into the feed as
   `ADVENTURER: …`, the slot closes and Act mode leaves 400 ms later; the room answers after the floor.

### 3c. Why gate only some of them

Every spoken action could wait for ✓. That would cost two gestures per action on the most common path and work
against principle 9 (timing is most of the feel). The gate is placed exactly where principle 5 needs it: where the
judge changed the player's words (a rewrite is a proposal and the player must see it before it is performed), where
the judge was unsure (P < 0.75), and where the act hurts someone (the 양 case in the audit: "ok" at 0.83 and
performed as a hit with blood). Hostile presets are `hit`, `shoot`, `shove`, `grab` (the sidecar's `HOSTILE` table)
plus any learned verb whose preset maps to them. The sidecar already knows all three facts; `api_inspire` only has
to return a `gate` field.

### 3d. Why a reason is not final

A reason is the judge saying "not with what you have". The slot keeping the mic live is the cheapest possible
"then what?": the player is still on the same target with the same menu, and a second press replaces the red
line. Making it final would send the player back through ACT → aim → mic for a one-word change ("set it on fire"
→ "wave it"). The feed copy is still written, so the history is kept.

---

## 4. Timings (ms)

| Transition | ms | easing / note |
|---|---|---|
| mic down → arming ring visible | 0 | immediate; haptic (switch trick) |
| arming → listening (warm page) | 60–150 | gated on the first audio frame + socket config, never a timer |
| arming → "mic not ready" | 2500 | timer; amber, persists |
| mic up → take card rises | 0–220 | ease-out-back; dashed; partial words |
| take card final → ✓ badge | 0–300 | ease-out-back; tick 990→1480 Hz |
| final → card lifts into feed | 420 → 680 | ease-in, shrink to 86 % |
| nothing → idle | 1600 | `?` beat over the `@` 1200 |
| warming_fail → idle | 2200 | or the next press |
| ACT tap → menu open | 180 | ease-out, 10 px rise |
| selection settles → ✕/✓ strip | 120 + 160 | strip ease-out; rows below in sync |
| stick repeat | 500 then 200 | threshold crossing, hysteresis 16/10 px |
| commit: white wash | 420 | linear fade |
| commit: hitstop | 90 | menu, ray, deck only |
| commit: ring / sparks / flash | 600 / 300–600 / 2 frames | glyph ring `·`→`.` |
| commit → △ line | 520 | |
| menu leaves after a pick | 400 + 200 | ease-in |
| mic down → slot open | 220 | ease-out; at the very bottom of the menu, the selection jumps to it |
| mic up → words typed | 18 per char, ≤ 400 | blinking `_` |
| judging → "judging…" caption | 2000 | |
| judging → fail open | 5000 | "as said" tag |
| landed → heard words morph into the label | 320 | left to right, glyph churn; rewrite or not |
| landed_auto → pressed | 320 | |
| pressed → performed (△ line) | 600 | slot becomes a row |
| performed → menu leaves | 1100 + 200 | |
| reason → slot replaced by next press | 0 | slot height reused |
| said → words into feed | 700 | Act mode leaves +400 |
| ray fade after judge | 300 | |

---

## 5. Edge cases

- **Empty STT (talk).** "didn't catch that" card, `?` over the `@`, caption; nothing is sent. Distinguished from
  system failure by whether the stream ever started (the audit's `streamStarted` test).
- **Empty STT (slot).** The slot says "didn't catch that" for 900 ms and closes; the selection and strip return.
- **Cancel mid-speech (slot).** ✕ or stick-left while listening: the ray ends, the slot closes, the socket's take is
  discarded (the bridge still finalizes the socket to stop billing, but the text is dropped).
- **Cancel while judging.** Same; the sidecar's answer is ignored by id. Needs an `inspire_id` on the request and the
  game to ignore late answers (`Player#inspired` already checks `@inspiring`).
- **Barge-in while a slot is judging.** A talk press is impossible in Act mode (the mic is the action mic), so there
  is no barge-in; ACT or ✕ cancels. Walking with the stick is impossible too (up/down only). Leaving Act mode with a
  slot judging cancels it.
- **The judge says impossible / forced outcome / multi-step / controls other.** All land as rewrites and gate on ✓
  with the heard words morphing into the rewrite. The `impossible` rewrite is the comedy case ("Attempt to fly"); it is shown before
  it is performed so the joke is shared, not discovered.
- **Slow network 2–5 s.** The words stay in the slot under the sweeping underline; "judging…" after 2 s; at 5 s fail
  open to the words as said, still gated if hostile. The thread-ray stays so the connection between mic and slot
  reads through the wait. Nothing else on screen moves.
- **The sidecar is down.** As said, "as said" tag, no gate unless hostile (then ✓ is required, and the sidecar's
  absence means it performs locally and queues the facts).
- **Two takes in a row (talk).** A press while the previous card is lifting: the lift finishes, the new press arms.
- **Scene switch mid-take.** The bridge releases the mic and socket on scene switch (fix9 §15) and the state returns
  to idle; a card in flight is dropped.
- **Knocked out.** Act mode is unavailable (today's rule); the talk flow is unchanged.
- **Korean worlds.** Every caption has a Korean string (`lang.rb`); slot text and labels are Korean from the sidecar;
  the churn uses Hangul-safe glyphs (`@#%&*` are fine; no syllable scrambling).

---

## 6. VFX, within the HTML5 budget

- **Ray.** Two stretched `beam.png` sprites (the game ships one) with `blendmode_enum: 2`, angle from the mic to
  the slot, widths 26 and 9 px, alpha 0.55 and 0.6, width and offset modulated per frame by two sines, plus 4–8
  `✦`/`·` labels drifting along it. Cost: two sprites and a handful of labels per frame. On DPR-capped phones this is
  nothing like the full-screen layers fix1 removed. Draw it into the existing `:drdr_koma`-style render target at
  half resolution only if profiling shows a cost; the mockup draws it directly.
- **Churn.** The fix8 join banner's glyph churn (`skin_fx.rb`), applied to one label.
- **Hitstop.** `Stage#time_scale` already exists (0.35 for 42 ticks on a big moment). A menu hitstop is a 5-tick full
  stop applied to the UI layer only; the map's ambient animation keeps running so it reads as impact, not a hang.
- **Ring and sparks.** The game's `marks` system (glyph particles with `dx/dy/alpha`) draws both; the ring is the
  글자들 `addRing` `·` circle.
- **Flash.** `@flash_at` exists; cap it at 14 % alpha for 2 frames.
- **Take card.** One rounded-rect sprite (`card_r8`) and a label; it is the speech-card system with a mint accent and
  no name plate.
- **Haptics.** A hidden `<input type="checkbox" switch>` in the page toggled on `pointerdown`/`pointerup` on the mic
  and on ✓; nothing on async results.
- **Sound.** Synthesised like `tools/synth_fx.py`: tick (1800→600 Hz, 250 ms), arm (880 Hz, 40 ms), listen (1320 Hz),
  heard (990→1480 Hz), warm-fail (330 Hz triangle), reason (240 Hz square, 250 ms).

---

## 7. How PC differs (briefly)

- The mic flow is identical with Space; the take card and arming states apply as they are (desktop browsers have
  their own first-press audio unlock).
- The slot accepts **typing**: in Act mode, T or `/` opens the slot as a text field (the current dev path becomes
  the real one); Enter sends it to the same judge; the landing and gate are identical. This keeps one mental model
  for "a new verb" on both platforms.
- The ✕/✓ strip still appears (mouse users click it); Enter/Esc do the same.
- ACT's position does not matter on desktop; the landscape layout keeps its column.
- The menu may dock in the right column on wide screens, since there is no thumb to reach; it then points at the
  target with the existing pointer line.

---

## 8. How each choice follows from the philosophy

- **P1 The screenplay is the world.** The slot shows the words that become the △ line; the take card shows the
  words that become the `ADVENTURER:` line. The player watches their input become script.
- **P2 The author never plays the player / P10 nothing shown that was not performed.** The feed line appears only
  after the take is final and lifted; the △ line only after the press.
- **P4 Speech is the main verb; menus are the bridge.** No words while talking; the slot makes the menu the place
  where speech lands, not a replacement for it.
- **P5 Intent in, outcome out.** The gate sits exactly on rewrites, doubt and harm; everything else performs at once.
  The gated "do this instead?" keeps the rewrite honest: the player watches their words morph into it before it is
  performed.
- **P7 Bigger things, bigger effects.** A heard take is a tick; a landing is a press with sparks; a reason is red and
  shakes; a join stays bigger than all of these.
- **P9 Timing is most of the feel.** Every transition is under 320 ms except the ones that wait on the network, and
  those show progress (partials, typed words, the sweep) instead of a spinner.
- **P11 Every model-facing word is reviewable.** This proposal adds no model-facing text. The `gate` field is a
  derived flag from answers Jev already gives.

---

## 9. Open questions that remain

1. Should the ✕/✓ strip also appear for curated menu rows, or only for slots and learned verbs? (The mockup shows it
   for every row, per Josh's ask; "tap the row again" makes the strip optional for fast players.)
2. P ≥ 0.75 for the auto path is a guess from the inspire logs (ok at 0.83 was the misheard hit). It should be tuned
   on a week of live `ev: inspire` records.
3. Should the take card show partial words at all in the Korean worlds, where Soniox's non-final tokens change more?
   (The mockup shows them; a setting could hide partials.)
4. Scene transitions as a bigger "being in the scene" beat (Josh's 18:09 note to Base Models): not in this proposal.
