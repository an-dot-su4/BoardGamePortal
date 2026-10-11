import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../games/daifugo/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const c = (s, r) => ({ id: s === 'X' ? 'JK' : s + r, s, r });
const JK = c('X', 16);

test('1枚・複数枚・階段を判定できる', () => {
  assert.deepEqual(D.interpretations([c('S', 5)]), [{ type: 'single', size: 1, low: 5, high: 5 }]);
  assert.equal(D.interpretations([c('S', 5), c('H', 5)])[0].type, 'group');
  assert.equal(D.interpretations([c('S', 5), c('H', 6)]).length, 0);
  assert.equal(D.interpretations([c('S', 5), c('S', 6), c('S', 7)])[0].type, 'seq');
  assert.equal(D.interpretations([c('S', 5), c('H', 6), c('S', 7)]).length, 0, 'マークが違う階段は不可');
  assert.equal(D.interpretations([c('S', 14), c('S', 15), c('S', 13)])[0].high, 15, 'K-A-2 は可');
});

test('ジョーカーは穴埋めにも端にも使える', () => {
  const gap = D.interpretations([c('S', 5), JK, c('S', 7)]);
  assert.deepEqual(gap.map(x => x.low), [5]);
  const end = D.interpretations([c('S', 5), c('S', 6), JK]);
  assert.deepEqual(end.map(x => x.low), [4, 5]);
  assert.equal(D.interpretations([c('S', 9), JK])[0].type, 'group');
});

test('強さの比較と革命', () => {
  const field = D.interpretations([c('S', 10)])[0];
  assert.ok(D.bestPlay([c('H', 11)], field, false));
  assert.equal(D.bestPlay([c('H', 9)], field, false), null);
  assert.ok(D.bestPlay([c('H', 9)], field, true), '革命中は弱い数字が勝つ');
  assert.ok(D.bestPlay([JK], field, true), 'ジョーカー1枚は革命中も最強');
  assert.equal(D.bestPlay([c('S', 15)], D.interpretations([JK])[0], false), null);
  const pair = D.interpretations([c('S', 4), c('H', 4)])[0];
  assert.equal(D.bestPlay([c('S', 15)], pair, false), null, '枚数が違うと出せない');
});

test('8切りで場が流れて同じ人の番になる', () => {
  const s = D.setup(makePlayers(3), seededRng(1));
  const p = s.turn;
  s.hands[p] = [c('S', 8), c('S', 9)];
  D.act(s, p, { type: 'play', cards: ['S8'] });
  assert.equal(s.field, null);
  assert.equal(s.turn, p);
});

test('全員パスで場が流れる', () => {
  const s = D.setup(makePlayers(3), seededRng(2));
  const [a, b, d] = s.players;
  s.turn = a;
  s.hands[a] = [c('S', 9), c('S', 10)];
  D.act(s, a, { type: 'play', cards: ['S9'] });
  assert.equal(s.turn, b);
  D.act(s, b, { type: 'pass' });
  D.act(s, d, { type: 'pass' });
  assert.equal(s.field, null);
  assert.equal(s.turn, a);
  assert.throws(() => D.act(s, a, { type: 'pass' }), /パスできません/);
});

test('不正な操作は拒否される', () => {
  const s = D.setup(makePlayers(4), seededRng(3));
  const other = s.players.find(p => p !== s.turn);
  assert.throws(() => D.act(s, other, { type: 'pass' }), /あなたの番/);
  assert.throws(() => D.act(s, s.turn, { type: 'play', cards: ['ZZ'] }), /手札にない/);
  assert.throws(() => D.act(s, 'stranger', { type: 'pass' }), /観戦中/);
});

test('ランダムに最後まで遊んでも壊れない（3〜6人 × 各50試合）', () => {
  for (let n = 3; n <= 6; n++) {
    for (let seed = 0; seed < 50; seed++) {
      const rng = seededRng(seed * 10 + n);
      const s = D.setup(makePlayers(n), rng);
      let steps = 0;
      while (s.phase !== 'gameEnd') {
        assert.ok(steps++ < 5000, '終わらない');
        if (s.phase === 'roundEnd') {
          D.act(s, s.players[0], { type: 'next' }, rng);
          continue;
        }
        const total = Object.values(s.hands).reduce((a, h) => a + h.length, 0);
        const options = D.candidatePlays(s.hands[s.turn], s.field, s.revolution);
        const passOk = !!s.field && rng() < 0.3;
        if (options.length === 0 || passOk) {
          if (!s.field) assert.fail('場が空なのに出せるカードがない');
          D.act(s, s.turn, { type: 'pass' });
        } else {
          const pick = options[Math.floor(rng() * options.length)];
          D.act(s, s.turn, { type: 'play', cards: pick }, rng);
          if (s.phase === 'play') {
            const after = Object.values(s.hands).reduce((a, h) => a + h.length, 0);
            assert.equal(after, total - pick.length);
          }
        }
        if (s.phase === 'play') assert.ok(s.hands[s.turn].length > 0, '上がった人に手番が回った');
      }
      const sum = Object.values(s.scores).reduce((a, b) => a + b, 0);
      assert.equal(sum, (D.TOTAL_ROUNDS * n * (n - 1)) / 2);
    }
  }
});

test('他人の手札は view に含まれない', () => {
  const s = D.setup(makePlayers(4), seededRng(4));
  const v = D.view(s, 'p1');
  assert.equal(v.hand.length, s.hands.p1.length);
  assert.ok(!JSON.stringify(v).includes(JSON.stringify(s.hands.p2[0])));
  assert.deepEqual(D.view(s, null).hand, []);
});
