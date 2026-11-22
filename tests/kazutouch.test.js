import test from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../games/kazutouch/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function race(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 20000) throw new Error('終わらない');
    if (g.phase === 'result') {
      K.act(g, g.players[0], { type: 'next' }, rng);
      continue;
    }
    if (g.phase === 'ready') {
      for (const p of g.players) if (!g.ready[p]) K.act(g, p, { type: 'ready' }, rng);
      continue;
    }
    for (const p of g.players) {
      if (g.finished.includes(p) || g.phase !== 'race') continue;
      K.act(g, p, { type: 'tap', n: K.target(g.mode, g.progress[p]) }, rng);
    }
  }
}

test('全員が準備OKでスタート。順番どおりにタッチ、まちがえると1つ戻る', () => {
  const g = K.setup(makePlayers(2), seededRng(1));
  const [a, b] = g.players;
  assert.throws(() => K.act(g, a, { type: 'tap', n: 1 }), /スタートしていません/);
  K.act(g, a, { type: 'ready' });
  assert.equal(g.phase, 'ready');
  K.act(g, b, { type: 'ready' });
  assert.equal(g.phase, 'race');
  K.act(g, a, { type: 'tap', n: 1 });
  K.act(g, a, { type: 'tap', n: 2 });
  K.act(g, a, { type: 'tap', n: 7 });
  assert.equal(g.progress[a], 1, 'おてつきで1つ戻る');
  assert.equal(g.misses[a], 1);
});

test('先にゴールした人から順位がつき、点が入る。回ごとにお題が変わる', () => {
  const g = K.setup(makePlayers(3), seededRng(2), { rounds: 3 });
  const [a, b, c] = g.players;
  for (const p of g.players) K.act(g, p, { type: 'ready' });
  for (let n = 1; n <= 25; n++) K.act(g, b, { type: 'tap', n });
  for (let n = 1; n <= 25; n++) K.act(g, c, { type: 'tap', n });
  for (let n = 1; n <= 25; n++) K.act(g, a, { type: 'tap', n });
  assert.equal(g.phase, 'result');
  assert.deepEqual([g.scores[a], g.scores[b], g.scores[c]], [1, 3, 2]);
  K.act(g, a, { type: 'next' });
  assert.equal(g.mode, 'desc');
  for (const p of g.players) K.act(g, p, { type: 'ready' });
  K.act(g, a, { type: 'tap', n: 25 });
  assert.equal(g.progress[a], 1);
});

test('並び替わるお題ではタッチするたびに盤が変わる', () => {
  const g = K.setup(makePlayers(1), seededRng(3), { rounds: 3 });
  const [a] = g.players;
  g.mode = 'shuffle';
  K.act(g, a, { type: 'ready' });
  const before = g.grids[a].join(',');
  K.act(g, a, { type: 'tap', n: 1 });
  assert.notEqual(g.grids[a].join(','), before);
  assert.deepEqual(g.grids[a].slice().sort((x, y) => x - y), Array.from({ length: 25 }, (_, i) => i + 1));
});

test('各人数・回数で最後まで遊べる（CPUだけでも）', () => {
  for (let n = 1; n <= 8; n++) {
    for (const rounds of K.ROUND_COUNTS) {
      const rng = seededRng(n * 10 + rounds);
      const g = K.setup(makePlayers(n), rng, { rounds });
      race(g, rng);
      assert.equal(g.history.length, rounds);
      assert.ok(g.winners.length >= 1);
      K.act(g, g.players[0], { type: 'restart' }, rng);
      assert.equal(g.round, 1);
    }
    // CPU だけ
    const rng = seededRng(500 + n);
    const g = K.setup(makePlayers(n).map(p => ({ ...p, bot: true })), rng, { rounds: 1 });
    let steps = 0;
    while (g.phase !== 'end') {
      if (steps++ > 20000) throw new Error('CPU だけで終わらない');
      // ホストと同じく、1回に動けるのは CPU 1人だけ
      const p = g.players.find(q => K.bot(g, q, rng));
      assert.ok(p, 'どの CPU も動けない');
      K.act(g, p, K.bot(g, p, rng), rng);
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = K.setup(makePlayers(2), seededRng(4));
  const [a, b] = g.players;
  assert.throws(() => K.act(g, 'nobody', { type: 'ready' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'next' }), GameError);
  K.act(g, a, { type: 'ready' });
  K.act(g, b, { type: 'ready' });
  assert.throws(() => K.act(g, a, { type: 'tap', n: 0 }), GameError);
  assert.throws(() => K.act(g, a, { type: 'tap', n: '1' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'wait' }), /できません/, '人は wait を使えない');
  assert.throws(() => K.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'hack' }), GameError);
});

test('view には自分の盤だけ（ほかの人の盤は送らない）', () => {
  const g = K.setup(makePlayers(3), seededRng(5));
  const [a, b] = g.players;
  const va = K.view(g, a);
  assert.deepEqual(va.grid, g.grids[a]);
  assert.ok(!JSON.stringify(va).includes(JSON.stringify(g.grids[b])));
  assert.equal(K.view(g, null).grid, null);
});

test('CPU が何人いても交代で進む（1人だけ先に進まない）', () => {
  const rng = seededRng(42);
  const g = K.setup(makePlayers(4).map(p => ({ ...p, bot: true })), rng, { rounds: 1, cpu: 'strong' });
  for (let i = 0; i < 60; i++) {
    const p = g.players.find(q => K.bot(g, q, rng));
    K.act(g, p, K.bot(g, p, rng), rng);
  }
  const prog = g.players.map(p => g.progress[p]);
  assert.ok(Math.min(...prog) >= 8, `進み具合 ${prog}`);
});
