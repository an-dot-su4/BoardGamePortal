// かずさぐりの画面
import { h } from '../../js/util.js';
import { CPU_LEVELS, LENGTHS } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🔢 かずさぐりの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'ひみつの数のけた数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, length: Number(e.target.value) }) },
        LENGTHS.map(n => h('option', { value: n, selected: options.length === n }, `${n}けた${n === 3 ? '（標準）' : '（むずかしい）'}`)),
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

const MEMO = ['', 'no', 'yes']; // 数字メモ: なし → ✕ → ○

export function createUI(root, api) {
  let view = null;
  let input = '';
  let memo = Array(10).fill(0);
  let key = null; // 局と回が変わったら入力を消す

  function keypad(n, submitLabel, onSubmit, extra = null) {
    const add = d => { if (input.length < n && !input.includes(d)) { input += d; render(); } };
    return h('div', { class: 'ks-pad' },
      h('div', { class: 'ks-slots' }, Array.from({ length: n }, (_, i) => h('span', { class: ['ks-slot', input[i] !== undefined && 'on'].filter(Boolean).join(' ') }, input[i] ?? ''))),
      h('div', { class: 'ks-keys' },
        '1234567890'.split('').map(d => h('button', { class: ['btn ks-key', memo[d] === 1 && 'no', memo[d] === 2 && 'yes'].filter(Boolean).join(' '), type: 'button', disabled: input.includes(d) || input.length >= n, onclick: () => add(d) }, d)),
        h('button', { class: 'btn ks-key', type: 'button', disabled: !input, onclick: () => { input = input.slice(0, -1); render(); }, 'aria-label': '1文字消す' }, '⌫'),
      ),
      h('div', { class: 'game-actions' },
        h('button', { class: 'btn primary', type: 'button', disabled: input.length !== n, onclick: () => { const c = input; input = ''; onSubmit(c); } }, submitLabel),
        extra,
      ),
    );
  }

  function historyTable(list, n, { mine = false } = {}) {
    if (!list.length) return h('p', { class: 'small muted', style: { margin: '4px 0' } }, 'まだ予想はありません。');
    return h('table', { class: ['ks-hist', mine && 'mine'].filter(Boolean).join(' ') },
      h('tbody', {}, list.map((r, i) => h('tr', { class: r.hit === n ? 'solved' : '' },
        h('td', { class: 'muted' }, `${i + 1}`),
        h('td', { class: 'ks-code' }, r.guess),
        h('td', {}, h('span', { class: 'ks-h' }, `${r.hit}ヒット`)),
        h('td', {}, h('span', { class: 'ks-b' }, `${r.blow}ブロー`)),
      ))),
    );
  }

  function render() {
    const v = view;
    const me = v.me;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const waiting = v.players.filter(p => !p.ready).length;
    const chaser = me ? v.players.find(p => p.target === me) : null;

    let main = null;
    if (me && v.phase === 'secret') {
      main = v.mySecret
        ? h('div', { class: 'result-box' }, h('p', { style: { margin: 0 } }, 'あなたのひみつの数: ', h('strong', { class: 'ks-code' }, v.mySecret), `（ほかの人を待っています: ${waiting}人）`))
        : h('div', { class: 'result-box' },
            h('p', { style: { margin: '0 0 6px' } }, `ひみつの数を決めよう（違う数字を${v.n}つ）。${nameOf(chaser.id)} さんがこれを当てに来ます。`),
            keypad(v.n, 'この数に決める', code => api.send({ type: 'secret', code }),
              h('button', { class: 'btn', type: 'button', onclick: () => { input = ''; api.send({ type: 'secret', random: true }); } }, '🎲 おまかせ')),
          );
    } else if (me && v.phase === 'guess') {
      const memoRow = h('div', { class: 'ks-memo' },
        h('div', { class: 'small' }, 'メモ（自分だけの覚え書き）'),
        h('div', { class: 'ks-memo-keys' }, '0123456789'.split('').map(d => h('button', {
          class: ['ks-m', MEMO[memo[d]]].filter(Boolean).join(' '), type: 'button', title: '押すたびに ✕ → ○ → なし',
          onclick: () => { memo[d] = (memo[d] + 1) % 3; render(); },
        }, d))),
      );
      main = h('div', { class: 'result-box' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `🔍 ${nameOf(v.myTarget)} さんの数を当てよう`),
          h('span', { class: 'small muted' }, `あなたの数 ${v.mySecret}`),
        ),
        historyTable(v.history[me], v.n, { mine: true }),
        v.myGuess
          ? h('p', { style: { margin: '8px 0 0' } }, '予想 ', h('strong', { class: 'ks-code' }, v.myGuess), ` を出しました。ほかの人を待っています（${waiting}人）`)
          : [memoRow, keypad(v.n, `第${v.round}回の予想を出す`, code => api.send({ type: 'guess', code }))],
      );
    }

    const others = h('div', { class: 'ks-others' },
      v.players.filter(p => p.id !== me || v.phase === 'end').map(p =>
        h('div', { class: 'result-box ks-other' },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } },
            h('strong', {}, `${p.name}${p.bot ? ' 🤖' : ''} → ${nameOf(p.target)}${p.target === me ? '（あなた）' : ''}`),
            h('span', { class: 'small' }, v.phase === 'end' ? '' : p.ready ? '✅' : '⌛'),
          ),
          historyTable(v.history[p.id], v.n),
        ),
      ),
    );

    let status;
    if (v.phase === 'secret') status = 'ひみつの数を決めています';
    else if (v.phase === 'guess') status = `第${v.round}回の予想（全員そろったら一斉に答え合わせ）`;

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局・${v.n}けた`),
          h('span', { class: 'small muted' }, v.players.map(p => `${p.name} ${p.wins}勝`).join('・')),
        ),
        status ? h('p', { class: 'small', style: { margin: '4px 0 8px' } }, status) : null,
        v.phase === 'end' ? resultBox() : null,
        main,
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        others,
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
    return h('div', { class: 'result-box' },
      h('h3', {}, `🎯 ${names.join('・')} さんが${v.round}回目で当てました！`),
      h('div', { class: 'small' }, 'ひみつの数: ', v.players.map(p => h('span', { class: 'ks-reveal' }, `${p.name} `, h('strong', { class: 'ks-code' }, p.secret)))),
      v.me ? h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' }, onclick: () => api.send({ type: 'restart' }) }, 'もう一局') : null,
    );
  }

  return {
    update(next) {
      const k = `${next.games}-${next.phase}-${next.round}`;
      if (k !== key) {
        input = '';
        if (next.games !== view?.games) memo = Array(10).fill(0);
        key = k;
      }
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
