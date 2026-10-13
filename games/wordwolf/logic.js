// ワード人狼
//
// 全員にお題が配られるが、1人（人狼）だけ少し違うお題をもらう。自分が人狼かどうかは本人にもわからない。
// お題そのものは言わずに会話して、人狼を探す。投票でいちばん票を集めた人が人狼なら村の勝ち…
// ただし人狼は最後に「多数派のお題」を当てれば逆転勝利。
import { GameError, shuffle } from '../../js/util.js';
import { WORD_PAIRS } from './words.js';

export function normalizeWord(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
    .replace(/[\s・ー〜~\-]/g, '')
    .toLowerCase();
}

export function setup(players, rng = Math.random) {
  const state = {
    players: players.map(p => p.id),
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    deck: shuffle(WORD_PAIRS.map((_, i) => i), rng),
    round: 0,
    log: [],
  };
  startRound(state, rng);
  return state;
}

function log(state, text) {
  state.log.push(text);
  if (state.log.length > 30) state.log.splice(0, state.log.length - 30);
}

function startRound(state, rng) {
  if (state.deck.length === 0) state.deck = shuffle(WORD_PAIRS.map((_, i) => i), rng);
  const pair = WORD_PAIRS[state.deck.pop()];
  const flip = rng() < 0.5;
  state.round += 1;
  state.majority = flip ? pair[1] : pair[0];
  state.minority = flip ? pair[0] : pair[1];
  state.wolf = state.players[Math.floor(rng() * state.players.length)];
  state.phase = 'talk';
  state.ready = [];
  state.votes = {};
  state.accused = null;
  state.guess = null;
  state.winner = null;
  state.tally = null;
  log(state, `── 第${state.round}回戦 ── お題が配られました`);
}

export function wordOf(state, pid) {
  return pid === state.wolf ? state.minority : state.majority;
}

export function act(state, pid, action, rng = Math.random) {
  if (!state.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;
  const n = state.players.length;

  if (type === 'ready') {
    if (state.phase !== 'talk') throw new GameError('今は話し合いの時間ではありません');
    if (state.ready.includes(pid)) state.ready = state.ready.filter(p => p !== pid);
    else state.ready.push(pid);
    if (state.ready.length > n / 2) {
      state.phase = 'vote';
      log(state, '🗳️ 投票の時間です');
    }
    return;
  }

  if (type === 'vote') {
    if (state.phase !== 'vote') throw new GameError('今は投票の時間ではありません');
    if (!state.players.includes(action.target) || action.target === pid) throw new GameError('投票先が正しくありません');
    state.votes[pid] = action.target;
    if (Object.keys(state.votes).length === n) tally(state);
    return;
  }

  if (type === 'guess') {
    if (state.phase !== 'guess') throw new GameError('今は答える時間ではありません');
    if (pid !== state.wolf) throw new GameError('答えられるのは人狼だけです');
    const text = String(action.text ?? '').slice(0, 30);
    state.guess = text;
    const ok = text !== '' && normalizeWord(text) === normalizeWord(state.majority);
    finish(state, ok ? 'wolf' : 'village', ok ? `🐺 人狼が「${text}」で多数派のお題を当てて逆転勝利！` : `人狼の答え「${text || '（なし）'}」はハズレ。村の勝利！`);
    return;
  }

  if (type === 'next') {
    if (state.phase !== 'result') throw new GameError('まだ次に進めません');
    startRound(state, rng);
    return;
  }

  throw new GameError('不明な操作です');
}

function tally(state) {
  const counts = Object.fromEntries(state.players.map(p => [p, 0]));
  for (const target of Object.values(state.votes)) counts[target] += 1;
  const max = Math.max(...Object.values(counts));
  const top = state.players.filter(p => counts[p] === max);
  state.tally = counts;
  if (top.length > 1) {
    finish(state, 'wolf', `票が割れました（${top.map(p => state.names[p]).join('・')}）。人狼の勝利！`);
    return;
  }
  state.accused = top[0];
  if (top[0] === state.wolf) {
    state.phase = 'guess';
    log(state, `${state.names[top[0]]} さんは人狼でした！ 人狼は多数派のお題を当てれば逆転できます`);
  } else {
    finish(state, 'wolf', `${state.names[top[0]]} さんは村人でした… 人狼の勝利！`);
  }
}

function finish(state, winner, message) {
  state.phase = 'result';
  state.winner = winner;
  if (winner === 'wolf') state.scores[state.wolf] += 2;
  else for (const p of state.players) if (p !== state.wolf) state.scores[p] += 1;
  log(state, message);
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  const over = state.phase === 'result';
  return {
    phase: state.phase,
    round: state.round,
    me: seated ? pid : null,
    myWord: seated ? wordOf(state, pid) : null,
    imWolfGuessing: state.phase === 'guess' && pid === state.wolf,
    myVote: seated ? (state.votes[pid] ?? null) : null,
    readyCount: state.ready.length,
    accused: state.accused,
    tally: over ? state.tally : null,
    votes: over ? state.votes : null,
    reveal: over ? { wolf: state.wolf, majority: state.majority, minority: state.minority, guess: state.guess, winner: state.winner } : null,
    log: state.log.slice(-10),
    players: state.players.map(p => ({
      id: p,
      name: state.names[p],
      score: state.scores[p],
      ready: state.ready.includes(p),
      voted: p in state.votes,
    })),
  };
}
