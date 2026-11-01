// 江戸のイラスト（町の賑わいと錦絵の色）
import { H, skyGradient, W, washi } from './common.js';

const koban = (x, y, r = 0) => `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="11" ry="7" fill="#e2b23a" stroke="#8a6410"/>${[-4, 0, 4].map(d => `<path d="M${x - 8} ${y + d * 0.8} h16" stroke="#b07a14" stroke-width=".6"/>`).join('')}</g>`;
const person = (x, y, c, s = 1) => `<circle cx="${x}" cy="${y - 12 * s}" r="${4.5 * s}" fill="#f3d7b6"/><path d="M${x - 6 * s} ${y + 10 * s} l${2 * s} ${-18 * s} h${8 * s} l${2 * s} ${18 * s}z" fill="${c}"/>`;

export const EDO_ART = {
  // 宿場町: 提灯の灯る旅籠の並びと、遠くの富士
  shukuba: () => `
    <defs>${skyGradient('shukuba-sky', '#f2a06a', '#fbe6c8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#shukuba-sky)"/>
    <path d="M70 60 L100 22 L130 60Z" fill="#4f6d8a"/><path d="M90 34 L100 22 L110 34 L104 32 L100 36 L96 32Z" fill="#fff"/>
    <rect y="100" width="${W}" height="30" fill="#d8c39a"/>
    <path d="M80 130 L94 100 h12 L120 130Z" fill="#e8dcbc"/>
    ${[[0, 1], [140, -1]].map(([x]) => `<rect x="${x + 4}" y="58" width="56" height="42" fill="#e6d3a0" stroke="#5c4030"/><path d="M${x} 58 h64 l-6 -12 h-52z" fill="#3b3b44"/><rect x="${x + 8}" y="66" width="48" height="10" fill="#2c3e66"/>${[0, 1, 2].map(i => `<ellipse cx="${x + 14 + i * 18}" cy="86" rx="5" ry="7" fill="#e8603a"/><ellipse cx="${x + 14 + i * 18}" cy="86" rx="5" ry="7" fill="#ffd36b" opacity=".4"/>`).join('')}`).join('')}
    <path d="M110 96 v-28" stroke="#5c3b22" stroke-width="2"/><rect x="104" y="68" width="12" height="20" fill="#fbf6e6" stroke="#5c3b22"/>
    ${person(90, 116, '#7a4a8a', 0.9)}`,

  // 棟梁: 組み上がる骨組みと、墨壺・曲尺
  touryou: () => `
    ${washi('#efe2c4', 'touryou')}
    <rect y="106" width="${W}" height="24" fill="#c9b48a"/>
    <g stroke="#b8865a" stroke-width="6">${[40, 80, 120, 160].map(x => `<path d="M${x} 106 V40"/>`).join('')}<path d="M34 44 H166 M34 76 H166"/></g>
    <path d="M28 44 L100 12 L172 44" stroke="#a0754a" stroke-width="6" fill="none"/>
    <path d="M100 12 V44" stroke="#a0754a" stroke-width="4"/>
    <g transform="translate(20 108)"><rect width="22" height="14" rx="3" fill="#5c3b22"/><circle cx="8" cy="7" r="4" fill="#2b2014"/><path d="M22 7 L70 2" stroke="#2b2620" stroke-width="1"/></g>
    <path d="M150 116 h36 v-24" stroke="#5d6772" stroke-width="4" fill="none"/>
    <circle cx="100" cy="60" r="10" fill="#f3d7b6"/><path d="M90 58 h20 v-4 h-20z" fill="#2c3e66"/>`,

  // 飛脚: 状箱を担いで駆ける飛脚
  hikyaku: () => `
    <defs>${skyGradient('hikyaku-sky', '#9fc4dd', '#f6ecd6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#hikyaku-sky)"/>
    <rect y="104" width="${W}" height="26" fill="#d8c39a"/>
    <g stroke="#fff" stroke-width="3" opacity=".8">${[50, 64, 78].map(y => `<path d="M10 ${y} h40"/>`).join('')}</g>
    <circle cx="110" cy="44" r="9" fill="#f3d7b6"/><path d="M102 40 h16 v-4 h-16z" fill="#1d1d1d"/>
    <path d="M110 54 L104 80 L84 104 M104 80 L124 102 L138 98" stroke="#f3d7b6" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M102 56 h16 l-4 26 h-12z" fill="#2c3e66"/>
    <path d="M116 60 L146 34" stroke="#5c3b22" stroke-width="3"/>
    <rect x="140" y="20" width="26" height="18" fill="#2b2014" stroke="#8a6410"/><path d="M140 26 h26" stroke="#b8322a" stroke-width="2"/>
    <path d="M104 62 L84 70" stroke="#f3d7b6" stroke-width="5" stroke-linecap="round"/>`,

  // 寄席: 座布団の上で扇子を持つ噺家と、高座の提灯
  yose: () => `
    ${washi('#3a2a20', 'yose')}
    <path d="M0 0 h200 v14 h-200z" fill="#2b1a10"/>
    ${[30, 100, 170].map(x => `<path d="M${x} 14 v6" stroke="#5c3b22"/><ellipse cx="${x}" cy="32" rx="10" ry="12" fill="#e8603a"/><ellipse cx="${x}" cy="32" rx="10" ry="12" fill="#ffd36b" opacity=".35"/>`).join('')}
    <rect x="40" y="100" width="120" height="30" fill="#8a5a2f"/>
    <rect x="66" y="94" width="68" height="12" rx="4" fill="#7a2e5a"/>
    <path d="M70 96 Q100 52 130 96Z" fill="#2c3e66"/>
    <circle cx="100" cy="56" r="13" fill="#f3d7b6"/>
    <path d="M94 54 q3 -3 6 0 M102 54 q3 -3 6 0" stroke="#2b2014" stroke-width="1.5" fill="none"/><path d="M95 62 q5 4 10 0" stroke="#2b2014" stroke-width="1.5" fill="none"/>
    <path d="M116 72 L140 52" stroke="#e6d6b0" stroke-width="4"/><path d="M138 50 l6 -2" stroke="#e6d6b0" stroke-width="6"/>
    <rect x="74" y="80" width="14" height="8" fill="#fbf6e6"/>`,

  // 歌舞伎: 定式幕と、隈取りの見得
  kabuki: () => `
    <rect width="${W}" height="${H}" fill="#2b2014"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 24 - 8}" y="0" width="24" height="${H}" fill="${['#1d1d1d', '#e8823a', '#3d6a3a'][i % 3]}"/>`).join('')}
    <ellipse cx="100" cy="70" rx="40" ry="48" fill="#fbf6ee"/>
    <path d="M68 54 Q80 40 96 52 M104 52 Q120 40 132 54" stroke="#b8322a" stroke-width="4" fill="none"/>
    <path d="M74 60 q8 -6 16 0 M110 60 q8 -6 16 0" stroke="#1d1d1d" stroke-width="3" fill="none"/>
    <circle cx="84" cy="62" r="2.5" fill="#1d1d1d"/><circle cx="118" cy="62" r="2.5" fill="#1d1d1d"/>
    <path d="M70 72 Q60 90 72 104 M130 72 Q140 90 128 104" stroke="#b8322a" stroke-width="4" fill="none"/>
    <path d="M86 92 q14 8 28 0" stroke="#b8322a" stroke-width="3" fill="none"/><path d="M90 92 q10 4 20 0" fill="#8e2418"/>
    <path d="M60 30 Q100 6 140 30 L136 40 Q100 20 64 40Z" fill="#1d1d1d"/>`,

  // 番頭: 帳場の格子と算盤、のれん
  bantou: () => `
    ${washi('#e6d3a0', 'bantou')}
    <path d="M0 0 h200 v30 h-200z" fill="#2c3e66"/>
    ${[40, 100, 160].map(x => `<path d="M${x} 0 v30" stroke="#e6d3a0" stroke-width="2"/>`).join('')}
    <text x="70" y="22" text-anchor="middle" font-family="serif" font-size="14" font-weight="700" fill="#f3e6c8">商</text>
    <rect y="96" width="${W}" height="34" fill="#8a5a2f"/>
    <path d="M120 60 h70 v36 h-70z" fill="#6b3a1a"/><g stroke="#3b2014" stroke-width="2">${[130, 140, 150, 160, 170, 180].map(x => `<path d="M${x} 60 v36"/>`).join('')}</g>
    ${person(70, 82, '#5c4a3a', 1.6)}
    <rect x="30" y="86" width="56" height="16" rx="2" fill="#5c3b22"/><g fill="#c9a46a">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${36 + i * 9}" cy="94" r="3"/>`).join('')}</g>
    <rect x="96" y="80" width="22" height="16" fill="#fbf6e6" stroke="#8a6a3a"/>`,

  // 両替商: 天秤と、銭・小判の山
  ryougae: () => `
    ${washi('#e8dcc0', 'ryougae')}
    <rect y="104" width="${W}" height="26" fill="#8a5a2f"/>
    <path d="M100 104 V28" stroke="#5c3b22" stroke-width="5"/><path d="M84 104 h32" stroke="#5c3b22" stroke-width="5"/>
    <path d="M44 30 H156" stroke="#5c3b22" stroke-width="4"/><circle cx="100" cy="28" r="4" fill="#8a6410"/>
    <path d="M50 30 L40 64 M50 30 L60 64 M150 30 L140 60 M150 30 L160 60" stroke="#3b2a1a" stroke-width="1.2"/>
    <path d="M34 64 h32 l-4 6 h-24z" fill="#8a6410"/><path d="M134 60 h32 l-4 6 h-24z" fill="#8a6410"/>
    ${koban(50, 58)}${koban(150, 54)}
    ${[[30, 98], [44, 100], [58, 98], [150, 96], [164, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#b8682f" stroke="#6e3a17"/><rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" fill="#e8dcc0"/>`).join('')}`,

  // 越後屋: 大きなのれんの呉服店と反物
  echigoya: () => `
    <defs>${skyGradient('echigoya-sky', '#a9c8de', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#echigoya-sky)"/>
    <path d="M10 30 L190 30 L180 16 L20 16Z" fill="#3b3b44"/>
    <rect x="16" y="30" width="168" height="74" fill="#e6d3a0" stroke="#5c4030"/>
    ${[0, 1, 2, 3].map(i => `<rect x="${22 + i * 40}" y="34" width="36" height="40" fill="#2c3e66"/>`).join('')}
    <text x="100" y="62" text-anchor="middle" font-family="serif" font-size="16" font-weight="700" fill="#f3e6c8" letter-spacing="10">越後屋</text>
    ${[[40, '#b8322a'], [70, '#e6c46a'], [100, '#3d7a4a'], [130, '#7a4a8a'], [160, '#e8823a']].map(([x, c]) => `<rect x="${x - 10}" y="78" width="20" height="26" fill="${c}"/><path d="M${x - 10} 84 h20" stroke="#fff" stroke-width="1" opacity=".5"/>`).join('')}
    <rect y="104" width="${W}" height="26" fill="#d8c39a"/>${person(186, 120, '#5c4a3a', 0.8)}`,

  // 浮世絵師: 彫刻刀と版木、刷り上がった波の絵
  ukiyoe: () => `
    ${washi('#c9b48a', 'ukiyoe')}
    <rect x="26" y="16" width="100" height="72" fill="#f6eedc" stroke="#8a7a5a" transform="rotate(-4 76 52)"/>
    <g transform="rotate(-4 76 52)">
      <path d="M30 80 C40 40 70 30 90 42 C78 40 72 50 76 56 C82 62 92 58 92 52 C100 62 112 70 122 70 V84 H30Z" fill="#2f5a99"/>
      <path d="M30 80 C40 40 70 30 90 42" stroke="#fff" stroke-width="2" fill="none"/>
      <path d="M84 70 l10 -14 l10 14z" fill="#e8e0cc"/>
    </g>
    <rect x="120" y="70" width="64" height="44" fill="#d8b878" stroke="#8a6a3a"/>
    <g stroke="#a0804a" stroke-width="1">${[80, 90, 100].map(y => `<path d="M124 ${y} q30 -6 56 0"/>`).join('')}</g>
    ${[[150, 40, -30], [166, 46, -20]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 3}" y="${y - 20}" width="6" height="30" fill="#6b4a2b"/><path d="M${x - 3} ${y + 10} h6 l-3 8z" fill="#cfd5db"/></g>`).join('')}
    <circle cx="44" cy="108" r="10" fill="#b8322a"/><circle cx="64" cy="110" r="8" fill="#2f5a99"/>`,

  // 参勤交代: 毛槍を先頭にした大名行列と駕籠
  sankin: () => `
    <defs>${skyGradient('sankin-sky', '#bcd6c8', '#f4ecd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#sankin-sky)"/>
    <path d="M0 70 Q100 56 200 70 V130 H0Z" fill="#a9c47e"/>
    <path d="M0 100 Q100 92 200 102 V116 Q100 108 0 116Z" fill="#e4d2a6"/>
    ${[14, 34].map(x => `<path d="M${x} 104 L${x} 48" stroke="#3b2a1a" stroke-width="2"/><ellipse cx="${x}" cy="46" rx="6" ry="9" fill="#1d1d1d"/>${person(x + 6, 106, '#2c3e66', 0.8)}`).join('')}
    <rect x="80" y="76" width="44" height="26" fill="#1d1d1d" stroke="#e6c46a"/><path d="M70 78 H134" stroke="#5c3b22" stroke-width="4"/>
    <path d="M78 76 Q102 64 126 76Z" fill="#2b2b2b"/>
    ${person(70, 106, '#5c4a3a', 0.8)}${person(134, 106, '#5c4a3a', 0.8)}
    ${[158, 176, 194].map(x => person(x, 106, '#2c3e66', 0.7)).join('')}`,

  // 千両箱: 小判のあふれる千両箱
  senryou: () => `
    <defs><radialGradient id="senryou-g" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffe9a0"/><stop offset="1" stop-color="#3a1e14" stop-opacity="0"/></radialGradient></defs>
    ${washi('#2a1a10', 'senryou')}
    <circle cx="100" cy="70" r="64" fill="url(#senryou-g)" opacity=".6"/>
    <rect x="50" y="62" width="100" height="50" fill="#3b2014" stroke="#8a6410" stroke-width="2"/>
    <g stroke="#8a6410" stroke-width="3">${[66, 100, 134].map(x => `<path d="M${x} 62 v50"/>`).join('')}</g>
    <path d="M50 62 L56 40 H144 L150 62" fill="#4a2a18" stroke="#8a6410" stroke-width="2"/>
    <rect x="88" y="78" width="24" height="14" fill="#fbf6e6"/><text x="100" y="89" text-anchor="middle" font-family="serif" font-size="9" font-weight="700" fill="#8e2418">千両</text>
    ${koban(72, 54, -10)}${koban(96, 48, 6)}${koban(122, 52, -4)}${koban(140, 66, 20)}${koban(60, 112, 0)}${koban(148, 114, -12)}`,
};
