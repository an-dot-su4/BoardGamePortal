import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../mahjong/lessons.js';
import * as E from '../mahjong/engine.js';
import { parse, toCounts, fromIndex } from '../mahjong/tiles.js';

function play(lesson) {
  const st = E.start(lesson);
  for (let n = 0; n < 200 && st.phase !== 'done' && st.phase !== 'won'; n++) {
    const a = E.solution(lesson, st);
    assert.ok(a, `${lesson.id}: 次の操作がない（phase=${st.phase}）`);
    const r = E.act(lesson, st, a);
    assert.ok(r.ok, `${lesson.id} step ${st.i} ${JSON.stringify(a)}: ${r.text}`);
  }
  return st;
}

test('レッスンの id は重ならない', () => {
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
});

for (const lesson of LESSONS) {
  test(`台本どおりに進めると最後まで行ける: ${lesson.id} ${lesson.title}`, () => {
    if (lesson.hand) assert.equal(parse(lesson.hand).length, 13, 'はじめの手牌は13枚');
    // 出てくる牌が同じ種類4枚を超えない
    const all = [lesson.hand, lesson.myRiver, lesson.dora, lesson.ura, ...Object.values(lesson.rivers ?? {})]
      .filter(Boolean).flatMap(parse);
    for (const s of lesson.steps) for (const k of ['draw', 'rinshan', 'tile', 'newDora']) if (s[k]) all.push(s[k]);
    const c = toCounts(all);
    c.forEach((n, i) => assert.ok(n <= 4, `${fromIndex(i)} が ${n} 枚出てくる`));

    const st = play(lesson);
    if (lesson.expect) {
      assert.equal(st.phase, 'won', '最後はアガる');
      const names = st.result.yaku.map(y => y.name);
      for (const y of lesson.expect.yaku) assert.ok(names.includes(y), `${y} がつかない: ${names.join('・')}`);
    } else {
      assert.equal(st.phase, 'done');
    }
  });
}

test('間違えた操作は理由つきで断り、状態を変えない', () => {
  const b3 = LESSONS.find(l => l.id === 'b3');
  const st = E.start(b3);
  E.act(b3, st, { type: 'next' });
  const before = JSON.stringify(st);
  const r = E.act(b3, st, { type: 'discard', tile: '1m' });
  assert.equal(r.ok, false);
  assert.match(r.text, /切ってみましょう/);
  assert.equal(E.act(b3, st, { type: 'tsumo' }).ok, false);
  assert.equal(E.act(b3, st, { type: 'discard', tile: '9s' }).ok, false, '持っていない牌');
  assert.equal(JSON.stringify(st), before);
});

test('リーチ後はツモ切りしかできない・フリテンはロンできない', () => {
  const b8 = LESSONS.find(l => l.id === 'b8');
  const st = E.start(b8);
  while (st.i < 6) E.act(b8, st, E.solution(b8, st));
  assert.equal(st.riichi, true);
  const r = E.act(b8, st, { type: 'discard', tile: '1m' });
  assert.match(r.text, /リーチしたあと/);

  const b5 = LESSONS.find(l => l.id === 'b5');
  const s5 = E.start(b5);
  E.act(b5, s5, { type: 'next' });
  E.act(b5, s5, { type: 'next' });
  assert.equal(E.available(b5, s5).ron, true, '形はアガリ');
  assert.equal(E.furiten(s5), true);
  assert.match(E.act(b5, s5, { type: 'ron' }).text, /フリテン/);
});

test('チーは上家からだけ', () => {
  const b7 = LESSONS.find(l => l.id === 'b7');
  const st = E.start(b7);
  E.act(b7, st, { type: 'next' });
  E.act(b7, st, { type: 'next' });
  assert.deepEqual(E.available(b7, st).chi, [], '下家の8筒はチーできない');
  assert.match(E.act(b7, st, { type: 'chi' }).text, /上家/);
  E.act(b7, st, { type: 'pass' });
  assert.deepEqual(E.available(b7, st).chi, ['5p']);
});
