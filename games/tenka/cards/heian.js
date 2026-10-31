// 平安（基本セット）: 引く・行動を増やす・妨害・山札の圧縮。どのカードも1枚で意味が完結する
// 効果の組み立て方は ../engine.js の effectContext を参照
export const HEIAN = {
  kura: {
    name: '蔵',
    cost: 2,
    types: ['action'],
    text: '+1行動\n手札を好きな枚数捨て、捨てた枚数だけ引く。',
    play(e) {
      e.actions(1);
      e.ask({ kind: 'hand', min: 0, max: 99, title: '捨てる札を選ぶ（同じ枚数を引く）' }, 'swap');
    },
    steps: {
      swap(e, ids) {
        e.discard(ids);
        e.draw(ids.length);
        if (ids.length) e.log(`${e.name()}: ${ids.length}枚入れ替え`);
      },
    },
  },
  tera: {
    name: '寺',
    cost: 2,
    types: ['action'],
    text: '手札を4枚まで廃棄する。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 4, title: '廃棄する札を選ぶ（4枚まで）' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
        if (ids.length) e.log(`${e.name()}: ${ids.length}枚を寺に納めた（廃棄）`);
      },
    },
  },
  kekkai: {
    name: '結界',
    cost: 2,
    types: ['action', 'reaction'],
    reaction: 'block',
    text: '+2札\n【守り】ほかの人に攻撃されたとき、この札が手札にあれば攻撃を受けない。',
    play(e) {
      e.draw(2);
    },
  },
  sato: {
    name: '里',
    cost: 3,
    types: ['action'],
    text: '+1札\n+2行動',
    play(e) {
      e.draw(1);
      e.actions(2);
    },
  },
  koubou: {
    name: '工房',
    cost: 3,
    types: ['action'],
    text: 'コスト4以下の札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'supply', min: 1, maxCost: 4, title: 'コスト4以下の札を獲得' }, 'gain');
    },
    steps: {
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(id)}を獲得`);
      },
    },
  },
  gissha: {
    name: '牛車',
    cost: 3,
    types: ['action'],
    text: '+1購入\n+2文',
    play(e) {
      e.buys(1);
      e.coins(2);
    },
  },
  zouei: {
    name: '造営',
    cost: 4,
    types: ['action'],
    text: '手札を1枚廃棄し、そのコスト+2以下の札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 1, max: 1, title: '廃棄する札を選ぶ（コスト+2以下に作り替え）' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        const max = cardCost(ids[0]) + 2;
        e.ask({ kind: 'supply', min: 1, maxCost: max, title: `コスト${max}以下の札を獲得` }, 'gain', { from: ids[0] });
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(e.data.from)}を${cardName(id)}に作り替え`);
      },
    },
  },
  shakyo: {
    name: '写経所',
    cost: 4,
    types: ['action'],
    text: '+3札',
    play(e) {
      e.draw(3);
    },
  },
  kebiishi: {
    name: '検非違使',
    cost: 4,
    types: ['action', 'attack'],
    text: '+2文\nほかの全員は、手札が3枚になるまで捨てる。',
    play(e) {
      e.coins(2);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const n = e.hand(e.target).length - 3;
        if (n > 0) e.ask({ p: e.target, kind: 'hand', min: n, max: n, title: `検非違使: 手札を${n}枚捨てる` }, 'discard');
      },
      discard(e, ids) {
        e.discard(ids, e.target);
        e.log(`${e.name(e.target)}: ${ids.length}枚捨てた`);
      },
    },
  },
  kanekashi: {
    name: '金貸し',
    cost: 4,
    types: ['action'],
    text: '手札の銅銭を1枚廃棄してもよい。そうしたら+3文。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, ids: ['zeni'], title: '銅銭を廃棄して+3文？' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        e.coins(3);
      },
    },
  },
  gozen: {
    name: '御前',
    cost: 4,
    types: ['action'],
    text: '手札の行動札を1枚選び、2回使う。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['action'], title: '2回使う行動札を選ぶ' }, 'pick');
    },
    steps: {
      pick(e, ids) {
        if (!ids.length) return;
        e.g.ps[e.p].hand.splice(e.g.ps[e.p].hand.indexOf(ids[0]), 1);
        e.g.ps[e.p].play.push(ids[0]);
        e.log(`${e.name()}: ${cardName(ids[0])}を2回使う`);
        e.play(ids[0], 2);
      },
    },
  },
  teien: {
    name: '庭園',
    cost: 4,
    types: ['victory'],
    text: '持っている札10枚ごとに1点（端数切り捨て）。',
    vp: ({ total }) => Math.floor(total / 10),
  },
  utage: {
    name: '宴',
    cost: 5,
    types: ['action'],
    text: '+2行動\n+1購入\n+2文',
    play(e) {
      e.actions(2);
      e.buys(1);
      e.coins(2);
    },
  },
  ichi: {
    name: '市',
    cost: 5,
    types: ['action'],
    text: '+1札\n+1行動\n+1購入\n+1文',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.buys(1);
      e.coins(1);
    },
  },
  onmyo: {
    name: '陰陽寮',
    cost: 5,
    types: ['action'],
    text: '+2札\n+1行動',
    play(e) {
      e.draw(2);
      e.actions(1);
    },
  },
  chougi: {
    name: '朝議',
    cost: 5,
    types: ['action'],
    text: '+4札\n+1購入\nほかの全員は1枚引く。',
    play(e) {
      e.draw(4);
      e.buys(1);
      for (const o of e.others()) e.draw(1, o);
    },
  },
  kanayama: {
    name: '金山',
    cost: 5,
    types: ['action'],
    text: '手札の財宝を1枚廃棄してもよい。そうしたら、そのコスト+3以下の財宝を1枚、手札に獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['treasure'], title: '格上げする財宝を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        const max = cardCost(ids[0]) + 3;
        e.ask({ kind: 'supply', min: 1, maxCost: max, types: ['treasure'], title: `コスト${max}以下の財宝を手札に獲得` }, 'gain', { from: ids[0] });
      },
      gain(e, id) {
        if (id && e.gain(id, e.p, 'hand')) e.log(`${e.name()}: ${cardName(e.data.from)}を${cardName(id)}に格上げ`);
      },
    },
  },
  jujutsu: {
    name: '呪術師',
    cost: 5,
    types: ['action', 'attack'],
    text: '+2札\nほかの全員は祟りを1枚獲得する。',
    giver: ['tatari'],
    play(e) {
      e.draw(2);
      e.attack('curse');
    },
    steps: {
      curse(e) {
        if (e.gain('tatari', e.target)) e.log(`${e.name(e.target)} は祟られた`);
      },
    },
  },
  shoko: {
    name: '書庫',
    cost: 5,
    types: ['action'],
    text: '手札が7枚になるまで引く。引いた行動札は、脇に置いてもよい（最後に捨てる）。',
    play(e) {
      e.step('loop');
    },
    steps: {
      loop(e) {
        const ps = e.g.ps[e.p];
        while (ps.hand.length < 7) {
          const [id] = e.draw(1);
          if (!id) break;
          if (cardTypes(id).includes('action')) {
            e.ask(
              { kind: 'option', title: `${cardName(id)}を引いた`, options: [{ value: 'keep', label: '手札に残す' }, { value: 'aside', label: '脇に置く' }] },
              'decide',
              { card: id },
            );
            return;
          }
        }
        ps.discard.push(...ps.aside);
        ps.aside = [];
      },
      decide(e, choice) {
        const ps = e.g.ps[e.p];
        if (choice === 'aside') {
          ps.hand.splice(ps.hand.lastIndexOf(e.data.card), 1);
          ps.aside.push(e.data.card);
        }
        e.step('loop', {});
      },
    },
  },
};

// engine.js を読み込むと循環するので、名前・コスト・種類はここで引く
import { CARDS } from './index.js';
const cardName = id => CARDS[id].name;
const cardCost = id => CARDS[id].cost;
const cardTypes = id => CARDS[id].types;
