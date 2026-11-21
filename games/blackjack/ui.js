// ブラックジャックの画面
import { h } from '../../js/util.js';
import { MIN_BET, RANK_LABEL, ROUND_COUNTS, SUIT_MARK, cardLabel } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '♠️ ブラックジャックの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '遊ぶ回数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}回${n === 8 ? '（標準）' : ''}`)),
      ),
    ),
  );
}

const red = c => c.s === 'H' || c.s === 'D';
function card(c, mini = false) {
  if (!c) return h('span', { class: ['pcard bj-back', mini && 'mini'].filter(Boolean).join(' '), 'aria-label': '伏せ札' });
  return h('span', { class: ['pcard', red(c) && 'red', mini && 'mini'].filter(Boolean).join(' '), 'aria-label': cardLabel(c) },
    h('span', {}, RANK_LABEL[c.r]), h('span', { class: 'suit' }, SUIT_MARK[c.s]));
}
const RESULT = { win: '勝ち', blackjack: 'ブラックジャック！', push: '引き分け', lose: '負け', bust: 'バースト' };

export function createUI(root, api) {
  let view = null;
  let amount = 10;

  function render() {
    const v = view;
    const me = v.me;
    const mine = v.players.find(p => p.id === me);
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const myTurn = me && v.turn === me && v.phase === 'play';

    let status = null;
    if (v.phase === 'bet') {
      const waiting = v.players.filter(p => !p.out && p.bet === null);
      status = mine && !mine.out && mine.bet === null ? h('strong', {}, '🟡 賭けるチップを決めてください') : h('span', {}, `賭けを待っています: ${waiting.map(p => p.name).join('・')}`);
    } else if (v.phase === 'play') {
      status = myTurn ? h('strong', {}, '🟡 あなたの番です。ヒット？ スタンド？') : h('span', {}, `${nameOf(v.turn)} さんの番です`);
    }

    const dealer = h('div', { class: 'result-box bj-dealer' },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('strong', {}, '🎩 ディーラー'),
        v.dealerTotal !== null ? h('span', { class: 'bj-total' }, v.dealer.includes(null) ? `${v.dealerTotal} ＋ ?` : v.dealerTotal > 21 ? `${v.dealerTotal}（バースト）` : String(v.dealerTotal)) : null,
      ),
      h('div', { class: 'hand' }, v.dealer.length ? v.dealer.map(c => card(c)) : h('span', { class: 'small muted' }, '賭けがそろったら配ります')),
    );

    const seats = h('div', { class: 'bj-seats' }, v.players.map(p => {
      const r = v.results?.[p.id];
      return h('div', { class: ['seat bj-seat', p.id === v.turn && 'turn', p.id === me && 'me', p.out && 'dead'].filter(Boolean).join(' ') },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('span', { class: 'small' }, `🪙 ${p.chips}`),
        ),
        h('div', { class: 'small' }, p.out ? '見学（チップ不足）' : p.bet === null ? '賭け: …' : p.bet === '?' ? '賭け: ✅' : `賭け: ${p.bet}`),
        p.hand ? h('div', { class: 'hand bj-hand' }, p.hand.map(c => card(c, true))) : null,
        p.total !== null ? h('div', { class: 'small' }, `合計 ${p.total}`, p.total > 21 ? '（バースト）' : '') : null,
        r ? h('div', { class: `bj-res ${r.kind}` }, `${RESULT[r.kind]} ${r.gain > 0 ? '+' : ''}${r.gain}`) : null,
      );
    }));

    let panel = null;
    if (v.phase === 'bet' && mine && !mine.out && mine.bet === null) {
      amount = Math.max(MIN_BET, Math.min(amount, mine.chips));
      const set = n => { amount = Math.max(MIN_BET, Math.min(mine.chips, n)); render(); };
      panel = h('div', { class: 'result-box' },
        h('div', { class: 'row bj-betrow' },
          h('button', { class: 'btn', type: 'button', onclick: () => set(amount - 5), disabled: amount <= MIN_BET }, '−5'),
          h('strong', { class: 'bj-amount' }, `${amount}枚`),
          h('button', { class: 'btn', type: 'button', onclick: () => set(amount + 5), disabled: amount >= mine.chips }, '＋5'),
          [10, 25, 50].map(n => h('button', { class: 'btn', type: 'button', onclick: () => set(n), disabled: n > mine.chips }, String(n))),
          h('button', { class: 'btn', type: 'button', onclick: () => set(mine.chips) }, '全部'),
        ),
        h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'bet', amount }) }, `${amount}枚賭ける`),
          h('span', { class: 'small muted' }, `持ちチップ ${mine.chips}枚`),
        ),
      );
    } else if (myTurn) {
      const canDouble = mine.hand.length === 2 && mine.chips >= mine.bet * 2;
      panel = h('div', { class: 'game-actions' },
        h('button', { class: 'btn primary bj-big', type: 'button', onclick: () => api.send({ type: 'hit' }) }, '🂠 ヒット（1枚引く）'),
        h('button', { class: 'btn bj-big', type: 'button', onclick: () => api.send({ type: 'stand' }) }, '✋ スタンド'),
        canDouble ? h('button', { class: 'btn bj-big', type: 'button', onclick: () => api.send({ type: 'double' }) }, `💰 ダブル（賭け${mine.bet * 2}枚で1枚だけ）`) : null,
      );
    } else if (v.phase === 'result' && me) {
      panel = h('div', { class: 'game-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次の回へ'));
    }

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, `第${v.round}回 / 全${v.totalRounds}回`),
          h('span', { class: 'small muted' }, `山札 ${v.shoeLeft}枚`),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        v.phase === 'end' ? resultBox() : null,
        dealer,
        panel,
        seats,
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
    const ranking = v.players.slice().sort((a, b) => b.chips - a.chips);
    return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${names.join('・')} さんの勝ち！`),
      h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — チップ${p.chips}枚`))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
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
