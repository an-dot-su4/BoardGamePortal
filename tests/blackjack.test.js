import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../games/blackjack/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const c = (r, s = 'S') => ({ s, r, id: `x${s}${r}${Math.random()}` });

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 5000) throw new Error('終わらない');
    if (g.phase === 'result') {
      J.act(g, g.players[0], { type: 'next' }, rng);
      continue;
    }
    let acted = false;
    for (const p of g.players) {
      const a = J.bot(g, p, rng);
      if (a) {
        J.act(g, p, a, rng);
        acted = true;
        break;
      }
    }
    assert.ok(acted, 'だれも動けない');
  }
}

test('手札の合計（A は 1 か 11）', () => {
  assert.deepEqual(J.handValue([c(1), c(13)]), { total: 21, soft: true });
  assert.equal(J.handValue([c(1), c(1), c(9)]).total, 21);
  assert.equal(J.handValue([c(1), c(5), c(10)]).total, 16);
  assert.equal(J.handValue([c(10), c(12), c(5)]).total, 25);
  assert.ok(J.isBlackjack([c(1), c(11)]));
  assert.ok(!J.isBlackjack([c(5), c(6), c(10)]));
});

test('勝ち負けとチップの増減（ブラックジャックは1.5倍・引き分けは戻る）', () => {
  const g = J.setup(makePlayers(3), seededRng(1));
  const [a, b, d] = g.players;
  for (const p of g.players) J.act(g, p, { type: 'bet', amount: 10 });
  assert.equal(g.phase, 'play');
  g.hands = { [a]: [c(1), c(13)], [b]: [c(10), c(8)], [d]: [c(10), c(7)] };
  g.dealer = [c(10), c(7)];
  g.done = { [a]: true };
  g.turn = b;
  J.act(g, b, { type: 'stand' });
  J.act(g, d, { type: 'stand' });
  assert.equal(g.phase, 'result');
  assert.deepEqual([g.results[a].kind, g.results[b].kind, g.results[d].kind], ['blackjack', 'win', 'push']);
  assert.deepEqual([g.chips[a], g.chips[b], g.chips[d]], [115, 110, 100]);
});

test('ダブルは賭けが2倍で1枚だけ。バーストで負け', () => {
  const g = J.setup(makePlayers(2), seededRng(2));
  const [a, b] = g.players;
  J.act(g, a, { type: 'bet', amount: 20 });
  J.act(g, b, { type: 'bet', amount: 10 });
  g.hands[a] = [c(5), c(6)];
  g.hands[b] = [c(10), c(9)];
  g.dealer = [c(10), c(6)];
  g.done = {};
  g.turn = a;
  g.shoe.push(c(10));
  J.act(g, a, { type: 'double' });
  assert.equal(g.bets[a], 40);
  assert.equal(g.hands[a].length, 3);
  assert.equal(g.turn, b);
  g.shoe.push(c(5));
  J.act(g, b, { type: 'hit' });
  assert.equal(g.results[b].kind, 'bust');
  // 3枚目からはダブルできない
  const h = J.setup(makePlayers(1), seededRng(7));
  const [x] = h.players;
  J.act(h, x, { type: 'bet', amount: 10 });
  h.hands[x] = [c(2), c(3)];
  h.dealer = [c(10), c(7)];
  h.done = {};
  h.turn = x;
  h.phase = 'play';
  h.shoe.push(c(4));
  J.act(h, x, { type: 'hit' });
  assert.throws(() => J.act(h, x, { type: 'double' }), /最初の2枚/);
});

test('各人数・回数で最後まで遊べて、ディーラーは17以上で止まる', () => {
  for (let n = 1; n <= 6; n++) {
    for (const rounds of J.ROUND_COUNTS) {
      const rng = seededRng(n * 100 + rounds);
      const g = J.setup(makePlayers(n), rng, { rounds });
      playOut(g, rng);
      assert.ok(g.round <= rounds);
      assert.ok(g.winners.length >= 1);
      for (const p of g.players) assert.ok(g.chips[p] >= 0);
      const dv = J.handValue(g.dealer).total;
      assert.ok(dv >= 17 || g.players.every(p => !g.hands[p] || J.handValue(g.hands[p]).total > 21 || J.isBlackjack(g.hands[p])));
      J.act(g, g.players[0], { type: 'restart' }, rng);
      assert.equal(g.phase, 'bet');
      assert.equal(g.chips[g.players[0]], J.START_CHIPS);
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = J.setup(makePlayers(2), seededRng(3));
  const [a, b] = g.players;
  assert.throws(() => J.act(g, 'nobody', { type: 'bet', amount: 10 }), GameError);
  assert.throws(() => J.act(g, a, { type: 'bet', amount: 3 }), GameError);
  assert.throws(() => J.act(g, a, { type: 'bet', amount: 101 }), GameError);
  assert.throws(() => J.act(g, a, { type: 'bet', amount: '10' }), GameError);
  assert.throws(() => J.act(g, a, { type: 'hit' }), /今は/);
  J.act(g, a, { type: 'bet', amount: 10 });
  assert.throws(() => J.act(g, a, { type: 'bet', amount: 10 }), /もう賭けました/);
  J.act(g, b, { type: 'bet', amount: 10 });
  if (g.phase === 'play') {
    const other = g.players.find(p => p !== g.turn);
    if (other && !g.done[other]) assert.throws(() => J.act(g, other, { type: 'hit' }), /番ではありません/);
  }
  assert.throws(() => J.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => J.act(g, a, { type: 'hack' }), GameError);
});

test('ディーラーの伏せ札と山札、公開前の賭けは view に出ない', () => {
  const g = J.setup(makePlayers(2), seededRng(4));
  const [a, b] = g.players;
  J.act(g, a, { type: 'bet', amount: 35 });
  const vb = J.view(g, b);
  assert.equal(vb.players[0].bet, '?');
  assert.equal(J.view(g, a).players[0].bet, 35);
  J.act(g, b, { type: 'bet', amount: 10 });
  if (g.phase === 'play') {
    const v = J.view(g, a);
    assert.equal(v.dealer[1], null, '伏せ札が見えている');
    assert.ok(!JSON.stringify(v).includes(g.dealer[1].id));
    assert.ok(!('shoe' in v));
  }
});

test('CPU だけで何回も遊んでも、チップが極端に減りすぎない（基本作戦）', () => {
  let total = 0;
  const N = 60;
  for (let s = 0; s < N; s++) {
    const rng = seededRng(900 + s);
    const g = J.setup(makePlayers(1), rng, { rounds: 12 });
    playOut(g, rng);
    total += g.chips[g.players[0]];
  }
  assert.ok(total / N > 70, `平均チップ ${total / N}`);
});
