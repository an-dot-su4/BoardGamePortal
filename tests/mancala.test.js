import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../games/mancala/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const total = b => b.reduce((a, x) => a + x, 0);

function playOut(g, rng, levels = {}) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 2000) throw new Error('終わらない');
    const side = g.players.indexOf(g.turn);
    g.options.cpu = levels[side] ?? g.options.cpu;
    const a = M.bot(g, g.turn, rng);
    assert.ok(a);
    M.act(g, g.turn, a, rng);
    assert.equal(total(g.board), 12 * g.options.seeds, '種の数が変わった');
  }
}

test('まき方: 相手のゴールを飛ばす・ぴったりでもう1回・横取り', () => {
  const b = Array(14).fill(0);
  b[5] = 10; // 6,7..12 を通って 13 を飛ばし 0,1,2 へ
  const r = M.sow(b, 0, 5);
  assert.equal(b[13], 0);
  assert.deepEqual(r.sown, [6, 7, 8, 9, 10, 11, 12, 0, 1, 2]);
  const c = M.newBoard(4);
  assert.ok(M.sow(c, 0, 2).extra, '3番目の穴の4個はゴールにぴったり');
  const d = Array(14).fill(0);
  d[0] = 1;
  d[11] = 5; // 1 の向かいは 11
  const r2 = M.sow(d, 0, 0);
  assert.equal(r2.capture, 6);
  assert.equal(d[6], 6);
  assert.equal(d[1] + d[11], 0);
});

test('いろいろな種の数・強さでランダムに最後まで遊べる', () => {
  for (const seeds of M.SEEDS) {
    for (const cpu of ['weak', 'strong']) {
      const rng = seededRng(seeds * 10 + (cpu === 'weak' ? 1 : 2));
      const g = M.setup(makePlayers(2), rng, { seeds, cpu });
      playOut(g, rng);
      assert.equal(g.board[6] + g.board[13], 12 * seeds);
      const first = g.players[0];
      M.act(g, g.players[1], { type: 'restart' }, rng);
      assert.equal(g.turn, g.players[0]);
      assert.notEqual(g.players[0], first, '先手と後手が入れ替わる');
      assert.equal(g.games, 2);
    }
  }
});

test('不正な操作は拒否される', () => {
  const g = M.setup(makePlayers(2), seededRng(1));
  const [a, b] = g.players;
  assert.throws(() => M.act(g, 'nobody', { type: 'sow', pit: 0 }), GameError);
  assert.throws(() => M.act(g, b, { type: 'sow', pit: 7 }), /番ではありません/);
  assert.throws(() => M.act(g, a, { type: 'sow', pit: 7 }), /自分の側/);
  assert.throws(() => M.act(g, a, { type: 'sow', pit: 6 }), /自分の側/);
  assert.throws(() => M.act(g, a, { type: 'sow', pit: '1' }), GameError);
  assert.throws(() => M.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => M.act(g, a, { type: 'hack' }), GameError);
  g.board[1] = 0;
  assert.throws(() => M.act(g, a, { type: 'sow', pit: 1 }), /空の穴/);
});

test('view: 観戦者には自分の側がない（盤は全部公開の情報）', () => {
  const g = M.setup(makePlayers(2), seededRng(2));
  assert.equal(M.view(g, null).mySide, null);
  assert.equal(M.view(g, g.players[1]).mySide, 1);
  assert.deepEqual(M.view(g, g.players[0]).board, g.board);
});

test('強いCPUは弱いCPUにほぼ勝つ', () => {
  let strongWins = 0;
  const N = 20;
  for (let s = 0; s < N; s++) {
    const rng = seededRng(300 + s);
    const g = M.setup(makePlayers(2), rng);
    const strongSide = s % 2;
    playOut(g, rng, { [strongSide]: 'strong', [1 - strongSide]: 'weak' });
    if (g.winner === g.players[strongSide]) strongWins++;
  }
  assert.ok(strongWins >= N * 0.75, `強いCPUの勝ち ${strongWins}/${N}`);
});
