import test from 'node:test';
import assert from 'node:assert/strict';
import * as U from '../games/usodice/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 20000) throw new Error('終わらない');
    if (g.phase === 'reveal') {
      U.act(g, g.players[0], { type: 'next' }, rng);
      continue;
    }
    const a = U.bot(g, g.turn, rng);
    assert.ok(a, 'CPU が手を返さない');
    U.act(g, g.turn, a, rng);
  }
}

test('上げ方の判定', () => {
  assert.ok(U.isRaise(null, { q: 1, f: 2 }, true));
  assert.equal(U.isRaise(null, { q: 3, f: 1 }, true), false, '最初は★を言えない');
  assert.ok(U.isRaise(null, { q: 3, f: 1 }, false));
  assert.ok(U.isRaise({ q: 3, f: 4 }, { q: 3, f: 5 }, true));
  assert.equal(U.isRaise({ q: 3, f: 4 }, { q: 3, f: 3 }, true), false);
  assert.ok(U.isRaise({ q: 3, f: 4 }, { q: 4, f: 2 }, true));
  assert.ok(U.isRaise({ q: 5, f: 4 }, { q: 3, f: 1 }, true), '★は半分（切り上げ）');
  assert.equal(U.isRaise({ q: 5, f: 4 }, { q: 2, f: 1 }, true), false);
  assert.ok(U.isRaise({ q: 3, f: 1 }, { q: 7, f: 2 }, true), '★から戻るのは2倍+1');
  assert.equal(U.isRaise({ q: 3, f: 1 }, { q: 6, f: 6 }, true), false);
  assert.equal(U.countFace([1, 1, 3, 4], 3, true), 3);
  assert.equal(U.countFace([1, 1, 3, 4], 3, false), 1);
  assert.equal(U.countFace([1, 1, 3, 4], 1, true), 2);
});

test('各人数・各設定でランダムに最後まで遊べる', () => {
  for (let n = 2; n <= 8; n++) {
    for (const dice of [3, 5]) {
      for (const wild of [true, false]) {
        const rng = seededRng(n * 31 + dice + (wild ? 100 : 0));
        const g = U.setup(makePlayers(n), rng, { dice, wild });
        playOut(g, rng);
        const left = g.players.filter(p => g.count[p] > 0);
        assert.equal(left.length, 1);
        assert.equal(g.winner, left[0]);
        assert.equal(g.out.length, n - 1);
        U.act(g, g.players[1], { type: 'restart' }, rng);
        assert.equal(g.phase, 'bid');
        assert.equal(U.totalDice(g), n * dice);
      }
    }
  }
});

test('ダウトの判定とサイコロを失う人', () => {
  const g = U.setup(makePlayers(3), seededRng(1));
  const [a, b, c] = g.players;
  g.turn = a;
  g.dice = { [a]: [1, 4, 4, 5, 6], [b]: [2, 3, 4, 6, 6], [c]: [1, 1, 2, 2, 3] };
  U.act(g, a, { type: 'bid', q: 5, f: 4 }); // 4は3個＋★3個 = 6個
  U.act(g, b, { type: 'doubt' });
  assert.equal(g.result.actual, 6);
  assert.equal(g.result.loser, b, '宣言どおりあればダウトした人が失う');
  assert.equal(g.count[b], 4);
  assert.equal(g.phase, 'reveal');
  assert.equal(g.starter, b);
  U.act(g, c, { type: 'next' });
  assert.equal(g.turn, b);
  g.dice = { [a]: [2, 2, 2, 2, 2], [b]: [3, 3, 3, 3], [c]: [5, 5, 5, 5, 5] };
  U.act(g, b, { type: 'bid', q: 3, f: 6 });
  U.act(g, c, { type: 'doubt' });
  assert.equal(g.result.loser, b, '足りなければ宣言した人が失う');
});

test('不正な操作は拒否される', () => {
  const g = U.setup(makePlayers(3), seededRng(5));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => U.act(g, 'nobody', { type: 'bid', q: 1, f: 2 }), GameError);
  assert.throws(() => U.act(g, other, { type: 'bid', q: 1, f: 2 }), /番ではありません/);
  assert.throws(() => U.act(g, g.turn, { type: 'doubt' }), /まだ誰も/);
  assert.throws(() => U.act(g, g.turn, { type: 'bid', q: 1, f: 7 }), GameError);
  assert.throws(() => U.act(g, g.turn, { type: 'bid', q: 16, f: 3 }), GameError);
  assert.throws(() => U.act(g, g.turn, { type: 'bid', q: '2', f: 3 }), GameError);
  assert.throws(() => U.act(g, g.turn, { type: 'bid', q: 2, f: 1 }), /★/);
  assert.throws(() => U.act(g, g.turn, { type: 'next' }), GameError);
  assert.throws(() => U.act(g, g.turn, { type: 'restart' }), GameError);
  U.act(g, g.turn, { type: 'bid', q: 3, f: 4 });
  assert.throws(() => U.act(g, g.turn, { type: 'bid', q: 3, f: 2 }), /より上/);
  assert.throws(() => U.act(g, g.turn, { type: 'hack' }), GameError);
});

test('他人のサイコロは公開まで view に出ない', () => {
  const g = U.setup(makePlayers(4), seededRng(9));
  const [a] = g.players;
  const va = U.view(g, a);
  assert.deepEqual(va.myDice, g.dice[a]);
  assert.equal(va.result, null);
  const text = JSON.stringify(va);
  assert.ok(!/"dice"\s*:\s*\{/.test(text));
  assert.ok(!text.includes('shown'), '公開前に全員の目が入っている');
  assert.equal(va.players.find(p => p.id !== a).dice, undefined);
  const sp = U.view(g, null);
  assert.deepEqual(sp.myDice, []);
  // ダウトのあとは全員分が公開される
  U.act(g, g.turn, { type: 'bid', q: 1, f: 2 });
  U.act(g, g.turn, { type: 'doubt' });
  assert.equal(Object.keys(U.view(g, null).result.shown).length, 4);
});

test('CPU は無茶なダウトをしない（明らかに本当の宣言はダウトしにくい）', () => {
  let doubts = 0;
  for (let s = 0; s < 200; s++) {
    const rng = seededRng(500 + s);
    const g = U.setup(makePlayers(4), rng);
    const [a, b] = [g.turn, g.players[(g.players.indexOf(g.turn) + 1) % 4]];
    U.act(g, a, { type: 'bid', q: 2, f: 6 }); // 20個中、6か★が2個以上はほぼ確実
    if (U.bot(g, b, rng).type === 'doubt') doubts++;
  }
  assert.ok(doubts < 10, `ダウト ${doubts}/200`);
});
