// 大富豪の画面
import { h } from '../../js/util.js';
import { bestPlay, cardLabel, RANK_LABEL, SUIT_MARK } from './logic.js';

function cardEl(card, { selected = false, mini = false, onclick = null, disabled = false } = {}) {
  const red = card.s === 'H' || card.s === 'D';
  const joker = card.s === 'X';
  const cls = ['pcard', red && 'red', joker && 'joker', selected && 'sel', mini && 'mini'].filter(Boolean).join(' ');
  return h('button', {
    class: cls,
    type: 'button',
    disabled: disabled || !onclick,
    onclick,
    'aria-pressed': onclick ? String(selected) : null,
    'aria-label': cardLabel(card),
    dataset: { card: card.id },
  },
    joker ? h('span', { class: 'suit' }, '🃏') : h('span', {}, RANK_LABEL[card.r]),
    joker ? h('span', {}, 'JOKER') : h('span', { class: 'suit' }, SUIT_MARK[card.s]),
  );
}

export function createUI(root, api) {
  let selected = new Set();
  let view = null;

  function toggle(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    render();
  }

  function render() {
    const me = view.me;
    const myTurn = view.phase === 'play' && view.turn === me;
    const hand = view.hand;
    const picked = hand.filter(c => selected.has(c.id));
    const playable = myTurn && picked.length > 0 && !!bestPlay(picked, view.field, view.revolution);
    const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';

    const seats = h('div', { class: 'seats' },
      view.players.map(p =>
        h('div', { class: ['seat', p.id === view.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name),
          h('div', { class: 'small' },
            p.place ? `🎉 ${p.place}位で上がり` : `🂠 ${p.count}枚`,
            p.passed ? '・パス' : '',
          ),
          h('div', { class: 'small muted' }, `${p.score}点`, p.title ? `・前回 ${p.title}` : ''),
        ),
      ),
    );

    const field = h('div', { class: 'result-box' },
      h('div', { class: 'row' },
        h('strong', {}, '場'),
        view.revolution ? h('span', { class: 'tag competitive' }, '⚡ 革命中') : null,
        view.field ? h('span', { class: 'small muted' }, `${nameOf(view.field.by)} さんが出したカード`) : null,
      ),
      view.field
        ? h('div', { class: 'hand' }, view.field.cards.map(c => cardEl(c, { mini: true })))
        : h('p', { class: 'muted', style: { margin: '8px 0' } }, '場は空です。好きなカードを出せます。'),
    );

    let status;
    if (view.phase === 'play') {
      status = myTurn
        ? h('strong', {}, '🟡 あなたの番です')
        : h('span', {}, `${nameOf(view.turn)} さんの番です`);
    }

    const result = view.phase !== 'play' ? resultBox() : null;

    const exchange = view.phase === 'play' && view.myExchange.length && hand.length > 0
      ? h('p', { class: 'small muted' }, '🔁 カード交換: ' + view.myExchange.map(e => `${e.gave.length}枚渡して ${e.got.length}枚受け取りました`).join(' / '))
      : null;

    const actions = me && view.phase === 'play'
      ? h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary', type: 'button', disabled: !playable, onclick: play }, '出す'),
          h('button', { class: 'btn', type: 'button', disabled: !myTurn || !view.field, onclick: pass }, 'パス'),
          selected.size ? h('button', { class: 'btn', type: 'button', onclick: () => { selected.clear(); render(); } }, '選択解除') : null,
          myTurn && picked.length && !playable ? h('span', { class: 'small' }, 'その組み合わせは出せません') : null,
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${view.round}ラウンド / 全${view.totalRounds}ラウンド`),
          status,
        ),
        seats,
        field,
        result,
        me
          ? h('div', {},
              h('strong', {}, `あなたの手札（${hand.length}枚）`),
              h('div', { class: 'hand' }, hand.map(c => cardEl(c, { selected: selected.has(c.id), onclick: () => toggle(c.id), disabled: view.phase !== 'play' }))),
            )
          : h('p', { class: 'muted' }, '👀 観戦中です'),
        exchange,
        actions,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function resultBox() {
    const ranking = view.players
      .filter(p => p.place)
      .sort((a, b) => a.place - b.place);
    const totals = view.players.slice().sort((a, b) => b.score - a.score);
    const over = view.phase === 'gameEnd';
    return h('div', { class: 'result-box' },
      h('h3', {}, over ? '🏆 最終結果' : `第${view.round}ラウンドの結果`),
      over
        ? h('ol', {}, totals.map(p => h('li', {}, `${p.name} — ${p.score}点`)))
        : h('ol', {}, ranking.map(p => h('li', {}, `${p.title} ${p.name}`))),
      !over && view.me
        ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次のラウンドへ')
        : null,
      over ? h('p', { class: 'small muted' }, 'ホストは「ロビーに戻る」から、もう一度遊んだり別のゲームを選べます。') : null,
    );
  }

  function play() {
    api.send({ type: 'play', cards: [...selected] });
    selected.clear();
  }

  function pass() {
    api.send({ type: 'pass' });
    selected.clear();
  }

  return {
    update(nextView) {
      view = nextView;
      const ids = new Set(view.hand.map(c => c.id));
      selected = new Set([...selected].filter(id => ids.has(id)));
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
