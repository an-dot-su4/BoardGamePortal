// 室町「財宝と文化」: 大判・御所（高額の基本札）、名声（勝利点トークン）、購入時の効果
//   whileInPlay.onBuy(ctx, id): この札が場にある間、札を買うたびに起きること
//   canBuy(g, pid): false ならこの札は買えない
//   kingdom: false の札は王国カードではない（大判・御所。室町の札が多いと供給に加わる）
//   steps.onBuy: この札を買ったときの効果 / steps.react: 獲得したときの反応（engine の place から呼ばれる）
//   本家の「繁栄」（初版）と同じ25種
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
          const fame = Math.floor(e.cost(ids[0]) / 2);
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
      const seen = [];
      for (;;) {
        const [id] = e.draw(1);
        if (!id) break;
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        if (isType(id, 'treasure')) {
          for (const x of seen) ps.look.splice(ps.look.indexOf(x), 1);
          ps.discard.push(...seen);
          ps.play.push(id);
          e.coins(CARDS[id].coin ?? 0);
          e.log(`${e.name()}: 勘合船で${cardName(id)}を得た`);
          if (CARDS[id].play) e.play(id);
          return;
        }
        ps.look.push(id);
        seen.push(id);
      }
      for (const x of seen) ps.look.splice(ps.look.indexOf(x), 1);
      ps.discard.push(...seen);
    },
  },
  shugodaimyo: {
    name: '守護大名',
    cost: 5,
    types: ['action', 'attack'],
    text: '+2文\nほかの全員は、手札の祟りを1枚捨ててもよい。捨てなかった人は、祟りと銅銭を1枚ずつ獲得する。',
    giver: ['tatari'],
    play(e) {
      e.coins(2);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        if (!e.hand(e.target).includes('tatari')) return e.step('punish');
        e.ask({ kind: 'option', title: '守護大名: 手札の祟りを1枚捨てる？（捨てないと祟りと銅銭を獲得）', options: [{ value: 'yes', label: '祟りを捨てる' }, { value: 'no', label: '捨てない' }] }, 'answer');
      },
      answer(e, choice) {
        if (choice === 'yes') {
          e.discard(['tatari'], e.target);
          e.log(`${e.name(e.target)}: 祟りを差し出した`);
          return;
        }
        e.step('punish');
      },
      punish(e) {
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
    text: '+2札\n手札を好きな枚数捨て、1枚につき+1文。ほかの全員は、手札を2枚捨ててもよい。捨てたら1枚引く。',
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
        if (!e.hand(e.target).length) return;
        e.ask({ p: e.target, kind: 'option', title: '蔵元: 手札を2枚捨てて1枚引く？', options: [{ value: 'yes', label: '2枚捨てて1枚引く' }, { value: 'no', label: 'しない' }] }, 'agree');
      },
      agree(e, choice) {
        if (choice !== 'yes') return;
        e.ask({ p: e.target, kind: 'hand', min: 2, max: 2, title: '蔵元: 捨てる札を2枚選ぶ' }, 'swap');
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
    text: '+1購入\n+2文\nほかの全員は、手札が3枚になるまで捨てる。この札が場にある間、札を買うたびに+1名声。',
    play(e) {
      e.buys(1);
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

  // ---- 繁栄（初版）の残り13種 ----
  kashiage: {
    name: '借上',
    cost: 3,
    types: ['treasure'],
    coin: 1,
    text: '+1文\n山札から財宝が出るまでめくる。その財宝は捨てるか廃棄する。ほかにめくった札は捨てる。',
    play(e) {
      const ps = e.g.ps[e.p];
      for (;;) {
        const [id] = e.draw(1);
        if (!id) break;
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.look.push(id);
        if (isType(id, 'treasure')) {
          e.ask({ kind: 'option', title: `借上: めくった${cardName(id)}をどうする？`, options: [{ value: 'trash', label: '廃棄する' }, { value: 'discard', label: '捨てる' }] }, 'decide', { card: id });
          return;
        }
      }
      e.step('rest');
    },
    steps: {
      decide(e, choice) {
        const ps = e.g.ps[e.p];
        const id = e.data.card;
        ps.look.splice(ps.look.lastIndexOf(id), 1);
        if (choice === 'trash') {
          e.trashCard(id);
          e.log(`${e.name()}: 借上で${cardName(id)}を廃棄`);
        } else ps.discard.push(id);
        e.step('rest');
      },
      rest(e) {
        const ps = e.g.ps[e.p];
        ps.discard.push(...ps.look);
        ps.look = [];
      },
    },
  },
  bashaku: {
    name: '馬借',
    cost: 3,
    types: ['action'],
    tradeRoute: true,
    text: '+1購入\n馬借のマットの印1つにつき+1文。手札を1枚廃棄する。\n（準備: 勝利点の各山に印を置く。その山から初めて札が獲得されたら、印がマットへ移る）',
    play(e) {
      e.buys(1);
      const n = e.g.tradeRoute?.mat ?? 0;
      e.coins(n);
      if (n) e.log(`${e.name()}: 馬借で+${n}文`);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '馬借: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
      },
    },
  },
  bansho: {
    name: '番所',
    cost: 3,
    types: ['action', 'reaction'],
    text: '手札が6枚になるまで引く。\n【反応】札を獲得したとき、手札のこの札を公開して、その札を廃棄するか山札の上に置いてもよい。',
    play(e) {
      const n = 6 - e.hand().length;
      if (n > 0) e.draw(n);
    },
    steps: {
      react(e) {
        const { id, to } = e.data;
        if (!e.hand().includes('bansho')) return;
        const ps = e.g.ps[e.p];
        const zone = to === 'hand' ? ps.hand : to === 'deck' ? ps.deck : ps.discard;
        if (!zone.includes(id)) return;
        e.ask({ kind: 'option', title: `番所: 獲得した${cardName(id)}をどうする？`, options: [{ value: 'trash', label: '廃棄する' }, { value: 'deck', label: '山札の上に置く' }, { value: 'no', label: 'そのまま' }] }, 'decide');
      },
      decide(e, choice) {
        const { id, to } = e.data;
        if (choice === 'no' || !e.takeGained(id, to)) return;
        if (choice === 'trash') {
          e.trashCard(id);
          e.log(`${e.name()}: 番所で${cardName(id)}を廃棄`);
        } else {
          e.g.ps[e.p].deck.push(id);
          e.log(`${e.name()}: 番所で${cardName(id)}を山札の上へ`);
        }
      },
    },
  },
  ishikiri: {
    name: '石切場',
    cost: 4,
    types: ['treasure'],
    coin: 1,
    text: '+1文\nこの札が場にある間、行動札のコストは2少ない（0未満にはならない）。',
  },
  omamori: {
    name: 'お守り',
    cost: 4,
    types: ['treasure'],
    coin: 1,
    text: '+1文\nこの札が場にある間、コスト4以下の勝利点でない札を買うたびに、同じ札を1枚獲得する。',
    whileInPlay: {
      onBuy(x, id) {
        if (!isType(id, 'victory') && x.cost(id) <= 4 && x.gain(id)) x.log(`${x.name}: お守りで${cardName(id)}をもう1枚`);
      },
    },
  },
  shichusen: {
    name: '私鋳銭',
    cost: 5,
    types: ['treasure'],
    coin: 3,
    text: '+3文\n+1購入\n左の人が札の名前を1つ言う。この手番、あなたはその札を買えない。',
    play(e) {
      e.buys(1);
      const left = e.others()[0];
      e.ask({ p: left, kind: 'name', min: 1, max: 1, title: `私鋳銭: ${e.name()} がこの手番に買えない札を1つ選ぶ` }, 'ban');
    },
    steps: {
      ban(e, id) {
        if (!id) return;
        (e.g.turn.banned ??= []).push(id);
        e.log(`${e.name()}: この手番は${cardName(id)}を買えない（私鋳銭）`);
      },
    },
  },
  kanjou: {
    name: '勘定所',
    cost: 5,
    types: ['action'],
    text: '捨て札を見て、その中の銅銭を好きな枚数公開し、手札に加える。',
    play(e) {
      const n = e.g.ps[e.p].discard.filter(id => id === 'zeni').length;
      if (!n) return;
      e.ask({ kind: 'option', title: '勘定所: 捨て札の銅銭を何枚手札に加える？', options: Array.from({ length: n + 1 }, (_, k) => ({ value: n - k, label: `${n - k}枚` })) }, 'take');
    },
    steps: {
      take(e, n) {
        const ps = e.g.ps[e.p];
        for (let i = 0; i < n; i++) {
          ps.discard.splice(ps.discard.lastIndexOf('zeni'), 1);
          ps.hand.push('zeni');
        }
        if (n) e.log(`${e.name()}: 勘定所で銅銭${n}枚を手札に`);
      },
    },
  },
  chuusen: {
    name: '鋳銭所',
    cost: 5,
    types: ['action'],
    text: '手札の財宝を1枚公開してもよい。公開したら、同じ札を1枚獲得する。\nこの札を買ったとき、場にある財宝をすべて廃棄してもよい。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['treasure'], title: '鋳銭所: 同じ札を獲得する財宝を選ぶ（選ばなくてもよい）' }, 'copy');
    },
    steps: {
      copy(e, ids) {
        if (ids.length && e.gain(ids[0])) e.log(`${e.name()}: 鋳銭所で${cardName(ids[0])}を鋳造`);
      },
      onBuy(e) {
        if (!e.g.ps[e.p].play.some(id => isType(id, 'treasure'))) return;
        e.ask({ kind: 'option', title: '鋳銭所を買った: 場の財宝をすべて廃棄する？', options: [{ value: 'yes', label: 'すべて廃棄する' }, { value: 'no', label: 'しない' }] }, 'melt');
      },
      melt(e, choice) {
        if (choice !== 'yes') return;
        const ps = e.g.ps[e.p];
        const gone = ps.play.filter(id => isType(id, 'treasure'));
        ps.play = ps.play.filter(id => !isType(id, 'treasure'));
        for (const id of gone) e.trashCard(id);
        e.log(`${e.name()}: 場の財宝${gone.length}枚を鋳つぶした`);
      },
    },
  },
  tsuchiikki: {
    name: '土一揆',
    cost: 5,
    types: ['action', 'attack'],
    text: '+3札\nほかの全員は山札の上から3枚を公開し、行動札と財宝を捨て、残りを好きな順で山札の上に戻す。',
    play(e) {
      e.draw(3);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const ps = e.g.ps[e.target];
        const seen = e.draw(3, e.target);
        for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        const out = seen.filter(id => isType(id, 'action') || isType(id, 'treasure'));
        ps.discard.push(...out);
        const keep = seen.slice();
        for (const id of out) keep.splice(keep.indexOf(id), 1);
        ps.look.push(...keep);
        e.log(`${e.name(e.target)}: 土一揆で${seen.map(cardName).join('・') || '（なし）'}を公開`);
        if (keep.length) e.orderOntoDeck(e.target);
      },
    },
  },
  goshuin: {
    name: '御朱印',
    cost: 5,
    types: ['treasure'],
    coin: 2,
    text: '+2文\nこの札が場にある間、札を獲得したとき、その札を山札の上に置いてもよい。',
    steps: {
      react(e) {
        const { id, to } = e.data;
        if (to === 'deck' || !e.g.ps[e.p].play.includes('goshuin')) return;
        const ps = e.g.ps[e.p];
        if (!(to === 'hand' ? ps.hand : ps.discard).includes(id)) return;
        e.ask({ kind: 'option', title: `御朱印: 獲得した${cardName(id)}を山札の上に置く？`, options: [{ value: 'yes', label: '山札の上に置く' }, { value: 'no', label: 'そのまま' }] }, 'decide');
      },
      decide(e, choice) {
        const { id, to } = e.data;
        if (choice !== 'yes' || !e.takeGained(id, to)) return;
        e.g.ps[e.p].deck.push(id);
      },
    },
  },
  fushin: {
    name: '普請',
    cost: 7,
    types: ['action'],
    text: '手札を1枚廃棄する。廃棄した札よりコストが3まで高い札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 1, max: 1, title: '普請: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        const max = e.cost(ids[0]) + 3;
        e.trash(ids);
        e.ask({ kind: 'supply', min: 1, maxCost: max, title: `普請: コスト${max}以下の札を獲得` }, 'gain', { from: ids[0] });
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(e.data.from)}を${cardName(id)}に普請`);
      },
    },
  },
  katanakaji: {
    name: '刀鍛冶',
    cost: 7,
    types: ['action'],
    text: '手札を好きな枚数廃棄する。廃棄した札のコストの合計とちょうど同じコストの札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 99, title: '刀鍛冶: 廃棄する札を選ぶ（コストの合計と同じコストの札を獲得）' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        const total = ids.reduce((a, id) => a + e.cost(id), 0);
        if (ids.length) e.trash(ids);
        e.ask({ kind: 'supply', min: 1, exactCost: total, title: `刀鍛冶: コストちょうど${total}の札を獲得` }, 'gain', { total });
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: 刀鍛冶で${cardName(id)}を鍛えた`);
      },
    },
  },
  gyoushou: {
    name: '行商人',
    cost: 8,
    types: ['action'],
    text: '+1札\n+1行動\n+1文\n購入フェーズの間、この札のコストは、あなたの場の行動札1枚につき2少ない（0未満にはならない）。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.coins(1);
    },
  },
};
