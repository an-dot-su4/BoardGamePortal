import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../games/pitari/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

// 全員 CPU の判断で最後まで遊ぶ
function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 5000) throw new Error('終わらない');
    if (g.phase === 'roundEnd') {
      P.act(g, g.players[0], { type: 'next' }, rng);
      continue;
    }
    const a = P.bot(g, g.turn, rng);
    assert.ok(a, 'CPU が手を返さない');
    P.act(g, g.turn, a, rng);
  }
}

test('ラウンドの枚数', () => {
  assert.deepEqual(P.roundSizes(4, 'short'), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(P.roundSizes(4, 'full'), [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual(P.roundSizes(8, 'short'), [1, 2, 3, 4, 5, 6]);
});

test('各人数・各設定でランダムに最後まで遊べて、得点が履歴と一致する', () => {
  for (let n = 2; n <= 8; n++) {
    for (const length of ['short', 'full']) {
      for (const hook of [true, false]) {
        const rng = seededRng(n * 100 + (length === 'full' ? 7 : 0) + (hook ? 1 : 0));
        const g = P.setup(makePlayers(n), rng, { length, hook });
        playOut(g, rng);
        assert.equal(g.history.length, g.sizes.length);
        for (const p of g.players) {
          assert.equal(g.scores[p], g.history.reduce((a, h) => a + h.rows[p].gain, 0));
        }
        for (const h of g.history) {
          const took = g.players.reduce((a, p) => a + h.rows[p].took, 0);
          assert.equal(took, h.size, '取った回数の合計は配った枚数');
          if (hook) {
            const bids = g.players.reduce((a, p) => a + h.rows[p].bid, 0);
            assert.notEqual(bids, h.size, 'しばりありなら宣言の合計は枚数と同じにならない');
          }
        }
        P.act(g, g.players[1], { type: 'restart' }, rng);
        assert.equal(g.phase, 'bid');
        assert.equal(g.round, 0);
      }
    }
  }
});

test('台札があれば同じマークを出す・切り札が勝つ', () => {
  const g = P.setup(makePlayers(3), seededRng(1));
  const [a, b, c] = g.players;
  g.round = 2;
  g.phase = 'play';
  g.trump = { id: 'S2', s: 'S', r: 2 };
  g.bids = { [a]: 1, [b]: 1, [c]: 0 };
  g.hands[a] = [{ id: 'H5', s: 'H', r: 5 }, { id: 'C9', s: 'C', r: 9 }];
  g.hands[b] = [{ id: 'H14', s: 'H', r: 14 }, { id: 'S3', s: 'S', r: 3 }];
  g.hands[c] = [{ id: 'D13', s: 'D', r: 13 }, { id: 'S4', s: 'S', r: 4 }];
  g.turn = a;
  P.act(g, a, { type: 'play', card: 'H5' });
  assert.throws(() => P.act(g, b, { type: 'play', card: 'S3' }), GameError, '台札を持っているのに切り札');
  P.act(g, b, { type: 'play', card: 'H14' });
  P.act(g, c, { type: 'play', card: 'S4' }); // ハートがないので切り札で切れる
  assert.equal(g.lastTrick.winner, c);
  assert.equal(g.turn, c);
  assert.equal(g.took[c], 1);
});

test('親のしばり', () => {
  const g = P.setup(makePlayers(3), seededRng(3));
  const order = [];
  for (let p = g.turn; order.length < 3; p = g.players[(g.players.indexOf(p) + 1) % 3]) order.push(p);
  assert.equal(order[2], g.dealer);
  // 1枚のラウンド: 2人が0と宣言 → 親は1を言えない
  P.act(g, order[0], { type: 'bid', n: 0 });
  P.act(g, order[1], { type: 'bid', n: 0 });
  assert.throws(() => P.act(g, order[2], { type: 'bid', n: 1 }), /言えません/);
  P.act(g, order[2], { type: 'bid', n: 0 });
  assert.equal(g.phase, 'play');
});

test('不正な操作は拒否される', () => {
  const g = P.setup(makePlayers(4), seededRng(5));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => P.act(g, 'nobody', { type: 'bid', n: 0 }), GameError);
  assert.throws(() => P.act(g, other, { type: 'bid', n: 0 }), GameError);
  assert.throws(() => P.act(g, g.turn, { type: 'bid', n: 2 }), GameError, '枚数より多い');
  assert.throws(() => P.act(g, g.turn, { type: 'bid', n: -1 }), GameError);
  assert.throws(() => P.act(g, g.turn, { type: 'bid', n: '1' }), GameError);
  assert.throws(() => P.act(g, g.turn, { type: 'play', card: g.hands[g.turn][0].id }), GameError, '宣言中は出せない');
  assert.throws(() => P.act(g, g.turn, { type: 'next' }), GameError);
  assert.throws(() => P.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => P.act(g, g.turn, { type: 'hack' }), GameError);
  while (g.phase === 'bid') P.act(g, g.turn, P.bot(g, g.turn, seededRng(1)));
  const someoneElse = g.players.find(p => p !== g.turn);
  assert.throws(() => P.act(g, g.turn, { type: 'play', card: g.hands[someoneElse][0].id }), /手札にない/);
  assert.throws(() => P.act(g, someoneElse, { type: 'play', card: g.hands[someoneElse][0].id }), /番ではありません/);
});

test('他人の手札と山札は view に出ない', () => {
  const rng = seededRng(9);
  const g = P.setup(makePlayers(4), rng, { length: 'short' });
  g.round = 0;
  while (g.round < 3) {
    if (g.phase === 'roundEnd') P.act(g, g.players[0], { type: 'next' }, rng);
    else P.act(g, g.turn, P.bot(g, g.turn, rng), rng);
  }
  const [a, b] = g.players;
  const va = JSON.stringify(P.view(g, a));
  for (const c of g.hands[b]) assert.ok(!va.includes(`"${c.id}"`), '他人の手札が見えている');
  const spectator = P.view(g, null);
  assert.deepEqual(spectator.hand, []);
  const sv = JSON.stringify(spectator);
  for (const p of g.players) for (const c of g.hands[p]) assert.ok(!sv.includes(`"${c.id}"`));
  assert.equal(P.view(g, a).hand.length, g.hands[a].length);
});

test('CPU は宣言ぴったりをそこそこ当てる（ランダムより強い）', () => {
  let hits = 0, total = 0;
  for (let s = 0; s < 40; s++) {
    const rng = seededRng(1000 + s);
    const g = P.setup(makePlayers(4), rng);
    playOut(g, rng);
    for (const h of g.history) for (const p of g.players) { total++; if (h.rows[p].exact) hits++; }
  }
  const rate = hits / total;
  assert.ok(rate > 0.4, `ぴたり率 ${rate}`);
});
