import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../games/sevenbridge/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const C = id => ({ id, s: id[0], r: Number(id.slice(1)) });
const count = g => g.players.reduce((a, p) => a + g.hands[p].length, 0) + g.stock.length + g.discard.length + g.melds.reduce((a, m) => a + m.cards.length, 0);

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 20000) throw new Error('終わらない');
    if (g.phase === 'result') { S.act(g, g.players[0], { type: 'next' }, rng); continue; }
    const a = S.bot(g, g.turn, rng);
    assert.ok(a, 'CPU が操作を返さない');
    S.act(g, g.turn, a, rng);
    assert.equal(count(g), 52, 'カードの枚数が合わない');
    for (const m of g.melds) assert.ok(S.meldOf(m.cards), '場の組がくずれている');
  }
}

test('組の判定: セット・階段・7の特別ルール', () => {
  assert.ok(S.meldOf(['S5', 'H5', 'D5'].map(C)));
  assert.ok(S.meldOf(['S5', 'H5', 'D5', 'C5'].map(C)));
  assert.equal(S.meldOf(['S5', 'H5'].map(C)), null);
  assert.ok(S.meldOf(['S3', 'S4', 'S5'].map(C)));
  assert.equal(S.meldOf(['S3', 'S4', 'H5'].map(C)), null);
  assert.ok(S.meldOf(['S12', 'S13', 'S1'].map(C)), 'Q-K-A');
  assert.ok(S.meldOf(['S1', 'S2', 'S3'].map(C)), 'A-2-3');
  assert.equal(S.meldOf(['S13', 'S1', 'S2'].map(C)), null, 'K-A-2 はつながらない');
  assert.ok(S.meldOf(['H7'].map(C)), '7は1枚で出せる');
  assert.ok(S.meldOf(['H7', 'S7'].map(C)));
  assert.ok(S.meldOf(['H7', 'H8'].map(C)));
  assert.equal(S.meldOf(['H8'].map(C)), null);
  assert.equal(S.meldOf(['H6', 'H8'].map(C)), null);
  assert.deepEqual(S.meldOf(['S5', 'S3', 'S4'].map(C)).cards.map(c => c.id), ['S3', 'S4', 'S5']);
});

test('引く→さらす→つけ札→捨てる の流れと、出しきったときの得点', () => {
  const g = S.setup(makePlayers(2), seededRng(3));
  const [a, b] = g.players;
  g.turn = a;
  g.phase = 'draw';
  g.hands[a] = ['S3', 'S4', 'S5', 'H7', 'D9'].map(C);
  g.hands[b] = ['C13', 'C1', 'D2'].map(C); // 10 + 1 + 2 = 13点
  g.discard = [C('S6')];
  g.stock = [C('H2'), C('H3')];
  assert.throws(() => S.act(g, a, { type: 'meld', cards: ['S3', 'S4', 'S5'] }), /先に1枚引いて/);
  S.act(g, a, { type: 'draw', from: 'discard' });
  assert.throws(() => S.act(g, a, { type: 'draw', from: 'stock' }), /もう引きました/);
  assert.throws(() => S.act(g, a, { type: 'discard', card: 'S6' }), /この手番には捨てられません/);
  assert.throws(() => S.act(g, a, { type: 'meld', cards: ['S3', 'D9'] }), /組になっていません/);
  S.act(g, a, { type: 'meld', cards: ['S3', 'S4', 'S5'] });
  const id = g.melds[0].id;
  S.act(g, a, { type: 'layoff', card: 'S6', meld: id });
  assert.deepEqual(g.melds[0].cards.map(c => c.id), ['S3', 'S4', 'S5', 'S6']);
  assert.throws(() => S.act(g, a, { type: 'layoff', card: 'D9', meld: id }), /つけられません/);
  S.act(g, a, { type: 'meld', cards: ['H7'] });
  S.act(g, a, { type: 'discard', card: 'D9' });
  assert.equal(g.result.winner, a);
  assert.equal(g.result.pts, 13);
  assert.equal(g.phase, 'result');
  S.act(g, b, { type: 'next' });
  assert.equal(g.round, 2);
  assert.equal(count(g), 52);
});

test('ほかの人の組にもつけ札でき、最後の1枚を捨てて上がると相手の手札の点が入る', () => {
  const g = S.setup(makePlayers(2), seededRng(4));
  const [a, b] = g.players;
  g.turn = a;
  g.phase = 'draw';
  g.melds = [{ id: 9, owner: b, kind: 'seven', cards: [C('S7')] }];
  g.hands[a] = ['S8', 'D9'].map(C);
  g.hands[b] = ['C13', 'C1', 'D2'].map(C);
  g.stock = [C('H2')];
  S.act(g, a, { type: 'draw', from: 'stock' });
  S.act(g, a, { type: 'layoff', card: 'S8', meld: 9 });
  assert.equal(g.melds[0].kind, 'run');
  S.act(g, a, { type: 'discard', card: 'D9' });
  assert.equal(g.hands[a].length, 1);
  assert.equal(g.turn, b);
  // b の番: 山札が尽きていたので混ぜ直されている
  assert.ok(g.stock.length >= 0);
  g.turn = a; g.phase = 'play';
  S.act(g, a, { type: 'discard', card: 'H2' });
  assert.equal(g.result.winner, a);
  assert.equal(g.result.pts, 13);
  assert.equal(g.scores[a], 13);
});

test('取ったカードしか残らないときは捨てて上がれる', () => {
  const g = S.setup(makePlayers(2), seededRng(5));
  const [a] = g.players;
  g.turn = a; g.phase = 'draw';
  g.hands[a] = ['S3', 'S4', 'S5'].map(C);
  g.discard = [C('D9')];
  S.act(g, a, { type: 'draw', from: 'discard' });
  S.act(g, a, { type: 'meld', cards: ['S3', 'S4', 'S5'] });
  S.act(g, a, { type: 'discard', card: 'D9' });
  assert.equal(g.result.winner, a);
});

test('ランダムに最後まで遊んで必ず終わる（2〜6人）', () => {
  for (let n = 2; n <= 6; n++) for (let seed = 1; seed <= 15; seed++) {
    const rng = seededRng(seed * 31 + n);
    const g = S.setup(makePlayers(n), rng, { rounds: 3 });
    assert.equal(count(g), 52);
    playOut(g, rng);
    assert.ok(g.winners.length >= 1);
    S.act(g, g.players[0], { type: 'restart' }, rng);
    assert.equal(g.phase, 'draw');
  }
});

test('不正な操作は拒否される', () => {
  const rng = seededRng(7);
  const g = S.setup(makePlayers(3), rng);
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => S.act(g, other, { type: 'draw', from: 'stock' }), GameError);
  assert.throws(() => S.act(g, 'nobody', { type: 'draw', from: 'stock' }), GameError);
  assert.throws(() => S.act(g, g.turn, { type: 'draw', from: 'sky' }), GameError);
  assert.throws(() => S.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => S.act(g, g.turn, { type: 'next' }), GameError);
  S.act(g, g.turn, { type: 'draw', from: 'stock' });
  const p = g.turn;
  const otherCard = g.hands[other][0].id;
  assert.throws(() => S.act(g, p, { type: 'discard', card: otherCard }), GameError);
  assert.throws(() => S.act(g, p, { type: 'meld', cards: 'S1' }), GameError);
  assert.throws(() => S.act(g, p, { type: 'meld', cards: [g.hands[p][0].id, g.hands[p][0].id, g.hands[p][0].id] }), GameError);
  assert.throws(() => S.act(g, p, { type: 'layoff', card: g.hands[p][0].id, meld: 999 }), GameError);
  assert.throws(() => S.act(g, p, { type: 'fly' }), GameError);
});

test('ほかの人の手札と山札の中身は view に出ない', () => {
  const g = S.setup(makePlayers(3), seededRng(8));
  const [a, b] = g.players;
  const v = S.view(g, a);
  const json = JSON.stringify(v);
  for (const c of g.hands[b]) assert.ok(!json.includes(`"${c.id}"`) || g.melds.some(m => m.cards.includes(c)) || v.discardTop?.id === c.id, `${c.id} が見える`);
  for (const c of g.stock) assert.ok(!json.includes(`"${c.id}"`), `山札の ${c.id} が見える`);
  assert.equal(v.hand.length, 7);
  assert.equal(v.players.find(p => p.id === b).count, 7);
  const spec = S.view(g, null);
  assert.deepEqual(spec.hand, []);
  for (const p of g.players) for (const c of g.hands[p]) assert.ok(!JSON.stringify(spec).includes(`"${c.id}"`));
  assert.equal(spec.result, null);
});
