// 天下札・室町（財宝・名声・大判/御所）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/tenka/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';
import { totalCards } from './tenka-helpers.js';

function fresh(n = 2, hand = []) {
  const g = T.setup(makePlayers(n), seededRng(1), { sets: ['heian', 'muromachi'], preset: 'muromachi-eiga' });
  const p = g.players[0];
  g.turn = { p, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [] };
  g.ps[p].hand = hand.slice();
  g.ps[p].deck = Array(20).fill('gin');
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply) && !T.CARDS[id].notSupply && !T.CARDS[id].hidden) g.supply[id] = 10;
  return { g, p, o: g.players[1] };
}
const rng = () => seededRng(7);
const play = (g, p, card) => T.act(g, p, { type: 'play', card }, rng());
const choose = (g, p, answer) => T.act(g, p, { type: 'choose', answer }, rng());

test('大判と御所は王国カードではなく、BAN の対象外', () => {
  assert.ok(!T.KINGDOM.some(c => c.id === 'ohban' || c.id === 'gosho'));
  assert.deepEqual(T.normalizeOptions({ sets: ['muromachi'], bans: ['ohban', 'za'] }).bans, ['za']);
});

test('室町の札が多いほど大判・御所が入りやすい', () => {
  let all = 0;
  let none = 0;
  for (let s = 0; s < 300; s++) {
    if ('gosho' in T.setup(makePlayers(2), seededRng(s), { sets: ['muromachi'] }).supply) all++;
    if ('gosho' in T.setup(makePlayers(2), seededRng(s), { sets: ['heian'] }).supply) none++;
  }
  assert.equal(all, 300, '室町だけなら必ず入る');
  assert.equal(none, 0, '室町なしなら入らない');
});

test('茶の湯と名声: 得点に加わる', () => {
  const { g, p } = fresh(2, ['chanoyu']);
  const before = T.score(g, p);
  play(g, p, 'chanoyu');
  assert.equal(g.turn.coins, 2);
  assert.equal(T.score(g, p), before + 1);
  assert.equal(T.view(g, p).players.find(x => x.id === p).fame, 1);
});

test('寺社造営: 廃棄したコストの半分の名声、ほかの人も廃棄してよい', () => {
  const { g, p, o } = fresh(2, ['jisha', 'kin']);
  g.ps[o].hand = ['tatari', 'zeni'];
  play(g, p, 'jisha');
  choose(g, p, ['kin']);
  assert.equal(g.ps[p].fame, 1 + 3);
  assert.equal(g.prompt.p, o);
  choose(g, o, ['tatari']);
  assert.ok(g.trash.includes('tatari'));
});

test('金閣: 場にある間、買うたびに名声', () => {
  const { g, p, o } = fresh(2, ['kinkaku', 'kin', 'kin']);
  g.ps[o].hand = ['zeni', 'zeni', 'zeni'];
  play(g, p, 'kinkaku');
  T.act(g, p, { type: 'treasures' });
  g.turn.buys = 2;
  T.act(g, p, { type: 'buy', card: 'gin' });
  T.act(g, p, { type: 'buy', card: 'zeni' });
  assert.equal(g.ps[p].fame, 2);
});

test('能楽: 場に銅銭があると買えない', () => {
  const { g, p } = fresh(2, ['zeni', 'kin', 'kin', 'gin']);
  T.act(g, p, { type: 'treasures' });
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'nougaku' }), /今は買えません/);
  const r = fresh(2, ['kin', 'kin']);
  T.act(r.g, r.p, { type: 'treasures' });
  T.act(r.g, r.p, { type: 'buy', card: 'nougaku' });
});

test('酒屋: 勝利点の札を買うと金も獲得', () => {
  const { g, p } = fresh(2, ['sakaya', 'kin', 'gin']);
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.turn.coins, 7);
  T.act(g, p, { type: 'buy', card: 'shouen' });
  assert.ok(g.ps[p].discard.includes('kin'));
});

test('土倉: 場の財宝の数だけ（後から出しても全部数える）', () => {
  const { g, p } = fresh(2, ['dosou', 'zeni', 'gin', 'kin']);
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.turn.coins, 1 + 2 + 3 + 4);
});

test('勘合船: 財宝が出るまでめくって使う', () => {
  const { g, p } = fresh(2, ['kangou']);
  g.ps[p].deck = ['kin', 'ta', 'kebiishi'];
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.turn.coins, 4);
  assert.deepEqual(g.ps[p].discard.sort(), ['kebiishi', 'ta']);
});

test('七福神: 3回使う', () => {
  const { g, p } = fresh(2, ['shichifuku', 'gissha']);
  play(g, p, 'shichifuku');
  choose(g, p, ['gissha']);
  assert.equal(g.turn.coins, 6);
  assert.equal(g.turn.buys, 4);
});

test('守護大名: 祟りを捨てるか、祟りと銅銭を受け取る', () => {
  const { g, p, o } = fresh(3, ['shugodaimyo']);
  const third = g.players[2];
  g.ps[o].hand = ['tatari', 'gin'];
  g.ps[third].hand = ['gin'];
  play(g, p, 'shugodaimyo');
  assert.ok(g.ps[o].discard.includes('tatari'));
  assert.ok(g.ps[third].discard.includes('tatari') && g.ps[third].discard.includes('zeni'));
});

test('蔵元: 捨てた枚数だけ文。ほかの人は2枚捨てて1枚引ける', () => {
  const { g, p, o } = fresh(2, ['kuramoto', 'ta', 'ta']);
  g.ps[o].hand = ['ta', 'tatari', 'gin'];
  play(g, p, 'kuramoto');
  choose(g, p, ['ta', 'ta']);
  assert.equal(g.turn.coins, 2);
  assert.throws(() => choose(g, o, ['ta', 'tatari', 'gin']), /0〜2枚/);
  choose(g, o, ['ta', 'tatari']);
  assert.equal(g.ps[o].hand.length, 2);
});

test('御所の山が尽きたら終了', () => {
  const g = T.setup(makePlayers(2), seededRng(1), { sets: ['muromachi'] });
  g.supply.gosho = 0;
  const p = g.turn.p;
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.equal(g.phase, 'over');
});

test('室町を含む組み合わせで CPU 同士が何百試合しても壊れない', () => {
  const combos = [['muromachi'], ['heian', 'muromachi'], ['kamakura', 'muromachi'], ['heian', 'kamakura', 'muromachi']];
  for (let seed = 0; seed < 160; seed++) {
    const n = 2 + (seed % 3);
    const r = seededRng(5000 + seed);
    const g = T.setup(makePlayers(n), r, { sets: combos[seed % combos.length] });
    const total = totalCards(g);
    let steps = 0;
    while (g.phase === 'play') {
      assert.ok(steps++ < 30000, '終わらない');
      const actor = g.players.find(x => T.bot(g, x, r));
      assert.ok(actor, '誰も操作できない');
      T.act(g, actor, T.bot(g, actor, r), r);
      assert.equal(totalCards(g), total, '札が増えたり消えたりした');
    }
  }
});
