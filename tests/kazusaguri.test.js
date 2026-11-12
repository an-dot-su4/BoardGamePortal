import test from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../games/kazusaguri/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 2000) throw new Error('終わらない');
    for (const p of g.players) {
      const a = K.bot(g, p, rng);
      if (a) K.act(g, p, a, rng);
    }
  }
}

test('ヒットとブローの判定', () => {
  assert.deepEqual(K.judge('123', '123'), { hit: 3, blow: 0 });
  assert.deepEqual(K.judge('123', '321'), { hit: 1, blow: 2 });
  assert.deepEqual(K.judge('123', '456'), { hit: 0, blow: 0 });
  assert.deepEqual(K.judge('0918', '9081'), { hit: 0, blow: 4 });
  assert.ok(K.validCode('012', 3));
  assert.equal(K.validCode('112', 3), false);
  assert.equal(K.validCode('12', 3), false);
  assert.equal(K.validCode('1a3', 3), false);
  assert.equal(K.validCode(123, 3), false);
  assert.equal(K.allCodes(3).length, 720);
});

test('各人数・桁数・強さで最後まで遊べる', () => {
  for (let n = 2; n <= 6; n++) {
    for (const length of K.LENGTHS) {
      for (const cpu of ['weak', 'strong']) {
        const rng = seededRng(n * 100 + length * 10 + (cpu === 'weak' ? 1 : 2));
        const g = K.setup(makePlayers(n), rng, { length, cpu });
        playOut(g, rng);
        assert.ok(g.winners.length >= 1);
        for (const w of g.winners) assert.equal(g.history[w].at(-1).guess, g.secrets[K.targetOf(g, w)]);
        for (const p of g.players) assert.equal(g.history[p].length, g.round);
        K.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.phase, 'secret');
        assert.equal(g.games, 2);
      }
    }
  }
});

test('強いCPUは弱いCPUより早く当てる', () => {
  const avg = cpu => {
    let total = 0;
    for (let s = 0; s < 40; s++) {
      const rng = seededRng(50 + s);
      const g = K.setup(makePlayers(2), rng, { length: 3, cpu });
      playOut(g, rng);
      total += g.round;
    }
    return total / 40;
  };
  const strong = avg('strong');
  const weak = avg('weak');
  assert.ok(strong < weak, `強い ${strong} / 弱い ${weak}`);
  assert.ok(strong < 7);
});

test('不正な操作は拒否される', () => {
  const g = K.setup(makePlayers(3), seededRng(2));
  const [a, b, c] = g.players;
  assert.throws(() => K.act(g, 'nobody', { type: 'secret', code: '123' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'secret', code: '113' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'secret', code: '1234' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'guess', code: '123' }), /予想する/);
  K.act(g, a, { type: 'secret', code: '123' });
  assert.throws(() => K.act(g, a, { type: 'secret', code: '456' }), /決めてあります/);
  K.act(g, b, { type: 'secret', random: true });
  K.act(g, c, { type: 'secret', code: '789' });
  assert.equal(g.phase, 'guess');
  assert.throws(() => K.act(g, a, { type: 'guess', code: '99' }), GameError);
  K.act(g, a, { type: 'guess', code: '012' });
  assert.throws(() => K.act(g, a, { type: 'guess', code: '345' }), /出してあります/);
  assert.throws(() => K.act(g, a, { type: 'restart' }), GameError);
  assert.throws(() => K.act(g, a, { type: 'hack' }), GameError);
});

test('ほかの人のひみつの数と、公開前の予想は view に出ない', () => {
  const g = K.setup(makePlayers(3), seededRng(3));
  const [a, b, c] = g.players;
  K.act(g, a, { type: 'secret', code: '012' });
  K.act(g, b, { type: 'secret', code: '345' });
  K.act(g, c, { type: 'secret', code: '678' });
  K.act(g, b, { type: 'guess', code: '987' });
  const va = JSON.stringify(K.view(g, a));
  assert.ok(!va.includes('345') && !va.includes('678'), 'ほかの人のひみつの数が見えている');
  assert.ok(!va.includes('987'), '公開前の予想が見えている');
  assert.equal(K.view(g, a).mySecret, '012');
  assert.equal(K.view(g, null).mySecret, null);
  assert.ok(!JSON.stringify(K.view(g, null)).includes('012'));
  // 決着したら全員分が公開される
  g.phase = 'end';
  assert.equal(K.view(g, a).players[1].secret, '345');
});
