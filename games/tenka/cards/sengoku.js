// 戦国「下剋上」: 廃棄・落武者（廃墟）・戦利品・避難所・名のある武者。本家の「暗黒時代」と同じ35種
//   落武者の山 (ruins): 5種の弱い行動札を混ぜた山。攻撃で押しつけられる。山の一番上の札を獲得する
//   避難所: 戦国の札が多いと、最初の田3枚の代わりに配られる（掘っ立て小屋・無縁塚・荒れ屋敷）
//   名のある武者 (bushi): 10人の武者を混ぜた山。一番上の1人だけ買える
//   戦利品 (senrihin): 財宝+3。使うと山に戻る。供給には含まれず、買えない
//   onTrash: 廃棄されたときの効果（steps.onTrash として実行）
import { CARDS } from './index.js';

const cardName = id => CARDS[id].name;
const isType = (id, t) => CARDS[id].types.includes(t);
const RUIN = { types: ['action', 'ruins'], cost: 0, kingdom: false, notSupply: true };

// 武者に共通の攻撃: 山札の上から2枚を公開し、コスト3〜6の札を1枚廃棄（本人が選ぶ）、残りは捨てる。武者を廃棄させたら、使った武者も廃棄
const KNIGHT_STEPS = {
  hit(e) {
    e.step('reveal');
  },
  reveal(e) {
    const ps = e.g.ps[e.target];
    const seen = e.draw(2, e.target);
    for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
    ps.look.push(...seen);
    const targets = seen.filter(id => e.cost(id) >= 3 && e.cost(id) <= 6);
    if (!targets.length) return e.step('rest');
    e.ask({ p: e.target, kind: 'list', cards: targets, min: 1, max: 1, title: `${cardName(e.card)}: 廃棄する札を選ぶ` }, 'burn');
  },
  burn(e, id) {
    const ps = e.g.ps[e.target];
    e.step('rest');
    if (!id) return;
    ps.look.splice(ps.look.indexOf(id), 1);
    e.trashCard(id, e.target);
    e.log(`${e.name(e.target)}: ${cardName(e.card)}に${cardName(id)}を討たれた`);
    if (isType(id, 'knight')) {
      const play = e.g.ps[e.p].play;
      const i = play.lastIndexOf(e.self);
      if (i >= 0) {
        play.splice(i, 1);
        e.trashCard(e.self);
        e.log(`${e.name()}: ${cardName(e.card)}も相討ちになった`);
      }
    }
  },
  rest(e) {
    const ps = e.g.ps[e.target];
    ps.discard.push(...ps.look);
    ps.look = [];
  },
};

export const SENGOKU = {
  // 落武者の山（供給に置かれる札。中身は下の4種）
  ruins: { name: '落武者の山', cost: 0, types: ['action', 'ruins'], kingdom: false, text: '落武者の札を混ぜた山。一番上の1枚を獲得する。' },
  ochimusha: { ...RUIN, name: '落武者', text: '+1文', play: e => e.coins(1) },
  yakedera: { ...RUIN, name: '焼け寺', text: '+1札', play: e => e.draw(1) },
  arechi: { ...RUIN, name: '荒れ市', text: '+1購入', play: e => e.buys(1) },
  haison: { ...RUIN, name: '廃村', text: '+1行動', play: e => e.actions(1) },
  ikinokori: {
    ...RUIN,
    name: '生き残り',
    text: '山札の上から2枚を見る。2枚とも捨てるか、好きな順で山札の上に戻す。',
    play(e) {
      const ps = e.g.ps[e.p];
      const seen = e.draw(2);
      for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.look.push(...seen);
      if (!seen.length) return;
      e.ask({ kind: 'option', title: `生き残り: ${seen.map(cardName).join('・')}`, options: [{ value: 'discard', label: '捨てる' }, { value: 'back', label: '山札の上に戻す' }] }, 'decide');
    },
    steps: {
      decide(e, choice) {
        const ps = e.g.ps[e.p];
        if (choice === 'discard') {
          ps.discard.push(...ps.look);
          ps.look = [];
        } else e.orderOntoDeck();
      },
    },
  },

  // 避難所（田3枚の代わりの初期札）
  hottate: {
    name: '掘っ立て小屋',
    cost: 1,
    types: ['reaction', 'shelter'],
    kingdom: false,
    notSupply: true,
    text: '【反応】勝利点の札を買ったとき、手札のこの札を廃棄してもよい。',
    steps: {
      react(e) {
        if (!e.hand().includes('hottate')) return;
        e.ask({ kind: 'option', title: '掘っ立て小屋を廃棄する？', options: [{ value: 'yes', label: '廃棄する' }, { value: 'no', label: 'しない' }] }, 'decide');
      },
      decide(e, choice) {
        if (choice === 'yes' && e.hand().includes('hottate')) e.trash(['hottate']);
      },
    },
  },
  muenzuka: { name: '無縁塚', cost: 1, types: ['action', 'shelter'], kingdom: false, notSupply: true, text: '+2行動', play: e => e.actions(2) },
  areyashiki: {
    name: '荒れ屋敷',
    cost: 1,
    types: ['victory', 'shelter'],
    vp: 0,
    kingdom: false,
    notSupply: true,
    text: '0点\n廃棄されたとき、+1札。',
    steps: {
      onTrash(e) {
        e.draw(1);
      },
    },
  },

  // 隠者・悪童から得る札（供給には含まれない）
  kyoujin: {
    name: '狂人',
    cost: 0,
    types: ['action'],
    kingdom: false,
    notSupply: true,
    text: '+2行動\nこの札を狂人の山に戻す。戻したら、手札1枚につき+1札。（買えない）',
    canBuy: () => false,
    play(e) {
      e.actions(2);
      const play = e.g.ps[e.p].play;
      const i = play.lastIndexOf(e.self);
      if (i < 0 || e.self !== 'kyoujin') return;
      play.splice(i, 1);
      e.g.supply.kyoujin += 1;
      const n = e.hand().length;
      e.draw(n);
      e.log(`${e.name()}: 狂人で${n}枚引いた`);
    },
  },
  saikashu: {
    name: '雑賀衆',
    cost: 0,
    types: ['action', 'attack'],
    kingdom: false,
    notSupply: true,
    text: '手札を2枚廃棄してもよい。そうしたら、+2札 +2文。ほかの全員は手札が3枚になるまで捨てる。（買えない）',
    canBuy: () => false,
    play(e) {
      if (!e.hand().length) return;
      e.ask({ kind: 'option', title: '雑賀衆: 手札を2枚廃棄する？', options: [{ value: 'yes', label: '2枚廃棄する' }, { value: 'no', label: 'しない' }] }, 'agree');
    },
    steps: {
      agree(e, choice) {
        if (choice !== 'yes') return;
        e.ask({ kind: 'hand', min: 2, max: 2, title: '雑賀衆: 廃棄する札を2枚選ぶ' }, 'trash');
      },
      trash(e, ids) {
        e.trash(ids);
        if (ids.length < 2) return;
        e.draw(2);
        e.coins(2);
        e.attack('hit');
      },
      hit(e) {
        const n = e.hand(e.target).length - 3;
        if (n > 0) e.ask({ p: e.target, kind: 'hand', min: n, max: n, title: `雑賀衆: 手札を${n}枚捨てる` }, 'discard');
      },
      discard(e, ids) {
        e.discard(ids, e.target);
      },
    },
  },

  senrihin: {
    name: '戦利品',
    cost: 0,
    types: ['treasure'],
    coin: 3,
    kingdom: false,
    notSupply: true,
    text: '+3文\n使ったら戦利品の山に戻す。（買えない）',
    canBuy: () => false,
    play(e) {
      const play = e.g.ps[e.p].play;
      play.splice(play.lastIndexOf('senrihin'), 1);
      e.g.supply.senrihin += 1;
    },
  },

  rakuichi: {
    name: '楽市',
    cost: 3,
    types: ['action', 'reaction'],
    text: '+1札\n+1行動\n+1購入\n【反応】あなたの札が廃棄されたとき、手札のこの札を捨てて、金を1枚獲得してもよい。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.buys(1);
    },
    steps: {
      react(e) {
        if (!e.hand().includes('rakuichi') || !(e.g.supply.kin > 0)) return;
        e.ask({ kind: 'option', title: `${cardName(e.data.trashed)}が廃棄された: 楽市を捨てて金を獲得する？`, options: [{ value: 'yes', label: '捨てて金を獲得' }, { value: 'no', label: 'しない' }] }, 'decide');
      },
      decide(e, choice) {
        if (choice !== 'yes') return;
        e.discard(['rakuichi']);
        e.gain('kin');
        e.log(`${e.name()}: 楽市で金を獲得`);
        e.step('react'); // 楽市がもう1枚あれば、それも使える
      },
    },
  },
  katanagari: {
    name: '刀狩',
    cost: 3,
    types: ['action'],
    text: '+1行動\n+1購入\n手札を1枚廃棄する。廃棄置き場にある財宝の種類の数だけ+1文。',
    play(e) {
      e.actions(1);
      e.buys(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '刀狩: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
        const kinds = new Set(e.g.trash.filter(id => isType(id, 'treasure'))).size;
        e.coins(kinds);
        if (kinds) e.log(`${e.name()}: 刀狩で+${kinds}文`);
      },
    },
  },
  yamashiro: {
    name: '山城',
    cost: 4,
    types: ['action'],
    text: '+1札\n+2行動\n廃棄されたとき、廃棄置き場から手札に戻る。',
    play(e) {
      e.draw(1);
      e.actions(2);
    },
    steps: {
      onTrash(e) {
        const i = e.g.trash.lastIndexOf('yamashiro');
        if (i < 0) return;
        e.g.trash.splice(i, 1);
        e.g.ps[e.p].hand.push('yamashiro');
        e.log(`${e.name()}: 山城は落ちず、手札に戻った`);
      },
    },
  },
  randori: {
    name: '乱取り',
    cost: 4,
    types: ['action', 'attack'],
    spoils: true,
    ruins: true,
    text: '戦利品を1枚獲得する。ほかの全員は落武者を1枚獲得する。',
    play(e) {
      if (e.gain('senrihin')) e.log(`${e.name()}: 戦利品を手に入れた`);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const got = e.gain('ruins', e.target);
        if (got) e.log(`${e.name(e.target)}: ${cardName(got)}を押しつけられた`);
      },
    },
  },
  gekokujo: {
    name: '下剋上',
    cost: 4,
    types: ['action'],
    text: '手札の行動札を1枚選び、2回使う。そのあとその札を廃棄し、コストがちょうど1高い行動札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['action'], title: '下剋上: 2回使って格上げする行動札を選ぶ' }, 'pick');
    },
    steps: {
      pick(e, ids) {
        if (!ids.length) return;
        const id = ids[0];
        const ps = e.g.ps[e.p];
        ps.hand.splice(ps.hand.indexOf(id), 1);
        ps.play.push(id);
        e.log(`${e.name()}: 下剋上で${cardName(id)}を2回使う`);
        e.later({ op: 'step', p: e.p, card: 'gekokujo', step: 'upgrade', data: { card: id } });
        e.play(id, 2, { token: e.newToken(), card: 'gekokujo' });
      },
      upgrade(e) {
        const id = e.data.card;
        const ps = e.g.ps[e.p];
        const i = ps.play.lastIndexOf(id);
        if (i >= 0) {
          ps.play.splice(i, 1);
          e.trashCard(id);
        }
        const cost = e.cost(id) + 1;
        e.ask({ kind: 'supply', min: 1, exactCost: cost, types: ['action'], title: `コストがちょうど${cost}の行動札を獲得` }, 'gain', { from: id });
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(e.data.from)}を${cardName(id)}に下剋上`);
      },
    },
  },
  chigyou: {
    name: '知行',
    cost: 4,
    types: ['victory'],
    text: '持っている銀3枚ごとに1点。廃棄されたとき、銀を3枚獲得する。',
    vp: ({ cards }) => Math.floor(cards.filter(id => id === 'gin').length / 3),
    steps: {
      onTrash(e) {
        for (let i = 0; i < 3; i++) e.gain('gin');
        e.log(`${e.name()}: 知行を手放して銀を3枚得た`);
      },
    },
  },
  kobutsu: {
    name: '古物商',
    cost: 5,
    types: ['action'],
    text: '+1札\n+1行動\n+1文\n手札を1枚廃棄する。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.coins(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '古物商: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
      },
    },
  },
  nobushi: {
    name: '野武士の砦',
    cost: 5,
    types: ['action'],
    spoils: true,
    text: '+1札\n+2行動\n戦利品を1枚獲得する。',
    play(e) {
      e.draw(1);
      e.actions(2);
      e.gain('senrihin');
    },
  },
  ikkou: {
    name: '一向一揆',
    cost: 5,
    types: ['action', 'attack'],
    ruins: true,
    text: '+2札\nほかの全員は落武者を1枚獲得する。手札の一向一揆を、行動を使わずに続けて使ってもよい。\n廃棄されたとき、+3札。',
    play(e) {
      e.draw(2);
      e.step('chain'); // 攻撃のあとで聞く
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const got = e.gain('ruins', e.target);
        if (got) e.log(`${e.name(e.target)}: ${cardName(got)}を押しつけられた`);
      },
      chain(e) {
        if (!e.hand().includes('ikkou')) return;
        e.ask({ kind: 'option', title: 'もう1枚の一向一揆を続けて使う？', options: [{ value: 'yes', label: '続けて使う' }, { value: 'no', label: '使わない' }] }, 'more');
      },
      onTrash(e) {
        e.draw(3);
        e.log(`${e.name()}: 一向一揆が散って+3札`);
      },
      more(e, choice) {
        if (choice !== 'yes') return;
        const ps = e.g.ps[e.p];
        ps.hand.splice(ps.hand.indexOf('ikkou'), 1);
        ps.play.push('ikkou');
        e.play('ikkou');
      },
    },
  },
  yakiuchi: {
    name: '焼き討ち',
    cost: 5,
    types: ['action', 'attack'],
    spoils: true,
    text: 'この札を廃棄する。ほかの全員は、手札が5枚以上なら手札を見せ、あなたが選んだ1枚を捨てる。戦利品を2枚獲得する。',
    play(e) {
      const play = e.g.ps[e.p].play;
      const i = play.lastIndexOf(e.self);
      if (i >= 0) {
        play.splice(i, 1);
        e.trashCard(e.self);
      }
      e.later({ op: 'step', p: e.p, card: 'yakiuchi', step: 'loot', data: {} }); // 攻撃のあとで
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const hand = e.hand(e.target);
        if (hand.length < 5) return;
        e.ask({ p: e.p, kind: 'list', cards: hand.slice(), min: 1, max: 1, title: `焼き討ち: ${e.name(e.target)} に捨てさせる札を選ぶ` }, 'pick');
      },
      pick(e, id) {
        if (!id) return;
        e.discard([id], e.target);
        e.log(`${e.name(e.target)}: 焼き討ちで${cardName(id)}を失った`);
      },
      loot(e) {
        e.gain('senrihin');
        e.gain('senrihin');
      },
    },
  },
  shinobi: {
    name: '忍び',
    cost: 5,
    types: ['action', 'attack'],
    text: '+2文\n廃棄置き場にコスト3〜6の札があれば、1枚獲得する。無ければ、ほかの全員は山札を2枚めくり、コスト3〜6の札を1枚廃棄して残りを捨てる。',
    play(e) {
      e.coins(2);
      const loot = [...new Set(e.g.trash.filter(id => e.cost(id) >= 3 && e.cost(id) <= 6))];
      if (loot.length) {
        e.ask({ kind: 'list', cards: loot, min: 1, max: 1, title: '忍び: 廃棄置き場から獲得する札を選ぶ' }, 'steal');
        return;
      }
      e.attack('hit');
    },
    steps: {
      steal(e, id) {
        if (!id) return;
        e.gainFromTrash(id);
        e.log(`${e.name()}: 忍びが廃棄置き場から${cardName(id)}を盗み出した`);
      },
      hit(e) {
        const ps = e.g.ps[e.target];
        const seen = e.draw(2, e.target);
        for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.look.push(...seen);
        const targets = seen.filter(id => e.cost(id) >= 3 && e.cost(id) <= 6);
        if (!targets.length) return e.step('rest');
        e.ask({ p: e.target, kind: 'list', cards: targets, min: 1, max: 1, title: '忍び: 廃棄する札を選ぶ' }, 'burn');
      },
      burn(e, id) {
        const ps = e.g.ps[e.target];
        if (id) {
          ps.look.splice(ps.look.indexOf(id), 1);
          e.trashCard(id, e.target);
          e.log(`${e.name(e.target)}: 忍びに${cardName(id)}を焼かれた`);
        }
        e.step('rest');
      },
      rest(e) {
        const ps = e.g.ps[e.target];
        ps.discard.push(...ps.look);
        ps.look = [];
      },
    },
  },
  takagari: {
    name: '鷹狩',
    cost: 6,
    types: ['action'],
    text: '+4札\n廃棄されたとき、荘園1枚か田3枚を獲得する。',
    play(e) {
      e.draw(4);
    },
    steps: {
      onTrash(e) {
        e.ask({ kind: 'option', title: '鷹狩: 獲得する札を選ぶ', options: [{ value: 'shouen', label: '荘園1枚' }, { value: 'ta', label: '田3枚' }] }, 'reward');
      },
      reward(e, choice) {
        if (choice === 'shouen') e.gain('shouen');
        else for (let i = 0; i < 3; i++) e.gain('ta');
      },
    },
  },

  // ---- 暗黒時代の残り23種 ----
  binbou: {
    name: '貧乏長屋',
    cost: 1,
    types: ['action'],
    text: '+4文\n手札を公開し、財宝1枚につき−1文（0文より下にはならない）。',
    play(e) {
      const n = e.hand().filter(id => isType(id, 'treasure')).length;
      e.g.turn.coins = Math.max(0, e.g.turn.coins + 4 - n);
      e.log(`${e.name()}: 貧乏長屋で+${Math.max(0, 4 - n)}文（財宝${n}枚）`);
    },
  },
  monogoi: {
    name: '物乞い',
    cost: 2,
    types: ['action', 'reaction'],
    text: '銅銭を3枚、手札に獲得する。\n【反応】ほかの人が攻撃札を使ったとき、手札のこの札を捨てて、銀を2枚獲得してもよい（1枚は山札の上に）。',
    play(e) {
      for (let i = 0; i < 3; i++) e.gain('zeni', e.p, 'hand');
    },
    steps: {
      react(e) {
        if (!e.hand().includes('monogoi')) return;
        e.ask({ kind: 'option', title: '攻撃が来る: 物乞いを捨てて銀を2枚獲得する？', options: [{ value: 'yes', label: '捨てて銀2枚' }, { value: 'no', label: 'しない' }] }, 'decide');
      },
      decide(e, choice) {
        if (choice !== 'yes') return;
        e.discard(['monogoi']);
        e.gain('gin', e.p, 'deck');
        e.gain('gin');
        e.log(`${e.name()}: 物乞いで銀を2枚`);
        e.step('react');
      },
    },
  },
  koshou: {
    name: '小姓',
    cost: 2,
    types: ['action'],
    text: '+1文\n次から1つ選ぶ: +2行動 / +2購入 / 銀を1枚獲得。\n廃棄されたとき、攻撃札を1枚獲得する。',
    play(e) {
      e.coins(1);
      e.ask({ kind: 'option', title: '小姓: どれにする？', options: [{ value: 'actions', label: '+2行動' }, { value: 'buys', label: '+2購入' }, { value: 'silver', label: '銀を獲得' }] }, 'choose');
    },
    steps: {
      choose(e, c) {
        if (c === 'actions') e.actions(2);
        else if (c === 'buys') e.buys(2);
        else e.gain('gin');
      },
      onTrash(e) {
        e.ask({ kind: 'supply', min: 1, types: ['attack'], title: '小姓が廃棄された: 攻撃札を1枚獲得' }, 'gain');
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: 小姓の代わりに${cardName(id)}を獲得`);
      },
    },
  },
  rounin: {
    name: '浪人',
    cost: 2,
    types: ['action'],
    text: '+1札\n+1行動\n山札の一番上を公開する。祟り・落武者・避難所・勝利点の札なら手札に加える。',
    play(e) {
      e.draw(1);
      e.actions(1);
      const ps = e.g.ps[e.p];
      const [id] = e.draw(1);
      if (!id) return;
      if (['curse', 'ruins', 'shelter', 'victory'].some(t => isType(id, t))) return e.log(`${e.name()}: 浪人で${cardName(id)}を拾った`);
      ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.deck.push(id);
    },
  },
  inja: {
    name: '隠者',
    cost: 3,
    types: ['action'],
    text: '捨て札か手札から、財宝でない札を1枚廃棄してもよい。コスト3以下の札を1枚獲得する。\n場から捨てるとき、この手番に何も買っていなければ、この札を廃棄して狂人を1枚獲得する。',
    madman: true,
    play(e) {
      const ps = e.g.ps[e.p];
      const options = [];
      if (ps.hand.some(id => !isType(id, 'treasure'))) options.push({ value: 'hand', label: '手札から廃棄' });
      if (ps.discard.some(id => !isType(id, 'treasure'))) options.push({ value: 'discard', label: '捨て札から廃棄' });
      if (!options.length) return e.step('gainCard');
      options.push({ value: 'none', label: '廃棄しない' });
      e.ask({ kind: 'option', title: '隠者: 財宝でない札を1枚廃棄する？', options }, 'src');
    },
    steps: {
      src(e, c) {
        const ps = e.g.ps[e.p];
        e.step('gainCard');
        if (c === 'hand') e.ask({ kind: 'hand', min: 1, max: 1, ids: ps.hand.filter(id => !isType(id, 'treasure')), title: '隠者: 廃棄する札（手札）' }, 'trashHand');
        else if (c === 'discard') e.ask({ kind: 'list', cards: [...new Set(ps.discard.filter(id => !isType(id, 'treasure')))], min: 1, max: 1, title: '隠者: 廃棄する札（捨て札）' }, 'trashDiscard');
      },
      trashHand(e, ids) {
        e.trash(ids);
      },
      trashDiscard(e, id) {
        const ps = e.g.ps[e.p];
        if (!id) return;
        ps.discard.splice(ps.discard.lastIndexOf(id), 1);
        e.trashCard(id);
      },
      gainCard(e) {
        e.ask({ kind: 'supply', min: 1, maxCost: 3, title: '隠者: コスト3以下の札を獲得' }, 'gain');
      },
      gain(e, id) {
        if (id) e.gain(id);
      },
      onCleanup(e) {
        if (e.g.turn.bought.length) return;
        const play = e.g.ps[e.p].play;
        const i = play.lastIndexOf(e.self);
        if (i < 0) return;
        play.splice(i, 1);
        e.trashCard(e.self);
        if (e.gain('kyoujin')) e.log(`${e.name()}: 隠者は狂人になった`);
      },
    },
  },
  gunshi: {
    name: '軍師',
    cost: 3,
    types: ['action'],
    text: '+1行動\n山札からコスト3以上の札が出るまでめくり、その札を手札に加える。ほかにめくった札は捨てる。',
    play(e) {
      e.actions(1);
      const ps = e.g.ps[e.p];
      for (;;) {
        const [id] = e.draw(1);
        if (!id) break;
        if (e.cost(id) >= 3) {
          e.log(`${e.name()}: 軍師が${cardName(id)}を見いだした`);
          break;
        }
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.look.push(id);
      }
      ps.discard.push(...ps.look);
      ps.look = [];
    },
  },
  naya: {
    name: '納屋',
    cost: 3,
    types: ['action'],
    text: '+1購入\n手札を好きな枚数捨て、同じ枚数を引く。そのあと手札を好きな枚数捨て、1枚につき+1文。',
    play(e) {
      e.buys(1);
      e.ask({ kind: 'hand', min: 0, max: 99, title: '納屋: 捨てて引き直す札を選ぶ' }, 'cycle');
    },
    steps: {
      cycle(e, ids) {
        e.discard(ids);
        e.draw(ids.length);
        e.ask({ kind: 'hand', min: 0, max: 99, title: '納屋: 捨てる札を選ぶ（1枚につき+1文）' }, 'sell');
      },
      sell(e, ids) {
        e.discard(ids);
        e.coins(ids.length);
      },
    },
  },
  akudou: {
    name: '悪童',
    cost: 3,
    types: ['action', 'attack'],
    mercenary: true,
    text: '+1札\n+1行動\nほかの全員は手札が4枚になるまで捨てる。\nこの札が場にある間にほかの攻撃札を使うとき、先にこの札を廃棄して雑賀衆を1枚獲得してもよい。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const n = e.hand(e.target).length - 4;
        if (n > 0) e.ask({ p: e.target, kind: 'hand', min: n, max: n, title: `悪童: 手札を${n}枚捨てる` }, 'discard');
      },
      discard(e, ids) {
        e.discard(ids, e.target);
      },
      react(e) {
        e.ask({ kind: 'option', title: '悪童を廃棄して雑賀衆を獲得する？', options: [{ value: 'yes', label: '廃棄して雑賀衆' }, { value: 'no', label: 'しない' }] }, 'grow');
      },
      grow(e, choice) {
        if (choice !== 'yes') return;
        const play = e.g.ps[e.p].play;
        const i = play.lastIndexOf('akudou');
        if (i < 0) return;
        play.splice(i, 1);
        e.trashCard('akudou');
        if (e.gain('saikashu')) e.log(`${e.name()}: 悪童が雑賀衆になった`);
      },
    },
  },
  bugugura: {
    name: '武具蔵',
    cost: 4,
    types: ['action'],
    text: 'コスト4以下の札を1枚、山札の上に獲得する。',
    play(e) {
      e.ask({ kind: 'supply', min: 1, maxCost: 4, title: '武具蔵: コスト4以下の札を山札の上に獲得' }, 'gain');
    },
    steps: {
      gain(e, id) {
        if (id) e.gain(id, e.p, 'deck');
      },
    },
  },
  shikabane: {
    name: '屍運び',
    cost: 4,
    types: ['action'],
    ruins: true,
    text: '+5文\n手札の行動札を1枚廃棄してもよい。廃棄しなければ、この札を廃棄する。\nこの札を獲得したとき、落武者を2枚獲得する。',
    play(e) {
      e.coins(5);
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['action'], title: '屍運び: 廃棄する行動札（選ばなければ屍運びを廃棄）' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        if (ids.length) return e.trash(ids);
        const play = e.g.ps[e.p].play;
        const i = play.lastIndexOf(e.self);
        if (i < 0) return;
        play.splice(i, 1);
        e.trashCard(e.self);
      },
    },
  },
  kanamono: {
    name: '金物屋',
    cost: 4,
    types: ['action'],
    text: '+1札\n+1行動\n山札の一番上を公開し、捨ててもよい。その札が行動札なら+1行動、財宝なら+1文、勝利点の札なら+1札。',
    play(e) {
      e.draw(1);
      e.actions(1);
      const ps = e.g.ps[e.p];
      const [id] = e.draw(1);
      if (!id) return;
      ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.look.push(id);
      e.ask({ kind: 'option', title: `金物屋: ${cardName(id)}をどうする？`, options: [{ value: 'keep', label: '山札に戻す' }, { value: 'discard', label: '捨てる' }] }, 'decide', { card: id });
    },
    steps: {
      decide(e, choice) {
        const ps = e.g.ps[e.p];
        const id = e.data.card;
        ps.look.splice(ps.look.lastIndexOf(id), 1);
        (choice === 'discard' ? ps.discard : ps.deck).push(id);
        if (isType(id, 'action')) e.actions(1);
        if (isType(id, 'treasure')) e.coins(1);
        if (isType(id, 'victory')) e.draw(1);
      },
    },
  },
  nezumi: {
    name: '鼠',
    cost: 4,
    types: ['action'],
    pile: 20,
    text: '+1札\n+1行動\n鼠を1枚獲得する。手札の鼠でない札を1枚廃棄する（鼠しか無ければ廃棄しない）。\n廃棄されたとき、+1札。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.gain('nezumi');
      e.ask({ kind: 'hand', min: 1, max: 1, ids: e.hand().filter(id => id !== 'nezumi'), title: '鼠: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
      },
      onTrash(e) {
        e.draw(1);
      },
    },
  },
  kuzuhiroi: {
    name: '屑拾い',
    cost: 4,
    types: ['action'],
    text: '+2文\n山札をすべて捨て札にしてもよい。捨て札から1枚選んで山札の上に置く。',
    play(e) {
      e.coins(2);
      if (!e.g.ps[e.p].deck.length) return e.step('pick');
      e.ask({ kind: 'option', title: '屑拾い: 山札をすべて捨て札にする？', options: [{ value: 'yes', label: '捨て札にする' }, { value: 'no', label: 'しない' }] }, 'dump');
    },
    steps: {
      dump(e, choice) {
        const ps = e.g.ps[e.p];
        if (choice === 'yes') {
          ps.discard.push(...ps.deck);
          ps.deck = [];
        }
        e.step('pick');
      },
      pick(e) {
        const ps = e.g.ps[e.p];
        e.ask({ kind: 'list', cards: [...new Set(ps.discard)], min: 1, max: 1, title: '屑拾い: 山札の上に置く札を選ぶ' }, 'top');
      },
      top(e, id) {
        const ps = e.g.ps[e.p];
        if (!id) return;
        ps.discard.splice(ps.discard.lastIndexOf(id), 1);
        ps.deck.push(id);
      },
    },
  },
  biwa: {
    name: '琵琶法師',
    cost: 4,
    types: ['action'],
    text: '+1札\n+2行動\n山札の上から3枚を公開する。行動札は好きな順で山札の上に戻し、残りは捨てる。',
    play(e) {
      e.draw(1);
      e.actions(2);
      const ps = e.g.ps[e.p];
      const seen = e.draw(3);
      for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.discard.push(...seen.filter(id => !isType(id, 'action')));
      ps.look.push(...seen.filter(id => isType(id, 'action')));
      e.orderOntoDeck();
    },
  },
  kabukimono: {
    name: '傾奇者',
    cost: 5,
    types: ['action'],
    text: '供給にある、この札よりコストの低い行動札を1つ選び、その札として使う（場を離れるまでその札として扱う）。',
    play(e) {
      // 御前などで2回使うときは、1回目に選んだ札のまま（印で覚えておく）
      const via = { via: e.via, viaCard: e.viaCard };
      const memo = e.via ? e.g.misfitsChoice?.[e.via] : null;
      if (memo) return e.step('become', { ...via, as: memo });
      e.ask({ kind: 'supply', min: 1, types: ['action'], maxCost: e.cost('kabukimono') - 1, title: '傾奇者: どの札として使う？' }, 'pick', via);
    },
    steps: {
      pick(e, id) {
        if (!id) return;
        if (id === 'ruins') id = e.g.ruinsPile.at(-1);
        if (id === 'bushi') id = e.g.knightsPile.at(-1);
        if (!id) return;
        if (e.data.via) (e.g.misfitsChoice ??= {})[e.data.via] = id;
        e.step('become', { ...e.data, as: id });
      },
      become(e) {
        const id = e.data.as;
        const ps = e.g.ps[e.p];
        (ps.misfitsAs ??= []).push(id);
        e.log(`${e.name()}: 傾奇者が${cardName(id)}として振る舞う`);
        e.play(id, 1, { token: e.data.via, card: e.data.viaCard, self: e.self });
      },
    },
  },
  yomi: {
    name: '黄泉の穴',
    cost: 5,
    types: ['action'],
    text: '山札の上から3枚を見る。それを手札に加えるか、捨てて+3札。\n廃棄されたとき、この札より安い札を1枚獲得する。',
    play(e) {
      const ps = e.g.ps[e.p];
      const seen = e.draw(3);
      for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
      ps.look.push(...seen);
      if (!seen.length) return;
      e.ask({ kind: 'option', title: `黄泉の穴: ${seen.map(cardName).join('・')}`, options: [{ value: 'take', label: '手札に加える' }, { value: 'discard', label: '捨てて+3札' }] }, 'decide');
    },
    steps: {
      decide(e, choice) {
        const ps = e.g.ps[e.p];
        const seen = ps.look;
        ps.look = [];
        if (choice === 'take') return void ps.hand.push(...seen);
        ps.discard.push(...seen);
        e.draw(3);
      },
      onTrash(e) {
        const max = e.cost('yomi') - 1;
        e.ask({ kind: 'supply', min: 1, maxCost: max, title: `黄泉の穴が廃棄された: コスト${max}以下の札を獲得` }, 'gain');
      },
      gain(e, id) {
        if (id) e.gain(id);
      },
    },
  },
  kokujin: {
    name: '国人',
    cost: 5,
    types: ['action'],
    text: '次から1つ選ぶ: 手札を2枚捨てる / 手札を1枚山札の上に置く / 銅銭を1枚獲得する。\nそのあと次から1つ選ぶ: +3文 / 手札をすべて廃棄する / 荘園を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'option', title: '国人: 1つ目を選ぶ', options: [{ value: 'discard', label: '手札を2枚捨てる' }, { value: 'top', label: '手札1枚を山札の上へ' }, { value: 'copper', label: '銅銭を獲得' }] }, 'first');
    },
    steps: {
      first(e, c) {
        e.step('second');
        if (c === 'discard') e.ask({ kind: 'hand', min: 2, max: 2, title: '国人: 捨てる札を2枚選ぶ' }, 'discard');
        else if (c === 'top') e.ask({ kind: 'hand', min: 1, max: 1, title: '国人: 山札の上に置く札を選ぶ' }, 'top');
        else e.gain('zeni');
      },
      discard(e, ids) {
        e.discard(ids);
      },
      top(e, ids) {
        const ps = e.g.ps[e.p];
        for (const id of ids) {
          ps.hand.splice(ps.hand.indexOf(id), 1);
          ps.deck.push(id);
        }
      },
      second(e) {
        e.ask({ kind: 'option', title: '国人: 2つ目を選ぶ', options: [{ value: 'coins', label: '+3文' }, { value: 'trash', label: '手札をすべて廃棄' }, { value: 'duchy', label: '荘園を獲得' }] }, 'finish');
      },
      finish(e, c) {
        if (c === 'coins') e.coins(3);
        else if (c === 'duchy') e.gain('shouen');
        else if (e.hand().length) {
          e.log(`${e.name()}: 国人で手札${e.hand().length}枚を廃棄`);
          e.trash(e.hand().slice());
        }
      },
    },
  },
  nisegane: {
    name: '贋金',
    cost: 5,
    types: ['treasure'],
    coin: 1,
    text: '+1文\n+1購入\n手札の財宝を1枚、2回使ってもよい。そうしたら、その財宝を廃棄する。',
    play(e) {
      e.buys(1);
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['treasure'], title: '贋金: 2回使って廃棄する財宝（選ばなくてもよい）' }, 'pick');
    },
    steps: {
      pick(e, ids) {
        if (!ids.length) return;
        const id = ids[0];
        const ps = e.g.ps[e.p];
        ps.hand.splice(ps.hand.indexOf(id), 1);
        ps.play.push(id);
        e.log(`${e.name()}: 贋金で${cardName(id)}を2回使う`);
        e.later({ op: 'step', p: e.p, card: 'nisegane', step: 'burn', data: { card: id } });
        for (let i = 0; i < 2; i++) {
          e.coins(CARDS[id].coin ?? 0);
        }
        if (CARDS[id].play) e.play(id, 2);
      },
      burn(e) {
        const id = e.data.card;
        const play = e.g.ps[e.p].play;
        const i = play.lastIndexOf(id);
        if (i < 0) return;
        play.splice(i, 1);
        e.trashCard(id);
      },
    },
  },
  hakaarashi: {
    name: '墓荒らし',
    cost: 5,
    types: ['action'],
    text: '次から1つ選ぶ: 廃棄置き場からコスト3〜6の札を1枚、山札の上に獲得する / 手札の行動札を1枚廃棄し、それよりコストが3まで高い札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'option', title: '墓荒らし: どちらにする？', options: [{ value: 'rob', label: '廃棄置き場から獲得' }, { value: 'upgrade', label: '行動札を廃棄して格上げ' }] }, 'choose');
    },
    steps: {
      choose(e, c) {
        if (c === 'rob') {
          const loot = [...new Set(e.g.trash.filter(id => e.cost(id) >= 3 && e.cost(id) <= 6))];
          return e.ask({ kind: 'list', cards: loot, min: 1, max: 1, title: '墓荒らし: 廃棄置き場から獲得する札' }, 'rob');
        }
        e.ask({ kind: 'hand', min: 1, max: 1, types: ['action'], title: '墓荒らし: 廃棄する行動札' }, 'trash');
      },
      rob(e, id) {
        if (id && e.gainFromTrash(id, e.p, 'deck')) e.log(`${e.name()}: 墓荒らしで${cardName(id)}を掘り出した`);
      },
      trash(e, ids) {
        if (!ids.length) return;
        const max = e.cost(ids[0]) + 3;
        e.trash(ids);
        e.ask({ kind: 'supply', min: 1, maxCost: max, title: `墓荒らし: コスト${max}以下の札を獲得` }, 'gain');
      },
      gain(e, id) {
        if (id) e.gain(id);
      },
    },
  },
  bushi: {
    name: '名のある武者',
    cost: 5,
    types: ['action', 'attack', 'knight'],
    knights: true,
    text: '10人の武者を混ぜた山。一番上の1人を買える。\n武者は皆、ほかの全員に山札の上から2枚を公開させ、コスト3〜6の札を1枚廃棄させる（残りは捨てる）。武者を廃棄させたら、使った武者も廃棄する。',
  },
  miko: {
    name: '巫女',
    cost: 5,
    types: ['action'],
    text: '+1行動\n+2文\n札の名前を1つ言う。山札の一番上を公開し、その札なら手札に加える。',
    play(e) {
      e.actions(1);
      e.coins(2);
      e.ask({ kind: 'name', min: 1, max: 1, title: '巫女: 山札の一番上にある札を当てる' }, 'guess');
    },
    steps: {
      guess(e, name) {
        const ps = e.g.ps[e.p];
        const [id] = e.draw(1);
        if (!id) return;
        if (id === name) return e.log(`${e.name()}: 巫女のお告げが当たった（${cardName(id)}）`);
        ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.deck.push(id);
        e.log(`${e.name()}: 巫女のお告げは外れた（${cardName(id)}）`);
      },
    },
  },
  saiken: {
    name: '再建',
    cost: 5,
    types: ['action'],
    text: '+1行動\n札の名前を1つ言う。山札から、言った札でない勝利点の札が出るまでめくる。ほかの札は捨て、その勝利点の札を廃棄し、それよりコストが3まで高い勝利点の札を1枚獲得する。',
    play(e) {
      e.actions(1);
      e.ask({ kind: 'name', min: 1, max: 1, title: '再建: 残しておきたい札の名前を言う' }, 'dig');
    },
    steps: {
      dig(e, name) {
        const ps = e.g.ps[e.p];
        let found = null;
        for (;;) {
          const [id] = e.draw(1);
          if (!id) break;
          ps.hand.splice(ps.hand.lastIndexOf(id), 1);
          if (isType(id, 'victory') && id !== name) {
            found = id;
            break;
          }
          ps.look.push(id);
        }
        ps.discard.push(...ps.look);
        ps.look = [];
        if (!found) return;
        const max = e.cost(found) + 3;
        e.trashCard(found);
        e.ask({ kind: 'supply', min: 1, maxCost: max, types: ['victory'], title: `再建: コスト${max}以下の勝利点の札を獲得` }, 'gain', { from: found });
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(e.data.from)}を${cardName(id)}に再建`);
      },
    },
  },
  gomadan: {
    name: '護摩壇',
    cost: 6,
    types: ['action'],
    text: '手札を1枚廃棄する。コスト5以下の札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 1, max: 1, title: '護摩壇: 焚き上げる（廃棄する）札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
        e.ask({ kind: 'supply', min: 1, maxCost: 5, title: '護摩壇: コスト5以下の札を獲得' }, 'gain');
      },
      gain(e, id) {
        if (id) e.gain(id);
      },
    },
  },

  // ---- 名のある武者（10人。名のある武者の山に混ぜる）----
  ...knights(),
};

function knight(name, text, extra) {
  return {
    name,
    cost: 5,
    types: ['action', 'attack', 'knight'],
    kingdom: false,
    notSupply: true,
    text: `${text}\nほかの全員は山札の上から2枚を公開し、コスト3〜6の札を1枚廃棄して残りを捨てる。武者を廃棄させたら、この札も廃棄する。`,
    ...extra,
    steps: { ...KNIGHT_STEPS, ...(extra.steps ?? {}) },
  };
}

function knights() {
  return {
    bushi_tomoe: knight('巴御前', '手札を2枚まで廃棄してよい。', {
      play(e) {
        e.ask({ kind: 'hand', min: 0, max: 2, title: '巴御前: 廃棄する札（2枚まで）' }, 'trashUp');
      },
      steps: {
        trashUp(e, ids) {
          if (ids.length) e.trash(ids);
          e.attack('hit');
        },
      },
    }),
    bushi_hangaku: knight('板額御前', '2点', { types: ['action', 'attack', 'victory', 'knight'], vp: 2, play: e => e.attack('hit') }),
    bushi_tsuru: knight('鶴姫', '+2行動', {
      play(e) {
        e.actions(2);
        e.attack('hit');
      },
    }),
    bushi_naotora: knight('井伊直虎', 'コスト3以下の札を1枚獲得してよい。', {
      play(e) {
        e.ask({ kind: 'supply', min: 0, maxCost: 3, title: '井伊直虎: コスト3以下の札を獲得（しなくてもよい）' }, 'gainUp');
      },
      steps: {
        gainUp(e, id) {
          if (id) e.gain(id);
          e.attack('hit');
        },
      },
    }),
    bushi_ginchiyo: knight('立花誾千代', '+2文', {
      play(e) {
        e.coins(2);
        e.attack('hit');
      },
    }),
    bushi_tadakatsu: knight('本多忠勝', '+1札\n+1行動', {
      play(e) {
        e.draw(1);
        e.actions(1);
        e.attack('hit');
      },
    }),
    bushi_yukimura: knight('真田幸村', '+2札', {
      play(e) {
        e.draw(2);
        e.attack('hit');
      },
    }),
    bushi_keiji: knight('前田慶次', '+2購入', {
      cost: 4,
      play(e) {
        e.buys(2);
        e.attack('hit');
      },
    }),
    bushi_kansuke: knight('山本勘助', 'ほかの全員は手札が3枚になるまで捨てる（そのあと下の攻撃）。', {
      play: e => e.attack('hit'),
      steps: {
        hit(e) {
          e.step('reveal');
          const n = e.hand(e.target).length - 3;
          if (n > 0) e.ask({ p: e.target, kind: 'hand', min: n, max: n, title: `山本勘助: 手札を${n}枚捨てる` }, 'down');
        },
        down(e, ids) {
          e.discard(ids, e.target);
        },
      },
    }),
    bushi_kiyomasa: knight('加藤清正', '廃棄されたとき、金を1枚獲得する。', {
      play: e => e.attack('hit'),
      steps: {
        onTrash(e) {
          if (e.gain('kin')) e.log(`${e.name()}: 加藤清正の遺した金を獲得`);
        },
      },
    }),
  };
}
