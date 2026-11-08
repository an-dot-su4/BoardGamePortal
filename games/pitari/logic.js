// ぴたりトリック（宣言して取るトリックテイキング。昔からあるトランプ遊びのルールが土台）
//
// 採用ルール:
//   - 52枚（ジョーカーなし）。強さは 2 < 3 < … < K < A
//   - ラウンドごとに配る枚数が1枚ずつ増える（短め: 1→最大、たっぷり: 1→最大→1）。最大は min(7, 51÷人数)
//   - 配ったあと山の一番上をめくり、そのマークが切り札
//   - 親の左隣から順に「何回取るか」を宣言する。親は最後。しばりありのとき、親は宣言の合計が配った枚数と同じになる数を言えない
//   - 親の左隣が最初に出す。出されたマーク（台札）があれば必ず出す。なければ何を出してもよい
//   - 切り札が出ていれば一番強い切り札、なければ台札で一番強いカードの人が取り、次を出す
//   - 得点: 取った回数1回につき1点。宣言ぴったりならさらに +10点
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'スペード', H: 'ハート', D: 'ダイヤ', C: 'クラブ' };
export const RANK_LABEL = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const BONUS = 10;

export const LENGTHS = { short: '短め（1枚→最大）', full: 'たっぷり（1枚→最大→1枚）' };

export function normalizeOptions(o) {
  return {
    length: o?.length in LENGTHS ? o.length : 'short',
    hook: o?.hook === false ? false : true,
  };
}

export function maxHand(n) {
  return Math.min(7, Math.floor(51 / n));
}

export function roundSizes(n, length) {
  const m = maxHand(n);
  const up = Array.from({ length: m }, (_, i) => i + 1);
  return length === 'full' ? [...up, ...up.slice(0, -1).reverse()] : up;
}

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push({ id: s + r, s, r });
  return deck;
}

export function cardLabel(c) {
  return SUIT_MARK[c.s] + RANK_LABEL[c.r];
}

export function sortHand(cards, trump = null) {
  const order = s => (s === trump ? -1 : SUITS.indexOf(s));
  return cards.slice().sort((a, b) => order(a.s) - order(b.s) || b.r - a.r);
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
const nextOf = (g, p) => g.players[(g.players.indexOf(p) + 1) % g.players.length];

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 8) throw new GameError('ぴたりトリックは2〜8人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    sizes: roundSizes(ids.length, opts.length),
    round: 0,
    dealer: ids[Math.floor(rng() * ids.length)],
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    history: [],
    log: [],
    seq: 0,
  };
  startRound(g, rng);
  return g;
}

function startRound(g, rng) {
  const size = g.sizes[g.round];
  if (g.round > 0) g.dealer = nextOf(g, g.dealer);
  const deck = shuffle(makeDeck(), rng);
  g.hands = {};
  for (const p of g.players) g.hands[p] = sortHand(deck.splice(0, size));
  g.trump = deck.shift();
  for (const p of g.players) g.hands[p] = sortHand(g.hands[p], g.trump.s);
  g.bids = Object.fromEntries(g.players.map(p => [p, null]));
  g.took = Object.fromEntries(g.players.map(p => [p, 0]));
  g.trick = [];
  g.lastTrick = null;
  g.phase = 'bid';
  g.turn = nextOf(g, g.dealer);
  g.ready = [];
  log(g, `第${g.round + 1}ラウンド（${size}枚）。親は ${name(g, g.dealer)} さん。切り札は ${SUIT_MARK[g.trump.s]}${SUIT_NAME[g.trump.s]}`);
}

// 親が言えない数（しばり）。言えない数がなければ null
export function forbiddenBid(g, pid) {
  if (!g.options.hook || pid !== g.dealer) return null;
  const others = g.players.filter(p => p !== pid).reduce((a, p) => a + (g.bids[p] ?? 0), 0);
  const x = g.sizes[g.round] - others;
  return x >= 0 ? x : null;
}

// 出せるカード（台札があれば同じマークだけ）
export function legalCards(g, pid) {
  const hand = g.hands[pid];
  if (!g.trick.length) return hand;
  const lead = g.trick[0].card.s;
  const follow = hand.filter(c => c.s === lead);
  return follow.length ? follow : hand;
}

// 場のカードの中で、今いちばん強いもの（その出し手）
export function trickWinner(trick, trump) {
  const lead = trick[0].card.s;
  let best = trick[0];
  for (const t of trick.slice(1)) {
    const b = best.card;
    const c = t.card;
    if (c.s === b.s ? c.r > b.r : c.s === trump) best = t;
  }
  return best.pid;
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
    if (g.phase !== 'roundEnd') throw new GameError('まだ次のラウンドには進めません');
    g.round++;
    startRound(g, rng);
    g.seq++;
    return;
  }

  if (type === 'bid') {
    if (g.phase !== 'bid') throw new GameError('今は宣言のときではありません');
    if (g.turn !== pid) throw new GameError('あなたの番ではありません');
    const n = action.n;
    const size = g.sizes[g.round];
    if (!Number.isInteger(n) || n < 0 || n > size) throw new GameError(`0〜${size}の数で宣言してください`);
    if (forbiddenBid(g, pid) === n) throw new GameError(`親は宣言の合計が${size}になる数（${n}）は言えません`);
    g.bids[pid] = n;
    log(g, `${name(g, pid)}: ${n}回取ると宣言`);
    g.seq++;
    if (pid === g.dealer) {
      g.phase = 'play';
      g.turn = nextOf(g, g.dealer);
      const total = g.players.reduce((a, p) => a + g.bids[p], 0);
      log(g, `宣言の合計 ${total}（${size}枚）。${name(g, g.turn)} さんから出します`);
    } else g.turn = nextOf(g, pid);
    return;
  }

  if (type === 'play') {
    if (g.phase !== 'play') throw new GameError('今はカードを出すときではありません');
    if (g.turn !== pid) throw new GameError('あなたの番ではありません');
    const card = g.hands[pid].find(c => c.id === action.card);
    if (!card) throw new GameError('手札にないカードです');
    if (!legalCards(g, pid).includes(card)) throw new GameError(`${SUIT_MARK[g.trick[0].card.s]} を持っているときは ${SUIT_MARK[g.trick[0].card.s]} を出します`);
    g.hands[pid] = g.hands[pid].filter(c => c !== card);
    g.trick.push({ pid, card });
    g.seq++;
    if (g.trick.length < g.players.length) {
      g.turn = nextOf(g, pid);
      return;
    }
    const winner = trickWinner(g.trick, g.trump.s);
    g.took[winner]++;
    g.lastTrick = { cards: g.trick, winner };
    log(g, `${g.trick.map(t => cardLabel(t.card)).join(' ')} → ${name(g, winner)} さんが取った`);
    g.trick = [];
    g.turn = winner;
    if (g.hands[winner].length === 0) finishRound(g);
    return;
  }

  throw new GameError('不明な操作です');
}

function finishRound(g) {
  const rows = {};
  for (const p of g.players) {
    const exact = g.bids[p] === g.took[p];
    const gain = g.took[p] + (exact ? BONUS : 0);
    g.scores[p] += gain;
    rows[p] = { bid: g.bids[p], took: g.took[p], gain, exact };
  }
  g.history.push({ size: g.sizes[g.round], trump: g.trump.s, rows });
  const hits = g.players.filter(p => rows[p].exact).map(p => name(g, p));
  log(g, `第${g.round + 1}ラウンド終了。ぴたり: ${hits.length ? hits.join('・') : 'なし'}`);
  g.turn = null;
  g.phase = g.round + 1 >= g.sizes.length ? 'end' : 'roundEnd';
  if (g.phase === 'end') {
    const top = Math.max(...g.players.map(p => g.scores[p]));
    log(g, `🏆 ${g.players.filter(p => g.scores[p] === top).map(p => name(g, p)).join('・')} さんの勝ち！`);
  }
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    round: g.round + 1,
    totalRounds: g.sizes.length,
    size: g.sizes[g.round],
    sizes: g.sizes,
    options: g.options,
    me: seated ? pid : null,
    hand: seated ? g.hands[pid] : [],
    legal: seated && g.phase === 'play' && g.turn === pid ? legalCards(g, pid).map(c => c.id) : [],
    forbidden: seated && g.phase === 'bid' && g.turn === pid ? forbiddenBid(g, pid) : null,
    dealer: g.dealer,
    turn: g.turn,
    trump: g.trump,
    trick: g.trick,
    lastTrick: g.lastTrick,
    history: g.history,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      count: g.hands[p].length,
      bid: g.bids[p],
      took: g.took[p],
      score: g.scores[p],
    })),
  };
}

// ---- CPU ----

// 1枚が取れそうな見込み（ざっくり）
function winChance(c, trump, size, n) {
  if (c.s === trump) return c.r >= 12 ? 0.9 : c.r >= 9 ? 0.65 : 0.4;
  const crowd = Math.min(1, (size * n) / 26); // 配る枚数が多いほど、高い札も切り札で切られやすい
  if (c.r === 14) return 0.85 - 0.25 * crowd;
  if (c.r === 13) return 0.55 - 0.25 * crowd;
  if (c.r === 12) return 0.25 - 0.1 * crowd;
  return 0.02;
}

export function estimateBid(hand, trump, n) {
  const e = hand.reduce((a, c) => a + winChance(c, trump, hand.length, n), 0);
  return Math.round(e);
}

// 強さ（切り札が一番上、次に台札）。比べるときだけ使う
const power = (c, lead, trump) => (c.s === trump ? 100 : c.s === lead ? 50 : 0) + c.r;

export function bot(g, pid, rng = Math.random) {
  if (g.turn !== pid) return null;
  if (g.phase === 'bid') {
    const size = g.sizes[g.round];
    let n = Math.max(0, Math.min(size, estimateBid(g.hands[pid], g.trump.s, g.players.length)));
    const ng = forbiddenBid(g, pid);
    if (n === ng) n = n > 0 && (rng() < 0.5 || n === size) ? n - 1 : n + 1;
    return { type: 'bid', n };
  }
  if (g.phase !== 'play') return null;
  const legal = legalCards(g, pid);
  const trump = g.trump.s;
  const need = g.bids[pid] - g.took[pid];
  if (!g.trick.length) {
    // 先に出す: 取りたいなら一番強い札、取りたくないなら一番弱い札（切り札は温存）
    const sorted = legal.slice().sort((a, b) => power(a, a.s, trump) - power(b, b.s, trump));
    return { type: 'play', card: (need > 0 ? sorted[sorted.length - 1] : sorted[0]).id };
  }
  const lead = g.trick[0].card.s;
  const wins = c => trickWinner([...g.trick, { pid, card: c }], trump) === pid;
  const sorted = legal.slice().sort((a, b) => power(a, lead, trump) - power(b, lead, trump));
  const winning = sorted.filter(wins);
  const losing = sorted.filter(c => !wins(c));
  let card;
  if (need > 0) card = winning[0] ?? losing[0]; // 勝てる一番弱い札。勝てなければ一番弱い札を捨てる
  else card = losing[losing.length - 1] ?? winning[0]; // 負ける一番強い札。どうしても勝つなら一番弱い札
  return { type: 'play', card: card.id };
}
