// CPU（対戦相手・シミュレーション用）
//
// 基本は「お金重視」: 8文で国、6文で金、3文で銀。そこに王国から気に入った札を数枚まぜる。
// 選択を求められたときの答え方は、カードと場面ごとに決めておく（なければ無難な既定値）。
import { CARDS } from './cards/index.js';
import { candidates, isType } from './engine.js';

// 王国カードの使い方の目安。+行動を生む札は「つなぎ」、それ以外は「終端」（1手番に1枚しか使えない）
const AI = {
  sato: { chain: true, value: 3 },
  utage: { chain: true, value: 5 },
  ichi: { chain: true, value: 6 },
  onmyo: { chain: true, value: 7 },
  kura: { chain: true, value: 2 },
  jujutsu: { value: 10 },
  chougi: { value: 8 },
  shoko: { value: 7 },
  shakyo: { value: 7 },
  kebiishi: { value: 6 },
  gozen: { value: 4 },
  kanayama: { value: 4 },
  kanekashi: { value: 5 },
  zouei: { value: 3 },
  koubou: { value: 2 },
  gissha: { value: 4 },
  tera: { value: 3 },
  kekkai: { value: 3 },
  teien: { value: 0 },
};

const cost = id => CARDS[id].cost;

// strategy: 'normal'（王国の札も買う）/ 'money'（財宝と勝利点だけ）/ { favorites: [...] }（指定した札を軸にする）
export function makeBot(strategy = 'normal') {
  return function bot(g, pid, rng = Math.random) {
    if (g.phase !== 'play') return null;
    if (g.prompt) return g.prompt.p === pid ? { type: 'choose', answer: answerPrompt(g, pid, strategy) } : null;
    if (!g.turn || g.turn.p !== pid) return null;
    const t = g.turn;
    const hand = g.ps[pid].hand;
    if (t.phase === 'action' && t.actions > 0) {
      const pick = chooseAction(g, pid);
      if (pick) return { type: 'play', card: pick };
    }
    if (hand.some(id => isType(id, 'treasure') && !CARDS[id].play)) return { type: 'treasures' };
    if (t.buys > 0) {
      const b = chooseBuy(g, pid, strategy, rng);
      if (b) return { type: 'buy', card: b };
    }
    return { type: 'end' };
  };
}

export const bot = makeBot('normal');

function count(g, pid, id) {
  const ps = g.ps[pid];
  return [...ps.deck, ...ps.hand, ...ps.discard, ...ps.play].filter(c => c === id).length;
}

function useful(g, pid, id) {
  const hand = g.ps[pid].hand;
  if (id === 'kura') return hand.some(c => isType(c, 'victory') || isType(c, 'curse'));
  if (id === 'tera') return hand.some(c => trashScore(g, pid, c) > 0);
  if (id === 'kanekashi') return hand.includes('zeni');
  if (id === 'kanayama') return hand.includes('zeni') || hand.includes('gin');
  if (id === 'gozen') return hand.filter(c => isType(c, 'action') && c !== 'gozen').length > 0;
  if (id === 'zouei') return hand.some(c => c !== 'zouei');
  return true;
}

export function chooseAction(g, pid) {
  const actions = g.ps[pid].hand.filter(id => isType(id, 'action') && useful(g, pid, id));
  if (!actions.length) return null;
  const rank = id => (AI[id]?.chain ? 100 : 0) + (AI[id]?.value ?? 1);
  return actions.sort((a, b) => rank(b) - rank(a))[0];
}

// この CPU が狙う王国カード（ゲームごとに決まる）
function favorites(g, pid, strategy) {
  if (strategy === 'money') return [];
  if (strategy?.favorites) return strategy.favorites.filter(id => g.kingdom.includes(id));
  const ks = g.kingdom.filter(id => AI[id] && !isType(id, 'victory'));
  // プレイヤーごとに少しずつ好みを変える
  const salt = [...pid].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const terminals = ks.filter(id => !AI[id].chain).sort((a, b) => AI[b].value - AI[a].value + (((salt + a.length) % 3) - 1));
  const chains = ks.filter(id => AI[id].chain).sort((a, b) => AI[b].value - AI[a].value);
  return [...terminals.slice(0, 2), ...chains.slice(0, 1)];
}

function wants(g, pid, id, strategy) {
  const terminals = favorites(g, pid, strategy).filter(f => !AI[f]?.chain);
  const terminalCount = terminals.reduce((a, f) => a + count(g, pid, f), 0);
  if (!AI[id]?.chain) return terminalCount < 2 + Math.floor(totalCards(g, pid) / 12);
  return count(g, pid, id) < 4;
}

function totalCards(g, pid) {
  const ps = g.ps[pid];
  return ps.deck.length + ps.hand.length + ps.discard.length + ps.play.length;
}

export function chooseBuy(g, pid, strategy = 'normal') {
  const coins = g.turn.coins;
  const left = g.supply.kuni;
  const can = id => g.supply[id] > 0 && cost(id) <= coins;
  if (coins >= 8 && can('kuni')) return 'kuni';
  if (coins >= 5 && left <= 4 && can('shouen')) return 'shouen';
  if (coins >= 6 && can('kin')) return 'kin';
  const favs = favorites(g, pid, strategy).filter(id => can(id) && wants(g, pid, id, strategy));
  if (favs.length) return favs.sort((a, b) => cost(b) - cost(a))[0];
  if (coins >= 2 && left <= 2 && can('ta')) return 'ta';
  if (coins >= 3 && can('gin')) return 'gin';
  return null;
}

// 廃棄したい度合い（正なら捨てたい）
function trashScore(g, pid, id) {
  if (id === 'tatari') return 10;
  if (id === 'ta') return g.supply.kuni > 4 ? 6 : 0;
  if (id === 'zeni') return count(g, pid, 'gin') + count(g, pid, 'kin') * 2 >= 3 ? 4 : 0;
  return 0;
}

// 持っておきたい度合い（低いものから捨てる）
function keepScore(id) {
  if (isType(id, 'curse')) return -10;
  if (isType(id, 'victory') && !isType(id, 'action')) return -5;
  if (isType(id, 'treasure')) return CARDS[id].coin ?? 0;
  return 1 + (AI[id]?.value ?? 1) / 2;
}

function bestGain(g, pid, pr, strategy) {
  const cands = candidates(g, pr);
  if (!cands.length) return null;
  const pref = id => {
    if (id === 'kuni') return 100;
    if (id === 'kin') return 50;
    if (favorites(g, pid, strategy).includes(id) && wants(g, pid, id, strategy)) return 40 + cost(id);
    if (id === 'gin') return 30;
    if (id === 'shouen') return g.supply.kuni <= 4 ? 45 : 5;
    if (id === 'tatari') return -100;
    if (id === 'ta') return g.supply.kuni <= 2 ? 20 : -10;
    if (id === 'zeni') return -5;
    return cost(id);
  };
  const best = cands.sort((a, b) => pref(b) - pref(a))[0];
  return pr.min === 0 && pref(best) < 0 ? null : best;
}

function answerPrompt(g, pid, strategy) {
  const pr = g.prompt;
  const { card, step } = pr.then;
  const cands = candidates(g, pr);

  if (pr.kind === 'supply') return bestGain(g, pid, pr, strategy);
  if (pr.kind === 'option') {
    if (card === 'shoko') return g.turn.actions > 0 ? 'keep' : 'aside';
    return pr.options[0].value;
  }

  // 手札から選ぶ
  const pickBy = (score, filter = () => true) =>
    cands
      .filter(filter)
      .sort((a, b) => score(b) - score(a))
      .slice(0, pr.max);
  let picked;
  if (card === 'kura') picked = pickBy(id => -keepScore(id), id => keepScore(id) < 0);
  else if (card === 'tera') picked = pickBy(id => trashScore(g, pid, id), id => trashScore(g, pid, id) > 0);
  else if (card === 'kanekashi') picked = cands.slice(0, 1);
  else if (card === 'gozen') picked = [chooseActionFrom(cands.filter(id => id !== 'gozen')) ?? cands[0]].slice(0, 1);
  else if (card === 'kanayama') picked = cands.includes('gin') ? ['gin'] : cands.includes('zeni') ? ['zeni'] : [];
  else if (card === 'zouei' && step === 'trash') {
    const order = id => (id === 'tatari' ? 100 : id === 'kin' && g.supply.kuni > 0 ? 90 : id === 'ta' ? 80 : id === 'zeni' ? 50 : 10 - cost(id));
    picked = cands.sort((a, b) => order(b) - order(a)).slice(0, 1);
  } else {
    // 既定: 持っておきたくない札から最低限だけ（検非違使で捨てる、など）
    picked = cands.sort((a, b) => keepScore(a) - keepScore(b)).slice(0, pr.min);
  }
  if (picked.length < pr.min) {
    const rest = cands.slice();
    for (const id of picked) rest.splice(rest.indexOf(id), 1);
    picked = [...picked, ...rest.sort((a, b) => keepScore(a) - keepScore(b)).slice(0, pr.min - picked.length)];
  }
  return picked;
}

function chooseActionFrom(ids) {
  const rank = id => (AI[id]?.chain ? 100 : 0) + (AI[id]?.value ?? 1);
  return ids.sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

