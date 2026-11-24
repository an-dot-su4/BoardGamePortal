import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../games/domino/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const count = g => g.players.reduce((a, p) => a + g.hands[p].length, 0) + g.stock.length + g.line.length;

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 3000) throw new Error('終わらない');
    if (g.phase === 'result') { D.act(g, g.players[0], { type: 'next' }, rng); continue; }
    D.act(g, g.turn, D.bot(g, g.turn, rng), rng);
    assert.equal(count(g), 28, 'タイルの枚数が合わない');
    // 列のとなりどうしの目がつながっている
    for (let i = 1; i < g.line.length; i++) assert.equal(g.line[i - 1].b, g.line[i].a);
  }
}

test('28枚・いちばん大きいダブルの人から始まる', () => {
  assert.equal(D.makeSet().length, 28);
  const g = D.setup(makePlayers(2), seededRng(1));
  assert.equal(count(g), 28);
  assert.equal(g.line.length, 1);
  const first = g.line[0];
  // 残っている手のダブルはどれも最初のタイルより小さい
  for (const p of g.players) for (const t of g.hands[p]) if (t.a === t.b && first.a === first.b) assert.ok(t.a < first.a);
});

test('はしの目に合うタイルだけつなげられる。両方に合うときは左右を選ぶ', () => {
  const g = D.setup(makePlayers(2), seededRng(2));
  const [a] = g.players;
  g.turn = a;
  g.line = [{ id: '3-5', a: 3, b: 5 }];
  g.hands[a] = [{ id: '1-2', a: 1, b: 2 }, { id: '3-5x', a: 5, b: 3 }, { id: '2-3', a: 2, b: 3 }];
  assert.throws(() => D.act(g, a, { type: 'play', tile: '1-2' }), /つながりません/);
  assert.throws(() => D.act(g, a, { type: 'play', tile: '3-5x' }), /左はしか右はし/);
  assert.throws(() => D.act(g, a, { type: 'draw' }), /引けません/);
  D.act(g, a, { type: 'play', tile: '2-3' });
  assert.deepEqual(g.line.map(t => [t.a, t.b]), [[2, 3], [3, 5]]);
});

test('出しきった人が勝ち、ほかの人の目の合計が点。ブロックは目の少ない人', () => {
  const g = D.setup(makePlayers(2), seededRng(3), { rounds: 3 });
  const [a, b] = g.players;
  g.turn = a;
  g.line = [{ id: 'x', a: 4, b: 4 }];
  g.hands[a] = [{ id: '4-6', a: 4, b: 6 }];
  g.hands[b] = [{ id: '1-2', a: 1, b: 2 }, { id: '0-5', a: 0, b: 5 }];
  D.act(g, a, { type: 'play', tile: '4-6' });
  assert.equal(g.phase, 'result');
  assert.equal(g.scores[a], 8);
  D.act(g, b, { type: 'next' });
  g.turn = a;
  g.stock = [];
  g.line = [{ id: 'y', a: 6, b: 6 }];
  g.hands[a] = [{ id: '0-1', a: 0, b: 1 }];
  g.hands[b] = [{ id: '2-3', a: 2, b: 3 }];
  D.act(g, a, { type: 'pass' });
  D.act(g, b, { type: 'pass' });
  assert.equal(g.result.blocked, true);
  assert.equal(g.result.winner, a);
  assert.equal(g.scores[a], 8 + 4);
});

test('各人数・ラウンド数で最後まで遊べる', () => {
  for (let n = 2; n <= 4; n++) {
    for (const rounds of D.ROUND_COUNTS) {
      for (let s = 0; s < 3; s++) {
        const rng = seededRng(n * 100 + rounds * 10 + s);
        const g = D.setup(makePlayers(n), rng, { rounds });
        playOut(g, rng);
        assert.equal(g.round, rounds);
        assert.ok(g.winners.length >= 1);
        D.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.round, 1);
      }
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = D.setup(makePlayers(3), seededRng(4));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => D.act(g, 'nobody', { type: 'draw' }), GameError);
  assert.throws(() => D.act(g, other, { type: 'draw' }), /番ではありません/);
  assert.throws(() => D.act(g, g.turn, { type: 'play', tile: g.hands[other][0].id }), /手にない/);
  assert.throws(() => D.act(g, g.turn, { type: 'next' }), GameError);
  assert.throws(() => D.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => D.act(g, g.turn, { type: 'hack' }), GameError);
});

test('ほかの人の手と山は view に出ない', () => {
  const g = D.setup(makePlayers(3), seededRng(5));
  const [a, b] = g.players;
  const v = JSON.stringify(D.view(g, a));
  for (const t of [...g.hands[b], ...g.stock]) assert.ok(!v.includes(`"${t.id}"`), `${t.id} が見えている`);
  assert.deepEqual(D.view(g, null).hand, []);
});
