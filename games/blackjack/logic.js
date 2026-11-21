// ブラックジャック（おなじみのトランプのカジノ遊び。全員がディーラーと勝負する）
//
// 採用ルール:
//   - 各自100枚のチップから。決まった回数（標準8回）遊んで、チップがいちばん多い人の勝ち
//   - 毎回、全員がこっそり賭ける（5〜所持チップ）。そろったら2枚ずつ配る。ディーラーは1枚が伏せ札
//   - 手番の人は「ヒット（1枚引く）」「スタンド（止める）」「ダブル（最初の2枚のときだけ。賭けを2倍にして1枚だけ引く）」
//   - 合計が21を超えたらバースト（負け）。A は 1 か 11、絵札は 10
//   - 全員が終わったら、ディーラーは17以上になるまで引く。21に近いほうが勝ち。同じなら引き分け（賭けが戻る）
//   - 勝てば賭けと同じだけもらえる。最初の2枚で21（ブラックジャック）なら1.5倍
//   - チップが5枚未満になった人はそこで見学（チップ0で順位は最後のほう）
//   - 山札は6組（312枚）。残りが4分の1を切ったら混ぜ直す
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };
export const START_CHIPS = 100;
export const MIN_BET = 5;
export const ROUND_COUNTS = [5, 8, 12];
const DECKS = 6;

export function normalizeOptions(o) {
  return { rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 8 };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
export const cardLabel = c => SUIT_MARK[c.s] + RANK_LABEL[c.r];

export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.r === 1) { aces++; total += 11; }
    else total += Math.min(10, c.r);
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

export const isBlackjack = cards => cards.length === 2 && handValue(cards).total === 21;

function newShoe(rng) {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const s of SUITS) for (let r = 1; r <= 13; r++) shoe.push({ s, r, id: `${d}${s}${r}` });
  return shuffle(shoe, rng);
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 1 || players.length > 6) throw new GameError('ブラックジャックは1〜6人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    chips: Object.fromEntries(ids.map(p => [p, START_CHIPS])),
    shoe: newShoe(rng),
    round: 0,
    log: [],
    seq: 0,
  };
  startRound(g, rng);
  return g;
}

const canPlayRound = (g, p) => g.chips[p] >= MIN_BET;

function startRound(g, rng) {
  g.round++;
  g.phase = 'bet';
  g.bets = {};
  g.hands = {};
  g.done = {};
  g.results = null;
  g.dealer = [];
  g.turn = null;
  if (g.shoe.length < (52 * DECKS) / 4) {
    g.shoe = newShoe(rng);
    log(g, '山札を混ぜ直しました');
  }
  log(g, `第${g.round}回。賭けるチップを決めてください`);
}

function draw(g, rng) {
  if (!g.shoe.length) g.shoe = newShoe(rng);
  return g.shoe.pop();
}

const inRound = g => g.players.filter(p => g.bets[p] !== undefined);

function deal(g, rng) {
  for (const p of inRound(g)) g.hands[p] = [draw(g, rng), draw(g, rng)];
  g.dealer = [draw(g, rng), draw(g, rng)];
  g.phase = 'play';
  for (const p of inRound(g)) if (isBlackjack(g.hands[p])) g.done[p] = true;
  if (isBlackjack(g.dealer)) {
    // ディーラーがブラックジャックなら、すぐに勝負
    for (const p of inRound(g)) g.done[p] = true;
  }
  nextTurn(g, rng);
}

function nextTurn(g, rng) {
  const order = inRound(g);
  const next = order.find(p => !g.done[p]);
  if (next) {
    g.turn = next;
    return;
  }
  g.turn = null;
  dealerPlay(g, rng);
}

function dealerPlay(g, rng) {
  const anyAlive = inRound(g).some(p => handValue(g.hands[p]).total <= 21 && !isBlackjack(g.hands[p]));
  if (anyAlive && !isBlackjack(g.dealer)) {
    while (handValue(g.dealer).total < 17) g.dealer.push(draw(g, rng));
  }
  const d = handValue(g.dealer).total;
  const dBJ = isBlackjack(g.dealer);
  g.results = {};
  for (const p of inRound(g)) {
    const hv = handValue(g.hands[p]).total;
    const bet = g.bets[p];
    const pBJ = isBlackjack(g.hands[p]);
    let gain;
    let kind;
    if (hv > 21) { gain = -bet; kind = 'bust'; }
    else if (pBJ && !dBJ) { gain = Math.floor(bet * 1.5); kind = 'blackjack'; }
    else if (dBJ && !pBJ) { gain = -bet; kind = 'lose'; }
    else if (d > 21 || hv > d) { gain = bet; kind = 'win'; }
    else if (hv === d) { gain = 0; kind = 'push'; }
    else { gain = -bet; kind = 'lose'; }
    g.chips[p] += gain;
    g.results[p] = { gain, kind };
  }
  log(g, `ディーラー: ${g.dealer.map(cardLabel).join(' ')}（${d > 21 ? 'バースト' : d}）。` +
    inRound(g).map(p => `${name(g, p)} ${g.results[p].gain >= 0 ? '+' : ''}${g.results[p].gain}`).join(' / '));
  g.phase = g.round >= g.options.rounds || !g.players.some(p => canPlayRound(g, p)) ? 'end' : 'result';
  if (g.phase === 'end') {
    const top = Math.max(...g.players.map(p => g.chips[p]));
    g.winners = g.players.filter(p => g.chips[p] === top);
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（チップ${top}枚）`);
  }
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
    if (g.phase !== 'result') throw new GameError('まだ次の回には進めません');
    startRound(g, rng);
    g.seq++;
    return;
  }

  if (type === 'bet') {
    if (g.phase !== 'bet') throw new GameError('今は賭けるときではありません');
    if (!canPlayRound(g, pid)) throw new GameError('チップが足りないので見学です');
    if (g.bets[pid] !== undefined) throw new GameError('もう賭けました');
    const n = action.amount;
    if (!Number.isInteger(n) || n < MIN_BET || n > g.chips[pid]) throw new GameError(`${MIN_BET}〜${g.chips[pid]}枚で賭けてください`);
    g.bets[pid] = n;
    g.seq++;
    if (g.players.filter(p => canPlayRound(g, p)).every(p => g.bets[p] !== undefined)) deal(g, rng);
    return;
  }

  if (g.phase !== 'play') throw new GameError('今はカードを引くときではありません');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const hand = g.hands[pid];

  if (type === 'hit') {
    hand.push(draw(g, rng));
    g.seq++;
    const v = handValue(hand).total;
    if (v > 21) log(g, `${name(g, pid)}: バースト（${v}）`);
    if (v >= 21) {
      g.done[pid] = true;
      nextTurn(g, rng);
    }
    return;
  }

  if (type === 'stand') {
    g.done[pid] = true;
    g.seq++;
    nextTurn(g, rng);
    return;
  }

  if (type === 'double') {
    if (hand.length !== 2) throw new GameError('ダブルは最初の2枚のときだけです');
    if (g.chips[pid] < g.bets[pid] * 2) throw new GameError('チップが足りないのでダブルできません');
    g.bets[pid] *= 2;
    hand.push(draw(g, rng));
    log(g, `${name(g, pid)}: ダブル（賭け${g.bets[pid]}枚）→ ${handValue(hand).total}`);
    g.done[pid] = true;
    g.seq++;
    nextTurn(g, rng);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const showHole = g.phase === 'result' || g.phase === 'end';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: g.round,
    totalRounds: g.options.rounds,
    turn: g.turn,
    // ディーラーの伏せ札は勝負がつくまで送らない
    dealer: g.dealer.length ? (showHole ? g.dealer : [g.dealer[0], null]) : [],
    dealerTotal: showHole ? handValue(g.dealer).total : g.dealer.length ? handValue([g.dealer[0]]).total : null,
    results: g.results,
    winners: g.phase === 'end' ? g.winners : null,
    shoeLeft: g.shoe.length,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      chips: g.chips[p],
      out: !canPlayRound(g, p) && g.bets[p] === undefined,
      // 賭けは全員がそろうまでほかの人には見せない
      bet: g.phase === 'bet' ? (p === pid ? g.bets[p] ?? null : g.bets[p] !== undefined ? '?' : null) : g.bets[p] ?? null,
      hand: g.hands[p] ?? null,
      total: g.hands[p] ? handValue(g.hands[p]).total : null,
      done: !!g.done[p],
    })),
  };
}

// ---- CPU ----
// よく知られた基本の作戦を簡単にしたもの
export function bot(g, pid, rng = Math.random) {
  if (g.phase === 'bet') {
    if (!canPlayRound(g, pid) || g.bets[pid] !== undefined) return null;
    const amount = Math.max(MIN_BET, Math.min(g.chips[pid], 5 * Math.round((g.chips[pid] * (0.08 + rng() * 0.08)) / 5)));
    return { type: 'bet', amount };
  }
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const hand = g.hands[pid];
  const { total, soft } = handValue(hand);
  const up = Math.min(10, g.dealer[0].r === 1 ? 11 : g.dealer[0].r);
  if (hand.length === 2 && !soft && (total === 11 || (total === 10 && up <= 9)) && g.chips[pid] >= g.bets[pid] * 2) return { type: 'double' };
  if (soft) return { type: total >= 19 || (total === 18 && up <= 8) ? 'stand' : 'hit' };
  if (total >= 17) return { type: 'stand' };
  if (total >= 13 && up <= 6) return { type: 'stand' };
  if (total === 12 && up >= 4 && up <= 6) return { type: 'stand' };
  return { type: 'hit' };
}
