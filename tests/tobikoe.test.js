import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/tobikoe/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

test('121マスの星形・6つの角に10マスずつ', () => {
  assert.equal(T.CELLS.length, 121);
  for (const c of T.CORNERS) assert.equal(c.length, 10);
  assert.equal(new Set(T.CORNERS.flat()).size, 60);
  for (let i = 0; i < 6; i++) assert.equal(T.cellDist(T.TIPS[i], T.TIPS[T.opposite(i)]), 16);
});

test('1歩・とびこえ・連続とびこえ', () => {
  const board = { '0,0': 'a', '1,0': 'b', '3,0': 'b' };
  const d = T.destinations(board, '0,0');
  assert.ok(d.includes('0,1'), '1歩');
  assert.ok(d.includes('2,0'), 'とびこえ');
  assert.ok(d.includes('4,0'), '続けてとびこえ');
  assert.ok(!d.includes('1,0'), 'コマのあるマスには行けない');
  assert.ok(!d.includes('3,0'));
  assert.ok(!d.includes('0,2'), '何もないところは跳べない');
});

test('置き方と手番・動かす', () => {
  const g = T.setup(makePlayers(2), seededRng(1));
  const [a, b] = g.players;
  assert.equal(Object.values(g.board).filter(p => p === a).length, 10);
  assert.equal(T.opposite(g.corner[a]), g.corner[b]);
  const me = g.turn;
  const from = Object.keys(g.board).find(k => g.board[k] === me && T.destinations(g.board, k).length);
  const to = T.destinations(g.board, from)[0];
  T.act(g, me, { type: 'move', from, to });
  assert.equal(g.board[to], me);
  assert.equal(g.board[from], undefined);
  assert.notEqual(g.turn, me);
});

test('陣地を全部うめたら勝ち（ほかの人が居座っていても、自分のコマが1つあれば勝ち）', () => {
  const g = T.setup(makePlayers(2), seededRng(2));
  const [a, b] = g.players;
  const tip = T.TIPS[T.targetOf(g, a)];
  // 先端から遠い順（最後に入れる1マスは陣地の入り口）
  const target = T.CORNERS[T.targetOf(g, a)].slice().sort((x, y) => T.cellDist(x, tip) - T.cellDist(y, tip));
  g.board = {};
  target.slice(0, 8).forEach(k => { g.board[k] = a; });
  g.board[target[8]] = b; // 居座り
  // 最後の1マスのとなりにコマを置く
  const last = target[9];
  const [q, r] = T.parse(last);
  const from = T.DIRS.map(([dq, dr]) => `${q + dq},${r + dr}`).find(k => T.CELLS.includes(k) && !g.board[k]);
  g.board[from] = a;
  g.turn = a;
  T.act(g, a, { type: 'move', from, to: last });
  assert.equal(g.phase, 'end');
  assert.deepEqual(g.winners, [a]);
  T.act(g, b, { type: 'restart' });
  assert.equal(g.phase, 'play');
  assert.equal(Object.keys(g.board).length, 20);
});

test('ランダムに最後まで遊んで必ず終わる（2〜6人）', () => {
  for (let n = 2; n <= 6; n++) for (let seed = 1; seed <= 6; seed++) {
    const rng = seededRng(seed * 7 + n);
    const g = T.setup(makePlayers(n), rng);
    while (g.phase !== 'end') {
      const a = T.bot(g, g.turn, rng);
      assert.ok(a, 'CPU が手を返さない');
      T.act(g, g.turn, a, rng);
      assert.equal(Object.keys(g.board).length, n * 10);
    }
    assert.ok(g.winners.length >= 1);
  }
});

test('不正な操作は拒否される', () => {
  const g = T.setup(makePlayers(3), seededRng(3));
  const me = g.turn;
  const other = g.players.find(p => p !== me);
  const mine = Object.keys(g.board).find(k => g.board[k] === me && T.destinations(g.board, k).length);
  const theirs = Object.keys(g.board).find(k => g.board[k] === other);
  assert.throws(() => T.act(g, other, { type: 'move', from: theirs, to: T.destinations(g.board, theirs)[0] ?? '0,0' }), /あなたの番/);
  assert.throws(() => T.act(g, me, { type: 'move', from: theirs, to: '0,0' }), /自分のコマ/);
  assert.throws(() => T.act(g, me, { type: 'move', from: mine, to: '0,0' }), /動かせません/);
  assert.throws(() => T.act(g, me, { type: 'move', from: mine, to: '99,99' }), GameError);
  assert.throws(() => T.act(g, me, { type: 'move', from: 3, to: {} }), GameError);
  assert.throws(() => T.act(g, me, { type: 'restart' }), GameError);
  assert.throws(() => T.act(g, 'nobody', { type: 'move', from: mine, to: '0,0' }), GameError);
  assert.throws(() => T.act(g, me, { type: 'fly' }), GameError);
});

test('view は全員に同じ盤（隠す情報はない）・観戦者も見られる', () => {
  const g = T.setup(makePlayers(2), seededRng(4));
  const v = T.view(g, null);
  assert.equal(v.me, null);
  assert.equal(Object.keys(v.board).length, 20);
  assert.deepEqual(T.view(g, g.players[0]).board, v.board);
});
