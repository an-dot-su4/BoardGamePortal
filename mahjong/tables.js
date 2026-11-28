// 点数の早見表・符の表（チュートリアルの点数編と、符点計算タブで使う）
import { h } from '../js/util.js';
import { points } from './score.js';

const FU_ROWS = [20, 25, 30, 40, 50, 60, 70];

// 子・親の点数早見表（1〜4翻 × 符）。ロンの点数と、下にツモの払い
export function pointsTable(dealer) {
  const head = h('tr', {}, h('th', {}, '符＼翻'), [1, 2, 3, 4].map(n => h('th', {}, `${n}翻`)));
  const rows = FU_ROWS.map(fu => h('tr', {}, h('th', {}, `${fu}符`), [1, 2, 3, 4].map(han => {
    // 平和ツモ（20符）はロンがなく、七対子（25符）は2翻から
    if ((fu === 25 && han === 1) || (fu === 20 && han === 1)) return h('td', { class: 'na' }, '—');
    const ron = points(han, fu, 0, dealer, false);
    const ts = points(han, fu, 0, dealer, true);
    const tsumoText = dealer ? `${ts.all}オール` : `${ts.fromOthers}・${ts.fromDealer}`;
    // スマホ幅に収まるよう、セルは数字だけ（色つき＝満貫）
    const limit = ron.limit ? 'limit' : '';
    return h('td', { class: limit },
      fu === 20 ? h('div', { class: 'ron na' }, '—') : h('div', { class: 'ron' }, `${ron.ron}`),
      h('div', { class: 'tsumo' }, tsumoText));
  })));
  return h('div', { class: 'mj-ptable-wrap' },
    h('table', { class: 'mj-ptable' },
      h('caption', {}, dealer ? '親の点数（上: ロン ／ 下: ツモ＝子3人が払う点）' : '子の点数（上: ロン ／ 下: ツモ＝子・親が払う点）',
        h('span', { class: 'mj-legend' }, '色つき＝満貫（8000点・親12000点）。20符はツモのみ（平和ツモ）、25符は七対子')),
      h('thead', {}, head), h('tbody', {}, rows)));
}

export function limitTable() {
  const rows = [
    ['満貫', '5翻（4翻40符以上・3翻70符以上も）', 8000, 12000],
    ['跳満', '6〜7翻', 12000, 18000],
    ['倍満', '8〜10翻', 16000, 24000],
    ['三倍満', '11〜12翻', 24000, 36000],
    ['役満', '役満の役、または13翻以上', 32000, 48000],
  ];
  return h('div', { class: 'mj-ptable-wrap' },
    h('table', { class: 'mj-ptable' },
      h('caption', {}, '満貫以上（符は関係なし）'),
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, '翻'), h('th', {}, '子'), h('th', {}, '親'))),
      h('tbody', {}, rows.map(([n, han, c, d]) => h('tr', {}, h('th', {}, n), h('td', {}, han), h('td', {}, String(c)), h('td', {}, String(d)))))));
}

export function fuTable() {
  const rows = [
    ['明刻（ポン）', 2, 4], ['暗刻（自分でそろえた）', 4, 8], ['明槓', 8, 16], ['暗槓', 16, 32],
  ];
  return h('div', { class: 'mj-ptable-wrap' },
    h('table', { class: 'mj-ptable' },
      h('caption', {}, '刻子・槓子の符（順子は0符）'),
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, '中張牌（2〜8）'), h('th', {}, '么九牌（1・9・字牌）'))),
      h('tbody', {}, rows.map(([n, a, b]) => h('tr', {}, h('th', {}, n), h('td', {}, `${a}符`), h('td', {}, `${b}符`))))));
}

export function baseFuTable() {
  const rows = [
    ['副底（はじめから）', '20符'], ['門前でロン', '+10符'], ['ツモ（平和ツモ以外）', '+2符'],
    ['雀頭が役牌（三元牌・場風・自風）', '+2符'], ['嵌張・辺張・単騎の待ち', '+2符'],
    ['平和ツモ', 'いつも20符'], ['七対子', 'いつも25符'], ['鳴いた手で20符', '30符にする'],
  ];
  return h('div', { class: 'mj-ptable-wrap' },
    h('table', { class: 'mj-ptable' },
      h('caption', {}, '基本の符（最後に10符単位に切り上げ。七対子はそのまま25符）'),
      h('tbody', {}, rows.map(([n, v]) => h('tr', {}, h('th', {}, n), h('td', {}, v))))));
}

export const TABLES = {
  limit: limitTable, fu: fuTable, base: baseFuTable,
  child: () => pointsTable(false), dealer: () => pointsTable(true),
};
