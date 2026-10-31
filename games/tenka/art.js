// カードのイラスト（SVG）。すべてこのファイルの中で描いている定数で、ユーザー入力は含まない。
// 画面の枠は 200×130。和紙風の地に、平面的な図柄（浮世絵・家紋のような塗り分け）で描く。
//
// 第1段階では見本の6枚だけ描き込み、ほかの札は「札の名前の一文字」を家紋風に描いた仮の絵にする。

const W = 200;
const H = 130;

// 和紙の地（色と、繊維の細い線）
function washi(color, id) {
  let fibers = '';
  let seed = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = 6 + rnd() * 18;
    const a = rnd() * Math.PI;
    fibers += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}" />`;
  }
  return `<rect width="${W}" height="${H}" fill="${color}"/><g stroke="#fff" stroke-opacity=".28" stroke-width=".7" fill="none">${fibers}</g>`;
}

// 浮世絵の空のぼかし（上が濃い）
function skyGradient(id, top, bottom) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
}

const ART = {
  // 銅銭: 穴あき銭と、紐に通した銭の束
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

  // 国: 朝日・山並み・川・田んぼ
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

  // 里: 茅葺きの家と煙、木と小道
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

  // 写経所: 文机、広げた経巻、筆と硯、灯明
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

  // 検非違使: 烏帽子に弓、追い立てられて舞い散る札（攻撃）
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

  // 結界: 注連縄と紙垂、光る結界に矢がはじかれる（守り）
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
};

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
