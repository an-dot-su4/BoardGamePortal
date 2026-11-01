// 室町のイラスト（金と茶の湯。北山・東山の文化と、京の商い）
import { H, skyGradient, W, washi } from './common.js';

const gold = id => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e2b23a"/><stop offset="1" stop-color="#9a6a0a"/></linearGradient>`;

export const MUROMACHI_ART = {
  // 大判: 墨書きの大きな金貨
  ohban: () => `
    <defs>${gold('ohban-g')}</defs>
    ${washi('#3a1e14', 'ohban')}
    <ellipse cx="100" cy="66" rx="40" ry="58" fill="url(#ohban-g)" stroke="#6e4a08" stroke-width="3" transform="rotate(90 100 66) scale(1 1)"/>
    <ellipse cx="100" cy="66" rx="34" ry="52" fill="none" stroke="#8a6410" stroke-width="1" transform="rotate(90 100 66)"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${50 + i * 8} 40 q-2 26 0 52" stroke="#b07a14" stroke-width=".8" fill="none"/>`).join('')}
    <text x="100" y="74" text-anchor="middle" font-family="serif" font-size="24" font-weight="700" fill="#2b1a08" letter-spacing="4">拾両</text>
    ${[[64, 48], [136, 48], [100, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#c9a43a" stroke="#6e4a08"/><path d="M${x - 3} ${y} h6 M${x} ${y - 3} v6" stroke="#6e4a08" stroke-width="1.5"/>`).join('')}
    <g fill="#fff6c8">${[[30, 26], [172, 30], [176, 104], [24, 100]].map(([x, y]) => `<path d="M${x} ${y} l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z"/>`).join('')}</g>`,

  // 御所: 檜皮葺きの紫宸殿、白砂、左近の桜と右近の橘
  gosho: () => `
    <defs>${skyGradient('gosho-sky', '#b9a4d8', '#f6ecd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#gosho-sky)"/>
    <rect y="96" width="${W}" height="34" fill="#f3efe4"/>
    <g stroke="#d8d0bc" stroke-width=".8">${[102, 108, 114, 120, 126].map(y => `<path d="M0 ${y} Q100 ${y - 3} 200 ${y}"/>`).join('')}</g>
    <path d="M28 44 Q100 14 172 44 L162 50 Q100 26 38 50Z" fill="#5c3b22"/>
    <path d="M40 50 h120 v40 h-120z" fill="#f6f2e8"/>
    <g fill="#b8322a">${[46, 66, 86, 106, 126, 146].map(x => `<rect x="${x}" y="50" width="6" height="40"/>`).join('')}</g>
    <path d="M40 60 h120" stroke="#b8322a" stroke-width="3"/>
    <path d="M60 90 h80 l10 8 h-100z" fill="#d8c39a"/>
    <g>${[[14, 70, '#f6b8c8'], [186, 70, '#4e8a3a']].map(([x, y, c]) => `<rect x="${x - 2}" y="${y + 6}" width="4" height="22" fill="#5c3b22"/><circle cx="${x}" cy="${y}" r="13" fill="${c}"/><circle cx="${x - 7}" cy="${y + 6}" r="8" fill="${c}"/>`).join('')}</g>
    <g fill="#f2a33a">${[[182, 66], [190, 72], [184, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>
    <path d="M86 20 h28 l-4 -8 h-20z" fill="#e6c46a"/>`,

  // 座: 座の暖簾と、並んだ品物
  za: () => `
    ${washi('#efe2c4', 'za')}
    <path d="M10 22 Q100 10 190 22" stroke="#5c3b22" stroke-width="5" fill="none"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${18 + i * 42} 22 h38 v52 l-6 -4 l-6 4 l-6 -4 l-6 4 l-6 -4 l-8 4z" fill="#2c3e66"/>`).join('')}
    <circle cx="100" cy="46" r="14" fill="none" stroke="#f3e6c8" stroke-width="3"/>
    <text x="100" y="53" text-anchor="middle" font-family="serif" font-size="18" font-weight="700" fill="#f3e6c8">座</text>
    <rect y="96" width="${W}" height="34" fill="#a07a4f"/>
    <rect x="12" y="88" width="176" height="10" fill="#6b4a2b"/>
    ${[[30, '#b8322a'], [60, '#e6c46a'], [140, '#3d7a4a'], [170, '#7a4a8a']].map(([x, c]) => `<rect x="${x - 10}" y="72" width="20" height="16" fill="${c}"/><path d="M${x - 10} 76 h20" stroke="#fff" stroke-width="1" opacity=".6"/>`).join('')}
    <ellipse cx="100" cy="82" rx="14" ry="6" fill="#c9a46a" stroke="#8a6a3a"/>`,

  // 茶の湯: 畳に置かれた茶碗と茶筅、立ちのぼる湯気、床の掛け軸
  chanoyu: () => `
    ${washi('#e8e0c8', 'chanoyu')}
    <rect x="128" y="8" width="44" height="76" fill="#f6f2e2" stroke="#8a7a5a"/>
    <rect x="124" y="6" width="52" height="5" fill="#5c4030"/><rect x="124" y="83" width="52" height="5" fill="#5c4030"/>
    <path d="M150 20 C142 34 158 42 150 56 C146 64 152 70 150 74" stroke="#2b2620" stroke-width="2.5" fill="none"/>
    <rect y="92" width="${W}" height="38" fill="#c9c08a"/>
    <g stroke="#a8a06a" stroke-width="1">${[0, 1, 2, 3].map(i => `<path d="M${i * 50} 92 v38"/>`).join('')}</g>
    <path d="M0 92 H200" stroke="#3b3a2a" stroke-width="3"/>
    <path d="M40 80 Q40 112 72 112 Q104 112 104 80Z" fill="#2b2a28"/>
    <path d="M42 84 Q44 108 72 108 Q100 108 102 84" stroke="#6a4a2a" stroke-width="2" fill="none"/>
    <ellipse cx="72" cy="80" rx="32" ry="7" fill="#4a6a2a"/><ellipse cx="72" cy="80" rx="26" ry="4" fill="#7aa04a"/>
    <path d="M64 70 C58 60 70 54 64 44 M80 70 C86 60 74 54 80 44" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
    <g transform="translate(112 96)"><path d="M0 0 h14 v-10 h-14z" fill="#d8c08a"/><g stroke="#d8c08a" stroke-width="1">${[1, 3, 5, 7, 9, 11, 13].map(x => `<path d="M${x} -10 L${x + (x - 7) * 0.4} -24"/>`).join('')}</g></g>
    <path d="M150 112 h40" stroke="#5c3b22" stroke-width="3"/><path d="M150 112 q-4 -4 0 -6" stroke="#5c3b22" stroke-width="2" fill="none"/>`,

  // 寺社造営: 寄進で建つ五重塔と、名を記した寄進札
  jisha: () => `
    <defs>${skyGradient('jisha-sky', '#f2c08a', '#f8efdc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#jisha-sky)"/>
    <path d="M100 8 v12" stroke="#c9a43a" stroke-width="3"/>
    ${[0, 1, 2, 3, 4].map(i => { const y = 22 + i * 18; const w = 28 + i * 6; return `<path d="M${100 - w} ${y + 6} Q100 ${y - 4} ${100 + w} ${y + 6} L${100 + w - 6} ${y + 9} Q100 ${y + 2} ${100 - w + 6} ${y + 9}Z" fill="#3b2a1a"/><rect x="${100 - w + 12}" y="${y + 9}" width="${2 * w - 24}" height="9" fill="#b8322a"/>`; }).join('')}
    <rect y="112" width="${W}" height="18" fill="#c9b48a"/>
    <g>${[[22, 72], [36, 76], [164, 72], [178, 76]].map(([x, y], i) => `<rect x="${x - 6}" y="${y}" width="12" height="36" fill="#fbf6e6" stroke="#8a6a3a"/><path d="M${x} ${y + 6} v24" stroke="#2b2620" stroke-width="1.5" stroke-dasharray="${3 + i} 2"/>`).join('')}</g>
    <g fill="#e6c46a">${[[60, 108], [140, 108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g>`,

  // 勘合船: 割符の勘合と、明へ向かう遣明船
  kangou: () => `
    <defs>${skyGradient('kangou-sky', '#9fc4dd', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kangou-sky)"/>
    <path d="M0 96 q25 -10 50 0 t50 0 t50 0 t50 0 V130 H0Z" fill="#2f5a99"/>
    <path d="M30 92 h90 l-10 14 h-70z" fill="#5c3b22"/><path d="M72 92 V36" stroke="#3b2a1a" stroke-width="3"/>
    <path d="M50 40 h44 l-4 46 h-36z" fill="#f2ead6" stroke="#8a6a3a"/><g stroke="#8a6a3a">${[52, 64, 76].map(y => `<path d="M52 ${y} h40"/>`).join('')}</g>
    <g transform="rotate(8 156 56)">
      <rect x="128" y="20" width="26" height="72" fill="#fbf6e6" stroke="#8a6a3a"/>
      <rect x="156" y="20" width="26" height="72" fill="#fbf6e6" stroke="#8a6a3a" transform="translate(4 4)"/>
      <circle cx="156" cy="56" r="11" fill="none" stroke="#b8322a" stroke-width="3"/>
      <text x="141" y="48" text-anchor="middle" font-family="serif" font-size="11" font-weight="700" fill="#2b2620">勘</text>
      <text x="173" y="74" text-anchor="middle" font-family="serif" font-size="11" font-weight="700" fill="#2b2620">合</text>
    </g>`,

  // 守護大名: 林立する旗印と、陣羽織の背
  shugodaimyo: () => `
    <defs>${skyGradient('shugodaimyo-sky', '#c9a46a', '#f4e6c8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#shugodaimyo-sky)"/>
    ${[[24, '#b8322a'], [52, '#2c3e66'], [148, '#2c3e66'], [176, '#b8322a']].map(([x, c], i) => `<path d="M${x} 130 V${14 + (i % 2) * 8}" stroke="#3b2a1a" stroke-width="2"/><path d="M${x} ${16 + (i % 2) * 8} h18 v34 h-18z" fill="${c}"/><circle cx="${x + 9}" cy="${32 + (i % 2) * 8}" r="5" fill="#f3e6c8"/>`).join('')}
    <path d="M60 130 L72 70 Q100 56 128 70 L140 130Z" fill="#6a1a1a"/>
    <path d="M72 70 L100 130 L128 70" fill="#8e2418"/>
    <circle cx="100" cy="96" r="14" fill="#f3e6c8"/><path d="M100 84 l10 18 h-20z" fill="#6a1a1a"/>
    <path d="M86 70 Q100 40 114 70Z" fill="#1d1d26"/><path d="M92 46 L84 30 M108 46 L116 30" stroke="#e6c46a" stroke-width="3"/>`,

  // 町衆: 祇園祭の山鉾と、見物の町衆
  machishu: () => `
    <defs>${skyGradient('machishu-sky', '#9fc4dd', '#f6ecd6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#machishu-sky)"/>
    <path d="M100 2 V40" stroke="#5c3b22" stroke-width="3"/><path d="M92 8 l8 -6 l8 6z" fill="#e6c46a"/>
    <path d="M70 40 h60 l6 10 h-72z" fill="#3b2a1a"/>
    <rect x="72" y="50" width="56" height="40" fill="#b8322a"/>
    <g fill="#e6c46a">${[0, 1, 2].map(i => `<rect x="${78 + i * 16}" y="56" width="10" height="28"/>`).join('')}</g>
    <path d="M66 90 h68 v8 h-68z" fill="#3b2a1a"/>
    ${[78, 122].map(x => `<circle cx="${x}" cy="108" r="12" fill="#3b2a1a"/><circle cx="${x}" cy="108" r="4" fill="#c9a46a"/>`).join('')}
    <rect y="118" width="${W}" height="12" fill="#d8c39a"/>
    ${[[20, '#2c3e66'], [38, '#7a4a8a'], [164, '#3d7a4a'], [182, '#8e2418']].map(([x, c]) => `<circle cx="${x}" cy="96" r="5" fill="#f3d7b6"/><path d="M${x - 6} 122 l2 -20 h8 l2 20z" fill="${c}"/>`).join('')}
    <path d="M60 50 L20 20 M140 50 L180 20" stroke="#5c3b22" stroke-width="1"/>`,

  // 蔵元: 並ぶ酒樽と米俵、帳場
  kuramoto: () => `
    ${washi('#3b2a1a', 'kuramoto')}
    <rect y="96" width="${W}" height="34" fill="#6b4a2b"/>
    ${[[30, 70], [64, 70], [98, 70]].map(([x, y]) => `<rect x="${x - 16}" y="${y - 10}" width="32" height="36" rx="6" fill="#c9a46a" stroke="#6b4a2b" stroke-width="2"/><path d="M${x - 16} ${y - 2} h32 M${x - 16} ${y + 18} h32" stroke="#6b4a2b" stroke-width="3"/><rect x="${x - 8}" y="${y + 2}" width="16" height="12" fill="#f3e6c8"/><text x="${x}" y="${y + 12}" text-anchor="middle" font-family="serif" font-size="9" font-weight="700" fill="#b8322a">酒</text>`).join('')}
    ${[[142, 92], [170, 92], [156, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="9" fill="#d8c08a" stroke="#8a6a3a"/><path d="M${x - 8} ${y - 6} v12 M${x + 8} ${y - 6} v12" stroke="#8a6a3a" stroke-width="1.5"/>`).join('')}
    <path d="M0 22 h200" stroke="#1d140c" stroke-width="10"/><g fill="#f2a33a">${[40, 100, 160].map(x => `<ellipse cx="${x}" cy="34" rx="7" ry="9"/>`).join('')}</g>`,

  // 能楽: 松の鏡板を背に、翁の面
  nougaku: () => `
    ${washi('#e6d3a0', 'nougaku')}
    <path d="M30 120 C40 80 30 60 60 40 C80 28 120 34 150 24" stroke="#5a3a1a" stroke-width="8" fill="none"/>
    ${[[60, 36, 26], [110, 30, 22], [152, 22, 18], [40, 64, 18]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.4}" fill="#3d6a3a"/>`).join('')}
    <rect y="104" width="${W}" height="26" fill="#a07a4f"/><g stroke="#7a5a35">${[0, 1, 2, 3, 4].map(i => `<path d="M${i * 44} 104 v26"/>`).join('')}</g>
    <ellipse cx="100" cy="72" rx="26" ry="32" fill="#f6f0e0" stroke="#8a7a5a" stroke-width="1.5"/>
    <path d="M84 62 q6 -6 12 0 M104 62 q6 -6 12 0" stroke="#2b2620" stroke-width="2.5" fill="none"/>
    <path d="M86 66 q5 3 10 0 M104 66 q5 3 10 0" stroke="#2b2620" stroke-width="1.5" fill="none"/>
    <path d="M86 84 q14 10 28 0" stroke="#b8322a" stroke-width="2" fill="none"/>
    <path d="M80 86 q20 32 40 0" fill="#f6f6f6" stroke="#ccc"/><g stroke="#ccc">${[88, 96, 104, 112].map(x => `<path d="M${x} 90 v${14 - Math.abs(x - 100) / 2}"/>`).join('')}</g>
    <path d="M76 52 q8 -10 18 -4 M124 52 q-8 -10 -18 -4" stroke="#ddd" stroke-width="3" fill="none"/>`,

  // 酒屋: 杉玉の下がる軒と、酒樽
  sakaya: () => `
    ${washi('#efe2c4', 'sakaya')}
    <path d="M10 20 L190 20 L180 36 L20 36Z" fill="#3b3b44"/>
    <rect x="20" y="36" width="160" height="62" fill="#5c4030"/>
    <g stroke="#3b2a1a" stroke-width="2">${[40, 60, 80, 100, 120, 140, 160].map(x => `<path d="M${x} 36 v62"/>`).join('')}</g>
    <path d="M60 36 v14" stroke="#3b2a1a" stroke-width="2"/>
    <circle cx="60" cy="64" r="16" fill="#4e7a3a"/>
    <g stroke="#3d6a2a" stroke-width="1.2">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M${60 + 10 * Math.cos(a)} ${64 + 10 * Math.sin(a)} l${4 * Math.cos(a)} ${4 * Math.sin(a)}"/>`; }).join('')}</g>
    <rect x="110" y="44" width="58" height="22" fill="#f6f2e2"/><text x="139" y="60" text-anchor="middle" font-family="serif" font-size="13" font-weight="700" fill="#2b2620">御酒</text>
    <rect y="98" width="${W}" height="32" fill="#c9b48a"/>
    ${[[120, 104], [150, 104], [135, 88]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="10" fill="#e6d3a0" stroke="#8a6a3a" stroke-width="1.5"/><path d="M${x - 14} ${y} h28" stroke="#b8322a" stroke-width="2"/>`).join('')}`,

  // 金閣: 池に映る金色の楼閣
  kinkaku: () => `
    <defs>${skyGradient('kinkaku-sky', '#a9cfe0', '#eef4ea')}${gold('kinkaku-g')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kinkaku-sky)"/>
    <path d="M0 56 Q40 36 80 50 L80 72 H0Z M200 52 Q160 34 130 50 L130 72 H200Z" fill="#3d6a3a"/>
    <rect y="72" width="${W}" height="58" fill="#7fb3d5"/>
    <g>
      <path d="M100 8 l-4 6 h8z" fill="#e2b23a"/>
      <path d="M76 22 Q100 10 124 22 L120 26 Q100 16 80 26Z" fill="#3b2a1a"/>
      <rect x="82" y="26" width="36" height="14" fill="url(#kinkaku-g)"/>
      <path d="M68 42 Q100 30 132 42 L128 46 Q100 36 72 46Z" fill="#3b2a1a"/>
      <rect x="74" y="46" width="52" height="14" fill="url(#kinkaku-g)"/>
      <path d="M62 60 Q100 50 138 60 L134 64 Q100 56 66 64Z" fill="#3b2a1a"/>
      <rect x="68" y="64" width="64" height="10" fill="#f6f2e2"/><g stroke="#5c4030">${[74, 86, 98, 110, 122].map(x => `<path d="M${x} 64 v10"/>`).join('')}</g>
    </g>
    <g opacity=".45" transform="translate(0 148) scale(1 -1)">
      <rect x="82" y="26" width="36" height="14" fill="url(#kinkaku-g)"/><rect x="74" y="46" width="52" height="14" fill="url(#kinkaku-g)"/><rect x="68" y="64" width="64" height="10" fill="#f6f2e2"/>
    </g>
    <g stroke="#fff" stroke-width="1.2" opacity=".7">${[[30, 100], [150, 112], [60, 120]].map(([x, y]) => `<path d="M${x} ${y} h20"/>`).join('')}</g>`,

  // 土倉: 「質」の看板と、銭の詰まった箱
  dosou: () => `
    ${washi('#e8e0d0', 'dosou')}
    <path d="M30 34 L100 12 L170 34Z" fill="#3b3b44"/>
    <rect x="38" y="34" width="124" height="70" fill="#d8d0c0" stroke="#8a8a90"/>
    <g stroke="#b8b0a0" stroke-width="1">${[50, 66, 82].map(y => `<path d="M38 ${y} h124"/>`).join('')}</g>
    <rect x="80" y="54" width="40" height="50" fill="#2b2014"/>
    <rect x="44" y="40" width="28" height="28" fill="#f6f2e2" stroke="#2b2620" stroke-width="2"/><text x="58" y="61" text-anchor="middle" font-family="serif" font-size="20" font-weight="700" fill="#2b2620">質</text>
    <rect y="104" width="${W}" height="26" fill="#a07a4f"/>
    <rect x="120" y="84" width="46" height="30" fill="#6b3a1a" stroke="#3b2014" stroke-width="2"/><path d="M120 92 h46" stroke="#e6c46a" stroke-width="2"/>
    ${Array.from({ length: 6 }, (_, i) => `<circle cx="${128 + (i % 3) * 14}" cy="${80 - Math.floor(i / 3) * 6}" r="5" fill="#b8682f" stroke="#6e3a17"/>`).join('')}
    <path d="M20 112 l12 -10 l12 10z" fill="#d8c08a"/>`,

  // 七福神: 寶の帆をあげた宝船
  shichifuku: () => `
    <defs>${skyGradient('shichifuku-sky', '#f2b45a', '#fbe8c0')}${gold('shichifuku-g')}</defs>
    <rect width="${W}" height="${H}" fill="url(#shichifuku-sky)"/>
    <circle cx="160" cy="28" r="16" fill="#d9472b"/>
    <path d="M0 104 q25 -10 50 0 t50 0 t50 0 t50 0 V130 H0Z" fill="#2f5a99"/>
    <path d="M24 90 Q100 110 176 90 L160 108 Q100 120 40 108Z" fill="#b8322a"/>
    <path d="M24 90 Q20 80 30 76 M176 90 Q182 78 172 74" stroke="#b8322a" stroke-width="6" fill="none"/>
    <path d="M100 92 V16" stroke="#5c3b22" stroke-width="3"/>
    <rect x="70" y="20" width="60" height="56" fill="url(#shichifuku-g)" stroke="#8a6410"/>
    <text x="100" y="62" text-anchor="middle" font-family="serif" font-size="34" font-weight="700" fill="#8e2418">寶</text>
    ${[[44, 84, '#2c3e66'], [62, 86, '#3d7a4a'], [138, 86, '#7a4a8a'], [156, 84, '#e6c46a'], [82, 88, '#e8603a'], [118, 88, '#2c3e66'], [168, 82, '#8e2418']].map(([x, y, c]) => `<circle cx="${x}" cy="${y - 10}" r="5" fill="#f3d7b6"/><path d="M${x - 6} ${y + 2} q6 -12 12 0z" fill="${c}"/>`).join('')}
    <g fill="#fff6c8">${[[30, 30], [60, 16], [186, 60]].map(([x, y]) => `<path d="M${x} ${y} l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z"/>`).join('')}</g>`,
};
