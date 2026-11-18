// ヨット（昔からあるサイコロ5個の役づくり）
//
// 採用ルール:
//   - 手番ではサイコロ5個を最大3回まで振れる。振り直さないサイコロは「とっておく」
//   - 振り終えたら（1回目以降いつでも）、まだ埋めていない役を1つ選んで点を書く（0点でもよい）
//   - 役（12種）: 1〜6（その目の合計）／チョイス（全部の合計）／フォーカード（同じ目4つ以上で全部の合計）
//     ／フルハウス（3つと2つで全部の合計）／S・ストレート（4つ続き 15点）／B・ストレート（5つ続き 30点）／ヨット（5つ同じ 50点）
//   - 1〜6の合計が63点以上ならボーナス +35点
//   - 全員が12の役を埋めたら終わり。合計点がいちばん多い人の勝ち
import { GameError } from '../../js/util.js';

export const CATS = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'choice', 'four', 'full', 'sstr', 'lstr', 'yacht'];
export const CAT_LABEL = {
  ones: '1', twos: '2', threes: '3', fours: '4', fives: '5', sixes: '6',
  choice: 'チョイス', four: 'フォーカード', full: 'フルハウス', sstr: 'S・ストレート', lstr: 'B・ストレート', yacht: 'ヨット',
};
export const UPPER = CATS.slice(0, 6);
export const BONUS_LINE = 63;
export const BONUS = 35;

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function scoreFor(cat, dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const sum = dice.reduce((a, b) => a + b, 0);
  const has = (...faces) => faces.every(f => counts[f] > 0);
  const i = UPPER.indexOf(cat);
  if (i >= 0) return counts[i + 1] * (i + 1);
  switch (cat) {
    case 'choice': return sum;
    case 'four': return counts.some(c => c >= 4) ? sum : 0;
    case 'full': return counts.includes(3) && counts.includes(2) ? sum : 0;
    case 'sstr': return has(1, 2, 3, 4) || has(2, 3, 4, 5) || has(3, 4, 5, 6) ? 15 : 0;
    case 'lstr': return has(1, 2, 3, 4, 5) || has(2, 3, 4, 5, 6) ? 30 : 0;
    case 'yacht': return counts.includes(5) ? 50 : 0;
  }
  return 0;
}

export function totals(sheet) {
  const upper = UPPER.reduce((a, c) => a + (sheet[c] ?? 0), 0);
  const bonus = upper >= BONUS_LINE ? BONUS : 0;
  const lower = CATS.slice(6).reduce((a, c) => a + (sheet[c] ?? 0), 0);
  return { upper, bonus, lower, total: upper + bonus + lower };
}

export function setup(players, rng = Math.random) {
  if (players.length < 2 || players.length > 6) throw new GameError('ヨットは2〜6人で遊びます');
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    first: 0,
    games: 1,
    wins: Object.fromEntries(ids.map(p => [p, 0])),
    log: [],
    seq: 0,
  };
  startGame(g);
  return g;
}

function startGame(g) {
  g.sheets = Object.fromEntries(g.players.map(p => [p, {}]));
  g.turnIndex = g.first;
  g.turn = g.players[g.first];
  g.round = 1;
  g.phase = 'play';
  g.winners = null;
  newTurn(g);
  log(g, `第${g.games}局。${name(g, g.turn)} さんから`);
}

function newTurn(g) {
  g.dice = [1, 1, 1, 1, 1];
  g.held = [false, false, false, false, false];
  g.rolls = 0;
  g.last = null;
}

export function act(g, pid, action, rng = Math.random) {
  if (!g.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (g.phase !== 'end') throw new GameError('まだゲームの途中です');
    g.games++;
    g.first = (g.first + 1) % g.players.length;
    startGame(g);
    g.seq++;
    return;
  }

  if (g.phase !== 'play') throw new GameError('ゲームは終わっています');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');

  if (type === 'roll') {
    if (g.rolls >= 3) throw new GameError('3回振りました。役を選んでください');
    if (g.rolls > 0 && g.held.every(Boolean)) throw new GameError('振り直すサイコロがありません');
    // 1回目は全部振る
    if (g.rolls === 0) g.held = [false, false, false, false, false];
    g.dice = g.dice.map((d, i) => (g.held[i] ? d : 1 + Math.floor(rng() * 6)));
    g.rolls++;
    g.seq++;
    return;
  }

  if (type === 'hold') {
    const i = action.index;
    if (g.rolls === 0) throw new GameError('まず1回振ってください');
    if (g.rolls >= 3) throw new GameError('もう振れません。役を選んでください');
    if (!Number.isInteger(i) || i < 0 || i > 4) throw new GameError('そのサイコロはありません');
    g.held[i] = !g.held[i];
    g.seq++;
    return;
  }

  if (type === 'score') {
    const cat = action.cat;
    if (g.rolls === 0) throw new GameError('まず1回振ってください');
    if (!CATS.includes(cat)) throw new GameError('その役はありません');
    if (g.sheets[pid][cat] !== undefined) throw new GameError('その役はもう埋めています');
    const pts = scoreFor(cat, g.dice);
    g.sheets[pid][cat] = pts;
    log(g, `${name(g, pid)}: ${g.dice.join('')} → ${CAT_LABEL[cat]}に${pts}点${cat === 'yacht' && pts ? ' 🎉ヨット！' : ''}`);
    g.lastScore = { by: pid, cat, pts, dice: g.dice.slice() };
    g.seq++;
    // 次の人へ
    g.turnIndex = (g.turnIndex + 1) % g.players.length;
    g.turn = g.players[g.turnIndex];
    if (g.turnIndex === g.first) g.round++;
    if (g.players.every(p => Object.keys(g.sheets[p]).length === CATS.length)) {
      g.phase = 'end';
      g.turn = null;
      const t = Object.fromEntries(g.players.map(p => [p, totals(g.sheets[p]).total]));
      const top = Math.max(...Object.values(t));
      g.winners = g.players.filter(p => t[p] === top);
      for (const w of g.winners) g.wins[w]++;
      log(g, `🏆 ${g.winners.map(p => name(g, p)).join('・')} さんの勝ち！（${top}点）`);
      return;
    }
    newTurn(g);
    return;
  }

  throw new GameError('不明な操作です');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    games: g.games,
    round: Math.min(g.round, CATS.length),
    turn: g.turn,
    dice: g.dice,
    held: g.held,
    rolls: g.rolls,
    lastScore: g.lastScore ?? null,
    winners: g.winners,
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), sheet: g.sheets[p], ...totals(g.sheets[p]), wins: g.wins[p] })),
  };
}

// ---- CPU ----

// 役ごとの「ふつう取れる点」の目安。これより多く取れる役を選ぶ
const EXPECT = { ones: 2, twos: 5, threes: 8, fours: 11, fives: 14, sixes: 17, choice: 22, four: 8, full: 9, sstr: 10, lstr: 6, yacht: 4 };

function bestCategory(g, pid) {
  const open = CATS.filter(c => g.sheets[pid][c] === undefined);
  let best = null;
  for (const c of open) {
    const s = scoreFor(c, g.dice);
    // 1〜6はボーナスに近づくなら少し上乗せ
    const v = s - EXPECT[c] + (UPPER.includes(c) && s >= (UPPER.indexOf(c) + 1) * 3 ? 4 : 0);
    if (!best || v > best.v) best = { c, s, v };
  }
  return best;
}

// とっておくサイコロを決める
function chooseHolds(g, pid) {
  const d = g.dice;
  const open = c => g.sheets[pid][c] === undefined;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const x of d) counts[x]++;
  const uniq = new Set(d);
  // ストレートを狙えるとき
  if ((open('lstr') || open('sstr')) && uniq.size >= 4) {
    for (const run of [[2, 3, 4, 5], [3, 4, 5, 6], [1, 2, 3, 4]]) {
      if (run.every(x => uniq.has(x))) {
        const keep = new Set();
        return d.map(x => {
          if (run.includes(x) && !keep.has(x)) {
            keep.add(x);
            return true;
          }
          if (open('lstr') && !keep.has(x) && (x === run[0] - 1 || x === run[3] + 1)) {
            keep.add(x);
            return true;
          }
          return false;
        });
      }
    }
  }
  // いちばん多い目（同数なら大きい目）を残す。ただしその目の役も「同じ目」系の役も埋まっていれば別の目
  let face = 0;
  for (let f = 6; f >= 1; f--) {
    const useful = open(UPPER[f - 1]) || open('four') || open('yacht') || open('full') || open('choice');
    if (!useful) continue;
    if (!face || counts[f] > counts[face]) face = f;
  }
  if (!face) return d.map(x => x >= 5);
  const keep = d.map(x => x === face);
  // フルハウスが空いていて、2組あるならペアも残す
  if (open('full') && counts[face] === 3) {
    const pair = [1, 2, 3, 4, 5, 6].find(f => f !== face && counts[f] === 2);
    if (pair) return d.map(x => x === face || x === pair);
  }
  return keep;
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  if (g.rolls === 0) return { type: 'roll' };
  const best = bestCategory(g, pid);
  if (g.rolls >= 3 || (best && best.v >= 10) || (best && ['yacht', 'lstr'].includes(best.c) && best.s > 0)) return { type: 'score', cat: best.c };
  const want = chooseHolds(g, pid);
  // とっておく状態を1つずつ合わせてから振る
  const i = want.findIndex((w, k) => w !== g.held[k]);
  if (i >= 0) return { type: 'hold', index: i };
  if (g.held.every(Boolean)) return { type: 'score', cat: best.c };
  return { type: 'roll' };
}
