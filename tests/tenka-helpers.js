// 天下札のテスト共通
import * as T from '../games/tenka/logic.js';

// 場にあるカードの総数（各人の札＋廃棄＋供給）。獲得・廃棄以外で増減しないことを確かめる
export function totalCards(g) {
  let n = g.trash.length + Object.values(g.supply).reduce((a, b) => a + b, 0);
  for (const p of g.players) n += T.allCards(g, p).length;
  return n;
}
