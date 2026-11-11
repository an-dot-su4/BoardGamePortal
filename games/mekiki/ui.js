// 目利き市の画面
import { h } from '../../js/util.js';
import { KINDS, KIND_ICON, KIND_NAME, MAJORITY, MONEY_RATE, ROUND_COUNTS, itemLabel } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🏺 目利き市の設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '競りの回数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}回${n === 12 ? '（標準）' : n < 12 ? '（短め）' : '（長め・全部の宝）'}`)),
      ),
    ),
  );
}

function itemCard(it, { big = false } = {}) {
  return h('span', { class: ['mk-item', `k-${it.k}`, big && 'big'].filter(Boolean).join(' '), title: itemLabel(it) },
    h('span', { class: 'mk-icon' }, KIND_ICON[it.k]),
    h('b', {}, String(it.v)),
    big ? h('span', { class: 'mk-kname' }, KIND_NAME[it.k]) : null,
  );
}

export function createUI(root, api) {
  let view = null;
  let amount = 0;
  let lastRound = null;

  function render() {
    const v = view;
    const me = v.me;
    const mine = v.players.find(p => p.id === me);
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';

    const seats = h('div', { class: 'seats' },
      v.players.map(p =>
        h('div', { class: ['seat', p.id === me && 'me', v.phase === 'bid' && !p.ready && 'turn'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.id === v.parent ? '🔨 ' : '', p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' }, `💰 ${p.money}金`, v.phase === 'bid' ? (p.ready ? '・✅ 入れ札済み' : '・⌛ 考え中') : ''),
          h('div', { class: 'mk-items' }, KINDS.map(k => p.items.filter(it => it.k === k).sort((a, b) => a.v - b.v).map(it => itemCard(it)))),
        ),
      ),
    );

    const stage = h('div', { class: 'result-box mk-stage' },
      h('div', { class: 'small muted' }, `第${v.round}回 / 全${v.totalRounds}回・親 🔨 ${nameOf(v.parent)}（同じ値なら親に近い人が優先）`),
      h('div', { class: 'mk-now' }, itemCard(v.current, { big: true }),
        h('div', { class: 'small' }, h('div', {}, `数字 ${v.current.v} 点`), h('div', { class: 'muted' }, `種類でいちばん多く持つと +${MAJORITY}点`))),
    );

    let panel = null;
    if (me && v.phase === 'bid') {
      if (v.myBid !== null) {
        panel = h('div', { class: 'result-box' },
          h('p', { style: { margin: '0 0 6px' } }, `あなたの入れ札: `, h('strong', {}, `${v.myBid}金`), '（全員がそろうまで変えられます）'),
          h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'cancel' }) }, '取り消して出し直す'),
        );
      } else {
        amount = Math.max(0, Math.min(amount, mine.money));
        const set = n => { amount = Math.max(0, Math.min(mine.money, n)); render(); };
        panel = h('div', { class: 'result-box mk-panel' },
          h('div', { class: 'small' }, 'いくらで買う？（ほかの人には見えません）'),
          h('div', { class: 'row', style: { marginTop: '6px' } },
            h('button', { class: 'btn', type: 'button', onclick: () => set(amount - 5), disabled: amount <= 0 }, '−5'),
            h('button', { class: 'btn', type: 'button', onclick: () => set(amount - 1), disabled: amount <= 0 }, '−1'),
            h('strong', { class: 'mk-amount' }, `${amount}金`),
            h('button', { class: 'btn', type: 'button', onclick: () => set(amount + 1), disabled: amount >= mine.money }, '＋1'),
            h('button', { class: 'btn', type: 'button', onclick: () => set(amount + 5), disabled: amount >= mine.money }, '＋5'),
          ),
          h('div', { class: 'game-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'bid', amount }) }, `${amount}金で入れ札する`),
            h('span', { class: 'small muted' }, `所持金 ${mine.money}金・残り3金につき1点`),
          ),
        );
      }
    }

    root.replaceChildren(
      h('div', { class: 'table' },
        v.phase === 'bid'
          ? h('div', { style: { marginBottom: '8px' } }, me && v.myBid === null ? h('strong', {}, '🟡 値をつけてください') : h('span', {}, `ほかの人の入れ札を待っています（${v.players.filter(p => !p.ready).length}人）`))
          : null,
        stage,
        v.result ? resultBox() : null,
        panel,
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        seats,
        v.phase === 'end' ? scoreTable() : null,
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
    const r = v.result;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const order = v.players.slice().sort((a, b) => r.bids[b.id] - r.bids[a.id]);
    const over = v.phase === 'end';
    return h('div', { class: 'result-box' },
      h('h3', {}, r.winner ? `🔨 ${nameOf(r.winner)} さんが ${r.price}金で落札！` : '🍂 だれも値をつけず流れました'),
      h('div', { class: 'mk-bids' }, order.map(p =>
        h('div', { class: p.id === r.winner ? 'win' : '' }, h('span', {}, p.name), h('b', {}, `${r.bids[p.id]}金`)),
      )),
      !over && v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次の競りへ') : null,
    );
  }

  function scoreTable() {
    const v = view;
    const names = v.players.filter(p => v.winners.includes(p.id)).map(p => p.name);
    const rows = v.players.slice().sort((a, b) => b.score.total - a.score.total);
    return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${names.join('・')} さんの勝ち！`),
      h('div', { class: 'mk-scroll' },
        h('table', { class: 'mk-table' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, '宝'), h('th', {}, '多数派'), h('th', {}, `お金÷${MONEY_RATE}`), h('th', {}, '合計'))),
          h('tbody', {}, rows.map(p => h('tr', {},
            h('td', {}, p.name),
            h('td', {}, String(p.score.items)),
            h('td', {}, `${p.score.majority}`, p.score.majorityKinds.length ? ` ${p.score.majorityKinds.map(k => KIND_ICON[k]).join('')}` : ''),
            h('td', {}, String(p.score.money)),
            h('td', {}, h('strong', {}, String(p.score.total))),
          ))),
        ),
      ),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
    );
  }

  return {
    update(next) {
      if (next.round !== lastRound) {
        amount = 0;
        lastRound = next.round;
      }
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
