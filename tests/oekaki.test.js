import test from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../games/oekaki/logic.js';
import { makePlayers } from './sim-helpers.js';

const line = { strokes: [{ c: 0, w: 3, p: [10, 10, 50, 60] }] };

function submitAll(s, tag) {
  for (const p of s.players) {
    const kind = O.stepKind(s.step);
    O.act(s, p, kind === 'draw' ? { type: 'submit', drawing: line } : { type: 'submit', text: `${tag}-${p}-${s.step}` });
  }
}

test('ステップ数: 最後は必ず「当てる」で終わり、同じ人が同じノートを2回担当しない', () => {
  for (let n = 3; n <= 8; n++) {
    const steps = O.stepCount(n);
    assert.equal(O.stepKind(steps - 1), 'guess', `${n}人`);
    const s = O.setup(makePlayers(n));
    for (let c = 0; c < n; c++) {
      const handlers = [];
      for (let step = 0; step < steps; step++) handlers.push(s.players.find(p => O.chainIndexFor(s, p, step) === c));
      assert.equal(new Set(handlers).size, steps);
      assert.equal(handlers[0], s.chains[c].owner);
    }
  }
});

test('通しで遊ぶと全ノートが文章と絵の交互になる', () => {
  const s = O.setup(makePlayers(5));
  while (s.phase === 'play') submitAll(s, 'x');
  assert.equal(s.phase, 'reveal');
  for (const chain of s.chains) {
    assert.equal(chain.entries.length, 5);
    chain.entries.forEach((e, i) => assert.equal(e.kind, O.stepKind(i)));
    assert.equal(new Set(chain.entries.map(e => e.by)).size, 5);
  }
  O.act(s, 'p0', { type: 'reveal', to: 3 });
  assert.equal(O.view(s, 'p1').revealed, 3);
  O.act(s, 'p2', { type: 'restart' });
  assert.equal(s.phase, 'play');
  assert.equal(s.step, 0);
});

test('自分が担当するノートの、ひとつ前だけが見える', () => {
  const s = O.setup(makePlayers(4));
  submitAll(s, 'secret');
  const v = O.view(s, 'p1');
  assert.equal(v.kind, 'draw');
  assert.equal(v.prompt.text, `secret-p0-0`, '左隣のお題を描く');
  const json = JSON.stringify(v);
  for (const p of ['p2', 'p3', 'p1']) assert.ok(!json.includes(`secret-${p}-0`), `${p} のお題が漏れている`);
  assert.equal(O.view(s, null).prompt, null);
});

test('出し直しと取り消し', () => {
  const s = O.setup(makePlayers(3));
  O.act(s, 'p0', { type: 'submit', text: 'a' });
  O.act(s, 'p0', { type: 'submit', text: 'b' });
  assert.equal(O.view(s, 'p0').mine.text, 'b');
  O.act(s, 'p0', { type: 'unsubmit' });
  assert.equal(O.view(s, 'p0').mine, null);
  assert.equal(s.step, 0);
});

test('不正な入力は拒否される', () => {
  const s = O.setup(makePlayers(3));
  assert.throws(() => O.act(s, 'p0', { type: 'submit', text: '   ' }), /入力/);
  assert.throws(() => O.act(s, 'x', { type: 'submit', text: 'a' }), /観戦中/);
  submitAll(s, 'y');
  assert.throws(() => O.act(s, 'p0', { type: 'submit', drawing: { strokes: [{ c: 99, w: 3, p: [0, 0, 1, 1] }] } }), /色/);
  assert.throws(() => O.act(s, 'p0', { type: 'submit', drawing: { strokes: [{ c: 0, w: 5, p: [0, 0, 1, 1] }] } }), /太さ/);
  assert.throws(() => O.act(s, 'p0', { type: 'submit', drawing: { strokes: [{ c: 0, w: 3, p: [0, 0, 1] }] } }), /線/);
  assert.throws(() => O.act(s, 'p0', { type: 'submit', drawing: 'evil' }), /絵/);
  const huge = { strokes: [{ c: 0, w: 3, p: Array.from({ length: 10000 }, (_, i) => i % 200) }] };
  assert.throws(() => O.act(s, 'p0', { type: 'submit', drawing: huge }), /細かすぎ/);
  // 範囲外の座標は丸められる
  O.act(s, 'p0', { type: 'submit', drawing: { strokes: [{ c: 1, w: 7, p: [-50, 9999, 10.4, 20.6] }] } });
  assert.deepEqual(s.submitted.p0.drawing.strokes[0].p, [0, O.CANVAS_H, 10, 21]);
  assert.throws(() => O.act(s, 'p0', { type: 'submit', text: 'テキスト' }), /絵/);
});
