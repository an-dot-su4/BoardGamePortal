import test from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../games/kakoi/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng, levels = null) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 1000) throw new Error('終わらない');
    if (levels) g.options.cpu = levels[g.players.indexOf(g.turn)];
    const a = K.bot(g, g.turn, rng);
    assert.ok(a);
    K.act(g, g.turn, a, rng);
  }
}

test('線と箱の関係', () => {
  assert.equal(K.allLines(3, 3).length, 24);
  assert.deepEqual(K.boxesOf('h-0-1', 3, 3), [[0, 1]]);
  assert.deepEqual(K.boxesOf('v-1-1', 3, 3), [[1, 0], [1, 1]]);
  assert.ok(K.isLine('h-3-2', 3, 3));
  assert.equal(K.isLine('h-3-3', 3, 3), false);
  assert.equal(K.isLine('v-3-0', 3, 3), false);
  assert.equal(K.isLine('x-0-0', 3, 3), false);
});

test('4辺そろえると箱を取ってもう1本', () => {
  const g = K.setup(makePlayers(2), seededRng(1), { size: 3 });
  const [a, b] = g.players;
  K.act(g, a, { type: 'line', id: 'h-0-0' });
  K.act(g, b, { type: 'line', id: 'h-1-0' });
  K.act(g, a, { type: 'line', id: 'v-0-0' });
  assert.equal(g.turn, b);
  K.act(g, b, { type: 'line', id: 'v-0-1' });
  assert.equal(g.boxes['0-0'], 1);
  assert.equal(g.turn, b, '取ったらもう1本');
});

test('いろいろな人数・大きさで最後まで遊べる', () => {
  for (let n = 2; n <= 4; n++) {
    for (const size of [0, 3, 6]) {
      for (const cpu of ['weak', 'strong']) {
        const rng = seededRng(n * 100 + size * 10 + (cpu === 'weak' ? 1 : 2));
        const g = K.setup(makePlayers(n), rng, { size, cpu });
        playOut(g, rng);
        const R = size || K.defaultSize(n);
        assert.equal(Object.keys(g.boxes).length, R * R, '箱は全部取られる');
        assert.ok(g.winners.length >= 1);
        const firstTurn = g.players[(g.first + 1) % n];
        K.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.turn, firstTurn, '次の局は先手が交代');
        assert.equal(Object.keys(g.lines).length, 0);
      }
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = K.setup(makePlayers(3), seededRng(2));
  const [a, b] = g.players;
  assert.throws(() => K.act(g, 'nobody', { type: 'line', id: 'h-0-0' }), GameError);
  assert.throws(() => K.act(g, b, { type: 'line', id: 'h-0-0' }), /番ではありません/);
  assert.throws(() => K.act(g, a, { type: 'line', id: 'h-9-0' }), /引けません/);
  assert.throws(() => K.act(g, a, { type: 'line', id: { x: 1 } }), /引けません/);
  assert.throws(() => K.act(g, a, { type: 'line', id: '__proto__' }), /引けません/);
  assert.throws(() => K.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'hack' }), GameError);
  K.act(g, a, { type: 'line', id: 'h-0-0' });
  assert.throws(() => K.act(g, b, { type: 'line', id: 'h-0-0' }), /もう引かれて/);
});

test('view: 観戦者も盤は見える（隠す情報はない）', () => {
  const g = K.setup(makePlayers(2), seededRng(3));
  const v = K.view(g, null);
  assert.equal(v.me, null);
  assert.equal(v.R, 4);
});

test('強いCPUは弱いCPUにだいたい勝つ', () => {
  let wins = 0;
  const N = 30;
  for (let s = 0; s < N; s++) {
    const rng = seededRng(700 + s);
    const g = K.setup(makePlayers(2), rng, { size: 4 });
    const strong = s % 2;
    const levels = strong === 0 ? ['strong', 'weak'] : ['weak', 'strong'];
    playOut(g, rng, levels);
    if (g.winners.length === 1 && g.winners[0] === g.players[strong]) wins++;
  }
  assert.ok(wins >= N * 0.65, `強いCPUの勝ち ${wins}/${N}`);
});
