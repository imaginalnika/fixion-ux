/* Inventory at the top: one renderer for the three option pages and the comparison board.
 * Each phone is a static SVG in the game's logical units (portrait 720x1558 = 390x844 CSS; phone landscape
 * 1558x720 = 844x390), header / map / deck from drdr-dr layout.rb (read only). Six frames per option:
 *   0 empty · 1 first pickup in flight · 2 first slot landed · 3 several items · 4 equipment unlocked · 5 tray opened
 * Plus the envelope pickup (Fixion SFX/VFX letter clip): e0 start · e1 mid-flight · e2 landed, after frame 3's items.
 * Query: ?o=p|l &s=color|ascii &l=ko|en (&solo=1&f=0..5|e0..e2 draws one phone only, for screenshots). */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const Q = { o: qs.get('o') === 'l' ? 'l' : 'p', s: qs.get('s') === 'ascii' ? 'ascii' : 'color', l: qs.get('l') === 'en' ? 'en' : 'ko',
              solo: qs.get('solo') === '1', f: /^e[0-2]$/.test(qs.get('f')) ? qs.get('f') : Math.min(5, Math.max(0, +(qs.get('f') ?? 4))) };

  // ------------------------------------------------------------------ palette
  const C = { ink: '#090c12', deck: '#06080c', mint: '#6fe2c7', amber: '#e6b05c', amberHi: '#ffd696', amberRim: '#ffe6be',
    violet: '#9670ff', gold: '#ffd166', paper: '#faf8ef', muted: '#8a949c', talk: '#6effaa', sand: '#d6be8c', dark: '#281a0a',
    parch: '#e9dcbc', parchDim: '#8f8670', slotInk: '#15130f', equipInk: '#0d1a17' };

  // ------------------------------------------------------------------ layouts (layout.rb; SVG y grows down)
  // portrait: top = 1470 (screen_top 1558 − 88) → header SVG y 88..152, headroom 152..244, map row 0 at 244.
  // landscape (w 1558): header 0..52, map_x 439, map_y 66 (h − 52 − 14), gear x w − 36.
  const LAY = {
    p: { W: 720, H: 1558, hdr: { y: 88, h: 64 }, map: { x: 45, y: 244, c: 42 }, deckTop: 924,
         gear: { x: 676, r: 24 }, musicX: 586, shelfY: 184, r: 22, pitch: 56, handR: 28, icon: 26,
         pad: { x: 112, y: 1208, r: 74 }, mic: { x: 360, y: 1208, r: 80 }, act: { x: 612, y: 1208, r: 56 },
         feed: { cx: 360, bottom: 1084, lh: 31, fs: 20 }, fs: 20, lbl: 17, small: 15, slugFs: 24, css: [390, 844] },
    l: { W: 1558, H: 720, hdr: { y: 0, h: 52 }, map: { x: 439, y: 66, c: 40 }, deckTop: null,
         gear: { x: 1522, r: 20 }, musicX: 1448, shelfY: 26, r: 18, pitch: 46, handR: 23, icon: 21,
         pad: { x: 1176, y: 540, r: 48 }, mic: { x: 1300, y: 540, r: 66 }, act: { x: 1424, y: 540, r: 42 },
         feed: { cx: 220, bottom: 400, lh: 28, fs: 17 }, fs: 18, lbl: 15, small: 13, slugFs: 19, css: [844, 390] }
  };
  const gameY = (o, y) => o === 'p' ? `top−${Math.round(y - 88)}` : `h−${Math.round(y)}`;

  // ------------------------------------------------------------------ words
  const TXT = {
    ko: { title: '루이 뉘똥 샵', music: '♪ 켬', act: '행동', mic: '행동 말하기', menu: '메뉴', tg: '점', tname: '점원', og: '젬',
          items: '소지품', equip: '장비', you: '당신', more: (k) => `외 ${k}`,
          feed: { 0: [['npc', '점원: 찾으시는 거 있으세요?'], ['delta', '△ 바닥에 카드 한 장이 떨어져 있다.']],
                  1: [['npc', '점원: 찾으시는 거 있으세요?'], ['delta', '△ 당신이 카드를 줍는다.', 1]],
                  3: [['npc', '젬마: 그거 내 동전 아니야?'], ['delta', '△ 당신이 동전을 주머니에 넣는다.', 1]],
                  4: [['npc', '점원: 비 와요. 이거 입고 가세요.'], ['delta', '△ 점원이 당신에게 코트를 입혀 준다.', 1]] } },
    en: { title: 'Lui Nuittong Shop', music: '♪ on', act: 'ACT', mic: 'ACTION', menu: 'MENU', tg: 'C', tname: 'Clerk', og: 'G',
          items: 'Items', equip: 'Equipment', you: 'YOU', more: (k) => `+${k}`,
          feed: { 0: [['npc', 'CLERK: Looking for anything?'], ['delta', '△ A card lies on the floor.']],
                  1: [['npc', 'CLERK: Looking for anything?'], ['delta', '△ You pick up the card.', 1]],
                  3: [['npc', 'GEMMA: Isn\'t that my coin?'], ['delta', '△ You pocket the coin.', 1]],
                  4: [['npc', 'CLERK: It\'s raining. Take this.'], ['delta', '△ The clerk helps you into a coat.', 1]] } }
  };
  for (const [lang, d] of [['ko', '△ 당신이 탁자 위의 봉투를 줍는다.'], ['en', '△ You pick the envelope up off the table.']])
    TXT[lang].feed.e0 = TXT[lang].feed.e1 = TXT[lang].feed.e2 = [[TXT[lang].feed[0][0][0], TXT[lang].feed[0][0][1]], ['delta', d, 1]];
  TXT.ko.feed[2] = TXT.ko.feed[1]; TXT.en.feed[2] = TXT.en.feed[1]; TXT.ko.feed[5] = TXT.ko.feed[4]; TXT.en.feed[5] = TXT.en.feed[4];

  // the things (ASCII glyphs avoid the map's # . = T h & o b +)
  const THING = {
    card: { ko: '카드', en: 'card', a: 'c', note: { ko: '점원의 명함', en: 'the clerk\'s card' } },
    key:  { ko: '열쇠', en: 'key', a: 'k', note: { ko: '녹슨 열쇠, 어디 것인지 모름', en: 'rusty, opens who knows what' } },
    coin: { ko: '동전', en: 'coin', a: '$', note: { ko: '젬마가 자기 거라던 500원', en: '500 won Gemma says is hers' } },
    letter: { ko: '봉투', en: 'envelope', a: 'e', note: { ko: '밀랍으로 봉한 편지', en: 'a letter, wax-sealed' } },
    coat: { ko: '코트', en: 'coat', a: '[', note: { ko: '점원이 입혀 줌', en: 'the clerk put it on you' }, equip: true }
  };
  const CLAUSE = { ko: '코트 차림', en: 'in a coat' };   // option C's equipment clause

  // what is carried in each frame; `fly` = the thing travelling, `land` = the slot that just received
  const STATE = {
    0: { items: [], equip: [], floor: true },
    1: { items: [], equip: [], fly: 'card' },
    2: { items: ['card'], equip: [], land: 'card' },
    3: { items: ['card', 'key', 'coin'], equip: [], land: 'coin', talk: true },
    4: { items: ['card', 'key', 'coin'], equip: ['coat'], land: 'coat', from: 'clerk' },
    5: { items: ['card', 'key', 'coin'], equip: ['coat'], open: true },
    // the envelope pickup (r2_letter_color.mp4): it pops off a table one cell down-right of @, "+ 봉투" rises, then flies to the tray
    e0: { items: ['card', 'key', 'coin'], equip: [], env: 'start' },
    e1: { items: ['card', 'key', 'coin'], equip: [], env: 'mid', fly: 'letter' },
    e2: { items: ['card', 'key', 'coin', 'letter'], equip: [], env: 'landed', land: 'letter' }
  };
  const ENV_FRAMES = [{ id: 'e0', ko: '봉투 · 줍기', en: 'envelope · start' }, { id: 'e1', ko: '봉투 · 비행', en: 'envelope · mid-flight' }, { id: 'e2', ko: '봉투 · 착지', en: 'envelope · landed' }];
  const ENV_LABEL = { ko: '+ 봉투', en: '+ envelope' };
  const FRAMES = [
    { id: 0, ko: '비어 있음', en: 'empty' }, { id: 1, ko: '첫 줍기 · 비행', en: 'first pickup · fly' }, { id: 2, ko: '첫 칸', en: 'first slot' },
    { id: 3, ko: '여러 개', en: 'several' }, { id: 4, ko: '장비 열림', en: 'equipment unlocked' }, { id: 5, ko: '펼치기', en: 'tapped open' }
  ];

  // ------------------------------------------------------------------ the options
  const OPTS = [
    { id: 'A', title: 'Two pockets', ko: '두 주머니',
      line: 'Josh\'s A: items pack right→left from under the ⚙, equipment left→right from the left edge; the middle of the top stays open over the stage.',
      caps: ['Nothing carried, nothing drawn. The card on the floor is the only hint.',
             'Picked up: the card lifts and arcs up-right; six dots spin in under the ⚙ to become the slot.',
             'Landed: one parchment disc hangs from the header\'s right end. No label, no counter.',
             'Three items pack leftward. You speak: the green dot over the @ is untouched by the tray.',
             'The clerk dresses you: the coat flies from the clerk to the LEFT, opening the mint equipment pocket.',
             'Tap anywhere on the top strip: one card drops from the side you tapped, 장비 over 소지품.'],
      env: ['The envelope pops off the table beside @; "+ 봉투" rises from it.',
            'It arcs up-right to the item pocket; the 4th slot dots in left of the coin (x 676 − 56·3).',
            'Landed: the envelope is the 4th disc of the right pocket, packing right → left.'],
      model: [['Items', 'right pocket, pack right → left from x 676 (under ⚙)'], ['Equipment', 'left pocket, pack left → right from x 44; appears on first equip'],
              ['Open', 'tap the tray strip → card drops down from that side; tap again / outside to fold'], ['Peek', 'long-press a slot → name tag'],
              ['Risk', 'two clusters read as a toolbar; equipment far from the items it relates to']] },
    { id: 'B', title: 'The growing shelf', ko: '자라는 선반',
      line: 'Josh\'s B: one centred tray that grows with the story — a lone slot, then a shelf, then a mint "hand" ring parts the items when the story first dresses you.',
      caps: ['Stage 0 — nothing. The world has not given you anything, so the top has no inventory at all.',
             'Stage 1 — first pickup: the card arcs to the top centre; the slot is born as it lands.',
             'Stage 1 — one slot, centred under the header. That is the entire inventory UI.',
             'Stage 2 — three items: the row re-centres each time, and a hairline shelf appears under it.',
             'Stage 3 — equipment unlocked: items part like a curtain, a larger mint ring opens in the middle, the coat lands in it.',
             'Tap the shelf: it opens downward into a short card. 장비 first, then 소지품.'],
      env: ['The envelope pops off the table beside @; "+ 봉투" rises from it.',
            'It arcs to the right end of the shelf while the three items slide left to re-centre (−28 over the flight).',
            'Landed: four slots centred on 360, the envelope at the right end; the shelf has widened under them.'],
      model: [['Items', 'centred row; new item takes the right end and the row re-centres (−28 px over the flight)'],
              ['Growth', '1 item: bare slot · 3+: hairline shelf · first equip: mint hand ring, items split alternately R/L'],
              ['Equipment', 'the centre ring ("in hand / on you"); more equipment widens it into a capsule'],
              ['Open', 'tap the shelf → card drops down, centred; tap again / outside to fold'], ['Peek', 'long-press a slot → name tag']] },
    { id: 'C', title: 'The slug line', ko: '등장인물 줄',
      line: 'Mine: Fixion is a screenplay, so your inventory is your character slug — YOU, in a coat (card, key, coin) — typed at the top; items fly up as letters.',
      caps: ['No slug. You have no props yet, so the script has nothing to say about you.',
             'Picked up: the card breaks into its letters; they stream up and the slug line types itself in.',
             'Landed: the word churns into place (글자들). The slug reads YOU (card).',
             'Three items: words append inside the parenthesis. Words are the slots; ASCII needs nothing extra.',
             'Dressed: the equipment clause types in after YOU, in your mint; the item list slides right to make room.',
             'Tap the line: it unfolds into a little screenplay block — cue, parenthetical, one prop per line.'],
      env: ['The envelope pops off the table beside @; "+ 봉투" rises from it.',
            'It breaks into its letters 봉 투; they stream up into the gap typed after ", " inside the parenthesis.',
            'Landed: the word churns into place — 당신 (카드, 열쇠, 동전, 봉투).'],
      model: [['Items', 'words inside the parenthesis, appended left → right'], ['Equipment', 'a clause after YOU in mint ("in a coat", "holding an umbrella")'],
              ['Open', 'tap the line → screenplay block drops down; tap again / outside to fold'], ['Overflow', '(card, key +3)'],
              ['Risk', 'reads slower than icons; long KO lines need the 외 n cut early']] }
  ];

  // ------------------------------------------------------------------ the item-fly target SPEC (logical game coords, y up)
  const TIMING = 'lift 5 ticks (83 ms, +12 px, scale 1→1.25) · flight clamp(18 + dist/30, 24, 34) ticks (400–570 ms), easeOutCubic, quadratic Bézier with P1 = (lerp(P0.x, P2.x, 0.3) + side·80, P2.y + 80) · settle 7 ticks (117 ms, scale 1.15→1.0). Typical ≈ 770 ms.';
  const SPEC = {
    A: { p: [['First item', '(676, top − 96), r 22 — directly under the ⚙'], ['Next items', 'x = 676 − 56·i (right → left), same y; 6 visible, the 6th becomes "+n"'],
             ['First equipment', '(44, top − 96), r 22 + halo r 28'], ['Next equipment', 'x = 44 + 56·j (left → right); 3 visible']],
         l: [['First item', '(w − 168, h − 26), r 18 → (1390, 694) at w 1558 · (1112, 694) at w 1280 — 40 px left of ♪\'s hit box'],
             ['Next items', 'x = w − 168 − 46·i (right → left)'], ['First equipment', '(max(map_x + 30, title_end + 40), h − 26) → (469, 694) at w 1558'],
             ['Next equipment', 'x = equip_x0 + 46·j (left → right)']],
         land: 'slot debut: 6 dots spin in from 1.8 r (8 ticks before arrival) · land: parchment glow.png additive, r 1.0→1.6, alpha 160→0 over 18 ticks · ASCII: brackets type in, contents churn : . glyph (3 ticks each)' },
    B: { p: [['First item', '(360, top − 96), r 22 — centre, under the header'],
             ['Next items (no equipment)', 'n = count after pickup; x_i = 360 + (i − (n − 1)/2)·56; the new item takes the right end, older slots slide −28 during the flight'],
             ['First equipment', '(360, top − 96), hand ring r 28 (+ halo r 34); items part to x = 360 ± (64 + 56·rank), k even → right, odd → left, rank = ⌊k/2⌋'],
             ['Next equipment', 'hand ring widens to a capsule, equipment pitch 52 centred on 360; items shift outward by 26 per extra piece'],
             ['Growth cues', 'n ≥ 3: hairline shelf at y top − 126, ±(row half-width + 18), 1 px parchment 40 %']],
         l: [['First item', '(map_x + map_w/2, h − 26), r 18 → (739, 694) at w 1558 · (600, 694) at w 1280'],
             ['Next items (no equipment)', 'x_i = cx + (i − (n − 1)/2)·46'], ['First equipment', '(cx, h − 26), hand ring r 23; items at cx ± (53 + 46·rank)'],
             ['Limit', '5 per side; must stay > title_end + 20 and < ♪ hit box − 24, else "+n"']],
         land: 'same lift/flight/settle · the row re-centre tween runs during the flight (easeInOutQuad, same duration) · on land: glow swell + 6-dot ring; equipment debut: items slide outward 10 ticks BEFORE the coat arrives, then the mint ring dots in' },
    C: { p: [['Line', 'baseline centre y = top − 96, left x = 24, font 24 (KO Hangul 24 px/syllable, Latin 14.4 px/char)'],
             ['First item', 'slug types "YOU (" / "당신 (" in 6 ticks; word centre = (24 + w(prefix) + w(word)/2, top − 96) → EN "card" and KO "카드" both (125, top − 96)'],
             ['Next items', 'appended after ", " : x = cursor + w(word)/2; cursor += w(word) + w(", ")'],
             ['Equipment', 'clause inserted after the cue (", in a coat" / " · 코트 차림"), items slide right by w(clause) over 8 ticks; letters fly to the clause'],
             ['Overflow', 'line width ≤ 672 → "(card, key +3)" / "(카드, 열쇠 외 3)"']],
         l: [['Line', 'y = h − 26, left x = map_x (439 at w 1558), font 19; must end < ♪ hit box − 24'],
             ['First item', 'word centre = (map_x + w(prefix) + w(word)/2, h − 26) → EN "card" and KO "카드" both (519, 694) at w 1558; measure words with calcstringbox in game, the mono estimate is for the mock'], ['Next items', 'as portrait, at 19 px']],
         land: 'letters, not the sprite, fly: one label per glyph, staggered 3 ticks, same Bézier; on land each glyph churns 2 random glyphs → itself (2 ticks each), then the word glows parchment for 18 ticks' }
  };

  // ------------------------------------------------------------------ svg helpers (as cancel-do.js)
  let uid = 0;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const n = (v) => Math.round(v * 10) / 10;
  const at = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k}="${v}"`).join(' ');
  const T = (x, y, s, size, fill, o = {}) => `<text ${at({ x: n(x), y: n(y), 'font-size': n(size), fill, 'text-anchor': o.a || 'middle', 'dominant-baseline': 'central',
    'font-weight': o.w || 400, opacity: o.op, 'letter-spacing': o.ls, stroke: o.stroke, 'stroke-width': o.sw, 'paint-order': o.stroke ? 'stroke' : undefined })}>${esc(s)}</text>`;
  const R = (x, y, w, h, fill, o = {}) => `<rect ${at({ x: n(x), y: n(y), width: n(w), height: n(h), rx: o.rx, fill: fill || 'none', opacity: o.op, stroke: o.st, 'stroke-width': o.sw, 'stroke-dasharray': o.dash })}/>`;
  const Ci = (x, y, r, fill, o = {}) => `<circle ${at({ cx: n(x), cy: n(y), r: n(r), fill: fill || 'none', opacity: o.op, stroke: o.st, 'stroke-width': o.sw, 'stroke-dasharray': o.dash })}/>`;
  const Ln = (x1, y1, x2, y2, st, sw, o = {}) => `<line ${at({ x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), stroke: st, 'stroke-width': sw, opacity: o.op, 'stroke-linecap': o.cap || 'round', 'stroke-dasharray': o.dash })}/>`;
  const Pa = (d, o = {}) => `<path ${at({ d, fill: o.fill || 'none', stroke: o.st, 'stroke-width': o.sw, opacity: o.op, 'stroke-dasharray': o.dash, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })}/>`;
  function glow(defs, x, y, r, col, a) { // the game's glow.png: flat to 35 %, then out to nothing
    const id = `g${++uid}`;
    defs.push(`<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="${a}"/><stop offset="0.35" stop-color="${col}" stop-opacity="${a * 0.75}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`);
    return Ci(x, y, r, `url(#${id})`);
  }
  const wtext = (s, size) => [...String(s)].reduce((w, ch) => w + (/[ᄀ-ᇿ㄰-㆏가-힣]/.test(ch) ? size : size * 0.6), 0);
  const dotRing = (cx, cy, r, col, cnt = 6, size = 16, op = 0.9) => { let s = ''; for (let i = 0; i < cnt; i++) { const a = i / cnt * Math.PI * 2 + 0.4; s += T(cx + Math.cos(a) * r, cy + Math.sin(a) * r, '·', size, col, { op, w: 700 }); } return s; };
  // quadratic Bézier in SVG coords (y down): control a little above the target, swung outward
  function flight(p0, p2) {
    const side = p2.x >= p0.x ? 1 : -1;
    const p1 = { x: p0.x + (p2.x - p0.x) * 0.3 + side * 80, y: p2.y - 80 };
    const at = (t) => ({ x: (1 - t) ** 2 * p0.x + 2 * t * (1 - t) * p1.x + t * t * p2.x, y: (1 - t) ** 2 * p0.y + 2 * t * (1 - t) * p1.y + t * t * p2.y });
    return { p1, at, d: `M${n(p0.x)} ${n(p0.y)} Q${n(p1.x)} ${n(p1.y)} ${n(p2.x)} ${n(p2.y)}` };
  }

  // ------------------------------------------------------------------ things: colour icons / ASCII glyphs
  function icon(kind, x, y, s, A, op = 1) {
    if (A) return T(x, y + 1, THING[kind].a, s * 1.05, THING[kind].equip ? C.mint : C.parch, { w: 700, op });
    const g = [];
    if (kind === 'card') { g.push(R(x - s * 0.55, y - s * 0.38, s * 1.1, s * 0.76, '#f6f2e6', { rx: 2 }), R(x - s * 0.55, y - s * 0.38, s * 1.1, s * 0.18, '#8a2a3a'), Ln(x - s * 0.38, y + s * 0.06, x + s * 0.3, y + s * 0.06, '#9a948a', 1.6), Ln(x - s * 0.38, y + s * 0.2, x + s * 0.12, y + s * 0.2, '#9a948a', 1.6)); }
    if (kind === 'key') { g.push(Ci(x - s * 0.3, y, s * 0.24, null, { st: '#e8c050', sw: s * 0.13 }), Ln(x - s * 0.06, y, x + s * 0.56, y, '#e8c050', s * 0.13), Ln(x + s * 0.32, y, x + s * 0.32, y + s * 0.22, '#e8c050', s * 0.11), Ln(x + s * 0.5, y, x + s * 0.5, y + s * 0.17, '#e8c050', s * 0.11)); }
    if (kind === 'letter') {
      const w = s * 1.15, h = s * 0.78, x0 = x - w / 2, y0 = y - h / 2;
      g.push(R(x0, y0, w, h, '#f3ecdc', { rx: 1.5, st: '#b9ad92', sw: 1.2 }));
      g.push(Pa(`M${n(x0)} ${n(y0)} L${n(x)} ${n(y0 + h * 0.56)} L${n(x0 + w)} ${n(y0)}`, { st: '#a89c82', sw: 1.4 }));
      g.push(Pa(`M${n(x0)} ${n(y0 + h)} L${n(x - w * 0.12)} ${n(y0 + h * 0.6)} M${n(x0 + w)} ${n(y0 + h)} L${n(x + w * 0.12)} ${n(y0 + h * 0.6)}`, { st: '#d2c7ae', sw: 1 }));
      g.push(Ci(x, y0 + h * 0.56, s * 0.15, '#b81f2e'), Ci(x - s * 0.04, y0 + h * 0.52, s * 0.05, '#e4606a', { op: 0.8 }));
    }
    if (kind === 'coin') { g.push(Ci(x, y, s * 0.42, '#e8c050'), Ci(x, y, s * 0.28, null, { st: '#a87a22', sw: 1.8 })); }
    if (kind === 'coat') {
      g.push(Pa(`M${n(x - s * 0.52)} ${n(y - s * 0.28)} L${n(x - s * 0.18)} ${n(y - s * 0.5)} L${n(x)} ${n(y - s * 0.3)} L${n(x + s * 0.18)} ${n(y - s * 0.5)} L${n(x + s * 0.52)} ${n(y - s * 0.28)} L${n(x + s * 0.44)} ${n(y + s * 0.55)} L${n(x - s * 0.44)} ${n(y + s * 0.55)} Z`, { fill: '#9a7550', st: '#5e4228', sw: 1.4 }));
      g.push(Ln(x, y - s * 0.3, x, y + s * 0.55, '#5e4228', 1.4), Ci(x - s * 0.08, y + s * 0.05, 1.8, '#3a2a18'), Ci(x - s * 0.08, y + s * 0.28, 1.8, '#3a2a18'));
    }
    return `<g opacity="${op}">${g.join('')}</g>`;
  }
  // a slot: parchment disc for items, mint disc + halo for equipment; ASCII [x] / {x}
  function slot(defs, L, x, y, kind, A, o = {}) {
    const eq = !!THING[kind] && THING[kind].equip, r = o.r || L.r, out = [];
    if (o.land) out.push(glow(defs, x, y, r * 2.4, eq ? C.mint : C.parch, A ? 0.28 : 0.55));
    if (A) {
      const fs = L.icon * 1.05, col = eq ? C.mint : C.parch, gap = fs * 0.62;
      out.push(T(x - gap, y + 1, eq ? '{' : '[', fs, col, { w: o.land ? 800 : 400, op: 0.9 }), T(x + gap, y + 1, eq ? '}' : ']', fs, col, { w: o.land ? 800 : 400, op: 0.9 }));
      out.push(icon(kind, x, y, L.icon, true));
    } else {
      out.push(Ci(x, y, r, eq ? C.equipInk : C.slotInk, { op: 0.95 }), Ci(x, y, r, null, { st: eq ? C.mint : C.parch, sw: o.land ? 3 : 2, op: o.land ? 1 : 0.6 }));
      if (eq) out.push(Ci(x, y, r + 6, null, { st: C.mint, sw: 1.5, op: 0.4 }));
      out.push(icon(kind, x, y, L.icon * (r / L.r) * (eq ? 0.95 : 1), false));
    }
    if (o.land) out.push(dotRing(x, y, r * 1.45, eq ? C.mint : C.parch, 6, L.small + 2, 0.75));
    return out.join('');
  }
  // the slot being born (frame 1): dots spinning in from 1.8 r; ASCII: "[" typed, "]" not yet
  function slotBirth(L, x, y, A) {
    if (A) return T(x - L.icon * 0.65, y + 1, '[', L.icon * 1.05, C.parch, { w: 700, op: 0.85 }) + T(x + L.icon * 0.65, y + 1, '·', L.icon, C.parch, { op: 0.5 });
    return dotRing(x, y, L.r * 1.25, C.parch, 6, L.small + 4, 0.9) + Ci(x, y, L.r, null, { st: C.parch, sw: 1.2, op: 0.25, dash: '3 5' });
  }

  // ------------------------------------------------------------------ tray geometry per option
  // returns { slots: [{x, y, kind, r?}], shelf?, hit: {x, y, w, h} }
  function tray(id, L, o, items, equip) {
    const y = L.shelfY, P = o === 'p', s = [];
    if (id === 'A') {
      const ix0 = P ? 676 : L.musicX - 18 - 40, ex0 = P ? 44 : L.map.x + 30;
      items.forEach((k, i) => s.push({ x: ix0 - L.pitch * i, y, kind: k }));
      equip.forEach((k, j) => s.push({ x: ex0 + L.pitch * j, y, kind: k }));
    } else if (id === 'B') {
      const cx = P ? 360 : L.map.x + 15 * L.map.c / 2;
      if (!equip.length) items.forEach((k, i) => s.push({ x: cx + (i - (items.length - 1) / 2) * L.pitch, y, kind: k }));
      else {
        equip.forEach((k) => s.push({ x: cx, y, kind: k, r: L.handR }));
        const off = L.handR + (P ? 14 : 12) + L.r;
        items.forEach((k, i) => { const side = i % 2 ? -1 : 1, rank = Math.floor(i / 2); s.push({ x: cx + side * (off + rank * L.pitch), y, kind: k }); });
      }
    }
    return s;
  }
  // option C: the slug line as positioned segments
  function slug(L, o, lang, items, equip) {
    const W = TXT[lang], fs = L.slugFs, x0 = o === 'p' ? 24 : L.map.x, y = L.shelfY, seg = [];
    let x = x0;
    const put = (str, role, kind) => { const w = wtext(str, fs); seg.push({ str, role, kind, x, w, cx: x + w / 2 }); x += w; };
    put(W.you, 'cue');
    if (equip.length) put(lang === 'ko' ? ' · ' : ', ', 'punct'), put(CLAUSE[lang], 'equip', equip[0]);
    put(' (', 'punct');
    items.forEach((k, i) => { if (i) put(', ', 'punct'); put(THING[k][lang], 'item', k); });
    put(')', 'punct');
    return { seg, y, fs, x0, end: x };
  }

  // ------------------------------------------------------------------ one phone
  function phone(id, f, o, skin, lang, opt = {}) {
    const L = LAY[o], W = TXT[lang], st = STATE[f], A = skin === 'ascii', P = o === 'p';
    const defs = [], out = [], over = [];
    const m = L.map, c = m.c, mw = 15 * c, mh = 16 * c;
    const cell = (x, y) => ({ x: m.x + (x + 0.5) * c, y: m.y + (y + 0.5) * c });

    // ---------------- background, header (status, title, ♪, ⚙ as layout.rb)
    out.push(R(0, 0, L.W, L.H, C.ink));
    const hy = L.hdr.y, hh = L.hdr.h, hc = hy + hh / 2;
    out.push(R(16, hy + 8, P ? 164 : 150, hh - 16, '#0c1218'));
    out.push(Ci(34, hc, 6, C.mint), T(48, hc, 'LIVE r1', P ? 17 : 15, '#9fb6b0', { a: 'start' }));
    out.push(T(P ? 196 : 186, hc, W.title, P ? 19 : 17, '#d8dcd6', { a: 'start' }));
    out.push(T(L.musicX - (P ? 18 : 16), hc, W.music, P ? 19 : 17, '#d8dcd6', { a: 'start' }));
    { const g = L.gear, gr = g.r * 0.55; let teeth = '';                           // ⚙ drawn, not a font glyph
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; teeth += Ln(g.x + Math.cos(a) * gr, hc + Math.sin(a) * gr, g.x + Math.cos(a) * gr * 1.45, hc + Math.sin(a) * gr * 1.45, '#9aa4a8', P ? 5 : 4, { cap: 'butt' }); }
      out.push(teeth, Ci(g.x, hc, gr, '#0c1218', { st: '#9aa4a8', sw: P ? 4 : 3.4 }), Ci(g.x, hc, gr * 0.36, '#9aa4a8')); }
    out.push(R(0, hy + hh, L.W, 1, '#1a242a'));

    // ---------------- the map (the shop from the cancel-do mocks, simplified)
    const objs = { counter: [[1, 4], [2, 4], [3, 4], [4, 4]], table: [[9, 8], [10, 8]], bench: [[10, 11], [11, 11]], plants: [[1, 13], [13, 13]], disp: [[13, 2], [13, 6], [13, 10]] };
    const tgt = { x: 3, y: 3 }, gem = { x: 6, y: 12 }, me = st.env ? { x: 6, y: 5 } : { x: 10, y: 13 }, pick = st.env ? { x: 7, y: 6 } : { x: 11, y: 12 };
    if (!A) {
      out.push(R(m.x, m.y, mw, mh, '#2a1c12'), R(m.x + c, m.y + c, mw - 2 * c, mh - 2 * c, '#ebe5d6'));
      for (let y = 1; y < 15; y++) out.push(Ln(m.x + c, m.y + y * c, m.x + mw - c, m.y + y * c, '#d8cfba', 1.2));
      for (let y = 1; y < 15; y++) for (let x = 1; x < 14; x += 3) out.push(Ln(m.x + (x + (y % 2) * 1.5) * c, m.y + y * c, m.x + (x + (y % 2) * 1.5) * c, m.y + (y + 1) * c, '#ddd5c2', 1));
      for (const x of [1, 2, 3, 4, 10, 11, 12, 13]) out.push(R(m.x + x * c + 4, m.y + 5, c - 8, c - 10, '#c9a46a', { rx: 2 }), R(m.x + x * c + 11, m.y + 14, c - 22, c - 26, ['#b5562e', '#2f3a5a', '#8a2a3a', '#d08a40'][x % 4], { rx: 3 }));
      out.push(R(m.x + 6 * c, m.y + 5, 3 * c, c - 10, '#3a2414', { st: '#c9a46a', sw: 2 }));
      for (const x of [6, 7, 8]) out.push(R(m.x + x * c + 3, m.y + 15 * c + 4, c - 6, c - 8, '#b8c4cc', { op: 0.7 }));
      out.push(R(m.x + c, m.y + 4 * c + 8, 4 * c, c * 0.7, '#2b2320', { rx: 3 }), Ci(m.x + 3.5 * c, m.y + 4.45 * c, 6, '#e8c050'));
      out.push(R(m.x + 9 * c + 4, m.y + 8 * c + 6, 2 * c - 8, c - 12, '#f6f4ee', { st: '#b9b4a8', sw: 2 }));
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
        else if (!((st.floor || st.env) && x === pick.x && y === pick.y)) g(x, y, '.', '#26313a');
      }
      for (const [x, y] of objs.counter) g(x, y, '=', '#a08458', 700);
      for (const [x, y] of objs.table) g(x, y, 'T', '#c4d4e2', 700);
      for (const [x, y] of objs.bench) g(x, y, 'h', '#c04a5e', 700);
      for (const [x, y] of objs.plants) g(x, y, '&', '#4fa36a', 700);
      for (const [x, y] of objs.disp) g(x, y, 'o', '#c4d4e2');
    }
    const pc = cell(pick.x, pick.y);
    if (st.floor) { if (!A) out.push(glow(defs, pc.x, pc.y, c * 0.7, C.parch, 0.35)); out.push(icon('card', pc.x, pc.y, c * 0.55, A)); }
    if (st.env && !A) out.push(R(pc.x - c * 0.42, pc.y - c * 0.3, c * 0.84, c * 0.62, '#6b4a2c', { rx: 3, st: '#4a321c', sw: 1.5 }));   // the little table
    if (st.env === 'start') {                       // popped off the table: lifted 12 px, scale 1.25, cell box, dust, "+ 봉투"
      const ly = pc.y - 12;
      if (!A) out.push(glow(defs, pc.x, ly, c * 0.95, C.parch, 0.5));
      out.push(R(pc.x - c * 0.55, pc.y - c * 0.55, c * 1.1, c * 1.1, null, { st: '#e8d48a', sw: 2, op: 0.9 }));
      out.push(icon('letter', pc.x, ly, c * 0.55 * 1.25, A));
      [[-0.32, 0.36], [0.05, 0.42], [0.36, 0.3]].forEach(([dx, dy]) => out.push(T(pc.x + dx * c, pc.y + dy * c, '+', L.small, A ? C.parch : '#fff6dc', { w: 700, op: 0.85, stroke: A ? undefined : '#5a4630', sw: A ? undefined : 3 })));
      out.push(dotRing(pc.x, ly, c * 0.62, C.parch, 6, L.small, 0.5));
      out.push(T(pc.x + c * 0.95, ly - c * 0.72, ENV_LABEL[lang], L.lbl + 2, '#fbf6e8', { w: 700, stroke: A ? undefined : '#0b0f14', sw: A ? undefined : 5 }));   // up-right: @ is up-left
    } else if (st.env === 'mid') out.push(Pa(`M${n(pc.x - c * 0.3)} ${n(pc.y)} h${n(c * 0.6)}`, { st: C.parch, sw: 1.2, op: 0.3, dash: '2 4' }));
    const actor = (p, ch, col, outline) => {
      const q = cell(p.x, p.y);
      if (!A) out.push(`<ellipse cx="${q.x}" cy="${q.y + c * 0.36}" rx="${c * 0.32}" ry="${c * 0.1}" fill="#000" opacity="0.18"/>`);
      out.push(T(q.x, q.y, ch, c * 0.82, col, { w: 800, stroke: A ? undefined : outline, sw: A ? undefined : 4 }));
    };
    actor(gem, W.og, A ? '#ff63b6' : '#e2506f', '#fff4f4');
    actor(me, '@', A ? C.mint : '#1fae90', '#0b1f1a');
    actor(tgt, W.tg, A ? '#7fb2ff' : '#2c5e9e', '#ffffff');
    const tc = cell(tgt.x, tgt.y), mc = cell(me.x, me.y);
    out.push(T(tc.x, tc.y - c * 0.98, W.tname, P ? 14 : 12, A ? '#7fb2ff' : '#2c5e9e', { w: 700, stroke: A ? undefined : '#f4f0e6', sw: 3 }));
    if (st.talk) {                                  // the speaking dot: one green dot over the player, glow grows while talking
      const dy = mc.y - c * 0.95;
      out.push(glow(defs, mc.x, dy, c * 0.62, C.talk, A ? 0.3 : 0.55), Ci(mc.x, dy, P ? 7 : 6, C.talk));
    }

    // ---------------- the inventory
    const ann = (x, y, s, anchor = 'middle') => over.push(T(x, y, s, L.small - 1, '#a8b4b8', { a: anchor, op: 0.9 }));
    const showAnn = opt.ann !== false;
    let slots = [], target = null, flyFrom = null, flyKind = null, text = null;
    if (id === 'C') {
      const items = st.fly ? [...st.items, st.fly] : st.items;
      if (items.length) {
        text = slug(L, o, lang, items, st.equip);
        const flying = st.fly ? text.seg.find(sg => sg.kind === st.fly) : null;
        if (!A) over.push(R(text.x0 - 10, text.y - text.fs * 0.85, text.end - text.x0 + 20, text.fs * 1.7, '#0b0f14', { op: 0.9, rx: 4 }));
        const spans = [];                           // one <text>, tspans flow naturally (estimates are only used for targets)
        for (const sg of text.seg) {
          const landed = st.land && sg.kind === st.land;
          if (landed) over.push(glow(defs, sg.cx, text.y, Math.max(sg.w * 0.75, text.fs * 1.4), sg.role === 'equip' ? C.mint : C.parch, A ? 0.25 : 0.45));
          const col = sg.role === 'cue' ? C.mint : sg.role === 'equip' ? '#a8f0dc' : sg.role === 'item' ? C.parch : C.muted;
          const hide = sg === flying;
          if (hide) over.push(Ln(sg.x + 2, text.y + text.fs * 0.62, sg.x + sg.w - 2, text.y + text.fs * 0.62, C.parch, 1.5, { dash: '2 5', op: 0.7 }));
          spans.push(`<tspan fill="${col}"${hide ? ' fill-opacity="0"' : ''}${sg.role === 'cue' || landed ? ' font-weight="700"' : ''}>${esc(sg.str)}</tspan>`);
          if (A && f === 3 && sg.kind === 'coin') spans.push(`<tspan fill="${C.parch}">'</tspan>`);   // unseen-new prime
        }
        over.push(`<text x="${text.x0}" y="${text.y}" font-size="${text.fs}" dominant-baseline="central">${spans.join('')}</text>`);
        if (st.fly) { target = { x: flying.cx, y: text.y }; flyFrom = pc; flyKind = st.fly; }
        if (st.land === 'coat') { const eq = text.seg.find(sg => sg.role === 'equip'); target = { x: eq.cx, y: text.y }; flyFrom = tc; }
      }
    } else {
      slots = tray(id, L, o, st.items, st.equip);
      if (st.fly) {
        const next = tray(id, L, o, [...st.items, st.fly], st.equip);
        target = next[next.length - 1]; flyFrom = pc; flyKind = st.fly;
        if (st.items.length) { const e = 0.61; slots = slots.map((sl, i) => ({ ...sl, x: sl.x + (next[i].x - sl.x) * e })); }   // B re-centres during the flight (easeInOutQuad at t 0.56)
        over.push(slotBirth(L, target.x, target.y, A));
      }
      if (id === 'A' && slots.length && !A) {                    // the pockets hang from the header line
        const ix = slots.filter(s => !THING[s.kind].equip), ex = slots.filter(s => THING[s.kind].equip);
        for (const grp of [ix, ex]) if (grp.length) {
          const x0 = Math.min(...grp.map(s => s.x)) - L.r - 10, x1 = Math.max(...grp.map(s => s.x)) + L.r + 10;
          over.push(R(x0, (P ? L.hdr.y + L.hdr.h : L.shelfY - L.r - 6), x1 - x0, P ? L.shelfY - L.hdr.y - L.hdr.h + L.r + 10 : 2 * L.r + 12, '#0b0f14', { op: 0.92, rx: 8, st: '#1f2a30', sw: 1 }));
        }
      }
      if (id === 'B' && (st.items.length >= 3 || st.equip.length) && slots.length) {   // stage 2: the shelf appears
        const xs = slots.map(s => s.x), half = (Math.max(...xs) - Math.min(...xs)) / 2 + L.r + 18, cx = (Math.max(...xs) + Math.min(...xs)) / 2;
        const sy = L.shelfY + L.r + (P ? 14 : 5);
        if (A) over.push(T(cx, sy + 2, '·'.repeat(Math.round(half * 2 / (L.small * 0.6 * 1.6))), L.small, C.parchDim, { ls: L.small * 0.35 }));
        else over.push(Ln(cx - half, sy, cx + half, sy, C.parch, 1.2, { op: 0.4 }), Ln(cx - half, sy - 5, cx - half, sy, C.parch, 1.2, { op: 0.4 }), Ln(cx + half, sy - 5, cx + half, sy, C.parch, 1.2, { op: 0.4 }));
      }
      for (const s of slots) over.push(slot(defs, L, s.x, s.y, s.kind, A, { land: st.land === s.kind, r: s.r }));
      if (st.land === 'coat') { target = slots.find(s => s.kind === 'coat'); flyFrom = tc; }
    }
    // the flight path (annotation) and the thing in the air
    if (target && flyFrom) {
      const fl = flight({ x: flyFrom.x, y: flyFrom.y }, target);
      const col = flyKind ? C.parch : C.mint;
      over.push(Pa(fl.d, { st: col, sw: 2, dash: '6 8', op: flyKind ? 0.75 : 0.35 }));
      if (flyKind) {
        if (id === 'C') {                           // letters stream up, first letter leads
          const word = THING[flyKind][lang], chars = [...word];
          over.push(icon(flyKind, flyFrom.x, flyFrom.y, c * 0.5, A, 0.3));
          const lead = flyKind === 'card' ? 0.74 : 0.56;   // the envelope's flight is short (it is picked up high on the map): show the letters further back on the path
          chars.forEach((ch, i) => { const p = fl.at(lead - i * (flyKind === 'card' ? 0.08 : 0.1)); over.push(T(p.x, p.y, ch, L.slugFs * 1.1, C.parch, { w: 700, op: 1 - i * 0.12, stroke: A ? undefined : '#0b0f14', sw: A ? undefined : 4 })); });
          const p0 = fl.at(lead), p1 = fl.at(lead + 0.06);
          over.push(Ln(p0.x, p0.y, p1.x, p1.y, C.parch, 2, { op: 0.6 }));
        } else {
          const tilt = (p, svg) => flyKind === 'letter' && !A ? `<g transform="rotate(-14 ${n(p.x)} ${n(p.y)})">${svg}</g>` : svg;
          [0.38, 0.44, 0.5].forEach((t, i) => { const p = fl.at(t); over.push(tilt(p, icon(flyKind, p.x, p.y, L.icon * 1.1, A, [0.12, 0.25, 0.45][i]))); });
          const p = fl.at(0.56);
          if (!A) over.push(glow(defs, p.x, p.y, L.icon * 1.4, C.parch, 0.4));
          over.push(tilt(p, icon(flyKind, p.x, p.y, L.icon * 1.2, A)));
        }
        // the lift beat at the origin
        over.push(dotRing(flyFrom.x, flyFrom.y, c * 0.45, C.parch, 6, L.small, 0.5));
      }
      if (showAnn) {                                // the landing target, in game coords, in a pill on the map's wall row
        const label = `→ (${Math.round(target.x)}, ${gameY(o, target.y)})`, fs = L.small - 1, w = label.length * fs * 0.6 + 16;
        const py = m.y + c * 0.45, px = Math.min(Math.max(target.x, w / 2 + 8), L.W - w / 2 - 8);
        over.push(Ln(target.x, target.y + (target.r || L.r) + 4, target.x, py - fs * 0.8, '#a8b4b8', 1.2, { op: 0.6, dash: '2 3' }));
        over.push(R(px - w / 2, py - fs * 0.85, w, fs * 1.7, '#06080c', { op: 0.88, rx: 3, st: '#3a4650', sw: 1 }), T(px, py, label, fs, '#c8d2d4'));
      }
    }

    if (st.env === 'landed') {
      const tx = id === 'C' ? text.seg.find(sg => sg.kind === 'letter').cx : slots.find(sl => sl.kind === 'letter').x;
      over.push(T(tx, L.shelfY + L.r + (P ? 26 : 16) + (id === 'B' ? 8 : 0), ENV_LABEL[lang], L.small, '#fbf6e8', { w: 700, op: 0.6 }));
    }

    // ---------------- opened tray (frame 5)
    if (st.open) {
      const list = [...st.equip.map(k => ['e', k]), ...st.items.map(k => ['i', k])];
      const fs = L.fs, rh = P ? 54 : 44, head = P ? 34 : 28;
      if (id === 'C') {
        const lines = [['cue', W.you], ['par', `(${CLAUSE[lang]})`], ...st.items.map(k => ['prop', k])];
        const w = P ? 520 : 440, x0 = P ? 24 : L.map.x, y0 = L.shelfY + L.slugFs + (P ? 4 : 8), lh = P ? 44 : 36;
        const hgt = lines.length * lh + 24;
        over.push(R(x0 - 10, y0, w, hgt, A ? C.ink : '#0b0e14', { op: 0.96, st: A ? C.parch : '#2a2a22', sw: A ? 1.5 : 1.5, rx: A ? 0 : 8 }));
        lines.forEach(([kind, v], i) => {
          const y = y0 + 12 + lh * (i + 0.5);
          if (kind === 'cue') over.push(T(x0 + w / 2 - 10, y, v, fs + 2, C.mint, { w: 700 }));
          if (kind === 'par') over.push(T(x0 + w / 2 - 10, y, v, fs, '#a8f0dc'));
          if (kind === 'prop') {
            const t = THING[v];
            if (!A) over.push(icon(v, x0 + 40, y, L.icon * 0.9, false)); else over.push(T(x0 + 40, y, `[${t.a}]`, fs, C.parch));
            over.push(T(x0 + 76, y, t[lang], fs, C.parch, { a: 'start', w: 700 }), T(x0 + 76 + wtext(t[lang], fs) + 14, y, `— ${t.note[lang]}`, fs - 4, C.muted, { a: 'start' }));
          }
        });
      } else {
        const w = P ? 470 : 420, hgt = 2 * head + list.length * rh + 18;
        let x0;
        if (id === 'A') x0 = (P ? 696 : L.musicX - 18 - 40 + L.r + 10) - w; else x0 = (P ? 360 : L.map.x + mw / 2) - w / 2;
        const y0 = L.shelfY + L.r + (P ? 22 : 14);
        over.push(R(x0, y0, w, hgt, A ? C.ink : '#0b0e14', { op: 0.96, st: A ? C.parch : '#2a2a22', sw: 1.5, rx: A ? 0 : 8 }));
        if (A) over.push(T(x0 + 8, y0 - 1, '┌' + '─'.repeat(Math.floor((w - 30) / (L.small * 0.6))) + '┐', L.small, C.parchDim, { a: 'start' }));
        let y = y0 + 9;
        const sect = (lbl, col) => { over.push(T(x0 + 18, y + head / 2, A ? `[ ${lbl} ]` : lbl, L.small, col, { a: 'start', w: 700 })); y += head; };
        const row = (k, hi) => {
          const t = THING[k], cy = y + rh / 2;
          if (hi && A) over.push(T(x0 + 14, cy, '>', fs, C.parch, { a: 'start', w: 700 }));
          if (A) over.push(T(x0 + 54, cy, t.equip ? `{${t.a}}` : `[${t.a}]`, fs, t.equip ? C.mint : C.parch));
          else over.push(R(x0 + 10, y + 3, w - 20, rh - 6, hi ? '#1c1a12' : '#141820', { rx: 3 }), icon(k, x0 + 46, cy, L.icon * 0.95, false));
          over.push(T(x0 + 86, cy, t[lang], fs, C.paper, { a: 'start', w: 700 }));
          over.push(T(x0 + 86 + wtext(t[lang], fs) + 16, cy, t.note[lang], fs - 4, C.muted, { a: 'start' }));
          y += rh;
        };
        sect(W.equip, C.mint); st.equip.forEach(k => row(k));
        sect(W.items, C.parch); st.items.forEach((k, i) => row(k, i === 0));
      }
      if (showAnn) ann(P ? 360 : L.map.x + mw / 2, P ? 936 : 700, lang === 'ko' ? '선반을 다시 누르거나 바깥을 누르면 접힘' : 'tap the tray again or anywhere outside to fold');
    }

    // ---------------- deck (unchanged: stick 메뉴, violet mic, amber ACT)
    if (P) out.push(R(0, L.deckTop, L.W, L.H - L.deckTop, C.deck), R(0, L.deckTop, L.W, 1.5, C.mint, { op: 0.12 }));
    else out.push(R(m.x + mw + 14, L.hdr.h + 8, 1.5, L.H - L.hdr.h - 16, C.mint, { op: 0.1 }));
    { const fd = L.feed, lines = W.feed[f];
      lines.forEach(([who, s, fresh], i) => {
        const y = fd.bottom - (lines.length - 1 - i) * fd.lh;
        out.push(T(fd.cx, y, s, fd.fs, who === 'npc' ? '#9fb2c6' : C.sand, { op: fresh ? 1 : 0.8, w: fresh ? 700 : 400 }));
      });
    }
    const pad = L.pad, mic = L.mic, act = L.act;
    { const p = pad, r = p.r;
      if (!A) out.push(glow(defs, p.x, p.y, r * 1.45, C.mint, 0.12));
      out.push(Ci(p.x, p.y, r, A ? '#141c24' : '#0e161c', { st: C.mint, sw: 2.5 }));
      const arrow = (dx, dy, g) => T(p.x + dx * r * 0.66, p.y + dy * r * 0.68, g, P ? 22 : 17, C.mint, { w: 700, op: 0.85 });
      out.push(arrow(0, -1, '▲'), arrow(0, 1, '▼'), T(p.x - r * 0.66, p.y, '·', 22, '#3c4a52'), T(p.x + r * 0.66, p.y, '·', 22, '#3c4a52'));
      out.push(Ci(p.x, p.y, r * 0.3, '#1a282e', { st: C.mint, sw: 2 }));
      out.push(T(p.x, p.y + r + (P ? 26 : 20), W.menu, L.lbl, C.mint, { w: 700, op: 0.85 })); }
    { const r = mic.r;
      if (!A) out.push(Ci(mic.x, mic.y, r, '#221836'), Ci(mic.x, mic.y + r * 0.22, r * 0.78, '#342652', { op: 0.43 }), Ci(mic.x, mic.y, r, null, { st: C.violet, sw: 4, op: 0.8 }));
      else out.push(Ci(mic.x, mic.y, r, '#1e162e', { st: C.violet, sw: 3 }));
      out.push(T(mic.x, mic.y + 3, A ? '*' : '✦', r * (A ? 0.95 : 0.9), C.gold, { op: 0.9, w: 700 }));
      if (!A) out.push(T(mic.x + r * 0.36, mic.y - r * 0.34, '✧', r * 0.34, C.violet, { op: 0.7 }));
      out.push(T(mic.x, mic.y + r + (P ? 26 : 20), W.mic, L.lbl, C.violet, { w: 700, op: 0.9 })); }
    { const a = act, r = a.r;
      out.push(glow(defs, a.x, a.y, r * (A ? 1.6 : 1.7), C.amber, A ? 0.22 : 0.6), Ci(a.x, a.y, r, C.amber));
      if (!A) out.push(Ci(a.x, a.y - r * 0.22, r * 0.8, C.amberHi, { op: 0.35 }));
      out.push(Ci(a.x, a.y, r, null, { st: A ? C.amber : C.amberRim, sw: 3, op: 0.95 }), T(a.x, a.y + 1, W.act, r * (lang === 'ko' ? 0.42 : 0.46), C.dark, { w: 700 })); }

    const [cwCss, chCss] = L.css;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" width="${cwCss}" height="${chCss}"><defs>${defs.join('')}</defs>${out.join('')}${over.join('')}</svg>`;
  }

  // ------------------------------------------------------------------ pages
  const link = (over) => '?' + new URLSearchParams({ o: Q.o, s: Q.s, l: Q.l, ...over }).toString();
  const nav = (cur) => `<nav><a href="index.html"${cur === 0 ? ' class="on"' : ''}>board</a>${OPTS.map(o => `<a href="opt${o.id}.html${link({})}"${cur === o.id ? ' class="on"' : ''}>${o.id} ${esc(o.title)}</a>`).join('')}</nav>`;
  const combo = (o, s, l) => `${o === 'p' ? 'portrait' : 'landscape'} · ${s === 'color' ? 'colour' : 'ASCII'} · ${l.toUpperCase()}`;
  const table = (rows) => `<table class="model">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
  const specBlock = (id) => { const sp = SPEC[id]; return `<section class="spec"><h2>SPEC <small>· item-fly target, logical game coords (y up; portrait w 720, top = screen_top − 88; landscape header h 52)</small></h2>
      <h3>Portrait</h3>${table(sp.p)}<h3>Landscape</h3>${table(sp.l)}<h3>Timing</h3><p>${esc(TIMING)}</p><h3>On land</h3><p>${esc(sp.land)}</p></section>`; };

  function optionPage(id) {
    const op = OPTS.find(o => o.id === id);
    document.title = `${op.id}. ${op.title} · inventory`;
    if (Q.solo) { document.body.className = 'solo'; document.body.innerHTML = phone(id, Q.f, Q.o, Q.s, Q.l, { ann: qs.get('ann') !== '0' }); return; }
    const tg = (name, key, vals) => `<div><span>${name}</span>${vals.map(([v, lbl]) => `<a href="${link({ [key]: v })}"${Q[key] === v ? ' class="on"' : ''}>${lbl}</a>`).join('')}</div>`;
    const stage = (f) => id === 'B' ? ['stage 0', 'stage 1 · fly', 'stage 1', 'stage 2', 'stage 3', 'open'][f] : `${f}`;
    const flow = FRAMES.map(fr => `<figure class="frame">${phone(id, fr.id, Q.o, Q.s, Q.l)}<figcaption><b>${stage(fr.id)} · ${esc(fr[Q.l])}.</b> ${esc(op.caps[fr.id])}</figcaption></figure>`).join('');
    const envFlow = ENV_FRAMES.map((fr, i) => `<figure class="frame">${phone(id, fr.id, Q.o, Q.s, Q.l)}<figcaption><b>${esc(fr[Q.l])}.</b> ${esc(op.env[i])}</figcaption></figure>`).join('');
    const cells = (o) => ['color', 'ascii'].flatMap(s => ['ko', 'en'].map(l => `<div class="cell">${phone(id, 4, o, s, l)}<div class="tag">${combo(o, s, l)}</div></div>`)).join('');
    document.body.innerHTML = `<main>
      <header class="top"><h1>${op.id}. ${esc(op.title)}<small>${esc(op.ko)}</small></h1>${nav(id)}</header>
      <p class="line">${esc(op.line)}</p>
      ${table(op.model)}
      <div class="toggles">${tg('orientation', 'o', [['p', 'portrait'], ['l', 'landscape']])}${tg('skin', 's', [['color', 'colour'], ['ascii', 'ASCII']])}${tg('language', 'l', [['ko', 'KO'], ['en', 'EN']])}</div>
      <h2>${id === 'B' ? 'Growth' : 'Flow'} <small>· ${combo(Q.o, Q.s, Q.l)} · dashed line = the fly path (annotation, not drawn in game); → (x, y) = landing target</small></h2>
      <div class="flow ${Q.o}">${flow}</div>
      <h2 id="envelope">Envelope pickup <small>· the SFX/VFX letter clip (r2_letter_color) landing here instead of in 행동, after frame 3's items · ${combo(Q.o, Q.s, Q.l)} · shots: <a href="../../../inventory/shots/opt${id}-envelope-start.png">start</a> · <a href="../../../inventory/shots/opt${id}-envelope-mid.png">mid</a> · <a href="../../../inventory/shots/opt${id}-envelope-landed.png">landed</a></small></h2>
      <div class="flow ${Q.o}">${envFlow}</div>
      ${specBlock(id)}
      <h2>Matrix <small>· frame 4 (equipment unlocked) in every orientation × skin × language</small></h2>
      <div class="matrix p">${cells('p')}</div>
      <div class="matrix l" style="margin-top:14px">${cells('l')}</div>
    </main>`;
  }

  function indexPage() {
    document.title = 'Inventory at the top · three directions';
    const cards = OPTS.map(op => `<section class="opt">
        <h3>${op.id}. ${esc(op.title)}<span>${esc(op.ko)}</span></h3>
        <p>${esc(op.line)}</p>
        <div class="pair"><a href="opt${op.id}.html">${phone(op.id, 1, 'p', 'color', 'ko')}<div>first pickup flies up</div></a><a href="opt${op.id}.html">${phone(op.id, 4, 'p', 'color', 'ko')}<div>items + equipment</div></a></div>
        <div class="pair"><a href="opt${op.id}.html?o=p&s=ascii&l=en">${phone(op.id, 3, 'p', 'ascii', 'en')}<div>several · ASCII EN</div></a><a href="opt${op.id}.html?o=l&s=color&l=ko">${phone(op.id, 4, 'l', 'color', 'ko')}<div>landscape · in the header</div></a></div>
        <div class="pair env">${ENV_FRAMES.map(fr => `<a href="../../../inventory/shots/opt${op.id}-envelope-${{ e0: 'start', e1: 'mid', e2: 'landed' }[fr.id]}.png">${phone(op.id, fr.id, 'p', 'color', 'ko')}<div>${esc(fr.en)}</div></a>`).join('')}</div>
        <div class="how"><b>Items</b> ${esc(op.model[0][1])}<br><b>Equipment</b> ${esc(op.model[1][1])}</div>
        <a class="go" href="opt${op.id}.html">open ${op.id} →</a>
      </section>`).join('');
    document.body.innerHTML = `<main>
      <header class="top"><h1>Inventory at the top: three directions<small>mockups only · not applied to drdr-dr</small></h1>${nav(0)}</header>
      <p class="notes">Today a pickup flies into 행동 (ACT). Here it flies <b>up</b>, to an inventory that does not exist until that first pickup: an empty world draws zero inventory chrome. In portrait the tray hangs just under the header (⚙ and ♪ untouched) in the headroom above the map; in landscape it shares the 52-px header strip. Using items stays in the ACT menu; the top is a display you can tap open. Deck, stick ◀/▶ cancel/do and the green speaking-dot are unchanged. Recommended: <b>B</b>, with C's letter-churn for the ASCII landing and C's slug as the text inside B's open card (see THINKING.md).</p>
      <div class="board">${cards}</div>
    </main>`;
  }

  window.Inventory = { OPTS, SPEC, TIMING, phone };
  const page = document.body.dataset.opt;
  if (page === 'index') indexPage(); else optionPage(page);
})();
