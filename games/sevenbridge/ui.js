// セブンブリッジの画面
import { h } from '../../js/util.js';
import { RANK_LABEL, ROUND_COUNTS, SUIT_MARK, cardLabel, cardPoints, handPoints, meldOf } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🌉 セブンブリッジの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'ラウンド数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}ラウンド${n === 3 ? '（標準）' : ''}`)),
      ),
    ),
  );
}

const red = s => s === 'H' || s === 'D';
function cardEl(c, { onclick = null, mini = false, sel = false, cls = '' } = {}) {
  return h(onclick ? 'button' : 'span', {
    class: ['pcard', red(c.s) && 'red', mini && 'mini', sel && 'sel', cls].filter(Boolean).join(' '),
    type: onclick ? 'button' : null, onclick, 'aria-label': cardLabel(c), 'aria-pressed': onclick ? String(sel) : null, dataset: { card: c.id },
  }, h('span', {}, RANK_LABEL[c.r]), h('span', { class: 'suit' }, SUIT_MARK[c.s]));
}

export function createUI(root, api) {
  let view = null;
  let sel = []; // 選んでいる手札
  let byRank = false; // 手札を数字順に並べる

  const toggle = id => {
    sel = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id];
    render();
  };
  const send = a => {
    sel = [];
    api.send(a);
  };

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const selCards = sel.map(id => v.hand.find(c => c.id === id)).filter(Boolean);
    const one = selCards.length === 1 ? selCards[0] : null;
    const playing = myTurn && v.phase === 'play';

    let status = null;
    if (v.phase === 'draw' || v.phase === 'play') {
      if (myTurn && v.phase === 'draw') status = h('strong', {}, '🟡 あなたの番です。山札か捨て札から1枚引こう');
      else if (playing) status = h('strong', {}, '🟡 組を出す・つけ札をする（なくてもよい）→ 最後に1枚捨てる');
      else status = h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }

    const seats = h('div', { class: 'seats' }, v.players.map(p =>
      h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
        h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
        h('div', { class: 'small' }, `🂠 ${p.count}枚`),
        h('div', { class: 'small muted' }, `${p.score}点`),
      ),
    ));

    const piles = h('div', { class: 'result-box sb-piles' },
      h('div', { class: 'sb-pile' },
        h('div', { class: 'small muted' }, `山札 ${v.stockCount}枚`),
        h('span', { class: 'pcard sb-back' }, '🂠'),
      ),
      h('div', { class: 'sb-pile' },
        h('div', { class: 'small muted' }, `捨て札 ${v.discardCount}枚`),
        v.discardTop ? cardEl(v.discardTop) : h('span', { class: 'pcard sb-empty' }, '—'),
      ),
      myTurn && v.phase === 'draw'
        ? h('div', { class: 'game-actions sb-draw' },
            h('button', { class: 'btn primary', type: 'button', disabled: !v.stockCount, onclick: () => send({ type: 'draw', from: 'stock' }) }, '🂠 山札から引く'),
            v.discardTop ? h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'draw', from: 'discard' }) }, `${cardLabel(v.discardTop)} を取る`) : null,
          )
        : null,
    );

    const melds = h('div', { class: 'result-box' },
      h('div', { class: 'small muted' }, `場の組（${v.melds.length}）`, one && playing ? ` — ${cardLabel(one)} をつけられる組に「＋」が出ます` : ''),
      v.melds.length
        ? h('div', { class: 'sb-melds' }, v.melds.map(m => {
            const fits = one && playing && meldOf([...m.cards, one]);
            return h('div', { class: ['sb-meld', fits && 'fits', v.last?.meld === m.id && 'last'].filter(Boolean).join(' '), dataset: { meld: m.id } },
              h('div', { class: 'sb-cards' }, m.cards.map(c => cardEl(c, { mini: true, cls: v.last?.card === c.id ? 'sb-new' : '' }))),
              h('div', { class: 'small muted sb-owner' }, nameOf(m.owner)),
              fits ? h('button', { class: 'btn primary sb-add', type: 'button', onclick: () => send({ type: 'layoff', card: one.id, meld: m.id }) }, '＋ここにつける') : null,
            );
          }))
        : h('div', { class: 'small muted' }, 'まだありません'),
    );

    let actions = null;
    if (playing) {
      const m = selCards.length ? meldOf(selCards) : null;
      const canDiscard = one && (one.id !== v.taken || v.hand.length === 1);
      actions = h('div', { class: 'game-actions' },
        h('button', { class: 'btn primary', type: 'button', disabled: !m, onclick: () => send({ type: 'meld', cards: sel }) }, m ? `組を出す（${selCards.length}枚）` : '組を出す'),
        h('button', { class: 'btn', type: 'button', disabled: !canDiscard, onclick: () => send({ type: 'discard', card: one.id }) }, one ? `${cardLabel(one)} を捨てて終わる` : '1枚選んで捨てる'),
        sel.length ? h('button', { class: 'btn', type: 'button', onclick: () => { sel = []; render(); } }, '選択をやめる') : null,
      );
    }

    let handBox;
    if (me) {
      const hand = byRank ? v.hand.slice().sort((a, b) => a.r - b.r || a.s.localeCompare(b.s)) : v.hand;
      handBox = h('div', {},
        h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } },
          h('strong', {}, `あなたの手札（${v.hand.length}枚・${handPoints(v.hand)}点）`),
          h('button', { class: 'btn sb-sort', type: 'button', onclick: () => { byRank = !byRank; render(); } }, byRank ? 'マーク順にする' : '数字順にする'),
        ),
        playing && v.taken && v.hand.length > 1 ? h('div', { class: 'small muted' }, `※ 取った ${cardLabel(v.hand.find(c => c.id === v.taken) ?? { s: 'S', r: 1 })} はこの手番には捨てられません`) : null,
        h('div', { class: 'hand' }, hand.map(c => cardEl(c, {
          onclick: playing ? () => toggle(c.id) : null,
          sel: sel.includes(c.id),
          cls: c.id === v.taken ? 'sb-taken' : '',
        }))),
      );
    } else handBox = h('p', { class: 'muted' }, '👀 観戦中です');

    let result = null;
    if (v.result) {
      const r = v.result;
      result = h('div', { class: 'result-box' },
        h('h3', {}, v.phase === 'end'
          ? `🏆 ${v.players.filter(p => v.winners.includes(p.id)).map(p => p.name).join('・')} さんの勝ち！`
          : r.winner ? `${nameOf(r.winner)} さんが上がり（+${r.pts}点）` : '山札が尽きて引き分け'),
        h('div', { class: 'small' }, v.players.map(p => h('div', { class: 'sb-left' },
          h('span', {}, `${p.name}: `),
          r.left[p.id].length ? [r.left[p.id].map(c => cardEl(c, { mini: true })), h('span', {}, ` ${r.left[p.id].reduce((s, c) => s + cardPoints(c), 0)}点`)] : h('span', {}, '上がり'),
        ))),
        v.phase === 'end' ? h('ol', {}, v.players.slice().sort((a, b) => b.score - a.score).map(p => h('li', {}, `${p.name} — ${p.score}点`))) : null,
        me && v.phase === 'result' ? h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'next' }) }, '次のラウンドへ') : null,
        me && v.phase === 'end' ? h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
      );
    }

    let lastText = '';
    if (v.last?.took) lastText = `直前: ${nameOf(v.last.by)} さんが捨て札の ${cardLabel(v.last.took)} を取った`;
    else if (v.last?.discarded) lastText = `直前: ${nameOf(v.last.by)} さんが ${cardLabel(v.last.discarded)} を捨てた`;
    else if (v.last?.drew) lastText = `直前: ${nameOf(v.last.by)} さんが山札から引いた`;

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.round}ラウンド / 全${v.totalRounds}`),
          h('span', { class: 'small muted' }, lastText),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        seats,
        result,
        piles,
        melds,
        handBox,
        actions,
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
      const ids = new Set(next.hand.map(c => c.id));
      sel = next.turn === next.me && next.phase === 'play' ? sel.filter(id => ids.has(id)) : [];
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
