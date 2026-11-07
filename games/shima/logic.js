// 島ひらき（2〜4人・資源を集めて建てる）
//
// 盤面: 5×5 の正方形のマスの島。マスは 森（木）・田（米）・石山（石）・塩浜（塩）・荒地（何も出ない）。
// 村と城下町はマスの「角」（6×6 の交点）に置く。道はマスの「辺」に置く。
// 毎手番のはじめに季節札を1枚めくる。手番の人は、札に書かれた2種類の地形に接する自分の村ごとに資源を1つ（城下町は2つ）得る。
// 次にめくられる札（＝次の人が受け取る季節）は表向きで見えている。交換の駆け引きに使える。台風札では資源を失い、市場の値段が戻る。
// 資源は、値段の動く市場か、プレイヤー同士の交換でやりとりできる。先に目標の点に届いた人の勝ち。
import { GameError, shuffle } from '../../js/util.js';

export const SIZE = 5; // マスの数（一辺）
export const V = SIZE + 1; // 交点の数（一辺）

export const RES = ['wood', 'stone', 'rice', 'salt'];
export const RES_INFO = {
  wood: { name: '木', icon: '🌲' },
  stone: { name: '石', icon: '🪨' },
  rice: { name: '米', icon: '🌾' },
  salt: { name: '塩', icon: '🧂' },
};
export const TERRAIN = {
  forest: { name: '森', res: 'wood', color: '#4e8a3a' },
  mountain: { name: '石山', res: 'stone', color: '#8a8a90' },
  field: { name: '田', res: 'rice', color: '#d9b84a' },
  beach: { name: '塩浜', res: 'salt', color: '#e8dcc0' },
  waste: { name: '荒地', res: null, color: '#a08060' },
};
const LAND = ['forest', 'mountain', 'field', 'beach'];

export const COSTS = {
  road: { wood: 1, stone: 1 },
  village: { wood: 1, rice: 1, salt: 1 },
  town: { rice: 2, stone: 3 },
  temple: { wood: 2, stone: 2, salt: 2, rice: 1 },
};
export const LIMITS = { road: 12, village: 5, town: 4 };
export const BUILD_INFO = {
  road: { name: '道', icon: '🛤️', text: '自分の村か道につなげて置く' },
  village: { name: '村', icon: '🏠', text: '1点。自分の道の先に置く（となりの角に村があると置けない）' },
  town: { name: '城下町', icon: '🏯', text: '2点。自分の村を建て替える。資源が2つずつ出る' },
  temple: { name: '寺社', icon: '⛩️', text: '2点。1人1つまで。城下町を1つ以上持っていると建てられる' },
};
export const GOALS = [6, 8, 10];
export const PRICE_MIN = 2;
export const PRICE_MAX = 5;
export const PRICE_BASE = 3;
export const TYPHOON_LIMIT = 6; // 台風のとき、この枚数以上持っている人は資源を失う

export function normalizeOptions(o) {
  return { goal: GOALS.includes(Number(o?.goal)) ? Number(o.goal) : 8 };
}

// ---- 盤面の座標 ----
// マス (x, y)、交点 "i,j"（0..SIZE）、辺 "h:i,j"（(i,j)-(i+1,j)）と "v:i,j"（(i,j)-(i,j+1)）
export const vkey = (i, j) => `${i},${j}`;
export const parseV = k => k.split(',').map(Number);
export function allVertices() {
  const out = [];
  for (let j = 0; j <= SIZE; j++) for (let i = 0; i <= SIZE; i++) out.push(vkey(i, j));
  return out;
}
export function allEdges() {
  const out = [];
  for (let j = 0; j <= SIZE; j++) for (let i = 0; i < SIZE; i++) out.push(`h:${i},${j}`);
  for (let j = 0; j < SIZE; j++) for (let i = 0; i <= SIZE; i++) out.push(`v:${i},${j}`);
  return out;
}
export function edgeEnds(e) {
  const [kind, rest] = e.split(':');
  const [i, j] = rest.split(',').map(Number);
  return kind === 'h' ? [vkey(i, j), vkey(i + 1, j)] : [vkey(i, j), vkey(i, j + 1)];
}
export function vertexEdges(v) {
  const [i, j] = parseV(v);
  const out = [];
  if (i > 0) out.push(`h:${i - 1},${j}`);
  if (i < SIZE) out.push(`h:${i},${j}`);
  if (j > 0) out.push(`v:${i},${j - 1}`);
  if (j < SIZE) out.push(`v:${i},${j}`);
  return out;
}
export function neighbors(v) {
  return vertexEdges(v).map(e => edgeEnds(e).find(x => x !== v));
}
// 交点に接するマス（最大4つ）
export function vertexTiles(g, v) {
  const [i, j] = parseV(v);
  const out = [];
  for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) out.push(g.tiles[y * SIZE + x]);
  }
  return out;
}

// ---- 準備 ----

function makeDeck(rng) {
  const cards = [];
  for (let a = 0; a < LAND.length; a++) for (let b = a + 1; b < LAND.length; b++) cards.push({ kind: 'season', t: [LAND[a], LAND[b]] }, { kind: 'season', t: [LAND[a], LAND[b]] });
  cards.push({ kind: 'typhoon' }, { kind: 'typhoon' });
  return shuffle(cards, rng);
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 4) throw new GameError('島ひらきは2〜4人で遊びます');
  const { goal } = normalizeOptions(options);
  const ids = players.map(p => p.id);
  // 地形: 森・田・石山・塩浜を6枚ずつ＋荒地1枚
  const kinds = shuffle([...LAND.flatMap(t => Array(6).fill(t)), 'waste'], rng);
  const tiles = kinds.map((t, n) => ({ x: n % SIZE, y: Math.floor(n / SIZE), t }));
  // 準備の置き方: 1→n→n→1 の順に、村1つと道1本ずつ（2巡）
  const order = [...ids, ...ids.slice().reverse()];
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    goal,
    tiles,
    villages: {}, // 交点 → { p, town }
    roads: {}, // 辺 → p
    res: Object.fromEntries(ids.map(p => [p, { wood: 0, stone: 0, rice: 0, salt: 0 }])),
    temple: Object.fromEntries(ids.map(p => [p, false])),
    prices: { wood: PRICE_BASE, stone: PRICE_BASE, rice: PRICE_BASE, salt: PRICE_BASE },
    deck: makeDeck(rng),
    card: null, // 今の季節札
    produced: null, // 今の札で各人が得た資源（画面の表示用）
    phase: 'setup',
    setup: { order, idx: 0, step: 'village', last: null },
    turn: null,
    round: 0,
    offer: null, // プレイヤー同士の交換の申し出 { id, from, give, get, declined: [] }
    offerSeq: 0,
    winner: null,
    log: ['🏝️ 島ひらき、開始！ まずは村と道を2つずつ置きます'],
  };
  return g;
}

function log(g, text) {
  g.log.push(text);
  if (g.log.length > 60) g.log.splice(0, g.log.length - 60);
}
const nameOf = (g, p) => g.names[p] ?? '?';
const resText = bag => RES.filter(r => bag[r]).map(r => `${RES_INFO[r].icon}${bag[r]}`).join(' ') || 'なし';

export function points(g, p) {
  let n = 0;
  for (const v of Object.values(g.villages)) if (v.p === p) n += v.town ? 2 : 1;
  if (g.temple[p]) n += 2;
  return n;
}

const countOf = (g, p, kind) =>
  kind === 'road' ? Object.values(g.roads).filter(x => x === p).length : Object.values(g.villages).filter(v => v.p === p && (kind === 'town' ? v.town : !v.town)).length;

export const handSize = (g, p) => RES.reduce((a, r) => a + g.res[p][r], 0);
export const canPay = (g, p, cost) => RES.every(r => g.res[p][r] >= (cost[r] ?? 0));
function pay(g, p, cost) {
  for (const r of RES) g.res[p][r] -= cost[r] ?? 0;
}

// ---- 置ける場所 ----

// 村: 空いていて、となりの角に村が無い。準備中でなければ自分の道につながっている
export function canPlaceVillage(g, p, v, { setup = false } = {}) {
  if (g.villages[v]) return false;
  if (neighbors(v).some(n => g.villages[n])) return false;
  if (setup) return true;
  return vertexEdges(v).some(e => g.roads[e] === p);
}

// 道: 空いていて、自分の村・城下町、または（相手の村で途切れない）自分の道につながっている
export function canPlaceRoad(g, p, e, { from = null } = {}) {
  if (g.roads[e] !== undefined) return false;
  const ends = edgeEnds(e);
  if (from) return ends.includes(from);
  return ends.some(v => {
    const town = g.villages[v];
    if (town) return town.p === p;
    return vertexEdges(v).some(x => x !== e && g.roads[x] === p);
  });
}

export function legalSpots(g, p, kind) {
  if (kind === 'village') return allVertices().filter(v => canPlaceVillage(g, p, v, { setup: g.phase === 'setup' }));
  if (kind === 'road') return allEdges().filter(e => canPlaceRoad(g, p, e, { from: g.phase === 'setup' ? g.setup.last : null }));
  if (kind === 'town') return Object.keys(g.villages).filter(v => g.villages[v].p === p && !g.villages[v].town);
  return [];
}

// ---- 進行 ----

function produce(g) {
  const card = g.card;
  const got = Object.fromEntries(g.players.map(p => [p, { wood: 0, stone: 0, rice: 0, salt: 0 }]));
  if (card.kind === 'typhoon') {
    // 台風: たくさん持っている人は、いちばん多い資源を2枚失う。市場の値段は元に戻る
    for (const p of g.players) {
      if (handSize(g, p) < TYPHOON_LIMIT) continue;
      for (let k = 0; k < 2; k++) {
        const r = RES.slice().sort((a, b) => g.res[p][b] - g.res[p][a])[0];
        if (g.res[p][r] > 0) {
          g.res[p][r] -= 1;
          got[p][r] -= 1;
        }
      }
      log(g, `🌀 ${nameOf(g, p)}: 台風で資源を2枚失った`);
    }
    for (const r of RES) g.prices[r] = PRICE_BASE;
    g.produced = got;
    return;
  }
  for (const [v, b] of Object.entries(g.villages)) {
    if (b.p !== g.turn.p) continue; // 季節の恵みを受けるのは手番の人だけ
    for (const tile of vertexTiles(g, v)) {
      if (!card.t.includes(tile.t)) continue;
      const r = TERRAIN[tile.t].res;
      const n = b.town ? 2 : 1;
      g.res[b.p][r] += n;
      got[b.p][r] += n;
    }
  }
  g.produced = got;
  const parts = g.players.filter(p => RES.some(r => got[p][r])).map(p => `${nameOf(g, p)} ${resText(got[p])}`);
  log(g, `🍃 ${card.t.map(t => TERRAIN[t].name).join('と')}の季節: ${parts.join(' / ') || '何も得られなかった'}`);
}

function drawCard(g, rng) {
  if (!g.deck.length) g.deck = makeDeck(rng);
  g.card = g.deck.shift();
  if (!g.deck.length) g.deck = makeDeck(rng); // 次の札がいつも見えるように
}

function startTurn(g, p, rng) {
  if (p === g.players[0]) {
    g.round += 1;
    // ラウンドのはじめに、市場の値段は1ずつ元（3）に近づく
    for (const r of RES) g.prices[r] += Math.sign(PRICE_BASE - g.prices[r]);
  }
  g.turn = { p };
  g.offer = null;
  drawCard(g, rng);
  log(g, `── ${nameOf(g, p)} の手番 ──`);
  produce(g);
}

function checkWin(g, p) {
  if (points(g, p) >= g.goal) {
    g.phase = 'over';
    g.winner = p;
    g.offer = null;
    log(g, `🏆 ${nameOf(g, p)} が${points(g, p)}点で島をひらいた！`);
  }
}

function setupPlace(g, p, action, rng) {
  const s = g.setup;
  if (s.order[s.idx] !== p) throw new GameError('あなたの番ではありません');
  if (s.step === 'village') {
    if (action.type !== 'village') throw new GameError('村を置いてください');
    if (!canPlaceVillage(g, p, action.at, { setup: true })) throw new GameError('そこには村を置けません（となりの角に村があります）');
    g.villages[action.at] = { p, town: false };
    // 2巡目の村は、接するマスの資源を1つずつもらえる
    if (s.idx >= g.players.length) {
      for (const tile of vertexTiles(g, action.at)) {
        const r = TERRAIN[tile.t].res;
        if (r) g.res[p][r] += 1;
      }
    }
    s.step = 'road';
    s.last = action.at;
    return;
  }
  if (action.type !== 'road') throw new GameError('いま置いた村につながる道を置いてください');
  if (!canPlaceRoad(g, p, action.at, { from: s.last })) throw new GameError('いま置いた村につながる辺を選んでください');
  g.roads[action.at] = p;
  s.idx += 1;
  s.step = 'village';
  s.last = null;
  if (s.idx >= s.order.length) {
    g.phase = 'play';
    g.setup = null;
    log(g, '🏝️ 準備完了。開拓を始めよう！');
    startTurn(g, g.players[0], rng);
  }
}

export function act(g, p, action, rng = Math.random) {
  if (!g.players.includes(p)) throw new GameError('観戦中は操作できません');
  if (g.phase === 'over') throw new GameError('ゲームは終わりました');
  if (g.phase === 'setup') return setupPlace(g, p, action ?? {}, rng);
  const type = action?.type;

  // 交換の申し出への返事（手番でない人も）
  if (type === 'accept' || type === 'decline') {
    const o = g.offer;
    if (!o || o.id !== action.id) throw new GameError('その申し出はもうありません');
    if (o.from === p) throw new GameError('自分の申し出には答えられません');
    if (type === 'decline') {
      if (!o.declined.includes(p)) o.declined.push(p);
      if (g.players.filter(x => x !== o.from).every(x => o.declined.includes(x))) {
        log(g, `🤝 ${nameOf(g, o.from)} の申し出は、全員に断られた`);
        g.offer = null;
      }
      return;
    }
    if (!canPay(g, p, o.get)) throw new GameError('求められている資源が足りません');
    if (!canPay(g, o.from, o.give)) throw new GameError('申し出た人の資源が足りなくなっています');
    pay(g, o.from, o.give);
    pay(g, p, o.get);
    for (const r of RES) {
      g.res[p][r] += o.give[r] ?? 0;
      g.res[o.from][r] += o.get[r] ?? 0;
    }
    log(g, `🤝 ${nameOf(g, o.from)} と ${nameOf(g, p)} が交換（${resText(o.give)} ⇄ ${resText(o.get)}）`);
    g.offer = null;
    return;
  }

  if (g.turn.p !== p) throw new GameError('あなたの手番ではありません');

  if (type === 'road' || type === 'village' || type === 'town') {
    if (!canPay(g, p, COSTS[type])) throw new GameError('資源が足りません');
    if (countOf(g, p, type) >= LIMITS[type]) throw new GameError(`${BUILD_INFO[type].name}はもう置けません（${LIMITS[type]}まで）`);
    if (type === 'road' && !canPlaceRoad(g, p, action.at)) throw new GameError('そこには道を置けません（自分の村か道につなげる）');
    if (type === 'village' && !canPlaceVillage(g, p, action.at)) throw new GameError('そこには村を置けません（自分の道の先で、となりの角に村が無いところ）');
    if (type === 'town' && !(g.villages[action.at]?.p === p && !g.villages[action.at].town)) throw new GameError('自分の村を選んでください');
    pay(g, p, COSTS[type]);
    if (type === 'road') g.roads[action.at] = p;
    if (type === 'village') g.villages[action.at] = { p, town: false };
    if (type === 'town') g.villages[action.at].town = true;
    log(g, `${BUILD_INFO[type].icon} ${nameOf(g, p)}: ${BUILD_INFO[type].name}を建てた`);
    return checkWin(g, p);
  }

  if (type === 'temple') {
    if (g.temple[p]) throw new GameError('寺社は1人1つまでです');
    if (!countOf(g, p, 'town')) throw new GameError('寺社は、城下町を1つ以上持っていると建てられます');
    if (!canPay(g, p, COSTS.temple)) throw new GameError('資源が足りません');
    pay(g, p, COSTS.temple);
    g.temple[p] = true;
    log(g, `⛩️ ${nameOf(g, p)}: 寺社を建てた（2点）`);
    return checkWin(g, p);
  }

  // 市場: 欲しい資源の値段の枚数だけ、別の1種類の資源を払う。買った資源は値上がり、払った資源は値下がり
  if (type === 'market') {
    const { give, get } = action;
    if (!RES.includes(give) || !RES.includes(get) || give === get) throw new GameError('払う資源と欲しい資源を選んでください');
    const price = g.prices[get];
    if (g.res[p][give] < price) throw new GameError(`${RES_INFO[give].name}が${price}枚必要です`);
    g.res[p][give] -= price;
    g.res[p][get] += 1;
    g.prices[get] = Math.min(PRICE_MAX, g.prices[get] + 1);
    g.prices[give] = Math.max(PRICE_MIN, g.prices[give] - 1);
    log(g, `🏪 ${nameOf(g, p)}: 市場で${RES_INFO[give].icon}${price} → ${RES_INFO[get].icon}1`);
    return;
  }

  if (type === 'offer') {
    const give = cleanBag(action.give);
    const get = cleanBag(action.get);
    if (!RES.some(r => give[r]) || !RES.some(r => get[r])) throw new GameError('出す資源と欲しい資源を選んでください');
    if (RES.some(r => give[r] && get[r])) throw new GameError('同じ資源を出して受け取ることはできません');
    if (!canPay(g, p, give)) throw new GameError('出す資源が足りません');
    g.offerSeq += 1;
    g.offer = { id: g.offerSeq, from: p, give, get, declined: [] };
    g.turn.offered = true;
    log(g, `🤝 ${nameOf(g, p)}: 交換の申し出（${resText(give)} を出すので ${resText(get)} がほしい）`);
    return;
  }
  if (type === 'cancel') {
    if (g.offer?.from !== p) throw new GameError('取り消す申し出がありません');
    g.offer = null;
    return;
  }

  if (type === 'end') {
    const next = g.players[(g.players.indexOf(p) + 1) % g.players.length];
    return startTurn(g, next, rng);
  }
  throw new GameError('不明な操作です');
}

function cleanBag(bag) {
  const out = {};
  for (const r of RES) {
    const n = Number(bag?.[r] ?? 0);
    if (!Number.isInteger(n) || n < 0 || n > 20) throw new GameError('資源の数が正しくありません');
    if (n) out[r] = n;
  }
  return out;
}

export function view(g, p) {
  const seated = g.players.includes(p);
  return {
    phase: g.phase,
    me: seated ? p : null,
    goal: g.goal,
    tiles: g.tiles,
    villages: g.villages,
    roads: g.roads,
    prices: g.prices,
    card: g.card,
    next: g.deck[0] ?? null,
    deckLeft: g.deck.length,
    produced: g.produced,
    setup: g.setup,
    turn: g.turn,
    round: g.round,
    offer: g.offer,
    winner: g.winner,
    myRes: seated ? g.res[p] : null,
    log: g.log.slice(-14),
    players: g.players.map(x => ({
      id: x,
      name: g.names[x],
      bot: g.bots.includes(x),
      points: points(g, x),
      cards: handSize(g, x), // 資源の中身は本人にしか見せない（枚数だけ）
      roads: countOf(g, x, 'road'),
      villages: countOf(g, x, 'village'),
      towns: countOf(g, x, 'town'),
      temple: g.temple[x],
    })),
  };
}

// ---- CPU ----

// 交点の良さ: 接する地形の数と種類（荒地は0）
function spotValue(g, v, p) {
  const ts = vertexTiles(g, v).filter(t => TERRAIN[t.t].res);
  const kinds = new Set(ts.map(t => t.t));
  // 自分がまだ持っていない地形に接するほど良い
  const mine = new Set();
  for (const [k, b] of Object.entries(g.villages)) if (b.p === p) for (const t of vertexTiles(g, k)) mine.add(t.t);
  return ts.length + kinds.size * 0.6 + [...kinds].filter(t => !mine.has(t)).length * 0.5;
}

// 自分の道や村から、まだ置ける交点までの最短の道のり（最初の1本を返す）
function roadTowardBest(g, p) {
  const starts = new Set();
  for (const [v, b] of Object.entries(g.villages)) if (b.p === p) starts.add(v);
  for (const [e, x] of Object.entries(g.roads)) if (x === p) for (const v of edgeEnds(e)) if (!g.villages[v] || g.villages[v].p === p) starts.add(v);
  const prev = {};
  const dist = {};
  const queue = [...starts];
  for (const v of queue) dist[v] = 0;
  let best = null;
  while (queue.length) {
    const v = queue.shift();
    if (dist[v] > 4) break;
    if (dist[v] > 0 && canPlaceVillage(g, p, v, { setup: true })) {
      const score = spotValue(g, v, p) - dist[v] * 0.8;
      if (!best || score > best.score) best = { v, score };
    }
    if (g.villages[v] && g.villages[v].p !== p) continue;
    for (const e of vertexEdges(v)) {
      if (g.roads[e] !== undefined) continue;
      const n = edgeEnds(e).find(x => x !== v);
      if (dist[n] !== undefined) continue;
      dist[n] = dist[v] + 1;
      prev[n] = { v, e };
      queue.push(n);
    }
  }
  if (!best) return null;
  let v = best.v;
  while (prev[v] && dist[prev[v].v] > 0) v = prev[v].v;
  return prev[v]?.e ?? null;
}

// いま目指す建物（建てる順の目安）
function goalOf(g, p) {
  const towns = countOf(g, p, 'town');
  const villages = countOf(g, p, 'village');
  if (towns && !g.temple[p]) return 'temple';
  if (villages && towns < LIMITS.town && (towns < 1 || villages === 0 || countOf(g, p, 'village') + towns >= 3)) return 'town';
  if (villages + towns < LIMITS.village && legalSpots(g, p, 'village').length) return 'village';
  if (villages + towns < LIMITS.village && countOf(g, p, 'road') < LIMITS.road) return 'road';
  return villages ? 'town' : 'temple';
}

function shortage(g, p, cost) {
  const need = {};
  for (const r of RES) if ((cost[r] ?? 0) > g.res[p][r]) need[r] = cost[r] - g.res[p][r];
  return need;
}

export function bot(g, p, rng = Math.random) {
  if (g.phase === 'over') return null;
  if (g.phase === 'setup') {
    const s = g.setup;
    if (s.order[s.idx] !== p) return null;
    if (s.step === 'village') {
      const spots = legalSpots(g, p, 'village').map(v => ({ v, s: spotValue(g, v, p) + rng() * 0.3 }));
      spots.sort((a, b) => b.s - a.s);
      return { type: 'village', at: spots[0].v };
    }
    const roads = legalSpots(g, p, 'road');
    // 良い交点に向かう辺を選ぶ
    const score = e => {
      const n = edgeEnds(e).find(v => v !== s.last);
      return neighbors(n).filter(v => canPlaceVillage(g, p, v, { setup: true })).reduce((a, v) => Math.max(a, spotValue(g, v, p)), 0) + rng() * 0.2;
    };
    return { type: 'road', at: roads.sort((a, b) => score(b) - score(a))[0] };
  }

  // 交換の申し出に答える
  const o = g.offer;
  if (o && o.from !== p && !o.declined.includes(p)) {
    const goal = goalOf(g, p);
    const need = shortage(g, p, COSTS[goal] ?? {});
    const gains = RES.some(r => o.give[r] && need[r]);
    const affordable = canPay(g, p, o.get);
    const spare = RES.every(r => !o.get[r] || g.res[p][r] - o.get[r] >= (COSTS[goal]?.[r] ?? 0));
    const fair = RES.reduce((a, r) => a + (o.give[r] ?? 0), 0) >= RES.reduce((a, r) => a + (o.get[r] ?? 0), 0);
    const leaderNear = points(g, o.from) >= g.goal - 2;
    return { type: gains && affordable && spare && fair && !leaderNear ? 'accept' : 'decline', id: o.id };
  }
  if (g.turn?.p !== p) return null;
  if (o && o.from === p) return null; // 自分の申し出への返事を待つ（全員が断れば自動で消える）

  // 建てられるものを建てる
  if (!g.temple[p] && countOf(g, p, 'town') && canPay(g, p, COSTS.temple)) return { type: 'temple' };
  if (canPay(g, p, COSTS.town) && countOf(g, p, 'town') < LIMITS.town) {
    const vs = legalSpots(g, p, 'town').sort((a, b) => spotValue(g, b, p) - spotValue(g, a, p));
    if (vs.length) return { type: 'town', at: vs[0] };
  }
  if (canPay(g, p, COSTS.village) && countOf(g, p, 'village') + countOf(g, p, 'town') < LIMITS.village) {
    const vs = legalSpots(g, p, 'village').sort((a, b) => spotValue(g, b, p) - spotValue(g, a, p));
    if (vs.length) return { type: 'village', at: vs[0] };
  }
  const goal = goalOf(g, p);
  if ((goal === 'road' || goal === 'village') && !legalSpots(g, p, 'village').length && canPay(g, p, COSTS.road) && countOf(g, p, 'road') < LIMITS.road) {
    const e = roadTowardBest(g, p);
    if (e) return { type: 'road', at: e };
  }

  // 市場: 目標に足りない資源を、余っている資源で1つだけ買う（買えば建てられるときだけ）
  const cost = COSTS[goal] ?? {};
  const need = shortage(g, p, cost);
  const needList = RES.filter(r => need[r]);
  if (needList.length === 1 && need[needList[0]] === 1) {
    const get = needList[0];
    const give = RES.filter(r => r !== get && g.res[p][r] - (cost[r] ?? 0) >= g.prices[get]).sort((a, b) => g.res[p][b] - g.res[p][a])[0];
    if (give) return { type: 'market', give, get };
  }
  // ほかの人に交換を持ちかける（1手番に1回）: 余っている資源2枚で、足りない資源1枚
  if (needList.length && !g.turn.offered) {
    const get = needList[0];
    const give = RES.filter(r => r !== get && g.res[p][r] - (cost[r] ?? 0) >= 2).sort((a, b) => g.res[p][b] - g.res[p][a])[0];
    if (give) return { type: 'offer', give: { [give]: 2 }, get: { [get]: 1 } };
  }
  return { type: 'end' };
}
