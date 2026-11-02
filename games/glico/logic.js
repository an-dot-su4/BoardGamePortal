// 疾走グリコ（2人用）
//
// 毎ラウンド、二人が同時にじゃんけんの手を選ぶ。勝った人は、勝った手で決まるサイコロを振って、目の合計だけ進む。
//   グー: 面が1,2,3のサイコロを6個 / チョキ: 面が2,4,5を3個 / パー: 面が8,9,10を1個
// 止まったマスがイベントマスならスキルを1つ得る（6種からランダム）。先にゴール（超えてもよい）した人の勝ち。
// スキルは条件を満たすと自動で発動して消える。
//   永続（スロット1）: 使うまで残る。決まった手で勝つと発動
//   瞬間（スロット2）: 勝敗がついた2回のうちに勝てば発動。2回とも負けると消える。あいこは数えない
import { GameError } from '../../js/util.js';

export const HANDS = {
  rock: { name: 'グー', icon: '✊', faces: [1, 2, 3], count: 6 },
  scissors: { name: 'チョキ', icon: '✌️', faces: [2, 4, 5], count: 3 },
  paper: { name: 'パー', icon: '🖐️', faces: [8, 9, 10], count: 1 },
};
const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

export const SKILLS = {
  omake: { name: 'おまけ付きグー', kind: 'perm', hand: 'rock', icon: '🎁', text: 'グーで勝つと発動。グーのサイコロの面が 2,2,3 になる（1の面が2になる）。' },
  itachoco: { name: '板チョコ追加', kind: 'perm', hand: 'scissors', icon: '🍫', text: 'チョキで勝つと発動。チョキのサイコロが4個になる。' },
  pine: { name: 'パイナツプル大盛り', kind: 'perm', hand: 'paper', icon: '🍍', text: 'パーで勝つと発動。パーの出目に+2。' },
  oikaze: { name: '追い風ダッシュ', kind: 'inst', icon: '💨', text: '勝つと発動。すべての目を+1。' },
  hagure: { name: 'はぐれ目倍増', kind: 'inst', icon: '✨', text: '勝って、ちょうど2つ同じ目の組があるとき発動。どれとも被っていない目をすべて×2。' },
  oomata: { name: '大股ジャンプ', kind: 'inst', icon: '🦵', text: '勝つと発動。いちばん大きい目の半分（切り上げ）を足す。' },
};
export const INST_TURNS = 2; // 瞬間スキルが残る、勝敗のついた回数

export const GOALS = [50, 100, 150];

export function normalizeOptions(o) {
  return { goal: GOALS.includes(Number(o?.goal)) ? Number(o.goal) : 100 };
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// イベントマスを2〜4マスおきに置く（スタートとゴールには置かない）
export function placeEvents(goal, rng) {
  const events = [];
  for (let p = randInt(rng, 2, 4); p < goal; p += randInt(rng, 2, 4)) events.push(p);
  return events;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length !== 2) throw new GameError('疾走グリコは2人で遊びます');
  const { goal } = normalizeOptions(options);
  const ids = players.map(p => p.id);
  return {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    goal,
    events: placeEvents(goal, rng),
    pos: Object.fromEntries(ids.map(p => [p, 0])),
    slots: Object.fromEntries(ids.map(p => [p, { perm: null, inst: null }])),
    hands: Object.fromEntries(ids.map(p => [p, null])),
    rounds: 0, // 勝敗のついた回数
    seq: 0, // じゃんけんを公開した回数（画面の演出用の通し番号）
    last: null,
    phase: 'play',
    winner: null,
    log: ['🏃 よーい、スタート！'],
  };
}

function log(g, text) {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
}

const nameOf = (g, pid) => g.names[pid] ?? '?';

// サイコロを振る。永続スキルでサイコロが変わり、瞬間スキルで出目が変わる。
// 戻り値: { faces, dice（振った目）, final（補正後の目）, bonus, mods（発動したスキルの説明）, usedPerm, usedInst }
export function roll(hand, slots, rng) {
  const base = HANDS[hand];
  let faces = base.faces.slice();
  let count = base.count;
  const mods = [];
  let usedPerm = null;
  const perm = slots.perm ? SKILLS[slots.perm] : null;
  if (perm && perm.hand === hand) {
    usedPerm = slots.perm;
    if (slots.perm === 'omake') faces = faces.map(f => (f === 1 ? 2 : f));
    if (slots.perm === 'itachoco') count += 1;
  }
  const dice = Array.from({ length: count }, () => faces[Math.floor(rng() * faces.length)]);
  let final = dice.slice();
  if (usedPerm === 'pine') final = final.map(d => d + 2);
  if (usedPerm) mods.push(`${SKILLS[usedPerm].icon}${SKILLS[usedPerm].name}`);

  let bonus = 0;
  let usedInst = null;
  const inst = slots.inst?.id ?? null;
  if (inst === 'oikaze') {
    final = final.map(d => d + 1);
    usedInst = inst;
  } else if (inst === 'hagure') {
    const n = {};
    for (const d of final) n[d] = (n[d] ?? 0) + 1;
    const hasPair = Object.values(n).some(c => c === 2);
    const singles = final.some(d => n[d] === 1);
    if (hasPair && singles) {
      final = final.map(d => (n[d] === 1 ? d * 2 : d));
      usedInst = inst;
    }
  } else if (inst === 'oomata') {
    bonus = Math.ceil(Math.max(...final) / 2);
    usedInst = inst;
  }
  if (usedInst) mods.push(`${SKILLS[usedInst].icon}${SKILLS[usedInst].name}`);
  return { faces, dice, final, bonus, mods, usedPerm, usedInst, total: final.reduce((a, b) => a + b, 0) + bonus };
}

function resolve(g, rng) {
  const [a, b] = g.players;
  const ha = g.hands[a];
  const hb = g.hands[b];
  g.seq += 1;
  g.hands = { [a]: null, [b]: null };
  const hands = { [a]: ha, [b]: hb };
  if (ha === hb) {
    g.last = { seq: g.seq, hands, draw: true };
    log(g, `あいこ（${HANDS[ha].name}）`);
    return;
  }
  const w = BEATS[ha] === hb ? a : b;
  const hand = hands[w];
  g.rounds += 1;
  const r = roll(hand, g.slots[w], rng);
  const from = g.pos[w];
  const to = Math.min(g.goal, from + r.total);
  g.pos[w] = to;

  // スキルの消費と、瞬間スキルの残り回数
  if (r.usedPerm) g.slots[w].perm = null;
  if (r.usedInst) g.slots[w].inst = null;
  const expired = [];
  for (const p of g.players) {
    const inst = g.slots[p].inst;
    if (!inst) continue;
    inst.left -= 1;
    if (inst.left <= 0) {
      expired.push({ p, skill: inst.id });
      g.slots[p].inst = null;
    }
  }

  // イベントマスに止まったらスキルを得る（同じ種類のスロットは上書き）
  let gained = null;
  if (to < g.goal && g.events.includes(to)) {
    const ids = Object.keys(SKILLS);
    const id = ids[Math.floor(rng() * ids.length)];
    if (SKILLS[id].kind === 'perm') g.slots[w].perm = id;
    else g.slots[w].inst = { id, left: INST_TURNS };
    gained = id;
  }

  g.last = { seq: g.seq, hands, draw: false, winner: w, hand, dice: r.dice, final: r.final, bonus: r.bonus, mods: r.mods, total: r.total, from, to, gained, expired };
  log(g, `${nameOf(g, w)}: ${HANDS[hand].name}で勝って${r.total}マス進む（${from}→${to}）${r.mods.length ? ' ' + r.mods.join('・') : ''}`);
  for (const e of expired) log(g, `${nameOf(g, e.p)}: ${SKILLS[e.skill].name}は使えずに消えた`);
  if (gained) log(g, `${nameOf(g, w)}: イベントマス！ ${SKILLS[gained].icon}${SKILLS[gained].name}を手に入れた`);
  if (to >= g.goal) {
    g.phase = 'over';
    g.winner = w;
    log(g, `🏁 ${nameOf(g, w)} がゴール！`);
  }
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  if (action?.type === 'restart') {
    if (g.phase !== 'over') throw new GameError('まだゲーム中です');
    const next = setup(g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p) })), rng, { goal: g.goal });
    Object.assign(g, next);
    return;
  }
  if (g.phase !== 'play') throw new GameError('ゲームは終わりました');
  if (action?.type !== 'hand') throw new GameError('不明な操作です');
  if (!HANDS[action.hand]) throw new GameError('グー・チョキ・パーから選んでください');
  g.hands[pid] = action.hand; // 相手が出すまでは出し直せる
  if (g.players.every(p => g.hands[p])) resolve(g, rng);
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    me: seated ? pid : null,
    goal: g.goal,
    events: g.events,
    seq: g.seq,
    last: g.last,
    winner: g.winner,
    myHand: seated ? g.hands[pid] : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      pos: g.pos[p],
      left: g.goal - g.pos[p],
      ready: !!g.hands[p], // 手を選んだかどうかだけ（どの手かは見せない）
      slots: g.slots[p],
    })),
  };
}

// CPU: 手はほぼランダム。グーをやや多めに、持っている永続スキルの手を少し多めに出す
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.hands[pid]) return null;
  const w = { rock: 0.4, scissors: 0.3, paper: 0.3 };
  const perm = g.slots[pid].perm;
  if (perm) w[SKILLS[perm].hand] += 0.15;
  let x = rng() * (w.rock + w.scissors + w.paper);
  for (const h of ['rock', 'scissors', 'paper']) {
    if ((x -= w[h]) < 0) return { type: 'hand', hand: h };
  }
  return { type: 'hand', hand: 'paper' };
}
