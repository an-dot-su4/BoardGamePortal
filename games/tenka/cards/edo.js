// 江戸「町人文化」: 蓄え（小判のトークン。自分の手番に1枚につき+1文として使える）と過払い
//   steps.overpay(e): 買うときに e.data.n 文多く払ったときの効果
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
    steps: {
      overpay(e) {
        let got = 0;
        for (let i = 0; i < e.data.n; i++) if (e.gain('gin')) got++;
        if (got) e.log(`${e.name()}: 棟梁に弟子入りした銀が${got}枚`);
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
    text: '+1札\n+1行動\n山札の一番上を公開し、行動札ならそれを使う。\n買うとき多く払ってもよい。1文につき、捨て札から1枚を選んで山札の上に置く。',
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
    steps: {
      overpay(e) {
        e.step('fetch', { left: e.data.n });
      },
      fetch(e) {
        const ps = e.g.ps[e.p];
        if (e.data.left <= 0 || !ps.discard.length) return;
        e.ask({ kind: 'list', cards: [...new Set(ps.discard)], min: 1, max: 1, title: `番頭: 捨て札から山札の上に置く札を選ぶ（あと${e.data.left}枚）` }, 'put');
      },
      put(e, id) {
        const ps = e.g.ps[e.p];
        ps.discard.splice(ps.discard.lastIndexOf(id), 1);
        ps.deck.push(id);
        e.step('fetch', { left: e.data.left - 1 });
      },
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
        const options = Array.from({ length: have + 1 }, (_, n) => ({ value: n, label: `蓄えを${n}使う（コスト${e.cost(ids[0]) + n}まで）` }));
        e.ask({ kind: 'option', title: '越後屋: 蓄えをいくつ使う？', options }, 'spend', { from: ids[0] });
      },
      spend(e, n) {
        e.g.ps[e.p].coffers -= n;
        const max = e.cost(e.data.from) + n;
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

  ishiya: {
    name: '石屋',
    cost: 2,
    types: ['action'],
    text: '手札を1枚廃棄し、それよりコストの低い札を2枚獲得する。\n買うとき多く払ってもよい。払った額とちょうど同じコストの行動札を2枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 1, max: 1, title: '石屋: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        const max = e.cost(ids[0]) - 1;
        if (max < 0) return;
        e.step('gain', { max, left: 2 });
      },
      gain(e) {
        if (e.data.left <= 0) return;
        e.ask({ kind: 'supply', min: 1, maxCost: e.data.max, title: `石屋: コスト${e.data.max}以下の札を獲得（あと${e.data.left}枚）` }, 'got');
      },
      got(e, id) {
        if (id) e.gain(id);
        e.step('gain', { ...e.data, left: e.data.left - 1 });
      },
      overpay(e) {
        e.step('actionGain', { n: e.data.n, left: 2 });
      },
      actionGain(e) {
        if (e.data.left <= 0) return;
        e.ask({ kind: 'supply', min: 1, exactCost: e.data.n, types: ['action'], title: `石屋: コストちょうど${e.data.n}の行動札を獲得（あと${e.data.left}枚）` }, 'actionGot');
      },
      actionGot(e, id) {
        if (id) e.gain(id);
        e.step('actionGain', { ...e.data, left: e.data.left - 1 });
      },
    },
  },
  machiisha: {
    name: '町医者',
    cost: 3,
    types: ['action'],
    text: '札の名前を1つ言う。山札の上から3枚を公開し、その名前の札を廃棄する。残りは好きな順で山札の上に戻す。\n買うとき多く払ってもよい。1文につき、山札の一番上を見て、廃棄・捨て札・戻すのどれかにする。',
    play(e) {
      e.ask({ kind: 'name', min: 1, max: 1, title: '町医者: 廃棄したい札の名前を選ぶ' }, 'reveal');
    },
    steps: {
      reveal(e, name) {
        const ps = e.g.ps[e.p];
        const seen = e.draw(3);
        for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        const hits = seen.filter(id => id === name);
        for (const id of hits) e.trashCard(id);
        ps.look.push(...seen.filter(id => id !== name));
        e.log(`${e.name()}: 町医者が${cardName(name)}を診て、${hits.length}枚廃棄`);
        e.orderOntoDeck();
      },
      overpay(e) {
        e.step('check', { left: e.data.n });
      },
      check(e) {
        if (e.data.left <= 0) return;
        const ps = e.g.ps[e.p];
        const [top] = e.draw(1);
        if (!top) return;
        ps.hand.splice(ps.hand.lastIndexOf(top), 1);
        ps.look.push(top);
        e.ask({ kind: 'option', title: `町医者: 山札の一番上は${cardName(top)}`, options: [{ value: 'trash', label: '廃棄' }, { value: 'discard', label: '捨て札' }, { value: 'back', label: '山札に戻す' }] }, 'treat', { ...e.data, card: top });
      },
      treat(e, choice) {
        const ps = e.g.ps[e.p];
        const id = e.data.card;
        ps.look.splice(ps.look.indexOf(id), 1);
        if (choice === 'trash') e.trashCard(id);
        else if (choice === 'discard') ps.discard.push(id);
        else ps.deck.push(id);
        // 戻した札をまた見ないよう、戻したら終わり
        e.step('check', { left: choice === 'back' ? 0 : e.data.left - 1 });
      },
    },
  },
  daikan: {
    name: '代官',
    cost: 4,
    types: ['action', 'attack'],
    text: '手札の財宝を1枚廃棄してもよい。ほかの全員は、手札が5枚以上なら同じ札を1枚捨てる（無ければ手札を見せる）。廃棄した札のコスト+3以下の財宝を1枚、山札の上に獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['treasure'], title: '代官: 年貢として廃棄する財宝を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (!ids.length) return;
        e.trash(ids);
        const id = ids[0];
        e.later({ op: 'step', p: e.p, card: 'daikan', step: 'collect', data: { card: id } }); // 攻撃のあとで
        e.attack('hit', { card: id });
      },
      hit(e) {
        const hand = e.hand(e.target);
        if (hand.length < 5) return;
        if (hand.includes(e.data.card)) {
          e.discard([e.data.card], e.target);
          e.log(`${e.name(e.target)}: ${cardName(e.data.card)}を差し出した`);
        } else {
          e.log(`${e.name(e.target)}: ${cardName(e.data.card)}なし（手札: ${hand.map(cardName).join('・')}）`);
        }
      },
      collect(e) {
        const max = e.cost(e.data.card) + 3;
        e.ask({ kind: 'supply', min: 1, maxCost: max, types: ['treasure'], title: `代官: コスト${max}以下の財宝を山札の上に獲得` }, 'gain');
      },
      gain(e, id) {
        if (id) e.gain(id, e.p, 'deck');
      },
    },
  },
  watari: {
    name: '渡り職人',
    cost: 5,
    types: ['action'],
    text: '札の名前を1つ言う。その名前でない札が3枚出るまで山札をめくり、その3枚を手札に加え、残りは捨てる。',
    play(e) {
      e.ask({ kind: 'name', min: 1, max: 1, title: '渡り職人: 手札に入れたくない札の名前を選ぶ' }, 'reveal');
    },
    steps: {
      reveal(e, name) {
        const ps = e.g.ps[e.p];
        let kept = 0;
        const skipped = [];
        while (kept < 3) {
          const [id] = e.draw(1);
          if (!id) break;
          if (id === name) {
            ps.hand.splice(ps.hand.lastIndexOf(id), 1);
            skipped.push(id);
          } else kept++;
        }
        ps.discard.push(...skipped);
      },
    },
  },
};
