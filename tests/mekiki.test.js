import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../games/mekiki/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 1000) throw new Error('終わらない');
    if (g.phase === 'reveal') {
      M.act(g, g.players[0], { type: 'next' }, rng);
      continue;
    }
    for (const p of g.players) {
      const a = M.bot(g, p, rng);
      if (a) M.act(g, p, a, rng);
      if (g.phase !== 'bid') break;
    }
  }
}

test('各人数・回数で最後まで遊べて、お金と宝の数が合う', () => {
  for (let n = 3; n <= 6; n++) {
    for (const rounds of M.ROUND_COUNTS) {
      const rng = seededRng(n * 100 + rounds);
      const g = M.setup(makePlayers(n), rng, { rounds });
      playOut(g, rng);
      assert.equal(g.history.length, rounds);
      const spent = g.history.reduce((a, h) => a + (h.winner ? h.price : 0), 0);
      const money = g.players.reduce((a, p) => a + g.money[p], 0);
      assert.equal(money + spent, n * M.START_MONEY);
      const got = g.players.reduce((a, p) => a + g.items[p].length, 0);
      assert.equal(got, g.history.filter(h => h.winner).length);
      for (const p of g.players) assert.ok(g.money[p] >= 0);
      assert.ok(g.winners.length >= 1);
      M.act(g, g.players[2], { type: 'restart' }, rng);
      assert.equal(g.phase, 'bid');
      assert.equal(g.money[g.players[0]], M.START_MONEY);
    }
  }
});

test('いちばん高い値の人が落札。同じ値は親に近い人', () => {
  const g = M.setup(makePlayers(3), seededRng(1));
  const [a, b, c] = g.players;
  g.parent = 1; // b が親 → b, c, a の順
  M.act(g, a, { type: 'bid', amount: 5 });
  M.act(g, b, { type: 'bid', amount: 3 });
  M.act(g, c, { type: 'bid', amount: 5 });
  assert.equal(g.result.winner, c, '同じ5金なら親(b)に近い c');
  assert.equal(g.money[c], M.START_MONEY - 5);
  assert.equal(g.items[c].length, 1);
  M.act(g, a, { type: 'next' });
  for (const p of g.players) M.act(g, p, { type: 'bid', amount: 0 });
  assert.equal(g.result.winner, null, '全員0なら流れる');
});

test('得点: 数字の合計＋種類ごとの多数派＋お金', () => {
  const g = M.setup(makePlayers(3), seededRng(2));
  const [a, b, c] = g.players;
  g.items[a] = [{ k: 'tsubo', v: 5 }, { k: 'tsubo', v: 1 }];
  g.items[b] = [{ k: 'tsubo', v: 2 }, { k: 'jiku', v: 4 }];
  g.items[c] = [];
  g.money = { [a]: 7, [b]: 0, [c]: 25 };
  const s = M.scores(g);
  assert.deepEqual([s[a].items, s[a].majority, s[a].money, s[a].total], [6, 5, 2, 13]);
  assert.deepEqual([s[b].items, s[b].majority, s[b].total], [6, 5, 11]);
  assert.equal(s[c].total, 8);
});

test('不正な操作は拒否される', () => {
  const g = M.setup(makePlayers(4), seededRng(3));
  const [a] = g.players;
  assert.throws(() => M.act(g, 'nobody', { type: 'bid', amount: 1 }), GameError);
  assert.throws(() => M.act(g, a, { type: 'bid', amount: 26 }), /所持金/);
  assert.throws(() => M.act(g, a, { type: 'bid', amount: -1 }), GameError);
  assert.throws(() => M.act(g, a, { type: 'bid', amount: 1.5 }), GameError);
  assert.throws(() => M.act(g, a, { type: 'bid', amount: '3' }), GameError);
  assert.throws(() => M.act(g, a, { type: 'cancel' }), GameError);
  assert.throws(() => M.act(g, a, { type: 'next' }), GameError);
  assert.throws(() => M.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => M.act(g, a, { type: 'hack' }), GameError);
  M.act(g, a, { type: 'bid', amount: 4 });
  M.act(g, a, { type: 'cancel' });
  assert.equal(g.bids[a], undefined);
});

test('ほかの人の入れ札と、これから出る宝は view に出ない', () => {
  const g = M.setup(makePlayers(4), seededRng(4));
  const [a, b] = g.players;
  M.act(g, a, { type: 'bid', amount: 17 });
  const vb = M.view(g, b);
  const text = JSON.stringify(vb);
  assert.equal(vb.myBid, null);
  assert.equal(vb.result, null);
  assert.ok(!text.includes('17'), 'a の入れ札が見えている');
  assert.equal(vb.players[0].ready, true);
  for (const it of g.deck.slice(1)) assert.ok(!text.includes(`"${it.id}"`), 'これから出る宝が見えている');
  assert.equal(M.view(g, a).myBid, 17);
  assert.equal(M.view(g, null).myBid, null);
});

test('CPU は所持金の範囲で値をつけ、落札がばらける', () => {
  const winners = new Map();
  for (let s = 0; s < 30; s++) {
    const rng = seededRng(900 + s);
    const g = M.setup(makePlayers(4), rng);
    playOut(g, rng);
    for (const h of g.history) if (h.winner) winners.set(h.winner, (winners.get(h.winner) ?? 0) + 1);
  }
  assert.equal(winners.size, 4);
  const counts = [...winners.values()];
  assert.ok(Math.min(...counts) > Math.max(...counts) * 0.5, `落札数 ${counts}`);
});
