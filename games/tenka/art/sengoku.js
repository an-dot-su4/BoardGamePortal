// 戦国のイラスト（炎と墨。乱世と下剋上）
import { H, skyGradient, W, washi } from './common.js';

const smoke = (x, y, s = 1) => `<path d="M${x} ${y} C${x - 10 * s} ${y - 14 * s} ${x + 8 * s} ${y - 22 * s} ${x - 2 * s} ${y - 36 * s} C${x - 10 * s} ${y - 48 * s} ${x + 6 * s} ${y - 58 * s} ${x} ${y - 70 * s}" stroke="#6a6a70" stroke-width="${10 * s}" fill="none" opacity=".45" stroke-linecap="round"/>`;
const flame = (x, y, s = 1) => `<path d="M${x} ${y} C${x - 14 * s} ${y - 6 * s} ${x - 10 * s} ${y - 24 * s} ${x - 2 * s} ${y - 34 * s} C${x} ${y - 24 * s} ${x + 6 * s} ${y - 26 * s} ${x + 4 * s} ${y - 40 * s} C${x + 16 * s} ${y - 26 * s} ${x + 16 * s} ${y - 8 * s} ${x} ${y}Z" fill="#e8603a"/><path d="M${x} ${y} C${x - 6 * s} ${y - 6 * s} ${x - 4 * s} ${y - 16 * s} ${x + 2 * s} ${y - 22 * s} C${x + 8 * s} ${y - 12 * s} ${x + 6 * s} ${y - 4 * s} ${x} ${y}Z" fill="#ffd36b"/>`;
const banner = (x, y, color, h = 34) => `<path d="M${x} 130 V${y}" stroke="#2b2014" stroke-width="2"/><path d="M${x} ${y + 2} h12 v${h} h-12z" fill="${color}"/>`;
const dusk = id => skyGradient(id, '#5a1e14', '#e8a06a');

export const SENGOKU_ART = {
  // 落武者の山: 戦の跡に打ち捨てられた兜と折れた旗
  ruins: () => `
    <defs>${dusk('ruins-sky')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ruins-sky)"/>
    ${smoke(40, 96)}${smoke(160, 90, 0.8)}
    <path d="M0 96 Q100 84 200 98 V130 H0Z" fill="#3b2a1a"/>
    <path d="M30 130 L44 60" stroke="#2b2014" stroke-width="2"/><path d="M44 62 l14 2 l-4 18 l-12 -4z" fill="#8e2418" opacity=".8"/>
    <path d="M150 130 L132 70" stroke="#2b2014" stroke-width="2"/><path d="M128 66 l12 -2 l2 22 l-12 2z" fill="#2c3e66" opacity=".8"/>
    <path d="M80 110 Q100 84 120 110Z" fill="#1d1d26"/><path d="M74 112 Q100 104 126 112 L122 118 Q100 112 78 118Z" fill="#2b2b38"/>
    <path d="M92 92 L86 80 M108 92 L114 80" stroke="#8a7a4a" stroke-width="3"/>
    <g stroke="#2b2014" stroke-width="1.5">${[[60, 116, 20], [140, 112, -30], [170, 120, 10]].map(([x, y, r]) => `<path d="M${x} ${y} l${20 * Math.cos(r * Math.PI / 180)} ${-20 * Math.sin(r * Math.PI / 180)}"/>`).join('')}</g>`,

  // 落武者: 背に矢を受け、霧の中を落ちのびる影
  ochimusha: () => `
    <defs>${skyGradient('ochimusha-sky', '#5a6a6a', '#d8d8cc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ochimusha-sky)"/>
    <g fill="#fff" opacity=".35">${[30, 60, 90].map(y => `<rect x="0" y="${y}" width="${W}" height="8"/>`).join('')}</g>
    <path d="M0 110 Q100 100 200 112 V130 H0Z" fill="#4a4a3a"/>
    <path d="M86 112 L94 70 Q104 62 114 70 L120 112Z" fill="#2b2b2b"/>
    <circle cx="104" cy="58" r="8" fill="#2b2b2b"/><path d="M96 54 L112 50 L108 44 L98 46Z" fill="#2b2b2b"/>
    <path d="M100 72 L82 50 M108 74 L96 46 M112 78 L126 52" stroke="#2b2b2b" stroke-width="2"/>
    <path d="M80 48 l4 -4 M94 44 l4 -4 M124 50 l4 -4" stroke="#e8e0cc" stroke-width="2"/>
    <path d="M120 112 L140 70" stroke="#3b2a1a" stroke-width="2"/><path d="M140 70 l10 2 l-8 14z" fill="#8e2418" opacity=".7"/>`,

  // 焼け寺: 焼け落ちた堂と、くすぶる煙
  yakedera: () => `
    ${washi('#c9b8a0', 'yakedera')}
    ${smoke(70, 80)}${smoke(130, 76, 0.9)}
    <rect y="104" width="${W}" height="26" fill="#5c4a3a"/>
    <path d="M40 104 L50 66 L58 104 M84 104 L90 58 L96 104 M120 104 L128 70 L134 104 M150 104 L156 74 L162 104" fill="#1d140c"/>
    <path d="M30 66 Q100 40 170 64" stroke="#1d140c" stroke-width="6" fill="none" stroke-dasharray="30 12 18 10"/>
    <path d="M60 104 l30 -22 l26 8 l20 14z" fill="#2b2014"/>
    <g fill="#e8603a" opacity=".8">${[[70, 104], [110, 104], [140, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y - 4}" r="3"/>`).join('')}</g>`,

  // 荒れ市: 打ち壊された屋台と散らばった品
  arechi: () => `
    ${washi('#d8c8a8', 'arechi')}
    <rect y="96" width="${W}" height="34" fill="#a08a6a"/>
    <g transform="rotate(-18 60 70)"><rect x="30" y="50" width="60" height="10" fill="#6b4a2b"/><rect x="34" y="60" width="4" height="40" fill="#6b4a2b"/></g>
    <g transform="rotate(24 140 74)"><path d="M110 46 h60 l-4 12 h-52z" fill="#8e2418" opacity=".7"/><rect x="164" y="58" width="4" height="40" fill="#6b4a2b"/></g>
    ${[[50, 112, '#e8603a'], [70, 118, '#8ab86a'], [130, 114, '#e6c46a'], [150, 120, '#e8603a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`).join('')}
    <path d="M90 116 l20 -6 l4 8 l-20 6z" fill="#c9b48a"/><path d="M100 90 l8 8 m0 -8 l-8 8" stroke="#3b2a1a" stroke-width="3"/>`,

  // 廃村: 屋根の落ちた家と烏
  haison: () => `
    <defs>${skyGradient('haison-sky', '#8a8a96', '#e0d8c8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#haison-sky)"/>
    <path d="M0 96 Q100 86 200 98 V130 H0Z" fill="#6a6a52"/>
    <path d="M40 100 v-24 l22 -14 l22 14 v24z" fill="#5c4a3a"/><path d="M36 78 l26 -18 l10 6 l-8 4 l12 8" stroke="#2b2014" stroke-width="3" fill="none"/>
    <rect x="54" y="84" width="10" height="16" fill="#1d140c"/>
    <path d="M120 100 v-18 l18 -10 l18 10 v18z" fill="#6a5a4a"/><path d="M116 84 l22 -14 l22 14" stroke="#2b2014" stroke-width="3" fill="none" stroke-dasharray="14 8"/>
    <g fill="#1d1d1d">${[[100, 30], [130, 22], [160, 36]].map(([x, y]) => `<path d="M${x - 8} ${y} q4 -5 8 0 q4 -5 8 0 q-4 1 -8 4 q-4 -3 -8 -4z"/>`).join('')}</g>
    <path d="M170 100 L176 70 M176 70 l-6 -6 m6 6 l6 -8" stroke="#3b2a1a" stroke-width="2"/>`,

  // 戦利品: 鎧櫃からあふれる金銀と太刀
  senrihin: () => `
    <defs><radialGradient id="senrihin-g" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#ffe9a0"/><stop offset="1" stop-color="#3a1e14" stop-opacity="0"/></radialGradient></defs>
    ${washi('#3a1e14', 'senrihin')}
    <circle cx="100" cy="76" r="60" fill="url(#senrihin-g)" opacity=".7"/>
    <rect x="56" y="70" width="88" height="44" fill="#1d1d1d" stroke="#8a6410" stroke-width="2"/>
    <path d="M52 70 Q100 50 148 70 L144 62 Q100 42 56 62Z" fill="#2b2b2b" transform="rotate(-14 56 62)"/>
    <path d="M56 84 h88" stroke="#8a6410" stroke-width="2"/>
    ${[[74, 68], [92, 62], [110, 66], [126, 70], [100, 74], [84, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#e2b23a" stroke="#8a6410"/>`).join('')}
    <path d="M60 50 L150 30" stroke="#cfd5db" stroke-width="4"/><path d="M144 30 l14 -4" stroke="#6b3a1a" stroke-width="6"/>`,

  // 楽市: 誰でも商いができる市の札と、にぎわう人
  rakuichi: () => `
    <defs>${skyGradient('rakuichi-sky', '#f2c08a', '#f8efdc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#rakuichi-sky)"/>
    <rect y="96" width="${W}" height="34" fill="#d8c39a"/>
    <path d="M100 14 V60" stroke="#5c3b22" stroke-width="3"/><rect x="74" y="14" width="52" height="34" fill="#fbf6e6" stroke="#5c3b22" stroke-width="2"/>
    <text x="100" y="38" text-anchor="middle" font-family="serif" font-size="17" font-weight="700" fill="#2b2620">楽市</text>
    ${[[16, '#b8322a'], [140, '#2c3e66']].map(([x, c]) => `<path d="M${x} 62 h46 l-4 10 h-38z" fill="${c}"/><rect x="${x + 4}" y="72" width="38" height="24" fill="#e6d3a0" stroke="#8a6a3a"/>`).join('')}
    ${[[70, 104, '#7a4a8a'], [90, 108, '#3d7a4a'], [110, 104, '#8e2418'], [128, 108, '#2c3e66']].map(([x, y, c]) => `<circle cx="${x}" cy="${y - 8}" r="4" fill="#f3d7b6"/><path d="M${x - 5} ${y + 14} l2 -18 h6 l2 18z" fill="${c}"/>`).join('')}`,

  // 刀狩: 集められて積み上げられた刀
  katanagari: () => `
    ${washi('#e6d8bc', 'katanagari')}
    <rect y="100" width="${W}" height="30" fill="#8a7a5a"/>
    ${Array.from({ length: 9 }, (_, i) => { const a = -50 + i * 12; const x = 100 + Math.sin(a * Math.PI / 180) * 4; return `<g transform="rotate(${a} ${x} 104)"><path d="M${x} 104 V22" stroke="#cfd5db" stroke-width="3"/><rect x="${x - 2.5}" y="96" width="5" height="22" fill="#2b2014"/><rect x="${x - 6}" y="94" width="12" height="3" fill="#8a6410"/></g>`; }).join('')}
    <path d="M60 106 Q100 96 140 106" stroke="#b8322a" stroke-width="5" fill="none"/>
    <rect x="148" y="40" width="34" height="50" fill="#fbf6e6" stroke="#8a6a3a"/><g stroke="#2b2620" stroke-width="1.2">${[156, 164, 172].map(x => `<path d="M${x} 46 v36"/>`).join('')}</g>`,

  // 山城: 峰の上の砦と石垣
  yamashiro: () => `
    <defs>${skyGradient('yamashiro-sky', '#9fb8d0', '#f0e8d8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#yamashiro-sky)"/>
    <path d="M0 130 L60 60 L100 40 L140 58 L200 130Z" fill="#4e6a3a"/>
    <path d="M30 130 L70 80 L130 80 L170 130Z" fill="#3d5a2a"/>
    <path d="M74 60 L126 60 L132 74 L68 74Z" fill="#8a8a80"/><g stroke="#6a6a60">${[78, 90, 102, 114, 126].map(x => `<path d="M${x} 60 v14"/>`).join('')}</g>
    <rect x="82" y="40" width="36" height="20" fill="#f6f2e8" stroke="#5c4030"/>
    <path d="M76 42 Q100 28 124 42Z" fill="#3b2a1a"/><path d="M86 30 Q100 20 114 30 L110 32 Q100 26 90 32Z" fill="#3b2a1a"/>
    <rect x="94" y="46" width="12" height="14" fill="#2b2014"/>
    ${banner(64, 50, '#b8322a', 16)}${banner(136, 50, '#b8322a', 16)}`,

  // 乱取り: 松明を手に荷を担いで駆ける足軽
  randori: () => `
    <defs>${dusk('randori-sky')}</defs>
    <rect width="${W}" height="${H}" fill="url(#randori-sky)"/>
    ${flame(170, 110, 1.2)}${flame(30, 116, 0.9)}
    <path d="M0 112 H200 V130 H0Z" fill="#2b2014"/>
    ${[[80, 1], [124, -1]].map(([x, d]) => `<g><circle cx="${x}" cy="54" r="7" fill="#1d1d1d"/><path d="M${x - 6} 50 L${x} 42 L${x + 6} 50z" fill="#1d1d1d"/><path d="M${x} 62 L${x + 6 * d} 86 L${x - 8} 112 M${x + 6 * d} 86 L${x + 16 * d} 110" stroke="#1d1d1d" stroke-width="6" stroke-linecap="round"/><path d="M${x} 66 L${x - 14 * d} 76" stroke="#1d1d1d" stroke-width="5" stroke-linecap="round"/></g>`).join('')}
    <ellipse cx="96" cy="62" rx="14" ry="10" fill="#8a6a3a"/><path d="M90 56 q6 -6 12 0" stroke="#5c3b22" stroke-width="2" fill="none"/>
    <path d="M138 70 L150 40" stroke="#3b2a1a" stroke-width="3"/>${flame(150, 42, 0.5)}`,

  // 下剋上: 小さな兜が大きな兜を押しのけて駆け上がる
  gekokujo: () => `
    <defs>${skyGradient('gekokujo-sky', '#8e2418', '#f2a06a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#gekokujo-sky)"/>
    <path d="M0 130 L200 30 V130Z" fill="#3b2a1a" opacity=".5"/>
    <g transform="rotate(30 64 90)"><path d="M34 100 Q64 60 94 100Z" fill="#2b2b38"/><path d="M28 102 Q64 94 100 102 L94 110 Q64 102 34 110Z" fill="#1d1d26"/><path d="M54 74 L44 50 M74 74 L84 50" stroke="#8a7a4a" stroke-width="4"/></g>
    <g><path d="M118 62 Q140 34 162 62Z" fill="#1d1d26"/><path d="M112 64 Q140 58 168 64 L162 70 Q140 64 118 70Z" fill="#2b2b38"/><path d="M134 42 L126 20 M146 42 L154 20" stroke="#ffd36b" stroke-width="4" stroke-linecap="round"/><circle cx="140" cy="48" r="4" fill="#ffd36b"/></g>
    <path d="M90 116 L150 80" stroke="#ffd36b" stroke-width="4"/><path d="M150 80 l-12 0 m12 0 l-6 10" stroke="#ffd36b" stroke-width="4" fill="none"/>`,

  // 知行: 朱印の押された所領の証文と、その田畑
  chigyou: () => `
    <defs>${skyGradient('chigyou-sky', '#c7d8b0', '#f4ecd8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#chigyou-sky)"/>
    <path d="M0 70 Q100 56 200 70 V130 H0Z" fill="#9cc58a"/>
    <g stroke="#6f9a5a" stroke-width="1">${[84, 96, 108, 120].map(y => `<path d="M0 ${y} Q100 ${y - 8} 200 ${y}"/>`).join('')}</g>
    <g transform="rotate(-6 100 56)"><rect x="54" y="16" width="92" height="80" fill="#fbf6e6" stroke="#c9b48a"/><g stroke="#2b2620" stroke-width="1.2">${Array.from({ length: 8 }, (_, i) => `<path d="M${136 - i * 9} 24 v${44 + (i % 3) * 6}"/>`).join('')}</g><rect x="68" y="66" width="22" height="22" fill="none" stroke="#c0392b" stroke-width="3"/><path d="M72 72 h14 M79 70 v16 M72 80 h14" stroke="#c0392b" stroke-width="2"/></g>
    ${[[24, 110], [176, 104]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="7" fill="#cfd5db" stroke="#7d8894"/>`).join('')}`,

  // 古物商: 古い壺・茶碗・甲冑の並ぶ店先
  kobutsu: () => `
    ${washi('#d8c8a8', 'kobutsu')}
    <rect y="0" width="${W}" height="14" fill="#3b2a1a"/>
    <rect x="10" y="40" width="180" height="6" fill="#5c3b22"/><rect x="10" y="80" width="180" height="6" fill="#5c3b22"/>
    <path d="M24 40 q-8 -14 6 -26 q14 12 6 26z" fill="#7a5a3a"/><path d="M50 40 q0 -14 14 -14 q14 0 14 14z" fill="#3d6a5a"/>
    <path d="M90 40 v-18 h10 v18z M86 22 h18" fill="#8a7a6a" stroke="#5c4a3a"/>
    <path d="M120 40 q-6 -20 10 -24 q16 4 10 24z" fill="#b8682f"/>
    <path d="M154 40 l6 -20 h14 l6 20z" fill="#5d6772"/>
    <path d="M40 80 Q60 54 80 80Z" fill="#2b2b38"/><path d="M36 80 Q60 74 84 80" stroke="#1d1d26" stroke-width="5"/>
    <rect x="100" y="60" width="30" height="20" fill="#6b3a1a"/><g fill="#c9a46a">${[106, 114, 122].map(x => `<circle cx="${x}" cy="70" r="3"/>`).join('')}</g>
    <path d="M146 80 l20 -18 l4 4 l-20 18z" fill="#cfd5db"/>
    <rect y="86" width="${W}" height="44" fill="#a08a6a"/>
    <rect x="70" y="96" width="60" height="22" fill="#fbf6e6" stroke="#5c3b22"/><text x="100" y="112" text-anchor="middle" font-family="serif" font-size="12" font-weight="700" fill="#2b2620">古物</text>`,

  // 野武士の砦: 林の中の柵と焚き火
  nobushi: () => `
    <defs>${skyGradient('nobushi-sky', '#2a2a3a', '#7a6a5a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#nobushi-sky)"/>
    ${[[14, 60], [40, 50], [168, 54], [190, 64]].map(([x, y]) => `<path d="M${x} 130 V${y}" stroke="#1d1d14" stroke-width="4"/><path d="M${x - 14} ${y + 20} L${x} ${y - 10} L${x + 14} ${y + 20}Z" fill="#1d2a1d"/>`).join('')}
    <path d="M0 108 H200 V130 H0Z" fill="#2b2014"/>
    <g fill="#6b4a2b">${Array.from({ length: 12 }, (_, i) => `<path d="M${56 + i * 8} 108 v-30 l4 -6 l4 6 v30z"/>`).join('')}</g>
    <path d="M56 90 H152" stroke="#3b2a1a" stroke-width="3"/>
    ${flame(104, 112, 0.9)}
    <g fill="#ffd36b">${[[96, 70], [112, 64], [104, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`,

  // 一向一揆: 「南無阿弥陀仏」の旗と、竹槍の群れ
  ikkou: () => `
    <defs>${skyGradient('ikkou-sky', '#c9b48a', '#f4ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#ikkou-sky)"/>
    <path d="M100 130 V10" stroke="#3b2a1a" stroke-width="3"/>
    <rect x="102" y="10" width="34" height="96" fill="#fbf6e6" stroke="#8a6a3a"/>
    ${['南', '無', '阿', '弥', '陀', '仏'].map((ch, i) => `<text x="119" y="${26 + i * 15}" text-anchor="middle" font-family="serif" font-size="13" font-weight="700" fill="#2b2620">${ch}</text>`).join('')}
    <g stroke="#7a8a4a" stroke-width="3">${[20, 34, 48, 62, 78, 150, 164, 178, 190].map((x, i) => `<path d="M${x} 130 L${x + (i % 2 ? 6 : -6)} ${40 + (i % 3) * 8}"/>`).join('')}</g>
    ${[24, 52, 80, 158, 186].map((x, i) => `<circle cx="${x}" cy="${104 - (i % 2) * 6}" r="7" fill="#3b2a1a"/><path d="M${x - 10} 130 q10 -24 20 0z" fill="${['#5c4a3a', '#4a3a2a'][i % 2]}"/>`).join('')}`,

  // 焼き討ち: 炎上する山寺
  yakiuchi: () => `
    <defs>${skyGradient('yakiuchi-sky', '#2a0e0a', '#b8322a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#yakiuchi-sky)"/>
    <path d="M0 130 L50 70 L100 56 L150 70 L200 130Z" fill="#1d140c"/>
    <path d="M60 80 Q100 60 140 80 L132 84 Q100 68 68 84Z" fill="#000"/>
    <rect x="74" y="84" width="52" height="28" fill="#2b1a10"/>
    ${flame(80, 90, 1.3)}${flame(110, 84, 1.6)}${flame(136, 92, 1.1)}${flame(40, 112, 0.8)}${flame(170, 114, 0.9)}
    <g fill="#ffd36b">${Array.from({ length: 10 }, (_, i) => `<circle cx="${30 + i * 16}" cy="${20 + (i * 37) % 40}" r="1.5"/>`).join('')}</g>`,

  // 忍び: 月夜の屋根に潜む黒装束
  shinobi: () => `
    <defs>${skyGradient('shinobi-sky', '#0f1530', '#3a4a7a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#shinobi-sky)"/>
    <circle cx="150" cy="34" r="22" fill="#f6eec8"/><circle cx="142" cy="30" r="22" fill="none"/>
    <path d="M0 100 L60 80 L130 80 L200 104 V130 H0Z" fill="#1d1d26"/>
    <g stroke="#2b2b38" stroke-width="1">${[86, 92, 98].map(y => `<path d="M30 ${y + 6} L170 ${y + 8}"/>`).join('')}</g>
    <path d="M80 80 Q86 60 96 58 Q110 56 112 70 L118 80Z" fill="#0a0a10"/>
    <circle cx="100" cy="52" r="9" fill="#0a0a10"/><rect x="94" y="50" width="12" height="3" fill="#f3d7b6"/>
    <path d="M108 50 l14 -6" stroke="#0a0a10" stroke-width="2"/>
    <path d="M92 60 L74 34" stroke="#cfd5db" stroke-width="2.5"/>
    <g fill="#cfd5db">${[[40, 50], [56, 36]].map(([x, y]) => `<path d="M${x} ${y - 6} l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2z"/>`).join('')}</g>`,

  // 鷹狩: 野の上を舞う鷹と、鷹匠の籠手
  takagari: () => `
    <defs>${skyGradient('takagari-sky', '#9fc4dd', '#f2ead6')}</defs>
    <rect width="${W}" height="${H}" fill="url(#takagari-sky)"/>
    <path d="M0 96 Q100 80 200 96 V130 H0Z" fill="#b8a46a"/>
    <path d="M60 50 C80 30 96 34 100 44 C104 34 120 30 140 50 C120 46 108 50 102 58 L98 58 C92 50 80 46 60 50Z" fill="#5c3b22"/>
    <path d="M96 58 l4 10 l4 -10z" fill="#3b2a1a"/><circle cx="100" cy="46" r="3" fill="#e6c46a"/>
    <path d="M20 130 L40 98 L70 94 L72 104 L50 108 L36 130Z" fill="#7a5a3a"/>
    <path d="M70 94 l8 -2 l2 12 l-8 0z" fill="#3b2a1a"/>
    <g fill="#8a7a4a">${[[150, 110], [170, 104]].map(([x, y]) => `<path d="M${x} ${y} q4 -10 8 0 q-4 4 -8 0z"/>`).join('')}</g>`,
};
