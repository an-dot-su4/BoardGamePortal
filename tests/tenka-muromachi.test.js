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
  assert.equal(g.prompt.p, o, '祟りを持つ人は捨てるか選べる');
  choose(g, o, 'yes');
  assert.ok(g.ps[o].discard.includes('tatari'));
  assert.ok(!g.ps[o].discard.includes('zeni'));
  assert.ok(g.ps[third].discard.includes('tatari') && g.ps[third].discard.includes('zeni'));
});

test('蔵元: 捨てた枚数だけ文。ほかの人は2枚捨てて1枚引ける', () => {
  const { g, p, o } = fresh(2, ['kuramoto', 'ta', 'ta']);
  g.ps[o].hand = ['ta', 'tatari', 'gin'];
  play(g, p, 'kuramoto');
  choose(g, p, ['ta', 'ta']);
  assert.equal(g.turn.coins, 2);
  choose(g, o, 'yes');
  assert.throws(() => choose(g, o, ['ta']), /2枚/);
  choose(g, o, ['ta', 'tatari']);
  assert.equal(g.ps[o].hand.length, 2);
});

test('守護大名: 祟りを持っていても、捨てずに受け取ってよい', () => {
  const { g, p, o } = fresh(2, ['shugodaimyo']);
  g.ps[o].hand = ['tatari'];
  play(g, p, 'shugodaimyo');
  choose(g, o, 'no');
  assert.deepEqual(g.ps[o].hand, ['tatari']);
  assert.ok(g.ps[o].discard.includes('tatari') && g.ps[o].discard.includes('zeni'));
});

test('金閣: +1購入もある', () => {
  const { g, p } = fresh(2, ['kinkaku']);
  play(g, p, 'kinkaku');
  assert.equal(g.turn.buys, 2);
});

test('勘合船: めくった札は財宝が出るまで脇に置かれ、山札を混ぜ直しても混ざらない', () => {
  const { g, p } = fresh(2, ['kangou']);
  g.ps[p].deck = ['kin', 'ta'];
  g.ps[p].discard = ['ta', 'ta'];
  T.act(g, p, { type: 'play', card: 'kangou' }, rng());
  assert.equal(g.turn.coins, 1 + 3);
  assert.equal(g.ps[p].discard.filter(x => x === 'ta').length, 3);
});

test('借上: 財宝が出るまでめくり、その財宝を廃棄か捨てる', () => {
  const { g, p } = fresh(2, ['kashiage']);
  g.ps[p].deck = ['zeni', 'ta', 'tatari'];
  T.act(g, p, { type: 'play', card: 'kashiage' }, rng());
  assert.equal(g.turn.coins, 1);
  choose(g, p, 'trash');
  assert.ok(g.trash.includes('zeni'));
  assert.deepEqual(g.ps[p].discard.sort(), ['ta', 'tatari']);
  assert.deepEqual(g.ps[p].look, []);
});

test('馬借: 勝利点の山から初めて獲得されると、マットの印が増える', () => {
  const g = T.setup(makePlayers(2), seededRng(3), { sets: ['muromachi'], bans: [] , preset: 'random' });
  g.kingdom.includes('bashaku') || (g.tradeRoute = { piles: ['ta', 'shouen', 'kuni'], mat: 0 });
  const p = g.players[0];
  g.turn = { p, phase: 'buy', actions: 1, buys: 3, coins: 20, bought: [] };
  T.act(g, p, { type: 'buy', card: 'ta' }, rng());
  T.act(g, p, { type: 'buy', card: 'ta' }, rng());
  assert.equal(g.tradeRoute.mat, 1, '同じ山からの2枚目では増えない');
  g.supply.bashaku = 10;
  g.turn.phase = 'action';
  g.ps[p].hand = ['bashaku', 'tatari'];
  play(g, p, 'bashaku');
  choose(g, p, ['tatari']);
  assert.equal(g.turn.coins, 20 - 4 + 1);
  assert.ok(g.trash.includes('tatari'));
});

test('番所: 6枚になるまで引き、獲得した札を廃棄・山札の上に置ける', () => {
  const { g, p, o } = fresh(2, ['bansho', 'ta']);
  play(g, p, 'bansho');
  assert.equal(g.ps[p].hand.length, 6);
  // ほかの人の守護大名で祟りを受けたときにも反応できる
  g.ps[o].hand = ['bansho'];
  g.ps[p].hand = ['shugodaimyo'];
  g.turn.actions = 1;
  play(g, p, 'shugodaimyo');
  assert.equal(g.prompt.p, o);
  choose(g, o, 'trash'); // 祟りを廃棄
  choose(g, o, 'deck'); // 銅銭を山札の上へ
  assert.ok(g.trash.includes('tatari'));
  assert.equal(g.ps[o].deck.at(-1), 'zeni');
  assert.ok(!g.ps[o].discard.includes('tatari'));
});

test('石切場: 場にある間、行動札が2安い。行商人は購入フェーズに行動札1枚につき2安い', () => {
  const { g, p } = fresh(2, ['ishikiri', 'za', 'za']);
  play(g, p, 'za');
  play(g, p, 'za');
  assert.equal(T.view(g, p).costs.gyoushou, 8, '行動フェーズは安くならない');
  T.act(g, p, { type: 'play', card: 'ishikiri' }, rng());
  const v = T.view(g, p);
  assert.equal(v.costs.za, 2);
  assert.equal(v.costs.gin, 3, '財宝は安くならない');
  assert.equal(v.costs.gyoushou, 2, '8 − 2（石切場: 行商人も行動札）− 2×2（場の行動札2枚）');
  g.turn.coins = 3;
  T.act(g, p, { type: 'buy', card: 'gyoushou' }, rng());
  assert.equal(g.turn.coins, 1);
});

test('お守り: コスト4以下の勝利点でない札を買うと、もう1枚', () => {
  const { g, p } = fresh(2, ['omamori', 'kin']);
  T.act(g, p, { type: 'treasures' }, rng());
  g.turn.buys = 2;
  g.turn.coins = 10;
  T.act(g, p, { type: 'buy', card: 'gin' }, rng());
  assert.equal(g.ps[p].discard.filter(x => x === 'gin').length, 2);
  T.act(g, p, { type: 'buy', card: 'ta' }, rng());
  assert.equal(g.ps[p].discard.filter(x => x === 'ta').length, 1);
});

test('私鋳銭: 左の人が名前を言った札は、この手番に買えない', () => {
  const { g, p, o } = fresh(3, ['shichusen', 'kin']);
  T.act(g, p, { type: 'treasures' }, rng());
  assert.equal(g.prompt.p, o, '左（次の手番）の人が選ぶ');
  choose(g, o, 'kin');
  assert.equal(g.turn.coins, 6);
  assert.equal(g.turn.buys, 2);
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'kin' }, rng()), /買えません/);
  T.act(g, p, { type: 'buy', card: 'gin' }, rng());
});

test('勘定所: 捨て札の銅銭を好きな枚数手札に', () => {
  const { g, p } = fresh(2, ['kanjou']);
  g.ps[p].discard = ['zeni', 'ta', 'zeni', 'zeni'];
  play(g, p, 'kanjou');
  choose(g, p, 2);
  assert.deepEqual(g.ps[p].hand, ['zeni', 'zeni']);
  assert.equal(g.ps[p].discard.length, 2);
});

test('鋳銭所: 手札の財宝と同じ札を獲得。買ったとき、場の財宝を廃棄してよい', () => {
  const { g, p } = fresh(2, ['chuusen', 'kin', 'gin', 'gin']);
  play(g, p, 'chuusen');
  choose(g, p, ['kin']);
  assert.ok(g.ps[p].discard.includes('kin'));
  T.act(g, p, { type: 'treasures' }, rng());
  T.act(g, p, { type: 'buy', card: 'chuusen' }, rng());
  choose(g, p, 'yes');
  assert.ok(!g.ps[p].play.some(id => T.CARDS[id].types.includes('treasure')));
  assert.equal(g.trash.filter(x => x === 'gin').length, 2);
});

test('土一揆: ほかの人は3枚めくり、行動札と財宝を捨て、残りを山札に戻す', () => {
  const { g, p, o } = fresh(2, ['tsuchiikki']);
  g.ps[o].deck = ['ta', 'za', 'zeni', 'tatari'];
  play(g, p, 'tsuchiikki');
  assert.equal(g.ps[p].hand.length, 3);
  assert.deepEqual(g.ps[o].discard.sort(), ['za', 'zeni']);
  assert.ok(g.ps[o].deck.includes('tatari'));
  assert.equal(g.ps[o].deck.length, 2);
});

test('御朱印: 場にある間、獲得した札を山札の上に置ける', () => {
  const { g, p } = fresh(2, ['goshuin', 'kin']);
  T.act(g, p, { type: 'treasures' }, rng());
  g.turn.coins = 6;
  T.act(g, p, { type: 'buy', card: 'kin' }, rng());
  assert.equal(g.prompt?.then.card, 'goshuin');
  choose(g, p, 'yes');
  assert.equal(g.ps[p].deck.at(-1), 'kin');
});

test('普請: コストが3まで高い札。刀鍛冶: コストの合計とちょうど同じ札', () => {
  const { g, p } = fresh(2, ['fushin', 'katanakaji', 'gin', 'ta', 'ta']);
  g.turn.actions = 2;
  play(g, p, 'fushin');
  choose(g, p, ['gin']);
  assert.equal(g.prompt.maxCost, 6);
  choose(g, p, 'kin');
  play(g, p, 'katanakaji');
  choose(g, p, ['ta', 'ta']);
  assert.equal(g.prompt.exactCost, 4);
  assert.throws(() => choose(g, p, 'kin'));
  choose(g, p, 'za');
  assert.ok(g.ps[p].discard.includes('za'));
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
