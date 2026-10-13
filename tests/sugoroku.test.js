import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../games/sugoroku/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

test('盤面: スタートとゴールは普通のマス、ワープ先も盤内', () => {
  const b = S.board();
  assert.equal(b.length, S.GOAL + 1);
  assert.equal(b[0], 'plain');
  assert.equal(b[S.GOAL], 'plain');
  for (const [from, to] of Object.entries(S.WARPS)) {
    assert.equal(b[from], 'warp');
    assert.ok(to > 0 && to < S.GOAL);
  }
});

test('手番以外は振れない', () => {
  const s = S.setup(makePlayers(3), seededRng(1));
  assert.throws(() => S.act(s, 'p1', { type: 'roll' }), /あなたの番/);
  assert.throws(() => S.act(s, 'x', { type: 'roll' }), /観戦中/);
  S.act(s, 'p0', { type: 'roll' }, seededRng(1));
  assert.ok(s.pos.p0 > 0);
});

test('コインで振り直すと、カードで動いた他の人も元に戻る', () => {
  const s = S.setup(makePlayers(3), seededRng(5));
  s.coins.p0 = 3;
  s.pos = { p0: 2, p1: 10, p2: 10 };
  s.deck = ['allBack']; // 次に引くカード: 自分以外の全員が1マス戻る
  S.act(s, 'p0', { type: 'roll' }, () => 0); // 1 → 3マス目（カード）
  assert.deepEqual(s.pos, { p0: 3, p1: 9, p2: 9 });
  assert.equal(s.turn, 'p0', '振り直すか選べる');
  S.act(s, 'p0', { type: 'reroll' }, () => 0.5); // 4 → 6マス目（2マス進む → 8マス目のカード）
  assert.equal(s.pos.p1, 9, '1回分だけ戻る（振り直し前の効果は取り消し）');
  assert.equal(s.lastRoll.from, 2);
  assert.equal(s.lastRoll.roll, 4);
  assert.equal(s.coins.p0, 0);
  assert.notEqual(s.turn, 'p0');
  assert.throws(() => S.act(s, 'p0', { type: 'reroll' }), /番/);
});

test('このターンに拾ったコインでは振り直せない', () => {
  const s = S.setup(makePlayers(2), seededRng(2));
  s.coins.p0 = 2;
  s.pos.p0 = 4;
  S.act(s, 'p0', { type: 'roll' }, () => 0); // 1 → 5マス目（コイン+1 で3枚）
  assert.equal(s.coins.p0, 3);
  assert.equal(s.turn, 'p1');
});

test('「このまま進む」で次の人へ', () => {
  const s = S.setup(makePlayers(2), seededRng(3));
  s.coins.p0 = 3;
  S.act(s, 'p0', { type: 'roll' }, () => 0.5);
  assert.throws(() => S.act(s, 'p0', { type: 'roll' }), /選んで/);
  S.act(s, 'p0', { type: 'end' });
  assert.equal(s.turn, 'p1');
});

test('view に山札の順番や振り直し用の記録が出ない', () => {
  const s = S.setup(makePlayers(2), seededRng(4));
  S.act(s, 'p0', { type: 'roll' }, seededRng(9));
  const v = JSON.stringify(S.view(s, 'p1'));
  assert.ok(!v.includes('"deck"'));
  assert.ok(!v.includes('"undo"'));
});

test('ランダムに遊んでも必ず誰かがゴールする（2〜6人 × 200試合）', () => {
  let totalTurns = 0;
  let games = 0;
  for (let n = 2; n <= 6; n++) {
    for (let seed = 0; seed < 200; seed++) {
      const rng = seededRng(seed * 7 + n);
      const s = S.setup(makePlayers(n), rng);
      let steps = 0;
      while (s.phase === 'play') {
        assert.ok(steps++ < 3000, '終わらない');
        const p = s.turn;
        if (s.lastRoll?.by === p && s.lastRoll.canReroll) {
          S.act(s, p, { type: rng() < 0.5 ? 'reroll' : 'end' }, rng);
        } else {
          S.act(s, p, { type: 'roll' }, rng);
        }
        for (const q of s.players) assert.ok(s.pos[q] >= 0 && s.pos[q] <= S.GOAL && s.coins[q] >= 0);
      }
      assert.equal(s.pos[s.winner], S.GOAL);
      totalTurns += s.turnCount / n;
      games++;
      S.act(s, s.players[0], { type: 'restart' }, rng);
      assert.equal(s.phase, 'play');
    }
  }
  const avg = totalTurns / games;
  assert.ok(avg > 6 && avg < 20, `1人あたりの平均手番 ${avg}`);
});
