// うそつきダイス（昔からあるブラフのサイコロ遊びが土台）
//
// 採用ルール:
//   - 各自サイコロを5個（ロビーで3個にもできる）。毎ラウンド全員が振り、自分の目だけ見る
//   - 手番の人は「全員のサイコロの中に、〇の目が△個以上ある」と宣言する。次の人は宣言を上げるか「ダウト」
//   - 上げ方: 個数を増やす（目は自由）か、同じ個数で大きい目にする
//   - 1は星（どの目としても数える）。星ありのとき、1の宣言は個数が半分（切り上げ）でよく、1から戻るときは 2倍+1 個以上
//     最初の宣言で1は言えない
//   - ダウト: 全員のサイコロを公開。宣言どおりあれば、ダウトした人がサイコロを1個失う。なければ宣言した人が1個失う
//   - サイコロを失った人から次のラウンド（0個になったら脱落。その次の人から）。最後に残った1人の勝ち
import { GameError } from '../../js/util.js';

export const DICE_COUNTS = [3, 5];

export function normalizeOptions(o) {
  return {
    dice: DICE_COUNTS.includes(Number(o?.dice)) ? Number(o.dice) : 5,
    wild: o?.wild === false ? false : true,
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
const alive = g => g.players.filter(p => g.count[p] > 0);
export const totalDice = g => g.players.reduce((a, p) => a + g.count[p], 0);

function nextAlive(g, p) {
  const n = g.players.length;
  let i = g.players.indexOf(p);
  for (let k = 0; k < n; k++) {
    i = (i + 1) % n;
    if (g.count[g.players[i]] > 0) return g.players[i];
  }
  return null;
}

export const bidText = b => `${b.f === 1 ? '★' : b.f}の目が${b.q}個`;

// 宣言 next が prev より上か（prev が null なら最初の宣言）
export function isRaise(prev, next, wild) {
  if (!prev) return !(wild && next.f === 1);
  if (!wild) return next.q > prev.q || (next.q === prev.q && next.f > prev.f);
  const p1 = prev.f === 1;
  const n1 = next.f === 1;
  if (p1 && n1) return next.q > prev.q;
  if (!p1 && n1) return next.q >= Math.ceil(prev.q / 2);
  if (p1 && !n1) return next.q >= prev.q * 2 + 1;
  return next.q > prev.q || (next.q === prev.q && next.f > prev.f);
}

// その目の最小の上げ方（なければ null）
export function minRaise(prev, f, wild, total) {
  for (let q = 1; q <= total; q++) if (isRaise(prev, { q, f }, wild)) return { q, f };
  return null;
}

export function countFace(dice, f, wild) {
  return dice.filter(d => d === f || (wild && f !== 1 && d === 1)).length;
}

const roll = rng => 1 + Math.floor(rng() * 6);

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 8) throw new GameError('うそつきダイスは2〜8人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    count: Object.fromEntries(ids.map(p => [p, opts.dice])),
    round: 0,
    starter: ids[Math.floor(rng() * ids.length)],
    out: [], // 脱落した順
    log: [],
    seq: 0,
  };
  startRound(g, rng);
  return g;
}

function startRound(g, rng) {
  g.round++;
  g.dice = {};
  for (const p of g.players) g.dice[p] = Array.from({ length: g.count[p] }, () => roll(rng)).sort((a, b) => a - b);
  g.bids = []; // [{ pid, q, f }]
  g.turn = g.starter;
  g.phase = 'bid';
  g.result = null;
  log(g, `第${g.round}ラウンド。サイコロは全部で${totalDice(g)}個。${name(g, g.turn)} さんから`);
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
    if (g.phase !== 'reveal') throw new GameError('まだ次のラウンドには進めません');
    startRound(g, rng);
    g.seq++;
    return;
  }

  if (g.phase !== 'bid') throw new GameError('今は宣言のときではありません');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const prev = g.bids[g.bids.length - 1] ?? null;

  if (type === 'bid') {
    const { q, f } = action;
    if (!Number.isInteger(f) || f < 1 || f > 6) throw new GameError('目は1〜6で選んでください');
    if (!Number.isInteger(q) || q < 1 || q > totalDice(g)) throw new GameError(`個数は1〜${totalDice(g)}で選んでください`);
    if (!isRaise(prev, { q, f }, g.options.wild)) {
      throw new GameError(!prev ? '最初の宣言で★（1）は言えません' : `${bidText(prev)} より上の宣言にしてください`);
    }
    g.bids.push({ pid, q, f });
    log(g, `${name(g, pid)}: ${bidText({ q, f })}`);
    g.turn = nextAlive(g, pid);
    g.seq++;
    return;
  }

  if (type === 'doubt') {
    if (!prev) throw new GameError('まだ誰も宣言していません');
    const all = g.players.flatMap(p => g.dice[p]);
    const actual = countFace(all, prev.f, g.options.wild);
    const ok = actual >= prev.q;
    const loser = ok ? pid : prev.pid;
    g.count[loser]--;
    g.result = { bid: prev, doubter: pid, actual, ok, loser, shown: Object.fromEntries(g.players.map(p => [p, g.dice[p]])) };
    log(g, `${name(g, pid)}: ダウト！ ${bidText(prev)} → 実際は${actual}個。${name(g, loser)} さんがサイコロを1個失う`);
    if (g.count[loser] === 0) {
      g.out.push(loser);
      log(g, `💀 ${name(g, loser)} さんが脱落`);
    }
    g.turn = null;
    g.seq++;
    const left = alive(g);
    if (left.length <= 1) {
      g.phase = 'end';
      g.winner = left[0] ?? null;
      log(g, `🏆 ${name(g, g.winner)} さんの勝ち！`);
      return;
    }
    g.phase = 'reveal';
    g.starter = g.count[loser] > 0 ? loser : nextAlive(g, loser);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const open = g.phase !== 'bid';
  return {
    phase: g.phase,
    seq: g.seq,
    round: g.round,
    options: g.options,
    me: seated ? pid : null,
    myDice: seated && g.phase === 'bid' ? g.dice[pid] : [],
    total: totalDice(g),
    turn: g.turn,
    bids: g.bids,
    result: open ? g.result : null,
    winner: g.phase === 'end' ? g.winner : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      count: g.count[p],
      out: g.count[p] === 0,
      place: g.count[p] === 0 ? g.players.length - g.out.indexOf(p) : null,
    })),
  };
}

// ---- CPU ----

// n 個のうち k 個以上が当たる確率（当たりの確率 p）
function atLeast(n, k, p) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let sum = 0;
  let c = 1; // nCi
  for (let i = 0; i <= n; i++) {
    if (i >= k) sum += c * p ** i * (1 - p) ** (n - i);
    c = (c * (n - i)) / (i + 1);
  }
  return sum;
}

// 自分の目を知ったうえで、宣言が本当である確率
export function bidChance(g, pid, b) {
  const wild = g.options.wild;
  const mine = countFace(g.dice[pid], b.f, wild);
  const unknown = totalDice(g) - g.dice[pid].length;
  const p = wild && b.f !== 1 ? 1 / 3 : 1 / 6;
  return atLeast(unknown, b.q - mine, p);
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'bid' || g.turn !== pid) return null;
  const prev = g.bids[g.bids.length - 1] ?? null;
  const total = totalDice(g);
  const wild = g.options.wild;
  // 上げる候補: 各目の最小の上げ方と、その1個上
  const options = [];
  for (let f = 1; f <= 6; f++) {
    const m = minRaise(prev, f, wild, total);
    if (!m) continue;
    options.push(m);
    if (m.q + 1 <= total) options.push({ q: m.q + 1, f });
  }
  // 自分の目に多い目を少し好む（ブラフで見破られにくいよう、ほどほどにランダム）
  const scored = options.map(b => ({ b, s: bidChance(g, pid, b) + rng() * 0.12 + (b.q > (minRaise(prev, b.f, wild, total)?.q ?? 0) ? -0.05 : 0) }));
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (prev) {
    const truth = bidChance(g, pid, prev);
    if (!best || truth < 0.3 + rng() * 0.15 || best.s < truth - 0.25) return { type: 'doubt' };
  }
  if (!best) return { type: 'doubt' };
  return { type: 'bid', q: best.b.q, f: best.b.f };
}
