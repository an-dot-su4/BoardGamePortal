// かずタッチ（数字を順番にタッチする早さくらべ。オリジナルのパーティーゲーム）
//
// 採用ルール:
//   - 各自の画面に 1〜25 がばらばらに並んだ5×5の盤が出る（盤は人ごとに違う）
//   - 「スタート」で全員いっせいに、決められた順に数字をタッチしていく。早く最後までタッチした人から順位がつく
//   - まちがえた数字をタッチすると「おてつき」で1つ戻る
//   - 回ごとにお題が変わる: 1回目 1→25／2回目 25→1／3回目 1→25（タッチするたびに盤が並び替わる）…のくり返し
//   - 順位に応じて点（人数−順位＋1点）。決まった回数（標準3回）の合計で勝負
//   - 順位は、ホストに届いた順で決まる（通信の速さも少しだけ影響する）
import { GameError, shuffle } from '../../js/util.js';

export const SIZE = 25;
export const ROUND_COUNTS = [1, 3, 5];
export const MODES = ['asc', 'desc', 'shuffle'];
export const MODE_LABEL = { asc: '1 → 25 の順', desc: '25 → 1 の順（逆）', shuffle: '1 → 25（タッチするたびに並び替わる）' };
export const CPU_LEVELS = { weak: 'ゆっくり', normal: 'ふつう', strong: 'はやい' };
const CPU_WAIT = { weak: 0.55, normal: 0.3, strong: 0.08 }; // CPU が「考えて手を止める」割合

export function normalizeOptions(o) {
  return {
    rounds: ROUND_COUNTS.includes(Number(o?.rounds)) ? Number(o.rounds) : 3,
    cpu: o?.cpu in CPU_LEVELS ? o.cpu : 'normal',
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};
const numbers = () => Array.from({ length: SIZE }, (_, i) => i + 1);

export function target(mode, progress) {
  return mode === 'desc' ? SIZE - progress : progress + 1;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 1 || players.length > 8) throw new GameError('かずタッチは1〜8人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    round: 0,
    scores: Object.fromEntries(ids.map(p => [p, 0])),
    history: [],
    log: [],
    seq: 0,
  };
  startRound(g, rng);
  return g;
}

function startRound(g, rng) {
  g.round++;
  g.mode = MODES[(g.round - 1) % MODES.length];
  g.grids = Object.fromEntries(g.players.map(p => [p, shuffle(numbers(), rng)]));
  g.progress = Object.fromEntries(g.players.map(p => [p, 0]));
  g.misses = Object.fromEntries(g.players.map(p => [p, 0]));
  g.ready = Object.fromEntries(g.players.map(p => [p, false])); // CPU も bot() で準備OKを押す
  g.finished = [];
  g.phase = 'ready';
  log(g, `第${g.round}回: ${MODE_LABEL[g.mode]}。全員が「準備OK」を押したらスタート`);
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    const next = setup(g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p) })), rng, g.options);
    for (const k of Object.keys(g)) delete g[k];
    Object.assign(g, next);
    return;
  }

  if (type === 'ready') {
    if (g.phase !== 'ready') throw new GameError('今は準備のときではありません');
    g.ready[pid] = true;
    g.seq++;
    if (g.players.every(p => g.ready[p])) {
      g.phase = 'race';
      log(g, 'スタート！');
    }
    return;
  }

  if (type === 'next') {
    if (g.phase !== 'result') throw new GameError('まだ次の回には進めません');
    startRound(g, rng);
    g.seq++;
    return;
  }

  if (type === 'wait') {
    // CPU が手を止める（何も変えない）
    if (g.phase !== 'race' || !g.bots.includes(pid)) throw new GameError('今はできません');
    g.seq++;
    return;
  }

  if (type !== 'tap') throw new GameError('不明な操作です');
  if (g.phase !== 'race') throw new GameError('まだスタートしていません');
  if (g.finished.includes(pid)) throw new GameError('もう終わっています');
  const n = action.n;
  if (!Number.isInteger(n) || n < 1 || n > SIZE) throw new GameError('その数字はありません');
  g.seq++;
  if (n !== target(g.mode, g.progress[pid])) {
    g.misses[pid]++;
    g.progress[pid] = Math.max(0, g.progress[pid] - 1);
    return;
  }
  g.progress[pid]++;
  if (g.mode === 'shuffle') g.grids[pid] = shuffle(g.grids[pid], rng);
  if (g.progress[pid] === SIZE) {
    g.finished.push(pid);
    log(g, `🏁 ${name(g, pid)} さんが${g.finished.length}番目にゴール${g.misses[pid] ? `（おてつき${g.misses[pid]}回）` : ''}`);
    if (g.finished.length === g.players.length) endRound(g);
  }
}

function endRound(g) {
  const n = g.players.length;
  const gains = {};
  g.finished.forEach((p, i) => {
    gains[p] = n - i;
    g.scores[p] += n - i;
  });
  g.history.push({ mode: g.mode, order: g.finished.slice(), misses: { ...g.misses }, gains });
  g.phase = g.round >= g.options.rounds ? 'end' : 'result';
  if (g.phase === 'end') {
    const top = Math.max(...g.players.map(p => g.scores[p]));
    g.winners = g.players.filter(p => g.scores[p] === top);
    log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top}点）`);
  }
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    round: g.round,
    totalRounds: g.options.rounds,
    mode: g.mode,
    grid: seated ? g.grids[pid] : null,
    next: seated && g.progress[pid] < SIZE ? target(g.mode, g.progress[pid]) : null,
    history: g.history,
    winners: g.phase === 'end' ? g.winners : null,
    log: g.log.slice(-12),
    players: g.players.map(p => ({
      id: p,
      name: g.names[p],
      bot: g.bots.includes(p),
      ready: g.ready[p],
      progress: g.progress[p],
      misses: g.misses[p],
      place: g.finished.includes(p) ? g.finished.indexOf(p) + 1 : null,
      score: g.scores[p],
    })),
  };
}

// ---- CPU ----
// ホストが少し待ってから1回ずつ動かす。ときどき手を止めて人間に近い速さにする。
// ホストは1回に CPU を1人しか動かさないので、まだゴールしていない CPU が交代で動く（最初の CPU だけが進まないように）
export function bot(g, pid, rng = Math.random) {
  if (g.phase === 'ready') return g.ready[pid] ? null : { type: 'ready' };
  if (g.phase !== 'race' || g.finished.includes(pid)) return null;
  const racing = g.bots.filter(p => !g.finished.includes(p));
  if (racing[g.seq % racing.length] !== pid) return null;
  // CPU が多いほど1人あたりの番が減るので、手を止める割合を下げる
  const wait = Math.max(0, CPU_WAIT[g.options.cpu] - (racing.length - 1) * 0.25);
  if (rng() < wait) return { type: 'wait' };
  return { type: 'tap', n: target(g.mode, g.progress[pid]) };
}
