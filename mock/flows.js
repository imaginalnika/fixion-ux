/* The three mockup flows on top of mock.js: talk, menu, slot. Each exposes scenarios and a play() for scripted
 * runs (the clips). Timings here are the proposal's numbers (proposal.md, "Timings"). */
(() => {
  'use strict';
  const M = window.MOCK, S = M.S, C = M.C;
  const qs = new URLSearchParams(location.search);
  const flow = qs.get('flow') || document.body.dataset.flow || 'talk';
  let scn = qs.get('scn') || 'ok';
  const $ = (s) => document.querySelector(s);
  const KO = qs.get('lang') === 'ko';

  // ---------------------------------------------------------------- shared: the room answers
  function roomAnswers(responder, lines) {
    S.responder = responder; S.thinkingAt = M.now();
    let t = 900;                                   // the reply floor (Cfg::MIN_REPLY_SECONDS)
    lines.forEach((l, i) => { M.after(t, () => { if (i === 0) { S.thinkingAt = 0; S.responder = null; } M.feed(l.text, l.who || 'npc', { col: l.col }); M.tone(l.who === 'delta' ? 520 : 660, 0.05, { vol: 0.02 }); }); t += l.dt || 1400; });
  }

  // ---------------------------------------------------------------- TALK
  const TALK = {
    name: 'talk',
    scenarios: {
      ok: { arm: 120, final: 450, text: 'Is Yara here? I am hopelessly in love.', partials: ['Is Yara', 'Is Yara here? I am', 'Is Yara here? I am hopelessly in'] },
      slow: { arm: 140, final: 2300, text: 'Do you know any great lockpicks?', partials: ['Do you know', 'Do you know any great'] },
      empty: { arm: 120, final: 300, text: '', partials: [] },
      notready: { arm: 99999, final: 0, text: '', partials: [] },          // iOS first press: audio never armed before release
      denied: { arm: 0, denied: true, text: '' }
    },
    bind() {
      let armTimer = null, partialIdx = 0;
      M.hooks.onMicDown = () => {
        const sc = TALK.scenarios[scn];
        if (S.talk === 'listening' || S.talk === 'arming' || S.talk === 'finalizing') return;
        S.thinkingAt = 0; S.responder = null; M.cancelTimers('talk');
        if (sc.denied) { S.talk = 'failed'; S.take = { kind: 'failed', text: 'microphone blocked · allow it in Settings', at: M.now(), phase: 'rise' }; M.tone(220, 0.2, { type: 'square', vol: 0.03 }); return; }
        S.talk = 'arming'; S.take = null; partialIdx = 0;
        M.tone(880, 0.04, { vol: 0.02 });
        armTimer = M.after(sc.arm, () => { S.talk = 'listening'; M.tone(1320, 0.05, { vol: 0.03 }); }, 'talk');
        // after 2.5 s still arming: say so where the thumb is
        M.after(2500, () => { if (S.talk === 'arming') S.hint = 'mic not ready · let go and hold again'; }, 'talk');
      };
      M.hooks.onMicUp = () => {
        const sc = TALK.scenarios[scn];
        if (S.talk === 'arming') {
          // released before audio flowed: never finalize a socket that got no config; tell the player plainly
          S.talk = 'failed'; S.hint = ''; S.take = { kind: 'warming', text: '', at: M.now(), phase: 'rise' };
          M.tone(330, 0.12, { type: 'triangle', vol: 0.03 });
          M.after(2200, () => { if (S.talk === 'failed') { S.take.phase = 'gone'; S.talk = 'idle'; scn = scn === 'notready' ? 'ok' : scn; } }, 'talk');
          return;
        }
        if (S.talk !== 'listening') return;
        S.talk = 'finalizing'; M.tone(700, 0.05, { vol: 0.02 });
        if (!sc.text) {
          M.after(sc.final, () => { S.talk = 'nothing'; S.take = { kind: 'nothing', text: '', at: M.now(), phase: 'rise' }; M.tone(300, 0.1, { type: 'triangle', vol: 0.02 }); M.after(1600, () => { if (S.talk === 'nothing') { S.take.phase = 'gone'; S.talk = 'idle'; } }); }, 'talk');
          return;
        }
        // the take card rises at once with what has been heard so far (non-final tokens), dashed
        S.take = { kind: 'heard', text: sc.partials[0] || '', partial: true, at: M.now(), phase: 'rise' };
        const step = Math.max(120, (sc.final - 150) / Math.max(1, sc.partials.length));
        sc.partials.forEach((p, i) => M.after(120 + i * step, () => { if (S.take && S.take.partial) S.take.text = p; }, 'talk'));
        M.after(sc.final, () => {
          S.take.partial = false; S.take.text = sc.text; S.take.at = M.now(); S.take.phase = 'rise'; S.talk = 'heard';
          M.tone(990, 0.06, { vol: 0.035, to: 1480 });
          M.after(420, () => { S.take.phase = 'lift'; S.take.at = M.now(); });
          M.after(700, () => { S.take.phase = 'gone'; S.talk = 'idle'; M.feed('ADVENTURER: ' + sc.text, 'player');
            roomAnswers('Figgs', [{ text: '△ Figgs looks to Nuaz.', who: 'delta', dt: 900 }, { text: "FIGGS: I don't think you have the right bar.", col: C.figgs, dt: 1600 }, { text: 'NUAZ: Yara will be here later.', col: C.nuaz }]); });
        }, 'talk');
      };
    },
    play(name) {
      scn = name || scn; M.reset(); TALK.bind();
      M.after(500, () => M.hooks.onMicDown());
      M.after(scn === 'notready' ? 1500 : 1900, () => M.hooks.onMicUp());
      if (scn === 'notready') { M.after(5200, () => { M.hooks.onMicDown(); }); M.after(6800, () => M.hooks.onMicUp()); }
    }
  };

  // ---------------------------------------------------------------- MENU
  const NUAZ_ROWS = () => [
    { label: KO ? '맞은편에 앉기' : 'Sit across', walk: true }, { label: KO ? '태블릿 훔쳐보기' : 'Peek at tablet', walk: true }, { label: KO ? '악수하기' : 'Shake hands', walk: true },
    { label: KO ? '손 흔들기' : 'Wave' }, { label: KO ? '빤히 보기' : 'Stare' }, { label: KO ? '춤추자고 하기' : 'Ask to dance' }, { label: KO ? '세게 치기' : 'Punch hard', walk: true },
    { label: KO ? '장미 주기' : 'Give the rose', icon: '🌹', walk: true }, { label: KO ? '사진 보여주기' : 'Show the photo', icon: '🖼', walk: true }
  ];
  function openAct(target) {
    S.actMode = true; S.target = target; S.rows = NUAZ_ROWS(); S.sel = 0; S.menuOpenAt = M.now(); S.menuCloseAt = 0; S.confirm = null; S.pressed = null;
    M.tone(1100, 0.04, { vol: 0.02 });
    M.after(120, () => { if (S.actMode && !S.confirm) S.confirm = { at: M.now() }; });
  }
  function leaveAct(ms = 200) { S.menuCloseAt = M.now(); S.confirm = null; M.after(ms, () => { S.actMode = false; S.target = null; S.rows = []; S.menuCloseAt = 0; }); M.tone(600, 0.05, { vol: 0.02 }); }
  function select(i) { const n = S.rows.length; S.sel = ((i % n) + n) % n; S.selAt = M.now(); S.confirm = null; M.tone(S.sel % 2 ? 1500 : 1300, 0.03, { vol: 0.02 }); M.after(120, () => { if (S.actMode && S.selAt + 120 <= M.now() + 1) S.confirm = { at: M.now() }; }); }
  function pressRow(i, then) {
    // the commit moment: a press state the eye can see, a hitstop, a ring and sparks, a tick
    const rows = M.menuRows(); const r = rows[i]; S.pressed = { row: i, at: M.now() }; S.confirm = null;
    M.hitstop(90); M.flash(0.14); M.shake(3, 180);
    if (r) { M.addRing(r.x + r.w / 2, r.y + r.h / 2, 60, C.mint); M.sparks(r.x + r.w - 30, r.y + r.h / 2, 9, C.mint); }
    M.tone(1800, 0.25, { vol: 0.04, to: 600 });
    M.after(520, then);
  }
  function performRow(i, text) {
    const label = S.rows[i].label;
    pressRow(i, () => {
      M.feed(text || ('△ The adventurer ' + ({ 'Wave': 'waves at Nuaz.', 'Stare': 'stares at Nuaz.', 'Ask to dance': 'asks Nuaz to dance.', 'Shake hands': 'offers Nuaz his hand.', 'Sit across': 'sits across from Nuaz.', 'Peek at tablet': 'peeks at her tablet.', 'Punch hard': 'punches Nuaz hard.' }[label] || label.toLowerCase() + '.')), 'delta');
      M.after(380, () => leaveAct());                      // the menu stays long enough to see the press land
      roomAnswers('Nuaz', [{ text: 'NUAZ: You want something, tourist?', col: C.nuaz }]);
    });
  }
  const MENU = {
    name: 'menu',
    scenarios: { ok: {}, cancel: {}, lowered: {} },
    bind() {
      M.hooks.onActTap = () => { if (S.actMode) leaveAct(); else openAct({ name: 'Nuaz', x: 13, y: 4, col: C.nuaz }); };
      M.hooks.onStick = (dir) => { if (!S.actMode) return; if (dir[1] === -1) select(S.sel - 1); if (dir[1] === 1) select(S.sel + 1); };
      M.hooks.onRowTap = (i) => { if (!S.actMode) return; if (i === S.sel && S.confirm) performRow(i); else select(i); };
      M.hooks.onConfirm = () => { if (S.actMode && S.confirm) performRow(S.sel); };
      M.hooks.onCancel = () => { if (S.actMode) leaveAct(); };
      M.hooks.onMicDown = null; M.hooks.onMicUp = null;
    },
    play(name) {
      scn = name || scn; M.reset(); MENU.bind(); S.actRaised = scn !== 'lowered';
      M.after(600, () => M.hooks.onActTap());
      M.after(1500, () => M.hooks.onStick([0, 1])); M.after(2000, () => M.hooks.onStick([0, 1])); M.after(2500, () => M.hooks.onStick([0, 1]));
      if (scn === 'cancel') { M.after(3600, () => M.hooks.onCancel()); M.after(5200, () => M.hooks.onActTap()); M.after(6200, () => M.hooks.onStick([0, 1])); M.after(7300, () => M.hooks.onConfirm()); }
      else M.after(3600, () => M.hooks.onConfirm());
    }
  };

  // ---------------------------------------------------------------- SLOT (mic in the menu)
  const SLOT = {
    name: 'slot',
    scenarios: {
      ok: { heard: 'tap her on the shoulder', label: 'Tap shoulder', walk: true, judge: 520, gate: false, line: '△ The adventurer taps Nuaz on the shoulder.' },
      rewrite: { heard: 'fly over to her', label: 'Attempt to fly', judge: 640, gate: true, rewritten: true, why: 'an attempt', line: '△ The adventurer attempts to fly over to Nuaz.', reply: '△ An invisible wall blocks him.' },
      hostile: { heard: 'punch her in the jaw as hard as I can', label: 'Punch hard', walk: true, judge: 560, gate: true, rewritten: true, why: 'your act only', line: '△ The adventurer punches Nuaz hard.', reply: 'NUAZ: Bad touch. Last warning.' },
      duplicate: { heard: 'wave at her', label: 'Wave', dup: 3, judge: 300, line: '△ The adventurer waves at Nuaz.' },
      reason: { heard: 'set my rose on fire', judge: 700, reason: "You don't have anything to light it with." },
      say: { heard: "tell her she's beautiful", judge: 560, say: "You're beautiful." },
      slow: { heard: 'tap her on the shoulder', label: 'Tap shoulder', walk: true, judge: 4200, gate: false, line: '△ The adventurer taps Nuaz on the shoulder.' },
      empty: { heard: '', judge: 0 }
    },
    bind() {
      MENU.bind();
      let slotRow = null, typer = null, prevSel = 0;
      const slotIndex = () => S.rows.indexOf(slotRow);
      function animateOpen(to, ms, then) { const row = slotRow; if (!row || !row.slot) return then && then(); const from = row.slot.open, t0 = M.now(); const iv = setInterval(() => { const k = Math.min(1, (M.now() - t0) / ms); if (!row.slot) { clearInterval(iv); return; } row.slot.open = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (k >= 1) { clearInterval(iv); then && then(); } }, 16); }
      function closeSlot(ms = 200) { if (!slotRow) return; const r = slotRow; if (S.sel === S.rows.indexOf(r)) S.sel = prevSel; animateOpen(0, ms, () => { const i = S.rows.indexOf(r); if (i >= 0) S.rows.splice(i, 1); if (S.sel >= S.rows.length) S.sel = S.rows.length - 1; }); slotRow = null; }
      function landAsRow(sc, then) {
        // the slot becomes an ordinary row: pressed, then performed; the menu stays open long enough to read it
        const r = slotRow; r.slot.state = 'pressed'; r.slot.pressedAt = M.now(); S.confirm = null;
        const i = slotIndex(); const rows = M.menuRows(); const rr = rows[i];
        M.hitstop(100); M.flash(0.16); M.shake(4, 200); M.tone(1800, 0.3, { vol: 0.045, to: 500 });
        if (rr) { M.addRing(rr.x + rr.w / 2, rr.y + rr.h / 2, 70, C.violet); M.sparks(rr.x + rr.w - 30, rr.y + rr.h / 2, 12, C.gold); }
        M.after(600, () => { if (sc.rewritten) M.feed(null, 'rewrite', { from: sc.heard, to: sc.label }); M.feed(sc.line, 'delta'); Object.assign(r, { kind: 'row', label: sc.label, walk: sc.walk, fresh: M.now(), churnUntil: 0 }); delete r.slot; slotRow = null;
          M.after(1100, () => leaveAct());
          roomAnswers('Nuaz', [{ text: sc.reply || 'NUAZ: Hm. Hands to yourself, tourist.', who: sc.reply && sc.reply.startsWith('△') ? 'delta' : 'npc', col: C.nuaz }]);
          then && then(); }, 'slot');
      }
      M.hooks.onMicDown = () => {
        if (!S.actMode || !S.target) return;
        const sc = SLOT.scenarios[scn]; M.cancelTimers('slot'); S.thinkingAt = 0;
        if (slotRow) { const i = S.rows.indexOf(slotRow); if (i >= 0) S.rows.splice(i, 1); slotRow = null; }   // a retry replaces the old slot
        else prevSel = S.sel;
        // the slot always opens at the very bottom of the menu, below every row; the selection jumps to it
        slotRow = { kind: 'slot', slot: { open: 0, state: 'listening', heard: sc.heard, typed: 0 } };
        S.rows.push(slotRow); S.sel = S.rows.length - 1; S.selAt = M.now(); S.confirm = null;
        S.talk = 'listening';
        animateOpen(1, 220);
        M.tone(880, 0.05, { vol: 0.02, to: 1320 });
      };
      M.hooks.onMicUp = () => {
        if (!slotRow || S.talk !== 'listening') return;
        const sc = SLOT.scenarios[scn]; const s = slotRow.slot; S.talk = 'finalizing';
        s.gotAt = M.now();   // no beam (Josh, 21:38 JST): the slot itself flashes once to say the speech went through
        if (!sc.heard) { M.after(350, () => { s.state = 'nothing'; S.talk = 'idle'; M.tone(300, 0.1, { type: 'triangle', vol: 0.02 }); M.after(900, () => closeSlot()); }, 'slot'); return; }
        // the words fill the slot (18 ms per char, 400 ms cap), then the judge
        s.state = 'filling'; const per = Math.min(18, 400 / sc.heard.length); const t0 = M.now();
        typer = setInterval(() => { s.typed = Math.min(sc.heard.length, (M.now() - t0) / per); if (s.typed >= sc.heard.length) { clearInterval(typer); s.state = 'judging'; s.slowSince = M.now(); S.talk = 'idle'; } }, 16);
        M.after(Math.min(400, per * sc.heard.length) + sc.judge, () => {
          if (!slotRow) return;
          if (sc.reason) { s.state = 'reason'; s.reason = sc.reason; M.feed(sc.reason, 'reason'); M.tone(240, 0.25, { type: 'square', vol: 0.03 }); M.shake(3, 150); S.sel = slotIndex(); S.confirm = { at: M.now(), label: 'nothing happens' }; return; }
          if (sc.say) { s.state = 'said'; M.tone(700, 0.08, { vol: 0.03, to: 1100 }); M.after(700, () => { M.feed('ADVENTURER: ' + sc.say, 'player'); closeSlot(); M.after(400, () => leaveAct()); roomAnswers('Nuaz', [{ text: 'NUAZ: ...Thank you?', col: C.nuaz }]); }); return; }
          if (sc.dup !== undefined) { s.state = 'landed'; s.label = sc.label; s.landedAt = M.now(); M.after(380, () => { closeSlot(180); S.sel = sc.dup; performRow(sc.dup, sc.line); }); return; }
          s.state = 'landed'; s.label = sc.label; s.landedAt = M.now(); s.rewritten = !!sc.rewritten; s.why = sc.why; s.walk = sc.walk;
          M.tone(1200, 0.08, { vol: 0.03, to: 1700 });
          if (sc.gate) { S.sel = slotIndex(); M.after(340, () => { S.confirm = { at: M.now(), label: sc.rewritten ? 'do this instead?' : 'do it?' }; }); }
          else M.after(320, () => landAsRow(sc));
        }, 'slot');
      };
      M.hooks.onConfirm = () => {
        if (!S.actMode) return;
        if (slotRow && slotRow.slot.state === 'landed') { landAsRow(SLOT.scenarios[scn]); return; }
        if (slotRow && slotRow.slot.state === 'reason') { closeSlot(); return; }
        if (S.confirm) performRow(S.sel);
      };
      M.hooks.onCancel = () => {
        if (!S.actMode) return;
        if (slotRow) { M.cancelTimers('slot'); if (typer) clearInterval(typer); S.talk = 'idle'; M.tone(500, 0.08, { vol: 0.02 }); closeSlot(); S.confirm = null; M.after(140, () => { if (S.actMode) S.confirm = { at: M.now() }; }, 'slot'); return; }
        leaveAct();
      };
    },
    play(name) {
      scn = name || scn; M.reset(); SLOT.bind();
      M.after(500, () => M.hooks.onActTap());
      M.after(1300, () => M.hooks.onStick([0, 1]));
      M.after(2000, () => M.hooks.onMicDown());
      M.after(scn === 'empty' ? 2600 : 3900, () => M.hooks.onMicUp());
      const sc = SLOT.scenarios[scn];
      if (sc.gate) M.after(3900 + 400 + sc.judge + 1500, () => M.hooks.onConfirm());
      if (sc.reason) { M.after(3900 + 400 + sc.judge + 2600, () => M.hooks.onMicDown()); M.after(3900 + 400 + sc.judge + 4300, () => { scn = 'ok'; M.hooks.onMicUp(); }); }
    }
  };

  // ---------------------------------------------------------------- wiring
  const FLOWS = { talk: TALK, menu: MENU, slot: SLOT };
  const F = FLOWS[flow] || TALK;
  F.bind();
  const bar = $('#controls');
  if (bar) {
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.textContent = label; b.className = cls || ''; b.addEventListener('click', fn); bar.appendChild(b); return b; };
    for (const k of Object.keys(F.scenarios)) mk(k, () => { scn = k; F.play(k); bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === k)); }, k === scn ? 'on' : '');
    mk('reset', () => { M.reset(); F.bind(); if (flow === 'menu') S.actRaised = scn !== 'lowered'; }, 'alt');
    mk(M.skin() === 'ascii' ? 'color skin' : 'ascii skin', () => { const u = new URL(location.href); u.searchParams.set('skin', M.skin() === 'ascii' ? 'color' : 'ascii'); location.href = u.toString(); }, 'alt');
  }
  if (qs.get('auto') === '1') { document.fonts.ready.then(() => setTimeout(() => F.play(scn), 300)); }
  window.FLOW = F; window.setScenario = (k) => { scn = k; };
})();
