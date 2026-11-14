// 神経衰弱（昔からあるトランプの記憶遊び）
//
// 採用ルール:
//   - トランプを裏向きに並べる（標準は A〜8 の32枚。ロビーで A〜5 の20枚・52枚全部）
//   - 手番では2枚めくる。同じ数字ならその2枚をもらって、もう一度めくれる
//   - 違ったら2枚は表のまま次の人の手番になり、次の人が2枚目をめくるときに裏に戻る（全員が覚える時間）
//   - 全部なくなったら終わり。多く取った人の勝ち（同数なら同点で勝ち）
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };
export const SIZES = { 20: 5, 32: 8, 52: 13 }; // 枚数 → 使う数字の上限
export const CPU_LEVELS = { weak: '弱い（よく忘れる）', normal: 'ふつう', strong: '強い（ほぼ覚えている）' };
const MEMORY = { weak: 0.45, normal: 0.75, strong: 0.95 };

export function normalizeOptions(o) {
  return {
    size: Number(o?.size) in SIZES ? Number(o.size) : 32,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'normal',
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
export const cardLabel = c => SUIT_MARK[c.s] + RANK_LABEL[c.r];

export function makeDeck(size) {
  const max = SIZES[size];
  const deck = [];
  for (const s of SUITS) for (let r = 1; r <= max; r++) deck.push({ s, r });
  return deck;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 6) throw new GameError('神経衰弱は2〜6人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    first: 0,
    games: 1,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startGame(g, rng);
  return g;
}

function startGame(g, rng) {
  g.cards = shuffle(makeDeck(g.options.size), rng); // 位置 i のカード
  g.owner = g.cards.map(() => null); // 取った人
  g.open = []; // 今の手番でめくった位置
  g.shown = []; // 外れて表のままの2枚（次にめくるとき裏に戻す）
  g.seen = {}; // 一度でも表になった位置 → 数字（CPUの記憶のもと。view には出さない）
  g.taken = Object.fromEntries(g.players.map(p => [p, 0]));
  g.turnIndex = g.first;
  g.turn = g.players[g.first];
  g.streak = 0;
  g.phase = 'play';
  g.winners = null;
  g.last = null;
  log(g, `第${g.games}局（${g.cards.length}枚）。${name(g, g.turn)} さんから`);
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

  if (type !== 'flip') throw new GameError('不明な操作です');
  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  const i = action.index;
  if (!Number.isInteger(i) || i < 0 || i >= g.cards.length) throw new GameError('そのカードはめくれません');
  if (g.owner[i] !== null) throw new GameError('そのカードはもう取られています');
  if (g.open.includes(i)) throw new GameError('そのカードはもうめくっています');

  g.open.push(i);
  g.seen[i] = g.cards[i].r;
  g.seq++;
  if (g.open.length < 2) return;

  g.shown = []; // 前の人の外れは、2枚目をめくったときに裏に戻す（それまでは見て覚えられる）
  const [a, b] = g.open;
  g.open = [];
  if (g.cards[a].r === g.cards[b].r) {
    g.owner[a] = pid;
    g.owner[b] = pid;
    delete g.seen[a];
    delete g.seen[b];
    g.taken[pid] += 2;
    g.streak++;
    g.last = { by: pid, cards: [a, b], hit: true };
    log(g, `🎉 ${name(g, pid)}: ${cardLabel(g.cards[a])} と ${cardLabel(g.cards[b])} をそろえた！${g.streak > 1 ? `（${g.streak}連続）` : ''}`);
    if (g.owner.every(o => o !== null)) {
      g.phase = 'end';
      g.turn = null;
      const top = Math.max(...g.players.map(p => g.taken[p]));
      g.winners = g.players.filter(p => g.taken[p] === top);
      for (const w of g.winners) g.wins[w]++;
      log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top / 2}組）`);
    }
    return;
  }
  g.shown = [a, b];
  g.last = { by: pid, cards: [a, b], hit: false };
  g.streak = 0;
  g.turnIndex = (g.turnIndex + 1) % g.players.length;
  g.turn = g.players[g.turnIndex];
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const visible = new Set([...g.open, ...g.shown]);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    turn: g.turn,
    open: g.open,
    shown: g.shown,
    last: g.last,
    winners: g.winners,
    // 裏向きのカードは中身を送らない
    cards: g.cards.map((c, i) => (g.owner[i] !== null || visible.has(i) || g.phase === 'end' ? { ...c, owner: g.owner[i] } : null)),
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), taken: g.taken[p], wins: g.wins[p] })),
  };
}

// ---- CPU ----
// 一度表になった場所を、強さに応じた確率で覚えている
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const p = MEMORY[g.options.cpu];
  const memory = {};
  for (const [i, r] of Object.entries(g.seen)) {
    const idx = Number(i);
    if (g.open.includes(idx) || rng() < p) memory[idx] = r;
  }
  const free = g.cards.map((_, i) => i).filter(i => g.owner[i] === null && !g.open.includes(i));
  const unknown = free.filter(i => !(i in memory));
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  if (g.open.length === 1) {
    const r = g.cards[g.open[0]].r;
    const match = free.find(i => memory[i] === r);
    if (match !== undefined) return { type: 'flip', index: match };
    return { type: 'flip', index: unknown.length ? pick(unknown) : pick(free) };
  }
  // 覚えている中にペアがあればその1枚目
  const byRank = {};
  for (const i of free) if (i in memory) (byRank[memory[i]] ??= []).push(i);
  const pair = Object.values(byRank).find(list => list.length >= 2);
  if (pair) return { type: 'flip', index: pair[0] };
  return { type: 'flip', index: unknown.length ? pick(unknown) : pick(free) };
}
