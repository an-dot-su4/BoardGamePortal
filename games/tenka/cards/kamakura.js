// 鎌倉「御恩と奉公」: 持続（次の手番にも効く）
// next(e) を持つ札は持続札。使った手番のあとも場に残り、次の手番の最初に next が実行される。
import { CARDS } from './index.js';

const cardName = id => CARDS[id].name;

export const KAMAKURA = {
  monomi: {
    name: '物見櫓',
    cost: 2,
    types: ['action', 'duration'],
    protect: true,
    text: '+1行動\n+1文\n次の手番: +1文\nこの札が場にある間、ほかの人の攻撃を受けない。',
    play(e) {
      e.actions(1);
      e.coins(1);
    },
    next(e) {
      e.coins(1);
    },
  },
  shugo: {
    name: '守護',
    cost: 2,
    types: ['action', 'duration'],
    text: '+1札\n+1行動\n手札を1枚脇に置く。次の手番: その札を手札に加える。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '次の手番まで預ける札を選ぶ' }, 'keep');
    },
    steps: {
      keep(e, ids) {
        if (!ids.length) return;
        e.g.ps[e.p].hand.splice(e.g.ps[e.p].hand.indexOf(ids[0]), 1);
        e.durEntry().held.push(ids[0]);
      },
    },
    next(e) {
      e.g.ps[e.p].hand.push(...e.entry.held);
      e.entry.held = [];
    },
  },
  ryoshi: {
    name: '漁師町',
    cost: 3,
    types: ['action', 'duration'],
    text: '+2行動\n+1文\n次の手番: +1行動 +1文',
    play(e) {
      e.actions(2);
      e.coins(1);
    },
    next(e) {
      e.actions(1);
      e.coins(1);
    },
  },
  hikitsuke: {
    name: '引付',
    cost: 3,
    types: ['action'],
    text: '+3札\n+1行動\n手札を3枚捨てる。',
    play(e) {
      e.draw(3);
      e.actions(1);
      e.ask({ kind: 'hand', min: 3, max: 3, title: '捨てる札を3枚選ぶ' }, 'discard');
    },
    steps: {
      discard(e, ids) {
        e.discard(ids);
      },
    },
  },
  mihari: {
    name: '見張り',
    cost: 3,
    types: ['action'],
    text: '+1行動\n山札の上から3枚を見て、1枚を廃棄、1枚を捨て札にし、残りを山札の上に戻す。',
    play(e) {
      e.actions(1);
      const ps = e.g.ps[e.p];
      // 山札が足りなければ捨て札を混ぜてから見る
      const seen = e.draw(3);
      for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.look.push(...seen);
      e.ask({ kind: 'list', cards: ps.look.slice(), min: 1, max: 1, title: '見張り: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, id) {
        const ps = e.g.ps[e.p];
        if (id) {
          ps.look.splice(ps.look.indexOf(id), 1);
          e.g.trash.push(id);
          e.log(`${e.name()}: 見張りで${cardName(id)}を廃棄`);
        }
        e.ask({ kind: 'list', cards: ps.look.slice(), min: 1, max: 1, title: '見張り: 捨て札にする札を選ぶ（残りは山札の上へ）' }, 'discard');
      },
      discard(e, id) {
        const ps = e.g.ps[e.p];
        if (id) {
          ps.look.splice(ps.look.indexOf(id), 1);
          ps.discard.push(id);
        }
        ps.deck.push(...ps.look);
        ps.look = [];
      },
    },
  },
  gokenin: {
    name: '御家人',
    cost: 4,
    types: ['action', 'duration'],
    text: '+1札\n+1行動\n次の手番: +1札',
    play(e) {
      e.draw(1);
      e.actions(1);
    },
    next(e) {
      e.draw(1);
    },
  },
  akutou: {
    name: '悪党',
    cost: 4,
    types: ['action', 'attack'],
    text: '+2文\nほかの全員は、手札の銅銭を1枚捨てる（無ければ手札を見せる）。',
    play(e) {
      e.coins(2);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const hand = e.hand(e.target);
        if (hand.includes('zeni')) {
          e.discard(['zeni'], e.target);
          e.log(`${e.name(e.target)}: 銅銭を1枚取られた`);
        } else {
          e.log(`${e.name(e.target)}: 銅銭なし（手札: ${hand.map(cardName).join('・') || 'なし'}）`);
        }
      },
    },
  },
  sousen: {
    name: '宋銭船',
    cost: 5,
    types: ['action', 'duration'],
    text: '+2文\n次の手番: +2文',
    play(e) {
      e.coins(2);
    },
    next(e) {
      e.coins(2);
    },
  },
  toimaru: {
    name: '問丸',
    cost: 5,
    types: ['action', 'duration'],
    text: '+2札\n+1購入\n次の手番: +2札 +1購入',
    play(e) {
      e.draw(2);
      e.buys(1);
    },
    next(e) {
      e.draw(2);
      e.buys(1);
    },
  },
  genkou: {
    name: '元寇',
    cost: 5,
    types: ['action', 'attack'],
    text: '+2札\nほかの全員は、手札が4枚以上なら、3枚になるまで手札を山札の上に置く。',
    play(e) {
      e.draw(2);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const n = e.hand(e.target).length - 3;
        if (n > 0) e.ask({ p: e.target, kind: 'hand', min: n, max: n, title: `元寇: 手札を${n}枚、山札の上に置く` }, 'top');
      },
      top(e, ids) {
        const ps = e.g.ps[e.target];
        for (const id of ids) ps.hand.splice(ps.hand.indexOf(id), 1);
        ps.deck.push(...ids);
        e.log(`${e.name(e.target)}: ${ids.length}枚を山札の上へ`);
      },
    },
  },
  shikken: {
    name: '執権',
    cost: 5,
    types: ['action', 'duration'],
    text: '手札をすべて捨てる。そうしたら次の手番: +5札 +1行動 +1購入',
    play(e) {
      const ps = e.g.ps[e.p];
      const n = ps.hand.length;
      e.durEntry().data.active = n > 0;
      ps.discard.push(...ps.hand);
      ps.hand = [];
      if (n) e.log(`${e.name()}: 手札${n}枚を捨てて次の手番に備える`);
    },
    next(e) {
      if (!e.entry.data.active) return;
      e.draw(5);
      e.actions(1);
      e.buys(1);
    },
  },
  monzen: {
    name: '門前町',
    cost: 5,
    types: ['action'],
    text: '+1札\n+2行動\n+1文',
    play(e) {
      e.draw(1);
      e.actions(2);
      e.coins(1);
    },
  },
};

