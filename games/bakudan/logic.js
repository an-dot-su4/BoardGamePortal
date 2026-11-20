// みんなでばくだんさがし（昔からあるパズル「地雷さがし」を、全員で協力して解く）
//
// 採用ルール:
//   - マス目の下にばくだんがかくれている。全員で順番に1マスずつ開ける（チームの協力ゲーム）
//   - 開けたマスには、まわり8マスにあるばくだんの数が出る。0なら周りも自動で開く
//   - 最初に開けるマスとその周りには、ばくだんはない
//   - 🚩旗はだれでもいつでも立てたり外したりできる（手番を使わない。旗のマスは開けられない）
//   - ばくだんを開けたらライフが1減る（標準3）。ライフが0になったら負け。ばくだん以外を全部開けたら勝ち
import { GameError, shuffle } from '../../js/util.js';

export const LEVELS = {
  easy: { label: 'やさしい（8×8・ばくだん10）', w: 8, h: 8, bombs: 10 },
  normal: { label: 'ふつう（10×10・ばくだん16）', w: 10, h: 10, bombs: 16 },
  hard: { label: 'むずかしい（12×12・ばくだん28）', w: 12, h: 12, bombs: 28 },
};
export const LIVES = [1, 3, 5];

export function normalizeOptions(o) {
  return {
    level: o?.level in LEVELS ? o.level : 'normal',
    lives: LIVES.includes(Number(o?.lives)) ? Number(o.lives) : 3,
  };
}

const name = (g, p) => g.names[p];
const log = (g, text) => {
  g.log.push(text);
  if (g.log.length > 40) g.log.splice(0, g.log.length - 40);
};

export function neighbors(g, i) {
  const x = i % g.w;
  const y = Math.floor(i / g.w);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h) out.push(ny * g.w + nx);
  }
  return out;
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 1 || players.length > 6) throw new GameError('みんなでばくだんさがしは1〜6人で遊びます');
  const opts = normalizeOptions(options);
  const ids = players.map(p => p.id);
  const g = {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    options: opts,
    games: 1,
    record: { win: 0, lose: 0 },
    first: 0,
    log: [],
    seq: 0,
  };
  startGame(g);
  return g;
}

function startGame(g) {
  const L = LEVELS[g.options.level];
  g.w = L.w;
  g.h = L.h;
  g.bombCount = L.bombs;
  g.bombs = null; // 最初に開けたあとで決める
  g.open = Array(g.w * g.h).fill(false);
  g.flags = Array(g.w * g.h).fill(null); // 立てた人
  g.boom = []; // 開けてしまったばくだん
  g.lives = g.options.lives;
  g.turnIndex = g.first % g.players.length;
  g.turn = g.players[g.turnIndex];
  g.opened = Object.fromEntries(g.players.map(p => [p, 0]));
  g.phase = 'play';
  g.result = null;
  g.last = null;
  log(g, `第${g.games}局（${L.label}・ライフ${g.lives}）。${name(g, g.turn)} さんから`);
}

function placeBombs(g, safe, rng) {
  const ban = new Set([safe, ...neighbors(g, safe)]);
  const cells = shuffle([...Array(g.w * g.h).keys()].filter(i => !ban.has(i)), rng);
  g.bombs = Array(g.w * g.h).fill(false);
  for (const i of cells.slice(0, g.bombCount)) g.bombs[i] = true;
}

export const countAround = (g, i) => neighbors(g, i).filter(j => g.bombs[j]).length;

function flood(g, start) {
  const stack = [start];
  let n = 0;
  while (stack.length) {
    const i = stack.pop();
    if (g.open[i] || g.bombs[i]) continue;
    g.open[i] = true;
    g.flags[i] = null;
    n++;
    if (countAround(g, i) === 0) for (const j of neighbors(g, i)) if (!g.open[j]) stack.push(j);
  }
  return n;
}

const safeLeft = g => g.open.reduce((a, o, i) => a + (!o && !(g.bombs?.[i]) ? 1 : 0), 0);

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
  const i = action?.index;
  if (!Number.isInteger(i) || i < 0 || i >= g.w * g.h) throw new GameError('そのマスはありません');

  if (type === 'flag') {
    if (g.open[i] || g.boom.includes(i)) throw new GameError('開いているマスには旗を立てられません');
    g.flags[i] = g.flags[i] ? null : pid;
    g.seq++;
    return;
  }

  if (type !== 'open') throw new GameError('不明な操作です');
  if (g.turn !== pid) throw new GameError('あなたの番ではありません');
  if (g.open[i] || g.boom.includes(i)) throw new GameError('そのマスはもう開いています');
  if (g.flags[i]) throw new GameError('旗のあるマスは開けられません（先に旗を外してください）');

  if (!g.bombs) placeBombs(g, i, rng);
  g.seq++;
  if (g.bombs[i]) {
    g.boom.push(i);
    g.flags[i] = null;
    g.lives--;
    g.last = { by: pid, index: i, boom: true };
    log(g, `💥 ${name(g, pid)} さんがばくだんを開けてしまった！ ライフ残り${g.lives}`);
    if (g.lives <= 0) return end(g, false);
  } else {
    const n = flood(g, i);
    g.opened[pid] += n;
    g.last = { by: pid, index: i, boom: false, n };
    if (safeLeft(g) === 0) return end(g, true);
  }
  g.turnIndex = (g.turnIndex + 1) % g.players.length;
  g.turn = g.players[g.turnIndex];
}

function end(g, win) {
  g.phase = 'end';
  g.turn = null;
  g.result = win ? 'win' : 'lose';
  g.record[win ? 'win' : 'lose']++;
  log(g, win ? '🎉 ばくだん以外を全部開けました。チームの勝ち！' : '💀 ライフがなくなりました…チームの負け');
}

export function view(g, pid) {
  const seated = g.players.includes(pid);
  const over = g.phase === 'end';
  const boom = new Set(g.boom);
  // 開いたマスは数字、閉じたマスは null（ばくだんの場所は終わるまで送らない）
  const cells = g.open.map((o, i) => {
    if (boom.has(i)) return { s: 'boom' };
    if (o) return { s: 'open', n: countAround(g, i) };
    if (over && g.bombs?.[i]) return { s: 'bomb', flag: !!g.flags[i] };
    return g.flags[i] ? { s: 'flag', by: g.flags[i] } : null;
  });
  return {
    phase: g.phase,
    seq: g.seq,
    me: seated ? pid : null,
    w: g.w,
    h: g.h,
    bombCount: g.bombCount,
    lives: g.lives,
    maxLives: g.options.lives,
    level: g.options.level,
    cells,
    flagCount: g.flags.filter(Boolean).length,
    safeLeft: g.bombs ? safeLeft(g) : g.w * g.h - g.bombCount,
    turn: g.turn,
    last: g.last,
    result: g.result,
    record: g.record,
    games: g.games,
    log: g.log.slice(-12),
    players: g.players.map(p => ({ id: p, name: g.names[p], bot: g.bots.includes(p), opened: g.opened[p] })),
  };
}

// ---- CPU ----
// 見えている数字だけで確実に分かるマスを探す（ほかの人と同じ情報しか使わない）
export function deduce(v) {
  const N = v.w * v.h;
  const known = new Map(); // i -> 'safe' | 'bomb'
  const isClosed = i => !v.cells[i] || v.cells[i].s === 'flag';
  // 今わかっていることから、数字ごとの条件（まだ分からないマスのうち need 個がばくだん）を作る
  const constraints = () => {
    const out = [];
    for (let i = 0; i < N; i++) {
      const c = v.cells[i];
      if (!c || c.s !== 'open' || c.n === 0) continue;
      const around = neighbors(v, i);
      const need = c.n - around.filter(j => v.cells[j]?.s === 'boom' || known.get(j) === 'bomb').length;
      const cells = around.filter(j => isClosed(j) && !known.has(j));
      if (cells.length) out.push({ cells, need });
    }
    return out;
  };
  const mark = (cells, k) => {
    let changed = false;
    for (const j of cells) if (!known.has(j)) { known.set(j, k); changed = true; }
    return changed;
  };
  for (let pass = 0; pass < 50; pass++) {
    let changed = false;
    for (const { cells, need } of constraints()) {
      if (need === 0) changed = mark(cells, 'safe') || changed;
      else if (need === cells.length) changed = mark(cells, 'bomb') || changed;
    }
    if (changed) continue;
    // 1つずつで決まらなければ、条件どうしをくらべる（A ⊂ B なら B−A のばくだん数は need の差）
    const list = constraints();
    for (const a of list) {
      for (const b of list) {
        if (a === b || a.cells.length >= b.cells.length || !a.cells.every(x => b.cells.includes(x))) continue;
        const rest = b.cells.filter(x => !a.cells.includes(x));
        const d = b.need - a.need;
        if (d === 0) changed = mark(rest, 'safe') || changed;
        else if (d === rest.length) changed = mark(rest, 'bomb') || changed;
        if (changed) break;
      }
      if (changed) break;
    }
    if (!changed) break;
  }
  return known;
}

export function bot(g, pid, rng = Math.random) {
  if (g.phase !== 'play' || g.turn !== pid) return null;
  const v = view(g, pid);
  const N = v.w * v.h;
  const known = deduce(v);
  // 確実なばくだんに旗を立てておく（ほかの人にも分かるように）
  for (const [i, k] of known) if (k === 'bomb' && !v.cells[i]) return { type: 'flag', index: i };
  // 間違った旗（確実に安全なマス）は外す
  for (const [i, k] of known) if (k === 'safe' && v.cells[i]?.s === 'flag') return { type: 'flag', index: i };
  const safe = [...known].filter(([i, k]) => k === 'safe' && !v.cells[i]).map(([i]) => i);
  if (safe.length) return { type: 'open', index: safe[Math.floor(rng() * safe.length)] };
  const closed = [...Array(N).keys()].filter(i => !v.cells[i] && !known.has(i));
  if (!closed.length) {
    // 残りは旗のマスだけ（間違った旗がある）→ 旗を1つ外す
    const f = [...Array(N).keys()].find(i => v.cells[i]?.s === 'flag' && known.get(i) !== 'bomb');
    return f !== undefined ? { type: 'flag', index: f } : null;
  }
  // わからないときは、数字に接していないマス（なければ全体）からランダム。最初は真ん中
  if (!g.bombs) return { type: 'open', index: Math.floor(v.h / 2) * v.w + Math.floor(v.w / 2) };
  const frontier = new Set();
  for (let i = 0; i < N; i++) if (v.cells[i]?.s === 'open' && v.cells[i].n > 0) for (const j of neighbors(v, i)) frontier.add(j);
  const inner = closed.filter(i => !frontier.has(i));
  const pool = inner.length ? inner : closed;
  return { type: 'open', index: pool[Math.floor(rng() * pool.length)] };
}
