// 島ひらきの画面
//   盤面（SVG）: マス・村・城下町・道。建てるモードのとき、置ける場所が光ってタップで建てる
//   下: 季節札（今と次）、自分の資源、建てる、市場、交換、プレイヤー
import { h } from '../../js/util.js';
import {
  BUILD_INFO, COSTS, GOALS, PRICE_MAX, RES, RES_INFO, SIZE, TERRAIN, TYPHOON_LIMIT, allEdges, edgeEnds, neighbors, parseV, vertexEdges,
} from './logic.js';

const COLORS = ['#e8524a', '#3b82f6', '#f2b705', '#9b5de5'];
const TILE = 64;
const PAD = 22;
const SVG_NS = 'http://www.w3.org/2000/svg';
const TERRAIN_ICON = { forest: '🌲', mountain: '🪨', field: '🌾', beach: '🧂', waste: '🏜️' };

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🏝️ 島ひらきの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '勝利点（先に届いた人の勝ち）'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, goal: Number(e.target.value) }) },
        GOALS.map(n => h('option', { value: n, selected: options.goal === n }, `${n}点${n === 8 ? '（標準・約20分）' : n < 8 ? '（短め）' : '（長め）'}`)),
      ),
    ),
  );
}

const costText = cost => RES.filter(r => cost[r]).map(r => `${RES_INFO[r].icon}${cost[r]}`).join(' ');
const bagText = bag => RES.filter(r => bag?.[r]).map(r => `${RES_INFO[r].icon}${bag[r]}`).join(' ');

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

export function createUI(root, api) {
  let view = null;
  let mode = null; // 'road' | 'village' | 'town'（建てるモード）
  let marketGive = null;
  let marketGet = null;
  let trade = { give: {}, get: {} };

  const me = () => view.players.find(p => p.id === view.me);
  const colorOf = id => COLORS[view.players.findIndex(p => p.id === id)] ?? '#888';
  const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
  const myTurn = () => view.phase === 'play' && view.turn?.p === view.me;
  const setupTurn = () => view.phase === 'setup' && view.setup.order[view.setup.idx] === view.me;
  const canPay = cost => !!view.myRes && RES.every(r => view.myRes[r] >= (cost[r] ?? 0));
  const send = a => api.send(a);

  // 置ける場所（logic.js と同じ規則。最終的な判定はホスト）
  function villageOk(v) {
    if (view.villages[v] || neighbors(v).some(n => view.villages[n])) return false;
    if (view.phase === 'setup') return true;
    return vertexEdges(v).some(e => view.roads[e] === view.me);
  }
  function roadOk(e) {
    if (view.roads[e] !== undefined) return false;
    const ends = edgeEnds(e);
    if (view.phase === 'setup') return ends.includes(view.setup.last);
    return ends.some(v => {
      const b = view.villages[v];
      if (b) return b.p === view.me;
      return vertexEdges(v).some(x => x !== e && view.roads[x] === view.me);
    });
  }
  function currentMode() {
    if (setupTurn()) return view.setup.step;
    return myTurn() ? mode : null;
  }

  function place(kind, at) {
    send({ type: kind, at });
    if (view.phase === 'play') mode = null;
  }

  // ---- 盤面 ----
  function board() {
    const W = SIZE * TILE + PAD * 2;
    const pt = v => {
      const [i, j] = parseV(v);
      return [PAD + i * TILE, PAD + j * TILE];
    };
    const m = currentMode();
    const layers = [];
    // 海とマス
    layers.push(svg('rect', { x: 0, y: 0, width: W, height: W, rx: 18, fill: '#2c6e9a' }));
    for (const t of view.tiles) {
      const x = PAD + t.x * TILE;
      const y = PAD + t.y * TILE;
      const hot = view.card?.kind === 'season' && view.card.t.includes(t.t);
      layers.push(svg('rect', { x: x + 1, y: y + 1, width: TILE - 2, height: TILE - 2, rx: 6, fill: TERRAIN[t.t].color, stroke: hot ? '#fff6b0' : 'none', 'stroke-width': hot ? 3 : 0 }));
      layers.push(svg('text', { x: x + TILE / 2, y: y + TILE / 2 + 9, 'text-anchor': 'middle', 'font-size': 26, opacity: 0.85 }, TERRAIN_ICON[t.t]));
    }
    // 道
    for (const e of allEdges()) {
      const [a, b] = edgeEnds(e).map(pt);
      const owner = view.roads[e];
      if (owner !== undefined) {
        layers.push(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#2b2014', 'stroke-width': 9, 'stroke-linecap': 'round' }));
        layers.push(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: colorOf(owner), 'stroke-width': 6, 'stroke-linecap': 'round' }));
      } else if (m === 'road' && roadOk(e)) {
        layers.push(svg('line', { class: 'sh-spot', x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#fff6b0', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': '6 5' }));
        // 押しやすいよう、透明の太い線を重ねる
        layers.push(svg('line', { class: 'sh-hit', 'data-edge': e, x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'transparent', 'stroke-width': 22, onclick: () => place('road', e) }));
      }
    }
    // 村・城下町
    for (let j = 0; j <= SIZE; j++) {
      for (let i = 0; i <= SIZE; i++) {
        const v = `${i},${j}`;
        const [x, y] = pt(v);
        const b = view.villages[v];
        if (b) {
          const c = colorOf(b.p);
          const town = b.town;
          const pickable = m === 'town' && b.p === view.me && !town;
          layers.push(svg('g', { class: pickable ? 'sh-pick' : null, 'data-vertex': v, onclick: pickable ? () => place('town', v) : null },
            pickable ? svg('circle', { cx: x, cy: y, r: 20, fill: '#fff6b0', opacity: 0.7 }) : null,
            town
              ? svg('path', { d: `M${x - 13} ${y + 10} V${y - 4} L${x - 7} ${y - 12} L${x} ${y - 6} L${x + 7} ${y - 12} L${x + 13} ${y - 4} V${y + 10}Z`, fill: c, stroke: '#fff', 'stroke-width': 2 })
              : svg('path', { d: `M${x - 9} ${y + 8} V${y - 2} L${x} ${y - 11} L${x + 9} ${y - 2} V${y + 8}Z`, fill: c, stroke: '#fff', 'stroke-width': 2 }),
          ));
        } else if (m === 'village' && villageOk(v)) {
          layers.push(svg('circle', { class: 'sh-spot sh-hit', 'data-vertex': v, cx: x, cy: y, r: 11, fill: '#fff6b0', stroke: '#2b2014', 'stroke-width': 2, onclick: () => place('village', v) }));
        }
      }
    }
    return svg('svg', { class: 'sh-board', viewBox: `0 0 ${W} ${W}`, role: 'img', 'aria-label': '島の盤面' }, layers);
  }

  // ---- 部品 ----
  function cardEl(card, label) {
    if (!card) return null;
    if (card.kind === 'typhoon') return h('div', { class: 'sh-card typhoon' }, h('div', { class: 'small' }, label), h('b', {}, '🌀 台風'), h('div', { class: 'small' }, `${TYPHOON_LIMIT}枚以上持つ人は2枚失う・市場の値段が戻る`));
    return h('div', { class: 'sh-card' }, h('div', { class: 'small' }, label), h('b', {}, card.t.map(t => `${TERRAIN_ICON[t]}${TERRAIN[t].name}`).join('・')));
  }

  function status() {
    if (view.phase === 'over') return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${nameOf(view.winner)} が島をひらいた！`),
      h('div', { class: 'game-actions' }, api.backToLobby ? h('button', { class: 'btn', type: 'button', onclick: () => api.backToLobby() }, '🏠 ロビーに戻る') : null),
    );
    if (view.phase === 'setup') {
      const who = view.setup.order[view.setup.idx];
      const step = view.setup.step === 'village' ? '村を置く（光っている角をタップ）' : 'いま置いた村から道を1本のばす（光っている辺をタップ）';
      return h('div', { class: 'sh-status' }, who === view.me ? h('strong', {}, `🟡 準備: ${step}`) : h('span', {}, `準備中: ${nameOf(who)} が${view.setup.step === 'village' ? '村' : '道'}を置いています`),
        h('div', { class: 'small' }, '2巡目に置いた村は、接するマスの資源を1つずつもらえます。'));
    }
    const turnP = view.turn.p;
    const got = view.produced?.[turnP];
    return h('div', { class: 'sh-status' },
      h('strong', {}, myTurn() ? '🟡 あなたの手番' : `${nameOf(turnP)} の手番`, `（${view.round}ラウンド目）`),
      h('div', { class: 'sh-cards' }, cardEl(view.card, 'いまの季節'), cardEl(view.next, '次（次の人の季節）')),
      got ? h('div', { class: 'small' }, `${nameOf(turnP)} が得た資源: ${bagText(got) || 'なし'}`) : null,
    );
  }

  function resources() {
    if (!view.myRes) return null;
    return h('div', { class: 'sh-res' }, RES.map(r => h('span', { class: 'sh-res-item' }, RES_INFO[r].icon, h('b', {}, view.myRes[r]), h('small', {}, RES_INFO[r].name))));
  }

  function buildBox() {
    if (!myTurn()) return null;
    const btn = kind => {
      const info = BUILD_INFO[kind];
      const ok = canPay(COSTS[kind]);
      const active = mode === kind;
      return h('button', {
        class: ['btn', 'sh-build', active && 'primary'].filter(Boolean).join(' '),
        type: 'button',
        disabled: !ok && !active,
        title: info.text,
        onclick: () => {
          if (kind === 'temple') return send({ type: 'temple' });
          mode = active ? null : kind;
          render();
        },
      }, `${info.icon}${info.name}`, h('small', {}, costText(COSTS[kind])));
    };
    return h('section', { class: 'sh-panel' },
      h('div', { class: 'sh-panel-title' }, '🔨 建てる', mode ? h('span', { class: 'small' }, ` ${BUILD_INFO[mode].name}を置く場所を盤面でタップ（もう一度押すとやめる）`) : ''),
      h('div', { class: 'sh-builds' }, ['road', 'village', 'town', 'temple'].map(btn)),
      h('button', { class: 'btn primary sh-end', type: 'button', onclick: () => { mode = null; send({ type: 'end' }); } }, '手番を終える'),
    );
  }

  function marketBox() {
    const mine = myTurn();
    const price = marketGet ? view.prices[marketGet] : null;
    const ok = mine && marketGive && marketGet && marketGive !== marketGet && view.myRes[marketGive] >= price;
    return h('section', { class: 'sh-panel' },
      h('div', { class: 'sh-panel-title' }, '🏪 市場', h('span', { class: 'small muted' }, '（欲しい資源1枚 ＝ 値段の枚数ぶん、別の1種類を払う）')),
      h('div', { class: 'sh-prices' }, RES.map(r => h('span', { class: 'sh-price' }, `${RES_INFO[r].icon}${RES_INFO[r].name} `, h('b', {}, view.prices[r]), h('small', {}, '枚'), h('span', { class: 'sh-meter' }, h('i', { style: { width: `${(view.prices[r] / PRICE_MAX) * 100}%` } }))))),
      mine
        ? h('div', { class: 'sh-market-row' },
            h('span', { class: 'small' }, '払う'),
            RES.map(r => h('button', { class: ['sh-chip', marketGive === r && 'on'].filter(Boolean).join(' '), type: 'button', onclick: () => { marketGive = r; render(); } }, RES_INFO[r].icon)),
            h('span', { class: 'small' }, '→ 欲しい'),
            RES.map(r => h('button', { class: ['sh-chip', marketGet === r && 'on'].filter(Boolean).join(' '), type: 'button', onclick: () => { marketGet = r; render(); } }, RES_INFO[r].icon)),
            h('button', { class: 'btn', type: 'button', disabled: !ok, onclick: () => send({ type: 'market', give: marketGive, get: marketGet }) }, price ? `${price}枚で買う` : '買う'),
          )
        : null,
      h('div', { class: 'small muted' }, '買った資源は値上がり、払った資源は値下がり（2〜5枚）。ラウンドごとに3枚に近づく。'),
    );
  }

  function tradeBox() {
    const o = view.offer;
    if (o) {
      const mineOffer = o.from === view.me;
      const answered = o.declined.includes(view.me);
      return h('section', { class: 'sh-panel sh-offer' },
        h('div', { class: 'sh-panel-title' }, `🤝 ${nameOf(o.from)} からの交換の申し出`),
        h('div', {}, `${nameOf(o.from)} が出す: ${bagText(o.give)}　／　ほしい: ${bagText(o.get)}`),
        mineOffer
          ? h('div', { class: 'game-actions' }, h('span', { class: 'small' }, `返事を待っています（断った人: ${o.declined.map(nameOf).join('・') || 'なし'}）`), h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'cancel' }) }, '取り消す'))
          : view.me && !answered
            ? h('div', { class: 'game-actions' },
                h('button', { class: 'btn primary', type: 'button', disabled: !canPay(o.get), onclick: () => send({ type: 'accept', id: o.id }) }, '受ける'),
                h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'decline', id: o.id }) }, '断る'),
              )
            : h('div', { class: 'small' }, '返事をしました'),
      );
    }
    if (!myTurn()) return null;
    const stepper = (side, r) => h('span', { class: 'sh-step' },
      h('button', { class: 'sh-chip', type: 'button', onclick: () => { trade[side][r] = Math.max(0, (trade[side][r] ?? 0) - 1); render(); } }, '−'),
      h('b', {}, trade[side][r] ?? 0),
      h('button', { class: 'sh-chip', type: 'button', onclick: () => { trade[side][r] = (trade[side][r] ?? 0) + 1; render(); } }, '＋'),
    );
    const any = side => RES.some(r => trade[side][r]);
    return h('section', { class: 'sh-panel' },
      h('div', { class: 'sh-panel-title' }, '🤝 ほかの人と交換'),
      h('div', { class: 'sh-trade-grid' },
        h('span', {}), h('span', { class: 'small' }, '出す'), h('span', { class: 'small' }, 'ほしい'),
        RES.flatMap(r => [h('span', {}, `${RES_INFO[r].icon}${RES_INFO[r].name}`), stepper('give', r), stepper('get', r)]),
      ),
      h('button', {
        class: 'btn', type: 'button', disabled: !any('give') || !any('get') || !canPay(trade.give),
        onclick: () => { send({ type: 'offer', give: trade.give, get: trade.get }); trade = { give: {}, get: {} }; },
      }, '全員に申し出る'),
    );
  }

  function playersBox() {
    return h('div', { class: 'seats' },
      view.players.map(p => h('div', { class: ['seat', view.turn?.p === p.id && 'turn', p.id === view.me && 'me'].filter(Boolean).join(' ') },
        h('div', { class: 'name' }, h('span', { class: 'sh-dot', style: { background: colorOf(p.id) } }), p.bot ? '🤖 ' : '', p.name),
        h('div', { class: 'small' }, h('b', {}, `${p.points}点`), ` / ${view.goal}点・資源${p.cards}枚`),
        h('div', { class: 'small muted' }, `🏠${p.villages} 🏯${p.towns} 🛤️${p.roads}${p.temple ? ' ⛩️' : ''}`),
      )),
    );
  }

  function render() {
    if (!view) return;
    if (!myTurn()) mode = null;
    const myBox = me();
    root.replaceChildren(
      h('div', { class: 'table sh-table' },
        status(),
        h('div', { class: 'sh-main' },
          h('div', { class: 'sh-board-wrap' }, board()),
          h('div', { class: 'sh-side' },
            myBox ? h('div', { class: 'sh-panel-title' }, `あなたの資源（${myBox.points}点）`) : null,
            resources(),
            view.offer ? tradeBox() : null,
            buildBox(),
            view.phase === 'play' ? marketBox() : null,
            view.offer ? null : tradeBox(),
          ),
        ),
        playersBox(),
        h('details', {},
          h('summary', { class: 'small' }, 'ルール・建物の値段'),
          h('ul', { class: 'small' }, Object.entries(BUILD_INFO).map(([k, b]) => h('li', {}, `${b.icon}${b.name}（${costText(COSTS[k])}）: ${b.text}`))),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log' }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  return {
    update(next) {
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
