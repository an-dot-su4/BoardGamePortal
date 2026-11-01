// 天下札のバランス確認: 各王国カードを軸にした CPU と、お金だけの CPU を2人で対戦させた勝率
//   node tools/tenka-balance.mjs [試合数=200]
import * as T from '../games/tenka/logic.js';
import { makeBot } from '../games/tenka/bot.js';
import { seededRng } from '../js/util.js';

const N = Number(process.argv[2] ?? 200);
const money = makeBot('money');
const rows = [];
for (const c of T.KINGDOM) {
  const fav = makeBot({ favorites: [c.id] });
  let wins = 0;
  let ties = 0;
  for (let i = 0; i < N; i++) {
    const rng = seededRng(i * 7919 + c.id.length);
    // 王国はその札＋同じ時代からランダム（その札が必ず入るようにおすすめなしで作り、入れ替える）
    const g = T.setup([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], rng, { sets: [c.set], bans: [] });
    if (!g.kingdom.includes(c.id)) {
      g.supply[c.id] = T.CARDS[c.id].types.includes('victory') ? 8 : 10;
      g.kingdom[0] = c.id;
    }
    const favId = i % 2 ? 'a' : 'b';
    const bots = { [favId]: fav, [favId === 'a' ? 'b' : 'a']: money };
    let steps = 0;
    while (g.phase === 'play' && steps++ < 30000) {
      const actor = g.players.find(p => bots[p](g, p, rng));
      T.act(g, actor, bots[actor](g, actor, rng), rng);
    }
    const r = g.result.find(x => x.id === favId);
    if (r.win && g.result.every(x => x.id === favId || !x.win)) wins++;
    else if (r.win) ties++;
  }
  rows.push({ set: c.set, id: c.id, name: c.name, rate: (wins + ties / 2) / N });
}
rows.sort((a, b) => b.rate - a.rate);
for (const r of rows) console.log(`${(r.rate * 100).toFixed(0).padStart(3)}%  ${r.name}（${r.set}）`);
