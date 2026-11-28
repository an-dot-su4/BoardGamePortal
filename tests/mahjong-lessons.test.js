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

const NEXT = { me: 'shimo', shimo: 'toimen', toimen: 'kami', kami: 'me' };

for (const lesson of LESSONS) {
  test(`手番の順（自分→下家→対面→上家）を守る: ${lesson.id}`, () => {
    const steps = E.expand(lesson);
    let prev = null;
    for (const s of steps) {
      const who = s.draw ? 'me' : s.from ?? null;
      if (!who) continue; // 説明と嶺上牌
      if (prev) {
        const expectNext = prev.call && prev.call !== 'ron' ? 'shimo' : NEXT[prev.from ?? 'me'];
        assert.equal(who, expectNext, `${prev.from ?? '自分'} の次が ${who}`);
      }
      prev = s;
    }
    // 自動の捨て牌で、ロン・ポン・チーできる牌や5枚目の牌を出さない
    const st = E.start(lesson);
    for (let n = 0; n < 200 && st.phase !== 'done' && st.phase !== 'won'; n++) {
      const before = st.steps.slice(0, st.i);
      E.act(lesson, st, E.solution(lesson, st));
      void before;
    }
    const all = [lesson.hand, lesson.myRiver, lesson.dora, lesson.ura, ...Object.values(lesson.rivers ?? {})].filter(Boolean).flatMap(parse);
    for (const s of lesson.steps) for (const k of ['draw', 'rinshan', 'tile', 'newDora']) if (s[k]) all.push(s[k]);
    all.push(...st.autoUsed);
    toCounts(all).forEach((n, i) => assert.ok(n <= 4, `${fromIndex(i)} が ${n} 枚`));
  });
}

test('2巡するレッスンでは、間に他の3人が捨てている', () => {
  const b3 = LESSONS.find(l => l.id === 'b3');
  const st = E.start(b3);
  while (st.phase !== 'won') E.act(b3, st, E.solution(b3, st));
  assert.equal(st.river.length, 2, '自分は2回捨てた');
  for (const k of ['shimo', 'toimen', 'kami']) assert.equal(st.rivers[k].length, 2, `${k} も2回捨てた`);
});

test('自動の捨て牌ではロン・ポン・チーのボタンが出ない（そのまま次へ進む）', () => {
  for (const lesson of LESSONS) {
    const st = E.start(lesson);
    while (st.phase !== 'done' && st.phase !== 'won') {
      assert.ok(!E.step(lesson, st)?.auto, '自動の番で止まらない');
      E.act(lesson, st, E.solution(lesson, st));
    }
  }
});
