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

  // 借上: 帳面と銭差し、天秤
  kashiage: () => `
    ${washi('#e9dcc0', 'kashiage')}
    <rect y="96" width="${W}" height="34" fill="#8a6440"/>
    <path d="M100 20 v62" stroke="#5c3b22" stroke-width="4"/>
    <path d="M60 30 h80" stroke="#5c3b22" stroke-width="3"/>
    <path d="M60 30 l-14 30 h28z M140 30 l-14 30 h28z" fill="none" stroke="#5c3b22" stroke-width="1.5"/>
    <path d="M44 60 q16 10 32 0z" fill="#c9a43a"/><path d="M124 60 q16 10 32 0z" fill="#c9a43a"/>
    <circle cx="60" cy="56" r="5" fill="#b8862a" stroke="#6e4a08"/><circle cx="140" cy="56" r="5" fill="#b8862a" stroke="#6e4a08"/>
    <path d="M86 82 h28 l6 14 h-40z" fill="#5c3b22"/>
    <rect x="22" y="100" width="54" height="22" fill="#f6efe0" stroke="#5c3b22"/>
    <g stroke="#2b1a08" stroke-width="1">${[30, 40, 50, 60, 68].map(x => `<path d="M${x} 104 v14"/>`).join('')}</g>
    <g fill="#c9a43a" stroke="#6e4a08">${[0, 1, 2, 3, 4, 5, 6].map(i => `<ellipse cx="${118 + i * 9}" cy="110" rx="5" ry="6"/>`).join('')}</g>
    <path d="M112 110 h70" stroke="#5c3b22" stroke-width="1.5"/>`,

  // 馬借: 荷を積んだ馬と馬借、遠くの峠道
  bashaku: () => `
    <defs>${skyGradient('bashaku-sky', '#9cc3d8', '#f2e6c8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bashaku-sky)"/>
    <path d="M0 70 Q50 40 100 64 T200 52 V130 H0z" fill="#8aa86a"/>
    <path d="M0 96 Q100 84 200 100 V130 H0z" fill="#c9a77a"/>
    <path d="M30 70 Q80 76 120 66 T200 64" stroke="#e6d4a8" stroke-width="3" fill="none"/>
    <g fill="#5c3b22">
      <path d="M70 88 q6 -16 30 -14 q22 2 30 -8 l8 4 q-4 10 -12 14 l0 24 h-5 l-2 -20 h-30 l-3 20 h-5 l-1 -22 q-8 -2 -10 2z"/>
      <path d="M134 66 l10 -4 l6 6 l-6 4z"/>
    </g>
    <rect x="82" y="60" width="34" height="16" fill="#e6d4a8" stroke="#5c3b22"/>
    <path d="M82 68 h34 M99 60 v16" stroke="#8a6440"/>
    <g fill="#2c3e66"><circle cx="50" cy="74" r="5"/><path d="M44 80 h12 l2 22 h-16z"/></g>
    <path d="M42 70 l8 -6 l8 6z" fill="#c9a43a"/>
    <path d="M56 86 L74 80" stroke="#5c3b22" stroke-width="1.5"/>`,

  // 番所: 木戸と見張りの番人、提灯
  bansho: () => `
    <defs>${skyGradient('bansho-sky', '#2c3550', '#7a6a8a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bansho-sky)"/>
    <circle cx="164" cy="26" r="10" fill="#f6efd0"/>
    <rect y="100" width="${W}" height="30" fill="#4a3a2e"/>
    <path d="M24 40 h70 l-8 -12 h-54z" fill="#3a2a1e"/>
    <rect x="30" y="40" width="58" height="60" fill="#8a6440"/>
    <rect x="40" y="52" width="38" height="20" fill="#2b1a08"/>
    <g stroke="#c9a77a" stroke-width="1.5">${[46, 54, 62, 70].map(x => `<path d="M${x} 52 v20"/>`).join('')}</g>
    <g fill="#5c3b22">${[110, 150].map(x => `<rect x="${x}" y="34" width="8" height="66"/>`).join('')}<rect x="104" y="30" width="60" height="7"/></g>
    <g fill="none" stroke="#5c3b22" stroke-width="3"><path d="M118 50 h32 M118 66 h32 M118 82 h32"/></g>
    <ellipse cx="96" cy="64" rx="7" ry="10" fill="#f2a33a"/><path d="M96 54 v-6" stroke="#2b1a08"/>
    <circle cx="96" cy="64" r="16" fill="#f6c86a" opacity=".25"/>
    <g fill="#1e2438"><circle cx="20" cy="82" r="5"/><path d="M14 88 h12 l2 14 h-16z"/></g>
    <path d="M28 76 L32 104" stroke="#c9a77a" stroke-width="2"/>`,

  // 石切場: 切り出した石と、のみを振るう石工
  ishikiri: () => `
    <defs>${skyGradient('ishikiri-sky', '#b8c8d0', '#efe6d0')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ishikiri-sky)"/>
    <path d="M0 30 L60 18 L120 26 L200 14 V100 H0z" fill="#9a958a"/>
    <g stroke="#7a756a" stroke-width="1.5" fill="none">
      <path d="M0 50 L200 44 M0 72 L200 68 M40 30 v20 M100 24 v22 M160 18 v28 M20 50 v22 M80 48 v22 M140 46 v22 M70 70 v28 M130 68 v30"/>
    </g>
    <rect y="100" width="${W}" height="30" fill="#c9b892"/>
    <g fill="#b7b2a6" stroke="#6a655a">
      <rect x="110" y="86" width="40" height="22"/><rect x="152" y="94" width="30" height="16"/><rect x="128" y="70" width="30" height="16"/>
    </g>
    <g fill="#5c3b22"><circle cx="66" cy="70" r="6"/><path d="M58 78 h16 l4 24 h-8 l-2 -12 l-4 12 h-8z"/></g>
    <path d="M70 80 L90 66" stroke="#5c3b22" stroke-width="3"/>
    <rect x="86" y="60" width="10" height="7" fill="#3a2a1e" transform="rotate(-35 91 63)"/>
    <g stroke="#fff4c8" stroke-width="1.5"><path d="M100 56 l6 -6 M104 62 l8 -2 M98 50 l2 -8"/></g>`,

  // お守り: 錦の守り袋と鈴
  omamori: () => `
    ${washi('#7a1e22', 'omamori')}
    <g opacity=".25" fill="#f2c45a">${Array.from({ length: 12 }, (_, i) => `<circle cx="${(i % 4) * 56 + 16}" cy="${Math.floor(i / 4) * 46 + 18}" r="10"/>`).join('')}</g>
    <path d="M100 8 q-10 6 0 14 q10 -8 0 -14z" fill="none" stroke="#f2e6c8" stroke-width="2"/>
    <path d="M70 26 h60 l4 90 h-68z" fill="#d9c27a" stroke="#6e4a08" stroke-width="2"/>
    <path d="M70 26 q30 -14 60 0" fill="#b8322a"/>
    <g fill="#b8322a" opacity=".55">${[[84, 60], [116, 60], [100, 90], [84, 104], [116, 104]].map(([x, y]) => `<path d="M${x} ${y - 6} l6 6 l-6 6 l-6 -6z"/>`).join('')}</g>
    <rect x="88" y="40" width="24" height="40" fill="#f6efe0" stroke="#6e4a08"/>
    <text x="100" y="58" text-anchor="middle" font-family="serif" font-size="12" font-weight="700" fill="#2b1a08">守</text>
    <text x="100" y="74" text-anchor="middle" font-family="serif" font-size="12" font-weight="700" fill="#2b1a08">護</text>
    <circle cx="150" cy="40" r="10" fill="#e2b23a" stroke="#6e4a08" stroke-width="1.5"/><path d="M144 42 h12" stroke="#6e4a08"/>
    <path d="M100 22 Q130 20 146 32" stroke="#f2e6c8" stroke-width="1.5" fill="none"/>`,

  // 私鋳銭: 薄暗い小屋で、こっそり鋳た銭（形がいびつ）
  shichusen: () => `
    ${washi('#2a2420', 'shichusen')}
    <path d="M0 96 h200 v34 h-200z" fill="#3e332a"/>
    <path d="M30 70 h50 l-6 26 h-38z" fill="#5c4a3a"/>
    <path d="M38 70 q17 -14 34 0" fill="#e2602a"/>
    <path d="M44 66 q11 -22 22 0" fill="#f6b84a"/>
    <circle cx="55" cy="56" r="26" fill="#f2a33a" opacity=".15"/>
    <g fill="#9a7a3a" stroke="#4a3a1a" stroke-width="1.5">
      ${[[112, 92, 12, 10], [134, 100, 11, 12], [154, 90, 13, 11], [126, 112, 12, 10], [150, 114, 10, 11], [172, 106, 12, 12]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#2a2420"/>`).join('')}
    </g>
    <g fill="#1a1612"><circle cx="150" cy="52" r="7"/><path d="M138 60 q12 -4 24 0 l4 26 h-32z"/></g>
    <path d="M140 56 q10 6 20 0" stroke="#3e332a" stroke-width="5"/>
    <path d="M126 70 L112 84" stroke="#5c4a3a" stroke-width="3"/>`,

  // 勘定所: そろばんと帳簿、積まれた銅銭
  kanjou: () => `
    ${washi('#efe2c4', 'kanjou')}
    <rect y="92" width="${W}" height="38" fill="#a07a4f"/>
    <rect x="22" y="46" width="110" height="44" rx="3" fill="#5c3b22"/>
    <rect x="28" y="52" width="98" height="32" fill="#e9dcc0"/>
    <path d="M28 62 h98" stroke="#5c3b22" stroke-width="2"/>
    <g stroke="#5c3b22">${Array.from({ length: 9 }, (_, i) => `<path d="M${36 + i * 11} 52 v32"/>`).join('')}</g>
    <g fill="#3a2a1e">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${36 + i * 11}" cy="${i % 3 ? 57 : 59}" rx="4" ry="2.6"/>${[0, 1, 2, 3].map(k => `<ellipse cx="${36 + i * 11}" cy="${(i % 2 ? 68 : 72) + k * 4}" rx="4" ry="2.6"/>`).join('')}`).join('')}</g>
    <rect x="140" y="30" width="42" height="56" fill="#f6efe0" stroke="#5c3b22"/>
    <path d="M140 30 v56" stroke="#2c3e66" stroke-width="4"/>
    <g stroke="#2b1a08" stroke-width="1">${[150, 158, 166, 174].map(x => `<path d="M${x} 38 v40"/>`).join('')}</g>
    <g fill="#b8862a" stroke="#6e4a08">${[0, 1, 2, 3, 4].map(i => `<ellipse cx="60" cy="${112 - i * 4}" rx="16" ry="5"/>`).join('')}${[0, 1, 2].map(i => `<ellipse cx="100" cy="${114 - i * 4}" rx="16" ry="5"/>`).join('')}</g>`,

  // 鋳銭所: 溶けた銅を型に流し込む
  chuusen: () => `
    ${washi('#3a2520', 'chuusen')}
    <rect y="100" width="${W}" height="30" fill="#2a1a14"/>
    <path d="M20 100 l14 -40 h40 l14 40z" fill="#6a4a3a"/>
    <path d="M40 62 q14 -20 28 0" fill="#e2602a"/>
    <path d="M46 60 q8 -16 16 0" fill="#f6d06a"/>
    <path d="M86 46 l30 -8 l4 10 l-30 8z" fill="#5c4a3a"/>
    <path d="M118 46 q8 4 6 18" stroke="#f6a63a" stroke-width="4" fill="none"/>
    <rect x="104" y="72" width="80" height="22" fill="#7a5a44"/>
    <g fill="#f6a63a">${[0, 1, 2, 3, 4].map(i => `<circle cx="${116 + i * 14}" cy="83" r="6"/>`).join('')}</g>
    <g fill="#7a5a44">${[0, 1, 2, 3, 4].map(i => `<rect x="${114 + i * 14}" y="81" width="4" height="4"/>`).join('')}</g>
    <g fill="#f6d06a" opacity=".8">${[[60, 30], [70, 22], [52, 18], [80, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>
    <circle cx="120" cy="64" r="22" fill="#f6a63a" opacity=".12"/>`,

  // 土一揆: 筵旗と竹槍の群衆、徳政の高札
  tsuchiikki: () => `
    <defs>${skyGradient('ikki-sky', '#c8b07a', '#efe2c4')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ikki-sky)"/>
    <rect y="104" width="${W}" height="26" fill="#8a7050"/>
    <g fill="#d8c08a" stroke="#6e5a3a">
      <rect x="30" y="16" width="34" height="40"/><rect x="128" y="10" width="34" height="42"/>
    </g>
    <g stroke="#6e5a3a" stroke-width="1">${[22, 30, 38, 46].map(y => `<path d="M30 ${y} h34 M128 ${y - 4} h34"/>`).join('')}</g>
    <text x="47" y="44" text-anchor="middle" font-family="serif" font-size="13" font-weight="700" fill="#2b1a08">徳政</text>
    <path d="M28 14 v90 M126 8 v96" stroke="#5c3b22" stroke-width="3"/>
    <g stroke="#7a8a4a" stroke-width="2.5">${[76, 92, 108, 170, 186].map((x, i) => `<path d="M${x} 104 L${x + (i % 2 ? 6 : -6)} 30"/>`).join('')}</g>
    <g fill="#3a2a1e">${Array.from({ length: 9 }, (_, i) => `<circle cx="${14 + i * 22}" cy="${86 + (i % 2) * 4}" r="7"/><path d="M${6 + i * 22} ${94 + (i % 2) * 4} h16 l2 14 h-20z"/>`).join('')}</g>
    <g fill="#c9a77a">${Array.from({ length: 9 }, (_, i) => `<path d="M${6 + i * 22} ${83 + (i % 2) * 4} l8 -6 l8 6z"/>`).join('')}</g>`,

  // 御朱印: 朱の印と、墨書きの文書
  goshuin: () => `
    ${washi('#f3ead6', 'goshuin')}
    <rect x="30" y="14" width="140" height="102" fill="#fbf6ea" stroke="#c8b892"/>
    <g stroke="#2b1a08" stroke-width="2.4" stroke-linecap="round">
      ${[150, 132, 114, 96, 78].map((x, i) => `<path d="M${x} 24 q2 ${20 + i * 3} -1 ${44 + (i % 2) * 14}"/>`).join('')}
    </g>
    <rect x="46" y="70" width="34" height="34" fill="#c8322a" opacity=".9"/>
    <rect x="50" y="74" width="26" height="26" fill="none" stroke="#fbf6ea" stroke-width="1.5"/>
    <text x="63" y="92" text-anchor="middle" font-family="serif" font-size="13" font-weight="700" fill="#fbf6ea">朱印</text>
    <path d="M10 120 Q100 112 190 122" stroke="#b8322a" stroke-width="3" fill="none"/>`,

  // 普請: 足場を組んだ城郭の建て増し
  fushin: () => `
    <defs>${skyGradient('fushin-sky', '#8ab8d8', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#fushin-sky)"/>
    <rect y="100" width="${W}" height="30" fill="#a8946a"/>
    <path d="M30 100 l10 -30 h70 l10 30z" fill="#9a958a"/>
    <g stroke="#7a756a">${[80, 90].map(y => `<path d="M${30 + (100 - y) / 3} ${y} h${90 - 2 * (100 - y) / 3}"/>`).join('')}</g>
    <rect x="46" y="44" width="58" height="26" fill="#f6f2e8"/>
    <path d="M38 46 Q75 26 112 46z" fill="#3a3a44"/>
    <g fill="none" stroke="#c9a77a" stroke-width="2.5">
      <path d="M120 100 V30 M150 100 V30 M180 100 V30 M120 40 H180 M120 64 H180 M120 88 H180 M120 64 L150 40 M150 88 L180 64"/>
    </g>
    <g fill="#5c3b22"><circle cx="135" cy="56" r="4"/><path d="M131 60 h8 l1 6 h-10z"/><circle cx="165" cy="80" r="4"/><path d="M161 84 h8 l1 6 h-10z"/></g>
    <rect x="140" y="24" width="24" height="10" fill="#c8b48a" stroke="#5c3b22"/>
    <path d="M152 24 V8" stroke="#5c3b22"/>`,

  // 刀鍛冶: 鍛冶場の火と、槌で打つ刀
  katanakaji: () => `
    ${washi('#241a16', 'katanakaji')}
    <rect y="96" width="${W}" height="34" fill="#3a2a20"/>
    <circle cx="44" cy="70" r="34" fill="#e2602a" opacity=".18"/>
    <path d="M14 96 l12 -38 h36 l12 38z" fill="#5a4034"/>
    <path d="M30 62 q14 -22 28 0" fill="#e2602a"/><path d="M36 60 q8 -16 16 0" fill="#f6d06a"/>
    <rect x="96" y="78" width="60" height="18" fill="#4a4a50"/>
    <path d="M90 76 Q130 72 176 66" stroke="#f6b84a" stroke-width="4" fill="none"/>
    <path d="M176 66 l10 -3" stroke="#f6d06a" stroke-width="3"/>
    <g fill="#1a1210"><circle cx="138" cy="34" r="8"/><path d="M126 42 q12 -4 24 0 l4 30 h-32z"/></g>
    <path d="M148 46 L120 24" stroke="#8a6440" stroke-width="4"/>
    <rect x="110" y="16" width="16" height="12" fill="#5a5a60" transform="rotate(-38 118 22)"/>
    <g fill="#f6d06a">${[[124, 66], [118, 58], [132, 60], [112, 64], [140, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>
    <path d="M128 90 h-4 v-6" stroke="#5c3b22"/>`,

  // 行商人: 天秤棒で荷を担いで歩く物売り
  gyoushou: () => `
    <defs>${skyGradient('gyoushou-sky', '#f2c48a', '#f6ecd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#gyoushou-sky)"/>
    <path d="M0 80 Q60 66 120 76 T200 70 V130 H0z" fill="#b8a07a"/>
    <path d="M0 100 Q100 92 200 104 V130 H0z" fill="#d8c49a"/>
    <path d="M40 54 Q100 46 160 54" stroke="#5c3b22" stroke-width="3" fill="none"/>
    <g fill="#5c3b22"><path d="M40 54 v16 M160 54 v16" stroke="#5c3b22"/></g>
    <rect x="26" y="70" width="28" height="22" fill="#8a6440" stroke="#5c3b22"/>
    <rect x="146" y="70" width="28" height="22" fill="#8a6440" stroke="#5c3b22"/>
    <g fill="#c8322a"><circle cx="34" cy="68" r="4"/><circle cx="44" cy="66" r="4"/></g>
    <g fill="#4e8a3a"><circle cx="154" cy="68" r="4"/><circle cx="166" cy="66" r="4"/></g>
    <circle cx="100" cy="40" r="8" fill="#e8c8a0"/>
    <path d="M86 34 l14 -10 l14 10z" fill="#c9a77a"/>
    <path d="M90 50 h20 l4 30 h-28z" fill="#2c3e66"/>
    <path d="M92 80 l-6 22 M108 80 l6 22" stroke="#2c3e66" stroke-width="5"/>`,
};
