// 鎌倉のイラスト（藍と海。武士の世と、海の向こうとの行き来）
import { H, skyGradient, W, washi } from './common.js';

// 北斎風の波
function waves(y, color = '#2f5a99', foam = '#e8f1ff') {
  let d = `M0 ${y}`;
  for (let x = 0; x <= W; x += 25) d += ` q12 -14 25 0`;
  return `<path d="${d} V130 H0Z" fill="${color}"/><path d="${d}" stroke="${foam}" stroke-width="2" fill="none"/>`;
}

export const KAMAKURA_ART = {
  // 物見櫓: 海辺の櫓と烽火
  monomi: () => `
    <defs>${skyGradient('monomi-sky', '#1f3360', '#e8a06a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#monomi-sky)"/>
    ${waves(100, '#1f3d6e')}
    <path d="M110 130 L130 70 L170 70 L190 130Z" fill="#5c4030"/>
    <g stroke="#3b2a1a" stroke-width="4"><path d="M134 72 L120 20 M166 72 L178 20"/></g>
    <g stroke="#3b2a1a" stroke-width="2"><path d="M128 50 L172 50 M124 36 L176 36 M130 70 L176 36 M170 70 L124 36"/></g>
    <path d="M114 20 h68 v8 h-68z" fill="#6b4a2b"/><path d="M110 20 L148 6 L186 20Z" fill="#3b2a1a"/>
    <path d="M148 18 C138 8 146 -4 150 -10 C152 0 160 6 152 18Z" fill="#f2a33a"/>
    <path d="M148 4 C140 -6 154 -14 146 -24" stroke="#ccc" stroke-width="4" fill="none" opacity=".5"/>
    <g fill="#ffe39a">${[[30, 20], [60, 34], [86, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3"/>`).join('')}</g>
    <path d="M20 96 l14 -6 l14 6z" fill="#2b2b38"/><path d="M34 90 v-14" stroke="#2b2b38" stroke-width="2"/>`,

  // 守護: 鎧兜が守る、家紋入りの文箱
  shugo: () => `
    ${washi('#dfe6ee', 'shugo')}
    <rect y="96" width="${W}" height="34" fill="#a07a4f"/>
    <rect x="96" y="70" width="80" height="34" rx="4" fill="#1d1d26"/>
    <rect x="96" y="66" width="80" height="10" rx="3" fill="#2b2b38"/>
    <circle cx="136" cy="88" r="9" fill="none" stroke="#e6c46a" stroke-width="2"/><path d="M136 80 l7 12 h-14z" fill="#e6c46a"/>
    <path d="M96 76 h80" stroke="#e6c46a" stroke-width="1"/>
    <rect x="30" y="80" width="40" height="24" fill="#6b4a2b"/>
    <path d="M22 70 Q50 40 78 70 Z" fill="#2c3e66"/>
    <path d="M18 72 Q50 64 82 72 L76 82 Q50 74 24 82Z" fill="#1f2d4a"/>
    <path d="M40 46 L30 22 M60 46 L70 22" stroke="#e6c46a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="52" r="4" fill="#e6c46a"/>
    <g stroke="#b8322a" stroke-width="2">${[0, 1, 2].map(i => `<path d="M${26 + i * 4} ${84 + i * 6} h${48 - i * 8}"/>`).join('')}</g>
    <path d="M184 12 L184 100" stroke="#5c3b22" stroke-width="3"/><path d="M178 12 l6 -10 l6 10z" fill="#9aa4ae"/>`,

  // 漁師町: 浜に並ぶ小屋、網を干す竿、沖の小舟
  ryoshi: () => `
    <defs>${skyGradient('ryoshi-sky', '#9fc4dd', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ryoshi-sky)"/>
    ${waves(64, '#3c6aa0')}
    <path d="M0 96 Q100 84 200 98 V130 H0Z" fill="#e4d2a6"/>
    ${[[20, 74], [52, 70]].map(([x, y]) => `<path d="M${x} ${y + 22} v-14 l14 -10 l14 10 v14z" fill="#8a6a3a"/><path d="M${x - 2} ${y + 8} l16 -12 l16 12" stroke="#5c4030" stroke-width="3" fill="none"/>`).join('')}
    <g stroke="#6b4a2b" stroke-width="2"><path d="M110 104 V74 M160 104 V74 M110 76 H160"/></g>
    <path d="M112 76 Q135 100 158 76" fill="none" stroke="#3b2a1a" stroke-width="1"/>
    <g stroke="#3b2a1a" stroke-width=".6">${Array.from({ length: 8 }, (_, i) => `<path d="M${114 + i * 6} 77 v${14 - Math.abs(i - 3.5) * 2.5}"/>`).join('')}</g>
    <path d="M140 58 h30 l-5 6 h-20z" fill="#5c3b22"/><path d="M155 58 v-16" stroke="#3b2a1a" stroke-width="1.5"/><path d="M155 44 l10 10 h-10z" fill="#f2ead6"/>
    <path d="M60 116 q10 -6 20 0 q-10 6 -20 0z m20 0 l6 -4 v8z" fill="#7a8ca0"/>`,

  // 引付: 訴えの書状が積まれた文机と、裁きの印
  hikitsuke: () => `
    ${washi('#e6e0d0', 'hikitsuke')}
    <rect y="92" width="${W}" height="38" fill="#7a5a3a"/>
    <rect x="20" y="78" width="160" height="16" fill="#3b2a1a"/>
    ${[[40, 58], [44, 48], [38, 38]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="56" height="10" fill="#fbf6e6" stroke="#c9b48a" transform="rotate(${(i - 1) * 4} ${x + 28} ${y + 5})"/><path d="M${x + 4} ${y + 5} h48" stroke="#2b2620" stroke-width=".8" transform="rotate(${(i - 1) * 4} ${x + 28} ${y + 5})"/>`).join('')}
    <path d="M40 68 h56 v10 h-56z" fill="#fbf6e6" stroke="#c9b48a"/>
    <g transform="rotate(-12 140 52)"><rect x="112" y="30" width="56" height="44" fill="#fbf6e6" stroke="#c9b48a"/><g stroke="#2b2620" stroke-width="1">${Array.from({ length: 6 }, (_, i) => `<path d="M${160 - i * 8} 36 v30"/>`).join('')}</g><rect x="146" y="58" width="12" height="12" fill="none" stroke="#b8322a" stroke-width="2"/><path d="M149 62 h6 M152 61 v8" stroke="#b8322a" stroke-width="1.5"/></g>
    <path d="M30 20 h140" stroke="#2c3e66" stroke-width="6"/><g fill="#2c3e66">${[40, 70, 100, 130, 160].map(x => `<rect x="${x - 3}" y="20" width="6" height="12"/>`).join('')}</g>`,

  // 見張り: 岩の上から海を見張る人影と、三枚の札
  mihari: () => `
    <defs>${skyGradient('mihari-sky', '#6a8fc0', '#e8eef2')}</defs>
    <rect width="${W}" height="${H}" fill="url(#mihari-sky)"/>
    ${waves(84, '#2f5a99')}
    <path d="M0 130 L0 70 L40 56 L70 74 L90 130Z" fill="#4a4a52"/><path d="M10 72 L40 58 L60 70" stroke="#6a6a74" stroke-width="3" fill="none"/>
    <circle cx="40" cy="36" r="6" fill="#f3d7b6"/><path d="M34 34 h12 v-4 h-12z" fill="#1d1d1d"/>
    <path d="M32 56 L36 42 h8 l4 14z" fill="#2c3e66"/><path d="M44 44 L52 36" stroke="#2c3e66" stroke-width="4" stroke-linecap="round"/><path d="M46 34 h8" stroke="#f3d7b6" stroke-width="3"/>
    ${[[110, 30, -12], [140, 24, 0], [170, 30, 12]].map(([x, y, r], i) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 12}" y="${y - 16}" width="24" height="32" rx="3" fill="#fbf6e6" stroke="#8a6a3a"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-family="serif" font-weight="700" font-size="14" fill="${['#b8322a', '#2c3e66', '#3d7a4a'][i]}">${['廃', '捨', '戻'][i]}</text></g>`).join('')}`,

  // 御家人: 鍬形の兜と、交差した弓と太刀
  gokenin: () => `
    <defs><radialGradient id="gokenin-g" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#3c5a99"/><stop offset="1" stop-color="#14203d"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#gokenin-g)"/>
    <path d="M30 120 Q100 -10 170 120" stroke="#6b4a2b" stroke-width="4" fill="none"/><path d="M30 120 L170 120" stroke="#e8e0cc" stroke-width="1"/>
    <path d="M40 20 L160 118" stroke="#cfd5db" stroke-width="4"/><path d="M34 14 l10 2 l-2 10z" fill="#1d1d1d"/><path d="M150 110 l14 12" stroke="#6b3a1a" stroke-width="6"/>
    <path d="M60 96 Q100 30 140 96 Z" fill="#1d1d26"/>
    <path d="M52 98 Q100 86 148 98 L140 112 Q100 100 60 112Z" fill="#2b2b38"/>
    <g stroke="#b8322a" stroke-width="2">${[0, 1, 2].map(i => `<path d="M${58 + i * 3} ${102 + i * 4} Q100 ${92 + i * 4} ${142 - i * 3} ${102 + i * 4}" fill="none"/>`).join('')}</g>
    <path d="M86 60 L70 24 M114 60 L130 24" stroke="#e6c46a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="66" r="6" fill="#e6c46a"/><path d="M100 46 v14" stroke="#e6c46a" stroke-width="2"/>`,

  // 悪党: 頬かむりの男と、くすねた銭袋
  akutou: () => `
    ${washi('#2a2420', 'akutou')}
    <circle cx="150" cy="30" r="16" fill="#f2e6c0"/><circle cx="144" cy="26" r="16" fill="#2a2420"/>
    <path d="M60 130 L72 78 Q96 64 120 78 L132 130Z" fill="#4a3a2a"/>
    <circle cx="96" cy="56" r="20" fill="#f3d7b6"/>
    <path d="M74 52 Q96 26 118 52 L118 46 Q96 30 74 46Z" fill="#6a7a5a"/>
    <path d="M74 50 Q96 34 118 50 L120 58 Q96 44 72 58Z" fill="#7a8a6a"/>
    <g fill="#e8e0cc">${[[80, 46], [92, 40], [106, 42], [114, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>
    <path d="M114 58 l16 6" stroke="#6a7a5a" stroke-width="4"/>
    <path d="M86 58 q4 -3 8 0 M100 58 q4 -3 8 0" stroke="#2b2014" stroke-width="2" fill="none"/>
    <path d="M90 68 q6 3 12 0" stroke="#2b2014" stroke-width="1.5" fill="none"/>
    <path d="M128 92 q12 -8 22 4 q8 16 -8 22 q-18 2 -18 -14z" fill="#8a6a3a"/><path d="M134 92 q6 -6 12 0" stroke="#5c3b22" stroke-width="2" fill="none"/>
    ${[[140, 120], [152, 116]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#b8682f" stroke="#6e3a17"/><rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" fill="#2a2420"/>`).join('')}`,

  // 宋銭船: 赤い帆の唐船と、海に光る銭
  sousen: () => `
    <defs>${skyGradient('sousen-sky', '#f2c08a', '#f6eedc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#sousen-sky)"/>
    <circle cx="40" cy="34" r="14" fill="#e8603a" opacity=".8"/>
    ${waves(92, '#2f5a99')}
    <path d="M44 88 L156 88 L144 106 L58 106Z" fill="#5c3b22"/><path d="M40 88 L50 78 L60 88z M140 88 L150 76 L160 88z" fill="#5c3b22"/>
    <path d="M96 88 V18 M128 88 V34" stroke="#3b2a1a" stroke-width="3"/>
    <path d="M70 22 L96 20 L96 78 L74 80 Q66 50 70 22Z" fill="#b8322a"/><g stroke="#8e2418" stroke-width="1.2">${[32, 44, 56, 68].map(y => `<path d="M${70} ${y} L96 ${y - 1}"/>`).join('')}</g>
    <path d="M108 36 L128 34 L128 80 L110 82 Q104 58 108 36Z" fill="#c9453a"/><g stroke="#8e2418" stroke-width="1.2">${[46, 58, 70].map(y => `<path d="M108 ${y} L128 ${y - 1}"/>`).join('')}</g>
    <g>${[[70, 116], [100, 120], [130, 114], [160, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#d0a04a" stroke="#8a6410"/><rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" fill="#2f5a99"/>`).join('')}</g>`,

  // 問丸: 港の蔵に積まれた俵と、着いた舟
  toimaru: () => `
    <defs>${skyGradient('toimaru-sky', '#a9c8de', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#toimaru-sky)"/>
    ${waves(98, '#3c6aa0')}
    <path d="M100 20 L190 20 L190 96 L100 96Z" fill="#f6f2e8" stroke="#8a8a90"/>
    <path d="M94 22 L145 6 L196 22Z" fill="#3b3b44"/>
    <rect x="128" y="50" width="34" height="46" fill="#2b2014"/>
    ${[[18, 80], [44, 80], [70, 80], [31, 64], [57, 64], [44, 48]].map(([x, y]) => `<ellipse cx="${x + 12}" cy="${y + 8}" rx="13" ry="9" fill="#d8c08a" stroke="#8a6a3a"/><path d="M${x + 4} ${y + 2} v12 M${x + 20} ${y + 2} v12" stroke="#8a6a3a" stroke-width="1.5"/>`).join('')}
    <path d="M20 112 h70 l-8 10 h-54z" fill="#5c3b22"/><path d="M50 112 V90" stroke="#3b2a1a" stroke-width="2"/>
    <ellipse cx="44" cy="106" rx="10" ry="6" fill="#d8c08a" stroke="#8a6a3a"/>`,

  // 元寇: 嵐の海、波にのまれる軍船と神風の渦
  genkou: () => `
    <defs>${skyGradient('genkou-sky', '#1a1a2e', '#4a5a7a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#genkou-sky)"/>
    <g fill="none" stroke="#cfe0f0" stroke-width="2.5" opacity=".7">
      <path d="M150 30 m-18 0 a18 18 0 1 0 18 -18 a12 12 0 1 0 -6 18 a6 6 0 1 0 6 -6"/>
      <path d="M20 20 q30 10 60 0 q30 -10 60 4" />
    </g>
    <path d="M150 30 L148 4 M160 26 L180 14" stroke="#ffe39a" stroke-width="2"/>
    <path d="M0 90 C30 60 60 50 80 70 C70 60 60 66 62 76 C64 84 76 84 80 78 C100 90 150 60 200 80 V130 H0Z" fill="#1f3d6e"/>
    <path d="M0 90 C30 60 60 50 80 70" stroke="#e8f1ff" stroke-width="3" fill="none"/>
    <g fill="#e8f1ff">${[[66, 58], [74, 54], [82, 60], [58, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5"/>`).join('')}</g>
    <g transform="rotate(18 120 86)"><path d="M90 86 h60 l-8 10 h-44z" fill="#2b2014"/><path d="M118 86 V60" stroke="#2b2014" stroke-width="2"/><path d="M118 62 h16 l-2 18 h-14z" fill="#6a4a3a"/></g>
    <g transform="rotate(-24 40 104)"><path d="M14 104 h50 l-6 8 h-38z" fill="#2b2014"/><path d="M38 104 V86" stroke="#2b2014" stroke-width="2"/></g>
    ${waves(112, '#2f5a99')}`,

  // 執権: 三つ鱗の紋を背にした、黒衣の権力者の座
  shikken: () => `
    <defs><linearGradient id="shikken-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3e66"/><stop offset="1" stop-color="#14203d"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#shikken-g)"/>
    <g fill="#e6c46a" opacity=".9"><path d="M100 10 L118 40 H82Z"/><path d="M80 44 L98 74 H62Z"/><path d="M120 44 L138 74 H102Z"/></g>
    <rect y="100" width="${W}" height="30" fill="#c9b48a"/><g stroke="#a88c5a">${[110, 120].map(y => `<path d="M0 ${y} H200"/>`).join('')}</g>
    <path d="M56 104 Q100 54 144 104Z" fill="#111"/>
    <circle cx="100" cy="66" r="9" fill="#f3d7b6"/><path d="M92 62 h16 v-8 h-16z" fill="#111"/>
    <path d="M100 76 L94 98" stroke="#e8e0cc" stroke-width="3"/>
    ${[30, 170].map(x => `<rect x="${x - 8}" y="78" width="16" height="22" fill="#b8322a"/><path d="M${x - 10} 78 h20" stroke="#e6c46a" stroke-width="3"/>`).join('')}
    <g fill="#fbf6e6">${[[24, 74], [176, 74]].map(([x, y]) => `<rect x="${x}" y="${y - 30}" width="8" height="26"/>`).join('')}</g>`,

  // 門前町: 寺の山門と、その前に並ぶ店と提灯
  monzen: () => `
    <defs>${skyGradient('monzen-sky', '#c7d6e6', '#f4ecd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#monzen-sky)"/>
    <path d="M60 30 Q100 12 140 30 L132 34 Q100 20 68 34Z" fill="#3b2a1a"/>
    <path d="M70 34 h60 v8 h-60z" fill="#8e2418"/>
    <path d="M56 46 Q100 30 144 46 L136 50 Q100 36 64 50Z" fill="#3b2a1a"/>
    <g fill="#b8322a">${[72, 92, 108, 128].map(x => `<rect x="${x - 3}" y="50" width="6" height="50"/>`).join('')}</g>
    <rect x="94" y="56" width="12" height="10" fill="#fbf6e6"/>
    <rect y="100" width="${W}" height="30" fill="#d8c39a"/><path d="M80 130 L92 100 h16 L120 130Z" fill="#e8dcbc"/>
    ${[[6, '#2c3e66'], [150, '#3d7a4a']].map(([x, c]) => `<rect x="${x}" y="70" width="44" height="30" fill="#e6d3a0" stroke="#8a6a3a"/><path d="M${x - 2} 70 h48 l-4 -10 h-40z" fill="#4a3a2a"/><rect x="${x + 6}" y="76" width="32" height="10" fill="${c}"/><circle cx="${x + 22}" cy="94" r="5" fill="#e8603a"/>`).join('')}
    <g>${[[30, 104], [170, 106], [100, 112]].map(([x, y], i) => `<circle cx="${x}" cy="${y - 6}" r="3.5" fill="#f3d7b6"/><path d="M${x - 4} ${y + 10} l2 -12 h4 l2 12z" fill="${['#7a4a8a', '#2c3e66', '#8e2418'][i]}"/>`).join('')}</g>`,
};
