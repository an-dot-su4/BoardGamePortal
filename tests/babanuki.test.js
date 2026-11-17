import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../games/babanuki/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const total = g => g.players.reduce((a, p) => a + g.hands[p].length, 0) + g.discards;

test('最初に組を捨て、手札に同じ数字の組が残らない', () => {
  const g = B.setup(makePlayers(4), seededRng(1));
  assert.equal(total(g), 53);
  for (const p of g.players) {
    const ranks = g.hands[p].filter(c => c.r !== B.JOKER).map(c => c.r);
    assert.equal(new Set(ranks).size, ranks.length);
  }
});

test('次の人から引き、組になれば捨てて、引かれた人の番になる', () => {
  const g = B.setup(makePlayers(3), seededRng(2));
  const [a, b, c] = g.players;
  g.turn = a;
  g.hands[a] = [{ id: 'S5', s: 'S', r: 5 }, { id: 'H9', s: 'H', r: 9 }];
  g.hands[b] = [{ id: 'D5', s: 'D', r: 5 }, { id: 'JK', s: 'X', r: 0 }];
  g.hands[c] = [{ id: 'C9', s: 'C', r: 9 }];
  g.discards = 53 - 5;
  assert.equal(B.targetOf(g), b);
  B.act(g, a, { type: 'draw', index: 0 });
  assert.equal(g.hands[a].length, 1, '5の組を捨てた');
  assert.equal(g.last.paired[0].r, 5);
  assert.equal(g.turn, b);
  B.act(g, b, { type: 'draw', index: 0 }); // c から9を引く → c は上がり
  assert.ok(g.finished.includes(c));
  assert.equal(g.turn, a, 'c が上がったので a が次（b から引く）');
  assert.equal(B.targetOf(g), b);
  // a が9を持ち、b はジョーカーと9。a がジョーカー以外を引けば上がり
  const nine = g.hands[b].findIndex(x => x.r === 9);
  B.act(g, a, { type: 'draw', index: nine });
  assert.equal(g.phase, 'end');
  assert.equal(g.loser, b);
  assert.deepEqual(g.finished, [c, a]);
});

test('各人数でランダムに最後まで遊べて、ジョーカーを持った人が負け', () => {
  for (let n = 2; n <= 6; n++) {
    for (let s = 0; s < 5; s++) {
      const rng = seededRng(n * 100 + s);
      const g = B.setup(makePlayers(n), rng);
      let steps = 0;
      while (g.phase !== 'end') {
        if (steps++ > 3000) throw new Error('終わらない');
        if (rng() < 0.1) B.act(g, g.turn, { type: 'shuffle' }, rng);
        B.act(g, g.turn, B.bot(g, g.turn, rng), rng);
        assert.equal(total(g), 53, 'カードの枚数が合わない');
      }
      assert.ok(g.loser);
      assert.deepEqual(g.hands[g.loser].map(c => c.r), [B.JOKER]);
      assert.equal(g.finished.length, n - 1);
      B.act(g, g.players[0], { type: 'restart' }, rng);
      assert.equal(g.phase, 'play');
      assert.equal(total(g), 53);
      assert.equal(g.games, 2);
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = B.setup(makePlayers(3), seededRng(3));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => B.act(g, 'nobody', { type: 'draw', index: 0 }), GameError);
  assert.throws(() => B.act(g, other, { type: 'draw', index: 0 }), /番ではありません/);
  assert.throws(() => B.act(g, g.turn, { type: 'draw', index: 99 }), /引けません/);
  assert.throws(() => B.act(g, g.turn, { type: 'draw', index: -1 }), /引けません/);
  assert.throws(() => B.act(g, g.turn, { type: 'draw', index: '0' }), /引けません/);
  assert.throws(() => B.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => B.act(g, g.turn, { type: 'hack' }), GameError);
});

test('ほかの人の手札と、引いたカードは関係ない人の view に出ない', () => {
  const g = B.setup(makePlayers(3), seededRng(4));
  const [a, b, c] = [g.turn, B.targetOf(g), g.players.find(p => p !== g.turn && p !== B.targetOf(g))];
  for (const p of [b, c]) {
    const v = JSON.stringify(B.view(g, a));
    for (const x of g.hands[p]) assert.ok(!v.includes(`"${x.id}"`), 'ほかの人の手札が見えている');
  }
  // ペアにならない引き方を探す
  const idx = g.hands[b].findIndex(x => !g.hands[a].some(y => y.r === x.r && x.r !== B.JOKER));
  if (idx >= 0) {
    B.act(g, a, { type: 'draw', index: idx });
    const drawn = g.last.card;
    assert.equal(B.view(g, a).last.card.id, drawn.id);
    assert.equal(B.view(g, b).last.card.id, drawn.id);
    assert.equal(B.view(g, c).last.card, null, '関係ない人に引いたカードが見えている');
    assert.equal(B.view(g, null).last.card, null);
  }
});
