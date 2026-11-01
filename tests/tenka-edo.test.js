// 天下札・江戸（蓄え・過払い）のテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../games/tenka/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';
import { totalCards } from './tenka-helpers.js';

function fresh(n = 2, hand = [], preset = 'edo-chounin') {
  const g = T.setup(makePlayers(n), seededRng(1), { sets: ['heian', 'edo', 'muromachi'], preset });
  const p = g.players[0];
  g.turn = { p, phase: 'action', actions: 1, buys: 1, coins: 0, bought: [] };
  g.ps[p].hand = hand.slice();
  g.ps[p].deck = Array(20).fill('gin');
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply) && !T.CARDS[id].notSupply) g.supply[id] = 10;
  return { g, p, o: g.players[1] };
}
const rng = () => seededRng(7);
const play = (g, p, card) => T.act(g, p, { type: 'play', card }, rng());
const choose = (g, p, answer) => T.act(g, p, { type: 'choose', answer }, rng());

test('両替商があると全員が蓄え1で始まる', () => {
  const g = T.setup(makePlayers(3), seededRng(2), { sets: ['edo'], preset: 'edo-chounin' });
  for (const p of g.players) assert.equal(g.ps[p].coffers, 1);
  const h = T.setup(makePlayers(2), seededRng(2), { sets: ['heian'] });
  for (const p of h.players) assert.equal(h.ps[p].coffers, 0);
});

test('蓄えを使うと+1文。無ければ使えない', () => {
  const { g, p } = fresh(2, ['shukuba']);
  g.ps[p].coffers = 0;
  assert.throws(() => T.act(g, p, { type: 'coffer' }), /蓄えがありません/);
  play(g, p, 'shukuba');
  assert.equal(g.ps[p].coffers, 1);
  T.act(g, p, { type: 'coffer' });
  assert.deepEqual([g.ps[p].coffers, g.turn.coins, g.turn.buys], [0, 1, 2]);
  assert.equal(T.view(g, g.players[1]).players.find(x => x.id === p).coffers, 0, '蓄えの数は全員に見える');
});

test('棟梁: 多く払った分だけ銀', () => {
  const { g, p } = fresh(2, ['kin', 'kin']);
  T.act(g, p, { type: 'treasures' });
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'gin', overpay: 1 }), /多く払う/);
  assert.throws(() => T.act(g, p, { type: 'buy', card: 'touryou', overpay: 4 }), /お金が足りません/);
  T.act(g, p, { type: 'buy', card: 'touryou', overpay: 3 });
  assert.equal(g.ps[p].discard.filter(c => c === 'gin').length, 3);
  assert.equal(g.turn.coins, 0);
});

test('寄席・千両箱・浮世絵師で蓄えがたまる', () => {
  const { g, p } = fresh(2, ['yose', 'ukiyoe', 'zeni', 'senryou', 'kin']);
  g.ps[p].coffers = 0;
  play(g, p, 'yose');
  choose(g, p, ['zeni']);
  play(g, p, 'ukiyoe');
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.ps[p].coffers, 2, '寄席+1、千両箱+1');
  T.act(g, p, { type: 'buy', card: 'gin' });
  T.act(g, p, { type: 'buy', card: 'zeni' });
  assert.equal(g.ps[p].coffers, 4, '浮世絵師: 買うたび+1');
});

test('歌舞伎: 左隣が1枚選んで捨て、残りは手札へ', () => {
  const { g, p, o } = fresh(3, ['kabuki']);
  g.ps[p].deck = ['zeni', 'ta', 'kin'];
  play(g, p, 'kabuki');
  assert.equal(g.prompt.p, o, '左隣（次の手番の人）が選ぶ');
  choose(g, o, 'kin');
  assert.deepEqual(g.ps[p].hand.sort(), ['ta', 'zeni']);
  assert.ok(g.ps[p].discard.includes('kin'));
});

test('番頭: 山札の一番上が行動札なら使う', () => {
  const { g, p } = fresh(2, ['bantou']);
  g.ps[p].deck = ['gissha', 'gin'];
  play(g, p, 'bantou');
  assert.equal(g.turn.coins, 2, '牛車を使った');
  const r = fresh(2, ['bantou']);
  r.g.ps[r.p].deck = ['kin', 'gin'];
  play(r.g, r.p, 'bantou');
  assert.deepEqual(r.g.ps[r.p].deck, ['kin'], '行動札でなければ山札に戻す');
});

test('越後屋: 廃棄して、使った蓄えの分だけ高い札に', () => {
  const { g, p } = fresh(2, ['echigoya', 'gin']);
  g.ps[p].coffers = 1;
  play(g, p, 'echigoya');
  choose(g, p, ['gin']);
  choose(g, p, 3);
  assert.equal(g.ps[p].coffers, 0);
  assert.ok(T.view(g, p).prompt.cands.includes('kin'));
  choose(g, p, 'kin');
  assert.ok(g.ps[p].discard.includes('kin'));
});

test('参勤交代: 金を得て、相手は祟り＋1枚引く', () => {
  const { g, p, o } = fresh(2, ['sankin'], 'edo-chounin');
  g.supply.tatari = 10;
  const before = g.ps[o].hand.length;
  play(g, p, 'sankin');
  assert.ok(g.ps[p].discard.includes('kin'));
  assert.ok(g.ps[o].discard.includes('tatari'));
  assert.equal(g.ps[o].hand.length, before + 1);
});

test('飛脚: 山札を捨て札にできる', () => {
  const { g, p } = fresh(2, ['hikyaku']);
  play(g, p, 'hikyaku');
  choose(g, p, 'yes');
  assert.equal(g.ps[p].deck.length, 0);
  assert.equal(g.turn.coins, 2);
});

test('5時代すべての組み合わせで CPU 同士が何百試合しても壊れない', () => {
  const sets = ['heian', 'kamakura', 'muromachi', 'sengoku', 'edo'];
  for (let seed = 0; seed < 248; seed++) {
    const mask = (seed % 31) + 1; // 31通りの組み合わせを順に
    const chosen = sets.filter((_, i) => mask & (1 << i));
    const n = 2 + (seed % 3);
    const r = seededRng(20000 + seed);
    const opts = { sets: chosen };
    if (T.validateOptions(opts)) continue; // 王国が10種そろわない組み合わせ（無いはず）
    const g = T.setup(makePlayers(n), r, opts);
    const total = totalCards(g);
    let steps = 0;
    while (g.phase === 'play') {
      assert.ok(steps++ < 30000, `終わらない ${chosen}`);
      const actor = g.players.find(x => T.bot(g, x, r));
      assert.ok(actor, '誰も操作できない');
      T.act(g, actor, T.bot(g, actor, r), r);
      assert.equal(totalCards(g), total, `札が増えたり消えたりした ${chosen}`);
    }
  }
});
