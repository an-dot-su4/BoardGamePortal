// 天下札（デッキ構築）: ゲームの進行
//
// 手番: 行動フェーズ（行動札を使う）→ 購入フェーズ（財宝を出して札を買う）→ 片付け（全部捨てて5枚引く）
// 国の山が尽きるか、山が3つ尽きたら終了。勝利点がいちばん多い人の勝ち（同点なら手番の少ない人）。
import { GameError, shuffle } from '../../js/util.js';
import { CARDS, KINGDOM, PRESETS, SETS } from './cards/index.js';
import {
  allCards, answer, candidates, card, draw, gain, HAND_SIZE, isType, log, nameOf, pushOps, run, take,
} from './engine.js';

export { bot } from './bot.js';

const KINGDOM_SIZE = 10;
const BASIC_TREASURES = ['zeni', 'gin', 'kin'];
const BASIC_VICTORY = ['ta', 'shouen', 'kuni'];

// ---- 設定（ロビー）----

export function normalizeOptions(o) {
  const ready = SETS.filter(s => s.ready).map(s => s.id);
  const sets = (Array.isArray(o?.sets) ? o.sets : []).filter(s => ready.includes(s));
  const kingdomIds = KINGDOM.map(c => c.id);
  const bans = [...new Set((Array.isArray(o?.bans) ? o.bans : []).filter(id => kingdomIds.includes(id)))];
  const preset = PRESETS.some(p => p.id === o?.preset) ? o.preset : 'random';
  return { sets: sets.length ? sets : ['heian'], preset, bans };
}

function available(options) {
  return KINGDOM.filter(c => options.sets.includes(c.set) && !options.bans.includes(c.id)).map(c => c.id);
}

export function validateOptions(o) {
  const options = normalizeOptions(o);
  const n = available(options).length;
  if (n < KINGDOM_SIZE) {
    return `BANが多すぎて、王国カードが${KINGDOM_SIZE}種そろいません（選んだ時代で使えるのは${n}種）。BANを減らすか、時代を増やしてください。`;
  }
  return null;
}

// 王国の10種を選ぶ。おすすめセットでBANされた札は、選んだ時代の札で埋める
export function pickKingdom(o, rng = Math.random) {
  const options = normalizeOptions(o);
  const pool = available(options);
  const preset = PRESETS.find(p => p.id === options.preset);
  const chosen = preset ? preset.cards.filter(id => !options.bans.includes(id)) : [];
  for (const id of shuffle(pool, rng)) {
    if (chosen.length >= KINGDOM_SIZE) break;
    if (!chosen.includes(id)) chosen.push(id);
  }
  if (chosen.length < KINGDOM_SIZE) throw new GameError(validateOptions(options));
  return chosen.sort((a, b) => card(a).cost - card(b).cost || card(a).name.localeCompare(card(b).name, 'ja'));
}

// ---- 準備 ----

export function setup(players, rng = Math.random, options = {}) {
  const ids = players.map(p => p.id);
  const n = ids.length;
  const kingdom = pickKingdom(options, rng);
  const victoryPile = n <= 2 ? 8 : 12;

  const supply = {
    zeni: 60 - 7 * n,
    gin: 40,
    kin: 30,
    ta: victoryPile,
    shouen: victoryPile,
    kuni: victoryPile,
  };
  // 祟りは、祟りを配る札があるときだけ置く
  if (kingdom.some(id => card(id).giver?.includes('tatari'))) supply.tatari = 10 * (n - 1);
  for (const id of kingdom) supply[id] = isType(id, 'victory') ? victoryPile : 10;

  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: ids.filter((_, i) => players[i].bot),
    kingdom,
    supply,
    trash: [],
    ps: {},
    stack: [],
    prompt: null,
    turn: null,
    turnNo: 0,
    phase: 'play',
    result: null,
    log: ['⛩️ 天下札、開始！ 王国: ' + kingdom.map(id => card(id).name).join('・')],
  };
  for (const pid of ids) {
    g.ps[pid] = { deck: shuffle([...Array(7).fill('zeni'), ...Array(3).fill('ta')], rng), hand: [], discard: [], play: [], aside: [], turns: 0 };
    draw(g, rng, pid, HAND_SIZE);
  }
  startTurn(g, ids[Math.floor(rng() * n)], rng);
  return g;
}

function startTurn(g, pid, rng) {
  g.turnNo += 1;
  g.turn = { p: pid, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [] };
  g.ps[pid].turns += 1;
  log(g, `── ${nameOf(g, pid)} の手番 ──`);
  run(g, rng);
}

// 片付け: 場と手札を捨てて5枚引き、次の人へ
function cleanup(g, rng) {
  const pid = g.turn.p;
  const ps = g.ps[pid];
  ps.discard.push(...ps.play, ...ps.hand);
  ps.play = [];
  ps.hand = [];
  draw(g, rng, pid, HAND_SIZE);
  if (isGameOver(g)) return finish(g);
  const next = g.players[(g.players.indexOf(pid) + 1) % g.players.length];
  startTurn(g, next, rng);
}

export function emptyPiles(g) {
  return Object.keys(g.supply).filter(id => g.supply[id] === 0);
}

function isGameOver(g) {
  return g.supply.kuni === 0 || emptyPiles(g).length >= 3;
}

export function score(g, pid) {
  const cards = allCards(g, pid);
  const total = cards.length;
  let vp = 0;
  for (const id of cards) {
    const v = card(id).vp;
    if (typeof v === 'function') vp += v({ total, cards });
    else if (typeof v === 'number') vp += v;
  }
  return vp;
}

function finish(g) {
  g.phase = 'over';
  g.turn = null;
  const rows = g.players.map(p => ({ id: p, vp: score(g, p), turns: g.ps[p].turns }));
  rows.sort((a, b) => b.vp - a.vp || a.turns - b.turns);
  const best = rows[0];
  g.result = rows.map(r => ({ ...r, win: r.vp === best.vp && r.turns === best.turns }));
  log(g, '🏯 終了！ ' + rows.map(r => `${nameOf(g, r.id)} ${r.vp}点`).join(' / '));
}

// ---- 操作 ----

function enterBuy(g) {
  if (g.turn.phase === 'action') g.turn.phase = 'buy';
}

function playTreasure(g, rng, pid, id) {
  take(g.ps[pid].hand, [id]);
  g.ps[pid].play.push(id);
  g.turn.coins += card(id).coin ?? 0;
  if (card(id).play) pushOps(g, { op: 'resolve', p: pid, card: id });
  run(g, rng);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'choose') return answer(g, rng, pid, action.answer);
  if (g.phase !== 'play') throw new GameError('ゲームは終わりました');
  if (g.prompt) throw new GameError(g.prompt.p === pid ? '先に選択をしてください' : `${nameOf(g, g.prompt.p)} の選択を待っています`);
  if (g.turn.p !== pid) throw new GameError('あなたの手番ではありません');
  const t = g.turn;
  const hand = g.ps[pid].hand;

  if (type === 'play') {
    const id = action.card;
    if (!hand.includes(id)) throw new GameError('手札にない札です');
    if (isType(id, 'treasure') && !isType(id, 'action')) {
      enterBuy(g);
      return playTreasure(g, rng, pid, id);
    }
    if (!isType(id, 'action')) throw new GameError('その札は使えません');
    if (t.phase !== 'action') throw new GameError('購入フェーズでは行動札を使えません');
    if (t.actions < 1) throw new GameError('行動がもう残っていません');
    t.actions -= 1;
    take(hand, [id]);
    g.ps[pid].play.push(id);
    log(g, `${nameOf(g, pid)}: ${card(id).name}`);
    pushOps(g, { op: 'resolve', p: pid, card: id });
    return run(g, rng);
  }

  if (type === 'treasures') {
    enterBuy(g);
    // 選択の要らない財宝をまとめて出す
    for (const id of hand.filter(c => isType(c, 'treasure') && !card(c).play)) {
      take(hand, [id]);
      g.ps[pid].play.push(id);
      t.coins += card(id).coin ?? 0;
    }
    return;
  }

  if (type === 'buy') {
    const id = action.card;
    if (!(id in g.supply)) throw new GameError('その札は売っていません');
    if (g.supply[id] <= 0) throw new GameError('その山はもう空です');
    enterBuy(g);
    if (t.buys < 1) throw new GameError('購入がもう残っていません');
    if (t.coins < card(id).cost) throw new GameError(`お金が足りません（${card(id).cost}文必要）`);
    t.coins -= card(id).cost;
    t.buys -= 1;
    gain(g, pid, id);
    t.bought.push(id);
    log(g, `${nameOf(g, pid)}: ${card(id).name}を購入`);
    return;
  }

  if (type === 'end') {
    if (t.phase === 'action') {
      t.phase = 'buy';
      return;
    }
    return cleanup(g, rng);
  }

  throw new GameError('不明な操作です');
}

// ---- 見せる情報 ----

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const pr = g.prompt;
  // 自分あての選択だけ、選べる候補つきで見せる（then には他人の情報が入りうるので渡さない）
  const myPrompt = pr && pr.p === pid ? { ...pr, then: undefined, card: pr.then.card, cands: candidates(g, pr) } : null;
  return {
    phase: g.phase,
    me: seated ? pid : null,
    turn: g.turn,
    turnNo: g.turnNo,
    kingdom: g.kingdom,
    supply: g.supply,
    trashCount: g.trash.length,
    trashTop: g.trash[g.trash.length - 1] ?? null,
    hand: seated ? g.ps[pid].hand.slice().sort(handOrder) : [],
    prompt: myPrompt,
    waitingFor: pr && pr.p !== pid ? pr.p : null,
    result: g.result,
    log: g.log.slice(-14),
    players: g.players.map(p => {
      const ps = g.ps[p];
      return {
        id: p,
        name: g.names[p],
        bot: g.bots.includes(p),
        deck: ps.deck.length,
        hand: ps.hand.length,
        discard: ps.discard.length,
        discardTop: ps.discard[ps.discard.length - 1] ?? null,
        play: ps.play,
        aside: ps.aside,
        total: allCards(g, p).length,
        vp: g.phase === 'over' ? score(g, p) : null,
      };
    }),
    myCards: seated ? countCards(allCards(g, pid)) : null,
  };
}

const TYPE_ORDER = ['action', 'treasure', 'victory', 'curse'];
function handOrder(a, b) {
  const ta = TYPE_ORDER.findIndex(t => isType(a, t));
  const tb = TYPE_ORDER.findIndex(t => isType(b, t));
  return ta - tb || card(b).cost - card(a).cost || a.localeCompare(b);
}

function countCards(ids) {
  const counts = {};
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

// 画面・テスト用
export { CARDS, KINGDOM, PRESETS, SETS, BASIC_TREASURES, BASIC_VICTORY };
