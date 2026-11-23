import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../games/quiz/logic.js';
import { QUESTIONS } from '../games/quiz/questions.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

test('問題データ: 80問以上・重複なし・選択肢は4つで重複なし', () => {
  assert.ok(QUESTIONS.length >= 80);
  assert.equal(new Set(QUESTIONS.map(q => q[0])).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.equal(q.length, 5, q[0]);
    assert.equal(new Set(q.slice(1)).size, 4, q[0]);
  }
});

test('正解は10点＋早い順に+3/+2/+1。まちがいは0点', () => {
  const g = Q.setup(makePlayers(4), seededRng(1));
  const [a, b, c, d] = g.players;
  const ok = g.answer;
  const ng = (ok + 1) % 4;
  Q.act(g, c, { type: 'answer', choice: ok });
  Q.act(g, b, { type: 'answer', choice: ng });
  Q.act(g, a, { type: 'answer', choice: ok });
  assert.equal(g.phase, 'answer');
  Q.act(g, d, { type: 'answer', choice: ok });
  assert.equal(g.phase, 'reveal');
  assert.deepEqual([g.scores[a], g.scores[b], g.scores[c], g.scores[d]], [12, 0, 13, 11]);
  Q.act(g, b, { type: 'next' });
  assert.equal(g.round, 1);
  assert.equal(g.phase, 'answer');
});

test('各人数・問題数で最後まで遊べて、同じ問題は出ない', () => {
  for (let n = 1; n <= 8; n++) {
    for (const rounds of Q.ROUND_COUNTS) {
      const rng = seededRng(n * 100 + rounds);
      const g = Q.setup(makePlayers(n), rng, { rounds });
      let steps = 0;
      const seen = new Set();
      while (g.phase !== 'end') {
        if (steps++ > 1000) throw new Error('終わらない');
        if (g.phase === 'reveal') { Q.act(g, g.players[0], { type: 'next' }, rng); continue; }
        seen.add(g.question);
        for (const p of g.players) {
          const a = Q.bot(g, p, rng);
          if (a) Q.act(g, p, a, rng);
        }
      }
      assert.equal(seen.size, rounds);
      assert.ok(g.winners.length >= 1);
      Q.act(g, g.players[0], { type: 'restart' }, rng);
      assert.equal(g.round, 0);
    }
  }
});

test('CPU の正解率は強さに合っている', () => {
  for (const [cpu, lo, hi] of [['weak', 0.35, 0.55], ['strong', 0.78, 0.92]]) {
    let right = 0, total = 0;
    for (let s = 0; s < 40; s++) {
      const rng = seededRng(300 + s);
      const g = Q.setup(makePlayers(1), rng, { rounds: 15, cpu });
      while (g.phase !== 'end') {
        if (g.phase === 'reveal') { Q.act(g, g.players[0], { type: 'next' }, rng); continue; }
        const a = Q.bot(g, g.players[0], rng);
        total++;
        if (a.choice === g.answer) right++;
        Q.act(g, g.players[0], a, rng);
      }
    }
    assert.ok(right / total > lo && right / total < hi, `${cpu} ${right / total}`);
  }
});

test('不正な操作は拒否される', () => {
  const g = Q.setup(makePlayers(2), seededRng(2));
  const [a] = g.players;
  assert.throws(() => Q.act(g, 'nobody', { type: 'answer', choice: 0 }), GameError);
  assert.throws(() => Q.act(g, a, { type: 'answer', choice: 4 }), GameError);
  assert.throws(() => Q.act(g, a, { type: 'answer', choice: '1' }), GameError);
  assert.throws(() => Q.act(g, a, { type: 'next' }), GameError);
  Q.act(g, a, { type: 'answer', choice: 0 });
  assert.throws(() => Q.act(g, a, { type: 'answer', choice: 1 }), /もう答えました/);
  assert.throws(() => Q.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => Q.act(g, a, { type: 'hack' }), GameError);
});

test('正解とほかの人の答えは、全員が答えるまで view に出ない', () => {
  const g = Q.setup(makePlayers(3), seededRng(3));
  const [a, b] = g.players;
  Q.act(g, a, { type: 'answer', choice: 2 });
  const vb = Q.view(g, b);
  assert.equal(vb.answer, null);
  assert.equal(vb.answers, null);
  assert.equal(vb.myAnswer, null);
  assert.equal(Q.view(g, a).myAnswer, 2);
  assert.equal(vb.players[0].answered, true);
  assert.ok(!('order' in vb));
});
