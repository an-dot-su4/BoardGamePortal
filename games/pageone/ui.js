// ページワンの画面
import { h } from '../../js/util.js';
import { CPU_LEVELS, RANK_LABEL, SUITS, SUIT_MARK, SUIT_NAME, cardLabel } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '☝️ ページワンの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'CPUの強さ'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, cpu: e.target.value }) },
        Object.entries(CPU_LEVELS).map(([id, l]) => h('option', { value: id, selected: options.cpu === id }, l)),
      ),
    ),
  );
}

const red = s => s === 'H' || s === 'D';
function cardEl(c, { onclick = null, big = false, dim = false, sel = false } = {}) {
  return h(onclick ? 'button' : 'span', {
    class: ['pcard', red(c.s) && 'red', big && 'po-big', dim && 'po-dim', sel && 'sel', [2, 8, 11].includes(c.r) && 'po-special'].filter(Boolean).join(' '),
    type: onclick ? 'button' : null, onclick, 'aria-label': cardLabel(c), dataset: { card: c.id },
  }, h('span', {}, RANK_LABEL[c.r]), h('span', { class: 'suit' }, SUIT_MARK[c.s]));
}

export function createUI(root, api) {
  let view = null;
  let pageOne = false; // 「ページワン！」と言ったか（次に出すときに添える）
  let eight = null; // 8を出そうとしてマークを選んでいる

  function play(c) {
    if (c.r === 8) {
      eight = c.id;
      return render();
    }
    api.send({ type: 'play', card: c.id, pageOne });
  }

  function render() {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const can = new Set(v.playable);

    let status = null;
    if (v.phase === 'play') {
      if (myTurn) {
        status = h('strong', {},
          v.penalty ? `🟡 2が重なっています！ 2を出すか、${v.penalty}枚引く` : v.drawn ? '🟡 引いたカードを出す？ それともパス？' : '🟡 あなたの番です。出せるカードを選ぶか、1枚引く');
      } else status = h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }

    const field = h('div', { class: 'result-box po-field' },
      h('div', { class: 'po-pile' },
        h('div', { class: 'small muted' }, '場'),
        cardEl(v.top, { big: true }),
      ),
      h('div', { class: 'po-info' },
        h('div', {}, '今のマーク: ', h('strong', { class: red(v.suit) ? 'po-red' : '' }, `${SUIT_MARK[v.suit]} ${SUIT_NAME[v.suit]}`)),
        v.penalty ? h('div', { class: 'po-pen' }, `⚠️ 2が重なっていて ${v.penalty}枚`) : null,
        h('div', { class: 'small muted' }, `山札 ${v.deckCount}枚`),
      ),
    );

    const seats = h('div', { class: 'seats' },
      v.players.map(p =>
        h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' }, `🂠 ${p.count}枚`, p.count === 1 ? h('strong', { class: 'po-one' }, ' ☝️') : ''),
          h('div', { class: 'small muted' }, `${p.wins}勝`),
        ),
      ),
    );

    let actions = null;
    if (myTurn) {
      const hand = v.hand;
      actions = h('div', {},
        eight
          ? h('div', { class: 'result-box' },
              h('div', { class: 'small' }, '8を出します。次のマークは？'),
              h('div', { class: 'game-actions' },
                SUITS.map(s => h('button', { class: ['btn', red(s) && 'po-redbtn'].filter(Boolean).join(' '), type: 'button', onclick: () => { const id = eight; eight = null; api.send({ type: 'play', card: id, suit: s, pageOne }); } }, `${SUIT_MARK[s]} ${SUIT_NAME[s]}`)),
                h('button', { class: 'btn', type: 'button', onclick: () => { eight = null; render(); } }, 'やめる'),
              ),
            )
          : null,
        h('div', { class: 'game-actions' },
          !v.drawn ? h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'draw' }) }, v.penalty ? `${v.penalty}枚引く` : '🂠 1枚引く') : null,
          v.drawn ? h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'pass' }) }, 'パス') : null,
          hand.length === 2
            ? h('button', { class: ['btn', pageOne && 'primary'].filter(Boolean).join(' '), type: 'button', 'aria-pressed': String(pageOne), onclick: () => { pageOne = !pageOne; render(); } }, pageOne ? '☝️ ページワン！（言った）' : '☝️ ページワン！と言う')
            : null,
        ),
      );
    }

    const handBox = me
      ? h('div', {},
          h('strong', {}, `あなたの手札（${v.hand.length}枚）`),
          v.hand.length === 2 && myTurn && !pageOne ? h('div', { class: 'small po-warn' }, '残り1枚になるカードを出す前に「ページワン！」と言おう（言い忘れると2枚引く）') : null,
          h('div', { class: 'hand' }, v.hand.map(c => cardEl(c, {
            onclick: myTurn && can.has(c.id) ? () => play(c) : null,
            dim: myTurn && !can.has(c.id),
            sel: v.drawn === c.id || eight === c.id,
          }))),
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.games}局`),
          h('span', { class: 'small muted' }, v.last?.card ? `直前: ${nameOf(v.last.by)} さんが ${cardLabel(v.last.card)}` : v.last?.drew ? `直前: ${nameOf(v.last.by)} さんが${v.last.drew}枚引いた` : ''),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        seats,
        v.phase === 'end' ? resultBox() : null,
        field,
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

  function resultBox() {
    const v = view;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const countOf = id => v.players.find(p => p.id === id)?.count ?? 0;
    return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${nameOf(v.winner)} さんが上がり！`),
      h('ol', {}, v.ranking.map(id => h('li', {}, `${nameOf(id)}${id === v.winner ? '' : `（残り${countOf(id)}枚）`}`))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（配り直す）') : null,
    );
  }

  return {
    update(next) {
      // 手番が変わったり手札の枚数が変わったら「言った」状態を戻す
      if (!view || next.turn !== view.turn || next.hand.length !== view.hand.length) pageOne = false;
      if (next.turn !== next.me) eight = null;
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
