// 江戸「町人文化」: 蓄え（小判のトークン。自分の手番に1枚につき+1文として使える）と過払い
//   onOverpay(x, n): 買うときに n 文多く払ったときの効果
//   startCoffers: この札が王国にあれば、全員が蓄えを持って始める
import { CARDS } from './index.js';

const cardName = id => CARDS[id].name;
const isType = (id, t) => CARDS[id].types.includes(t);

export const EDO = {
  shukuba: {
    name: '宿場町',
    cost: 2,
    types: ['action'],
    text: '+1行動\n+1購入\n+1蓄え',
    play(e) {
      e.actions(1);
      e.buys(1);
      e.coffers(1);
    },
  },
  touryou: {
    name: '棟梁',
    cost: 3,
    types: ['treasure'],
    coin: 1,
    text: '+1文\n買うとき、多く払ってもよい。多く払った1文につき銀を1枚獲得する。',
    onOverpay(x, n) {
      let got = 0;
      for (let i = 0; i < n; i++) if (x.gain('gin')) got++;
      if (got) x.log(`${x.name}: 棟梁に弟子入りした銀が${got}枚`);
    },
  },
  hikyaku: {
    name: '飛脚',
    cost: 4,
    types: ['action'],
    text: '+1購入\n+2文\n山札をすべて捨て札にしてもよい。',
    play(e) {
      e.buys(1);
      e.coins(2);
      if (!e.g.ps[e.p].deck.length) return;
      e.ask({ kind: 'option', title: '山札をすべて捨て札にする？', options: [{ value: 'yes', label: '捨て札にする' }, { value: 'no', label: 'そのまま' }] }, 'dump');
    },
    steps: {
      dump(e, choice) {
        if (choice !== 'yes') return;
        const ps = e.g.ps[e.p];
        ps.discard.push(...ps.deck);
        ps.deck = [];
      },
    },
  },
  yose: {
    name: '寄席',
    cost: 4,
    types: ['action'],
    text: '+1札\n+2行動\n手札の財宝を1枚捨ててもよい。そうしたら+1蓄え。',
    play(e) {
      e.draw(1);
      e.actions(2);
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['treasure'], title: '財宝を1枚捨てて+1蓄え？' }, 'tip');
    },
    steps: {
      tip(e, ids) {
        if (!ids.length) return;
        e.discard(ids);
        e.coffers(1);
      },
    },
  },
  kabuki: {
    name: '歌舞伎',
    cost: 4,
    types: ['action'],
    text: '+1行動\n山札の上から3枚を公開する。左隣の人がそのうち1枚を選んで捨て、残りはあなたの手札に。',
    play(e) {
      e.actions(1);
      const ps = e.g.ps[e.p];
      const seen = e.draw(3);
      for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.look.push(...seen);
      if (!seen.length) return;
      e.log(`${e.name()}: 歌舞伎で公開 ${seen.map(cardName).join('・')}`);
      const left = e.others()[0];
      e.ask({ p: left, kind: 'list', cards: seen, min: 1, max: 1, title: `歌舞伎: ${e.name()} の札から1枚を捨てさせる` }, 'pick');
    },
    steps: {
      pick(e, id) {
        const ps = e.g.ps[e.p];
        if (id) {
          ps.look.splice(ps.look.indexOf(id), 1);
          ps.discard.push(id);
        }
        ps.hand.push(...ps.look);
        ps.look = [];
      },
    },
  },
  bantou: {
    name: '番頭',
    cost: 4,
    types: ['action'],
    text: '+1札\n+1行動\n山札の一番上を公開し、行動札ならそれを使う。',
    play(e) {
      e.draw(1);
      e.actions(1);
      const ps = e.g.ps[e.p];
      const [top] = e.draw(1);
      if (!top) return;
      ps.hand.splice(ps.hand.lastIndexOf(top), 1);
      if (isType(top, 'action')) {
        ps.play.push(top);
        e.log(`${e.name()}: 番頭が${cardName(top)}を使う`);
        e.play(top);
      } else {
        ps.deck.push(top);
      }
    },
  },
  ryougae: {
    name: '両替商',
    cost: 5,
    types: ['action'],
    startCoffers: 1,
    text: '+1札\n+1行動\n+1蓄え\n（この札があるゲームでは、全員が蓄え1つで始める）',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.coffers(1);
    },
  },
  echigoya: {
    name: '越後屋',
    cost: 5,
    types: ['action'],
    text: '+2蓄え\n手札を1枚廃棄してもよい。そうしたら、蓄えをいくつ使うか決め、廃棄した札のコスト＋使った蓄え以下の札を獲得する。',
    play(e) {
      e.coffers(2);
      e.ask({ kind: 'hand', min: 0, max: 1, title: '越後屋: 廃棄して作り替える札を選ぶ（しないなら0枚で決定）' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        const have = e.g.ps[e.p].coffers;
        const options = Array.from({ length: have + 1 }, (_, n) => ({ value: n, label: `蓄えを${n}使う（コスト${CARDS[ids[0]].cost + n}まで）` }));
        e.ask({ kind: 'option', title: '越後屋: 蓄えをいくつ使う？', options }, 'spend', { from: ids[0] });
      },
      spend(e, n) {
        e.g.ps[e.p].coffers -= n;
        const max = CARDS[e.data.from].cost + n;
        e.ask({ kind: 'supply', min: 1, maxCost: max, title: `コスト${max}以下の札を獲得` }, 'gain', e.data);
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: 越後屋で${cardName(e.data.from)}を${cardName(id)}に`);
      },
    },
  },
  ukiyoe: {
    name: '浮世絵師',
    cost: 5,
    types: ['action'],
    text: '+1購入\n+1文\nこの札が場にある間、札を買うたびに+1蓄え。',
    play(e) {
      e.buys(1);
      e.coins(1);
    },
    whileInPlay: {
      onBuy(x) {
        x.coffers(1);
      },
    },
  },
  sankin: {
    name: '参勤交代',
    cost: 5,
    types: ['action', 'attack'],
    giver: ['tatari'],
    text: '金を1枚獲得する。ほかの全員は祟りを1枚獲得し、獲得した人は1枚引く。',
    play(e) {
      e.gain('kin');
      e.attack('hit');
    },
    steps: {
      hit(e) {
        if (!e.gain('tatari', e.target)) return;
        e.draw(1, e.target);
        e.log(`${e.name(e.target)}: 参勤交代の出費で祟られた（1枚引く）`);
      },
    },
  },
  senryou: {
    name: '千両箱',
    cost: 6,
    types: ['treasure'],
    coin: 2,
    text: '+2文\n+1蓄え',
    play(e) {
      e.coffers(1);
    },
  },
};
