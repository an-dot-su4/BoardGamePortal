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
  // 鎌倉
  monomi: { chain: true, value: 3 },
  shugo: { chain: true, value: 2 },
  ryoshi: { chain: true, value: 6 },
  hikitsuke: { chain: true, value: 4 },
  mihari: { chain: true, value: 3 },
  gokenin: { chain: true, value: 5 },
  monzen: { chain: true, value: 6 },
  akutou: { value: 5 },
  sousen: { value: 6 },
  toimaru: { value: 8 },
  genkou: { value: 8 },
  shikken: { value: 5 },
  // 室町（財宝の札は行動を使わないので chain 扱い）
  za: { chain: true, value: 6 },
  chanoyu: { value: 5 },
  jisha: { value: 4 },
  kangou: { chain: true, value: 5 },
  shugodaimyo: { value: 7 },
  machishu: { chain: true, value: 6 },
  kuramoto: { value: 6 },
  nougaku: { chain: true, value: 8 },
  sakaya: { chain: true, value: 4 },
  kinkaku: { value: 8 },
  dosou: { chain: true, value: 6 },
  shichifuku: { value: 5 },
  // 戦国
  ochimusha: { chain: false, value: 0 },
  yakedera: { value: 0 },
  arechi: { value: 0 },
  haison: { chain: true, value: 0 },
  rakuichi: { chain: true, value: 4 },
  katanagari: { chain: true, value: 4 },
  yamashiro: { chain: true, value: 5 },
  randori: { value: 6 },
  gekokujo: { value: 4 },
  chigyou: { value: 0 },
  kobutsu: { chain: true, value: 6 },
  nobushi: { chain: true, value: 6 },
  ikkou: { value: 8 },
  yakiuchi: { value: 5 },
  shinobi: { value: 6 },
  takagari: { value: 7 },
  // 江戸
  shukuba: { chain: true, value: 3 },
  touryou: { chain: true, value: 2 },
  yose: { chain: true, value: 5 },
  kabuki: { chain: true, value: 5 },
  bantou: { chain: true, value: 5 },
  ryougae: { chain: true, value: 6 },
  echigoya: { value: 5 },
  ukiyoe: { value: 6 },
  sankin: { value: 8 },
  ishiya: { value: 2 },
  machiisha: { value: 3 },
  daikan: { value: 5 },
  watari: { value: 6 },
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
    if (hand.some(id => isType(id, 'treasure') && !isType(id, 'action'))) return { type: 'treasures' };
    if (t.buys > 0) {
      // 蓄えを使えば一段上の札に届くなら、1つずつ使う
      const coffers = g.ps[pid].coffers ?? 0;
      if (coffers > 0) {
        const goals = ['gosho' in g.supply ? 11 : 0, 'ohban' in g.supply ? 9 : 0, 8, 6].filter(Boolean);
        if (goals.some(goal => t.coins < goal && t.coins + coffers >= goal)) return { type: 'coffer' };
      }
      const b = chooseBuy(g, pid, strategy, rng);
      // 棟梁は、余った文を全部多く払って銀にする（最後の購入のとき）
      if (b === 'touryou' && t.buys === 1) return { type: 'buy', card: b, overpay: t.coins - CARDS[b].cost };
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
  if (id === 'gekokujo') return hand.some(c => isType(c, 'action') && c !== 'gekokujo');
  if (id === 'gozen' || id === 'shichifuku') return hand.filter(c => isType(c, 'action') && c !== 'gozen' && c !== 'shichifuku').length > 0;
  if (id === 'zouei') return hand.some(c => c !== 'zouei');
  // 執権は手札を全部捨てるので、お金の少ない手札のときだけ
  if (id === 'shikken') return hand.reduce((a, c) => a + (CARDS[c].coin ?? 0), 0) <= 3;
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
  const ks = g.kingdom.filter(id => AI[id] && AI[id].value > 0 && !isType(id, 'victory'));
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
  // つなぎの札（+行動）も、財宝の代わりに買いすぎると弱くなるので2枚まで
  return count(g, pid, id) < 2;
}

function totalCards(g, pid) {
  const ps = g.ps[pid];
  return ps.deck.length + ps.hand.length + ps.discard.length + ps.play.length;
}

export function chooseBuy(g, pid, strategy = 'normal') {
  const coins = g.turn.coins;
  const left = g.supply.kuni;
  const can = id => g.supply[id] > 0 && cost(id) <= coins && CARDS[id].canBuy?.(g, pid) !== false;
  // 室町の大判・御所がある卓: 11文で御所、9文で大判
  if ('gosho' in g.supply) {
    if (can('gosho')) return 'gosho';
    if (coins >= 9 && can('ohban') && g.supply.gosho > 3) return 'ohban';
  }
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
  if (isType(id, 'ruins')) return 8;
  if (id === 'yamashiro') return 7; // 廃棄しても手札に戻る
  if (id === 'ta') return g.supply.kuni > 4 ? 6 : 0;
  if (id === 'zeni') return count(g, pid, 'gin') + count(g, pid, 'kin') * 2 >= 3 ? 4 : 0;
  return 0;
}

// 持っておきたい度合い（低いものから捨てる）
function keepScore(id) {
  if (isType(id, 'curse')) return -10;
  if (isType(id, 'ruins')) return -3;
  if (isType(id, 'victory') && !isType(id, 'action')) return -5;
  if (isType(id, 'treasure')) return CARDS[id].coin ?? 0;
  return 1 + (AI[id]?.value ?? 1) / 2;
}

function bestGain(g, pid, pr, strategy) {
  const cands = candidates(g, pr);
  if (!cands.length) return null;
  const pref = id => {
    if (id === 'gosho') return 110;
    if (id === 'kuni') return 100;
    if (id === 'ohban') return 60;
    if (id === 'kin') return 50;
    if (favorites(g, pid, strategy).includes(id) && wants(g, pid, id, strategy)) return 40 + cost(id);
    if (id === 'gin') return 30;
    if (id === 'shouen') return g.supply.kuni <= 4 ? 45 : 5;
    if (id === 'tatari') return -100;
    if (id === 'ruins') return -50;
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
  if (card === 'jisha' && step === 'otherTrash') return cands.filter(id => trashScore(g, pid, id) > 0).slice(0, 1);
  if (card === 'kuramoto' && step === 'swap') {
    const junk = cands.filter(id => keepScore(id) <= 0).sort((a, b) => keepScore(a) - keepScore(b));
    return junk.length >= 2 ? junk.slice(0, 2) : [];
  }
  if (pr.kind === 'name') {
    // 町医者は廃棄したい札、渡り職人は手札に要らない札の名前を言う
    const mine = new Set([...g.ps[pid].deck, ...g.ps[pid].discard]);
    const pool = cands.filter(id => mine.has(id));
    const list = pool.length ? pool : cands;
    return list.sort((a, b) => (card === 'machiisha' ? trashScore(g, pid, b) - trashScore(g, pid, a) : 0) || keepScore(a) - keepScore(b))[0];
  }
  if (pr.kind === 'list' && card === '_order') return cands.sort((a, b) => keepScore(a) - keepScore(b))[0]; // 要らない札を下に
  if (pr.kind === 'list' && card === 'bantou') return cands.sort((a, b) => keepScore(b) - keepScore(a))[0];
  if (pr.kind === 'list' && card === 'kabuki') return cands.sort((a, b) => keepScore(b) - keepScore(a))[0]; // 相手の一番良い札を捨てさせる
  if (pr.kind === 'list' && card === 'yakiuchi') return cands.sort((a, b) => keepScore(b) - keepScore(a))[0]; // 相手の一番良い札
  if (pr.kind === 'list' && card === 'shinobi' && step === 'steal') return cands.sort((a, b) => cost(b) - cost(a))[0];
  if (pr.kind === 'list' && card === 'shinobi') return cands.sort((a, b) => keepScore(a) - keepScore(b))[0];
  if (pr.kind === 'list') {
    // 見張り: 廃棄は捨てたい札、捨て札は持っておきたくない札から
    if (step === 'trash') return cands.sort((a, b) => trashScore(g, pid, b) - trashScore(g, pid, a) || keepScore(a) - keepScore(b))[0];
    return cands.sort((a, b) => keepScore(a) - keepScore(b))[0];
  }
  if (pr.kind === 'option') {
    if (card === 'shoko') return g.turn.actions > 0 ? 'keep' : 'aside';
    if (card === 'ikkou') return 'yes';
    if (card === 'takagari') return 'shouen';
    if (card === 'machiisha') {
      const id = pr.then.data.card;
      return trashScore(g, pid, id) > 0 ? 'trash' : keepScore(id) <= 1 ? 'discard' : 'back';
    }
    if (card === 'echigoya') {
      const base = CARDS[pr.then.data.from].cost;
      const max = pr.options.length - 1;
      const target = base + max >= 8 ? 8 : base + max >= 6 ? 6 : base;
      return Math.max(0, Math.min(max, target - base));
    }
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
  else if (card === 'gozen' || card === 'shichifuku') picked = [chooseActionFrom(cands.filter(id => id !== 'gozen' && id !== 'shichifuku')) ?? cands[0]].slice(0, 1);
  else if (card === 'daikan') picked = cands.includes('gin') ? ['gin'] : cands.includes('zeni') ? ['zeni'] : [];
  else if (card === 'ishiya') picked = cands.sort((a, b) => trashScore(g, pid, b) - trashScore(g, pid, a) || keepScore(a) - keepScore(b)).slice(0, 1);
  else if (card === 'yose') picked = cands.includes('zeni') ? ['zeni'] : [];
  else if (card === 'echigoya') picked = cands.filter(id => trashScore(g, pid, id) > 0 || id === 'kin').sort((a, b) => trashScore(g, pid, b) - trashScore(g, pid, a)).slice(0, 1);
  else if (card === 'katanagari' || card === 'kobutsu') picked = cands.sort((a, b) => trashScore(g, pid, b) - trashScore(g, pid, a) || keepScore(a) - keepScore(b)).slice(0, 1);
  else if (card === 'gekokujo') picked = cands.filter(id => id !== 'gekokujo').sort((a, b) => (AI[a]?.value ?? 1) - (AI[b]?.value ?? 1)).slice(0, 1);
  else if (card === 'kuramoto') picked = cands.filter(id => keepScore(id) < 0);
  else if (card === 'jisha') picked = cands.sort((a, b) => trashScore(g, pid, b) - trashScore(g, pid, a) || keepScore(a) - keepScore(b)).slice(0, 1);
  else if (card === 'shugo') {
    // 今使えない行動札があれば預ける。なければ一番要らない札
    const idle = g.turn.actions === 0 ? cands.filter(id => isType(id, 'action')) : [];
    picked = (idle.length ? idle : cands.sort((a, b) => keepScore(a) - keepScore(b))).slice(0, 1);
  } else if (card === 'genkou') picked = cands.sort((a, b) => keepScore(b) - keepScore(a)).slice(0, pr.min); // 良い札を山札に戻す
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

