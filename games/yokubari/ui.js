// よくばりダイスの画面
import { h } from '../../js/util.js';
import { GOALS } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🐷 よくばりダイスの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '目標点'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, goal: Number(e.target.value) }) },
        GOALS.map(n => h('option', { value: n, selected: options.goal === n }, `${n}点${n === 100 ? '（標準）' : n < 100 ? '（短め）' : '（長め）'}`)),
      ),
    ),
  );
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function die(v, rolling) {
  return h('span', { class: ['yk-die', v === 1 && 'one', rolling && 'rolling'].filter(Boolean).join(' '), 'aria-label': `${v}の目` },
    Array.from({ length: 9 }, (_, i) => h('i', { class: PIPS[v].includes(i) ? 'pip' : '' })),
  );
}

const MESSAGE = {
  ok: g => `+${g}点`,
  double: g => `ゾロ目で2倍！ +${g}点`,
  bust: () => '💥 1が出た！ 手持ちが消えた',
  pinzoro: () => '💀 ピンゾロ！ ためた点まで0に',
};

export function createUI(root, api) {
  let view = null;
  let seenSeq = null;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render(rolling) {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const last = v.last;

    let status = null;
    if (v.phase === 'play') {
      status = myTurn ? h('strong', {}, '🟡 あなたの番です。振る？ ためる？') : h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }

    const board = h('div', { class: 'yk-board' },
      v.players.map(p => {
        const pct = Math.min(100, (p.score / v.goal) * 100);
        const potPct = p.id === v.turn ? Math.min(100 - pct, (v.pot / v.goal) * 100) : 0;
        return h('div', { class: ['yk-row', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'yk-name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'yk-bar' },
            h('span', { class: 'yk-fill', style: { width: `${pct}%` } }),
            potPct ? h('span', { class: 'yk-pot', style: { width: `${potPct}%`, left: `${pct}%` } }) : null,
          ),
          h('div', { class: 'yk-score' }, String(p.score), p.id === v.turn && v.pot ? h('span', { class: 'yk-plus' }, `+${v.pot}`) : null),
        );
      }),
    );

    const showLast = last && (last.by === v.turn || v.phase === 'end' || last.kind === 'bust' || last.kind === 'pinzoro' || last.held);
    const stage = h('div', { class: 'result-box yk-stage' },
      h('div', { class: 'yk-dice' }, showLast ? last.dice.map(d => die(d, rolling)) : [h('span', { class: 'yk-die blank' }), h('span', { class: 'yk-die blank' })]),
      h('div', { class: 'yk-info' },
        showLast
          ? h('div', { class: `yk-msg ${last.kind}` }, last.by !== v.turn ? `${nameOf(last.by)}: ` : '', last.held ? `💰 ${last.pot}点をためた` : MESSAGE[last.kind](last.gain))
          : h('div', { class: 'small muted' }, 'まだ振っていません'),
        v.phase === 'play' ? h('div', {}, h('span', { class: 'small' }, '手持ち '), h('strong', { class: 'yk-potnum' }, `${v.pot}点`), h('span', { class: 'small muted' }, `（${v.rolls}回振った）`)) : null,
      ),
    );

    const actions = myTurn
      ? h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary yk-big', type: 'button', onclick: () => api.send({ type: 'roll' }) }, '🎲 振る'),
          h('button', { class: 'btn yk-big', type: 'button', disabled: v.pot === 0, onclick: () => api.send({ type: 'hold' }) }, `💰 ためる${v.pot ? `（${v.pot}点）` : ''}`),
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局・目標${v.goal}点`),
          h('span', { class: 'small muted' }, v.players.map(p => `${p.name} ${p.wins}勝`).join('・')),
        ),
        v.lastRound && v.phase === 'play' ? h('div', { class: 'small yk-last' }, '🏁 だれかが目標に届きました。この周で終わり！') : null,
        h('div', { style: { margin: '6px 0 8px' } }, status),
        v.phase === 'end' ? resultBox() : null,
        stage,
        actions,
        board,
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
    const ranking = v.players.slice().sort((a, b) => b.score - a.score);
    return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${names.join('・')} さんの勝ち！`),
      h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — ${p.score}点`))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（先手は次の人）') : null,
    );
  }

  return {
    update(next) {
      // 新しく振ったときだけサイコロを揺らす
      const rolled = seenSeq !== null && next.seq !== seenSeq && next.last && !next.last.held && next.last !== view?.last;
      seenSeq = next.seq;
      view = next;
      render(rolled && !reduce);
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
