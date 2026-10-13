import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../games/hoshi/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

function readyAll(s) {
  for (const p of s.players) if (s.phase === 'ready') H.act(s, p, { type: 'ready' });
}

test('全員が集中するまで出せない。小さい順なら成功', () => {
  const s = H.setup(makePlayers(3), seededRng(1));
  const [a] = s.players;
  assert.throws(() => H.act(s, a, { type: 'play' }), /集中/);
  readyAll(s);
  assert.equal(s.phase, 'play');
  // 正しい順に出す
  const order = s.players.map(p => [s.hands[p][0], p]).sort((x, y) => x[0] - y[0]);
  for (const [, p] of order) H.act(s, p, { type: 'play' });
  assert.equal(s.level, 2, 'レベル1クリア');
  assert.equal(s.phase, 'ready');
  assert.equal(s.stars, 1, 'レベル1のクリアではごほうびなし');
});

test('順番を間違えるとライフが減り、小さい星は捨てられる', () => {
  const s = H.setup(makePlayers(2), seededRng(2));
  const [a, b] = s.players;
  s.hands[a] = [50];
  s.hands[b] = [10, 60];
  readyAll(s);
  H.act(s, a, { type: 'play' });
  assert.equal(s.lives, 1);
  assert.deepEqual(s.hands[b], [60]);
  assert.deepEqual(s.lastEvent.dropped, [{ card: 10, by: b }]);
  assert.equal(s.phase, 'ready', '失敗したら集中し直す');
  readyAll(s);
  H.act(s, b, { type: 'play' });
  assert.equal(s.level, 2);
});

test('流れ星は全員の賛成で発動', () => {
  const s = H.setup(makePlayers(3), seededRng(3));
  readyAll(s);
  const [a, b, c] = s.players;
  H.act(s, a, { type: 'star' });
  H.act(s, b, { type: 'star' });
  assert.equal(s.stars, 1);
  H.act(s, c, { type: 'star' });
  assert.equal(s.stars, 0);
  assert.equal(s.lastEvent.kind, 'star');
  assert.throws(() => H.act(s, a, { type: 'star' }), /ありません/);
});

test('他人の手札は見えない・二重タップは拒否', () => {
  const s = H.setup(makePlayers(4), seededRng(4));
  s.level = 3;
  s.hands = { p0: [1, 2], p1: [3, 4], p2: [5, 6], p3: [7, 8] };
  const v = H.view(s, 'p0');
  assert.deepEqual(v.hand, [1, 2]);
  assert.ok(!JSON.stringify(v.players).includes('[3'));
  readyAll(s);
  H.act(s, 'p0', { type: 'play', card: 1 });
  assert.throws(() => H.act(s, 'p0', { type: 'play', card: 1 }), /もう出て/);
});

// 「タイミングがときどきずれる」チームを再現して、どの人数でも必ず決着することと難易度を見る
function simulate(n, seed, slip) {
  const rng = seededRng(seed);
  const s = H.setup(makePlayers(n), rng);
  let steps = 0;
  while (s.phase !== 'won' && s.phase !== 'lost') {
    assert.ok(steps++ < 5000);
    if (s.phase === 'ready') {
      readyAll(s);
      continue;
    }
    const holders = s.players.filter(p => s.hands[p].length);
    holders.sort((x, y) => s.hands[x][0] - s.hands[y][0]);
    // 近い数字を持つ人がいると、slip の確率で2番目の人が先に出してしまう
    let who = holders[0];
    if (holders.length > 1 && s.hands[holders[1]][0] - s.hands[holders[0]][0] < 4 && rng() < slip) who = holders[1];
    H.act(s, who, { type: 'play' }, rng);
  }
  return s.phase === 'won';
}

test('どの人数でも決着し、上手なほど勝ちやすい', () => {
  for (let n = 2; n <= 6; n++) {
    let good = 0;
    let rough = 0;
    for (let i = 0; i < 300; i++) {
      if (simulate(n, i, 0.2)) good++;
      if (simulate(n, 1000 + i, 0.6)) rough++;
    }
    console.log(`  ${n}人: 息が合うチーム ${Math.round(good / 3)}% / ずれがちなチーム ${Math.round(rough / 3)}%`);
    assert.ok(good > rough + 30, `${n}人: ${good} vs ${rough}`);
    assert.ok(good > 60 && good < 285, `${n}人: 息が合うチームの勝率 ${good / 3}%`);
  }
});
