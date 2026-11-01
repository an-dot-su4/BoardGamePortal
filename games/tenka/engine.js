// 天下札のルールエンジン（画面に依存しない）
//
// 状態はすべて JSON にできる値で持つ（ホストの保存と structuredClone のため）。
// カードの効果は「命令（op）」をスタックに積んで順に実行する。選択が必要な場面では
// state.prompt を立てて止まり、プレイヤーの答え（act の 'choose'）で続きを実行する。
//
// カードの置き場所（各プレイヤー）: deck（山札・末尾が一番上）/ hand / discard（末尾が一番上）/ play（場）/ aside（脇に置いた札）
//   dur（持続札: 次の手番まで場に残る）/ look（見ている途中の札）
// 持続札の効果: 使った手番に durNext に記録 → 片付けで durEffects へ → 次の手番の最初に card.next(e) を実行
// カードはIDの文字列で表す（同じ種類のカードは区別しない）。
import { GameError, shuffle } from '../../js/util.js';
import { CARDS } from './cards/index.js';

export const HAND_SIZE = 5;

export function card(id) {
  const c = CARDS[id];
  if (!c) throw new Error('不明なカード: ' + id);
  return c;
}

export const isType = (id, type) => card(id).types.includes(type);

export function log(g, text) {
  g.log.push(text);
  if (g.log.length > 80) g.log.splice(0, g.log.length - 80);
}

export const nameOf = (g, pid) => g.names[pid] ?? '?';

// ---- 札の移動 ----

export function draw(g, rng, pid, n) {
  const ps = g.ps[pid];
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (ps.deck.length === 0) {
      if (ps.discard.length === 0) break;
      ps.deck = shuffle(ps.discard, rng);
      ps.discard = [];
    }
    const c = ps.deck.pop();
    ps.hand.push(c);
    drawn.push(c);
  }
  return drawn;
}

// 手札などから指定の札を1枚ずつ取り除く（無ければ例外）
export function take(zone, ids) {
  for (const id of ids) {
    const i = zone.indexOf(id);
    if (i < 0) throw new GameError('その札はありません');
    zone.splice(i, 1);
  }
}

// 札を獲得する。戦国の「落武者の山」(ruins) は、混ぜた山の一番上の札になる。戻り値は獲得した札のID（失敗は false）
export function gain(g, pid, id, to = 'discard') {
  if (!(g.supply[id] > 0)) return false;
  g.supply[id] -= 1;
  const pile = id;
  if (id === 'ruins') id = g.ruinsPile.pop();
  else if (id === 'bushi') id = g.knightsPile.pop(); // 戦国の「名のある武者」: 10人を混ぜた山の一番上
  // 交易路: 勝利点の山から初めて獲得されたら、その山の印が交易路のマットへ移る
  const tr = g.tradeRoute;
  if (tr && tr.piles.includes(pile)) {
    tr.piles = tr.piles.filter(x => x !== pile);
    tr.mat += 1;
  }
  place(g, pid, id, to);
  return id;
}

// 廃棄置き場から獲得する（獲得したときの効果も起きる）
export function gainFromTrash(g, pid, id, to = 'discard') {
  const i = g.trash.lastIndexOf(id);
  if (i < 0) return false;
  g.trash.splice(i, 1);
  place(g, pid, id, to);
  return id;
}

function place(g, pid, id, to) {
  const ps = g.ps[pid];
  if (g.turn && g.turn.p === pid) (g.turn.gained ??= []).push(id);
  if (to === 'hand') ps.hand.push(id);
  else if (to === 'deck') ps.deck.push(id);
  else ps.discard.push(id);
  // 屍運び: 獲得したとき、落武者を2枚獲得する
  if (id === 'shikabane') for (let i = 0; i < 2; i++) gain(g, pid, 'ruins');
  // 獲得したときの反応（番所: 手札から / 御朱印: 場から）。今の処理のあとで選ぶ
  const ops = [];
  if (ps.hand.includes('bansho')) ops.push({ op: 'step', p: pid, card: 'bansho', step: 'react', data: { id, to } });
  if (g.turn && g.turn.p === pid && ps.play.includes('goshuin')) ops.push({ op: 'step', p: pid, card: 'goshuin', step: 'react', data: { id, to } });
  // 同じ処理の中で何枚も獲得したときに、獲得した順に反応できるよう、いったん列に並べる（run が積む）
  if (ops.length) (g.reactQ ??= []).push(...ops);
}

// 獲得したときの反応を、獲得した順に実行されるように積む
function flushReactions(g) {
  if (g.reactQ?.length) {
    pushOps(g, ...g.reactQ);
    g.reactQ = [];
  }
}

// 獲得した札が、置いた場所にまだあれば取り出す（反応で廃棄・山札の上へ移すため）
export function takeGained(g, pid, id, to) {
  const ps = g.ps[pid];
  const zone = to === 'hand' ? ps.hand : to === 'deck' ? ps.deck : ps.discard;
  const i = zone.lastIndexOf(id);
  if (i < 0) return false;
  zone.splice(i, 1);
  return true;
}

export function trashFromHand(g, pid, ids) {
  take(g.ps[pid].hand, ids);
  trashCards(g, pid, ids);
}

// 廃棄置き場に置く。廃棄されたときの効果（山城・知行・鷹狩など）があれば、今の処理のあとに実行する
// 楽市（手札）: 自分の札が廃棄されるたびに、捨てて金を獲得してよい
export function trashCards(g, pid, ids) {
  g.trash.push(...ids);
  const market = g.ps[pid].hand.includes('rakuichi');
  const hooks = [];
  for (const id of ids) {
    if (card(id).steps?.onTrash) hooks.push({ op: 'step', p: pid, card: id, step: 'onTrash', data: {} });
    if (market) hooks.push({ op: 'step', p: pid, card: 'rakuichi', step: 'react', data: { trashed: id } });
  }
  pushOps(g, ...hooks);
}

export function discardFromHand(g, pid, ids) {
  take(g.ps[pid].hand, ids);
  g.ps[pid].discard.push(...ids);
}

export function allCards(g, pid) {
  const ps = g.ps[pid];
  const held = [...(ps.durNext ?? []), ...(ps.durEffects ?? [])].flatMap(en => en.held);
  const mats = Object.values(ps.mats ?? {}).filter(Array.isArray).flat();
  return [...ps.deck, ...ps.hand, ...ps.discard, ...ps.play, ...ps.aside, ...(ps.dur ?? []), ...(ps.look ?? []), ...held, ...mats];
}

// 今のコスト。室町の石切場（場にある間、行動札が2安い）と行商人（購入フェーズに、場の行動札1枚につき2安い）で変わる
export function costOf(g, id) {
  if (id === 'bushi' && g.knightsPile?.length) id = g.knightsPile[g.knightsPile.length - 1];
  let c = card(id).cost;
  const t = g.turn;
  if (t && g.ps[t.p]) {
    const play = g.ps[t.p].play;
    if (isType(id, 'action')) c -= 2 * play.filter(x => x === 'ishikiri').length;
    if (id === 'gyoushou' && t.phase === 'buy') c -= 2 * play.filter(x => isType(x, 'action')).length;
  }
  return Math.max(0, c);
}

// ---- 効果の実行 ----

// カードの効果から使う道具。e.p は効果を使っている人（攻撃中は e.target が対象）
function effectContext(g, rng, op) {
  const e = {
    g,
    rng,
    p: op.p,
    card: op.card,
    // 場にある「この札」の実体（傾奇者が別の札として使われているときは 'kabukimono'）
    self: op.self ?? op.card,
    via: op.via ?? null,
    viaCard: op.viaCard ?? null,
    data: op.data ?? {},
    target: op.target ?? null,
    turn: g.turn,
    draw: (n, who = e.p) => draw(g, rng, who, n),
    actions: n => (g.turn.actions += n),
    buys: n => (g.turn.buys += n),
    coins: n => (g.turn.coins += n),
    gain: (id, who = e.p, to = 'discard') => gain(g, who, id, to),
    gainFromTrash: (id, who = e.p, to = 'discard') => gainFromTrash(g, who, id, to),
    cost: id => costOf(g, id),
    // 獲得した札を、置いた場所から取り出す（番所・御朱印の反応用）
    takeGained: (id, to, who = e.p) => takeGained(g, who, id, to),
    trash: (ids, who = e.p) => trashFromHand(g, who, ids),
    // 手札以外（場・めくった札など）から取り除いた札を廃棄する
    trashCard: (id, who = e.p) => trashCards(g, who, [id]),
    discard: (ids, who = e.p) => discardFromHand(g, who, ids),
    hand: (who = e.p) => g.ps[who].hand,
    others: () => others(g, e.p),
    log: text => log(g, text),
    name: (who = e.p) => nameOf(g, who),
    // 選択を求める。ask はハンドラの最後に呼ぶこと（答えは steps[step](e, answer) に届く）
    ask: (prompt, step, data = e.data) => {
      g.prompt = { p: prompt.p ?? e.target ?? e.p, ...prompt, then: { card: e.card, step, data, p: e.p, target: e.target, self: e.self } };
      normalizePrompt(g);
    },
    // 見ている札（ps.look）を、選んだ順に山札の上へ戻す（先に選んだ札ほど下）。終わったら then の命令へ
    orderOntoDeck: (who = e.p) => pushOps(g, { op: 'step', p: who, card: '_order', step: 'start', data: {} }),
    // あとで実行する命令を積む（今の処理が終わってから、積んだ順に実行される）
    // 注意: 積んだものはスタックの一番上に乗るので、先に積んである命令（e.play・e.attack など）より先に実行される。
    //       「〜のあとで」にしたいときは、later を先に呼んでから play / attack を呼ぶ
    later: (...ops) => pushOps(g, ...ops),
    step: (step, data = e.data) => pushOps(g, { op: 'step', p: e.p, card: e.card, self: e.self, step, data, target: e.target }),
    // 他の全員に攻撃する（手番順）。対象ごとに steps[step] が e.target 付きで呼ばれる
    attack: (step, data = e.data) =>
      pushOps(g, ...others(g, e.p).map(t => ({ op: 'attack', p: e.p, card: e.card, self: e.self, step, data, target: t }))),
    // 札を times 回使う。via は御前などで使ったときの印（持続札なら御前も一緒に場に残る）
    play: (id, times = 1, via = null) => {
      for (let i = 0; i < times; i++) pushOps(g, { op: 'resolve', p: e.p, card: id, via: via?.token ?? null, viaCard: via?.card ?? null, ...(via?.self ? { self: via.self } : {}) });
    },
    // 持続札の記録（使った手番の効果から、次の手番へ情報や札を渡す）
    durEntry: () => g.ps[e.p].durNext[e.data.dur],
    // 名声（勝利点トークン）
    fame: (n, who = e.p) => (g.ps[who].fame = (g.ps[who].fame ?? 0) + n),
    // 蓄え（江戸の小判トークン）
    coffers: (n, who = e.p) => (g.ps[who].coffers = (g.ps[who].coffers ?? 0) + n),
    newToken: () => `${g.turnNo}-${(g.seq = (g.seq ?? 0) + 1)}`,
  };
  return e;
}

export function others(g, pid) {
  const i = g.players.indexOf(pid);
  return Array.from({ length: g.players.length - 1 }, (_, k) => g.players[(i + 1 + k) % g.players.length]);
}

// 先に渡したものから実行されるように、逆順に積む
export function pushOps(g, ...ops) {
  for (let i = ops.length - 1; i >= 0; i--) g.stack.push(ops[i]);
}

export function run(g, rng) {
  let guard = 0;
  flushReactions(g);
  while (!g.prompt && g.stack.length) {
    if (guard++ > 10000) throw new Error('効果の処理が終わりません');
    exec(g, rng, g.stack.pop());
    flushReactions(g);
  }
}

// ルール側（logic.js）が独自の命令を登録する口（片付けなど、選択をはさむ進行のため）
const opHandlers = {};
export function setOpHandler(name, fn) {
  opHandlers[name] = fn;
}

function exec(g, rng, op) {
  if (opHandlers[op.op]) return opHandlers[op.op](g, rng, op);
  if (op.op === 'resolve') {
    const c = card(op.card);
    // 攻撃札を使ったとき、先に起きること: 悪童（場）を廃棄して雑賀衆を得るか、ほかの人の物乞い（手札）
    if (c.types.includes('attack') && !op.pre) {
      const pre = [];
      const ps = g.ps[op.p];
      const self = op.self ?? op.card;
      const urchins = ps.play.filter(x => x === 'akudou').length - (self === 'akudou' ? 1 : 0);
      if (urchins > 0 && g.supply.saikashu > 0) pre.push({ op: 'step', p: op.p, card: 'akudou', step: 'react', data: {} });
      for (const o of others(g, op.p)) if (g.ps[o].hand.includes('monogoi')) pre.push({ op: 'step', p: o, card: 'monogoi', step: 'react', data: {} });
      if (pre.length) {
        g.stack.push({ ...op, pre: true });
        pushOps(g, ...pre);
        return;
      }
    }
    const e = effectContext(g, rng, op);
    if (c.next) {
      const ps = g.ps[op.p];
      ps.durNext.push({ id: op.card, physical: op.self ?? null, data: {}, held: [], via: op.via ?? null, viaCard: op.viaCard ?? null });
      e.data = { dur: ps.durNext.length - 1 };
    }
    c.play?.(e);
  } else if (op.op === 'next') {
    const e = effectContext(g, rng, op);
    e.entry = op.entry;
    card(op.card).next(e);
  } else if (op.op === 'step') {
    card(op.card).steps[op.step](effectContext(g, rng, op), op.answer);
  } else if (op.op === 'attack') {
    const blocker = blockedBy(g, op.target);
    if (blocker) {
      log(g, `${nameOf(g, op.target)} は${card(blocker).name}で身を守った`);
      return;
    }
    card(op.card).steps[op.step](effectContext(g, rng, op));
  } else {
    throw new Error('不明な命令: ' + op.op);
  }
}

// 攻撃を防ぐカード（手札のリアクション、または場に残っている守りの持続札）。持っていれば自動で公開する
function blockedBy(g, pid) {
  const ps = g.ps[pid];
  return ps.hand.find(id => card(id).reaction === 'block') ?? ps.dur.find(id => card(id).protect) ?? null;
}

// ---- 選択 ----

// 候補が無い選択は自動で飛ばし、上限・下限を候補の数に合わせる
function normalizePrompt(g) {
  const pr = g.prompt;
  const cands = candidates(g, pr);
  pr.max = Math.min(pr.max ?? 1, pr.kind === 'option' ? 1 : cands.length);
  pr.min = Math.min(pr.min ?? 0, pr.max);
  if (pr.kind !== 'option' && cands.length === 0) {
    resume(g, pr.kind === 'hand' ? [] : null);
  }
}

export function candidates(g, pr) {
  if (pr.kind === 'hand') {
    return g.ps[pr.p].hand.filter(id => (!pr.types || pr.types.some(t => isType(id, t))) && (!pr.ids || pr.ids.includes(id)));
  }
  if (pr.kind === 'list') return pr.cards.slice(); // 見せた札の中から1枚選ぶ
  if (pr.kind === 'name') return nameableCards(g); // 札の名前を1つ言う（町医者・渡り職人など）
  if (pr.kind === 'supply') {
    return Object.keys(g.supply).filter(
      id =>
        (g.supply[id] > 0 || pr.allPiles) &&
        !card(id).notSupply &&
        (pr.maxCost === undefined || costOf(g, id) <= pr.maxCost) &&
        (pr.exactCost === undefined || costOf(g, id) === pr.exactCost) &&
        (!pr.types || pr.types.some(t => isType(id, t))),
    );
  }
  return pr.options.map(o => o.value);
}

// 「札の名前を言う」ときの候補: このゲームに出てくる札（供給の札と、誰かが持っている札）
export function nameableCards(g) {
  const ids = new Set(Object.keys(g.supply).filter(id => id !== 'ruins' && id !== 'bushi'));
  for (const id of g.ruinsPile ?? []) ids.add(id);
  for (const id of g.knightsPile ?? []) ids.add(id);
  for (const p of g.players) for (const id of allCards(g, p)) ids.add(id);
  return [...ids].sort((a, b) => costOf(g, a) - costOf(g, b));
}

function resume(g, answer) {
  const { then } = g.prompt;
  g.prompt = null;
  g.stack.push({ op: 'step', p: then.p, card: then.card, self: then.self, step: then.step, data: then.data, target: then.target, answer });
}

export function answer(g, rng, pid, ans) {
  const pr = g.prompt;
  if (!pr) throw new GameError('今は選ぶ場面ではありません');
  if (pr.p !== pid) throw new GameError('ほかの人が選んでいます');
  const cands = candidates(g, pr);
  if (pr.kind === 'hand') {
    if (!Array.isArray(ans)) throw new GameError('札を選んでください');
    if (ans.length < pr.min || ans.length > pr.max) {
      throw new GameError(pr.min === pr.max ? `${pr.min}枚選んでください` : `${pr.min}〜${pr.max}枚選んでください`);
    }
    const pool = cands.slice();
    for (const id of ans) {
      const i = pool.indexOf(id);
      if (i < 0) throw new GameError('その札は選べません');
      pool.splice(i, 1);
    }
  } else if (pr.kind === 'supply') {
    if (ans === null) {
      if (pr.min > 0) throw new GameError('札を選んでください');
    } else if (!cands.includes(ans)) throw new GameError('その札は獲得できません');
  } else if (!cands.includes(ans)) throw new GameError('選択肢から選んでください');
  resume(g, ans);
  run(g, rng);
}
