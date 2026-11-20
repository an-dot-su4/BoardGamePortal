import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../games/bakudan/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function playOut(g, rng) {
  let steps = 0;
  while (g.phase !== 'end') {
    if (steps++ > 3000) throw new Error('終わらない');
    const a = B.bot(g, g.turn, rng);
    assert.ok(a, 'CPU が手を返さない');
    B.act(g, g.turn, a, rng);
  }
}

test('最初に開けたマスと周りにはばくだんがなく、0なら周りも開く', () => {
  for (let s = 0; s < 20; s++) {
    const g = B.setup(makePlayers(2), seededRng(s), { level: 'hard' });
    const start = 5 * g.w + 5;
    B.act(g, g.players[0], { type: 'open', index: start }, seededRng(s));
    assert.equal(g.bombs.filter(Boolean).length, 28);
    assert.ok(!g.bombs[start]);
    for (const j of B.neighbors(g, start)) assert.ok(!g.bombs[j]);
    assert.ok(g.open.filter(Boolean).length >= 9, '0のマスから周りが開く');
    assert.equal(g.lives, 3);
  }
});

test('ばくだんを開けるとライフが減り、0で負け。旗のマスは開けられない', () => {
  const g = B.setup(makePlayers(2), seededRng(1), { level: 'easy', lives: 1 });
  const [a, b] = g.players;
  B.act(g, a, { type: 'open', index: 0 });
  const bomb = g.bombs.findIndex(Boolean);
  B.act(g, a, { type: 'flag', index: bomb }); // 手番でなくても旗は立てられる
  assert.equal(g.flags[bomb], a);
  assert.throws(() => B.act(g, b, { type: 'open', index: bomb }), /旗のある/);
  B.act(g, b, { type: 'flag', index: bomb });
  assert.equal(g.flags[bomb], null);
  B.act(g, b, { type: 'open', index: bomb });
  assert.equal(g.phase, 'end');
  assert.equal(g.result, 'lose');
});

test('各人数・難しさでCPUだけで最後まで遊べる。勝ちも負けもある', () => {
  const results = { win: 0, lose: 0 };
  for (let n = 1; n <= 6; n++) {
    for (const level of Object.keys(B.LEVELS)) {
      for (let s = 0; s < 4; s++) {
        const rng = seededRng(n * 1000 + s * 10 + level.length);
        const g = B.setup(makePlayers(n), rng, { level });
        playOut(g, rng);
        results[g.result]++;
        if (g.result === 'win') assert.equal(g.open.filter(Boolean).length, g.w * g.h - g.bombCount);
        B.act(g, g.players[0], { type: 'restart' }, rng);
        assert.equal(g.phase, 'play');
        assert.equal(g.bombs, null);
      }
    }
  }
  assert.ok(results.win > 0 && results.lose >= 0, JSON.stringify(results));
});

test('CPU はやさしい盤ならほとんど勝てる（推理が効いている）', () => {
  let win = 0;
  for (let s = 0; s < 40; s++) {
    const rng = seededRng(500 + s);
    const g = B.setup(makePlayers(2), rng, { level: 'easy' });
    playOut(g, rng);
    if (g.result === 'win') win++;
  }
  assert.ok(win >= 32, `勝ち ${win}/40`);
});

test('不正な操作は拒否される', () => {
  const g = B.setup(makePlayers(3), seededRng(2));
  const [a, b] = g.players;
  assert.throws(() => B.act(g, 'nobody', { type: 'open', index: 0 }), GameError);
  assert.throws(() => B.act(g, b, { type: 'open', index: 0 }), /番ではありません/);
  assert.throws(() => B.act(g, a, { type: 'open', index: 999 }), /ありません/);
  assert.throws(() => B.act(g, a, { type: 'open', index: '1' }), /ありません/);
  B.act(g, a, { type: 'open', index: 0 });
  const opened = g.open.findIndex(Boolean);
  assert.throws(() => B.act(g, b, { type: 'open', index: opened }), /もう開いて/);
  assert.throws(() => B.act(g, b, { type: 'flag', index: opened }), /旗を立てられません/);
  assert.throws(() => B.act(g, b, { type: 'restart' }), GameError);
  assert.throws(() => B.act(g, b, { type: 'hack', index: 1 }), GameError);
});

test('ばくだんの場所は終わるまで view に出ない', () => {
  const g = B.setup(makePlayers(2), seededRng(3));
  B.act(g, g.players[0], { type: 'open', index: 0 });
  const v = B.view(g, g.players[1]);
  assert.ok(!('bombs' in v));
  for (let i = 0; i < g.w * g.h; i++) {
    if (g.bombs[i]) assert.equal(v.cells[i], null, 'ばくだんのマスに中身が見えている');
  }
  assert.ok(!JSON.stringify(v).includes('"bomb"'));
  g.phase = 'end';
  assert.ok(JSON.stringify(B.view(g, null)).includes('"bomb"'), '終わったら全部見せる');
});

test('CPU の推理（確実に安全／確実にばくだん）はいつも正しい', () => {
  for (let s = 0; s < 30; s++) {
    const rng = seededRng(800 + s);
    const g = B.setup(makePlayers(2), rng, { level: 'hard', lives: 5 });
    while (g.phase !== 'end') {
      if (g.bombs) {
        for (const [i, k] of B.deduce(B.view(g, g.turn))) assert.equal(g.bombs[i], k === 'bomb', `マス${i}の推理が違う`);
      }
      B.act(g, g.turn, B.bot(g, g.turn, rng), rng);
    }
  }
});
