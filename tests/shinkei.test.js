import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../games/shinkei/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 5000) throw new Error('終わらない');
    S.act(g, g.turn, S.bot(g, g.turn, rng), rng);
  }
}

// r の位置を2つ返す
const posOf = (g, pred) => g.cards.map((c, i) => [c, i]).filter(([c, i]) => g.owner[i] === null && pred(c)).map(([, i]) => i);

test('そろえたら取ってもう一度・外れたら次の人で、2枚目をめくると裏に戻る', () => {
  const g = S.setup(makePlayers(2), seededRng(1), { size: 20 });
  const [a, b] = g.players;
  g.turn = a;
  g.turnIndex = 0;
  const twos = posOf(g, c => c.r === 2);
  S.act(g, a, { type: 'flip', index: twos[0] });
  S.act(g, a, { type: 'flip', index: twos[1] });
  assert.equal(g.taken[a], 2);
  assert.equal(g.turn, a, 'そろえたらもう一度');
  const x = posOf(g, c => c.r === 3)[0];
  const y = posOf(g, c => c.r === 4)[0];
  S.act(g, a, { type: 'flip', index: x });
  S.act(g, a, { type: 'flip', index: y });
  assert.equal(g.turn, b);
  assert.deepEqual(g.shown, [x, y]);
  const z = posOf(g, c => c.r === 5)[0];
  S.act(g, b, { type: 'flip', index: z });
  assert.deepEqual(g.shown, [x, y], '1枚目では外れはまだ見えている');
  S.act(g, b, { type: 'flip', index: x });
  assert.deepEqual(g.shown, [z, x], '2枚目で前の外れは裏に戻り、今の外れが表になる');
});

test('各人数・枚数・強さで最後まで遊べて、全部取られる', () => {
  for (let n = 2; n <= 6; n++) {
    for (const size of [20, 32, 52]) {
      for (const cpu of Object.keys(S.CPU_LEVELS)) {
        const rng = seededRng(n * 1000 + size * 10 + cpu.length);
        const g = S.setup(makePlayers(n), rng, { size, cpu });
        playOut(g, rng);
        assert.equal(g.players.reduce((a, p) => a + g.taken[p], 0), size);
        assert.ok(g.winners.length >= 1);
        const next = g.players[(g.first + 1) % n];
        S.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.turn, next);
        assert.ok(g.owner.every(o => o === null));
      }
    }
  }
});

test('強いCPUは弱いCPUに勝ち越す', () => {
  let strong = 0, weak = 0;
  for (let s = 0; s < 60; s++) {
    const rng = seededRng(300 + s);
    const g = S.setup(makePlayers(2), rng, { size: 32 });
    const strongSide = s % 2;
    while (g.phase !== 'end') {
      g.options.cpu = g.players.indexOf(g.turn) === strongSide ? 'strong' : 'weak';
      S.act(g, g.turn, S.bot(g, g.turn, rng), rng);
    }
    if (g.taken[g.players[strongSide]] > g.taken[g.players[1 - strongSide]]) strong++;
    else if (g.taken[g.players[strongSide]] < g.taken[g.players[1 - strongSide]]) weak++;
  }
  assert.ok(strong > weak * 2, `強い ${strong} / 弱い ${weak}`);
});

test('不正な操作は拒否される', () => {
  const g = S.setup(makePlayers(3), seededRng(2));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => S.act(g, 'nobody', { type: 'flip', index: 0 }), GameError);
  assert.throws(() => S.act(g, other, { type: 'flip', index: 0 }), /番ではありません/);
  assert.throws(() => S.act(g, g.turn, { type: 'flip', index: 99 }), /めくれません/);
  assert.throws(() => S.act(g, g.turn, { type: 'flip', index: '1' }), /めくれません/);
  S.act(g, g.turn, { type: 'flip', index: 0 });
  assert.throws(() => S.act(g, g.turn, { type: 'flip', index: 0 }), /もうめくって/);
  assert.throws(() => S.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => S.act(g, g.turn, { type: 'hack' }), GameError);
  g.owner[5] = g.players[0];
  assert.throws(() => S.act(g, g.turn, { type: 'flip', index: 5 }), /取られて/);
});

test('裏向きのカードと、覚えている情報は view に出ない', () => {
  const g = S.setup(makePlayers(2), seededRng(3), { size: 32 });
  const [a] = g.players;
  S.act(g, a, { type: 'flip', index: 0 });
  const v = S.view(g, null);
  assert.ok(v.cards[0], 'めくったカードは見える');
  assert.equal(v.cards.filter(Boolean).length, 1, '裏向きのカードの中身が見えている');
  assert.ok(!('seen' in v));
  // 外れたあと、次の人の2枚目で裏に戻ったカードは見えない
  const r0 = g.cards[0].r;
  const miss = g.cards.findIndex((c, i) => i !== 0 && c.r !== r0);
  S.act(g, a, { type: 'flip', index: miss });
  const b = g.turn;
  const free = g.cards.map((_, i) => i).filter(i => i !== 0 && i !== miss);
  S.act(g, b, { type: 'flip', index: free[0] });
  const second = free.find(i => i !== free[0] && g.cards[i].r !== g.cards[free[0]].r);
  S.act(g, b, { type: 'flip', index: second });
  const v2 = S.view(g, a);
  assert.equal(v2.cards[0], null);
  assert.equal(v2.cards[miss], null);
});
