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
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply) && !T.CARDS[id].notSupply && !T.CARDS[id].hidden) g.supply[id] = 10;
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

test('鎌倉は本家の海辺（初版）と同じ26種', () => {
  assert.equal(T.KINGDOM.filter(c => c.set === 'kamakura').length, 26);
});

test('関所: 自分を廃棄して山に関所。その山を買うと祟り', () => {
  const { g, p } = fresh(2, ['sekisho', 'kin']);
  play(g, p, 'sekisho');
  choose(g, p, 'gin');
  assert.equal(g.embargo.gin, 1);
  assert.ok(g.trash.includes('sekisho'));
  T.act(g, p, { type: 'treasures' });
  T.act(g, p, { type: 'buy', card: 'gin' });
  assert.ok(g.ps[p].discard.includes('tatari'));
});

test('隠れ里: マットに置いて、あとでまとめて手札に', () => {
  const { g, p } = fresh(2, ['kakurezato', 'kakurezato']);
  g.ps[p].deck = ['kin', 'gin'];
  play(g, p, 'kakurezato');
  choose(g, p, 'set');
  assert.deepEqual(g.ps[p].mats.native, ['gin']);
  assert.deepEqual(T.view(g, p).myNative, ['gin']);
  assert.deepEqual(T.view(g, g.players[1]).myNative, [], 'マットの中身は本人だけ');
  play(g, p, 'kakurezato');
  choose(g, p, 'take');
  assert.ok(g.ps[p].hand.includes('gin'));
});

test('海女: 一番下を一番上に', () => {
  const { g, p } = fresh(2, ['ama']);
  g.ps[p].deck = ['kin', 'ta', 'zeni', 'gin'];
  play(g, p, 'ama');
  choose(g, p, 'top');
  assert.equal(g.ps[p].deck.at(-1), 'kin');
});

test('使節: 2枚戻して、相手に1枚ずつ', () => {
  const { g, p, o } = fresh(2, ['shisetsu', 'ta', 'ta', 'zeni']);
  const before = g.supply.ta;
  play(g, p, 'shisetsu');
  choose(g, p, ['ta']);
  choose(g, p, 2);
  assert.equal(g.supply.ta, before + 2 - 1);
  assert.ok(g.ps[o].discard.includes('ta'));
});

test('抜け荷: 右隣が前の手番に獲得した札', () => {
  const { g, p, o } = fresh(2, ['nukeni']);
  g.ps[o].lastGained = ['kin', 'kuni'];
  play(g, p, 'nukeni');
  assert.deepEqual(T.view(g, p).prompt.cands, ['kin']);
  choose(g, p, 'kin');
  assert.ok(g.ps[p].discard.includes('kin'));
});

test('隠岐の島: マットの札も得点に入る', () => {
  const { g, p } = fresh(2, ['oki', 'kuni']);
  const before = T.score(g, p);
  play(g, p, 'oki');
  choose(g, p, ['kuni']);
  assert.deepEqual(g.ps[p].mats.island.sort(), ['kuni', 'oki']);
  assert.equal(T.score(g, p), before);
});

test('水先案内: 5枚を捨てるか、順番を決めて戻す', () => {
  const { g, p } = fresh(2, ['mizusaki']);
  g.ps[p].deck = ['zeni', 'ta', 'gin', 'kin', 'ta', 'zeni'];
  play(g, p, 'mizusaki');
  choose(g, p, 'discard');
  assert.equal(g.ps[p].deck.length, 1);
  assert.equal(g.ps[p].discard.length, 5);
});

test('倭寇: 財宝を沈めると銭が増え、銭の数だけ+文', () => {
  const { g, p, o } = fresh(2, ['wakou', 'wakou']);
  g.turn.actions = 2;
  g.ps[o].deck = ['ta', 'kin', 'zeni'];
  play(g, p, 'wakou');
  choose(g, p, 'raid');
  choose(g, p, 'kin');
  assert.equal(g.ps[p].mats.pirate, 1);
  play(g, p, 'wakou');
  choose(g, p, 'cash');
  assert.equal(g.turn.coins, 1);
});

test('寄せ物拾い・磯女・埋蔵金の図・渡海者', () => {
  let { g, p, o } = fresh(2, ['yosemono', 'kin']);
  play(g, p, 'yosemono');
  choose(g, p, ['kin']);
  assert.deepEqual([g.turn.coins, g.turn.buys], [6, 2]);
  ({ g, p, o } = fresh(2, ['isoonna']));
  g.ps[o].deck = ['gin', 'kin'];
  play(g, p, 'isoonna');
  assert.equal(g.ps[o].deck.at(-1), 'tatari');
  assert.ok(g.ps[o].discard.includes('kin'));
  ({ g, p } = fresh(2, ['maizou', 'maizou']));
  play(g, p, 'maizou');
  assert.deepEqual(g.ps[p].deck.slice(-4), ['kin', 'kin', 'kin', 'kin']);
  ({ g, p } = fresh(2, ['tokaisha', 'kuni']));
  play(g, p, 'tokaisha');
  choose(g, p, 'yes');
  assert.ok(g.ps[p].hand.includes('kin'));
});

test('早馬: 3枚引いて、もう一度自分の手番（続けては1回だけ）', () => {
  const { g, p } = fresh(2, ['hayauma', 'hayauma']);
  g.turn.actions = 1;
  play(g, p, 'hayauma');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.equal(g.turn.p, p, '追加の手番');
  assert.ok(g.turn.extra);
  assert.equal(g.ps[p].hand.length, 3);
  const turns = g.ps[p].turns;
  g.ps[p].hand.push('hayauma');
  play(g, p, 'hayauma');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.notEqual(g.turn.p, p, '3回続けては行えない');
  assert.equal(g.ps[p].turns, turns, '追加の手番は手番数に数えない');
});

test('公文所: 勝利点を買わなければ山札の上に', () => {
  const { g, p } = fresh(2, ['kumonjo']);
  play(g, p, 'kumonjo');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.equal(g.prompt.p, p);
  choose(g, p, 'top');
  assert.ok(g.ps[p].hand.includes('kumonjo'), '次の手札に入る');
});
