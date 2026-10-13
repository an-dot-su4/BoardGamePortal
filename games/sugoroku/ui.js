// わいわいすごろくの画面
import { h } from '../../js/util.js';
import { SPACE_TYPES } from './logic.js';

const COLORS = ['#e8524a', '#3b82f6', '#22a35a', '#f2b705', '#9b5de5', '#f97316'];
const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const COLS = 7;

export function createUI(root, api) {
  let view = null;

  function cell(i) {
    const type = view.board[i];
    const here = view.players.filter(p => p.pos === i);
    const label = i === 0 ? 'スタート' : i === view.goal ? 'ゴール' : SPACE_TYPES[type].label;
    return h('div', { class: ['sg-cell', type, i === view.goal && 'goal', i === 0 && 'start'].filter(Boolean).join(' '), title: label },
      h('span', { class: 'sg-num' }, i === 0 ? 'S' : i === view.goal ? '🏁' : i),
      h('span', { class: 'sg-icon' }, SPACE_TYPES[type].icon),
      h('div', { class: 'sg-tokens' },
        here.map(p => h('span', { class: 'sg-token', style: { background: COLORS[p.color] }, title: p.name }, p.name.slice(0, 1))),
      ),
    );
  }

  function render() {
    const me = view.me;
    const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
    const myTurn = view.phase === 'play' && view.turn === me;
    const lr = view.lastRoll;
    const choosing = myTurn && lr?.by === me && lr.canReroll;

    // 蛇行する盤面: 偶数行は左→右、奇数行は右→左
    const rows = [];
    for (let start = 0; start <= view.goal; start += COLS) {
      const idx = [];
      for (let i = start; i < Math.min(start + COLS, view.goal + 1); i++) idx.push(i);
      if ((start / COLS) % 2 === 1) {
        while (idx.length < COLS) idx.push(null);
        idx.reverse();
      }
      rows.push(idx);
    }
    const boardEl = h('div', { class: 'sg-board', style: { gridTemplateColumns: `repeat(${COLS}, 1fr)` } },
      rows.flat().map(i => (i === null ? h('div', {}) : cell(i))),
    );

    const seats = h('div', { class: 'seats' },
      view.players.map(p =>
        h('div', { class: ['seat', p.id === view.turn && view.phase === 'play' && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, h('span', { class: 'sg-token', style: { background: COLORS[p.color] } }, p.name.slice(0, 1)), ' ', p.name),
          h('div', { class: 'small' }, `${p.pos}マス目・🪙${p.coins}`, p.rest ? '・💤休み' : ''),
        ),
      ),
    );

    const rollBox = h('div', { class: 'result-box row', style: { justifyContent: 'space-between' } },
      lr
        ? h('div', { class: 'row' },
            h('span', { class: 'sg-dice' }, DICE[lr.roll]),
            h('span', {}, `${nameOf(lr.by)} さん: ${lr.roll} の目（${lr.from} → ${lr.to}マス目）`),
          )
        : h('span', {}, 'サイコロを振ってスタート！'),
      view.lastCard ? h('span', { class: 'small' }, `❓ ${view.lastCard.text}`) : null,
    );

    let actions = null;
    if (view.phase === 'play') {
      if (choosing) {
        actions = h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'end' }) }, 'このまま進む'),
          h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'reroll' }) }, `🪙${view.rerollCost}枚で振り直す`),
        );
      } else if (myTurn) {
        actions = h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary', type: 'button', style: { fontSize: '1.2rem', padding: '12px 28px' }, onclick: () => api.send({ type: 'roll' }) }, '🎲 サイコロを振る'),
        );
      } else {
        actions = h('p', {}, `${nameOf(view.turn)} さんの番です`);
      }
    }

    const ending = view.phase === 'over'
      ? h('div', { class: 'result-box' },
          h('h3', {}, `🏆 ${nameOf(view.winner)} さんの優勝！`),
          me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度') : null,
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        seats,
        ending,
        rollBox,
        actions,
        boardEl,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール・マスの説明'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  return {
    update(nextView) {
      view = nextView;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
