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

  // 生き残り: 焼け跡で荷をまとめる人
  ikinokori: () => `
    <defs>${dusk('iki-sky')}</defs>
    <rect width="${W}" height="${H}" fill="url(#iki-sky)"/>
    ${smoke(150, 90, 0.7)}
    <path d="M0 100 Q100 92 200 104 V130 H0Z" fill="#3b2a1a"/>
    <path d="M120 100 l6 -28 l10 4 l4 -14 l8 2 l2 36z" fill="#1d1612"/>
    <g fill="#2b2014"><circle cx="70" cy="70" r="7"/><path d="M60 78 q10 -4 20 0 l4 24 h-28z"/></g>
    <rect x="82" y="88" width="22" height="14" fill="#8a6440" stroke="#2b2014"/>
    <path d="M82 94 h22" stroke="#2b2014"/>`,

  // 掘っ立て小屋
  hottate: () => `
    <defs>${skyGradient('hottate-sky', '#8aa0a8', '#e8dcc0')}</defs>
    <rect width="${W}" height="${H}" fill="url(#hottate-sky)"/>
    <path d="M0 100 h200 v30 h-200z" fill="#7a6a4a"/>
    <path d="M56 100 V62 L100 40 L148 62 V100z" fill="#8a7050"/>
    <path d="M46 66 L100 34 L156 66" stroke="#4a3a24" stroke-width="6" fill="none"/>
    <g stroke="#c8b07a" stroke-width="1.5">${[48, 56, 64, 72, 80, 88, 96].map((x, i) => `<path d="M${x + 6} ${64 - i * 3} l-8 4"/>`).join('')}</g>
    <rect x="88" y="70" width="22" height="30" fill="#2b2014"/>
    <path d="M60 68 V100 M140 68 V100" stroke="#4a3a24" stroke-width="3"/>`,

  // 無縁塚: 苔むした小さな石塔の群れ
  muenzuka: () => `
    <defs>${skyGradient('muen-sky', '#4a5a5a', '#c8c8b8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#muen-sky)"/>
    <path d="M0 96 Q100 86 200 98 V130 H0Z" fill="#4a5a3a"/>
    <g fill="#9a9a90" stroke="#5a5a52">${[[40, 92], [70, 84], [100, 78], [130, 86], [160, 92], [86, 100], [118, 102]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 22}" width="12" height="22"/><path d="M${x - 8} ${y - 22} h16 l-8 -8z"/>`).join('')}</g>
    <g fill="#5a7a3a" opacity=".7">${[[44, 88], [104, 74], [164, 88]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3"/>`).join('')}</g>`,

  // 荒れ屋敷: 草に埋もれた屋敷
  areyashiki: () => `
    <defs>${skyGradient('are-sky', '#a8b8a0', '#ece4cc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#are-sky)"/>
    <path d="M30 60 L100 34 L170 60z" fill="#5a4a3a"/>
    <path d="M60 52 l20 -6 l4 10z" fill="#a8b8a0"/>
    <rect x="44" y="60" width="112" height="40" fill="#b8a07a"/>
    <g stroke="#6a5a40" stroke-width="2">${[60, 84, 108, 132].map(x => `<path d="M${x} 60 v40"/>`).join('')}</g>
    <path d="M0 130 V96 Q100 82 200 96 V130z" fill="#5a8a3a"/>
    <g stroke="#3e6a2a" stroke-width="2">${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 7 + 2} 120 q${i % 2 ? 4 : -4} -18 ${i % 3} -${20 + (i % 4) * 5}"/>`).join('')}</g>`,

  // 狂人: 乱れ髪で踊り狂う男
  kyoujin: () => `
    <defs>${skyGradient('kyo-sky', '#4a1a3a', '#e88a5a')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kyo-sky)"/>
    <g fill="#ffd36b" opacity=".5">${[[30, 30], [170, 26], [150, 80], [40, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>
    <path d="M0 110 h200 v20 h-200z" fill="#2b1a14"/>
    <g fill="#1d1216">
      <circle cx="100" cy="42" r="10"/>
      <path d="M86 36 l-14 -12 M92 32 l-6 -16 M108 32 l8 -16 M114 36 l14 -10" stroke="#1d1216" stroke-width="3"/>
      <path d="M90 52 h20 l6 30 h-32z"/>
      <path d="M92 56 L64 36 M108 56 L140 44 M94 82 L78 110 M106 82 L130 104" stroke="#1d1216" stroke-width="6"/>
    </g>`,

  // 雑賀衆: 鉄砲を構える傭兵たち
  saikashu: () => `
    <defs>${dusk('saika-sky')}</defs>
    <rect width="${W}" height="${H}" fill="url(#saika-sky)"/>
    ${smoke(150, 70, 0.6)}
    <path d="M0 100 h200 v30 h-200z" fill="#3b2a1a"/>
    ${[[50, 0], [96, 4], [142, 0]].map(([x, d]) => `<g fill="#1d1612"><circle cx="${x}" cy="${62 + d}" r="7"/><path d="M${x - 14} ${56 + d} l14 -8 l14 8z"/><path d="M${x - 9} ${70 + d} h18 l4 30 h-26z"/></g><path d="M${x + 4} ${74 + d} L${x + 40} ${66 + d}" stroke="#5a4030" stroke-width="3"/>`).join('')}
    <g fill="#ffd36b">${[[90, 69], [136, 73], [182, 69]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>
    <path d="M10 130 V40" stroke="#2b2014" stroke-width="2"/><path d="M10 42 h20 v26 h-20z" fill="#2b2014"/>
    <circle cx="20" cy="55" r="6" fill="#e8a06a"/>`,

  // 貧乏長屋: 雨漏りする長屋
  binbou: () => `
    <defs>${skyGradient('bin-sky', '#6a7a8a', '#c8c8c0')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bin-sky)"/>
    <g stroke="#9ab0c8" stroke-width="1">${Array.from({ length: 18 }, (_, i) => `<path d="M${i * 12 + 4} ${(i * 17) % 40} l-4 12"/>`).join('')}</g>
    <path d="M10 56 h180 l-10 -14 h-160z" fill="#5a4a3a"/>
    <path d="M70 46 l14 -2 l-4 8z" fill="#6a7a8a"/>
    <rect x="16" y="56" width="168" height="48" fill="#a08a64"/>
    <g fill="#3a2a1e">${[24, 66, 108, 150].map(x => `<rect x="${x}" y="66" width="26" height="38"/>`).join('')}</g>
    <g fill="#e8dcc0">${[24, 66, 108, 150].map(x => `<rect x="${x + 2}" y="68" width="10" height="14"/>`).join('')}</g>
    <path d="M0 104 h200 v26 h-200z" fill="#6a5a44"/>
    <ellipse cx="80" cy="114" rx="14" ry="3" fill="#9ab0c8"/>`,

  // 物乞い: 椀を差し出す托鉢
  monogoi: () => `
    ${washi('#d8c8a8', 'monogoi')}
    <path d="M0 104 h200 v26 h-200z" fill="#8a7050"/>
    <path d="M60 104 l10 -40 h40 l12 40z" fill="#6a5a44"/>
    <circle cx="90" cy="54" r="10" fill="#c8a880"/>
    <path d="M74 50 q16 -22 32 0" fill="#7a6a4a"/>
    <path d="M100 76 L128 84" stroke="#6a5a44" stroke-width="8" stroke-linecap="round"/>
    <path d="M126 80 q10 14 22 0z" fill="#3a2a1e"/>
    <g fill="#b8862a">${[[132, 78], [140, 77]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>
    <path d="M40 104 V40" stroke="#5a4a34" stroke-width="3"/>`,

  // 小姓: 刀を捧げ持つ少年
  koshou: () => `
    ${washi('#efe4cc', 'koshou')}
    <rect y="100" width="${W}" height="30" fill="#b8a07a"/>
    <g stroke="#8a7050" stroke-width="1">${[108, 116, 124].map(y => `<path d="M0 ${y} h200"/>`).join('')}</g>
    <circle cx="100" cy="42" r="10" fill="#e8c8a0"/>
    <path d="M90 36 q10 -14 20 0 q-4 -4 -10 -4 q-6 0 -10 4z" fill="#1d1612"/>
    <path d="M100 26 l0 -6" stroke="#1d1612" stroke-width="3"/>
    <path d="M84 54 h32 l8 46 h-48z" fill="#b8322a"/>
    <path d="M90 54 l10 20 l10 -20" fill="#f6efe0"/>
    <path d="M60 72 L140 64" stroke="#2b2014" stroke-width="4"/>
    <path d="M60 72 L74 70.6" stroke="#c9a43a" stroke-width="6"/>`,

  // 浪人: 笠をかぶった流れ者
  rounin: () => `
    <defs>${skyGradient('rou-sky', '#c8b090', '#efe4cc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#rou-sky)"/>
    <path d="M0 90 Q100 80 200 92 V130 H0Z" fill="#a8946a"/>
    <path d="M0 110 Q100 104 200 112 V130 H0Z" fill="#8a7650"/>
    <path d="M70 46 Q100 24 130 46z" fill="#c8a870"/>
    <path d="M86 46 h28 l6 50 h-40z" fill="#4a4a5a"/>
    <path d="M90 96 l-4 16 M110 96 l4 16" stroke="#4a4a5a" stroke-width="6"/>
    <path d="M112 62 L136 90" stroke="#1d1612" stroke-width="3"/>
    <g fill="#c8b070" opacity=".6">${[[30, 100], [160, 96], [180, 104]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="3"/>`).join('')}</g>`,

  // 隠者: 山奥の庵
  inja: () => `
    <defs>${skyGradient('inja-sky', '#9ab0b8', '#e8e4d8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#inja-sky)"/>
    <path d="M0 70 L50 30 L90 64 L140 20 L200 60 V130 H0Z" fill="#6a8a6a"/>
    <path d="M0 100 Q100 90 200 104 V130 H0Z" fill="#4a6a4a"/>
    <path d="M70 80 L100 64 L130 80z" fill="#8a7050"/>
    <rect x="76" y="80" width="48" height="22" fill="#c8b48a"/>
    <rect x="94" y="86" width="12" height="16" fill="#2b2014"/>
    <path d="M150 104 V60" stroke="#3a2a1e" stroke-width="3"/><circle cx="150" cy="56" r="10" fill="#3e6a3a"/>
    <g fill="#fff" opacity=".5"><rect x="0" y="52" width="200" height="5"/></g>`,

  // 軍師: 軍配を手に地図を見る
  gunshi: () => `
    ${washi('#e8dcc0', 'gunshi')}
    <rect x="30" y="66" width="140" height="50" fill="#d8c49a" stroke="#6e5a3a"/>
    <path d="M40 100 Q70 76 100 92 T160 80" stroke="#2c5a8a" stroke-width="2" fill="none"/>
    <g fill="#b8322a">${[[60, 84], [130, 96]].map(([x, y]) => `<path d="M${x} ${y} v-10 l8 4 l-8 4"/>`).join('')}</g>
    <g fill="#2b2014">${[[80, 104], [110, 78]].map(([x, y]) => `<path d="M${x} ${y} v-10 l8 4 l-8 4"/>`).join('')}</g>
    <circle cx="100" cy="30" r="10" fill="#2b2014"/>
    <path d="M86 40 h28 l6 26 h-40z" fill="#2b2014"/>
    <path d="M118 46 L140 26" stroke="#5c3b22" stroke-width="2"/>
    <path d="M140 26 q14 -6 10 10 q-14 4 -10 -10z" fill="#c9a43a" stroke="#5c3b22"/>`,

  // 納屋: 俵と農具
  naya: () => `
    ${washi('#5a4430', 'naya')}
    <rect y="100" width="${W}" height="30" fill="#3e2e20"/>
    <g fill="#d8c08a" stroke="#8a7040">${[[60, 96], [100, 96], [80, 76], [140, 98]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="12"/><path d="M${x - 14} ${y - 10} v20 M${x + 14} ${y - 10} v20" />`).join('')}</g>
    <path d="M170 104 L176 30" stroke="#8a6440" stroke-width="3"/><path d="M168 30 h16 l-2 8 h-12z" fill="#9a9a9a"/>
    <path d="M20 104 L30 40" stroke="#8a6440" stroke-width="3"/><path d="M24 40 q8 -8 14 0" stroke="#9a9a9a" stroke-width="4" fill="none"/>
    <path d="M0 18 h200" stroke="#2b2014" stroke-width="6"/>`,

  // 悪童: 石を投げる子ども
  akudou: () => `
    <defs>${skyGradient('aku-sky', '#9ac0d0', '#f0e6cc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#aku-sky)"/>
    <path d="M0 100 h200 v30 h-200z" fill="#b8a07a"/>
    <path d="M140 100 V54 h50 v46z" fill="#c8b48a"/><path d="M134 56 h62 l-6 -10 h-50z" fill="#5a4a3a"/>
    <circle cx="80" cy="56" r="9" fill="#e8c8a0"/>
    <path d="M72 50 q8 -12 16 0" fill="#1d1612"/>
    <path d="M72 66 h16 l4 26 h-24z" fill="#5a7a9a"/>
    <path d="M86 68 L104 50" stroke="#e8c8a0" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 92 l-6 10 M86 92 l6 10" stroke="#e8c8a0" stroke-width="4"/>
    <circle cx="122" cy="38" r="4" fill="#6a6a6a"/>
    <path d="M106 48 q8 -10 14 -10" stroke="#6a6a6a" stroke-dasharray="2 3" fill="none"/>`,

  // 武具蔵: 槍と鎧の並ぶ蔵
  bugugura: () => `
    ${washi('#3e3028', 'bugugura')}
    <rect y="104" width="${W}" height="26" fill="#2a2018"/>
    <g stroke="#8a6440" stroke-width="3">${[20, 34, 48, 62].map(x => `<path d="M${x} 104 V18"/>`).join('')}</g>
    <g fill="#c8c8c8">${[20, 34, 48, 62].map(x => `<path d="M${x - 3} 18 l3 -10 l3 10z"/>`).join('')}</g>
    <g>
      <path d="M100 40 q20 -16 40 0 v6 h-40z" fill="#2b2b38"/>
      <path d="M106 36 l-6 -14 M134 36 l6 -14" stroke="#c9a43a" stroke-width="3"/>
      <rect x="100" y="46" width="40" height="36" fill="#8e2418"/>
      <g stroke="#e8c070" stroke-width="1">${[52, 60, 68, 76].map(y => `<path d="M100 ${y} h40"/>`).join('')}</g>
      <path d="M96 82 h48 l-4 20 h-40z" fill="#5a1a14"/>
    </g>
    <path d="M160 104 V50" stroke="#5c3b22" stroke-width="3"/><path d="M152 50 q8 -20 16 0" fill="none" stroke="#5c3b22" stroke-width="3"/>`,

  // 屍運び: 戦場で亡骸を運ぶ荷車
  shikabane: () => `
    <defs>${dusk('shika-sky')}</defs>
    <rect width="${W}" height="${H}" fill="url(#shika-sky)"/>
    ${smoke(30, 90, 0.6)}
    <path d="M0 98 Q100 88 200 100 V130 H0Z" fill="#2b2014"/>
    <rect x="70" y="72" width="80" height="16" fill="#5a4030"/>
    <path d="M76 72 q30 -16 66 0" fill="#3a2a1e"/>
    <circle cx="86" cy="96" r="12" fill="none" stroke="#3a2a1e" stroke-width="4"/>
    <circle cx="136" cy="96" r="12" fill="none" stroke="#3a2a1e" stroke-width="4"/>
    <path d="M150 78 L184 70" stroke="#3a2a1e" stroke-width="3"/>
    <g fill="#1d1612"><circle cx="54" cy="64" r="7"/><path d="M46 72 h14 l4 28 h-22z"/></g>
    <path d="M60 78 L72 78" stroke="#1d1612" stroke-width="3"/>`,

  // 金物屋: 鍋や釘を並べた店先
  kanamono: () => `
    ${washi('#e8dcc0', 'kanamono')}
    <rect y="96" width="${W}" height="34" fill="#8a6a4a"/>
    <path d="M10 26 Q100 14 190 26" stroke="#5c3b22" stroke-width="5" fill="none"/>
    <path d="M30 26 h140 v26 l-10 -4 l-10 4 l-10 -4 l-10 4 l-10 -4 l-10 4 l-10 -4 l-10 4 l-10 -4 l-10 4 l-10 -4 l-10 4 l-10 -4 l-10 4z" fill="#3a4a5a"/>
    <g fill="#6a6a70" stroke="#3a3a40">${[50, 90, 130].map(x => `<path d="M${x - 16} 80 q16 20 32 0z"/><path d="M${x - 18} 80 h36"/>`).join('')}</g>
    <g stroke="#8a8a90" stroke-width="2">${Array.from({ length: 8 }, (_, i) => `<path d="M${150 + i * 4} 100 v-14"/>`).join('')}</g>
    <path d="M160 70 l14 -6 l4 10 l-14 6z" fill="#6a6a70"/>`,

  // 鼠: 米俵をかじる鼠たち
  nezumi: () => `
    ${washi('#4a3a2e', 'nezumi')}
    <rect y="100" width="${W}" height="30" fill="#2e241c"/>
    <ellipse cx="70" cy="82" rx="34" ry="20" fill="#d8c08a" stroke="#8a7040"/>
    <path d="M44 72 v20 M96 72 v20" stroke="#8a7040"/>
    <g fill="#d8c08a">${[[96, 100], [104, 104], [90, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>
    ${[[120, 96, 1], [150, 86, -1], [168, 104, 1]].map(([x, y, d]) => `<g fill="#6a6a70"><ellipse cx="${x}" cy="${y}" rx="12" ry="7"/><circle cx="${x - 12 * d}" cy="${y - 3}" r="5"/><circle cx="${x - 14 * d}" cy="${y - 8}" r="2.5"/></g><path d="M${x + 12 * d} ${y} q${10 * d} 4 ${16 * d} -4" stroke="#6a6a70" fill="none"/>`).join('')}`,

  // 屑拾い: 籠を背負って屑を拾う
  kuzuhiroi: () => `
    <defs>${skyGradient('kuzu-sky', '#a8a090', '#e8dcc8')}</defs>
    <rect width="${W}" height="${H}" fill="url(#kuzu-sky)"/>
    <path d="M0 96 h200 v34 h-200z" fill="#8a7a5a"/>
    <g fill="#5a4a3a">${[[30, 104], [44, 110], [150, 106], [170, 112], [120, 116]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="4" transform="rotate(${x % 40} ${x} ${y})"/>`).join('')}</g>
    <g fill="#3a2a1e"><circle cx="96" cy="48" r="8"/><path d="M86 56 h18 l6 30 l-10 14 h-14 l-6 -14z"/></g>
    <path d="M100 52 q22 -6 26 16 l-4 26 h-20z" fill="#b8a070" stroke="#6a5a3a"/>
    <g stroke="#6a5a3a">${[60, 70, 80].map(y => `<path d="M104 ${y} h20"/>`).join('')}</g>
    <path d="M86 70 L66 100" stroke="#5a4030" stroke-width="3"/>`,

  // 琵琶法師: 琵琶を弾く盲目の僧
  biwa: () => `
    <defs>${skyGradient('biwa-sky', '#3a3050', '#c8a888')}</defs>
    <rect width="${W}" height="${H}" fill="url(#biwa-sky)"/>
    <circle cx="160" cy="28" r="12" fill="#f6efd0"/>
    <path d="M0 104 h200 v26 h-200z" fill="#2b2420"/>
    <circle cx="88" cy="48" r="10" fill="#c8a880"/>
    <path d="M80 46 h16" stroke="#2b2014" stroke-width="2"/>
    <path d="M70 60 h36 l12 44 h-58z" fill="#1d1a24"/>
    <ellipse cx="108" cy="84" rx="16" ry="22" fill="#a0603a" transform="rotate(-30 108 84)"/>
    <path d="M118 66 L140 34" stroke="#6a3a1e" stroke-width="5"/>
    <g stroke="#e8dcc0" stroke-width=".8">${[0, 1, 2, 3].map(i => `<path d="M${102 + i * 2} ${96} L${136 + i * 2} ${38}"/>`).join('')}</g>
    <g fill="#e8dcc0" opacity=".7"><path d="M40 40 q6 -6 0 -12 M30 50 q8 -8 0 -16" stroke="#e8dcc0" fill="none"/></g>`,

  // 傾奇者: 派手な装いの若者
  kabukimono: () => `
    ${washi('#f2e2c0', 'kabukimono')}
    <g opacity=".3">${Array.from({ length: 8 }, (_, i) => `<circle cx="${i * 28 + 10}" cy="${(i % 2) * 90 + 20}" r="14" fill="${['#b8322a', '#2c5a8a', '#c9a43a', '#4e8a3a'][i % 4]}"/>`).join('')}</g>
    <rect y="104" width="${W}" height="26" fill="#8a7050"/>
    <circle cx="100" cy="40" r="10" fill="#e8c8a0"/>
    <path d="M90 34 q10 -16 22 -6 q6 -6 12 -2 q-8 2 -12 8 z" fill="#1d1612"/>
    <path d="M82 52 h36 l10 52 h-56z" fill="#b8322a"/>
    <g fill="#c9a43a">${[[90, 62], [108, 70], [94, 84], [112, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g>
    <path d="M82 52 l-10 30 l14 -10 M118 52 l14 26" stroke="#2c5a8a" stroke-width="5" fill="none"/>
    <path d="M134 78 L170 40" stroke="#8a2a8a" stroke-width="5"/>
    <path d="M72 82 L46 110" stroke="#2b2014" stroke-width="4"/>`,

  // 黄泉の穴: 洞窟の奥にともる灯
  yomi: () => `
    ${washi('#1a1614', 'yomi')}
    <path d="M0 0 h200 v130 h-200z M40 130 Q40 40 100 30 Q160 40 160 130z" fill="#3a3028" fill-rule="evenodd"/>
    <path d="M60 130 Q64 70 100 60 Q136 70 140 130z" fill="#0e0a08"/>
    <circle cx="100" cy="96" r="18" fill="#6a8aa8" opacity=".2"/>
    <ellipse cx="100" cy="98" rx="5" ry="8" fill="#a8c8e8"/>
    <g fill="#5a5048">${[[50, 60], [150, 64], [70, 40], [130, 42]].map(([x, y]) => `<path d="M${x} ${y} l4 14 l-8 0z"/>`).join('')}</g>
    <g fill="#e8e0d0" opacity=".6">${[[86, 116], [114, 118], [100, 122]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,

  // 国人: 館の前に立つ土地の領主
  kokujin: () => `
    <defs>${skyGradient('koku-sky', '#8ab0c8', '#efe6cc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#koku-sky)"/>
    <path d="M0 80 Q100 70 200 82 V130 H0Z" fill="#8aa86a"/>
    <path d="M110 70 L150 50 L190 70z" fill="#4a3a2a"/><rect x="116" y="70" width="68" height="26" fill="#d8c8a0"/>
    <path d="M100 96 h100 v4 h-100z" fill="#6a5a3a"/>
    <g fill="#2b2014"><circle cx="60" cy="52" r="9"/><path d="M50 46 l10 -12 l10 12z"/><path d="M44 62 h32 l8 44 h-48z"/></g>
    <path d="M40 66 h40" stroke="#c9a43a" stroke-width="3"/>
    <path d="M78 70 L90 96" stroke="#2b2014" stroke-width="3"/>`,

  // 贋金: 秤で重さをごまかす両替
  nisegane: () => `
    ${washi('#2e2620', 'nisegane')}
    <rect y="96" width="${W}" height="34" fill="#4a3a2e"/>
    <g fill="#c9a43a" stroke="#6e4a08">${[[60, 80], [84, 86], [70, 100], [96, 102]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="9"/><rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#2e2620"/>`).join('')}</g>
    <g fill="#8a8a70" stroke="#4a4a3a">${[[128, 90], [150, 100]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="9"/><rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#2e2620"/>`).join('')}</g>
    <path d="M110 30 v40 M80 34 h60" stroke="#8a6440" stroke-width="3"/>
    <path d="M80 34 l-10 18 h20z M140 34 l-10 22 h20z" fill="none" stroke="#8a6440" stroke-width="1.5"/>
    <g fill="#1a1612"><circle cx="170" cy="40" r="7"/><path d="M160 48 h20 l4 40 h-28z"/></g>
    <path d="M164 56 L148 50" stroke="#1a1612" stroke-width="4"/>`,

  // 墓荒らし: 夜の墓場で鍬を振るう影
  hakaarashi: () => `
    <defs>${skyGradient('haka-sky', '#1e2438', '#5a5a70')}</defs>
    <rect width="${W}" height="${H}" fill="url(#haka-sky)"/>
    <path d="M150 22 a12 12 0 1 0 8 20 a10 10 0 1 1 -8 -20z" fill="#f6efd0"/>
    <path d="M0 98 Q100 90 200 100 V130 H0Z" fill="#2b2a30"/>
    <g fill="#7a7a80">${[[30, 98], [60, 92], [150, 96], [180, 100]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 24}" width="12" height="24"/>`).join('')}</g>
    <path d="M90 104 q20 -12 40 0z" fill="#5a4a3a"/>
    <g fill="#0e0e14"><circle cx="110" cy="58" r="7"/><path d="M100 66 h20 l4 34 h-28z"/></g>
    <path d="M116 70 L140 46" stroke="#5a4030" stroke-width="3"/><path d="M134 42 l12 -2 l-4 10z" fill="#8a8a8a"/>`,

  // 名のある武者の山: 並び立つ旗指物
  bushi: () => `
    <defs>${dusk('bushi-sky')}</defs>
    <rect width="${W}" height="${H}" fill="url(#bushi-sky)"/>
    <path d="M0 98 Q100 88 200 100 V130 H0Z" fill="#2b2014"/>
    ${[[24, '#8e2418'], [56, '#2c3e66'], [88, '#c9a43a'], [120, '#4e8a3a'], [152, '#5a2a6a'], [184, '#e8e0d0']].map(([x, c]) => banner(x, 20 + (x % 3) * 6, c, 40)).join('')}
    <path d="M70 98 Q100 70 130 98Z" fill="#1d1d26"/>
    <path d="M86 76 L76 54 M114 76 L124 54" stroke="#c9a43a" stroke-width="4"/>`,

  // 巫女: 鈴を振って舞う
  miko: () => `
    ${washi('#f6efe0', 'miko')}
    <path d="M30 14 h140 M40 24 h120" stroke="#b8322a" stroke-width="6"/>
    <path d="M50 14 V130 M150 14 V130" stroke="#b8322a" stroke-width="6"/>
    <circle cx="100" cy="46" r="9" fill="#f0d8c0"/>
    <path d="M90 42 q10 -14 20 0 v30 h-20z" fill="#1d1612"/>
    <path d="M86 56 h28 l6 22 h-40z" fill="#fbf8f0" stroke="#c8c0b0"/>
    <path d="M82 78 h36 l8 30 h-52z" fill="#c8322a"/>
    <path d="M114 60 L132 44" stroke="#fbf8f0" stroke-width="4"/>
    <g fill="#c9a43a">${[[134, 40], [138, 44], [136, 36], [140, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5"/>`).join('')}</g>
    <path d="M86 60 L68 50" stroke="#fbf8f0" stroke-width="4"/>`,

  // 再建: 焼け跡に新しい柱を立てる
  saiken: () => `
    <defs>${skyGradient('saiken-sky', '#8ab8d8', '#f2e6cc')}</defs>
    <rect width="${W}" height="${H}" fill="url(#saiken-sky)"/>
    <path d="M0 100 h200 v30 h-200z" fill="#8a7a5a"/>
    <g fill="#2b2014">${[[30, 100, 20], [44, 100, 12], [60, 100, 26]].map(([x, y, h]) => `<rect x="${x}" y="${y - h}" width="6" height="${h}"/>`).join('')}</g>
    <g stroke="#c8a870" stroke-width="5"><path d="M110 100 V40 M160 100 V40"/></g>
    <path d="M102 44 h66" stroke="#c8a870" stroke-width="5"/>
    <path d="M110 70 h50" stroke="#c8a870" stroke-width="3"/>
    <g fill="#5c3b22"><circle cx="134" cy="56" r="4"/><path d="M130 60 h8 l1 8 h-10z"/></g>
    <path d="M100 30 h70 l-6 -8 h-58z" fill="#5a4a3a" opacity=".5"/>`,

  // 護摩壇: 燃え盛る護摩の火
  gomadan: () => `
    ${washi('#2a1614', 'gomadan')}
    <rect y="100" width="${W}" height="30" fill="#4a2a20"/>
    <path d="M60 100 h80 l-6 -16 h-68z" fill="#6a4030"/>
    ${flame(100, 86, 1.4)}${flame(80, 88, 0.8)}${flame(120, 88, 0.8)}
    <g fill="#ffd36b" opacity=".7">${[[90, 30], [110, 22], [100, 14], [124, 36], [78, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>
    <g fill="#1d1010"><circle cx="34" cy="70" r="7"/><path d="M24 78 h20 l4 22 h-28z"/><circle cx="166" cy="70" r="7"/><path d="M156 78 h20 l4 22 h-28z"/></g>
    <circle cx="100" cy="70" r="40" fill="#e8603a" opacity=".1"/>`,

  // ---- 名のある武者 10人（共通の構図で、色と持ち物を変える）----
  bushi_tomoe: () => knightArt('tomoe', { armor: '#8e2418', sky: ['#5a2a3a', '#e8a088'], female: true, weapon: 'bow' }),
  bushi_hangaku: () => knightArt('hangaku', { armor: '#2f5a22', sky: ['#3a4a2a', '#d8c890'], female: true, weapon: 'naginata' }),
  bushi_tsuru: () => knightArt('tsuru', { armor: '#2c5a8a', sky: ['#2a4a6a', '#a8d0e0'], female: true, weapon: 'naginata', sea: true }),
  bushi_naotora: () => knightArt('naotora', { armor: '#b8322a', sky: ['#6a3a2a', '#f0c8a0'], female: true, weapon: 'katana' }),
  bushi_ginchiyo: () => knightArt('ginchiyo', { armor: '#5a5a6a', sky: ['#2a2a40', '#9090b0'], female: true, weapon: 'naginata', bolt: true }),
  bushi_tadakatsu: () => knightArt('tadakatsu', { armor: '#1d1d26', sky: ['#4a3a2a', '#e8c090'], weapon: 'yari', antlers: true }),
  bushi_yukimura: () => knightArt('yukimura', { armor: '#c0392b', sky: ['#5a1e14', '#f0a060'], weapon: 'yari', mon: 'rokumon' }),
  bushi_keiji: () => knightArt('keiji', { armor: '#8a2a8a', sky: ['#3a2a5a', '#e8b0d0'], weapon: 'yari', flamboyant: true }),
  bushi_kansuke: () => knightArt('kansuke', { armor: '#3a4a3a', sky: ['#2a3a3a', '#b0c0a8'], weapon: 'katana', patch: true }),
  bushi_kiyomasa: () => knightArt('kiyomasa', { armor: '#2b2b38', sky: ['#3a2a1a', '#e8d090'], weapon: 'yari', tallHelm: true }),
};

// 武者の肖像（共通の構図）。opts で鎧の色・空・武器・兜の飾りなどを変える
function knightArt(id, o) {
  const [top, bottom] = o.sky;
  const weapon = {
    yari: `<path d="M136 120 L150 14" stroke="#5c3b22" stroke-width="3"/><path d="M148 14 l3 -12 l3 12z" fill="#d8d8d8"/>`,
    naginata: `<path d="M136 120 L150 24" stroke="#5c3b22" stroke-width="3"/><path d="M149 26 q8 -14 2 -24 q-6 12 -6 22z" fill="#d8d8d8"/>`,
    katana: `<path d="M126 74 L170 30" stroke="#d8d8d8" stroke-width="3"/><path d="M122 78 l8 -8" stroke="#2b2014" stroke-width="5"/>`,
    bow: `<path d="M144 20 Q170 70 144 122" stroke="#5c3b22" stroke-width="3" fill="none"/><path d="M144 20 L144 122" stroke="#e8e0d0" stroke-width=".8"/>`,
  }[o.weapon];
  const helm = o.female
    ? `<path d="M84 42 q16 -20 32 0 v34 l-6 -8 v-22 h-20 v22 l-6 8z" fill="#1d1612"/><path d="M84 34 h32" stroke="#f6efe0" stroke-width="4"/>`
    : `<path d="M82 40 q18 -22 36 0 l4 6 h-44z" fill="#1d1d26"/>` +
      (o.antlers ? `<path d="M88 26 q-10 -10 -18 -4 M88 26 q-4 -14 -14 -14 M112 26 q10 -10 18 -4 M112 26 q4 -14 14 -14" stroke="#1d1612" stroke-width="3" fill="none"/>`
        : o.tallHelm ? `<path d="M88 24 L100 -4 L112 24z" fill="#1d1d26"/><circle cx="100" cy="14" r="4" fill="#e8e0d0"/>`
        : `<path d="M92 26 L84 8 M108 26 L116 8" stroke="#c9a43a" stroke-width="4"/>`);
  const extra = [
    o.mon === 'rokumon' ? `<g fill="#1d1612">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${92 + (i % 3) * 8}" cy="${80 + Math.floor(i / 3) * 8}" r="3"/>`).join('')}</g>` : '',
    o.patch ? `<path d="M92 50 h8 M92 50 l-6 -4" stroke="#1d1612" stroke-width="3"/>` : '',
    o.flamboyant ? `<g fill="#c9a43a">${[[90, 82], [110, 90], [96, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g><path d="M80 66 q-20 -10 -30 10" stroke="#e8b0d0" stroke-width="4" fill="none"/>` : '',
    o.bolt ? `<path d="M40 10 l-10 24 h10 l-8 22" stroke="#f6e070" stroke-width="3" fill="none"/>` : '',
  ].join('');
  return `
    <defs>${skyGradient(`kn-${id}`, top, bottom)}</defs>
    <rect width="${W}" height="${H}" fill="url(#kn-${id})"/>
    ${o.sea ? `<path d="M0 96 Q50 90 100 96 T200 94 V130 H0z" fill="#2c4a6a"/>` : `<path d="M0 100 Q100 90 200 102 V130 H0Z" fill="#2b2014"/>`}
    ${banner(30, 20, o.armor, 46)}
    ${weapon}
    <circle cx="100" cy="52" r="10" fill="#e8c8a0"/>
    ${helm}
    <path d="M76 66 h48 l8 54 h-64z" fill="${o.armor}"/>
    <g stroke="#e8c070" stroke-width="1" opacity=".8">${[76, 86, 96, 106].map(y => `<path d="M${74 + (y - 66) / 7} ${y} h${52 - (y - 66) / 4}"/>`).join('')}</g>
    <path d="M70 66 q-6 14 0 26 M130 66 q6 14 0 26" stroke="${o.armor}" stroke-width="10" fill="none"/>
    ${extra}`;
}
