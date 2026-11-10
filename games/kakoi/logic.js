// かこいとり（紙と鉛筆で昔から遊ばれている「点と線」の陣取りが土台）
//
// 採用ルール:
//   - 点が格子に並んだ盤（箱が 3×3〜6×6）。手番では、となり合う2つの点を線で1本つなぐ
//   - 線を引いて箱の4辺がそろったら、その箱は自分のもの。そのときはもう1本引く（続けて取れる限り続く）
//   - 全部の線が引かれたら終わり。箱を多く取った人の勝ち
//
// 線の id: 横線 'h-行-列'（行 0..R, 列 0..C-1）、縦線 'v-行-列'（行 0..R-1, 列 0..C）
import { GameError } from '../../js/util.js';

export const SIZES = [3, 4, 5, 6];
export const CPU_LEVELS = { weak: '弱い（目先だけ）', strong: '強い（渡す箱を減らす）' };

export function normalizeOptions(o) {
  return {
    size: SIZES.includes(Number(o?.size)) ? Number(o.size) : 0, // 0 = 人数に合わせる
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'strong',
  };
}

export const defaultSize = n => (n <= 2 ? 4 : 5);

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function allLines(R, C) {
  const ids = [];
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) ids.push(`h-${r}-${c}`);
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) ids.push(`v-${r}-${c}`);
  return ids;
}

// 箱 (r, c) の4辺
export const boxSides = (r, c) => [`h-${r}-${c}`, `h-${r + 1}-${c}`, `v-${r}-${c}`, `v-${r}-${c + 1}`];

// 線に接する箱（1つか2つ）
export function boxesOf(id, R, C) {
  const [k, rs, cs] = id.split('-');
  const r = Number(rs);
  const c = Number(cs);
  const out = [];
  if (k === 'h') {
    if (r > 0) out.push([r - 1, c]);
    if (r < R) out.push([r, c]);
  } else {
    if (c > 0) out.push([r, c - 1]);
    if (c < C) out.push([r, c]);
  }
  return out;
}

export function isLine(id, R, C) {
  if (typeof id !== 'string') return false;
  const m = /^([hv])-(\d+)-(\d+)$/.exec(id);
  if (!m) return false;
  const r = Number(m[2]);
  const c = Number(m[3]);
  return m[1] === 'h' ? r <= R && c < C : r < R && c <= C;
}

const sidesDrawn = (lines, r, c) => boxSides(r, c).filter(s => lines[s] !== undefined).length;

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 4) throw new GameError('かこいとりは2〜4人で遊びます');
  const opts = normalizeOptions(options);
  const size = opts.size || defaultSize(players.length);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    R: size,
    C: size,
    first: 0,
    games: 1,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startGame(g);
  return g;
}

function startGame(g) {
  g.lines = {}; // id -> 引いた人の番号
  g.boxes = {}; // 'r-c' -> 取った人の番号
  g.turn = g.players[g.first];
  g.phase = 'play';
  g.last = null;
  g.winners = null;
  log(g, `第${g.games}局（${g.R}×${g.C}）。${name(g, g.turn)} さんから`);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    g.games++;
    g.first = (g.first + 1) % g.players.length;
    startGame(g);
    g.seq++;
    return;
  }

  if (type !== 'line') throw new GameError('不明な操作です');
  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const id = action.id;
  if (!isLine(id, g.R, g.C)) throw new GameError('その線は引けません');
  if (g.lines[id] !== undefined) throw new GameError('その線はもう引かれています');

  const me = g.players.indexOf(pid);
  g.lines[id] = me;
  const got = [];
  for (const [r, c] of boxesOf(id, g.R, g.C)) {
    if (sidesDrawn(g.lines, r, c) === 4) {
      g.boxes[`${r}-${c}`] = me;
      got.push(`${r}-${c}`);
    }
  }
  g.last = { id, by: me, got };
  g.seq++;
  if (got.length) log(g, `${name(g, pid)}: 箱を${got.length}つ取った！ もう1本`);

  if (Object.keys(g.lines).length === allLines(g.R, g.C).length) {
    g.phase = 'end';
    g.turn = null;
    const counts = g.players.map((_, i) => Object.values(g.boxes).filter(o => o === i).length);
    const top = Math.max(...counts);
    g.winners = g.players.filter((_, i) => counts[i] === top);
    for (const w of g.winners) g.wins[w]++;
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top}箱）`);
    return;
  }
  if (!got.length) g.turn = g.players[(me + 1) % g.players.length];
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    R: g.R,
    C: g.C,
    lines: g.lines,
    boxes: g.boxes,
    turn: g.turn,
    last: g.last,
    winners: g.winners,
    games: g.games,
    options: g.options,
    log: g.log.slice(-12),
    players: g.players.map((p, i) => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      index: i,
      boxes: Object.values(g.boxes).filter(o => o === i).length,
      wins: g.wins[p],
    })),
  };
}

// ---- CPU ----

const free = g => allLines(g.R, g.C).filter(id => g.lines[id] === undefined);

// その線を引くと、箱が何個取れるか
function completes(lines, id, R, C) {
  return boxesOf(id, R, C).filter(([r, c]) => sidesDrawn(lines, r, c) === 3).length;
}

// その線を引いても、3辺そろった箱（相手に取られる箱）を作らないか
function safe(lines, id, R, C) {
  return boxesOf(id, R, C).every(([r, c]) => sidesDrawn(lines, r, c) < 2);
}

// 線 id を引いたあと、相手が続けて取れる箱の数（貪欲に取り続けた場合）
function giveaway(g, id) {
  const lines = { ...g.lines, [id]: -1 };
  let count = 0;
  for (;;) {
    const take = Object.keys(lines).length < allLines(g.R, g.C).length
      ? free({ ...g, lines }).find(x => completes(lines, x, g.R, g.C) > 0)
      : null;
    if (!take) return count;
    count += completes(lines, take, g.R, g.C);
    lines[take] = -1;
  }
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const moves = free(g);
  const pickOne = arr => arr[Math.floor(rng() * arr.length)];
  // 弱い: ときどき適当に引く
  if (g.options.cpu === 'weak' && rng() < 0.3) return { type: 'line', id: pickOne(moves) };
  const scoring = moves.filter(id => completes(g.lines, id, g.R, g.C) > 0);
  if (scoring.length) return { type: 'line', id: pickOne(scoring) };
  const safeMoves = moves.filter(id => safe(g.lines, id, g.R, g.C));
  if (safeMoves.length) return { type: 'line', id: pickOne(safeMoves) };
  if (g.options.cpu === 'weak') return { type: 'line', id: pickOne(moves) };
  // 安全な線がなければ、渡す箱がいちばん少ない線を選ぶ
  let best = [];
  let bestN = Infinity;
  for (const id of moves) {
    const n = giveaway(g, id);
    if (n < bestN) {
      bestN = n;
      best = [id];
    } else if (n === bestN) best.push(id);
  }
  return { type: 'line', id: pickOne(best) };
}
