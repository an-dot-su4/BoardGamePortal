import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../games/arashi/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

// 何も考えない戦略: 合う種類の最大カードを出す
function naiveMove(s, p) {
  const t = s.legs[s.leg - 1].type;
  const card = s.hands[p].filter(c => t === 'any' || c.type === t).sort((a, b) => b.v - a.v)[0];
  return card ? card.id : null;
}

// 連携できている戦略: 必要値に届くまで強い順に出し、余計なカードは温存
function teamPlan(s) {
  const leg = s.legs[s.leg - 1];
  const best = s.players
    .map(p => s.hands[p].map(c => ({ p, c, v: A.cardValue(c, leg.type) })).sort((a, b) => b.v - a.v)[0])
    .filter(Boolean)
    .sort((a, b) => b.v - a.v);
  const plan = {};
  let total = 0;
  for (const o of best) {
    if (total >= leg.need) break;
    plan[o.p] = o.c.id;
    total += o.v;
  }
  return plan;
}

function play(n, seed, strategy) {
  const s = A.setup(makePlayers(n), seededRng(seed));
  while (s.phase === 'play') {
    const plan = strategy === 'team' ? teamPlan(s) : null;
    for (const p of s.players) {
      A.act(s, p, { type: 'commit', card: plan ? (plan[p] ?? null) : naiveMove(s, p) });
    }
  }
  return s;
}

test('全員が出すと公開され、次の航路へ進む', () => {
  const s = A.setup(makePlayers(3), seededRng(1));
  const [a, b, c] = s.players;
  const card = s.hands[a][0];
  A.act(s, a, { type: 'commit', card: card.id });
  A.act(s, b, { type: 'commit', card: null });
  assert.equal(A.view(s, c).players.find(p => p.id === a).decided, true);
  assert.ok(!JSON.stringify(A.view(s, c)).includes(card.id), '公開前に他人の出したカードは見えない');
  A.act(s, c, { type: 'commit', card: null });
  assert.equal(s.leg, 2);
  assert.equal(s.lastResult.reveal.find(r => r.pid === a).card.id, card.id);
  assert.ok(!s.hands[a].some(x => x.id === card.id));
});

test('不正な操作は拒否される', () => {
  const s = A.setup(makePlayers(2), seededRng(2));
  assert.throws(() => A.act(s, 'p0', { type: 'commit', card: 'nope' }), /手札にない/);
  assert.throws(() => A.act(s, 'x', { type: 'commit', card: null }), /観戦中/);
  assert.throws(() => A.act(s, 'p0', { type: 'signal', signal: 'evil' }), /スタンプ/);
});

test('どの人数でも必ず決着する', () => {
  for (let n = 2; n <= 6; n++) {
    for (let seed = 0; seed < 200; seed++) {
      const s = play(n, seed, 'naive');
      assert.ok(s.phase === 'won' || s.phase === 'lost');
    }
  }
});

test('難易度: 連携すると勝ちやすく、適当だと負けやすい', () => {
  const N = 600;
  for (let n = 2; n <= 6; n++) {
    let naive = 0;
    let team = 0;
    for (let i = 0; i < N; i++) {
      if (play(n, i, 'naive').phase === 'won') naive++;
      if (play(n, 100000 + i, 'team').phase === 'won') team++;
    }
    const nRate = naive / N;
    const tRate = team / N;
    assert.ok(tRate > nRate + 0.15, `${n}人: 連携の効果が小さい (${nRate}, ${tRate})`);
    assert.ok(tRate >= 0.45 && tRate <= 0.85, `${n}人: 連携時の勝率 ${tRate}`);
    assert.ok(nRate <= 0.5, `${n}人: 適当でも勝ててしまう ${nRate}`);
  }
});
