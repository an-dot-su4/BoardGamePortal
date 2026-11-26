// ならべてビンゴの画面
import { h } from '../../js/util.js';
import { LINES, SIZE, TARGETS, lineCounts } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🎯 ならべてビンゴの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '勝ちになるビンゴの本数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, target: Number(e.target.value) }) },
        TARGETS.map(n => h('option', { value: n, selected: options.target === n }, `${n}本${n === 3 ? '（標準）' : ''}`)),
      ),
    ),
  );
}

// ビンゴになった列のマス
function bingoCells(grid, called) {
  const counts = lineCounts(grid, called);
  const cells = new Set();
  LINES.forEach((line, i) => { if (counts[i] === SIZE) line.forEach(c => cells.add(c)); });
  return cells;
}

function gridEl(grid, called, { last = null, sel = null, onclick = null, mini = false } = {}) {
  const set = new Set(called);
  const lit = bingoCells(grid, called);
  return h('div', { class: ['bg-grid', mini && 'mini'].filter(Boolean).join(' ') }, grid.map((n, i) => {
    const open = set.has(n);
    const cls = ['bg-cell', open && 'open', lit.has(i) && 'lit', n === last && 'last', sel === i && 'sel', onclick && onclick(i, n) && 'can'].filter(Boolean).join(' ');
    const handler = onclick && onclick(i, n);
    return h(handler ? 'button' : 'span', { class: cls, type: handler ? 'button' : null, onclick: handler || null, dataset: { n, i }, 'aria-label': `${n}${open ? '（開いた）' : ''}` }, String(n));
  }));
}

export function createUI(root, api) {
  let view = null;
  let sel = null; // 並べ替えで選んでいるマス

  function render() {
    const v = view;
    const me = v.me;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const mine = v.players.find(p => p.id === me);
    const myTurn = me && v.phase === 'call' && v.turn === me;

    let status;
    if (v.phase === 'arrange') {
      status = mine && !mine.ready
        ? h('strong', {}, '🟡 2マスを順にタッチすると入れ替わります。並べ終えたら「準備OK」')
        : h('span', {}, `ほかの人が並べ終わるのを待っています（${v.players.filter(p => p.ready).length}/${v.players.length}）`);
    } else if (v.phase === 'call') {
      status = myTurn ? h('strong', {}, '🟡 あなたの番です。呼びたい数のマスをタッチ') : h('span', {}, `${nameOf(v.turn)} さんが数を選んでいます`);
    } else status = h('strong', {}, `🎉 ビンゴ！ ${v.winners.map(nameOf).join('・')} さんの勝ち`);

    const seats = h('div', { class: 'seats' }, v.players.map(p =>
      h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
        h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
        v.phase === 'arrange'
          ? h('div', { class: 'small' }, p.ready ? '✅ 準備OK' : '✏️ 並べ中')
          : h('div', { class: 'small' }, `ビンゴ ${p.bingo}/${v.target}本`, p.reach && p.bingo < v.target ? h('strong', { class: 'bg-reach' }, ' リーチ') : ''),
        h('div', { class: 'small muted' }, `${p.wins}勝`),
      ),
    ));

    let board = null;
    if (v.grid) {
      const arranging = v.phase === 'arrange' && mine && !mine.ready;
      const calledSet = new Set(v.called);
      const onclick = arranging
        ? i => () => {
            if (sel === null) { sel = i; return render(); }
            if (sel === i) { sel = null; return render(); }
            const a = sel;
            sel = null;
            api.send({ type: 'swap', a, b: i });
          }
        : myTurn ? (i, n) => (calledSet.has(n) ? null : () => api.send({ type: 'call', n })) : null;
      board = h('div', { class: 'bg-board' },
        h('strong', {}, v.phase === 'arrange' ? 'あなたのマス（ほかの人には見えません）' : `あなたのマス — ビンゴ ${mine.bingo}/${v.target}本`),
        gridEl(v.grid, v.called, { last: v.last?.n, sel, onclick }),
        arranging
          ? h('div', { class: 'game-actions' },
              h('button', { class: 'btn primary', type: 'button', onclick: () => { sel = null; api.send({ type: 'ready' }); } }, '✅ 準備OK'),
              h('button', { class: 'btn', type: 'button', onclick: () => { sel = null; api.send({ type: 'shuffle' }); } }, '🔀 ばらばらにする'),
            )
          : v.phase === 'arrange'
            ? h('div', { class: 'game-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'unready' }) }, '✏️ 並べ直す'))
            : null,
      );
    } else board = h('p', { class: 'muted' }, '👀 観戦中です');

    const calledBox = v.phase !== 'arrange'
      ? h('div', { class: 'result-box' },
          h('div', { class: 'small muted' }, `呼ばれた数（${v.called.length}/25）`, v.last ? ` — 直前: ${nameOf(v.last.by)} さんの「${v.last.n}」` : ''),
          h('div', { class: 'bg-called' }, Array.from({ length: 25 }, (_, i) => i + 1).map(n =>
            h('span', { class: ['bg-num', v.called.includes(n) && 'done', v.last?.n === n && 'last'].filter(Boolean).join(' ') }, String(n)))),
        )
      : null;

    const result = v.phase === 'end'
      ? h('div', { class: 'result-box' },
          h('h3', {}, `🏆 ${v.winners.map(nameOf).join('・')} さんの勝ち！（${v.called.length}回目）`),
          h('div', { class: 'bg-all' }, v.players.filter(p => p.id !== me).map(p => h('div', { class: 'bg-other' },
            h('div', { class: 'small' }, `${p.name}（${p.bingo}本）`),
            gridEl(v.grids[p.id], v.called, { mini: true }),
          ))),
          me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局') : null,
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, `${v.target}本そろえたら勝ち`),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        seats,
        result,
        board,
        calledBox,
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
      if (next.phase !== 'arrange') sel = null;
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
