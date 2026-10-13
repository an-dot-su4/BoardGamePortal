import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../games/wordwolf/logic.js';
import { WORD_PAIRS } from '../games/wordwolf/words.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

test('お題は1人だけ違い、view には自分のお題しか出ない', () => {
  const s = W.setup(makePlayers(5), seededRng(1));
  const words = s.players.map(p => W.view(s, p).myWord);
  assert.equal(words.filter(w => w === s.minority).length, 1);
  assert.equal(W.view(s, s.wolf).myWord, s.minority);
  const villager = s.players.find(p => p !== s.wolf);
  const json = JSON.stringify(W.view(s, villager));
  assert.ok(!json.includes(s.minority), '村人に少数派のお題が見えている');
  assert.equal(W.view(s, villager).reveal, null);
  assert.equal(W.view(s, null).myWord, null);
});

test('過半数が準備完了で投票へ、人狼が単独最多なら答えのチャンス', () => {
  const s = W.setup(makePlayers(4), seededRng(2));
  const [a, b, c] = s.players;
  W.act(s, a, { type: 'ready' });
  W.act(s, b, { type: 'ready' });
  assert.equal(s.phase, 'talk');
  W.act(s, c, { type: 'ready' });
  assert.equal(s.phase, 'vote');
  for (const p of s.players) {
    const target = p === s.wolf ? s.players.find(x => x !== p) : s.wolf;
    W.act(s, p, { type: 'vote', target });
  }
  assert.equal(s.phase, 'guess');
  assert.throws(() => W.act(s, s.players.find(p => p !== s.wolf), { type: 'guess', text: 'x' }), /人狼だけ/);
  // カタカナ・ひらがなの違いは許す
  W.act(s, s.wolf, { type: 'guess', text: ` ${s.majority.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))} ` });
  assert.equal(s.winner, 'wolf');
  assert.equal(s.scores[s.wolf], 2);
});

test('同票なら人狼の勝ち、投票の不正は拒否', () => {
  const s = W.setup(makePlayers(4), seededRng(3));
  s.phase = 'vote';
  const [a, b, c, d] = s.players;
  assert.throws(() => W.act(s, a, { type: 'vote', target: a }), /投票先/);
  assert.throws(() => W.act(s, a, { type: 'vote', target: 'zzz' }), /投票先/);
  W.act(s, a, { type: 'vote', target: b });
  W.act(s, b, { type: 'vote', target: a });
  W.act(s, c, { type: 'vote', target: a });
  W.act(s, d, { type: 'vote', target: b });
  assert.equal(s.winner, 'wolf');
  assert.equal(W.view(s, a).reveal.wolf, s.wolf, '結果画面では全員に公開');
});

test('何回戦でも続けられ、お題が一巡しても壊れない', () => {
  const rng = seededRng(4);
  const s = W.setup(makePlayers(6), rng);
  for (let r = 0; r < WORD_PAIRS.length + 5; r++) {
    for (const p of s.players.slice(0, 4)) W.act(s, p, { type: 'ready' });
    for (const p of s.players) {
      const others = s.players.filter(x => x !== p);
      W.act(s, p, { type: 'vote', target: others[Math.floor(rng() * others.length)] });
    }
    if (s.phase === 'guess') W.act(s, s.wolf, { type: 'guess', text: 'はずれ' });
    assert.equal(s.phase, 'result');
    W.act(s, s.players[0], { type: 'next' }, rng);
  }
  assert.ok(WORD_PAIRS.every(([x, y]) => x !== y));
});

test('normalizeWord', () => {
  assert.equal(W.normalizeWord('リンゴ'), W.normalizeWord('りんご'));
  assert.equal(W.normalizeWord('ｺｰﾋｰ'), W.normalizeWord('こーひー'));
});
