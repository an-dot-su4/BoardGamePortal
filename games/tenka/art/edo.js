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


  // 石屋: 石灯籠を刻む石工と、割った石
  ishiya: () => `
    ${washi('#d8d0c0', 'ishiya')}
    <rect y="104" width="${W}" height="26" fill="#a09a8a"/>
    <path d="M110 104 h40 v-8 h-40z M116 96 h28 v-30 h-28z M106 66 h48 l-8 -14 h-32z M120 52 h20 v-10 h-20z M114 42 h32 l-16 -14z" fill="#9a968c" stroke="#6a665c"/>
    <rect x="122" y="72" width="16" height="16" fill="#3b3a36"/>
    ${[[30, 112, 14], [54, 116, 9], [180, 114, 10]].map(([x, y, r]) => `<path d="M${x - r} ${y} l${r * 0.6} -${r} l${r} ${r * 0.2} l${r * 0.4} ${r * 0.8}z" fill="#b0aa9c" stroke="#6a665c"/>`).join('')}
    <circle cx="70" cy="60" r="9" fill="#f3d7b6"/><path d="M60 58 h20 v-4 h-20z" fill="#2c3e66"/>
    <path d="M58 104 L64 70 h12 l8 34z" fill="#5c4a3a"/>
    <path d="M78 74 L104 66" stroke="#f3d7b6" stroke-width="5" stroke-linecap="round"/><path d="M100 60 l8 10" stroke="#5d6772" stroke-width="3"/>
    <path d="M70 78 L96 84" stroke="#f3d7b6" stroke-width="5" stroke-linecap="round"/><rect x="92" y="78" width="12" height="8" fill="#6b4a2b" transform="rotate(-20 98 82)"/>
    <g fill="#fff">${[[110, 62], [114, 56], [106, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join('')}</g>`,

  // 町医者: 薬箱と薬研、干した薬草
  machiisha: () => `
    ${washi('#e6dcc4', 'machiisha')}
    <path d="M10 16 H190" stroke="#5c3b22" stroke-width="2"/>
    ${[30, 60, 90, 120, 150, 176].map((x, i) => `<path d="M${x} 16 v8" stroke="#5c3b22"/><path d="M${x - 6} 24 q6 ${18 + (i % 2) * 6} 12 0z" fill="${['#6a8a3a', '#8a7a3a', '#4e7a3a'][i % 3]}"/>`).join('')}
    <rect y="100" width="${W}" height="30" fill="#a07a4f"/>
    <rect x="24" y="52" width="60" height="50" fill="#2b2014" stroke="#8a6410"/>
    ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${28 + c * 19}" y="${56 + r * 15}" width="15" height="12" fill="#5c3b22"/><circle cx="${35.5 + c * 19}" cy="${62 + r * 15}" r="1.5" fill="#e6c46a"/>`).join('')).join('')}
    <path d="M110 100 h70 l-8 -16 h-54z" fill="#6b5a4a"/><path d="M118 86 Q145 98 172 86" fill="#3b3028"/>
    <circle cx="145" cy="82" r="10" fill="none" stroke="#5d6772" stroke-width="3"/><path d="M130 82 h30" stroke="#5c3b22" stroke-width="3"/>
    <rect x="96" y="70" width="16" height="12" fill="#fbf6e6" stroke="#8a6a3a"/><text x="104" y="79" text-anchor="middle" font-family="serif" font-size="7" font-weight="700" fill="#b8322a">薬</text>`,

  // 代官: 年貢の俵を前に、帳面を開く代官
  daikan: () => `
    ${washi('#e6d3a0', 'daikan')}
    <rect y="0" width="${W}" height="18" fill="#3b2a1a"/>
    <rect y="96" width="${W}" height="34" fill="#c9b48a"/>
    <path d="M70 98 Q100 46 130 98Z" fill="#3b2a50"/>
    <circle cx="100" cy="54" r="11" fill="#f3d7b6"/><path d="M90 50 h20 v-6 h-20z" fill="#1d1d1d"/>
    <path d="M92 58 q8 -3 16 0" stroke="#2b2014" stroke-width="2" fill="none"/>
    <path d="M70 98 L80 70 M130 98 L120 70" stroke="#2b2a50" stroke-width="10"/>
    <rect x="84" y="86" width="32" height="14" fill="#fbf6e6" stroke="#8a6a3a"/><g stroke="#2b2620" stroke-width=".8">${[90, 96, 102, 108].map(x => `<path d="M${x} 88 v10"/>`).join('')}</g>
    ${[[24, 104], [48, 104], [36, 90], [152, 104], [176, 104], [164, 90]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="9" fill="#d8c08a" stroke="#8a6a3a"/><path d="M${x - 8} ${y - 6} v12 M${x + 8} ${y - 6} v12" stroke="#8a6a3a" stroke-width="1.5"/>`).join('')}`,

  // 渡り職人: 道具箱を背負い、笠をかぶって旅する職人
  watari: () => `
    <defs>${skyGradient('watari-sky', '#a9cfe0', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#watari-sky)"/>
    <path d="M0 70 Q60 50 120 66 T200 60 V130 H0Z" fill="#9cc58a"/>
    <path d="M60 130 Q90 100 130 90 T200 80" stroke="#e4cf9c" stroke-width="14" fill="none"/>
    <path d="M86 62 L104 48 L122 62Z" fill="#c9a46a" stroke="#8a6a3a"/>
    <circle cx="104" cy="68" r="7" fill="#f3d7b6"/>
    <path d="M94 78 h20 l4 30 h-28z" fill="#3d5a7a"/>
    <path d="M98 108 l-6 16 M110 108 l8 16" stroke="#3d5a7a" stroke-width="5" stroke-linecap="round"/>
    <rect x="114" y="72" width="22" height="26" fill="#8a5a2f" stroke="#5c3b22"/><path d="M114 80 h22" stroke="#5c3b22"/>
    <path d="M136 72 l10 -16" stroke="#5d6772" stroke-width="3"/><path d="M118 72 l-4 -18" stroke="#6b4a2b" stroke-width="3"/>
    <path d="M94 84 L84 100" stroke="#f3d7b6" stroke-width="4" stroke-linecap="round"/><path d="M84 100 L80 124" stroke="#6b4a2b" stroke-width="2"/>`,
};
