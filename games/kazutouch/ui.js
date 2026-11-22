// かずタッチの画面
import { h } from '../../js/util.js';
import { CPU_LEVELS, MODE_LABEL, ROUND_COUNTS, SIZE } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🔟 かずタッチの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '回数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}回${n === 3 ? '（標準）' : ''}`)),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, 'CPUの速さ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, cpu: e.target.value }) },
        Object.entries(CPU_LEVELS).map(([id, l]) => h('option', { value: id, selected: options.cpu === id }, l)),
      ),
      h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, '目安: ゆっくり 約40秒／ふつう 約25秒／はやい 約20秒（CPUが2人以上だと少し遅くなります）'),
    ),
  );
}

export function createUI(root, api) {
  let view = null;
  let misses = 0;
  let shake = false;

  function done(n) {
    const v = view;
    if (v.next === null) return true;
    return v.mode === 'desc' ? n > v.next : n < v.next;
  }

  function render() {
    const v = view;
    const me = v.me;
    const mine = v.players.find(p => p.id === me);
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';

    let main = null;
    if (v.phase === 'ready') {
      main = h('div', { class: 'result-box kt-ready' },
        h('div', { class: 'kt-mode' }, `第${v.round}回: ${MODE_LABEL[v.mode]}`),
        h('p', { class: 'small', style: { margin: '6px 0' } }, '全員が「準備OK」を押すとスタートします。盤は人ごとに違います。'),
        mine && !mine.ready ? h('button', { class: 'btn primary kt-go', type: 'button', onclick: () => api.send({ type: 'ready' }) }, '👍 準備OK') : h('span', { class: 'small' }, `待っています: ${v.players.filter(p => !p.ready).map(p => p.name).join('・') || '…'}`),
      );
    } else if (v.phase === 'race' && me) {
      main = h('div', {},
        h('div', { class: 'kt-next' }, mine.place ? `🏁 ${mine.place}番目にゴール！` : h('span', {}, '次は ', h('strong', {}, String(v.next)))),
        h('div', { class: ['kt-grid', shake && 'shake'].filter(Boolean).join(' ') }, v.grid.map(n =>
          h('button', {
            class: ['kt-cell', done(n) && 'done'].filter(Boolean).join(' '), type: 'button', disabled: !!mine.place,
            onpointerdown: e => { e.preventDefault(); if (!mine.place && !done(n)) api.send({ type: 'tap', n }); },
          }, String(n)),
        )),
      );
    } else if (v.phase === 'result' || v.phase === 'end') {
      const last = v.history[v.history.length - 1];
      main = h('div', { class: 'result-box' },
        h('h3', {}, v.phase === 'end' ? `🏆 ${v.players.filter(p => v.winners.includes(p.id)).map(p => p.name).join('・')} さんの勝ち！` : `第${v.round}回の結果`),
        h('ol', {}, last.order.map(id => h('li', {}, `${nameOf(id)} +${last.gains[id]}点`, last.misses[id] ? `（おてつき${last.misses[id]}）` : ''))),
        me && v.phase === 'result' ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次の回へ') : null,
        me && v.phase === 'end' ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
      );
    }

    const bars = h('div', { class: 'kt-bars' }, v.players.map(p =>
      h('div', { class: ['kt-row', p.id === me && 'me'].filter(Boolean).join(' ') },
        h('span', { class: 'kt-name' }, p.name, p.bot ? ' 🤖' : ''),
        h('span', { class: 'kt-bar' }, h('span', { class: 'kt-fill', style: { width: `${(p.progress / SIZE) * 100}%` } })),
        h('span', { class: 'kt-score' }, p.place ? `🏁${p.place}` : `${p.progress}/${SIZE}`, h('small', {}, ` ${p.score}点`)),
      ),
    ));

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.round}回 / 全${v.totalRounds}回`),
          h('span', { class: 'small muted' }, MODE_LABEL[v.mode]),
        ),
        main,
        bars,
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, v.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    update(next) {
      const mine = next.players.find(p => p.id === next.me);
      // おてつきしたら盤を少しゆらす
      shake = !reduce && !!mine && mine.misses > misses && next.phase === 'race';
      misses = mine ? mine.misses : 0;
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
