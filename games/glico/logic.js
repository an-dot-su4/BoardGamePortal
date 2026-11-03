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

export const CPU_LEVELS = { weak: '弱い（ほぼランダム）', strong: '強い（スキルを読む）' };

export function normalizeOptions(o) {
  return {
    goal: GOALS.includes(Number(o?.goal)) ? Number(o.goal) : 100,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'weak',
  };
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
  const { goal, cpu } = normalizeOptions(options);
  const ids = players.map(p => p.id);
  return {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    goal,
    cpu,
    events: placeEvents(goal, rng),
    pos: Object.fromEntries(ids.map(p => [p, 0])),
    slots: Object.fromEntries(ids.map(p => [p, { perm: null, inst: null }])),
    hands: Object.fromEntries(ids.map(p => [p, null])),
    history: Object.fromEntries(ids.map(p => [p, []])), // 公開された手（直近12回。強いCPUが相手の癖を読むのに使う）
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
  const { faces, count, usedPerm } = diceSpec(hand, slots);
  const dice = Array.from({ length: count }, () => faces[Math.floor(rng() * faces.length)]);
  return { faces, ...score(slots, dice, usedPerm) };
}

// 勝った手と永続スキルから、振るサイコロ（面と個数）を決める
function diceSpec(hand, slots) {
  const base = HANDS[hand];
  let faces = base.faces.slice();
  let count = base.count;
  let usedPerm = null;
  const perm = slots.perm ? SKILLS[slots.perm] : null;
  if (perm && perm.hand === hand) {
    usedPerm = slots.perm;
    if (slots.perm === 'omake') faces = faces.map(f => (f === 1 ? 2 : f));
    if (slots.perm === 'itachoco') count += 1;
  }
  return { faces, count, usedPerm };
}

// 振った目に、永続（パイナツプル）と瞬間スキルの補正をかけて合計を出す
function score(slots, dice, usedPerm) {
  const mods = [];
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
  return { dice, final, bonus, mods, usedPerm, usedInst, total: final.reduce((a, b) => a + b, 0) + bonus };
}

// その手で勝ったときの進み（平均・最小）。サイコロの出目をすべて数え上げる（最大 3^6 通り）。強いCPUが使う
const advanceCache = new Map();
export function expectedAdvance(hand, slots) {
  const key = `${hand}|${slots.perm ?? ''}|${slots.inst?.id ?? ''}`;
  if (advanceCache.has(key)) return advanceCache.get(key);
  const { faces, count, usedPerm } = diceSpec(hand, slots);
  let sum = 0;
  let min = Infinity;
  let n = 0;
  const dice = Array(count);
  const walk = i => {
    if (i === count) {
      const t = score(slots, dice, usedPerm).total;
      sum += t;
      min = Math.min(min, t);
      n += 1;
      return;
    }
    for (const f of faces) {
      dice[i] = f;
      walk(i + 1);
    }
  };
  walk(0);
  const result = { mean: sum / n, min };
  advanceCache.set(key, result);
  return result;
}

function resolve(g, rng) {
  const [a, b] = g.players;
  const ha = g.hands[a];
  const hb = g.hands[b];
  g.seq += 1;
  g.hands = { [a]: null, [b]: null };
  const hands = { [a]: ha, [b]: hb };
  for (const p of g.players) {
    const h = (g.history ??= {})[p] ??= [];
    h.push(hands[p]);
    if (h.length > 12) h.shift();
  }
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
    const next = setup(g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p) })), rng, { goal: g.goal, cpu: g.cpu });
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

// CPU。ロビーの設定で強さを選ぶ
//   弱い: 手はほぼランダム。グーをやや多めに、持っている永続スキルの手を少し多めに出す
//   強い: 双方のスキルから「勝ったら何マス進むか」を計算し、相手の出しそうな手を読んで迎え撃つ（読み切られないようランダムも混ぜる）
export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.hands[pid]) return null;
  if (g.cpu === 'strong') return { type: 'hand', hand: pick(strongWeights(g, pid), rng) };
  const w = { rock: 0.4, scissors: 0.3, paper: 0.3 };
  const perm = g.slots[pid].perm;
  if (perm) w[SKILLS[perm].hand] += 0.15;
  return { type: 'hand', hand: pick(w, rng) };
}

function pick(w, rng) {
  let x = rng() * (w.rock + w.scissors + w.paper);
  for (const h of ['rock', 'scissors', 'paper']) {
    if ((x -= w[h]) < 0) return h;
  }
  return 'paper';
}

const HAND_IDS = ['rock', 'scissors', 'paper'];
const LOSES_TO = { rock: 'paper', scissors: 'rock', paper: 'scissors' }; // その手に勝つ手

// 1回勝ったときの価値（ゴールに届くなら大きく、届くかもしれないなら少し上乗せ）
function winValue(adv, left) {
  if (adv.min >= left) return 100;
  if (adv.mean >= left) return adv.mean + 15;
  return adv.mean;
}

// 強いCPUの手の出しやすさ。テストでも使う
export function strongWeights(g, pid, { temp = 3, random = 0.2 } = {}) {
  const opp = g.players.find(p => p !== pid);
  const myLeft = g.goal - g.pos[pid];
  const oppLeft = g.goal - g.pos[opp];
  const mine = Object.fromEntries(HAND_IDS.map(h => [h, winValue(expectedAdvance(h, g.slots[pid]), myLeft)]));
  const theirs = Object.fromEntries(HAND_IDS.map(h => [h, winValue(expectedAdvance(h, g.slots[opp]), oppLeft)]));
  // 相手は、勝ったときに大きく進める手を出しやすいと読む
  const softmax = v => {
    const m = Math.max(...HAND_IDS.map(h => v[h]));
    const e = Object.fromEntries(HAND_IDS.map(h => [h, Math.exp((v[h] - m) / temp)]));
    const z = HAND_IDS.reduce((a, h) => a + e[h], 0);
    return Object.fromEntries(HAND_IDS.map(h => [h, e[h] / z]));
  };
  // 相手の手の予想 = スキルからの読み と これまでに出した手の癖（新しいほど重く）を半々に混ぜる
  const skillP = softmax(theirs);
  const past = g.history?.[opp] ?? [];
  const freq = { rock: 1, scissors: 1, paper: 1 };
  past.forEach((h, i) => (freq[h] += 0.7 + (i / Math.max(1, past.length)) * 0.6));
  const fz = freq.rock + freq.scissors + freq.paper;
  const habit = Math.min(0.6, past.length / 10);
  const oppP = Object.fromEntries(HAND_IDS.map(h => [h, (1 - habit) * skillP[h] + habit * (freq[h] / fz)]));
  // 自分の手の評価 = 相手が負ける手を出す確率×自分の進み − 相手が勝つ手を出す確率×相手の進み
  const value = Object.fromEntries(HAND_IDS.map(h => [h, oppP[BEATS[h]] * mine[h] - oppP[LOSES_TO[h]] * theirs[LOSES_TO[h]]]));
  const counterP = softmax(value);
  // 自分のスキルが生きる手も少し出す（読み合いの材料になる）
  const ownP = softmax(mine);
  return Object.fromEntries(HAND_IDS.map(h => [h, (1 - random) * (0.75 * counterP[h] + 0.25 * ownP[h]) + random / 3]));
}
