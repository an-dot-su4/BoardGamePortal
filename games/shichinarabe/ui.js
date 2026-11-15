// 七並べの画面
import { h } from '../../js/util.js';
import { CPU_LEVELS, PASS_LIMITS, RANK_LABEL, SUITS, SUIT_MARK, cardLabel } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '7️⃣ 七並べの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'パスできる回数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, passes: Number(e.target.value) }) },
        PASS_LIMITS.map(n => h('option', { value: n, selected: options.passes === n }, `${n}回${n === 3 ? '（標準）' : ''}`)),
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

const red = s => s === 'H' || s === 'D';

export function createUI(root, api) {
  let view = null;

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const can = new Set(v.playable);
    const mine = new Set(v.hand.map(c => c.id));
    const lastId = v.last?.kind === 'play' ? v.last.card.id : null;

    const board = h('div', { class: 'sn-board' },
      SUITS.map(s => h('div', { class: 'sn-row' },
        h('span', { class: ['sn-suit', red(s) && 'red'].filter(Boolean).join(' ') }, SUIT_MARK[s]),
        Array.from({ length: 13 }, (_, k) => {
          const r = k + 1;
          const id = s + r;
          const on = v.board[s][r];
          const cls = ['sn-cell', on && 'on', on && red(s) && 'red', r === 7 && 'seven', id === lastId && 'last', !on && can.has(id) && 'can', !on && mine.has(id) && 'mine'].filter(Boolean).join(' ');
          return h('span', { class: cls, title: on ? `${SUIT_MARK[s]}${RANK_LABEL[r]}` : null }, on ? RANK_LABEL[r] : can.has(id) ? '＋' : '');
        }),
      )),
    );

    let status = null;
    if (v.phase === 'play') {
      status = myTurn
        ? h('strong', {}, v.playable.length ? '🟡 あなたの番です。出すカードを選ぶか、パス' : '🟡 出せるカードがありません。パスしてください')
        : h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }
    const lastMsg = v.last && v.phase === 'play'
      ? h('span', { class: 'small muted' }, v.last.kind === 'play' ? `直前: ${nameOf(v.last.by)} さんが ${cardLabel(v.last.card)}` : v.last.kind === 'pass' ? `直前: ${nameOf(v.last.by)} さんがパス` : `${nameOf(v.last.by)} さんが脱落`)
      : null;

    const seats = h('div', { class: 'seats' },
      v.players.map(p => {
        const myPlace = v.ranking ? v.ranking.indexOf(p.id) + 1 : null;
        return h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me', p.out && 'dead'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' },
            p.place ? `🎉 ${p.place}番目に上がり` : p.out ? '💀 脱落' : `🂠 ${p.count}枚`,
          ),
          h('div', { class: 'small muted' }, 'パス ', h('span', { class: 'sn-pass' }, Array.from({ length: v.passLimit }, (_, i) => (i < p.passes ? '●' : '○')).join('')), myPlace ? `・${myPlace}位` : ''),
        );
      }),
    );

    const myPasses = me ? v.players.find(p => p.id === me).passes : 0;
    const handBox = me
      ? h('div', {},
          h('strong', {}, `あなたの手札（${v.hand.length}枚）`),
          h('div', { class: 'hand' }, v.hand.map(c => h('button', {
            class: ['pcard', red(c.s) && 'red', myTurn && !can.has(c.id) && 'sn-dim'].filter(Boolean).join(' '), type: 'button',
            disabled: !(myTurn && can.has(c.id)), 'aria-label': cardLabel(c),
            onclick: () => api.send({ type: 'play', card: c.id }),
          }, h('span', {}, RANK_LABEL[c.r]), h('span', { class: 'suit' }, SUIT_MARK[c.s])))),
          myTurn
            ? h('div', { class: 'game-actions' },
                h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'pass' }) },
                  myPasses >= v.passLimit ? '💀 パス（脱落します）' : `パス（あと${v.passLimit - myPasses}回）`),
              )
            : null,
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, v.players.map(p => `${p.name} ${p.wins}勝`).join('・')),
        ),
        h('div', { class: 'row', style: { margin: '6px 0 8px' } }, status, lastMsg),
        seats,
        v.phase === 'end' ? resultBox() : null,
        board,
        handBox,
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
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const outSet = new Set(v.players.filter(p => p.out).map(p => p.id));
    return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${nameOf(v.ranking[0])} さんが1位！`),
      h('ol', {}, v.ranking.map(id => h('li', {}, nameOf(id), outSet.has(id) ? '（脱落）' : ''))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（配り直す）') : null,
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
