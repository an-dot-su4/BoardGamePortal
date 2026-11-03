// 疾走グリコのテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../games/glico/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const fixed = values => {
  // rng を順番に返す（faces[Math.floor(r * len)] で目を決めるので、面の位置 i は (i + 0.5) / len）
  let i = 0;
  return () => values[i++ % values.length];
};
const face = (i, len = 3) => (i + 0.5) / len;

function fresh() {
  const g = G.setup(makePlayers(2), seededRng(1));
  g.events = [];
  return { g, a: g.players[0], b: g.players[1] };
}

test('2人以外では始められない', () => {
  assert.throws(() => G.setup(makePlayers(3), seededRng(1)), /2人/);
});

test('サイコロ: 手ごとの面と個数', () => {
  const r = seededRng(3);
  for (let i = 0; i < 200; i++) {
    const rock = G.roll('rock', { perm: null, inst: null }, r);
    assert.equal(rock.dice.length, 6);
    assert.ok(rock.dice.every(d => [1, 2, 3].includes(d)));
    const sc = G.roll('scissors', { perm: null, inst: null }, r);
    assert.equal(sc.dice.length, 3);
    assert.ok(sc.dice.every(d => [2, 4, 5].includes(d)));
    const pa = G.roll('paper', { perm: null, inst: null }, r);
    assert.equal(pa.dice.length, 1);
    assert.ok([8, 9, 10].includes(pa.total));
  }
});

test('永続スキル: おまけ付きグー・板チョコ追加・パイナツプル大盛り（対応する手のときだけ）', () => {
  const r = seededRng(5);
  for (let i = 0; i < 100; i++) assert.ok(G.roll('rock', { perm: 'omake', inst: null }, r).dice.every(d => d >= 2));
  assert.equal(G.roll('scissors', { perm: 'itachoco', inst: null }, r).dice.length, 4);
  const pa = G.roll('paper', { perm: 'pine', inst: null }, fixed([face(0)]));
  assert.equal(pa.total, 10);
  const other = G.roll('paper', { perm: 'omake', inst: null }, fixed([face(0)]));
  assert.equal(other.usedPerm, null, '別の手のスキルは発動しない');
});

test('瞬間スキル: 追い風・はぐれ目倍増・大股ジャンプ', () => {
  const oi = G.roll('scissors', { perm: null, inst: { id: 'oikaze', left: 2 } }, fixed([face(0), face(1), face(2)]));
  assert.deepEqual(oi.final, [3, 5, 6]);
  assert.equal(oi.total, 14);
  // 1,1,1,2,2,3 → 3 を×2
  const hg = G.roll('rock', { perm: null, inst: { id: 'hagure', left: 2 } }, fixed([face(0), face(0), face(0), face(1), face(1), face(2)]));
  assert.deepEqual(hg.final, [1, 1, 1, 2, 2, 6]);
  assert.equal(hg.usedInst, 'hagure');
  // 1,1,1,1,2,3 → ペアが無いので発動しない
  const no = G.roll('rock', { perm: null, inst: { id: 'hagure', left: 2 } }, fixed([face(0), face(0), face(0), face(0), face(1), face(2)]));
  assert.equal(no.usedInst, null);
  assert.equal(no.total, 9);
  // パーは1個なので発動しない
  assert.equal(G.roll('paper', { perm: null, inst: { id: 'hagure', left: 2 } }, fixed([face(0)])).usedInst, null);
  // 大股: 最大の目 9 → +5
  const om = G.roll('paper', { perm: null, inst: { id: 'oomata', left: 2 } }, fixed([face(1)]));
  assert.equal(om.total, 9 + 5);
  // 永続と瞬間が両方発動: パイナツプル(+2) → 追い風(+1)
  const both = G.roll('paper', { perm: 'pine', inst: { id: 'oikaze', left: 2 } }, fixed([face(2)]));
  assert.equal(both.total, 13);
  assert.equal(both.mods.length, 2);
});

test('じゃんけん: 勝った人だけ進む。あいこは数えない', () => {
  const { g, a, b } = fresh();
  G.act(g, a, { type: 'hand', hand: 'rock' }, seededRng(1));
  assert.equal(g.seq, 0, '片方だけでは公開しない');
  G.act(g, b, { type: 'hand', hand: 'rock' }, seededRng(1));
  assert.equal(g.seq, 1);
  assert.ok(g.last.draw);
  assert.equal(g.rounds, 0);
  G.act(g, a, { type: 'hand', hand: 'paper' }, seededRng(1));
  G.act(g, b, { type: 'hand', hand: 'rock' }, seededRng(1));
  assert.equal(g.last.winner, a);
  assert.ok(g.pos[a] >= 8 && g.pos[a] <= 10);
  assert.equal(g.pos[b], 0);
  assert.equal(g.rounds, 1);
});

test('瞬間スキルは勝敗のついた2回で消え、あいこでは減らない。勝てば発動して消える', () => {
  const { g, a, b } = fresh();
  g.slots[b].inst = { id: 'oikaze', left: 2 };
  const round = (ha, hb) => {
    G.act(g, a, { type: 'hand', hand: ha }, seededRng(2));
    G.act(g, b, { type: 'hand', hand: hb }, seededRng(2));
  };
  round('rock', 'rock');
  assert.equal(g.slots[b].inst.left, 2);
  round('paper', 'rock');
  assert.equal(g.slots[b].inst.left, 1);
  round('paper', 'rock');
  assert.equal(g.slots[b].inst, null, '2回負けて消えた');
  assert.equal(g.last.expired[0].skill, 'oikaze');
  g.slots[b].inst = { id: 'oikaze', left: 2 };
  round('scissors', 'rock');
  assert.equal(g.slots[b].inst, null);
  assert.ok(g.last.mods.some(m => m.includes('追い風')));
});

test('イベントマスに止まるとスキルを得る。同じ種類は上書き', () => {
  const { g, a, b } = fresh();
  g.events = [8, 9, 10];
  g.slots[a].perm = 'itachoco';
  G.act(g, a, { type: 'hand', hand: 'paper' }, seededRng(1));
  G.act(g, b, { type: 'hand', hand: 'rock' }, seededRng(1));
  const got = g.last.gained;
  assert.ok(got);
  if (G.SKILLS[got].kind === 'perm') assert.equal(g.slots[a].perm, got);
  else {
    assert.equal(g.slots[a].inst.id, got);
    assert.equal(g.slots[a].inst.left, G.INST_TURNS);
    assert.equal(g.slots[a].perm, 'itachoco', '別の種類はそのまま');
  }
});

test('ゴールは超えてもよい', () => {
  const { g, a, b } = fresh();
  g.pos[a] = g.goal - 1;
  G.act(g, a, { type: 'hand', hand: 'paper' }, seededRng(1));
  G.act(g, b, { type: 'hand', hand: 'rock' }, seededRng(1));
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, a);
  assert.equal(g.pos[a], g.goal);
  assert.throws(() => G.act(g, a, { type: 'hand', hand: 'rock' }), /終わり/);
  G.act(g, a, { type: 'restart' }, seededRng(1));
  assert.equal(g.phase, 'play');
  assert.equal(g.pos[a], 0);
});

test('相手の手は公開まで見えない。不正な操作は拒否', () => {
  const { g, a, b } = fresh();
  G.act(g, a, { type: 'hand', hand: 'scissors' });
  const vb = G.view(g, b);
  assert.ok(!JSON.stringify(vb).includes('scissors'), '相手の手が漏れている');
  assert.equal(vb.players.find(p => p.id === a).ready, true);
  assert.equal(G.view(g, a).myHand, 'scissors');
  assert.throws(() => G.act(g, 'nobody', { type: 'hand', hand: 'rock' }), /観戦/);
  assert.throws(() => G.act(g, a, { type: 'hand', hand: 'lizard' }), /グー/);
  assert.throws(() => G.act(g, a, { type: 'jump' }), /不明/);
});

test('ロビーの設定: ゴールのマス数', () => {
  assert.equal(G.normalizeOptions({ goal: 50 }).goal, 50);
  assert.equal(G.normalizeOptions({ goal: 77 }).goal, 100);
  const g = G.setup(makePlayers(2), seededRng(1), { goal: 150 });
  assert.equal(g.goal, 150);
  assert.ok(g.events.every(p => p > 0 && p < 150));
  for (let i = 1; i < g.events.length; i++) assert.ok(g.events[i] - g.events[i - 1] >= 2 && g.events[i] - g.events[i - 1] <= 4);
});

test('CPU 同士で何百試合しても必ず終わる', () => {
  let rounds = 0;
  for (let s = 0; s < 300; s++) {
    const r = seededRng(100 + s);
    const g = G.setup(makePlayers(2), r, { goal: G.GOALS[s % 3] });
    let steps = 0;
    while (g.phase === 'play') {
      assert.ok(steps++ < 5000, '終わらない');
      for (const p of g.players) {
        const act = G.bot(g, p, r);
        if (act) G.act(g, p, act, r);
      }
    }
    assert.ok(g.winner);
    rounds += g.rounds;
  }
  assert.ok(rounds / 300 > 3);
});

test('CPUの強さの設定: 既定は弱い', () => {
  assert.equal(G.normalizeOptions({}).cpu, 'weak');
  assert.equal(G.normalizeOptions({ cpu: 'strong' }).cpu, 'strong');
  assert.equal(G.normalizeOptions({ cpu: 'god' }).cpu, 'weak');
  const g = G.setup(makePlayers(2), seededRng(1), { cpu: 'strong' });
  assert.equal(g.cpu, 'strong');
  g.phase = 'over';
  G.act(g, g.players[0], { type: 'restart' }, seededRng(1));
  assert.equal(g.cpu, 'strong', 'もう一度遊んでも設定が残る');
});

test('勝ったときの平均の進み（全ての出目を数え上げ）', () => {
  const none = { perm: null, inst: null };
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} ≠ ${b}`);
  near(G.expectedAdvance('rock', none).mean, 12);
  near(G.expectedAdvance('scissors', none).mean, 11);
  near(G.expectedAdvance('paper', none).mean, 9);
  near(G.expectedAdvance('scissors', { perm: null, inst: { id: 'hagure' } }).mean, 11 + 2.444);
  near(G.expectedAdvance('rock', { perm: 'omake', inst: { id: 'hagure' } }).mean, 14); // おまけ付きグーだと、はぐれ目倍増は発動しない
  near(G.expectedAdvance('paper', { perm: 'pine', inst: { id: 'oomata' } }).mean, 11 + 5.667);
  assert.equal(G.expectedAdvance('rock', none).min, 6);
});

test('強いCPU: 相手のスキルを読んで迎え撃つ', () => {
  const g = G.setup(makePlayers(2), seededRng(1), { cpu: 'strong' });
  const [a, b] = g.players;
  const base = G.strongWeights(g, a);
  g.slots[b].inst = { id: 'oikaze', left: 2 }; // 相手はグーが強い
  assert.ok(G.strongWeights(g, a).paper > base.paper + 0.1, 'パーが増える');
  g.slots[b].inst = null;
  g.slots[a].perm = 'itachoco';
  assert.ok(G.strongWeights(g, a).scissors > base.scissors, '自分の板チョコでチョキが増える');
  // 相手がずっとパーを出していれば、チョキで読む
  g.slots[a].perm = null;
  g.history[b] = Array(10).fill('paper');
  assert.ok(G.strongWeights(g, a).scissors > 0.5);
});

test('強いCPU: 弱いCPUと同じ手ばかり出す人に勝ち越す', () => {
  const play = (pick, N = 600) => {
    let w = 0;
    for (let s = 0; s < N; s++) {
      const r = seededRng(700 + s);
      const g = G.setup(makePlayers(2), r, { cpu: 'strong' });
      const [a, b] = g.players;
      while (g.phase === 'play') {
        G.act(g, a, G.bot(g, a, r), r);
        if (g.phase === 'play') G.act(g, b, { type: 'hand', hand: pick(g, b, r) }, r);
      }
      if (g.winner === a) w++;
    }
    return w / N;
  };
  const weak = (g, p, r) => G.bot({ ...g, cpu: 'weak' }, p, r).hand;
  assert.ok(play(weak) > 0.53, '弱いCPUに勝ち越す');
  for (const h of ['rock', 'scissors', 'paper']) assert.ok(play(() => h, 300) > 0.8, `いつも${h}の人に負けない`);
});
