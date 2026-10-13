// わいわいすごろく
//
// サイコロを振ってゴールを目指す。止まったマスでイベントが起きる。
// 「？」マスではイベントカードを引く（全員に影響するカードも）。
// ゴールにはちょうどの目でなくてもOK。最初にゴールした人の勝ち。
import { GameError, shuffle } from '../../js/util.js';

export const GOAL = 40;

// マスの種類（0 = スタート、GOAL = ゴール）
export const SPACE_TYPES = {
  plain: { icon: '', label: '' },
  fwd: { icon: '⏩', label: '2マス進む' },
  back: { icon: '⏪', label: '3マス戻る' },
  card: { icon: '❓', label: 'カードを引く' },
  rest: { icon: '💤', label: '1回休み' },
  again: { icon: '🎲', label: 'もう1回' },
  warp: { icon: '🌀', label: 'ワープ' },
  coin: { icon: '🪙', label: 'コイン+1' },
};

// 盤面は固定（毎回同じ盤で遊ぶ）
const LAYOUT = {
  3: 'card', 5: 'coin', 6: 'fwd', 8: 'card', 10: 'rest', 12: 'coin', 13: 'card', 15: 'warp', 17: 'back',
  18: 'card', 20: 'again', 22: 'coin', 23: 'card', 25: 'back', 27: 'fwd', 28: 'card', 30: 'rest', 31: 'coin',
  33: 'card', 34: 'warp', 36: 'back', 37: 'card', 38: 'coin',
};
export const WARPS = { 15: 24, 34: 26 }; // ワープ先（34 は落とし穴）

export function board() {
  return Array.from({ length: GOAL + 1 }, (_, i) => (i === 0 || i === GOAL ? 'plain' : LAYOUT[i] ?? 'plain'));
}

export const CARDS = [
  { id: 'go3', text: '追い風！ 3マス進む' },
  { id: 'go5', text: '近道を発見！ 5マス進む' },
  { id: 'back2', text: '忘れ物… 2マス戻る' },
  { id: 'back4', text: '道に迷った… 4マス戻る' },
  { id: 'again', text: 'ラッキー！ もう1回サイコロを振る' },
  { id: 'rest', text: '昼寝してしまった… 1回休み' },
  { id: 'swapLast', text: 'いちばん後ろの人と位置を入れ替える' },
  { id: 'leaderBack', text: '先頭の人は3マス戻る（自分が先頭なら自分）' },
  { id: 'allFwd', text: 'お祭りだ！ 全員1マス進む' },
  { id: 'allBack', text: '大雨… 自分以外の全員が1マス戻る' },
  { id: 'coin2', text: '宝箱！ コイン+2' },
  { id: 'gift', text: 'おすそわけ。自分以外の全員にコイン+1' },
  { id: 'pull', text: 'いちばん後ろの人を自分の位置まで連れてくる' },
  { id: 'jump', text: '次のカードマスまでジャンプ' },
];

export function setup(players, rng = Math.random) {
  const ids = players.map(p => p.id);
  return {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    pos: Object.fromEntries(ids.map(p => [p, 0])),
    coins: Object.fromEntries(ids.map(p => [p, 0])),
    rest: Object.fromEntries(ids.map(p => [p, 0])),
    turn: ids[0],
    deck: shuffle(CARDS.map(c => c.id), rng),
    phase: 'play',
    lastRoll: null,
    lastCard: null,
    undo: null, // 振り直し用（view には出さない。山札の順番が入っているため）
    winner: null,
    turnCount: 0,
    log: [`🏁 スタート！ ${players[0].name} さんから`],
  };
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

const name = (state, pid) => state.names[pid] ?? '?';

function move(state, pid, steps) {
  state.pos[pid] = Math.max(0, Math.min(GOAL, state.pos[pid] + steps));
}

function nextPlayer(state, from) {
  const i = state.players.indexOf(from);
  for (let k = 1; k <= state.players.length; k++) {
    const p = state.players[(i + k) % state.players.length];
    if (state.rest[p] > 0) {
      state.rest[p] -= 1;
      log(state, `💤 ${name(state, p)} さんはお休み`);
      continue;
    }
    return p;
  }
  return from; // 全員休みなら自分
}

function drawCard(state, rng) {
  if (state.deck.length === 0) state.deck = shuffle(CARDS.map(c => c.id), rng);
  return state.deck.pop();
}

function standings(state) {
  return state.players.slice().sort((a, b) => state.pos[b] - state.pos[a]);
}

// マスの効果を適用する。戻り値: もう1回振れるか
function applySpace(state, pid, rng, depth = 0) {
  if (depth > 3 || state.pos[pid] >= GOAL) return false;
  const type = board()[state.pos[pid]];
  if (type === 'fwd') {
    move(state, pid, 2);
    log(state, `⏩ 2マス進む`);
    return applySpace(state, pid, rng, depth + 1);
  }
  if (type === 'back') {
    move(state, pid, -3);
    log(state, `⏪ 3マス戻る`);
    return applySpace(state, pid, rng, depth + 1);
  }
  if (type === 'rest') {
    state.rest[pid] += 1;
    log(state, `💤 次の番は1回休み`);
  }
  if (type === 'again') {
    log(state, `🎲 もう1回！`);
    return true;
  }
  if (type === 'coin') {
    state.coins[pid] += 1;
    log(state, `🪙 コイン+1`);
  }
  if (type === 'warp') {
    const to = WARPS[state.pos[pid]];
    log(state, to > state.pos[pid] ? `🌀 ワープ！ ${to}マス目へ` : `🌀 落とし穴！ ${to}マス目へ`);
    state.pos[pid] = to;
    return false;
  }
  if (type === 'card') return applyCard(state, pid, drawCard(state, rng), rng, depth);
  return false;
}

function applyCard(state, pid, cardId, rng, depth) {
  const card = CARDS.find(c => c.id === cardId);
  state.lastCard = { id: cardId, by: pid };
  log(state, `❓ カード「${card.text}」`);
  const others = state.players.filter(p => p !== pid);
  const order = standings(state);
  const last = order[order.length - 1];
  switch (cardId) {
    case 'go3': move(state, pid, 3); return applySpace(state, pid, rng, depth + 1);
    case 'go5': move(state, pid, 5); return applySpace(state, pid, rng, depth + 1);
    case 'back2': move(state, pid, -2); return false;
    case 'back4': move(state, pid, -4); return false;
    case 'again': return true;
    case 'rest': state.rest[pid] += 1; return false;
    case 'swapLast': {
      if (last !== pid) [state.pos[pid], state.pos[last]] = [state.pos[last], state.pos[pid]];
      return false;
    }
    case 'leaderBack': move(state, order[0], -3); return false;
    case 'allFwd': for (const p of state.players) move(state, p, 1); return false;
    case 'allBack': for (const p of others) move(state, p, -1); return false;
    case 'coin2': state.coins[pid] += 2; return false;
    case 'gift': for (const p of others) state.coins[p] += 1; return false;
    case 'pull': if (state.pos[last] < state.pos[pid]) state.pos[last] = state.pos[pid]; return false;
    case 'jump': {
      const b = board();
      let i = state.pos[pid] + 1;
      while (i < GOAL && b[i] !== 'card') i++;
      state.pos[pid] = i;
      return false; // 着いたマスのカードは引かない
    }
  }
  return false;
}

// コインの使い道: 3枚でサイコロを振り直す
export const REROLL_COST = 3;

export function act(state, pid, action, rng = Math.random) {
  if (!state.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (state.phase !== 'over') throw new GameError('ゲーム中です');
    const fresh = setup(state.players.map(p => ({ id: p, name: state.names[p] })), rng);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, fresh);
    return;
  }
  if (state.phase !== 'play') throw new GameError('ゲームは終わりました');
  if (state.turn !== pid) throw new GameError('あなたの番ではありません');

  if (type === 'roll' || type === 'reroll') {
    let roll;
    if (type === 'reroll') {
      if (!state.lastRoll || state.lastRoll.by !== pid || !state.lastRoll.canReroll) throw new GameError('振り直しできません');
      if (state.undo.coins[pid] < REROLL_COST) throw new GameError(`コインが${REROLL_COST}枚必要です`);
      // 振る前の状態に戻してから（カードで動いた他の人も元どおり）コインを払う
      Object.assign(state, structuredClone(state.undo));
      state.coins[pid] -= REROLL_COST;
      log(state, `🪙 ${name(state, pid)} さんがコインで振り直し！`);
    } else if (state.lastRoll?.by === pid && state.lastRoll.canReroll) {
      // 振り直しせずに次の人へ進むときは 'end'
      throw new GameError('「このまま進む」か「振り直す」を選んでください');
    }
    state.undo = structuredClone({ pos: state.pos, coins: state.coins, rest: state.rest, deck: state.deck, lastCard: state.lastCard });
    state.lastCard = null; // 前の人のカード表示を消す
    roll = 1 + Math.floor(rng() * 6);
    const from = state.pos[pid];
    move(state, pid, roll);
    log(state, `🎲 ${name(state, pid)}: ${roll} → ${state.pos[pid]}マス目`);
    const again = applySpace(state, pid, rng);
    state.turnCount += 1;
    if (state.pos[pid] >= GOAL) {
      state.phase = 'over';
      state.winner = pid;
      state.lastRoll = { by: pid, roll, from, to: state.pos[pid], canReroll: false };
      log(state, `🏆 ${name(state, pid)} さんがゴール！`);
      return;
    }
    // コインがあれば、結果を見てから振り直すか選べる（振り直しは1ターン1回）
    // 振る前に持っていたコインで判定する（このターンに拾ったコインは使えない）
    const canReroll = type === 'roll' && state.undo.coins[pid] >= REROLL_COST && !again;
    state.lastRoll = { by: pid, roll, from, to: state.pos[pid], canReroll };
    if (again) {
      state.lastRoll.canReroll = false;
      return; // 同じ人がもう一度
    }
    if (!canReroll) state.turn = nextPlayer(state, pid);
    return;
  }

  if (type === 'end') {
    if (!state.lastRoll || state.lastRoll.by !== pid || !state.lastRoll.canReroll) throw new GameError('まだサイコロを振っていません');
    state.lastRoll.canReroll = false;
    state.turn = nextPlayer(state, pid);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  return {
    phase: state.phase,
    me: seated ? pid : null,
    turn: state.turn,
    board: board(),
    goal: GOAL,
    warps: WARPS,
    lastRoll: state.lastRoll,
    lastCard: state.lastCard ? { ...state.lastCard, text: CARDS.find(c => c.id === state.lastCard.id).text } : null,
    winner: state.winner,
    rerollCost: REROLL_COST,
    log: state.log.slice(-12),
    players: state.players.map((p, i) => ({
      id: p,
      name: state.names[p],
      color: i,
      pos: state.pos[p],
      coins: state.coins[p],
      rest: state.rest[p],
    })),
  };
}
