// ドミノ（昔からあるタイル遊び「ドロー」）
//
// 採用ルール:
//   - 0〜6の目の組み合わせ28枚（ダブルシックス）。2人は7枚、3〜4人は5枚ずつ取り、残りは山
//   - いちばん大きいダブル（なければ目の合計が大きいタイル）を持っている人が、それを置いて始める
//   - 手番では、列の左はしか右はしの目と同じ目をもつタイルを1枚つなげる
//   - つなげられないときは山から1枚引く（つなげられるまで引く）。山がなければパス
//   - 手のタイルをなくした人がそのラウンドの勝ち。ほかの人の残りの目の合計が勝った人の点になる
//   - 全員がつなげられず山もないとき（ブロック）は、残りの目の合計がいちばん少ない人の勝ち（ほかの人との差が点）
//   - 決まったラウンド数（標準3）の合計点で勝負
import { GameError, shuffle } from '../../js/util.js';

export const ROUND_COUNTS = [1, 3, 5];

export function normalizeOptions(o) {
  return { rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 3 };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function makeSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push({ id: `${a}-${b}`, a, b });
  return tiles;
}
export const pips = t => t.a + t.b;
export const tileLabel = t => `[${t.a}|${t.b}]`;
const handPips = hand => hand.reduce((s, t) => s + pips(t), 0);

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 4) throw new GameError('ドミノは2〜4人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    round: 0,
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startRound(g, rng);
  return g;
}

function startRound(g, rng) {
  g.round++;
  const set = shuffle(makeSet(), rng);
  const n = g.players.length === 2 ? 7 : 5;
  g.hands = Object.fromEntries(g.players.map(p => [p, set.splice(0, n)]));
  g.stock = set;
  g.line = []; // [{ a, b, id }] 左から右へ（a が左側の目）
  g.passes = 0;
  g.phase = 'play';
  g.result = null;
  // 最初に置く人とタイル
  let best = null;
  for (const p of g.players) for (const t of g.hands[p]) {
    const key = (t.a === t.b ? 100 : 0) + pips(t);
    if (!best || key > best.key) best = { p, t, key };
  }
  g.hands[best.p] = g.hands[best.p].filter(t => t !== best.t);
  g.line.push({ id: best.t.id, a: best.t.a, b: best.t.b });
  log(g, `第${g.round}ラウンド。${name(g, best.p)} さんが ${tileLabel(best.t)} を置いて始めました`);
  g.turn = g.players[(g.players.indexOf(best.p) + 1) % g.players.length];
  g.last = { by: best.p, id: best.t.id };
}

export const ends = g => [g.line[0].a, g.line[g.line.length - 1].b];

// タイルを置ける場所（'L' / 'R'）
export function placesFor(g, t) {
  const [l, r] = ends(g);
  const out = [];
  if (t.a === l || t.b === l) out.push('L');
  if (t.a === r || t.b === r) out.push('R');
  return out;
}

const canPlayAny = (g, p) => g.hands[p].some(t => placesFor(g, t).length);

function nextTurn(g) {
  g.turn = g.players[(g.players.indexOf(g.turn) + 1) % g.players.length];
}

function endRound(g, winner, blocked) {
  const others = g.players.filter(p => p !== winner);
  let pts = others.reduce((s, p) => s + handPips(g.hands[p]), 0);
  if (blocked) pts = Math.max(0, pts - handPips(g.hands[winner]) * others.length);
  g.scores[winner] += pts;
  g.result = { winner, blocked, pts, left: Object.fromEntries(g.players.map(p => [p, g.hands[p]])) };
  log(g, blocked
    ? `🚧 だれもつなげません（ブロック）。目の合計がいちばん少ない ${name(g, winner)} さんの勝ち（+${pts}点）`
    : `🎉 ${name(g, winner)} さんがタイルを出しきりました（+${pts}点）`);
  g.turn = null;
  g.phase = g.round >= g.options.rounds ? 'end' : 'result';
  if (g.phase === 'end') {
    const top = Math.max(...g.players.map(p => g.scores[p]));
    g.winners = g.players.filter(p => g.scores[p] === top);
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top}点）`);
  }
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    const next = setup(g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p) })), rng, g.options);
    for (const k of Object.keys(g)) delete g[k];
    Object.assign(g, next);
    return;
  }

  if (type === 'next') {
    if (g.phase !== 'result') throw new GameError('まだ次のラウンドには進めません');
    startRound(g, rng);
    g.seq++;
    return;
  }

  if (g.phase !== 'play') throw new GameError('今はタイルを置くときではありません');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');

  if (type === 'play') {
    const t = g.hands[pid].find(x => x.id === action.tile);
    if (!t) throw new GameError('手にないタイルです');
    const places = placesFor(g, t);
    if (!places.length) throw new GameError('そのタイルはどちらのはしにもつながりません');
    const [l0, r0] = ends(g);
    // 置ける場所が1つ、または両はしの目が同じ（どちらに置いても同じ）なら選ばなくてよい
    const side = places.length === 1 ? places[0] : l0 === r0 ? (action.side === 'L' ? 'L' : 'R') : action.side;
    if (!places.includes(side)) throw new GameError('左はしか右はしを選んでください');
    const [l, r] = ends(g);
    if (side === 'L') g.line.unshift(t.b === l ? { id: t.id, a: t.a, b: t.b } : { id: t.id, a: t.b, b: t.a });
    else g.line.push(t.a === r ? { id: t.id, a: t.a, b: t.b } : { id: t.id, a: t.b, b: t.a });
    g.hands[pid] = g.hands[pid].filter(x => x !== t);
    g.passes = 0;
    g.last = { by: pid, id: t.id };
    g.seq++;
    if (g.hands[pid].length === 0) return endRound(g, pid, false);
    nextTurn(g);
    return;
  }

  if (type === 'draw') {
    if (canPlayAny(g, pid)) throw new GameError('つなげられるタイルがあるときは引けません');
    if (!g.stock.length) throw new GameError('山がありません。パスしてください');
    g.hands[pid].push(g.stock.pop());
    g.seq++;
    return;
  }

  if (type === 'pass') {
    if (canPlayAny(g, pid)) throw new GameError('つなげられるタイルがあります');
    if (g.stock.length) throw new GameError('先に山から引いてください');
    g.passes++;
    g.seq++;
    log(g, `${name(g, pid)}: パス`);
    if (g.passes >= g.players.length) {
      const low = Math.min(...g.players.map(p => handPips(g.hands[p])));
      const winner = g.players.find(p => handPips(g.hands[p]) === low);
      return endRound(g, winner, true);
    }
    nextTurn(g);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const open = g.phase !== 'play';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: g.round,
    totalRounds: g.options.rounds,
    line: g.line,
    ends: ends(g),
    stockCount: g.stock.length,
    hand: seated ? g.hands[pid] : [],
    turn: g.turn,
    last: g.last,
    result: open ? g.result : null,
    winners: g.phase === 'end' ? g.winners : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), count: g.hands[p].length, score: g.scores[p] })),
  };
}

// ---- CPU ----
// つなげられるなら目の大きいタイル（ダブル優先）を出す。なければ引く／パス
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const playable = g.hands[pid].filter(t => placesFor(g, t).length);
  if (!playable.length) return g.stock.length ? { type: 'draw' } : { type: 'pass' };
  playable.sort((x, y) => (y.a === y.b) - (x.a === x.b) || pips(y) - pips(x) || rng() - 0.5);
  const t = playable[0];
  const places = placesFor(g, t);
  return { type: 'play', tile: t.id, side: places[Math.floor(rng() * places.length)] };
}
