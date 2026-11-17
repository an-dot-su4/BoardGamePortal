// ババ抜き（おなじみのトランプ遊び）
//
// 採用ルール:
//   - 52枚＋ジョーカー1枚を全員に配る。最初に、同じ数字の2枚組を全部捨てる（自動）
//   - 手番の人は、次の人（まだ上がっていない人）の裏向きの手札から1枚引く。同じ数字の組ができたら捨てる（自動）
//   - 引かれた人が次の手番になる。手札がなくなった人から上がり。最後にジョーカーを持っていた人の負け
//   - 引いたカードは手札のどこかにまぎれる（だれもジョーカーの場所を追えない）。自分の手札はいつでも混ぜられる
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣', X: '🃏' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 0: 'JOKER' };
export const JOKER = 0;

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
export const cardLabel = c => (c.r === JOKER ? 'ジョーカー' : SUIT_MARK[c.s] + RANK_LABEL[c.r]);

export function makeDeck() {
  const deck = [{ id: 'JK', s: 'X', r: JOKER }];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ id: s + r, s, r });
  return deck;
}

// 同じ数字の2枚組を捨てる。捨てた組を返す
export function discardPairs(hand) {
  const pairs = [];
  const byRank = new Map();
  for (const c of hand) {
    if (c.r === JOKER) continue;
    if (byRank.has(c.r)) {
      pairs.push([byRank.get(c.r), c]);
      byRank.delete(c.r);
    } else byRank.set(c.r, c);
  }
  const gone = new Set(pairs.flat());
  return { hand: hand.filter(c => !gone.has(c)), pairs };
}

export function setup(players, rng = Math.random) {
  if (players.length < 2 || players.length > 6) throw new GameError('ババ抜きは2〜6人で遊びます');
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    games: 1,
    first: 0,
    losses: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startGame(g, rng);
  return g;
}

function startGame(g, rng) {
  const deck = shuffle(makeDeck(), rng);
  g.hands = Object.fromEntries(g.players.map(p => [p, []]));
  deck.forEach((c, i) => g.hands[g.players[(i + g.first) % g.players.length]].push(c));
  g.discards = 0;
  for (const p of g.players) {
    const r = discardPairs(g.hands[p]);
    g.hands[p] = shuffle(r.hand, rng);
    g.discards += r.pairs.length * 2;
  }
  g.finished = [];
  for (const p of g.players) if (g.hands[p].length === 0) g.finished.push(p);
  g.phase = 'play';
  g.loser = null;
  g.last = null;
  g.turn = null;
  log(g, `第${g.games}局。同じ数字の組を捨てて始めます`);
  g.turn = nextActive(g, g.players[(g.first + g.players.length - 1) % g.players.length]);
  if (!checkEnd(g)) log(g, `${name(g, g.turn)} さんから`);
}

const active = (g, p) => !g.finished.includes(p);

function nextActive(g, from) {
  let i = g.players.indexOf(from);
  for (let k = 0; k < g.players.length; k++) {
    i = (i + 1) % g.players.length;
    if (active(g, g.players[i])) return g.players[i];
  }
  return null;
}

// 引かれる人（手番の人の次の、まだ上がっていない人）
export const targetOf = g => (g.turn ? nextActive(g, g.turn) : null);

function checkEnd(g) {
  const live = g.players.filter(p => active(g, p));
  if (live.length > 1) return false;
  g.phase = 'end';
  g.loser = live[0] ?? null;
  g.turn = null;
  if (g.loser) {
    g.losses[g.loser]++;
    log(g, `🃏 ${name(g, g.loser)} さんがジョーカーを持っていました。ババ！`);
  }
  return true;
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

  if (type === 'shuffle') {
    if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
    g.hands[pid] = shuffle(g.hands[pid], rng);
    g.seq++;
    return;
  }

  if (type !== 'draw') throw new GameError('不明な操作です');
  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const target = targetOf(g);
  const i = action.index;
  if (!Number.isInteger(i) || i < 0 || i >= g.hands[target].length) throw new GameError('そのカードは引けません');

  const [card] = g.hands[target].splice(i, 1);
  // 引いたカードは手札のどこかにまぎれる
  const hand = g.hands[pid];
  const at = Math.floor(rng() * (hand.length + 1));
  hand.splice(at, 0, card);
  const r = discardPairs(hand);
  g.hands[pid] = r.hand;
  const paired = r.pairs.length ? r.pairs[0] : null;
  g.discards += r.pairs.length * 2;
  g.last = { drawer: pid, target, card, paired };
  g.seq++;
  log(g, `${name(g, pid)} さんが ${name(g, target)} さんから1枚引いた${paired ? `→ ${RANK_LABEL[paired[0].r]}の組を捨てた` : ''}`);

  for (const p of [pid, target]) {
    if (g.hands[p].length === 0 && active(g, p)) {
      g.finished.push(p);
      log(g, `🎉 ${name(g, p)} さんが上がり！（${g.finished.length}番目）`);
    }
  }
  if (checkEnd(g)) return;
  g.turn = active(g, target) ? target : nextActive(g, target);
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const target = targetOf(g);
  const last = g.last
    ? {
        drawer: g.last.drawer,
        target: g.last.target,
        paired: g.last.paired,
        // 何を引いたかは、引いた人と引かれた人だけが知っている（組になって捨てたものは全員に見える）
        card: pid === g.last.drawer || pid === g.last.target ? g.last.card : null,
      }
    : null;
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    turn: g.turn,
    target,
    hand: seated ? g.hands[pid] : [],
    discards: g.discards,
    last,
    loser: g.loser,
    finished: g.finished,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      count: g.hands[p].length,
      place: g.finished.includes(p) ? g.finished.indexOf(p) + 1 : null,
      losses: g.losses[p],
    })),
  };
}

// ---- CPU ----
// どれを引くかは運まかせ
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const n = g.hands[targetOf(g)].length;
  return { type: 'draw', index: Math.floor(rng() * n) };
}
