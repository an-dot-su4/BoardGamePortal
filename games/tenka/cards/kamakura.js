// 鎌倉「御恩と奉公」（本家の海辺・初版と同じ26種）: 持続（次の手番にも効く）・マット・関所
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
          e.trashCard(id);
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

  sekisho: {
    name: '関所',
    cost: 2,
    types: ['action'],
    text: '+2文\nこの札を廃棄する。供給の山を1つ選んで関所の札を置く。その山の札を買った人は、関所の札1枚につき祟りを1枚獲得する。',
    play(e) {
      e.coins(2);
      const play = e.g.ps[e.p].play;
      const i = play.lastIndexOf('sekisho');
      if (i >= 0) {
        play.splice(i, 1);
        e.trashCard('sekisho');
      }
      e.ask({ kind: 'supply', min: 1, allPiles: true, title: '関所を置く山を選ぶ' }, 'place');
    },
    steps: {
      place(e, id) {
        if (!id) return;
        e.g.embargo[id] = (e.g.embargo[id] ?? 0) + 1;
        e.log(`${e.name()}: ${cardName(id)}の山に関所を置いた`);
      },
    },
  },
  kakurezato: {
    name: '隠れ里',
    cost: 2,
    types: ['action'],
    text: '+2行動\n次のどちらかを選ぶ: 山札の一番上を、見ないで隠れ里のマットに置く。または、マットの札をすべて手札に加える。',
    play(e) {
      e.actions(2);
      const n = e.g.ps[e.p].mats.native.length;
      e.ask({ kind: 'option', title: `隠れ里（マットに${n}枚）`, options: [{ value: 'set', label: '山札の一番上をマットに置く' }, { value: 'take', label: `マットの札を手札に（${n}枚）` }] }, 'choose');
    },
    steps: {
      choose(e, choice) {
        const ps = e.g.ps[e.p];
        if (choice === 'take') {
          ps.hand.push(...ps.mats.native);
          ps.mats.native = [];
          return;
        }
        const [id] = e.draw(1);
        if (!id) return;
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.mats.native.push(id);
      },
    },
  },
  ama: {
    name: '海女',
    cost: 2,
    types: ['action'],
    text: '+1札\n+1行動\n山札の一番下の札を見る。それを一番上に置いてもよい。',
    play(e) {
      e.draw(1);
      e.actions(1);
      const ps = e.g.ps[e.p];
      if (!ps.deck.length && ps.discard.length) {
        // 山札が無ければ捨て札を混ぜてから見る
        const [id] = e.draw(1);
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.deck.push(id);
      }
      if (!ps.deck.length) return;
      const bottom = ps.deck[0];
      e.ask({ kind: 'option', title: `海女: 山札の一番下は${cardName(bottom)}`, options: [{ value: 'top', label: '一番上にする' }, { value: 'stay', label: 'そのまま' }] }, 'dive');
    },
    steps: {
      dive(e, choice) {
        if (choice !== 'top') return;
        const ps = e.g.ps[e.p];
        ps.deck.push(ps.deck.shift());
      },
    },
  },
  shisetsu: {
    name: '使節',
    cost: 3,
    types: ['action', 'attack'],
    text: '手札の札を1枚公開し、同じ札を2枚まで手札から供給に戻す。そのあと、ほかの全員はその札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 1, max: 1, title: '使節: 返上する札を選ぶ' }, 'reveal');
    },
    steps: {
      reveal(e, ids) {
        if (!ids.length) return;
        const id = ids[0];
        const pile = pileOf(e.g, id);
        const have = e.hand().filter(c => c === id).length;
        const max = pile ? Math.min(2, have) : 0;
        e.log(`${e.name()}: 使節が${cardName(id)}を差し出す`);
        e.ask({ kind: 'option', title: `${cardName(id)}を何枚供給に戻す？`, options: Array.from({ length: max + 1 }, (_, n) => ({ value: n, label: `${n}枚` })) }, 'giveBack', { card: id });
      },
      giveBack(e, n) {
        const id = e.data.card;
        const pile = pileOf(e.g, id);
        for (let i = 0; i < n; i++) {
          e.hand().splice(e.hand().indexOf(id), 1);
          if (pile === 'ruins') e.g.ruinsPile.push(id);
          e.g.supply[pile] += 1;
        }
        if (pile) e.attack('hit', { card: id, pile });
      },
      hit(e) {
        const got = e.gain(e.data.pile, e.target);
        if (got) e.log(`${e.name(e.target)}: ${cardName(got)}を受け取った`);
      },
    },
  },
  nukeni: {
    name: '抜け荷',
    cost: 3,
    types: ['action'],
    text: '右隣の人が直前の手番に獲得した札のうち、コスト6以下のものを1枚獲得する。',
    play(e) {
      const i = e.g.players.indexOf(e.p);
      const right = e.g.players[(i - 1 + e.g.players.length) % e.g.players.length];
      const cands = [...new Set(e.g.ps[right].lastGained)].filter(id => e.g.supply[id] > 0 && !CARDS[id].notSupply && e.cost(id) <= 6);
      if (!cands.length) return e.log(`${e.name()}: 抜け荷にできる札がない`);
      e.ask({ kind: 'list', cards: cands, min: 1, max: 1, title: `抜け荷: ${e.name(right)} が獲得した札から選ぶ` }, 'gain');
    },
    steps: {
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(id)}を抜け荷した`);
      },
    },
  },
  oki: {
    name: '隠岐の島',
    cost: 4,
    types: ['action', 'victory'],
    vp: 2,
    text: '2点\nこの札と手札の札1枚を、隠岐の島のマットに置く（ゲームの終わりまで戻らない。得点には数える）。',
    play(e) {
      const ps = e.g.ps[e.p];
      const i = ps.play.lastIndexOf('oki');
      if (i >= 0) ps.mats.island.push(...ps.play.splice(i, 1));
      e.ask({ kind: 'hand', min: 1, max: 1, title: '隠岐の島に送る札を選ぶ' }, 'exile');
    },
    steps: {
      exile(e, ids) {
        if (!ids.length) return;
        const ps = e.g.ps[e.p];
        ps.hand.splice(ps.hand.indexOf(ids[0]), 1);
        ps.mats.island.push(ids[0]);
      },
    },
  },
  mizusaki: {
    name: '水先案内',
    cost: 4,
    types: ['action'],
    text: '+2文\n山札の上から5枚を見て、すべて捨てるか、好きな順で山札の上に戻す。',
    play(e) {
      e.coins(2);
      const ps = e.g.ps[e.p];
      const seen = e.draw(5);
      for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.look.push(...seen);
      if (!seen.length) return;
      e.ask({ kind: 'option', title: `水先案内: ${seen.map(cardName).join('・')}`, options: [{ value: 'discard', label: 'すべて捨てる' }, { value: 'back', label: '順番を決めて戻す' }] }, 'decide');
    },
    steps: {
      decide(e, choice) {
        const ps = e.g.ps[e.p];
        if (choice === 'discard') {
          ps.discard.push(...ps.look);
          ps.look = [];
          return;
        }
        e.orderOntoDeck();
      },
    },
  },
  wakou: {
    name: '倭寇',
    cost: 4,
    types: ['action', 'attack'],
    text: '次のどちらかを選ぶ: ほかの全員は山札の上から2枚を公開し、あなたが選んだ財宝を1枚廃棄し、残りを捨てる（誰かが廃棄したら倭寇のマットに銭を1枚置く）。または、マットの銭1枚につき+1文。',
    play(e) {
      const n = e.g.ps[e.p].mats.pirate;
      e.ask({ kind: 'option', title: `倭寇（マットの銭${n}枚）`, options: [{ value: 'raid', label: '襲う' }, { value: 'cash', label: `+${n}文` }] }, 'choose');
    },
    steps: {
      choose(e, choice) {
        if (choice === 'cash') return e.coins(e.g.ps[e.p].mats.pirate);
        e.later({ op: 'step', p: e.p, card: 'wakou', step: 'loot', data: {} }); // 攻撃のあとで
        e.attack('hit');
      },
      hit(e) {
        const ps = e.g.ps[e.target];
        const seen = e.draw(2, e.target);
        for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.look.push(...seen);
        const treasures = seen.filter(id => CARDS[id].types.includes('treasure'));
        if (!treasures.length) return e.step('rest');
        e.ask({ p: e.p, kind: 'list', cards: treasures, min: 1, max: 1, title: `倭寇: ${e.name(e.target)} の財宝を沈める` }, 'sink');
      },
      sink(e, id) {
        const ps = e.g.ps[e.target];
        ps.look.splice(ps.look.indexOf(id), 1);
        e.trashCard(id, e.target);
        e.g.turn.pirateHit = true;
        e.step('rest');
      },
      rest(e) {
        const ps = e.g.ps[e.target];
        ps.discard.push(...ps.look);
        ps.look = [];
      },
      loot(e) {
        if (!e.g.turn.pirateHit) return;
        e.g.turn.pirateHit = false;
        e.g.ps[e.p].mats.pirate += 1;
        e.log(`${e.name()}: 倭寇のマットに銭が1枚増えた`);
      },
    },
  },
  yosemono: {
    name: '寄せ物拾い',
    cost: 4,
    types: ['action'],
    text: '+1購入\n手札を1枚廃棄し、そのコストと同じだけ+文。',
    play(e) {
      e.buys(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '寄せ物拾い: 廃棄して売る札を選ぶ' }, 'sell');
    },
    steps: {
      sell(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        e.coins(e.cost(ids[0]));
      },
    },
  },
  isoonna: {
    name: '磯女',
    cost: 4,
    types: ['action', 'attack'],
    giver: ['tatari'],
    text: 'ほかの全員は、山札の一番上を捨て、祟りを1枚山札の上に獲得する。',
    play(e) {
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const ps = e.g.ps[e.target];
        const [id] = e.draw(1, e.target);
        if (id) {
          ps.hand.splice(ps.hand.lastIndexOf(id), 1);
          ps.discard.push(id);
        }
        if (e.gain('tatari', e.target, 'deck')) e.log(`${e.name(e.target)}: 磯女に祟られた`);
      },
    },
  },
  maizou: {
    name: '埋蔵金の図',
    cost: 4,
    types: ['action'],
    text: 'この札と、手札のもう1枚の埋蔵金の図を廃棄する。2枚とも廃棄したら、金を4枚山札の上に獲得する。',
    play(e) {
      const ps = e.g.ps[e.p];
      const i = ps.play.lastIndexOf('maizou');
      const self = i >= 0;
      if (self) {
        ps.play.splice(i, 1);
        e.trashCard('maizou');
      }
      const other = ps.hand.includes('maizou');
      if (other) e.trash(['maizou']);
      if (self && other) {
        for (let k = 0; k < 4; k++) e.gain('kin', e.p, 'deck');
        e.log(`${e.name()}: 埋蔵金を掘り当てた！（金4枚）`);
      }
    },
  },
  tokaisha: {
    name: '渡海者',
    cost: 5,
    types: ['action'],
    text: '手札の国を公開してもよい。公開したら金を、しなかったら銀を、1枚手札に獲得する。',
    play(e) {
      if (!e.hand().includes('kuni')) return e.step('reward', { show: false });
      e.ask({ kind: 'option', title: '渡海者: 国を公開する？', options: [{ value: 'yes', label: '公開して金' }, { value: 'no', label: '公開せず銀' }] }, 'decide');
    },
    steps: {
      decide(e, choice) {
        e.step('reward', { show: choice === 'yes' });
      },
      reward(e) {
        e.gain(e.data.show ? 'kin' : 'gin', e.p, 'hand');
      },
    },
  },
  hayauma: {
    name: '早馬',
    cost: 5,
    types: ['action', 'duration'],
    text: 'この手番の終わりには3枚だけ引く。そのあともう一度自分の手番を行う（2回続けては行えない）。',
    play(e) {
      e.g.turn.outpost = true;
    },
    next() {},
  },
  kumonjo: {
    name: '公文所',
    cost: 5,
    types: ['action'],
    text: '+1札\n+1行動\n+1文\nこの手番に勝利点の札を買っていなければ、片付けのとき、この札を山札の上に置いてもよい。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.coins(1);
    },
    steps: {
      onCleanup(e) {
        if (e.g.turn.bought.some(id => CARDS[id].types.includes('victory'))) return;
        e.ask({ kind: 'option', title: '公文所を山札の上に置く？', options: [{ value: 'top', label: '山札の上に置く' }, { value: 'discard', label: '捨てる' }] }, 'keep');
      },
      keep(e, choice) {
        if (choice !== 'top') return;
        const ps = e.g.ps[e.p];
        const i = ps.play.lastIndexOf('kumonjo');
        if (i >= 0) ps.deck.push(...ps.play.splice(i, 1));
      },
    },
  },
};

// その札を戻す先の山（落武者の4種は落武者の山）。山が無ければ null
function pileOf(g, id) {
  if (CARDS[id].types.includes('ruins') && 'ruins' in g.supply) return 'ruins';
  return id in g.supply && !CARDS[id].notSupply ? id : null;
}
