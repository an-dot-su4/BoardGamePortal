// ページワン（昔からあるトランプ遊び。場のカードと同じマークか同じ数字を出していく）
//
// 採用ルール:
//   - 52枚（ジョーカーなし）。2人は7枚、3人以上は5枚ずつ配り、残りは山札。1枚めくって場に置く
//   - 手番では、場のいちばん上と「同じマーク」か「同じ数字」のカードを1枚出す
//   - 出せない（出さない）ときは山札から1枚引く。引いたカードが出せればそのまま出してもよい。出さなければ手番終わり
//   - 特別なカード: 8＝いつでも出せて、次のマークを決められる／2＝次の人は2枚引く（2を出せば重ねて次の人へ）／J＝次の人を飛ばす
//   - 残り1枚になるカードを出すときは「ページワン！」と言う。言い忘れたら2枚引く
//   - 最初に手札をなくした人の勝ち。ほかの人は残りの枚数で順位
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'スペード', H: 'ハート', D: 'ダイヤ', C: 'クラブ' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };
export const CPU_LEVELS = { weak: '弱い（ときどき言い忘れる）', strong: '強い' };

export function normalizeOptions(o) {
  return { cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'strong' };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
export const cardLabel = c => SUIT_MARK[c.s] + RANK_LABEL[c.r];

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ id: s + r, s, r });
  return deck;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 6) throw new GameError('ページワンは2〜6人で遊びます');
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: normalizeOptions(options),
    games: 1,
    first: 0,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startGame(g, rng);
  return g;
}

function startGame(g, rng) {
  const deck = shuffle(makeDeck(), rng);
  const n = g.players.length === 2 ? 7 : 5;
  g.hands = Object.fromEntries(g.players.map(p => [p, deck.splice(0, n)]));
  // 最初の場札は特別でないカードにする
  let k = deck.findIndex(c => ![2, 8, 11].includes(c.r));
  const [top] = deck.splice(k, 1);
  g.pile = [top];
  g.deck = deck;
  g.suit = top.s; // 今のマーク（8で変わる）
  g.penalty = 0; // 2 が重なっている枚数
  g.drawn = null; // この手番で引いたカード（出すかどうか決める）
  g.turnIndex = g.first;
  g.turn = g.players[g.first];
  g.phase = 'play';
  g.winner = null;
  g.ranking = null;
  g.last = null;
  log(g, `第${g.games}局。場は ${cardLabel(top)}。${name(g, g.turn)} さんから`);
}

export const top = g => g.pile[g.pile.length - 1];

export function canPlay(g, c) {
  if (g.penalty > 0) return c.r === 2;
  if (c.r === 8) return true;
  return c.s === g.suit || c.r === top(g).r;
}

function drawOne(g, rng) {
  if (g.deck.length === 0) {
    const keep = g.pile.pop();
    g.deck = shuffle(g.pile, rng);
    g.pile = [keep];
    if (g.deck.length) log(g, '山札がなくなったので、場のカードを混ぜて山札にしました');
  }
  return g.deck.pop() ?? null;
}

function draw(g, p, n, rng) {
  let got = 0;
  for (let i = 0; i < n; i++) {
    const c = drawOne(g, rng);
    if (!c) break;
    g.hands[p].push(c);
    got++;
  }
  return got;
}

function advance(g, steps = 1) {
  g.turnIndex = (g.turnIndex + steps) % g.players.length;
  g.turn = g.players[g.turnIndex];
  g.drawn = null;
}

function finish(g, p) {
  g.phase = 'end';
  g.winner = p;
  g.turn = null;
  g.wins[p]++;
  g.ranking = g.players.slice().sort((a, b) => g.hands[a].length - g.hands[b].length);
  log(g, `🏆 ${name(g, p)} さんが上がり！`);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    g.games++;
    g.first = (g.first + 1) % g.players.length;
    startGame(g, rng);
    g.seq++;
    return;
  }

  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const hand = g.hands[pid];

  if (type === 'play') {
    const card = hand.find(c => c.id === action.card);
    if (!card) throw new GameError('手札にないカードです');
    if (g.drawn && card.id !== g.drawn) throw new GameError('引いたあとは、引いたカードしか出せません');
    if (!canPlay(g, card)) throw new GameError(g.penalty ? '2を出すか、カードを引いてください' : '同じマークか同じ数字のカード（または8）を出してください');
    let suit = card.s;
    if (card.r === 8) {
      if (!SUITS.includes(action.suit)) throw new GameError('8を出すときは次のマークを選んでください');
      suit = action.suit;
    }
    g.hands[pid] = hand.filter(c => c !== card);
    g.pile.push(card);
    g.suit = suit;
    g.seq++;
    g.last = { by: pid, card, suit };
    let msg = `${name(g, pid)}: ${cardLabel(card)}`;
    if (card.r === 8) msg += `（次は${SUIT_MARK[suit]}）`;
    if (g.hands[pid].length === 0) {
      log(g, msg);
      return finish(g, pid);
    }
    if (g.hands[pid].length === 1) {
      if (action.pageOne) msg += ' 「ページワン！」';
      else {
        const n = draw(g, pid, 2, rng);
        msg += ` …ページワンを言い忘れて${n}枚引いた`;
      }
    }
    log(g, msg);
    if (card.r === 2) {
      g.penalty += 2;
      advance(g);
    } else if (card.r === 11) {
      advance(g, 2);
      log(g, `${name(g, g.players[(g.turnIndex + g.players.length - 1) % g.players.length])} さんは飛ばされた`);
    } else advance(g);
    return;
  }

  if (type === 'draw') {
    if (g.drawn) throw new GameError('もう引きました。出すか、パスしてください');
    if (g.penalty > 0) {
      const n = draw(g, pid, g.penalty, rng);
      log(g, `${name(g, pid)}: 2が重なって ${n}枚引いた`);
      g.penalty = 0;
      g.seq++;
      g.last = { by: pid, drew: n };
      advance(g);
      return;
    }
    const c = drawOne(g, rng);
    g.seq++;
    if (!c) {
      log(g, `${name(g, pid)}: 山札がないのでパス`);
      advance(g);
      return;
    }
    hand.push(c);
    g.last = { by: pid, drew: 1 };
    if (canPlay(g, c)) {
      g.drawn = c.id;
      return;
    }
    log(g, `${name(g, pid)}: 1枚引いてパス`);
    advance(g);
    return;
  }

  if (type === 'pass') {
    if (!g.drawn) throw new GameError('先に1枚引いてください');
    log(g, `${name(g, pid)}: 1枚引いてパス`);
    g.seq++;
    advance(g);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const myTurn = seated && g.turn === pid && g.phase === 'play';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    turn: g.turn,
    top: top(g),
    suit: g.suit,
    penalty: g.penalty,
    deckCount: g.deck.length,
    hand: seated ? g.hands[pid] : [],
    playable: myTurn ? g.hands[pid].filter(c => canPlay(g, c) && (!g.drawn || c.id === g.drawn)).map(c => c.id) : [],
    drawn: myTurn ? g.drawn : null,
    last: g.last,
    winner: g.winner,
    ranking: g.ranking,
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), count: g.hands[p].length, wins: g.wins[p] })),
  };
}

// ---- CPU ----

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const hand = g.hands[pid];
  let cards = hand.filter(c => canPlay(g, c));
  if (g.drawn) cards = cards.filter(c => c.id === g.drawn);
  if (!cards.length) return g.drawn ? { type: 'pass' } : { type: 'draw' };
  // 8はとっておく。攻撃の札（2・J）を先に、残りは多く持っているマークを出す
  const suitCount = s => hand.filter(c => c.s === s && c.r !== 8).length;
  const score = c => (c.r === 8 ? -10 : 0) + (c.r === 2 || c.r === 11 ? 3 : 0) + suitCount(c.s) + rng() * 0.5;
  cards.sort((a, b) => score(b) - score(a));
  const card = cards[0];
  const action = { type: 'play', card: card.id };
  if (card.r === 8) {
    const others = hand.filter(c => c !== card);
    action.suit = SUITS.slice().sort((a, b) => others.filter(c => c.s === b).length - others.filter(c => c.s === a).length)[0];
  }
  if (hand.length === 2) action.pageOne = g.options.cpu === 'weak' ? rng() < 0.7 : true;
  return action;
}
