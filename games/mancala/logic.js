// マンカラ（世界中で遊ばれている種まきの盤ゲーム。ルールは「カラハ」と呼ばれる遊び方が土台）
//
// 盤: 0〜5 が先手の穴、6 が先手のゴール、7〜12 が後手の穴、13 が後手のゴール。反時計回りに種をまく
// 採用ルール:
//   - 各穴に種4個（ロビーで3〜6個）。自分の側の穴を1つ選び、種を全部取って反時計回りに1個ずつまく
//   - 自分のゴールにはまくが、相手のゴールは飛ばす
//   - 最後の1個が自分のゴールに入ったら、もう1回
//   - 最後の1個が自分の側の空の穴に入り、向かいの相手の穴に種があれば、両方まとめて自分のゴールへ（横取り）
//   - どちらかの側の穴が全部空になったら終わり。残った種はその側の人のゴールへ。ゴールの種が多い人の勝ち
import { GameError } from '../../js/util.js';

export const SEEDS = [3, 4, 5, 6];
export const CPU_LEVELS = { weak: '弱い（目先だけ）', strong: '強い（先を読む）' };
export const STORE = [6, 13];

export function normalizeOptions(o) {
  return {
    seeds: SEEDS.includes(Number(o?.seeds)) ? Number(o.seeds) : 4,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'strong',
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export const pitsOf = side => (side === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
export const opposite = i => 12 - i;

export function newBoard(seeds) {
  const b = Array(14).fill(seeds);
  b[6] = 0;
  b[13] = 0;
  return b;
}

// 盤 board で side が穴 pit をまいた結果（board は書き換える）
// 戻り値: { last, sown: [まいた穴], extra, capture }
export function sow(board, side, pit) {
  let n = board[pit];
  board[pit] = 0;
  let i = pit;
  const sown = [];
  const skip = STORE[1 - side];
  while (n > 0) {
    i = (i + 1) % 14;
    if (i === skip) continue;
    board[i]++;
    sown.push(i);
    n--;
  }
  const extra = i === STORE[side];
  let capture = 0;
  if (!extra && pitsOf(side).includes(i) && board[i] === 1 && board[opposite(i)] > 0) {
    capture = board[opposite(i)] + 1;
    board[STORE[side]] += capture;
    board[i] = 0;
    board[opposite(i)] = 0;
  }
  return { last: i, sown, extra, capture };
}

// どちらかの側が空なら、残りを片付けて true
export function sweepIfOver(board) {
  const empty = side => pitsOf(side).every(i => board[i] === 0);
  if (!empty(0) && !empty(1)) return false;
  for (const side of [0, 1]) {
    for (const i of pitsOf(side)) {
      board[STORE[side]] += board[i];
      board[i] = 0;
    }
  }
  return true;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length !== 2) throw new GameError('マンカラは2人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids, // [先手, 後手]
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    board: newBoard(opts.seeds),
    turn: ids[0],
    phase: 'play',
    last: null,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    games: 1,
    winner: null,
    log: [],
    seq: 0,
  };
  log(g, `${name(g, ids[0])} さんが先手です`);
  return g;
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    // 先手と後手を入れ替えてもう一度。勝った数は持ち越す
    g.players = [g.players[1], g.players[0]];
    g.board = newBoard(g.options.seeds);
    g.turn = g.players[0];
    g.phase = 'play';
    g.last = null;
    g.winner = null;
    g.games++;
    g.seq++;
    log(g, `第${g.games}局。${name(g, g.turn)} さんが先手です`);
    return;
  }

  if (type !== 'sow') throw new GameError('不明な操作です');
  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const side = g.players.indexOf(pid);
  const pit = action.pit;
  if (!Number.isInteger(pit) || !pitsOf(side).includes(pit)) throw new GameError('自分の側の穴を選んでください');
  if (g.board[pit] === 0) throw new GameError('空の穴は選べません');

  const count = g.board[pit];
  const r = sow(g.board, side, pit);
  g.last = { pid, pit, count, sown: r.sown, lastPit: r.last, extra: r.extra, capture: r.capture };
  g.seq++;
  log(g, `${name(g, pid)}: ${pitsOf(side).indexOf(pit) + 1}番の穴から${count}個${r.extra ? '→ ゴールにぴったり！もう1回' : ''}${r.capture ? ` → ${r.capture}個を横取り！` : ''}`);

  if (sweepIfOver(g.board)) {
    g.phase = 'end';
    const [a, b] = [g.board[6], g.board[13]];
    g.winner = a === b ? null : a > b ? g.players[0] : g.players[1];
    if (g.winner) g.wins[g.winner]++;
    log(g, g.winner ? `🏆 ${name(g, g.winner)} さんの勝ち！（${Math.max(a, b)}対${Math.min(a, b)}）` : `引き分け（${a}対${b}）`);
    g.turn = null;
    return;
  }
  if (!r.extra) g.turn = g.players[1 - side];
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    mySide: seated ? g.players.indexOf(pid) : null,
    board: g.board,
    turn: g.turn,
    last: g.last,
    winner: g.winner,
    games: g.games,
    options: g.options,
    log: g.log.slice(-12),
    players: g.players.map((p, side) => ({ id: p, name: g.names[p], bot: g.bots.includes(p), side, wins: g.wins[p] })),
  };
}

// ---- CPU ----

// side から見た盤の良さ
const score = (board, side) => board[STORE[side]] - board[STORE[1 - side]];

function legal(board, side) {
  return pitsOf(side).filter(i => board[i] > 0);
}

// アルファベータ法。side の手番で、me から見た評価値を返す
function search(board, side, me, depth, alpha, beta) {
  const moves = legal(board, side);
  if (depth === 0 || moves.length === 0) return score(board, me);
  const maximize = side === me;
  let best = maximize ? -Infinity : Infinity;
  for (const pit of moves) {
    const b = board.slice();
    const r = sow(b, side, pit);
    const over = sweepIfOver(b);
    const v = over ? score(b, me) * 10 : search(b, r.extra ? side : 1 - side, me, depth - 1, alpha, beta);
    if (maximize) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function bestMove(board, side, depth, rng = Math.random) {
  const moves = legal(board, side);
  let best = [];
  let bestV = -Infinity;
  for (const pit of moves) {
    const b = board.slice();
    const r = sow(b, side, pit);
    const over = sweepIfOver(b);
    const v = over ? score(b, side) * 10 : search(b, r.extra ? side : 1 - side, side, depth - 1, -Infinity, Infinity);
    if (v > bestV) {
      bestV = v;
      best = [pit];
    } else if (v === bestV) best.push(pit);
  }
  return best[Math.floor(rng() * best.length)];
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const side = g.players.indexOf(pid);
  // 弱い: 1手先だけ見る（たまに適当に打つ）。強い: 6手先まで読む
  if (g.options.cpu === 'weak') {
    if (rng() < 0.3) {
      const moves = legal(g.board, side);
      return { type: 'sow', pit: moves[Math.floor(rng() * moves.length)] };
    }
    return { type: 'sow', pit: bestMove(g.board, side, 1, rng) };
  }
  return { type: 'sow', pit: bestMove(g.board, side, 6, rng) };
}
