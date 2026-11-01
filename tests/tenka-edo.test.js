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
  for (const id of Object.keys(T.CARDS)) if (!(id in g.supply) && !T.CARDS[id].notSupply && !T.CARDS[id].hidden) g.supply[id] = 10;
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

test('寄席・浮世絵師で蓄えがたまる', () => {
  const { g, p } = fresh(2, ['yose', 'ukiyoe', 'zeni', 'gin', 'kin']);
  g.ps[p].coffers = 0;
  play(g, p, 'yose');
  choose(g, p, ['zeni']);
  play(g, p, 'ukiyoe');
  T.act(g, p, { type: 'treasures' });
  assert.equal(g.ps[p].coffers, 1, '寄席+1');
  T.act(g, p, { type: 'buy', card: 'gin' });
  T.act(g, p, { type: 'buy', card: 'zeni' });
  assert.equal(g.ps[p].coffers, 3, '浮世絵師: 買うたび+1');
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

test('江戸の札はギルドと同じ13種', () => {
  assert.equal(T.KINGDOM.filter(c => c.set === 'edo').length, 13);
});

test('石屋: 廃棄してそれより安い札を2枚。過払いでその額の行動札を2枚', () => {
  const { g, p } = fresh(2, ['ishiya', 'kin']);
  play(g, p, 'ishiya');
  choose(g, p, ['kin']);
  assert.ok(T.view(g, p).prompt.cands.every(id => T.CARDS[id].cost <= 5));
  choose(g, p, 'shouen');
  choose(g, p, 'gin');
  assert.ok(g.ps[p].discard.includes('shouen') && g.ps[p].discard.includes('gin'));
  const r = fresh(2, ['kin', 'kin']);
  T.act(r.g, r.p, { type: 'treasures' });
  T.act(r.g, r.p, { type: 'buy', card: 'ishiya', overpay: 4 });
  const cands = T.view(r.g, r.p).prompt.cands;
  assert.ok(cands.length && cands.every(id => T.CARDS[id].cost === 4 && T.CARDS[id].types.includes('action')));
  choose(r.g, r.p, cands[0]);
  choose(r.g, r.p, cands[0]);
  assert.equal(r.g.ps[r.p].discard.filter(c => c === cands[0]).length, 2);
});

test('町医者: 名前を言った札を廃棄し、残りは順番を選んで戻す。過払いで山札を診る', () => {
  const { g, p } = fresh(2, ['machiisha']);
  g.ps[p].deck = ['kin', 'ta', 'gin', 'ta']; // 上から ta, gin, ta
  play(g, p, 'machiisha');
  assert.ok(T.view(g, p).prompt.cands.includes('ta'));
  choose(g, p, 'ta');
  assert.equal(g.trash.filter(c => c === 'ta').length, 2);
  assert.deepEqual(g.ps[p].deck, ['kin', 'gin']);
  const r = fresh(2, ['kin', 'kin']);
  r.g.ps[r.p].deck = ['gin', 'tatari'];
  T.act(r.g, r.p, { type: 'treasures' });
  T.act(r.g, r.p, { type: 'buy', card: 'machiisha', overpay: 2 });
  choose(r.g, r.p, 'trash');
  choose(r.g, r.p, 'back');
  assert.ok(r.g.trash.includes('tatari'));
  assert.deepEqual(r.g.ps[r.p].deck, ['gin']);
});

test('順番を選んで山札に戻す: 先に選んだ札ほど下', () => {
  const { g, p } = fresh(2, ['machiisha']);
  g.ps[p].deck = ['zeni', 'kin', 'gin', 'ta'];
  play(g, p, 'machiisha');
  choose(g, p, 'tatari'); // 該当なし
  assert.equal(g.prompt.kind, 'list');
  choose(g, p, 'kin');
  choose(g, p, 'ta');
  assert.deepEqual(g.ps[p].deck, ['zeni', 'kin', 'ta', 'gin']);
});

test('渡り職人: 名前を言った札以外が3枚出るまでめくる', () => {
  const { g, p } = fresh(2, ['watari']);
  g.ps[p].deck = ['kin', 'ta', 'gin', 'ta', 'zeni'];
  play(g, p, 'watari');
  choose(g, p, 'ta');
  assert.deepEqual(g.ps[p].hand.sort(), ['gin', 'kin', 'zeni']);
  assert.deepEqual(g.ps[p].discard.sort(), ['ta', 'ta']);
});

test('代官: 財宝を廃棄し、相手は同じ札を捨て、+3以下の財宝を山札の上に', () => {
  const { g, p, o } = fresh(2, ['daikan', 'gin']);
  g.ps[o].hand = ['gin', 'zeni', 'zeni', 'ta', 'ta'];
  play(g, p, 'daikan');
  choose(g, p, ['gin']);
  assert.ok(g.ps[o].discard.includes('gin'));
  choose(g, p, 'kin');
  assert.equal(g.ps[p].deck.at(-1), 'kin');
});

test('番頭: 過払い1文につき捨て札から山札の上へ', () => {
  const { g, p } = fresh(2, ['kin', 'kin']);
  g.ps[p].discard = ['kin', 'ta'];
  T.act(g, p, { type: 'treasures' });
  T.act(g, p, { type: 'buy', card: 'bantou', overpay: 1 });
  choose(g, p, 'kin');
  assert.equal(g.ps[p].deck.at(-1), 'kin');
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
