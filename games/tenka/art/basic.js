// 基本カードのイラスト
import { H, skyGradient, W, washi } from './common.js';

export const BASIC_ART = {
  zeni: () => `
    <defs><radialGradient id="zeni-g" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e7a46a"/><stop offset=".7" stop-color="#b8682f"/><stop offset="1" stop-color="#8a4a1f"/></radialGradient></defs>
    ${washi('#f3e6c8', 'zeni')}
    <g stroke="#7a4a2a" stroke-width="2" fill="none"><path d="M18 112 Q60 96 70 70" /><path d="M182 112 Q140 96 130 70" /></g>
    ${[24, 34, 44, 156, 166, 176].map((x, i) => `<ellipse cx="${x}" cy="${108 - (i % 3) * 7}" rx="9" ry="4" fill="#a85d2c" stroke="#6e3a17" stroke-width="1"/>`).join('')}
    <circle cx="100" cy="62" r="46" fill="url(#zeni-g)" stroke="#6e3a17" stroke-width="3"/>
    <circle cx="100" cy="62" r="38" fill="none" stroke="#7a4219" stroke-width="1.5"/>
    <rect x="88" y="50" width="24" height="24" fill="#f3e6c8" stroke="#6e3a17" stroke-width="3"/>
    <g fill="#5c2e10" font-family="serif" font-weight="700" font-size="17" text-anchor="middle">
      <text x="100" y="40">天</text><text x="100" y="98">下</text><text x="129" y="68">通</text><text x="71" y="68">寶</text>
    </g>`,

  kuni: () => `
    <defs>${skyGradient('kuni-sky', '#f6b98a', '#fbe9d0')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kuni-sky)"/>
    <circle cx="140" cy="40" r="20" fill="#d9472b"/>
    <path d="M0 78 L40 40 L62 58 L96 22 L140 70 L170 50 L200 72 L200 130 L0 130Z" fill="#4f6d7a"/>
    <path d="M86 32 L96 22 L106 32 L100 30 L96 34 L92 30Z" fill="#fff"/>
    <path d="M0 92 L50 66 L90 84 L130 68 L200 90 L200 130 L0 130Z" fill="#6f9a5a"/>
    <path d="M0 104 C60 98 90 112 130 102 S180 98 200 104 L200 130 L0 130Z" fill="#8ab86a"/>
    <path d="M70 130 C80 112 110 106 120 96 C126 92 140 90 150 92" stroke="#7fb3d5" stroke-width="7" fill="none"/>
    <g stroke="#5c7f3f" stroke-width="1.2">${[110, 116, 122, 128].map(y => `<path d="M0 ${y} L60 ${y - 4}"/><path d="M150 ${y} L200 ${y - 2}"/>`).join('')}</g>
    <g fill="#c0392b"><path d="M168 86 v-14 h10 l-3 3 3 3 h-10"/></g>
    <rect x="166" y="72" width="2" height="16" fill="#3b2a1a"/>`,

  // 銀: 袱紗の上に並んだ丁銀（細長い銀の塊）
  gin: () => `
    <defs><linearGradient id="gin-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#b9c2cc"/><stop offset="1" stop-color="#7d8894"/></linearGradient></defs>
    ${washi('#efe6d2', 'gin')}
    <path d="M20 118 L40 38 L172 30 L186 112Z" fill="#6b3f7a"/>
    <path d="M20 118 L40 38 L172 30 L186 112Z" fill="none" stroke="#e6c46a" stroke-width="2" stroke-dasharray="1 5"/>
    ${[[60, 54, -6], [104, 70, 4], [70, 92, -2], [138, 52, 8]].map(([x, y, r]) => `
      <g transform="rotate(${r} ${x} ${y})">
        <ellipse cx="${x}" cy="${y + 3}" rx="30" ry="10" fill="#3e2a4a" opacity=".45"/>
        <ellipse cx="${x}" cy="${y}" rx="30" ry="10" fill="url(#gin-g)" stroke="#5d6772" stroke-width="1.2"/>
        <circle cx="${x}" cy="${y - 1}" r="5" fill="none" stroke="#5d6772" stroke-width="1"/>
        <text x="${x}" y="${y + 2}" text-anchor="middle" font-family="serif" font-size="7" font-weight="700" fill="#4a535c">銀</text>
      </g>`).join('')}
    <g fill="#fff">${[[150, 84], [46, 70], [120, 100]].map(([x, y]) => `<path d="M${x} ${y} l1.5 -5 l1.5 5 l5 1.5 l-5 1.5 l-1.5 5 l-1.5 -5 l-5 -1.5z"/>`).join('')}</g>`,

  // 金: 朱塗りの三方に積まれた小判
  kin: () => `
    <defs><radialGradient id="kin-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e9b93a"/><stop offset="1" stop-color="#a87412"/></radialGradient>
    <radialGradient id="kin-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>
    ${washi('#2b2340', 'kin')}
    <circle cx="100" cy="58" r="64" fill="url(#kin-glow)" opacity=".5"/>
    <path d="M44 100 h112 l-10 14 h-92z" fill="#b8322a"/><rect x="62" y="114" width="76" height="10" fill="#8e2418"/>
    <path d="M86 116 h28 v8 h-28z" fill="#5a1610"/>
    ${[[70, 84, -12], [100, 88, 0], [130, 84, 12], [84, 70, -6], [116, 70, 6], [100, 56, 0]].map(([x, y, r]) => `
      <g transform="rotate(${r} ${x} ${y})">
        <ellipse cx="${x}" cy="${y}" rx="15" ry="22" fill="url(#kin-g)" stroke="#8a5a0a" stroke-width="1.2" transform="rotate(90 ${x} ${y})"/>
        ${[-8, -3, 2, 7].map(d => `<path d="M${x - 14} ${y + d * 0.9} h28" stroke="#b07a14" stroke-width=".7"/>`).join('')}
      </g>`).join('')}
    <g fill="#fff6c8">${[[40, 30], [160, 26], [168, 70], [30, 74]].map(([x, y]) => `<path d="M${x} ${y} l2 -7 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2z"/>`).join('')}</g>`,

  // 田: 水を張った田んぼと苗、遠くの山
  ta: () => `
    <defs>${skyGradient('ta-sky', '#bfe0e8', '#f3f0dc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ta-sky)"/>
    <path d="M0 48 Q40 30 80 44 T160 38 T200 44 V60 H0Z" fill="#8fb3a0"/>
    <path d="M0 58 H200 V130 H0Z" fill="#9fc9cf"/>
    <path d="M0 58 L200 58" stroke="#6f9a5a" stroke-width="3"/>
    <path d="M0 90 L200 86" stroke="#7a6a4a" stroke-width="4"/>
    <path d="M60 58 L40 130" stroke="#7a6a4a" stroke-width="4"/><path d="M140 58 L162 130" stroke="#7a6a4a" stroke-width="4"/>
    <g stroke="#3f7a3a" stroke-width="1.6" stroke-linecap="round">
      ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, c) => {
        const y = 66 + r * 11;
        const x = 8 + c * 20 + (r % 2) * 8;
        const s = 3 + r * 0.8;
        return `<path d="M${x} ${y} l-${s / 2} -${s}"/><path d="M${x} ${y} l0 -${s * 1.2}"/><path d="M${x} ${y} l${s / 2} -${s}"/>`;
      }).join('')).join('')}
    </g>
    <circle cx="160" cy="24" r="10" fill="#fff" opacity=".8"/>
    <path d="M150 74 q4 -3 8 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/><path d="M30 100 q5 -3 10 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/>`,

  // 荘園: 築地塀に囲まれた屋敷と、周りの田畑
  shouen: () => `
    <defs>${skyGradient('shouen-sky', '#f5d7a8', '#f8efd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#shouen-sky)"/>
    <path d="M0 62 Q50 40 100 54 T200 50 V130 H0Z" fill="#a9c47e"/>
    <g stroke="#7a9a4a" stroke-width="1">${[78, 88, 98, 108, 118].map(y => `<path d="M0 ${y} L60 ${y - 6}"/><path d="M140 ${y - 6} L200 ${y}"/>`).join('')}</g>
    <path d="M44 66 h112 v34 h-112z" fill="#f2ead8" stroke="#8a6a3a" stroke-width="1.5"/>
    <path d="M40 66 h120" stroke="#5c4030" stroke-width="5"/>
    <g stroke="#c9b48a" stroke-width="1">${[74, 82, 90].map(y => `<path d="M44 ${y} h112"/>`).join('')}</g>
    <path d="M88 100 v-22 h24 v22" fill="#5c4030"/><path d="M82 78 h36 l-4 -6 h-28z" fill="#3b2a1a"/>
    <path d="M64 58 L100 36 L136 58Z" fill="#4a3a2a"/><path d="M70 58 h60 v8 h-60z" fill="#e6d6b0"/>
    <path d="M60 58 Q100 50 140 58" stroke="#2b2014" stroke-width="2" fill="none"/>
    <g><rect x="166" y="66" width="4" height="22" fill="#6b4a2b"/><circle cx="168" cy="58" r="13" fill="#4e7a3a"/></g>
    <g><rect x="24" y="70" width="4" height="18" fill="#6b4a2b"/><circle cx="26" cy="62" r="11" fill="#5e8a45"/></g>
    <path d="M92 130 Q98 112 100 100" stroke="#e4cf9c" stroke-width="8" fill="none"/>`,

  // 祟り: 闇に浮かぶ人魂と、割れた絵馬
  tatari: () => `
    <defs><radialGradient id="tatari-g" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#4a2a66"/><stop offset="1" stop-color="#140b20"/></radialGradient>
    <radialGradient id="tatari-fire" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#e8fbff"/><stop offset=".5" stop-color="#7fd3f0"/><stop offset="1" stop-color="#2a7fb8" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#tatari-g)"/>
    ${[[52, 50, 1], [146, 40, 0.8], [104, 30, 0.6]].map(([x, y, s]) => `
      <g transform="translate(${x} ${y}) scale(${s})">
        <path d="M0 18 C-14 18 -16 0 -6 -8 C-2 -14 -4 -22 4 -30 C2 -20 14 -14 12 0 C12 12 8 18 0 18Z" fill="url(#tatari-fire)"/>
        <circle cx="0" cy="8" r="7" fill="#e8fbff" opacity=".9"/>
      </g>`).join('')}
    <g transform="rotate(-8 100 96)">
      <path d="M70 82 L100 70 L130 82 V114 H70Z" fill="#c9a46a" stroke="#6b4a2b" stroke-width="2"/>
      <path d="M100 70 L96 86 L104 96 L98 114" stroke="#2a1a10" stroke-width="2.5" fill="none"/>
      <text x="85" y="102" text-anchor="middle" font-family="serif" font-size="14" font-weight="700" fill="#6a1a1a">呪</text>
      <circle cx="100" cy="78" r="2" fill="#3b2a1a"/><path d="M100 78 L100 62" stroke="#c0392b" stroke-width="1.5"/>
    </g>
    <g fill="#c0392b">${[[30, 104], [36, 110], [170, 100], [164, 108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>`,
};
