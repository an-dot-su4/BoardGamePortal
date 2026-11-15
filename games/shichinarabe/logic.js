// 七並べ（おなじみのトランプ遊び）
//
// 採用ルール:
//   - 52枚（ジョーカーなし）を全員に配る。7はすべて最初に場へ出す。◆7を持っていた人から始める
//   - 手番では、場のカードのとなり（同じマークで数字が1つ違う）のカードを1枚出す。出せても出さずにパスしてよい
//   - パスは3回まで（ロビーで1・5回）。それを超えてパスすると脱落し、手札は全部場の決まった位置に置かれる
//   - 手札がなくなった順に上がり。脱落した人は、早く脱落した人ほど下の順位
//   - A と K はつながらない（トンネルなし）
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };
export const PASS_LIMITS = [1, 3, 5];
export const CPU_LEVELS = { weak: '弱い（出せたら出す）', strong: '強い（止めるのも考える）' };

export function normalizeOptions(o) {
  return {
    passes: PASS_LIMITS.includes(Number(o?.passes)) ? Number(o.passes) : 3,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'strong',
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
export const cardLabel = c => SUIT_MARK[c.s] + RANK_LABEL[c.r];
const sortHand = cards => cards.slice().sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || a.r - b.r);

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ id: s + r, s, r });
  return deck;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 3 || players.length > 6) throw new GameError('七並べは3〜6人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    games: 1,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startGame(g, rng);
  return g;
}

function startGame(g, rng) {
  const deck = shuffle(makeDeck(), rng);
  // 配り始めを毎局ずらす
  const offset = (g.games - 1) % g.players.length;
  g.hands = Object.fromEntries(g.players.map(p => [p, []]));
  deck.forEach((c, i) => g.hands[g.players[(i + offset) % g.players.length]].push(c));
  g.board = Object.fromEntries(SUITS.map(s => [s, Array(14).fill(false)])); // board[s][r]
  let starter = g.players[0];
  for (const p of g.players) {
    for (const c of g.hands[p].filter(c => c.r === 7)) {
      g.board[c.s][7] = true;
      if (c.s === 'D') starter = p;
    }
    g.hands[p] = sortHand(g.hands[p].filter(c => c.r !== 7));
  }
  g.passes = Object.fromEntries(g.players.map(p => [p, 0]));
  g.finished = []; // 上がった順
  g.out = []; // 脱落した順
  g.turn = starter;
  g.phase = 'play';
  g.last = null;
  g.ranking = null;
  log(g, `第${g.games}局。7を並べました。◆7を持っていた ${name(g, starter)} さんから`);
  // 7しか持っていなかった人はすぐ上がり（まれ）
  for (const p of g.players) if (g.hands[p].length === 0) g.finished.push(p);
  if (g.hands[g.turn].length === 0) advance(g, g.turn);
}

export function canPlay(board, c) {
  if (board[c.s][c.r]) return false;
  return (c.r < 13 && board[c.s][c.r + 1]) || (c.r > 1 && board[c.s][c.r - 1]);
}

export const playable = (g, p) => g.hands[p].filter(c => canPlay(g.board, c));

const active = (g, p) => !g.finished.includes(p) && !g.out.includes(p);

function advance(g, from) {
  const live = g.players.filter(p => active(g, p));
  if (live.length <= 1) return finish(g);
  let i = g.players.indexOf(from);
  for (let k = 0; k < g.players.length; k++) {
    i = (i + 1) % g.players.length;
    if (active(g, g.players[i])) {
      g.turn = g.players[i];
      return;
    }
  }
}

function finish(g) {
  const live = g.players.filter(p => active(g, p));
  // 最後に残った人は上がりの次。脱落した人は後に脱落した人ほど上
  g.ranking = [...g.finished, ...live, ...g.out.slice().reverse()];
  g.phase = 'end';
  g.turn = null;
  g.wins[g.ranking[0]]++;
  log(g, `🏆 ${name(g, g.ranking[0])} さんが1位！`);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    g.games++;
    startGame(g, rng);
    g.seq++;
    return;
  }

  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');

  if (type === 'play') {
    const card = g.hands[pid].find(c => c.id === action.card);
    if (!card) throw new GameError('手札にないカードです');
    if (!canPlay(g.board, card)) throw new GameError('そのカードは場のとなりではないので出せません');
    g.hands[pid] = g.hands[pid].filter(c => c !== card);
    g.board[card.s][card.r] = true;
    g.last = { by: pid, card, kind: 'play' };
    g.seq++;
    if (g.hands[pid].length === 0) {
      g.finished.push(pid);
      log(g, `🎉 ${name(g, pid)} さんが上がり！（${g.finished.length}番目）`);
    }
    advance(g, pid);
    return;
  }

  if (type === 'pass') {
    g.passes[pid]++;
    g.seq++;
    if (g.passes[pid] > g.options.passes) {
      for (const c of g.hands[pid]) g.board[c.s][c.r] = true;
      log(g, `💀 ${name(g, pid)} さんはパスの回数を超えて脱落。手札${g.hands[pid].length}枚を場に置きました`);
      g.last = { by: pid, kind: 'out', cards: g.hands[pid] };
      g.hands[pid] = [];
      g.out.push(pid);
    } else {
      log(g, `${name(g, pid)}: パス（${g.passes[pid]}/${g.options.passes}）`);
      g.last = { by: pid, kind: 'pass' };
    }
    advance(g, pid);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    passLimit: g.options.passes,
    hand: seated ? g.hands[pid] : [],
    playable: seated && g.turn === pid ? playable(g, pid).map(c => c.id) : [],
    board: g.board,
    turn: g.turn,
    last: g.last,
    ranking: g.ranking,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      count: g.hands[p].length,
      passes: g.passes[p],
      place: g.finished.includes(p) ? g.finished.indexOf(p) + 1 : null,
      out: g.out.includes(p),
      wins: g.wins[p],
    })),
  };
}

// ---- CPU ----

// そのカードを出すと、自分の手札のうち「先につながる」枚数（多いほど自分のためになる）
function ownGain(hand, c) {
  const dir = c.r > 7 ? 1 : -1;
  let n = 0;
  for (let r = c.r + dir; r >= 1 && r <= 13; r += dir) if (hand.some(h => h.s === c.s && h.r === r)) n++;
  return n;
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const cards = playable(g, pid);
  if (!cards.length) return { type: 'pass' };
  if (g.options.cpu === 'weak') return { type: 'play', card: cards[Math.floor(rng() * cards.length)].id };
  const hand = g.hands[pid];
  const scored = cards.map(c => ({ c, v: ownGain(hand, c) + (c.r === 1 || c.r === 13 ? 1.5 : 0) + rng() * 0.5 }));
  scored.sort((a, b) => b.v - a.v);
  // 出しても相手が得するだけで、パスに余裕があるなら、ときどき止めておく
  const left = g.options.passes - g.passes[pid];
  if (scored[0].v < 0.6 && left >= 2 && hand.length > 3 && rng() < 0.5) return { type: 'pass' };
  return { type: 'play', card: scored[0].c.id };
}
