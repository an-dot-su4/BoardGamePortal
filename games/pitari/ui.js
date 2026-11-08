// ぴたりトリックの画面
import { h } from '../../js/util.js';
import { cardLabel, LENGTHS, RANK_LABEL, SUIT_MARK, SUIT_NAME, BONUS } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🎯 ぴたりトリックの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'ラウンド数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, length: e.target.value }) },
        Object.entries(LENGTHS).map(([id, label]) => h('option', { value: id, selected: options.length === id }, label)),
      ),
      h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, '最大の枚数は7枚（8人のときは6枚）。たっぷりは約2倍の長さです。'),
    ),
    h('label', { class: 'row small' },
      h('input', { type: 'checkbox', checked: options.hook, disabled: !editable, onchange: e => onChange({ ...options, hook: e.target.checked }) }),
      '親のしばり（宣言の合計がちょうど配った枚数にならないよう、親は1つの数を言えない）',
    ),
  );
}

const red = c => c.s === 'H' || c.s === 'D';

function cardEl(card, { onclick = null, mini = false, dim = false, win = false } = {}) {
  const cls = ['pcard', red(card) && 'red', mini && 'mini', dim && 'pt-dim', win && 'pt-win'].filter(Boolean).join(' ');
  return h('button', { class: cls, type: 'button', disabled: !onclick, onclick, 'aria-label': cardLabel(card), dataset: { card: card.id } },
    h('span', {}, RANK_LABEL[card.r]),
    h('span', { class: 'suit' }, SUIT_MARK[card.s]),
  );
}

export function createUI(root, api) {
  let view = null;

  function render() {
    const v = view;
    const me = v.me;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const myTurn = me && v.turn === me;
    const trumpMark = v.trump ? SUIT_MARK[v.trump.s] : '';

    let status = null;
    if (v.phase === 'bid') status = myTurn ? h('strong', {}, '🟡 何回取るか宣言してください') : h('span', {}, `${nameOf(v.turn)} さんが宣言中`);
    else if (v.phase === 'play') status = myTurn ? h('strong', {}, '🟡 あなたの番です。カードを1枚出してください') : h('span', {}, `${nameOf(v.turn)} さんの番です`);

    const totalBid = v.players.reduce((a, p) => a + (p.bid ?? 0), 0);
    const header = h('div', { class: 'pt-head' },
      h('div', {},
        h('strong', {}, `第${v.round}ラウンド / 全${v.totalRounds}`),
        h('div', { class: 'small muted' }, `手札${v.size}枚・宣言の合計 ${totalBid}`),
      ),
      v.trump
        ? h('div', { class: 'pt-trump' },
            h('div', { class: 'small' }, '切り札'),
            cardEl(v.trump, { mini: true }),
            h('div', { class: 'small' }, SUIT_NAME[v.trump.s]),
          )
        : null,
    );

    const seats = h('div', { class: 'seats' },
      v.players.map(p => {
        const exact = p.bid !== null && p.bid === p.took;
        return h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.id === v.dealer ? '👑 ' : '', p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' },
            p.bid === null ? '宣言: …' : h('span', {}, `宣言 ${p.bid}・取った `, h('strong', { class: exact ? 'pt-ok' : p.took > p.bid ? 'pt-over' : '' }, String(p.took))),
          ),
          h('div', { class: 'small muted' }, `${p.score}点・🂠${p.count}`),
        );
      }),
    );

    // 場: 出ているカード。まだ誰も出していなければ、前のトリック（誰が取ったか）を見せる
    const showing = v.trick.length ? { cards: v.trick, winner: null, last: false } : v.lastTrick ? { ...v.lastTrick, last: true } : null;
    const field = h('div', { class: 'result-box pt-field' },
      h('div', { class: 'row' },
        h('strong', {}, showing?.last ? '前のトリック' : '場'),
        showing?.last ? h('span', { class: 'small' }, `→ ${nameOf(showing.winner)} さんが取りました`) : null,
        !showing?.last && v.trick.length ? h('span', { class: 'small muted' }, `台札 ${SUIT_MARK[v.trick[0].card.s]}・切り札 ${trumpMark}`) : null,
      ),
      showing
        ? h('div', { class: 'pt-trick' }, showing.cards.map(t =>
            h('div', { class: 'pt-played' }, cardEl(t.card, { mini: true, win: showing.last && t.pid === showing.winner, dim: showing.last && t.pid !== showing.winner }), h('div', { class: 'small' }, nameOf(t.pid))),
          ))
        : h('p', { class: 'muted small', style: { margin: '8px 0' } }, v.phase === 'bid' ? '全員の宣言が終わったら、親の左隣から出します。' : 'まだ誰も出していません。'),
    );

    let bidBox = null;
    if (v.phase === 'bid' && myTurn) {
      bidBox = h('div', { class: 'game-actions' },
        h('span', { class: 'small' }, '何回取る？'),
        Array.from({ length: v.size + 1 }, (_, n) =>
          h('button', { class: 'btn pt-bid', type: 'button', disabled: v.forbidden === n, title: v.forbidden === n ? '親のしばりで言えません' : null, onclick: () => api.send({ type: 'bid', n }) }, String(n)),
        ),
        v.forbidden !== null ? h('span', { class: 'small muted' }, `親のしばり: ${v.forbidden} は言えません`) : null,
      );
    }

    const legal = new Set(v.legal);
    const handBox = me
      ? h('div', {},
          h('strong', {}, `あなたの手札（${v.hand.length}枚）`),
          h('div', { class: 'hand' }, v.hand.map(c => cardEl(c, {
            onclick: legal.has(c.id) ? () => api.send({ type: 'play', card: c.id }) : null,
            dim: v.phase === 'play' && myTurn && !legal.has(c.id),
          }))),
          v.phase === 'play' && myTurn && v.trick.length && legal.size < v.hand.length
            ? h('p', { class: 'small muted', style: { margin: 0 } }, `${SUIT_MARK[v.trick[0].card.s]} があるので ${SUIT_MARK[v.trick[0].card.s]} を出します`)
            : null,
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    root.replaceChildren(
      h('div', { class: 'table' },
        header,
        status ? h('div', { style: { margin: '6px 0 10px' } }, status) : null,
        seats,
        v.phase === 'roundEnd' || v.phase === 'end' ? resultBox() : null,
        field,
        bidBox,
        handBox,
        v.history.length ? scoreTable() : null,
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
    const last = v.history[v.history.length - 1];
    const over = v.phase === 'end';
    const ranking = v.players.slice().sort((a, b) => b.score - a.score);
    return h('div', { class: 'result-box' },
      h('h3', {}, over ? '🏆 最終結果' : `第${v.round}ラウンドの結果`),
      over
        ? h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — ${p.score}点`)))
        : h('ul', { class: 'pt-list' }, v.players.map(p => {
            const r = last.rows[p.id];
            return h('li', {}, r.exact ? '🎯 ' : '・', `${p.name}: 宣言${r.bid}・取った${r.took} → +${r.gain}点`, r.exact ? `（ぴたり +${BONUS}）` : '');
          })),
      !over && v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次のラウンドへ') : null,
      over && v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
    );
  }

  function scoreTable() {
    const v = view;
    return h('details', { class: 'pt-scores', open: v.phase === 'end' },
      h('summary', { class: 'small' }, '得点表（取った/宣言 +得点）'),
      h('div', { class: 'pt-scroll' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, '枚'), v.players.map(p => h('th', {}, p.name)))),
          h('tbody', {},
            v.history.map(row => h('tr', {},
              h('td', {}, `${row.size}${SUIT_MARK[row.trump]}`),
              v.players.map(p => {
                const r = row.rows[p.id];
                return h('td', { class: r.exact ? 'pt-ok' : '' }, `${r.took}/${r.bid}`, h('span', { class: 'muted' }, ` +${r.gain}`));
              }),
            )),
            h('tr', {}, h('th', {}, '計'), v.players.map(p => h('th', {}, String(p.score)))),
          ),
        ),
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
