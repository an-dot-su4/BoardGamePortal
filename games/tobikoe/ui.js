// とびこえチェッカーの画面
import { h } from '../../js/util.js';
import { CELLS, CORNERS, TIPS, destinations, parse } from './logic.js';

// 角ごとの色（コマと陣地）
export const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
const COLOR_NAMES = ['赤', 'オレンジ', '黄', '緑', '青', '紫'];

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const STEP = 24; // となりのマスとの間隔
const ROT = ([q, r]) => [-r, q + r]; // 60度回す（軸座標）
const cornerOf = Object.fromEntries(CORNERS.flatMap((cs, i) => cs.map(k => [k, i])));

export function createUI(root, api) {
  let view = null;
  let sel = null; // 選んでいる自分のコマ

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.phase === 'play' && v.turn === me;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const pl = Object.fromEntries(v.players.map(p => [p.id, p]));
    if (!myTurn || v.board[sel] !== me) sel = null;
    const dests = new Set(sel ? destinations(v.board, sel) : []);

    // 自分の陣地が下に来るように回す
    let turns = 0;
    if (me) {
      let tip = parse(TIPS[pl[me].corner]);
      const want = TIPS[3];
      while (`${tip[0]},${tip[1]}` !== want && turns < 6) { tip = ROT(tip); turns++; }
    }
    const pos = k => {
      let c = parse(k);
      for (let i = 0; i < turns; i++) c = ROT(c);
      const [q, r] = c;
      return [(q + r / 2) * STEP, r * STEP * Math.sqrt(3) / 2];
    };
    const pts = CELLS.map(pos);
    const minX = Math.min(...pts.map(p => p[0])) - STEP, maxX = Math.max(...pts.map(p => p[0])) + STEP;
    const minY = Math.min(...pts.map(p => p[1])) - STEP, maxY = Math.max(...pts.map(p => p[1])) + STEP;

    const used = new Set(v.players.flatMap(p => [p.corner, p.target]));
    const cells = CELLS.map(k => {
      const [x, y] = pos(k);
      const owner = v.board[k];
      const corner = cornerOf[k];
      const isDest = dests.has(k);
      const mine = owner && owner === me;
      const click = myTurn
        ? isDest ? () => { const from = sel; sel = null; api.send({ type: 'move', from, to: k }); }
          : mine ? () => { sel = sel === k ? null : k; render(); } : null
        : null;
      const last = v.last && (v.last.from === k || v.last.to === k);
      return s('g', { class: ['tb-cell', click && 'can'].filter(Boolean).join(' '), onclick: click, 'data-cell': k, 'data-owner': owner ?? '', role: click ? 'button' : null, 'aria-label': click ? (isDest ? 'ここへ動かす' : '自分のコマ') : null },
        s('circle', { cx: x, cy: y, r: STEP / 2, fill: 'transparent' }),
        s('circle', {
          cx: x, cy: y, r: STEP * 0.22,
          class: 'tb-hole',
          fill: corner !== undefined && used.has(corner) ? COLORS[corner] : '#000',
          'fill-opacity': corner !== undefined && used.has(corner) ? 0.35 : 0.25,
          stroke: last ? '#fff' : 'none', 'stroke-width': 2,
        }),
        owner ? s('circle', {
          cx: x, cy: y, r: STEP * 0.4, fill: COLORS[pl[owner].corner],
          stroke: sel === k ? '#fff' : v.last?.to === k ? '#fff' : 'rgb(0 0 0 / 0.45)', 'stroke-width': sel === k ? 3.5 : v.last?.to === k ? 2 : 1.2,
          class: sel === k ? 'tb-sel' : null,
        }) : null,
        isDest ? s('circle', { cx: x, cy: y, r: STEP * 0.3, fill: '#fff', 'fill-opacity': 0.85, class: 'tb-dest' }) : null,
      );
    });
    const board = s('svg', { viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`, class: 'tb-board', role: 'img', 'aria-label': 'とびこえチェッカーの盤' }, cells);

    let status;
    if (v.phase === 'play') {
      status = myTurn
        ? h('strong', {}, sel ? '🟡 白い丸のマスへ動かせます（ほかのコマを選び直してもよい）' : '🟡 あなたの番です。動かすコマをタッチ')
        : h('span', {}, `${nameOf(v.turn)} さんの番です`);
    } else status = h('strong', {}, `🏆 ${v.winners.map(nameOf).join('・')} さんの勝ち！`);

    const seats = h('div', { class: 'seats' }, v.players.map(p =>
      h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
        h('div', { class: 'name' }, h('span', { class: 'tb-dot', style: { background: COLORS[p.corner] } }), p.name, p.bot ? ' 🤖' : ''),
        h('div', { class: 'small' }, `${COLOR_NAMES[p.corner]}・陣地 ${p.home}/10`),
        h('div', { class: 'small muted' }, `${p.wins}勝`),
      ),
    ));

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, me ? 'あなたの陣地は下。向かい（上）の角へ運ぼう' : `${v.moves}手目`),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        seats,
        v.phase === 'end'
          ? h('div', { class: 'result-box' },
              h('h3', {}, `🏆 ${v.winners.map(nameOf).join('・')} さんの勝ち！`),
              h('ol', {}, v.players.slice().sort((a, b) => b.home - a.home).map(p => h('li', {}, `${p.name} — 陣地に ${p.home}/10`))),
              me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局') : null,
            )
          : null,
        h('div', { class: 'tb-wrap' }, board),
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, v.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
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
