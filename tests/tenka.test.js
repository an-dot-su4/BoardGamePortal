import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/tenka/logic.js';
import { makeBot } from '../games/tenka/bot.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';
import { totalCards } from './tenka-helpers.js';

// 手札を差し替えて、その人の行動フェーズから始める
function fresh(n = 2, hand = [], options = { preset: 'heian-first' }) {
  const g = T.setup(makePlayers(n), seededRng(1), options);
  const p = g.players[0];
  g.turn = { p, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [] };
  g.ps[p].hand = hand.slice();
  g.ps[p].deck = Array(10).fill('gin');
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply) && !T.CARDS[id].notSupply && !T.CARDS[id].hidden) g.supply[id] = 10;
  return { g, p, o: g.players[1] };
}
const play = (g, p, card) => T.act(g, p, { type: 'play', card }, seededRng(2));
const choose = (g, p, answer) => T.act(g, p, { type: 'choose', answer }, seededRng(3));

test('里・写経所・市: +札 +行動 +購入 +文', () => {
  const { g, p } = fresh(2, ['sato', 'shakyo', 'ichi']);
  play(g, p, 'sato');
  assert.equal(g.turn.actions, 2);
  assert.equal(g.ps[p].hand.length, 3);
  play(g, p, 'ichi');
  assert.deepEqual([g.turn.actions, g.turn.buys, g.turn.coins], [2, 2, 1]);
  play(g, p, 'shakyo');
  assert.equal(g.ps[p].hand.length, 5);
  assert.equal(g.turn.actions, 1);
});

test('行動が無ければ使えない・購入フェーズでは使えない', () => {
  const { g, p } = fresh(2, ['shakyo', 'shakyo', 'zeni']);
  play(g, p, 'shakyo');
  assert.throws(() => play(g, p, 'shakyo'), /行動がもう残っていません/);
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.turn.phase, 'buy');
});

test('検非違使: 相手は手札3枚まで捨てる。結界があれば防げる', () => {
  const { g, p, o } = fresh(3, ['kebiishi']);
  const third = g.players[2];
  g.ps[o].hand = ['zeni', 'zeni', 'ta', 'gin', 'kin'];
  g.ps[third].hand = ['kekkai', 'zeni', 'zeni', 'zeni', 'zeni'];
  play(g, p, 'kebiishi');
  assert.equal(g.turn.coins, 2);
  assert.equal(g.prompt.p, o);
  assert.throws(() => choose(g, o, ['zeni']), /2枚/);
  assert.throws(() => choose(g, p, ['zeni', 'ta']), /ほかの人/);
  choose(g, o, ['zeni', 'ta']);
  assert.equal(g.ps[o].hand.length, 3);
  assert.equal(g.prompt, null, '結界を持つ3人目には効かない');
  assert.equal(g.ps[third].hand.length, 5);
});

test('呪術師: 祟りが配られ、山が尽きたら配られない', () => {
  const { g, p, o } = fresh(2, ['jujutsu', 'jujutsu', 'sato']);
  g.supply.tatari = 1;
  play(g, p, 'sato');
  play(g, p, 'jujutsu');
  assert.ok(g.ps[o].discard.includes('tatari'));
  play(g, p, 'jujutsu');
  assert.equal(g.ps[o].discard.filter(c => c === 'tatari').length, 1);
  assert.equal(T.score(g, o), 3 - 1);
});

test('御前で検非違使を2回: 2回とも攻撃、+4文', () => {
  const { g, p, o } = fresh(2, ['gozen', 'kebiishi']);
  g.ps[o].hand = ['zeni', 'zeni', 'zeni', 'zeni', 'zeni'];
  play(g, p, 'gozen');
  choose(g, p, ['kebiishi']);
  choose(g, o, ['zeni', 'zeni']);
  assert.equal(g.prompt, null, '2回目は手札3枚なので選択なし');
  assert.equal(g.turn.coins, 4);
  assert.deepEqual(g.ps[p].play.sort(), ['gozen', 'kebiishi']);
});

test('御前で御前: 2枚の行動札をそれぞれ2回', () => {
  const { g, p } = fresh(2, ['gozen', 'gozen', 'gissha', 'gissha']);
  play(g, p, 'gozen');
  choose(g, p, ['gozen']);
  choose(g, p, ['gissha']);
  choose(g, p, ['gissha']);
  assert.equal(g.turn.coins, 8);
  assert.equal(g.turn.buys, 5);
});

test('造営・金山・金貸し・寺・工房', () => {
  let { g, p } = fresh(2, ['zouei', 'kin']);
  play(g, p, 'zouei');
  choose(g, p, ['kin']);
  assert.ok(T.view(g, p).prompt.cands.includes('kuni'));
  assert.throws(() => choose(g, p, 'kuni_x'), /獲得できません/);
  choose(g, p, 'kuni');
  assert.ok(g.ps[p].discard.includes('kuni'));
  assert.ok(g.trash.includes('kin'));

  ({ g, p } = fresh(2, ['kanayama', 'zeni']));
  play(g, p, 'kanayama');
  choose(g, p, ['zeni']);
  const cands = T.view(g, p).prompt.cands;
  assert.ok(!cands.includes('kin'), '銅銭→金は不可（+3まで）');
  assert.ok(cands.every(id => T.CARDS[id].types.includes('treasure')));
  choose(g, p, 'gin');
  assert.ok(g.ps[p].hand.includes('gin'), '手札に獲得');

  ({ g, p } = fresh(2, ['kanekashi', 'zeni']));
  play(g, p, 'kanekashi');
  choose(g, p, ['zeni']);
  assert.equal(g.turn.coins, 3);

  ({ g, p } = fresh(2, ['kanekashi', 'gin']));
  play(g, p, 'kanekashi');
  assert.equal(g.prompt, null, '銅銭が無ければ何も起きない');

  ({ g, p } = fresh(2, ['tera', 'ta', 'ta', 'zeni', 'tatari', 'kin']));
  play(g, p, 'tera');
  assert.throws(() => choose(g, p, ['ta', 'ta', 'zeni', 'tatari', 'kin']), /0〜4枚/);
  choose(g, p, ['ta', 'ta', 'tatari']);
  assert.deepEqual(g.ps[p].hand.sort(), ['kin', 'zeni']);

  ({ g, p } = fresh(2, ['koubou']));
  play(g, p, 'koubou');
  assert.ok(T.view(g, p).prompt.cands.every(id => T.CARDS[id].cost <= 4));
  choose(g, p, 'gin');
});

test('蔵: 捨てた枚数だけ引く', () => {
  const { g, p } = fresh(2, ['kura', 'ta', 'ta', 'tatari']);
  play(g, p, 'kura');
  choose(g, p, ['ta', 'ta', 'tatari']);
  assert.deepEqual(g.ps[p].hand, ['gin', 'gin', 'gin']);
  assert.equal(g.turn.actions, 1);
});

test('書庫: 7枚まで引き、行動札は脇に置ける', () => {
  const { g, p } = fresh(2, ['shoko', 'zeni']);
  g.ps[p].deck = ['gin', 'gin', 'gin', 'gin', 'sato', 'gin', 'sato', 'kin']; // 末尾から引く
  play(g, p, 'shoko');
  assert.equal(g.prompt.kind, 'option');
  choose(g, p, 'aside');
  assert.equal(g.prompt.kind, 'option', '次の行動札でもう一度聞かれる');
  choose(g, p, 'keep');
  assert.equal(g.ps[p].hand.length, 7);
  assert.equal(g.ps[p].hand.filter(c => c === 'sato').length, 1);
  assert.deepEqual(g.ps[p].aside, []);
  assert.deepEqual(g.ps[p].discard, ['sato'], '脇に置いた札は捨て札へ');
});

test('朝議: 相手も1枚引く', () => {
  const { g, p, o } = fresh(2, ['chougi']);
  const before = g.ps[o].hand.length;
  play(g, p, 'chougi');
  assert.equal(g.ps[p].hand.length, 4);
  assert.equal(g.turn.buys, 2);
  assert.equal(g.ps[o].hand.length, before + 1);
});

test('購入と手番の終わり', () => {
  const { g, p, o } = fresh(2, ['kin', 'kin', 'gin']);
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'kuni' }), /お金が足りません/);
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.turn.coins, 8);
  T.act(g, p, { type: 'buy', card: 'kuni' });
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'zeni' }), /購入がもう残っていません/);
  assert.throws(() => T.act(g, o, { type: 'end' }), /あなたの手番ではありません/);
  T.act(g, p, { type: 'end' }, seededRng(5));
  assert.equal(g.turn.p, o);
  assert.equal(g.ps[p].hand.length, 5);
  assert.ok(g.ps[p].discard.includes('kuni'));
});

test('庭園: 10枚ごとに1点', () => {
  const { g, p } = fresh(2, []);
  Object.assign(g.ps[p], { deck: Array(23).fill('zeni'), hand: [], discard: ['teien', 'teien'], play: [] });
  assert.equal(T.score(g, p), 4);
});

test('他人の手札・山札の中身は view に出ない', () => {
  const { g, p, o } = fresh(2, ['kebiishi', 'kin']);
  g.ps[o].hand = ['jujutsu', 'kuni', 'zeni', 'zeni', 'zeni'];
  const v = T.view(g, p);
  assert.equal(v.players.find(x => x.id === o).hand, 5, '相手の手札は枚数だけ');
  assert.deepEqual(v.hand.slice().sort(), ['kebiishi', 'kin']);
  assert.ok(!JSON.stringify(v.players).includes('"deck":['), '山札の中身は送らない');
  assert.equal(v.prompt, null);
  play(g, p, 'kebiishi');
  assert.equal(T.view(g, p).prompt, null, '相手の選択は自分には見えない');
  assert.equal(T.view(g, p).waitingFor, o);
  assert.deepEqual(T.view(g, o).prompt.cands.sort(), ['jujutsu', 'kuni', 'zeni', 'zeni', 'zeni'].sort());
  assert.equal(T.view(g, null).hand.length, 0);
});

test('BAN: 選ばれず、おすすめセットの穴は埋まり、足りなければ開始できない', () => {
  const bans = ['jujutsu', 'kebiishi', 'gozen'];
  for (let seed = 0; seed < 2000; seed++) {
    const k = T.pickKingdom({ bans }, seededRng(seed));
    assert.equal(k.length, 10);
    assert.equal(new Set(k).size, 10);
    for (const b of bans) assert.ok(!k.includes(b));
  }
  const k = T.pickKingdom({ preset: 'heian-curse', bans: ['jujutsu'] }, seededRng(1));
  assert.equal(k.length, 10);
  assert.ok(!k.includes('jujutsu'));
  for (const id of ['kekkai', 'tera', 'teien', 'gozen']) assert.ok(k.includes(id), 'おすすめの残りはそのまま');
  const g = T.setup(makePlayers(2), seededRng(1), { preset: 'heian-curse', bans: ['jujutsu'] });
  assert.equal(g.supply.tatari, undefined, '祟りを配る札がなければ祟りの山は無い');

  const many = T.KINGDOM.map(c => c.id).slice(0, 10);
  assert.match(T.validateOptions({ bans: many }), /10種そろいません/);
  assert.equal(T.validateOptions({ bans: many.slice(0, 9) }), null);
  assert.deepEqual(T.normalizeOptions({ bans: ['zeni', 'kuni', 'sato', 'sato'], sets: ['nope'] }), { sets: ['heian'], preset: 'random', bans: ['sato'] });
});

test('CPU同士で何百試合しても必ず終わり、札の総数は変わらない（2〜4人）', () => {
  for (let seed = 0; seed < 150; seed++) {
    const n = 2 + (seed % 3);
    const rng = seededRng(seed);
    const presets = ['random', ...T.PRESETS.map(p => p.id)];
    const g = T.setup(makePlayers(n), rng, { preset: presets[seed % presets.length] });
    const total = totalCards(g);
    let steps = 0;
    while (g.phase === 'play') {
      assert.ok(steps++ < 20000, '終わらない');
      const actor = g.players.find(p => T.bot(g, p, rng));
      assert.ok(actor, '誰も操作できない');
      T.act(g, actor, T.bot(g, actor, rng), rng);
      assert.equal(totalCards(g), total, '札が増えたり消えたりした');
    }
    assert.equal(g.result.length, n);
    assert.ok(g.result.some(r => r.win));
  }
});

test('王国カードを使う CPU は、お金だけの CPU より強い', () => {
  const money = makeBot('money');
  const normal = makeBot('normal');
  let wins = 0;
  const N = 200;
  for (let seed = 0; seed < N; seed++) {
    const rng = seededRng(seed);
    const g = T.setup(makePlayers(2), rng, { preset: 'heian-first' });
    const bots = { [g.players[0]]: seed % 2 ? normal : money, [g.players[1]]: seed % 2 ? money : normal };
    const normalId = g.players[seed % 2 ? 0 : 1];
    while (g.phase === 'play') {
      const actor = g.players.find(p => bots[p](g, p, rng));
      T.act(g, actor, bots[actor](g, actor, rng), rng);
    }
    if (g.result.find(r => r.id === normalId).win) wins++;
  }
  assert.ok(wins / N > 0.5, `王国カードを使う CPU の勝率 ${wins / N}`);
});
