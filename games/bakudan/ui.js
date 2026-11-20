// みんなでばくだんさがしの画面
import { h } from '../../js/util.js';
import { LEVELS, LIVES } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '💣 みんなでばくだんさがしの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '難しさ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, level: e.target.value }) },
        Object.entries(LEVELS).map(([id, l]) => h('option', { value: id, selected: options.level === id }, l.label)),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, 'チームのライフ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, lives: Number(e.target.value) }) },
        LIVES.map(n => h('option', { value: n, selected: options.lives === n }, `${n}${n === 3 ? '（標準）' : ''}`)),
      ),
    ),
  );
}

export function createUI(root, api) {
  let view = null;
  let flagMode = false;

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';

    const click = i => {
      const c = v.cells[i];
      if (flagMode || (c && c.s === 'flag' && !myTurn)) return api.send({ type: 'flag', index: i });
      if (c && c.s === 'flag') return api.toast('旗のマスは開けられません。旗モードで外してください');
      if (!myTurn) return api.toast(`${nameOf(v.turn)} さんの番です（旗はいつでも立てられます）`);
      api.send({ type: 'open', index: i });
    };

    const grid = h('div', { class: 'bk-grid', style: { gridTemplateColumns: `repeat(${v.w}, minmax(0, 1fr))` } },
      v.cells.map((c, i) => {
        const last = v.last && v.last.index === i;
        if (c && c.s === 'open') {
          return h('div', { class: ['bk-cell open', `n${c.n}`, last && 'last'].filter(Boolean).join(' ') }, c.n ? String(c.n) : '');
        }
        if (c && c.s === 'boom') return h('div', { class: 'bk-cell boom' }, '💥');
        if (c && c.s === 'bomb') return h('div', { class: ['bk-cell bomb', c.flag && 'ok'].filter(Boolean).join(' ') }, c.flag ? '🚩' : '💣');
        const flag = c && c.s === 'flag';
        return h('button', {
          class: ['bk-cell closed', flag && 'flag', (myTurn || flagMode) && v.phase === 'play' && 'can'].filter(Boolean).join(' '),
          type: 'button', disabled: !me || v.phase !== 'play', 'aria-label': flag ? `旗（${nameOf(c.by)}）` : `${i % v.w + 1}列${Math.floor(i / v.w) + 1}行`,
          onclick: () => click(i),
          oncontextmenu: e => { e.preventDefault(); if (me && v.phase === 'play') api.send({ type: 'flag', index: i }); },
          dataset: { i },
        }, flag ? '🚩' : '');
      }),
    );

    let status = null;
    if (v.phase === 'play') {
      status = myTurn
        ? h('strong', {}, flagMode ? '🚩 旗モード: 押したマスに旗を立てる／外す' : '🟡 あなたの番です。安全だと思うマスを開けよう')
        : h('span', {}, `${nameOf(v.turn)} さんの番です（旗はだれでもいつでも立てられます）`);
    }

    const hearts = '❤️'.repeat(Math.max(0, v.lives)) + '🖤'.repeat(Math.max(0, v.maxLives - v.lives));

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局・${LEVELS[v.level].label.split('（')[0]}`),
          h('span', { class: 'small muted' }, `これまで ${v.record.win}勝${v.record.lose}敗`),
        ),
        h('div', { class: 'bk-status' },
          h('span', { class: 'bk-lives', 'aria-label': `ライフ ${v.lives}` }, hearts),
          h('span', { class: 'small' }, `💣 ${v.bombCount}・🚩 ${v.flagCount}・のこり安全マス ${v.safeLeft}`),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        v.phase === 'end'
          ? h('div', { class: 'result-box' },
              h('h3', {}, v.result === 'win' ? '🎉 チームの勝ち！ ばくだんを全部見つけた' : '💀 チームの負け…'),
              h('p', { class: 'small', style: { margin: '4px 0 8px' } }, '開けたマス: ', v.players.map(p => `${p.name} ${p.opened}`).join('・')),
              me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（新しい盤）') : null,
            )
          : null,
        h('div', { class: 'bk-wrap' }, grid),
        me && v.phase === 'play'
          ? h('div', { class: 'game-actions' },
              h('button', { class: ['btn', flagMode && 'primary'].filter(Boolean).join(' '), type: 'button', 'aria-pressed': String(flagMode), onclick: () => { flagMode = !flagMode; render(); } },
                flagMode ? '🚩 旗モード中（押すと開けるモードへ）' : '🚩 旗モードにする'),
              h('span', { class: 'small muted' }, 'パソコンは右クリックでも旗'),
            )
          : null,
        h('div', { class: 'seats', style: { marginTop: '10px' } }, v.players.map(p =>
          h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
            h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
            h('div', { class: 'small' }, `開けたマス ${p.opened}`),
          ),
        )),
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
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
      if (next.phase !== 'play') flagMode = false;
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
