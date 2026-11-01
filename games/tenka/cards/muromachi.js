// 室町「財宝と文化」: 大判・御所（高額の基本札）、名声（勝利点トークン）、購入時の効果
//   whileInPlay.onBuy(ctx, id): この札が場にある間、札を買うたびに起きること
//   canBuy(g, pid): false ならこの札は買えない
//   kingdom: false の札は王国カードではない（大判・御所。室町の札が多いと供給に加わる）
import { CARDS } from './index.js';

const cardName = id => CARDS[id].name;
const isType = (id, t) => CARDS[id].types.includes(t);

export const MUROMACHI = {
  ohban: { name: '大判', cost: 9, types: ['treasure'], coin: 5, text: '+5文', kingdom: false },
  gosho: { name: '御所', cost: 11, types: ['victory'], vp: 10, text: '10点', kingdom: false },

  za: {
    name: '座',
    cost: 4,
    types: ['action'],
    text: '+1札\n+2行動\n+1購入',
    play(e) {
      e.draw(1);
      e.actions(2);
      e.buys(1);
    },
  },
  chanoyu: {
    name: '茶の湯',
    cost: 4,
    types: ['action'],
    text: '+2文\n+1名声',
    play(e) {
      e.coins(2);
      e.fame(1);
    },
  },
  jisha: {
    name: '寺社造営',
    cost: 4,
    types: ['action'],
    text: '+1文\n+1名声\n手札を1枚廃棄し、そのコストの半分（切り捨て）の名声を得る。ほかの全員は手札を1枚廃棄してもよい。',
    play(e) {
      e.coins(1);
      e.fame(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '寄進する（廃棄する）札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (ids.length) {
          e.trash(ids);
          const fame = Math.floor(CARDS[ids[0]].cost / 2);
          e.fame(fame);
          e.log(`${e.name()}: ${cardName(ids[0])}を寄進して名声+${fame}`);
        }
        e.later(...e.others().map(o => ({ op: 'step', p: e.p, card: 'jisha', step: 'offer', data: {}, target: o })));
      },
      offer(e) {
        e.ask({ p: e.target, kind: 'hand', min: 0, max: 1, title: '寺社造営: 手札を1枚廃棄してもよい' }, 'otherTrash');
      },
      otherTrash(e, ids) {
        if (!ids.length) return;
        e.trash(ids, e.target);
        e.log(`${e.name(e.target)}: ${cardName(ids[0])}を寄進`);
      },
    },
  },
  kangou: {
    name: '勘合船',
    cost: 5,
    types: ['treasure'],
    coin: 1,
    text: '+1文\n山札から財宝が出るまでめくり、その財宝を使う。ほかにめくった札は捨てる。',
    play(e) {
      const ps = e.g.ps[e.p];
      for (;;) {
        const [id] = e.draw(1);
        if (!id) return;
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        if (isType(id, 'treasure')) {
          ps.play.push(id);
          e.coins(CARDS[id].coin ?? 0);
          e.log(`${e.name()}: 勘合船で${cardName(id)}を得た`);
          if (CARDS[id].play) e.play(id);
          return;
        }
        ps.discard.push(id);
      }
    },
  },
  shugodaimyo: {
    name: '守護大名',
    cost: 5,
    types: ['action', 'attack'],
    text: '+2文\nほかの全員は、手札の祟りを1枚捨てる。捨てなかった人は、祟りと銅銭を1枚ずつ獲得する。',
    giver: ['tatari'],
    play(e) {
      e.coins(2);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        if (e.hand(e.target).includes('tatari')) {
          e.discard(['tatari'], e.target);
          e.log(`${e.name(e.target)}: 祟りを差し出した`);
          return;
        }
        e.gain('tatari', e.target);
        e.gain('zeni', e.target);
        e.log(`${e.name(e.target)}: 祟りと銅銭を押しつけられた`);
      },
    },
  },
  machishu: {
    name: '町衆',
    cost: 5,
    types: ['action'],
    text: '+1札\n+2行動\n空の山が1つ以上なら +1札。2つ以上なら、さらに +1文 +1購入。',
    play(e) {
      const empty = Object.values(e.g.supply).filter(n => n === 0).length;
      e.draw(empty >= 1 ? 2 : 1);
      e.actions(2);
      if (empty >= 2) {
        e.coins(1);
        e.buys(1);
      }
    },
  },
  kuramoto: {
    name: '蔵元',
    cost: 5,
    types: ['action'],
    text: '+2札\n手札を好きな枚数捨て、1枚につき+1文。ほかの全員は、手札を2枚捨てて1枚引いてもよい。',
    play(e) {
      e.draw(2);
      e.ask({ kind: 'hand', min: 0, max: 99, title: '捨てる札を選ぶ（1枚につき+1文）' }, 'sell');
    },
    steps: {
      sell(e, ids) {
        e.discard(ids);
        e.coins(ids.length);
        e.later(...e.others().map(o => ({ op: 'step', p: e.p, card: 'kuramoto', step: 'offer', data: {}, target: o })));
      },
      offer(e) {
        if (e.hand(e.target).length < 2) return;
        e.ask({ p: e.target, kind: 'hand', min: 0, max: 2, title: '蔵元: 2枚捨てれば1枚引ける（捨てないなら0枚で決定）' }, 'swap');
      },
      swap(e, ids) {
        e.discard(ids, e.target);
        if (ids.length === 2) e.draw(1, e.target);
      },
    },
  },
  nougaku: {
    name: '能楽',
    cost: 6,
    types: ['action'],
    text: '+1札\n+1行動\n+1購入\n+2文\n場に銅銭があると、この札は買えない。',
    canBuy: (g, pid) => !g.ps[pid].play.includes('zeni'),
    play(e) {
      e.draw(1);
      e.actions(1);
      e.buys(1);
      e.coins(2);
    },
  },
  sakaya: {
    name: '酒屋',
    cost: 6,
    types: ['treasure'],
    coin: 2,
    text: '+2文\nこの札が場にある間、勝利点の札を買うたびに金を1枚獲得する。',
    whileInPlay: {
      onBuy(x, id) {
        if (isType(id, 'victory') && x.gain('kin')) x.log(`${x.name}: 酒屋の儲けで金を獲得`);
      },
    },
  },
  kinkaku: {
    name: '金閣',
    cost: 6,
    types: ['action', 'attack'],
    text: '+2文\nほかの全員は、手札が3枚になるまで捨てる。この札が場にある間、札を買うたびに+1名声。',
    play(e) {
      e.coins(2);
      e.attack('hit');
    },
    whileInPlay: {
      onBuy(x) {
        x.fame(1);
      },
    },
    steps: {
      hit(e) {
        const n = e.hand(e.target).length - 3;
        if (n > 0) e.ask({ p: e.target, kind: 'hand', min: n, max: n, title: `金閣: 手札を${n}枚捨てる` }, 'discard');
      },
      discard(e, ids) {
        e.discard(ids, e.target);
      },
    },
  },
  dosou: {
    name: '土倉',
    cost: 7,
    types: ['treasure'],
    coin: 0,
    text: '場にある財宝1枚につき+1文（この札も数える）。',
    play(e) {
      const n = e.g.ps[e.p].play.filter(id => isType(id, 'treasure')).length;
      e.coins(n);
      e.log(`${e.name()}: 土倉で+${n}文`);
    },
  },
  shichifuku: {
    name: '七福神',
    cost: 7,
    types: ['action'],
    text: '手札の行動札を1枚選び、3回使う。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['action'], title: '3回使う行動札を選ぶ' }, 'pick');
    },
    steps: {
      pick(e, ids) {
        if (!ids.length) return;
        e.g.ps[e.p].hand.splice(e.g.ps[e.p].hand.indexOf(ids[0]), 1);
        e.g.ps[e.p].play.push(ids[0]);
        e.log(`${e.name()}: ${cardName(ids[0])}を3回使う`);
        e.play(ids[0], 3, { token: e.newToken(), card: 'shichifuku' });
      },
    },
  },
};
