// 嵐の航海（オリジナル協力ゲーム）
//
// みんなで1隻の船を港まで運ぶ。各航路では「大波」「突風」「濃霧」などの難所が待ち受ける。
// 全員が手札から1枚を伏せて出し（出さなくてもよい）、合計が必要値以上なら突破。
//   - 難所に合った種類のカードは数字そのまま、違う種類は 1 として数える
//   - 足りなければ船が傷つく。半分にも届かなければ大きな損傷
//   - カードを出した人だけ山札から1枚補充できる。山札は有限で、なくなったら補充なし
//   - 最後の「大嵐」はどの種類も数字そのままで数える
// 手札の数字を直接言うのは禁止。スタンプ（任せて／少しなら／無理）で意思疎通する。
import { GameError, shuffle } from '../../js/util.js';

export const TYPES = {
  helm: { label: '舵', icon: '🧭' },
  sail: { label: '帆', icon: '⛵' },
  lamp: { label: '灯', icon: '🏮' },
};

export const HAZARDS = {
  helm: { name: '大波', icon: '🌊', text: '舵さばきで波を越えろ' },
  sail: { name: '突風', icon: '🌪️', text: '帆を操って風をいなせ' },
  lamp: { name: '濃霧', icon: '🌫️', text: '灯りで航路を照らせ' },
  any: { name: '大嵐', icon: '⛈️', text: '最後の難所。どのカードも全力で数える' },
};

export const SIGNALS = {
  big: '🙆 任せて',
  small: '👌 少しなら',
  none: '🙅 無理',
};

export const TOTAL_LEGS = 8;
export const MAX_HP = 4;
// 1種類あたりの枚数。5人以上は山札を増やす（2〜4人: 計36枚、5〜6人: 計45枚）
export function valueCounts(n) {
  return n >= 5 ? { 1: 4, 2: 4, 3: 3, 4: 2, 5: 2 } : { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2 };
}

// 人数ごとの難しさ [通常の基本値, 最後の大嵐]。tests/arashi.test.js のシミュレーションで調整した値。
// 目安: 何も考えず出すと勝率2〜4割、うまく連携すると6割前後
export const DIFFICULTY = {
  2: [3, 10], 3: [6, 12], 4: [7, 18], 5: [9, 18], 6: [10, 17],
};

export function handSize(n) {
  return n <= 3 ? 5 : n <= 5 ? 4 : 3;
}

// 必要値: 人数と航路の進み具合で増える
export function requirement(n, leg, rng) {
  const [base, final] = DIFFICULTY[n] ?? DIFFICULTY[6];
  if (leg === TOTAL_LEGS) return final;
  return base + Math.floor((leg - 1) / 3) + Math.floor(rng() * 3);
}

export function makeDeck(n = 4) {
  const deck = [];
  for (const type of Object.keys(TYPES)) {
    for (const [value, count] of Object.entries(valueCounts(n))) {
      for (let i = 0; i < count; i++) deck.push({ id: `${type}${value}-${i}`, type, v: Number(value) });
    }
  }
  return deck;
}

export function cardValue(card, hazardType) {
  return hazardType === 'any' || card.type === hazardType ? card.v : 1;
}

export function setup(players, rng = Math.random) {
  const ids = players.map(p => p.id);
  const n = ids.length;
  const deck = shuffle(makeDeck(n), rng);
  const hands = {};
  for (const p of ids) hands[p] = deck.splice(0, handSize(n));

  const types = Object.keys(TYPES);
  const legs = [];
  for (let leg = 1; leg <= TOTAL_LEGS; leg++) {
    const type = leg === TOTAL_LEGS ? 'any' : types[Math.floor(rng() * types.length)];
    legs.push({ type, need: requirement(n, leg, rng) });
  }

  return {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    hands,
    deck,
    legs,
    leg: 1,
    hp: MAX_HP,
    plays: {},
    signals: {},
    phase: 'play',
    lastResult: null,
    log: ['⚓ 出航！ 港まで ' + TOTAL_LEGS + ' つの難所を越えよう'],
  };
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

export function act(state, pid, action) {
  if (!state.players.includes(pid)) throw new GameError('観戦中は操作できません');
  if (state.phase !== 'play') throw new GameError('航海は終わっています');
  const type = action?.type;

  if (type === 'signal') {
    if (action.signal !== null && !(action.signal in SIGNALS)) throw new GameError('不明なスタンプです');
    state.signals[pid] = action.signal;
    return;
  }
  if (type === 'commit') {
    if (action.card === null) {
      state.plays[pid] = null; // 出さない
    } else {
      if (!state.hands[pid].some(c => c.id === action.card)) throw new GameError('手札にないカードです');
      state.plays[pid] = action.card;
    }
    if (state.players.every(p => p in state.plays)) resolve(state);
    return;
  }
  if (type === 'undo') {
    delete state.plays[pid];
    return;
  }
  throw new GameError('不明な操作です');
}

function resolve(state) {
  const current = state.legs[state.leg - 1];
  const hazard = HAZARDS[current.type];
  let total = 0;
  const reveal = [];
  for (const p of state.players) {
    const id = state.plays[p];
    const card = id ? state.hands[p].find(c => c.id === id) : null;
    if (card) {
      total += cardValue(card, current.type);
      state.hands[p] = state.hands[p].filter(c => c.id !== id);
      if (state.deck.length > 0) state.hands[p].push(state.deck.shift());
    }
    reveal.push({ pid: p, card });
  }

  const success = total >= current.need;
  const damage = success ? 0 : total * 2 < current.need ? 2 : 1;
  state.hp = Math.max(0, state.hp - damage);
  state.lastResult = { leg: state.leg, type: current.type, need: current.need, total, success, damage, reveal };
  log(
    state,
    `${hazard.icon} ${hazard.name}（必要 ${current.need}）→ 合計 ${total}: ` +
      (success ? '突破！' : `失敗… 船に ${damage} ダメージ`),
  );

  state.plays = {};
  state.signals = {};
  if (state.hp <= 0) {
    state.phase = 'lost';
    log(state, '💥 船は沈んでしまった…');
  } else if (state.leg >= TOTAL_LEGS) {
    state.phase = 'won';
    log(state, '🏝️ 港に到着！ 航海成功！');
  } else {
    state.leg += 1;
  }
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  const current = state.legs[state.leg - 1];
  const next = state.legs[state.leg] ?? null;
  return {
    phase: state.phase,
    me: seated ? pid : null,
    hand: seated ? state.hands[pid] : [],
    myPlay: seated && pid in state.plays ? state.plays[pid] : undefined, // null = 出さないと決めた
    leg: state.leg,
    totalLegs: TOTAL_LEGS,
    hp: state.hp,
    maxHp: MAX_HP,
    deckCount: state.deck.length,
    current: { ...current, ...HAZARDS[current.type] },
    next: next ? { ...next, ...HAZARDS[next.type] } : null,
    lastResult: state.lastResult,
    log: state.log.slice(-12),
    players: state.players.map(p => ({
      id: p,
      name: state.names[p],
      count: state.hands[p].length,
      decided: p in state.plays,
      signal: state.signals[p] ?? null,
    })),
  };
}
