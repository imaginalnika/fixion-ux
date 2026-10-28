/* 취소 / 하기 exploration: one renderer for every option page and the comparison board.
 * Each phone is a static SVG in the game's own logical units (portrait 720x1558 = 390x844 CSS; phone landscape
 * 1558x720 = 844x390) with the deck positions from drdr-dr layout.rb. No animation: four frames per option.
 * Query: ?o=p|l  &s=color|ascii  &l=ko|en  (&solo=1&f=1..4 draws one phone only, for screenshots). */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const Q = { o: qs.get('o') === 'l' ? 'l' : 'p', s: qs.get('s') === 'ascii' ? 'ascii' : 'color', l: qs.get('l') === 'en' ? 'en' : 'ko',
              solo: qs.get('solo') === '1', f: Math.min(4, Math.max(1, +(qs.get('f') || 2))) };

  // ------------------------------------------------------------------ palette (site mock / game)
  const C = { ink: '#090c12', deck: '#06080c', mint: '#6fe2c7', amber: '#e6b05c', amberHi: '#ffd696', amberRim: '#ffe6be',
    violet: '#9670ff', violetDeep: '#4c2e7c', gold: '#ffd166', paper: '#faf8ef', muted: '#8a949c', red: '#ee5656',
    green: '#5cdc80', sand: '#d6be8c', you: '#7cd6ba', dark: '#281a0a' };

  // ------------------------------------------------------------------ layouts (layout.rb)
  const LAY = {
    p: { o: 'p', W: 720, H: 1558, hdr: { y: 88, h: 64 }, map: { x: 45, y: 244, c: 42 }, deckTop: 924,
         pad: { x: 112, y: 1208, r: 74 }, mic: { x: 360, y: 1208, r: 80 }, act: { x: 612, y: 1208, r: 56 },
         feed: { cx: 360, bottom: 1084, lh: 31, fs: 20 }, fs: 22, rh: 46, head: 34, lbl: 17, small: 15, cardW: 300, css: [390, 844] },
    l: { o: 'l', W: 1558, H: 720, hdr: { y: 0, h: 52 }, map: { x: 439, y: 66, c: 40 }, deckTop: null,
         pad: { x: 1176, y: 540, r: 48 }, mic: { x: 1300, y: 540, r: 66 }, act: { x: 1424, y: 540, r: 42 },
         feed: { cx: 220, bottom: 400, lh: 28, fs: 17 }, fs: 19, rh: 42, head: 30, lbl: 15, small: 13, cardW: 260, css: [844, 390] }
  };

  // ------------------------------------------------------------------ words (lang.rb: 'Do' => '하기', 'Cancel' => '취소')
  const TXT = {
    ko: { title: '루이 뉘똥 샵', music: '♪ 켬', head: '점원', rows: ['부르기', '끄덕이기', '빤히 보기', '카드 건네기'], cancel: '취소', do: '하기',
          act: '행동', mic: '행동 말하기', menu: '메뉴', heard: '뺨 한 대 갈겨', label: '뺨 때리기', tg: '점', tname: '점원', og: '젬', oname: '젬마',
          feed: [['npc', '점원: 찾으시는 거 있으세요?'], ['delta', '△ 젬마가 가방을 들어 본다.']], result: '△ 당신이 점원을 빤히 본다.' },
    en: { title: 'Lui Nuittong Shop', music: '♪ on', head: 'CLERK', rows: ['Call over', 'Nod', 'Stare', 'Hand card'], cancel: 'Cancel', do: 'Do',
          act: 'ACT', mic: 'ACTION', menu: 'MENU', heard: 'smack him one', label: 'Slap', tg: 'C', tname: 'Clerk', og: 'G', oname: 'Gemma',
          feed: [['npc', 'CLERK: Looking for anything?'], ['delta', '△ Gemma lifts a bag.']], result: '△ You stare at the clerk.' }
  };

  // ------------------------------------------------------------------ the options
  const OPTS = [
    { id: 1, title: 'Stick compass', ko: '스틱 나침반',
      line: 'The left thumb that chooses also does and undoes: the stick\'s dead ◀ ▶ become 취소 / 하기, and the deck gains no control.',
      model: [['Pick', 'stick ▲▼ (unchanged)'], ['Do', 'push the stick ▶ past ~60 % of its throw'], ['Cancel / leave', 'push ◀ (drops a slot; with no slot, leaves). ACT tap still leaves'],
              ['Gated slot', 'push ▶ and hold ~0.3 s: the green notch fills (harm cannot fire on a flick)'], ['New objects', 'two rim notches on the stick + a ▶ at the lit row\'s end']],
      caps: ['Menu open. The stick shows ◀ 취소 and 하기 ▶ in its idle side notches; the lit row ends in the same ▶.',
             'Stick ▼▼ to 빤히 보기. Nothing on the deck changed: ▶ now means "빤히 보기".',
             'Gated spoken action. The slot carries the ▶; the thumb pushes ▶ and holds, the notch fills. ◀ drops it.',
             'Pushed ▶: the row presses, the △ line lands in the feed. Mic and ACT were never touched.'],
      tech: 'Needs a dominant-axis rule in tick_pad (|dx| > 1.6 |dy| and > 0.6 r) so a sloppy ▼ never commits.' },
    { id: 2, title: 'ACT takes the verb', ko: '행동이 동사를 든다',
      line: 'The big yellow button finally means "do": its face reads 하기 and the verb sits on its rim, so one press does exactly what you read.',
      model: [['Pick', 'stick ▲▼ (unchanged)'], ['Do', 'tap ACT: its face says 하기, the selected verb is printed above it'], ['Cancel / leave', 'stick ◀ (red notch), or tap empty floor'],
              ['Gated slot', 'same tap; the verb above ACT becomes the slot\'s label (red for harm)'], ['New objects', 'none: ACT relabels, the stick gains one ◀ notch']],
      caps: ['Menu open. ACT\'s face turns from 행동 to 하기 and shows 부르기 above it. The stick\'s ◀ is 취소.',
             'Stick to 빤히 보기: the verb above ACT follows the lit row (amber dot on the row = "ACT does this").',
             'Gated spoken action: ACT now carries the slot\'s label, in red because it is a hit. ◀ drops it.',
             'Tapped ACT: it presses like a key, the row flashes, the feed gets the △ line.'],
      tech: 'Moves "tap ACT = leave" to stick ◀ / tap floor. Text on ACT is a Draw.label; nothing new to render.' },
    { id: 3, title: 'The row is the button', ko: '줄이 곧 버튼',
      line: 'You confirm on the words you are confirming: the lit row grows a 하기 end and the card gets its own 취소, so nothing is added to the deck.',
      model: [['Pick', 'stick ▲▼ or tap a row: the lit row grows to 44 css px tall'], ['Do', 'tap the lit row\'s 하기 ▸ end (or the row again)'], ['Cancel / leave', '취소 ✕ in the card\'s header, tap empty floor, or tap ACT (unchanged)'],
              ['Gated slot', 'the slot itself is split ✕ | label | ✓'], ['New objects', 'none on the deck; card header and lit row get hit zones']],
      caps: ['Menu open: the lit row is tall, ends in 하기 ▸; the header carries 취소 ✕. Deck untouched.',
             'Stick to 빤히 보기: the 하기 end travels with the light.',
             'Gated spoken action: the slot is the question, ✕ left, ✓ 하기 right, label in the middle.',
             'Tapped 하기: the row presses in place, the △ line lands in the feed below.'],
      tech: 'Reach is the cost: the card can sit at the top of the map. Stick + ACT tap still work for one-hand play.' },
    { id: 4, title: 'Hold fuse', ko: '꾹 누르기',
      line: 'Committing becomes a take, like the mic: hold ACT and the lit row fills; let go early and nothing happened. No second button exists.',
      model: [['Pick', 'stick ▲▼ (unchanged)'], ['Do', 'hold ACT ~0.35 s: the fuse ticks round ACT and the lit row fills in step'], ['Cancel / leave', 'let go before full (nothing is done); a quick tap still leaves'],
              ['Gated slot', 'a longer fuse (~0.9 s, 24 ticks) for harm or doubt'], ['New objects', 'tick ring around ACT, fill bar on the row']],
      caps: ['Menu open. Faint ticks round ACT say it can be held; nothing else appears.',
             'Holding ACT on 빤히 보기: ticks light clockwise and the row fills at the same rate.',
             'Gated spoken action: the fuse is twice as long and the slot fills red; releasing drops nothing.',
             'Fuse full: the row presses, the △ line lands. The hold was the confirm.'],
      tech: 'Hold vs. drag-to-aim on ACT: a hold that does not move past AIM_DEAD is a fuse; movement aims.' },
    { id: 5, title: 'Touch them', ko: '상대를 누른다',
      line: 'The confirm lives in the scene, not the chrome: the target\'s reticle opens into a gate with the verb, and you do it by touching them.',
      model: [['Pick', 'stick ▲▼ or tap a row'], ['Do', 'tap the person inside the gate (a 2x2-cell hit box, ~48 css px)'], ['Cancel / leave', 'tap empty floor; ACT tap leaves (unchanged)'],
              ['Gated slot', 'gate turns red, its tag carries the slot\'s label; same tap'], ['New objects', 'none on the deck; the reticle grows a tag']],
      caps: ['Menu open: the usual mint brackets on the clerk; a hairline ties the lit row to them.',
             'Stick to 빤히 보기: the brackets open into a gate, the tag under the clerk reads 빤히 보기 ✓.',
             'Gated spoken action: the gate goes red with the judged label. Touch them to do it, the floor to drop it.',
             'Touched: the gate snaps shut on the clerk, dots ring out, the △ line lands.'],
      tech: 'Needs a stick/ACT path too for one-hand play (pairs well with option 2). Gate hit box must beat the card\'s.' },
    { id: 6, title: 'ACT collar', ko: '행동 칼라',
      line: 'If the pair must stay by ACT, make it part of ACT: one crescent hugging its rim, 취소 | 하기, opening away from the mic.',
      model: [['Pick', 'stick ▲▼ (unchanged)'], ['Do', 'tap the collar\'s right half (✓ 하기)'], ['Cancel / leave', 'tap the collar\'s left half (✕ 취소); ACT tap also leaves'],
              ['Gated slot', 'the collar stays; the chip on its seam shows the slot\'s label'], ['New objects', 'one crescent (two zones) around ACT while the menu is open']],
      caps: ['Menu open: a dark crescent rides ACT\'s upper rim, ✕ 취소 left, ✓ 하기 right, verb chip on the seam.',
             'Stick to 빤히 보기: the chip on the seam follows. The crescent never reaches the mic.',
             'Gated spoken action: the chip shows the judged label in red.',
             'Tapped ✓ 하기: that half lights and presses, the △ line lands.'],
      tech: 'Annulus = Draw.ring segments or a pre-cut sprite; landscape rotates it to the upper right of ACT.' }
  ];

  // ------------------------------------------------------------------ svg helpers
  let uid = 0;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const n = (v) => Math.round(v * 10) / 10;
  const at = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k}="${v}"`).join(' ');
  const T = (x, y, s, size, fill, o = {}) => `<text ${at({ x: n(x), y: n(y), 'font-size': n(size), fill, 'text-anchor': o.a || 'middle', 'dominant-baseline': 'central',
    'font-weight': o.w || 400, opacity: o.op, 'letter-spacing': o.ls, stroke: o.stroke, 'stroke-width': o.sw, 'paint-order': o.stroke ? 'stroke' : undefined, 'text-decoration': o.deco })}>${esc(s)}</text>`;
  const R = (x, y, w, h, fill, o = {}) => `<rect ${at({ x: n(x), y: n(y), width: n(w), height: n(h), rx: o.rx, fill: fill || 'none', opacity: o.op, stroke: o.st, 'stroke-width': o.sw, 'stroke-dasharray': o.dash })}/>`;
  const Ci = (x, y, r, fill, o = {}) => `<circle ${at({ cx: n(x), cy: n(y), r: n(r), fill: fill || 'none', opacity: o.op, stroke: o.st, 'stroke-width': o.sw, 'stroke-dasharray': o.dash })}/>`;
  const Ln = (x1, y1, x2, y2, st, sw, o = {}) => `<line ${at({ x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), stroke: st, 'stroke-width': sw, opacity: o.op, 'stroke-linecap': o.cap || 'round', 'stroke-dasharray': o.dash })}/>`;
  const pt = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy - r * Math.sin(deg * Math.PI / 180)];
  // ring segment from a1 down to a2 (degrees, maths convention, a1 > a2: clockwise on screen)
  function annulus(cx, cy, r1, r2, a1, a2, fill, o = {}) {
    const [ox1, oy1] = pt(cx, cy, r2, a1), [ox2, oy2] = pt(cx, cy, r2, a2), [ix2, iy2] = pt(cx, cy, r1, a2), [ix1, iy1] = pt(cx, cy, r1, a1);
    const big = a1 - a2 > 180 ? 1 : 0;
    const d = `M${n(ox1)} ${n(oy1)} A${n(r2)} ${n(r2)} 0 ${big} 1 ${n(ox2)} ${n(oy2)} L${n(ix2)} ${n(iy2)} A${n(r1)} ${n(r1)} 0 ${big} 0 ${n(ix1)} ${n(iy1)} Z`;
    return `<path ${at({ d, fill: fill || 'none', opacity: o.op, stroke: o.st, 'stroke-width': o.sw, 'stroke-linejoin': 'round' })}/>`;
  }
  function arc(cx, cy, r, a1, a2, st, sw, o = {}) {
    const [x1, y1] = pt(cx, cy, r, a1), [x2, y2] = pt(cx, cy, r, a2);
    return `<path ${at({ d: `M${n(x1)} ${n(y1)} A${n(r)} ${n(r)} 0 ${a1 - a2 > 180 ? 1 : 0} 1 ${n(x2)} ${n(y2)}`, fill: 'none', stroke: st, 'stroke-width': sw, opacity: o.op, 'stroke-linecap': o.cap || 'round' })}/>`;
  }
  // the game's ✓ and ✕ are drawn strokes (action_ui.rb check_mark / cross_mark), not font glyphs
  const check = (cx, cy, s, st, sw, op) => `<path ${at({ d: `M${n(cx - s * 0.5)} ${n(cy)} L${n(cx - s * 0.15)} ${n(cy + s * 0.38)} L${n(cx + s * 0.52)} ${n(cy - s * 0.42)}`, fill: 'none', stroke: st, 'stroke-width': sw || s * 0.16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: op })}/>`;
  const cross = (cx, cy, s, st, sw, op) => Ln(cx - s * 0.4, cy - s * 0.4, cx + s * 0.4, cy + s * 0.4, st, sw || s * 0.15, { op }) + Ln(cx - s * 0.4, cy + s * 0.4, cx + s * 0.4, cy - s * 0.4, st, sw || s * 0.15, { op });
  function glow(defs, x, y, r, col, a) { // the game's glow.png: flat to 35 %, then out to nothing
    const id = `g${++uid}`;
    defs.push(`<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="${a}"/><stop offset="0.35" stop-color="${col}" stop-opacity="${a * 0.75}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`);
    return Ci(x, y, r, `url(#${id})`);
  }
  const wtext = (s, size) => [...String(s)].reduce((w, ch) => w + (/[ᄀ-ᇿ㄰-㆏가-힣]/.test(ch) ? size : size * 0.6), 0);
  function dots(cx, cy, rx, ry, col, cnt = 18, size = 16, op = 0.85) { // the 글자들 dot ring
    let s = ''; for (let i = 0; i < cnt; i++) { const a = i / cnt * Math.PI * 2; s += T(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, i % 3 ? '·' : '.', size, col, { op }); } return s;
  }
  function sparks(cx, cy, r, col, size = 18) {
    const g = ['/', '-', '\\', '|', '·']; let s = '';
    for (let i = 0; i < 10; i++) { const a = i * 36 + 12; const [x, y] = pt(cx, cy, r * (1 + (i % 3) * 0.12), a); s += T(x, y, g[i % g.length], size, col, { w: 700, op: 0.9 }); }
    return s;
  }

  // ------------------------------------------------------------------ the frame states
  // f1 menu open (row 0) · f2 pick (빤히 보기) · f3 a gated spoken action waits in the slot · f4 result (pressed, △ in feed)
  const FRAME = { 1: { sel: 0 }, 2: { sel: 2 }, 3: { sel: 2, slot: true }, 4: { sel: 2, done: true } };

  // ------------------------------------------------------------------ one phone
  function phone(id, f, o, skin, lang) {
    const L = LAY[o], W = TXT[lang], st = FRAME[f], A = skin === 'ascii', P = o === 'p';
    const defs = [], out = [];
    const m = L.map, c = m.c, mw = 15 * c, mh = 16 * c;
    const cell = (x, y) => ({ x: m.x + (x + 0.5) * c, y: m.y + (y + 0.5) * c });
    const hostile = !!st.slot;
    const verb = st.slot ? W.label : W.rows[st.sel];
    const k = L.act.r / 56;                         // control scale vs portrait
    const fontKO = lang === 'ko';

    // ---------------- background, header
    out.push(R(0, 0, L.W, L.H, A ? C.ink : '#090c12'));
    const hy = L.hdr.y, hh = L.hdr.h;
    out.push(R(16, hy + 8, P ? 164 : 150, hh - 16, '#0c1218'));
    out.push(Ci(34, hy + hh / 2, 6, C.mint), T(48, hy + hh / 2, 'LIVE r1', P ? 17 : 15, '#9fb6b0', { a: 'start' }));
    out.push(T(P ? 196 : 186, hy + hh / 2, W.title, P ? 19 : 17, '#d8dcd6', { a: 'start' }));
    out.push(T(L.W - (P ? 110 : 120), hy + hh / 2, W.music, P ? 19 : 17, '#d8dcd6', { a: 'start' }));
    for (let i = 0; i < 3; i++) out.push(R(L.W - 50, hy + hh / 2 - 9 + i * 8, 22, 2.5, '#9aa4a8'));
    out.push(R(0, hy + hh, L.W, 1, '#1a242a'));

    // ---------------- the map (a shop, simplified)
    const objs = { counter: [[1, 4], [2, 4], [3, 4], [4, 4]], table: [[9, 8], [10, 8]], bench: [[10, 11], [11, 11]], plants: [[1, 13], [13, 13]], disp: [[13, 2], [13, 6], [13, 10]] };
    const tgt = { x: 3, y: 3 }, gem = { x: 6, y: 12 }, me = { x: 7, y: 11 };
    if (!A) {
      out.push(R(m.x, m.y, mw, mh, '#2a1c12'));
      out.push(R(m.x + c, m.y + c, mw - 2 * c, mh - 2 * c, '#ebe5d6'));
      for (let y = 1; y < 15; y++) out.push(Ln(m.x + c, m.y + y * c, m.x + mw - c, m.y + y * c, '#d8cfba', 1.2));
      for (let y = 1; y < 15; y++) for (let x = 1; x < 14; x += 3) out.push(Ln(m.x + (x + (y % 2) * 1.5) * c, m.y + y * c, m.x + (x + (y % 2) * 1.5) * c, m.y + (y + 1) * c, '#ddd5c2', 1));
      for (const x of [1, 2, 3, 4, 10, 11, 12, 13]) { out.push(R(m.x + x * c + 4, m.y + 5, c - 8, c - 10, '#c9a46a', { rx: 2 })); out.push(R(m.x + x * c + 11, m.y + 14, c - 22, c - 26, ['#b5562e', '#2f3a5a', '#8a2a3a', '#d08a40'][x % 4], { rx: 3 })); }
      out.push(R(m.x + 6 * c, m.y + 5, 3 * c, c - 10, '#3a2414', { st: '#c9a46a', sw: 2 }));
      for (const x of [6, 7, 8]) out.push(R(m.x + x * c + 3, m.y + 15 * c + 4, c - 6, c - 8, '#b8c4cc', { op: 0.7 }));
      out.push(R(m.x + c, m.y + 4 * c + 8, 4 * c, c * 0.7, '#2b2320', { rx: 3 }), Ci(m.x + 3.5 * c, m.y + 4.45 * c, 6, '#e8c050'));
      out.push(R(m.x + 9 * c + 4, m.y + 8 * c + 6, 2 * c - 8, c - 12, '#f6f4ee', { st: '#b9b4a8', sw: 2 }));
      for (let i = 0; i < 3; i++) out.push(R(m.x + 9 * c + 14 + i * 20, m.y + 8 * c + 14, 13, 13, ['#d08a40', '#8a2a3a', '#2a2a2a'][i], { rx: 2 }));
      out.push(R(m.x + 10 * c + 2, m.y + 11 * c + 8, 2 * c - 4, c - 18, '#8f1f2a', { rx: 6 }));
      for (const [x, y] of objs.plants) { const p = cell(x, y); out.push(R(p.x - 9, p.y + 2, 18, 14, '#1a1a1a'), Ci(p.x, p.y - 4, 12, '#2f5a2a'), Ci(p.x - 7, p.y - 9, 7, '#3d7236')); }
      for (const [x, y] of objs.disp) { const p = cell(x, y); out.push(`<ellipse cx="${p.x}" cy="${p.y + 6}" rx="${c * 0.4}" ry="${c * 0.22}" fill="#f6f4ee" stroke="#c9c2b2" stroke-width="2"/>`, R(p.x - 7, p.y - 10, 14, 13, '#c9a46a', { rx: 2 })); }
    } else {
      out.push(R(m.x, m.y, mw, mh, '#0b0f15'));
      const g = (x, y, ch, col, w = 400) => { const p = cell(x, y); out.push(T(p.x, p.y, ch, c * 0.62, col, { w })); };
      for (let y = 0; y < 16; y++) for (let x = 0; x < 15; x++) {
        const edge = x === 0 || y === 0 || x === 14 || y === 15;
        if (y === 0 && [1, 2, 3, 4, 10, 11, 12, 13].includes(x)) g(x, y, 'b', '#d6a35a');
        else if (y === 15 && x === 7) g(x, y, '+', C.amber, 700);
        else if (edge) g(x, y, '#', '#3c4a52');
        else g(x, y, '.', '#26313a');
      }
      for (const [x, y] of objs.counter) g(x, y, '=', '#a08458', 700);
      for (const [x, y] of objs.table) g(x, y, 'T', '#c4d4e2', 700);
      for (const [x, y] of objs.bench) g(x, y, 'h', '#c04a5e', 700);
      for (const [x, y] of objs.plants) g(x, y, '&', '#4fa36a', 700);
      for (const [x, y] of objs.disp) g(x, y, 'o', '#c4d4e2');
    }
    // actors: big letters (Hangul syllable in KO), name tag over the target
    const actor = (p, ch, col, outline) => {
      const q = cell(p.x, p.y);
      if (!A) out.push(`<ellipse cx="${q.x}" cy="${q.y + c * 0.36}" rx="${c * 0.32}" ry="${c * 0.1}" fill="#000" opacity="0.18"/>`);
      out.push(T(q.x, q.y, ch, c * 0.82, col, { w: 800, stroke: A ? undefined : outline, sw: A ? undefined : 4 }));
    };
    actor(gem, W.og, A ? '#ff63b6' : '#e2506f', '#fff4f4');
    actor(me, '@', A ? C.mint : '#1fae90', '#0b1f1a');
    actor(tgt, W.tg, A ? '#7fb2ff' : '#2c5e9e', '#ffffff');
    const tc = cell(tgt.x, tgt.y);
    out.push(T(tc.x, tc.y - c * 0.98, W.tname, P ? 14 : 12, A ? '#7fb2ff' : '#2c5e9e', { w: 700, stroke: A ? undefined : '#f4f0e6', sw: 3 }));

    // ---------------- the menu card geometry
    const fs = L.fs, rh = L.rh;
    const head = id === 3 ? (P ? 84 : 76) : L.head;
    const bigRow = P ? 84 : 78;
    const rowsH = W.rows.map((_, i) => (id === 3 && i === st.sel && !st.slot) ? bigRow : rh);
    const slotH = st.slot ? (id === 3 ? (P ? 108 : 96) : Math.round(rh * 1.6)) : 0;
    const cw = L.cardW + (id === 3 ? 60 : 0);
    const total = rowsH.reduce((a, b) => a + b, 0) + slotH;
    const gapX = id === 5 ? c * 1.35 + 14 : c * 0.9 + 8;
    let cx = tc.x + gapX; if (cx + cw > m.x + mw - 8) cx = tc.x - gapX - cw;
    const yTop = Math.max(m.y + 14 + head, Math.min(tc.y - total / 2, m.y + mh - 14 - total));
    const pad8 = 8;
    const card = { x: cx - pad8, y: yTop - head - pad8, w: cw + 2 * pad8, h: total + head + 2 * pad8 };
    const rows = []; { let y = yTop; rowsH.forEach((h, i) => { rows.push({ i, x: cx, y, w: cw, h, label: W.rows[i] }); y += h; }); }
    const slot = st.slot ? { x: cx, y: yTop + rowsH.reduce((a, b) => a + b, 0), w: cw, h: slotH } : null;
    const selRow = rows[st.sel];
    const focus = slot || selRow;                   // what a confirm would act on

    // ---------------- the card
    if (A) out.push(R(card.x, card.y, card.w, card.h, C.ink, { op: 0.96, st: C.mint, sw: 1.5 }));
    else out.push(R(card.x, card.y, card.w, card.h, '#0b0e14', { op: 0.95, st: '#1f2c33', sw: 1.5, rx: 8 }));
    const hc = yTop - head / 2;
    if (id === 3) {                                 // the card's own 취소: the header is a hit strip
      const zw = P ? 132 : 118;
      out.push(T(cx + 10, hc, A ? `[ ${W.head} ]` : W.head, L.small, A ? C.mint : '#86a8d8', { a: 'start', w: 700 }));
      out.push(R(cx + cw - zw, hc - head / 2 + 6, zw, head - 12, A ? C.ink : '#1a0f12', { st: C.red, sw: A ? 2 : 1.5, rx: A ? 0 : 4, op: 0.95 }));
      out.push(cross(cx + cw - zw + 26, hc, P ? 20 : 17, C.red, 3.4), T(cx + cw - zw + 48, hc, W.cancel, L.small + 1, '#f0b4b4', { a: 'start', w: 700 }));
    } else {
      out.push(T(cx + 10, hc, A ? `[ ${W.head} ]` : W.head, L.small, A ? C.mint : '#86a8d8', { a: 'start', w: 700 }));
    }
    for (const r of rows) {
      const sel = r.i === st.sel && !st.slot, pressed = sel && st.done;
      const yy = r.y + 3, hh = r.h - 6;
      if (!A) {
        out.push(R(r.x, yy, r.w, hh, pressed ? '#6fe2c7' : sel ? '#1c5446' : '#161c24', { rx: 3 }));
        out.push(R(r.x, yy, 5, hh, sel ? C.mint : '#38444c'));
      } else if (sel) {
        out.push(R(r.x, yy, r.w, hh, pressed ? C.mint : 'none', { st: C.mint, sw: 2 }));
      }
      if (id === 4 && sel && !st.slot) {           // the fuse fill on the row
        const p = f === 2 ? 0.45 : f === 4 ? 1 : 0;
        if (p > 0 && !pressed) out.push(R(r.x, yy, r.w * p, hh, C.amber, { op: A ? 0.0 : 0.5, rx: 3 }), Ln(r.x, yy + hh - 2, r.x + r.w * p, yy + hh - 2, C.amber, 4, { cap: 'butt' }));
      }
      const tcol = pressed ? '#06080c' : sel ? '#f2fff9' : '#d4dad6';
      const lx = r.x + (A ? 14 : 22);
      out.push(T(lx, r.y + r.h / 2, (A ? (sel ? '> ' : '  ') : '') + r.label, fs, tcol, { a: 'start', w: sel ? 700 : 400 }));
      if (r.i === 3) out.push(T(r.x + r.w - 18, r.y + r.h / 2, '»', fs, '#8a949c'));
      if (sel && !pressed) {
        if (id === 1) out.push(T(r.x + r.w - (r.i === 3 ? 44 : 22), r.y + r.h / 2, '▶', fs * 0.8, C.green, { w: 700 }));
        if (id === 2) out.push(Ci(r.x + r.w - (r.i === 3 ? 44 : 22), r.y + r.h / 2, 6, C.amber));
      }
      if (id === 3 && sel) {                        // the lit row's 하기 end
        const tw = P ? 118 : 106, tx = r.x + r.w - tw;
        out.push(Ln(tx, yy + 8, tx, yy + hh - 8, pressed ? '#06080c' : C.green, 2));
        out.push(T(tx + tw / 2 - 10, r.y + r.h / 2, W.do, fs, pressed ? '#06080c' : C.green, { w: 700 }), T(tx + tw - 16, r.y + r.h / 2, '▸', fs, pressed ? '#06080c' : C.green, { w: 700 }));
      }
    }
    if (slot) {                                     // the gated spoken action
      const yy = slot.y + 4, hh = slot.h - 8;
      out.push(R(slot.x, yy, slot.w, hh, A ? C.ink : '#1a1418', { st: C.red, sw: 2.5, rx: A ? 0 : 3 }));
      let x0 = slot.x + 16, x1 = slot.x + slot.w - 16;
      if (id === 3) {
        const lw = P ? 80 : 72, rw = P ? 110 : 98;
        out.push(Ln(slot.x + lw, yy + 10, slot.x + lw, yy + hh - 10, C.red, 2), cross(slot.x + lw / 2, yy + hh * 0.38, P ? 22 : 19, C.red, 3.6), T(slot.x + lw / 2, yy + hh * 0.74, W.cancel, L.small, '#f0b4b4', { w: 700 }));
        out.push(R(slot.x + slot.w - rw, yy, rw, hh, A ? 'none' : '#10261a', { op: 0.9 }), Ln(slot.x + slot.w - rw, yy + 10, slot.x + slot.w - rw, yy + hh - 10, C.green, 2));
        out.push(check(slot.x + slot.w - rw / 2, yy + hh * 0.38, P ? 24 : 21, C.green, 4), T(slot.x + slot.w - rw / 2, yy + hh * 0.74, W.do, L.small + 1, C.green, { w: 700 }));
        x0 = slot.x + lw + 12; x1 = slot.x + slot.w - rw - 12;
      }
      const mx = (x0 + x1) / 2;
      out.push(T(mx, yy + hh * 0.3, `“${W.heard}”`, L.small - 1, '#96a0a6', { op: 0.85, deco: 'line-through' }));
      out.push(T(mx, yy + hh * 0.68, W.label, fs, C.paper, { w: 700 }));
      if (id === 1) out.push(T(slot.x + slot.w - 22, yy + hh / 2, '▶', fs * 0.8, C.green, { w: 700 }));
      if (id === 2) out.push(Ci(slot.x + slot.w - 22, yy + hh / 2, 6, C.amber));
      if (id === 4) out.push(R(slot.x, yy, slot.w * 0.3, hh, C.red, { op: A ? 0 : 0.28 }), Ln(slot.x, yy + hh - 3, slot.x + slot.w * 0.3, yy + hh - 3, C.red, 4, { cap: 'butt' }));
    }
    // ---------------- option 5: the reticle (drawn over the card's edge)
    const tagOf = (lbl) => { const s = (P ? 17 : 15), w = wtext(lbl, s) + s * 2.6; return { s, w }; };
    if (id === 5) {
      const gate = st.done ? c * 0.72 : (f === 1 ? c * 0.62 : c * 1.1);
      const col = f === 1 ? C.mint : (hostile ? C.red : (st.done ? '#c9ffe0' : C.green));
      const bl = f === 1 ? 10 : 18, bw = f === 1 ? 3 : 4.5;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = tc.x + sx * gate, y = tc.y + sy * gate;
        out.push(Ln(x, y, x - sx * bl, y, col, bw), Ln(x, y, x, y - sy * bl, col, bw));
      }
      if (f > 1) {
        out.push(Ln(focus.x - 2, focus.y + focus.h / 2, tc.x + gate + 4, tc.y, col, 1.6, { dash: '4 5', op: 0.7 }));
        const { s, w } = tagOf(verb); const ty = tc.y + gate + s * 1.25; const tx0 = Math.min(tc.x - w / 2, cx - 16 - w);
        out.push(R(tx0, ty - s * 0.85, w, s * 1.7, A ? C.ink : '#0b1712', { op: 0.94, st: col, sw: 2, rx: A ? 0 : 3 }));
        out.push(T(tx0 + w / 2 - s * 0.9, ty, verb, s, C.paper, { w: 700 }), check(tx0 + w - s * 1.05, ty, s * 0.8, col, 3));
        if (st.done) out.push(dots(tc.x, tc.y, c * 1.3, c * 1.0, '#9fffd0', 18, P ? 18 : 15));
      }
    } else {
      const bl = 10;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = tc.x + sx * c * 0.62, y = tc.y + sy * c * 0.62; out.push(Ln(x, y, x - sx * bl, y, C.mint, 3), Ln(x, y, x, y - sy * bl, C.mint, 3)); }
    }

    if (st.done && id !== 5) out.push(dots(selRow.x + selRow.w / 2, selRow.y + selRow.h / 2, selRow.w * 0.62, selRow.h * 0.95, '#9fffd0', 22, P ? 18 : 15));

    // ---------------- deck
    if (P) { out.push(R(0, L.deckTop, L.W, L.H - L.deckTop, C.deck), R(0, L.deckTop, L.W, 1.5, C.mint, { op: 0.12 })); }
    else { out.push(R(m.x + mw + 14, L.hdr.h + 8, 1.5, L.H - L.hdr.h - 16, C.mint, { op: 0.1 })); }
    // feed (the last lines; the result line lands in f4)
    { const fd = L.feed, lines = W.feed.slice(); if (st.done) lines.push(['delta', W.result, true]);
      lines.forEach(([who, s, fresh], i) => {
        const y = fd.bottom - (id === 6 && P ? 64 : 0) - (lines.length - 1 - i) * fd.lh;
        out.push(T(fd.cx, y, s, fd.fs, who === 'npc' ? '#9fb2c6' : C.sand, { op: fresh ? 1 : 0.8, w: fresh ? 700 : 400 }));
      });
    }
    const pad = L.pad, mic = L.mic, act = L.act;
    // ---------------- the stick (menu: ▲▼)
    {
      const p = pad, r = p.r; let kdx = 0;
      if (id === 1 && f === 3) kdx = r * 0.32; if (id === 1 && f === 4) kdx = r * 0.45;
      if (!A) out.push(glow(defs, p.x, p.y, r * 1.45, C.mint, 0.12));
      out.push(Ci(p.x, p.y, r, A ? '#141c24' : '#0e161c', { st: C.mint, sw: 2.5, op: 1 }));
      const arrow = (dx, dy, g) => T(p.x + dx * r * 0.66, p.y + dy * r * 0.68, g, (P ? 22 : 17), C.mint, { w: 700, op: 0.85 });
      out.push(arrow(0, -1, '▲'), arrow(0, 1, '▼'));
      const notch = (side, col, glyph, label, lit, fill) => {
        const a1 = side < 0 ? 210 : 30, a2 = side < 0 ? 150 : -30;
        const r1 = r + 5, r2 = r + 14;
        out.push(annulus(p.x, p.y, r1, r2, a1, a2, A ? 'none' : col, { op: A ? 1 : (lit ? 1 : 0.55), st: A ? col : undefined, sw: A ? 2 : undefined }));
        if (fill != null) out.push(annulus(p.x, p.y, r1, r2, a1, a1 - (a1 - a2) * fill, col, { op: 1 }));
        const gx = p.x + side * r * 0.6;
        out.push(T(gx, p.y, glyph, (P ? 20 : 15), col, { w: 700, op: lit ? 1 : 0.9 }));
        const lr = r + (P ? 18 : 14);
        out.push(T(p.x + side * lr * 0.74, p.y + lr * 0.74, label, L.small - (P ? 0 : 1), col, { w: 700 }));
      };
      if (id === 1) { notch(-1, C.red, '◀', W.cancel, false); notch(1, C.green, '▶', W.do, f === 4, f === 3 ? 0.6 : null); }
      else if (id === 2) { notch(-1, C.red, '◀', W.cancel, false); out.push(T(p.x + r * 0.66, p.y, '·', 22, '#3c4a52')); }
      else { out.push(T(p.x - r * 0.66, p.y, '·', 22, '#3c4a52'), T(p.x + r * 0.66, p.y, '·', 22, '#3c4a52')); }
      const kr = r * 0.3;
      out.push(Ci(p.x + kdx, p.y, kr, kdx ? '#286054' : '#1a282e', { st: C.mint, sw: 2, op: 1 }));
      out.push(T(p.x, p.y + r + (P ? 26 : 20), W.menu, L.lbl, C.mint, { w: 700, op: 0.85 }));
      if (id === 1 && f === 4) out.push(sparks(p.x + r + 10, p.y, 18, C.green, P ? 16 : 13));
    }
    // ---------------- the mic (action mode: violet, gold ✦)
    {
      const r = mic.r;
      if (!A) { out.push(Ci(mic.x, mic.y, r, '#221836'), Ci(mic.x, mic.y + r * 0.22, r * 0.78, '#342652', { op: 0.43 }), Ci(mic.x, mic.y, r, null, { st: C.violet, sw: 4, op: 0.8 })); }
      else out.push(Ci(mic.x, mic.y, r, '#1e162e', { st: C.violet, sw: 3 }));
      out.push(T(mic.x, mic.y + 3, A ? '*' : '✦', r * (A ? 0.95 : 0.9), C.gold, { op: 0.9, w: 700 }));
      if (!A) out.push(T(mic.x + r * 0.36, mic.y - r * 0.34, '✧', r * 0.34, C.violet, { op: 0.7 }));
      out.push(T(mic.x, mic.y + r + (P ? 26 : 20), W.mic, L.lbl, C.violet, { w: 700, op: 0.9 }));
    }
    // ---------------- ACT (+ the option's attachments)
    {
      const a = act, r0 = a.r;
      const pressed = st.done && id === 2;
      const r = pressed ? r0 * 0.93 : r0;
      const face = id === 2 ? W.do : W.act;
      // option 6: the collar, under the disc
      if (id === 6) {
        const r1 = r0 + 8, r2 = r0 + 8 + (P ? 76 : 70);
        const [aa, ab, as] = P ? [170, 45, 107.5] : [140, 0, 70];
        const gap = 1.6;
        if (!A) out.push(glow(defs, a.x, a.y, r2 * 1.15, C.amber, 0.14));
        const doLit = st.done;
        out.push(annulus(a.x, a.y, r1, r2, aa, as + gap, A ? C.ink : '#1c1012', { st: C.red, sw: 2.2, op: 0.97 }));
        out.push(annulus(a.x, a.y, r1, r2, as - gap, ab, A ? (doLit ? '#1d4a33' : C.ink) : (doLit ? '#2f8a58' : '#0f2418'), { st: C.green, sw: doLit ? 3.5 : 2.2, op: 0.97 }));
        const rm = (r1 + r2) / 2, cm = (aa + as) / 2, dm = (as + ab) / 2;
        const [x1, y1] = pt(a.x, a.y, rm, cm), [x2, y2] = pt(a.x, a.y, rm, dm);
        const g = P ? 22 : 19, ty = P ? 15 : 13;
        out.push(cross(x1, y1 - ty * 0.7, g * 0.85, C.red, 3.4), T(x1, y1 + ty, W.cancel, L.small, '#f0b4b4', { w: 700 }));
        out.push(check(x2, y2 - ty * 0.7, g, doLit ? '#e9fff0' : C.green, 4), T(x2, y2 + ty, W.do, L.small + 1, doLit ? '#e9fff0' : C.green, { w: 700 }));
        const [sx, sy] = pt(a.x, a.y, r2 + (P ? 22 : 18), as);
        const cs = L.small, cwid = wtext(verb, cs) + cs * 1.6;
        out.push(R(sx - cwid / 2, sy - cs * 0.85, cwid, cs * 1.7, A ? C.ink : '#140f08', { st: hostile ? C.red : C.amber, sw: 1.5, rx: A ? 0 : 3, op: 0.95 }));
        out.push(T(sx, sy, verb, cs, hostile ? '#ffb0a8' : C.amberHi, { w: 700 }));
        if (doLit) out.push(sparks(x2, y2, (P ? 52 : 44), '#9fffd0', P ? 16 : 13));
      }
      if (!A) out.push(glow(defs, a.x, a.y, r0 * 1.7, C.amber, pressed ? 0.85 : 0.6));
      else out.push(glow(defs, a.x, a.y, r0 * 1.6, C.amber, 0.22));
      out.push(Ci(a.x, a.y, r, pressed ? '#ffcf73' : C.amber));
      if (!A) out.push(Ci(a.x, a.y - r * 0.22, r * 0.8, C.amberHi, { op: 0.35 }));
      out.push(Ci(a.x, a.y, r, null, { st: A ? C.amber : C.amberRim, sw: pressed ? 4 : 3, op: 0.95 }));
      out.push(T(a.x, a.y + 1, face, r0 * (fontKO ? 0.42 : 0.46), C.dark, { w: 700 }));
      if (id === 2) {                               // the verb on ACT's rim, above it
        const vy = a.y - r0 - (P ? 24 : 18);
        out.push(T(a.x, vy, verb, L.lbl + 1, hostile ? '#ff9a8a' : C.amberHi, { w: 700 }));
        out.push(T(a.x, vy + (P ? 14 : 11), '▾', P ? 11 : 9, hostile ? '#ff9a8a' : C.amber, { op: 0.8 }));
        if (pressed) out.push(sparks(a.x, a.y, r0 * 1.35, C.gold, P ? 18 : 14));
      }
      if (id === 4) {                               // the fuse
        const N = st.slot ? 24 : 12, p = f === 1 ? 0 : f === 2 ? 0.45 : f === 3 ? 0.3 : 1;
        const lit = Math.round(N * p), r1 = r0 + 9, r2 = r0 + 19;
        const seg = 360 / N, gp = N > 12 ? 3 : 4, rr = r0 + 12;
        for (let i = 0; i < N; i++) {
          const a1 = 90 - i * seg - gp / 2, a2 = 90 - (i + 1) * seg + gp / 2, on = i < lit;
          out.push(arc(a.x, a.y, rr, a1, a2, on ? (st.slot ? C.red : C.amberHi) : C.amber, on ? 7 : 5, { op: on ? 1 : (f === 1 ? 0.3 : 0.22), cap: 'butt' }));
        }
        if (f === 4) out.push(sparks(a.x, a.y, r0 * 1.6, C.gold, P ? 18 : 14));
      }
      if (id === 1 || id === 3 || id === 5) {        // ACT unchanged: in Act mode it leaves
        // (nothing extra; the face says 행동 as today)
      }
    }
    const [cwCss, chCss] = L.css;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" width="${cwCss}" height="${chCss}"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
  }

  // ------------------------------------------------------------------ pages
  const link = (over) => { const p = new URLSearchParams({ o: Q.o, s: Q.s, l: Q.l, ...over }); return '?' + p.toString(); };
  const nav = (cur) => `<nav><a href="index.html"${cur === 0 ? ' class="on"' : ''}>board</a>${OPTS.map(o => `<a href="opt${o.id}.html${link({})}"${cur === o.id ? ' class="on"' : ''}>${o.id} ${esc(o.title)}</a>`).join('')}</nav>`;
  const combo = (o, s, l) => `${o === 'p' ? 'portrait' : 'landscape'} · ${s === 'color' ? 'colour' : 'ASCII'} · ${l.toUpperCase()}`;

  function optionPage(id) {
    const op = OPTS.find(o => o.id === id);
    document.title = `${op.title} · 취소/하기`;
    if (Q.solo) { document.body.className = 'solo'; document.body.innerHTML = phone(id, Q.f, Q.o, Q.s, Q.l); return; }
    const tg = (name, key, vals) => `<div><span>${name}</span>${vals.map(([v, lbl]) => `<a href="${link({ [key]: v })}"${Q[key] === v ? ' class="on"' : ''}>${lbl}</a>`).join('')}</div>`;
    const flow = [1, 2, 3, 4].map(f => `<figure class="frame">${phone(id, f, Q.o, Q.s, Q.l)}<figcaption><b>${f}.</b>${esc(op.caps[f - 1])}</figcaption></figure>`).join('');
    const cells = (o) => ['color', 'ascii'].flatMap(s => ['ko', 'en'].map(l => `<div class="cell">${phone(id, 2, o, s, l)}<div class="tag">${combo(o, s, l)}</div></div>`)).join('');
    document.body.innerHTML = `<main>
      <header class="top"><h1>${op.id}. ${esc(op.title)}<small>${esc(op.ko)}</small></h1>${nav(id)}</header>
      <p class="line">${esc(op.line)}</p>
      <table class="model">${op.model.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}<tr><th>Build note</th><td>${esc(op.tech)}</td></tr></table>
      <div class="toggles">${tg('orientation', 'o', [['p', 'portrait'], ['l', 'landscape']])}${tg('skin', 's', [['color', 'colour'], ['ascii', 'ASCII']])}${tg('language', 'l', [['ko', 'KO'], ['en', 'EN']])}</div>
      <h2>Flow <small>· ${combo(Q.o, Q.s, Q.l)} · menu open → pick → gated confirm/cancel → result</small></h2>
      <div class="flow ${Q.o}">${flow}</div>
      <h2>Matrix <small>· frame 2 (pick) in every orientation × skin × language</small></h2>
      <div class="matrix p">${cells('p')}</div>
      <div class="matrix l" style="margin-top:14px">${cells('l')}</div>
    </main>`;
  }

  function indexPage() {
    document.title = '취소/하기 · six directions';
    const cards = OPTS.map(op => `<section class="opt">
        <h3>${op.id}. ${esc(op.title)}<span>${esc(op.ko)}</span></h3>
        <p>${esc(op.line)}</p>
        <div class="pair"><a href="opt${op.id}.html">${phone(op.id, 2, 'p', 'color', 'ko')}<div>pick</div></a><a href="opt${op.id}.html">${phone(op.id, 3, 'p', 'color', 'ko')}<div>gated spoken action</div></a></div>
        <div class="how"><b>Do</b> ${esc(op.model[1][1])}<br><b>Cancel</b> ${esc(op.model[2][1])}</div>
        <a class="go" href="opt${op.id}.html">open ${op.id} →</a> · <a href="opt${op.id}.html?o=l&s=ascii&l=en">landscape ASCII EN</a>
      </section>`).join('');
    document.body.innerHTML = `<main>
      <header class="top"><h1>취소 / 하기: six directions<small>mockups only · not applied to drdr-dr</small></h1>${nav(0)}</header>
      <p class="notes">v1 (flat red/green strip) and v2 (red ✕ / green ✓ discs) both put a fourth and fifth control above 행동, far from the row they confirm, next to a yellow button that <i>leaves</i>. A menu pick is a press, not a question; the only real question is a gated spoken action. Each option below is a different <b>place and gesture</b> for that, not a different skin. Recommended: <b>2</b>, with 1's stick ◀ for cancel (see THINKING.md).</p>
      <div class="board">${cards}</div>
    </main>`;
  }

  window.CancelDo = { OPTS, phone };
  const page = document.body.dataset.opt;
  if (page === 'index') indexPage(); else optionPage(+page);
})();
