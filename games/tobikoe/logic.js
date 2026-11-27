// とびこえチェッカー（星形の盤で、自分のコマを全部向かいの陣地へ運ぶ昔からの遊び）
//
// 採用ルール:
//   - 121マスの星形の盤。6つの角（三角の陣地・10マス）のうち、人数に合わせた角に10個ずつコマを置く
//   - 手番では自分のコマを1つ動かす。となりの空いたマスへ1歩、または
//     となりのコマ（だれのでも）を1つとびこえて、その先の空いたマスへ。とびこえは続けて何回でもできる
//   - 向かいの角の陣地を自分のコマで全部うめた人の勝ち
//     （ほかの人のコマが居座っていても、陣地が全部うまっていて自分のコマが1つでも入っていれば勝ち）
//   - 1人あたり150手で決着がつかなければ、向かいの角までの近さで勝ちを決める
import { GameError } from '../../js/util.js';

export const R = 4; // 中央の六角形の半径
const MAX_TURNS = 150;

const key = (q, r) => `${q},${r}`;
export const parse = k => k.split(',').map(Number);
const sOf = (q, r) => -q - r;
const inner = v => v >= -R && v <= R;

// 盤のマス（軸座標 q, r）
export const CELLS = (() => {
  const out = [];
  for (let r = -2 * R; r <= 2 * R; r++) for (let q = -2 * R; q <= 2 * R; q++) {
    const s = sOf(q, r);
    if (Math.abs(s) > 2 * R) continue;
    if ([q, r, s].filter(inner).length >= 2) out.push(key(q, r));
  }
  return out;
})();
const CELL_SET = new Set(CELLS);
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

// 角（時計回り）。各角の陣地のマスと、いちばん奥（先端）のマス
const CORNER_TESTS = [
  (q, r) => r < -R, // 0: 上
  (q, r) => q > R, // 1: 右上
  (q, r) => sOf(q, r) < -R, // 2: 右下
  (q, r) => r > R, // 3: 下
  (q, r) => q < -R, // 4: 左下
  (q, r) => sOf(q, r) > R, // 5: 左上
];
export const CORNERS = CORNER_TESTS.map(t => CELLS.filter(k => t(...parse(k))));
export const TIPS = CORNERS.map(cs => cs.reduce((best, k) => {
  const d = cellDist(k, key(0, 0));
  return !best || d > best.d ? { k, d } : best;
}, null).k);
export const SEATS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
export const opposite = c => (c + 3) % 6;

export function cellDist(a, b) {
  const [q1, r1] = parse(a);
  const [q2, r2] = parse(b);
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(sOf(q1, r1) - sOf(q2, r2)));
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function setup(players, rng = Math.random) {
  if (players.length < 2 || players.length > 6) throw new GameError('とびこえチェッカーは2〜6人で遊びます');
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    games: 0,
    first: Math.floor(rng() * ids.length),
    log: [],
    seq: 0,
  };
  startGame(g);
  return g;
}

function startGame(g) {
  g.games++;
  const seats = SEATS[g.players.length];
  g.corner = Object.fromEntries(g.players.map((p, i) => [p, seats[i]]));
  g.board = {};
  for (const p of g.players) for (const k of CORNERS[g.corner[p]]) g.board[k] = p;
  g.first = (g.first + 1) % g.players.length;
  g.turn = g.players[g.first];
  g.moves = 0;
  g.phase = 'play';
  g.winners = null;
  g.last = null;
  log(g, `第${g.games}局。${name(g, g.turn)} さんから`);
}

// コマ from から行けるマス（1歩、または連続とびこえ）
export function destinations(board, from) {
  const [q0, r0] = parse(from);
  const out = new Set();
  for (const [dq, dr] of DIRS) {
    const k = key(q0 + dq, r0 + dr);
    if (CELL_SET.has(k) && !board[k]) out.add(k);
  }
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length) {
    const [q, r] = parse(stack.pop());
    for (const [dq, dr] of DIRS) {
      const over = key(q + dq, r + dr);
      const land = key(q + 2 * dq, r + 2 * dr);
      if (!board[over] || !CELL_SET.has(land) || board[land] || seen.has(land)) continue;
      seen.add(land);
      out.add(land);
      stack.push(land);
    }
  }
  out.delete(from);
  return [...out];
}

const pieces = (g, p) => CELLS.filter(k => g.board[k] === p);
export const targetOf = (g, p) => opposite(g.corner[p]);

export function hasWon(g, p) {
  const t = CORNERS[targetOf(g, p)];
  return t.every(k => g.board[k]) && t.some(k => g.board[k] === p);
}

// 向かいの角の先端までの距離の合計（小さいほど進んでいる）
export const progress = (g, p) => pieces(g, p).reduce((s, k) => s + cellDist(k, TIPS[targetOf(g, p)]), 0);

const canMove = (g, p) => pieces(g, p).some(k => destinations(g.board, k).length);

function advance(g) {
  const n = g.players.length;
  let i = g.players.indexOf(g.turn);
  for (let t = 0; t < n; t++) {
    i = (i + 1) % n;
    if (canMove(g, g.players[i])) { g.turn = g.players[i]; return; }
  }
  finishByProgress(g, '動けるコマがなくなりました');
}

function finishByProgress(g, why) {
  const best = Math.min(...g.players.map(p => progress(g, p)));
  g.winners = g.players.filter(p => progress(g, p) === best);
  endGame(g, `${why}。向かいの角にいちばん近い ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち`);
}

function endGame(g, text) {
  for (const p of g.winners) g.wins[p]++;
  g.phase = 'end';
  g.turn = null;
  log(g, `🏆 ${text}`);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;
  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    startGame(g);
    g.seq++;
    return;
  }
  if (g.phase !== 'play') throw new GameError('今は動かせません');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  if (type !== 'move') throw new GameError('不明な操作です');
  const { from, to } = action;
  if (typeof from !== 'string' || typeof to !== 'string' || !CELL_SET.has(from) || !CELL_SET.has(to)) throw new GameError('マスを選んでください');
  if (g.board[from] !== pid) throw new GameError('自分のコマを選んでください');
  if (!destinations(g.board, from).includes(to)) throw new GameError('そこへは動かせません');
  delete g.board[from];
  g.board[to] = pid;
  g.last = { by: pid, from, to, jump: !DIRS.some(([dq, dr]) => { const [q, r] = parse(from); return key(q + dq, r + dr) === to; }) };
  g.moves++;
  g.seq++;
  if (hasWon(g, pid)) {
    g.winners = [pid];
    return endGame(g, `${name(g, pid)} さんが全部のコマを運びきりました！`);
  }
  if (g.moves >= MAX_TURNS * g.players.length) return finishByProgress(g, `${MAX_TURNS}手ずつ指しても決まりませんでした`);
  advance(g);
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    board: g.board,
    turn: g.turn,
    last: g.last,
    moves: g.moves,
    maxMoves: MAX_TURNS * g.players.length,
    winners: g.winners,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p, name: g.names[p], bot: g.bots.includes(p), wins: g.wins[p], corner: g.corner[p], target: targetOf(g, p),
      home: CORNERS[targetOf(g, p)].filter(k => g.board[k] === p).length,
    })),
  };
}

// ---- CPU ----
// 向かいの角の先端に近づく手を選ぶ（同じくらいなら後ろに残ったコマを優先）。
// 進めない手しかないときは、陣地のうまっていない奥のマスへ近づく手を選ぶ
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const tip = TIPS[targetOf(g, pid)];
  const target = new Set(CORNERS[targetOf(g, pid)]);
  // まだ自分のコマが入っていない陣地のマス
  const holes = [...target].filter(k => g.board[k] !== pid);
  const near = k => (holes.length ? Math.min(...holes.map(h => cellDist(k, h))) : 0);
  let best = [], top = -Infinity;
  for (const from of pieces(g, pid)) {
    const dFrom = cellDist(from, tip);
    const home = target.has(from);
    for (const to of destinations(g.board, from)) {
      const gain = dFrom - cellDist(to, tip);
      let score = gain * 10;
      if (home) score += target.has(to) ? -1 : -30; // 陣地の中では奥へ進むときだけ動く
      else score += dFrom * 0.5 + (near(from) - near(to)) * 3; // 取り残されたコマを空いた陣地へ
      score += rng() * 0.8;
      if (score > top) { top = score; best = [{ from, to }]; }
    }
  }
  return best.length ? { type: 'move', ...best[0] } : null;
}
