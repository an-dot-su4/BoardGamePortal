import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../games/jinro/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const byRole = (s, role) => s.players.filter(p => s.roles[p] === role);

// 全員の夜の行動をランダムに済ませる
function nightAll(s, rng) {
  for (const p of s.alive.slice()) {
    if (s.phase !== 'night') return;
    const t = J.nightTargets(s, p);
    J.act(s, p, { type: 'night', target: t.length ? t[Math.floor(rng() * t.length)] : null }, rng);
  }
}
function dayAll(s, rng) {
  for (const p of s.alive.slice()) if (s.phase === 'day') J.act(s, p, { type: 'ready' });
  for (const p of s.alive.slice()) {
    if (s.phase !== 'vote') return;
    const others = s.alive.filter(x => x !== p);
    J.act(s, p, { type: 'vote', target: others[Math.floor(rng() * others.length)] });
  }
}

test('役職の配分', () => {
  assert.deepEqual(J.roleList(4).sort(), ['seer', 'villager', 'villager', 'wolf']);
  assert.equal(J.roleList(5).filter(r => r === 'wolf').length, 1);
  assert.equal(J.roleList(6).filter(r => r === 'wolf').length, 2);
  assert.equal(J.roleList(8).length, 8);
});

test('他人の役職は見えない（人狼同士・脱落者・決着後は除く）', () => {
  const s = J.setup(makePlayers(6), seededRng(1));
  const vil = byRole(s, 'villager')[0];
  const v = J.view(s, vil);
  assert.equal(v.roles, null);
  assert.equal(v.myRole, 'villager');
  assert.deepEqual(v.wolfMates, []);
  assert.deepEqual(v.seerResults, []);
  const [w1, w2] = byRole(s, 'wolf');
  assert.deepEqual(J.view(s, w1).wolfMates.map(m => m.id), [w2]);
  // 村人の view に他人の役職名が含まれない
  const json = JSON.stringify(v);
  for (const p of s.players) if (p !== vil) assert.ok(!json.includes(`"${p}":"`), '役職が漏れている');
  assert.equal(J.view(s, null).myRole, null);
});

test('占い・襲撃・護衛', () => {
  const s = J.setup(makePlayers(5), seededRng(2));
  const [seer] = byRole(s, 'seer');
  const [wolf] = byRole(s, 'wolf');
  const [knight] = byRole(s, 'knight');
  const vils = byRole(s, 'villager');
  // 1日目の夜: 人狼は選べない
  assert.throws(() => J.act(s, wolf, { type: 'night', target: vils[0] }), /選べません/);
  assert.throws(() => J.act(s, seer, { type: 'night', target: null }), /選んで/);
  J.act(s, seer, { type: 'night', target: wolf });
  J.act(s, wolf, { type: 'night', target: null });
  J.act(s, knight, { type: 'night', target: vils[0] });
  for (const v of vils) J.act(s, v, { type: 'night', target: null });
  assert.equal(s.phase, 'day');
  assert.deepEqual(J.view(s, seer).seerResults, [{ day: 1, target: wolf, wolf: true }]);
  assert.equal(s.alive.length, 5, '1日目は襲撃なし');
  // 昼: 同票なら処刑なし
  for (const p of s.alive.slice(0, 3)) J.act(s, p, { type: 'ready' });
  assert.equal(s.phase, 'vote');
  const [a, b, c, d, e] = s.alive;
  J.act(s, a, { type: 'vote', target: b });
  J.act(s, b, { type: 'vote', target: a });
  J.act(s, c, { type: 'vote', target: a });
  J.act(s, d, { type: 'vote', target: b });
  J.act(s, e, { type: 'vote', target: c });
  assert.equal(s.lastVote.executed, null);
  assert.equal(s.phase, 'night');
  // 2日目の夜: 騎士が守った相手は死なない
  J.act(s, wolf, { type: 'night', target: vils[0] });
  J.act(s, knight, { type: 'night', target: vils[0] });
  J.act(s, seer, { type: 'night', target: vils[1] });
  for (const v of vils) J.act(s, v, { type: 'night', target: null });
  assert.equal(s.lastNight.victim, null);
  assert.equal(s.alive.length, 5);
});

test('脱落者は操作・チャットできず、夜は全員チャットできない', () => {
  const s = J.setup(makePlayers(4), seededRng(3));
  assert.equal(J.canChat(s, s.players[0]), false, '夜');
  nightAll(s, seededRng(3));
  assert.equal(J.canChat(s, s.players[0]), true, '昼');
  const victim = s.alive.find(p => s.roles[p] !== 'wolf');
  s.alive = s.alive.filter(p => p !== victim);
  assert.equal(J.canChat(s, victim), false);
  assert.throws(() => J.act(s, victim, { type: 'ready' }), /脱落/);
  assert.ok(J.view(s, victim).roles, '脱落者は全員の役職を見られる');
});

test('ランダムに遊んでも必ず決着し、勝敗条件が正しい（4〜8人 × 100試合）', () => {
  for (let n = 4; n <= 8; n++) {
    let villageWins = 0;
    for (let seed = 0; seed < 100; seed++) {
      const rng = seededRng(seed * 31 + n);
      const s = J.setup(makePlayers(n), rng);
      let steps = 0;
      while (s.phase !== 'over') {
        assert.ok(steps++ < 100);
        if (s.phase === 'night') nightAll(s, rng);
        else dayAll(s, rng);
      }
      const wolves = s.alive.filter(p => s.roles[p] === 'wolf').length;
      if (s.winner === 'village') {
        assert.equal(wolves, 0);
        villageWins++;
      } else assert.ok(wolves >= s.alive.length - wolves);
      J.act(s, s.players[0], { type: 'restart' }, rng);
      assert.equal(s.phase, 'night');
      assert.equal(s.alive.length, n);
    }
    // 適当に投票しても、どちらか一方が勝ちすぎない
    assert.ok(villageWins > 5 && villageWins < 95, `${n}人: 村の勝率 ${villageWins}%`);
  }
});
