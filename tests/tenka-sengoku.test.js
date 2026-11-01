// 天下札・戦国（廃棄・落武者・戦利品）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/tenka/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';
import { totalCards } from './tenka-helpers.js';

function fresh(n = 2, hand = []) {
  const g = T.setup(makePlayers(n), seededRng(1), { sets: ['heian', 'sengoku'], preset: 'sengoku-gekokujo' });
  const p = g.players[0];
  g.turn = { p, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [] };
  g.ps[p].hand = hand.slice();
  g.ps[p].deck = Array(20).fill('gin');
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply) && !T.CARDS[id].notSupply && !T.CARDS[id].hidden) g.supply[id] = 10;
  if (!g.knightsPile.length) g.knightsPile = Object.keys(T.CARDS).filter(id => id.startsWith('bushi_'));
  g.supply.kyoujin = 10;
  g.supply.saikashu = 10;
  return { g, p, o: g.players[1] };
}
const rng = () => seededRng(7);
const play = (g, p, card) => T.act(g, p, { type: 'play', card }, rng());
const choose = (g, p, answer) => T.act(g, p, { type: 'choose', answer }, rng());

test('落武者の山: 5種を10枚ずつ混ぜた中から配り、一番上の札を獲得する', () => {
  const g = T.setup(makePlayers(3), seededRng(2), { sets: ['sengoku'], preset: 'sengoku-gekokujo' });
  assert.equal(g.supply.ruins, 20);
  assert.equal(g.ruinsPile.length, 20);
  for (const id of g.ruinsPile) assert.ok(['arechi', 'haison', 'ochimusha', 'yakedera', 'ikinokori'].includes(id));
  assert.ok(!T.KINGDOM.some(c => ['ruins', 'ochimusha', 'senrihin'].includes(c.id)), '王国カードではない');
  const top = g.ruinsPile.at(-1);
  const p = g.turn.p;
  g.ps[p].hand = ['randori'];
  T.act(g, p, { type: 'play', card: 'randori' }, rng());
  const o = g.players.find(x => x !== p);
  assert.ok(g.ps[o].discard.includes(top));
  assert.equal(g.supply.ruins, 18);
  assert.ok(g.ps[p].discard.includes('senrihin'));
});

test('戦利品: +3文、使うと山に戻る。買えない', () => {
  const { g, p } = fresh(2, ['senrihin', 'zeni']);
  const before = g.supply.senrihin;
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.turn.coins, 4);
  assert.equal(g.supply.senrihin, before + 1);
  assert.ok(!g.ps[p].play.includes('senrihin'));
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'senrihin' }), /買えません/);
});

test('山城: 廃棄されても手札に戻る', () => {
  const { g, p } = fresh(2, ['tera', 'yamashiro', 'ta']);
  play(g, p, 'tera');
  choose(g, p, ['yamashiro', 'ta']);
  assert.ok(g.ps[p].hand.includes('yamashiro'));
  assert.ok(!g.trash.includes('yamashiro'));
  assert.ok(g.trash.includes('ta'));
});

test('知行: 銀3枚ごとに1点、廃棄で銀3枚', () => {
  const { g, p } = fresh(2, ['tera', 'chigyou']);
  g.ps[p].deck = ['gin', 'gin', 'gin', 'gin', 'gin', 'gin', 'gin'];
  g.ps[p].discard = ['chigyou'];
  const base = T.score(g, p);
  assert.ok(base >= 2 + 2);
  play(g, p, 'tera');
  choose(g, p, ['chigyou']);
  assert.equal(g.ps[p].discard.filter(c => c === 'gin').length, 3);
});

test('鷹狩: 廃棄で荘園か田3枚', () => {
  const { g, p } = fresh(2, ['tera', 'takagari']);
  play(g, p, 'tera');
  choose(g, p, ['takagari']);
  assert.equal(g.prompt.kind, 'option');
  choose(g, p, 'ta');
  assert.equal(g.ps[p].discard.filter(c => c === 'ta').length, 3);
});

test('下剋上: 2回使ってから廃棄し、ちょうど+1コストの行動札を獲得', () => {
  const { g, p } = fresh(2, ['gekokujo', 'sato']);
  play(g, p, 'gekokujo');
  choose(g, p, ['sato']);
  assert.equal(g.turn.actions, 4);
  const cands = T.view(g, p).prompt.cands;
  assert.ok(cands.length && cands.every(id => T.CARDS[id].cost === 4 && T.CARDS[id].types.includes('action')));
  choose(g, p, cands[0]);
  assert.ok(g.trash.includes('sato'));
  assert.ok(g.ps[p].discard.includes(cands[0]));
});

test('刀狩: 廃棄置き場の財宝の種類だけ+文', () => {
  const { g, p } = fresh(2, ['katanagari', 'zeni']);
  g.trash.push('gin', 'gin');
  play(g, p, 'katanagari');
  choose(g, p, ['zeni']);
  assert.equal(g.turn.coins, 2, '銀と銅銭の2種類');
});

test('一向一揆: 続けて使え、相手に落武者', () => {
  const { g, p, o } = fresh(2, ['ikkou', 'ikkou']);
  play(g, p, 'ikkou');
  choose(g, p, 'yes');
  assert.equal(g.ps[o].discard.filter(c => T.CARDS[c].types.includes('ruins')).length, 2);
  assert.equal(g.turn.actions, 0);
});

test('焼き討ち: 自分を廃棄し、相手の札を選んで捨てさせ、戦利品2枚', () => {
  const { g, p, o } = fresh(2, ['yakiuchi']);
  g.ps[o].hand = ['kin', 'zeni', 'zeni', 'ta', 'ta'];
  play(g, p, 'yakiuchi');
  assert.equal(g.prompt.p, p, '選ぶのは攻撃した人');
  choose(g, p, 'kin');
  assert.ok(g.ps[o].discard.includes('kin'));
  assert.ok(g.trash.includes('yakiuchi'));
  assert.equal(g.ps[p].discard.filter(c => c === 'senrihin').length, 2);
});

test('忍び: 廃棄置き場から盗むか、相手の山札を焼く', () => {
  let { g, p, o } = fresh(2, ['shinobi']);
  g.trash.push('kin');
  play(g, p, 'shinobi');
  choose(g, p, 'kin');
  assert.ok(g.ps[p].discard.includes('kin'));
  ({ g, p, o } = fresh(2, ['shinobi']));
  g.ps[o].deck = ['zeni', 'gin', 'kin'];
  play(g, p, 'shinobi');
  assert.equal(g.prompt.p, o);
  choose(g, o, 'gin');
  assert.ok(g.trash.includes('gin'));
  assert.ok(g.ps[o].discard.includes('kin'));
  assert.deepEqual(g.ps[o].look, []);
});

test('避難所: 戦国の札が多いと、田3枚の代わりに配られる', () => {
  let shelters = 0;
  for (let seed = 0; seed < 50; seed++) {
    const g = T.setup(makePlayers(2), seededRng(seed), { sets: ['sengoku'] });
    const cards = T.allCards(g, g.players[0]);
    if (cards.includes('hottate')) {
      shelters++;
      assert.ok(cards.includes('muenzuka') && cards.includes('areyashiki') && !cards.includes('ta'));
    }
    const h = T.setup(makePlayers(2), seededRng(seed), { sets: ['heian'] });
    assert.ok(!T.allCards(h, h.players[0]).includes('hottate'), '戦国なしでは配られない');
  }
  assert.equal(shelters, 50, '戦国だけなら必ず');
});

test('掘っ立て小屋: 勝利点の札を買ったら廃棄してよい。荒れ屋敷は廃棄で+1札', () => {
  const { g, p } = fresh(2, ['hottate', 'kin', 'kin']);
  T.act(g, p, { type: 'treasures' }, rng());
  T.act(g, p, { type: 'buy', card: 'shouen' }, rng());
  choose(g, p, 'yes');
  assert.ok(g.trash.includes('hottate'));
  g.ps[p].hand = ['tera', 'areyashiki'];
  g.turn.phase = 'action';
  g.turn.actions = 1;
  play(g, p, 'tera');
  choose(g, p, ['areyashiki']);
  assert.equal(g.ps[p].hand.length, 1, '+1札');
});

test('楽市: 自分の札が廃棄されたとき、捨てて金を獲得できる', () => {
  const { g, p } = fresh(2, ['kobutsu', 'rakuichi', 'tatari']);
  play(g, p, 'kobutsu');
  choose(g, p, ['tatari']);
  assert.equal(g.prompt.then.card, 'rakuichi');
  choose(g, p, 'yes');
  assert.ok(g.ps[p].discard.includes('kin') && g.ps[p].discard.includes('rakuichi'));
});

test('一向一揆: 廃棄されたら+3札', () => {
  const { g, p } = fresh(2, ['kobutsu', 'ikkou']);
  play(g, p, 'kobutsu');
  choose(g, p, ['ikkou']);
  assert.equal(g.ps[p].hand.length, 1 + 3);
});

test('下剋上: 持続札も廃棄し、次の手番の効果は残る', () => {
  const { g, p } = fresh(2, ['gekokujo', 'ryoshi']);
  play(g, p, 'gekokujo');
  choose(g, p, ['ryoshi']);
  assert.ok(g.trash.includes('ryoshi'));
  assert.equal(g.ps[p].durNext.length, 2);
});

test('貧乏長屋・物乞い・小姓・浪人', () => {
  const { g, p, o } = fresh(2, ['binbou', 'zeni', 'gin']);
  play(g, p, 'binbou');
  assert.equal(g.turn.coins, 2);
  // 物乞い: 攻撃を受ける前に銀2枚
  g.ps[o].hand = ['monogoi', 'ta', 'ta', 'ta', 'ta'];
  g.ps[p].hand = ['akudou'];
  g.turn.actions = 1;
  play(g, p, 'akudou');
  assert.equal(g.prompt.p, o);
  choose(g, o, 'yes');
  assert.equal(g.ps[o].deck.at(-1), 'gin');
  assert.ok(g.ps[o].discard.includes('gin'));
  assert.equal(g.ps[o].hand.length, 4, 'そのあと悪童で4枚まで');
  // 小姓: 廃棄されたら攻撃札
  g.ps[p].hand = ['kobutsu', 'koshou'];
  g.turn.actions = 1;
  play(g, p, 'kobutsu');
  choose(g, p, ['koshou']);
  assert.ok(T.view(g, p).prompt.cands.every(id => T.CARDS[id].types.includes('attack')));
  choose(g, p, 'randori');
  // 浪人: 勝利点の札なら手札に
  g.ps[p].hand = ['rounin'];
  g.ps[p].deck = ['ta', 'gin'];
  g.turn.actions = 1;
  play(g, p, 'rounin');
  assert.deepEqual(g.ps[p].hand.sort(), ['gin', 'ta']);
});

test('隠者: 何も買わずに片付けると狂人になる。狂人は山に戻って手札の枚数だけ引く', () => {
  const { g, p } = fresh(2, ['inja', 'tatari']);
  play(g, p, 'inja');
  choose(g, p, 'hand');
  choose(g, p, ['tatari']);
  choose(g, p, 'gin');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.ok(g.trash.includes('inja'));
  assert.ok(T.allCards(g, p).includes('kyoujin'));
  const g2 = fresh(2, ['kyoujin', 'ta', 'ta', 'ta']);
  play(g2.g, g2.p, 'kyoujin');
  assert.equal(g2.g.ps[g2.p].hand.length, 6);
  assert.equal(g2.g.supply.kyoujin, 11);
  assert.equal(g2.g.turn.actions, 2);
});

test('悪童: ほかの攻撃札を使うとき廃棄して雑賀衆に。雑賀衆は2枚廃棄で+2札+2文', () => {
  const { g, p, o } = fresh(2, ['akudou', 'randori']);
  g.ps[o].hand = ['ta'];
  g.turn.actions = 2;
  play(g, p, 'akudou');
  play(g, p, 'randori');
  assert.equal(g.prompt.then.card, 'akudou');
  choose(g, p, 'yes');
  assert.ok(g.trash.includes('akudou'));
  assert.ok(g.ps[p].discard.includes('saikashu'));
  g.ps[p].hand = ['saikashu', 'ta', 'ta'];
  g.ps[o].hand = ['zeni', 'zeni', 'zeni', 'zeni', 'zeni'];
  g.turn.actions = 1;
  play(g, p, 'saikashu');
  choose(g, p, 'yes');
  choose(g, p, ['ta', 'ta']);
  assert.equal(g.ps[p].hand.length, 2);
  assert.equal(g.turn.coins, 2);
  choose(g, o, ['zeni', 'zeni']);
  assert.equal(g.ps[o].hand.length, 3);
});

test('軍師・納屋・武具蔵・金物屋', () => {
  const { g, p } = fresh(2, ['gunshi', 'naya', 'bugugura', 'kanamono', 'ta']);
  g.ps[p].deck = ['kin', 'zeni', 'ta'];
  play(g, p, 'gunshi');
  assert.ok(g.ps[p].hand.includes('kin'));
  assert.deepEqual(g.ps[p].discard.sort(), ['ta', 'zeni']);
  play(g, p, 'naya');
  choose(g, p, ['ta']);
  choose(g, p, ['kin']);
  assert.equal(g.turn.coins, 1);
  g.turn.actions = 2;
  play(g, p, 'bugugura');
  choose(g, p, 'gin');
  assert.equal(g.ps[p].deck.at(-1), 'gin');
  g.ps[p].deck.push('za', 'ta');
  play(g, p, 'kanamono'); // 田を引き、次の座を公開
  choose(g, p, 'keep');
  assert.equal(g.turn.actions, 1 + 1, '行動札なら+1行動');
});

test('屍運び: 獲得すると落武者2枚。行動札を廃棄しなければ自分を廃棄', () => {
  const { g, p } = fresh(2, ['shikabane', 'kin']);
  g.supply.ruins = 10;
  g.ruinsPile = Array(10).fill('ochimusha');
  play(g, p, 'shikabane'); // 手札に行動札が無いので、自分を廃棄
  assert.equal(g.turn.coins, 5);
  assert.ok(g.trash.includes('shikabane'));
  g.turn.phase = 'buy';
  T.act(g, p, { type: 'treasures' }, rng());
  g.turn.coins = 4;
  T.act(g, p, { type: 'buy', card: 'shikabane' }, rng());
  assert.equal(g.ps[p].discard.filter(id => id === 'ochimusha').length, 2);
});

test('鼠: 鼠を獲得し、鼠でない札を廃棄。廃棄されたら+1札', () => {
  const { g, p } = fresh(2, ['nezumi', 'nezumi', 'tatari']);
  play(g, p, 'nezumi');
  assert.deepEqual(T.view(g, p).prompt.cands.sort(), ['gin', 'tatari'], '引いた銀と祟り（鼠は選べない）');
  choose(g, p, ['tatari']);
  assert.ok(g.ps[p].discard.includes('nezumi'));
  assert.equal(g.supply.nezumi, 9);
});

test('屑拾い・琵琶法師・黄泉の穴', () => {
  const { g, p } = fresh(2, ['kuzuhiroi', 'biwa', 'yomi']);
  g.turn.actions = 3;
  g.ps[p].discard = ['kin'];
  play(g, p, 'kuzuhiroi');
  choose(g, p, 'yes');
  choose(g, p, 'kin');
  assert.equal(g.ps[p].deck.at(-1), 'kin');
  assert.equal(g.ps[p].deck.length, 1);
  g.ps[p].deck = ['ta', 'za', 'zeni', 'gin'];
  play(g, p, 'biwa'); // 銀を引き、銅銭・座・田を公開
  assert.deepEqual(g.ps[p].deck, ['za']);
  g.ps[p].deck = ['ta', 'ta', 'ta', 'kin', 'kin', 'kin'];
  play(g, p, 'yomi');
  choose(g, p, 'discard');
  assert.equal(g.ps[p].hand.filter(id => id === 'ta').length, 3);
});

test('傾奇者: 安い行動札として使う。節会なら傾奇者が廃棄される', () => {
  const { g, p } = fresh(2, ['kabukimono']);
  play(g, p, 'kabukimono');
  choose(g, p, 'sechie');
  assert.ok(g.trash.includes('kabukimono'));
  choose(g, p, 'shouen');
  const h = fresh(2, ['gozen', 'kabukimono']);
  play(h.g, h.p, 'gozen');
  choose(h.g, h.p, ['kabukimono']);
  choose(h.g, h.p, 'sato'); // 2回目は選び直さない
  assert.equal(h.g.prompt, null);
  assert.equal(h.g.turn.actions, 4);
});

test('傾奇者: 持続札として使えば次の手番まで残る', () => {
  const { g, p } = fresh(2, ['kabukimono']);
  play(g, p, 'kabukimono');
  choose(g, p, 'ryoshi');
  T.act(g, p, { type: 'end' }, rng());
  T.act(g, p, { type: 'end' }, rng());
  assert.deepEqual(g.ps[p].dur, ['kabukimono']);
});

test('国人・贋金・墓荒らし', () => {
  const { g, p } = fresh(2, ['kokujin', 'ta', 'ta', 'nisegane', 'kin']);
  play(g, p, 'kokujin');
  choose(g, p, 'discard');
  choose(g, p, ['ta', 'ta']);
  choose(g, p, 'coins');
  assert.equal(g.turn.coins, 3);
  T.act(g, p, { type: 'play', card: 'nisegane' }, rng());
  choose(g, p, ['kin']);
  assert.equal(g.turn.coins, 3 + 1 + 6);
  assert.equal(g.turn.buys, 2);
  assert.ok(g.trash.includes('kin'));
  const h = fresh(2, ['hakaarashi']);
  h.g.trash.push('kin', 'kuni');
  play(h.g, h.p, 'hakaarashi');
  choose(h.g, h.p, 'rob');
  assert.deepEqual(T.view(h.g, h.p).prompt.cands, ['kin']);
  choose(h.g, h.p, 'kin');
  assert.equal(h.g.ps[h.p].deck.at(-1), 'kin');
});

test('名のある武者: 相手の札を廃棄させ、武者どうしなら相討ち', () => {
  const g = T.setup(makePlayers(2), seededRng(4), { sets: ['sengoku'], preset: 'random' });
  g.supply.bushi = 10;
  g.knightsPile = ['bushi_kiyomasa', 'bushi_yukimura'];
  const p = g.players[0];
  const o = g.players[1];
  g.turn = { p, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [], gained: [] };
  g.ps[p].hand = ['bushi_yukimura'];
  g.ps[p].deck = ['zeni', 'zeni'];
  g.ps[o].deck = ['bushi_tsuru', 'kin'];
  g.ps[o].hand = [];
  play(g, p, 'bushi_yukimura');
  assert.equal(g.ps[p].hand.length, 2);
  choose(g, o, 'bushi_tsuru');
  assert.ok(g.trash.includes('bushi_tsuru') && g.trash.includes('bushi_yukimura'));
  assert.ok(g.ps[o].discard.includes('kin'));
  assert.equal(T.view(g, p).knightsTop, 'bushi_yukimura');
  assert.equal(T.view(g, p).costs.bushi, 5);
  g.knightsPile.push('bushi_keiji');
  assert.equal(T.view(g, p).costs.bushi, 4, '一番上の武者のコスト');
});

test('巫女・再建・護摩壇', () => {
  const { g, p } = fresh(2, ['miko', 'saiken', 'gomadan']);
  g.ps[p].deck = ['kin'];
  play(g, p, 'miko');
  choose(g, p, 'kin');
  assert.ok(g.ps[p].hand.includes('kin'));
  g.ps[p].deck = ['shouen', 'zeni', 'ta'];
  play(g, p, 'saiken');
  choose(g, p, 'ta'); // 田は残し、荘園を再建
  assert.ok(g.trash.includes('shouen'));
  choose(g, p, 'kuni');
  assert.ok(g.ps[p].discard.includes('kuni') && g.ps[p].discard.includes('ta'));
  play(g, p, 'gomadan');
  choose(g, p, ['kin']);
  choose(g, p, 'chigyou');
  assert.ok(g.ps[p].discard.includes('chigyou'));
});

test('戦国を含む組み合わせで CPU 同士が何百試合しても壊れない', () => {
  const combos = [['sengoku'], ['heian', 'sengoku'], ['kamakura', 'sengoku'], ['muromachi', 'sengoku'], ['heian', 'kamakura', 'muromachi', 'sengoku']];
  for (let seed = 0; seed < 200; seed++) {
    const n = 2 + (seed % 3);
    const r = seededRng(9000 + seed);
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
