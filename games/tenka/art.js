// カードのイラスト（SVG）。すべて art/ 以下で描いている定数で、ユーザー入力は含まない。
// 画面の枠は 200×130。和紙風の地に、平面的な図柄（浮世絵・家紋のような塗り分け）で描く。
// 時代ごとにファイルを分けている。描いていない札は「札の名前の一文字」を家紋風に描いた仮の絵になる。
import { H, W, washi } from './art/common.js';
import { BASIC_ART } from './art/basic.js';
import { HEIAN_ART } from './art/heian.js';
import { KAMAKURA_ART } from './art/kamakura.js';
import { MUROMACHI_ART } from './art/muromachi.js';
import { SENGOKU_ART } from './art/sengoku.js';
import { EDO_ART } from './art/edo.js';

const ART = { ...BASIC_ART, ...HEIAN_ART, ...KAMAKURA_ART, ...MUROMACHI_ART, ...SENGOKU_ART, ...EDO_ART };

// 仮の絵: 札の名前の一文字を、家紋のような丸に描く
function placeholder(card) {
  const palette = { action: ['#efe4cf', '#8a6a3a'], treasure: ['#f3dd9a', '#9a7420'], victory: ['#cfe3c0', '#4f7a3a'], curse: ['#ddd0ea', '#6a4a8a'] };
  const kind = card.types.includes('curse') ? 'curse' : card.types.includes('victory') ? 'victory' : card.types.includes('treasure') ? 'treasure' : 'action';
  const [bg, ink] = palette[kind];
  const ch = card.name[0];
  return `
    ${washi(bg, card.id)}
    <g fill="none" stroke="${ink}" stroke-opacity=".25" stroke-width="2">
      ${Array.from({ length: 8 }, (_, i) => `<path d="M${-20 + i * 30} 130 a20 20 0 0 1 40 0 M${-10 + i * 30} 130 a10 10 0 0 1 20 0"/>`).join('')}
    </g>
    <circle cx="100" cy="62" r="40" fill="${ink}"/>
    <circle cx="100" cy="62" r="34" fill="none" stroke="${bg}" stroke-width="2"/>
    <text x="100" y="78" text-anchor="middle" font-family="serif" font-weight="700" font-size="44" fill="${bg}">${ch}</text>`;
}

export const HAS_ART = new Set(Object.keys(ART));

export function artSvg(card) {
  const body = ART[card.id] ? ART[card.id]() : placeholder(card);
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${card.name}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}
