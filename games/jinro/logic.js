// 人狼（簡易版・GM不要）
//
// 夜: 人狼は襲う相手を、占い師は占う相手を、騎士は守る相手を選ぶ。村人も「眠る」を押す（誰が役職か悟られないため）。
//     1日目の夜は襲撃なし。
// 昼: 犠牲者が発表され、話し合ってから投票。最多票の1人が処刑（同票なら処刑なし）。
// 人狼が全滅すれば村の勝ち。人狼の数が村人側の数以上になれば人狼の勝ち。
import { GameError, shuffle } from '../../js/util.js';

export const ROLES = {
  wolf: { name: '人狼', icon: '🐺', team: 'wolf', text: '夜に村人を1人襲う。仲間の人狼が誰かはわかる。' },
  seer: { name: '占い師', icon: '🔮', team: 'village', text: '夜に1人を占い、人狼かどうかを知る。' },
  knight: { name: '騎士', icon: '🛡️', team: 'village', text: '夜に自分以外の1人を人狼の襲撃から守る。' },
  villager: { name: '村人', icon: '🧑‍🌾', team: 'village', text: '特別な力はない。話し合いで人狼を見つけ出そう。' },
};

export function roleList(n) {
  const wolves = n >= 6 ? 2 : 1;
  const roles = ['seer'];
  if (n >= 5) roles.push('knight');
  for (let i = 0; i < wolves; i++) roles.push('wolf');
  while (roles.length < n) roles.push('villager');
  return roles;
}

export function setup(players, rng = Math.random) {
  const ids = players.map(p => p.id);
  const roles = shuffle(roleList(ids.length), rng);
  const state = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    roles: Object.fromEntries(ids.map((p, i) => [p, roles[i]])),
    alive: ids.slice(),
    day: 1,
    phase: 'night',
    night: {},
    ready: [],
    votes: {},
    seerResults: [],
    lastNight: null,
    lastVote: null,
    winner: null,
    log: ['🌙 1日目の夜になりました。それぞれ役職を確認してください（今夜は襲撃なし）'],
  };
  return state;
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

const name = (state, pid) => state.names[pid] ?? '?';
const isAlive = (state, pid) => state.alive.includes(pid);
const wolvesAlive = state => state.alive.filter(p => state.roles[p] === 'wolf');

// 夜に選ぶ必要がある相手の候補
export function nightTargets(state, pid) {
  const role = state.roles[pid];
  if (role === 'wolf') return state.day === 1 ? [] : state.alive.filter(p => state.roles[p] !== 'wolf');
  if (role === 'seer') return state.alive.filter(p => p !== pid && !state.seerResults.some(r => r.target === p));
  if (role === 'knight') return state.alive.filter(p => p !== pid);
  return [];
}

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
  if (!isAlive(state, pid)) throw new GameError('脱落したので操作できません');

  if (type === 'night') {
    if (state.phase !== 'night') throw new GameError('今は夜ではありません');
    const targets = nightTargets(state, pid);
    const target = action.target ?? null;
    if (targets.length > 0 && !targets.includes(target)) throw new GameError('相手を選んでください');
    if (targets.length === 0 && target !== null) throw new GameError('今夜は相手を選べません');
    state.night[pid] = target;
    if (state.alive.every(p => p in state.night)) resolveNight(state, rng);
    return;
  }

  if (type === 'ready') {
    if (state.phase !== 'day') throw new GameError('今は話し合いの時間ではありません');
    if (state.ready.includes(pid)) state.ready = state.ready.filter(p => p !== pid);
    else state.ready.push(pid);
    if (state.ready.length > state.alive.length / 2) {
      state.phase = 'vote';
      log(state, '🗳️ 投票の時間です');
    }
    return;
  }

  if (type === 'vote') {
    if (state.phase !== 'vote') throw new GameError('今は投票の時間ではありません');
    if (!isAlive(state, action.target) || action.target === pid) throw new GameError('投票先が正しくありません');
    state.votes[pid] = action.target;
    if (state.alive.every(p => p in state.votes)) resolveVote(state);
    return;
  }

  throw new GameError('不明な操作です');
}

function resolveNight(state, rng) {
  const night = state.night;
  // 占い
  for (const p of state.alive) {
    if (state.roles[p] === 'seer' && night[p]) {
      state.seerResults.push({ day: state.day, target: night[p], wolf: state.roles[night[p]] === 'wolf' });
    }
  }
  // 襲撃（人狼が複数なら多数決、同数ならランダム）
  let victim = null;
  if (state.day > 1) {
    const counts = {};
    for (const w of wolvesAlive(state)) if (night[w]) counts[night[w]] = (counts[night[w]] ?? 0) + 1;
    const max = Math.max(0, ...Object.values(counts));
    const top = Object.keys(counts).filter(p => counts[p] === max);
    if (top.length) victim = top[Math.floor(rng() * top.length)];
    const guarded = state.alive.some(p => state.roles[p] === 'knight' && night[p] === victim);
    if (guarded) victim = null;
  }

  state.night = {};
  state.ready = [];
  state.votes = {};
  state.phase = 'day';
  if (victim) {
    state.alive = state.alive.filter(p => p !== victim);
    state.lastNight = { victim };
    log(state, `☀️ ${state.day}日目の朝。${name(state, victim)} さんが無残な姿で発見されました…`);
  } else {
    state.lastNight = { victim: null };
    log(state, `☀️ ${state.day}日目の朝。${state.day === 1 ? '' : '昨夜は誰も襲われませんでした。'}話し合いを始めましょう`);
  }
  checkWinner(state);
}

function resolveVote(state) {
  const counts = Object.fromEntries(state.alive.map(p => [p, 0]));
  for (const t of Object.values(state.votes)) counts[t] += 1;
  const max = Math.max(...Object.values(counts));
  const top = state.alive.filter(p => counts[p] === max);
  const executed = top.length === 1 ? top[0] : null;
  state.lastVote = { votes: { ...state.votes }, executed, day: state.day };
  if (executed) {
    state.alive = state.alive.filter(p => p !== executed);
    log(state, `⚖️ 投票の結果、${name(state, executed)} さんが処刑されました`);
  } else {
    log(state, `⚖️ 同票のため、今日は誰も処刑されませんでした`);
  }
  state.votes = {};
  state.ready = [];
  if (checkWinner(state)) return;
  state.day += 1;
  state.phase = 'night';
  log(state, `🌙 ${state.day}日目の夜になりました`);
}

function checkWinner(state) {
  const wolves = wolvesAlive(state).length;
  const others = state.alive.length - wolves;
  if (wolves === 0) state.winner = 'village';
  else if (wolves >= others) state.winner = 'wolf';
  else return false;
  state.phase = 'over';
  log(state, state.winner === 'village' ? '🏠 人狼がいなくなりました。村の勝利！' : '🐺 人狼が村を支配しました。人狼の勝利！');
  return true;
}

// 脱落した人は決着までチャットできない。夜は全員眠っているのでチャットなし
export function canChat(state, pid) {
  if (state.phase === 'over') return true;
  if (state.phase === 'night') return false;
  return isAlive(state, pid);
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  const role = seated ? state.roles[pid] : null;
  const alive = seated && isAlive(state, pid);
  const over = state.phase === 'over';
  // 脱落者と決着後は全員の役職を見られる
  const seeAll = over || (seated && !alive);
  const isWolf = role === 'wolf';
  return {
    phase: state.phase,
    day: state.day,
    me: seated ? pid : null,
    myRole: role,
    alive,
    nightTargets: alive && state.phase === 'night' ? nightTargets(state, pid) : [],
    myNight: alive && pid in state.night ? state.night[pid] : undefined,
    nightDone: Object.keys(state.night).length,
    // 仲間の人狼と、その夜の狙い
    wolfMates: isWolf ? state.players.filter(p => state.roles[p] === 'wolf' && p !== pid).map(p => ({ id: p, pick: state.night[p] ?? null })) : [],
    seerResults: role === 'seer' || seeAll ? state.seerResults : [],
    myVote: alive ? (state.votes[pid] ?? null) : null,
    readyCount: state.ready.length,
    lastNight: state.lastNight,
    lastVote: state.lastVote,
    winner: state.winner,
    roles: seeAll ? state.roles : null,
    log: state.log.slice(-12),
    players: state.players.map(p => ({
      id: p,
      name: state.names[p],
      alive: isAlive(state, p),
      ready: state.ready.includes(p),
      voted: p in state.votes,
    })),
  };
}
