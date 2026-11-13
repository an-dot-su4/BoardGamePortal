// よくばりダイス（昔からある「振り続けるか、やめるか」のサイコロ遊びを、サイコロ2個で遊ぶもの）
//
// 採用ルール:
//   - 手番ではサイコロを2個振る。出た目の合計をこの手番の「手持ち」に足す。何回でも振れる
//   - 「ためる」と、手持ちを自分の点に足して手番が終わる
//   - 片方が1: 手持ちが0になって手番が終わる
//   - 両方が1（ピンゾロ）: これまでためた点まで0になって手番が終わる
//   - 1以外のゾロ目: 合計が2倍になる
//   - だれかが目標点（標準100）に届いたら、その周の最後の人まで手番を回して終わり。点がいちばん多い人の勝ち
import { GameError } from '../../js/util.js';

export const GOALS = [50, 100, 150];

export function normalizeOptions(o) {
  return { goal: GOALS.includes(Number(o?.goal)) ? Number(o.goal) : 100 };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

const die = rng => 1 + Math.floor(rng() * 6);

// 2個の目から結果を決める
export function outcome(a, b) {
  if (a === 1 && b === 1) return { kind: 'pinzoro', gain: 0 };
  if (a === 1 || b === 1) return { kind: 'bust', gain: 0 };
  if (a === b) return { kind: 'double', gain: (a + b) * 2 };
  return { kind: 'ok', gain: a + b };
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 8) throw new GameError('よくばりダイスは2〜8人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    goal: opts.goal,
    first: 0,
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    games: 1,
    log: [],
    seq: 0,
  };
  startGame(g);
  return g;
}

function startGame(g) {
  for (const p of g.players) g.scores[p] = 0;
  g.turnIndex = g.first;
  g.turn = g.players[g.first];
  g.pot = 0; // 手持ち
  g.rolls = 0;
  g.last = null; // { dice:[a,b], kind, gain, by }
  g.lastRound = false; // だれかが目標に届いた
  g.endAt = null; // この人の手番が終わったら終了
  g.phase = 'play';
  g.winners = null;
  log(g, `第${g.games}局（目標${g.goal}点）。${name(g, g.turn)} さんから`);
}

function endTurn(g) {
  const p = g.turn;
  g.pot = 0;
  g.rolls = 0;
  if (!g.lastRound && g.scores[p] >= g.goal) {
    g.lastRound = true;
    // 先手の1つ前の人が最後
    g.endAt = g.players[(g.first + g.players.length - 1) % g.players.length];
    if (p !== g.endAt) log(g, `🏁 ${name(g, p)} さんが${g.goal}点に到達！ この周の終わりまで続けます`);
  }
  if (g.lastRound && p === g.endAt) {
    g.phase = 'end';
    g.turn = null;
    const top = Math.max(...g.players.map(q => g.scores[q]));
    g.winners = g.players.filter(q => g.scores[q] === top);
    for (const w of g.winners) g.wins[w]++;
    log(g, `🏆 ${g.winners.map(q => name(g, q)).join('・')} さんの勝ち！（${top}点）`);
    return;
  }
  g.turnIndex = (g.turnIndex + 1) % g.players.length;
  g.turn = g.players[g.turnIndex];
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

  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');

  if (type === 'roll') {
    const dice = [die(rng), die(rng)];
    const r = outcome(dice[0], dice[1]);
    g.rolls++;
    g.last = { dice, ...r, by: pid, pot: g.pot + r.gain };
    g.seq++;
    if (r.kind === 'pinzoro') {
      log(g, `💀 ${name(g, pid)}: ピンゾロ！ ためた${g.scores[pid]}点が0に`);
      g.scores[pid] = 0;
      endTurn(g);
    } else if (r.kind === 'bust') {
      log(g, `💥 ${name(g, pid)}: 1が出て手持ち${g.pot}点が消えた`);
      endTurn(g);
    } else g.pot += r.gain;
    return;
  }

  if (type === 'hold') {
    if (g.pot === 0) throw new GameError('1回は振ってからためます');
    g.scores[pid] += g.pot;
    log(g, `💰 ${name(g, pid)}: ${g.rolls}回振って ${g.pot}点をためた（計${g.scores[pid]}点）`);
    g.last = { ...g.last, held: true };
    g.seq++;
    endTurn(g);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    goal: g.goal,
    games: g.games,
    turn: g.turn,
    pot: g.pot,
    rolls: g.rolls,
    last: g.last,
    lastRound: g.lastRound,
    winners: g.winners,
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), score: g.scores[p], wins: g.wins[p] })),
  };
}

// ---- CPU ----
// 手持ちが目安に届いたらためる。目安は、負けているほど高く、勝っているほど低い
export function holdTarget(g, pid) {
  const me = g.scores[pid];
  const best = Math.max(...g.players.filter(p => p !== pid).map(p => g.scores[p]));
  let t = 20;
  if (best - me > 30) t = 28;
  if (me - best > 30) t = 15;
  // 最後の周で負けているなら、相手を超えるまで振る
  if (g.lastRound) {
    const top = Math.max(...g.players.map(p => g.scores[p]));
    if (me + g.pot <= top) return Infinity;
    return 0;
  }
  // ためれば目標に届くならためる
  if (me + g.pot >= g.goal) return 0;
  return t;
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  if (g.pot > 0 && g.pot >= holdTarget(g, pid) - Math.floor(rng() * 4)) return { type: 'hold' };
  return { type: 'roll' };
}
