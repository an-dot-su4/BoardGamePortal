// ほしならべ（協力・リアルタイム）
//
// 1〜100 の星カードが配られる。全員の星を、小さい順に1枚ずつ場に並べていく。
// 順番は決まっていない。「今だ」と思った人が自分のいちばん小さい星を出す。
// 数字を言ったり、合図で順番を決めたりするのは禁止。間合いだけで息を合わせる。
//   - 誰かがもっと小さい星を持っていたら失敗。ライフが1減り、それより小さい星は全部捨てられる
//   - 全員の手札がなくなればレベルクリア。次のレベルでは1人あたりの枚数が1枚増える
//   - 流れ星: 全員が賛成すると、全員がいちばん小さい星を1枚ずつ公開して捨てる
import { GameError, shuffle } from '../../js/util.js';

// 人数ごとのクリア目標レベル（tests/hoshi.test.js のシミュレーションで調整）
export const GOAL = { 2: 9, 3: 7, 4: 6, 5: 5, 6: 4 };
// レベルクリア時のごほうび
export const REWARDS = { 2: 'star', 3: 'life', 5: 'star', 6: 'life', 8: 'star' };
export const MAX_LIVES = 5;
export const MAX_STARS = 3;

export function setup(players, rng = Math.random) {
  const ids = players.map(p => p.id);
  const state = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    goal: GOAL[ids.length] ?? 6,
    level: 0,
    lives: Math.min(ids.length, MAX_LIVES),
    stars: 1,
    lastEvent: null,
    log: [],
  };
  startLevel(state, 1, rng);
  return state;
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 30) state.log.splice(0, state.log.length - 30);
}

function startLevel(state, level, rng) {
  state.level = level;
  const deck = shuffle(Array.from({ length: 100 }, (_, i) => i + 1), rng);
  state.hands = Object.fromEntries(state.players.map(p => [p, deck.splice(0, level).sort((a, b) => a - b)]));
  state.pile = [];
  state.phase = 'ready';
  state.ready = [];
  state.starVotes = [];
  log(state, `✨ レベル${level}: 1人${level}枚。全員が「集中」したら始まります`);
}

function lowestHeld(state, except) {
  let min = Infinity;
  for (const p of state.players) if (p !== except && state.hands[p].length) min = Math.min(min, state.hands[p][0]);
  return min;
}

function totalCards(state) {
  return state.players.reduce((a, p) => a + state.hands[p].length, 0);
}

export function act(state, pid, action, rng = Math.random) {
  if (!state.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;
  if (state.phase === 'won' || state.phase === 'lost') {
    if (type !== 'restart') throw new GameError('ゲームは終わりました');
    const fresh = setup(state.players.map(p => ({ id: p, name: state.names[p] })), rng);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, fresh);
    return;
  }

  if (type === 'ready') {
    if (state.phase !== 'ready') throw new GameError('今は集中の時間ではありません');
    if (!state.ready.includes(pid)) state.ready.push(pid);
    if (state.ready.length === state.players.length) {
      state.phase = 'play';
      state.ready = [];
    }
    return;
  }

  if (type === 'play') {
    if (state.phase !== 'play') throw new GameError('全員が集中してから始まります');
    const hand = state.hands[pid];
    if (!hand.length) throw new GameError('もう星がありません');
    // 二重タップ対策: 画面が見ていた数字と違えば無視させる
    if (action.card !== undefined && action.card !== hand[0]) throw new GameError('その星はもう出ています');
    const card = hand.shift();
    state.pile.push({ card, by: pid });
    const lower = lowestHeld(state, pid);
    if (lower < card) {
      // 失敗: 出した星より小さいものを全部捨てる
      const dropped = [];
      for (const p of state.players) {
        for (const c of state.hands[p]) if (c < card) dropped.push({ card: c, by: p });
        state.hands[p] = state.hands[p].filter(c => c > card);
      }
      dropped.sort((a, b) => a.card - b.card);
      state.lives -= 1;
      state.lastEvent = { kind: 'miss', card, by: pid, dropped };
      log(state, `💥 ${state.names[pid]} さんの ${card} より小さい星があった！（${dropped.map(d => d.card).join(', ')}） ライフ −1`);
      if (state.lives <= 0) {
        state.phase = 'lost';
        log(state, '🌑 ライフがなくなりました…');
        return;
      }
      if (totalCards(state) > 0) {
        state.phase = 'ready';
        state.ready = [];
        state.starVotes = [];
        return;
      }
    } else {
      state.lastEvent = { kind: 'ok', card, by: pid };
    }
    if (totalCards(state) === 0) clearLevel(state, rng);
    return;
  }

  if (type === 'star') {
    if (state.phase !== 'play' && state.phase !== 'ready') throw new GameError('今は使えません');
    if (state.stars <= 0) throw new GameError('流れ星がありません');
    if (state.starVotes.includes(pid)) state.starVotes = state.starVotes.filter(p => p !== pid);
    else state.starVotes.push(pid);
    if (state.starVotes.length === state.players.length) useStar(state, rng);
    return;
  }

  throw new GameError('不明な操作です');
}

function useStar(state, rng) {
  state.stars -= 1;
  state.starVotes = [];
  const shown = [];
  for (const p of state.players) {
    if (state.hands[p].length) shown.push({ card: state.hands[p].shift(), by: p });
  }
  state.lastEvent = { kind: 'star', shown };
  log(state, `🌠 流れ星！ みんなのいちばん小さい星: ${shown.map(s => `${state.names[s.by]} ${s.card}`).join(' / ')}`);
  if (totalCards(state) === 0) clearLevel(state, rng);
}

function clearLevel(state, rng) {
  const cleared = state.level;
  let reward = '';
  if (REWARDS[cleared] === 'star' && state.stars < MAX_STARS) {
    state.stars += 1;
    reward = '（ごほうび: 流れ星 +1）';
  } else if (REWARDS[cleared] === 'life' && state.lives < MAX_LIVES) {
    state.lives += 1;
    reward = '（ごほうび: ライフ +1）';
  }
  log(state, `🎉 レベル${cleared} クリア！${reward}`);
  if (cleared >= state.goal) {
    state.phase = 'won';
    log(state, '🌌 すべてのレベルをクリア！ 星空が完成しました！');
    return;
  }
  startLevel(state, cleared + 1, rng);
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  return {
    phase: state.phase,
    me: seated ? pid : null,
    hand: seated ? state.hands[pid] : [],
    level: state.level,
    goal: state.goal,
    lives: state.lives,
    stars: state.stars,
    pile: state.pile.slice(-8),
    lastEvent: state.lastEvent,
    starVotes: state.starVotes.length,
    myStarVote: state.starVotes.includes(pid),
    log: state.log.slice(-10),
    players: state.players.map(p => ({
      id: p,
      name: state.names[p],
      count: state.hands[p].length,
      ready: state.ready.includes(p),
    })),
  };
}
