// ならべてビンゴ（紙とえんぴつでよく遊ばれる「数字を自分で並べるビンゴ」）
//
// 採用ルール:
//   - 各自 5×5 のマスに 1〜25 を1つずつ並べる（最初はばらばらに入っていて、2マスを選んで入れ替えられる）。並べ方はほかの人には見えない
//   - 全員が「準備OK」したら、順番に 1〜25 のまだ呼ばれていない数を1つ呼ぶ。呼ばれた数は全員のマスで開く
//   - 縦・横・斜めの12本のうち、5マスすべて開いた列が「ビンゴ」。決めた本数（標準3本）に最初に届いた人の勝ち
//   - 同じ数で何人も同時に届いたら全員の勝ち。ビンゴの本数と「あと1マスの列があるか（リーチ）」は全員に見える
import { GameError, shuffle } from '../../js/util.js';

export const TARGETS = [1, 3, 5];
export const SIZE = 5;
export const N = SIZE * SIZE;

export function normalizeOptions(o) {
  return { target: TARGETS.includes(Number(o?.target)) ? Number(o.target) : 3 };
}

// 12本の列（マスの番号 0〜24）
export const LINES = (() => {
  const L = [];
  for (let r = 0; r < SIZE; r++) L.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
  for (let c = 0; c < SIZE; c++) L.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
  L.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + i));
  L.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)));
  return L;
})();

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
const numbers = () => Array.from({ length: N }, (_, i) => i + 1);

// 列ごとの開いたマスの数
export function lineCounts(grid, called) {
  const set = new Set(called);
  return LINES.map(line => line.filter(i => set.has(grid[i])).length);
}
export const bingoCount = (grid, called) => lineCounts(grid, called).filter(n => n === SIZE).length;
export const isReach = (grid, called) => lineCounts(grid, called).some(n => n === SIZE - 1);

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 1 || players.length > 8) throw new GameError('ならべてビンゴは1〜8人で遊びます');
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: normalizeOptions(options),
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    games: 0,
    first: Math.floor(rng() * ids.length),
    log: [],
    seq: 0,
  };
  startGame(g, rng);
  return g;
}

function startGame(g, rng) {
  g.games++;
  g.grids = Object.fromEntries(g.players.map(p => [p, shuffle(numbers(), rng)]));
  g.ready = Object.fromEntries(g.players.map(p => [p, false]));
  g.called = [];
  g.phase = 'arrange';
  g.winners = null;
  g.first = (g.first + 1) % g.players.length;
  g.turn = null;
  log(g, `第${g.games}局。マスに 1〜25 を好きなように並べて「準備OK」を押そう`);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    startGame(g, rng);
    g.seq++;
    return;
  }

  if (g.phase === 'arrange') {
    if (type !== 'swap' && type !== 'shuffle' && type !== 'ready' && type !== 'unready') throw new GameError('今は数字を並べるときです');
    if (type === 'unready') {
      g.ready[pid] = false;
      g.seq++;
      return;
    }
    if (g.ready[pid]) throw new GameError('もう準備OKです（並べ直すときは「並べ直す」を押してください）');
    if (type === 'swap') {
      const { a, b } = action;
      if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < N) || a === b) throw new GameError('入れ替える2マスを選んでください');
      const grid = g.grids[pid];
      [grid[a], grid[b]] = [grid[b], grid[a]];
    } else if (type === 'shuffle') {
      g.grids[pid] = shuffle(g.grids[pid], rng);
    } else {
      g.ready[pid] = true;
      log(g, `${name(g, pid)}: 準備OK`);
      if (g.players.every(p => g.ready[p])) {
        g.phase = 'call';
        g.turn = g.players[g.first];
        log(g, `全員そろいました。${name(g, g.turn)} さんから数を呼びます`);
      }
    }
    g.seq++;
    return;
  }

  if (g.phase !== 'call') throw new GameError('今は操作できません');
  if (type !== 'call') throw new GameError('不明な操作です');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const n = action.n;
  if (!Number.isInteger(n) || n < 1 || n > N) throw new GameError('1〜25 の数を選んでください');
  if (g.called.includes(n)) throw new GameError('その数はもう呼ばれています');
  g.called.push(n);
  g.last = { by: pid, n };
  log(g, `${name(g, pid)}: 「${n}」`);
  g.seq++;
  const done = g.players.filter(p => bingoCount(g.grids[p], g.called) >= g.options.target);
  if (done.length) {
    g.winners = done;
    for (const p of done) g.wins[p]++;
    g.phase = 'end';
    g.turn = null;
    log(g, `🎉 ビンゴ！ ${done.map(p => name(g, p)).join('・')} さんの勝ち（${g.called.length}回目）`);
    return;
  }
  g.turn = g.players[(g.players.indexOf(pid) + 1) % g.players.length];
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const end = g.phase === 'end';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    target: g.options.target,
    grid: seated ? g.grids[pid] : null,
    called: g.called,
    turn: g.turn,
    last: g.last ?? null,
    winners: g.winners,
    grids: end ? g.grids : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p, name: g.names[p], bot: g.bots.includes(p), wins: g.wins[p], ready: g.ready[p],
      bingo: bingoCount(g.grids[p], g.called), reach: g.phase !== 'arrange' && isReach(g.grids[p], g.called),
    })),
  };
}

// ---- CPU ----
// 並べ方はばらばらのまま。呼ぶ数は、自分の列がいちばん進むもの（開いたマスが多い列ほど重く数える）
export function bot(g, pid, rng = Math.random) {
  if (g.phase === 'arrange') return g.ready[pid] ? null : { type: 'ready' };
  if (g.phase !== 'call' || g.turn !== pid) return null;
  const grid = g.grids[pid];
  const counts = lineCounts(grid, g.called);
  let best = [], top = -1;
  for (let i = 0; i < N; i++) {
    if (g.called.includes(grid[i])) continue;
    let s = 0;
    LINES.forEach((line, li) => { if (line.includes(i)) s += (counts[li] + 1) ** 2; });
    if (s > top) { top = s; best = [grid[i]]; } else if (s === top) best.push(grid[i]);
  }
  return { type: 'call', n: best[Math.floor(rng() * best.length)] };
}
