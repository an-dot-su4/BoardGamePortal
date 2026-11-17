// ババ抜きの画面
import { h } from '../../js/util.js';
import { JOKER, RANK_LABEL, SUIT_MARK, cardLabel } from './logic.js';

function face(c) {
  const red = c.s === 'H' || c.s === 'D';
  const joker = c.r === JOKER;
  return h('span', { class: ['pcard', red && 'red', joker && 'joker'].filter(Boolean).join(' '), 'aria-label': cardLabel(c) },
    joker ? h('span', { class: 'suit' }, '🃏') : h('span', {}, RANK_LABEL[c.r]),
    joker ? h('span', {}, 'JOKER') : h('span', { class: 'suit' }, SUIT_MARK[c.s]),
  );
}

export function createUI(root, api) {
  let view = null;

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const target = v.players.find(p => p.id === v.target);

    let status = null;
    if (v.phase === 'play') {
      if (myTurn) status = h('strong', {}, `🟡 ${nameOf(v.target)} さんの手札から1枚引こう`);
      else if (me && v.target === me) status = h('strong', {}, `👀 ${nameOf(v.turn)} さんが、あなたの手札から引こうとしています`);
      else status = h('span', {}, `${nameOf(v.turn)} さんが ${nameOf(v.target)} さんから引く番です`);
    }

    let lastMsg = null;
    if (v.last) {
      const l = v.last;
      lastMsg = h('div', { class: 'bb-last small' },
        `${nameOf(l.drawer)} さんが ${nameOf(l.target)} さんから`,
        l.card ? h('span', { class: 'bb-mini' }, ` ${cardLabel(l.card)} `) : ' 1枚',
        'を引きました',
        l.paired ? h('span', {}, ` → ${RANK_LABEL[l.paired[0].r]}の組を捨てた`) : '',
        l.card && l.card.r === JOKER ? (me === l.drawer ? ' 😱' : me === l.target ? ' 😏' : '') : '',
      );
    }

    const seats = h('div', { class: 'seats' },
      v.players.map(p =>
        h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me', p.id === v.target && 'bb-target'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' }, p.place ? `🎉 ${p.place}番目に上がり` : p.id === v.loser ? '🃏 ババ！' : `🂠 ${p.count}枚`),
          h('div', { class: 'small muted' }, `ババ ${p.losses}回`),
        ),
      ),
    );

    const pick = myTurn && target
      ? h('div', { class: 'result-box' },
          h('div', { class: 'small', style: { marginBottom: '6px' } }, `${target.name} さんの手札（${target.count}枚）。どれを引く？`),
          h('div', { class: 'bb-backs' }, Array.from({ length: target.count }, (_, i) =>
            h('button', { class: 'bb-back', type: 'button', 'aria-label': `${i + 1}枚目を引く`, onclick: () => api.send({ type: 'draw', index: i }) }),
          )),
        )
      : null;

    const hand = me
      ? h('div', {},
          h('div', { class: 'row', style: { justifyContent: 'space-between' } },
            h('strong', {}, `あなたの手札（${v.hand.length}枚）`),
            v.phase === 'play' && v.hand.length > 1 ? h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'shuffle' }) }, '🔀 混ぜる') : null,
          ),
          h('div', { class: 'hand' }, v.hand.map(face)),
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, `捨てたカード ${v.discards}枚`),
        ),
        h('div', { style: { margin: '6px 0' } }, status),
        lastMsg,
        seats,
        v.phase === 'end' ? resultBox() : null,
        pick,
        hand,
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
    return h('div', { class: 'result-box' },
      h('h3', {}, v.loser ? `🃏 ${nameOf(v.loser)} さんがババ！` : '終了'),
      h('ol', {}, [...v.finished, v.loser].filter(Boolean).map(id => h('li', {}, nameOf(id), id === v.loser ? '（ジョーカー）' : ''))),
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
