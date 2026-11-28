// 牌の表記と変換。DOM は使わない（テストからも使う）。
// 表記: '1m'〜'9m'（萬子）'1p'〜'9p'（筒子）'1s'〜'9s'（索子）'1z'〜'7z'（東南西北白發中）
// 添字: 萬子 0〜8、筒子 9〜17、索子 18〜26、字牌 27〜33

export const SUITS = ['m', 'p', 's', 'z'];
export const SUIT_NAME = { m: '萬子', p: '筒子', s: '索子', z: '字牌' };
export const HONOR_NAME = ['東', '南', '西', '北', '白', '發', '中'];
const KANJI_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const ALL_TILES = [];
for (const s of SUITS) for (let n = 1; n <= (s === 'z' ? 7 : 9); n++) ALL_TILES.push(`${n}${s}`);

export function toIndex(tile) {
  const n = Number(tile[0]);
  const s = tile[1];
  const base = SUITS.indexOf(s);
  if (!/^[1-9][mpsz]$/.test(tile) || (s === 'z' && n > 7)) throw new Error(`牌の表記が正しくありません: ${tile}`);
  return base * 9 + n - 1;
}
export function fromIndex(i) { return ALL_TILES[i]; }

export const isHonor = i => i >= 27;
export const isTerminal = i => i < 27 && (i % 9 === 0 || i % 9 === 8);
export const isYaochu = i => isHonor(i) || isTerminal(i);
export const isDragon = i => i >= 31;
export const isWind = i => i >= 27 && i <= 30;
export const suitOf = i => SUITS[Math.floor(i / 9)];
export const numOf = i => (i % 9) + 1;

// '123m456p11z' → ['1m','2m','3m','4p','5p','6p','1z','1z']。空白は無視
export function parse(str) {
  const out = [];
  let digits = '';
  for (const ch of str.replace(/\s+/g, '')) {
    if (/[0-9]/.test(ch)) digits += ch;
    else if (SUITS.includes(ch)) {
      if (!digits) throw new Error(`数字のない牌の表記: ${str}`);
      for (const d of digits) { const t = `${d}${ch}`; toIndex(t); out.push(t); }
      digits = '';
    } else throw new Error(`牌の表記が正しくありません: ${str}`);
  }
  if (digits) throw new Error(`種類のない数字: ${str}`);
  return out;
}

// ['1m','2m',...] → '12m...' の短い表記
export function stringify(tiles) {
  let out = '';
  for (const s of SUITS) {
    const ns = sortTiles(tiles).filter(t => t[1] === s).map(t => t[0]).join('');
    if (ns) out += ns + s;
  }
  return out;
}

export function sortTiles(tiles) { return [...tiles].sort((a, b) => toIndex(a) - toIndex(b)); }

export function toCounts(tiles) {
  const c = new Array(34).fill(0);
  for (const t of tiles) c[toIndex(t)]++;
  return c;
}

// ドラ表示牌の次の牌がドラ（9の次は1、北の次は東、中の次は白）
export function doraFromIndicator(tile) {
  const i = toIndex(tile);
  if (i < 27) return fromIndex(Math.floor(i / 9) * 9 + ((i % 9) + 1) % 9);
  if (i <= 30) return fromIndex(27 + ((i - 27 + 1) % 4));
  return fromIndex(31 + ((i - 31 + 1) % 3));
}

// 画面に出す名前。例: '5m' → '五萬'、'3p' → '三筒'、'6z' → '發'
export function tileName(tile) {
  const i = toIndex(tile);
  if (isHonor(i)) return HONOR_NAME[i - 27];
  const suit = { m: '萬', p: '筒', s: '索' }[tile[1]];
  return KANJI_NUM[numOf(i) - 1] + suit;
}
// 読み方（ふりがな）
const NUM_YOMI = ['イー', 'リャン', 'サン', 'スー', 'ウー', 'ロー', 'チー', 'パー', 'キュー'];
const SUIT_YOMI = { m: 'マン', p: 'ピン', s: 'ソー' };
const HONOR_YOMI = ['トン', 'ナン', 'シャー', 'ペー', 'ハク', 'ハツ', 'チュン'];
export function tileYomi(tile) {
  const i = toIndex(tile);
  if (isHonor(i)) return HONOR_YOMI[i - 27];
  return NUM_YOMI[numOf(i) - 1] + SUIT_YOMI[tile[1]];
}
export const WIND_NAME = { '1z': '東', '2z': '南', '3z': '西', '4z': '北' };
