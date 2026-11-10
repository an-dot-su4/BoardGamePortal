// かこいとりの画面（盤は SVG）
import { h } from '../../js/util.js';
import { CPU_LEVELS, SIZES, allLines, defaultSize } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '✏️ かこいとりの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '盤の大きさ（箱の数）'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, size: Number(e.target.value) }) },
        h('option', { value: 0, selected: !options.size }, `おまかせ（2人は${defaultSize(2)}×${defaultSize(2)}、3人以上は${defaultSize(3)}×${defaultSize(3)}）`),
        SIZES.map(n => h('option', { value: n, selected: options.size === n }, `${n}×${n}`)),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, 'CPUの強さ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, cpu: e.target.value }) },
        Object.entries(CPU_LEVELS).map(([id, label]) => h('option', { value: id, selected: options.cpu === id }, label)),
      ),
    ),
  );
}

export const COLORS = ['#ff8a65', '#64b5f6', '#81c784', '#ffd54f'];

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

const CELL = 60;
const PAD = 16;

export function createUI(root, api) {
  let view = null;

  function board() {
    const v = view;
    const myTurn = v.me && v.turn === v.me && v.phase === 'play';
    const W = v.C * CELL + PAD * 2;
    const H = v.R * CELL + PAD * 2;
    const pt = (r, c) => [PAD + c * CELL, PAD + r * CELL];
    const nameOf = i => v.players[i]?.name ?? '?';

    const boxes = Object.entries(v.boxes).map(([key, owner]) => {
      const [r, c] = key.split('-').map(Number);
      const [x, y] = pt(r, c);
      const fresh = v.last?.got.includes(key);
      return s('g', { class: fresh ? 'kk-box fresh' : 'kk-box' },
        s('rect', { x: x + 3, y: y + 3, width: CELL - 6, height: CELL - 6, rx: 6, fill: COLORS[owner], 'fill-opacity': 0.55 }),
        s('text', { x: x + CELL / 2, y: y + CELL / 2 + 8, 'text-anchor': 'middle', class: 'kk-mark' }, [...(nameOf(owner).replace(/^CPU\s*/, '') || nameOf(owner))][0] ?? '?'),
      );
    });

    const lines = allLines(v.R, v.C).map(id => {
      const [k, rs, cs] = id.split('-');
      const r = Number(rs);
      const c = Number(cs);
      const [x1, y1] = pt(r, c);
      const [x2, y2] = k === 'h' ? pt(r, c + 1) : pt(r + 1, c);
      const owner = v.lines[id];
      const drawn = owner !== undefined;
      const can = myTurn && !drawn;
      const cls = ['kk-l', drawn && 'drawn', can && 'can', v.last?.id === id && 'last'].filter(Boolean).join(' ');
      return s('g', { class: cls, 'data-line': id, onclick: can ? () => api.send({ type: 'line', id }) : null },
        s('line', { x1, y1, x2, y2, class: 'kk-vis', stroke: drawn ? COLORS[owner] : null }),
        can ? s('line', { x1, y1, x2, y2, class: 'kk-hit' }) : null,
      );
    });

    const dots = [];
    for (let r = 0; r <= v.R; r++) for (let c = 0; c <= v.C; c++) {
      const [x, y] = pt(r, c);
      dots.push(s('circle', { cx: x, cy: y, r: 5, class: 'kk-dot' }));
    }
    return s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'kk-board', role: 'img', 'aria-label': 'かこいとりの盤' }, boxes, lines, dots);
  }

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOfId = id => v.players.find(p => p.id === id)?.name ?? '?';
    const again = v.last && v.last.got.length && v.phase === 'play';

    let status = null;
    if (v.phase === 'play') {
      status = myTurn
        ? h('strong', {}, again ? '🟡 箱を取った！ もう1本引けます' : '🟡 あなたの番です。点と点を線でつなごう')
        : h('span', {}, `${nameOfId(v.turn)} さんの番です${again ? '（もう1本）' : ''}`);
    }

    const seats = h('div', { class: 'seats' },
      v.players.map(p =>
        h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' '), style: { borderLeft: `6px solid ${COLORS[p.index]}` } },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' }, `📦 ${p.boxes}箱`),
          h('div', { class: 'small muted' }, `${p.wins}勝`),
        ),
      ),
    );

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, `残りの箱 ${v.R * v.C - Object.keys(v.boxes).length}`),
        ),
        h('div', { style: { margin: '6px 0 10px' } }, status),
        seats,
        v.phase === 'end' ? resultBox() : null,
        h('div', { class: 'kk-wrap' }, board()),
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, v.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function resultBox() {
    const v = view;
    const names = v.players.filter(p => v.winners.includes(p.id)).map(p => p.name);
    const ranking = v.players.slice().sort((a, b) => b.boxes - a.boxes);
    return h('div', { class: 'result-box' },
      h('h3', {}, names.length > 1 ? `🤝 ${names.join('・')} さんが同点で勝ち！` : `🏆 ${names[0]} さんの勝ち！`),
      h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — ${p.boxes}箱`))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（先手は次の人）') : null,
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
