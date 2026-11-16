import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../games/soroete/logic.js';
import { PROMPTS } from '../games/soroete/prompts.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

test('表記ゆれをそろえる', () => {
  assert.equal(R.normalize('リンゴ'), R.normalize('りんご'));
  assert.equal(R.normalize('ﾘﾝｺﾞ!'), 'りんご');
  assert.equal(R.normalize(' Ｐｉｚｚａ '), 'pizza');
  assert.notEqual(R.normalize('林檎'), R.normalize('りんご'));
});

test('お題は50問以上あり、候補もそろっている', () => {
  assert.ok(PROMPTS.length >= 50);
  assert.equal(new Set(PROMPTS.map(p => p[0])).size, PROMPTS.length, 'お題が重複している');
  for (const [, list] of PROMPTS) assert.ok(list.length >= 4);
});

test('同じ答えの人数が点になり、1人だけは0点。まとめると点が変わる', () => {
  const g = R.setup(makePlayers(4), seededRng(1));
  const [a, b, c, d] = g.players;
  R.act(g, a, { type: 'answer', text: 'りんご' });
  R.act(g, b, { type: 'answer', text: 'リンゴ' });
  R.act(g, c, { type: 'answer', text: '林檎' });
  assert.equal(g.phase, 'answer');
  R.act(g, d, { type: 'answer', text: 'いちご' });
  assert.equal(g.phase, 'reveal');
  let list = R.groups(g);
  assert.deepEqual(list.map(x => [x.members.length, x.points]), [[2, 2], [1, 0], [1, 0]]);
  const ringo = list[0].key;
  const kanji = list.find(x => x.label === '林檎').key;
  R.act(g, d, { type: 'merge', a: ringo, b: kanji });
  list = R.groups(g);
  assert.equal(list[0].members.length, 3);
  R.act(g, a, { type: 'next' });
  assert.deepEqual([g.scores[a], g.scores[b], g.scores[c], g.scores[d]], [3, 3, 3, 0]);
  assert.equal(g.phase, 'answer');
  assert.equal(g.round, 1);
});

test('各人数・問題数で最後まで遊べる（CPUだけ）', () => {
  for (let n = 3; n <= 8; n++) {
    for (const rounds of R.ROUND_COUNTS) {
      const rng = seededRng(n * 100 + rounds);
      const g = R.setup(makePlayers(n), rng, { rounds });
      let steps = 0;
      while (g.phase !== 'end') {
        if (steps++ > 1000) throw new Error('終わらない');
        if (g.phase === 'reveal') {
          R.act(g, g.players[0], { type: 'next' }, rng);
          continue;
        }
        for (const p of g.players) {
          const a = R.bot(g, p, rng);
          if (a) R.act(g, p, a, rng);
        }
      }
      assert.equal(g.history.length, rounds);
      assert.ok(g.winners.length >= 1);
      assert.equal(new Set(g.history.map(h => h.prompt)).size, rounds, '同じお題が出た');
      R.act(g, g.players[1], { type: 'restart' }, rng);
      assert.equal(g.phase, 'answer');
    }
  }
});

test('CPU同士でもそこそこ答えがそろう', () => {
  let matched = 0, total = 0;
  for (let s = 0; s < 40; s++) {
    const rng = seededRng(700 + s);
    const g = R.setup(makePlayers(4), rng);
    for (const p of g.players) R.act(g, p, R.bot(g, p, rng), rng);
    for (const gr of R.groups(g)) {
      total += gr.members.length;
      if (gr.points) matched += gr.members.length;
    }
  }
  assert.ok(matched / total > 0.4, `そろった割合 ${matched / total}`);
});

test('不正な操作は拒否される', () => {
  const g = R.setup(makePlayers(3), seededRng(2));
  const [a, b] = g.players;
  assert.throws(() => R.act(g, 'nobody', { type: 'answer', text: 'x' }), GameError);
  assert.throws(() => R.act(g, a, { type: 'answer', text: '   ' }), /書いて/);
  assert.throws(() => R.act(g, a, { type: 'answer', text: '！？' }), /書いて/);
  assert.throws(() => R.act(g, a, { type: 'answer', text: 'あ'.repeat(21) }), /20文字/);
  assert.throws(() => R.act(g, a, { type: 'answer', text: 123 }), GameError);
  assert.throws(() => R.act(g, a, { type: 'merge', a: 'x', b: 'y' }), GameError);
  assert.throws(() => R.act(g, a, { type: 'next' }), GameError);
  assert.throws(() => R.act(g, a, { type: 'cancel' }), GameError);
  assert.throws(() => R.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => R.act(g, a, { type: 'hack' }), GameError);
  R.act(g, a, { type: 'answer', text: 'すいか' });
  R.act(g, a, { type: 'cancel' });
  assert.equal(g.answers[a], undefined);
  R.act(g, a, { type: 'answer', text: 'すいか' });
  R.act(g, b, { type: 'answer', text: 'すいか' });
  R.act(g, g.players[2], { type: 'answer', text: 'うみ' });
  assert.throws(() => R.act(g, a, { type: 'merge', a: 'すいか', b: 'すいか' }), GameError);
  assert.throws(() => R.act(g, a, { type: 'answer', text: 'x' }), GameError);
});

test('ほかの人の答えは、全員がそろうまで view に出ない', () => {
  const g = R.setup(makePlayers(3), seededRng(3));
  const [a, b] = g.players;
  R.act(g, a, { type: 'answer', text: 'ひみつのこたえ' });
  const vb = JSON.stringify(R.view(g, b));
  assert.ok(!vb.includes('ひみつのこたえ'));
  assert.equal(R.view(g, a).myAnswer, 'ひみつのこたえ');
  assert.equal(R.view(g, b).players[0].ready, true);
  assert.equal(R.view(g, null).groups, null);
});
