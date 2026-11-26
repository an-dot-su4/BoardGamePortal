import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../games/bingo/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const readyAll = g => { for (const p of g.players) B.act(g, p, { type: 'ready' }); };

test('12本の列とビンゴの数え方', () => {
  assert.equal(B.LINES.length, 12);
  const grid = Array.from({ length: 25 }, (_, i) => i + 1);
  assert.equal(B.bingoCount(grid, [1, 2, 3, 4, 5]), 1);
  assert.equal(B.bingoCount(grid, [1, 7, 13, 19, 25, 2, 3, 4, 5]), 2);
  assert.equal(B.isReach(grid, [1, 2, 3, 4]), true);
  assert.equal(B.isReach(grid, [1, 2, 3]), false);
});

test('並べ替え→準備OK→呼ぶ→決めた本数で勝ち', () => {
  const g = B.setup(makePlayers(2), seededRng(1), { target: 1 });
  const [a, b] = g.players;
  for (const p of g.players) for (const s of g.grids[p].slice().sort((x, y) => x - y).entries()) assert.equal(s[1], s[0] + 1);
  const before = g.grids[a].slice();
  B.act(g, a, { type: 'swap', a: 0, b: 24 });
  assert.equal(g.grids[a][0], before[24]);
  assert.equal(g.grids[a][24], before[0]);
  assert.throws(() => B.act(g, a, { type: 'call', n: 1 }), /並べるとき/);
  B.act(g, a, { type: 'ready' });
  assert.throws(() => B.act(g, a, { type: 'swap', a: 1, b: 2 }), /もう準備OK/);
  B.act(g, a, { type: 'unready' });
  B.act(g, a, { type: 'swap', a: 1, b: 2 });
  readyAll(g);
  assert.equal(g.phase, 'call');
  g.turn = a;
  g.grids[a] = Array.from({ length: 25 }, (_, i) => i + 1);
  g.grids[b] = [1, 2, 3, 4, 6, 5, ...Array.from({ length: 19 }, (_, i) => i + 7)];
  for (const n of [1, 2, 3, 4]) { B.act(g, g.turn, { type: 'call', n }); }
  assert.equal(g.phase, 'call');
  assert.throws(() => B.act(g, g.turn, { type: 'call', n: 3 }), /もう呼ばれて/);
  B.act(g, g.turn, { type: 'call', n: 5 });
  assert.equal(g.phase, 'end');
  assert.deepEqual(g.winners, [a]);
  assert.equal(g.wins[a], 1);
  B.act(g, b, { type: 'restart' });
  assert.equal(g.phase, 'arrange');
  assert.equal(g.called.length, 0);
});

test('同じ数で同時に届いたら全員の勝ち', () => {
  const g = B.setup(makePlayers(2), seededRng(2), { target: 1 });
  readyAll(g);
  const grid = Array.from({ length: 25 }, (_, i) => i + 1);
  for (const p of g.players) g.grids[p] = grid.slice();
  for (const n of [1, 2, 3, 4, 5]) B.act(g, g.turn, { type: 'call', n });
  assert.equal(g.winners.length, 2);
});

test('ランダムに最後まで遊んで必ず終わる（1〜8人）', () => {
  for (let n = 1; n <= 8; n++) for (let seed = 1; seed <= 20; seed++) for (const target of B.TARGETS) {
    const rng = seededRng(seed * 13 + n);
    const g = B.setup(makePlayers(n), rng, { target });
    let steps = 0;
    while (g.phase !== 'end') {
      assert.ok(steps++ < 200, '終わらない');
      const p = g.phase === 'arrange' ? g.players.find(x => !g.ready[x]) : g.turn;
      if (g.phase === 'arrange' && rng() < 0.3) B.act(g, p, { type: 'swap', a: 3, b: 7 }, rng);
      B.act(g, p, B.bot(g, p, rng), rng);
    }
    assert.ok(g.called.length <= 25);
    for (const w of g.winners) assert.ok(B.bingoCount(g.grids[w], g.called) >= target);
  }
});

test('不正な操作は拒否される', () => {
  const g = B.setup(makePlayers(3), seededRng(3));
  const [a, b] = g.players;
  assert.throws(() => B.act(g, 'nobody', { type: 'ready' }), GameError);
  assert.throws(() => B.act(g, a, { type: 'swap', a: 0, b: 0 }), GameError);
  assert.throws(() => B.act(g, a, { type: 'swap', a: -1, b: 3 }), GameError);
  assert.throws(() => B.act(g, a, { type: 'swap', a: '1', b: 3 }), GameError);
  assert.throws(() => B.act(g, a, { type: 'restart' }), GameError);
  readyAll(g);
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => B.act(g, other, { type: 'call', n: 1 }), /あなたの番/);
  assert.throws(() => B.act(g, g.turn, { type: 'call', n: 26 }), GameError);
  assert.throws(() => B.act(g, g.turn, { type: 'call', n: 1.5 }), GameError);
  assert.throws(() => B.act(g, g.turn, { type: 'swap', a: 1, b: 2 }), GameError);
  assert.throws(() => B.act(g, b, { type: 'fly' }), GameError);
});

test('ほかの人の並べ方は view に出ない（終わったら見える）', () => {
  const g = B.setup(makePlayers(3), seededRng(4), { target: 1 });
  const [a] = g.players;
  const v = B.view(g, a);
  assert.deepEqual(v.grid, g.grids[a]);
  assert.equal(v.grids, null);
  const keys = JSON.stringify(v);
  for (const p of g.players.slice(1)) assert.ok(!keys.includes(JSON.stringify(g.grids[p])));
  assert.equal(B.view(g, null).grid, null);
  readyAll(g);
  while (g.phase !== 'end') B.act(g, g.turn, B.bot(g, g.turn));
  assert.ok(B.view(g, null).grids);
});
