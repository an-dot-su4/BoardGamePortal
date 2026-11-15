import test from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../games/shichinarabe/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 3000) throw new Error('終わらない');
    N.act(g, g.turn, N.bot(g, g.turn, rng), rng);
  }
}

const c = (s, r) => ({ id: s + r, s, r });

test('最初に7が並び、◆7を持っていた人から', () => {
  const g = N.setup(makePlayers(4), seededRng(1));
  for (const s of N.SUITS) assert.ok(g.board[s][7]);
  assert.equal(g.players.reduce((a, p) => a + g.hands[p].length, 0), 48);
  assert.ok(g.players.every(p => g.hands[p].every(x => x.r !== 7)));
  assert.equal(g.log[0].includes(g.names[g.turn]), true);
});

test('となりのカードだけ出せる・パスの回数を超えると脱落して手札が場に置かれる', () => {
  const g = N.setup(makePlayers(3), seededRng(2), { passes: 1 });
  const [a, b, d] = g.players;
  g.turn = a;
  g.hands[a] = [c('S', 6), c('S', 4), c('H', 9)];
  assert.throws(() => N.act(g, a, { type: 'play', card: 'S4' }), /となり/);
  N.act(g, a, { type: 'play', card: 'S6' });
  assert.ok(g.board.S[6]);
  assert.equal(g.turn, b);
  g.hands[b] = [c('C', 2), c('C', 3)];
  N.act(g, b, { type: 'pass' });
  N.act(g, d, { type: 'pass' });
  N.act(g, a, { type: 'pass' });
  N.act(g, b, { type: 'pass' }); // 2回目 → 脱落
  assert.ok(g.out.includes(b));
  assert.ok(g.board.C[2] && g.board.C[3], '脱落した人の手札は場に置かれる');
  assert.equal(g.hands[b].length, 0);
});

test('各人数・パス回数・強さで最後まで遊べて、順位が全員分つく', () => {
  for (let n = 3; n <= 6; n++) {
    for (const passes of N.PASS_LIMITS) {
      for (const cpu of ['weak', 'strong']) {
        const rng = seededRng(n * 100 + passes * 10 + (cpu === 'weak' ? 1 : 2));
        const g = N.setup(makePlayers(n), rng, { passes, cpu });
        playOut(g, rng);
        assert.equal(g.ranking.length, n);
        assert.equal(new Set(g.ranking).size, n);
        for (const s of N.SUITS) for (let r = 1; r <= 13; r++) {
          // 全員の手札がなくなっているか、最後の1人の手札以外は場にある
          const inHand = g.players.some(p => g.hands[p].some(x => x.s === s && x.r === r));
          assert.ok(g.board[s][r] || inHand);
        }
        N.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.phase, 'play');
        assert.equal(g.games, 2);
      }
    }
  }
});

test('強いCPUは弱いCPUより上の順位になりやすい', () => {
  let better = 0, worse = 0;
  for (let s = 0; s < 80; s++) {
    const rng = seededRng(500 + s);
    const g = N.setup(makePlayers(4), rng);
    const strong = g.players[s % 4];
    while (g.phase !== 'end') {
      g.options.cpu = g.turn === strong ? 'strong' : 'weak';
      N.act(g, g.turn, N.bot(g, g.turn, rng), rng);
    }
    const rank = g.ranking.indexOf(strong);
    if (rank <= 1) better++;
    else worse++;
  }
  assert.ok(better > worse, `上位 ${better} / 下位 ${worse}`);
});

test('不正な操作は拒否される', () => {
  const g = N.setup(makePlayers(3), seededRng(3));
  const other = g.players.find(p => p !== g.turn);
  assert.throws(() => N.act(g, 'nobody', { type: 'pass' }), GameError);
  assert.throws(() => N.act(g, other, { type: 'pass' }), /番ではありません/);
  assert.throws(() => N.act(g, g.turn, { type: 'play', card: g.hands[other][0].id }), /手札にない/);
  assert.throws(() => N.act(g, g.turn, { type: 'play', card: 'S7' }), /手札にない/);
  assert.throws(() => N.act(g, g.turn, { type: 'restart' }), GameError);
  assert.throws(() => N.act(g, g.turn, { type: 'hack' }), GameError);
});

test('ほかの人の手札は view に出ない', () => {
  const g = N.setup(makePlayers(4), seededRng(4));
  const [a, b] = g.players;
  const va = JSON.stringify(N.view(g, a));
  for (const x of g.hands[b]) assert.ok(!va.includes(`"${x.id}"`), 'ほかの人の手札が見えている');
  assert.deepEqual(N.view(g, null).hand, []);
  assert.equal(N.view(g, a).players[1].count, g.hands[b].length);
});
