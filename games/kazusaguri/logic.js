// かずさぐり（昔からある数当て「ヒット＆ブロー」を、全員同時に遊べるようにしたもの）
//
// 採用ルール:
//   - 各自こっそり、0〜9 の違う数字を3つ（ロビーで4つ）並べた「ひみつの数」を決める
//   - 自分のとなり（次の人）のひみつの数を当てる。2人なら互いに当て合う
//   - 毎回、全員が同時に予想を出す。全員そろったら公開し、それぞれに「ヒット（数字も場所も合う）」「ブロー（数字だけ合う）」の数を返す
//   - ヒットが桁数と同じ（全部当てた）人が出たら、その回で終わり。同じ回に当てた人は全員勝ち
import { GameError, shuffle } from '../../js/util.js';

export const LENGTHS = [3, 4];

export const CPU_LEVELS = { weak: '弱い（直近の2回だけ覚えている）', strong: '強い（全部の結果から絞り込む）' };

export function normalizeOptions(o) {
  return {
    length: LENGTHS.includes(Number(o?.length)) ? Number(o.length) : 3,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'weak',
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function validCode(code, n) {
  return typeof code === 'string' && code.length === n && /^\d+$/.test(code) && new Set(code).size === n;
}

export function judge(secret, guess) {
  let hit = 0;
  let blow = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) hit++;
    else if (secret.includes(guess[i])) blow++;
  }
  return { hit, blow };
}

export function randomCode(n, rng) {
  return shuffle('0123456789'.split(''), rng).slice(0, n).join('');
}

export const targetOf = (g, p) => g.players[(g.players.indexOf(p) + 1) % g.players.length];

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 6) throw new GameError('かずさぐりは2〜6人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    n: opts.length,
    secrets: {},
    guesses: {}, // その回の予想（公開前）
    history: Object.fromEntries(ids.map(p => [p, []])), // [{ guess, hit, blow }]
    round: 1,
    phase: 'secret',
    winners: null,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    games: 1,
    log: [],
    seq: 0,
  };
  log(g, `ひみつの数（${g.n}けた）を決めてください`);
  return g;
}

function resetGame(g) {
  g.secrets = {};
  g.guesses = {};
  g.history = Object.fromEntries(g.players.map(p => [p, []]));
  g.round = 1;
  g.phase = 'secret';
  g.winners = null;
  log(g, `第${g.games}局。ひみつの数（${g.n}けた）を決めてください`);
}

function reveal(g) {
  const solved = [];
  for (const p of g.players) {
    const guess = g.guesses[p];
    const r = judge(g.secrets[targetOf(g, p)], guess);
    g.history[p].push({ guess, ...r });
    if (r.hit === g.n) solved.push(p);
  }
  log(g, `第${g.round}回: ` + g.players.map(p => {
    const h = g.history[p].at(-1);
    return `${name(g, p)} ${h.guess}→${h.hit}H${h.blow}B`;
  }).join(' / '));
  g.guesses = {};
  if (solved.length) {
    g.phase = 'end';
    g.winners = solved;
    for (const p of solved) g.wins[p]++;
    log(g, `🎯 ${solved.map(p => name(g, p)).join('・')} さんが当てました！（${g.round}回目）`);
    return;
  }
  g.round++;
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    g.games++;
    resetGame(g);
    g.seq++;
    return;
  }

  if (type === 'secret') {
    if (g.phase !== 'secret') throw new GameError('もうひみつの数は決まっています');
    if (g.secrets[pid]) throw new GameError('ひみつの数は決めてあります');
    const code = action.random ? randomCode(g.n, rng) : action.code;
    if (!validCode(code, g.n)) throw new GameError(`違う数字を${g.n}つ選んでください`);
    g.secrets[pid] = code;
    g.seq++;
    if (g.players.every(p => g.secrets[p])) {
      g.phase = 'guess';
      log(g, '全員のひみつの数が決まりました。予想スタート！');
    }
    return;
  }

  if (type === 'guess') {
    if (g.phase !== 'guess') throw new GameError('今は予想するときではありません');
    if (g.guesses[pid]) throw new GameError('この回の予想は出してあります');
    if (!validCode(action.code, g.n)) throw new GameError(`違う数字を${g.n}つ選んでください`);
    g.guesses[pid] = action.code;
    g.seq++;
    if (g.players.every(p => g.guesses[p])) reveal(g);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const over = g.phase === 'end';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    n: g.n,
    round: g.round,
    games: g.games,
    mySecret: seated ? (g.secrets[pid] ?? null) : null,
    myTarget: seated ? targetOf(g, pid) : null,
    myGuess: seated ? (g.guesses[pid] ?? null) : null,
    history: g.history,
    winners: g.winners,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      target: targetOf(g, p),
      ready: g.phase === 'secret' ? !!g.secrets[p] : g.phase === 'guess' ? !!g.guesses[p] : true,
      wins: g.wins[p],
      // 終わったら全員のひみつの数を見せる
      secret: over ? g.secrets[p] : null,
    })),
  };
}

// ---- CPU ----

export function allCodes(n) {
  const out = [];
  const rec = (s) => {
    if (s.length === n) return out.push(s);
    for (let d = 0; d <= 9; d++) if (!s.includes(String(d))) rec(s + d);
  };
  rec('');
  return out;
}

// これまでの結果と矛盾しない候補
export function candidates(n, history) {
  return allCodes(n).filter(c => history.every(h => {
    const r = judge(c, h.guess);
    return r.hit === h.hit && r.blow === h.blow;
  }));
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase === 'secret') return g.secrets[pid] ? null : { type: 'secret', random: true };
  if (g.phase !== 'guess' || g.guesses[pid]) return null;
  // 弱い CPU は直近の2回の結果しか使わない
  const hist = g.options.cpu === 'strong' ? g.history[pid] : g.history[pid].slice(-2);
  const c = candidates(g.n, hist);
  return { type: 'guess', code: c[Math.floor(rng() * c.length)] };
}
