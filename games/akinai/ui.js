// あきない通りの画面
//   盤: 8×8 の外周に28マス。まんなかに福引き盤（6×6）
//   下（PC では右）: 手番の操作（振る・めくる・買う・増資・株）、町の株価、プレイヤー
// 演出は view.fx（seq つきの出来事）のうち、まだ再生していないものを順番に再生する
import { h } from '../../js/util.js';
import { Anim, clearFx, confetti, floatText, fly, gust, spotlight, withAnim } from '../../js/fx.js';
import {
  AREAS, AREA_INFO, CARDS, FUKU_SIZE, GOALS, LINES, MARKS, MARK_INFO, MAX_STOCK_BUY, ROUNDS, SELL_RATE, SQUARES, squarePos,
} from './logic.js';

const COLORS = ['#e8524a', '#3b82f6', '#22a35a', '#9b5de5'];
const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const yen = n => `${n.toLocaleString('ja-JP')}G`;

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🏪 あきない通りの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '目標資産（届いた状態で銀行に戻れば勝ち）'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, goal: Number(e.target.value) }) },
        GOALS.map(n => h('option', { value: n, selected: options.goal === n }, `${yen(n)}${n === 4000 ? '（標準・約15ラウンド）' : n < 4000 ? '（短め）' : '（長め）'}`)),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, '最大ラウンド（ここまでで決着しなければ資産の多い人の勝ち）'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUNDS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}ラウンド`)),
      ),
    ),
  );
}

export function createUI(root, api) {
  let view = null;
  let seen = null; // 再生し終えた出来事の seq
  const anim = new Anim();
  const timers = [];
  let busyUntil = 0; // 演出の予定がここまで埋まっている
  const hidden = {}; // 動いている途中のコマ（p → 見えるようになる時刻）
  const priceDir = {};
  let rollSeq = 0; // 最後に再生したサイコロの出来事（上部のサイコロを転がす用）
  // 画面だけの状態
  let investAt = null;
  let investAmt = 50;
  let stockArea = null;
  let stockN = 10;
  let sellArea = null;
  let sellN = 1;
  let showRules = false;

  const send = a => api.send(a);
  const P = id => view.players.find(p => p.id === id);
  const colorOf = id => COLORS[view.players.findIndex(p => p.id === id)] ?? '#888';
  const nameOf = id => P(id)?.name ?? '?';
  const myTurn = () => view.phase !== 'over' && view.turn?.p === view.me;
  const me = () => P(view.me);

  // ---- 盤 ----
  function square(i) {
    const sq = SQUARES[i];
    const { x, y } = squarePos(i);
    const here = view.players.filter(p => p.pos === i);
    const tokens = h('div', { class: 'ak-tokens' }, here.map(p => h('span', {
      class: ['ak-token', (hidden[p.id] ?? 0) > performance.now() && 'ak-hide'].filter(Boolean).join(' '),
      'data-token': p.id,
      style: { background: colorOf(p.id) },
      title: p.name,
    }, p.name.slice(0, 1))));
    const base = { 'data-sq': i, style: { gridColumn: x + 1, gridRow: y + 1 } };
    if (sq.k === 'shop') {
      const s = view.shops[i];
      const area = AREA_INFO[sq.area];
      const owner = s.owner;
      return h('div', withAnim(anim, `sq-${i}`, 'fx-bump', 500, {
        ...base,
        class: ['ak-sq', 'shop', owner && 'owned'].filter(Boolean).join(' '),
        style: owner ? { ...base.style, boxShadow: `inset 0 0 0 3px ${colorOf(owner)}`, background: `color-mix(in srgb, ${colorOf(owner)} 20%, #fbf6ec)` } : base.style,
        title: `${area.name}・${sq.name}（価値 ${s.value}G・買物料 ${s.fee}G・上限 ${s.cap}G）${owner ? `／${nameOf(owner)}の店` : '／空き店'}`,
      }),
      h('span', { class: 'ak-band', style: { background: area.color } }),
      me()?.stocks[sq.area] ? h('span', { class: 'ak-mine-stock', title: 'あなたはこの町の株を持っています（ここで買物料が払われると配当）' }, '📈') : null,
      h('span', { class: 'ak-name' }, sq.name),
      h('b', { class: 'ak-val' }, s.value),
      owner ? h('span', { class: 'ak-fee' }, `買${s.fee}`) : h('span', { class: 'ak-fee muted' }, '空き'),
      tokens);
    }
    const label = sq.k === 'bank' ? ['🏦', '銀行'] : sq.k === 'chance' ? ['❓', '福引き'] : [MARK_INFO[sq.mark].icon, MARK_INFO[sq.mark].name];
    return h('div', { ...base, class: `ak-sq ${sq.k}${sq.mark ? ` ${sq.mark}` : ''}` },
      h('span', { class: 'ak-icon' }, label[0]),
      h('span', { class: 'ak-name' }, label[1]),
      tokens);
  }

  function fukuBoard() {
    const picking = myTurn() && view.phase === 'pick';
    const doneCells = new Set(view.fuku.done.flatMap(li => LINES[li]));
    return h('div', withAnim(anim, 'newboard', 'fx-flip', 600, { class: ['ak-fuku', picking && 'picking'].filter(Boolean).join(' ') }),
      h('div', { class: 'ak-fuku-title' }, '🎴 福引き盤', h('small', {}, picking ? ' めくるマスをタップ！' : ' 1列そろうと並べボーナス')),
      h('div', { class: 'ak-fuku-grid', style: { gridTemplateColumns: `repeat(${FUKU_SIZE}, 1fr)` } },
        view.fuku.cells.map((c, i) => {
          if (!c) {
            return h('button', {
              class: 'ak-fk', type: 'button', 'data-cell': i, disabled: !picking,
              onclick: picking ? () => send({ type: 'pick', cell: i }) : null,
              'aria-label': `福引き ${i + 1}`,
            }, '🎴');
          }
          let attrs = withAnim(anim, `fk-${i}`, 'fx-flip', 600, {
            class: ['ak-fk', 'open', doneCells.has(i) && 'done'].filter(Boolean).join(' '),
            'data-cell': i,
            style: { boxShadow: `inset 0 0 0 3px ${colorOf(c.by)}` },
            title: `${nameOf(c.by)}: ${CARDS[c.card].text}`,
          });
          attrs = withAnim(anim, `fkl-${i}`, 'fx-glow', 1200, attrs);
          return h('div', attrs, CARDS[c.card].icon);
        }),
      ),
    );
  }

  function board() {
    return h('div', { class: 'ak-board' },
      SQUARES.map((_, i) => square(i)),
      h('div', { class: 'ak-center' }, fukuBoard()),
    );
  }

  // ---- 手番の操作 ----
  function status() {
    if (view.phase === 'over') {
      const reason = view.endReason === 'goal' ? '目標資産に届いて銀行に到着！' : view.endReason === 'bankrupt' ? '破産が出たので、資産の多い人の勝ち' : '最大ラウンドに達したので、資産の多い人の勝ち';
      return h('div', { class: 'result-box' },
        h('h3', {}, `🏆 ${nameOf(view.winner)} の勝ち！`),
        h('div', { class: 'small' }, reason),
        h('ol', { class: 'small' }, view.players.slice().sort((a, b) => b.worth - a.worth).map(p => h('li', {}, `${p.name}: 資産 ${yen(p.worth)}`))),
        h('div', { class: 'game-actions' },
          view.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'restart' }) }, '🔁 同じメンバーでもう一度') : null,
          api.backToLobby ? h('button', { class: 'btn', type: 'button', onclick: () => api.backToLobby() }, '🏠 ロビーに戻る') : null,
        ),
      );
    }
    const t = view.turn;
    const roll = t.roll ? h('span', withAnim(anim, `dice-${rollSeq}`, 'ak-tumble', 1100, { class: 'ak-dice' }), DICE[t.roll]) : null;
    const what = {
      roll: 'サイコロを振る前',
      moving: '移動中',
      resolving: '福引き',
      pick: '福引き盤をめくる',
      action: '買う・増資・株',
      debt: '借金を返す',
    }[view.phase];
    return h('div', { class: 'ak-status' },
      roll,
      h('div', {},
        h('strong', {}, myTurn() ? '🟡 あなたの手番' : `${nameOf(t.p)} の手番`),
        h('span', { class: 'small' }, `（${view.round} / ${view.rounds}ラウンド・${what}）`),
        h('div', { class: 'small muted' }, `目標資産 ${yen(view.goal)}。届いた状態で銀行に戻れば勝ち`),
      ),
    );
  }

  const stepper = (value, set, steps, min, max) => h('span', { class: 'ak-step' },
    steps.map(d => h('button', { class: 'ak-chip', type: 'button', disabled: value + d < min, onclick: () => { set(Math.max(min, value + d)); render(); } }, `${d}`)),
    h('b', {}, value),
    steps.slice().reverse().map(d => h('button', { class: 'ak-chip', type: 'button', disabled: value - d > max, onclick: () => { set(Math.min(max, value - d)); render(); } }, `+${-d}`)),
    h('button', { class: 'ak-chip', type: 'button', disabled: max < min, onclick: () => { set(Math.max(min, max)); render(); } }, '最大'),
  );

  function sellStockBox() {
    const mine = me();
    const owned = AREAS.filter(a => mine.stocks[a]);
    if (!owned.length) return null;
    if (!owned.includes(sellArea)) sellArea = owned[0];
    const max = mine.stocks[sellArea];
    sellN = Math.min(Math.max(1, sellN), max);
    return h('div', { class: 'ak-panel' },
      h('div', { class: 'ak-panel-title' }, '📉 株を売る'),
      h('div', { class: 'ak-row' }, owned.map(a => h('button', { class: ['ak-chip', 'area', sellArea === a && 'on'].filter(Boolean).join(' '), type: 'button', style: { borderLeftColor: AREA_INFO[a].color }, onclick: () => { sellArea = a; render(); } }, `${AREA_INFO[a].name} ${mine.stocks[a]}株`))),
      h('div', { class: 'ak-row' }, stepper(sellN, v => { sellN = v; }, [-10, -1], 1, max),
        h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'sellStock', area: sellArea, n: sellN }) }, `${sellN}株を${yen(sellN * view.prices[sellArea])}で売る`)),
    );
  }

  function actions() {
    if (!myTurn()) {
      const t = view.turn;
      if (view.phase === 'over' || !t) return null;
      return h('div', { class: 'ak-panel muted' }, view.phase === 'pick' ? `${nameOf(t.p)} が福引き盤を選んでいます…` : `${nameOf(t.p)} の手番です`);
    }
    const t = view.turn;
    const mine = me();
    if (view.phase === 'roll') {
      return h('div', { class: 'ak-actions' },
        h('button', { class: 'btn primary ak-big', type: 'button', onclick: () => send({ type: 'roll' }) }, '🎲 サイコロを振る'),
        sellStockBox(),
      );
    }
    if (view.phase === 'pick') return h('div', { class: 'ak-panel' }, h('strong', {}, '🎴 福引き盤の伏せ札を1枚タップしてめくってください'));
    if (view.phase === 'debt') {
      const myShops = Object.entries(view.shops).filter(([, s]) => s.owner === view.me);
      return h('div', { class: 'ak-actions' },
        h('div', { class: 'ak-panel warn' }, h('strong', {}, `⚠️ 現金が ${yen(-mine.cash)} 足りません。株か店を売って返してください`)),
        sellStockBox(),
        myShops.length ? h('div', { class: 'ak-panel' },
          h('div', { class: 'ak-panel-title' }, `🏚️ 店を銀行に売る（価値の${SELL_RATE * 100}%）`),
          h('div', { class: 'ak-row' }, myShops.map(([i, s]) => h('button', { class: 'btn small', type: 'button', onclick: () => send({ type: 'sellShop', at: Number(i) }) }, `${SQUARES[i].name} ${yen(Math.floor(s.value * SELL_RATE))}`))),
        ) : null,
      );
    }
    if (view.phase !== 'action') return null;
    const parts = [];
    if (t.buyable !== null) {
      const sq = SQUARES[t.buyable];
      parts.push(h('div', { class: 'ak-panel' },
        h('div', { class: 'ak-panel-title' }, `🏪 空き店: ${AREA_INFO[sq.area].name}の${sq.name}`),
        h('div', { class: 'small' }, `同じ町の店が多いほど買物料が上がります（いま${AREA_INFO[sq.area].name}に ${Object.entries(view.shops).filter(([i, s]) => s.owner === view.me && SQUARES[i].area === sq.area).length}軒）`),
        h('button', { class: 'btn primary', type: 'button', disabled: mine.cash < sq.base, onclick: () => send({ type: 'buy' }) }, `${yen(sq.base)}で買う`),
      ));
    }
    if (t.investArea) {
      const list = Object.entries(view.shops).filter(([i, s]) => s.owner === view.me && (t.investArea === 'all' || SQUARES[i].area === t.investArea) && s.cap > s.value).map(([i]) => Number(i));
      if (list.length) {
        if (!list.includes(investAt)) investAt = list[0];
        const s = view.shops[investAt];
        const max = Math.min(s.cap - s.value, mine.cash);
        investAmt = Math.min(Math.max(10, investAmt), Math.max(10, max));
        parts.push(h('div', { class: 'ak-panel' },
          h('div', { class: 'ak-panel-title' }, `✨ 増資${t.investArea === 'all' ? '（銀行: どの店でも）' : `（${AREA_INFO[t.investArea].name}の店）`}`),
          h('div', { class: 'ak-row' }, list.map(i => h('button', { class: ['ak-chip', 'area', investAt === i && 'on'].filter(Boolean).join(' '), type: 'button', style: { borderLeftColor: AREA_INFO[SQUARES[i].area].color }, onclick: () => { investAt = i; render(); } }, `${SQUARES[i].name} ${view.shops[i].value}/${view.shops[i].cap}`))),
          h('div', { class: 'ak-row' }, stepper(investAmt, v => { investAmt = v; }, [-100, -10], 10, max),
            h('button', { class: 'btn', type: 'button', disabled: max < 10 || investAmt > max, onclick: () => send({ type: 'invest', at: investAt, amount: investAmt }) }, `${yen(investAmt)}増資`)),
          h('div', { class: 'small muted' }, '店の価値が上がると買物料と、その町の株価が上がります'),
        ));
      }
    }
    if (t.stock) {
      if (!AREAS.includes(stockArea)) stockArea = 'A';
      const price = view.prices[stockArea];
      const max = Math.min(MAX_STOCK_BUY, Math.floor(mine.cash / price));
      stockN = Math.min(Math.max(1, stockN), Math.max(1, max));
      parts.push(h('div', { class: 'ak-panel' },
        h('div', { class: 'ak-panel-title' }, '📈 株を買う（銀行。1つの町だけ）'),
        h('div', { class: 'ak-row' }, AREAS.map(a => h('button', { class: ['ak-chip', 'area', stockArea === a && 'on'].filter(Boolean).join(' '), type: 'button', style: { borderLeftColor: AREA_INFO[a].color }, onclick: () => { stockArea = a; render(); } }, `${AREA_INFO[a].name} ${view.prices[a]}G`))),
        h('div', { class: 'ak-row' }, stepper(stockN, v => { stockN = v; }, [-10, -1], 1, max),
          h('button', { class: 'btn', type: 'button', disabled: max < 1, onclick: () => send({ type: 'buyStock', area: stockArea, n: stockN }) }, `${stockN}株を${yen(stockN * price)}で買う`)),
        h('div', { class: 'small muted' }, 'その町の店で買物料が払われると配当が入ります'),
      ));
    }
    parts.push(h('button', { class: 'btn primary ak-big', type: 'button', onclick: () => send({ type: 'end' }) }, t.again ? '🎲 もう一度振る' : '手番を終える'));
    return h('div', { class: 'ak-actions' }, parts);
  }

  function stockTable() {
    const mine = me();
    return h('div', { class: 'ak-panel ak-stocks' },
      h('div', { class: 'ak-panel-title' }, '🏯 町と株価'),
      h('div', { class: 'small muted' }, '株を持っている町の店で買物料が払われると配当が入ります。株価は町の店の価値で上がります。'),
      AREAS.map(a => {
        const owners = view.players.filter(p => Object.entries(view.shops).some(([i, s]) => s.owner === p.id && SQUARES[i].area === a));
        const dir = anim.attrs(`price-${a}`, '', 1500) ? priceDir[a] : 0;
        return h('div', withAnim(anim, `price-${a}`, 'fx-flash', 900, { class: 'ak-stock-row', 'data-area': a }),
          h('span', { class: 'ak-area-dot', style: { background: AREA_INFO[a].color } }),
          h('span', { class: 'ak-area-name' }, AREA_INFO[a].name),
          h('b', {}, `${view.prices[a]}G`),
          dir ? h('b', { class: dir > 0 ? 'fx-up' : 'fx-down' }, dir > 0 ? '▲' : '▼') : null,
          h('span', { class: 'small muted ak-owners', title: 'この町に店を持っている人' }, owners.length ? '店:' : '', owners.map(p => h('span', { class: 'ak-own-dot', style: { background: colorOf(p.id) } }))),
          mine?.stocks[a]
            ? h('div', withAnim(anim, `stk-${mine.id}-${a}`, 'fx-bump', 500, { class: 'ak-my-stock' }), `📈 あなた ${mine.stocks[a]}株（時価 ${yen(mine.stocks[a] * view.prices[a])}）`)
            : null,
          h('div', { class: 'ak-holders' }, view.players.filter(p => p.stocks[a] && p.id !== view.me).map(p => h('span', { class: 'ak-holder', style: { background: colorOf(p.id) } }, `${p.name} ${p.stocks[a]}株`))),
        );
      }),
    );
  }

  const shopTotal = id => Object.values(view.shops).reduce((a, s) => a + (s.owner === id ? s.value : 0), 0);
  const stockTotal = p => AREAS.reduce((a, ar) => a + p.stocks[ar] * view.prices[ar], 0);
  // 持っている株（町の色のチップ）
  function stockChips(p) {
    const owned = AREAS.filter(a => p.stocks[a]);
    if (!owned.length) return h('div', { class: 'ak-stock-chips small muted' }, '📈 株なし');
    return h('div', { class: 'ak-stock-chips' }, h('span', { class: 'small' }, '📈'),
      owned.map(a => h('span', withAnim(anim, `stk-${p.id}-${a}`, 'fx-bump', 500, { class: 'ak-stock-chip', style: { borderLeftColor: AREA_INFO[a].color }, title: `${AREA_INFO[a].name}の株 ${p.stocks[a]}株（時価 ${yen(p.stocks[a] * view.prices[a])}）` }), `${AREA_INFO[a].name} `, h('b', {}, p.stocks[a]), '株')));
  }

  function seats() {
    return h('div', { class: 'seats ak-seats' },
      view.players.map(p => h('div', withAnim(anim, `seat-${p.id}`, 'fx-bump', 500, { class: ['seat', view.turn?.p === p.id && view.phase !== 'over' && 'turn', p.id === view.me && 'me'].filter(Boolean).join(' '), 'data-seat': p.id }),
        h('div', { class: 'name' }, h('span', { class: 'ak-dot', style: { background: colorOf(p.id) } }), p.bot ? '🤖 ' : '', p.name, h('small', { class: 'muted' }, ` 段位${p.level}`)),
        h('div', { class: 'small' }, '現金 ', h('b', { 'data-cash': p.id }, yen(p.cash)), `・店${p.shops}軒`),
        h('div', { class: 'small' }, `資産 ${yen(p.worth)}`, h('span', { class: 'ak-meter' }, h('i', { style: { width: `${Math.min(100, (p.worth / view.goal) * 100)}%`, background: colorOf(p.id) } }))),
        h('div', { class: 'small muted' }, `内訳: 現金 ${yen(p.cash)}・店 ${yen(shopTotal(p.id))}・株 ${yen(stockTotal(p))}`),
        stockChips(p),
        h('div', { class: 'ak-marks' }, MARKS.map(m => h('span', { class: ['ak-mark', p.marks.includes(m) && 'on'].filter(Boolean).join(' '), 'data-mark': `${p.id}-${m}`, title: MARK_INFO[m].name }, MARK_INFO[m].icon)),
          h('small', { class: 'muted' }, ` 給料 ${yen(p.salary)}`)),
      )),
    );
  }

  function render() {
    if (!view) return;
    root.replaceChildren(
      h('div', { class: 'table ak-table' },
        status(),
        h('div', { class: 'ak-main' },
          h('div', { class: 'ak-board-wrap' }, board()),
          h('div', { class: 'ak-side' }, actions(), seats(), stockTable()),
        ),
        h('details', { open: showRules, ontoggle: e => { showRules = e.target.open; } },
          h('summary', { class: 'small' }, 'ルール・福引きの札'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
          h('ul', { class: 'small' }, Object.values(CARDS).map(c => h('li', {}, `${c.icon} ${c.text}（${c.n}枚）`))),
        ),
        h('div', { class: 'log' }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  // ---- 演出 ----
  const sqEl = i => root.querySelector(`[data-sq="${i}"]`);
  const seatEl = p => root.querySelector(`[data-seat="${p}"]`);
  const cellEl = c => root.querySelector(`[data-cell="${c}"]`);
  const later = (ms, f) => timers.push(setTimeout(f, ms));
  const tokenEl = p => {
    const el = h('span', { class: 'ak-token fly', style: { background: colorOf(p) } }, nameOf(p).slice(0, 1));
    return el;
  };
  const money = (p, d, delay = 0, extra = '') => floatText(seatEl(p), `${d > 0 ? '+' : ''}${d}G${extra}`, { color: d > 0 ? '#ffd36b' : '#ff8a7a', delay });
  const spot = (icon, text, sub) => spotlight(h('div', { class: 'ak-spot' }, h('div', { class: 'ak-spot-icon' }, icon), h('div', { class: 'ak-spot-text' }, text), sub ? h('div', { class: 'ak-spot-sub' }, sub) : null), { duration: 1400 });

  // 画面の中央でサイコロが転がり、面がだんだんゆっくり変わって出目で止まる
  function rollDice(e) {
    const face = h('div', { class: 'ak-bigdie rolling' }, DICE[1 + Math.floor(Math.random() * 6)]);
    const text = h('div', { class: 'ak-spot-text' }, '　');
    spotlight(h('div', { class: 'ak-spot ak-roll-spot' }, face, text, h('div', { class: 'ak-spot-sub' }, `${nameOf(e.p)} のサイコロ`)), { duration: 1900 });
    let wait = 60;
    let elapsed = 0;
    let last = 0;
    const tick = () => {
      if (elapsed >= 850) {
        face.textContent = DICE[e.n];
        face.classList.remove('rolling');
        face.classList.add('landed');
        text.textContent = `${e.n}！`;
        return;
      }
      let n;
      do n = 1 + Math.floor(Math.random() * 6); while (n === last);
      last = n;
      face.textContent = DICE[n];
      elapsed += wait;
      wait = Math.round(wait * 1.18);
      later(wait, tick);
    };
    tick();
  }

  // 出来事1つを再生して、かかる時間（ミリ秒）を返す
  function play(e) {
    switch (e.k) {
      case 'roll':
        rollSeq = e.seq;
        anim.start(`dice-${e.seq}`);
        render();
        rollDice(e);
        return DUR.roll;
      case 'move': {
        const step = 170;
        hidden[e.p] = performance.now() + step * (e.path.length - 1) + 200;
        render();
        for (let k = 0; k + 1 < e.path.length; k++) fly(sqEl(e.path[k]), sqEl(e.path[k + 1]), tokenEl(e.p), { duration: step + 40, delay: k * step, className: 'ak-hop' });
        later(step * (e.path.length - 1) + 200, render);
        return step * (e.path.length - 1) + 150;
      }
      case 'warp':
        hidden[e.p] = performance.now() + 700;
        render();
        fly(sqEl(e.from), sqEl(e.to), tokenEl(e.p), { duration: 700, scale: 1.6 });
        later(720, render);
        return 750;
      case 'mark': {
        const from = e.at !== null ? sqEl(e.at) : root.querySelector('.ak-fuku');
        fly(from, root.querySelector(`[data-mark="${e.p}-${e.mark}"]`), MARK_INFO[e.mark].icon, { duration: 700, scale: 1.3 });
        return 300;
      }
      case 'salary':
        spot('🎊', `段位アップ！ 給料 ${yen(e.amount)}`, `${nameOf(e.p)}・段位${e.level}`);
        MARKS.forEach((m, k) => fly(seatEl(e.p), { left: innerWidth * (0.2 + k * 0.2), top: innerHeight * 0.3, width: 0, height: 0 }, MARK_INFO[m].icon, { duration: 900, delay: k * 120, scale: 1.8 }));
        confetti({ count: 40 });
        money(e.p, e.amount, 600);
        anim.start(`seat-${e.p}`);
        return 1500;
      case 'buy':
        anim.start(`sq-${e.at}`);
        render();
        fly(seatEl(e.p), sqEl(e.at), '🏪', { duration: 600 });
        money(e.p, -e.amount);
        return 500;
      case 'fee':
        fly(seatEl(e.from), seatEl(e.to), '💰', { duration: 750, scale: 1.3 });
        if (e.at !== null) floatText(sqEl(e.at), `買物料 ${e.amount}G`, { color: '#fff' });
        money(e.from, -e.amount);
        money(e.to, e.amount, 600);
        return 800;
      case 'div':
        anim.start(`stk-${e.p}-${e.area}`);
        render();
        fly(root.querySelector(`.ak-stock-row[data-area="${e.area}"]`), seatEl(e.p), '💹', { duration: 600 });
        money(e.p, e.amount, 400, ' 配当');
        return 350;
      case 'invest':
        anim.start(`sq-${e.at}`);
        render();
        floatText(sqEl(e.at), `${e.bonus ? '🏮' : '✨'}+${e.amount}`, { color: '#ffe680' });
        return e.bonus ? 250 : 450;
      case 'stock':
        anim.started.delete(`stk-${e.p}-${e.area}`);
        anim.start(`stk-${e.p}-${e.area}`);
        markPrice(e.area);
        floatText(root.querySelector(`.ak-stock-row[data-area="${e.area}"]`), `${e.buy ? '📈' : '📉'} ${e.n}株`, { color: '#fff' });
        if (e.amount) money(e.p, e.buy ? -e.amount : e.amount, 300);
        return 500;
      case 'card': {
        anim.start(`fk-${e.cell}`);
        render();
        const c = CARDS[e.card];
        spot(c.icon, c.text, `${nameOf(e.p)} の福引き`);
        return 1300;
      }
      case 'bingo':
        e.cells.forEach(c => anim.start(`fkl-${c}`));
        render();
        e.cells.forEach((c, k) => floatText(cellEl(c), '★', { color: '#fff6b0', delay: k * 80 }));
        later(500, () => spot('🎯', `並べボーナス！ ${yen(e.amount)}`, nameOf(e.p)));
        money(e.p, e.amount, 900);
        return 1800;
      case 'money':
        if (e.amount) money(e.p, e.amount);
        return 350;
      case 'price':
        markPrice(e.area, e.d);
        return 500;
      case 'newboard':
        anim.start('newboard');
        render();
        return 600;
      case 'sell':
        anim.start(`sq-${e.at}`);
        render();
        fly(sqEl(e.at), seatEl(e.p), '💰', { duration: 600 });
        money(e.p, e.amount, 400);
        return 500;
      case 'bankrupt':
        gust('💸');
        return 1300;
      case 'win':
        confetti();
        spot('🏆', `${nameOf(e.p)} の勝ち！`, '');
        return 1500;
    }
    return 0;
  }

  function markPrice(area, d = 0) {
    if (d) priceDir[area] = Math.sign(d);
    anim.started.delete(`price-${area}`);
    anim.start(`price-${area}`);
    render();
  }

  function playNew() {
    const fresh = view.fx.filter(e => e.seq > seen);
    seen = view.seq;
    if (!fresh.length || reduced()) return;
    // 前の演出がまだ続いていれば、その後ろにつなげる（たまりすぎたら詰める）
    const now = performance.now();
    let t = Math.max(0, Math.min(busyUntil - now, 2500));
    for (const e of fresh) {
      // 移動の演出が始まるまで、コマを移動先に先回りして出さない
      if (e.k === 'move' || e.k === 'warp') hidden[e.p] = Math.max(hidden[e.p] ?? 0, now + t + durationOf(e) + 100);
      later(t, () => {
        try {
          play(e);
        } catch (err) {
          console.error(err);
        }
      });
      t += durationOf(e);
    }
    busyUntil = now + t;
    later(t + 1600, render); // 演出の CSS が終わったら描き直す
  }

  const DUR = { roll: 1500, warp: 750, mark: 300, salary: 1500, buy: 500, fee: 800, div: 350, stock: 500, card: 1300, bingo: 1800, money: 350, price: 500, newboard: 600, sell: 500, bankrupt: 1300, win: 1500 };
  function durationOf(e) {
    if (e.k === 'move') return 170 * (e.path.length - 1) + 150;
    if (e.k === 'invest') return e.bonus ? 250 : 450;
    return DUR[e.k] ?? 0;
  }

  return {
    update(next) {
      // ホストの画面にはゲームの状態そのものが渡るので写しを持つ
      view = structuredClone(next);
      if (seen === null) seen = view.seq; // 開いた時点より前の出来事は再生しない
      if (view.seq < seen) seen = view.seq;
      render();
      requestAnimationFrame(playNew);
    },
    destroy() {
      timers.forEach(clearTimeout);
      clearFx();
      root.replaceChildren();
    },
  };
}
