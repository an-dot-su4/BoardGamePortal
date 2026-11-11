// 目利き市（オリジナルの競りゲーム。全員がこっそり値をつける「入れ札」）
//
// 採用ルール:
//   - 各自 25金から始める（所持金は全員に見える）
//   - 宝は4種類（🏺壺・📜掛軸・🍵茶碗・⚔️刀）× 数字1〜5 の20枚。よく混ぜて、決まった回数（標準12回）だけ競りにかける
//   - 毎回1枚めくり、全員がこっそり 0〜所持金 の値をつける（入れ札）。全員がつけたら一斉に公開
//   - いちばん高い値をつけた人が、その金額を払って宝を得る。同じ値なら、その回の「親」から近い順に優先。全員0なら流れる
//   - 親は毎回となりへ移る
//   - 終了時の得点: 宝の数字の合計 ＋ 種類ごとに「いちばん多く持っている人」に +5（同数なら全員）＋ 残りのお金3金につき1点
import { GameError, shuffle } from '../../js/util.js';

export const KINDS = ['tsubo', 'jiku', 'chawan', 'katana'];
export const KIND_ICON = { tsubo: '🏺', jiku: '📜', chawan: '🍵', katana: '⚔️' };
export const KIND_NAME = { tsubo: '壺', jiku: '掛軸', chawan: '茶碗', katana: '刀' };
export const START_MONEY = 25;
export const MAJORITY = 5;
export const MONEY_RATE = 3;
export const ROUND_COUNTS = [8, 12, 16];

export function normalizeOptions(o) {
  return { rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 12 };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function makeDeck() {
  const deck = [];
  for (const k of KINDS) for (let v = 1; v <= 5; v++) deck.push({ id: `${k}${v}`, k, v });
  return deck;
}

export const itemLabel = it => `${KIND_ICON[it.k]}${KIND_NAME[it.k]}${it.v}`;

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 3 || players.length > 6) throw new GameError('目利き市は3〜6人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    deck: shuffle(makeDeck(), rng).slice(0, opts.rounds),
    round: 0,
    parent: Math.floor(rng() * ids.length),
    money: Object.fromEntries(ids.map(p => [p, START_MONEY])),
    items: Object.fromEntries(ids.map(p => [p, []])),
    history: [],
    log: [],
    seq: 0,
  };
  startRound(g);
  return g;
}

function startRound(g) {
  g.current = g.deck[g.round];
  g.bids = {};
  g.phase = 'bid';
  g.result = null;
  log(g, `第${g.round + 1}回: ${itemLabel(g.current)}（親は ${name(g, g.players[g.parent])} さん）`);
}

// 親から近い順
const fromParent = g => g.players.map((_, i) => g.players[(g.parent + i) % g.players.length]);

function resolve(g) {
  const order = fromParent(g);
  const top = Math.max(...order.map(p => g.bids[p]));
  const winner = top > 0 ? order.find(p => g.bids[p] === top) : null;
  if (winner) {
    g.money[winner] -= top;
    g.items[winner].push(g.current);
    log(g, `${name(g, winner)} さんが ${top}金で落札`);
  } else log(g, 'だれも値をつけず、流れました');
  g.result = { item: g.current, bids: { ...g.bids }, winner, price: top };
  g.history.push({ item: g.current, winner, price: top });
  g.phase = g.round + 1 >= g.deck.length ? 'end' : 'reveal';
  if (g.phase === 'end') {
    const s = scores(g);
    const best = Math.max(...g.players.map(p => s[p].total));
    g.winners = g.players.filter(p => s[p].total === best);
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${best}点）`);
  }
}

// 得点の内訳 { items, majority, money, total }
export function scores(g) {
  const out = {};
  const count = (p, k) => g.items[p].filter(it => it.k === k).length;
  for (const p of g.players) out[p] = { items: g.items[p].reduce((a, it) => a + it.v, 0), majority: 0, majorityKinds: [], money: Math.floor(g.money[p] / MONEY_RATE) };
  for (const k of KINDS) {
    const top = Math.max(...g.players.map(p => count(p, k)));
    if (top === 0) continue;
    for (const p of g.players) if (count(p, k) === top) {
      out[p].majority += MAJORITY;
      out[p].majorityKinds.push(k);
    }
  }
  for (const p of g.players) out[p].total = out[p].items + out[p].majority + out[p].money;
  return out;
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
    if (g.phase !== 'reveal') throw new GameError('まだ次の競りには進めません');
    g.round++;
    g.parent = (g.parent + 1) % g.players.length;
    startRound(g);
    g.seq++;
    return;
  }

  if (type === 'bid') {
    if (g.phase !== 'bid') throw new GameError('今は値をつけるときではありません');
    const n = action.amount;
    if (!Number.isInteger(n) || n < 0) throw new GameError('0以上の整数で値をつけてください');
    if (n > g.money[pid]) throw new GameError(`所持金（${g.money[pid]}金）より高い値はつけられません`);
    g.bids[pid] = n;
    g.seq++;
    if (g.players.every(p => g.bids[p] !== undefined)) resolve(g);
    return;
  }

  if (type === 'cancel') {
    if (g.phase !== 'bid' || g.bids[pid] === undefined) throw new GameError('取り消す値がありません');
    delete g.bids[pid];
    g.seq++;
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const s = g.phase === 'end' ? scores(g) : null;
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: g.round + 1,
    totalRounds: g.deck.length,
    current: g.current,
    // 次に出る宝は見せない。残りの枚数だけ
    left: g.deck.length - g.round - 1,
    parent: g.players[g.parent],
    myBid: seated && g.phase === 'bid' ? (g.bids[pid] ?? null) : null,
    result: g.phase === 'bid' ? null : g.result,
    winners: g.phase === 'end' ? g.winners : null,
    history: g.history,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      money: g.money[p],
      items: g.items[p],
      ready: g.phase === 'bid' ? g.bids[p] !== undefined : true,
      score: s ? s[p] : null,
    })),
  };
}

// ---- CPU ----

// その宝を得たときに増えそうな点（数字＋多数派ボーナスに近づく分）
export function worth(g, pid, item) {
  const mine = g.items[pid].filter(it => it.k === item.k).length;
  const others = Math.max(0, ...g.players.filter(p => p !== pid).map(p => g.items[p].filter(it => it.k === item.k).length));
  let bonus = 0;
  if (mine + 1 > others) bonus = mine >= others ? 1.5 : 3.5; // 単独で1位になる・追いつく
  else if (mine + 1 === others) bonus = 2;
  return item.v + bonus;
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'bid' || g.bids[pid] !== undefined) return null;
  const left = g.deck.length - g.round;
  const money = g.money[pid];
  // 1点 ≈ 3金。残りの回数が少ないほどお金を使ってよい
  const value = worth(g, pid, g.current) * MONEY_RATE;
  const share = money / Math.max(1, left) * 2.2;
  let amount = Math.round(Math.min(value * (0.55 + rng() * 0.35), share + rng() * 3));
  amount = Math.max(0, Math.min(money, amount));
  return { type: 'bid', amount };
}
