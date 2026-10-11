// 大富豪のルール（画面に依存しない純粋なロジック）
//
// 採用ルール:
//   - 53枚（ジョーカー1枚）。強さは 3 < 4 < … < K < A < 2 < ジョーカー
//   - 出せる形: 1枚 / 同じ数字の複数枚 / 同じマークで3枚以上の連番（階段）
//   - ジョーカーは何にでもなれる。1枚出しのジョーカーは最強
//   - 8切り: 8を含む出し方をすると場が流れ、出した人からもう一度
//   - 革命: 同じ数字4枚以上 か 階段5枚以上 で強さが逆転（ジョーカー1枚出しは最強のまま）
//   - 一度パスしたら、場が流れるまで出せない
//   - 2ラウンド目以降はカード交換（大貧民→大富豪に最強2枚、大富豪→大貧民に最弱2枚、富豪⇔貧民は1枚）
import { GameError, shuffle } from '../../js/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣', X: '🃏' };
export const RANK_LABEL = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: 'JOKER' };
export const JOKER_RANK = 16;
export const TOTAL_ROUNDS = 4;

const TITLES = {
  3: ['大富豪', '平民', '大貧民'],
  4: ['大富豪', '富豪', '貧民', '大貧民'],
  5: ['大富豪', '富豪', '平民', '貧民', '大貧民'],
  6: ['大富豪', '富豪', '平民', '平民', '貧民', '大貧民'],
};

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 3; r <= 15; r++) deck.push({ id: s + r, s, r });
  deck.push({ id: 'JK', s: 'X', r: JOKER_RANK });
  return deck;
}

export function cardLabel(card) {
  return card.s === 'X' ? 'ジョーカー' : SUIT_MARK[card.s] + RANK_LABEL[card.r];
}

export function sortHand(cards) {
  return cards.slice().sort((a, b) => a.r - b.r || SUITS.indexOf(a.s) - SUITS.indexOf(b.s));
}

// 選んだカードの「解釈」を全部列挙する（ジョーカー入りの階段は複数の解釈がありうる）
// 戻り値: [{ type: 'single'|'group'|'seq', size, low, high }]
export function interpretations(cards) {
  const n = cards.length;
  if (n === 0) return [];
  const jokers = cards.filter(c => c.s === 'X').length;
  const real = cards.filter(c => c.s !== 'X');
  if (n === 1) {
    const r = cards[0].r;
    return [{ type: 'single', size: 1, low: r, high: r }];
  }
  const result = [];
  // 同じ数字の複数枚
  if (real.length > 0 && real.every(c => c.r === real[0].r)) {
    result.push({ type: 'group', size: n, low: real[0].r, high: real[0].r });
  }
  // 階段
  if (n >= 3 && real.length > 0 && real.every(c => c.s === real[0].s)) {
    const ranks = real.map(c => c.r).sort((a, b) => a - b);
    const distinct = new Set(ranks).size === ranks.length;
    const min = ranks[0];
    const max = ranks[ranks.length - 1];
    if (distinct && max - min + 1 <= n && jokers === n - real.length) {
      for (let low = Math.max(3, max - n + 1); low <= min; low++) {
        const high = low + n - 1;
        if (high > 15) break;
        result.push({ type: 'seq', size: n, low, high });
      }
    }
  }
  return result;
}

function isJokerSingle(combo) {
  return combo.type === 'single' && combo.low === JOKER_RANK;
}

export function beats(play, field, revolution) {
  if (!field) return true;
  if (play.type !== field.type || play.size !== field.size) return false;
  if (isJokerSingle(field)) return false;
  if (isJokerSingle(play)) return true;
  return revolution ? play.low < field.low : play.low > field.low;
}

// 場に出せる解釈のうち、いちばん強いものを返す（出せなければ null）
export function bestPlay(cards, field, revolution) {
  const options = interpretations(cards).filter(c => beats(c, field, revolution));
  if (options.length === 0) return null;
  options.sort((a, b) => (revolution ? a.low - b.low : b.low - a.low));
  return options[0];
}

function includesEight(combo) {
  return combo.type === 'seq' ? combo.low <= 8 && combo.high >= 8 : combo.low === 8;
}

function causesRevolution(combo) {
  return (combo.type === 'group' && combo.size >= 4) || (combo.type === 'seq' && combo.size >= 5);
}

function strength(card) {
  return card.r; // ジョーカーは 16 で最強
}

// ---- ゲームの進行 ----

export function setup(players, rng = Math.random) {
  const state = {
    players: players.map(p => p.id),
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    lastOrder: null,
    titles: {},
    log: [],
  };
  startRound(state, rng);
  return state;
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

function name(state, pid) {
  return state.names[pid] ?? '?';
}

function startRound(state, rng) {
  state.round += 1;
  state.phase = 'play';
  state.field = null;
  state.lastPlayer = null;
  state.passed = [];
  state.revolution = false;
  state.finished = [];
  state.exchanges = [];

  const n = state.players.length;
  const deck = shuffle(makeDeck(), rng);
  state.hands = Object.fromEntries(state.players.map(p => [p, []]));
  deck.forEach((card, i) => state.hands[state.players[i % n]].push(card));

  log(state, `── 第${state.round}ラウンド開始 ──`);

  if (state.lastOrder) {
    const order = state.lastOrder;
    exchange(state, order[order.length - 1], order[0], n >= 4 ? 2 : 1);
    if (n >= 4) exchange(state, order[order.length - 2], order[1], 1);
    state.turn = order[order.length - 1]; // 前回の大貧民から
  } else {
    state.turn = state.players.find(p => state.hands[p].some(c => c.id === 'D3')) ?? state.players[0];
  }
  for (const p of state.players) state.hands[p] = sortHand(state.hands[p]);
  log(state, `${name(state, state.turn)} さんの番から始まります`);
}

// 下位(poor)は最強のカードを、上位(rich)は最弱のカードを count 枚ずつ渡す
function exchange(state, poor, rich, count) {
  const fromPoor = sortHand(state.hands[poor]).slice(-count);
  const fromRich = sortHand(state.hands[rich]).slice(0, count);
  state.hands[poor] = state.hands[poor].filter(c => !fromPoor.includes(c)).concat(fromRich);
  state.hands[rich] = state.hands[rich].filter(c => !fromRich.includes(c)).concat(fromPoor);
  state.exchanges.push({ poor, rich, toRich: fromPoor.map(c => c.id), toPoor: fromRich.map(c => c.id) });
  log(state, `カード交換: ${name(state, poor)} → ${name(state, rich)} に ${count}枚、${name(state, rich)} → ${name(state, poor)} に ${count}枚`);
}

function isActive(state, pid) {
  return state.hands[pid].length > 0;
}

function nextActive(state, from, filter = () => true) {
  const n = state.players.length;
  const start = state.players.indexOf(from);
  for (let i = 1; i <= n; i++) {
    const p = state.players[(start + i) % n];
    if (isActive(state, p) && filter(p)) return p;
  }
  return null;
}

function clearField(state) {
  state.field = null;
  state.passed = [];
}

// 手番を次に進める。誰も返せないなら場を流す。
function advance(state, from) {
  const canRespond = p => !state.passed.includes(p) && p !== state.lastPlayer;
  const next = nextActive(state, from, canRespond);
  if (next) {
    state.turn = next;
    return;
  }
  clearField(state);
  state.turn = isActive(state, state.lastPlayer) ? state.lastPlayer : nextActive(state, state.lastPlayer);
  log(state, `場が流れました。${name(state, state.turn)} さんから`);
}

function finishRound(state) {
  const remaining = state.players.filter(p => isActive(state, p));
  for (const p of remaining) state.finished.push(p);
  const n = state.players.length;
  const titles = TITLES[n] ?? state.players.map((_, i) => `${i + 1}位`);
  state.titles = {};
  state.finished.forEach((p, i) => {
    state.titles[p] = titles[i];
    state.scores[p] += n - 1 - i;
  });
  state.lastOrder = state.finished.slice();
  state.turn = null;
  state.phase = state.round >= state.totalRounds ? 'gameEnd' : 'roundEnd';
  log(state, `第${state.round}ラウンド終了: ` + state.finished.map((p, i) => `${titles[i]} ${name(state, p)}`).join(' / '));
}

export function act(state, pid, action, rng = Math.random) {
  if (!state.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'next') {
    if (state.phase !== 'roundEnd') throw new GameError('まだ次のラウンドには進めません');
    startRound(state, rng);
    return;
  }
  if (state.phase !== 'play') throw new GameError('ラウンドは終了しています');
  if (state.turn !== pid) throw new GameError('あなたの番ではありません');

  if (type === 'pass') {
    if (!state.field) throw new GameError('場にカードがないときはパスできません');
    state.passed.push(pid);
    log(state, `${name(state, pid)}: パス`);
    advance(state, pid);
    return;
  }

  if (type === 'play') {
    const ids = Array.isArray(action.cards) ? action.cards : [];
    if (ids.length === 0 || new Set(ids).size !== ids.length) throw new GameError('カードを選んでください');
    const hand = state.hands[pid];
    const cards = ids.map(id => hand.find(c => c.id === id));
    if (cards.some(c => !c)) throw new GameError('手札にないカードです');
    const combo = bestPlay(cards, state.field, state.revolution);
    if (!combo) {
      throw new GameError(interpretations(cards).length === 0 ? 'その組み合わせは出せません' : '場のカードより強くありません');
    }

    state.hands[pid] = hand.filter(c => !ids.includes(c.id));
    state.field = { ...combo, cards: sortHand(cards), by: pid };
    state.lastPlayer = pid;
    log(state, `${name(state, pid)}: ${sortHand(cards).map(cardLabel).join(' ')}`);

    if (causesRevolution(combo)) {
      state.revolution = !state.revolution;
      log(state, state.revolution ? '⚡ 革命！ 強さが逆転しました' : '⚡ 革命返し！ 強さが元に戻りました');
    }
    if (state.hands[pid].length === 0) {
      state.finished.push(pid);
      log(state, `🎉 ${name(state, pid)} さんが上がりました（${state.finished.length}番目）`);
    }
    if (state.players.filter(p => isActive(state, p)).length <= 1) {
      finishRound(state);
      return;
    }
    if (includesEight(combo)) {
      clearField(state);
      state.turn = isActive(state, pid) ? pid : nextActive(state, pid);
      log(state, `✂ 8切り！ ${name(state, state.turn)} さんから`);
      return;
    }
    advance(state, pid);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  return {
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    me: seated ? pid : null,
    hand: seated ? state.hands[pid] : [],
    turn: state.turn,
    field: state.field,
    revolution: state.revolution,
    log: state.log.slice(-12),
    players: state.players.map(p => ({
      id: p,
      name: state.names[p],
      count: state.hands[p].length,
      passed: state.passed.includes(p),
      place: state.finished.indexOf(p) + 1 || null,
      title: state.titles[p] ?? null,
      score: state.scores[p],
    })),
    // 交換で自分が受け取ったカード（自分に関係するものだけ見せる）
    myExchange: seated
      ? state.exchanges
          .filter(e => e.poor === pid || e.rich === pid)
          .map(e => (e.poor === pid ? { got: e.toPoor, gave: e.toRich } : { got: e.toRich, gave: e.toPoor }))
      : [],
  };
}

// 手札から出せる候補をざっくり列挙する（テストの自動プレイや、将来のCPU用）
// 戻り値: カードIDの配列の配列
export function candidatePlays(hand, field, revolution) {
  const joker = hand.find(c => c.s === 'X');
  const byRank = new Map();
  for (const c of hand) if (c.s !== 'X') byRank.set(c.r, [...(byRank.get(c.r) ?? []), c]);
  const sets = [];
  if (joker) sets.push([joker]);
  for (const cards of byRank.values()) {
    for (let k = 1; k <= cards.length; k++) {
      sets.push(cards.slice(0, k));
      if (joker) sets.push([...cards.slice(0, k), joker]);
    }
  }
  for (const s of SUITS) {
    for (let low = 3; low <= 13; low++) {
      for (let len = 3; low + len - 1 <= 15; len++) {
        const picked = [];
        let missing = 0;
        for (let r = low; r < low + len; r++) {
          const c = hand.find(x => x.s === s && x.r === r);
          if (c) picked.push(c);
          else missing++;
        }
        if (missing === 0) sets.push(picked);
        else if (missing === 1 && joker) sets.push([...picked, joker]);
        else break;
      }
    }
  }
  return sets.filter(cards => bestPlay(cards, field, revolution)).map(cards => cards.map(c => c.id));
}
