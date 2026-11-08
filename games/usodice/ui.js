// うそつきダイスの画面
import { h } from '../../js/util.js';
import { bidText, countFace, DICE_COUNTS, isRaise, minRaise } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🤥 うそつきダイスの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '1人のサイコロの数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, dice: Number(e.target.value) }) },
        DICE_COUNTS.map(n => h('option', { value: n, selected: options.dice === n }, `${n}個${n === 5 ? '（標準）' : '（短め）'}`)),
      ),
    ),
    h('label', { class: 'row small' },
      h('input', { type: 'checkbox', checked: options.wild, disabled: !editable, onchange: e => onChange({ ...options, wild: e.target.checked }) }),
      '1は★（どの目としても数える）',
    ),
  );
}

// サイコロ（目の数だけ点を打つ）
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function die(v, { hit = false, hidden = false, small = false } = {}) {
  const cls = ['ud-die', hit && 'hit', hidden && 'hidden', small && 'small', v === 1 && 'one'].filter(Boolean).join(' ');
  if (hidden) return h('span', { class: cls, 'aria-label': '伏せたサイコロ' }, '?');
  return h('span', { class: cls, 'aria-label': `${v}の目`, dataset: { v } },
    Array.from({ length: 9 }, (_, i) => h('i', { class: PIPS[v].includes(i) ? 'pip' : '' })),
  );
}

export function createUI(root, api) {
  let view = null;
  let pick = null; // 宣言しようとしている { q, f }

  function render() {
    const v = view;
    const me = v.me;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const myTurn = me && v.turn === me && v.phase === 'bid';
    const prev = v.bids[v.bids.length - 1] ?? null;
    const wild = v.options.wild;

    let status = null;
    if (v.phase === 'bid') status = myTurn ? h('strong', {}, prev ? '🟡 あなたの番です。上げるか、ダウト！' : '🟡 あなたから宣言します') : h('span', {}, `${nameOf(v.turn)} さんの番です`);

    const seats = h('div', { class: 'seats' },
      v.players.map(p =>
        h('div', { class: ['seat', p.id === v.turn && 'turn', p.id === me && 'me', p.out && 'dead'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'ud-row' }, p.out ? h('span', { class: 'small' }, '脱落') : Array.from({ length: p.count }, () => die(0, { hidden: true, small: true }))),
        ),
      ),
    );

    // 宣言の流れ
    const bidsBox = h('div', { class: 'result-box' },
      h('div', { class: 'row' }, h('strong', {}, `第${v.round}ラウンド`), h('span', { class: 'small muted' }, `サイコロは全部で${v.total}個${wild ? '・1は★' : ''}`)),
      v.bids.length
        ? h('ol', { class: 'ud-bids' }, v.bids.map((b, i) =>
            h('li', { class: i === v.bids.length - 1 ? 'last' : '' }, h('span', { class: 'ud-bid' }, `${nameOf(b.pid)}:`, die(b.f, { small: true }), `× ${b.q}個以上`)),
          ))
        : h('p', { class: 'small muted', style: { margin: '6px 0' } }, 'まだ宣言はありません。'),
    );

    root.replaceChildren(
      h('div', { class: 'table' },
        status ? h('div', { style: { marginBottom: '10px' } }, status) : null,
        seats,
        v.result ? resultBox() : null,
        bidsBox,
        me && v.phase === 'bid'
          ? h('div', {},
              h('strong', {}, 'あなたのサイコロ（ほかの人には見えません）'),
              h('div', { class: 'ud-row ud-mine' }, v.myDice.length ? v.myDice.map(d => die(d, { hit: pick && (d === pick.f || (wild && pick.f !== 1 && d === 1)) })) : h('span', { class: 'small' }, '脱落しました。観戦して楽しもう')),
            )
          : null,
        myTurn ? bidPanel(prev) : null,
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, v.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function bidPanel(prev) {
    const v = view;
    const wild = v.options.wild;
    if (!pick || !isRaise(prev, pick, wild)) {
      // 既定は「いちばん多く持っている目」の最小の上げ方
      const faces = [2, 3, 4, 5, 6, 1].filter(f => minRaise(prev, f, wild, v.total));
      const best = faces.sort((a, b) => countFace(v.myDice, b, wild) - countFace(v.myDice, a, wild))[0];
      pick = best ? minRaise(prev, best, wild, v.total) : null;
    }
    const setFace = f => {
      const m = minRaise(prev, f, wild, v.total);
      if (!m) return;
      pick = { f, q: Math.max(m.q, pick && isRaise(prev, { q: pick.q, f }, wild) ? pick.q : m.q) };
      render();
    };
    const setQ = d => {
      const q = pick.q + d;
      if (q < 1 || q > v.total || !isRaise(prev, { q, f: pick.f }, wild)) return;
      pick = { ...pick, q };
      render();
    };
    return h('div', { class: 'result-box ud-panel' },
      pick
        ? [
            h('div', { class: 'row' },
              h('span', { class: 'small' }, '目'),
              [1, 2, 3, 4, 5, 6].map(f => h('button', {
                class: ['ud-face', pick.f === f && 'sel'].filter(Boolean).join(' '), type: 'button',
                disabled: !minRaise(prev, f, wild, v.total), onclick: () => setFace(f), 'aria-label': `${f}の目`,
              }, die(f, { small: true }))),
            ),
            h('div', { class: 'row', style: { marginTop: '8px' } },
              h('span', { class: 'small' }, '個数'),
              h('button', { class: 'btn', type: 'button', disabled: !isRaise(prev, { q: pick.q - 1, f: pick.f }, wild) || pick.q <= 1, onclick: () => setQ(-1) }, '−'),
              h('strong', { class: 'ud-q' }, String(pick.q)),
              h('button', { class: 'btn', type: 'button', disabled: pick.q >= v.total, onclick: () => setQ(1) }, '＋'),
            ),
          ]
        : h('p', { class: 'small' }, 'これ以上は上げられません。ダウトしましょう。'),
      h('div', { class: 'game-actions' },
        pick ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'bid', q: pick.q, f: pick.f }) }, `「${bidText(pick)}以上」と宣言`) : null,
        prev ? h('button', { class: 'btn ud-doubt', type: 'button', onclick: () => api.send({ type: 'doubt' }) }, '🤥 ダウト！') : null,
      ),
    );
  }

  function resultBox() {
    const v = view;
    const r = v.result;
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const wild = v.options.wild;
    const over = v.phase === 'end';
    return h('div', { class: 'result-box' },
      h('h3', {}, over ? `🏆 ${nameOf(v.winner)} さんの勝ち！` : '🤥 ダウト！'),
      h('p', { style: { margin: '4px 0' } },
        `${nameOf(r.doubter)} さんが ${nameOf(r.bid.pid)} さんの「${bidText(r.bid)}以上」をダウト → 実際は `, h('strong', {}, `${r.actual}個`),
        r.ok ? '（宣言どおり）' : '（足りない）',
      ),
      h('p', { style: { margin: '4px 0' } }, `${nameOf(r.loser)} さんがサイコロを1個失いました。`),
      h('div', { class: 'ud-shown' }, v.players.filter(p => r.shown[p.id]?.length).map(p =>
        h('div', { class: 'ud-line' }, h('span', { class: 'small ud-who' }, p.name), h('span', { class: 'ud-row' }, r.shown[p.id].map(d => die(d, { small: true, hit: d === r.bid.f || (wild && r.bid.f !== 1 && d === 1) })))),
      )),
      over
        ? h('ol', { class: 'small' }, v.players.slice().sort((a, b) => (a.place ?? 0) - (b.place ?? 0)).map(p => h('li', {}, p.name)))
        : null,
      v.me && !over ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次のラウンドへ（振り直す）') : null,
      v.me && over ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
    );
  }

  return {
    update(next) {
      if (view && (next.round !== view.round || next.bids.length !== view.bids.length)) pick = null;
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
