// 天下札・鎌倉（持続）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/tenka/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';
import { totalCards } from './tenka-helpers.js';

function fresh(n = 2, hand = []) {
  const g = T.setup(makePlayers(n), seededRng(1), { sets: ['heian', 'kamakura'], preset: 'kamakura-umi' });
  const p = g.players[0];
  g.turn = { p, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [] };
  g.ps[p].hand = hand.slice();
  g.ps[p].deck = Array(20).fill('gin');
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply)) g.supply[id] = 10;
  return { g, p, o: g.players[1] };
}
const rng = () => seededRng(7);
const play = (g, p, card) => T.act(g, p, { type: 'play', card }, rng());
const choose = (g, p, answer) => T.act(g, p, { type: 'choose', answer }, rng());
// 今の手番を終え（自分の手番なら）、ほかの人の手番も何もせず終えて、自分の手番に戻す
function roundTrip(g, p) {
  const endTurn = who => {
    T.act(g, who, { type: 'end' }, rng());
    if (g.turn.p === who) T.act(g, who, { type: 'end' }, rng());
  };
  if (g.turn.p === p) endTurn(p);
  while (g.turn.p !== p) endTurn(g.turn.p);
}

test('漁師町: 次の手番にも +1行動 +1文、それまで場に残る', () => {
  const { g, p } = fresh(2, ['ryoshi']);
  play(g, p, 'ryoshi');
  assert.deepEqual([g.turn.actions, g.turn.coins], [2, 1]);
  roundTrip(g, p);
  assert.deepEqual([g.turn.actions, g.turn.coins], [2, 1], '次の手番: 1+1行動、+1文');
  assert.ok(g.ps[p].play.includes('ryoshi'), '次の手番の間は場にある');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.ok(!g.ps[p].play.includes('ryoshi') && !g.ps[p].dur.includes('ryoshi'), '2手番目の終わりに捨てられる');
  assert.ok(g.ps[p].discard.includes('ryoshi') || g.ps[p].deck.includes('ryoshi') || g.ps[p].hand.includes('ryoshi'));
});

test('持続中は片付けで捨てられない', () => {
  const { g, p } = fresh(2, ['sousen']);
  play(g, p, 'sousen');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.deepEqual(g.ps[p].dur, ['sousen']);
  assert.ok(!g.ps[p].discard.includes('sousen'));
  assert.equal(T.view(g, g.players[1]).players.find(x => x.id === p).dur[0], 'sousen', '持続中の札は全員に見える');
});

test('御前で持続札: 次の手番に2回分、御前も一緒に残る', () => {
  const { g, p } = fresh(2, ['gozen', 'sousen']);
  play(g, p, 'gozen');
  choose(g, p, ['sousen']);
  assert.equal(g.turn.coins, 4);
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.deepEqual(g.ps[p].dur.sort(), ['gozen', 'sousen']);
  roundTrip(g, p);
  assert.equal(g.turn.coins, 4, '次の手番に +2文 × 2');
});

test('守護: 預けた札が次の手番に手札へ', () => {
  const { g, p } = fresh(2, ['shugo', 'kin', 'ta']);
  play(g, p, 'shugo');
  choose(g, p, ['kin']);
  assert.ok(!g.ps[p].hand.includes('kin'));
  const total = totalCards(g);
  roundTrip(g, p);
  assert.ok(g.ps[p].hand.includes('kin'));
  assert.equal(g.ps[p].hand.length, 6);
  assert.equal(totalCards(g), total);
});

test('物見櫓: 場に残っている間は攻撃を受けない', () => {
  const { g, p, o } = fresh(2, ['monomi']);
  play(g, p, 'monomi');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.equal(g.turn.p, o);
  g.ps[o].hand = ['kebiishi'];
  g.ps[p].hand = ['zeni', 'zeni', 'zeni', 'zeni', 'zeni'];
  play(g, o, 'kebiishi');
  assert.equal(g.prompt, null);
  assert.equal(g.ps[p].hand.length, 5);
  assert.match(g.log.at(-1), /物見櫓で身を守った/);
});

test('執権: 手札を捨てて、次の手番に +5札 +1行動 +1購入', () => {
  const { g, p } = fresh(2, ['shikken', 'zeni', 'ta']);
  play(g, p, 'shikken');
  assert.equal(g.ps[p].hand.length, 0);
  roundTrip(g, p);
  assert.equal(g.ps[p].hand.length, 10);
  assert.deepEqual([g.turn.actions, g.turn.buys], [2, 2]);
});

test('見張り: 3枚見て廃棄・捨て札・山札の上', () => {
  const { g, p } = fresh(2, ['mihari']);
  g.ps[p].deck = ['zeni', 'kin', 'ta', 'tatari']; // 末尾が上: tatari, ta, kin
  play(g, p, 'mihari');
  assert.deepEqual(T.view(g, p).prompt.cands.sort(), ['kin', 'ta', 'tatari']);
  assert.throws(() => choose(g, p, 'zeni'), /選択肢/);
  choose(g, p, 'tatari');
  choose(g, p, 'ta');
  assert.deepEqual(g.ps[p].deck, ['zeni', 'kin']);
  assert.ok(g.trash.includes('tatari'));
  assert.deepEqual(g.ps[p].look, []);
});

test('悪党・元寇', () => {
  let { g, p, o } = fresh(2, ['akutou']);
  g.ps[o].hand = ['zeni', 'gin', 'ta'];
  play(g, p, 'akutou');
  assert.deepEqual(g.ps[o].hand.sort(), ['gin', 'ta']);
  ({ g, p, o } = fresh(2, ['genkou']));
  g.ps[o].hand = ['zeni', 'gin', 'kin', 'ta', 'ta'];
  play(g, p, 'genkou');
  choose(g, o, ['kin', 'gin']);
  assert.deepEqual(g.ps[o].deck.slice(-2), ['kin', 'gin']);
  assert.equal(g.ps[o].hand.length, 3);
});

test('おすすめセットは選んだ時代で作れるものだけ', () => {
  assert.equal(T.normalizeOptions({ sets: ['heian'], preset: 'kamakura-umi' }).preset, 'random');
  assert.equal(T.normalizeOptions({ sets: ['kamakura'], preset: 'kamakura-umi' }).preset, 'kamakura-umi');
  const k = T.pickKingdom({ sets: ['kamakura'] }, seededRng(3));
  assert.ok(k.every(id => T.CARDS[id].set === 'kamakura'));
});

test('平安＋鎌倉で CPU 同士が何百試合しても壊れない', () => {
  for (let seed = 0; seed < 150; seed++) {
    const n = 2 + (seed % 3);
    const r = seededRng(1000 + seed);
    const g = T.setup(makePlayers(n), r, { sets: seed % 3 === 0 ? ['kamakura'] : ['heian', 'kamakura'] });
    const total = totalCards(g);
    let steps = 0;
    while (g.phase === 'play') {
      assert.ok(steps++ < 20000, '終わらない');
      const actor = g.players.find(x => T.bot(g, x, r));
      assert.ok(actor, '誰も操作できない');
      T.act(g, actor, T.bot(g, actor, r), r);
      assert.equal(totalCards(g), total, '札が増えたり消えたりした');
    }
  }
});
