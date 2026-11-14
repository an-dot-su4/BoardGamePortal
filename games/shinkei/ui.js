// 神経衰弱の画面
import { h } from '../../js/util.js';
import { CPU_LEVELS, RANK_LABEL, SIZES, SUIT_MARK, cardLabel } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  const label = { 20: '20枚（A〜5・短め）', 32: '32枚（A〜8・標準）', 52: '52枚（全部・長め）' };
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🧠 神経衰弱の設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '並べる枚数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, size: Number(e.target.value) }) },
        Object.keys(SIZES).map(n => h('option', { value: n, selected: options.size === Number(n) }, label[n])),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, 'CPUの強さ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, cpu: e.target.value }) },
        Object.entries(CPU_LEVELS).map(([id, l]) => h('option', { value: id, selected: options.cpu === id }, l)),
      ),
    ),
  );
}

const COLORS = ['#ff8a65', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4dd0e1'];

export function createUI(root, api) {
  let view = null;
  let prevUp = new Set(); // 前の画面で表だった位置（新しくめくったものだけ動かす）
  let curUp = new Set();

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const colorOf = id => COLORS[v.players.findIndex(p => p.id === id)] ?? '#fff';
    const open = new Set(v.open);
    const shown = new Set(v.shown);
    const fresh = v.last?.hit ? new Set(v.last.cards) : new Set();

    const grid = h('div', { class: `sk-grid n${v.cards.length}` },
      v.cards.map((c, i) => {
        if (c && c.owner) {
          return h('div', { class: ['sk-card taken', fresh.has(i) && 'fresh'].filter(Boolean).join(' '), style: { borderColor: colorOf(c.owner) }, title: `${nameOf(c.owner)} さんが取った ${cardLabel(c)}` },
            v.phase === 'end' || fresh.has(i) ? h('span', { class: ['sk-face', (c.s === 'H' || c.s === 'D') && 'red'].filter(Boolean).join(' ') }, RANK_LABEL[c.r], h('small', {}, SUIT_MARK[c.s])) : null,
          );
        }
        if (c) {
          return h('div', { class: ['sk-card up', !prevUp.has(i) && 'flip', open.has(i) && 'open', shown.has(i) && 'shown', (c.s === 'H' || c.s === 'D') && 'red'].filter(Boolean).join(' '), 'aria-label': cardLabel(c), dataset: { i } },
            h('span', { class: 'sk-face' }, RANK_LABEL[c.r], h('small', {}, SUIT_MARK[c.s])),
          );
        }
        const can = myTurn;
        return h(can ? 'button' : 'div', {
          class: ['sk-card down', can && 'can'].filter(Boolean).join(' '), type: can ? 'button' : null, 'aria-label': `${i + 1}番目のカード（裏）`,
          onclick: can ? () => api.send({ type: 'flip', index: i }) : null, dataset: { i },
        });
      }),
    );

    let status = null;
    if (v.phase === 'play') {
      const n = v.open.length;
      status = myTurn
        ? h('strong', {}, n === 0 ? '🟡 あなたの番です。1枚目をめくろう' : '🟡 2枚目は？')
        : h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }
    const lastMsg = v.last && v.phase === 'play'
      ? h('span', { class: 'small muted' }, v.last.hit ? `🎉 ${nameOf(v.last.by)} さんがそろえた！` : `${nameOf(v.last.by)} さんは外れ（2枚目をめくると裏に戻ります）`)
      : null;

    const seats = h('div', { class: 'seats' },
      v.players.map(p =>
        h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' '), style: { borderLeft: `6px solid ${colorOf(p.id)}` } },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' }, `🃏 ${p.taken / 2}組`),
          h('div', { class: 'small muted' }, `${p.wins}勝`),
        ),
      ),
    );

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, `残り ${v.cards.filter(c => !c || !c.owner).length}枚`),
        ),
        h('div', { class: 'row', style: { margin: '6px 0 8px' } }, status, lastMsg),
        seats,
        v.phase === 'end' ? resultBox() : null,
        grid,
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
    const ranking = v.players.slice().sort((a, b) => b.taken - a.taken);
    return h('div', { class: 'result-box' },
      h('h3', {}, names.length > 1 ? `🤝 ${names.join('・')} さんが同点で勝ち！` : `🏆 ${names[0]} さんの勝ち！`),
      h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — ${p.taken / 2}組`))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（先手は次の人）') : null,
    );
  }

  return {
    update(next) {
      prevUp = curUp;
      curUp = new Set([...next.open, ...next.shown]);
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
