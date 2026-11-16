// みんなでそろえて（オリジナルの連想ゲーム）
//
// 採用ルール:
//   - お題（「赤い果物といえば？」など）が出る。全員がこっそり答えを書く。全員がそろったら一斉に公開
//   - 同じ答えを書いた人が2人以上いれば、その人たちはそれぞれ「同じ答えの人数」点。1人だけの答えは0点
//   - 表記のゆれ（ひらがな／カタカナ／全角半角／空白）は自動でまとめる。「林檎」と「りんご」のように自動でまとまらないものは、
//     公開中にだれでも「同じ答え」としてまとめられる（みんなで決める）
//   - 決まった数（標準8問）のお題を終えたら、合計点がいちばん多い人の勝ち
import { GameError, shuffle } from '../../js/util.js';
import { PROMPTS } from './prompts.js';

export const ROUND_COUNTS = [5, 8, 12];
export const MAX_LEN = 20;

export function normalizeOptions(o) {
  return { rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 8 };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

// 表記ゆれをそろえた「くらべる用」の文字列
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s、。・,.!?！？「」『』"'`~〜]/g, '');
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 3 || players.length > 8) throw new GameError('みんなでそろえては3〜8人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    order: shuffle(PROMPTS.map((_, i) => i), rng).slice(0, opts.rounds),
    round: 0,
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    history: [],
    log: [],
    seq: 0,
  };
  startRound(g);
  return g;
}

function startRound(g) {
  g.prompt = PROMPTS[g.order[g.round]][0];
  g.answers = {}; // pid -> 書いたままの答え
  g.alias = {}; // まとめた答え: 正規化した答え -> まとめ先
  g.phase = 'answer';
  log(g, `第${g.round + 1}問: ${g.prompt}`);
}

const root = (g, key) => {
  let k = key;
  for (let i = 0; i < 50 && g.alias[k]; i++) k = g.alias[k];
  return k;
};

// 公開中の答えのまとまり [{ key, label, members: [pid], points }]
export function groups(g) {
  const map = new Map();
  for (const p of g.players) {
    const a = g.answers[p];
    if (a === undefined) continue;
    const key = root(g, normalize(a));
    if (!map.has(key)) map.set(key, { key, label: a, members: [] });
    map.get(key).members.push(p);
  }
  const list = [...map.values()];
  for (const gr of list) gr.points = gr.members.length >= 2 ? gr.members.length : 0;
  return list.sort((a, b) => b.members.length - a.members.length);
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

  if (type === 'answer') {
    if (g.phase !== 'answer') throw new GameError('今は答えを書くときではありません');
    if (typeof action.text !== 'string') throw new GameError('答えを書いてください');
    const text = action.text.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!text || !normalize(text)) throw new GameError('答えを書いてください');
    if ([...text].length > MAX_LEN) throw new GameError(`答えは${MAX_LEN}文字までです`);
    g.answers[pid] = text;
    g.seq++;
    if (g.players.every(p => g.answers[p] !== undefined)) {
      g.phase = 'reveal';
      log(g, '全員の答えがそろいました。公開！');
    }
    return;
  }

  if (type === 'cancel') {
    if (g.phase !== 'answer' || g.answers[pid] === undefined) throw new GameError('取り消す答えがありません');
    delete g.answers[pid];
    g.seq++;
    return;
  }

  if (type === 'merge') {
    if (g.phase !== 'reveal') throw new GameError('答えをまとめられるのは公開中だけです');
    const keys = new Set(groups(g).map(gr => gr.key));
    const { a, b } = action;
    if (!keys.has(a) || !keys.has(b) || a === b) throw new GameError('まとめる答えを2つ選んでください');
    g.alias[b] = a;
    g.seq++;
    log(g, `${name(g, pid)} さんが答えをまとめました`);
    return;
  }

  if (type === 'split') {
    if (g.phase !== 'reveal') throw new GameError('今はできません');
    g.alias = {};
    g.seq++;
    log(g, `${name(g, pid)} さんがまとめを元に戻しました`);
    return;
  }

  if (type === 'next') {
    if (g.phase !== 'reveal') throw new GameError('まだ次のお題には進めません');
    const list = groups(g);
    for (const gr of list) for (const p of gr.members) g.scores[p] += gr.points;
    g.history.push({ prompt: g.prompt, groups: list.map(gr => ({ label: gr.label, members: gr.members, points: gr.points })) });
    const best = list.find(gr => gr.points > 0);
    log(g, best ? `いちばんそろったのは「${best.label}」（${best.members.length}人）` : 'だれもそろいませんでした');
    g.round++;
    g.seq++;
    if (g.round >= g.order.length) {
      g.phase = 'end';
      const top = Math.max(...g.players.map(p => g.scores[p]));
      g.winners = g.players.filter(p => g.scores[p] === top);
      log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top}点）`);
      return;
    }
    startRound(g);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const open = g.phase === 'reveal';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: Math.min(g.round + 1, g.order.length),
    totalRounds: g.order.length,
    prompt: g.phase === 'end' ? null : g.prompt,
    myAnswer: seated ? (g.answers?.[pid] ?? null) : null,
    // 答えは全員がそろうまで見せない
    groups: open ? groups(g) : null,
    history: g.history,
    winners: g.phase === 'end' ? g.winners : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      ready: g.phase === 'answer' ? g.answers[p] !== undefined : true,
      score: g.scores[p],
    })),
  };
}

// ---- CPU ----
// お題ごとの「よくありそうな答え」から、上のものほど選びやすく
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'answer' || g.answers[pid] !== undefined) return null;
  const list = PROMPTS[g.order[g.round]][1];
  const weights = list.map((_, i) => 1 / (i + 1.2) ** 1.3);
  let x = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    if ((x -= weights[i]) < 0) return { type: 'answer', text: list[i] };
  }
  return { type: 'answer', text: list[0] };
}
