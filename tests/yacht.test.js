import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from '../games/yacht/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

test('役の点数', () => {
  assert.equal(Y.scoreFor('threes', [3, 3, 1, 3, 6]), 9);
  assert.equal(Y.scoreFor('choice', [1, 2, 3, 4, 6]), 16);
  assert.equal(Y.scoreFor('four', [5, 5, 5, 5, 2]), 22);
  assert.equal(Y.scoreFor('four', [5, 5, 5, 5, 5]), 25, 'ヨットはフォーカードにもなる');
  assert.equal(Y.scoreFor('four', [5, 5, 5, 2, 2]), 0);
  assert.equal(Y.scoreFor('full', [2, 2, 6, 6, 6]), 22);
  assert.equal(Y.scoreFor('full', [6, 6, 6, 6, 6]), 0, '5つ同じはフルハウスではない');
  assert.equal(Y.scoreFor('sstr', [1, 3, 2, 4, 4]), 15);
  assert.equal(Y.scoreFor('sstr', [1, 2, 3, 5, 6]), 0);
  assert.equal(Y.scoreFor('lstr', [2, 3, 4, 5, 6]), 30);
  assert.equal(Y.scoreFor('lstr', [1, 2, 3, 4, 6]), 0);
  assert.equal(Y.scoreFor('yacht', [4, 4, 4, 4, 4]), 50);
});

test('1〜6が63点以上でボーナス', () => {
  const sheet = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
  assert.deepEqual(Y.totals(sheet), { upper: 63, bonus: 35, lower: 0, total: 98 });
  sheet.ones = 2;
  assert.equal(Y.totals(sheet).bonus, 0);
});

test('振る・とっておく・3回まで・役を埋めると次の人', () => {
  const g = Y.setup(makePlayers(2), seededRng(1));
  const [a, b] = g.players;
  assert.throws(() => Y.act(g, a, { type: 'score', cat: 'choice' }), /振って/);
  assert.throws(() => Y.act(g, a, { type: 'hold', index: 0 }), /振って/);
  Y.act(g, a, { type: 'roll' });
  const first = g.dice[0];
  Y.act(g, a, { type: 'hold', index: 0 });
  Y.act(g, a, { type: 'roll' });
  assert.equal(g.dice[0], first, 'とっておいたサイコロは変わらない');
  Y.act(g, a, { type: 'roll' });
  assert.throws(() => Y.act(g, a, { type: 'roll' }), /3回/);
  Y.act(g, a, { type: 'score', cat: 'choice' });
  assert.equal(g.sheets[a].choice, g.lastScore.pts);
  assert.equal(g.turn, b);
  assert.equal(g.rolls, 0);
  Y.act(g, b, { type: 'roll' });
  Y.act(g, b, { type: 'score', cat: 'choice' });
  Y.act(g, a, { type: 'roll' });
  assert.throws(() => Y.act(g, a, { type: 'score', cat: 'choice' }), /もう埋めて/);
});

test('各人数で最後まで遊べて、全員が12役を埋める', () => {
  for (let n = 2; n <= 6; n++) {
    const rng = seededRng(n * 10);
    const g = Y.setup(makePlayers(n), rng);
    let steps = 0;
    while (g.phase !== 'end') {
      if (steps++ > 5000) throw new Error('終わらない');
      Y.act(g, g.turn, Y.bot(g, g.turn, rng), rng);
    }
    for (const p of g.players) assert.equal(Object.keys(g.sheets[p]).length, 12);
    assert.ok(g.winners.length >= 1);
    Y.act(g, g.players[0], { type: 'restart' }, rng);
    assert.equal(g.turn, g.players[1], '次の局は先手が交代');
  }
});

test('CPU の平均点がそれなりにある', () => {
  let total = 0;
  const N = 60;
  for (let s = 0; s < N; s++) {
    const rng = seededRng(100 + s);
    const g = Y.setup(makePlayers(2), rng);
    while (g.phase !== 'end') Y.act(g, g.turn, Y.bot(g, g.turn, rng), rng);
    total += Y.totals(g.sheets[g.players[0]]).total;
  }
  assert.ok(total / N > 140, `平均 ${total / N}`);
});

test('不正な操作は拒否される', () => {
  const g = Y.setup(makePlayers(3), seededRng(2));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => Y.act(g, 'nobody', { type: 'roll' }), GameError);
  assert.throws(() => Y.act(g, other, { type: 'roll' }), /番ではありません/);
  Y.act(g, g.turn, { type: 'roll' });
  assert.throws(() => Y.act(g, g.turn, { type: 'hold', index: 5 }), GameError);
  assert.throws(() => Y.act(g, g.turn, { type: 'hold', index: '1' }), GameError);
  assert.throws(() => Y.act(g, g.turn, { type: 'score', cat: 'bonus' }), /その役はありません/);
  assert.throws(() => Y.act(g, g.turn, { type: 'score', cat: '__proto__' }), /その役はありません/);
  assert.throws(() => Y.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => Y.act(g, g.turn, { type: 'hack' }), GameError);
});

test('view は公開情報だけ（隠す情報はない）', () => {
  const g = Y.setup(makePlayers(2), seededRng(3));
  assert.equal(Y.view(g, null).me, null);
  assert.equal(Y.view(g, g.players[0]).players.length, 2);
});
