// 平安のイラスト（朱と白の雅）
import { H, skyGradient, W, washi } from './common.js';

export const HEIAN_ART = {
  sato: () => `
    <defs>${skyGradient('sato-sky', '#a9cfe0', '#eef4ea')}</defs>
    <rect width="${W}" height="${H}" fill="url(#sato-sky)"/>
    <path d="M0 70 Q50 52 100 66 T200 60 V130 H0Z" fill="#9cc58a"/>
    <path d="M0 96 Q60 86 110 98 T200 92 V130 H0Z" fill="#7fae6c"/>
    <path d="M86 130 Q96 108 120 100 Q140 94 160 96" stroke="#e4cf9c" stroke-width="9" fill="none"/>
    <g>
      <path d="M30 82 L58 56 L86 82Z" fill="#b5893f" stroke="#7a5a24" stroke-width="1.5"/>
      <path d="M36 82 h44 v20 h-44z" fill="#d8c3a0" stroke="#7a5a24" stroke-width="1.5"/>
      <rect x="52" y="88" width="12" height="14" fill="#5a4030"/>
      <path d="M44 62 L72 62" stroke="#7a5a24" stroke-width="1"/>
    </g>
    <g>
      <path d="M108 78 L130 58 L152 78Z" fill="#c4974a" stroke="#7a5a24" stroke-width="1.5"/>
      <path d="M113 78 h34 v16 h-34z" fill="#e2cfaa" stroke="#7a5a24" stroke-width="1.5"/>
      <rect x="125" y="83" width="9" height="11" fill="#5a4030"/>
    </g>
    <path d="M134 56 C128 48 140 44 134 36 C128 28 140 22 136 14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>
    <g><rect x="168" y="70" width="5" height="22" fill="#6b4a2b"/><circle cx="170" cy="60" r="16" fill="#4e8a4a"/><circle cx="160" cy="66" r="10" fill="#5e9b55"/></g>
    <g><rect x="12" y="74" width="4" height="16" fill="#6b4a2b"/><circle cx="14" cy="66" r="11" fill="#4e8a4a"/></g>
    <g fill="#e9e1c9">${[[100, 112], [112, 116], [124, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,

  shakyo: () => `
    ${washi('#e9dcc0', 'shakyo')}
    <rect y="96" width="${W}" height="34" fill="#a07a4f"/>
    <path d="M0 96 H200" stroke="#7a5a35" stroke-width="2"/>
    <rect x="22" y="70" width="156" height="12" rx="2" fill="#5c3b22"/>
    <rect x="30" y="82" width="8" height="22" fill="#4a2f1b"/><rect x="162" y="82" width="8" height="22" fill="#4a2f1b"/>
    <rect x="40" y="44" width="104" height="28" fill="#fbf6e6" stroke="#c9b48a" stroke-width="1"/>
    <rect x="34" y="42" width="8" height="32" rx="3" fill="#7a2e2e"/><rect x="142" y="42" width="8" height="32" rx="3" fill="#7a2e2e"/>
    <g stroke="#2b2620" stroke-width="1.3">${Array.from({ length: 12 }, (_, i) => `<path d="M${50 + i * 8} 48 v${14 + (i % 3) * 3}"/>`).join('')}</g>
    <rect x="150" y="60" width="22" height="10" rx="3" fill="#2b2b2b"/><ellipse cx="161" cy="63" rx="7" ry="2.5" fill="#111"/>
    <path d="M118 68 L160 36" stroke="#6b4a2b" stroke-width="3" stroke-linecap="round"/><path d="M156 39 L166 30" stroke="#222" stroke-width="4" stroke-linecap="round"/>
    <rect x="16" y="34" width="6" height="36" fill="#8a6a3a"/><rect x="12" y="68" width="14" height="4" fill="#6b4a2b"/>
    <path d="M19 34 C13 26 17 18 19 12 C21 18 25 26 19 34Z" fill="#f2a33a"/><path d="M19 32 C16 27 18 22 19 18 C20 22 22 27 19 32Z" fill="#ffe39a"/>`,

  kebiishi: () => `
    ${washi('#f2dcc8', 'kebiishi')}
    <circle cx="100" cy="66" r="56" fill="#d9472b" opacity=".9"/>
    <g opacity=".85">${[[-36, 0], [-24, -30], [24, -32], [40, 2]].map(([x, y], i) => `<rect x="${100 + x * 1.8}" y="${60 + y}" width="16" height="22" rx="2" fill="#fbf6e6" stroke="#8a6a3a" stroke-width="1" transform="rotate(${i * 25 - 30} ${108 + x * 1.8} ${71 + y})"/>`).join('')}</g>
    <path d="M100 30 L92 52 h16Z" fill="#1d1d1d"/>
    <circle cx="100" cy="58" r="9" fill="#f3d7b6"/>
    <path d="M72 124 L84 72 Q100 64 116 72 L128 124Z" fill="#2c3e66"/>
    <path d="M84 72 Q100 82 116 72" stroke="#e8e0cc" stroke-width="3" fill="none"/>
    <path d="M78 96 L122 96" stroke="#b8862f" stroke-width="3"/>
    <path d="M140 26 Q168 70 140 118" stroke="#5a3a1a" stroke-width="4" fill="none"/>
    <path d="M140 26 L140 118" stroke="#e8e0cc" stroke-width="1"/>
    <path d="M60 50 L132 70" stroke="#3b2a1a" stroke-width="2.5"/><path d="M132 70 l-8 -6 m8 6 l-9 3" stroke="#3b2a1a" stroke-width="2.5"/>
    <path d="M60 50 l-6 -6 m6 6 l-8 1" stroke="#c0392b" stroke-width="2"/>`,

  kekkai: () => `
    <defs><radialGradient id="kekkai-g" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#e8f1ff"/><stop offset=".7" stop-color="#9fbbe8"/><stop offset="1" stop-color="#3c5a99"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#1f3360"/>
    <circle cx="100" cy="72" r="56" fill="url(#kekkai-g)" opacity=".9"/>
    <circle cx="100" cy="72" r="56" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 6" opacity=".8"/>
    <path d="M10 34 Q100 58 190 34" stroke="#c9a46a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M10 34 Q100 58 190 34" stroke="#8a6a3a" stroke-width="2" stroke-dasharray="6 5" fill="none"/>
    ${[50, 100, 150].map(x => { const y = x === 100 ? 46 : 41; return `<path d="M${x} ${y} h10 l-6 10 h8 l-8 12 h7 l-7 12" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`; }).join('')}
    <g stroke="#e8e0cc" stroke-width="2.5" stroke-linecap="round">
      <path d="M8 104 L36 96"/><path d="M36 96 l-7 -4 m7 4 l-6 5"/>
      <path d="M192 110 L166 100"/><path d="M166 100 l7 -4 m-7 4 l6 5"/>
    </g>
    <g fill="#ffe39a">${[[42, 92], [160, 96], [48, 104], [154, 108]].map(([x, y]) => `<path d="M${x} ${y} l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" />`).join('')}</g>`,

  // 蔵: なまこ壁の土蔵。扉が開いて中の箱や俵が見える
  kura: () => `
    <defs>${skyGradient('kura-sky', '#c7dbe6', '#f1ecdc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kura-sky)"/>
    <rect y="104" width="${W}" height="26" fill="#c9b48a"/>
    <path d="M44 42 L100 18 L156 42Z" fill="#3b3b44"/><path d="M38 42 Q100 34 162 42" stroke="#22222a" stroke-width="4" fill="none"/>
    <rect x="50" y="42" width="100" height="64" fill="#f6f2e8" stroke="#8a8a90" stroke-width="1.5"/>
    <g>${Array.from({ length: 7 }, (_, i) => Array.from({ length: 3 }, (_, j) => `<path d="M${52 + i * 14} ${88 + j * 6} l7 -3 l7 3 l-7 3z" fill="#3b3b44"/>`).join('')).join('')}</g>
    <rect x="50" y="86" width="100" height="20" fill="none" stroke="#3b3b44" stroke-width="1"/>
    <rect x="80" y="52" width="40" height="34" fill="#2b2014"/>
    <path d="M80 52 l-14 4 v32 l14 -2z" fill="#6b4a2b"/><path d="M120 52 l14 4 v32 l-14 -2z" fill="#6b4a2b"/>
    <ellipse cx="92" cy="80" rx="9" ry="6" fill="#d8c08a"/><path d="M84 80 h16" stroke="#8a6a3a"/>
    <rect x="102" y="70" width="14" height="14" fill="#a07a4f"/><rect x="104" y="60" width="10" height="10" fill="#8a5a2f"/>
    <circle cx="100" cy="30" r="4" fill="#f6f2e8"/>`,

  // 寺: 反り屋根のお堂、線香の煙、賽銭箱（廃棄＝納める）
  tera: () => `
    ${washi('#efe2c4', 'tera')}
    <circle cx="160" cy="30" r="16" fill="#e8a33a" opacity=".5"/>
    <path d="M20 54 Q100 30 180 54 L170 58 Q100 40 30 58Z" fill="#3b2a1a"/>
    <path d="M44 58 h112 v42 h-112z" fill="#b8322a"/>
    <g fill="#e6d6b0">${[56, 76, 96, 116, 136].map(x => `<rect x="${x}" y="64" width="12" height="32"/>`).join('')}</g>
    <g stroke="#b8322a" stroke-width="1">${[56, 76, 96, 116, 136].map(x => `<path d="M${x + 6} 64 v32 M${x} 80 h12"/>`).join('')}</g>
    <path d="M60 30 Q100 14 140 30 L130 34 Q100 22 70 34Z" fill="#4a3a2a"/><rect x="84" y="34" width="32" height="20" fill="#e6d6b0" stroke="#3b2a1a"/>
    <rect y="100" width="${W}" height="30" fill="#bfae8a"/>
    <path d="M30 100 h140 v8 h-140z" fill="#8a7a5a"/>
    <rect x="80" y="104" width="40" height="18" fill="#6b4a2b"/><g stroke="#3b2a1a" stroke-width="1.5">${[86, 92, 98, 104, 110, 116].map(x => `<path d="M${x} 104 v6"/>`).join('')}</g>
    <path d="M40 98 v-12 M44 98 v-14 M48 98 v-12" stroke="#7a5a35" stroke-width="1.5"/>
    <path d="M44 84 C38 74 50 68 44 58 C38 48 48 40 44 32" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`,

  // 工房: 木工の道具（鋸・鉋・槌）と板
  koubou: () => `
    ${washi('#e6d3b0', 'koubou')}
    <rect x="0" y="0" width="${W}" height="70" fill="#a07a4f" opacity=".5"/>
    <g stroke="#7a5a35" stroke-width="1">${[10, 30, 50].map(y => `<path d="M0 ${y} H200"/>`).join('')}</g>
    <path d="M24 16 h66 l-6 18 h-60z" fill="#cfd5db" stroke="#5d6772" stroke-width="1.2"/>
    <g stroke="#5d6772" stroke-width="1">${Array.from({ length: 12 }, (_, i) => `<path d="M${26 + i * 5} 34 l2 4 l2 -4"/>`).join('')}</g>
    <rect x="88" y="14" width="26" height="8" rx="3" fill="#6b4a2b"/>
    <rect x="130" y="14" width="44" height="14" rx="2" fill="#b8865a" stroke="#6b4a2b"/><rect x="146" y="10" width="12" height="20" fill="#5d6772"/>
    <rect y="76" width="${W}" height="54" fill="#8a6a3a"/>
    <path d="M14 84 L186 92 L184 104 L12 96Z" fill="#e2c391" stroke="#a07a4f" stroke-width="1.2"/>
    <g stroke="#c9a46a" stroke-width=".8">${[0, 1, 2].map(i => `<path d="M20 ${88 + i * 3} Q100 ${92 + i * 3} 180 ${96 + i * 3}"/>`).join('')}</g>
    <path d="M60 100 C80 110 100 108 130 112" stroke="#f3d9a6" stroke-width="3" fill="none"/><path d="M120 108 c6 -6 14 2 8 8 c-6 6 -14 -2 -8 -8z" fill="none" stroke="#f3d9a6" stroke-width="2"/>
    <rect x="140" y="100" width="12" height="26" rx="2" fill="#6b4a2b" transform="rotate(-30 146 113)"/><rect x="146" y="92" width="30" height="14" rx="4" fill="#5c3b22" transform="rotate(-30 161 99)"/>`,

  // 牛車: 屋形のついた牛車と、引く牛
  gissha: () => `
    <defs>${skyGradient('gissha-sky', '#f4c9b0', '#fbefdc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#gissha-sky)"/>
    <rect y="100" width="${W}" height="30" fill="#d8c39a"/>
    <path d="M0 100 H200" stroke="#a88c5a" stroke-width="2"/>
    <path d="M28 44 Q60 34 92 44 v38 h-64z" fill="#2b2b38"/>
    <path d="M32 50 h56 v28 h-56z" fill="#b8322a"/><g stroke="#e6c46a" stroke-width="1">${[40, 50, 60, 70, 80].map(x => `<path d="M${x} 50 v28"/>`).join('')}</g>
    <path d="M24 44 Q60 30 96 44" stroke="#1d1d26" stroke-width="5" fill="none"/>
    <circle cx="60" cy="90" r="20" fill="none" stroke="#3b2a1a" stroke-width="5"/><circle cx="60" cy="90" r="4" fill="#3b2a1a"/>
    <g stroke="#3b2a1a" stroke-width="2">${[0, 30, 60, 90, 120, 150].map(a => `<path d="M60 90 l${(18 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(18 * Math.sin(a * Math.PI / 180)).toFixed(1)} M60 90 l${(-18 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(-18 * Math.sin(a * Math.PI / 180)).toFixed(1)}"/>`).join('')}</g>
    <path d="M92 74 L130 70" stroke="#5c3b22" stroke-width="3"/>
    <path d="M124 62 q20 -12 44 -2 q8 4 12 0 q6 2 4 10 l-6 2 q-2 10 -10 14 v18 h-6 v-16 h-26 v16 h-6 v-18 q-8 -6 -6 -24z" fill="#2b2420"/>
    <path d="M176 60 q6 -8 10 -4" stroke="#e8e0cc" stroke-width="2" fill="none"/><circle cx="178" cy="68" r="1.5" fill="#fff"/>
    <path d="M150 74 q-2 6 2 10" stroke="#b8322a" stroke-width="3" fill="none"/>`,

  // 造営: 足場の組まれた社殿と、引き上げられる梁
  zouei: () => `
    ${washi('#efe2c4', 'zouei')}
    <rect y="104" width="${W}" height="26" fill="#c9b48a"/>
    <path d="M50 56 Q100 40 150 56" stroke="#3b2a1a" stroke-width="7" fill="none"/>
    <path d="M60 58 h80 v46 h-80z" fill="#e2c391" opacity=".7"/>
    <g stroke="#b8322a" stroke-width="5">${[66, 100, 134].map(x => `<path d="M${x} 58 v46"/>`).join('')}</g>
    <path d="M60 74 h80" stroke="#b8322a" stroke-width="3"/>
    <g stroke="#8a6a3a" stroke-width="2.5">${[40, 160].map(x => `<path d="M${x} 104 V30"/>`).join('')}<path d="M40 40 H160 M40 70 H160 M40 100 L60 70 M160 100 L140 70"/></g>
    <path d="M100 8 v18" stroke="#3b2a1a" stroke-width="1.5"/><path d="M84 26 h32 v6 h-32z" fill="#a07a4f" stroke="#6b4a2b"/>
    <path d="M100 8 L176 20" stroke="#3b2a1a" stroke-width="1.5"/><circle cx="100" cy="8" r="3" fill="#6b4a2b"/>
    <g fill="#2c3e66"><circle cx="176" cy="30" r="5"/><path d="M170 36 h12 l2 24 h-16z"/></g>
    <path d="M176 22 l4 10" stroke="#3b2a1a" stroke-width="1.5"/>
    <g fill="#e6d6b0" stroke="#a07a4f">${[[18, 110], [26, 104], [34, 110]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="6"/>`).join('')}</g>`,

  // 金貸し: 算盤と銭、帳面
  kanekashi: () => `
    ${washi('#e9dcc0', 'kanekashi')}
    <rect x="24" y="22" width="78" height="96" fill="#fbf6e6" stroke="#c9b48a" stroke-width="1.5" transform="rotate(-6 63 70)"/>
    <g stroke="#2b2620" stroke-width="1.2" transform="rotate(-6 63 70)">${Array.from({ length: 6 }, (_, i) => `<path d="M${88 - i * 11} 30 v${40 + (i % 3) * 14}"/>`).join('')}</g>
    <text x="40" y="112" font-family="serif" font-size="10" fill="#b8322a" transform="rotate(-6 63 70)">大福帳</text>
    <g transform="rotate(8 140 70)">
      <rect x="96" y="40" width="94" height="56" rx="4" fill="#6b3a1a"/>
      <rect x="100" y="44" width="86" height="48" fill="#3b2014"/>
      <path d="M100 58 h86" stroke="#6b3a1a" stroke-width="3"/>
      <g stroke="#8a6a3a" stroke-width="1">${Array.from({ length: 8 }, (_, i) => `<path d="M${106 + i * 11} 44 v48"/>`).join('')}</g>
      <g fill="#c9a46a">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${106 + i * 11}" cy="${50 + (i % 2) * 2}" rx="4.5" ry="3"/>${[0, 1, 2, 3].map(j => `<ellipse cx="${106 + i * 11}" cy="${66 + j * 6 + ((i + j) % 3 === 0 ? 4 : 0)}" rx="4.5" ry="3"/>`).join('')}`).join('')}</g>
    </g>
    ${[[60, 118], [74, 120], [150, 112], [164, 116]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#b8682f" stroke="#6e3a17" stroke-width="1.5"/><rect x="${x - 2.5}" y="${y - 2.5}" width="5" height="5" fill="#e9dcc0"/>`).join('')}`,

  // 御前: 御簾ごしの貴人の座と、左右の檜扇（一枚の札を二度生かす）
  gozen: () => `
    <defs><linearGradient id="gozen-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9472b"/><stop offset="1" stop-color="#8e2418"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#gozen-g)"/>
    <rect x="0" y="100" width="${W}" height="30" fill="#c9b48a"/><g stroke="#a88c5a">${[110, 120].map(y => `<path d="M0 ${y} H200"/>`).join('')}</g>
    <rect x="36" y="88" width="128" height="16" fill="#3b7a4a"/><rect x="36" y="88" width="128" height="4" fill="#e6c46a"/>
    <path d="M40 10 h120 v74 h-120z" fill="#e6d3a0"/>
    <g stroke="#a88c5a" stroke-width="1">${Array.from({ length: 24 }, (_, i) => `<path d="M40 ${13 + i * 3} h120"/>`).join('')}</g>
    <path d="M36 8 h128 v8 h-128z" fill="#3b2a1a"/>
    <path d="M86 84 q14 -40 28 0z" fill="#2b2b38" opacity=".55"/><circle cx="100" cy="46" r="8" fill="#2b2b38" opacity=".55"/><path d="M96 38 h8 l-1 -8 h-6z" fill="#2b2b38" opacity=".55"/>
    <g stroke="#b8322a" stroke-width="2.5">${[64, 136].map(x => `<path d="M${x} 16 v66"/>`).join('')}</g>
    <g fill="#e6c46a">${[64, 136].map(x => `<circle cx="${x}" cy="84" r="4"/><path d="M${x - 3} 86 l-2 14 h10 l-2 -14z"/>`).join('')}</g>
    ${[[18, 70, -30], [182, 70, 30]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x} ${y + 20} L${x - 16} ${y - 10} A30 30 0 0 1 ${x + 16} ${y - 10}Z" fill="#fbf6e6" stroke="#8a6a3a"/><path d="M${x} ${y + 20} L${x - 8} ${y - 14} M${x} ${y + 20} L${x} ${y - 16} M${x} ${y + 20} L${x + 8} ${y - 14}" stroke="#c9a46a"/><circle cx="${x}" cy="${y - 4}" r="5" fill="#d9472b"/></g>`).join('')}`,

  // 庭園: 池と朱の太鼓橋、松と石
  teien: () => `
    <defs>${skyGradient('teien-sky', '#d6ead6', '#f6f1e2')}</defs>
    <rect width="${W}" height="${H}" fill="url(#teien-sky)"/>
    <path d="M0 60 Q60 50 100 58 T200 56 V130 H0Z" fill="#8fbf7a"/>
    <ellipse cx="96" cy="96" rx="80" ry="24" fill="#7fb3d5"/>
    <path d="M30 96 q20 -4 40 0 M120 104 q20 -4 40 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>
    <path d="M56 96 Q96 50 136 96" stroke="#c0392b" stroke-width="6" fill="none"/>
    <path d="M56 96 Q96 56 136 96" stroke="#e8735a" stroke-width="1.5" fill="none"/>
    <g stroke="#c0392b" stroke-width="2.5">${[70, 84, 96, 108, 122].map(x => { const y = 96 - 46 * (1 - Math.pow((x - 96) / 40, 2)) * 0.82; return `<path d="M${x} ${y.toFixed(1)} v-8"/>`; }).join('')}</g>
    <path d="M66 80 Q96 44 126 80" stroke="#c0392b" stroke-width="2" fill="none"/>
    <g><path d="M158 72 C150 56 160 40 172 36" stroke="#5a3a1a" stroke-width="5" fill="none"/>
      ${[[150, 40, 16], [172, 30, 14], [178, 50, 12], [140, 54, 10]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.45}" fill="#2f6b3f"/>`).join('')}</g>
    <g fill="#8a8a90">${[[20, 100, 10], [34, 108, 7], [176, 104, 9]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.6}"/>`).join('')}</g>
    <g fill="#e8603a">${[[80, 108], [112, 100]].map(([x, y]) => `<path d="M${x} ${y} q6 -4 10 0 q-4 4 -10 0z m10 0 l4 -3 v6z"/>`).join('')}</g>`,

  // 宴: 提灯の下に並ぶ酒器と膳、琵琶
  utage: () => `
    <defs><radialGradient id="utage-g" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#3a2a4a"/><stop offset="1" stop-color="#1a1222"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#utage-g)"/>
    <path d="M0 12 Q100 26 200 12" stroke="#5c3b22" stroke-width="1.5" fill="none"/>
    ${[30, 76, 124, 170].map((x, i) => { const y = 16 + (i === 1 || i === 2 ? 5 : 2); return `<path d="M${x} ${y} v4" stroke="#5c3b22"/><ellipse cx="${x}" cy="${y + 14}" rx="10" ry="12" fill="#e8603a"/><ellipse cx="${x}" cy="${y + 14}" rx="10" ry="12" fill="#ffd36b" opacity=".35"/><rect x="${x - 6}" y="${y + 1}" width="12" height="3" fill="#2b2014"/><rect x="${x - 6}" y="${y + 25}" width="12" height="3" fill="#2b2014"/>`; }).join('')}
    <rect y="92" width="${W}" height="38" fill="#7a4a2a"/>
    ${[[50, 94], [100, 96], [150, 94]].map(([x, y]) => `<rect x="${x - 22}" y="${y}" width="44" height="12" fill="#b8322a"/><rect x="${x - 18}" y="${y + 12}" width="6" height="10" fill="#8e2418"/><rect x="${x + 12}" y="${y + 12}" width="6" height="10" fill="#8e2418"/>`).join('')}
    <path d="M44 94 q6 -16 12 0z" fill="#fbf6e6"/><path d="M48 80 h4 v-4 h-4z" fill="#fbf6e6"/>
    <ellipse cx="96" cy="92" rx="10" ry="3" fill="#e6c46a"/><ellipse cx="108" cy="90" rx="7" ry="2.5" fill="#e6c46a"/>
    <g fill="#e8a04a">${[[140, 90], [150, 88], [160, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>
    <g transform="rotate(-35 168 64)"><ellipse cx="168" cy="72" rx="13" ry="18" fill="#a0602a" stroke="#5c3b22"/><rect x="165" y="34" width="6" height="26" fill="#5c3b22"/><circle cx="168" cy="74" r="3" fill="#2b2014"/><g stroke="#f3e6c8" stroke-width=".6">${[-3, -1, 1, 3].map(d => `<path d="M${168 + d} 40 V88"/>`).join('')}</g></g>
    <g fill="#ffd36b">${[[20, 70], [186, 40], [120, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`,

  // 市: 屋台に並ぶ品物と人の行き交う通り
  ichi: () => `
    <defs>${skyGradient('ichi-sky', '#bfdbe8', '#f5ecd6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ichi-sky)"/>
    <rect y="96" width="${W}" height="34" fill="#d8c39a"/>
    ${[[10, '#2c3e66'], [72, '#b8322a'], [134, '#3d7a4a']].map(([x, c]) => `
      <rect x="${x + 4}" y="40" width="4" height="58" fill="#6b4a2b"/><rect x="${x + 50}" y="40" width="4" height="58" fill="#6b4a2b"/>
      <path d="M${x} 40 h58 l-4 14 h-50z" fill="${c}"/>
      <g fill="#fff" opacity=".85">${[0, 1, 2, 3].map(i => `<rect x="${x + 6 + i * 13}" y="42" width="6" height="10"/>`).join('')}</g>
      <rect x="${x + 2}" y="76" width="54" height="8" fill="#8a6a3a"/>`).join('')}
    <g fill="#5c8fc0">${[0, 1, 2].map(i => `<path d="M${18 + i * 14} 76 q6 -6 12 0 q-6 4 -12 0z m12 0 l3 -3 v6z"/>`).join('')}</g>
    <g>${[0, 1, 2, 3].map(i => `<circle cx="${82 + i * 11}" cy="71" r="5" fill="${['#e8603a', '#e6c46a', '#8ab86a', '#e8603a'][i]}"/>`).join('')}</g>
    <g>${[0, 1, 2].map(i => `<ellipse cx="${146 + i * 15}" cy="70" rx="6" ry="7" fill="#c9b48a" stroke="#8a6a3a"/><path d="M${142 + i * 15} 66 h8" stroke="#8a6a3a"/>`).join('')}</g>
    <g><circle cx="44" cy="102" r="5" fill="#f3d7b6"/><path d="M36 128 l4 -20 h8 l4 20z" fill="#7a4a8a"/></g>
    <g><circle cx="150" cy="104" r="5" fill="#f3d7b6"/><path d="M142 128 l4 -18 h8 l4 18z" fill="#3d6a8a"/><path d="M158 110 l10 -4" stroke="#6b4a2b" stroke-width="2"/></g>
    <path d="M100 18 v22" stroke="#6b4a2b" stroke-width="2"/><path d="M100 18 h18 v14 h-18z" fill="#fbf6e6" stroke="#b8322a"/><text x="109" y="29" text-anchor="middle" font-family="serif" font-size="9" font-weight="700" fill="#b8322a">市</text>`,

  // 陰陽寮: 星空に浮かぶ五芒星と式神の札
  onmyo: () => `
    <defs><radialGradient id="onmyo-g" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#2a3a6a"/><stop offset="1" stop-color="#0f1530"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#onmyo-g)"/>
    <g fill="#fff">${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 67) % 200}" cy="${(i * 41) % 130}" r="${i % 4 === 0 ? 1.4 : 0.7}" opacity="${0.4 + (i % 3) * 0.2}"/>`).join('')}</g>
    <circle cx="100" cy="64" r="44" fill="none" stroke="#e6c46a" stroke-width="2.5"/>
    <circle cx="100" cy="64" r="38" fill="none" stroke="#e6c46a" stroke-width="1" stroke-dasharray="2 4"/>
    <path d="${[0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; return `${i ? 'L' : 'M'}${(100 + 36 * Math.cos(a)).toFixed(1)} ${(64 + 36 * Math.sin(a)).toFixed(1)}`; }).join(' ')}Z" fill="none" stroke="#ffe39a" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="64" r="9" fill="#fff"/><path d="M100 55 a4.5 4.5 0 0 1 0 9 a4.5 4.5 0 0 0 0 9 a9 9 0 0 1 0 -18z" fill="#1a1a2a"/>
    ${[[28, 30, -15], [172, 34, 12], [36, 104, 10], [166, 100, -12]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 7}" y="${y - 14}" width="14" height="28" fill="#fbf6e6"/><path d="M${x} ${y - 10} v20 M${x - 4} ${y - 4} h8 M${x - 4} ${y + 2} h8" stroke="#b8322a" stroke-width="1.5"/></g>`).join('')}`,

  // 朝議: 朱の柱の間に並ぶ公卿たちと、広げられた巻物
  chougi: () => `
    ${washi('#f2e6c8', 'chougi')}
    <rect y="0" width="${W}" height="16" fill="#3b2a1a"/><path d="M0 16 H200" stroke="#e6c46a" stroke-width="2"/>
    <g fill="#b8322a">${[14, 186].map(x => `<rect x="${x - 6}" y="16" width="12" height="114"/>`).join('')}</g>
    <rect x="20" y="100" width="160" height="30" fill="#3b7a4a"/><rect x="20" y="100" width="160" height="4" fill="#e6c46a"/>
    ${[40, 70, 100, 130, 160].map((x, i) => `
      <path d="M${x - 14} 100 Q${x} 70 ${x + 14} 100z" fill="${['#4a2f66', '#2c3e66', '#8e2418', '#2c3e66', '#4a2f66'][i]}"/>
      <circle cx="${x}" cy="66" r="7" fill="#f3d7b6"/>
      <path d="M${x - 7} 62 h14 v-6 h-14z" fill="#1d1d1d"/><path d="M${x} 56 v-10" stroke="#1d1d1d" stroke-width="3"/>
      <path d="M${x - 2} 92 l-6 -14" stroke="#e6d6b0" stroke-width="3"/>`).join('')}
    <rect x="50" y="108" width="100" height="16" fill="#fbf6e6" stroke="#c9b48a"/>
    <rect x="44" y="106" width="8" height="20" rx="3" fill="#7a2e2e"/><rect x="148" y="106" width="8" height="20" rx="3" fill="#7a2e2e"/>
    <g stroke="#2b2620" stroke-width="1">${Array.from({ length: 10 }, (_, i) => `<path d="M${58 + i * 9} 111 v10"/>`).join('')}</g>`,

  // 金山: 坑道の入口、松明、金の鉱石とつるはし
  kanayama: () => `
    <defs>${skyGradient('kanayama-sky', '#e8b878', '#f6e4c0')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kanayama-sky)"/>
    <path d="M0 110 L50 30 L90 60 L130 14 L200 100 V130 H0Z" fill="#7a5a3a"/>
    <path d="M30 70 L50 30 L70 46 L60 70z M110 40 L130 14 L150 34 L140 60z" fill="#5c4030"/>
    <path d="M70 130 V92 Q100 60 130 92 V130Z" fill="#1d140c"/>
    <path d="M66 130 V90 Q100 54 134 90 V130" stroke="#8a6a3a" stroke-width="6" fill="none"/>
    <path d="M100 58 V130" stroke="#8a6a3a" stroke-width="4" opacity=".5"/>
    <g><rect x="146" y="84" width="4" height="30" fill="#5c3b22"/><path d="M148 84 C140 74 146 66 148 60 C150 66 158 74 148 84Z" fill="#f2a33a"/></g>
    <g fill="#f2c94c" stroke="#a87412">${[[88, 118, 8], [104, 112, 6], [118, 120, 7], [30, 118, 6]].map(([x, y, r]) => `<path d="M${x - r} ${y} l${r * 0.6} -${r} l${r} ${r * 0.3} l${r * 0.5} ${r * 0.8} l-${r * 0.8} ${r * 0.5}z"/>`).join('')}</g>
    <g transform="rotate(-25 40 96)"><rect x="38" y="80" width="4" height="40" fill="#6b4a2b"/><path d="M22 82 Q40 72 58 82 l-2 3 Q40 77 24 85z" fill="#5d6772"/></g>
    <g fill="#fff6c8">${[[96, 104], [124, 110]].map(([x, y]) => `<path d="M${x} ${y} l1.5 -4 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5z"/>`).join('')}</g>`,

  // 呪術師: 紫の煙の中、蝋燭を灯して呪符を掲げる影
  jujutsu: () => `
    <defs><radialGradient id="jujutsu-g" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#6a3a8a"/><stop offset="1" stop-color="#1a0f24"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#jujutsu-g)"/>
    <path d="M10 120 C30 90 10 70 40 56 C60 46 50 20 80 14" stroke="#b28ad0" stroke-width="5" fill="none" opacity=".35"/>
    <path d="M190 116 C170 92 196 70 166 54 C146 44 160 22 130 12" stroke="#b28ad0" stroke-width="5" fill="none" opacity=".35"/>
    <path d="M62 130 L80 70 Q100 58 120 70 L138 130Z" fill="#120a18"/>
    <path d="M84 70 Q100 30 116 70z" fill="#120a18"/>
    <circle cx="94" cy="62" r="2" fill="#ff5a5a"/><circle cx="106" cy="62" r="2" fill="#ff5a5a"/>
    <g transform="rotate(-10 100 30)"><rect x="90" y="8" width="20" height="40" fill="#fbf6e6"/><path d="M100 12 v30 M94 20 h12 M94 28 h12 M96 36 l8 4" stroke="#b8322a" stroke-width="2"/></g>
    <path d="M114 44 L120 66" stroke="#120a18" stroke-width="5"/>
    ${[40, 160].map(x => `<rect x="${x - 3}" y="98" width="6" height="22" fill="#e8e0cc"/><path d="M${x} 98 C${x - 5} 90 ${x - 1} 84 ${x} 80 C${x + 1} 84 ${x + 5} 90 ${x} 98Z" fill="#a7e0ff"/>`).join('')}
    <g fill="#e6c46a" opacity=".8">${[[30, 40], [170, 36], [56, 96], [146, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>`,

  // 書庫: 巻物と冊子が詰まった棚と梯子
  shoko: () => `
    ${washi('#5c3b22', 'shoko')}
    ${[14, 46, 78, 110].map(y => `<rect x="8" y="${y + 26}" width="184" height="5" fill="#3b2414"/>`).join('')}
    ${[14, 46, 78].map((y, r) => Array.from({ length: 11 }, (_, i) => {
      const x = 12 + i * 16 + (r % 2) * 4;
      if ((i + r) % 4 === 0) return `<rect x="${x}" y="${y + 6}" width="12" height="20" fill="${['#2c3e66', '#8e2418', '#3d6a4a'][r]}"/><rect x="${x}" y="${y + 10}" width="12" height="2" fill="#e6c46a"/>`;
      return `<ellipse cx="${x + 6}" cy="${y + 20}" rx="6" ry="6" fill="#f3e6c8" stroke="#a07a4f"/><circle cx="${x + 6}" cy="${y + 20}" r="2" fill="${['#b8322a', '#2c3e66', '#e6c46a'][i % 3]}"/>`;
    }).join('')).join('')}
    <g stroke="#a07a4f" stroke-width="4"><path d="M136 130 L160 4"/><path d="M168 130 L190 4"/></g>
    <g stroke="#a07a4f" stroke-width="3">${[20, 44, 68, 92, 116].map(y => `<path d="M${160 - (y - 4) * 0.19 - 22} ${y} h30"/>`).join('')}</g>`,

  // 摂政: 笏を持つ束帯姿と、背後の御簾
  sessho: () => `
    <defs><linearGradient id="sessho-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c8a0"/><stop offset="1" stop-color="#f6ecd8"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sessho-g)"/>
    <path d="M20 8 h160 v60 h-160z" fill="#e6d3a0"/><g stroke="#a88c5a" stroke-width="1">${Array.from({ length: 19 }, (_, i) => `<path d="M20 ${11 + i * 3} h160"/>`).join('')}</g>
    <rect x="16" y="6" width="168" height="6" fill="#3b2a1a"/>
    <rect y="104" width="${W}" height="26" fill="#3b7a4a"/><rect y="104" width="${W}" height="4" fill="#e6c46a"/>
    <path d="M56 112 Q100 46 144 112Z" fill="#1d1d1d"/>
    <path d="M100 66 L82 112 M100 66 L118 112" stroke="#3b3b44" stroke-width="2"/>
    <circle cx="100" cy="54" r="11" fill="#f3d7b6"/>
    <path d="M90 50 h20 v-6 h-20z" fill="#1d1d1d"/><path d="M100 44 v-12" stroke="#1d1d1d" stroke-width="4"/>
    <path d="M100 78 l-4 -18 h8z" fill="#e6d6b0"/>
    <path d="M60 112 h80" stroke="#8e2418" stroke-width="3"/>`,

  // 国司: 赴任する国司と、運ばれる銀の箱・国印
  kokushi: () => `
    <defs>${skyGradient('kokushi-sky', '#bcd6e8', '#f4ecd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kokushi-sky)"/>
    <path d="M0 74 Q60 54 120 70 T200 64 V130 H0Z" fill="#9cc58a"/>
    <path d="M30 130 Q80 96 140 92 T200 86" stroke="#e4cf9c" stroke-width="12" fill="none"/>
    <circle cx="90" cy="70" r="8" fill="#f3d7b6"/><path d="M82 66 h16 v-5 h-16z" fill="#1d1d1d"/>
    <path d="M78 104 L84 78 h12 l6 26z" fill="#8e2418"/>
    <path d="M120 96 h34 v-18 h-34z" fill="#6b3a1a" stroke="#3b2014"/><path d="M114 98 h46" stroke="#5c3b22" stroke-width="3"/>
    <g fill="#cfd5db">${[124, 134, 144].map(x => `<ellipse cx="${x}" cy="76" rx="5" ry="3" stroke="#7d8894"/>`).join('')}</g>
    <rect x="40" y="70" width="18" height="18" fill="#fbf6e6" stroke="#b8322a" stroke-width="2"/><path d="M44 75 h10 M49 73 v12 M44 81 h10" stroke="#b8322a" stroke-width="1.5"/>
    <path d="M150 20 v40" stroke="#5c3b22" stroke-width="2"/><path d="M150 22 h16 v30 h-16z" fill="#fbf6e6"/><circle cx="158" cy="37" r="5" fill="#b8322a"/>`,

  // 節会: 舞楽の舞人と、朱の高欄（一度きりの宴）
  sechie: () => `
    <defs><radialGradient id="sechie-g" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#f6b8a0"/><stop offset="1" stop-color="#b8322a"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sechie-g)"/>
    <rect y="96" width="${W}" height="34" fill="#3b7a4a"/>
    <path d="M0 96 H200" stroke="#e6c46a" stroke-width="4"/>
    <g stroke="#8e2418" stroke-width="5">${[10, 50, 150, 190].map(x => `<path d="M${x} 96 v-22"/>`).join('')}<path d="M0 76 H60 M140 76 H200"/></g>
    <path d="M100 30 l-14 -12 h28z" fill="#e6c46a"/>
    <ellipse cx="100" cy="40" rx="11" ry="12" fill="#c0392b"/><path d="M94 38 h4 M102 38 h4" stroke="#1d1d1d" stroke-width="2"/><path d="M95 46 q5 3 10 0" stroke="#1d1d1d" stroke-width="1.5" fill="none"/>
    <path d="M100 52 L70 72 L84 76 L76 100 h48 l-8 -24 l14 -4z" fill="#2c3e66"/>
    <path d="M70 72 L44 60 M130 72 L156 56" stroke="#e6c46a" stroke-width="3"/>
    <path d="M156 56 l10 -10" stroke="#e6c46a" stroke-width="5"/>
    <g fill="#ffe39a">${[[30, 30], [170, 30], [60, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,

  // 密偵: 屏風の陰からのぞく目
  mittei: () => `
    ${washi('#2a2420', 'mittei')}
    ${[0, 1, 2, 3].map(i => `<path d="M${10 + i * 44} 10 h44 v110 h-44z" fill="${i % 2 ? '#d8b878' : '#e6c88a'}" stroke="#5c3b22" stroke-width="2"/>`).join('')}
    <path d="M14 70 q30 -30 60 -10 t60 -10 t60 10" stroke="#3d6a3a" stroke-width="6" fill="none" opacity=".7"/>
    <circle cx="40" cy="36" r="12" fill="#e8b878" opacity=".8"/>
    <path d="M140 10 h44 v110 h-44z" fill="#1d1d1d" opacity=".55"/>
    <path d="M150 60 q12 -10 24 0 q-12 10 -24 0z" fill="#f6eedc"/><circle cx="162" cy="60" r="4" fill="#1d1d1d"/>
    <path d="M146 54 q16 -8 32 0" stroke="#1d1d1d" stroke-width="3" fill="none"/>`,

  // 盗賊: 月夜に千両…ではなく唐櫃を担いで逃げる影
  tozoku: () => `
    <defs>${skyGradient('tozoku-sky', '#141a30', '#3a4a6a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#tozoku-sky)"/>
    <circle cx="160" cy="30" r="16" fill="#f6eec8"/>
    <path d="M0 110 H200 V130 H0Z" fill="#1d1d14"/>
    <path d="M20 110 V60 h50 v50" fill="#2b2b38"/><path d="M14 62 L45 44 L76 62Z" fill="#1d1d26"/>
    <circle cx="112" cy="58" r="7" fill="#0a0a10"/>
    <path d="M112 66 L106 88 L94 110 M106 88 L122 108" stroke="#0a0a10" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M110 68 L126 84" stroke="#0a0a10" stroke-width="5" stroke-linecap="round"/>
    <rect x="118" y="60" width="36" height="22" fill="#5c3b22" stroke="#e6c46a" stroke-width="1.5" transform="rotate(-12 136 71)"/>
    <g fill="#e6c46a">${[[150, 92], [158, 100]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3"/>`).join('')}</g>`,

  // 遣唐使: 宝を積んで帰る遣唐使船
  kentoushi: () => `
    <defs>${skyGradient('kentoushi-sky', '#f2c08a', '#f6eedc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kentoushi-sky)"/>
    <circle cx="40" cy="30" r="14" fill="#d9472b" opacity=".85"/>
    <path d="M0 96 q25 -10 50 0 t50 0 t50 0 t50 0 V130 H0Z" fill="#2f5a99"/>
    <path d="M40 90 Q100 104 160 90 L150 104 Q100 114 50 104Z" fill="#b8322a"/>
    <path d="M70 92 V30 M128 92 V40" stroke="#3b2a1a" stroke-width="3"/>
    <path d="M52 32 h36 v44 h-36z" fill="#e6d3a0" stroke="#8a6a3a"/><g stroke="#8a6a3a">${[44, 56, 68].map(y => `<path d="M52 ${y} h36"/>`).join('')}</g>
    <path d="M112 42 h32 v40 h-32z" fill="#e6d3a0" stroke="#8a6a3a"/><g stroke="#8a6a3a">${[54, 66].map(y => `<path d="M112 ${y} h32"/>`).join('')}</g>
    <path d="M86 92 h28 v-10 h-28z" fill="#2b2014" stroke="#e6c46a"/>
    <g fill="#e6c46a">${[[92, 80], [100, 78], [108, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,
};
