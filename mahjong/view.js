// 牌の絵（SVG）と、画面で使う小さな部品。
import { h } from '../js/util.js';
import { tileName, tileYomi, toIndex } from './tiles.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

const BLUE = '#1d4fa3', RED = '#c62828', GREEN = '#1f7a3a', INK = '#1d1d1d';
const KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const PIN = {
  1: [[15, 20, 10, RED]],
  2: [[15, 11, 6, BLUE], [15, 29, 6, GREEN]],
  3: [[8, 9, 5, BLUE], [15, 20, 5, RED], [22, 31, 5, GREEN]],
  4: [[9, 12, 5, BLUE], [21, 12, 5, GREEN], [9, 28, 5, GREEN], [21, 28, 5, BLUE]],
  5: [[8, 10, 4.5, BLUE], [22, 10, 4.5, GREEN], [15, 20, 4.5, RED], [8, 30, 4.5, GREEN], [22, 30, 4.5, BLUE]],
  6: [[10, 9, 4.3, GREEN], [20, 9, 4.3, GREEN], [10, 21, 4.3, RED], [20, 21, 4.3, RED], [10, 32, 4.3, RED], [20, 32, 4.3, RED]],
  7: [[7, 7, 3.5, GREEN], [15, 11, 3.5, GREEN], [23, 15, 3.5, GREEN], [10, 25, 3.8, RED], [20, 25, 3.8, RED], [10, 34, 3.8, RED], [20, 34, 3.8, RED]],
  8: [7, 15, 25, 33].flatMap(y => [[10, y, 3.8, BLUE], [20, y, 3.8, BLUE]]),
  9: [9, 20, 31].flatMap((y, r) => [7, 15, 23].map(x => [x, y, 3.8, [BLUE, RED, GREEN][r]])),
};
const SOU = {
  2: [[15, 11, GREEN], [15, 29, BLUE]],
  3: [[15, 11, GREEN], [9, 29, GREEN], [21, 29, GREEN]],
  4: [[9, 11, GREEN], [21, 11, BLUE], [9, 29, BLUE], [21, 29, GREEN]],
  5: [[8, 11, GREEN], [22, 11, BLUE], [15, 20, RED], [8, 29, BLUE], [22, 29, GREEN]],
  6: [7, 15, 23].flatMap(x => [[x, 11, GREEN], [x, 29, GREEN]]),
  7: [[15, 7, RED, 9], ...[7, 15, 23].flatMap(x => [[x, 20, GREEN, 10], [x, 32, GREEN, 10]])],
  8: [6, 12, 18, 24].flatMap(x => [[x, 11, GREEN], [x, 29, GREEN]]),
  9: [8, 20, 32].flatMap(y => [7, 15, 23].map((x, k) => [x, y, k === 1 ? RED : GREEN, 9.5])),
};

function face(tile) {
  const n = Number(tile[0]);
  const suit = tile[1];
  const svg = s('svg', { viewBox: '0 0 30 40', 'aria-hidden': 'true' });
  if (suit === 'm') {
    svg.append(
      s('text', { x: 15, y: 17, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: INK }, KANJI[n - 1]),
      s('text', { x: 15, y: 35, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: RED }, '萬'),
    );
  } else if (suit === 'p') {
    for (const [x, y, r, col] of PIN[n]) {
      svg.append(
        s('circle', { cx: x, cy: y, r, fill: col }),
        s('circle', { cx: x, cy: y, r: r * 0.62, fill: '#fffdf5' }),
        s('circle', { cx: x, cy: y, r: r * 0.3, fill: col }),
      );
    }
  } else if (suit === 's') {
    if (n === 1) {
      // 1索は鳥の絵
      svg.append(
        s('ellipse', { cx: 15, cy: 24, rx: 7, ry: 9, fill: GREEN }),
        s('circle', { cx: 15, cy: 11, r: 4.5, fill: RED }),
        s('path', { d: 'M18 10 l5 1.5 l-5 1.5 z', fill: '#d9a21b' }),
        s('path', { d: 'M10 30 l-4 7 M15 32 l0 6 M20 30 l4 7', stroke: BLUE, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      );
    } else {
      for (const [x, y, col, len = 14] of SOU[n]) {
        svg.append(
          s('rect', { x: x - 2, y: y - len / 2, width: 4, height: len, rx: 2, fill: col }),
          s('line', { x1: x - 2, x2: x + 2, y1: y, y2: y, stroke: '#fffdf5', 'stroke-width': 0.8 }),
        );
      }
    }
  } else if (n === 5) {
    svg.append(s('rect', { x: 6, y: 7, width: 18, height: 26, rx: 2, fill: 'none', stroke: BLUE, 'stroke-width': 2 }));
  } else {
    const col = n === 6 ? GREEN : n === 7 ? RED : INK;
    svg.append(s('text', { x: 15, y: 28, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: col }, tileName(tile)));
  }
  return svg;
}

// 牌1枚。opts: { size: 'sm'|'md'|'lg', side（横向き）, mark（強調）, dim, onclick, label（下に名前） }
export function tileEl(tile, opts = {}) {
  const cls = ['mj-tile', opts.size ?? 'md', opts.side && 'side', opts.mark && 'mark', opts.dim && 'dim', opts.onclick && 'clickable']
    .filter(Boolean).join(' ');
  const title = `${tileName(tile)}（${tileYomi(tile)}）`;
  const el = h(opts.onclick ? 'button' : 'span', {
    class: cls, title, 'aria-label': title, type: opts.onclick ? 'button' : undefined,
    onclick: opts.onclick, dataset: { tile },
  });
  el.appendChild(face(tile));
  if (opts.label) return h('span', { class: 'mj-labeled' }, el, h('span', { class: 'mj-label' }, tileName(tile)));
  return el;
}

export function tileRow(tiles, opts = {}) {
  return h('span', { class: 'mj-row' }, tiles.map(t => tileEl(t, opts)));
}

export function sortKey(t) { return toIndex(t); }
