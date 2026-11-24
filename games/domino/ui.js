// ドミノの画面
import { h } from '../../js/util.js';
import { ROUND_COUNTS, placesFor, tileLabel } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🧩 ドミノの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'ラウンド数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}ラウンド${n === 3 ? '（標準）' : ''}`)),
      ),
    ),
  );
}

const PIPS = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const half = n => h('span', { class: 'dm-half' }, Array.from({ length: 9 }, (_, i) => h('i', { class: PIPS[n].includes(i) ? 'pip' : '' })));

function tile(a, b, { vertical = false, cls = '', onclick = null, label = null } = {}) {
  return h(onclick ? 'button' : 'span', {
    class: ['dm-tile', vertical ? 'v' : 'h', a === b && 'double', cls].filter(Boolean).join(' '),
    type: onclick ? 'button' : null, onclick, 'aria-label': label ?? `${a}と${b}`,
  }, half(a), h('span', { class: 'dm-bar' }), half(b));
}

export function createUI(root, api) {
  let view = null;
  let picking = null; // 左右を選んでいるタイル

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const g = { line: v.line };
    const playable = myTurn ? v.hand.filter(t => placesFor(g, t).length) : [];

    let status = null;
    if (v.phase === 'play') {
      if (myTurn) status = h('strong', {}, playable.length ? `🟡 あなたの番です。はしの目（${v.ends[0]} か ${v.ends[1]}）に合うタイルをつなげよう` : v.stockCount ? '🟡 つなげられるタイルがありません。山から引こう' : '🟡 つなげられず山もありません。パスしよう');
      else status = h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }

    const line = h('div', { class: 'dm-line' }, v.line.map((t, i) =>
      tile(t.a, t.b, { cls: [i === 0 && 'end-l', i === v.line.length - 1 && 'end-r', v.last?.id === t.id && 'last'].filter(Boolean).join(' ') }),
    ));

    const seats = h('div', { class: 'seats' }, v.players.map(p =>
      h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
        h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
        h('div', { class: 'small' }, `🀫 ${p.count}枚`),
        h('div', { class: 'small muted' }, `${p.score}点`),
      ),
    ));

    let actions = null;
    if (myTurn) {
      actions = h('div', { class: 'game-actions' },
        picking ? [
          h('span', { class: 'small' }, `${tileLabel(v.hand.find(t => t.id === picking) ?? { a: '?', b: '?' })} をどちらに？`),
          h('button', { class: 'btn primary', type: 'button', onclick: () => { const id = picking; picking = null; api.send({ type: 'play', tile: id, side: 'L' }); } }, `← 左はし（${v.ends[0]}）`),
          h('button', { class: 'btn primary', type: 'button', onclick: () => { const id = picking; picking = null; api.send({ type: 'play', tile: id, side: 'R' }); } }, `右はし（${v.ends[1]}）→`),
          h('button', { class: 'btn', type: 'button', onclick: () => { picking = null; render(); } }, 'やめる'),
        ] : null,
        !playable.length && v.stockCount ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'draw' }) }, `山から1枚引く（残り${v.stockCount}）`) : null,
        !playable.length && !v.stockCount ? h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'pass' }) }, 'パス') : null,
      );
    }

    const hand = me
      ? h('div', {},
          h('strong', {}, `あなたのタイル（${v.hand.length}枚）`),
          h('div', { class: 'dm-hand' }, v.hand.map(t => {
            const ok = playable.includes(t);
            return tile(t.a, t.b, {
              vertical: true, cls: [myTurn && !ok && 'dim', picking === t.id && 'sel'].filter(Boolean).join(' '),
              onclick: ok ? () => {
                const places = placesFor(g, t);
                if (places.length === 2 && v.ends[0] !== v.ends[1]) { picking = t.id; render(); } else api.send({ type: 'play', tile: t.id, side: places[0] });
              } : null,
            });
          })),
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    let result = null;
    if (v.result) {
      result = h('div', { class: 'result-box' },
        h('h3', {}, v.phase === 'end' ? `🏆 ${v.players.filter(p => v.winners.includes(p.id)).map(p => p.name).join('・')} さんの勝ち！` : `${nameOf(v.result.winner)} さんがラウンドの勝ち（+${v.result.pts}点）`),
        v.result.blocked ? h('p', { class: 'small', style: { margin: '2px 0' } }, 'だれもつなげなかったので、残りの目がいちばん少ない人の勝ち') : null,
        h('div', { class: 'small' }, v.players.map(p => h('div', { class: 'dm-left' }, `${p.name}: `, v.result.left[p.id].length ? v.result.left[p.id].map(t => tile(t.a, t.b, { cls: 'mini' })) : '（なし）'))),
        v.phase === 'end'
          ? h('ol', {}, v.players.slice().sort((a, b) => b.score - a.score).map(p => h('li', {}, `${p.name} — ${p.score}点`)))
          : null,
        me && v.phase === 'result' ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次のラウンドへ') : null,
        me && v.phase === 'end' ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
      );
    }

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.round}ラウンド / 全${v.totalRounds}`),
          h('span', { class: 'small muted' }, `山 ${v.stockCount}枚・はしの目 ${v.ends[0]} と ${v.ends[1]}`),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        seats,
        result,
        h('div', { class: 'result-box' }, line),
        hand,
        actions,
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
      if (next.turn !== next.me) picking = null;
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
