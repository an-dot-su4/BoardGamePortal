// マンカラの画面
import { h } from '../../js/util.js';
import { CPU_LEVELS, pitsOf, SEEDS, STORE } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🫘 マンカラの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '1つの穴の種の数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, seeds: Number(e.target.value) }) },
        SEEDS.map(n => h('option', { value: n, selected: options.seeds === n }, `${n}個${n === 4 ? '（標準）' : n < 4 ? '（短め）' : '（長め）'}`)),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, 'CPUの強さ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, cpu: e.target.value }) },
        Object.entries(CPU_LEVELS).map(([id, label]) => h('option', { value: id, selected: options.cpu === id }, label)),
      ),
      h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, '「🤖 CPUを追加」で入れたCPUの強さ。強いCPUは6手先まで読みます。'),
    ),
  );
}

// 種（多いときは数字だけ）
function seeds(n) {
  return h('span', { class: 'mc-seeds' }, Array.from({ length: Math.min(n, 12) }, (_, i) => h('i', { class: `s${i % 4}` })));
}

export function createUI(root, api) {
  let view = null;

  function render() {
    const v = view;
    const me = v.me;
    const bottom = v.mySide ?? 0; // 自分の側を手前にする（観戦者は先手を手前に）
    const top = 1 - bottom;
    const playerOf = side => v.players.find(p => p.side === side);
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const myTurn = me && v.turn === me && v.phase === 'play';
    const sown = new Set(v.last?.sown ?? []);

    const pitEl = (i, side) => {
      const n = v.board[i];
      const can = myTurn && side === bottom && n > 0;
      const cls = ['mc-pit', can && 'can', sown.has(i) && 'sown', v.last?.lastPit === i && 'lastp', v.last?.pit === i && 'from'].filter(Boolean).join(' ');
      return h(can ? 'button' : 'div', {
        class: cls, type: can ? 'button' : null, onclick: can ? () => api.send({ type: 'sow', pit: i }) : null,
        'aria-label': `${pitsOf(side).indexOf(i) + 1}番の穴 ${n}個`, dataset: { pit: i },
      }, seeds(n), h('b', {}, String(n)));
    };
    const storeEl = side => h('div', { class: ['mc-store', side === bottom ? 'mine' : 'theirs', sown.has(STORE[side]) && 'sown'].filter(Boolean).join(' '), dataset: { store: side } },
      h('span', { class: 'small' }, playerOf(side).name),
      h('b', {}, String(v.board[STORE[side]])),
      seeds(v.board[STORE[side]]),
    );

    // 手前の側は左から右へ、奥の側は右から左へ（反時計回り）
    const board = h('div', { class: 'mc-board' },
      h('div', { class: 'mc-end left' }, storeEl(top)),
      h('div', { class: 'mc-row top' }, pitsOf(top).slice().reverse().map(i => pitEl(i, top))),
      h('div', { class: 'mc-row bottom' }, pitsOf(bottom).map(i => pitEl(i, bottom))),
      h('div', { class: 'mc-end right' }, storeEl(bottom)),
    );

    let status;
    if (v.phase === 'play') {
      const extra = v.last?.extra && v.last.pid === v.turn;
      status = myTurn
        ? h('strong', {}, extra ? '🟡 ぴったりゴール！もう1回どうぞ' : '🟡 あなたの番です。手前の穴を選んでください')
        : h('span', {}, `${nameOf(v.turn)} さんの番です${extra ? '（もう1回）' : ''}`);
    }

    const lastText = v.last
      ? h('p', { class: 'small', style: { margin: '6px 0 0' } },
          `直前: ${nameOf(v.last.pid)} さんが${v.last.count}個まきました`,
          v.last.extra ? '・ゴールにぴったり' : '',
          v.last.capture ? `・${v.last.capture}個を横取り！` : '',
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, v.players.map(p => `${p.name} ${p.wins}勝`).join('・')),
        ),
        h('div', { style: { margin: '6px 0 10px' } }, status ?? null),
        v.phase === 'end' ? resultBox() : null,
        board,
        lastText,
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, '種は反時計回り（手前は右へ、奥は左へ）にまかれます。右が自分のゴール。'),
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
    const [a, b] = [v.board[STORE[0]], v.board[STORE[1]]];
    const winner = v.players.find(p => p.id === v.winner);
    return h('div', { class: 'result-box' },
      h('h3', {}, winner ? `🏆 ${winner.name} さんの勝ち！` : '🤝 引き分け'),
      h('p', { style: { margin: '4px 0' } }, `${v.players[0].name} ${a}個 ／ ${v.players[1].name} ${b}個`),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（先手と後手を交代）') : null,
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
