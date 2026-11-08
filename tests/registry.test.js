// ゲーム一覧（registry）の約束事: 試作ゲームはメインに出さず、試作ページにだけ出す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, MAIN_GAMES, TRIAL_GAMES, findGame } from '../games/registry.js';

test('id が重複しない', () => {
  assert.equal(new Set(GAMES.map(g => g.id)).size, GAMES.length);
});

test('メインと試作に分かれ、漏れも重なりもない', () => {
  assert.ok(MAIN_GAMES.every(g => !g.trial));
  assert.ok(TRIAL_GAMES.every(g => g.trial));
  assert.equal(MAIN_GAMES.length + TRIAL_GAMES.length, GAMES.length);
});

test('試作ゲームには YYYY-MM-DD の addedAt があり、新しい順に並ぶ', () => {
  for (const g of TRIAL_GAMES) assert.match(g.addedAt ?? '', /^\d{4}-\d{2}-\d{2}$/, g.id);
  const dates = TRIAL_GAMES.map(g => g.addedAt);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test('メインのゲームに addedAt が残っていない（昇格のときに消す）', () => {
  for (const g of MAIN_GAMES) assert.equal(g.addedAt, undefined, g.id);
});

test('findGame は試作ゲームも引ける', () => {
  for (const g of GAMES) assert.equal(findGame(g.id), g);
  assert.equal(findGame('no-such-game'), null);
});

test('必須の項目がそろっている', () => {
  for (const g of GAMES) {
    for (const key of ['id', 'name', 'icon', 'mode', 'time', 'summary']) assert.ok(g[key], `${g.id}.${key}`);
    assert.ok(g.minPlayers >= 1 && g.maxPlayers >= g.minPlayers, g.id);
    assert.ok(Array.isArray(g.rules) && g.rules.length, g.id);
    assert.equal(typeof g.logic, 'function');
    assert.equal(typeof g.ui, 'function');
  }
});
