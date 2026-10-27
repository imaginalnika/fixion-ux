/* Fixion / DRDR mobile UX mockups: shared engine.
 * A 720x1280 logical canvas (the game's portrait grid) drawn into a 390x844 CSS box, both skins (color / ascii),
 * touch and mouse. Flows (talk, menu, slot) live in flows.js and drive this engine through MOCK.* and the
 * input hooks. Everything is plain Canvas 2D; the "beam" is additive gradient sprites, as it would be in DragonRuby. */
(() => {
  'use strict';
  const W = 720, H = 1558, CELL = 42, COLS = 15, ROWS = 16, MAPX = 45, HEADER_Y = 88, MAPTOP = HEADER_Y + 64 + 92;
  const MAPW = COLS * CELL, MAPH = ROWS * CELL, MAPBOT = MAPTOP + MAPH;
  const DECK_TOP = MAPBOT + 8;
  const MIC = { x: 360, y: H - 350, r: 80 };
  const ACT_BASE = { x: 612, y: H - 350, r: 56 };
  const PAD = { x: 112, y: H - 350, r: 74 };
  const FEED = { x: 24, top: MAPBOT + 10, h: 120 };
  const C = {
    ink: '#090c12', panel: 'rgba(8,11,16,0.92)', mint: '#6fe2c7', talk: '#6effaa', glow: '#50ff96',
    amber: '#e6b05c', amberDim: '#241e16', violet: '#9670ff', violetDeep: '#4c2e7c', gold: '#ffd166',
    paper: '#faf8ef', paperInk: '#181f27', muted: '#8a949c', red: '#ff5a5a', redBg: 'rgba(92,14,20,0.75)',
    figgs: '#f0c06f', nuaz: '#ff63b6', potts: '#c4d4e2', player: '#6fe2c7', wall: '#141a24', floorA: '#1c191d',
    floorB: '#231e20', wood: '#76482a', woodLip: '#a8743f', stool: '#96364a', neonC: '#5ff6ff', neonP: '#ff4fb0'
  };
  const SKIN = { color: {}, ascii: {} };
  const qs = new URLSearchParams(location.search);
  let skin = qs.get('skin') === 'ascii' ? 'ascii' : 'color';
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIn = (t) => Math.pow(clamp(t, 0, 1), 2);
  const easeOutBack = (t) => { t = clamp(t, 0, 1); const s = 1.4; return 1 + s * Math.pow(t - 1, 3) + (s + 1) * Math.pow(t - 1, 2) * (1 - 0.0); };

  // ------------------------------------------------------------------ canvas
  const canvas = document.getElementById('g');
  const ctx = canvas.getContext('2d');
  let scale = 1, dpr = 1;
  function fit() {
    const box = canvas.parentElement.getBoundingClientRect();
    const s = Math.min(box.width / W, box.height / H) || (390 / W);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * s * dpr); canvas.height = Math.round(H * s * dpr);
    canvas.style.width = Math.round(W * s) + 'px'; canvas.style.height = Math.round(H * s) + 'px';
    scale = s;
  }
  window.addEventListener('resize', fit); fit();
  function toLogical(cx, cy) { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / scale, y: (cy - r.top) / scale }; }

  // ------------------------------------------------------------------ time, scheduler, hitstop
  let now = 0, last = performance.now(), hitstopUntil = 0, timeScale = 1;
  const timers = [];
  function after(ms, fn, tag) { const t = { at: now + ms, fn, tag }; timers.push(t); return t; }
  function cancelTimers(tag) { if (!tag) { timers.length = 0; return; } for (let i = timers.length - 1; i >= 0; i--) if (timers[i].tag === tag) timers.splice(i, 1); }
  function runTimers() { for (let i = 0; i < timers.length; i++) { const t = timers[i]; if (now >= t.at) { timers.splice(i, 1); i--; t.fn(); } } }
  function hitstop(ms) { hitstopUntil = Math.max(hitstopUntil, performance.now() + ms); }

  // ------------------------------------------------------------------ world
  const legend = [];
  const mapRows = [
    '###############',
    '#!!!.TT.TT.!!!#',
    '#.............#',
    '#.===========.#',
    '#..h.h.h.h..b.#',
    '#&..........b.#',
    '#.............#',
    '#..h....h.....#',
    '#.hTh..hTh....#',
    '#..h....h.....#',
    '#.............#',
    '#.............#',
    '#A...........J#',
    '#.............#',
    '#P............#',
    '#######+#######'
  ];
  const actors = {
    player: { name: 'YOU', g: '@', x: 6, y: 4, col: C.player, tag: 'YOU' },
    Figgs: { name: 'Figgs', g: 'F', x: 11, y: 2, col: C.figgs, tag: 'FIGGS' },
    Nuaz: { name: 'Nuaz', g: 'N', x: 13, y: 4, col: C.nuaz, tag: 'NUAZ' },
    Potts: { name: 'Potts', g: 'P', x: 1, y: 14, col: C.potts, tag: 'POTTS' }
  };
  const cellCenter = (x, y) => ({ x: MAPX + (x + 0.5) * CELL, y: MAPTOP + (y + 0.5) * CELL });

  // ------------------------------------------------------------------ state the flows mutate
  const S = {
    talk: 'idle',            // idle | arming | listening | finalizing | heard | nothing | failed
    level: 0,                // mic level 0..1 (fake)
    take: null,              // { text, partial, kind: 'heard'|'nothing'|'failed'|'warming', at, lift }
    feed: [],                // { text, who: 'player'|'model'|'delta'|'reason'|'rewrite', at, from, to }
    actMode: false,
    target: null,            // { name, x, y, col, kind }
    rows: [],                // [{ label, icon?, walk?, kind: 'row'|'slot', slot: {...} }]
    sel: 0,
    selAt: 0,
    confirm: null,           // { at } when ✓/✕ are shown under the selected row
    menuOpenAt: 0, menuCloseAt: 0,
    responder: null, thinkingAt: 0,
    captionText: null, captionAt: 0, captionCol: C.muted,
    actRaised: true,
    stick: null,             // { dir, since }
    stickKnob: { dx: 0, dy: 0 },
    pressed: null,           // { row, at }
    hint: ''
  };
  const FX = { beams: [], parts: [], flashAt: -9, flashA: 0, shake: 0, shakeUntil: 0, rings: [], churn: [], bars: [] };
  const hooks = { onMicDown: null, onMicUp: null, onActTap: null, onConfirm: null, onCancel: null, onRowTap: null, onStick: null };

  // ------------------------------------------------------------------ audio (tiny, optional)
  let actx = null;
  function tone(f, dur, { type = 'sine', vol = 0.04, to = null } = {}) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== 'running') return;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, actx.currentTime);
      if (to) o.frequency.exponentialRampToValueAtTime(to, actx.currentTime + dur);
      g.gain.setValueAtTime(vol, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (_) { /* no audio */ }
  }
  function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (_) {} }

  // ------------------------------------------------------------------ drawing helpers
  const FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';
  function font(px, weight = 400) { ctx.font = `${weight} ${px}px ${FONT}`; }
  function text(x, y, s, px, col, { weight = 400, align = 'left', base = 'middle', alpha = 1 } = {}) {
    font(px, weight); ctx.textAlign = align; ctx.textBaseline = base; ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
  }
  function width(s, px, weight = 400) { font(px, weight); return ctx.measureText(s).width; }
  function spaced(cx, cy, s, px, col, alpha = 0.75) {
    font(px, 700); const adv = ctx.measureText('M').width + px * 0.2; let x = cx - (s.length * adv - px * 0.2) / 2;
    for (const ch of s) { if (ch !== ' ') text(x + adv / 2 - px * 0.1, cy, ch, px, col, { weight: 700, align: 'center', alpha }); x += adv; }
  }
  function rrect(x, y, w, h, r, fill, alpha = 1, stroke = null, lw = 1) {
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } ctx.globalAlpha = 1;
  }
  function disk(x, y, r, fill, alpha = 1) { ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1; }
  function ring(x, y, r, col, lw = 2, alpha = 1) { ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.globalAlpha = 1; }
  function glow(x, y, r, col, alpha, additive = true) {
    // the game's glow.png: alpha 1 at the centre, 0.35 at 35%, 0 at the edge, drawn additively
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); if (additive) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function outlined(x, y, s, px, col, weight = 800) { font(px, weight); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(6,8,12,0.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }

  // beam.png stand-in: a stretched additive gradient from (x1,y1) to (x2,y2), width w, with a fluid wobble
  function beam(x1, y1, x2, y2, w, col, alpha, t) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x1, y1); ctx.rotate(ang);
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const u0 = i / segs, u1 = (i + 1) / segs, um = (u0 + u1) / 2;
      const wob = 1 + 0.28 * Math.sin(t * 0.009 + um * 9) + 0.14 * Math.sin(t * 0.017 - um * 21);
      const off = 6 * Math.sin(t * 0.006 + um * 7);
      const ww = w * wob * (0.55 + 0.45 * Math.sin(um * Math.PI));
      const g = ctx.createLinearGradient(0, -ww, 0, ww); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(u0 * len, off - ww, (u1 - u0) * len + 1, ww * 2);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ churn (글자들): letters settle through random glyphs
  const CHURN = '@#%&*+=~?$!/\\|<>^';
  function churnText(target, k) { // k 0..1: fraction settled, left to right with jitter
    let out = '';
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      if (ch === ' ') { out += ' '; continue; }
      const settleAt = (i / Math.max(1, target.length - 1)) * 0.8 + ((i * 7919) % 13) / 13 * 0.2;
      out += k >= settleAt ? ch : CHURN[(Math.floor(now / 38) + i * 3) % CHURN.length];
    }
    return out;
  }

  // ------------------------------------------------------------------ layout bits
  function actBtn() { return S.actRaised ? { x: ACT_BASE.x, y: ACT_BASE.y - 72, r: ACT_BASE.r } : ACT_BASE; }
  function menuRows() {
    // beside the target: right of it if room, else left; rows 46 px, head 34; always inside the play area
    if (!S.actMode || !S.target || !S.rows.length) return [];
    const t = cellCenter(S.target.x, S.target.y);
    const fs = 22, rh = 46, head = 34;
    const longest = Math.max(...S.rows.map(r => (r.label || r.slot && (r.slot.text || '') || '').length + (r.icon ? 2 : 0) + (r.walk ? 2 : 0)), 10);
    const w = Math.max(longest * fs * 0.62 + 60, 300);
    let h = 0; const ys = [];
    const ck = S.confirm ? easeOut((now - S.confirm.at) / 160) : 0;
    S.rows.forEach((r, i) => { ys.push(h); h += rh * (r.kind === 'slot' ? r.slot.open : 1); if (i === S.sel && ck > 0) h += 44 * ck; });
    const gap = CELL * 0.9;
    let x = t.x + gap + 6; if (x + w > W - 8) x = t.x - gap - w - 6; x = clamp(x, 8, W - 8 - w);
    const lo = MAPTOP + 12 + head, hi = MAPBOT - 12 - h;
    const yTop = clamp(t.y - h / 2, lo, Math.max(lo, hi));
    return S.rows.map((r, i) => ({ ...r, i, x, y: yTop + ys[i], w, h: rh * (r.kind === 'slot' ? r.slot.open : 1), fs, head, yTop, totalH: h, anchor: t }));
  }
  function confirmButtons(rows) {
    if (!S.confirm || !S.actMode) return null;
    const r = rows[S.sel]; if (!r) return null;
    const k = easeOut((now - S.confirm.at) / 160);
    const y = r.y + r.h + 2;
    return { k, ok: { x: r.x + r.w - 40, y: y + 20, r: 19 }, no: { x: r.x + r.w - 92, y: y + 20, r: 19 }, rowY: y, h: 44 };
  }

  // ------------------------------------------------------------------ draw: the map
  function drawMap() {
    const t = now;
    // header
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    const hy = HEADER_Y + 32;
    ctx.fillStyle = C.panel; ctx.fillRect(0, 0, W, HEADER_Y + 64);
    ctx.fillStyle = hexA(C.mint, 0.18); ctx.fillRect(0, HEADER_Y + 63, W, 1);
    disk(26, hy, 3.5, C.mint, 0.6 + 0.4 * Math.sin(t * 0.0022));
    text(40, hy, 'LIVE', 19, C.mint, { weight: 700 });
    text(118, hy, skin === 'ascii' ? 'FIGGS & POTTS · Gottél' : 'DR/DR · Figgs & Potts · Gottél', 19, '#e8e2d2', { alpha: 0.85 });
    text(W - 40, hy, '≡', 30, '#b4bec8', { align: 'center', alpha: 0.8 });
    text(W - 120, hy, '♪ on', 19, '#bec6d0', { alpha: 0.75, align: 'center' });
    // map
    const dim = S.actMode ? 0.37 : 0;
    if (skin === 'color') {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const ch = mapRows[y][x]; const px = MAPX + x * CELL, py = MAPTOP + y * CELL;
        if (ch === '#') { ctx.fillStyle = C.wall; ctx.fillRect(px, py, CELL, CELL); ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(px, py + CELL / 2, CELL, 1); }
        else { ctx.fillStyle = (x + y) % 2 ? C.floorA : C.floorB; ctx.fillRect(px, py, CELL, CELL); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py + CELL - 1, CELL, 1); }
      }
      // neon sign
      const sx = MAPX + MAPW / 2, sy = MAPTOP + CELL / 2;
      glow(sx, sy, 120, hexA(C.neonC, 0.9), 0.16); outlined(sx - 40, sy, 'FIGGS', 26, C.neonC); outlined(sx + 8, sy, '&', 26, C.neonP); outlined(sx + 54, sy, 'POTTS', 26, C.neonC);
      // bottles, taps, counter, stools, tables, booth, plants, door
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const ch = mapRows[y][x]; const c = cellCenter(x, y);
        if (ch === '!') { const cols = ['#4caf7d', '#e0a040', '#d0506a', '#a9c7d8', '#8c6ec8']; for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[(x * 3 + i) % 5]; ctx.fillRect(c.x - 14 + i * 11, c.y - 10, 5, 18); } }
        if (ch === 'T' && y === 1) { ctx.fillStyle = '#d4a94f'; ctx.fillRect(c.x - 10, c.y - 8, 4, 20); ctx.fillRect(c.x + 6, c.y - 8, 4, 20); ctx.fillRect(c.x - 12, c.y - 10, 24, 4); }
        if (ch === '=') { ctx.fillStyle = C.wood; ctx.fillRect(c.x - CELL / 2, c.y - 16, CELL, 28); ctx.fillStyle = C.woodLip; ctx.fillRect(c.x - CELL / 2, c.y - 16, CELL, 4); ctx.fillStyle = '#42281a'; ctx.fillRect(c.x - CELL / 2, c.y + 8, CELL, 6); }
        if (ch === 'h') { disk(c.x, c.y, 11, C.stool); disk(c.x, c.y - 2, 9, '#b84a5e'); }
        if (ch === 'T' && y > 1) { ctx.fillStyle = '#5c3e26'; ctx.fillRect(c.x - 18, c.y - 12, 36, 26); ctx.fillStyle = '#845c36'; ctx.fillRect(c.x - 18, c.y - 12, 36, 6); glow(c.x, c.y, 70, 'rgba(255,196,120,0.9)', 0.14); }
        if (ch === 'b') { ctx.fillStyle = y === 4 ? '#5a3a26' : '#a03848'; ctx.fillRect(c.x - 18, c.y - 10, 36, 22); }
        if (ch === '&') { disk(c.x, c.y + 6, 10, '#3c6a44'); text(c.x, c.y - 6, '✿', 24, '#5fd37a', { align: 'center' }); }
        if (ch === 'A') { ctx.fillStyle = '#2a2140'; ctx.fillRect(c.x - 16, c.y - 18, 32, 36); ctx.fillStyle = '#7fc8ff'; ctx.fillRect(c.x - 11, c.y - 13, 22, 12); }
        if (ch === 'J') { ctx.strokeStyle = '#ff4fb0'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 15, c.y - 18, 30, 36); text(c.x, c.y + 2, '♫', 20, '#ff9ad4', { align: 'center' }); }
        if (ch === '+') { ctx.fillStyle = '#5c4028'; ctx.fillRect(c.x - 16, c.y - 20, 32, 40); ctx.fillStyle = '#0c1018'; ctx.fillRect(c.x - 12, c.y - 16, 24, 32); outlined(c.x + 100, c.y - 2, 'OPEN', 16, '#ff465a', 700); }
      }
      glow(MAPX + 7.5 * CELL, MAPTOP + 3.2 * CELL, 220, 'rgba(255,190,110,0.9)', 0.22);
    } else {
      // ASCII skin: dim dotted floor, glyph props in the original dr-dr palette
      ctx.fillStyle = '#0d1117'; ctx.fillRect(MAPX, MAPTOP, MAPW, MAPH);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const ch = mapRows[y][x]; const c = cellCenter(x, y);
        if (ch === '#') { ctx.fillStyle = '#121923'; ctx.fillRect(c.x - CELL / 2, c.y - CELL / 2, CELL, CELL); text(c.x, c.y, (y === 0 || y === ROWS - 1) ? '-' : '|', 26, '#5c6f84', { align: 'center' }); continue; }
        if (ch === '.') { text(c.x, c.y, '.', 20, '#2b3540', { align: 'center' }); continue; }
        const map = { '!': ['!', ['#e0a040', '#d0506a', '#8c6ec8'][x % 3]], 'T': ['T', '#e0a040'], '=': ['=', '#e0a040'], 'h': ['h', '#e0a040'], 'b': [y === 4 ? 't' : 'b', '#e0a040'], '&': ['&', '#5fd37a'], 'A': ['A', '#8c6ec8'], 'J': ['J', '#e0a040'], '+': ['+', '#e8e2d2'] };
        const m = map[ch]; if (m) text(c.x, c.y, m[0], 28, m[1], { align: 'center' });
      }
      const sx = MAPX + MAPW / 2, sy = MAPTOP + CELL / 2; text(sx - 10, sy, 'FIGGS', 24, C.neonP, { align: 'right', weight: 700 }); text(sx, sy, '&', 24, C.neonC, { align: 'center', weight: 700 }); text(sx + 10, sy, 'POTTS', 24, C.neonP, { align: 'left', weight: 700 });
    }
    if (dim > 0) { ctx.fillStyle = `rgba(2,4,8,${dim})`; ctx.fillRect(MAPX - 6, MAPTOP - 6, MAPW + 12, MAPH + 12); }
  }

  function drawActors() {
    const list = Object.values(actors).sort((a, b) => a.y - b.y);
    for (const a of list) {
      const c = cellCenter(a.x, a.y);
      const breathe = 1 + 0.012 * Math.sin(now * 0.0017 + a.name.length);
      const isTarget = S.target && S.target.name === a.name;
      const dimmed = S.actMode && !isTarget && a.g !== '@';
      ctx.globalAlpha = dimmed ? 0.55 : 1;
      if (skin === 'color') { disk(c.x, c.y + 12, 13, 'rgba(0,0,0,0.5)'); glow(c.x, c.y, 38, hexA(a.col, 0.9), 0.28, false); }
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, breathe);
      if (a.g === 'P' && skin === 'color') { rrect(-18, -16, 36, 32, 6, '#96a4b4'); ctx.fillStyle = '#06120c'; ctx.fillRect(-15, -12, 30, 18); text(0, -3, ':|', 14, '#7dffa5', { align: 'center', weight: 800 }); }
      else if (skin === 'color') outlined(0, 0, a.g, 34, a.col);
      else text(0, 0, a.g, 30, a.col, { align: 'center', weight: 700 });
      ctx.restore();
      if (!(S.actMode && isTarget)) text(c.x, c.y + (a.y <= 2 ? -26 : 26), a.tag, 13, a.col, { align: 'center', weight: 700, alpha: a.g === '@' ? 0.85 : 0.55 });
      ctx.globalAlpha = 1;
      if (a.g === '@') drawTalkIndicator(c);
    }
  }

  // Josh: the green indicator above the player while speaking, in both skins: five level bars and a glow.
  function drawTalkIndicator(c) {
    if (S.talk === 'nothing' && S.take) { const k = clamp((now - S.take.at) / 1200, 0, 1); text(c.x + 14, c.y - 30 - 6 * k, '?', 20, '#8a949c', { align: 'center', alpha: 1 - k }); }
    if (S.talk !== 'listening' && S.talk !== 'arming') return;
    const y = c.y - 38; const arming = S.talk === 'arming';
    if (skin === 'color') glow(c.x, y, 30, arming ? 'rgba(200,210,220,0.8)' : 'rgba(60,255,140,0.9)', arming ? 0.12 : 0.35);
    const n = 5; const bw = 4, gapw = 4;
    for (let i = 0; i < n; i++) {
      const k = Math.abs(i - 2) / 2;
      const lv = arming ? 0.08 : clamp(S.level * (1.25 - 0.6 * k) + 0.06 * Math.sin(now * 0.013 + i), 0, 1);
      const h = 4 + 20 * lv;
      const x = c.x + (i - 2) * (bw + gapw) - bw / 2;
      ctx.fillStyle = arming ? 'rgba(180,190,200,0.5)' : `rgba(110,255,170,${0.65 + 0.35 * (0.55 + 0.45 * Math.sin(now * 0.007))})`;
      if (skin === 'ascii') { text(x + bw / 2, y, lv > 0.55 ? '|' : lv > 0.2 ? ':' : '.', 18, arming ? '#8a949c' : C.talk, { align: 'center' }); }
      else ctx.fillRect(x, y - h / 2, bw, h);
    }
    if (arming) text(c.x, y - 22, '…', 16, '#8a949c', { align: 'center' });
  }

  function drawTarget() {
    if (!S.actMode || !S.target) return;
    const c = cellCenter(S.target.x, S.target.y); const r = CELL * 0.66 * (1 + 0.06 * Math.sin(now * 0.007));
    if (skin === 'color') glow(c.x, c.y, 50, hexA(C.mint, 0.9), 0.3);
    ctx.strokeStyle = C.mint; ctx.lineWidth = 3; const L = 10;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(c.x + sx * r, c.y + sy * (r - L)); ctx.lineTo(c.x + sx * r, c.y + sy * r); ctx.lineTo(c.x + sx * (r - L), c.y + sy * r); ctx.stroke(); }
    text(c.x, c.y - r - 14, S.target.name.toUpperCase(), 13, S.target.col, { align: 'center', weight: 700 });
  }

  // ------------------------------------------------------------------ draw: the menu
  function drawMenu() {
    const rows = menuRows(); if (!rows.length) return;
    const r0 = rows[0]; const x0 = r0.x, w = r0.w, top = r0.yTop, h = r0.totalH, head = r0.head;
    const openK = easeOut((now - S.menuOpenAt) / 180);
    const closeK = S.menuCloseAt ? easeIn((now - S.menuCloseAt) / 200) : 0;
    const a = openK * (1 - closeK); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - openK) * 10);
    // pointer line to the target
    const t = r0.anchor; const px = x0 > t.x ? x0 - 6 : x0 + w + 6;
    ctx.strokeStyle = hexA(C.mint, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x + (x0 > t.x ? CELL * 0.9 : -CELL * 0.9), t.y); ctx.lineTo(px, clamp(t.y, top + 8, top + h - 8)); ctx.stroke();
    rrect(x0 - 6, top - head - 6, w + 12, h + head + 12, 9, 'rgba(7,10,15,0.95)');
    text(x0 + 8, top - head / 2 - 2, S.target.name.toUpperCase(), 15, S.target.col, { weight: 700, alpha: 0.9 });
    const cb = confirmButtons(rows);
    rows.forEach((row) => {
      if (row.kind === 'slot') { drawSlot(row); return; }
      const sel = row.i === S.sel; const mid = row.y + row.h / 2;
      const pressedK = S.pressed && S.pressed.row === row.i ? clamp(1 - (now - S.pressed.at) / 420, 0, 1) : 0;
      const isNew = row.fresh && now - row.fresh < 2600;
      rrect(row.x, row.y + 2, row.w, row.h - 4, 6, sel ? '#163a34' : '#0f171e', 0.96);
      if (pressedK > 0) { rrect(row.x, row.y + 2, row.w, row.h - 4, 6, `rgba(255,255,255,${0.55 * pressedK})`); }
      ctx.fillStyle = sel ? C.mint : '#344650'; ctx.fillRect(row.x, row.y + 7, 4, row.h - 14);
      let lx = row.x + 16;
      if (row.icon) { text(lx + 12, mid, row.icon, 22, '#fff', { align: 'center' }); lx += 34; }
      text(lx, mid, row.churnUntil && now < row.churnUntil ? churnText(row.label, 1 - (row.churnUntil - now) / 320) : row.label, row.fs, row.dim ? '#687078' : sel ? C.paper : '#d6dee2');
      let rx = row.x + row.w - 12;
      if (sel) { text(rx, mid, '›', row.fs + 3, C.mint, { weight: 700, align: 'right' }); rx -= row.fs * 0.9; }
      if (row.walk) text(rx, mid, '»', row.fs, '#96aab0', { align: 'right', alpha: 0.85 });
      if (isNew) { disk(row.x + row.w - 8, row.y + 10, 4, C.violet); }
    });
    if (cb) {
      const r = rows[S.sel];
      ctx.globalAlpha = a * cb.k;
      rrect(r.x, cb.rowY, r.w, 40 * cb.k, 6, 'rgba(10,18,22,0.9)');
      // the pair hangs under the selected row: ✕ red, ✓ green (A/B colours), symbols not letters
      disk(cb.no.x, cb.no.y, cb.no.r, '#3a1418'); ring(cb.no.x, cb.no.y, cb.no.r, '#ff5a5a', 2); text(cb.no.x, cb.no.y + 1, '✕', 22, '#ff8a8a', { align: 'center', weight: 700 });
      if (skin === 'color') glow(cb.ok.x, cb.ok.y, 34, 'rgba(80,255,150,0.9)', 0.25);
      disk(cb.ok.x, cb.ok.y, cb.ok.r, '#14402c'); ring(cb.ok.x, cb.ok.y, cb.ok.r, C.talk, 2); text(cb.ok.x, cb.ok.y + 1, '✓', 24, C.talk, { align: 'center', weight: 800 });
      text(r.x + 10, cb.ok.y, S.confirm.label || 'do it?', 14, '#96aab0', { alpha: 0.8 });
      ctx.globalAlpha = a;
    }
    ctx.restore();
  }

  // the slot a spoken action lands in (slides open under the selected row)
  function drawSlot(row) {
    const s = row.slot; const mid = row.y + row.h / 2; const k = s.open;
    if (k < 0.05) return;
    const st = s.state; // opening | listening | filling | judging | landed | pressed | reason | said | fail
    const col = st === 'reason' ? C.red : st === 'landed' || st === 'pressed' ? C.mint : C.violet;
    ctx.save(); ctx.beginPath(); ctx.rect(row.x - 8, row.y, row.w + 16, row.h); ctx.clip();
    rrect(row.x, row.y + 2, row.w, row.h - 4, 6, st === 'reason' ? 'rgba(60,12,18,0.9)' : st === 'landed' || st === 'pressed' ? '#163a34' : 'rgba(40,26,70,0.85)', 0.96, hexA(col, st === 'listening' || st === 'judging' ? 0.9 : 0.5), 1.5);
    if (st === 'listening' || st === 'judging') { ctx.setLineDash([6, 5]); ctx.lineDashOffset = -now * 0.03; rrect(row.x, row.y + 2, row.w, row.h - 4, 6, null, 0.9, hexA(col, 0.9), 1.5); ctx.setLineDash([]); }
    if (s.pressedAt && now - s.pressedAt < 420) rrect(row.x, row.y + 2, row.w, row.h - 4, 6, `rgba(255,255,255,${0.6 * (1 - (now - s.pressedAt) / 420)})`);
    ctx.fillStyle = col; ctx.fillRect(row.x, row.y + 7, 4, row.h - 14);
    const lx = row.x + 16;
    if (st === 'listening') {
      text(lx, mid, '…', row.fs, hexA(C.violet, 0.9));
      // the ray ends here: sparks drift up out of the slot
    } else if (st === 'filling' || st === 'judging') {
      const shown = s.heard.slice(0, Math.floor(s.typed));
      text(lx, mid, shown + (st === 'filling' && Math.floor(now / 300) % 2 ? '_' : ''), row.fs, '#e6dcff');
      if (st === 'judging') { const w = width(shown, row.fs); const u = (now / 900) % 1; ctx.fillStyle = hexA(C.violet, 0.9); ctx.fillRect(lx + w * u, row.y + row.h - 9, Math.max(8, w * 0.18), 2); if (s.slowSince && now - s.slowSince > 2000) text(row.x + row.w - 12, mid, 'judging…', 13, '#9c8cc8', { align: 'right' }); }
    } else if (st === 'landed' || st === 'pressed') {
      // original → rewritten: the original slides down into a small struck line and fades; the label churns in
      const mk = clamp((now - s.landedAt) / 320, 0, 1);
      const label = s.rewritten ? churnText(s.label, mk) : s.label;
      text(lx, mid - (s.rewritten ? 7 * mk : 0), label, row.fs, C.paper);
      if (s.rewritten) {
        const fade = clamp(1 - (now - s.landedAt - 1200) / 500, 0, 1) * mk;
        const sub = s.heard; const sw = width(sub, 13);
        text(lx, mid + 14, sub, 13, '#9aa3a8', { alpha: 0.8 * fade }); ctx.globalAlpha = fade; ctx.strokeStyle = '#c47878'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx - 2, mid + 14); ctx.lineTo(lx + sw + 2, mid + 14); ctx.stroke(); ctx.globalAlpha = 1;
        text(lx + sw + 10, mid + 14, '→ ' + s.why, 13, '#9c8cc8', { alpha: 0.8 * fade });
      }
      if (st === 'landed' && s.walk) text(row.x + row.w - 12, mid, '»', row.fs, '#96aab0', { align: 'right' });
      disk(row.x + row.w - 8, row.y + 10, 4, C.violet);
    } else if (st === 'reason') {
      text(lx, mid, s.reason, 18, '#ff8a8a', { weight: 700 });
      text(row.x + row.w - 10, row.y + row.h - 9, 'hold the mic to try again', 12, '#c47878', { align: 'right', alpha: 0.9 });
    } else if (st === 'said') {
      text(lx, mid, '“' + s.heard + '”', row.fs, '#d6dee2'); text(row.x + row.w - 12, mid, 'said ↓', 14, '#96aab0', { align: 'right' });
    } else if (st === 'nothing') {
      text(lx, mid, "didn't catch that", row.fs, '#8a949c');
    } else if (st === 'fail') {
      text(lx, mid, s.heard, row.fs, '#d6dee2'); text(row.x + row.w - 12, mid, 'as said', 13, '#8a949c', { align: 'right' });
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ draw: the deck
  function drawDeck() {
    ctx.fillStyle = '#06080c'; ctx.fillRect(0, DECK_TOP, W, H - DECK_TOP); ctx.fillStyle = hexA(C.mint, 0.1); ctx.fillRect(0, DECK_TOP, W, 1);
    drawFeed(); drawTakeCard(); drawPad(); drawMic(); drawAct();
  }

  function drawPad() {
    const p = PAD; const act = S.actMode; const st = S.stick;
    if (skin === 'color') glow(p.x, p.y, p.r * 1.45, hexA(C.mint, 0.9), st ? 0.3 : 0.12);
    disk(p.x, p.y, p.r, '#0e161c'); ring(p.x, p.y, p.r, C.mint, 2, st ? 0.85 : 0.4);
    const fs = 22;
    const arrows = act ? [['▲', 0, -1], ['▼', 0, 1]] : [['▲', 0, -1], ['▼', 0, 1], ['◀', -1, 0], ['▶', 1, 0]];
    for (const [g, ux, uy] of arrows) { const on = st && st.dir && st.dir[0] === ux && st.dir[1] === uy; text(p.x + ux * p.r * 0.66, p.y + uy * p.r * 0.68, g, fs, on ? C.mint : '#96beb4', { align: 'center', weight: 700, alpha: on ? 1 : 0.75 }); }
    if (act) { text(p.x - p.r * 0.66, p.y, '·', fs, '#3c4a52', { align: 'center' }); text(p.x + p.r * 0.66, p.y, '·', fs, '#3c4a52', { align: 'center' }); }
    const kx = p.x + S.stickKnob.dx, ky = p.y + S.stickKnob.dy; const kr = p.r * 0.3;
    disk(kx, ky, kr, st ? '#286054' : '#1a282e'); ring(kx, ky, kr, C.mint, 2, st ? 0.9 : 0.45);
    spaced(p.x, p.y + p.r + 24, act ? 'MENU' : 'WALK', 15, act ? C.mint : '#c8dcd7', 0.6);
  }

  function drawMic() {
    const m = MIC; const held = S.talk === 'listening' || S.talk === 'arming';
    const inspire = S.actMode && !!S.target;
    const press = held ? 0.94 : 1; const r = m.r * press;
    if (inspire) {
      disk(m.x, m.y, r, held ? '#4c2e7c' : '#221836'); disk(m.x, m.y + r * 0.22, r * 0.78, held ? '#704aaa' : '#342652', 0.43);
      ring(m.x, m.y, r, C.violet, 4, held ? 0.95 : 0.8);
      const tw = 0.5 + 0.5 * Math.sin(now * 0.0031);
      text(m.x, m.y + 4, '✦', r * 0.9, C.gold, { align: 'center', alpha: 0.75 + 0.25 * tw });
      text(m.x + r * 0.36, m.y - r * 0.34, '✧', r * 0.34, C.violet, { align: 'center', alpha: 0.4 + 0.6 * (1 - tw) });
      if (held || S.talk === 'finalizing') { for (let i = 0; i < 10; i++) { const ang = now * (S.talk === 'finalizing' ? 0.0042 : 0.0014) + i * Math.PI * 2 / 10; const x = m.x + Math.cos(ang) * r * 1.18, y = m.y + Math.sin(ang) * r * 1.18; if (i % 2) disk(x, y, 2.5, C.violet, 0.85); else text(x, y, '✦', 14, C.gold, { align: 'center', alpha: 0.9 }); } }
      spaced(m.x, m.y + m.r + 26, 'ACTION', 15, C.violet, 0.9);
      return;
    }
    const arming = S.talk === 'arming';
    if (skin === 'color') { glow(m.x, m.y, r * 1.6, held && !arming ? 'rgba(80,255,150,0.9)' : hexA(C.mint, 0.9), held && !arming ? 0.55 : 0.18); }
    const g = ctx.createRadialGradient(m.x, m.y - r * 0.3, 4, m.x, m.y, r); if (held && !arming) { g.addColorStop(0, '#46c882'); g.addColorStop(1, '#145a3c'); } else { g.addColorStop(0, '#22343a'); g.addColorStop(1, '#0e161c'); }
    disk(m.x, m.y, r, g); ring(m.x, m.y, r, held && !arming ? '#aaffd2' : arming ? '#c0c8d0' : hexA(C.mint, 0.75), 4);
    if (arming) { ctx.setLineDash([10, 8]); ctx.lineDashOffset = -now * 0.05; ring(m.x, m.y, r + 8, '#c0c8d0', 2, 0.8); ctx.setLineDash([]); }
    if (held && !arming) { for (let i = 0; i < 3; i++) { const ph = ((now * 0.0009) + i / 3) % 1; ring(m.x, m.y, r * (1.02 + ph * (0.35 + 0.4 * S.level)), C.talk, 2, (0.35 + 0.6 * S.level) * (1 - ph)); } }
    // mic glyph
    const mc = held && !arming ? '#f0fff6' : '#aae6d2';
    if (skin === 'ascii') { text(m.x, m.y - 10, '(=)', 36, mc, { align: 'center' }); text(m.x, m.y + 22, 'T', 30, mc, { align: 'center' }); }
    else { rrect(m.x - 12, m.y - 34, 24, 44, 12, mc); ctx.strokeStyle = mc; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x, m.y - 6, 24, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.fillRect(m.x - 2, m.y + 18, 4, 16); ctx.fillRect(m.x - 16, m.y + 32, 32, 4); }
    // result tick / cross on the button itself (300 ms), so the eye that is on the thumb sees it
    if (S.take && now - S.take.at < 420 && (S.take.kind === 'heard' || S.take.kind === 'failed' || S.take.kind === 'nothing')) {
      const k = easeOutBack((now - S.take.at) / 300); const col = S.take.kind === 'heard' ? C.talk : S.take.kind === 'failed' ? '#ffb070' : '#b0bcc4';
      ctx.save(); ctx.translate(m.x + r * 0.62, m.y - r * 0.62); ctx.scale(k, k); disk(0, 0, 18, '#0a1a14'); ring(0, 0, 18, col, 2); text(0, 1, S.take.kind === 'heard' ? '✓' : S.take.kind === 'failed' ? '!' : '?', 22, col, { align: 'center', weight: 800 }); ctx.restore();
    }
    if (S.talk === 'finalizing') { for (let i = 0; i < 8; i++) { const ang = now * 0.006 + i * Math.PI / 4; disk(m.x + Math.cos(ang) * r * 0.78, m.y + Math.sin(ang) * r * 0.78, 3, '#c8ffdc', (i + 1) / 8); } }
    const cap = S.talk === 'failed' ? (S.take && S.take.kind === 'warming' ? 'LET GO · HOLD AGAIN' : 'MIC NOT READY · TAP TO RETRY') : S.talk === 'arming' ? 'MIC WARMING' : S.talk === 'nothing' ? "DIDN'T CATCH THAT" : (held || S.talk === 'finalizing') ? '' : 'HOLD TO TALK';
    if (cap) spaced(m.x, m.y + m.r + 26, cap, S.talk === 'failed' ? 13 : 15, S.talk === 'failed' ? '#ffb070' : S.talk === 'nothing' ? '#b0bcc4' : '#c8dcd7', S.talk === 'failed' ? 0.95 : 0.75);
  }

  function drawAct() {
    const a = actBtn(); const on = S.actMode;
    if (skin === 'color') glow(a.x, a.y, a.r * 1.7, hexA(C.amber, 0.9), on ? 0.75 : 0.35);
    disk(a.x, a.y, a.r, on ? '#e6b05c' : '#241e16'); disk(a.x, a.y + a.r * 0.25, a.r * 0.8, on ? '#ffd696' : '#3a3022', 0.35);
    ring(a.x, a.y, a.r, on ? '#ffe6be' : C.amber, 3, on ? 0.95 : 0.8);
    text(a.x, a.y + 1, 'ACT', Math.round(a.r * 0.42), on ? '#281a0a' : C.amber, { align: 'center', weight: 700 });
    spaced(a.x, a.y + a.r + 22, on ? 'LEAVE' : 'ACT', 13, on ? '#ffe6be' : '#c8baa0', 0.7);
  }

  // the feed under the map: the last lines, player's in mint, △ in sand, reasons red, rewrites struck
  function drawFeed() {
    const lines = S.feed.slice(-4); const s = 21, lh = 29; let y = FEED.top + 14;
    for (const l of lines) {
      const age = clamp((now - l.at) / 250, 0, 1); const alpha = 0.85 * age;
      if (l.who === 'rewrite') {
        const from = l.from, to = l.to; const wf = width(from, s), wa = width('  →  ', s), wt = width(to, s, 700); const x0 = W / 2 - (wf + wa + wt) / 2;
        text(x0, y, from, s, '#96a0a6', { alpha: alpha * 0.7 }); ctx.globalAlpha = alpha; ctx.strokeStyle = '#c47878'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 2, y + 1); ctx.lineTo(x0 + wf + 2, y + 1); ctx.stroke(); ctx.globalAlpha = 1;
        text(x0 + wf, y, '  →  ', s, C.muted, { alpha }); text(x0 + wf + wa, y, to, s, '#7cd6ba', { alpha: Math.min(1, alpha * 1.15), weight: 700 });
      } else if (l.who === 'reason') {
        const w = width(l.text, s, 700); rrect(W / 2 - w / 2 - 6, y - s * 0.66, w + 12, s * 1.32, 2, C.redBg, alpha); text(W / 2, y, l.text, s, C.red, { align: 'center', weight: 700, alpha });
      } else {
        const col = l.who === 'player' ? '#7cd6ba' : l.who === 'npc' ? (l.col || '#d6be8c') : '#d6be8c';
        text(W / 2, y + (l.lift ? -l.lift : 0), l.text, s, col, { align: 'center', alpha });
      }
      y += lh;
    }
  }

  // the take card: rises from the mic on release with the partial words, solidifies when final, then lifts into the feed
  function drawTakeCard() {
    const t = S.take; if (!t) return;
    const age = now - t.at;
    const x = W / 2, baseY = MIC.y - MIC.r - 40;
    let y = baseY, alpha = 1, sc = 1;
    if (t.phase === 'rise') { const k = easeOutBack(age / 220); y = baseY + 24 * (1 - k); alpha = clamp(age / 120, 0, 1); }
    if (t.phase === 'lift') { const k = easeIn(age / 260); y = lerp(baseY, FEED.top + 14 + 29 * 3, k); alpha = 1 - k * 0.3; sc = lerp(1, 0.86, k); }
    if (t.phase === 'gone') return;
    const label = t.kind === 'warming' ? 'mic was still warming — hold again' : t.kind === 'failed' ? (t.text || 'mic not ready') : t.kind === 'nothing' ? "didn't catch that" : (t.partial ? t.text + '…' : t.text);
    const fsz = 22 * sc; const w = width(label, fsz, t.kind === 'heard' && !t.partial ? 700 : 400) + 40;
    const col = t.kind === 'heard' ? (t.partial ? '#9fd9c4' : '#7cd6ba') : t.kind === 'failed' || t.kind === 'warming' ? '#ffb070' : '#b0bcc4';
    const bg = t.kind === 'heard' ? (t.partial ? 'rgba(14,32,28,0.9)' : 'rgba(18,48,40,0.96)') : t.kind === 'nothing' ? 'rgba(20,26,32,0.95)' : 'rgba(60,32,12,0.95)';
    ctx.save(); ctx.globalAlpha = alpha;
    rrect(x - w / 2, y - 20 * sc, w, 40 * sc, 8, bg, 1, hexA(col === '#7cd6ba' ? C.mint : col, t.partial ? 0.35 : 0.8), 1.5);
    if (t.partial) { ctx.setLineDash([5, 5]); ctx.lineDashOffset = -now * 0.03; rrect(x - w / 2, y - 20 * sc, w, 40 * sc, 8, null, 1, hexA(C.mint, 0.6), 1.5); ctx.setLineDash([]); }
    text(x, y, label, fsz, col, { align: 'center', weight: t.kind === 'heard' && !t.partial ? 700 : 400 });
    // tail to the mic
    if (t.phase !== 'lift') { ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x - 7, y + 20 * sc); ctx.lineTo(x + 7, y + 20 * sc); ctx.lineTo(x, y + 28 * sc); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  function drawThinking() {
    if (!S.responder || !S.thinkingAt) return;
    const a = actors[S.responder]; if (!a) return; const c = cellCenter(a.x, a.y); const age = now - S.thinkingAt; if (age < 100) return;
    const pop = easeOutBack((age - 100) / 160); const w = CELL * 1.15 * pop, h = CELL * 0.52;
    rrect(c.x - w / 2 + 2, c.y - CELL * 0.62 - h + 3, w, h, 3, 'rgba(3,8,14,0.35)'); rrect(c.x - w / 2, c.y - CELL * 0.62 - h, w, h, 3, C.paper, 0.92); ctx.fillStyle = a.col; ctx.fillRect(c.x - w / 2, c.y - CELL * 0.62 - h, 3, h);
    if (pop > 0.9) for (let i = 0; i < 3; i++) text(c.x - CELL * 0.24 + i * CELL * 0.24, c.y - CELL * 0.62 - h / 2 + Math.abs(Math.sin((now - i * 100) / 100)) * 3, '•', 13, '#3c4650', { align: 'center' });
  }

  function drawCaption() {
    if (!S.captionText) return; const age = now - S.captionAt; if (age > 2600) { S.captionText = null; return; }
    const a = clamp(age / 200, 0, 1) * clamp((2600 - age) / 400, 0, 1); const w = width(S.captionText, 19) + 28;
    rrect(W / 2 - w / 2, MAPBOT - 44, w, 28, 3, C.ink, 0.8 * a); text(W / 2, MAPBOT - 30, S.captionText, 19, S.captionCol, { align: 'center', alpha: a });
  }

  // ------------------------------------------------------------------ fx
  function drawFx() {
    for (let i = FX.beams.length - 1; i >= 0; i--) {
      const b = FX.beams[i]; const age = now - b.at; const life = b.until ? b.until - b.at : 1e9;
      const k = b.until ? clamp(1 - (now - b.until + 220) / 220, 0, 1) : 1;
      if (b.until && now > b.until) { FX.beams.splice(i, 1); continue; }
      const from = b.from(), to = b.to(); const thin = b.thin ? 0.35 : 1;
      beam(from.x, from.y, to.x, to.y, 26 * thin, 'rgba(150,110,255,0.55)', 0.55 * k * clamp(age / 160, 0, 1), now);
      beam(from.x, from.y, to.x, to.y, 9 * thin, 'rgba(255,230,150,0.9)', 0.6 * k * clamp(age / 160, 0, 1), now * 1.3 + 400);
      // particles drifting along the ray
      if (!b.thin && Math.random() < 0.35) FX.parts.push({ x: from.x + (Math.random() - 0.5) * 30, y: from.y, tx: to.x, ty: to.y, at: now, life: 500 + Math.random() * 400, ch: Math.random() < 0.5 ? '✦' : '·', col: Math.random() < 0.5 ? C.gold : C.violet });
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = FX.parts.length - 1; i >= 0; i--) {
      const p = FX.parts[i]; const k = (now - p.at) / p.life; if (k >= 1) { FX.parts.splice(i, 1); continue; }
      const x = p.vx !== undefined ? p.x + p.vx * (now - p.at) / 16 : lerp(p.x, p.tx, easeOut(k)) + Math.sin(k * 12 + p.at) * 8;
      const y = p.vy !== undefined ? p.y + p.vy * (now - p.at) / 16 + 0.0004 * (now - p.at) ** 2 * (p.g || 0) : lerp(p.y, p.ty, easeOut(k));
      text(x, y, p.ch, p.sz || 16, p.col, { align: 'center', alpha: 1 - k * k });
    }
    ctx.restore();
    for (let i = FX.rings.length - 1; i >= 0; i--) {
      const r = FX.rings[i]; const k = (now - r.at) / r.life; if (k >= 1) { FX.rings.splice(i, 1); continue; }
      const rad = r.r1 * easeOut(k); const n = Math.max(12, Math.round(rad / 6));
      for (let j = 0; j < n; j++) { const ang = j / n * Math.PI * 2; text(r.x + Math.cos(ang) * rad * 1.6, r.y + Math.sin(ang) * rad * 0.6, k > 0.6 ? '.' : '·', 14, r.col || '#7fb2ff', { align: 'center', alpha: 1 - k }); }
    }
    if (FX.flashA > 0) { ctx.fillStyle = `rgba(255,255,255,${FX.flashA})`; ctx.fillRect(0, 0, W, H); }
  }
  function sparks(x, y, n, col) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6; FX.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, g: 1, at: now, life: 300 + Math.random() * 300, ch: ['-', '/', '|', '\\'][Math.floor(Math.random() * 4)], col: col || C.gold, sz: 14 }); } }
  function addRing(x, y, r1, col) { FX.rings.push({ x, y, r1, at: now, life: 600, col }); }
  function flash(a) { FX.flashA = Math.max(FX.flashA, a); }
  function shake(px, ms) { FX.shake = px; FX.shakeUntil = now + ms; }

  // ------------------------------------------------------------------ main loop
  function frame(ts) {
    const real = ts - last; last = ts;
    const stopped = performance.now() < hitstopUntil;
    now += stopped ? 0 : real;
    runTimers();
    if (FX.flashA > 0) FX.flashA = Math.max(0, FX.flashA - real / 100 * 0.6);
    // fake mic level
    if (S.talk === 'listening') S.level = clamp(0.35 + 0.35 * Math.sin(now * 0.011) + 0.2 * Math.sin(now * 0.037), 0, 1); else S.level = 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    let ox = 0, oy = 0; if (now < FX.shakeUntil) { const k = (FX.shakeUntil - now) / 300; ox = (Math.random() - 0.5) * FX.shake * k; oy = (Math.random() - 0.5) * FX.shake * k; }
    ctx.translate(ox, oy);
    drawMap(); drawActors(); drawTarget(); drawThinking(); drawCaption(); drawDeck(); drawMenu(); drawFx();
    if (S.hint) { const w = width(S.hint, 17) + 24; rrect(W / 2 - w / 2, HEADER_Y + 72, w, 30, 4, 'rgba(8,11,16,0.85)'); text(W / 2, HEADER_Y + 87, S.hint, 17, '#c8dcd7', { align: 'center', alpha: 0.9 }); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ input
  let pointer = null; // { kind: 'mic'|'pad'|'act'|'row'|'none', id }
  function hitCircle(c, p, extra = 0) { return (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= (c.r + extra) ** 2; }
  function down(p, id) {
    unlockAudio();
    const a = actBtn();
    if (hitCircle(MIC, p, 8)) { pointer = { kind: 'mic', id }; hooks.onMicDown && hooks.onMicDown(); return; }
    if (hitCircle(PAD, p, 22)) { pointer = { kind: 'pad', id, cx: PAD.x, cy: PAD.y, dir: null, since: now }; moveStick(p); return; }
    if (hitCircle(a, p, 14)) { pointer = { kind: 'act', id }; hooks.onActTap && hooks.onActTap(); return; }
    const rows = menuRows(); const cb = confirmButtons(rows);
    if (cb && cb.k > 0.5) { if (hitCircle(cb.ok, p, 10)) { pointer = { kind: 'none' }; hooks.onConfirm && hooks.onConfirm(); return; } if (hitCircle(cb.no, p, 10)) { pointer = { kind: 'none' }; hooks.onCancel && hooks.onCancel(); return; } }
    for (const r of rows) { if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { pointer = { kind: 'none' }; hooks.onRowTap && hooks.onRowTap(r.i); return; } }
    pointer = { kind: 'none' };
  }
  function moveStick(p) {
    if (!pointer || pointer.kind !== 'pad') return;
    let dx = p.x - PAD.x, dy = p.y - PAD.y; const len = Math.hypot(dx, dy); const max = PAD.r * 0.55;
    if (len > max) { dx *= max / len; dy *= max / len; }
    S.stickKnob = { dx, dy };
    // dead zone 16 px with hysteresis: a direction is taken at 16, let go at 10 (no jitter at the edge)
    const dead = pointer.dir ? 10 : 16; let dir = null;
    if (len >= dead) dir = S.actMode ? [0, dy > 0 ? 1 : -1] : (Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
    if (S.actMode && dir && Math.abs(dy) < Math.abs(dx) * 0.7) dir = null; // in Act mode sideways does nothing
    if ((dir && !pointer.dir) || (dir && pointer.dir && (dir[0] !== pointer.dir[0] || dir[1] !== pointer.dir[1]))) { pointer.dir = dir; pointer.since = now; pointer.repeatAt = now + 500; hooks.onStick && hooks.onStick(dir); }
    else if (!dir) pointer.dir = null;
    S.stick = pointer.dir ? { dir: pointer.dir, since: pointer.since } : { dir: null };
  }
  function tickStick() { if (pointer && pointer.kind === 'pad' && pointer.dir && now >= pointer.repeatAt) { pointer.repeatAt = now + 200; hooks.onStick && hooks.onStick(pointer.dir); } }
  setInterval(tickStick, 50);
  function up() {
    if (!pointer) return;
    if (pointer.kind === 'mic') hooks.onMicUp && hooks.onMicUp();
    if (pointer.kind === 'pad') { S.stick = null; S.stickKnob = { dx: 0, dy: 0 }; }
    pointer = null;
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); down(toLogical(e.clientX, e.clientY), e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (pointer && pointer.kind === 'pad') moveStick(toLogical(e.clientX, e.clientY)); });
  canvas.addEventListener('pointerup', (e) => { e.preventDefault(); up(); });
  canvas.addEventListener('pointercancel', up);
  window.addEventListener('keydown', (e) => { if (e.repeat) return; if (e.code === 'Space') { e.preventDefault(); hooks.onMicDown && hooks.onMicDown(); } if (e.key === 'ArrowUp') hooks.onStick && hooks.onStick([0, -1]); if (e.key === 'ArrowDown') hooks.onStick && hooks.onStick([0, 1]); if (e.key === 'Enter') hooks.onConfirm && hooks.onConfirm(); if (e.key === 'Escape') hooks.onCancel && hooks.onCancel(); if (e.key === 'e') hooks.onActTap && hooks.onActTap(); });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') hooks.onMicUp && hooks.onMicUp(); });

  // ------------------------------------------------------------------ public API
  window.MOCK = {
    S, FX, C, actors, hooks, MIC, PAD, actBtn, cellCenter, menuRows, after, cancelTimers, hitstop, tone, flash, shake, sparks, addRing,
    now: () => now, skin: () => skin, setSkin: (s) => { skin = s; },
    feed(text, who, extra) { S.feed.push(Object.assign({ text, who, at: now }, extra || {})); while (S.feed.length > 20) S.feed.shift(); },
    caption(t, col) { S.captionText = t; S.captionAt = now; S.captionCol = col || C.muted; },
    reset() { cancelTimers(); S.talk = 'idle'; S.take = null; S.feed.length = 0; S.actMode = false; S.target = null; S.rows = []; S.sel = 0; S.confirm = null; S.pressed = null; S.responder = null; S.thinkingAt = 0; S.captionText = null; S.hint = ''; FX.beams.length = 0; FX.parts.length = 0; FX.rings.length = 0; FX.flashA = 0; hitstopUntil = 0; },
    beam(from, to, thin) { const b = { from, to, at: now, thin }; FX.beams.push(b); return b; },
    endBeam(b, ms = 220) { b.until = now + ms; }
  };
})();
