// 4択クイズ大会（オリジナルのクイズゲーム。全員が同時に4択で答える）
//
// 採用ルール:
//   - 決まった数（標準10問）の4択問題を出す。全員が同時に答えを1つ選ぶ（選び直しはできない）
//   - 全員が答えたら正解を発表。正解した人は10点。さらに正解した中で早かった順に +3／+2／+1 点
//   - 早さは「ホストに届いた順」で決まる
//   - 全問終わったら合計点がいちばん多い人の勝ち
import { GameError, shuffle } from '../../js/util.js';
import { QUESTIONS } from './questions.js';

export const ROUND_COUNTS = [5, 10, 15];
export const BASE = 10;
export const SPEED = [3, 2, 1];
export const CPU_LEVELS = { weak: '物知りではない（正解率45%）', normal: 'ふつう（正解率65%）', strong: '物知り（正解率85%）' };
const CPU_RATE = { weak: 0.45, normal: 0.65, strong: 0.85 };

export function normalizeOptions(o) {
  return {
    rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 10,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'normal',
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 1 || players.length > 8) throw new GameError('4択クイズ大会は1〜8人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    order: shuffle(QUESTIONS.map((_, i) => i), rng).slice(0, opts.rounds),
    round: 0,
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    correctCount: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startQuestion(g, rng);
  return g;
}

function startQuestion(g, rng) {
  const [text, ...choices] = QUESTIONS[g.order[g.round]];
  const shuffled = shuffle(choices.map((c, i) => ({ c, ok: i === 0 })), rng);
  g.question = text;
  g.choices = shuffled.map(x => x.c);
  g.answer = shuffled.findIndex(x => x.ok);
  g.answers = {}; // pid -> 選んだ番号
  g.answerOrder = [];
  g.phase = 'answer';
  g.result = null;
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
    if (g.phase !== 'reveal') throw new GameError('まだ次の問題には進めません');
    g.round++;
    startQuestion(g, rng);
    g.seq++;
    return;
  }

  if (type !== 'answer') throw new GameError('不明な操作です');
  if (g.phase !== 'answer') throw new GameError('今は答えるときではありません');
  if (g.answers[pid] !== undefined) throw new GameError('もう答えました');
  const i = action.choice;
  if (!Number.isInteger(i) || i < 0 || i >= g.choices.length) throw new GameError('その答えはありません');
  g.answers[pid] = i;
  g.answerOrder.push(pid);
  g.seq++;
  if (g.players.every(p => g.answers[p] !== undefined)) reveal(g);
}

function reveal(g) {
  const right = g.answerOrder.filter(p => g.answers[p] === g.answer);
  const gains = {};
  for (const p of g.players) gains[p] = 0;
  right.forEach((p, i) => {
    gains[p] = BASE + (SPEED[i] ?? 0);
    g.scores[p] += gains[p];
    g.correctCount[p]++;
  });
  g.result = { right, gains };
  log(g, `第${g.round + 1}問「${g.question}」正解は ${g.choices[g.answer]}。正解: ${right.length ? right.map(p => name(g, p)).join('・') : 'なし'}`);
  g.phase = g.round + 1 >= g.order.length ? 'end' : 'reveal';
  if (g.phase === 'end') {
    const top = Math.max(...g.players.map(p => g.scores[p]));
    g.winners = g.players.filter(p => g.scores[p] === top);
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの優勝！（${top}点）`);
  }
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const open = g.phase !== 'answer';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: g.round + 1,
    totalRounds: g.order.length,
    question: g.question,
    choices: g.choices,
    // 正解とほかの人の答えは、全員が答えるまで送らない
    answer: open ? g.answer : null,
    myAnswer: seated ? (g.answers[pid] ?? null) : null,
    answers: open ? g.answers : null,
    result: g.result,
    winners: g.phase === 'end' ? g.winners : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      answered: g.answers[p] !== undefined,
      score: g.scores[p],
      correct: g.correctCount[p],
    })),
  };
}

// ---- CPU ----
// 強さに応じた確率で正解する（まちがえるときは、ほかの選択肢からランダム）
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'answer' || g.answers[pid] !== undefined) return null;
  if (rng() < CPU_RATE[g.options.cpu]) return { type: 'answer', choice: g.answer };
  const wrong = g.choices.map((_, i) => i).filter(i => i !== g.answer);
  return { type: 'answer', choice: wrong[Math.floor(rng() * wrong.length)] };
}
