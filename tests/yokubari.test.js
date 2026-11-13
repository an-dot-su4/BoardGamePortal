import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from '../games/yokubari/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 20000) throw new Error('終わらない');
    Y.act(g, g.turn, Y.bot(g, g.turn, rng), rng);
  }
}

// 決まった目を順に返す乱数（die = 1 + floor(r*6)）
const fixed = faces => {
  let i = 0;
  return () => (faces[i++ % faces.length] - 1) / 6 + 0.01;
};

test('出目の判定', () => {
  assert.deepEqual(Y.outcome(1, 1), { kind: 'pinzoro', gain: 0 });
  assert.deepEqual(Y.outcome(1, 5), { kind: 'bust', gain: 0 });
  assert.deepEqual(Y.outcome(4, 4), { kind: 'double', gain: 16 });
  assert.deepEqual(Y.outcome(2, 5), { kind: 'ok', gain: 7 });
});

test('振る・ためる・1で消える・ピンゾロで全部消える', () => {
  const g = Y.setup(makePlayers(2), seededRng(1));
  const [a, b] = g.players;
  g.turn = a;
  g.turnIndex = 0;
  Y.act(g, a, { type: 'roll' }, fixed([3, 4]));
  Y.act(g, a, { type: 'roll' }, fixed([5, 5]));
  assert.equal(g.pot, 27);
  Y.act(g, a, { type: 'hold' });
  assert.equal(g.scores[a], 27);
  assert.equal(g.turn, b);
  Y.act(g, b, { type: 'roll' }, fixed([6, 2]));
  Y.act(g, b, { type: 'roll' }, fixed([1, 3]));
  assert.equal(g.scores[b], 0);
  assert.equal(g.turn, a);
  Y.act(g, a, { type: 'roll' }, fixed([1, 1]));
  assert.equal(g.scores[a], 0, 'ピンゾロでためた点も0');
  assert.equal(g.turn, b);
});

test('目標に届いたら周の最後まで回して、いちばん多い人の勝ち', () => {
  const g = Y.setup(makePlayers(3), seededRng(2), { goal: 50 });
  const [a, b, c] = g.players;
  g.first = 0;
  g.turnIndex = 0;
  g.turn = a;
  g.scores[a] = 45;
  Y.act(g, a, { type: 'roll' }, fixed([3, 4]));
  Y.act(g, a, { type: 'hold' });
  assert.equal(g.phase, 'play');
  assert.ok(g.lastRound);
  Y.act(g, b, { type: 'roll' }, fixed([1, 2]));
  assert.equal(g.turn, c);
  g.scores[c] = 40;
  Y.act(g, c, { type: 'roll' }, fixed([6, 6]));
  Y.act(g, c, { type: 'hold' });
  assert.equal(g.phase, 'end');
  assert.deepEqual(g.winners, [c]);
  assert.equal(g.wins[c], 1);
});

test('各人数・目標でランダムに最後まで遊べる', () => {
  for (let n = 2; n <= 8; n++) {
    for (const goal of Y.GOALS) {
      const rng = seededRng(n * 1000 + goal);
      const g = Y.setup(makePlayers(n), rng, { goal });
      playOut(g, rng);
      assert.ok(g.winners.length >= 1);
      assert.ok(g.players.some(p => g.scores[p] >= goal));
      const firstNext = g.players[(g.first + 1) % n];
      Y.act(g, g.players[0], { type: 'restart' }, rng);
      assert.equal(g.turn, firstNext, '次の局は先手が交代');
      assert.ok(g.players.every(p => g.scores[p] === 0));
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = Y.setup(makePlayers(3), seededRng(3));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => Y.act(g, 'nobody', { type: 'roll' }), GameError);
  assert.throws(() => Y.act(g, other, { type: 'roll' }), /番ではありません/);
  assert.throws(() => Y.act(g, g.turn, { type: 'hold' }), /振ってから/);
  assert.throws(() => Y.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => Y.act(g, g.turn, { type: 'hack' }), GameError);
});

test('view は公開情報だけ（隠す情報はない）・観戦者は me が null', () => {
  const g = Y.setup(makePlayers(2), seededRng(4));
  assert.equal(Y.view(g, null).me, null);
  assert.equal(Y.view(g, g.players[0]).players.length, 2);
});

test('CPU の手番は平均してほどよい長さ（勝ちが偏りすぎない）', () => {
  const wins = [0, 0, 0];
  let turns = 0;
  for (let s = 0; s < 150; s++) {
    const rng = seededRng(400 + s);
    const g = Y.setup(makePlayers(3), rng);
    let t = 0;
    while (g.phase !== 'end') {
      const before = g.turn;
      Y.act(g, g.turn, Y.bot(g, g.turn, rng), rng);
      if (g.turn !== before) t++;
    }
    turns += t;
    for (const w of g.winners) wins[g.players.indexOf(w)]++;
  }
  assert.ok(Math.min(...wins) > 25, `席ごとの勝ち ${wins}`);
  const avg = turns / 150;
  assert.ok(avg > 15 && avg < 60, `平均手番数 ${avg}`);
});
