// 4択クイズ大会の画面
import { h } from '../../js/util.js';
import { BASE, CPU_LEVELS, ROUND_COUNTS } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '❓ 4択クイズ大会の設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '問題の数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}問${n === 10 ? '（標準）' : ''}`)),
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

const LETTERS = ['A', 'B', 'C', 'D'];

export function createUI(root, api) {
  let view = null;

  function render() {
    const v = view;
    const me = v.me;
    const open = v.answer !== null;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const canAnswer = me && v.phase === 'answer' && v.myAnswer === null;

    const choices = h('div', { class: 'qz-choices' }, v.choices.map((c, i) => {
      const cls = ['qz-choice',
        v.myAnswer === i && 'mine',
        open && i === v.answer && 'right',
        open && v.myAnswer === i && i !== v.answer && 'wrong',
      ].filter(Boolean).join(' ');
      const who = open ? Object.entries(v.answers).filter(([, a]) => a === i).map(([p]) => nameOf(p)) : [];
      return h('button', { class: cls, type: 'button', disabled: !canAnswer, onclick: () => api.send({ type: 'answer', choice: i }) },
        h('span', { class: 'qz-letter' }, LETTERS[i]),
        h('span', { class: 'qz-text' }, c),
        who.length ? h('span', { class: 'qz-who' }, who.join('・')) : null,
      );
    }));

    let status = null;
    if (v.phase === 'answer') {
      const waiting = v.players.filter(p => !p.answered).map(p => p.name);
      status = canAnswer ? h('strong', {}, '🟡 答えを選んでください（早く正解するとボーナス）') : h('span', { class: 'small' }, `答えを待っています: ${waiting.join('・')}`);
    } else if (v.result) {
      const mine = me ? v.result.gains[me] : null;
      status = h('strong', {}, mine === null ? '正解発表' : mine > 0 ? `⭕ 正解！ +${mine}点` : v.myAnswer === null ? '' : '❌ ざんねん')
    }

    const board = h('div', { class: 'qz-board' }, v.players.slice().sort((a, b) => b.score - a.score).map(p =>
      h('div', { class: ['qz-row', p.id === me && 'me'].filter(Boolean).join(' ') },
        h('span', { class: 'qz-name' }, p.name, p.bot ? ' 🤖' : ''),
        h('span', { class: 'small' }, v.phase === 'answer' ? (p.answered ? '✅' : '🤔') : v.result?.gains[p.id] ? `+${v.result.gains[p.id]}` : ''),
        h('span', { class: 'qz-score' }, `${p.score}点`),
      ),
    ));

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.round}問 / 全${v.totalRounds}問`),
          h('span', { class: 'small muted' }, `正解 ${BASE}点＋早い順に +3/+2/+1`),
        ),
        h('div', { class: 'qz-q' }, v.question),
        choices,
        h('div', { style: { margin: '8px 0' } }, status),
        v.phase === 'reveal' && me ? h('div', { class: 'game-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次の問題へ')) : null,
        v.phase === 'end'
          ? h('div', { class: 'result-box' },
              h('h3', {}, `🏆 ${v.players.filter(p => v.winners.includes(p.id)).map(p => p.name).join('・')} さんの優勝！`),
              h('ol', {}, v.players.slice().sort((a, b) => b.score - a.score).map(p => h('li', {}, `${p.name} — ${p.score}点（${p.correct}問正解）`))),
              me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度（別の問題）') : null,
            )
          : null,
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
