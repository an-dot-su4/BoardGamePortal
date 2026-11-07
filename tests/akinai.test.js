// あきない通りのテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../games/akinai/logic.js';
import { GameError, seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const rng = (s = 3) => seededRng(s);
const fresh = (n = 2, opts = {}) => A.setup(makePlayers(n), rng(), opts);
// サイコロの目を決めた乱数（最初の1回だけ n が出る）
const die = n => () => (n - 1) / 6 + 0.01;
const throwsGame = (f, re) => assert.throws(f, e => e instanceof GameError && (!re || re.test(e.message)));

test('盤: 28マス・店20軒・四季のマス4つ・福引き盤36枚', () => {
  assert.equal(A.N, 28);
  assert.equal(A.SHOP_IDS.length, 20);
  assert.deepEqual(A.SQUARES.filter(s => s.k === 'season').map(s => s.mark), A.MARKS);
  assert.equal(Object.values(A.CARDS).reduce((a, c) => a + c.n, 0), A.FUKU_SIZE ** 2);
  assert.equal(A.LINES.length, 14);
  const seen = new Set(A.SQUARES.map((_, i) => JSON.stringify(A.squarePos(i))));
  assert.equal(seen.size, 28, '外周のマスが重ならない');
});

test('人数とオプション', () => {
  throwsGame(() => A.setup(makePlayers(1), rng()), /2〜4人/);
  throwsGame(() => A.setup(makePlayers(5), rng()), /2〜4人/);
  assert.deepEqual(A.normalizeOptions({ goal: 999, rounds: 'x', board: 'x' }), { goal: 4000, rounds: 30, board: 'ring' });
  assert.deepEqual(A.normalizeOptions({ goal: 6000, rounds: 20, board: 'eight' }), { goal: 6000, rounds: 20, board: 'eight' });
  assert.match(A.validateOptions({}, 5), /2〜4人/);
  assert.equal(A.validateOptions({}, 3), null);
  const g = fresh(3);
  assert.deepEqual(g.players.map(p => g.cash[p]), [1500, 1650, 1800], '後の番ほど最初のお金が多い');
});

test('不正な操作は GameError', () => {
  const g = fresh(2);
  const [a, b] = g.players;
  throwsGame(() => A.act(g, 'nobody', { type: 'roll' }), /観戦/);
  throwsGame(() => A.act(g, b, { type: 'roll' }), /手番/);
  throwsGame(() => A.act(g, a, { type: 'buy' }), /今は/);
  throwsGame(() => A.act(g, a, { type: 'end' }), /今は/);
  throwsGame(() => A.act(g, a, { type: 'pick', cell: 0 }), /福引き/);
  throwsGame(() => A.act(g, a, { type: 'sellStock', area: 'A', n: 1 }), /持っていません/);
  throwsGame(() => A.act(g, a, { type: 'sellStock', area: 'Z', n: 1 }), /町/);
  throwsGame(() => A.act(g, a, { type: 'sellShop', at: 1 }), /借金/);
  throwsGame(() => A.act(g, a, { type: 'hack' }), /今は/);
  throwsGame(() => A.act(g, a, { type: 'restart' }), /ゲーム中/);
  // 1 が出て 団子横丁の1軒目（空き店）へ
  A.act(g, a, { type: 'roll' }, die(1));
  assert.equal(g.phase, 'action');
  assert.equal(g.turn.buyable, 1);
  throwsGame(() => A.act(g, a, { type: 'roll' }), /振れません/);
  throwsGame(() => A.act(g, a, { type: 'invest', at: 1, amount: 10 }), /増資できません/);
  throwsGame(() => A.act(g, a, { type: 'buyStock', area: 'A', n: 1 }), /銀行/);
  g.cash[a] = 10;
  throwsGame(() => A.act(g, a, { type: 'buy' }), /お金/);
  g.cash[a] = 1500;
  A.act(g, a, { type: 'buy' });
  throwsGame(() => A.act(g, a, { type: 'buy' }), /買える店/);
  A.act(g, a, { type: 'end' });
  assert.equal(g.turn.p, b);
});

test('買物料: 同じ町の店の数で率が上がる。株主には配当', () => {
  const g = fresh(2);
  const [a, b] = g.players;
  const areaA = A.SHOP_IDS.filter(i => A.SQUARES[i].area === 'A');
  g.shops[areaA[0]] = { owner: a, value: 100 };
  assert.equal(A.feeOf(g, areaA[0]), 25);
  g.shops[areaA[1]] = { owner: a, value: 100 };
  assert.equal(A.feeOf(g, areaA[0]), 40);
  for (const i of areaA) g.shops[i] = { owner: a, value: 100 };
  assert.equal(A.feeOf(g, areaA[0]), 100);
  assert.equal(A.capOf(g, areaA[0]), A.SQUARES[areaA[0]].base * 6);
  // b が止まって払う。b 以外の株主（a）に配当
  g.stocks[a].A = 50;
  g.turn = { p: b, roll: null, buyable: null, investArea: null, stock: false, again: false, stockBought: false };
  const before = { a: g.cash[a], b: g.cash[b] };
  A.act(g, b, { type: 'roll' }, die(1));
  assert.equal(g.cash[b], before.b - 100);
  assert.equal(g.cash[a], before.a + 100 + Math.floor((100 * 50) / A.DIV_PER));
});

test('増資: 自分の店に止まったらその町、銀行ではどこでも。上限あり', () => {
  const g = fresh(2);
  const [a, b] = g.players;
  g.shops[1] = { owner: a, value: 80 };
  g.shops[8] = { owner: a, value: 120 };
  g.shops[2] = { owner: b, value: 100 };
  A.act(g, a, { type: 'roll' }, die(1));
  assert.equal(g.turn.investArea, 'A');
  throwsGame(() => A.act(g, a, { type: 'invest', at: 8, amount: 10 }), /団子横丁/);
  throwsGame(() => A.act(g, a, { type: 'invest', at: 2, amount: 10 }), /自分の店/);
  throwsGame(() => A.act(g, a, { type: 'invest', at: 1, amount: 100 }), /あと 80G/);
  throwsGame(() => A.act(g, a, { type: 'invest', at: 1, amount: 1.5 }), /金額/);
  A.act(g, a, { type: 'invest', at: 1, amount: 80 });
  assert.equal(g.shops[1].value, 160);
  throwsGame(() => A.act(g, a, { type: 'invest', at: 1, amount: 1 }), /上限/);
});

test('店を買って2軒目になると、町の評判で価値が上がる', () => {
  const g = fresh(2);
  const [a] = g.players;
  g.shops[1] = { owner: a, value: 80 };
  g.pos[a] = 1;
  A.act(g, a, { type: 'roll' }, die(1)); // 2: 駄菓子屋
  A.act(g, a, { type: 'buy' });
  assert.equal(g.shops[2].value, 100 + 20);
  assert.equal(g.shops[1].value, 80 + 16);
});

test('四季のマーク: 通ると集まり、4つで銀行に戻ると給料と段位。株も買える', () => {
  const g = fresh(2);
  const [a] = g.players;
  g.marks[a] = ['spring', 'summer', 'autumn'];
  g.pos[a] = 22;
  const cash = g.cash[a];
  // 22 → 24（冬・ぴったり）は福引きになるので、通過させる: 6 で 28 = 0（銀行）
  A.act(g, a, { type: 'roll' }, die(6));
  assert.equal(g.pos[a], 0);
  assert.equal(g.level[a], 2);
  assert.deepEqual(g.marks[a], []);
  assert.equal(g.cash[a], cash + 400 + 150);
  assert.equal(g.phase, 'action');
  assert.equal(g.turn.stock, true);
  assert.equal(g.turn.investArea, 'all');
  throwsGame(() => A.act(g, a, { type: 'buyStock', area: 'A', n: 100 }), /1〜99/);
  const price = A.priceOf(g, 'B');
  A.act(g, a, { type: 'buyStock', area: 'B', n: 10 });
  assert.equal(g.stocks[a].B, 10);
  assert.equal(g.cash[a], cash + 550 - price * 10);
  throwsGame(() => A.act(g, a, { type: 'buyStock', area: 'C', n: 1 }), /銀行/);
});

test('増資すると株価が上がる', () => {
  const g = fresh(2);
  const before = A.priceOf(g, 'D');
  for (const i of A.SHOP_IDS) if (A.SQUARES[i].area === 'D') g.shops[i].value += 200;
  assert.ok(A.priceOf(g, 'D') > before);
});

test('福引き: 四季のマスにぴったり止まるとめくる。伏せ札の中身は view に出ない', () => {
  const g = fresh(2);
  const [a, b] = g.players;
  g.pos[a] = 1;
  A.act(g, a, { type: 'roll' }, die(2)); // 3 = 春
  assert.equal(g.phase, 'pick');
  assert.deepEqual(g.marks[a], ['spring']);
  throwsGame(() => A.act(g, b, { type: 'pick', cell: 0 }), /手番/);
  throwsGame(() => A.act(g, a, { type: 'pick', cell: 36 }), /マス/);
  for (const who of [a, b, null]) {
    const v = A.view(g, who);
    assert.ok(v.fuku.cells.every(c => c === null));
    const text = JSON.stringify(v);
    assert.ok(!text.includes('deck'), 'view に山札が入っていない');
  }
  // 引いた札が「もう一度」系でない札になるよう、中身を決めてからめくる
  g.fuku.deck[5] = 'gain100';
  const cash = g.cash[a];
  A.act(g, a, { type: 'pick', cell: 5 });
  assert.equal(g.cash[a], cash + 100);
  assert.equal(g.phase, 'action');
  const v = A.view(g, b);
  assert.deepEqual(v.fuku.cells[5], { by: a, card: 'gain100' });
  assert.equal(v.fuku.cells.filter(Boolean).length, 1);
  throwsGame(() => A.act(g, a, { type: 'pick', cell: 5 }), /今は/);
});

test('並べボーナス: 1列そろうと、自分の札の数に応じてもらえる。全部めくれたら新しい盤', () => {
  const g = fresh(2);
  const [a, b] = g.players;
  const f = g.fuku;
  f.deck = f.deck.map(() => 'gain100');
  for (const c of [0, 1, 2, 3]) f.open[c] = a;
  f.open[4] = b;
  g.phase = 'pick';
  const cash = g.cash[a];
  A.act(g, a, { type: 'pick', cell: 5 });
  assert.deepEqual(g.fuku.done, [0]);
  assert.equal(g.cash[a], cash + 100 + A.BINGO_BASE + A.BINGO_PER * 5);
  // 残りを全部めくった状態で最後の1枚
  g.turn.p = a;
  g.phase = 'pick';
  for (let c = 0; c < 36; c++) if (c !== 35) g.fuku.open[c] = g.fuku.open[c] ?? b;
  A.act(g, a, { type: 'pick', cell: 35 });
  assert.ok(g.fuku.open.every(c => c === null), '新しい盤になる');
  assert.deepEqual(g.fuku.done, []);
});

test('借金: 株→店を売って返す。返せなければ破産で終了', () => {
  const g = fresh(2);
  const [a, b] = g.players;
  // b の高い店に a が止まる
  g.shops[1] = { owner: b, value: 80 };
  for (const i of [2, 4, 5, 6]) g.shops[i] = { owner: b, value: 500 };
  g.cash[a] = 10;
  g.stocks[a].C = 1;
  g.shops[8] = { owner: a, value: 120 };
  A.act(g, a, { type: 'roll' }, die(1));
  assert.ok(g.cash[a] < 0);
  assert.equal(g.phase, 'debt');
  throwsGame(() => A.act(g, a, { type: 'end' }), /借金/);
  throwsGame(() => A.act(g, a, { type: 'sellShop', at: 1 }), /自分の店/);
  A.act(g, a, { type: 'sellStock', area: 'C', n: 1 });
  assert.equal(g.phase, 'debt');
  A.act(g, a, { type: 'sellShop', at: 8 });
  assert.equal(g.shops[8].owner, null);
  assert.equal(g.shops[8].value, A.SQUARES[8].base);
  assert.equal(g.phase, 'action');

  const h2 = fresh(2);
  const [x, y] = h2.players;
  for (const i of [1, 2, 4, 5, 6]) h2.shops[i] = { owner: y, value: 2000 };
  h2.cash[x] = 0;
  A.act(h2, x, { type: 'roll' }, die(1));
  assert.equal(h2.phase, 'over');
  assert.equal(h2.endReason, 'bankrupt');
  assert.equal(h2.winner, y);
});

test('目標資産に届いて銀行に戻ると勝ち。もう一度遊べる', () => {
  const g = fresh(2);
  const [a] = g.players;
  g.cash[a] = 5000;
  g.pos[a] = 27;
  A.act(g, a, { type: 'roll' }, die(1));
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, a);
  assert.equal(g.endReason, 'goal');
  throwsGame(() => A.act(g, a, { type: 'roll' }), /終わり/);
  const seq = g.seq;
  A.act(g, a, { type: 'restart' });
  assert.equal(g.phase, 'roll');
  assert.equal(g.cash[a], A.START_CASH);
  assert.ok(g.seq >= seq, '演出の番号は戻らない');
});

test('最大ラウンドで終わる', () => {
  const g = fresh(2, { rounds: 20 });
  const r = rng(9);
  // 誰も目標に届かないよう、目標を大きくして回す
  g.goal = 1e9;
  let k = 0;
  while (g.phase !== 'over' && k++ < 20000) A.act(g, g.turn.p, A.bot(g, g.turn.p, r), r);
  assert.equal(g.phase, 'over');
  assert.ok(['rounds', 'bankrupt'].includes(g.endReason));
  if (g.endReason === 'rounds') assert.equal(g.round, 21);
});

test('CPU だけで 2〜4人が最後まで遊べる（無限ループ・例外なし）', () => {
  for (const n of [2, 3, 4]) {
    for (let s = 1; s <= 25; s++) {
      const r = seededRng(s * 7 + n);
      const g = A.setup(makePlayers(n), r);
      let k = 0;
      while (g.phase !== 'over' && k++ < 20000) {
        const p = g.turn.p;
        // 手番でない人の CPU は何もしない
        for (const x of g.players) if (x !== p) assert.equal(A.bot(g, x, r), null);
        A.act(g, p, A.bot(g, p, r), r);
        assert.equal(JSON.stringify(g), JSON.stringify(structuredClone(g)));
      }
      assert.equal(g.phase, 'over', `${n}人 seed ${s} で終わらない`);
      assert.ok(g.players.includes(g.winner));
    }
  }
});

test('ランダムな操作を混ぜても壊れない（拒否は GameError だけ）', () => {
  const r = seededRng(42);
  const g = A.setup(makePlayers(3), r);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  let k = 0;
  while (g.phase !== 'over' && k++ < 30000) {
    const p = g.turn.p;
    const junk = pick([
      { type: 'buy' }, { type: 'end' }, { type: 'roll' }, { type: 'pick', cell: Math.floor(r() * 40) - 2 },
      { type: 'invest', at: pick(A.SHOP_IDS), amount: Math.floor(r() * 300) }, { type: 'buyStock', area: pick([...A.AREAS, 'X']), n: Math.floor(r() * 120) },
      { type: 'sellStock', area: pick(A.AREAS), n: 1 }, { type: 'sellShop', at: pick(A.SHOP_IDS) }, null, { type: 'roll', cell: '1' },
    ]);
    const who = r() < 0.2 ? pick(g.players) : p;
    const copy = structuredClone(g);
    try {
      A.act(copy, who, junk, r);
      Object.assign(g, copy);
    } catch (e) {
      assert.ok(e instanceof GameError, String(e));
      A.act(g, p, A.bot(g, p, r), r);
    }
  }
  assert.equal(g.phase, 'over');
});

test('バランス: 先手が勝ちすぎず、標準でだいたい20ラウンド以内に決着する', () => {
  for (const n of [2, 4]) {
    const wins = {};
    let rounds = 0;
    const games = 400;
    for (let s = 0; s < games; s++) {
      const r = seededRng(s * 7919 + 13);
      const g = A.setup(makePlayers(n), r);
      while (g.phase !== 'over') A.act(g, g.turn.p, A.bot(g, g.turn.p, r), r);
      wins[g.winner] = (wins[g.winner] ?? 0) + 1;
      rounds += g.round;
    }
    const avg = rounds / games;
    assert.ok(avg > 8 && avg < 22, `${n}人の平均ラウンド ${avg}`);
    for (const p of makePlayers(n).map(x => x.id)) {
      const rate = (wins[p] ?? 0) / games;
      assert.ok(rate > 0.7 / n && rate < 1.45 / n, `${n}人で ${p} の勝率 ${rate}`);
    }
  }
});

// ---- 8の字の盤 ----

const E = A.BOARDS.eight;
const eight = (n = 2, opts = {}) => A.setup(makePlayers(n), rng(), { board: 'eight', ...opts });

test('8の字の盤: 41マス・8つの町×4軒・座標が重ならない・全マスに行ける', () => {
  assert.equal(E.squares.length, 41);
  assert.equal(E.shopIds.length, 32);
  for (const a of E.areas) assert.equal(E.shopIds.filter(i => E.squares[i].area === a).length, 4, a);
  assert.deepEqual(E.squares.filter(s => s.k === 'season').map(s => s.mark).sort(), [...A.MARKS].sort());
  // 四季は上下の輪に2つずつ
  assert.equal(E.squares.filter((s, i) => s.k === 'season' && E.loop[i] === 'top').length, 2);
  const seen = new Set(E.pos.map(p => `${p.x},${p.y}`));
  assert.equal(seen.size, 41);
  for (const p of E.pos) assert.ok(p.x >= 0 && p.x < E.cols && p.y >= 0 && p.y < E.rows);
  // 隣のマスへしか進まない（グリッドで1マス）・全マスに行ける
  E.next.forEach((ns, i) => ns.forEach(j => assert.equal(Math.abs(E.pos[i].x - E.pos[j].x) + Math.abs(E.pos[i].y - E.pos[j].y), 1, `${i}→${j}`)));
  const reach = new Set([0]);
  const queue = [0];
  while (queue.length) for (const j of E.next[queue.shift()]) if (!reach.has(j)) reach.add(j), queue.push(j);
  assert.equal(reach.size, 41);
  assert.equal(eight().stocks.p0.H, 0);
});

test('8の字: 銀行から最初は道を選ぶ。直前のマスには戻れず、分かれ道で「もう1周／銀行へ」を選ぶ', () => {
  const g = eight(2);
  const [a, b] = g.players;
  A.act(g, a, { type: 'roll' }, die(3));
  assert.equal(g.phase, 'route');
  assert.deepEqual(g.turn.options, [1, 21]);
  throwsGame(() => A.act(g, b, { type: 'route', to: 1 }), /手番/);
  throwsGame(() => A.act(g, a, { type: 'route', to: 5 }), /進めません/);
  throwsGame(() => A.act(g, a, { type: 'end' }), /今は/);
  A.act(g, a, { type: 'route', to: 21 });
  assert.equal(g.pos[a], 23, '下の輪へ3マス');
  assert.equal(g.phase, 'action');
  throwsGame(() => A.act(g, a, { type: 'route', to: 1 }), /道を選べません/);
  // 上の輪の終わり（20）から分かれ道（1）へ: そこで止まって選ぶ
  const h2 = eight(2);
  h2.pos[a] = 19;
  h2.prev[a] = 18;
  A.act(h2, a, { type: 'roll' }, die(4));
  assert.equal(h2.phase, 'route');
  assert.equal(h2.pos[a], 1);
  assert.deepEqual(h2.turn.options, [2, 0]);
  h2.marks[a] = [...A.MARKS];
  const cash = h2.cash[a];
  A.act(h2, a, { type: 'route', to: 0 });
  // 銀行を通って給料。銀行からは来た道（1）に戻らず下の輪へ
  assert.equal(h2.level[a], 2);
  assert.ok(h2.cash[a] > cash);
  assert.equal(h2.pos[a], 21, '銀行の先は下の輪の分かれ道');
  assert.equal(h2.prev[a], 0);
  assert.equal(h2.phase, 'pick', '分かれ道は❓');
  assert.equal(h2.turn.stock, true, '銀行を通ったので株を買える');
  // 分かれ道で「もう1周」
  const h3 = eight(2);
  h3.pos[a] = 20;
  h3.prev[a] = 19;
  A.act(h3, a, { type: 'roll' }, die(3));
  assert.equal(h3.phase, 'route');
  A.act(h3, a, { type: 'route', to: 2 });
  assert.equal(h3.pos[a], 3);
  assert.equal(h3.prev[a], 2);
});

test('8の字: 銀行へワープした後は、どちらの輪へも行ける。福引きの「3マス進む」でも分かれ道で止まる', () => {
  const g = eight(2);
  const [a] = g.players;
  g.pos[a] = 19;
  g.prev[a] = 18;
  g.phase = 'pick';
  g.fuku.deck[0] = 'step3';
  A.act(g, a, { type: 'pick', cell: 0 });
  assert.equal(g.phase, 'route');
  assert.equal(g.pos[a], 1);
  A.act(g, a, { type: 'route', to: 2 });
  assert.equal(g.pos[a], 2);
  assert.equal(g.phase, 'action');
  g.phase = 'pick';
  g.fuku.deck[1] = 'bank';
  A.act(g, a, { type: 'pick', cell: 1 });
  assert.equal(g.pos[a], 0);
  assert.equal(g.prev[a], null);
  A.act(g, a, { type: 'end' });
});

test('株の買い付けの札で株を買える（銀行で買った後でも）', () => {
  const g = fresh(2);
  const [a] = g.players;
  g.turn.stockBought = true;
  g.phase = 'pick';
  g.fuku.deck[3] = 'stockBuy';
  A.act(g, a, { type: 'pick', cell: 3 });
  assert.equal(g.turn.stock, true);
  A.act(g, a, { type: 'buyStock', area: 'C', n: 3 });
  assert.equal(g.stocks[a].C, 3);
  throwsGame(() => A.act(g, a, { type: 'buyStock', area: 'C', n: 1 }), /銀行/);
});

test('8の字: CPU だけで 2〜4人が最後まで遊べる・ランダムな操作でも壊れない', () => {
  for (const n of [2, 3, 4]) {
    for (let s = 1; s <= 20; s++) {
      const r = seededRng(s * 13 + n);
      const g = A.setup(makePlayers(n), r, { board: 'eight' });
      let k = 0;
      while (g.phase !== 'over' && k++ < 30000) A.act(g, g.turn.p, A.bot(g, g.turn.p, r), r);
      assert.equal(g.phase, 'over', `${n}人 seed ${s}`);
    }
  }
  const r = seededRng(77);
  const g = A.setup(makePlayers(3), r, { board: 'eight' });
  const pick = arr => arr[Math.floor(r() * arr.length)];
  let k = 0;
  while (g.phase !== 'over' && k++ < 40000) {
    const p = g.turn.p;
    const junk = pick([{ type: 'route', to: Math.floor(r() * 45) - 2 }, { type: 'route', to: '1' }, { type: 'buy' }, { type: 'end' }, { type: 'roll' },
      { type: 'buyStock', area: pick(E.areas), n: 3 }, { type: 'sellStock', area: 'H', n: 1 }, { type: 'pick', cell: Math.floor(r() * 36) }]);
    const copy = structuredClone(g);
    try {
      A.act(copy, p, junk, r);
      Object.assign(g, copy);
    } catch (e) {
      assert.ok(e instanceof GameError, String(e));
      A.act(g, p, A.bot(g, p, r), r);
    }
  }
  assert.equal(g.phase, 'over');
});

test('8の字のバランス: 先手が勝ちすぎず、だいたい30ラウンド以内に決着する', () => {
  for (const n of [2, 4]) {
    const wins = {};
    let rounds = 0;
    const games = 300;
    for (let s = 0; s < games; s++) {
      const r = seededRng(s * 7919 + 29);
      const g = A.setup(makePlayers(n), r, { board: 'eight' });
      while (g.phase !== 'over') A.act(g, g.turn.p, A.bot(g, g.turn.p, r), r);
      wins[g.winner] = (wins[g.winner] ?? 0) + 1;
      rounds += g.round;
    }
    const avg = rounds / games;
    assert.ok(avg > 10 && avg < 28, `${n}人の平均ラウンド ${avg}`);
    for (const p of makePlayers(n).map(x => x.id)) {
      const rate = (wins[p] ?? 0) / games;
      assert.ok(rate > 0.7 / n && rate < 1.45 / n, `${n}人で ${p} の勝率 ${rate}`);
    }
  }
});
