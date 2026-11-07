// あきない通り
//
// すごろくの盤を回って町の店を買い、ほかの人が止まると買物料をもらう。
// 同じ町の店をたくさん持つほど買物料が上がり、増資で店を育てられる。町ごとの株もあり、育った町の株は値上がりして配当も入る。
// 四季のマーク（春・夏・秋・冬）を集めて銀行に戻ると給料。目標の資産に届いた状態で銀行に戻った人の勝ち。
// 四季のマスや❓にぴったり止まると「福引き盤」（6×6の伏せ札）を1枚めくる。縦・横・斜めの1列がそろうと並べボーナス。
import { GameError, shuffle } from '../../js/util.js';

export const MARKS = ['spring', 'summer', 'autumn', 'winter'];
export const MARK_INFO = {
  spring: { icon: '🌸', name: '春' },
  summer: { icon: '🎐', name: '夏' },
  autumn: { icon: '🍁', name: '秋' },
  winter: { icon: '⛄', name: '冬' },
};

export const AREA_INFO = {
  A: { name: '団子横丁', color: '#f28b82' },
  B: { name: '魚河岸', color: '#7cb7ff' },
  C: { name: '呉服町', color: '#b39ddb' },
  D: { name: '両替通り', color: '#f6c453' },
  E: { name: 'しるこ坂', color: '#8fd19e' },
  F: { name: '八百屋通り', color: '#ffb26b' },
  G: { name: '木場', color: '#bcaaa4' },
  H: { name: '蔵前', color: '#4dd0e1' },
};

// 店の名前と基本価格（1周の盤は5軒ずつ、8の字の盤は先頭の4軒ずつ使う）
const SHOPS = {
  A: [['だんご屋', 80], ['駄菓子屋', 100], ['甘味処', 120], ['焼き芋屋', 100], ['飴細工', 90]],
  B: [['干物屋', 120], ['寿司屋', 150], ['鰻屋', 170], ['天ぷら屋', 150], ['佃煮屋', 130]],
  C: [['手ぬぐい屋', 160], ['下駄屋', 180], ['反物屋', 220], ['簪屋', 190], ['扇子屋', 170]],
  D: [['質屋', 210], ['茶問屋', 240], ['両替商', 290], ['廻船問屋', 250], ['米問屋', 230]],
  E: [['汁粉屋', 100], ['煎餅屋', 110], ['団扇屋', 130], ['金魚屋', 120]],
  F: [['八百屋', 140], ['豆腐屋', 150], ['漬物屋', 170], ['乾物屋', 160]],
  G: [['材木問屋', 190], ['桶屋', 200], ['船大工', 230], ['炭問屋', 210]],
  H: [['札差', 260], ['酒蔵', 280], ['蔵元', 300], ['油問屋', 250]],
};
export const RATES = [0, 0.25, 0.4, 0.6, 0.8, 1.0]; // 同じ町の自分の店の数 → 買物料の率
const shopSq = (area, k) => ({ k: 'shop', area, name: SHOPS[area][k][0], base: SHOPS[area][k][1] });

// 1周の盤: 28マス。8×8の外周を、左上（銀行）から時計回りに並べる
function makeRing() {
  const squares = [];
  const side = (head, area, mark) => {
    const shops = [0, 1, 2, 3, 4].map(k => shopSq(area, k));
    squares.push(head, shops[0], shops[1], { k: 'season', mark }, shops[2], shops[3], shops[4]);
  };
  side({ k: 'bank' }, 'A', 'spring');
  side({ k: 'chance' }, 'B', 'summer');
  side({ k: 'chance' }, 'C', 'autumn');
  side({ k: 'chance' }, 'D', 'winter');
  const n = squares.length;
  const pos = i => {
    if (i < 7) return { x: i, y: 0 };
    if (i < 14) return { x: 7, y: i - 7 };
    if (i < 21) return { x: 7 - (i - 14), y: 7 };
    return { x: 0, y: 7 - (i - 21) };
  };
  return {
    id: 'ring', name: '1周', cols: 8, rows: 8, seatBonus: 150, salary: [400, 150], rates: RATES, bank: 0, areas: ['A', 'B', 'C', 'D'],
    squares, next: squares.map((_, i) => [(i + 1) % n]), pos: squares.map((_, i) => pos(i)), loop: squares.map(() => 'main'),
  };
}

// 8の字の盤: 7列×11行。上の輪20マス・中央の銀行・下の輪20マス（計41マス）
//   各輪の銀行側のまんなか（分かれ道）では「もう1周する」か「銀行へ」を選べる。輪は一方通行
function makeEight() {
  const squares = [{ k: 'bank' }];
  const pos = [{ x: 3, y: 5 }];
  const loop = ['center'];
  // 輪のマスの並び: 分かれ道から、各辺の店と四季・福引き
  const loopKinds = (a, b, c, d, m1, m2) => [
    { k: 'chance' }, shopSq(a, 0), shopSq(a, 1), shopSq(a, 2), { k: 'season', mark: m1 }, shopSq(a, 3),
    shopSq(b, 0), shopSq(b, 1), shopSq(b, 2), shopSq(b, 3), { k: 'chance' },
    shopSq(c, 0), shopSq(c, 1), shopSq(c, 2), { k: 'season', mark: m2 }, shopSq(c, 3),
    shopSq(d, 0), shopSq(d, 1), shopSq(d, 2), shopSq(d, 3),
  ];
  // 上の輪: (3,4) から左へ → 左の辺を上へ → 上の辺を右へ → 右の辺を下へ → 下の辺を左へ戻る
  const topPath = [[3, 4], [2, 4], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [5, 4], [4, 4]];
  // 下の輪: (3,6) から右へ → 右の辺を下へ → 下の辺を左へ → 左の辺を上へ → 上の辺を右へ戻る
  const bottomPath = [[3, 6], [4, 6], [5, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10], [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6]];
  const add = (path, kinds, name) => {
    const startIdx = squares.length;
    path.forEach(([x, y], k) => {
      squares.push(kinds[k]);
      pos.push({ x, y });
      loop.push(name);
    });
    return startIdx;
  };
  const top = add(topPath, loopKinds('A', 'B', 'C', 'D', 'spring', 'summer'), 'top');
  const bottom = add(bottomPath, loopKinds('E', 'F', 'G', 'H', 'autumn', 'winter'), 'bottom');
  const next = squares.map((_, i) => [i + 1]);
  next[0] = [top, bottom];
  next[top] = [top + 1, 0];
  next[top + 19] = [top];
  next[bottom] = [bottom + 1, 0];
  next[bottom + 19] = [bottom];
  return {
    id: 'eight', name: '8の字', cols: 7, rows: 11, bank: 0, areas: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    seatBonus: 50, salary: [600, 200], rates: [0, 0.3, 0.5, 0.75, 1.0], // 1つの町は4軒
    squares, next, pos, loop, junctions: [top, bottom],
  };
}

export const BOARDS = { ring: makeRing(), eight: makeEight() };
for (const B of Object.values(BOARDS)) B.shopIds = B.squares.map((s, i) => (s.k === 'shop' ? i : -1)).filter(i => i >= 0);
export const BOARD_IDS = ['ring', 'eight'];
export const boardOf = g => BOARDS[g.board ?? 'ring'];

// 1周の盤（以前からの名前）
export const AREAS = BOARDS.ring.areas;
export const SQUARES = BOARDS.ring.squares;
export const N = SQUARES.length; // 28
export const SHOP_IDS = BOARDS.ring.shopIds;
export const squarePos = i => BOARDS.ring.pos[i];

// 進める先（直前のマスには戻らない）
export function stepOptions(B, from, prev) {
  const n = B.next[from];
  const o = n.filter(x => x !== prev);
  return o.length ? o : n;
}

export const START_CASH = 1500;
export const SEAT_BONUS = 150; // 後の番の人ほど最初のお金が多い（先に銀行へ戻れる先手が有利なので）
export const SELL_RATE = 0.75; // 店を銀行に売るときの値段
export const DIV_PER = 100; // 配当: 買物料 × 持ち株 / DIV_PER
export const MAX_STOCK_BUY = 99; // 1回に買える株の数
export const MOD_MIN = -10;
export const MOD_MAX = 15;
export const BINGO_BASE = 100;
export const BINGO_PER = 50; // 列のうち自分がめくったマス1つにつき
export const GOALS = [3000, 4000, 6000];
export const ROUNDS = [20, 30, 40];

export const FUKU_SIZE = 6;
// 福引きの札（[id, 枚数, 説明]）。合計36枚
export const CARDS = {
  gain100: { n: 3, icon: '💰', text: '臨時収入！ 100G もらう' },
  gain200: { n: 2, icon: '🧧', text: '大入り袋！ 200G もらう' },
  lose100: { n: 2, icon: '👛', text: 'お財布を落とした… 100G 払う' },
  tax: { n: 2, icon: '📜', text: '年貢の取り立て。現金の1割を払う' },
  party: { n: 2, icon: '🎉', text: 'お祝い！ ほかの全員から 50G ずつもらう' },
  treat: { n: 2, icon: '🍶', text: '大盤振る舞い。ほかの全員に 30G ずつ払う' },
  bank: { n: 2, icon: '🏦', text: '銀行へひとっ飛び！' },
  again: { n: 2, icon: '🎲', text: '手番の終わりに、もう一度サイコロを振れる' },
  mark: { n: 3, icon: '🍃', text: '季節のめぐみ。まだない季節のマークを1つもらう' },
  boom: { n: 2, icon: '📈', text: '好景気！ どこかの町の株価が 3 上がる' },
  slump: { n: 2, icon: '📉', text: '不景気… どこかの町の株価が 3 下がる' },
  dividend: { n: 2, icon: '💹', text: '特別配当。持ち株1株につき 3G もらう' },
  renovate: { n: 2, icon: '🔨', text: '改装。自分のいちばん安い店の価値が 2割上がる（上限まで。店がなければ 50G）' },
  step3: { n: 2, icon: '👣', text: '近道。3マス進む' },
  gift: { n: 2, icon: '🎁', text: '株のおみやげ。どこかの町の株を 5株もらう' },
  stockBuy: { n: 3, icon: '📊', text: '株の買い付け。この手番、どこかの町の株を買える' },
  fair: { n: 1, icon: '🏮', text: '大売り出し！ 自分の店すべての価値が 1割上がる（上限まで。店がなければ 50G）' },
};

// 縦・横・斜めの列（マスの番号の配列）
export const LINES = (() => {
  const S = FUKU_SIZE;
  const out = [];
  for (let y = 0; y < S; y++) out.push(Array.from({ length: S }, (_, x) => y * S + x));
  for (let x = 0; x < S; x++) out.push(Array.from({ length: S }, (_, y) => y * S + x));
  out.push(Array.from({ length: S }, (_, i) => i * S + i));
  out.push(Array.from({ length: S }, (_, i) => i * S + (S - 1 - i)));
  return out;
})();

export function normalizeOptions(o) {
  return {
    goal: GOALS.includes(Number(o?.goal)) ? Number(o.goal) : 4000,
    rounds: ROUNDS.includes(Number(o?.rounds)) ? Number(o.rounds) : 30,
    board: BOARD_IDS.includes(o?.board) ? o.board : 'ring',
  };
}

export function validateOptions(_o, count) {
  if (count < 2 || count > 4) return 'あきない通りは2〜4人で遊びます';
  return null;
}

function newFuku(rng) {
  const deck = shuffle(Object.entries(CARDS).flatMap(([id, c]) => Array(c.n).fill(id)), rng);
  return { deck, open: Array(deck.length).fill(null), done: [] }; // open[i] = めくった人の id
}

export function setup(players, rng = Math.random, options = {}) {
  if (players.length < 2 || players.length > 4) throw new GameError('あきない通りは2〜4人で遊びます');
  const { goal, rounds, board } = normalizeOptions(options);
  const B = BOARDS[board];
  const ids = players.map(p => p.id);
  const per = f => Object.fromEntries(ids.map(p => [p, f()]));
  return {
    board,
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    bots: players.filter(p => p.bot).map(p => p.id),
    goal,
    rounds,
    cash: Object.fromEntries(ids.map((p, k) => [p, START_CASH + k * B.seatBonus])),
    pos: per(() => B.bank),
    prev: per(() => null), // 直前にいたマス（逆走しないため）
    move: null, // 分かれ道で止まっているときの残りの歩数
    marks: per(() => []),
    level: per(() => 1),
    stocks: per(() => Object.fromEntries(B.areas.map(a => [a, 0]))),
    shops: Object.fromEntries(B.shopIds.map(i => [i, { owner: null, value: B.squares[i].base }])),
    mod: Object.fromEntries(B.areas.map(a => [a, 0])),
    fuku: newFuku(rng),
    phase: 'roll', // roll / moving / route / pick / resolving / action / debt / over
    turn: newTurn(ids[0]),
    round: 1,
    winner: null,
    endReason: null,
    fx: [], // 画面の演出用の出来事（seq つき）
    seq: 0,
    log: [`🏪 あきない通り（${B.name}の盤）、開店！ 目標資産は ${goal}G。${players[0].name} さんから`],
  };
}

function newTurn(p) {
  return { p, roll: null, buyable: null, investArea: null, stock: false, again: false, stockBought: false, options: null };
}

function log(g, text) {
  g.log.push(text);
  if (g.log.length > 60) g.log.splice(0, g.log.length - 60);
}
function fx(g, e) {
  g.seq += 1;
  g.fx.push({ ...e, seq: g.seq });
  if (g.fx.length > 40) g.fx.splice(0, g.fx.length - 40);
}
const nameOf = (g, p) => g.names[p] ?? '?';

// ---- 計算 ----

const sqOf = (g, i) => boardOf(g).squares[i];
const shopIds = g => boardOf(g).shopIds;
const areasOf = g => boardOf(g).areas;
export const ownedIn = (g, p, area) => shopIds(g).filter(i => sqOf(g, i).area === area && g.shops[i].owner === p).length;
export function feeOf(g, i) {
  const s = g.shops[i];
  if (!s.owner) return 0;
  return Math.round(s.value * boardOf(g).rates[ownedIn(g, s.owner, sqOf(g, i).area)]);
}
export function capOf(g, i) {
  const s = g.shops[i];
  const n = s.owner ? ownedIn(g, s.owner, sqOf(g, i).area) : 0;
  return sqOf(g, i).base * (1 + n);
}
export function priceOf(g, area) {
  const sum = shopIds(g).filter(i => sqOf(g, i).area === area).reduce((a, i) => a + g.shops[i].value, 0);
  return Math.max(1, Math.round(sum / 50) + g.mod[area]);
}
export const shopValue = (g, p) => shopIds(g).reduce((a, i) => a + (g.shops[i].owner === p ? g.shops[i].value : 0), 0);
export const stockValue = (g, p) => areasOf(g).reduce((a, ar) => a + g.stocks[p][ar] * priceOf(g, ar), 0);
export const worth = (g, p) => g.cash[p] + shopValue(g, p) + stockValue(g, p);
// 借金を返すために売れるものを全部売ったときの現金
const liquid = (g, p) => g.cash[p] + stockValue(g, p) + shopIds(g).reduce((a, i) => a + (g.shops[i].owner === p ? Math.floor(g.shops[i].value * SELL_RATE) : 0), 0);
export const salaryOf = (g, p) => boardOf(g).salary[0] + g.level[p] * boardOf(g).salary[1] + Math.floor(shopValue(g, p) * 0.15);

// ---- 進む・止まる ----

function gainMark(g, p, mark, at) {
  if (g.marks[p].includes(mark)) return;
  g.marks[p].push(mark);
  fx(g, { k: 'mark', p, mark, at });
}

// 銀行を通る・止まる。勝ったら true
function bankVisit(g, p) {
  const t = g.turn;
  if (MARKS.every(m => g.marks[p].includes(m))) {
    const pay = salaryOf(g, p);
    g.cash[p] += pay;
    g.level[p] += 1;
    g.marks[p] = [];
    fx(g, { k: 'salary', p, amount: pay, level: g.level[p] });
    log(g, `🏦 ${nameOf(g, p)}: 四季がそろって給料 ${pay}G（段位 ${g.level[p]}）`);
  }
  if (worth(g, p) >= g.goal) {
    finish(g, p, 'goal');
    return true;
  }
  if (t.p === p) {
    t.stock = !t.stockBought;
    t.investArea = 'all';
  }
  return false;
}

function moveBy(g, p, steps) {
  g.move = { left: steps };
  continueMove(g, p, null);
}

// 1マスずつ進む。分かれ道で歩数が残っていれば止まって、道を選ぶのを待つ（phase 'route'）
function continueMove(g, p, choice) {
  const B = boardOf(g);
  const path = [g.pos[p]];
  const flush = () => {
    if (path.length > 1) fx(g, { k: 'move', p, path: path.slice() });
    path.splice(0, path.length - 1);
  };
  while (g.move.left > 0) {
    const opts = stepOptions(B, g.pos[p], g.prev[p]);
    let to;
    if (opts.length === 1) to = opts[0];
    else if (choice !== null) {
      to = choice;
      choice = null;
    } else {
      flush();
      g.phase = 'route';
      g.turn.options = opts;
      return;
    }
    g.prev[p] = g.pos[p];
    g.pos[p] = to;
    g.move.left -= 1;
    path.push(to);
    const sq = B.squares[to];
    if (sq.k === 'season') gainMark(g, p, sq.mark, to);
    if (sq.k === 'bank') {
      flush();
      if (bankVisit(g, p)) {
        g.move = null;
        return;
      }
    }
  }
  flush();
  g.move = null;
  g.turn.options = null;
  g.phase = 'moving';
  land(g, p);
}

function warpToBank(g, p) {
  const bank = boardOf(g).bank;
  fx(g, { k: 'warp', p, from: g.pos[p], to: bank });
  g.pos[p] = bank;
  g.prev[p] = null; // 銀行からはどちらへも進める
  if (bankVisit(g, p)) return;
  land(g, p);
}

function land(g, p) {
  if (g.phase === 'over') return;
  const i = g.pos[p];
  const sq = sqOf(g, i);
  const t = g.turn;
  if (sq.k === 'shop') {
    const s = g.shops[i];
    if (!s.owner) t.buyable = i;
    else if (s.owner === p) {
      if (t.investArea !== 'all') t.investArea = sq.area;
    } else payFee(g, p, i);
  }
  if (sq.k === 'season' || sq.k === 'chance') {
    g.phase = 'pick';
    log(g, `🎴 ${nameOf(g, p)}: 福引き盤から1枚めくる`);
    return;
  }
  afterLanding(g);
}

function payFee(g, p, i) {
  const s = g.shops[i];
  const fee = feeOf(g, i);
  g.cash[p] -= fee;
  g.cash[s.owner] += fee;
  fx(g, { k: 'fee', from: p, to: s.owner, at: i, amount: fee });
  log(g, `🛍️ ${nameOf(g, p)} → ${nameOf(g, s.owner)}: ${sqOf(g, i).name}で買物料 ${fee}G`);
  const area = sqOf(g, i).area;
  for (const x of g.players) {
    if (x === p || !g.stocks[x][area]) continue;
    const d = Math.floor((fee * g.stocks[x][area]) / DIV_PER);
    if (!d) continue;
    g.cash[x] += d;
    fx(g, { k: 'div', p: x, area, amount: d });
    log(g, `💹 ${nameOf(g, x)}: ${AREA_INFO[area].name}の株の配当 ${d}G`);
  }
}

function afterLanding(g) {
  if (g.phase === 'over') return;
  const p = g.turn.p;
  if (g.cash[p] < 0) {
    if (liquid(g, p) < 0) {
      fx(g, { k: 'bankrupt', p });
      log(g, `💸 ${nameOf(g, p)} は支払えずに破産…`);
      return finish(g, null, 'bankrupt');
    }
    g.phase = 'debt';
    log(g, `⚠️ ${nameOf(g, p)}: 現金が足りません。株か店を売って返します`);
    return;
  }
  g.phase = 'action';
}

function finish(g, winner, reason) {
  const best = g.players.slice().sort((a, b) => worth(g, b) - worth(g, a))[0];
  g.winner = winner ?? best;
  g.endReason = reason;
  g.phase = 'over';
  fx(g, { k: 'win', p: g.winner });
  if (reason === 'goal') log(g, `🏆 ${nameOf(g, g.winner)}: 資産 ${worth(g, g.winner)}G で銀行に到着。あきないの頂点に！`);
  else log(g, `🏆 資産がいちばん多い ${nameOf(g, g.winner)} の勝ち（${worth(g, g.winner)}G）`);
}

function nextTurn(g) {
  const t = g.turn;
  if (t.again) {
    g.turn = newTurn(t.p);
    g.phase = 'roll';
    log(g, `🎲 ${nameOf(g, t.p)}: もう一度サイコロ`);
    return;
  }
  const idx = (g.players.indexOf(t.p) + 1) % g.players.length;
  if (idx === 0) {
    g.round += 1;
    if (g.round > g.rounds) return finish(g, null, 'rounds');
  }
  const p = g.players[idx];
  g.turn = newTurn(p);
  g.phase = 'roll';
}

// ---- 福引き ----

function pickRandomArea(g, rng) {
  const areas = areasOf(g);
  return areas[Math.floor(rng() * areas.length)];
}

function applyCard(g, p, id, rng) {
  const others = g.players.filter(x => x !== p);
  const money = (x, d) => {
    g.cash[x] += d;
    fx(g, { k: 'money', p: x, amount: d });
  };
  const raiseShops = (list, rate) => {
    if (!list.length) return money(p, 50);
    for (const i of list) {
      const s = g.shops[i];
      const add = Math.min(Math.round(s.value * rate), capOf(g, i) - s.value);
      if (add > 0) {
        s.value += add;
        fx(g, { k: 'invest', p, at: i, amount: add });
      }
    }
  };
  const mine = shopIds(g).filter(i => g.shops[i].owner === p);
  switch (id) {
    case 'gain100': return money(p, 100);
    case 'gain200': return money(p, 200);
    case 'lose100': return money(p, -100);
    case 'tax': return money(p, -Math.floor(Math.max(0, g.cash[p]) / 10));
    case 'party':
      for (const x of others) {
        const d = Math.min(50, Math.max(0, g.cash[x]));
        if (!d) continue;
        g.cash[x] -= d;
        g.cash[p] += d;
        fx(g, { k: 'fee', from: x, to: p, at: null, amount: d });
      }
      return;
    case 'treat':
      for (const x of others) {
        g.cash[p] -= 30;
        g.cash[x] += 30;
        fx(g, { k: 'fee', from: p, to: x, at: null, amount: 30 });
      }
      return;
    case 'bank': return warpToBank(g, p);
    case 'again': g.turn.again = true; return;
    case 'mark': {
      const m = MARKS.find(x => !g.marks[p].includes(x));
      if (m) gainMark(g, p, m, null);
      else money(p, 50);
      return;
    }
    case 'boom':
    case 'slump': {
      const area = pickRandomArea(g, rng);
      const d = id === 'boom' ? 3 : -3;
      const before = priceOf(g, area);
      g.mod[area] = Math.max(MOD_MIN, Math.min(MOD_MAX, g.mod[area] + d));
      fx(g, { k: 'price', area, d: priceOf(g, area) - before });
      log(g, `${CARDS[id].icon} ${AREA_INFO[area].name}の株価が ${before} → ${priceOf(g, area)}`);
      return;
    }
    case 'dividend': {
      const n = areasOf(g).reduce((a, ar) => a + g.stocks[p][ar], 0);
      return money(p, n * 3);
    }
    case 'renovate': {
      const cheapest = mine.slice().sort((a, b) => g.shops[a].value - g.shops[b].value).slice(0, 1);
      return raiseShops(cheapest, 0.2);
    }
    case 'fair': return raiseShops(mine, 0.1);
    case 'step3': return moveBy(g, p, 3);
    case 'stockBuy':
      g.turn.stock = true;
      g.turn.stockBought = false;
      log(g, `📊 ${nameOf(g, p)}: この手番、株を買える`);
      return;
    case 'gift': {
      const area = pickRandomArea(g, rng);
      g.stocks[p][area] += 5;
      fx(g, { k: 'stock', p, area, n: 5, buy: true });
      log(g, `🎁 ${nameOf(g, p)}: ${AREA_INFO[area].name}の株を5株もらった`);
      return;
    }
  }
}

function pick(g, p, cell, rng) {
  const f = g.fuku;
  if (!Number.isInteger(cell) || cell < 0 || cell >= f.deck.length) throw new GameError('福引き盤のマスを選んでください');
  if (f.open[cell]) throw new GameError('そのマスはもうめくられています');
  const id = f.deck[cell];
  f.open[cell] = p;
  fx(g, { k: 'card', p, cell, card: id });
  log(g, `${CARDS[id].icon} ${nameOf(g, p)}: 「${CARDS[id].text}」`);
  // 並べボーナス
  LINES.forEach((line, li) => {
    if (f.done.includes(li) || !line.includes(cell) || !line.every(c => f.open[c])) return;
    f.done.push(li);
    const own = line.filter(c => f.open[c] === p).length;
    const bonus = BINGO_BASE + BINGO_PER * own;
    g.cash[p] += bonus;
    fx(g, { k: 'bingo', p, line: li, cells: line, amount: bonus });
    log(g, `🎯 ${nameOf(g, p)}: 1列そろって並べボーナス ${bonus}G（自分の札 ${own}枚）`);
  });
  const full = f.open.every(Boolean);
  g.phase = 'resolving';
  applyCard(g, p, id, rng);
  if (full) {
    g.fuku = newFuku(rng);
    fx(g, { k: 'newboard' });
    log(g, '🎴 福引き盤がすべてめくれたので、新しい盤に入れ替えた');
  }
  if (g.phase === 'resolving') afterLanding(g);
}

// ---- 売る ----

function sellStock(g, p, area, n) {
  if (!areasOf(g).includes(area)) throw new GameError('町を選んでください');
  if (!Number.isInteger(n) || n < 1) throw new GameError('株の数が正しくありません');
  if (g.stocks[p][area] < n) throw new GameError('その数の株を持っていません');
  const price = priceOf(g, area);
  g.stocks[p][area] -= n;
  g.cash[p] += price * n;
  fx(g, { k: 'stock', p, area, n, buy: false, amount: price * n });
  log(g, `📉 ${nameOf(g, p)}: ${AREA_INFO[area].name}の株を${n}株売った（${price * n}G）`);
}

function sellShop(g, p, i) {
  if (!shopIds(g).includes(i) || g.shops[i].owner !== p) throw new GameError('自分の店を選んでください');
  const s = g.shops[i];
  const amount = Math.floor(s.value * SELL_RATE);
  g.cash[p] += amount;
  s.owner = null;
  s.value = sqOf(g, i).base;
  fx(g, { k: 'sell', p, at: i, amount });
  log(g, `🏚️ ${nameOf(g, p)}: ${sqOf(g, i).name}を銀行に${amount}Gで売った`);
}

// 同じ町の店が2軒以上になると、町の評判が上がって自分のその町の店すべての価値が上がる
export const AREA_BONUS = 0.2; // 基本価格に対する割合
function areaBonus(g, p, area) {
  if (ownedIn(g, p, area) < 2) return;
  for (const i of shopIds(g)) {
    if (sqOf(g, i).area !== area || g.shops[i].owner !== p) continue;
    const s = g.shops[i];
    const add = Math.min(Math.round(sqOf(g, i).base * AREA_BONUS), capOf(g, i) - s.value);
    if (add <= 0) continue;
    s.value += add;
    fx(g, { k: 'invest', p, at: i, amount: add, bonus: true });
  }
  log(g, `🏮 ${nameOf(g, p)}: ${AREA_INFO[area].name}の評判が上がり、店の価値が上がった`);
}

// ---- 操作 ----

export function act(g, p, action, rng = Math.random) {
  if (!g.players.includes(p)) throw new GameError('観戦中は操作できません');
  const type = action?.type;
  if (type === 'restart') {
    if (g.phase !== 'over') throw new GameError('まだゲーム中です');
    const next = setup(g.players.map(x => ({ id: x, name: g.names[x], bot: g.bots.includes(x) })), rng, { goal: g.goal, rounds: g.rounds, board: g.board });
    next.seq = g.seq; // 画面の演出が古い出来事を再生しないよう、番号は続きから
    Object.assign(g, next);
    return;
  }
  if (g.phase === 'over') throw new GameError('ゲームは終わりました');
  const t = g.turn;
  if (t.p !== p) throw new GameError('あなたの手番ではありません');

  if (type === 'roll') {
    if (g.phase !== 'roll') throw new GameError('今はサイコロを振れません');
    const n = 1 + Math.floor(rng() * 6);
    t.roll = n;
    g.phase = 'moving';
    fx(g, { k: 'roll', p, n });
    log(g, `🎲 ${nameOf(g, p)}: ${n} が出た`);
    moveBy(g, p, n);
    return;
  }
  if (type === 'route') {
    if (g.phase !== 'route') throw new GameError('今は道を選べません');
    if (!t.options?.includes(action.to)) throw new GameError('その道には進めません');
    g.phase = 'moving';
    t.options = null;
    continueMove(g, p, action.to);
    return;
  }
  if (type === 'pick') {
    if (g.phase !== 'pick') throw new GameError('今は福引きをめくれません');
    return pick(g, p, action.cell, rng);
  }
  if (type === 'sellStock') {
    if (g.phase !== 'roll' && g.phase !== 'debt') throw new GameError('株を売れるのは、サイコロを振る前か借金を返すときです');
    sellStock(g, p, action.area, action.n);
    if (g.phase === 'debt' && g.cash[p] >= 0) g.phase = 'action';
    return;
  }
  if (type === 'sellShop') {
    if (g.phase !== 'debt') throw new GameError('店を売れるのは、借金を返すときだけです');
    sellShop(g, p, action.at);
    if (g.cash[p] >= 0) g.phase = 'action';
    return;
  }

  if (g.phase !== 'action') throw new GameError(g.phase === 'debt' ? '先に株か店を売って、借金を返してください' : '今はその操作はできません');

  if (type === 'buy') {
    const i = t.buyable;
    if (i === null || g.shops[i].owner) throw new GameError('買える店がありません');
    const sq = sqOf(g, i);
    const price = sq.base;
    if (g.cash[p] < price) throw new GameError('お金が足りません');
    g.cash[p] -= price;
    g.shops[i].owner = p;
    g.shops[i].value = price;
    t.buyable = null;
    fx(g, { k: 'buy', p, at: i, amount: price });
    log(g, `🏪 ${nameOf(g, p)}: ${AREA_INFO[sq.area].name}の${sq.name}を${price}Gで買った`);
    areaBonus(g, p, sq.area);
    return;
  }
  if (type === 'invest') {
    const i = action.at;
    const amount = action.amount;
    if (!t.investArea) throw new GameError('今は増資できません（自分の店に止まるか、銀行を通ったとき）');
    if (!shopIds(g).includes(i) || g.shops[i].owner !== p) throw new GameError('自分の店を選んでください');
    if (t.investArea !== 'all' && sqOf(g, i).area !== t.investArea) throw new GameError(`増資できるのは${AREA_INFO[t.investArea].name}の店だけです`);
    if (!Number.isInteger(amount) || amount < 1) throw new GameError('増資の金額が正しくありません');
    if (amount > g.cash[p]) throw new GameError('お金が足りません');
    const room = capOf(g, i) - g.shops[i].value;
    if (amount > room) throw new GameError(room > 0 ? `この店にはあと ${room}G まで増資できます` : 'この店はもう上限まで増資しています');
    g.cash[p] -= amount;
    g.shops[i].value += amount;
    fx(g, { k: 'invest', p, at: i, amount });
    log(g, `✨ ${nameOf(g, p)}: ${sqOf(g, i).name}に${amount}G増資（価値 ${g.shops[i].value}G）`);
    return;
  }
  if (type === 'buyStock') {
    const { area, n } = action;
    if (!t.stock) throw new GameError('株を買えるのは、銀行を通ったときか「株の買い付け」の札を引いたときです（1回に1つの町）');
    if (!areasOf(g).includes(area)) throw new GameError('町を選んでください');
    if (!Number.isInteger(n) || n < 1 || n > MAX_STOCK_BUY) throw new GameError(`株は1〜${MAX_STOCK_BUY}株で買えます`);
    const cost = priceOf(g, area) * n;
    if (cost > g.cash[p]) throw new GameError('お金が足りません');
    g.cash[p] -= cost;
    g.stocks[p][area] += n;
    t.stock = false;
    t.stockBought = true;
    fx(g, { k: 'stock', p, area, n, buy: true, amount: cost });
    log(g, `📈 ${nameOf(g, p)}: ${AREA_INFO[area].name}の株を${n}株買った（${cost}G）`);
    return;
  }
  if (type === 'end') return nextTurn(g);
  throw new GameError('不明な操作です');
}

// ---- 見せる情報 ----

export function view(g, p) {
  const seated = g.players.includes(p);
  const f = g.fuku;
  return {
    board: g.board,
    phase: g.phase,
    me: seated ? p : null,
    goal: g.goal,
    rounds: g.rounds,
    round: g.round,
    turn: g.turn,
    moveLeft: g.move?.left ?? null,
    winner: g.winner,
    endReason: g.endReason,
    shops: Object.fromEntries(shopIds(g).map(i => [i, { ...g.shops[i], fee: feeOf(g, i), cap: capOf(g, i) }])),
    areas: areasOf(g),
    prices: Object.fromEntries(areasOf(g).map(a => [a, priceOf(g, a)])),
    // 福引き盤: めくった札だけ中身を見せる（伏せ札の中身は送らない）
    fuku: { cells: f.open.map((by, i) => (by ? { by, card: f.deck[i] } : null)), done: f.done },
    fx: g.fx,
    seq: g.seq,
    log: g.log.slice(-14),
    players: g.players.map(x => ({
      id: x,
      name: g.names[x],
      bot: g.bots.includes(x),
      cash: g.cash[x],
      worth: worth(g, x),
      pos: g.pos[x],
      marks: g.marks[x],
      level: g.level[x],
      salary: salaryOf(g, x),
      stocks: g.stocks[x],
      shops: shopIds(g).filter(i => g.shops[i].owner === x).length,
    })),
  };
}

// ---- CPU ----

const RESERVE = 250; // 買物料に備えて手元に残す現金

export function bot(g, p, rng = Math.random) {
  if (g.phase === 'over' || g.turn.p !== p) return null;
  const t = g.turn;
  if (g.phase === 'roll') return { type: 'roll' };
  if (g.phase === 'route') return { type: 'route', to: botRoute(g, p, rng) };
  if (g.phase === 'pick') {
    // 列がそろいやすいマス（めくれた札が多い列にあるマス）を選ぶ
    const f = g.fuku;
    let best = null;
    f.open.forEach((by, c) => {
      if (by) return;
      let s = rng() * 0.5;
      for (const line of LINES) {
        if (!line.includes(c)) continue;
        const opened = line.filter(x => f.open[x]).length;
        s += opened === line.length - 1 ? 10 : opened * 0.4;
      }
      if (!best || s > best.s) best = { c, s };
    });
    return { type: 'pick', cell: best.c };
  }
  if (g.phase === 'debt') {
    const need = -g.cash[p];
    const area = areasOf(g).filter(a => g.stocks[p][a]).sort((a, b) => g.stocks[p][b] * priceOf(g, b) - g.stocks[p][a] * priceOf(g, a))[0];
    if (area) {
      const price = priceOf(g, area);
      return { type: 'sellStock', area, n: Math.min(g.stocks[p][area], Math.ceil(need / price)) };
    }
    const shop = shopIds(g).filter(i => g.shops[i].owner === p).sort((a, b) => g.shops[a].value - g.shops[b].value)[0];
    return { type: 'sellShop', at: shop };
  }
  if (g.phase !== 'action') return null;
  const cash = g.cash[p];
  // 店を買う
  if (t.buyable !== null && cash - sqOf(g, t.buyable).base >= RESERVE * 0.6) return { type: 'buy' };
  // 増資: 同じ町に2軒以上ある店から、伸びしろの大きい順に
  if (t.investArea && cash > RESERVE * 2) {
    const list = shopIds(g).filter(i => g.shops[i].owner === p && (t.investArea === 'all' || sqOf(g, i).area === t.investArea))
      .filter(i => ownedIn(g, p, sqOf(g, i).area) >= 2 && capOf(g, i) - g.shops[i].value > 0)
      .sort((a, b) => ownedIn(g, p, sqOf(g, b).area) - ownedIn(g, p, sqOf(g, a).area) || feeOf(g, b) - feeOf(g, a));
    if (list.length) {
      const i = list[0];
      const amount = Math.min(capOf(g, i) - g.shops[i].value, cash - RESERVE * 2, 400);
      if (amount >= 20) return { type: 'invest', at: i, amount };
    }
  }
  // 株: 自分の店が多い町を買う
  if (t.stock && cash > RESERVE * 2.5) {
    const area = areasOf(g).slice().sort((a, b) => ownedIn(g, p, b) - ownedIn(g, p, a) || priceOf(g, a) - priceOf(g, b))[0];
    const price = priceOf(g, area);
    const n = Math.min(MAX_STOCK_BUY, Math.floor((cash - RESERVE * 2) / price / 2));
    if (n >= 5) return { type: 'buyStock', area, n };
  }
  return { type: 'end' };
}

// 分かれ道で進む先を選ぶ。四季がそろっていれば銀行へ。足りないマークがある輪、空き店や自分の店が多い輪へ
function botRoute(g, p, rng) {
  const B = boardOf(g);
  const opts = g.turn.options;
  const all = MARKS.every(m => g.marks[p].includes(m));
  const here = B.loop[g.pos[p]];
  const loopScore = L => {
    let s = 0;
    B.squares.forEach((sq, i) => {
      if (B.loop[i] !== L) return;
      if (sq.k === 'season' && !g.marks[p].includes(sq.mark)) s += 4;
      if (sq.k === 'shop') {
        const o = g.shops[i].owner;
        if (!o) s += 0.4;
        else if (o === p) s += 0.3;
        else s -= feeOf(g, i) / 300;
      }
    });
    return s;
  };
  let best = null;
  for (const o of opts) {
    // 銀行へ向かうと、その先は反対の輪に入る
    const L = o === B.bank ? (here === 'top' ? 'bottom' : 'top') : B.loop[o];
    let s = loopScore(L) + rng() * 1.5;
    if (all && o === B.bank) s += 20;
    if (!best || s > best.s) best = { o, s };
  }
  return best.o;
}
