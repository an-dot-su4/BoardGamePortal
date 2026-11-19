import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../games/pageone/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const c = (s, r) => ({ id: s + r, s, r });
const count = g => g.players.reduce((a, p) => a + g.hands[p].length, 0) + g.deck.length + g.pile.length;

function fresh(n = 3) {
  const g = P.setup(makePlayers(n), seededRng(1));
  g.turnIndex = 0;
  g.turn = g.players[0];
  g.pile = [c('H', 5)];
  g.suit = 'H';
  return g;
}

test('同じマークか同じ数字だけ出せる。8はいつでも出せてマークを選ぶ', () => {
  const g = fresh();
  const [a, b] = g.players;
  g.hands[a] = [c('S', 9), c('S', 5), c('C', 8), c('D', 3)];
  assert.throws(() => P.act(g, a, { type: 'play', card: 'S9' }), /同じマーク/);
  P.act(g, a, { type: 'play', card: 'S5' });
  assert.equal(g.suit, 'S');
  assert.equal(g.turn, b);
  g.turnIndex = 0;
  g.turn = a;
  assert.throws(() => P.act(g, a, { type: 'play', card: 'C8' }), /マークを選んで/);
  P.act(g, a, { type: 'play', card: 'C8', suit: 'D', pageOne: true });
  assert.equal(g.suit, 'D');
});

test('2は次の人が2枚引く（2を重ねれば次へ）。Jは次の人を飛ばす', () => {
  const g = fresh(3);
  const [a, b, d] = g.players;
  g.hands[a] = [c('H', 2), c('S', 4), c('S', 6)];
  g.hands[b] = [c('C', 2), c('S', 1), c('S', 3)];
  g.hands[d] = [c('D', 4), c('D', 6)];
  P.act(g, a, { type: 'play', card: 'H2' });
  assert.equal(g.penalty, 2);
  assert.throws(() => P.act(g, b, { type: 'play', card: 'S1' }), /2を出すか/);
  P.act(g, b, { type: 'play', card: 'C2' });
  assert.equal(g.penalty, 4);
  P.act(g, d, { type: 'draw' });
  assert.equal(g.hands[d].length, 6);
  assert.equal(g.penalty, 0);
  assert.equal(g.turn, a);
  g.hands[a].push(c('C', 11));
  P.act(g, a, { type: 'play', card: 'C11' });
  assert.equal(g.turn, d, 'b は飛ばされる');
});

test('ページワンを言い忘れると2枚引く', () => {
  const g = fresh(2);
  const [a] = g.players;
  g.hands[a] = [c('H', 7), c('S', 9)];
  P.act(g, a, { type: 'play', card: 'H7' });
  assert.equal(g.hands[a].length, 3);
  const g2 = fresh(2);
  g2.hands[g2.players[0]] = [c('H', 7), c('S', 9)];
  P.act(g2, g2.players[0], { type: 'play', card: 'H7', pageOne: true });
  assert.equal(g2.hands[g2.players[0]].length, 1);
});

test('引いたカードが出せれば出せる。ほかのカードは出せない', () => {
  const g = fresh(2);
  const [a] = g.players;
  g.hands[a] = [c('S', 9), c('C', 10)];
  g.deck.push(c('H', 13));
  P.act(g, a, { type: 'draw' });
  assert.equal(g.drawn, 'H13');
  assert.throws(() => P.act(g, a, { type: 'draw' }), /もう引きました/);
  assert.throws(() => P.act(g, a, { type: 'play', card: 'S9' }), /引いたカードしか/);
  P.act(g, a, { type: 'pass' });
  assert.equal(g.turn, g.players[1]);
});

test('各人数でランダムに最後まで遊べて、カードの枚数が保たれる', () => {
  for (let n = 2; n <= 6; n++) {
    for (const cpu of ['weak', 'strong']) {
      for (let s = 0; s < 4; s++) {
        const rng = seededRng(n * 100 + s + (cpu === 'weak' ? 50 : 0));
        const g = P.setup(makePlayers(n), rng, { cpu });
        let steps = 0;
        while (g.phase !== 'end') {
          if (steps++ > 5000) throw new Error('終わらない');
          P.act(g, g.turn, P.bot(g, g.turn, rng), rng);
          assert.equal(count(g), 52);
        }
        assert.equal(g.hands[g.winner].length, 0);
        assert.equal(g.ranking[0], g.winner);
        P.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.turn, g.players[1]);
      }
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = fresh(3);
  const [a, b] = g.players;
  assert.throws(() => P.act(g, 'nobody', { type: 'draw' }), GameError);
  assert.throws(() => P.act(g, b, { type: 'draw' }), /番ではありません/);
  assert.throws(() => P.act(g, a, { type: 'play', card: g.hands[b][0].id }), /手札にない/);
  assert.throws(() => P.act(g, a, { type: 'pass' }), /先に1枚/);
  g.hands[a].push(c('C', 8));
  assert.throws(() => P.act(g, a, { type: 'play', card: 'C8', suit: 'X' }), /マークを選んで/);
  assert.throws(() => P.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => P.act(g, a, { type: 'hack' }), GameError);
});

test('ほかの人の手札と山札は view に出ない', () => {
  const g = P.setup(makePlayers(3), seededRng(5));
  const [a, b] = g.players;
  const v = JSON.stringify(P.view(g, a));
  for (const x of [...g.hands[b], ...g.deck]) assert.ok(!v.includes(`"${x.id}"`), `${x.id} が見えている`);
  assert.deepEqual(P.view(g, null).hand, []);
});
