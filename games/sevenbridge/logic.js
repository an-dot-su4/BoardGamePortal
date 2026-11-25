// セブンブリッジ（昔からあるラミー系のトランプ遊び。組をつくって手札を出しきる）
//
// 採用ルール:
//   - 52枚（ジョーカーなし）。7枚ずつ配り、残りは山札。1枚めくって捨て札にする
//   - 手番ではまず1枚引く（山札のいちばん上か、捨て札のいちばん上）
//   - 次に、手札から「組」を好きなだけ出せる（さらし）
//       同じ数字3〜4枚（セット）／同じマークの連続3枚以上（階段。A は 2 の下か K の上。K-A-2 のようにはつながらない）
//       7 だけは特別で、1〜2枚からでも出せる（7のセット、または 7 を含む同じマークの連続）
//   - 場に出ている組（だれのものでも）に、手札を1枚ずつ「つけ札」できる
//   - 最後に手札を1枚捨てて手番終わり。捨て札から取ったカードはその手番には捨てられない
//   - 手札をなくした人がラウンドの勝ち（さらし・つけ札でなくなっても、最後の1枚を捨ててもよい）
//   - ほかの人の手札の点（A=1、2〜10は数字どおり、J・Q・K=10）の合計が勝った人の点になる
//   - 山札がなくなったら、捨て札のいちばん上を残して混ぜ直す。3回混ぜ直したら引き分けでラウンド終わり
//   - 決まったラウンド数（標準3）の合計点で勝負
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };
export const ROUND_COUNTS = [1, 3, 5];
const HAND = 7;
const MAX_RESHUFFLE = 3;

export function normalizeOptions(o) {
  return { rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 3 };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
export const cardLabel = c => SUIT_MARK[c.s] + RANK_LABEL[c.r];
export const cardPoints = c => Math.min(c.r, 10);
export const handPoints = hand => hand.reduce((s, c) => s + cardPoints(c), 0);
export const sortCards = cards => cards.slice().sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || a.r - b.r);

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ id: s + r, s, r });
  return deck;
}

// 同じマークの連続か（A は 1 か 14 として扱う。どちらか一方で連続ならよい）。連続なら並べた順を返す
function runOrder(cards) {
  if (!cards.length || cards.some(c => c.s !== cards[0].s)) return null;
  for (const high of [false, true]) {
    const val = c => (high && c.r === 1 ? 14 : c.r);
    const sorted = cards.slice().sort((a, b) => val(a) - val(b));
    if (sorted.every((c, i) => i === 0 || val(c) === val(sorted[i - 1]) + 1)) return sorted;
  }
  return null;
}

// 組として成り立つか。成り立つなら { kind, cards（並べた順） }、だめなら null
export function meldOf(cards) {
  const n = cards.length;
  if (!n || new Set(cards.map(c => c.id)).size !== n) return null;
  const has7 = cards.some(c => c.r === 7);
  if (cards.every(c => c.r === cards[0].r) && n <= 4 && (n >= 3 || cards[0].r === 7)) {
    if (n === 1 || new Set(cards.map(c => c.s)).size === n) return { kind: n === 1 ? 'seven' : 'set', cards: sortCards(cards) };
  }
  const run = runOrder(cards);
  if (run && (n >= 3 || has7)) return { kind: 'run', cards: run };
  return null;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 6) throw new GameError('セブンブリッジは2〜6人で遊びます');
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: normalizeOptions(options),
    round: 0,
    dealer: Math.floor(rng() * ids.length),
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startRound(g, rng);
  return g;
}

function startRound(g, rng) {
  g.round++;
  const deck = shuffle(makeDeck(), rng);
  g.hands = Object.fromEntries(g.players.map(p => [p, deck.splice(0, HAND)]));
  g.discard = [deck.pop()];
  g.stock = deck;
  g.melds = []; // [{ id, owner, kind, cards }]
  g.meldSeq = 0;
  g.reshuffles = 0;
  g.phase = 'draw';
  g.result = null;
  g.taken = null; // 捨て札から取ったカード（その手番には捨てられない）
  g.dealer = (g.dealer + 1) % g.players.length;
  g.turn = g.players[g.dealer];
  g.last = null;
  log(g, `第${g.round}ラウンド。${name(g, g.turn)} さんから始めます`);
}

function endRound(g, winner) {
  let pts = 0;
  if (winner) {
    pts = g.players.filter(p => p !== winner).reduce((s, p) => s + handPoints(g.hands[p]), 0);
    g.scores[winner] += pts;
    log(g, `🎉 ${name(g, winner)} さんが手札を出しきりました（+${pts}点）`);
  } else log(g, '🌀 山札が尽きたので、このラウンドは引き分け');
  g.result = { winner, pts, left: Object.fromEntries(g.players.map(p => [p, sortCards(g.hands[p])])) };
  g.turn = null;
  g.taken = null;
  g.phase = g.round >= g.options.rounds ? 'end' : 'result';
  if (g.phase === 'end') {
    const top = Math.max(...g.players.map(p => g.scores[p]));
    g.winners = g.players.filter(p => g.scores[p] === top);
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top}点）`);
  }
}

function takeCards(g, pid, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 13) throw new GameError('カードを選んでください');
  const hand = g.hands[pid];
  const cards = ids.map(id => hand.find(c => c.id === id));
  if (cards.some(c => !c)) throw new GameError('手札にないカードです');
  if (new Set(ids).size !== ids.length) throw new GameError('同じカードが重なっています');
  return cards;
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
    if (g.phase !== 'result') throw new GameError('まだ次のラウンドには進めません');
    startRound(g, rng);
    g.seq++;
    return;
  }

  if (g.phase !== 'draw' && g.phase !== 'play') throw new GameError('今はカードを動かすときではありません');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const hand = g.hands[pid];

  if (type === 'draw') {
    if (g.phase !== 'draw') throw new GameError('この手番はもう引きました');
    if (action.from === 'discard') {
      if (!g.discard.length) throw new GameError('捨て札がありません');
      const c = g.discard.pop();
      hand.push(c);
      g.taken = c.id;
      g.last = { by: pid, took: c };
      log(g, `${name(g, pid)}: 捨て札の ${cardLabel(c)} を取った`);
    } else if (action.from === 'stock') {
      if (!g.stock.length) throw new GameError('山札がありません');
      hand.push(g.stock.pop());
      g.taken = null;
      g.last = { by: pid, drew: true };
    } else throw new GameError('山札か捨て札を選んでください');
    g.phase = 'play';
    g.seq++;
    return;
  }

  if (g.phase !== 'play') throw new GameError('先に1枚引いてください');

  if (type === 'meld') {
    const cards = takeCards(g, pid, action.cards);
    const m = meldOf(cards);
    if (!m) throw new GameError('組になっていません（同じ数字3枚以上か、同じマークの連続3枚以上。7は1枚からでも可）');
    g.hands[pid] = hand.filter(c => !cards.includes(c));
    g.melds.push({ id: ++g.meldSeq, owner: pid, kind: m.kind, cards: m.cards });
    if (cards.some(c => c.id === g.taken)) g.taken = null;
    g.last = { by: pid, meld: g.meldSeq };
    log(g, `${name(g, pid)}: ${m.cards.map(cardLabel).join(' ')} をさらした`);
    g.seq++;
    if (!g.hands[pid].length) endRound(g, pid);
    return;
  }

  if (type === 'layoff') {
    const [c] = takeCards(g, pid, [action.card]);
    const target = g.melds.find(m => m.id === action.meld);
    if (!target) throw new GameError('その組はありません');
    const m = meldOf([...target.cards, c]);
    if (!m) throw new GameError(`${cardLabel(c)} はその組につけられません`);
    target.kind = m.kind;
    target.cards = m.cards;
    g.hands[pid] = hand.filter(x => x !== c);
    if (c.id === g.taken) g.taken = null;
    g.last = { by: pid, meld: target.id, card: c.id };
    log(g, `${name(g, pid)}: ${cardLabel(c)} をつけ札`);
    g.seq++;
    if (!g.hands[pid].length) endRound(g, pid);
    return;
  }

  if (type === 'discard') {
    const [c] = takeCards(g, pid, [action.card]);
    if (c.id === g.taken && g.hands[pid].length > 1) throw new GameError('捨て札から取ったカードは、この手番には捨てられません');
    g.hands[pid] = hand.filter(x => x !== c);
    g.discard.push(c);
    g.last = { by: pid, discarded: c };
    g.taken = null;
    g.seq++;
    if (!g.hands[pid].length) return endRound(g, pid);
    if (!g.stock.length) {
      if (g.reshuffles >= MAX_RESHUFFLE) return endRound(g, null);
      const top = g.discard.pop();
      g.stock = shuffle(g.discard, rng);
      g.discard = [top];
      g.reshuffles++;
      log(g, '🔀 山札がなくなったので、捨て札を混ぜて山札にしました');
    }
    g.turn = g.players[(g.players.indexOf(pid) + 1) % g.players.length];
    g.phase = 'draw';
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const open = g.phase === 'result' || g.phase === 'end';
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: g.round,
    totalRounds: g.options.rounds,
    hand: seated ? sortCards(g.hands[pid]) : [],
    taken: seated && g.turn === pid ? g.taken : null,
    melds: g.melds,
    discardTop: g.discard[g.discard.length - 1] ?? null,
    discardCount: g.discard.length,
    stockCount: g.stock.length,
    turn: g.turn,
    last: g.last,
    result: open ? g.result : null,
    winners: g.phase === 'end' ? g.winners : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), count: g.hands[p].length, score: g.scores[p] })),
  };
}

// ---- CPU ----
// 手札の中で、組になりそうな仲間（同じ数字・同じマークのとなり）がどれだけあるか
function usefulness(c, hand) {
  let u = 0;
  for (const x of hand) {
    if (x === c) continue;
    if (x.r === c.r) u += 2;
    if (x.s === c.s && Math.abs(x.r - c.r) <= 2) u += Math.abs(x.r - c.r) === 1 ? 2 : 1;
  }
  return u + (c.r === 7 ? 3 : 0);
}

// 手札から出せる組を1つ探す（大きい組を優先）
export function findMeld(hand) {
  let best = null;
  const consider = cards => {
    if (meldOf(cards) && (!best || cards.length > best.length)) best = cards;
  };
  const byRank = {};
  for (const c of hand) (byRank[c.r] ??= []).push(c);
  for (const cs of Object.values(byRank)) if (cs.length >= 3) consider(cs);
  for (const s of SUITS) {
    const suited = hand.filter(c => c.s === s);
    for (const high of [false, true]) {
      const val = c => (high && c.r === 1 ? 14 : c.r);
      const sorted = suited.slice().sort((a, b) => val(a) - val(b));
      let runStart = 0;
      for (let i = 1; i <= sorted.length; i++) {
        if (i === sorted.length || val(sorted[i]) !== val(sorted[i - 1]) + 1) {
          const seg = sorted.slice(runStart, i);
          if (seg.length >= 3) consider(seg);
          runStart = i;
        }
      }
    }
  }
  if (best) return best;
  const seven = hand.find(c => c.r === 7);
  return seven ? [seven] : null;
}

const findLayoff = (g, hand) => {
  for (const c of hand) for (const m of g.melds) if (meldOf([...m.cards, c])) return { card: c.id, meld: m.id };
  return null;
};

export function bot(g, pid, rng = Math.random) {
  if (g.turn !== pid) return null;
  const hand = g.hands[pid];
  if (g.phase === 'draw') {
    const top = g.discard[g.discard.length - 1];
    if (top) {
      const withTop = [...hand, top];
      const meld = findMeld(withTop);
      const helps = (meld && meld.includes(top)) || g.melds.some(m => meldOf([...m.cards, top]));
      if (helps || !g.stock.length) return { type: 'draw', from: 'discard' };
    }
    return { type: 'draw', from: 'stock' };
  }
  if (g.phase !== 'play') return null;
  const meld = findMeld(hand);
  if (meld) return { type: 'meld', cards: meld.map(c => c.id) };
  const lay = findLayoff(g, hand);
  if (lay) return { type: 'layoff', ...lay };
  const options = hand.filter(c => c.id !== g.taken);
  options.sort((a, b) => usefulness(a, hand) - usefulness(b, hand) || cardPoints(b) - cardPoints(a) || rng() - 0.5);
  return { type: 'discard', card: options[0].id };
}
