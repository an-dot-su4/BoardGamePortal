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
  return { g, p, o: g.players[1] };
}
const rng = () => seededRng(7);
const play = (g, p, card) => T.act(g, p, { type: 'play', card }, rng());
const choose = (g, p, answer) => T.act(g, p, { type: 'choose', answer }, rng());

test('落武者の山: 4種が混ざり、一番上の札を獲得する', () => {
  const g = T.setup(makePlayers(3), seededRng(2), { sets: ['sengoku'], preset: 'sengoku-gekokujo' });
  assert.equal(g.supply.ruins, 20);
  assert.deepEqual([...new Set(g.ruinsPile)].sort(), ['arechi', 'haison', 'ochimusha', 'yakedera']);
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
