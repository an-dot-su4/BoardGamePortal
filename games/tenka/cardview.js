// 1枚のカードの見た目（ゲーム画面・ロビーのBAN一覧・カード一覧ページで共通）
import { h } from '../../js/util.js';
import { artSvg } from './art.js';
import { SETS } from './cards/index.js';

export const TYPE_LABEL = { action: '行動', treasure: '財宝', victory: '勝利点', curse: '呪い', attack: '攻撃', reaction: '守り', duration: '持続' };

// 枠の色を決める種類（優先順）
export function frameType(card) {
  for (const t of ['curse', 'reaction', 'attack', 'duration', 'treasure', 'victory']) if (card.types.includes(t)) return t;
  return 'action';
}

// 「+1札」「+2文」などを色つきの記号にする
const TOKEN = /(\+\d+)(札|行動|購入|文)|^([−-]?\d+)(点)$/g;
function richText(text) {
  return text.split('\n').map(line => {
    const parts = [];
    let last = 0;
    for (const m of line.matchAll(TOKEN)) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      const [num, unit] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
      parts.push(h('span', { class: `tk-chip tk-chip-${{ 札: 'card', 行動: 'action', 購入: 'buy', 文: 'coin', 点: num.startsWith('−') ? 'curse' : 'vp' }[unit]}` }, num, h('small', {}, unit)));
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    const big = parts.every(p => typeof p !== 'string' || !p.trim());
    return h('div', { class: big ? 'tk-line tk-line-big' : 'tk-line' }, parts);
  });
}

export function cardEl(card, { size = 'full', count = null, onclick = null, badge = null, dim = false, selected = false } = {}) {
  const art = h('div', { class: 'tk-art' });
  art.innerHTML = artSvg(card); // art.js の定数のみ（ユーザー入力は入らない）
  const set = SETS.find(s => s.id === card.set);
  const typeText = card.types.map(t => TYPE_LABEL[t]).join('・');
  const vpText = typeof card.vp === 'number' && !card.types.includes('action') ? `${card.vp}点` : null;
  return h(onclick ? 'button' : 'div', {
    class: ['tk-card', `tk-${frameType(card)}`, `tk-${size}`, dim && 'tk-dim', selected && 'tk-selected'].filter(Boolean).join(' '),
    type: onclick ? 'button' : null,
    onclick,
    title: `${card.name}（${typeText}・コスト${card.cost}）\n${card.text}`,
    dataset: { card: card.id },
  },
    h('div', { class: 'tk-name' }, card.name),
    art,
    size === 'full' ? h('div', { class: 'tk-text' }, richText(card.text)) : null,
    size !== 'full' && vpText ? h('div', { class: 'tk-mini-text' }, vpText) : null,
    size !== 'full' && card.types.includes('treasure') ? h('div', { class: 'tk-mini-text' }, card.text) : null,
    h('div', { class: 'tk-foot' },
      h('span', { class: 'tk-cost', title: 'コスト' }, card.cost),
      h('span', { class: 'tk-type' }, typeText),
      size === 'full' && set ? h('span', { class: 'tk-set' }, set.name) : null,
    ),
    count !== null ? h('span', { class: 'tk-count' }, count) : null,
    badge ? h('span', { class: 'tk-badge' }, badge) : null,
  );
}
