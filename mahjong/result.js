// 役・符・点数の内訳の表示（チュートリアルと符点計算で共用）
import { h } from '../js/util.js';
import { WAIT_NAME, pointsText } from './score.js';

// only: 'fu' | 'han' | 'points' を渡すと、その部分の内訳だけを出す（点数編のクイズの解説）
export function resultView(r, { only } = {}) {
  if (only) return partView(r, only);
  const yakuRows = r.yaku.map(y => h('tr', { class: y.dora ? 'dora' : '' },
    h('td', {}, y.name), h('td', { class: 'num' }, typeof y.han === 'number' ? `${y.han}翻` : y.han)));
  const limit = r.limit ? `（${r.limit}）` : '';
  const head = r.yakuman
    ? `役満${limit && r.yakuman > 1 ? limit : ''}`
    : `${r.han}翻 ${r.fu}符${limit}`;
  return h('div', { class: 'mj-result stack' },
    h('div', { class: 'mj-points' },
      h('div', { class: 'mj-points-main' }, pointsText(r.points)),
      h('div', { class: 'muted' }, `${head}・${r.dealer ? '親' : '子'}の${r.points.ron !== undefined ? 'ロン' : 'ツモ'}`)),
    h('div', { class: 'mj-cols' },
      h('div', {},
        h('h4', {}, '役'),
        h('table', { class: 'mj-table-list' }, h('tbody', {}, yakuRows))),
      r.yakuman ? null : h('div', {},
        h('h4', {}, `符の内訳（${WAIT_NAME[r.wait] ?? ''}）`),
        h('table', { class: 'mj-table-list' }, h('tbody', {},
          r.fuParts.map(p => h('tr', {}, h('td', {}, p.label), h('td', { class: 'num' }, p.fu ? `${p.fu}符` : ''))),
          r.fuRaw !== undefined && r.fuRaw !== r.fu && r.fuParts.length > 1
            ? h('tr', { class: 'sum' }, h('td', {}, `合計 ${r.fuRaw}符 → 10符単位に切り上げ`), h('td', { class: 'num' }, `${r.fu}符`))
            : null)))),
    r.yakuman ? null : h('p', { class: 'small muted' }, explainPoints(r)),
  );
}

function explainPoints(r) {
  if (r.limit) {
    return `${r.han}翻なので${r.limit}。満貫以上は符に関係なく点数が決まります（子の満貫 8000・跳満 12000・倍満 16000・三倍満 24000・役満 32000。親は1.5倍）。`;
  }
  const base = r.fu * 2 ** (r.han + 2);
  const mul = r.points.ron !== undefined ? (r.dealer ? 6 : 4) : null;
  return `基本点 = 符 × 2^(翻+2) = ${r.fu} × ${2 ** (r.han + 2)} = ${base}。`
    + (mul ? `ロンは基本点 × ${mul}（${r.dealer ? '親' : '子'}）を100点単位に切り上げ。`
      : r.dealer ? 'ツモは子3人が基本点 × 2 ずつ払う（100点単位に切り上げ）。'
        : 'ツモは親が基本点 × 2、子2人が基本点 × 1 ずつ払う（100点単位に切り上げ）。');
}

function yakuTable(r) {
  return h('table', { class: 'mj-table-list' }, h('tbody', {}, r.yaku.map(y => h('tr', { class: y.dora ? 'dora' : '' },
    h('td', {}, y.name), h('td', { class: 'num' }, typeof y.han === 'number' ? `${y.han}翻` : y.han)))));
}

function fuTableOf(r) {
  return h('table', { class: 'mj-table-list' }, h('tbody', {},
    r.fuParts.map(p => h('tr', {}, h('td', {}, p.label), h('td', { class: 'num' }, p.fu ? `${p.fu}符` : ''))),
    r.fuRaw !== undefined && r.fuRaw !== r.fu && r.fuParts.length > 1
      ? h('tr', { class: 'sum' }, h('td', {}, `合計 ${r.fuRaw}符 → 10符単位に切り上げ`), h('td', { class: 'num' }, `${r.fu}符`))
      : null));
}

function partView(r, only) {
  if (only === 'fu') return h('div', { class: 'mj-result' }, h('h4', {}, `符の内訳（${WAIT_NAME[r.wait] ?? ''}）`), fuTableOf(r));
  if (only === 'han') return h('div', { class: 'mj-result' }, h('h4', {}, `役（合計 ${r.han}翻）`), yakuTable(r));
  return h('div', { class: 'mj-result' },
    h('div', { class: 'mj-points-main' }, pointsText(r.points)),
    h('div', { class: 'muted small' }, `${r.han}翻 ${r.fu}符${r.limit ? `（${r.limit}）` : ''}・${r.dealer ? '親' : '子'}の${r.points.ron !== undefined ? 'ロン' : 'ツモ'}`),
    r.yakuman ? null : h('p', { class: 'small muted' }, explainPoints(r)));
}
