// 和了の形の判定・面子への分解・向聴数・待ち。牌は 34 種の枚数の配列で扱う。
import { isYaochu, toCounts, fromIndex, toIndex } from './tiles.js';

const YAOCHU = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

// 手の内の牌（counts）を「雀頭1つ + 面子 sets 個」に分ける方法をすべて返す。
// 面子は { type: 'shuntsu' | 'koutsu', tile: 添字（順子は一番小さい牌） }
export function decompose(counts, sets = 4) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== sets * 3 + 2) return [];
  const results = [];
  const seen = new Set();
  for (let p = 0; p < 34; p++) {
    if (counts[p] < 2) continue;
    const c = counts.slice();
    c[p] -= 2;
    for (const blocks of splitSets(c, 0)) {
      const key = p + ':' + blocks.map(b => b.type[0] + b.tile).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ pair: p, sets: blocks });
    }
  }
  return results;
}

function splitSets(c, i) {
  while (i < 34 && c[i] === 0) i++;
  if (i >= 34) return [[]];
  const out = [];
  if (c[i] >= 3) {
    c[i] -= 3;
    for (const rest of splitSets(c, i)) out.push([{ type: 'koutsu', tile: i }, ...rest]);
    c[i] += 3;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--; c[i + 1]--; c[i + 2]--;
    for (const rest of splitSets(c, i)) out.push([{ type: 'shuntsu', tile: i }, ...rest]);
    c[i]++; c[i + 1]++; c[i + 2]++;
  }
  return out;
}

export function isChiitoi(counts) {
  return counts.reduce((a, b) => a + b, 0) === 14 && counts.filter(n => n === 2).length === 7;
}
export function isKokushi(counts) {
  return counts.reduce((a, b) => a + b, 0) === 14 && YAOCHU.every(i => counts[i] >= 1)
    && YAOCHU.some(i => counts[i] === 2) && counts.every((n, i) => n === 0 || isYaochu(i));
}

// 和了の形か（鳴き面子 meldCount 個を除いた手の内で判定）
export function isAgari(counts, meldCount = 0) {
  if (decompose(counts, 4 - meldCount).length) return true;
  if (meldCount === 0 && (isChiitoi(counts) || isKokushi(counts))) return true;
  return false;
}

// 向聴数（-1 = 和了、0 = テンパイ）。手の内は 3n+1 枚か 3n+2 枚
export function shanten(counts, meldCount = 0) {
  let best = normalShanten(counts, meldCount);
  if (meldCount === 0) best = Math.min(best, chiitoiShanten(counts), kokushiShanten(counts));
  return best;
}

export function chiitoiShanten(counts) {
  const pairs = counts.filter(n => n >= 2).length;
  const kinds = counts.filter(n => n >= 1).length;
  return 6 - pairs + Math.max(0, 7 - kinds);
}
export function kokushiShanten(counts) {
  const kinds = YAOCHU.filter(i => counts[i] >= 1).length;
  const pair = YAOCHU.some(i => counts[i] >= 2) ? 1 : 0;
  return 13 - kinds - pair;
}

export function normalShanten(counts, meldCount = 0) {
  const c = counts.slice();
  let best = 8;
  const need = 4 - meldCount;
  const scan = (i, m, t, pair) => {
    while (i < 34 && c[i] === 0) i++;
    if (i >= 34) {
      const tt = Math.min(t, need - m);
      const s = 8 - 2 * (m + meldCount) - tt - pair;
      if (s < best) best = s;
      return;
    }
    if (c[i] >= 3) { c[i] -= 3; scan(i, m + 1, t, pair); c[i] += 3; }
    if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) {
      c[i]--; c[i + 1]--; c[i + 2]--; scan(i, m + 1, t, pair); c[i]++; c[i + 1]++; c[i + 2]++;
    }
    if (c[i] >= 2) {
      c[i] -= 2;
      if (!pair) scan(i, m, t, 1);
      if (m + t < need) scan(i, m, t + 1, pair);
      c[i] += 2;
    }
    if (m + t < need && i < 27) {
      if (i % 9 <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; scan(i, m, t + 1, pair); c[i]++; c[i + 1]++; }
      if (i % 9 <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; scan(i, m, t + 1, pair); c[i]++; c[i + 2]++; }
    }
    // 孤立牌として外す
    c[i]--; scan(i, m, t, pair); c[i]++;
  };
  scan(0, 0, 0, 0);
  return best;
}

// テンパイしている手（3n+1 枚）の待ち牌の表記を返す。手の内で4枚使っている牌は待ちにしない
export function waits(counts, meldCount = 0) {
  const out = [];
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 4) continue;
    counts[i]++;
    if (isAgari(counts, meldCount)) out.push(fromIndex(i));
    counts[i]--;
  }
  return out;
}

// 14 枚の手から1枚切ったとき、向聴数ごとにどれを切るとよいか（解説用）
// 返り値: [{ tile, shanten, waits（テンパイなら） }]
export function discardOptions(tiles, meldCount = 0) {
  const counts = toCounts(tiles);
  const out = [];
  for (const t of [...new Set(tiles)]) {
    const i = toIndex(t);
    counts[i]--;
    const s = shanten(counts, meldCount);
    out.push({ tile: t, shanten: s, waits: s === 0 ? waits(counts, meldCount) : [] });
    counts[i]++;
  }
  return out.sort((a, b) => a.shanten - b.shanten || toIndex(a.tile) - toIndex(b.tile));
}
